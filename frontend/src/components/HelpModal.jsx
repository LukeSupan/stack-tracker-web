const HOW_TO_USE = `STACK TRACKER FOR WEB

This is intended to be used socially; if you are hardcore about your specific stats, there are online trackers that do this better. This specifically tracks individual stats overall and role-based, stats for specific teams, stats for role specific teams, and matchups between you and others in games where you play each other.

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

const PRIVACY_SECTIONS = [
  {
    title: "The short version",
    body: [
      "Power Level is a small stats tool. It is meant for casual game tracking, not anything high-stakes.",
      "I do not sell your personal info, run ad tracking, or use your saves to train my own AI model.",
    ],
  },
  {
    title: "What this site collects",
    body: [
      "If you make an account, Supabase handles your login and stores account info like your email address, user ID, session data, and password reset info.",
      "If you use cloud saves, this site stores your save names and the game data you choose to save.",
      "The app also keeps small settings in your browser, like input mode, selected save, sidebar size, filters, and analysis mode.",
    ],
  },
  {
    title: "AI analysis",
    body: [
      "When you run Scouter or Patterns, this site sends the filtered stats and save name to Anthropic so Claude can generate the analysis.",
      "Do not paste secrets, private notes, or anything sensitive into your game data.",
    ],
  },
  {
    title: "Who helps run it",
    body: [
      "Supabase provides account login and cloud saves.",
      "Anthropic provides the AI analysis.",
      "The site host and API host may receive normal technical info like IP address, browser details, and request logs. Google Fonts may also receive normal browser request info when fonts load.",
    ],
  },
  {
    title: "Deleting stuff",
    body: [
      "You can delete individual cloud saves inside the app.",
      "For account or full data deletion, email the address below.",
    ],
  },
  {
    title: "Kids",
    body: [
      "This site is not meant for children under 13. Please do not make an account or save data here if you are under 13.",
    ],
  },
  {
    title: "Changes",
    body: [
      "If this changes in a meaningful way, I will update this notice. Last updated August 15, 2026.",
    ],
  },
];

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

export function PrivacyModal({ onClose }) {
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
          <div>
            <span className="text-amber-400 text-base font-black uppercase tracking-widest">
              Privacy
            </span>
            <p className="text-zinc-400 text-xs mt-1">
              Plain English, no weird legal fog.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-100 hover:text-white text-2xl leading-none"
            aria-label="Close privacy notice"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-6 pt-4 space-y-5">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-zinc-100 text-xs uppercase tracking-widest mb-2">
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-zinc-300 text-sm leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <p className="text-zinc-400 text-xs leading-relaxed border-t border-zinc-600 pt-4">
            Contact:
            <a
              href="mailto:lukesupan@outlook.com"
              className="text-amber-400 hover:text-amber-300 underline ml-1"
            >
              lukesupan@outlook.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
