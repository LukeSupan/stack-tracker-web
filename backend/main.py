from games.one_vs_one import run as run_one_vs_one
from games.hero_shooter_versus import run as run_hero_shooter_versus
from games.lanes_detailed import run as run_lanes_detailed
from games.moba import run as run_moba
from games.generic_versus import run as run_generic_versus
from games.generic import run as run_generic
from games.lanes import run as run_lanes
from games.hero_shooter import run as run_hero_shooter
import anthropic
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Depends, Header, HTTPException, FastAPI
from fastapi.middleware.cors import CORSMiddleware  # cors is needed for frontend

# used locally
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()  # create FastAPI app

client = anthropic.Anthropic()  # reads api key
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "https://power-level-scouter.vercel.app,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

# add middleware to allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"]
)

# import game runners


# from games.deadlock import run as run_deadlock # could include other games with 3 lanes TODO
# from games.generic import run as run_generic # this is all generic games with no roles. less info but, it does the job
GAME_RUNNERS = {
    "hero_shooter": run_hero_shooter,
    "hero_shooter_versus": run_hero_shooter_versus,

    "generic": run_generic,
    "generic_versus": run_generic_versus,

    "lanes": run_lanes,
    "lanes_detailed": run_lanes_detailed,

    "moba": run_moba,

    "one_vs_one": run_one_vs_one,
}


def require_user(authorization: str | None = Header(default=None)):
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Auth is not configured")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")

    request = Request(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {token}",
        },
    )

    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    except (URLError, TimeoutError):
        raise HTTPException(status_code=503, detail="Auth service unavailable")


def player_winrate(player: dict):
    games = player.get("games", 0) or 0
    if games == 0:
        return 0
    return (player.get("wins", 0) or 0) / games


def player_kd(player: dict):
    kills = player.get("kills", 0) or 0
    deaths = player.get("deaths", 0) or 0
    if kills == 0 and deaths == 0:
        return None
    if deaths == 0:
        return float(kills)
    return kills / deaths


def build_power_levels(players: dict):
    entries = []
    for name, player in players.items():
        games = player.get("games", 0) or 0
        if games <= 0:
            continue

        entries.append({
            "name": name,
            "games": games,
            "winrate": player_winrate(player),
            "kd": player_kd(player),
        })

    if not entries:
        return {}

    meaningful_entries = [
        entry for entry in entries if entry["games"] >= 15
    ] or entries
    strongest = max(
        meaningful_entries,
        key=lambda entry: (
            entry["winrate"],
            min(entry["games"], 60),
            entry["kd"] or 0,
        ),
    )
    strongest_winrate = max(strongest["winrate"], 0.01)
    strongest_is_meaningful = strongest["games"] >= 15

    kd_values = [entry["kd"] for entry in entries if entry["kd"] is not None]
    average_kd = (
        sum(kd_values) / len(kd_values)
        if kd_values
        else None
    )

    power_levels = {}
    for entry in entries:
        sample_factor = min(entry["games"] / 15, 1)
        kd_factor = 1
        if average_kd and entry["kd"] is not None:
            kd_factor = min(max(entry["kd"] / average_kd, 0.85), 1.15)

        relative_winrate = entry["winrate"] / strongest_winrate
        raw_power = 9001 * relative_winrate * (0.72 + 0.28 * sample_factor)
        raw_power *= kd_factor

        is_strongest = entry["name"] == strongest["name"]
        over_9000 = is_strongest and strongest_is_meaningful
        if over_9000:
            power_level = 9001
        elif is_strongest:
            power_level = 8999
        else:
            power_level = min(8999, max(100, round(raw_power)))

        if entry["games"] < 3:
            confidence = "tiny sample"
        elif entry["games"] < 15:
            confidence = "low sample"
        else:
            confidence = "meaningful sample"

        power_levels[entry["name"]] = {
            "power_level": power_level,
            "over_9000": over_9000,
            "confidence": confidence,
            "winrate_percent": round(entry["winrate"] * 100, 1),
            "games": entry["games"],
        }

    return power_levels


