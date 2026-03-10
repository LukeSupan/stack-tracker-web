import { useState, useEffect } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000" // vite for deployment or local

// ------------
// COMPONENTS
// ------------

// player card for individual player stats with name and player (contains StatRow)
function PlayerCard({ name, player }) {
    // role wins and losses
    // we need roles for this
    const roleKeys = Object.keys(player.roles) // get array of keys with Object.
    const showRoles = !(roleKeys.length === 1 && roleKeys[0] === "Player") // if the only role is player, dont bother

    // overall winrate, ensure no 0, keyrate is same
    const winrate = player.games === 0 ? "0.0%" : (player.wins / player.games * 100).toFixed(1) + "%"
    const keyRate = player.games === 0 ? "0.0%" : (player.keys / player.games * 100).toFixed(1) + "%"
    const mvpRate = player.games === 0 ? "0.0%" : (player.mvps / player.games * 100).toFixed(1) + "%"

    // add the StatRows row by row, some are conditional
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-64">
            <div className="text-white font-bold text-base mb-3 border-b border-zinc-700 pb-2">{name}</div>
            {showRoles && roleKeys.map(role => ( // for each role, make a StatRow with this function (unless there are no roles)
                <StatRow key={role} label={role} value={`${player.roles[role].wins}W / ${player.roles[role].losses}L`}/>
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

            {player.keys > 0 && (
                <>
                    <div className="border-t border-zinc-800 my-2" />
                    <StatRow label="Keys" value={player.keys} />
                    <StatRow label="Key Rate" value={keyRate} />
                    <StatRow label="Key W/L" value={`${player.mvpwins}W / ${player.mvplosses}L`} />
                </>
            )}

        </div>
    )
}

// section with title and children, just a div with a header
function Section({ title, children }) {
    return (
        <div className="mb-8">
            <h2 className="text-white font-bold text-base mb-3 border-b border-zinc-700 pb-2">{title}</h2>
            {children}
        </div>
    )
}

// stat row component with label then value. for individual stats, and matchup stats.
// maybe should be changed.
function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-0.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-300">{value}</span>
    </div>
  )
}

// comp row for showing the non-role comp

// role comp row for showing the role comp 

// matchup block, inside contains stat rows


// ------------
// App
// ------------
export default function App() {

    // api use states
    // useState for setting data
    const [data, setData] = useState(null)
    // useState for setting error
    const [error, setError] = useState(null)
    // useState for setting loading
    const [loading, setLoading] = useState(false)

    // useState for the paste input
    const [pasteInput, setPasteInput] = useState(() => {
        return localStorage.getItem("pasteInput") || ""
    })



    // every time pasteInput changes, save it to local storage
    useEffect(() => {
        localStorage.setItem("pasteInput", pasteInput)
    }, [pasteInput])




    // function to convert paste mode input to lines for api
    // split by new line, then get rid of white space, then get rid of empty strings
    function pasteToLines() {
        return pasteInput.split("\n").map(lines => lines.trim()).filter(lines => lines)
    }

    // function to enter key press (add game of course)

    // async function to submit data (api call)
    async function submitData() {
        // try to fetch, if fail say why
        const lines = pasteToLines()
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
            // setError(e.message)
        } finally {
            // setLoading(false)
        }
    }

    // return of everything. which makes the actual input ui, then mostly uses components for results
    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-100 p-8 font-mono">
            <h1 className="text-4xl font-bold text-white mb-3">Team Stat Tracker</h1>

            {/* input */}
            <div className="mb-8 max-w-2xl">
                <textarea
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-base p-3 rounded-lg resize-none focus:outline-none focus:border-zinc-500"
                    rows={8}
                    placeholder="Paste formatted game data here"
                    value={pasteInput}
                    onChange={e => setPasteInput(e.target.value)}
                />
                <button
                    onClick={submitData}
                    className="mt-3 px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                    Submit
                </button>
            </div>

            {/* results */}

            {data && (
                <>
                <Section title="PLAYER STATS">
                    <div className="flex flex-wrap gap-4">
                    {Object.entries(data.player_stats).map(([name, player]) => (
                        <PlayerCard key={name} name={name} player={player} />
                    ))}
                    </div>
                </Section>





                </>
            )}









            {/* end of page */}
        </div>
    )

}