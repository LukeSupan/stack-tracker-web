import { Fragment, useMemo, useState } from "react";
import { calcWinrate, volumeBgColor, volumeColor, winrateColor } from "../utils/stats";

const SORT_OPTIONS = [
  { key: "games", label: "Games" },
  { key: "winPct", label: "Win%" },
  { key: "wins", label: "Wins" },
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
  if (sortKey === "games" || sortKey === "wins") {
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
  return value;
}

function metricTextClass(entry, sortKey, maxValue) {
  if (sortKey === "games" || sortKey === "wins") {
    return volumeColor(metricValue(entry, sortKey), maxValue);
  }
  if (sortKey === "winPct") {
    return winrateColor(formatPct(entry.winPct));
  }
  return "text-zinc-300";
}

function layoutScatterLabels(points) {
  const placed = [];
  return points
    .map((point, index) => ({ ...point, index }))
    .sort((a, b) => a.cy - b.cy || a.cx - b.cx)
    .map((point) => {
      let labelX = point.cx + point.radius + 4;
      let labelY = point.cy + 3;

      for (let attempt = 0; attempt < 9; attempt += 1) {
        const overlaps = placed.some(
          (label) =>
            Math.abs(label.x - labelX) < 42 && Math.abs(label.y - labelY) < 11,
        );
        if (!overlaps) break;
        labelY += 11;
        labelX += attempt % 2 === 0 ? 5 : -2;
      }

      labelX = clamp(labelX, 46, 262);
      labelY = clamp(labelY, 48, 254);
      placed.push({ x: labelX, y: labelY });
      return { ...point, labelX, labelY };
    })
    .sort((a, b) => a.index - b.index);
}

export function RecentFormStrip({ form = [] }) {
  const recent = form.slice(-12);
  if (recent.length === 0) return null;

  return (
    <div className="flex gap-1" aria-label={`Recent form: ${recent.join("")}`}>
      {recent.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`h-2 w-2 shrink-0 rounded-full ${
            result === "W" ? "bg-emerald-400" : "bg-red-400"
          }`}
          title={result === "W" ? "Win" : "Loss"}
        />
      ))}
    </div>
  );
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
                      <span className={winrateColor(winrate)}>{winrate}</span>
                      {"  "}
                      <span className={volumeColor(entry.wins, maxWins)}>
                        {entry.wins}W
                      </span>{" "}
                      / {entry.losses}L
                    </span>
                    <span className={volumeColor(entry.games, maxGames)}>
                      {entry.games} games
                    </span>
                    {(entry.kills || entry.deaths) > 0 && (
                      <span>{Number(entry.kd || 0).toFixed(2)} K/D</span>
                    )}
                    {(entry.mvps || 0) > 0 && (
                      <span className="text-amber-300">
                        {entry.mvps} MVP{entry.mvps === 1 ? "" : "s"} -{" "}
                        {formatPct(entry.mvpRate)}
                      </span>
                    )}
                    <RecentFormStrip form={entry.form} />
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
  const labelPoints = layoutScatterLabels(
    plottedWithAverages.map((entry) => {
      const radius = 4 + ((entry.games || 0) / maxGames) * 8;
      return {
        ...entry,
        cx: x(entry.deathsPerGame),
        cy: y(entry.killsPerGame),
        radius,
      };
    }),
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
        {labelPoints.map((entry) => {
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
              <line
                x1={entry.cx + entry.radius}
                y1={entry.cy}
                x2={entry.labelX - 2}
                y2={entry.labelY - 3}
                stroke="#71717a"
                strokeOpacity="0.35"
              />
              <text
                x={entry.labelX}
                y={entry.labelY}
                fill="#e4e4e7"
                fontSize="9"
              >
                {entry.label}
              </text>
            </g>
          );
        })}
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

