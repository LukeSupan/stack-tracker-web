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

function winrateBgClass(winPct, muted) {
  if (muted) return "bg-zinc-500";
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
}) {
  const [sortKey, setSortKey] = useState("games");
  const rankedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const primary = metricValue(b, sortKey) - metricValue(a, sortKey);
      if (primary !== 0) return primary;
      const games = (b.games || 0) - (a.games || 0);
      if (games !== 0) return games;
      return String(a.label).localeCompare(String(b.label));
    });
  }, [entries, sortKey]);

  const maxValue =
    sortKey === "winPct"
      ? 100
      : Math.max(1, ...rankedEntries.map((entry) => metricValue(entry, sortKey)));

  if (entries.length === 0) {
    return <p className="text-zinc-400 text-sm">No data to chart yet.</p>;
  }

  return (
    <div className="max-w-3xl border border-zinc-500 bg-zinc-700 p-3 sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-400">
            Ranked chart
          </div>
          <div className="text-[11px] text-zinc-500">
            Below-cutoff rows are muted, not removed.
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
          const muted = (entry.games || 0) < minGames;
          const value = metricValue(entry, sortKey);
          const width = clamp((value / maxValue) * 100, value > 0 ? 5 : 0, 100);
          const winrate = calcWinrate(entry.wins, entry.games);

          return (
            <div
              key={entry.id || entry.label}
              className={muted ? "opacity-55" : undefined}
            >
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
                    {muted && <span className="text-zinc-500">low sample</span>}
                    <RecentFormStrip form={entry.form} />
                  </div>
                </div>
                <span className="shrink-0 text-zinc-300">
                  {sortKey === "winPct" ? formatPct(value) : value}
                </span>
              </div>
              <div className="h-3 overflow-hidden bg-zinc-800">
                <div
                  className={`h-full ${winrateBgClass(entry.winPct, muted)}`}
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

export function KDScatterPlot({ entries }) {
  const plottedEntries = entries.filter(
    (entry) => (entry.kills || 0) > 0 || (entry.deaths || 0) > 0,
  );
  if (plottedEntries.length === 0) return null;

  const maxKills = Math.max(1, ...plottedEntries.map((entry) => entry.kills || 0));
  const maxDeaths = Math.max(1, ...plottedEntries.map((entry) => entry.deaths || 0));
  const maxAxis = Math.max(maxKills, maxDeaths);
  const maxGames = Math.max(1, ...plottedEntries.map((entry) => entry.games || 0));

  function x(kills) {
    return 42 + ((kills || 0) / maxAxis) * 218;
  }
  function y(deaths) {
    return 260 - ((deaths || 0) / maxAxis) * 218;
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
          Dot size follows games played. The diagonal is even K/D.
        </div>
      </div>
      <svg viewBox="0 0 300 300" role="img" className="h-auto w-full">
        <line x1="42" y1="260" x2="260" y2="42" stroke="#71717a" strokeDasharray="4 4" />
        <line x1="42" y1="260" x2="260" y2="260" stroke="#a1a1aa" />
        <line x1="42" y1="42" x2="42" y2="260" stroke="#a1a1aa" />
        <text x="151" y="292" textAnchor="middle" fill="#a1a1aa" fontSize="10">
          Kills
        </text>
        <text
          x="10"
          y="151"
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize="10"
          transform="rotate(-90 10 151)"
        >
          Deaths
        </text>
        <text x="42" y="275" textAnchor="middle" fill="#71717a" fontSize="9">
          0
        </text>
        <text x="260" y="275" textAnchor="middle" fill="#71717a" fontSize="9">
          {maxAxis}
        </text>
        <text x="30" y="263" textAnchor="end" fill="#71717a" fontSize="9">
          0
        </text>
        <text x="30" y="45" textAnchor="end" fill="#71717a" fontSize="9">
          {maxAxis}
        </text>
        {plottedEntries.map((entry) => {
          const radius = 4 + ((entry.games || 0) / maxGames) * 8;
          return (
            <g key={entry.id || entry.label}>
              <circle
                cx={x(entry.kills)}
                cy={y(entry.deaths)}
                r={radius}
                fill={pointColor(entry.winPct)}
                fillOpacity="0.78"
                stroke="#18181b"
                strokeWidth="1.5"
              >
                <title>
                  {`${entry.label}: ${entry.kills}K / ${entry.deaths}D, ${formatPct(
                    entry.winPct,
                  )}, ${entry.games} games`}
                </title>
              </circle>
              <text
                x={x(entry.kills) + radius + 3}
                y={y(entry.deaths) + 3}
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

export function TrendLineChart({ entries, label = "Trend" }) {
  const trendEntries = entries.filter((entry) => (entry.trend || []).length > 0);
  const [selectedId, setSelectedId] = useState(() => trendEntries[0]?.id || "");
  const selectedEntry =
    trendEntries.find((entry) => entry.id === selectedId) || trendEntries[0];

  if (!selectedEntry) return null;

  const points = selectedEntry.trend || [];
  const maxGame = Math.max(1, ...points.map((point) => point.game || 0));
  const path = points
    .map((point, index) => {
      const x = 34 + ((point.game - 1) / Math.max(1, maxGame - 1)) * 226;
      const y = 244 - ((point.winPct || 0) / 100) * 202;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="max-w-3xl border border-zinc-500 bg-zinc-700 p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-400">
            {label}
          </div>
          <div className="text-[11px] text-zinc-500">
            Cumulative win% by submitted game order.
          </div>
        </div>
        <select
          value={selectedEntry.id}
          onChange={(event) => setSelectedId(event.target.value)}
          className="bg-zinc-700 border border-zinc-500 text-zinc-100 text-xs px-2 py-1 focus:outline-none focus:border-amber-400/40"
        >
          {trendEntries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {cleanLabel(entry.label)}
            </option>
          ))}
        </select>
      </div>
      <svg viewBox="0 0 300 270" role="img" className="h-auto w-full">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = 244 - (tick / 100) * 202;
          return (
            <g key={tick}>
              <line x1="34" y1={y} x2="260" y2={y} stroke="#3f3f46" />
              <text x="26" y={y + 3} textAnchor="end" fill="#a1a1aa" fontSize="9">
                {tick}
              </text>
            </g>
          );
        })}
        <line x1="34" y1="244" x2="260" y2="244" stroke="#a1a1aa" />
        <line x1="34" y1="42" x2="34" y2="244" stroke="#a1a1aa" />
        <path d={path} fill="none" stroke="#f59e0b" strokeWidth="3" />
        {points.map((point) => {
          const cx = 34 + ((point.game - 1) / Math.max(1, maxGame - 1)) * 226;
          const cy = 244 - ((point.winPct || 0) / 100) * 202;
          return (
            <circle key={point.game} cx={cx} cy={cy} r="3" fill="#fbbf24">
              <title>{`Game ${point.game}: ${formatPct(point.winPct)}`}</title>
            </circle>
          );
        })}
        <text x="147" y="266" textAnchor="middle" fill="#a1a1aa" fontSize="10">
          Game sequence
        </text>
      </svg>
    </div>
  );
}

function matchupTeams(matchup) {
  return matchup.split(" vs ");
}

export function MatchupVisualization({ matchups, minGames = 0 }) {
  const [view, setView] = useState("bars");
  const sortedMatchups = useMemo(
    () => [...matchups].sort(([, a], [, b]) => (b.games || 0) - (a.games || 0)),
    [matchups],
  );
  const teams = useMemo(() => {
    const labels = new Set();
    sortedMatchups.forEach(([matchup]) => {
      matchupTeams(matchup).forEach((team) => labels.add(team));
    });
    return [...labels].sort((a, b) => cleanLabel(a).localeCompare(cleanLabel(b)));
  }, [sortedMatchups]);

  if (matchups.length === 0) {
    return <p className="text-zinc-400 text-sm">No matchups to chart yet.</p>;
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
            <MatchupTugBar
              key={matchup}
              matchup={matchup}
              data={data}
              muted={(data.games || 0) < minGames}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchupTugBar({ matchup, data, muted }) {
  const [leftTeam, rightTeam] = matchupTeams(matchup);
  const leftWins = data.wins?.[leftTeam] || 0;
  const rightWins = data.wins?.[rightTeam] || 0;
  const leftPct = data.games ? (leftWins / data.games) * 100 : 0;
  const rightPct = data.games ? (rightWins / data.games) * 100 : 0;

  return (
    <div className={muted ? "opacity-55" : undefined}>
      <div className="mb-1 grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-xs">
        <div className="min-w-0 break-words text-zinc-100">{cleanLabel(leftTeam)}</div>
        <div className="text-center text-[11px] text-zinc-400">
          {data.games} games{muted ? " - low sample" : ""}
        </div>
        <div className="min-w-0 break-words text-right text-zinc-100">
          {cleanLabel(rightTeam)}
        </div>
      </div>
      <div className="flex h-5 overflow-hidden bg-zinc-800">
        <div
          className={muted ? "bg-zinc-500" : "bg-emerald-400"}
          style={{ width: `${leftPct}%` }}
          title={`${cleanLabel(leftTeam)} ${formatPct(leftPct)}`}
        />
        <div
          className={muted ? "bg-zinc-600" : "bg-red-400"}
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
