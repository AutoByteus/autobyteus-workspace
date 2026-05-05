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

const createTempPath = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

type ProjectionStoreFileSystem = Pick<
  typeof fs,
  "mkdir" | "readFile" | "rename" | "unlink" | "writeFile"
>;

const stripTransientFields = (projection: RunFileChangeProjection): RunFileChangeProjection => ({
  version: 2,
  entries: projection.entries.map(({ content: _content, ...entry }) => ({ ...entry })),
});

const emptyProjection = (): RunFileChangeProjection => ({
  ...EMPTY_RUN_FILE_CHANGE_PROJECTION,
  entries: [],
});

const readProjectionFile = async (
  files: ProjectionStoreFileSystem,
  projectionPath: string,
): Promise<RunFileChangeProjection | null> => {
  const raw = await files.readFile(projectionPath, "utf-8");
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
  constructor(private readonly files: ProjectionStoreFileSystem = fs) {}

  async readProjection(memoryDir: string): Promise<RunFileChangeProjection> {
    const canonicalPath = canonicalProjectionPathForMemoryDir(memoryDir);

    try {
      return (await readProjectionFile(this.files, canonicalPath)) ?? emptyProjection();
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
    const tempPath = createTempPath(projectionPath);
    await this.files.mkdir(path.dirname(projectionPath), { recursive: true });
    try {
      await this.files.writeFile(
        tempPath,
        JSON.stringify(stripTransientFields(projection), null, 2),
        "utf-8",
      );
      await this.files.rename(tempPath, projectionPath);
    } catch (error) {
      await this.files.unlink(tempPath).catch(() => {});
      throw error;
    }
  }
}

let cachedRunFileChangeProjectionStore: RunFileChangeProjectionStore | null = null;

export const getRunFileChangeProjectionStore = (): RunFileChangeProjectionStore => {
  if (!cachedRunFileChangeProjectionStore) {
    cachedRunFileChangeProjectionStore = new RunFileChangeProjectionStore();
  }
  return cachedRunFileChangeProjectionStore;
};
