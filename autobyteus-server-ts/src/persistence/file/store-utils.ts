import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";

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
      return async () => {
        await handle.close();
        await fs.unlink(lockPath).catch((error) => {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
          }
        });
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
        if (now - stat.mtimeMs > STALE_LOCK_MS) {
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

const withPathLock = async <T>(filePath: string, operation: () => Promise<T>): Promise<T> => {
  const previous = lockByPath.get(filePath) ?? Promise.resolve();

  let release!: () => void;
  const marker = new Promise<void>((resolve) => {
    release = resolve;
  });

  lockByPath.set(filePath, previous.then(() => marker));

  await previous;
  let releaseCrossProcessLock: (() => Promise<void>) | null = null;
  try {
    releaseCrossProcessLock = await acquireCrossProcessLock(filePath);
    return await operation();
  } finally {
    if (releaseCrossProcessLock) {
      await releaseCrossProcessLock();
    }
    release();
    if (lockByPath.get(filePath) === marker) {
      lockByPath.delete(filePath);
    }
  }
};

export const getPersistenceRootDir = (): string =>
  path.join(appConfigProvider.config.getMemoryDir(), "persistence");

export const resolvePersistencePath = (...segments: string[]): string =>
  path.join(getPersistenceRootDir(), ...segments);

export const readJsonArrayFile = async <T>(filePath: string): Promise<T[]> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    return [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

export const writeJsonArrayFile = async <T>(filePath: string, rows: T[]): Promise<void> => {
  await withPathLock(filePath, async () => {
    await ensureParentDir(filePath);
    const tempPath = getTempPath(filePath);
    await fs.writeFile(tempPath, encodeJson(rows), "utf-8");
    await fs.rename(tempPath, filePath);
  });
};

export const updateJsonArrayFile = async <T>(
  filePath: string,
  updater: (rows: T[]) => Promise<T[]> | T[],
): Promise<T[]> =>
  withPathLock(filePath, async () => {
    await ensureParentDir(filePath);
    const existing = await readJsonArrayFile<T>(filePath);
    const nextRows = await updater(existing);
    const tempPath = getTempPath(filePath);
    await fs.writeFile(tempPath, encodeJson(nextRows), "utf-8");
    await fs.rename(tempPath, filePath);
    return nextRows;
  });

export const appendJsonlFile = async <T>(filePath: string, row: T): Promise<void> => {
  await withPathLock(filePath, async () => {
    await ensureParentDir(filePath);
    await fs.appendFile(filePath, `${JSON.stringify(row)}\n`, "utf-8");
  });
};

export const readJsonlFile = async <T>(filePath: string): Promise<T[]> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const lines = raw.split(/\r?\n/);
    const result: T[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const parsed = JSON.parse(trimmed);
      result.push(parsed as T);
    }
    return result;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

export const nextNumericStringId = (
  rows: Array<{ id?: string | null }>,
): string => {
  let maxId = 0;
  for (const row of rows) {
    if (!row.id) {
      continue;
    }
    const parsed = Number(row.id);
    if (Number.isInteger(parsed) && parsed > maxId) {
      maxId = parsed;
    }
  }
  return String(maxId + 1);
};

export const normalizeNullableString = (value: string | null | undefined): string | null => {
  if (value == null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

export const parseDate = (value: string | Date | null | undefined): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
};
