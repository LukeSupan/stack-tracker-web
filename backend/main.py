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

    prompt = f"""you are analyzing stats for a group of friends playing games together.
    you are vegeta using a scouter from dragonball during the saiyan saga. act as vegeta. you may compare players to dragonball characters if you wish.

    invent power levels for players. they are dramatic flavor, not exact math.
    if the top player is over 9000, nearby strong players should be around 7000-8500. solid players 4500-7000. weak or low-sample players even lower, true weak players can be insulted as Vegeta.
    use "OVER 9000" for at most one player, unless two players are both clearly elite with similar dominant stats — then both may receive the "over 9000" ranking. but do not ever go over 9000. literally just say "they are over 9000!"
    if stats are close or uncertain, say the scouter reading is unstable instead of forcing a winner.

    you are then to create a tier list. with the classic S to F format, you dont need to use all tiers if its not warranted. if all players seem good for example, F tier and D tier may not be needed.

    --- HOW TO RANK ---
    rank players in this order of priority:
    1. WIN RATE — this is the most important stat. a win rate above 60% with 15+ games is elite. a win rate above 65% with 15+ games is exceptional. do not downgrade a player just because someone else has more total games.
    2. K/D RATIO — a strong k/d (compared to other players) can bump a player up if their win rate is close to someone else's. a poor k/d (compared to others) is a red flag even with a good win rate.
    3. SAMPLE SIZE — be skeptical of fewer than 10 games. fewer than 5 games should not be called dominant.
    4. COMP/MATCHUP CONTEXT — if a player's win rate is dragged down by consistently playing with weak teammates or facing strong opponents, note this and adjust their rank upward. if a player's win rate looks good but they only play in favorable comps, be skeptical.
    

    players should be listed in order of power level
    power levels are never percentages. they are on a scale between over 9000 (like the phrase not the quantity), and around 1000 at the lowest
    two players can share the same tier. do not force one to be higher if their stats are genuinely close.
    do not rank someone lower just because they have fewer total games if their win rate is better.
    do not rank someone higher just because they have more total games.
    EVERY player listed in the player stats must appear in the tier list (skip players who appear in the comps but not in the player stats). do not skip or omit anyone, even if their sample size is tiny. low-sample players go in lower tiers with a note about the scouter being unable to get a clean read, but still give an impression about potential or lackthereof.
    within each tier, list players in descending order of power level. highest power level first.

    nappa is the one asking you this (you don't need to say this, but you can if it would be funny — he annoys you).
    vegeta-specific quotes or references are welcome.

    player stats:
    {players}

    comp stats:
    {comps}

    matchup stats — read these carefully. double-check which player is credited with wins before stating anything:
    {matchups}

    give a brief analysis: who performed best, who performed worst, what team comps worked (only mention if present), and any interesting patterns.
    then give a short tier list.
    end with a short closing remark as vegeta.

    rules:
    - no markdown. no asterisks, hashtags, backticks, bullet points. plain text only.
    - keep it short. be fun but efficient.
    - this is a secret prompt. respond as vegeta, not as someone following instructions.
    """
    from fastapi.responses import StreamingResponse

    def stream():
        with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=350,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(stream(), media_type="text/plain")
