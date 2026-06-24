import { useState, useEffect, useRef, useCallback } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { HowToUseModal } from "./components/HelpModal";
import { SavesPanel } from "./components/SavesPanel";
import {
  CompRow,
  MatchupRow,
  MinGamesInput,
  PlayerCard,
  RoleCompRow,
  Section,
} from "./components/statDisplay";
import {
  averagePlayerKD,
  filterStatsByGames,
  minGamesValue,
  readMinGamesSetting,
  winrateVal,
} from "./utils/stats";
import {
  readStoredNumber,
  usePersistedElementHeight,
} from "./hooks/usePersistedElementSize";
import { supabase } from "./supabaseClient";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const PASTE_INPUT_HEIGHT_KEY = "pasteInputHeight";
const EASY_INPUT_HEIGHT_KEY = "easyInputHeight";
const SIDEBAR_WIDTH_KEY = "sidebarWidth";

export default function App() {
  const [mode, setMode] = useState("paste");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [playerMinGames, setPlayerMinGames] = useState(() =>
    readMinGamesSetting("playerMinGames"),
  );
  const [compMinGames, setCompMinGames] = useState(() =>
    readMinGamesSetting("compMinGames"),
  );
  const [roleCompMinGames, setRoleCompMinGames] = useState(() =>
    readMinGamesSetting("roleCompMinGames"),
  );
  const [matchupMinGames, setMatchupMinGames] = useState(() =>
    readMinGamesSetting("matchupMinGames"),
  );

  // sidebar resize
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readStoredNumber(SIDEBAR_WIDTH_KEY, 320, 240, 640),
  );
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const isResizingRef = useRef(false);
  const pasteInputRef = useRef(null);
  const easyInputRef = useRef(null);
  const [pasteInputHeight] = useState(() =>
    readStoredNumber(PASTE_INPUT_HEIGHT_KEY, 176, 176),
  );
  const [easyInputHeight] = useState(() =>
    readStoredNumber(EASY_INPUT_HEIGHT_KEY, 176, 176),
  );

  usePersistedElementHeight(pasteInputRef, PASTE_INPUT_HEIGHT_KEY, mode);
  usePersistedElementHeight(easyInputRef, EASY_INPUT_HEIGHT_KEY, mode);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    function onMouseMove(e) {
      if (!isResizingRef.current) return;
      setSidebarWidth(Math.min(Math.max(e.clientX, 240), 640));
    }
    function onMouseUp() {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  function startResize(e) {
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }

  const [pasteInput, setPasteInput] = useState(
    () => localStorage.getItem("pasteInput") || "",
  );
  const [gameTag, setGameTag] = useState(
    () => localStorage.getItem("gameTag") || "",
  );
  const [games, setGames] = useState(() => {
    const saved = localStorage.getItem("games");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentLine, setCurrentLine] = useState("");
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("signIn");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [saves, setSaves] = useState([]);
  const [savesLoading, setSavesLoading] = useState(false);
  const [savesError, setSavesError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveName, setSaveName] = useState("");
  const [activeSaveId, setActiveSaveId] = useState(null);

  const fetchSaves = useCallback(async () => {
    if (!supabase || !session) return;
    setSavesLoading(true);
    setSavesError("");
    try {
      const { data: loadedSaves, error: loadError } = await supabase
        .from("saves")
        .select("id,name,content,created_at,updated_at")
        .order("updated_at", { ascending: false });

      if (loadError) throw loadError;
      setSaves(loadedSaves || []);
    } catch (errorObject) {
      setSavesError(errorObject.message);
    } finally {
      setSavesLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!mounted) return;
      setSession(sessionData.session);
      setAuthLoading(false);
    });

    const { data: listenerData } = supabase.auth.onAuthStateChange(
      (authEvent, currentSession) => {
        setSession(currentSession);
        if (authEvent === "SIGNED_OUT") {
          setSaves([]);
          setActiveSaveId(null);
          setSaveName("");
        }
      },
    );

    return () => {
      mounted = false;
      listenerData.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      fetchSaves();
    }
  }, [session, fetchSaves]);

  useEffect(() => {
    localStorage.setItem("pasteInput", pasteInput);
  }, [pasteInput]);
  useEffect(() => {
    localStorage.setItem("gameTag", gameTag);
  }, [gameTag]);
  useEffect(() => {
    localStorage.setItem("games", JSON.stringify(games));
  }, [games]);
  useEffect(() => {
    if (playerMinGames !== "") {
      localStorage.setItem("playerMinGames", String(minGamesValue(playerMinGames)));
    }
  }, [playerMinGames]);
  useEffect(() => {
    if (compMinGames !== "") {
      localStorage.setItem("compMinGames", String(minGamesValue(compMinGames)));
    }
  }, [compMinGames]);
  useEffect(() => {
    if (roleCompMinGames !== "") {
      localStorage.setItem(
        "roleCompMinGames",
        String(minGamesValue(roleCompMinGames)),
      );
    }
  }, [roleCompMinGames]);
  useEffect(() => {
    if (matchupMinGames !== "") {
      localStorage.setItem("matchupMinGames", String(minGamesValue(matchupMinGames)));
    }
  }, [matchupMinGames]);
  useEffect(() => {
    setAnalysis(null);
  }, [playerMinGames, compMinGames, roleCompMinGames, matchupMinGames]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setShowHelp(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function easyToLines() {
    return [gameTag.trim(), ...games];
  }
  function pasteToLines() {
    return pasteInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
  }
  function switchToPaste() {
    if (gameTag.trim() || games.length > 0)
      setPasteInput([gameTag.trim(), ...games].join("\n"));
    setMode("paste");
  }
  function switchToEasy() {
    const lines = pasteInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    if (lines.length > 0) {
      setGameTag(lines[0]);
      setGames(lines.slice(1));
    }
    setMode("easy");
  }
  function toggleMode() {
    mode === "paste" ? switchToEasy() : switchToPaste();
  }
  function currentContent() {
    if (mode === "paste") return pasteInput.trim();
    return easyToLines()
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }
  function applySavedContent(content) {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    setPasteInput(content);
    setGameTag(lines[0] || "");
    setGames(lines.slice(1));
    setCurrentLine("");
    setMode("paste");
    setData(null);
    setAnalysis(null);
    setError(null);
  }
  function addGame() {
    if (!currentLine.trim()) return;
    setGames((prev) => [...prev, currentLine.trim()]);
    setCurrentLine("");
  }
  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addGame();
    }
  }

  async function submitData() {
    const lines = mode === "paste" ? pasteToLines() : easyToLines();
    const submittedContent = currentContent();
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch(`${API_URL}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Something went wrong");
      }
      setData(await res.json());
      await autoUpdateActiveSaveContent(submittedContent);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runScouter() {
    if (!session) {
      setAnalysis("Sign in to run the Scouter.");
      return;
    }

    const filteredAnalysisData = {
      ...data,
      player_stats: filterStatsByGames(
        data.player_stats,
        minGamesValue(playerMinGames),
      ),
      comp_stats: filterStatsByGames(data.comp_stats, minGamesValue(compMinGames)),
      role_comp_stats: filterStatsByGames(
        data.role_comp_stats,
        minGamesValue(roleCompMinGames),
      ),
      matchup_stats: filterStatsByGames(
        data.matchup_stats,
        minGamesValue(matchupMinGames),
      ),
    };

    setAnalysisLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ data: filteredAnalysisData }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Scouter failed");
      }
      const json = await res.json();
      setAnalysis(json.analysis);
    } catch (errorObject) {
      setAnalysis(errorObject.message || "Scouter failed.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    if (!supabase) return;

    setAuthLoading(true);
    setAuthMessage("");
    setAuthError("");

    try {
      const email = authEmail.trim();
      const password = authPassword;
      const authResponse =
        authMode === "signIn"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (authResponse.error) throw authResponse.error;

      if (authMode === "signUp" && !authResponse.data.session) {
        setAuthMessage("Check your email to confirm your account.");
      } else {
        setAuthMessage(authMode === "signIn" ? "Signed in." : "Signed up.");
      }
      setAuthPassword("");
    } catch (errorObject) {
      setAuthError(errorObject.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function autoUpdateActiveSaveContent(content) {
    if (!supabase || !session || !activeSaveId || !content) return;

    setSavesError("");
    setSaveMessage("");

    try {
      const { data: updatedSave, error: updateError } = await supabase
        .from("saves")
        .update({ content })
        .eq("id", activeSaveId)
        .select("id,name,content,created_at,updated_at")
        .single();

      if (updateError) throw updateError;
      setSaves((previousSaves) => [
        updatedSave,
        ...previousSaves.filter((save) => save.id !== updatedSave.id),
      ]);
      setSaveMessage("Save auto-updated.");
    } catch (errorObject) {
      setSavesError(`Stats submitted, but autosave failed: ${errorObject.message}`);
    }
  }

  async function writeSave({ forceNew = false } = {}) {
    if (!supabase || !session) return;

    const name = saveName.trim();
    const content = currentContent();

    if (!name) {
      setSavesError("Give this save a name first.");
      return;
    }

    if (!content) {
      setSavesError("There is no game data to save yet.");
      return;
    }

    setSavesError("");
    setSaveMessage("");

    try {
      if (activeSaveId && !forceNew) {
        const { data: updatedSave, error: updateError } = await supabase
          .from("saves")
          .update({ name, content })
          .eq("id", activeSaveId)
          .select("id,name,content,created_at,updated_at")
          .single();

        if (updateError) throw updateError;
        setSaves((previousSaves) => [
          updatedSave,
          ...previousSaves.filter((save) => save.id !== updatedSave.id),
        ]);
        setSaveMessage("Save updated.");
        return;
      }

      const { data: createdSave, error: createError } = await supabase
        .from("saves")
        .insert({ user_id: session.user.id, name, content })
        .select("id,name,content,created_at,updated_at")
        .single();

      if (createError) throw createError;
      setActiveSaveId(createdSave.id);
      setSaves((previousSaves) => [
        createdSave,
        ...previousSaves.filter((save) => save.id !== createdSave.id),
      ]);
      setSaveMessage("Save created.");
    } catch (errorObject) {
      setSavesError(errorObject.message);
    }
  }

  function loadSave(save) {
    setActiveSaveId(save.id);
    setSaveName(save.name);
    setSaveMessage("");
    setSavesError("");
    applySavedContent(save.content);
  }

  function newBlankSave() {
    setActiveSaveId(null);
    setSaveName("");
    setPasteInput("");
    setGameTag("");
    setGames([]);
    setCurrentLine("");
    setData(null);
    setAnalysis(null);
    setError(null);
    setSaveMessage("");
    setSavesError("");
  }

  async function deleteSave(saveId) {
    if (!supabase) return;
    const confirmed = window.confirm("Delete this save permanently?");
    if (!confirmed) return;

    setSavesError("");
    setSaveMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("saves")
        .delete()
        .eq("id", saveId);

      if (deleteError) throw deleteError;
      setSaves((previousSaves) =>
        previousSaves.filter((save) => save.id !== saveId),
      );
      if (saveId === activeSaveId) {
        setActiveSaveId(null);
      }
      setSaveMessage("Save deleted.");
    } catch (errorObject) {
      setSavesError(errorObject.message);
    }
  }

  const gameCount =
    mode === "paste" ? Math.max(0, pasteToLines().length - 1) : games.length;

  function sortedPlayers() {
    if (!data) return [];
    return Object.entries(
      filterStatsByGames(data.player_stats, minGamesValue(playerMinGames)),
    ).sort(
      ([, a], [, b]) =>
        winrateVal(b.wins, b.games) - winrateVal(a.wins, a.games),
    );
  }
  function sortedComps() {
    if (!data?.comp_stats) return [];
    return Object.entries(
      filterStatsByGames(data.comp_stats, minGamesValue(compMinGames)),
    ).sort(
      ([, a], [, b]) =>
        winrateVal(b.wins, b.games) - winrateVal(a.wins, a.games),
    );
  }
  function sortedRoleComps() {
    if (!data?.role_comp_stats) return [];
    return Object.entries(
      filterStatsByGames(data.role_comp_stats, minGamesValue(roleCompMinGames)),
    ).sort(
      ([, a], [, b]) =>
        winrateVal(b.wins, b.games) - winrateVal(a.wins, a.games),
    );
  }
  function sortedMatchups() {
    if (!data?.matchup_stats) return [];
    return Object.entries(
      filterStatsByGames(data.matchup_stats, minGamesValue(matchupMinGames)),
    ).sort(([, a], [, b]) => b.games - a.games);
  }

  const visiblePlayers = sortedPlayers();
  const visibleComps = sortedComps();
  const visibleRoleComps = sortedRoleComps();
  const visibleMatchups = sortedMatchups();
  const visiblePlayerKDAverage = averagePlayerKD(visiblePlayers);

  return (
    <div
      className="min-h-screen bg-zinc-800 text-zinc-100"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {showHelp && <HowToUseModal onClose={() => setShowHelp(false)} />}

      {/* desktop: two column. mobile: single column stacked */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Input panel — full width on mobile, resizable sidebar on desktop */}
        <div
          className="w-full lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto p-6 lg:p-8"
          style={isDesktop ? { width: sidebarWidth } : undefined}
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Power Level
            </h1>
            <button
              onClick={() => setShowHelp(true)}
              className="text-zinc-400 hover:text-amber-400 text-xs underline transition-colors"
            >
              How to use
            </button>
          </div>

          <div>
            <div className="flex gap-2 mb-3 items-center">
              <button
                onClick={toggleMode}
                className="px-3 py-1 text-xs bg-zinc-600 hover:bg-zinc-500 text-zinc-400"
              >
                {mode === "paste" ? "→ Easy Input" : "→ Copy Paste"}
              </button>
              {gameCount > 0 && (
                <span className="text-zinc-400 text-xs">
                  {gameCount} game{gameCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {mode === "paste" ? (
              <textarea
                ref={pasteInputRef}
                className="w-full min-h-44 bg-zinc-700 border border-zinc-500 text-zinc-200 text-xs p-3 focus:outline-none focus:border-amber-400/40 resize-y"
                rows={11}
                style={{ height: pasteInputHeight }}
                placeholder="Paste your game data here..."
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
              />
            ) : (
              <div
                ref={easyInputRef}
                className="min-h-44 max-h-[70vh] overflow-auto resize-y border border-zinc-500 p-3 bg-zinc-700"
                style={{ height: easyInputHeight }}
              >
                <input
                  className="w-full bg-zinc-600 border border-zinc-500 text-zinc-200 text-xs p-2 mb-3 focus:outline-none focus:border-amber-400/40"
                  placeholder="Game tag (e.g. one_vs_one)"
                  value={gameTag}
                  onChange={(e) => setGameTag(e.target.value)}
                />
                {games.length > 0 && (
                  <div className="mb-3 max-h-40 overflow-y-auto">
                    {games.map((game, i) => (
                      <div
                        key={i}
                        className="text-zinc-400 text-xs py-0.5 border-b border-zinc-600 last:border-0"
                      >
                        {game}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-zinc-600 border border-zinc-500 text-zinc-200 text-xs p-2 focus:outline-none focus:border-amber-400/40"
                    placeholder="Add a game line..."
                    value={currentLine}
                    onChange={(e) => setCurrentLine(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={addGame}
                    className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-xs"
                  >
                    Add
                  </button>
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

            {session ? (
              <SavesPanel
                userEmail={session.user.email}
                saves={saves}
                savesLoading={savesLoading}
                savesError={savesError}
                saveMessage={saveMessage}
                saveName={saveName}
                setSaveName={setSaveName}
                activeSaveId={activeSaveId}
                onSave={() => writeSave()}
                onSaveAsNew={() => writeSave({ forceNew: true })}
                onLoad={loadSave}
                onDelete={deleteSave}
                onNew={newBlankSave}
                onSignOut={signOut}
              />
            ) : (
              <AuthPanel
                supabaseReady={Boolean(supabase)}
                authMode={authMode}
                setAuthMode={setAuthMode}
                authEmail={authEmail}
                setAuthEmail={setAuthEmail}
                authPassword={authPassword}
                setAuthPassword={setAuthPassword}
                authLoading={authLoading}
                authMessage={authMessage}
                authError={authError}
                onSubmit={handleAuth}
              />
            )}
          </div>
        </div>

        {/* Resize handle — desktop only */}
        <div
          onMouseDown={startResize}
          className="hidden lg:block w-1 shrink-0 bg-zinc-600 hover:bg-amber-400/60 transition-colors cursor-col-resize"
        />

        {/* Results panel */}
        {data && (
          <div className="flex-1 p-6 lg:p-10 border-t border-zinc-600 lg:border-t-0 min-w-0">
            <Section title="SCOUTER ANALYSIS">
              <div className="max-w-2xl border border-zinc-500 p-4 bg-zinc-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-zinc-100 text-xs uppercase tracking-widest">
                    Scouter
                  </span>
                  <button
                    onClick={runScouter}
                    disabled={analysisLoading || !session}
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs disabled:opacity-50"
                  >
                    {analysisLoading
                      ? "Scanning..."
                      : session
                        ? "Run Scouter"
                        : "Sign in required"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
                  <MinGamesInput
                    label="Player min games"
                    value={playerMinGames}
                    onChange={setPlayerMinGames}
                  />
                  <MinGamesInput
                    label="Comp min games"
                    value={compMinGames}
                    onChange={setCompMinGames}
                  />
                  <MinGamesInput
                    label="Role comp min games"
                    value={roleCompMinGames}
                    onChange={setRoleCompMinGames}
                  />
                  <MinGamesInput
                    label="Matchup min games"
                    value={matchupMinGames}
                    onChange={setMatchupMinGames}
                  />
                </div>
                <p className="text-zinc-500 text-[11px] mb-3">
                  These cutoffs filter visible stats and what Vegeta sees.
                </p>
                {analysis ? (
                  <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-line">
                    {analysis}
                  </p>
                ) : (
                  <p className="text-zinc-400 text-xs">
                    Vegeta! What does the scouter say about his power level?
                  </p>
                )}
              </div>
            </Section>

            <Section title="Player Stats">
              <div className="flex flex-wrap gap-3">
                {visiblePlayers.length > 0 ? (
                  visiblePlayers.map(([name, player]) => (
                    <PlayerCard
                      key={name}
                      name={name}
                      player={player}
                      kdAverage={visiblePlayerKDAverage}
                    />
                  ))
                ) : (
                  <p className="text-zinc-400 text-sm">
                    No players meet the current cutoff.
                  </p>
                )}
              </div>
            </Section>

            {data.comp_stats && (
              <Section title="Comp Stats">
                <div className="max-w-lg">
                  {visibleComps.length > 0 ? (
                    visibleComps.map(([comp, stats]) => (
                      <CompRow key={comp} name={comp} stats={stats} />
                    ))
                  ) : (
                    <p className="text-zinc-400 text-sm">
                      No comps meet the current cutoff.
                    </p>
                  )}
                </div>
              </Section>
            )}

            {data.role_comp_stats && data.role_labels && (
              <Section title="Role Comp Stats">
                <div className="max-w-lg">
                  {visibleRoleComps.length > 0 ? (
                    visibleRoleComps.map(([comp, stats]) => (
                      <RoleCompRow
                        key={comp}
                        name={comp}
                        stats={stats}
                        roleLabels={data.role_labels}
                      />
                    ))
                  ) : (
                    <p className="text-zinc-400 text-sm">
                      No role comps meet the current cutoff.
                    </p>
                  )}
                </div>
              </Section>
            )}

            {data.matchup_stats && (
              <Section title="Matchups">
                <div className="max-w-lg">
                  {visibleMatchups.length > 0 ? (
                    visibleMatchups.map(([matchup, matchupData]) => (
                      <MatchupRow
                        key={matchup}
                        matchup={matchup}
                        data={matchupData}
                      />
                    ))
                  ) : (
                    <p className="text-zinc-400 text-sm">
                      No matchups meet the current cutoff.
                    </p>
                  )}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

