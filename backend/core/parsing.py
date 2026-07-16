# parse input format into easily usable format

# parse mvp, key tags, and optional [kills-deaths] bracket out of name
# result is (name, is_mvp, is_key, kills, deaths)
# kills and deaths are None if no bracket was present
# supports: luke[5-3], luke[5-3](mvp), luke(mvp)[5-3]


def parse_name_and_tags(name):
    name = name.strip()
    kills = None
    deaths = None

    # extract [kills-deaths] bracket if present
    bracket_start = name.find("[")
    bracket_end = name.find("]", bracket_start + 1)
    if bracket_start != -1 and bracket_end != -1:
        kd_text = name[bracket_start + 1:bracket_end]
        kd_parts = kd_text.split("-")
        if (
            len(kd_parts) == 2
            and kd_parts[0].isdigit()
            and kd_parts[1].isdigit()
        ):
            kills = int(kd_parts[0])
            deaths = int(kd_parts[1])
            name = (name[:bracket_start] + name[bracket_end + 1:]).strip()

    # extract (mvp) or (key) tag
    if name.endswith("(mvp)"):
        return name[:-5].strip(), True, False, kills, deaths
    elif name.endswith("(key)"):
        return name[:-5].strip(), False, True, kills, deaths

    return name, False, False, kills, deaths

# parse each role out of the line, individual players are not parsed out yet
# result is dictionary of the game, showing the roles, and then a result win or loss
# at this point role1 - role3 could still be something like: luke,mar(mvp).


def parse_game_line_roles(line, role_labels):
    parts = line.strip().split("/")

    expected = len(role_labels) + 1

    # make an error for bad input to make it easy to find.
    if len(parts) != expected:
        raise ValueError(
            f"Bad input: {line}\n"
            f"Check the formatting for that line."
        )

    *role_parts, result = parts

    # maybe add a catch here at some point TODO

    # gather however many roles there are and zip the role labels to the role parts on this line
    # result is like: left: bob | mid: alice | right: aiden
    team = dict(zip(role_labels, role_parts))

    return team, result  # return 2-tuple with the dictionary and result

# parse each player out of the line, individual players are also parsed out
# result is a list of the members, and then a result win or loss
# at this point the players still have their tags


def parse_game_line_generic(line):
    players_part, result = line.strip().split("/")

    team = []
    for player in players_part.split(","):
        team.append(player)

    return team, result
