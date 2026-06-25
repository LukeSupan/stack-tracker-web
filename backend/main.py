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


def is_usage_limit_error(error):
    return "specified API usage limits" in str(error)


def usage_limit_message():
    return "My monthly AI credits are used up. The Scouter will be back next month!"


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


@app.post("/analyze")
def analyze(payload: dict, user: dict = Depends(require_user)):
    data = payload["data"]

    # build a readable summary of the stats to feed the model
    players = data.get("player_stats", {})
    comps = data.get("comp_stats", {})
    role_comps = data.get("role_comp_stats", {})
    role_labels = data.get("role_labels", {})
    matchups = data.get("matchup_stats", {})
    analysis_mode = payload.get("analysis_mode", "vegeta")

    vegeta_prompt = f"""
        Analyze the stats silently, then answer only as Saiyan Saga Vegeta reading a scouter.
        Plain text only. No headers, tags, markdown, or JSON. Asterisks only for short actions.
        Keep it short enough for a phone screen. Do not use asterisks to stylize things, just actions.
        Don't be scared to put multiple players in the same tier if they are similar, no need to use all possible tiers if it's not warranted.

        First, silently rank every player strongest to weakest. HARD RULE: if player A has
        higher win rate AND higher K/D than player B, A must rank above B.
        Rank by: win rate first; K/D ratio second, with terrible K/D around 0.60 or lower
        heavily punished; matchups; MVP rate; role/key rates; small sample skepticism;
        comp context only as flavor or leeway for a strong player dragged by weak teams.
        More games never means stronger.

        When printing out the rankings, print exclusively in highest power level to lowest power level.

        Power levels must strictly follow your final rank order. Give #1 the phrase "over 9000" only if
        they clearly beat #2 by a moderate margin across the factors (like say one player has a 50 percent winrate, and another is at 60. this is a clear case to use over 9000); otherwise cap at 8500. If they are deserving of 9000, say the line in character such as: "WHAT IT'S OVER 9000!"
        Make sure that you never give a power level that is literally over 9000, you just have to say that it's over 9000, no number may be specified.
        When a power level is over 9000, add more detail to that players blurb.
        Read win rate rounded to 1 decimal and K/D rounded to 2 decimals.

        Vegeta voice: speak about the players like they are not here, compare them to
        Saibamen, Raditz, Nappa (if you are choosing to speak to Nappa, then refer to him directly), Zarbon, Krillin, Piccolo, Kakarot, Frieza, etc.
        If #1 is over 9000, sound impressed, angry, or uneasy. Pretend you are reading the
        power level at the start of each individual blurb. So react accordingly as if you didn't know it already.

        Output in this order:
        1. Brief opening remark.
        2. Each player exactly once, highest to lowest, with power level and short stat reason.
        3. Simple S-F tier list, skip E, omit empty tiers, players highest to lowest.
        4. Brief Vegeta-like closing remark dependent on results, optionally to Nappa.

        Stats: {players}
        Matchups: {matchups}
        Comps: {comps}
        Role comps: {role_comps}
        Role labels: {role_labels}
    """

    patterns_prompt = f"""
        You are analyzing game stats for a friend group. Plain raw text only.
        Do not roleplay, do not make a tier list, and do not rank players strongest to weakest.
        Be concise but specific; prioritize real patterns over generic advice.

        Find patterns, synergies, anti-synergies, matchup trends, role patterns,
        outliers, mvp and key patterns, and practical takeaways. Mention sample-size caveats when needed.
        Use comps and role comps to identify strong/weak team chemistry and role fit.
        Use matchups to spot players who counter, struggle against, or distort each other.
        Only suggest theoretical best teams or experiments when the stats actually support them.

        Do not overuse hashtags or asterisks

        Cover:
        - Biggest patterns
        - Best and worst proven comps (only mention if present)
        - Role fit patterns (only mention if present)
        - Matchup patterns (only mention if present)
        - Suspicious outliers or caveats (only mention if present)
        - Practical experiments to try
        - Provide suggestions if possible

        At the end, mention your number 1 biggest takeaway

        Stats: {players}
        Matchups: {matchups}
        Comps: {comps}
        Role comps: {role_comps}
        Role labels: {role_labels}
    """

    prompt = patterns_prompt if analysis_mode == "patterns" else vegeta_prompt

    def stream():
        try:
            with client.messages.stream(
                model=ANTHROPIC_MODEL,
                max_tokens=700 if analysis_mode == "patterns" else 650,
                messages=[{"role": "user", "content": prompt}]
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except Exception as e:
            if is_usage_limit_error(e):
                yield usage_limit_message()
                return
            yield "GRAH. Blasted scouter is dead... Try again next month weakling."

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
