from games.hero_shooter import run as run_hero_shooter # overwatch, marvel rivals, anything like that
from games.lanes import run as run_lanes
from games.generic import run as run_generic
from games.generic_versus import run as run_generic_versus
from games.moba import run as run_moba
from games.lanes_detailed import run as run_lanes_detailed
from games.hero_shooter_versus import run as run_hero_shooter_versus
from games.one_vs_one import run as run_one_vs_one

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

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
    lines = payload["lines"]  # get raw lines from frontend
    game_name = lines[0].lower().strip()
    games = lines[1:]

    runner = GAME_RUNNERS.get(game_name)
    if not runner:
        raise HTTPException(status_code=400, detail=f"{game_name} is not valid")
    
    return runner(games)
