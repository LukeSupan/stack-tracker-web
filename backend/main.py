import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # cors is needed for frontend

# used locally
from dotenv import load_dotenv
load_dotenv()

app = FastAPI() # create FastAPI app

client = anthropic.Anthropic()  # reads api key

# add middleware to allow frontend
# this will be limited later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# import game runners
from games.hero_shooter import run as run_hero_shooter
from games.lanes import run as run_lanes
from games.generic import run as run_generic
from games.generic_versus import run as run_generic_versus
from games.moba import run as run_moba
from games.lanes_detailed import run as run_lanes_detailed
from games.hero_shooter_versus import run as run_hero_shooter_versus
from games.one_vs_one import run as run_one_vs_one


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
        raise HTTPException(status_code=400, detail=f"{game_name} is not an accepted flag") # error for bad flag
    try:
        return runner(games) # run the runner since the tag is good, but still check for errors
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}") # error for bad game


# claude prompt
@app.post("/analyze")
def analyze(payload: dict):
    data = payload["data"]

    # build a readable summary of the stats to feed the model
    players = data.get("player_stats", {})
    comps = data.get("comp_stats", {})
    matchups = data.get("matchup_stats", {})

    prompt = f"""you are analyzing stats for a group of friends playing games together. they are most likely games, but you cant be sure
    unless you see obvious video game roles. then you can talk about games. you are based on a scouter from dragonball. mention the power level
    of certain players.

    player stats:
    {players}

    comp stats:
    {comps}

    matchup stats:
    {matchups}

    give a brief analysis of who performed best, who performed worst, what comps worked, and any interesting patterns
    make a short tier list based on this analysis of the players. try to consider the environment they are playing in.
    if a good player has a low winrate from playing the best player, bump them up. look for similar matchup/team anomalies.
    like if a player has a bad teammate frequently.

    do not use any markdown formatting. no asterisks, no hashtags, no backticks, no bullet points. plain text only.

    seriously, keep this whole thing as short as you possibly can while still being fun
"""

    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}]
    )

    return {"analysis": message.content[0].text}
