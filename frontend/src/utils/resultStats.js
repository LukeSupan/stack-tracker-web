import {
  averagePlayerKD,
  filterStatsByGames,
  kdBarColor,
  kdValue,
  minGamesValue,
  volumeBgColor,
  winrateVal,
} from "./stats";

export function playerBarClass(entry, sortKey, maxValue) {
  if (sortKey === "kd") {
    return kdBarColor(entry.kd);
  }
  if (sortKey === "mvpRate") return "bg-amber-400";
  if (sortKey === "games" || sortKey === "wins") {
    return volumeBgColor(entry[sortKey] || 0, maxValue);
  }
  if (entry.winPct >= 65) return "bg-sky-400";
  if (entry.winPct >= 55) return "bg-emerald-400";
  if (entry.winPct >= 45) return "bg-yellow-400";
  return "bg-red-400";
}

function byWinrate([, a], [, b]) {
  return winrateVal(b.wins, b.games) - winrateVal(a.wins, a.games);
}

function rankedEntry(id, label, stats, extra = {}) {
  return {
    id,
    label,
    wins: stats.wins || 0,
    losses: stats.losses || 0,
    games: stats.games || 0,
    winPct: winrateVal(stats.wins || 0, stats.games || 0),
    form: stats.form || [],
    ...extra,
  };
}

function compSize(comp) {
  return String(comp || "")
    .split(",")
    .map((player) => player.trim())
    .filter(Boolean).length;
}

export function buildResultsModel(data, filters) {
  const playerMinGames = minGamesValue(filters.playerMinGames);
  const compMinGames = minGamesValue(filters.compMinGames);
  const roleCompMinGames = minGamesValue(filters.roleCompMinGames);
  const matchupMinGames = minGamesValue(filters.matchupMinGames);

  const visiblePlayers = Object.entries(
    filterStatsByGames(data?.player_stats, playerMinGames) || {},
  ).sort(byWinrate);
  const visibleComps = Object.entries(
    filterStatsByGames(data?.comp_stats, compMinGames) || {},
  ).sort(byWinrate);
  const visibleRoleComps = Object.entries(
    filterStatsByGames(data?.role_comp_stats, roleCompMinGames) || {},
  ).sort(byWinrate);
  const visibleMatchups = Object.entries(
    filterStatsByGames(data?.matchup_stats, matchupMinGames) || {},
  ).sort(([, a], [, b]) => b.games - a.games);

  const playerEntries = Object.entries(data?.player_stats || {}).map(
    ([name, player]) =>
      rankedEntry(name, name, player, {
        kills: player.kills || 0,
        deaths: player.deaths || 0,
        kd: kdValue(player.kills || 0, player.deaths || 0),
        mvps: player.mvps || 0,
        mvpRate: winrateVal(player.mvps || 0, player.games || 0),
      }),
  );
  const compEntries = Object.entries(data?.comp_stats || {}).map(([comp, stats]) =>
    rankedEntry(comp, comp.replaceAll(",", ", "), stats, {
      compSize: compSize(comp),
    }),
  );
  const roleCompEntries = Object.entries(data?.role_comp_stats || {}).map(
    ([comp, stats]) =>
      rankedEntry(comp, comp, stats, {
        parts: comp.split("/"),
      }),
  );

  const playerHasKD = playerEntries.some(
    (entry) => (entry.kills || 0) > 0 || (entry.deaths || 0) > 0,
  );
  const playerHasMVP = playerEntries.some((entry) => (entry.mvps || 0) > 0);
  const playerSortOptions = [
    { key: "games", label: "Games" },
    { key: "winPct", label: "Win%" },
    { key: "wins", label: "Wins" },
    ...(playerHasKD ? [{ key: "kd", label: "K/D" }] : []),
    ...(playerHasMVP ? [{ key: "mvpRate", label: "MVP%" }] : []),
  ];

  return {
    playerMinGames,
    compMinGames,
    roleCompMinGames,
    matchupMinGames,
    visiblePlayers,
    visibleComps,
    visibleRoleComps,
    visibleMatchups,
    visiblePlayerKDAverage: averagePlayerKD(visiblePlayers),
    playerEntries,
    playerSortOptions,
    compEntries,
    roleCompEntries,
    hasRoleSpecificStats:
      data?.role_labels?.some((role) => role !== "Player") && data?.player_stats,
  };
}
