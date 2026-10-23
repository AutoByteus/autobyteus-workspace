import fs from "node:fs/promises";
import path from "node:path";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { validateCollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message-schema.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";

/** A log's active file is sealed once it holds at least this many bytes (DEC-002). */
export const MESSAGE_LOG_ROTATION_LIMIT_BYTES = 4 * 1024 * 1024;

/** The family name of a log in its run's folder. */
export type MessageLogBaseName = "communication_messages" | "team_communication_messages" | "agent_org_communication_messages";

export type MessageLogFileOperations = Pick<typeof fs, "mkdir" | "open" | "readFile" | "readdir" | "rename" | "stat">;

type Result = RunPackageFileWriteResult<"communication_messages">;
const FILE = "communication_messages" as const;
const NEWLINE = 0x0a;
const TAIL_CHUNK_BYTES = 64 * 1024;

const asError = (cause: unknown): Error => cause instanceof Error ? cause : new Error(String(cause));
const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** One message as one line: exactly the seven message fields, compact JSON, `\n`-terminated. */
const encodeLine = (message: CollaborationCommunicationMessage): string => `${JSON.stringify({
  messageId: message.messageId,
  senderAgentRunId: message.senderAgentRunId,
  receiverAgentRunId: message.receiverAgentRunId,
  content: message.content,
  messageType: message.messageType,
  referenceFiles: [...message.referenceFiles],
  createdAt: message.createdAt,
})}\n`;

/**
 * One run's message log in its folder (design DS-003): sealed files `<base>_<6 digits>.jsonl` and the
 * active file `<base>_active.jsonl`, one message per line. Appends write one line and sync it; when the
 * active file reaches the rotation limit it is renamed to the next sealed file, which appends and
 * rotation never write again. An unfinished last line (an append that never returned success) is
 * ignored on read and cut off by the next append. Callers serialize writes per log (the coordinating
 * run's lock, or the startup migration). Knows nothing about runs, families or owners.
 */
export class MessageLog {
  private readonly dir: string;
  private readonly writer: AtomicRunPackageFileCommitWriter;
  private readonly rotationLimitBytes: number;
  private readonly operations: MessageLogFileOperations;
  private readonly sealedPattern: RegExp;

  constructor(
    dir: string,
    private readonly baseName: MessageLogBaseName,
    options: Readonly<{
      writer?: AtomicRunPackageFileCommitWriter;
      /** Tests only. */
      rotationLimitBytes?: number;
      /** Tests only: injected file operations. */
      operations?: MessageLogFileOperations;
    }> = {},
  ) {
    this.dir = path.resolve(dir);
    this.writer = options.writer ?? getAtomicRunPackageFileCommitWriter();
    this.rotationLimitBytes = options.rotationLimitBytes ?? MESSAGE_LOG_ROTATION_LIMIT_BYTES;
    this.operations = options.operations ?? fs;
    this.sealedPattern = new RegExp(`^${baseName}_(\\d{6})\\.jsonl$`);
  }

  private get activePath(): string {
    return path.join(this.dir, `${this.baseName}_active.jsonl`);
  }

  private sealedPath(index: number): string {
    return path.join(this.dir, `${this.baseName}_${String(index).padStart(6, "0")}.jsonl`);
  }

  /** Sealed file names in index order. */
  private async sealedFileNames(): Promise<string[]> {
    const names = await this.operations.readdir(this.dir).catch((error: unknown) => {
      if (isMissing(error)) return [] as string[];
      throw error;
    });
    return names.filter((name) => this.sealedPattern.test(name)).sort();
  }

  private async activeExists(): Promise<boolean> {
    try { await this.operations.stat(this.activePath); return true; }
    catch (error) { if (isMissing(error)) return false; throw error; }
  }

  /** Some file of the log exists. */
  async exists(): Promise<boolean> {
    return await this.activeExists() || (await this.sealedFileNames()).length > 0;
  }

  /**
   * The log's messages: sealed files in index order, then the active file; a line counts only when its
   * `\n` is present; every counted line must be a valid message (strict, as before); each id once (first
   * occurrence); sorted by `createdAt`, ties in file order. `null` when the log has no file.
   */
  async read(): Promise<readonly CollaborationCommunicationMessage[] | null> {
    const files = (await this.sealedFileNames()).map((name) => path.join(this.dir, name));
    if (await this.activeExists()) files.push(this.activePath);
    if (files.length === 0) return null;
    const byId = new Map<string, CollaborationCommunicationMessage>();
    for (const filePath of files) {
      const lines = (await this.operations.readFile(filePath, "utf8")).split("\n");
      lines.pop();
      lines.forEach((line, index) => {
        const label = `${path.basename(filePath)}:line ${index + 1}`;
        let value: unknown;
        try { value = JSON.parse(line); }
        catch { throw new Error(`${label} is not valid JSON.`); }
        const message = validateCollaborationCommunicationMessage(value, label);
        if (!byId.has(message.messageId)) byId.set(message.messageId, message);
      });
    }
    return Object.freeze([...byId.values()]
      .map((message, order) => ({ message, order }))
      .sort((left, right) => left.message.createdAt.localeCompare(right.message.createdAt) || left.order - right.order)
      .map(({ message }) => message));
  }

  /**
   * A run's first package write (which its coordinator may retry) or a new task agent team's empty log:
   * atomically replaces the active file with exactly these messages, as the JSON log was replaced
   * before. Refused only when sealed files exist: a rotated log already holds committed history.
   */
  async writeInitial(messages: readonly CollaborationCommunicationMessage[]): Promise<Result> {
    let sealed: string[];
    try { sealed = await this.sealedFileNames(); }
    catch (cause) { return { outcome: "not_renamed", file: FILE, stage: "prepare_directory", cause: asError(cause) }; }
    if (sealed.length > 0) {
      return { outcome: "not_renamed", file: FILE, stage: "prepare_directory",
        cause: new Error(`Message log '${this.activePath}' already has sealed files; it is not an initial log.`) };
    }
    return this.writer.writeSerializedText({ file: FILE, filePath: this.activePath, text: messages.map(encodeLine).join("") });
  }

  /**
   * Startup migration only: appends many messages, sealing the active file whenever it reaches the
   * limit; each file written is synced once. Creates an empty log when the log has no file and there is
   * nothing to append. Throws on any failure; a retry recomputes what is missing.
   */
  async appendBatch(messages: readonly CollaborationCommunicationMessage[]): Promise<void> {
    if (messages.length === 0 && await this.exists()) return;
    let created = !await this.activeExists();
    if (created) await this.operations.mkdir(this.dir, { recursive: true });
    let handle: fs.FileHandle | null = await this.operations.open(this.activePath, "a+");
    try {
      let size = await this.repairTail(handle, (await handle.stat()).size);
      for (const message of messages) {
        if (size >= this.rotationLimitBytes) {
          const sealing: fs.FileHandle = handle;
          handle = null;
          await sealing.sync();
          await sealing.close();
          await this.seal();
          handle = await this.operations.open(this.activePath, "a+");
          created = true;
          size = 0;
        }
        const line = Buffer.from(encodeLine(message), "utf8");
        await writeAll(handle, line);
        size += line.length;
      }
      await handle.sync();
      if (created) await this.syncDirectory();
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  /** Cuts off an unfinished last line, so the file ends with a complete line (or is empty). */
  private async repairTail(handle: fs.FileHandle, size: number): Promise<number> {
    if (size === 0) return 0;
    const last = Buffer.alloc(1);
    await handle.read(last, 0, 1, size - 1);
    if (last[0] === NEWLINE) return size;
    const chunk = Buffer.alloc(TAIL_CHUNK_BYTES);
    let end = size;
    while (end > 0) {
      const start = Math.max(0, end - TAIL_CHUNK_BYTES);
      const { bytesRead } = await handle.read(chunk, 0, end - start, start);
      const index = chunk.subarray(0, bytesRead).lastIndexOf(NEWLINE);
      if (index >= 0) {
        await handle.truncate(start + index + 1);
        return start + index + 1;
      }
      end = start;
    }
    await handle.truncate(0);
    return 0;
  }

  /** Renames the active file to the next sealed file and syncs the folder. */
  private async seal(): Promise<void> {
    const indexes = (await this.sealedFileNames()).map((name) => Number(this.sealedPattern.exec(name)![1]));
    await this.operations.rename(this.activePath, this.sealedPath(Math.max(0, ...indexes) + 1));
    await this.syncDirectory();
  }

  private async syncDirectory(): Promise<void> {
    const directory = await this.operations.open(this.dir, "r");
    try { await directory.sync(); }
    finally { await directory.close().catch(() => undefined); }
  }
}

const writeAll = async (handle: fs.FileHandle, buffer: Buffer): Promise<void> => {
  let offset = 0;
  while (offset < buffer.length) {
    const { bytesWritten } = await handle.write(buffer, offset, buffer.length - offset);
    offset += bytesWritten;
  }
};
