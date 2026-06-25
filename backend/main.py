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


def get_message_text(message):
    return "".join(
        block.text
        for block in message.content
        if getattr(block, "type", None) == "text"
    ).strip()


def parse_ranking_response(text, players):
    try:
        ranking = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        ranking = json.loads(text[start:end + 1])

    if not isinstance(ranking, dict):
        raise ValueError("Ranking response must be a JSON object")

    ranked = ranking.get("ranked", [])
    player_names = list(players.keys())
    known_players = set(player_names)
    normalized_ranked = [
        name
        for name in ranked
        if isinstance(name, str) and name in known_players
    ]
    normalized_ranked.extend(
        name for name in player_names if name not in normalized_ranked
    )

    over_9000 = ranking.get("over_9000", False)
    if isinstance(over_9000, str):
        over_9000 = over_9000.strip().lower() == "true"

    return {
        "ranked": normalized_ranked,
        "over_9000": bool(over_9000),
        "reasoning": str(ranking.get("reasoning", "")).strip(),
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
    matchups = data.get("matchup_stats", {})

    ranking_prompt = f"""

        HARD RULE: If player A has strictly higher win rate AND strictly higher K/D than 
        player B, player A MUST rank above player B. No other factor can override this.

        Rank these players strongest to weakest. Output ONLY a JSON object, nothing else.
        Priorities in order:
        1. Win rate (primary)
        2. K/D ratio, a vastly higher kd is worth a lot, a horrible KD detracts a lot. ONLY THE RATIO MATTERS. NOT VOLUME OF KILLS AND DEATHS. Truly awful KDs like .6 and below suggest carrying, detract heavily.
        3. Matchup data (if a good player loses often to the best player, note that, and give that player a bump)
        4. MVP rate if present
        5. Role/key rates
        6. Sample size is a SKEPTICISM modifier. It can reduce confidence in stats but 
            NEVER boosts a player's rank, it can decrease rank though. compare with other players and see if its a lot less, if so, lower them a bit. 
            More games does not mean stronger.
        7. Comp context (good player dragged by bad teammates gets leeway)

        Also output over_9000: true if #1 is clearly ahead of #2 across these factors by a meaningful margin.

        Return format:
        {{"ranked": ["name1", "name2", "..."], "over_9000": true, "reasoning": "one sentence"}}

        Winrate should only ever be read to 1 decimal point (rounded).
        KD should only ever be read to 2 decimal point (rounded).

        Stats: {players}
        Matchups: {matchups}
        Comps: {comps}
    """

    def build_vegeta_prompt(ranking):
        ranked_list = "\n".join(
            f"{index}. {name}"
            for index, name in enumerate(ranking["ranked"], start=1)
        )
        over_9000_instruction = (
            "#1 is OVER 9000. Show genuine unease at their power."
            if ranking["over_9000"]
            else "Nobody reaches OVER 9000. Cap at 8500."
        )

        return f"""
        You are Vegeta from Dragon Ball, specifically during the Saiyan Saga (SO DO NOT MENTION YOURSELF AS IF YOU ARE TALKING ABOUT VEGETA, you can of course say "i am vegeta, the prince of all saiyans"). This means that you are much weaker than Frieza, but stronger than all Earthling characters except Kakarot.
        You are analyzing a group of friends' statistics. Speak about them as if they are not here. You are using your scouter to measure their power. Plain text only, asterisks can be used for actions though. Keep it short enough for a small phone screen; really stick to this. The first thing to shorten would be the individual analyses.

        do not use headers or anything like that, and dont decorate things with asterisks. only use them for actions

        Players in EXACT order, do not change, READ THEM OUT IN THE EXACT ORDER:
        {ranked_list}

        {over_9000_instruction}

        The ranking is already decided by the analyst. Do not re-rank players, even if the stats tempt you. Power levels must match rank order strictly. Higher rank means higher power level, always.

        Winrate should only ever be read to 1 decimal point (rounded).
        KD should only ever be read to 2 decimal point (rounded).


        Use the analyst's reasoning for flavor:
        {ranking["reasoning"]}

        Use the stats themselves to look at individual matchups and comps that are noteworthy:
        Stats: {players}
        Matchups: {matchups}
        Comps: {comps}

        React like Vegeta, do not format your output with headers or tags, you are speaking casually. Compare players to Saibamen, Raditz, Nappa, Zarbon, Krillin, Piccolo, Kakarot, Frieza, or whatever fits based on strength. 
        If #1 is over 9000, sound genuinely impressed, or angry, or scared, depends on the level of dominance to the other players.

        also pretend that you are just now reading the power level as you say them, even though you are technically getting them from the analyst. so act surprised if its warranted.

        Comp stats show team chemistry, not individual rank. Use comps and matchups only to explain funny context, excuses, grudges, carry jobs, or suspicious stat quirks.

        Write in this order:
        1. An opening remark as Vegeta.
        2. React to each player individually with their power level. Go highest to lowest. Every player must appear exactly once. Give a short reason for each using the stats. Make an interesting observation or two based on stats too, keep it short.
        3. A simple tier list S-F (ALWAYS SKIP E), remove tiers that are not needed. List players highest to lowest within each tier. One short line per player explaining why.
        4. A closing remark as Vegeta, you could talk to Nappa here if you'd like


    """

    def stream():
        try:
            ranking_message = client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=450,
                temperature=0,
                messages=[{"role": "user", "content": ranking_prompt}]
            )
            ranking = parse_ranking_response(
                get_message_text(ranking_message), players)
            vegeta_prompt = build_vegeta_prompt(ranking)

            with client.messages.stream(
                model=ANTHROPIC_MODEL,
                max_tokens=650,
                messages=[{"role": "user", "content": vegeta_prompt}]
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except Exception as e:
            if is_usage_limit_error(e):
                yield usage_limit_message()
                return
            yield "The Scouter malfunctioned. Try again in a bit."

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
