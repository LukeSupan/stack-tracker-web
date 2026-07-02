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

export function volumeRatio(value, maxValue) {
  const max = Number(maxValue) || 0;
  if (max <= 0) return 0;
  return (Number(value) || 0) / max;
}

export function volumeColor(value, maxValue) {
  const ratio = volumeRatio(value, maxValue);
  if (ratio >= 0.85) return "text-sky-400";
  if (ratio >= 0.55) return "text-emerald-400";
  if (ratio >= 0.25) return "text-yellow-400";
  return "text-red-400";
}

export function volumeBgColor(value, maxValue) {
  const ratio = volumeRatio(value, maxValue);
  if (ratio >= 0.85) return "bg-sky-400";
  if (ratio >= 0.55) return "bg-emerald-400";
  if (ratio >= 0.25) return "bg-yellow-400";
  return "bg-red-400";
}

export function kdValue(kills, deaths) {
  if (deaths === 0) return kills > 0 ? kills : 0;
  return kills / deaths;
}

export function calcKD(kills, deaths) {
  const ratio = kdValue(kills, deaths);
  if (deaths === 0) return ratio.toFixed(1);
  return ratio.toFixed(2);
}

export function kdTier(ratio, averageRatio = 1) {
  const val = parseFloat(ratio);
  const average = Math.max(Number.parseFloat(averageRatio) || 1, 0.1);
  if (val >= average * 1.35) return "great";
  if (val >= average * 1.1) return "good";
  if (val >= average * 0.85) return "ok";
  return "bad";
}

export function kdTextColor(ratio, averageRatio = 1) {
  const tier = kdTier(ratio, averageRatio);
  if (tier === "great") return "text-sky-400";
  if (tier === "good") return "text-emerald-400";
  if (tier === "ok") return "text-yellow-400";
  return "text-red-400";
}

export function kdBarColor(ratio, averageRatio = 1) {
  const tier = kdTier(ratio, averageRatio);
  if (tier === "great") return "bg-sky-400";
  if (tier === "good") return "bg-emerald-400";
  if (tier === "ok") return "bg-yellow-400";
  return "bg-red-400";
}

export function kdColor(ratio, averageRatio = 1) {
  return kdTextColor(ratio, averageRatio);
}

export function averagePlayerKD(players) {
  const ratios = players
    .map(([, player]) => {
      if (!player || (player.kills || 0) === 0 || (player.deaths || 0) === 0) {
        return null;
      }
      return kdValue(player.kills, player.deaths);
    })
    .filter((ratio) => ratio !== null);

  if (ratios.length === 0) return 1;
  return ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length;
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
