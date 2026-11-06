import path from "node:path";
import { MemoryRunSummaryBuilder, mergeMemoryAvailability } from "../../agent-memory/services/memory-run-summary-builder.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import type { MemoryAvailabilityBuildResult } from "../../agent-memory/domain/models.js";
import { AgentOrgExecutionTreeLocationService } from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { StandaloneRootLocationService } from "../../standalone-agent-run-root/services/standalone-root-location-service.js";
import { TeamRunExecutionTreeLocationService } from "./team-run-execution-tree-location-service.js";

type Located = Readonly<{ memoryDir: string }>;

export type RunLastActivityReaderDependencies = Readonly<{
  memoryDir: string;
  /** An Agent root's delegated copies (task agents and task-team members). */
  agentLocations?: Pick<StandaloneRootLocationService, "listAgents">;
  /** A Team root's agents (configured members, task agents, task-team members). */
  teamLocations?: Pick<TeamRunExecutionTreeLocationService, "listAgents">;
  /** An Org root's agents. */
  orgLocations?: Pick<AgentOrgExecutionTreeLocationService, "listAgents">;
  warn?: (message: string) => void;
}>;

/**
 * When a run was last active, its delegated work included (workspace-tree-vs-chooser DS-005, from autobyteus-378): the newest memory file of the run's
 * own folder and of every agent its execution tree locates, by the Memory page's rule (`MemoryRunSummaryBuilder`,
 * `mergeMemoryAvailability`). A run with no memory file anywhere answers its `createdAt`. Nothing is stored.
 *
 * Containment (DESIGN.md rule 7): a root whose tree cannot be read is logged with the reason and keeps the time of its
 * own folder (for a Team or Org root, which has none: `createdAt`); a folder whose memory cannot be read is logged and
 * skipped. It never fails the history read.
 */
export class RunLastActivityReader {
  private readonly runs: MemoryRunSummaryBuilder;
  private readonly warn: (message: string) => void;
  // The default location services read the process run managers when built, so they are built at first use: a history
  // service (and this reader) may be constructed before those managers exist.
  private agentLocationService: Pick<StandaloneRootLocationService, "listAgents"> | undefined;
  private teamLocationService: Pick<TeamRunExecutionTreeLocationService, "listAgents"> | undefined;
  private orgLocationService: Pick<AgentOrgExecutionTreeLocationService, "listAgents"> | undefined;

  constructor(private readonly dependencies: RunLastActivityReaderDependencies) {
    this.runs = new MemoryRunSummaryBuilder(new MemoryFileStore(dependencies.memoryDir, { warnOnMissingFiles: false }));
    this.warn = dependencies.warn ?? ((message) => console.warn(message));
    this.agentLocationService = dependencies.agentLocations;
    this.teamLocationService = dependencies.teamLocations;
    this.orgLocationService = dependencies.orgLocations;
  }

  private get agentLocations(): Pick<StandaloneRootLocationService, "listAgents"> {
    return this.agentLocationService ??= new StandaloneRootLocationService({ memoryDir: this.dependencies.memoryDir });
  }

  private get teamLocations(): Pick<TeamRunExecutionTreeLocationService, "listAgents"> {
    return this.teamLocationService ??= new TeamRunExecutionTreeLocationService({ memoryDir: this.dependencies.memoryDir });
  }

  private get orgLocations(): Pick<AgentOrgExecutionTreeLocationService, "listAgents"> {
    return this.orgLocationService ??= new AgentOrgExecutionTreeLocationService({ memoryDir: this.dependencies.memoryDir });
  }

  /** A standalone Agent run: its own folder, plus its delegated copies when it has a collaboration package. */
  async forAgentRun(run: Readonly<{ runId: string; createdAt: string; hasCollaboration?: boolean }>): Promise<string> {
    const copies = run.hasCollaboration
      ? await this.locate("agent", run.runId, () => this.agentLocations.listAgents({ rootRunId: run.runId }))
      : [];
    return toLastActivity([
      this.read(run.runId, () => this.runs.build(run.runId)),
      ...copies.map((located) => this.read(located.memoryDir, () => folderMemory(located))),
    ], run.createdAt);
  }

  /** A Team run: every agent of its execution tree. */
  async forTeamRun(run: Readonly<{ teamRunId: string; createdAt: string }>): Promise<string> {
    const agents = await this.locate("agent_team", run.teamRunId, () => this.teamLocations.listAgents({ rootTeamRunId: run.teamRunId }));
    return toLastActivity(agents.map((located) => this.read(located.memoryDir, () => folderMemory(located))), run.createdAt);
  }

  /** An Org run: every agent of its execution tree. */
  async forOrgRun(run: Readonly<{ orgRunId: string; createdAt: string }>): Promise<string> {
    const agents = await this.locate("agent_org", run.orgRunId, () => this.orgLocations.listAgents({ rootRunId: run.orgRunId }));
    return toLastActivity(agents.map((located) => this.read(located.memoryDir, () => folderMemory(located))), run.createdAt);
  }

  private read(folder: string, build: () => MemoryAvailabilityBuildResult): MemoryAvailabilityBuildResult | null {
    try {
      return build();
    } catch (error) {
      this.warn(`RUN_LAST_ACTIVITY_MEMORY_UNREADABLE '${folder}': ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async locate(kind: string, rootRunId: string, list: () => Promise<readonly Located[]>): Promise<readonly Located[]> {
    try {
      return await list();
    } catch (error) {
      this.warn(`RUN_LAST_ACTIVITY_TREE_UNREADABLE ${kind} '${rootRunId}': ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}

/** One located agent's folder, read like a Memory page member (its folder may live outside `memory/agents`). */
const folderMemory = (located: Located): MemoryAvailabilityBuildResult =>
  new MemoryRunSummaryBuilder(new MemoryFileStore(path.dirname(located.memoryDir), { runRootSubdir: "", warnOnMissingFiles: false }))
    .build(path.basename(located.memoryDir));

const toLastActivity = (summaries: readonly (MemoryAvailabilityBuildResult | null)[], createdAt: string): string => {
  const { latestMemoryMtime } = mergeMemoryAvailability(summaries.filter((summary) => summary !== null));
  return latestMemoryMtime > 0 ? new Date(latestMemoryMtime * 1000).toISOString() : createdAt;
};
