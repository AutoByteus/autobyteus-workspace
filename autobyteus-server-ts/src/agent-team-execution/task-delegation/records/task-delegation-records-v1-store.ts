import fs from "node:fs/promises";
import path from "node:path";
import type { TaskDelegationRecordsFileV1 } from "../task-delegation-record-v1.js";
import {
  getTeamRunFileCommitWriter,
  type TeamRunFileCommitWriter,
  type TeamRunFileWriteResult,
} from "../../../run-history/store/team-run-file-commit-writer.js";
import { validateTaskDelegationRecordsV1Payload } from "./task-delegation-records-v1-schema.js";

export const TASK_DELEGATION_RECORDS_V1_FILE_NAME = "task_delegation_records.json";

export const getTaskDelegationRecordsV1Path = (teamMemoryDir: string): string =>
  path.join(path.resolve(teamMemoryDir), TASK_DELEGATION_RECORDS_V1_FILE_NAME);

const isMissingFile = (error: unknown): boolean =>
  !!error && typeof error === "object" && "code" in error &&
  (error as { code?: unknown }).code === "ENOENT";

export class TaskDelegationRecordsV1Store {
  constructor(
    private readonly writer: TeamRunFileCommitWriter = getTeamRunFileCommitWriter(),
  ) {}

  async read(
    teamMemoryDir: string,
    rootTeamRunId: string,
  ): Promise<TaskDelegationRecordsFileV1 | null> {
    try {
      const payload = JSON.parse(
        await fs.readFile(getTaskDelegationRecordsV1Path(teamMemoryDir), "utf-8"),
      ) as unknown;
      return validateTaskDelegationRecordsV1Payload(payload, rootTeamRunId);
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async write(
    teamMemoryDir: string,
    records: TaskDelegationRecordsFileV1,
  ): Promise<TeamRunFileWriteResult> {
    const normalized = validateTaskDelegationRecordsV1Payload(
      records,
      records.rootTeamRunId,
    );
    return this.writer.write({
      file: "task_records",
      filePath: getTaskDelegationRecordsV1Path(teamMemoryDir),
      payload: normalized,
    });
  }
}
