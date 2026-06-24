export function SavesPanel({
  userEmail,
  saves,
  savesLoading,
  savesError,
  saveMessage,
  saveName,
  setSaveName,
  activeSaveId,
  onSave,
  onSaveAsNew,
  onLoad,
  onDelete,
  onNew,
  onSignOut,
}) {
  return (
    <div className="mt-6 min-h-64 max-h-[70vh] overflow-auto resize-y border border-zinc-500 bg-zinc-700 p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-zinc-100 text-xs uppercase tracking-widest">
            Saves
          </div>
          <div className="text-zinc-400 text-[11px] truncate max-w-44">
            {userEmail}
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="text-zinc-400 hover:text-amber-400 text-xs underline"
        >
          Sign out
        </button>
      </div>

      <input
        className="w-full bg-zinc-600 border border-zinc-500 text-zinc-200 text-xs p-2 mb-2 focus:outline-none focus:border-amber-400/40"
        placeholder="Save name"
        value={saveName}
        onChange={(event) => setSaveName(event.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={onSave}
          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
        >
          {activeSaveId ? "Update Save" : "Save New"}
        </button>
        <button
          onClick={onNew}
          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-600 text-white text-xs"
        >
          New Blank
        </button>
      </div>

      {activeSaveId && (
        <button
          onClick={onSaveAsNew}
          className="w-full mb-3 px-3 py-2 bg-zinc-800 hover:bg-zinc-600 text-white text-xs"
        >
          Save as Copy
        </button>
      )}

      {saveMessage && (
        <p className="text-emerald-400 text-xs mb-2">{saveMessage}</p>
      )}
      {savesError && <p className="text-red-400 text-xs mb-2">{savesError}</p>}

      <div className="max-h-52 overflow-y-auto border-t border-zinc-600 pt-2 pr-3">
        {savesLoading ? (
          <p className="text-zinc-400 text-xs">Loading saves...</p>
        ) : saves.length === 0 ? (
          <p className="text-zinc-400 text-xs">No cloud saves yet.</p>
        ) : (
          saves.map((save) => (
            <div
              key={save.id}
              className="py-2 border-b border-zinc-600 last:border-0"
            >
              <button
                onClick={() => onLoad(save)}
                className={`block w-full text-left text-xs ${
                  save.id === activeSaveId
                    ? "text-amber-400"
                    : "text-zinc-100 hover:text-white"
                }`}
              >
                {save.name}
              </button>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-zinc-500 text-[11px]">
                  {new Date(save.updated_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => onDelete(save.id)}
                  className="text-red-400 hover:text-red-300 text-[11px] underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
