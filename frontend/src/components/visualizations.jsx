import { Fragment, useMemo, useState } from "react";
import { calcWinrate, winrateColor } from "../utils/stats";

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

function metricValue(entry, sortKey) {
  if (sortKey === "winPct") return entry.winPct || 0;
  return entry[sortKey] || 0;
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
}) {
  const [sortKey, setSortKey] = useState("games");
  const rankedEntries = useMemo(() => {
    return entries.filter((entry) => (entry.games || 0) >= minGames).sort((a, b) => {
      const primary = metricValue(b, sortKey) - metricValue(a, sortKey);
      if (primary !== 0) return primary;
      const games = (b.games || 0) - (a.games || 0);
      if (games !== 0) return games;
      return String(a.label).localeCompare(String(b.label));
    });
  }, [entries, minGames, sortKey]);

  const maxValue =
    sortKey === "winPct"
      ? 100
      : Math.max(1, ...rankedEntries.map((entry) => metricValue(entry, sortKey)));

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
          <div className="text-[11px] text-zinc-500">
            Sorted by games by default.
          </div>
        </div>
        <div className="flex gap-1 border border-zinc-600 bg-zinc-800 p-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSortKey(option.key)}
              className={`px-2 py-1 text-xs transition-colors ${
                sortKey === option.key
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
          const value = metricValue(entry, sortKey);
          const width = clamp((value / maxValue) * 100, value > 0 ? 5 : 0, 100);
          const winrate = calcWinrate(entry.wins, entry.games);

          return (
            <div key={entry.id || entry.label}>
              <div className="mb-1 flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="break-words font-semibold text-zinc-100">
                    {formatLabel(entry)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                    <span>
                      <span className={winrateColor(winrate)}>{winrate}</span>
                      {"  "}
                      {entry.wins}W / {entry.losses}L
                    </span>
                    <span>{entry.games} games</span>
                    <RecentFormStrip form={entry.form} />
                  </div>
                </div>
                <span className="shrink-0 text-zinc-300">
                  {sortKey === "winPct" ? formatPct(value) : value}
                </span>
              </div>
              <div className="h-3 overflow-hidden bg-zinc-800">
                <div
                  className={`h-full ${winrateBgClass(entry.winPct)}`}
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
  const maxAxis = Math.max(maxKills, maxDeaths);
  const maxGames = Math.max(1, ...plottedEntries.map((entry) => entry.games || 0));

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

  return (
    <div className="max-w-3xl border border-zinc-500 bg-zinc-700 p-3 sm:p-4">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-widest text-zinc-400">
          K/D map
        </div>
        <div className="text-[11px] text-zinc-500">
          Average deaths per game on X, average kills per game on Y. Diagonal is even K/D.
        </div>
      </div>
      <svg viewBox="0 0 300 300" role="img" className="h-auto w-full">
        <line x1="42" y1="260" x2="260" y2="42" stroke="#71717a" strokeDasharray="4 4" />
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
        <text x="30" y="263" textAnchor="end" fill="#71717a" fontSize="9">
          0
        </text>
        <text x="30" y="45" textAnchor="end" fill="#71717a" fontSize="9">
          {maxAxis.toFixed(1)}
        </text>
        {plottedWithAverages.map((entry) => {
          const radius = 4 + ((entry.games || 0) / maxGames) * 8;
          return (
            <g key={entry.id || entry.label}>
              <circle
                cx={x(entry.deathsPerGame)}
                cy={y(entry.killsPerGame)}
                r={radius}
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
              <text
                x={x(entry.deathsPerGame) + radius + 3}
                y={y(entry.killsPerGame) + 3}
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
            Bars show each side's share of wins.
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

  return (
    <div>
      <div className="mb-1 grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-xs">
        <div className="min-w-0 break-words text-zinc-100">{cleanLabel(leftTeam)}</div>
        <div className="text-center text-[11px] text-zinc-400">
          {data.games} games
        </div>
        <div className="min-w-0 break-words text-right text-zinc-100">
          {cleanLabel(rightTeam)}
        </div>
      </div>
      <div className="flex h-3 overflow-hidden bg-zinc-800">
        <div
          className="bg-emerald-400"
          style={{ width: `${leftPct}%` }}
          title={`${cleanLabel(leftTeam)} ${formatPct(leftPct)}`}
        />
        <div
          className="bg-red-400"
          style={{ width: `${rightPct}%` }}
          title={`${cleanLabel(rightTeam)} ${formatPct(rightPct)}`}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
        <span>
          {leftWins}W - {formatPct(leftPct)}
        </span>
        <span>
          {rightWins}W - {formatPct(rightPct)}
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
        className="grid min-w-max gap-px text-[10px]"
        style={{ gridTemplateColumns: `8rem repeat(${teams.length}, 3rem)` }}
      >
        <div />
        {teams.map((team) => (
          <div
            key={team}
            className="truncate bg-zinc-800 p-1 text-center text-zinc-400"
            title={cleanLabel(team)}
          >
            {cleanLabel(team)}
          </div>
        ))}
        {teams.map((rowTeam) => (
          <Fragment key={rowTeam}>
            <div
              className="truncate bg-zinc-800 p-1 text-zinc-300"
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
                  className="h-9 p-1 text-center text-zinc-100"
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
