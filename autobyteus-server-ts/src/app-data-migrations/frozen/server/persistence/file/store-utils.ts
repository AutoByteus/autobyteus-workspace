import fs from "node:fs/promises";
import path from "node:path";

const lockByPath = new Map<string, Promise<void>>();
const LOCK_RETRY_MS = 15;
const LOCK_TIMEOUT_MS = 10_000;
const STALE_LOCK_MS = 60_000;

const encodeJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const ensureParentDir = async (filePath: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const isLiveProcess = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
};

const getTempPath = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

const acquireCrossProcessLock = async (
  filePath: string,
): Promise<() => Promise<void>> => {
  const lockPath = `${filePath}.lock`;
  await ensureParentDir(filePath);
  const start = Date.now();

  while (true) {
    try {
      const handle = await fs.open(lockPath, "wx");
      try {
        await handle.writeFile(`${process.pid}\n`, "utf8");
        await handle.sync();
      } catch (error) {
        await handle.close().catch(() => undefined);
        await fs.unlink(lockPath).catch(() => undefined);
        throw error;
      }
      return async () => {
        try {
          await handle.close();
        } finally {
          await fs.unlink(lockPath).catch((error) => {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
              throw error;
            }
          });
        }
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        throw error;
      }

      const now = Date.now();
      if (now - start >= LOCK_TIMEOUT_MS) {
        throw new Error(`Timed out acquiring file lock for ${filePath}`);
      }

      try {
        const stat = await fs.stat(lockPath);
        const ownerText = await fs.readFile(lockPath, "utf8").catch(() => "");
        const ownerPid = Number(ownerText.trim());
        const hasPidOwner = Number.isSafeInteger(ownerPid) && ownerPid > 0;
        const deadOwner = hasPidOwner && !isLiveProcess(ownerPid);
        const ownerMissingAndStale = !hasPidOwner
          && now - stat.mtimeMs > STALE_LOCK_MS;
        if (deadOwner || ownerMissingAndStale) {
          await fs.unlink(lockPath).catch((unlinkError) => {
            if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") {
              throw unlinkError;
            }
          });
          continue;
        }
      } catch (statError) {
        const statCode = (statError as NodeJS.ErrnoException).code;
        if (statCode !== "ENOENT") {
          throw statError;
        }
      }

      await wait(LOCK_RETRY_MS);
    }
  }
};

export const withFilePathLock = async <T>(
  filePath: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const previous = lockByPath.get(filePath) ?? Promise.resolve();

  let release!: () => void;
  const marker = new Promise<void>((resolve) => {
    release = resolve;
  });

  const current = previous.then(() => marker);
  lockByPath.set(filePath, current);

  await previous;
  let releaseCrossProcessLock: (() => Promise<void>) | null = null;
  try {
    releaseCrossProcessLock = await acquireCrossProcessLock(filePath);
    return await operation();
  } finally {
    try {
      if (releaseCrossProcessLock) {
        await releaseCrossProcessLock();
      }
    } finally {
      release();
      if (lockByPath.get(filePath) === current) {
        lockByPath.delete(filePath);
      }
    }
  }
};

export const writeJsonFile = async <T>(filePath: string, value: T): Promise<void> => {
  await withFilePathLock(filePath, async () => {
    await ensureParentDir(filePath);
    const tempPath = getTempPath(filePath);
    await fs.writeFile(tempPath, encodeJson(value), "utf-8");
    await fs.rename(tempPath, filePath);
  });
};
