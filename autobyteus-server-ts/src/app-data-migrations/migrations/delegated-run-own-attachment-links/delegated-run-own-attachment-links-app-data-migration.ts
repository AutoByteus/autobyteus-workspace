import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import {
  ContextFileRecordValidationError,
  listContextFileRecordSources,
  transformContextFileRecordLocators,
  type ContextFileRecordSource,
} from "../../frozen/server/context-files/services/context-file-record-locators.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../../domain/app-data-migration-types.js";
import { convertAttachmentLink, HOST_SCOPED_MARKER, type LinkOwnerFolder } from "./attachment-link-conversion.js";
import { listAttachmentLinkFolders } from "./attachment-link-folders.js";

export const DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID = "20261119_delegated_run_own_attachment_links";
export const DELEGATED_RUN_OWN_ATTACHMENT_LINKS_AFTER_TASK_AGENT_OWN_RUN_MIGRATION_ID =
  "20261119_delegated_run_own_attachment_links_after_task_agent_own_run";
const TASK_AGENT_OWN_RUN_V1_MIGRATION_ID = "20261017_task_agent_own_run_v1";
/** At most this many examples of links left as they are, in the warnings (the counts are complete). */
const WARNING_EXAMPLES = 20;

type FileOutcome =
  | Readonly<{ kind: "already_current"; unconvertible: readonly string[] }>
  | Readonly<{ kind: "converted"; links: number; backupPath: string; unconvertible: readonly string[] }>
  | Readonly<{ kind: "unparseable"; reason: string }>;

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

const syncFile = async (filePath: string): Promise<void> => {
  const handle = await fs.open(filePath, "r");
  try { await handle.sync(); } finally { await handle.close(); }
};

/**
 * `20261119_delegated_run_own_attachment_links` and its follow-up (design FU-020, M-1 … M-10; D-8): every stored
 * attachment link that names a delegated child through the run that hosted it becomes the child's own link. Per trace
 * file: a byte pre-check; the frozen locator transform (only `media.*[]` and `file_attachments[].uri`; unchanged lines
 * keep their bytes); a byte copy of the original before its first rewrite (never overwritten, so a retry keeps the true
 * original: the founder's rule); a temporary file in the same folder, `fsync`ed, renamed over the original; a re-read
 * check. A link that cannot be admitted stays as it is, with a warning; a file that cannot be parsed is left unchanged.
 * An I/O failure fails the run; converted files stay converted and the next start converts the rest.
 *
 * The follow-up (`…_after_task_agent_own_run`, M-7) runs the same definition after `20261017_task_agent_own_run_v1`,
 * which moves delegated runs' folders out of their delegator's: it converts what that migration moved after ours ran.
 */
export class DelegatedRunOwnAttachmentLinksMigration implements AppDataMigrationDefinition {
  readonly displayName: string;
  readonly description = "Converts each stored attachment link of a delegated run to the run's own link, after a backup of the file.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;

  constructor(
    readonly id: string,
    private readonly appDataDir: string,
    private readonly memoryDir: string,
    readonly prerequisiteMigrationIds: readonly string[] = [],
  ) {
    this.displayName = id === DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID
      ? "Delegated runs' attachments link to their own run"
      : "Delegated runs' attachments link to their own run (after delegated runs moved to their own folders)";
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    const unconvertible: string[] = [];
    let scanned = 0, migrated = 0, skipped = 0, failed = 0, unconvertibleCount = 0, unparseable = 0;
    for (const owner of await listAttachmentLinkFolders(this.memoryDir)) {
      const sources = await listContextFileRecordSources({ rootDirectories: [], agentDirectories: [owner.folder] });
      for (const source of sources) {
        scanned += 1;
        try {
          const outcome = await this.convertFile(owner, source);
          if (outcome.kind === "unparseable") {
            skipped += 1; unparseable += 1;
            details.push({ itemId: source.filePath, filePath: source.filePath, status: "SKIPPED", message: `left unchanged: ${outcome.reason}` });
            continue;
          }
          unconvertibleCount += outcome.unconvertible.length;
          unconvertible.push(...outcome.unconvertible.slice(0, Math.max(0, WARNING_EXAMPLES - unconvertible.length)));
          if (outcome.kind === "converted") {
            migrated += 1;
            details.push({ itemId: source.filePath, filePath: source.filePath, status: "MIGRATED",
              message: `${outcome.links} link(s) converted to the run's own`, backupPath: outcome.backupPath });
          } else skipped += 1;
        } catch (error) {
          failed += 1;
          details.push({ itemId: source.filePath, filePath: source.filePath, status: "FAILED", message: message(error) });
        }
      }
    }
    if (unconvertibleCount > 0) {
      details.push({ itemId: "PRESERVED_UNCONVERTIBLE", status: "SKIPPED",
        message: `${unconvertibleCount} host-scoped link(s) left as they are (examples: ${unconvertible.join("; ")})` });
      console.warn(`${this.id}: ${unconvertibleCount} host-scoped attachment link(s) left as they are.`, unconvertible);
    }
    const status = failed > 0 ? "FAILED" : unconvertibleCount > 0 || unparseable > 0 ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED";
    return {
      status,
      summary: { scannedCount: scanned, migratedCount: migrated, skippedCount: skipped, failedCount: failed, details },
      errorMessage: failed > 0 ? `${failed} trace file(s) could not be converted; the next start retries them.` : null,
    };
  }

