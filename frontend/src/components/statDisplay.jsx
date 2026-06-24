import {
  calcKD,
  calcWinrate,
  kdColor,
  winrateColor,
} from "../utils/stats";

function StatRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between py-0.5 text-sm">
      <span className="text-zinc-100">{label}</span>
      <span
        className={highlight ? "text-amber-400 font-semibold" : "text-zinc-100"}
      >
        {value}
      </span>
    </div>
  );
}

export function PlayerCard({ name, player }) {
  const roleKeys = Object.keys(player.roles);
  const showRoles = !(roleKeys.length === 1 && roleKeys[0] === "Player");
  const winrate = calcWinrate(player.wins, player.games);
  const mvpRate = calcWinrate(player.mvps, player.games);
  const keyRate = calcWinrate(player.keys, player.games);
  const kdRatio = calcKD(player.kills, player.deaths);

  return (
    <div className="border border-zinc-500 p-4 w-52 bg-zinc-700">
      <div className="flex justify-between mb-2 pb-2 border-b border-zinc-500">
        <span className="font-bold text-white text-base">{name}</span>
        <span className={`text-sm font-semibold ${winrateColor(winrate)}`}>
          {winrate}
        </span>
      </div>
      {showRoles &&
        roleKeys.map((role) => (
          <StatRow
            key={role}
            label={role}
            value={`${player.roles[role].wins}W / ${player.roles[role].losses}L`}
          />
        ))}
      <StatRow label="Overall" value={`${player.wins}W / ${player.losses}L`} />
      <StatRow label="Games" value={player.games} />
      {(player.kills > 0 || player.deaths > 0) && (
        <>
          <div className="border-t border-zinc-600 my-2" />
          <StatRow label="K / D" value={`${player.kills} / ${player.deaths}`} />
          <StatRow
            label="Ratio"
            value={<span className={kdColor(kdRatio)}>{kdRatio}</span>}
          />
        </>
      )}
      {player.mvps > 0 && (
        <>
          <div className="border-t border-zinc-600 my-2" />
          <StatRow label="MVPs" value={player.mvps} highlight />
          <StatRow label="MVP Rate" value={mvpRate} />
          <StatRow
            label="MVP W/L"
            value={`${player.mvpwins}W / ${player.mvplosses}L`}
          />
        </>
      )}
      {player.keys > 0 && (
        <>
          <div className="border-t border-zinc-600 my-2" />
          <StatRow label="Keys" value={player.keys} highlight />
          <StatRow label="Key Rate" value={keyRate} />
          <StatRow
            label="Key W/L"
            value={`${player.keywins}W / ${player.keylosses}L`}
          />
        </>
      )}
    </div>
  );
}

export function CompRow({ name, stats }) {
  const winrate = calcWinrate(stats.wins, stats.games);
  return (
    <div className="flex justify-between py-2 text-sm border-b border-zinc-600 last:border-0">
      <span className="text-zinc-100">{name.replaceAll(",", ", ")}</span>
      <span className="ml-4 shrink-0">
        <span className={`font-semibold ${winrateColor(winrate)}`}>
          {winrate}
        </span>
        <span className="text-zinc-400 ml-2">({stats.games} games)</span>
      </span>
    </div>
  );
}

export function RoleCompRow({ name, stats, roleLabels }) {
  const winrate = calcWinrate(stats.wins, stats.games);
  const parts = name.split("/");
  return (
    <div className="py-2 text-sm border-b border-zinc-600 last:border-0">
      <div className="flex justify-between">
        <div>
          {(roleLabels || []).map((label, i) => (
            <div key={label} className="text-zinc-100">
              <span className="text-zinc-100">{label}: </span>
              {parts[i] ? parts[i].replaceAll(",", ", ") : "none"}
            </div>
          ))}
        </div>
        <span className="ml-4 shrink-0 mt-0.5">
          <span className={`font-semibold ${winrateColor(winrate)}`}>
            {winrate}
          </span>
          <span className="text-zinc-400 ml-2">({stats.games} games)</span>
        </span>
      </div>
    </div>
  );
}

export function MatchupRow({ matchup, data }) {
  const teams = matchup.split(" vs ").map((team) => team.replaceAll(",", ", "));
  return (
    <div className="py-2 text-sm border-b border-zinc-600 last:border-0">
      <div className="flex justify-between">
        <div>
          <div className="text-zinc-100 mb-1">
            {teams[0]} <span className="text-zinc-400">vs</span> {teams[1]}
          </div>
          {Object.entries(data.wins).map(([team, wins]) => (
            <div key={team} className="text-zinc-100">
              {team.replaceAll(",", ", ")}: {wins}W
            </div>
          ))}
        </div>
        <span className="text-zinc-400 ml-4 shrink-0">
          ({data.games} games)
        </span>
      </div>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <div className="mb-12">
      <h2 className="text-amber-400 text-base font-black uppercase mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function MinGamesInput({ label, value, onChange }) {
  return (
    <label className="text-zinc-400 text-xs">
      <span className="block mb-1">{label}</span>
      <input
        className="w-full bg-zinc-600 border border-zinc-500 text-zinc-100 text-xs p-2 focus:outline-none focus:border-amber-400/40"
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
