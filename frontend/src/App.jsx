import { useState } from "react"

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
      <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">{title}</h2>
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
      <div className="text-zinc-300 text-sm mb-2">
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
  const [input, setInput] = useState("")
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submitData() {
    const lines = input.split("\n").map(l => l.trim()).filter(l => l)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("http://127.0.0.1:8000/stats", {
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
      <h1 className="text-2xl font-bold text-white mb-6">Stack Tracker</h1>

      {/* Input */}
      <div className="mb-8 max-w-2xl">
        <textarea
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm p-3 rounded-lg resize-none focus:outline-none focus:border-zinc-500"
          rows={8}
          placeholder="Paste your game data here..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          onClick={submitData}
          disabled={loading}
          className="mt-2 px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Submit"}
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Results */}
      {data && (
        <div>
          {/* Player Stats */}
          <Section title="Player Stats">
            <div className="flex flex-wrap gap-4">
              {Object.entries(data.player_stats).map(([name, player]) => (
                <PlayerCard key={name} name={name} player={player} />
              ))}
            </div>
          </Section>

          {/* Comp Stats */}
          {data.comp_stats && (
            <Section title="Comp Stats">
              <div className="max-w-lg">
                {Object.entries(data.comp_stats).map(([comp, stats]) => (
                  <CompRow key={comp} name={comp} stats={stats} />
                ))}
              </div>
            </Section>
          )}

          {/* Role Comp Stats */}
          {data.role_comp_stats && (
            <Section title="Role Comp Stats">
              <div className="max-w-lg">
                {Object.entries(data.role_comp_stats).map(([comp, stats]) => (
                  <CompRow key={comp} name={comp} stats={stats} />
                ))}
              </div>
            </Section>
          )}

          {/* Matchups */}
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
