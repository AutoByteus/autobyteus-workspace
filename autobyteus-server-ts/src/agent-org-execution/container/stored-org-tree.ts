import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgContainerStore } from "../../run-history/store/agent-org-container-store.js";
import { AgentOrgRunExecutionTreeStore } from "../../run-history/store/agent-org-run-execution-tree-store.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import type { AgentOrgContainerFile } from "../domain/agent-org-container-file.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import { composeOrgExecutionTree, type OrgUnitFile } from "./org-execution-tree-composition.js";

/** Each unit's own stored file (an unreadable one is left out of the composition, with a warning naming it). */
export const readStoredUnitFiles = async (memoryDir: string, file: AgentOrgContainerFile): Promise<Map<string, OrgUnitFile>> => {
  const layout = new AgentMemoryLayout(memoryDir);
  const teams = new TeamRunExecutionTreeStore();
  const agents = new AgentRunMetadataStore(memoryDir);
  const files = new Map<string, OrgUnitFile>();
  for (const unit of file.rootOrg.units) {
    try {
      files.set(unit.runId, unit.kind === "agent_team"
        ? { kind: "agent_team", tree: await teams.read(layout.getTeamDirPath({ rootTeamRunId: unit.runId, ancestorTeamRunIds: [] }), unit.runId) }
        : { kind: "agent", metadata: await agents.readMetadata(unit.runId) });
    } catch (error) {
      console.warn(`Org unit ${unit.address} (run '${unit.runId}') is left out: its file cannot be read: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return files;
};

/**
 * A stored Org's tree in today's shape (DEC-004): a container's file composed with its units' stored files; a released
 * Org tree (not converted yet) as it is stored. `null` when the Org run has no file.
 */
export const readStoredOrgTree = async (memoryDir: string, orgRunId: string): Promise<AgentOrgRunExecutionTreeSnapshot | null> => {
  const dir = new AgentMemoryLayout(memoryDir).getOrgDirPath(orgRunId);
  const container = await new AgentOrgContainerStore().readIfContainer(dir, orgRunId);
  if (container) return composeOrgExecutionTree(container, await readStoredUnitFiles(memoryDir, container));
  return new AgentOrgRunExecutionTreeStore().read(dir, orgRunId);
};
