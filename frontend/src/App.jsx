import { useState, useEffect } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

function calcWinrate(wins, games) {
  if (games === 0) return "0.0%"
  return (wins / games * 100).toFixed(1) + "%"
}

function winrateVal(wins, games) {
  if (games === 0) return 0
  return wins / games * 100
}

function winrateColor(winrate) {
  const val = parseFloat(winrate)
  if (val >= 60) return "text-emerald-400"
  if (val >= 45) return "text-yellow-400"
  return "text-red-400"
}

function StatRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between py-0.5 text-sm">
      <span className="text-zinc-100">{label}</span>
      <span className={highlight ? "text-amber-400 font-semibold" : "text-zinc-100"}>{value}</span>
    </div>
  )
}

function PlayerCard({ name, player }) {
  const roleKeys = Object.keys(player.roles)
  const showRoles = !(roleKeys.length === 1 && roleKeys[0] === "Player")
  const winrate = calcWinrate(player.wins, player.games)
  const mvpRate = calcWinrate(player.mvps, player.games)
  const keyRate = calcWinrate(player.keys, player.games)

  return (
    <div className="border border-zinc-500 p-4 w-52 bg-zinc-700">
      <div className="flex justify-between mb-2 pb-2 border-b border-zinc-500">
        <span className="font-bold text-white text-base">{name}</span>
        <span className={`text-sm font-semibold ${winrateColor(winrate)}`}>{winrate}</span>
      </div>
      {showRoles && roleKeys.map(role => (
        <StatRow key={role} label={role} value={`${player.roles[role].wins}W / ${player.roles[role].losses}L`} />
      ))}
      <StatRow label="Overall" value={`${player.wins}W / ${player.losses}L`} />
      <StatRow label="Games" value={player.games} />
      {player.mvps > 0 && (
        <>
          <div className="border-t border-zinc-600 my-2" />
          <StatRow label="MVPs" value={player.mvps} highlight />
          <StatRow label="MVP Rate" value={mvpRate} />
          <StatRow label="MVP W/L" value={`${player.mvpwins}W / ${player.mvplosses}L`} />
        </>
      )}
      {player.keys > 0 && (
        <>
          <div className="border-t border-zinc-600 my-2" />
          <StatRow label="Keys" value={player.keys} highlight />
          <StatRow label="Key Rate" value={keyRate} />
          <StatRow label="Key W/L" value={`${player.keywins}W / ${player.keylosses}L`} />
        </>
      )}
    </div>
  )
}

function CompRow({ name, stats }) {
  const winrate = calcWinrate(stats.wins, stats.games)
  return (
    <div className="flex justify-between py-2 text-sm border-b border-zinc-600 last:border-0">
      <span className="text-zinc-100">{name.replaceAll(",", ", ")}</span>
      <span className="ml-4 shrink-0">
        <span className={`font-semibold ${winrateColor(winrate)}`}>{winrate}</span>
        <span className="text-zinc-400 ml-2">({stats.games} games)</span>
      </span>
    </div>
  )
}

function RoleCompRow({ name, stats, roleLabels }) {
  const winrate = calcWinrate(stats.wins, stats.games)
  const parts = name.split("/")
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
          <span className={`font-semibold ${winrateColor(winrate)}`}>{winrate}</span>
          <span className="text-zinc-400 ml-2">({stats.games} games)</span>
        </span>
      </div>
    </div>
  )
}

function MatchupRow({ matchup, data }) {
  const teams = matchup.split(" vs ").map(t => t.replaceAll(",", ", "))
  return (
    <div className="py-2 text-sm border-b border-zinc-600 last:border-0">
      <div className="flex justify-between">
        <div>
          <div className="text-zinc-100 mb-1">{teams[0]} <span className="text-zinc-400">vs</span> {teams[1]}</div>
          {Object.entries(data.wins).map(([team, wins]) => (
            <div key={team} className="text-zinc-100">{team.replaceAll(",", ", ")}: {wins}W</div>
          ))}
        </div>
        <span className="text-zinc-400 ml-4 shrink-0">({data.games} games)</span>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-12">
      <h2 className="text-amber-400 text-base font-black uppercase mb-4">{title}</h2>
      {children}
    </div>
  )
}

