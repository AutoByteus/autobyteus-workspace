import fs from "node:fs/promises";
import path from "node:path";
import {
  EMPTY_RUN_FILE_CHANGE_PROJECTION,
  type RunFileChangeProjection,
} from "./run-file-change-types.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const canonicalProjectionPathForMemoryDir = (memoryDir: string): string =>
  path.join(path.resolve(memoryDir), "file_changes.json");

const stripTransientFields = (projection: RunFileChangeProjection): RunFileChangeProjection => ({
  version: 2,
  entries: projection.entries.map(({ content: _content, ...entry }) => ({ ...entry })),
});

const emptyProjection = (): RunFileChangeProjection => ({
  ...EMPTY_RUN_FILE_CHANGE_PROJECTION,
  entries: [],
});

const readProjectionFile = async (projectionPath: string): Promise<RunFileChangeProjection | null> => {
  const raw = await fs.readFile(projectionPath, "utf-8");
  const parsed = JSON.parse(raw) as RunFileChangeProjection;
  if (!Array.isArray(parsed?.entries)) {
    return emptyProjection();
  }

  return {
    version: 2,
    entries: parsed.entries,
  };
};

const isMissingFileError = (error: unknown): boolean =>
  typeof error === "object"
  && error !== null
  && "code" in error
  && (error as { code?: unknown }).code === "ENOENT";

export class RunFileChangeProjectionStore {
  async readProjection(memoryDir: string): Promise<RunFileChangeProjection> {
    const canonicalPath = canonicalProjectionPathForMemoryDir(memoryDir);

    try {
      return (await readProjectionFile(canonicalPath)) ?? emptyProjection();
    } catch (error) {
      if (!isMissingFileError(error)) {
        logger.warn(
          `RunFileChangeProjectionStore: failed reading projection '${canonicalPath}': ${String(error)}`,
        );
      }

      return emptyProjection();
    }
  }

  async writeProjection(memoryDir: string, projection: RunFileChangeProjection): Promise<void> {
    const projectionPath = canonicalProjectionPathForMemoryDir(memoryDir);
    await fs.mkdir(path.dirname(projectionPath), { recursive: true });
    await fs.writeFile(
      projectionPath,
      JSON.stringify(stripTransientFields(projection), null, 2),
      "utf-8",
    );
  }
}

let cachedRunFileChangeProjectionStore: RunFileChangeProjectionStore | null = null;

export const getRunFileChangeProjectionStore = (): RunFileChangeProjectionStore => {
  if (!cachedRunFileChangeProjectionStore) {
    cachedRunFileChangeProjectionStore = new RunFileChangeProjectionStore();
  }
  return cachedRunFileChangeProjectionStore;
};
