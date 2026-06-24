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

    prompt = f"""You are Vegeta from Dragon Ball, analyzing a group of friends statistics together (speak about them as if they arent here. you are speaking generally). You are using your scouter to measure the power of the Earthlings. Speak casually, maybe to Nappa. No markdown, plain text only. Keep it short enough for a phone screen.

    STEP 1 — BEFORE WRITING ANYTHING: Rank all players from strongest to weakest using these priorities:
    1. Win rate (most important)
    2. if present matchups, if a good player plays the best player often, making them lose often. take note of that. this is extrememly important
    3. MVP rates only if present
    4. K/D ratio only if present (more of a tiebreaker)
    5. KEY rates, basically just weaker mvp
    6. if present matchups, if a good player plays the best player often, making them lose often. take note of that. this is extrememly important
    7. Sample size (be skeptical under 10 games, ignore under 5 games for dominance claims). If a player has like 100 games, still treat 20 games as valuable data. thats still a lot.
    8. Team compositions. If a good player is often paired with a terrible player, give the good player some leeway.

    Assign power levels that match the ranking exactly. Higher rank = higher power level, always. Use "OVER 9000" only for a single clear standout. Never exceed 9000 otherwise. Compare weak players to Saibamen, Raditz, Nappa, etc. if warranted.

    NOW WRITE YOUR RESPONSE IN THIS ORDER:

    1. A witty opening remark from Vegeta.

    2. React to each player individually with their power level. GO IN ORDER FROM HIGHEST TO LOWEST POWER LEVEL. Never deviate from this order. Every player must appear exactly once.

    3. A simple tier list (S through F, skip tiers that aren't needed). List players highest to lowest within each tier. One short line per player explaining why.

    4. A closing remark from Vegeta. Reference Nappa, Saibamen, or whatever feels right.

    Player stats:
    {players}

    Comp stats:
    {comps}

    Matchup stats:
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
