import fs from "node:fs/promises";
import path from "node:path";

const pathQueues = new Map<string, Promise<void>>();

const createTempPath = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

const bestEffortFsync = async (targetPath: string): Promise<void> => {
  let handle: fs.FileHandle | null = null;
  try {
    handle = await fs.open(targetPath, "r");
    await handle.sync();
  } catch {
    // Best effort only. Rename is still the portability boundary.
  } finally {
    await handle?.close().catch(() => undefined);
  }
};

const bestEffortDirectoryFsync = async (directory: string): Promise<void> => {
  let handle: fs.FileHandle | null = null;
  try {
    handle = await fs.open(directory, "r");
    await handle.sync();
  } catch {
    // Directory fsync is not supported on every platform/filesystem.
  } finally {
    await handle?.close().catch(() => undefined);
  }
};

export const atomicWriteJsonFile = async (
  filePath: string,
  payload: unknown,
): Promise<void> => {
  const resolvedPath = path.resolve(filePath);
  const previous = pathQueues.get(resolvedPath) ?? Promise.resolve();
  const next = previous.then(
    () => writeJson(resolvedPath, payload),
    () => writeJson(resolvedPath, payload),
  );
  pathQueues.set(
    resolvedPath,
    next.finally(() => {
      if (pathQueues.get(resolvedPath) === next) {
        pathQueues.delete(resolvedPath);
      }
    }),
  );
  return next;
};

const writeJson = async (filePath: string, payload: unknown): Promise<void> => {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  const tempPath = createTempPath(filePath);
  try {
    await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
    await bestEffortFsync(tempPath);
    await fs.rename(tempPath, filePath);
    await bestEffortDirectoryFsync(directory);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
};
