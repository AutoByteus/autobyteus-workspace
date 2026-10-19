import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { getStandaloneRootTreePath } from "../../standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { getAgentOrgRunExecutionTreePath } from "./agent-org-run-execution-tree-path.js";
import type { TaskAgentCoordinatingRun } from "./agent-run-metadata-types.js";
import { AGENT_ORG_RUN_TREE_SHAPE, STANDALONE_ROOT_TREE_SHAPE, TEAM_RUN_TREE_SHAPE } from "./coordinating-tree-shapes.js";
import type { CoordinatingTreeShape } from "./task-execution-tree-split.js";
import { readRawTreeFile } from "./task-execution-tree-split.js";
import { getTeamRunExecutionTreePath } from "./team-run-execution-tree-path.js";

/**
 * Whether a task agent is still linked by its coordinating run (contract §4, §10): a task agent whose
 * coordinating run was deleted is detached and not listed. Reads each coordinating tree once per checker.
 */
export class TaskAgentLinkChecker {
  private readonly layout: AgentMemoryLayout;
  private readonly linked = new Map<string, Promise<ReadonlySet<string>>>();

  constructor(memoryRoot: string) {
    this.layout = new AgentMemoryLayout(memoryRoot);
  }

  async isLinked(coordinatingRun: TaskAgentCoordinatingRun, runId: string): Promise<boolean> {
    const key = `${coordinatingRun.kind}:${coordinatingRun.runId}`;
    let ids = this.linked.get(key);
    if (!ids) {
      // An unreadable coordinating tree links nothing: its task agents are skipped, reported once (rule 7).
      ids = this.readLinkedRunIds(coordinatingRun).catch((error: unknown) => {
        console.warn(`Skipping the task agents of ${coordinatingRun.kind} run '${coordinatingRun.runId}': `
          + `its execution tree cannot be read: ${error instanceof Error ? error.message : String(error)}`);
        return new Set<string>();
      });
      this.linked.set(key, ids);
    }
    return (await ids).has(runId);
  }

  private async readLinkedRunIds(run: TaskAgentCoordinatingRun): Promise<ReadonlySet<string>> {
    const [filePath, shape] = this.treeOf(run);
    const raw = await readRawTreeFile(filePath);
    const ids = new Set<string>();
    if (!raw) return ids;
    for (const entries of shape.rawTaskLists(raw).values()) {
      for (const entry of entries) {
        const record = entry as Record<string, unknown>;
        const id = typeof record.agentRunId === "string" ? record.agentRunId : record.teamRunId;
        if (typeof id === "string") ids.add(id);
      }
    }
    return ids;
  }

  private treeOf(run: TaskAgentCoordinatingRun): [string, CoordinatingTreeShape<never>] {
    switch (run.kind) {
      case "agent":
        return [getStandaloneRootTreePath(this.layout.getAgentRunCollaborationDirPath(run.runId)), STANDALONE_ROOT_TREE_SHAPE as CoordinatingTreeShape<never>];
      case "agent_team":
        return [getTeamRunExecutionTreePath(this.layout.getTeamDirPath({ rootTeamRunId: run.runId, ancestorTeamRunIds: [] })), TEAM_RUN_TREE_SHAPE as CoordinatingTreeShape<never>];
      case "agent_org":
        return [getAgentOrgRunExecutionTreePath(this.layout.getOrgDirPath(run.runId)), AGENT_ORG_RUN_TREE_SHAPE as CoordinatingTreeShape<never>];
    }
  }
}