export function MatchupVisualization({ matchups, minGames = 0 }) {
  const [view, setView] = useState("bars");
  const sortedMatchups = useMemo(
    () =>
      matchups
        .filter(([, data]) => (data.games || 0) >= minGames)
        .sort(([, a], [, b]) => (b.games || 0) - (a.games || 0)),
    [matchups, minGames],
  );
  const teams = useMemo(() => {
    const labels = new Set();
    sortedMatchups.forEach(([matchup]) => {
      matchupTeams(matchup).forEach((team) => labels.add(team));
    });
    return [...labels].sort((a, b) => cleanLabel(a).localeCompare(cleanLabel(b)));
  }, [sortedMatchups]);

  if (sortedMatchups.length === 0) {
    return <p className="text-zinc-400 text-sm">No matchups meet the current cutoff.</p>;
  }

  return (
    <div className="max-w-4xl border border-zinc-500 bg-zinc-700 p-3 sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-400">
            Matchup view
          </div>
          <div className="text-[11px] text-zinc-500">
            {view === "matrix"
              ? "Cells show the row team's winrate against the column team."
              : "Green shows the side with the larger share of wins."}
          </div>
        </div>
        {teams.length >= 4 && (
          <div className="flex gap-1 border border-zinc-600 bg-zinc-800 p-1">
            <button
              type="button"
              onClick={() => setView("bars")}
              className={`px-2 py-1 text-xs ${
                view === "bars"
                  ? "bg-amber-500 text-zinc-950"
                  : "text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Bars
            </button>
            <button
              type="button"
              onClick={() => setView("matrix")}
              className={`px-2 py-1 text-xs ${
                view === "matrix"
                  ? "bg-amber-500 text-zinc-950"
                  : "text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Matrix
            </button>
          </div>
        )}
      </div>
      {view === "matrix" && teams.length >= 4 ? (
        <MatchupMatrix matchups={sortedMatchups} teams={teams} />
      ) : (
        <div className="space-y-4">
          {sortedMatchups.map(([matchup, data]) => (
            <MatchupTugBar key={matchup} matchup={matchup} data={data} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchupTugBar({ matchup, data }) {
  const [leftTeam, rightTeam] = matchupTeams(matchup);
  const leftWins = data.wins?.[leftTeam] || 0;
  const rightWins = data.wins?.[rightTeam] || 0;
  const leftPct = data.games ? (leftWins / data.games) * 100 : 0;
  const rightPct = data.games ? (rightWins / data.games) * 100 : 0;
  const greenSide =
    leftWins >= rightWins
      ? { team: leftTeam, wins: leftWins, pct: leftPct }
      : { team: rightTeam, wins: rightWins, pct: rightPct };
  const redSide =
    leftWins >= rightWins
      ? { team: rightTeam, wins: rightWins, pct: rightPct }
      : { team: leftTeam, wins: leftWins, pct: leftPct };

  return (
    <div>
      <div className="mb-1 grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-xs">
        <div className="min-w-0 break-words text-zinc-100">{cleanLabel(greenSide.team)}</div>
        <div className="text-center text-[11px] text-zinc-400">
          {data.games} games
        </div>
        <div className="min-w-0 break-words text-right text-zinc-100">
          {cleanLabel(redSide.team)}
        </div>
      </div>
      <div className="flex h-3 overflow-hidden bg-zinc-800">
        <div
          className="bg-emerald-400"
          style={{ width: `${greenSide.pct}%` }}
          title={`${cleanLabel(greenSide.team)} ${formatPct(greenSide.pct)}`}
        />
        <div
          className="bg-red-400"
          style={{ width: `${redSide.pct}%` }}
          title={`${cleanLabel(redSide.team)} ${formatPct(redSide.pct)}`}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
        <span>
          {greenSide.wins}W - {formatPct(greenSide.pct)}
        </span>
        <span>
          {redSide.wins}W - {formatPct(redSide.pct)}
        </span>
      </div>
    </div>
  );
}

function MatchupMatrix({ matchups, teams }) {
  const lookup = new Map();
  matchups.forEach(([matchup, data]) => {
    const [leftTeam, rightTeam] = matchupTeams(matchup);
    const leftWins = data.wins?.[leftTeam] || 0;
    const rightWins = data.wins?.[rightTeam] || 0;
    lookup.set(`${leftTeam}|||${rightTeam}`, {
      winPct: data.games ? (leftWins / data.games) * 100 : null,
      games: data.games || 0,
    });
    lookup.set(`${rightTeam}|||${leftTeam}`, {
      winPct: data.games ? (rightWins / data.games) * 100 : null,
      games: data.games || 0,
    });
  });

  function cellStyle(value) {
    if (!value) return { backgroundColor: "#3f3f46" };
    const pct = value.winPct || 0;
    const alpha = 0.25 + Math.abs(pct - 50) / 100;
    const color = pct >= 50 ? `rgba(52, 211, 153, ${alpha})` : `rgba(248, 113, 113, ${alpha})`;
    return { backgroundColor: color };
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-max gap-px text-xs"
        style={{ gridTemplateColumns: `10rem repeat(${teams.length}, 4.5rem)` }}
      >
        <div />
        {teams.map((team) => (
          <div
            key={team}
            className="truncate bg-zinc-800 p-2 text-center text-zinc-400"
            title={cleanLabel(team)}
          >
            {cleanLabel(team)}
          </div>
        ))}
        {teams.map((rowTeam) => (
          <Fragment key={rowTeam}>
            <div
              className="truncate bg-zinc-800 p-2 text-zinc-300"
              title={cleanLabel(rowTeam)}
            >
              {cleanLabel(rowTeam)}
            </div>
            {teams.map((columnTeam) => {
              const value =
                rowTeam === columnTeam ? null : lookup.get(`${rowTeam}|||${columnTeam}`);
              return (
                <div
                  key={`${rowTeam}-${columnTeam}`}
                  className="h-14 p-2 text-center text-zinc-100"
                  style={cellStyle(value)}
                  title={
                    value
                      ? `${cleanLabel(rowTeam)} vs ${cleanLabel(columnTeam)}: ${formatPct(
                          value.winPct,
                        )} over ${value.games} games`
                      : "No games"
                  }
                >
                  {value ? Math.round(value.winPct) : ""}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
