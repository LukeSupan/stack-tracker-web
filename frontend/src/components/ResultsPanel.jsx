import {
  CompRow,
  MatchupRow,
  MinGamesInput,
  PlayerCard,
  RoleCompRow,
  Section,
} from "./statDisplay";
import {
  KDScatterPlot,
  MatchupVisualization,
  RankedBarChart,
  RoleStatsChart,
} from "./visualizations";
import { buildResultsModel, playerBarClass } from "../utils/resultStats";

export function ResultsPanel({
  data,
  session,
  analysis,
  analysisMode,
  setAnalysisMode,
  analysisLoading,
  runScouter,
  filters,
  filterSetters,
  resultsViewMode,
  setResultsViewMode,
}) {
  const results = buildResultsModel(data, filters);

  return (
    <div className="flex-1 p-6 lg:p-10 border-t border-zinc-600 lg:border-t-0 min-w-0">
      <ScouterPanel
        session={session}
        analysis={analysis}
        analysisMode={analysisMode}
        setAnalysisMode={setAnalysisMode}
        analysisLoading={analysisLoading}
        runScouter={runScouter}
        filters={filters}
        filterSetters={filterSetters}
      />

      <ResultsModeTabs
        resultsViewMode={resultsViewMode}
        setResultsViewMode={setResultsViewMode}
      />

      {resultsViewMode === "default" ? (
        <DefaultResults data={data} results={results} />
      ) : (
        <DetailedResults data={data} results={results} />
      )}
    </div>
  );
}

function ScouterPanel({
  session,
  analysis,
  analysisMode,
  setAnalysisMode,
  analysisLoading,
  runScouter,
  filters,
  filterSetters,
}) {
  return (
    <Section title="SCOUTER ANALYSIS">
      <div className="max-w-2xl border border-zinc-500 p-4 bg-zinc-700">
        <div className="flex justify-between items-center mb-3">
          <span className="text-zinc-100 text-xs uppercase tracking-widest">
            Scouter
          </span>
          <div className="flex gap-2">
            <select
              value={analysisMode}
              onChange={(event) => setAnalysisMode(event.target.value)}
              disabled={analysisLoading}
              className="bg-zinc-700 border border-zinc-500 text-zinc-100 text-xs px-2 py-1 focus:outline-none focus:border-amber-400/40 disabled:opacity-50"
            >
              <option value="vegeta">Vegeta</option>
              <option value="patterns">Patterns</option>
            </select>
            <button
              onClick={runScouter}
              disabled={analysisLoading || !session}
              className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs disabled:opacity-50"
            >
              {analysisLoading
                ? "Scanning..."
                : session
                  ? analysisMode === "patterns"
                    ? "Run Patterns"
                    : "Run Scouter"
                  : "Sign in required"}
            </button>
          </div>
        </div>

        <FilterGrid filters={filters} filterSetters={filterSetters} />

        <p className="text-zinc-500 text-[11px] mb-3">
          These cutoffs filter visible stats and Scouter input.
        </p>
        {analysis ? (
          <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-line">
            {analysis}
          </p>
        ) : (
          <p className="text-zinc-400 text-xs">
            {analysisMode === "patterns"
              ? "Find patterns in your data."
              : "Vegeta! What does the scouter say about his power level?"}
          </p>
        )}
      </div>
    </Section>
  );
}

function FilterGrid({ filters, filterSetters }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
      <MinGamesInput
        label="Player min games"
        value={filters.playerMinGames}
        onChange={filterSetters.setPlayerMinGames}
      />
      <MinGamesInput
        label="Comp min games"
        value={filters.compMinGames}
        onChange={filterSetters.setCompMinGames}
      />
      <MinGamesInput
        label="Role comp min games"
        value={filters.roleCompMinGames}
        onChange={filterSetters.setRoleCompMinGames}
      />
      <MinGamesInput
        label="Matchup min games"
        value={filters.matchupMinGames}
        onChange={filterSetters.setMatchupMinGames}
      />
    </div>
  );
}

