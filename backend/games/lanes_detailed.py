from collections import defaultdict
from core.aggregation import update_comp_stats, update_player_stats, update_role_comp_stats
from core.models import make_player, make_comp, make_role_comp
from core.parsing import parse_game_line_roles
from core.utils import serialize

from core.config import GAME_CONFIGS

def run(games):

    role_labels = GAME_CONFIGS["lanes_detailed"]
    player_stats = defaultdict(lambda: make_player(role_labels))
    comp_stats = defaultdict(make_comp)
    role_comp_stats = defaultdict(make_role_comp)

    # aggregate stats for 3 lanes
    for line in games:
        team, result = parse_game_line_roles(line, role_labels)

        update_player_stats(player_stats, team, result) # each player
        update_comp_stats(comp_stats, team, result) # each comp, regardless of role
        update_role_comp_stats(role_comp_stats, team, result, role_labels) # specific roles makes comps unique

    print(f"Players: {list(player_stats.keys())}")

    return serialize({
        'player_stats': player_stats,
        'comp_stats': comp_stats,
        'role_comp_stats': role_comp_stats,
    })
