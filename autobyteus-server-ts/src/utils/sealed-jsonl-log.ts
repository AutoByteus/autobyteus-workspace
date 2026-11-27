import fs from "node:fs/promises";
import path from "node:path";

/** The active file is sealed once it holds at least this many bytes (the message-log pattern). */
export const SEALED_JSONL_ROTATION_LIMIT_BYTES = 4 * 1024 * 1024;

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a log keeps its sealed files (autobyteus-646 R-14), and the time of one of its lines. */
export type SealedJsonlRetention = Readonly<{ days: number; timeOf(value: unknown): number | null }>;

/**
 * An append-only JSON-lines log in one folder: `<base>_active.jsonl` plus sealed `<base>_NNNNNN.jsonl` files (the
 * message-log pattern, A-24). Appends are serialized in this process; an unfinished last line (a write that never
 * returned) is cut off before the next append; the active file is sealed once it reaches the rotation limit. A line
 * counts only when its `\n` is present. With a retention (R-14), a sealed file whose last line is older than its window is
 * deleted, at startup (`removeSealedOlderThan`) and after each seal; the active file is never deleted. It owns the files
 * only: what a line means is its owner's (the routing decision log, the run event log, the switch record log).
 */
export class SealedJsonlLog {
  private writes: Promise<void> = Promise.resolve();
  private readonly sealed: RegExp;

  constructor(private readonly options: Readonly<{ dir: string; baseName: string; rotationLimitBytes?: number; retention?: SealedJsonlRetention; now?: () => Date }>) {
    this.sealed = new RegExp(`^${options.baseName}_(\\d{6})\\.jsonl$`);
  }

  get dir(): string { return this.options.dir; }

  private get activeName(): string { return `${this.options.baseName}_active.jsonl`; }

  /** Appends the values as one write, one JSON line each (values written together stay together). */
  append(values: readonly unknown[]): Promise<void> {
    if (!values.length) return Promise.resolve();
    const text = values.map((value) => `${JSON.stringify(value)}\n`).join("");
    const write = this.writes.then(() => this.write(text));
    this.writes = write.catch(() => undefined);
    return write;
  }

  /** The log's file names, oldest first: the sealed files in order, then the active file. */
  async fileNames(): Promise<readonly string[]> {
    const names = await fs.readdir(this.options.dir).catch((error: unknown) => {
      if (isMissing(error)) return [] as string[];
      throw error;
    });
    return [...names.filter((name) => this.sealed.test(name)).sort(), ...(names.includes(this.activeName) ? [this.activeName] : [])];
  }

  /** One file's complete lines (the text after the last `\n` is an unfinished line); empty lines are left out. */
  async completeLines(name: string): Promise<readonly string[]> {
    const text = await fs.readFile(path.join(this.options.dir, name), "utf8").catch((error: unknown) => {
      if (isMissing(error)) return "";
      throw error;
    });
    const lines = text.split("\n");
    lines.pop();
    return lines.filter((line) => line.trim().length > 0);
  }

  /**
   * Deletes the sealed files whose last line is older than `days` (the log's retention unless given); returns their
   * names. A file whose last line has no time is kept.
   */
  async removeSealedOlderThan(days: number | undefined = this.options.retention?.days, now: Date = this.options.now?.() ?? new Date()): Promise<readonly string[]> {
    const timeOf = this.options.retention?.timeOf;
    if (days === undefined || !timeOf) return [];
    const cutoff = now.getTime() - days * DAY_MS;
    const removed: string[] = [];
    for (const name of await this.fileNames()) {
      if (!this.sealed.test(name)) continue;
      const lines = await this.completeLines(name);
      let last: number | null = null;
      try { last = lines.length ? timeOf(JSON.parse(lines[lines.length - 1]!)) : null; } catch { last = null; }
      if (last === null || last >= cutoff) continue;
      await fs.rm(path.join(this.options.dir, name), { force: true });
      removed.push(name);
    }
    if (removed.length) console.info(`${this.options.baseName} log: ${removed.length} sealed file(s) older than ${days} days removed.`);
    return removed;
  }

  private async write(text: string): Promise<void> {
    await fs.mkdir(this.options.dir, { recursive: true });
    const activePath = path.join(this.options.dir, this.activeName);
    const handle = await fs.open(activePath, "a+");
    try {
      const { size } = await handle.stat();
      if (size > 0) {
        const last = Buffer.alloc(1);
        await handle.read(last, 0, 1, size - 1);
        if (last[0] !== 0x0a) {
          const content = await handle.readFile("utf8");
          await handle.truncate(Buffer.byteLength(content.slice(0, content.lastIndexOf("\n") + 1)));
        }
      }
      await handle.appendFile(text, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    if ((await fs.stat(activePath)).size >= (this.options.rotationLimitBytes ?? SEALED_JSONL_ROTATION_LIMIT_BYTES)) {
      await this.rotate(activePath);
      await this.removeSealedOlderThan().catch((error: unknown) =>
        console.warn(`${this.options.baseName} log: old sealed files could not be removed: ${String(error)}`));
    }
  }

  private async rotate(activePath: string): Promise<void> {
    const names = await fs.readdir(this.options.dir);
    const last = names.map((name) => this.sealed.exec(name)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b).at(-1) ?? 0;
    await fs.rename(activePath, path.join(this.options.dir, `${this.options.baseName}_${String(last + 1).padStart(6, "0")}.jsonl`));
  }
}
