import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { TaskDelegationRecordsV1Store } from "../../agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import type { ValidatedTeamRunStatePackage } from "../../run-history/services/team-run-state-package-validator.js";
import { validateTeamRunStatePackage } from "../../run-history/services/team-run-state-package-validator.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";

const METADATA_FILE = "team_run_metadata.json";
const EXECUTION_TREE_FILE = "team_run_execution_tree.json";
const TASK_RECORDS_FILE = "task_delegation_records.json";
const COMMUNICATION_FILE = "team_communication_messages.json";
const HISTORICAL_MANIFEST_FILE = "team_run_manifest.json";

type FileState = "MISSING" | "REGULAR" | "UNSAFE";

type StateBase = Readonly<{
  rootTeamRunId: string;
  rootDir: string;
}>;

export type TeamRunMigrationState =
  | (StateBase & Readonly<{
      kind: "PREDECESSOR";
      metadataPath: string;
    }>)
  | (StateBase & Readonly<{
      kind: "CURRENT_V1";
      package: ValidatedTeamRunStatePackage;
    }>)
  | (StateBase & Readonly<{
      kind: "HISTORICAL_RESIDUE";
      manifestPath: string;
    }>)
  | (StateBase & Readonly<{
      kind: "INVALID";
      evidencePath: string;
      reason: string;
    }>);

const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fileState = async (filePath: string): Promise<FileState> => {
  try {
    const stat = await fs.lstat(filePath);
    return stat.isFile() ? "REGULAR" : "UNSAFE";
  } catch (error) {
    if (missing(error)) return "MISSING";
    throw error;
  }
};

const requiredText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
};

const validateHistoricalManifest = (raw: unknown, rootTeamRunId: string): void => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Historical TeamRun manifest must be an object.");
  }
  const manifest = raw as Record<string, unknown>;
  if (manifest.runVersion !== 1) {
    throw new Error("Historical TeamRun manifest runVersion must equal 1.");
  }
  const manifestRootId = requiredText(manifest.teamRunId, "teamRunId");
  if (manifestRootId !== rootTeamRunId) {
    throw new Error(
      `Historical TeamRun manifest root '${manifestRootId}' does not match directory '${rootTeamRunId}'.`,
    );
  }
  const coordinator = requiredText(
    manifest.coordinatorMemberRouteKey,
    "coordinatorMemberRouteKey",
  );
  if (!Array.isArray(manifest.memberBindings) || manifest.memberBindings.length === 0) {
    throw new Error("Historical TeamRun manifest memberBindings must be a non-empty array.");
  }
  const routes = new Set<string>();
  const runIds = new Set<string>();
  for (const [index, rawBinding] of manifest.memberBindings.entries()) {
    if (!rawBinding || typeof rawBinding !== "object" || Array.isArray(rawBinding)) {
      throw new Error(`memberBindings[${index}] must be an object.`);
    }
    const binding = rawBinding as Record<string, unknown>;
    const route = requiredText(binding.memberRouteKey, `memberBindings[${index}].memberRouteKey`);
    const runId = requiredText(binding.memberRunId, `memberBindings[${index}].memberRunId`);
    if (routes.has(route)) throw new Error(`Duplicate historical member route '${route}'.`);
    if (runIds.has(runId)) throw new Error(`Duplicate historical member run ID '${runId}'.`);
    routes.add(route);
    runIds.add(runId);
  }
  if (!routes.has(coordinator)) {
    throw new Error(`Historical coordinator '${coordinator}' is not a member binding.`);
  }
};

export class TeamRunMigrationStateClassifier {
  private readonly layout: AgentMemoryLayout;