function ResultsModeTabs({ resultsViewMode, setResultsViewMode }) {
  return (
    <div className="mb-8 flex gap-1 border border-zinc-600 bg-zinc-700 p-1 w-fit">
      {["default", "detailed"].map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setResultsViewMode(mode)}
          className={`px-3 py-1 text-xs transition-colors ${
            resultsViewMode === mode
              ? "bg-amber-500 text-zinc-950"
              : "text-zinc-300 hover:bg-zinc-600"
          }`}
        >
          {mode === "default" ? "Default" : "Detailed"}
        </button>
      ))}
    </div>
  );
}

function DefaultResults({ data, results }) {
  return (
    <>
      <Section title="Player Stats">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {results.visiblePlayers.length > 0 ? (
            results.visiblePlayers.map(([name, player]) => (
              <PlayerCard
                key={name}
                name={name}
                player={player}
                kdAverage={results.visiblePlayerKDAverage}
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
          <StatsList
            entries={results.visibleComps}
            emptyMessage="No comps meet the current cutoff."
            renderEntry={([comp, stats]) => (
              <CompRow key={comp} name={comp} stats={stats} />
            )}
          />
        </Section>
      )}

      {data.role_comp_stats && data.role_labels && (
        <Section title="Role Comp Stats">
          <StatsList
            entries={results.visibleRoleComps}
            emptyMessage="No role comps meet the current cutoff."
            renderEntry={([comp, stats]) => (
              <RoleCompRow
                key={comp}
                name={comp}
                stats={stats}
                roleLabels={data.role_labels}
              />
            )}
          />
        </Section>
      )}

      {data.matchup_stats && (
        <Section title="Matchups">
          <StatsList
            entries={results.visibleMatchups}
            emptyMessage="No matchups meet the current cutoff."
            renderEntry={([matchup, matchupData]) => (
              <MatchupRow
                key={matchup}
                matchup={matchup}
                data={matchupData}
              />
            )}
          />
        </Section>
      )}
    </>
  );
}

function StatsList({ entries, emptyMessage, renderEntry }) {
  return (
    <div className="max-w-lg">
      {entries.length > 0 ? (
        entries.map(renderEntry)
      ) : (
        <p className="text-zinc-400 text-sm">{emptyMessage}</p>
      )}
    </div>
  );
}

function DetailedResults({ data, results }) {
  return (
    <>
      <Section title="Player Stats">
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RankedBarChart
            entries={results.playerEntries}
            minGames={results.playerMinGames}
            title="Player ranking"
            sortOptions={results.playerSortOptions}
            getBarClass={playerBarClass}
          />
          <KDScatterPlot
            entries={results.playerEntries}
            minGames={results.playerMinGames}
          />
        </div>
      </Section>

      {results.hasRoleSpecificStats && (
        <Section title="Role Player Stats">
          <RoleStatsChart
            players={data.player_stats}
            roleLabels={data.role_labels}
            minGames={results.playerMinGames}
          />
        </Section>
      )}

      {data.comp_stats && (
        <Section title="Comp Stats">
          <RankedBarChart
            entries={results.compEntries}
            minGames={results.compMinGames}
            title="Comp ranking"
          />
        </Section>
      )}

      {data.role_comp_stats && data.role_labels && (
        <Section title="Role Comp Stats">
          <RankedBarChart
            entries={results.roleCompEntries}
            minGames={results.roleCompMinGames}
            formatLabel={(entry) => (
              <RoleCompChartLabel roleLabels={data.role_labels} entry={entry} />
            )}
            title="Role comp ranking"
          />
        </Section>
      )}

      {data.matchup_stats && (
        <Section title="Matchups">
          <div className="mb-6">
            <MatchupVisualization
              matchups={Object.entries(data.matchup_stats)}
              minGames={results.matchupMinGames}
            />
          </div>
        </Section>
      )}
    </>
  );
}

function RoleCompChartLabel({ roleLabels, entry }) {
  return (
    <div className="space-y-0.5">
      {(roleLabels || []).map((label, index) => (
        <div key={label}>
          <span className="text-zinc-400">{label}: </span>
          {entry.parts?.[index] ? entry.parts[index].replaceAll(",", ", ") : "none"}
        </div>
      ))}
    </div>
  );
}
