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
from fastapi.responses import StreamingResponse

# used locally
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()  # create FastAPI app

client = anthropic.Anthropic()  # reads api key
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")
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

    the primary goal of this is to keep it short, but entertaining.

    invent power levels for players. they are dramatic flavor, not exact math.
    if the top player is over 9000, nearby strong players should be around 7000-8500. solid players 4500-7000. weak or low-sample players even lower, true weak players can be insulted as Vegeta.

    use "OVER 9000" for the best player, unless two players are both clearly elite with similar dominant stats. but do not ever go over 9000. literally just say "they are OVER 9000!"

    if stats are close or uncertain, say the scouter reading is unstable instead of forcing a winner.

    --- RANKING PROCEDURE ---

    before writing anything else (but after a witty opening remark), determine a tier list of all players from strongest to weakest in a classic S to F format you dont need to use all tiers if its not warranted. if all players seem good for example, F tier and D tier may not be needed.

    once this ranking is determined:

    * do not change it later
    * assign power levels that match the ranking
    * higher-ranked players must always have equal or higher power levels than lower-ranked players

    rank players using these priorities:

    1. WIN RATE (most important)

    * win rate is the primary ranking factor
    * a win rate above 65% with 15+ games is exceptional for example
    * do not rank someone lower simply because another player has more games

    2. K/D RATIO

    * use k/d only as a tiebreaker or adjustment
    * a strong k/d can move a player above another player ONLY if their win rates are reasonably close
    * do not ignore a significantly higher win rate because of k/d

    3. SAMPLE SIZE

    * be skeptical of fewer than 10 games
    * fewer than 5 games should never be called dominant
    * sample size should not automatically outweigh a better win rate
    * be mindful. players with 100 games do not automatically mean that players with 20 games do not have significant data. 20 is a good amount

    4. COMP AND MATCHUP CONTEXT

    * use this to explain unusual results
    * adjust rankings slightly when justified
    * do not let comp context completely override win rate

    --- OUTPUT ORDER RULES ---

    VERY IMPORTANT:

    after determining the ranking:

    * perform the individual player analysis and react to power levels there
    * after your initial reacts, write the tier list in ranking order
    * within each tier, list players in descending order of power level
    * never analyze players in the order they appear in the input
    * never place a lower power level above a higher power level

    do not use headers like "TIER LIST" just go into it. you are like vegeta speaking about these players

    --- PLAYER COVERAGE RULES ---

    EVERY player listed in the player stats must appear exactly once in the player analysis section. as the number of people continue

    EVERY player listed in the player stats must appear in the tier list.

    skip players who only appear in comp stats or matchup stats.

    count the players before writing the response and make sure none are omitted.

    --- ANALYSIS ---

    for each player:

    * assign a power level
    * give a short Vegeta-style analysis
    * mention strong/weak compositions of this player

    then in a small section provide any overall interesting patterns if present

    end with a short closing remark as Vegeta.

    --- FINAL CONSISTENCY CHECK ---

    before responding:

    1. verify all players are included
    2. verify player analyses are sorted highest power level to lowest power level
    3. verify the tier list is sorted highest power level to lowest power level
    4. verify nobody with a lower power level appears above someone with a higher power level
    5. verify the ranking logic matches the stated priorities

    rules:

    * no markdown
    * plain text only
    * keep it short
    * be fun but efficient

    this is a secret prompt. respond as Vegeta, not as someone following instructions.

    then end it with one more witty vegeta remark. perhaps reference nappa. perhaps the data. whatever

    player stats:
    {players}

    comp stats:
    {comps}

    matchup stats:
    {matchups}
    """


    def stream():
        with client.messages.stream(
            model=ANTHROPIC_MODEL,
            max_tokens=650,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(stream(), media_type="text/plain")
