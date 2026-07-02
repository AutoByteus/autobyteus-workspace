import fs from "node:fs/promises";
import path from "node:path";
import {
  TASK_DELEGATION_RECORDS_FILE_NAME,
  type TaskDelegationRecordsFile,
} from "../task-delegation-record.js";
import { normalizeTaskDelegationRecordsFile } from "./task-delegation-records-normalizer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const isMissingFileError = (error: unknown): boolean =>
  typeof error === "object"
  && error !== null
  && "code" in error
  && (error as { code?: unknown }).code === "ENOENT";

export const getTaskDelegationRecordsFilePath = (teamMemoryDir: string): string =>
  path.join(path.resolve(teamMemoryDir), TASK_DELEGATION_RECORDS_FILE_NAME);

export class TaskDelegationRecordsStore {
  async readRecordsFile(
    teamMemoryDir: string,
    teamRunId: string,
  ): Promise<TaskDelegationRecordsFile> {
    const recordsPath = getTaskDelegationRecordsFilePath(teamMemoryDir);
    try {
      const parsed = JSON.parse(await fs.readFile(recordsPath, "utf-8")) as unknown;
      return normalizeTaskDelegationRecordsFile(parsed, { teamRunId });
    } catch (error) {
      if (!isMissingFileError(error)) {
        logger.warn(
          `TaskDelegationRecordsStore: failed reading records '${recordsPath}': ${String(error)}`,
        );
      }
      return { teamRunId, records: [] };
    }
  }

  async writeRecordsFile(
    teamMemoryDir: string,
    recordsFile: TaskDelegationRecordsFile,
  ): Promise<void> {
    const recordsPath = getTaskDelegationRecordsFilePath(teamMemoryDir);
    const recordsDir = path.dirname(recordsPath);
    const tempRecordsPath = path.join(
      recordsDir,
      `.task_delegation_records.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
    );
    await fs.mkdir(recordsDir, { recursive: true });
    try {
      await fs.writeFile(
        tempRecordsPath,
        JSON.stringify(recordsFile, null, 2),
        "utf-8",
      );
      await fs.rename(tempRecordsPath, recordsPath);
    } catch (error) {
      await fs.rm(tempRecordsPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}

let cachedStore: TaskDelegationRecordsStore | null = null;

export const getTaskDelegationRecordsStore = (): TaskDelegationRecordsStore => {
  if (!cachedStore) cachedStore = new TaskDelegationRecordsStore();
  return cachedStore;
};
