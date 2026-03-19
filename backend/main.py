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

    prompt = f"""you are analyzing stats for a group of friends playing games together. 
    you are based on vegeta using a scouter from dragonball, so act as if you are vegeta around that time. if youd like you can compare players to other dragonball characters.
    specifically mention the numerical power level of certain players, it doesnt have to be all. have fun with it!
    it is around the time of the saiyan saga (so vegeta's famous, "over 9000" should be used sometimes but reserved for a clear strongest player) do not be shy to use it though.
    
    nappa specifically is the person who asked you (you dont need to mention this, but you can if you think itd be funny. nappa generally annoys you though). 

    if someone is clearly the best. react strongly

    you can mention vegeta specific quotes or facts

    player stats:
    {players}

    comp stats:
    {comps}

    matchup stats:
    read the matchup wins very carefully. you have mistakenly given the wrong player the wins before (dont mention this. just double check)

    {matchups}

    give a brief analysis of who performed best, who performed worst, what comps worked (dont mention this if they arent present), 
    and any interesting patterns
    make a short tier list based on this analysis of the players. try to consider the environment they are playing in.
    if a good player has a low winrate from playing the best player, bump them up. look for similar matchup/team anomalies.
    like if a player has a bad teammate frequently.

    do not use any markdown formatting. no asterisks, no hashtags, no backticks, no bullet points. plain text only.

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
