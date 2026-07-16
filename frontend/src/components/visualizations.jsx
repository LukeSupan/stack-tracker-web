import { useMemo, useState } from "react";
import { calcWinrate, volumeBgColor, volumeColor, winrateColor } from "../utils/stats";

const SORT_OPTIONS = [
  { key: "games", label: "Games" },
  { key: "winPct", label: "Win%" },
  { key: "wins", label: "Wins" },
];
const COMP_SORT_OPTIONS = [
  ...SORT_OPTIONS,
  { key: "compSize", label: "Size" },
];
const MATCHUP_SORT_OPTIONS = [
  { key: "games", label: "Games" },
  { key: "closest", label: "Closest" },
  { key: "edge", label: "Biggest edge" },
];
const PLAYER_MATCHUP_SORT_OPTIONS = [
  { key: "playerWinPct", label: "Win%" },
  { key: "games", label: "Games" },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatPct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function cleanLabel(label) {
  return String(label || "").replaceAll(",", ", ");
}

function winrateBgClass(winPct) {
  if (winPct >= 65) return "bg-sky-400";
  if (winPct >= 55) return "bg-emerald-400";
  if (winPct >= 45) return "bg-yellow-400";
  return "bg-red-400";
}

function defaultBarClass(entry, sortKey, maxValue) {
  if (sortKey === "games" || sortKey === "wins" || sortKey === "compSize") {
    return volumeBgColor(metricValue(entry, sortKey), maxValue);
  }
  return winrateBgClass(entry.winPct);
}

function metricValue(entry, sortKey) {
  if (sortKey === "winPct") return entry.winPct || 0;
  return entry[sortKey] || 0;
}

function formatMetricValue(value, sortKey) {
  if (sortKey === "winPct" || sortKey === "mvpRate") return formatPct(value);
  if (sortKey === "kd") return Number(value || 0).toFixed(2);
  if (sortKey === "compSize") return `${value}p`;
  return value;
}

function metricTextClass(entry, sortKey, maxValue) {
  if (sortKey === "games" || sortKey === "wins" || sortKey === "compSize") {
    return volumeColor(metricValue(entry, sortKey), maxValue);
  }
  if (sortKey === "winPct") {
    return winrateColor(formatPct(entry.winPct));
  }
  return "text-zinc-300";
}

function detailMetricClass(metricKey, activeSortKey, activeClass = "text-zinc-100") {
  return metricKey === activeSortKey ? activeClass : "text-zinc-400";
}

function detailWinrateClass(winrate, activeSortKey) {
  return activeSortKey === "winPct" ? winrateColor(winrate) : "text-zinc-400";
}

function detailVolumeClass(value, maxValue, metricKey, activeSortKey) {
  return metricKey === activeSortKey ? volumeColor(value, maxValue) : "text-zinc-400";
}

function layoutScatterLabels(points) {
  const placed = [];
  return points
    .map((point, index) => ({ ...point, index }))
    .sort((a, b) => a.cy - b.cy || a.cx - b.cx)
    .map((point) => {
      let labelX = point.cx + point.radius + 4;
      let labelY = point.cy + 3;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const overlaps = placed.some(
          (label) =>
            Math.abs(label.x - labelX) < 54 && Math.abs(label.y - labelY) < 13,
        );
        if (!overlaps) break;
        labelY += attempt % 2 === 0 ? 12 : -18;
        labelX += attempt % 2 === 0 ? 5 : 8;
      }

      labelX = clamp(labelX, 48, 246);
      labelY = clamp(labelY, 48, 254);
      placed.push({ x: labelX, y: labelY });
      return { ...point, labelX, labelY };
    })
    .sort((a, b) => a.index - b.index);
}

