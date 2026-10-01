import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { TeamRunHistoryIndexStore } from "../store/team-run-history-index-store.js";
import { AgentOrgRunHistoryIndexStore } from "../store/agent-org-run-history-index-store.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { AgentOrgRunExecutionTreeStore } from "../store/agent-org-run-execution-tree-store.js";
import { RootRunPackageReadinessIndex } from "../services/root-run-package-readiness-index.js";
import { projectTeamRunHistoryIndexRow } from "../services/team-run-history-index-row-projector.js";
import { projectAgentOrgRunHistoryRow } from "../services/agent-org-run-history-row-projector.js";
import type { TeamRunIndexRowRecord } from "../store/team-run-history-index-record-types.js";
import type { AgentOrgRunIndexRowRecord } from "../store/agent-org-run-history-index-record-types.js";

export type RepairFamilyReport = Readonly<{
  family: "agent_team" | "agent_org";
  existingIndex: boolean;
  existingRows: number;
  missingIds: readonly string[];
  backupPath: string | null;
  applied: boolean;
  unrecoverableFacts: string;
}>;

/** Offline-only boundary. Never import this from startup, catalogs or memory sources. */
export async function repairCollaborationRunHistoryIndexes(input: Readonly<{
  memoryDir: string;
  apply?: boolean;
  acknowledgeMissingIndexFacts?: boolean;
}>): Promise<readonly RepairFamilyReport[]> {
  const memoryDir = path.resolve(input.memoryDir);
  const layout = new AgentMemoryLayout(memoryDir);
  const readiness = new RootRunPackageReadinessIndex(memoryDir);
  await readiness.rebuild();
  const teamIndex = new TeamRunHistoryIndexStore(memoryDir);
  const orgIndex = new AgentOrgRunHistoryIndexStore(memoryDir);
  // Strictly validate both indexes before any write. Corruption is not repairable here.
  const teamSnapshot = await teamIndex.readIndexStrict();
  const orgRows = await orgIndex.readIndex();
  const orgIndexPath = orgIndex.filePath;
  const orgExists = await fs.stat(orgIndexPath).then(() => true).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return false;
    throw error;
  });
  const teamRows = [...teamSnapshot.rows];
  const teamMissing = readiness.listAdmitted("agent_team")
    .filter((id) => !teamRows.some((row) => row.teamRunId === id)).sort();
  const orgMissing = readiness.listAdmitted("agent_org")
    .filter((id) => !orgRows.some((row) => row.orgRunId === id)).sort();
  const teamTrees = new TeamRunExecutionTreeStore();
  const orgTrees = new AgentOrgRunExecutionTreeStore();
  const projectedTeams: TeamRunIndexRowRecord[] = [];
  for (const id of teamMissing) {
    const dir = layout.getTeamDirPath({ rootTeamRunId: id, ancestorTeamRunIds: [] });
    const tree = await teamTrees.read(dir, id);
    if (!tree) throw new Error(`Admitted Team '${id}' has no readable execution tree.`);
    projectedTeams.push(projectTeamRunHistoryIndexRow({ tree }));
  }
  const projectedOrgs: AgentOrgRunIndexRowRecord[] = [];
  for (const id of orgMissing) {
    const tree = await orgTrees.read(layout.getOrgDirPath(id), id);
    if (!tree) throw new Error(`Admitted AgentOrg '${id}' has no readable execution tree.`);
    projectedOrgs.push(projectAgentOrgRunHistoryRow(tree));
  }
  const reports: RepairFamilyReport[] = [];
  const notice = "New rows cannot recover previously lost index-only summary or termination facts.";
  const applyFamily = async <Row extends { createdAt: string }>(family: RepairFamilyReport["family"], existing: readonly Row[], projected: readonly Row[],
    missingIds: readonly string[], sourceExists: boolean, filePath: string,
    write: (rows: readonly Row[]) => Promise<void>, read: () => Promise<readonly Row[]>): Promise<void> => {
    let backupPath: string | null = null;
    if (input.apply && projected.length) {
      if (!sourceExists && !input.acknowledgeMissingIndexFacts) {
        throw new Error(`${family}: missing index requires --acknowledge-missing-index-facts; ${notice}`);
      }
      if (sourceExists) {
        backupPath = `${filePath}.repair-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
        await fs.copyFile(filePath, backupPath, fs.constants.COPYFILE_EXCL);
      }
      const merged = [...existing, ...projected].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      try {
        await write(merged);
        const verified = await read();
        if (!isDeepStrictEqual(verified, merged)) throw new Error("strict readback mismatch");
      } catch (error) {
        throw new Error(`${family} repair failed; backup=${backupPath ?? "none (index absent)"}; ${String(error)}`);
      }
    }
    reports.push(Object.freeze({ family, existingIndex: sourceExists, existingRows: existing.length,
      missingIds: Object.freeze([...missingIds]), backupPath, applied: !!input.apply && projected.length > 0,
      unrecoverableFacts: projected.length ? notice : "none" }));
  };
  await applyFamily("agent_team", teamRows, projectedTeams, teamMissing, teamSnapshot.sourceExists,
    teamSnapshot.sourcePath, (rows) => teamIndex.writeIndex([...rows]), async () => (await teamIndex.readIndexStrict()).rows);
  await applyFamily("agent_org", orgRows, projectedOrgs, orgMissing, orgExists,
    orgIndexPath, (rows) => orgIndex.writeIndex(rows), () => orgIndex.readIndex());
  return Object.freeze(reports);
}