const HOW_TO_USE = `STACK TRACKER FOR WEB

This is intended to be used socially; if you are hardcore about your specific stats, there are online trackers that do this better. This specifically tracks individual stats overall and role-based, stats for specific teams, stats for role specific teams, and matchups between you and others in games where you play each other.

─────────────────────────────────────
IMPORTANT NOTICE
─────────────────────────────────────
Keep a .txt file or some other place to store your games. Do not attempt to use the site to save the games, this doesn't work. You need it local.

─────────────────────────────────────
SUPPORTED TAGS
─────────────────────────────────────
  hero_shooter         Tank/DPS/Support/Result
  hero_shooter_versus  Tank/DPS/Support/Result|Tank/DPS/Support/Result
  lanes                Side/Mid/Result
  lanes_detailed       Left/Mid/Right/Result
  generic              Players/Result
  generic_versus       Players/Result|Players/Result
  moba                 Top/Jungle/Mid/ADC/Support/Result
  one_vs_one           Player/Result|Player/Result

Games with _versus are for you vs other people you know.
Games with one_vs_one are for 1v1 specific games.

─────────────────────────────────────
FORMATTING RULES
─────────────────────────────────────
  commas ( , )       separate multiple players in a role
  slashes ( / )      separate different roles
  (mvp) and (key)    tags applied to one player per game
  none               fills empty role slots (randoms)

One game per line. Each line ends with win or loss.

─────────────────────────────────────
EXAMPLE (hero_shooter)
─────────────────────────────────────
  tank,tank2(mvp)/dps1,dps2/support1,support2/win
  tank,tank2(key),tank3/dps1/support1(mvp)/loss

─────────────────────────────────────
FULL EXAMPLE (copy paste to try it)
─────────────────────────────────────
  lanes
  luke,aiden,jr(mvp)/alex(key)/loss
  none/mar,kayla(key)/win
  luke,mar/none/win
  luke,mar/aiden,ray,kayla,dalton/win`

function HowToUseModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-700 border border-zinc-500 max-w-2xl w-full max-h-screen overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between mb-4">
          <span className="text-amber-400 text-base font-black uppercase tracking-widest">How to Use</span>
          <button onClick={onClose} className="text-zinc-100 hover:text-white">×</button>
        </div>
        <pre className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap font-mono">{HOW_TO_USE}</pre>
      </div>
    </div>
  )
}