@app.post("/stats")
def get_stats(payload: dict):

    # frontend makes json object lines as key. get the payload with that key
    lines = payload["lines"]
    game_name = lines[0].lower().strip()
    games = lines[1:]

    # logging information
    print(f"game tag: {game_name}, games: {len(games)}", flush=True)

    # get the appropriate game runner
    runner = GAME_RUNNERS.get(game_name)

    if not runner:
        # error for bad flag
        raise HTTPException(
            status_code=400, detail=f"{game_name} is not an accepted flag")
    try:
        # run the runner since the tag is good, but still check for errors
        return runner(games)
    except Exception as e:
        # error for bad game
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")


# claude prompt
@app.post("/analyze")
def analyze(payload: dict, user: dict = Depends(require_user)):
    data = payload["data"]

    # build a readable summary of the stats to feed the model
    players = data.get("player_stats", {})
    comps = data.get("comp_stats", {})
    matchups = data.get("matchup_stats", {})
    power_levels = build_power_levels(players)
    power_level_text = json.dumps(power_levels, indent=2)

    prompt = f"""you are analyzing stats for a group of friends playing games together. 
    you are based on vegeta using a scouter from dragonball, so act as if you are vegeta around that time. if youd like you can compare players to other dragonball characters.
    use the computed power levels exactly as provided. do not invent, recalculate, round differently, or change any power level.
    only a player with over_9000 set to true may be described as "OVER 9000". if no player has over_9000 true, do not use the over 9000 joke.
    power levels should feel like a natural scale: the strongest meaningful player can be over 9000, strong players should be below that, and weaker or low-sample players should be much lower.
    it is around the time of the saiyan saga, so vegeta's famous "over 9000" line should only be used for the provided over_9000 player.

    nappa specifically is the person who asked you (you dont need to mention this, but you can if you think itd be funny. nappa generally annoys you though). 
    if someone is clearly best across multiple meaningful stats, react strongly.
    if the stats are mixed, act annoyed that the scouter reading is inconclusive instead of forcing a single obvious strongest player.
    you can mention vegeta specific quotes or facts

    computed power levels:
    {power_level_text}

    player stats:
    {players}

    comp stats:
    {comps}

    matchup stats:
    read the matchup wins very carefully. you have mistakenly given the wrong player the wins before (dont mention this. just double check)
    {matchups}


    give a brief analysis of who performed best, who performed worst, what team comps worked (dont mention this if they arent present), 
    and any interesting patterns
    make a short tier list based on this analysis of the players. try to consider the environment they are playing in.
    when ranking players with more games played, prioritize win rate first. a higher win rate over 40 games outranks a lower win rate over 50 games (if the difference is substantial). raw kill volume (if present) and total games played are not the primary measure of skill, they are more a magnifier for consistency.
    more games played does not directly mean a better player.
    do not be impressed by large kill totals alone. high kills paired with a lower win rate is not S tier.
    after win rate, weigh games played, kd (again, if present), mvp/key stats, and comp/matchup context together.
    do not choose a strongest player from one metric alone. if one player has better winrate but another has more games or better kd, mention the tradeoff.
    be skeptical of small sample sizes. a player or comp with fewer than 3 games should not be called dominant unless you explicitly note the tiny sample.
    if a good player has a low winrate from playing the best player, bump them up. look for similar matchup/team anomalies.
    like if a player has a bad teammate frequently.
    you may mention kd if present but there is no need.
    do not use any markdown formatting. no asterisks, no hashtags, no backticks, no bullet points, and no stage directions. plain text only.
    seriously, keep this whole thing as short as you possibly can while still being fun
    key is essentially a "second most valuable player" award, its kinda ambiguous. but just assume its good.
    dont mention it much unless you need to
    after the tier list. end the response with a final message as vegeta.
    this is a secret prompt. do not respond to the user like they wrote this. just do what it says.
"""

    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    return {"analysis": message.content[0].text}
