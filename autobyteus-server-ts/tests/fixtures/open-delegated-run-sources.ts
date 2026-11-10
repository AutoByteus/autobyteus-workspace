import fs from "node:fs";
import path from "node:path";
import type { TaskExecutionReference } from "../../src/agent-collaboration/execution/task/task-execution-reference.js";
import type { TaskAgentCoordinatingRun } from "../../src/run-history/store/agent-run-metadata-types.js";
import {
  bindOpenDelegatedRunSource,
  unbindOpenDelegatedRunSource,
  type OpenDelegatedRun,
  type OpenDelegatedRunSource,
} from "../../src/run-history/store/open-delegated-run-source.js";

/**
 * Test sources of a top run's open delegated runs (autobyteus-469 D-1). In the product the Task records answer
 * (`TaskExecutionResourceService.openDelegatedRunsOf`); a test whose subject is not which runs are in a tree uses
 * one of these instead of building Task records.
 */

const keyOf = (run: TaskAgentCoordinatingRun): string => `${run.kind}:${run.runId}`;

/** Answers exactly what the test sets, per top run; nothing for any other. */
export class FixedOpenDelegatedRuns implements OpenDelegatedRunSource {
  private readonly open = new Map<string, readonly OpenDelegatedRun[]>();

  /** The top run's open delegated runs; a bare reference counts as started. */
  set(run: TaskAgentCoordinatingRun, runs: readonly (TaskExecutionReference | OpenDelegatedRun)[]): this {
    this.open.set(keyOf(run), runs.map((entry) => "run" in entry ? entry : { run: entry, started: true }));
    return this;
  }

  openDelegatedRunsOf(run: TaskAgentCoordinatingRun): readonly OpenDelegatedRun[] {
    return this.open.get(keyOf(run)) ?? [];
  }
}

const readJson = (file: string): Record<string, any> | null => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, any>; } catch { return null; }
};
const entries = (dir: string): string[] => {
  try { return fs.readdirSync(dir).sort(); } catch { return []; }
};

/**
 * Every delegated run under the memory root whose own file names the top run as its coordinating run is open (as if
 * each had an open Task). For tests whose fixtures write delegated runs through a tree store and have no Task records.
 */
export class EveryOwnFileOpen implements OpenDelegatedRunSource {
  constructor(private readonly memoryRoot: string) {}

  openDelegatedRunsOf(run: TaskAgentCoordinatingRun): readonly OpenDelegatedRun[] {
    const names = (section: Record<string, any> | undefined) =>
      section?.coordinatingRun?.kind === run.kind && section.coordinatingRun.runId === run.runId;
    const agents = entries(path.join(this.memoryRoot, "agents"))
      .filter((id) => names(readJson(path.join(this.memoryRoot, "agents", id, "run_metadata.json"))?.taskAgent))
      .map((agentRunId): OpenDelegatedRun => ({ run: { agentRunId }, started: true }));
    const teams = entries(path.join(this.memoryRoot, "agent_teams"))
      .filter((id) => names(readJson(path.join(this.memoryRoot, "agent_teams", id, "team_run_execution_tree.json"))?.taskAgent))
      .map((teamRunId): OpenDelegatedRun => ({ run: { teamRunId }, started: true }));
    return [...agents, ...teams];
  }
}

/** Binds a source for the process (as the composition does) and returns its release, for `afterEach`. */
export const bindTestOpenDelegatedRuns = (source: OpenDelegatedRunSource): (() => void) => {
  bindOpenDelegatedRunSource(source);
  return () => unbindOpenDelegatedRunSource(source);
};

const ownFileRoots = new Set<string>();
/**
 * Every registered root's runs, once each. They count as not started: a store reading another root's tree (a test with
 * several roots) finds no own file for them there and leaves them out silently.
 */
const everyOwnFileUnderRegisteredRoots: OpenDelegatedRunSource = Object.freeze({
  openDelegatedRunsOf: (run: TaskAgentCoordinatingRun) => {
    const runs = new Map<string, OpenDelegatedRun>();
    for (const root of ownFileRoots) {
      for (const open of new EveryOwnFileOpen(root).openDelegatedRunsOf(run)) {
        const key = "agentRunId" in open.run ? `agent:${open.run.agentRunId}` : `team:${open.run.teamRunId}`;
        runs.set(key, { run: open.run, started: false });
      }
    }
    return [...runs.values()];
  },
});

/**
 * For a test whose memory root holds delegated runs written through the tree stores and no Task records: every
 * delegated run under this root (and any other root registered in the same test file) is open. Binds the source.
 */
export const openEveryOwnFileUnder = (memoryRoot: string): void => {
  ownFileRoots.add(memoryRoot);
  bindOpenDelegatedRunSource(everyOwnFileUnderRegisteredRoots);
};
