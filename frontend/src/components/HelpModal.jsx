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
  [kills-deaths]     optional K/D for a player, e.g. luke[5-3]
  none               fills empty role slots (randoms)

K/D can be mixed freely. You can add it to any or all players, in any
game type. Players without brackets are simply not counted in KD.
If only some games have KD, the ones that don't are just ignored.
Essentially acting as an average KD game.

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
  luke,mar/aiden,ray,kayla,dalton/win`;

export function HowToUseModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-700 border border-zinc-500 max-w-2xl w-full flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 pb-4 border-b border-zinc-500 shrink-0">
          <span className="text-amber-400 text-base font-black uppercase tracking-widest">
            How to Use
          </span>
          <button
            onClick={onClose}
            className="text-zinc-100 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-6 pt-4">
          <pre className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap font-mono">
            {HOW_TO_USE}
          </pre>
        </div>
      </div>
    </div>
  );
}
