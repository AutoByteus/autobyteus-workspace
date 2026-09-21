import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { withFilePathLock } from "../../persistence/file/store-utils.js";

export class DefinitionRevisionConflictError extends Error {
  readonly code = "DEFINITION_REVISION_CONFLICT";

  constructor(readonly expectedRevision: string, readonly actualRevision: string | null) {
    super("The definition changed after this draft was loaded. Refresh it and apply the draft again.");
    this.name = "DefinitionRevisionConflictError";
  }
}

type Journal = Readonly<{
  schemaVersion: 1;
  canonicalPath: string;
  stagePath: string;
  backupPath: string;
}>;

const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const exists = async (target: string): Promise<boolean> =>
  fs.access(target).then(() => true).catch(() => false);

const encode = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const writeAtomic = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
};

const revisionFor = (files: Readonly<Record<string, string>>): string => {
  const hash = createHash("sha256");
  for (const [name, content] of Object.entries(files).sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(name);
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }
  return hash.digest("hex");
};

/** Atomic aggregate publication for ordinary definition authoring only. */
export class DefinitionPackageTransaction {
  async read(input: {
    packagePath: string;
    fileNames: readonly string[];
    validatePackage(packagePath: string): Promise<void>;
  }): Promise<{ files: Readonly<Record<string, string>>; revision: string } | null> {
    const canonicalPath = path.resolve(input.packagePath);
    return withFilePathLock(this.lockPath(canonicalPath), async () => {
      await this.recover(canonicalPath, input.validatePackage);
      if (!(await exists(canonicalPath))) return null;
      await input.validatePackage(canonicalPath);
      const files: Record<string, string> = {};
      for (const fileName of input.fileNames) {
        files[fileName] = await fs.readFile(path.join(canonicalPath, fileName), "utf8");
      }
      return Object.freeze({ files: Object.freeze(files), revision: revisionFor(files) });
    });
  }

  async commit(input: {
    packagePath: string;
    files: Readonly<Record<string, string>>;
    expectedRevision?: string | null;
    validatePackage(packagePath: string): Promise<void>;
  }): Promise<string> {
    const canonicalPath = path.resolve(input.packagePath);
    return withFilePathLock(this.lockPath(canonicalPath), async () => {
      await this.recover(canonicalPath, input.validatePackage);
      const currentExists = await exists(canonicalPath);
      const actualRevision = currentExists
        ? await this.currentRevision(canonicalPath, Object.keys(input.files))
        : null;
      if (input.expectedRevision !== undefined && input.expectedRevision !== actualRevision) {
        throw new DefinitionRevisionConflictError(input.expectedRevision ?? "", actualRevision);
      }

      const suffix = `${process.pid}.${randomUUID()}`;
      const stagePath = `${canonicalPath}.stage.${suffix}`;
      const backupPath = `${canonicalPath}.backup.${suffix}`;
      const journalPath = this.journalPath(canonicalPath);
      await fs.mkdir(path.dirname(canonicalPath), { recursive: true });
      if (currentExists) await fs.cp(canonicalPath, stagePath, { recursive: true, errorOnExist: true });
      else await fs.mkdir(stagePath, { recursive: false });
      try {
        for (const [relativePath, content] of Object.entries(input.files)) {
          if (path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
            throw new Error(`Definition package relative path '${relativePath}' is invalid.`);
          }
          await writeAtomic(path.join(stagePath, relativePath), content);
        }
        await input.validatePackage(stagePath);
        const journal: Journal = {
          schemaVersion: 1,
          canonicalPath,
          stagePath,
          backupPath,
        };
        await writeAtomic(journalPath, encode(journal));
        if (currentExists) await fs.rename(canonicalPath, backupPath);
        await fs.rename(stagePath, canonicalPath);
        await input.validatePackage(canonicalPath);
        if (currentExists) await fs.rm(backupPath, { recursive: true, force: true });
        await fs.rm(journalPath, { force: true });
      } catch (error) {
        await this.recover(canonicalPath, input.validatePackage).catch(() => undefined);
        throw error;
      }
      return this.currentRevision(canonicalPath, Object.keys(input.files));
    });
  }

  async remove(packagePathInput: string): Promise<boolean> {
    const packagePath = path.resolve(packagePathInput);
    return withFilePathLock(this.lockPath(packagePath), async () => {
      if (!(await exists(packagePath))) return false;
      await fs.rm(packagePath, { recursive: true, force: true });
      return true;
    });
  }

  private async currentRevision(packagePath: string, fileNames: readonly string[]): Promise<string> {
    const files: Record<string, string> = {};
    for (const fileName of fileNames) files[fileName] = await fs.readFile(path.join(packagePath, fileName), "utf8");
    return revisionFor(files);
  }

  private async recover(
    canonicalPath: string,
    validatePackage: (packagePath: string) => Promise<void>,
  ): Promise<void> {
    const journalPath = this.journalPath(canonicalPath);
    let journal: Journal;
    try {
      journal = JSON.parse(await fs.readFile(journalPath, "utf8")) as Journal;
    } catch (error) {
      if (missing(error)) return;
      throw error;
    }
    if (
      journal.schemaVersion !== 1
      || path.resolve(journal.canonicalPath) !== canonicalPath
      || path.dirname(journal.stagePath) !== path.dirname(canonicalPath)
      || path.dirname(journal.backupPath) !== path.dirname(canonicalPath)
    ) {
      throw new Error(`Definition package journal '${journalPath}' is invalid.`);
    }
    if (await exists(canonicalPath)) {
      await validatePackage(canonicalPath);
      await fs.rm(journal.stagePath, { recursive: true, force: true });
      await fs.rm(journal.backupPath, { recursive: true, force: true });
      await fs.rm(journalPath, { force: true });
      return;
    }
    if (await exists(journal.stagePath)) {
      await validatePackage(journal.stagePath);
      await fs.rename(journal.stagePath, canonicalPath);
      await fs.rm(journal.backupPath, { recursive: true, force: true });
      await fs.rm(journalPath, { force: true });
      return;
    }
    if (await exists(journal.backupPath)) {
      await validatePackage(journal.backupPath);
      await fs.rename(journal.backupPath, canonicalPath);
      await fs.rm(journalPath, { force: true });
      return;
    }
    throw new Error(`Definition package transaction '${journalPath}' has no recoverable directory.`);
  }

  private lockPath(canonicalPath: string): string { return `${canonicalPath}.definition-package`; }
  private journalPath(canonicalPath: string): string { return `${canonicalPath}.definition-transaction.json`; }
}