export default function App() {
  const [mode, setMode] = useState("easy")
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  const [pasteInput, setPasteInput] = useState(() => localStorage.getItem("pasteInput") || "")
  const [gameTag, setGameTag] = useState(() => localStorage.getItem("gameTag") || "")
  const [games, setGames] = useState(() => {
    const saved = localStorage.getItem("games")
    return saved ? JSON.parse(saved) : []
  })
  const [currentLine, setCurrentLine] = useState("")

  useEffect(() => { localStorage.setItem("pasteInput", pasteInput) }, [pasteInput])
  useEffect(() => { localStorage.setItem("gameTag", gameTag) }, [gameTag])
  useEffect(() => { localStorage.setItem("games", JSON.stringify(games)) }, [games])

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setShowHelp(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function easyToLines() { return [gameTag.trim(), ...games] }
  function pasteToLines() { return pasteInput.split("\n").map(l => l.trim()).filter(l => l) }
  function switchToPaste() {
    if (gameTag.trim() || games.length > 0) setPasteInput([gameTag.trim(), ...games].join("\n"))
    setMode("paste")
  }
  function switchToEasy() {
    const lines = pasteInput.split("\n").map(l => l.trim()).filter(l => l)
    if (lines.length > 0) { setGameTag(lines[0]); setGames(lines.slice(1)) }
    setMode("easy")
  }
  function toggleMode() { mode === "paste" ? switchToEasy() : switchToPaste() }
  function addGame() {
    if (!currentLine.trim()) return
    setGames(prev => [...prev, currentLine.trim()])
    setCurrentLine("")
  }
  function handleKeyDown(e) { if (e.key === "Enter") { e.preventDefault(); addGame() } }

  async function submitData() {
    const lines = mode === "paste" ? pasteToLines() : easyToLines()
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      const res = await fetch(`${API_URL}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Something went wrong")
      }
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function runScouter() {
    setAnalysisLoading(true)
    setAnalysis(null)
    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data })
      })
      if (!res.ok) throw new Error("Scouter failed")
      const json = await res.json()
      setAnalysis(json.analysis)
    } catch (e) {
      setAnalysis("Scouter failed.")
    } finally {
      setAnalysisLoading(false)
    }
  }

  const gameCount = mode === "paste" ? Math.max(0, pasteToLines().length - 1) : games.length

  function sortedPlayers() {
    if (!data) return []
    return Object.entries(data.player_stats).sort(([, a], [, b]) => winrateVal(b.wins, b.games) - winrateVal(a.wins, a.games))
  }
  function sortedComps() {
    if (!data?.comp_stats) return []
    return Object.entries(data.comp_stats).sort(([, a], [, b]) => winrateVal(b.wins, b.games) - winrateVal(a.wins, a.games))
  }
  function sortedRoleComps() {
    if (!data?.role_comp_stats) return []
    return Object.entries(data.role_comp_stats).sort(([, a], [, b]) => winrateVal(b.wins, b.games) - winrateVal(a.wins, a.games))
  }

  return (
    <div className="min-h-screen bg-zinc-800 text-zinc-100" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {showHelp && <HowToUseModal onClose={() => setShowHelp(false)} />}

      {/* desktop: two column. mobile: single column stacked */}
      <div className="flex flex-col lg:flex-row min-h-screen">

        {/* Input panel — full width on mobile, fixed sidebar on desktop */}
        <div className="w-full lg:w-80 lg:shrink-0 lg:border-r lg:border-zinc-600 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-bold text-white tracking-tight">Power Level</h1>
            <button onClick={() => setShowHelp(true)} className="text-zinc-400 hover:text-amber-400 text-xs underline transition-colors">
              How to use
            </button>
          </div>

          <div>
            <div className="flex gap-2 mb-3 items-center">
              <button onClick={toggleMode} className="px-3 py-1 text-xs bg-zinc-600 hover:bg-zinc-500 text-zinc-400">
                {mode === "paste" ? "Easy Input" : "Copy Paste"}
              </button>
              {gameCount > 0 && <span className="text-zinc-400 text-xs">{gameCount} game{gameCount !== 1 ? "s" : ""}</span>}
            </div>

            {mode === "paste" ? (
              <textarea
                className="w-full bg-zinc-700 border border-zinc-500 text-zinc-200 text-xs p-3 focus:outline-none focus:border-amber-400/40 resize-none"
                rows={8}
                placeholder="Paste your game data here..."
                value={pasteInput}
                onChange={e => setPasteInput(e.target.value)}
              />
            ) : (
              <div className="border border-zinc-500 p-3 bg-zinc-700">
                <input
                  className="w-full bg-zinc-600 border border-zinc-500 text-zinc-200 text-xs p-2 mb-3 focus:outline-none focus:border-amber-400/40"
                  placeholder="Game tag (e.g. one_vs_one)"
                  value={gameTag}
                  onChange={e => setGameTag(e.target.value)}
                />
                {games.length > 0 && (
                  <div className="mb-3 max-h-40 overflow-y-auto">
                    {games.map((game, i) => (
                      <div key={i} className="text-zinc-400 text-xs py-0.5 border-b border-zinc-600 last:border-0">{game}</div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-zinc-600 border border-zinc-500 text-zinc-200 text-xs p-2 focus:outline-none focus:border-amber-400/40"
                    placeholder="Add a game line..."
                    value={currentLine}
                    onChange={e => setCurrentLine(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button onClick={addGame} className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-xs">Add</button>
                </div>
              </div>
            )}

            <button
              onClick={submitData}
              disabled={loading}
              className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs disabled:opacity-50"
            >
              {loading ? "Loading..." : "Submit"}
            </button>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>
        </div>

        {/* Results panel */}
        {data && (
          <div className="flex-1 p-6 lg:p-10 border-t border-zinc-600 lg:border-t-0">

            <Section title="SCOUTER ANALYSIS">
              <div className="max-w-2xl border border-zinc-500 p-4 bg-zinc-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-zinc-100 text-xs uppercase tracking-widest">Scouter</span>
                  <button
                    onClick={runScouter}
                    disabled={analysisLoading}
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs disabled:opacity-50"
                  >
                    {analysisLoading ? "Scanning..." : "Run Scouter"}
                  </button>
                </div>
                {analysis ? (
                  <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-line">{analysis}</p>
                ) : (
                  <p className="text-zinc-400 text-xs">Vegeta! What does the scouter say about his power level?</p>
                )}
              </div>
            </Section>

            <Section title="Player Stats">
              <div className="flex flex-wrap gap-3">
                {sortedPlayers().map(([name, player]) => (
                  <PlayerCard key={name} name={name} player={player} />
                ))}
              </div>
            </Section>

            {data.comp_stats && (
              <Section title="Comp Stats">
                <div className="max-w-lg">
                  {sortedComps().map(([comp, stats]) => (
                    <CompRow key={comp} name={comp} stats={stats} />
                  ))}
                </div>
              </Section>
            )}

            {data.role_comp_stats && data.role_labels(
              <Section title="Role Comp Stats">
                <div className="max-w-lg">
                  {sortedRoleComps().map(([comp, stats]) => (
                    <RoleCompRow key={comp} name={comp} stats={stats} roleLabels={data.role_labels} />
                  ))}
                </div>
              </Section>
            )}

            {data.matchup_stats && (
              <Section title="Matchups">
                <div className="max-w-lg">
                  {Object.entries(data.matchup_stats).map(([matchup, m]) => (
                    <MatchupRow key={matchup} matchup={matchup} data={m} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}