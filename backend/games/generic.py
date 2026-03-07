from collections import defaultdict
from core.aggregation import update_comp_stats, update_player_stats
from core.models import make_player, make_comp
from core.parsing import parse_game_line_roles
from core.utils import serialize, print_logs

from core.config import GAME_CONFIGS

def run(games):

    role_labels = GAME_CONFIGS["generic"]
    player_stats = defaultdict(lambda: make_player(role_labels))
    comp_stats = defaultdict(make_comp)

    # aggregate stats for side and mid lane games
    for line in games:
        team, result = parse_game_line_roles(line, role_labels)

        update_player_stats(player_stats, team, result) # each player
        update_comp_stats(comp_stats, team, result) # each comp, regardless of role
    
    print_logs(player_stats)
    
    return serialize({
        'player_stats': player_stats,
        'comp_stats': comp_stats
    })