  constructor(private readonly memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  async listAndClassifyRoots(): Promise<readonly TeamRunMigrationState[]> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(this.layout.getTeamRootDirPath(), { withFileTypes: true });
    } catch (error) {
      if (missing(error)) return Object.freeze([]);
      throw error;
    }
    const states: TeamRunMigrationState[] = [];
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const rootDir = path.join(this.layout.getTeamRootDirPath(), entry.name);
      if (!entry.isDirectory()) {
        states.push(this.invalid(
          entry.name,
          rootDir,
          rootDir,
          "TeamRun root entry is not a regular directory and was not followed.",
        ));
        continue;
      }
      try {
        states.push(await this.classifyRoot(entry.name));
      } catch (error) {
        states.push(this.invalid(
          entry.name,
          rootDir,
          rootDir,
          `TeamRun root could not be classified safely: ${message(error)}`,
        ));
      }
    }
    return Object.freeze(states);
  }

  async classifyRoot(rootTeamRunId: string): Promise<TeamRunMigrationState> {
    const rootDir = this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
    const metadataPath = path.join(rootDir, METADATA_FILE);
    const metadataState = await fileState(metadataPath);
    if (metadataState === "REGULAR") {
      return Object.freeze({ kind: "PREDECESSOR", rootTeamRunId, rootDir, metadataPath });
    }
    if (metadataState === "UNSAFE") {
      return this.invalid(rootTeamRunId, rootDir, metadataPath, "Predecessor metadata is not a regular file.");
    }

    const currentPaths = [
      path.join(rootDir, EXECUTION_TREE_FILE),
      path.join(rootDir, TASK_RECORDS_FILE),
      path.join(rootDir, COMMUNICATION_FILE),
    ] as const;
    const currentStates = await Promise.all(currentPaths.map(fileState));
    if (currentStates.some((state) => state !== "MISSING")) {
      const firstUnsafe = currentStates.findIndex((state) => state === "UNSAFE");
      if (firstUnsafe >= 0) {
        return this.invalid(
          rootTeamRunId,
          rootDir,
          currentPaths[firstUnsafe]!,
          "TeamRun V1 authority path is not a regular file.",
        );
      }
      if (currentStates.some((state) => state !== "REGULAR")) {
        return this.invalid(
          rootTeamRunId,
          rootDir,
          rootDir,
          "TeamRun V1 package is partial; all three authority files are required.",
        );
      }
      try {
        const [executionTree, taskRecords, communicationMessages] = await Promise.all([
          new TeamRunExecutionTreeStore().read(rootDir, rootTeamRunId),
          new TaskDelegationRecordsV1Store().read(rootDir, rootTeamRunId),
          new TeamCommunicationV1Store().read(rootDir, rootTeamRunId),
        ]);
        if (!executionTree || !taskRecords || !communicationMessages) {
          throw new Error("TeamRun V1 package reader returned an incomplete package.");
        }
        const validated = validateTeamRunStatePackage({
          executionTree,
          taskRecords,
          communicationMessages,
        });
        return Object.freeze({
          kind: "CURRENT_V1",
          rootTeamRunId,
          rootDir,
          package: validated,
        });
      } catch (error) {
        return this.invalid(
          rootTeamRunId,
          rootDir,
          rootDir,
          `TeamRun V1 package is invalid: ${message(error)}`,
        );
      }
    }

    const manifestPath = path.join(rootDir, HISTORICAL_MANIFEST_FILE);
    const manifestState = await fileState(manifestPath);
    if (manifestState === "MISSING") {
      let rootEntries: import("node:fs").Dirent[];
      try {
        rootEntries = await fs.readdir(rootDir, { withFileTypes: true });
      } catch (error) {
        return this.invalid(
          rootTeamRunId,
          rootDir,
          rootDir,
          `TeamRun root cannot be inventoried safely: ${message(error)}`,
        );
      }
      return this.invalid(
        rootTeamRunId,
        rootDir,
        rootDir,
        rootEntries.length === 0
          ? "Empty TeamRun shell has no recognized authority and remains preserved/excluded."
          : `Content-bearing TeamRun root has no recognized authority (${rootEntries.length} direct entr${
            rootEntries.length === 1 ? "y" : "ies"
          }) and remains preserved/excluded.`,
      );
    }
    if (manifestState === "UNSAFE") {
      return this.invalid(
        rootTeamRunId,
        rootDir,
        manifestPath,
        "Historical TeamRun manifest is not a regular file.",
      );
    }
    try {
      const raw = JSON.parse(await fs.readFile(manifestPath, "utf8")) as unknown;
      validateHistoricalManifest(raw, rootTeamRunId);
      return Object.freeze({
        kind: "HISTORICAL_RESIDUE",
        rootTeamRunId,
        rootDir,
        manifestPath,
      });
    } catch (error) {
      return this.invalid(
        rootTeamRunId,
        rootDir,
        manifestPath,
        `Historical TeamRun manifest is invalid: ${message(error)}`,
      );
    }
  }

  private invalid(
    rootTeamRunId: string,
    rootDir: string,
    evidencePath: string,
    reason: string,
  ): TeamRunMigrationState {
    return Object.freeze({ kind: "INVALID", rootTeamRunId, rootDir, evidencePath, reason });
  }
}