export function RankedBarChart({
  entries,
  minGames = 0,
  formatLabel = (entry) => entry.label,
  title = "Ranked chart",
  emptyMessage = "No stats meet the current cutoff.",
  sortOptions = SORT_OPTIONS,
  getBarClass = defaultBarClass,
}) {
  const [sortKey, setSortKey] = useState(sortOptions[0]?.key || "games");
  const activeSortKey = sortOptions.some((option) => option.key === sortKey)
    ? sortKey
    : sortOptions[0]?.key || "games";
  const rankedEntries = useMemo(() => {
    return entries.filter((entry) => (entry.games || 0) >= minGames).sort((a, b) => {
      const primary = metricValue(b, activeSortKey) - metricValue(a, activeSortKey);
      if (primary !== 0) return primary;
      const games = (b.games || 0) - (a.games || 0);
      if (games !== 0) return games;
      return String(a.label).localeCompare(String(b.label));
    });
  }, [activeSortKey, entries, minGames]);

  const maxValue =
    activeSortKey === "winPct" || activeSortKey === "mvpRate"
      ? 100
      : Math.max(1, ...rankedEntries.map((entry) => metricValue(entry, activeSortKey)));
  const maxGames = Math.max(1, ...rankedEntries.map((entry) => entry.games || 0));
  const maxWins = Math.max(1, ...rankedEntries.map((entry) => entry.wins || 0));

  if (rankedEntries.length === 0) {
    return <p className="text-zinc-400 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="max-w-3xl border border-zinc-500 bg-zinc-700 p-3 sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-400">
            {title}
          </div>
        </div>
        <div className="flex gap-1 border border-zinc-600 bg-zinc-800 p-1">
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSortKey(option.key)}
              className={`px-2 py-1 text-xs transition-colors ${
                activeSortKey === option.key
                  ? "bg-amber-500 text-zinc-950"
                  : "text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rankedEntries.map((entry) => {
          const value = metricValue(entry, activeSortKey);
          const width = clamp((value / maxValue) * 100, value > 0 ? 5 : 0, 100);
          const winrate = calcWinrate(entry.wins, entry.games);

          return (
            <div key={entry.id || entry.label}>
              <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="break-words text-sm font-bold text-zinc-100 sm:text-base">
                    {formatLabel(entry)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                    <span>
                      <span className={detailWinrateClass(winrate, activeSortKey)}>
                        {winrate}
                      </span>
                      {"  "}
                      <span
                        className={detailVolumeClass(
                          entry.wins,
                          maxWins,
                          "wins",
                          activeSortKey,
                        )}
                      >
                        {entry.wins}W
                      </span>{" "}
                      / {entry.losses}L
                    </span>
                    <span
                      className={detailVolumeClass(
                        entry.games,
                        maxGames,
                        "games",
                        activeSortKey,
                      )}
                    >
                      {entry.games} games
                    </span>
                    {(entry.kills || entry.deaths) > 0 && (
                      <span className={detailMetricClass("kd", activeSortKey)}>
                        {Number(entry.kd || 0).toFixed(2)} K/D
                      </span>
                    )}
                    {(entry.mvps || 0) > 0 && (
                      <span
                        className={detailMetricClass(
                          "mvpRate",
                          activeSortKey,
                          "text-amber-300",
                        )}
                      >
                        {entry.mvps} MVP{entry.mvps === 1 ? "" : "s"} -{" "}
                        {formatPct(entry.mvpRate)}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${metricTextClass(
                    entry,
                    activeSortKey,
                    maxValue,
                  )}`}
                >
                  {formatMetricValue(value, activeSortKey)}
                </span>
              </div>
              <div className="h-3 overflow-hidden bg-zinc-800">
                <div
                  className={`h-full ${getBarClass(entry, activeSortKey, maxValue)}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompRankingChart({ entries, minGames = 0 }) {
  const sizeOptions = useMemo(() => {
    return [...new Set(entries.map((entry) => entry.compSize).filter(Boolean))].sort(
      (a, b) => a - b,
    );
  }, [entries]);
  const [selectedSize, setSelectedSize] = useState("any");
  const activeSize = sizeOptions.includes(Number(selectedSize))
    ? selectedSize
    : "any";
  const filteredEntries = useMemo(() => {
    if (activeSize === "any") return entries;
    const size = Number(activeSize);
    return entries.filter((entry) => entry.compSize === size);
  }, [activeSize, entries]);

  return (
    <div>
      {sizeOptions.length > 1 && (
        <div className="mb-3 flex w-fit flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-400">
            <span className="mb-1 block">Comp size</span>
            <select
              value={activeSize}
              onChange={(event) => setSelectedSize(event.target.value)}
              className="bg-zinc-700 border border-zinc-500 text-zinc-100 text-xs px-2 py-2 focus:outline-none focus:border-amber-400/40"
            >
              <option value="any">Any size</option>
              {sizeOptions.map((size) => (
                <option key={size} value={size}>
                  {formatCompSize(size)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <RankedBarChart
        entries={filteredEntries}
        minGames={minGames}
        title="Comp ranking"
        sortOptions={COMP_SORT_OPTIONS}
      />
    </div>
  );
}

export function KDScatterPlot({ entries, minGames = 0 }) {
  const plottedEntries = entries.filter(
    (entry) =>
      (entry.games || 0) >= minGames &&
      ((entry.kills || 0) > 0 || (entry.deaths || 0) > 0),
  );
  if (plottedEntries.length === 0) return null;

  const plottedWithAverages = plottedEntries.map((entry) => ({
    ...entry,
    killsPerGame: (entry.kills || 0) / Math.max(1, entry.games || 0),
    deathsPerGame: (entry.deaths || 0) / Math.max(1, entry.games || 0),
  }));
  const maxKills = Math.max(
    0.1,
    ...plottedWithAverages.map((entry) => entry.killsPerGame),
  );
  const maxDeaths = Math.max(
    0.1,
    ...plottedWithAverages.map((entry) => entry.deathsPerGame),
  );
  const maxAxis = Math.max(0.5, Math.ceil(Math.max(maxKills, maxDeaths) * 2) / 2);
  const maxGames = Math.max(1, ...plottedEntries.map((entry) => entry.games || 0));
  const gridTicks = [0.25, 0.5, 0.75, 1].map((ratio) => maxAxis * ratio);

  function x(deathsPerGame) {
    return 42 + ((deathsPerGame || 0) / maxAxis) * 218;
  }
  function y(killsPerGame) {
    return 260 - ((killsPerGame || 0) / maxAxis) * 218;
  }
  function pointColor(winPct) {
    if (winPct >= 65) return "#38bdf8";
    if (winPct >= 55) return "#34d399";
    if (winPct >= 45) return "#facc15";
    return "#f87171";
  }
  function ratioLine(ratio) {
    const endDeaths = ratio >= 1 ? maxAxis / ratio : maxAxis;
    const endKills = ratio >= 1 ? maxAxis : maxAxis * ratio;
    return {
      x1: x(0),
      y1: y(0),
      x2: x(endDeaths),
      y2: y(endKills),
      labelX: x(endDeaths),
      labelY: y(endKills),
    };
  }
  const plottedPoints = plottedWithAverages.map((entry) => {
    const radius = 4 + ((entry.games || 0) / maxGames) * 8;
    return {
      ...entry,
      cx: x(entry.deathsPerGame),
      cy: y(entry.killsPerGame),
      radius,
    };
  });
  const labelBudget = Math.min(8, Math.max(4, Math.ceil(plottedPoints.length / 2)));
  const labeledIds = new Set(
    [...plottedPoints]
      .sort((a, b) => {
        const games = (b.games || 0) - (a.games || 0);
        if (games !== 0) return games;
        return Math.abs((b.kd || 0) - 1) - Math.abs((a.kd || 0) - 1);
      })
      .slice(0, labelBudget)
      .map((entry) => entry.id || entry.label),
  );
  const labelPoints = layoutScatterLabels(
    plottedPoints.filter((entry) => labeledIds.has(entry.id || entry.label)),
  );

  return (
    <div className="max-w-3xl border border-zinc-500 bg-zinc-700 p-3 sm:p-4">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-widest text-zinc-400">
          K/D map
        </div>
        <div className="text-[11px] text-zinc-500">
          Deaths/game on X, kills/game on Y. Dot size is games played; color represents winrate.
        </div>
      </div>
      <svg viewBox="0 0 300 300" role="img" className="h-auto w-full">
        {gridTicks.map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} y1="42" x2={x(tick)} y2="260" stroke="#3f3f46" strokeOpacity="0.55" />
            <line x1="42" y1={y(tick)} x2="260" y2={y(tick)} stroke="#3f3f46" strokeOpacity="0.55" />
          </g>
        ))}
        {[0.5, 1, 2].map((ratio) => {
          const line = ratioLine(ratio);
          return (
            <g key={ratio}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={ratio === 1 ? "#71717a" : "#52525b"}
                strokeDasharray="4 4"
                strokeOpacity={ratio === 1 ? "0.95" : "0.55"}
              />
              <text
                x={clamp(line.labelX + (ratio >= 1 ? -28 : -18), 48, 250)}
                y={clamp(line.labelY + (ratio >= 1 ? 12 : -4), 50, 252)}
                fill="#a1a1aa"
                fontSize="8"
              >
                {ratio.toFixed(1)}
              </text>
            </g>
          );
        })}
        <line x1="42" y1="260" x2="260" y2="260" stroke="#a1a1aa" />
        <line x1="42" y1="42" x2="42" y2="260" stroke="#a1a1aa" />
        <text x="151" y="292" textAnchor="middle" fill="#a1a1aa" fontSize="10">
          Deaths / game
        </text>
        <text
          x="10"
          y="151"
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize="10"
          transform="rotate(-90 10 151)"
        >
          Kills / game
        </text>
        <text x="42" y="275" textAnchor="middle" fill="#71717a" fontSize="9">
          0
        </text>
        <text x="260" y="275" textAnchor="middle" fill="#71717a" fontSize="9">
          {maxAxis.toFixed(1)}
        </text>
        {gridTicks.slice(0, -1).map((tick) => (
          <text
            key={`x-${tick}`}
            x={x(tick)}
            y="275"
            textAnchor="middle"
            fill="#52525b"
            fontSize="8"
          >
            {tick.toFixed(1)}
          </text>
        ))}
        <text x="30" y="263" textAnchor="end" fill="#71717a" fontSize="9">
          0
        </text>
        <text x="30" y="45" textAnchor="end" fill="#71717a" fontSize="9">
          {maxAxis.toFixed(1)}
        </text>
        {gridTicks.slice(0, -1).map((tick) => (
          <text
            key={`y-${tick}`}
            x="30"
            y={y(tick) + 3}
            textAnchor="end"
            fill="#52525b"
            fontSize="8"
          >
            {tick.toFixed(1)}
          </text>
        ))}
        {plottedPoints.map((entry) => {
          return (
            <g key={entry.id || entry.label}>
              <circle
                cx={entry.cx}
                cy={entry.cy}
                r={entry.radius}
                fill={pointColor(entry.winPct)}
                fillOpacity="0.78"
                stroke="#18181b"
                strokeWidth="1.5"
              >
                <title>
                  {`${entry.label}: ${entry.killsPerGame.toFixed(
                    1,
                  )} K/G, ${entry.deathsPerGame.toFixed(1)} D/G, ${formatPct(
                    entry.winPct,
                  )}, ${entry.games} games`}
                </title>
              </circle>
            </g>
          );
        })}
        {labelPoints.map((entry) => (
          <g key={`label-${entry.id || entry.label}`}>
            <line
              x1={entry.cx + entry.radius}
              y1={entry.cy}
              x2={entry.labelX - 3}
              y2={entry.labelY - 3}
              stroke="#71717a"
              strokeOpacity="0.22"
            />
            <rect
              x={entry.labelX - 2}
              y={entry.labelY - 9}
              width={Math.min(70, String(entry.label).length * 5 + 6)}
              height="12"
              fill="#27272a"
              fillOpacity="0.78"
            />
            <text
              x={entry.labelX}
              y={entry.labelY}
              fill="#e4e4e7"
              fontSize="8"
            >
              {entry.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function RoleStatsChart({ players, roleLabels, minGames = 0 }) {
  const realRoles = (roleLabels || []).filter((role) => role !== "Player");
  const [selectedRole, setSelectedRole] = useState(realRoles[0] || "");
  const activeRole = realRoles.includes(selectedRole) ? selectedRole : realRoles[0];

  if (!activeRole) return null;

  const entries = Object.entries(players || {})
    .map(([name, player]) => {
      const roleStats = player.roles?.[activeRole];
      const wins = roleStats?.wins || 0;
      const losses = roleStats?.losses || 0;
      const games = wins + losses;
      return {
        id: `${activeRole}-${name}`,
        label: name,
        wins,
        losses,
        games,
        winPct: games ? (wins / games) * 100 : 0,
      };
    })
    .filter((entry) => entry.games > 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1 border border-zinc-600 bg-zinc-800 p-1 w-fit">
        {realRoles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setSelectedRole(role)}
            className={`px-2 py-1 text-xs transition-colors ${
              activeRole === role
                ? "bg-amber-500 text-zinc-950"
                : "text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {role}
          </button>
        ))}
      </div>
      <RankedBarChart
        entries={entries}
        minGames={minGames}
        title={`${activeRole} stats`}
        emptyMessage={`No ${activeRole} stats meet the current cutoff.`}
      />
    </div>
  );
}