  private async convertFile(owner: LinkOwnerFolder, source: ContextFileRecordSource): Promise<FileOutcome> {
    const bytes = await fs.readFile(source.filePath);
    // M-4 step 1: the byte pre-check; a file without the marker holds no host-scoped link.
    if (!bytes.includes(HOST_SCOPED_MARKER)) return { kind: "already_current", unconvertible: [] };
    const text = bytes.toString("utf8");
    const unconvertible: string[] = [];
    let links = 0;
    let next: string;
    try {
      next = await transformContextFileRecordLocators(source, text, async (locator, field) => {
        const conversion = convertAttachmentLink(locator, owner);
        if (conversion.kind === "converted") { links += 1; return conversion.target; }
        if (conversion.kind === "unconvertible") unconvertible.push(`${field}: ${conversion.reason}`);
        return locator;
      });
    } catch (error) {
      if (error instanceof ContextFileRecordValidationError) return { kind: "unparseable", reason: error.message };
      throw error;
    }
    if (next === text) return { kind: "already_current", unconvertible };
    const backupPath = await this.backUp(source.filePath);
    await this.replace(source.filePath, next);
    await this.verify(owner, source, text);
    return { kind: "converted", links, backupPath, unconvertible };
  }

  /** M-5: a byte copy of the original before its first rewrite, `fsync`ed; an existing copy (a retry) is kept. */
  private async backUp(filePath: string): Promise<string> {
    const backupPath = path.join(this.appDataDir, "app-data-migration-backups", this.id, "memory", path.relative(this.memoryDir, filePath));
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    try {
      await fs.copyFile(filePath, backupPath, fsConstants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      return backupPath;
    }
    await syncFile(backupPath);
    return backupPath;
  }

  /** M-4 step 4: a temporary file in the same folder, `fsync`ed, renamed over the original. */
  private async replace(filePath: string, text: string): Promise<void> {
    const temporary = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${this.id}.tmp`);
    const handle = await fs.open(temporary, "w");
    try {
      await handle.writeFile(text, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temporary, filePath);
  }

  /** M-4: the rewritten file keeps its line count and holds no link this migration admits. */
  private async verify(owner: LinkOwnerFolder, source: ContextFileRecordSource, original: string): Promise<void> {
    const written = await fs.readFile(source.filePath, "utf8");
    const lines = (value: string) => value.split("\n").length;
    if (lines(written) !== lines(original)) throw new Error(`${source.filePath}: the rewritten file's line count changed.`);
    let admitted = 0;
    await transformContextFileRecordLocators(source, written, async (locator) => {
      if (convertAttachmentLink(locator, owner).kind === "converted") admitted += 1;
      return locator;
    });
    if (admitted > 0) throw new Error(`${source.filePath}: ${admitted} admitted link(s) remain after the rewrite.`);
  }
}

/** The migration, appended last, and its follow-up after `20261017_task_agent_own_run_v1` (design M-7). */
export const createDelegatedRunOwnAttachmentLinksMigrations = (appDataDir: string, memoryDir: string): AppDataMigrationDefinition[] => [
  new DelegatedRunOwnAttachmentLinksMigration(DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID, appDataDir, memoryDir),
  new DelegatedRunOwnAttachmentLinksMigration(DELEGATED_RUN_OWN_ATTACHMENT_LINKS_AFTER_TASK_AGENT_OWN_RUN_MIGRATION_ID, appDataDir, memoryDir,
    [TASK_AGENT_OWN_RUN_V1_MIGRATION_ID, DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID]),
];
