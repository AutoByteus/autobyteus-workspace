import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { StandaloneRootPackageStore } from "../../../standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { getStandaloneRootDirPath, getStandaloneRootTreePath } from "../../../standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { getTeamRunExecutionTreePath } from "../../../run-history/store/team-run-execution-tree-path.js";
import { getAgentOrgRunExecutionTreePath } from "../../../run-history/store/agent-org-run-execution-tree-path.js";
import { TeamRunExecutionTreeStore } from "../../../run-history/store/team-run-execution-tree-store.js";
import { AgentOrgRunExecutionTreeStore } from "../../../run-history/store/agent-org-run-execution-tree-store.js";
import { validateStandaloneRootTreePayload } from "../../../standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../run-history/store/team-run-execution-tree-schema.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../run-history/store/agent-org-run-execution-tree-schema.js";
import type { RunPackageFileWriteResult } from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../../domain/app-data-migration-types.js";
import {
  convertCollaboratorsToDelegatedRuns,
  InvalidCollaboratorError,
  type CollaboratorContainerKey,
} from "./collaborators-to-delegated-runs-conversion.js";

export const COLLABORATORS_TO_DELEGATED_RUNS_V1_MIGRATION_ID = "20261015_collaborators_to_delegated_runs_v1";

type Disposition =
  | "MIGRATED"
  | "SKIPPED_ALREADY_CURRENT"
  | "PRESERVED_TREE_UNREADABLE_WARNING"
  | "FAILED_INVALID_COLLABORATOR"
  | "FAILED_CONVERTED_TREE_INVALID"
  | "FAILED_OPERATION";

type TreeFamily = "agent" | "agent_team" | "agent_org";

type TreeCandidate = Readonly<{
  family: TreeFamily;
  runId: string;
  filePath: string;
  containerKey: CollaboratorContainerKey;
  /** The directory the family's store reads and writes the tree in. */
  storeDir: string;
}>;

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/**
 * Converts every stored collaborator into an unowned delegated run of its root (DEC-005 (a)).
 * Only the execution tree JSON of each Agent, Team and Org root changes: no memory, message,
 * context-file or token record moves, because a collaborator's memory already sits where a
 * root-level copy's memory sits in every family. Frozen knowledge of the released collaborator
 * shape lives in `released-collaborator-entry-v1.ts`; the result is committed through the current
 * stores (atomic replace) and re-read with the current readers.
 */