function matchupTeams(matchup) {
  return matchup.split(" vs ");
}

function teamPlayers(team) {
  return String(team || "")
    .split(",")
    .map((player) => player.trim())
    .filter(Boolean);
}

function formatCompSize(size) {
  return `${size} player${size === 1 ? "" : "s"}`;
}

export function MatchupVisualization({ matchups, minGames = 0 }) {
  const [sortKey, setSortKey] = useState("games");
  const [selectedPlayer, setSelectedPlayer] = useState("all");
  const [showAllForPlayer, setShowAllForPlayer] = useState(false);
  const summaries = useMemo(() => {
    return matchups.map(([matchup, data]) => buildMatchupSummary(matchup, data));
  }, [matchups]);
  const playerOptions = useMemo(() => {
    const players = new Set();
    summaries.forEach((summary) => {
      summary.sides.forEach((side) => {
        side.players.forEach((player) => players.add(player));
      });
    });
    return [...players].sort((a, b) => cleanLabel(a).localeCompare(cleanLabel(b)));
  }, [summaries]);
  const activePlayer = playerOptions.includes(selectedPlayer)
    ? selectedPlayer
    : "all";
  const sortOptions =
    activePlayer === "all" ? MATCHUP_SORT_OPTIONS : PLAYER_MATCHUP_SORT_OPTIONS;
  const activeSortKey = sortOptions.some((option) => option.key === sortKey)
    ? sortKey
    : sortOptions[0].key;
  const playerMatchups = useMemo(() => {
    if (activePlayer === "all") return [];
    return summaries
      .map((summary) => ({
        ...summary,
        playerSide: summary.sides.find((side) =>
          side.players.includes(activePlayer),
        ),
      }))
      .filter((summary) => summary.games >= minGames && summary.playerSide)
      .sort((a, b) => {
        const winPct = (b.playerSide?.pct || 0) - (a.playerSide?.pct || 0);
        if (winPct !== 0) return winPct;
        return b.games - a.games;
      });
  }, [activePlayer, minGames, summaries]);
  const playerInsight = useMemo(() => {
    if (activePlayer === "all") return null;
    return buildPlayerMatchupInsight(activePlayer, playerMatchups);
  }, [activePlayer, playerMatchups]);
  const sortedMatchups = useMemo(() => {
    return summaries
      .map((summary) => ({
        ...summary,
        playerSide:
          activePlayer === "all"
            ? null
            : summary.sides.find((side) => side.players.includes(activePlayer)),
      }))
      .filter((summary) => summary.games >= minGames)
      .filter(
        (summary) =>
          activePlayer === "all" || showAllForPlayer || summary.playerSide,
      )
      .sort((a, b) => {
        if (activeSortKey === "playerWinPct") {
          const playerPresence =
            Number(Boolean(b.playerSide)) - Number(Boolean(a.playerSide));
          if (playerPresence !== 0) return playerPresence;
          const playerWinPct = (b.playerSide?.pct || 0) - (a.playerSide?.pct || 0);
          if (playerWinPct !== 0) return playerWinPct;
        } else if (activeSortKey === "closest") {
          const margin = a.margin - b.margin;
          if (margin !== 0) return margin;
        } else if (activeSortKey === "edge") {
          const margin = b.margin - a.margin;
          if (margin !== 0) return margin;
        } else {
          const games = b.games - a.games;
          if (games !== 0) return games;
        }

        const games = b.games - a.games;
        if (games !== 0) return games;
        return a.matchup.localeCompare(b.matchup);
      });
  }, [activePlayer, activeSortKey, minGames, showAllForPlayer, summaries]);

  return (
    <div className="max-w-5xl border border-zinc-500 bg-zinc-700 p-3 sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-400">
            Matchup board
          </div>
          <div className="text-[11px] text-zinc-500">
            {sortedMatchups.length} matchup{sortedMatchups.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="text-xs text-zinc-400">
            <span className="sr-only">Player</span>
            <select
              value={activePlayer}
              onChange={(event) => {
                const nextPlayer = event.target.value;
                setSelectedPlayer(nextPlayer);
                if (nextPlayer === "all") setShowAllForPlayer(false);
                setSortKey(nextPlayer === "all" ? "games" : "playerWinPct");
              }}
              className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-xs px-2 py-2 focus:outline-none focus:border-amber-400/40"
            >
              <option value="all">All players</option>
              {playerOptions.map((player) => (
                <option key={player} value={player}>
                  {cleanLabel(player)}
                </option>
              ))}
            </select>
          </label>
          {activePlayer !== "all" && (
            <label className="flex items-center gap-2 border border-zinc-600 bg-zinc-800 px-2 py-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={showAllForPlayer}
                onChange={(event) => setShowAllForPlayer(event.target.checked)}
                className="h-3 w-3 accent-amber-500"
              />
              Show all
            </label>
          )}
          <div className="flex gap-1 border border-zinc-600 bg-zinc-800 p-1">
            {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSortKey(option.key)}
              className={`px-2 py-1 text-xs ${
                activeSortKey === option.key
                  ? "bg-amber-500 text-zinc-950"
                  : "text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {option.label}
            </button>
            ))}
          </div>
        </div>
      </div>
      {sortedMatchups.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {sortedMatchups.map((summary) => (
            <MatchupCard
              key={summary.matchup}
              summary={summary}
              selectedPlayer={activePlayer === "all" ? "" : activePlayer}
            />
          ))}
        </div>
      ) : (
        <p className="text-zinc-400 text-sm">No matchups meet the current cutoff.</p>
      )}
      {playerInsight && <PlayerMatchupBonus insight={playerInsight} />}
    </div>
  );
}

function buildMatchupSummary(matchup, data) {
  const games = data.games || 0;
  const sides = matchupTeams(matchup).map((team) => {
    const wins = data.wins?.[team] || 0;
    return {
      team,
      players: teamPlayers(team),
      wins,
      pct: games ? (wins / games) * 100 : 0,
    };
  });
  const rankedSides = [...sides].sort((a, b) => b.wins - a.wins);
  const leader = rankedSides[0] || { team: "", wins: 0, pct: 0 };
  const runnerUp = rankedSides[1] || { team: "", wins: 0, pct: 0 };
  const margin = Math.max(0, leader.wins - runnerUp.wins);

  return {
    matchup,
    games,
    sides,
    margin,
  };
}

function opponentLabel(summary, player) {
  const opponent = summary.sides.find((side) => !side.players.includes(player));
  return opponent ? cleanLabel(opponent.team) : "the field";
}

function buildPlayerMatchupInsight(player, playerMatchups) {
  if (playerMatchups.length === 0) return null;

  const totals = playerMatchups.reduce(
    (record, summary) => {
      record.games += summary.games;
      record.wins += summary.playerSide?.wins || 0;
      return record;
    },
    { games: 0, wins: 0 },
  );
  const totalWinPct = totals.games ? (totals.wins / totals.games) * 100 : 0;
  const withOpponentLabels = playerMatchups.map((summary) => ({
    ...summary,
    opponentLabel: opponentLabel(summary, player),
  }));
  const best = [...withOpponentLabels].sort((a, b) => {
    const pct = (b.playerSide?.pct || 0) - (a.playerSide?.pct || 0);
    if (pct !== 0) return pct;
    return b.games - a.games;
  })[0];
  const roughest = [...withOpponentLabels].sort((a, b) => {
    const pct = (a.playerSide?.pct || 0) - (b.playerSide?.pct || 0);
    if (pct !== 0) return pct;
    return b.games - a.games;
  })[0];
  const mostPlayed = [...withOpponentLabels].sort((a, b) => {
    const games = b.games - a.games;
    if (games !== 0) return games;
    return (b.playerSide?.pct || 0) - (a.playerSide?.pct || 0);
  })[0];

  return {
    player,
    totals: {
      ...totals,
      losses: totals.games - totals.wins,
      winPct: totalWinPct,
    },
    best,
    roughest,
    mostPlayed,
  };
}

function PlayerMatchupBonus({ insight }) {
  const statCards = [
    {
      label: "Matchup record",
      value: `${insight.totals.wins}W / ${insight.totals.losses}L`,
      detail: `${formatPct(insight.totals.winPct)} over ${insight.totals.games} games`,
    },
    {
      label: "Best look",
      value: `vs ${insight.best.opponentLabel}`,
      detail: `${formatPct(insight.best.playerSide?.pct)} over ${insight.best.games} games`,
    },
    {
      label: "Roughest look",
      value: `vs ${insight.roughest.opponentLabel}`,
      detail: `${formatPct(insight.roughest.playerSide?.pct)} over ${insight.roughest.games} games`,
    },
    {
      label: "Main rivalry",
      value: `vs ${insight.mostPlayed.opponentLabel}`,
      detail: `${insight.mostPlayed.games} games, ${formatPct(insight.mostPlayed.playerSide?.pct)}`,
    },
  ];

  return (
    <div className="mt-4 border border-zinc-600 bg-zinc-800 p-3">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-widest text-zinc-400">
          {cleanLabel(insight.player)} matchup readout
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="border border-zinc-700 bg-zinc-900/40 p-2">
            <div className="text-[11px] uppercase tracking-widest text-zinc-500">
              {card.label}
            </div>
            <div className="mt-1 break-words text-sm font-bold text-zinc-100">
              {card.value}
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">{card.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchupCard({ summary, selectedPlayer }) {
  const maxWins = Math.max(...summary.sides.map((side) => side.wins));
  const minWins = Math.min(...summary.sides.map((side) => side.wins));
  const isTie = maxWins === minWins;
  const displaySides = selectedPlayer
    ? [...summary.sides].sort((a, b) => {
        const aSelected = a.players.includes(selectedPlayer);
        const bSelected = b.players.includes(selectedPlayer);
        return Number(bSelected) - Number(aSelected);
      })
    : summary.sides;

  return (
    <div className="border border-zinc-600 bg-zinc-800 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-widest text-zinc-500">
          {summary.games} game{summary.games === 1 ? "" : "s"}
        </div>
        {summary.playerSide && (
          <div className={winrateColor(formatPct(summary.playerSide.pct))}>
            <span className="text-xs font-semibold">
              {formatPct(summary.playerSide.pct)}
            </span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {displaySides.map((side) => {
          const isSelectedSide =
            selectedPlayer && side.players.includes(selectedPlayer);
          const width = clamp(side.pct, side.wins > 0 ? 8 : 3, 100);
          const barClass = isTie
            ? "h-full bg-zinc-500"
            : side.wins === maxWins
              ? "h-full bg-emerald-400"
              : "h-full bg-red-400";
          return (
            <div key={side.team}>
              <div className="mb-1 flex items-start justify-between gap-3 text-xs">
                <span
                  className={`min-w-0 break-words ${
                    isSelectedSide ? "text-amber-300" : "text-zinc-100"
                  }`}
                >
                  {cleanLabel(side.team)}
                </span>
                <span className="shrink-0 text-zinc-400">
                  {side.wins}W / {formatPct(side.pct)}
                </span>
              </div>
              <div className="h-2 overflow-hidden bg-zinc-700">
                <div
                  className={barClass}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
