import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { getAgentOrgRunExecutionTreePath } from "./agent-org-run-execution-tree-path.js";
import type { TaskAgentCoordinatingRun } from "./agent-run-metadata-types.js";
import { getTeamRunExecutionTreePath } from "./team-run-execution-tree-path.js";

/**
 * Whether a delegated run's coordinating run still exists (design D-6, contract §4, §10): its own file is there (a
 * standalone run's `run_metadata.json`, a Team or Org run's tree file). A delegated run whose coordinating run was
 * deleted is detached and not listed; one whose Task closed stays listed. Asks each coordinating run once per instance.
 */
export class CoordinatingRunPresence {
  private readonly layout: AgentMemoryLayout;
  private readonly present = new Map<string, Promise<boolean>>();

  constructor(memoryRoot: string) {
    this.layout = new AgentMemoryLayout(memoryRoot);
  }

  exists(run: TaskAgentCoordinatingRun): Promise<boolean> {
    const key = `${run.kind}:${run.runId}`;
    let present = this.present.get(key);
    if (!present) {
      present = fs.access(this.ownFileOf(run)).then(() => true, () => false);
      this.present.set(key, present);
    }
    return present;
  }

  private ownFileOf(run: TaskAgentCoordinatingRun): string {
    switch (run.kind) {
      case "agent": return path.join(this.layout.getStandaloneRunDirPath(run.runId), "run_metadata.json");
      case "agent_team": return getTeamRunExecutionTreePath(this.layout.getTeamDirPath({ rootTeamRunId: run.runId, ancestorTeamRunIds: [] }));
      case "agent_org": return getAgentOrgRunExecutionTreePath(this.layout.getOrgDirPath(run.runId));
    }
  }
}