export class CollaboratorsToDelegatedRunsV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = COLLABORATORS_TO_DELEGATED_RUNS_V1_MIGRATION_ID;
  readonly displayName = "Collaborators to delegated runs";
  readonly description =
    "Converts stored collaborators of Agent, Team and Org runs into delegated runs of the same run. No conversation, memory or message file moves.";
  readonly requiredOnStartup = true;
  // Run indexes and root packages are built once at startup from the converted trees.
  readonly executionPolicy = "STARTUP_ONLY" as const;

  private readonly layout: AgentMemoryLayout;

  constructor(private readonly memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    let scanned = 0;
    let alreadyCurrent = 0;
    let warnings = 0;
    for (const candidate of await this.listCandidates()) {
      scanned += 1;
      const { disposition, message } = await this.migrateTree(candidate);
      if (disposition === "SKIPPED_ALREADY_CURRENT") { alreadyCurrent += 1; continue; }
      if (disposition === "PRESERVED_TREE_UNREADABLE_WARNING") warnings += 1;
      details.push({
        itemId: `${candidate.family}:${candidate.runId}`,
        filePath: candidate.filePath,
        status: disposition === "MIGRATED" ? "MIGRATED" : disposition.startsWith("FAILED") ? "FAILED" : "SKIPPED",
        message: `${disposition}${message ? `: ${message}` : ""}`,
      });
    }
    const summary = {
      scannedCount: scanned,
      migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
      skippedCount: alreadyCurrent + details.filter((detail) => detail.status === "SKIPPED").length,
      failedCount: details.filter((detail) => detail.status === "FAILED").length,
      details,
    };
    const failed = summary.failedCount > 0;
    return {
      status: failed ? "FAILED" : warnings > 0 ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary,
      errorMessage: failed
        ? "Some execution trees could not be converted; they stay unchanged and the conversion retries on the next start."
        : null,
    };
  }

  private async listCandidates(): Promise<TreeCandidate[]> {
    const candidates: TreeCandidate[] = [];
    const list = async (root: string): Promise<string[]> => {
      try { return (await fs.readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(); }
      catch (error) { if (isMissing(error)) return []; throw error; }
    };
    for (const runId of await list(this.layout.getStandaloneRootDirPath())) {
      const storeDir = getStandaloneRootDirPath(this.memoryDir, runId);
      candidates.push({ family: "agent", runId, storeDir, filePath: getStandaloneRootTreePath(storeDir), containerKey: null });
    }
    for (const runId of await list(this.layout.getTeamRootDirPath())) {
      const storeDir = this.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] });
      candidates.push({ family: "agent_team", runId, storeDir, filePath: getTeamRunExecutionTreePath(storeDir), containerKey: "rootTeam" });
    }
    for (const runId of await list(this.layout.getOrgRootDirPath())) {
      const storeDir = this.layout.getOrgDirPath(runId);
      candidates.push({ family: "agent_org", runId, storeDir, filePath: getAgentOrgRunExecutionTreePath(storeDir), containerKey: "rootOrg" });
    }
    return candidates;
  }

  private async migrateTree(candidate: TreeCandidate): Promise<Readonly<{ disposition: Disposition; message?: string }>> {
    let document: Record<string, unknown>;
    try {
      const parsed = JSON.parse(await fs.readFile(candidate.filePath, "utf8")) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The tree is not an object.");
      document = parsed as Record<string, unknown>;
    } catch (error) {
      // A run without a tree (never collaborated) is not a candidate; an unreadable tree is left untouched.
      if (isMissing(error)) return { disposition: "SKIPPED_ALREADY_CURRENT" };
      return { disposition: "PRESERVED_TREE_UNREADABLE_WARNING", message: messageOf(error) };
    }
    let converted: ReturnType<typeof convertCollaboratorsToDelegatedRuns>;
    try {
      converted = convertCollaboratorsToDelegatedRuns(document, candidate.containerKey);
    } catch (error) {
      if (error instanceof InvalidCollaboratorError) return { disposition: "FAILED_INVALID_COLLABORATOR", message: error.message };
      return { disposition: "FAILED_OPERATION", message: messageOf(error) };
    }
    if (converted.kind === "already_current") return { disposition: "SKIPPED_ALREADY_CURRENT" };
    try {
      this.validateWithCurrentReader(candidate, converted.tree);
    } catch (error) {
      return { disposition: "FAILED_CONVERTED_TREE_INVALID", message: messageOf(error) };
    }
    try {
      const write = await this.writeWithCurrentStore(candidate, converted.tree);
      if (write.outcome === "not_renamed") return { disposition: "FAILED_OPERATION", message: write.cause.message };
      // A committed or indeterminate rename is settled by reading the file back with the current reader.
      await this.readWithCurrentStore(candidate);
    } catch (error) {
      return { disposition: "FAILED_CONVERTED_TREE_INVALID", message: messageOf(error) };
    }
    return { disposition: "MIGRATED", message: `${converted.collaboratorCount} collaborator(s) converted, ${converted.stampedCopyCount} copy source(s) stamped` };
  }

  private validateWithCurrentReader(candidate: TreeCandidate, tree: Record<string, unknown>): void {
    switch (candidate.family) {
      case "agent": validateStandaloneRootTreePayload(tree, candidate.runId); return;
      case "agent_team": validateTeamRunExecutionTreePayload(tree, candidate.runId); return;
      case "agent_org": validateAgentOrgRunExecutionTreePayload(tree, candidate.runId); return;
    }
  }

  private writeWithCurrentStore(candidate: TreeCandidate, tree: Record<string, unknown>): Promise<RunPackageFileWriteResult> {
    switch (candidate.family) {
      case "agent": return new StandaloneRootPackageStore().writeTree(candidate.storeDir, validateStandaloneRootTreePayload(tree, candidate.runId));
      case "agent_team": return new TeamRunExecutionTreeStore().write(candidate.storeDir, validateTeamRunExecutionTreePayload(tree, candidate.runId));
      case "agent_org": return new AgentOrgRunExecutionTreeStore().write(candidate.storeDir, validateAgentOrgRunExecutionTreePayload(tree, candidate.runId));
    }
  }

  private async readWithCurrentStore(candidate: TreeCandidate): Promise<void> {
    const tree = candidate.family === "agent"
      ? await new StandaloneRootPackageStore().readTree(candidate.storeDir, candidate.runId)
      : candidate.family === "agent_team"
        ? await new TeamRunExecutionTreeStore().read(candidate.storeDir, candidate.runId)
        : await new AgentOrgRunExecutionTreeStore().read(candidate.storeDir, candidate.runId);
    if (!tree) throw new Error(`The converted tree of '${path.basename(candidate.storeDir)}' is missing after the write.`);
  }
}
