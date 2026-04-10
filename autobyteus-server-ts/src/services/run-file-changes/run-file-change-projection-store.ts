import fs from "node:fs/promises";
import path from "node:path";
import {
  EMPTY_RUN_FILE_CHANGE_PROJECTION,
  type RunFileChangeProjection,
} from "./run-file-change-types.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const projectionDirForMemoryDir = (memoryDir: string): string =>
  path.join(path.resolve(memoryDir), "run-file-changes");

const projectionPathForMemoryDir = (memoryDir: string): string =>
  path.join(projectionDirForMemoryDir(memoryDir), "projection.json");

export class RunFileChangeProjectionStore {
  async readProjection(memoryDir: string): Promise<RunFileChangeProjection> {
    const projectionPath = projectionPathForMemoryDir(memoryDir);

    try {
      const raw = await fs.readFile(projectionPath, "utf-8");
      const parsed = JSON.parse(raw) as RunFileChangeProjection;
      if (!Array.isArray(parsed?.entries)) {
        return {
          ...EMPTY_RUN_FILE_CHANGE_PROJECTION,
          entries: [],
        };
      }
      return {
        version: 1,
        entries: parsed.entries,
      };
    } catch (error) {
      const message = String(error);
      if (!message.includes("ENOENT")) {
        logger.warn(
          `RunFileChangeProjectionStore: failed reading projection '${projectionPath}': ${message}`,
        );
      }
      return {
        ...EMPTY_RUN_FILE_CHANGE_PROJECTION,
        entries: [],
      };
    }
  }

  async writeProjection(memoryDir: string, projection: RunFileChangeProjection): Promise<void> {
    const projectionDir = projectionDirForMemoryDir(memoryDir);
    const projectionPath = projectionPathForMemoryDir(memoryDir);
    await fs.mkdir(projectionDir, { recursive: true });
    await fs.writeFile(projectionPath, JSON.stringify(projection, null, 2), "utf-8");
  }
}

let cachedRunFileChangeProjectionStore: RunFileChangeProjectionStore | null = null;

export const getRunFileChangeProjectionStore = (): RunFileChangeProjectionStore => {
  if (!cachedRunFileChangeProjectionStore) {
    cachedRunFileChangeProjectionStore = new RunFileChangeProjectionStore();
  }
  return cachedRunFileChangeProjectionStore;
};
