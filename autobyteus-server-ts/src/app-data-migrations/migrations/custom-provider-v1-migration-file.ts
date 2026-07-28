import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { withFilePathLock } from "../../persistence/file/store-utils.js";

export type CanonicalCustomProviderFileIdentity = {
  dev: string;
  ino: string;
  mode: string;
  size: string;
  mtimeMs: string;
  ctimeMs: string;
};

export type CanonicalCustomProviderFileSnapshot =
  | { kind: "MISSING" }
  | {
      kind: "CONTENT";
      identity: CanonicalCustomProviderFileIdentity;
      bytes: Buffer;
    }
  | {
      kind: "UNSAFE";
      deletionIdentity: CanonicalCustomProviderFileIdentity | null;
    };

const identityFromStat = (
  stat: Awaited<ReturnType<typeof fs.lstat>>,
): CanonicalCustomProviderFileIdentity => ({
  dev: String(stat.dev),
  ino: String(stat.ino),
  mode: String(stat.mode),
  size: String(stat.size),
  mtimeMs: String(stat.mtimeMs),
  ctimeMs: String(stat.ctimeMs),
});

const sameIdentity = (
  left: CanonicalCustomProviderFileIdentity,
  right: CanonicalCustomProviderFileIdentity,
): boolean =>
  left.dev === right.dev
  && left.ino === right.ino
  && left.mode === right.mode
  && left.size === right.size
  && left.mtimeMs === right.mtimeMs
  && left.ctimeMs === right.ctimeMs;

export class CustomProviderV1MigrationFile {
  private readonly canonicalPath: string;

  constructor(appDataDir: string) {
    this.canonicalPath = path.join(
      appDataDir,
      "llm",
      "custom-llm-providers.json",
    );
  }

  async withPathLock<T>(operation: () => Promise<T>): Promise<T> {
    return withFilePathLock(this.canonicalPath, operation);
  }

  async readCanonical(): Promise<CanonicalCustomProviderFileSnapshot> {
    let initialStat: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      initialStat = await fs.lstat(this.canonicalPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { kind: "MISSING" };
      }
      return { kind: "UNSAFE", deletionIdentity: null };
    }

    const initialIdentity = identityFromStat(initialStat);
    if (!initialStat.isFile() || initialStat.isSymbolicLink()) {
      return { kind: "UNSAFE", deletionIdentity: initialIdentity };
    }

    let handle: Awaited<ReturnType<typeof fs.open>> | null = null;
    try {
      handle = await fs.open(this.canonicalPath, "r");
      const openedStat = await handle.stat();
      const openedIdentity = identityFromStat(openedStat);
      if (!openedStat.isFile() || !sameIdentity(initialIdentity, openedIdentity)) {
        return { kind: "UNSAFE", deletionIdentity: null };
      }
      const bytes = await handle.readFile();
      const finalIdentity = identityFromStat(await handle.stat());
      if (!sameIdentity(openedIdentity, finalIdentity)) {
        bytes.fill(0);
        return { kind: "UNSAFE", deletionIdentity: null };
      }
      return { kind: "CONTENT", identity: finalIdentity, bytes };
    } catch {
      return { kind: "UNSAFE", deletionIdentity: initialIdentity };
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  async stageCurrentFile(value: unknown): Promise<string> {
    const stagePath = path.join(
      path.dirname(this.canonicalPath),
      `.custom-llm-providers.${process.pid}.${randomUUID()}.v2-stage`,
    );
    const handle = await fs.open(stagePath, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
      await handle.chmod(0o600);
      await handle.close();
    } catch (error) {
      await handle.close().catch(() => undefined);
      await fs.unlink(stagePath).catch(() => undefined);
      throw error;
    }
    return stagePath;
  }

  async syncStage(stagePath: string): Promise<void> {
    const handle = await fs.open(stagePath, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  async publishStage(
    stagePath: string,
    expectedIdentity: CanonicalCustomProviderFileIdentity,
  ): Promise<void> {
    const currentIdentity = identityFromStat(await fs.lstat(this.canonicalPath));
    if (!sameIdentity(currentIdentity, expectedIdentity)) {
      throw new Error("CUSTOM_PROVIDER_V1_SOURCE_CHANGED");
    }
    await fs.rename(stagePath, this.canonicalPath);
  }

  async discardStage(stagePath: string | null): Promise<void> {
    if (!stagePath) return;
    await fs.unlink(stagePath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
  }

  async deleteCanonical(
    expectedIdentity: CanonicalCustomProviderFileIdentity | null,
  ): Promise<boolean> {
    if (!expectedIdentity) return false;
    try {
      const currentIdentity = identityFromStat(await fs.lstat(this.canonicalPath));
      if (!sameIdentity(currentIdentity, expectedIdentity)) return false;
      await fs.unlink(this.canonicalPath);
      return true;
    } catch {
      return false;
    }
  }
}
