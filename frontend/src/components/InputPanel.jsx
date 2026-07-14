import { AuthPanel } from "./AuthPanel";
import { SavesPanel } from "./SavesPanel";

export function InputPanel({
  isDesktop,
  sidebarWidth,
  gameInput,
  loading,
  error,
  autosaveWarning,
  session,
  showingPasswordResetPanel,
  savesProps,
  authProps,
  onShowHelp,
  onSubmit,
}) {
  return (
    <div
      className="w-full lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto p-4 sm:p-6 lg:p-8"
      style={isDesktop ? { width: sidebarWidth } : undefined}
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Power Level
        </h1>
        <button
          onClick={onShowHelp}
          className="text-zinc-400 hover:text-amber-400 text-xs underline transition-colors"
        >
          How to use
        </button>
      </div>

      <div>
        <InputModePanel gameInput={gameInput} />

        <button
          onClick={onSubmit}
          disabled={loading}
          className="mt-3 min-h-11 w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm sm:text-xs disabled:opacity-50"
        >
          {loading ? "Loading..." : "Submit"}
        </button>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        {autosaveWarning && (
          <p className="text-amber-300 text-xs mt-2">{autosaveWarning}</p>
        )}

        {session && !showingPasswordResetPanel ? (
          <SavesPanel userEmail={session.user.email} {...savesProps} />
        ) : (
          <AuthPanel {...authProps} />
        )}
      </div>
    </div>
  );
}

function InputModePanel({ gameInput }) {
  const {
    mode,
    toggleMode,
    gameCount,
    pasteInputRef,
    pasteInputStyle,
    pasteInput,
    setPasteInput,
    easyInputRef,
    easyInputStyle,
    gameTag,
    setGameTag,
    games,
    easyGamesEndRef,
    currentLineRef,
    currentLine,
    setCurrentLine,
    handleKeyDown,
    addGame,
  } = gameInput;

  return (
    <>
      <div className="grid grid-cols-1 gap-2 mb-3 sm:flex sm:items-center">
        <button
          onClick={toggleMode}
          className="min-h-11 px-3 py-2 text-sm sm:min-h-0 sm:py-1 sm:text-xs bg-zinc-600 hover:bg-zinc-500 text-zinc-200 sm:text-zinc-400"
        >
          {mode === "paste" ? "-> Easy Input" : "-> Copy Paste"}
        </button>
        {gameCount > 0 && (
          <span className="text-zinc-400 text-xs text-center sm:text-left">
            {gameCount} game{gameCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {mode === "paste" ? (
        <textarea
          ref={pasteInputRef}
          className="w-full min-h-64 sm:min-h-44 bg-zinc-700 border border-zinc-500 text-zinc-200 text-sm sm:text-xs p-3 focus:outline-none focus:border-amber-400/40 resize-none sm:resize-y"
          rows={11}
          style={pasteInputStyle}
          placeholder="Paste your game data here..."
          value={pasteInput}
          onChange={(event) => setPasteInput(event.target.value)}
        />
      ) : (
        <div
          ref={easyInputRef}
          className="min-h-80 sm:min-h-44 max-h-[62svh] sm:max-h-[70vh] resize-none sm:resize-y overflow-hidden border border-zinc-500 p-3 bg-zinc-700 flex flex-col"
          style={easyInputStyle}
        >
          <input
            className="w-full min-h-11 shrink-0 bg-zinc-600 border border-zinc-500 text-zinc-200 text-sm sm:text-xs p-2 mb-3 focus:outline-none focus:border-amber-400/40"
            placeholder="Game tag (e.g. one_vs_one)"
            value={gameTag}
            onChange={(event) => setGameTag(event.target.value)}
            autoCapitalize="none"
          />
          <div className="flex-1 min-h-0 overflow-y-auto mb-3">
            {games.length > 0 ? (
              <>
                {games.map((game, index) => (
                  <div
                    key={index}
                    className="text-zinc-300 sm:text-zinc-400 text-sm sm:text-xs py-2 sm:py-0.5 border-b border-zinc-600 last:border-0"
                  >
                    {game}
                  </div>
                ))}
                <div ref={easyGamesEndRef} />
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center px-6">
                <div>
                  <p className="text-zinc-300 text-sm">Ready for quick entry.</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Add each finished game below.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <input
              ref={currentLineRef}
              className="min-w-0 min-h-11 flex-1 bg-zinc-600 border border-zinc-500 text-zinc-200 text-sm sm:text-xs p-2 focus:outline-none focus:border-amber-400/40"
              placeholder="Add a game line..."
              value={currentLine}
              onChange={(event) => setCurrentLine(event.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={addGame}
              className="min-h-11 px-4 py-2 bg-zinc-800 sm:bg-zinc-700 hover:bg-zinc-600 text-white text-sm sm:text-xs"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </>
  );
}
