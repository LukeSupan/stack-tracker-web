import { useState } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-0.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-300">{value}</span>
    </div>
  )
}

function PlayerCard({ name, player }) {
  const roleKeys = Object.keys(player.roles)
  const showRoles = !(roleKeys.length === 1 && roleKeys[0] === "Player")
  const winrate = player.games === 0 ? "0.0%" : (player.wins / player.games * 100).toFixed(1) + "%"
  const mvpRate = player.games === 0 ? "0.0%" : (player.mvps / player.games * 100).toFixed(1) + "%"

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-64">
      <div className="text-white font-bold text-base mb-3 border-b border-zinc-700 pb-2">{name}</div>
      {showRoles && roleKeys.map(role => (
        <StatRow key={role} label={role} value={`${player.roles[role].wins}W / ${player.roles[role].losses}L`} />
      ))}
      <StatRow label="Overall" value={`${player.wins}W / ${player.losses}L`} />
      <StatRow label="Winrate" value={winrate} />
      {player.mvps > 0 && (
        <>
          <div className="border-t border-zinc-800 my-2" />
          <StatRow label="MVPs" value={player.mvps} />
          <StatRow label="MVP Rate" value={mvpRate} />
          <StatRow label="MVP W/L" value={`${player.mvpwins}W / ${player.mvplosses}L`} />
        </>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-zinc-400 text-base font-bold uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">{title}</h2>
      {children}
    </div>
  )
}

function CompRow({ name, stats }) {
  const winrate = stats.games === 0 ? "0.0%" : (stats.wins / stats.games * 100).toFixed(1) + "%"
  return (
    <div className="flex justify-between items-center py-1.5 text-sm border-b border-zinc-800 last:border-0">
      <span className="text-zinc-300">{name.replaceAll(",", ", ")}</span>
      <span className="text-zinc-500">{winrate} <span className="text-zinc-600">({stats.games} games)</span></span>
    </div>
  )
}

function MatchupBlock({ matchup, data }) {
  const teams = matchup.split(" vs ").map(t => t.replaceAll(",", ", "))
  return (
    <div className="border-l-2 border-zinc-700 pl-4 mb-4">
      <div className="text-zinc-300 text-base mb-2">
        <span>{teams[0]}</span>
        <span className="text-zinc-600 mx-2">vs</span>
        <span>{teams[1]}</span>
      </div>
      {Object.entries(data.wins).map(([team, wins]) => (
        <StatRow key={team} label={team.replaceAll(",", ", ")} value={`${wins} wins`} />
      ))}
      <StatRow label="Total Games" value={data.games} />
    </div>
  )
}

export default function App() {
  // shared state
  const [mode, setMode] = useState("paste") // "paste" or "easy"
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // paste mode state
  const [pasteInput, setPasteInput] = useState("")

  // easy mode state
  const [gameTag, setGameTag] = useState("")
  const [games, setGames] = useState([])
  const [currentLine, setCurrentLine] = useState("")

  // convert easy mode state to lines array for the API
  function easyToLines() {
    return [gameTag.trim(), ...games]
  }

  // convert paste mode input to lines array for the API
  function pasteToLines() {
    return pasteInput.split("\n").map(l => l.trim()).filter(l => l)
  }

  // switch from easy to paste — joins everything into the textarea
  function switchToPaste() {
    if (gameTag.trim() || games.length > 0) {
      setPasteInput([gameTag.trim(), ...games].join("\n"))
    }
    setMode("paste")
  }

  // switch from paste to easy — parses the textarea back into tag + games list
  function switchToEasy() {
    const lines = pasteInput.split("\n").map(l => l.trim()).filter(l => l)
    if (lines.length > 0) {
      setGameTag(lines[0])
      setGames(lines.slice(1))
    }
    setMode("easy")
  }

  function toggleMode() {
    if (mode === "paste") switchToEasy()
    else switchToPaste()
  }

  function addGame() {
    if (!currentLine.trim()) return
    setGames(prev => [...prev, currentLine.trim()])
    setCurrentLine("")
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault()
      addGame()
    }
  }

  async function submitData() {
    const lines = mode === "paste" ? pasteToLines() : easyToLines()
    setLoading(true)
    setError(null)
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
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono">
      <h1 className="text-3xl font-bold text-white mb-3">Team Stat Tracker</h1>
      <a
        href="https://github.com/LukeSupan/stack-tracker-web/blob/main/README.md"
        target="_blank"
        className="text-zinc-500 hover:text-zinc-300 text-base underline block mb-6"
      >
        How to use
      </a>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={toggleMode}
          className="px-4 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
        >
          {mode === "paste" ? "Switch to Easy Input" : "Switch to Copy Paste"}
        </button>
      </div>

      {/* Input */}
      <div className="mb-8 max-w-2xl">

        {mode === "paste" ? (
          // PASTE MODE
          <textarea
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-base p-3 rounded-lg resize-none focus:outline-none focus:border-zinc-500"
            rows={8}
            placeholder="Paste your game data here..."
            value={pasteInput}
            onChange={e => setPasteInput(e.target.value)}
          />
        ) : (
          // EASY INPUT MODE
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            {/* Game tag input */}
            <input
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-base p-2 rounded-lg mb-4 focus:outline-none focus:border-zinc-500"
              placeholder="Game tag (e.g. one_vs_one)"
              value={gameTag}
              onChange={e => setGameTag(e.target.value)}
            />

            {/* Previous games — read only */}
            {games.length > 0 && (
              <div className="mb-3 max-h-48 overflow-y-auto">
                {games.map((game, i) => (
                  <div key={i} className="text-zinc-500 text-sm py-0.5 border-b border-zinc-800 last:border-0">
                    {game}
                  </div>
                ))}
              </div>
            )}

            {/* New game input */}
            <div className="flex gap-2">
              <input
                className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-200 text-base p-2 rounded-lg focus:outline-none focus:border-zinc-500"
                placeholder="Add a game line..."
                value={currentLine}
                onChange={e => setCurrentLine(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={addGame}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <button
          onClick={submitData}
          disabled={loading}
          className="mt-3 px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Submit"}
        </button>
        {error && <p className="text-red-400 text-base mt-2">{error}</p>}
      </div>

      {/* Results */}
      {data && (
        <div>
          <Section title="Player Stats">
            <div className="flex flex-wrap gap-4">
              {Object.entries(data.player_stats).map(([name, player]) => (
                <PlayerCard key={name} name={name} player={player} />
              ))}
            </div>
          </Section>

          {data.comp_stats && (
            <Section title="Comp Stats">
              <div className="max-w-lg">
                {Object.entries(data.comp_stats).map(([comp, stats]) => (
                  <CompRow key={comp} name={comp} stats={stats} />
                ))}
              </div>
            </Section>
          )}

          {data.role_comp_stats && (
            <Section title="Role Comp Stats">
              <div className="max-w-lg">
                {Object.entries(data.role_comp_stats).map(([comp, stats]) => (
                  <CompRow key={comp} name={comp} stats={stats} />
                ))}
              </div>
            </Section>
          )}

          {data.matchup_stats && (
            <Section title="Matchups">
              {Object.entries(data.matchup_stats).map(([matchup, m]) => (
                <MatchupBlock key={matchup} matchup={matchup} data={m} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
