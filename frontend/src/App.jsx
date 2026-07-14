import { useEffect, useState } from "react";
import { HowToUseModal } from "./components/HelpModal";
import { InputPanel } from "./components/InputPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { useAuthSession } from "./hooks/useAuthSession";
import { useCloudSaves } from "./hooks/useCloudSaves";
import { useGameInput } from "./hooks/useGameInput";
import { useResizableSidebar } from "./hooks/useResizableSidebar";
import { API_URL, readResponseError } from "./utils/api";
import {
  filterStatsByGames,
  minGamesValue,
  readMinGamesSetting,
} from "./utils/stats";

const SIDEBAR_WIDTH_KEY = "sidebarWidth";
const ANALYSIS_MODE_KEY = "analysisMode";
const RESULTS_VIEW_MODE_KEY = "resultsViewMode";

export default function App() {
  const { isDesktop, sidebarWidth, startResize } =
    useResizableSidebar(SIDEBAR_WIDTH_KEY);
  const input = useGameInput(isDesktop);
  const { session, signOut, showingPasswordResetPanel, authProps } =
    useAuthSession();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [autosaveWarning, setAutosaveWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisMode, setAnalysisMode] = useState(
    () => localStorage.getItem(ANALYSIS_MODE_KEY) || "vegeta",
  );
  const [resultsViewMode, setResultsViewMode] = useState(
    () => localStorage.getItem(RESULTS_VIEW_MODE_KEY) || "default",
  );
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

  const { autoUpdateActiveSaveContent, savesProps } = useCloudSaves({
    session,
    authLoading: authProps.authLoading,
    currentContent: input.currentContent,
    onLoadContent: loadSavedContent,
    onNewBlank: startNewBlankSave,
  });

  useEffect(() => {
    persistMinGames("playerMinGames", playerMinGames);
  }, [playerMinGames]);
  useEffect(() => {
    persistMinGames("compMinGames", compMinGames);
  }, [compMinGames]);
  useEffect(() => {
    persistMinGames("roleCompMinGames", roleCompMinGames);
  }, [roleCompMinGames]);
  useEffect(() => {
    persistMinGames("matchupMinGames", matchupMinGames);
  }, [matchupMinGames]);
  useEffect(() => {
    setAnalysis(null);
  }, [
    analysisMode,
    playerMinGames,
    compMinGames,
    roleCompMinGames,
    matchupMinGames,
  ]);
  useEffect(() => {
    localStorage.setItem(ANALYSIS_MODE_KEY, analysisMode);
  }, [analysisMode]);
  useEffect(() => {
    localStorage.setItem(RESULTS_VIEW_MODE_KEY, resultsViewMode);
  }, [resultsViewMode]);
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setShowHelp(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function submitData() {
    const submittedContent = input.currentContent();
    setLoading(true);
    setError(null);
    setAutosaveWarning("");
    setAnalysis(null);
    try {
      const res = await fetch(`${API_URL}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: input.currentLines() }),
      });
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Something went wrong"));
      }
      setData(await res.json());
      const autosaveResult =
        await autoUpdateActiveSaveContent(submittedContent);
      if (autosaveResult && !autosaveResult.saved && autosaveResult.message) {
        setAutosaveWarning(autosaveResult.message);
        if (autosaveResult.alert) {
          window.alert(autosaveResult.message);
        }
      }
    } catch (errorObject) {
      setError(errorObject.message);
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
    setAnalysis("");
    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          data: filteredAnalysisData,
          analysis_mode: analysisMode,
          save_name: savesProps.saveName,
        }),
      });
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Scouter failed"));
      }

      if (!res.body) {
        setAnalysis(await res.text());
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamedText += decoder.decode(value, { stream: true });
        setAnalysis(streamedText);
      }

      streamedText += decoder.decode();
      setAnalysis(streamedText);
    } catch (errorObject) {
      setAnalysis(errorObject.message || "Scouter failed.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  function loadSavedContent(content) {
    input.applySavedContent(content);
    clearOutput();
  }

  function startNewBlankSave() {
    input.clearInput();
    clearOutput();
  }

  function clearOutput() {
    setData(null);
    setAnalysis(null);
    setError(null);
  }

  const filters = {
    playerMinGames,
    compMinGames,
    roleCompMinGames,
    matchupMinGames,
  };
  const filterSetters = {
    setPlayerMinGames,
    setCompMinGames,
    setRoleCompMinGames,
    setMatchupMinGames,
  };

  return (
    <div
      className="min-h-screen bg-zinc-800 text-zinc-100"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {showHelp && <HowToUseModal onClose={() => setShowHelp(false)} />}

      <div className="flex flex-col lg:flex-row min-h-screen">
        <InputPanel
          isDesktop={isDesktop}
          sidebarWidth={sidebarWidth}
          gameInput={input}
          loading={loading}
          error={error}
          autosaveWarning={autosaveWarning}
          session={session}
          showingPasswordResetPanel={showingPasswordResetPanel}
          savesProps={{ ...savesProps, onSignOut: signOut }}
          authProps={authProps}
          onShowHelp={() => setShowHelp(true)}
          onSubmit={submitData}
        />

        <div
          onMouseDown={startResize}
          className="hidden lg:block w-1 shrink-0 bg-zinc-600 hover:bg-amber-400/60 transition-colors cursor-col-resize"
        />

        {data && (
          <ResultsPanel
            data={data}
            session={session}
            analysis={analysis}
            analysisMode={analysisMode}
            setAnalysisMode={setAnalysisMode}
            analysisLoading={analysisLoading}
            runScouter={runScouter}
            filters={filters}
            filterSetters={filterSetters}
            resultsViewMode={resultsViewMode}
            setResultsViewMode={setResultsViewMode}
          />
        )}
      </div>
    </div>
  );
}

function persistMinGames(key, value) {
  if (value !== "") {
    localStorage.setItem(key, String(minGamesValue(value)));
  }
}
