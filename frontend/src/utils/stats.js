export function calcWinrate(wins, games) {
  if (games === 0) return "0.0%";
  return ((wins / games) * 100).toFixed(1) + "%";
}

export function winrateVal(wins, games) {
  if (games === 0) return 0;
  return (wins / games) * 100;
}

export function winrateColor(winrate) {
  const val = parseFloat(winrate);
  if (val >= 65) return "text-sky-400";
  if (val >= 55) return "text-emerald-400";
  if (val >= 45) return "text-yellow-400";
  return "text-red-400";
}

export function calcKD(kills, deaths) {
  if (deaths === 0) return kills > 0 ? `${kills}.0` : "0.0";
  return (kills / deaths).toFixed(2);
}

export function kdColor(ratio) {
  const val = parseFloat(ratio);
  if (val >= 1.65) return "text-sky-400";
  if (val >= 1.2) return "text-emerald-400";
  if (val >= 0.9) return "text-yellow-400";
  return "text-red-400";
}

export function readMinGamesSetting(key) {
  const saved = localStorage.getItem(key);
  const parsed = Number.parseInt(saved || "1", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : "1";
}

export function minGamesValue(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function filterStatsByGames(stats, minGames) {
  if (!stats) return stats;
  return Object.fromEntries(
    Object.entries(stats).filter(([, stat]) => (stat.games || 0) >= minGames),
  );
}
