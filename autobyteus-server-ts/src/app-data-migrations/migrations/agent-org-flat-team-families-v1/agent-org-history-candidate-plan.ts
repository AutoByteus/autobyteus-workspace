import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionIndex } from "../../../agent-org-execution/services/agent-org-execution-index.js";
import { validateTeamRunExecutionTreePayload } from "../../../run-history/store/team-run-execution-tree-schema.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../run-history/store/agent-org-run-execution-tree-schema.js";
import { getTeamRunExecutionTreePath } from "../../../run-history/store/team-run-execution-tree-path.js";
import { getAgentOrgRunExecutionTreePath } from "../../../run-history/store/agent-org-run-execution-tree-path.js";
import { TeamRunHistoryIndexStore } from "../../../run-history/store/team-run-history-index-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../run-history/store/agent-org-run-history-index-store.js";
import { validateReleasedTeamRunV2 } from "./released-team-run-v2-schema.js";
import { orgTreeTarget } from "./agent-org-runtime-tree-target.js";

export type HistoryCandidatePlan = Readonly<{
  id: string;
  source: string;
  index: AgentOrgExecutionIndex;
} & ({ kind: "source-root" } | { kind: "partial-target"; retiredFiles: readonly string[] } | { kind: "index-only" })>;
export const readMigrationJson = async (file: string): Promise<unknown> => JSON.parse(await fs.readFile(file, "utf8"));
export const migrationPathExists = async (file: string): Promise<boolean> => fs.stat(file).then(() => true).catch((error: NodeJS.ErrnoException) => {
  if (error.code === "ENOENT") return false;
  throw error;
});
export const assertMigrationRootId = (id: string): void => {
  if (!id || id !== id.trim() || /[\\/]/.test(id) || id === "." || id === ".." || path.win32.isAbsolute(id)) {
    throw new Error(`Unsafe root identity '${id}'.`);
  }
};
export const retiredTeamFiles = (dir: string): readonly string[] => [
  path.join(dir, "task_delegation_records.json"),
  path.join(dir, "team_communication_messages.json"),
  // Last source marker: retain until all target effects and other retirement succeed.
  getTeamRunExecutionTreePath(dir),
];
const directories = async (root: string): Promise<string[]> => (await fs.readdir(root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
  if (error.code === "ENOENT") return [];
  throw error;
})).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

/** Metadata only. No standalone inventory and no sidecar/trace discovery here. */
export class AgentOrgHistoryCandidatePlanner {
  readonly failures = new Map<string, string>();
  readonly missingExecutionTreeWarnings = new Map<string, string>();
  readonly flatRoots = new Set<string>();
  readonly collisions = new Set<string>();
  private readonly layout: AgentMemoryLayout;
  constructor(private readonly memoryDir: string) { this.layout = new AgentMemoryLayout(memoryDir); }

  async plan() {
    const teamSnapshot = await new TeamRunHistoryIndexStore(this.memoryDir).readIndexStrict();
    const orgRows = await new AgentOrgRunHistoryIndexStore(this.memoryDir).readIndex();
    if (new Set(teamSnapshot.rows.map((row) => row.teamRunId)).size !== teamSnapshot.rows.length
      || new Set(orgRows.map((row) => row.orgRunId)).size !== orgRows.length) {
      throw new Error("History index contains duplicate root identities; selected reconciliation cannot discard rows.");
    }
    const teamIds = new Set(await directories(this.layout.getTeamRootDirPath()));
    const orgIds = new Set(await directories(this.layout.getOrgRootDirPath()));
    const retainedIndexIds = new Set(teamSnapshot.rows.map((row) => row.teamRunId));
    const plans: HistoryCandidatePlan[] = [];
    for (const id of teamIds) {
      try {
        assertMigrationRootId(id);
        const source = this.layout.getTeamDirPath({ rootTeamRunId: id, ancestorTeamRunIds: [] });
        const executionTreePath = getTeamRunExecutionTreePath(source);
        let raw: unknown;
        try {
          raw = await readMigrationJson(executionTreePath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            const sourceStillExists = await fs.stat(source)
              .then((stat) => stat.isDirectory())
              .catch((sourceError: NodeJS.ErrnoException) => {
                if (sourceError.code === "ENOENT") return false;
                throw sourceError;
              });
            if (!sourceStillExists) throw error;
            this.missingExecutionTreeWarnings.set(
              id,
              "Required legacy Team execution tree 'team_run_execution_tree.json' is missing; source was not migrated.",
            );
            continue;
          }
          throw error;
        }
        let flat = false;
        try { validateTeamRunExecutionTreePayload(raw, id); flat = true; } catch { /* released nested source */ }
        if (flat) { this.flatRoots.add(id); continue; }
        if (orgIds.has(id)) { this.collisions.add(id); throw new Error("Root exists in both Team and Org families."); }
        const released = validateReleasedTeamRunV2(raw, id);
        if (released.teamCount < 1) throw new Error("Non-flat source is not organization-like.");
        const tree = validateAgentOrgRunExecutionTreePayload(orgTreeTarget(released), id);
        plans.push(Object.freeze({ kind: "source-root", id, source, index: new AgentOrgExecutionIndex(tree) }));
      } catch (error) { this.failures.set(id, String(error)); }
    }
    for (const id of orgIds) {
      if (this.collisions.has(id)) continue;
      try {
        assertMigrationRootId(id);
        const source = this.layout.getOrgDirPath(id);
        const retired = retiredTeamFiles(source);
        const remaining = (await Promise.all(retired.map(migrationPathExists))).some(Boolean);
        if (!remaining && !retainedIndexIds.has(id)) continue;
        if (teamIds.has(id)) { this.collisions.add(id); throw new Error("Root exists in both Team and Org families."); }
        const tree = validateAgentOrgRunExecutionTreePayload(await readMigrationJson(getAgentOrgRunExecutionTreePath(source)), id);
        if (!tree.rootOrg.members.some((member) => "teamRunId" in member)) throw new Error("Selected Org has no configured Team.");
        const index = new AgentOrgExecutionIndex(tree);
        plans.push(Object.freeze(remaining
          ? { kind: "partial-target", id, source, index, retiredFiles: retired }
          : { kind: "index-only", id, source, index }));
      } catch (error) { this.failures.set(id, String(error)); }
    }
    return Object.freeze({ plans: Object.freeze(plans), teamSnapshot, orgRows });
  }
}
export type HistoryCandidateSelection = Awaited<ReturnType<AgentOrgHistoryCandidatePlanner["plan"]>>;
