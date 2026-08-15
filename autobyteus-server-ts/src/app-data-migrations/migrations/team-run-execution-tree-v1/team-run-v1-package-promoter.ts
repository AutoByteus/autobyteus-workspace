import fs from "node:fs/promises";
import path from "node:path";
import { validateTaskDelegationRecordsV1Payload } from "../../../agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../services/team-communication/team-communication-v1-schema.js";
import { validateTeamRunStatePackage } from "../../../run-history/services/team-run-state-package-validator.js";
import { validateTeamRunExecutionTreePayload } from "../../../run-history/store/team-run-execution-tree-schema.js";
import type { PlannedTeamRunV1Package } from "./predecessor-team-run-planner.js";

const ID = "20260814_team_run_execution_tree_v1";
const targetNames = {
  executionTree: "team_run_execution_tree.json",
  taskRecords: "task_delegation_records.json",
  communicationMessages: "team_communication_messages.json",
} as const;

const syncDirectory = async (directory: string): Promise<void> => {
  const handle = await fs.open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
};

const writeSynced = async (filePath: string, value: unknown): Promise<void> => {
  const handle = await fs.open(filePath, "w");
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally { await handle.close(); }
};

const copyIfPresent = async (source: string, target: string): Promise<void> => {
  try { await fs.copyFile(source, target); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
};

const readAndValidateStaged = async (
  rootTeamRunId: string,
  staged: Record<keyof typeof targetNames, string>,
): Promise<void> => {
  const parse = async (filePath: string): Promise<unknown> =>
    JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
  validateTeamRunStatePackage({
    executionTree: validateTeamRunExecutionTreePayload(await parse(staged.executionTree), rootTeamRunId),
    taskRecords: validateTaskDelegationRecordsV1Payload(await parse(staged.taskRecords), rootTeamRunId),
    communicationMessages: validateTeamCommunicationMessagesV1Payload(await parse(staged.communicationMessages), rootTeamRunId),
  });
};

export class TeamRunV1PackagePromoter {
  constructor(private readonly backupRoot: string) {}

  async promote(input: {
    rootTeamRunId: string;
    rootDir: string;
    metadataPath: string;
    sourceTaskRecordsPath: string;
    sourceCommunicationPath: string;
    package: PlannedTeamRunV1Package;
  }): Promise<string> {
    const token = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(this.backupRoot, input.rootTeamRunId, token);
    await fs.mkdir(backupDir, { recursive: true });
    await Promise.all([
      copyIfPresent(input.metadataPath, path.join(backupDir, "team_run_metadata.json")),
      copyIfPresent(input.sourceTaskRecordsPath, path.join(backupDir, "task_delegation_records.json")),
      copyIfPresent(input.sourceCommunicationPath, path.join(backupDir, "team_communication_messages.json")),
    ]);
    await writeSynced(path.join(backupDir, "manifest.json"), {
      migrationId: ID,
      rootTeamRunId: input.rootTeamRunId,
      sourceRootDir: input.rootDir,
      backedUpAt: new Date().toISOString(),
    });
    await syncDirectory(backupDir);

    const staged = Object.fromEntries(Object.entries(targetNames).map(([key, name]) => [
      key,
      path.join(input.rootDir, `.${name}.${ID}.${process.pid}.staged`),
    ])) as Record<keyof typeof targetNames, string>;
    try {
      await fs.mkdir(input.rootDir, { recursive: true });
      await writeSynced(staged.executionTree, input.package.executionTree);
      await writeSynced(staged.taskRecords, input.package.taskRecords);
      await writeSynced(staged.communicationMessages, input.package.communicationMessages);
      await readAndValidateStaged(input.rootTeamRunId, staged);
      for (const key of Object.keys(targetNames) as Array<keyof typeof targetNames>) {
        await fs.rename(staged[key], path.join(input.rootDir, targetNames[key]));
      }
      await syncDirectory(input.rootDir);
      await fs.rename(input.metadataPath, path.join(backupDir, "team_run_metadata.promoted.json"));
      await syncDirectory(input.rootDir);
      await syncDirectory(backupDir);
      return backupDir;
    } catch (error) {
      await Promise.all(Object.values(staged).map((filePath) => fs.rm(filePath, { force: true }).catch(() => undefined)));
      throw error;
    }
  }
}
