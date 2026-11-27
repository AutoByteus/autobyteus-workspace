import fs from "node:fs/promises";

/** The file is cut to its newer half when it grows beyond this size. */
export const EXTENSION_LOG_MAX_BYTES = 1024 * 1024;
/** What the card's View log shows. */
export const EXTENSION_LOG_TAIL_LINES = 200;

/**
 * Each extension's own log, `<id>/extension.log` (contract §7): one `<ISO time> <line>` per line, written by the
 * Extension Manager and by the extension through `ctx.log`. Appends to one file run one after another. A line for an
 * extension whose folder is gone is dropped: the log never creates the folder again after Remove.
 */
export class ExtensionLog {
  private readonly writes = new Map<string, Promise<void>>();

  constructor(private readonly fileOf: (id: string) => string) {}

  append(id: string, line: string): void {
    const text = `${new Date().toISOString()} ${line.replace(/\r?\n/g, " ")}\n`;
    const file = this.fileOf(id);
    const next = (this.writes.get(id) ?? Promise.resolve()).then(async () => {
      try {
        await fs.appendFile(file, text, { flag: "a" });
        const { size } = await fs.stat(file);
        if (size > EXTENSION_LOG_MAX_BYTES) {
          const content = await fs.readFile(file, "utf8");
          const half = content.slice(Math.floor(content.length / 2));
          await fs.writeFile(file, half.slice(half.indexOf("\n") + 1));
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn(`EXTENSION_LOG_WRITE_FAILED: ${id}: ${String(error)}`);
      }
    });
    this.writes.set(id, next);
  }

  /** Resolves when every line appended so far is written (Remove waits for it before deleting the folder). */
  async idle(id: string): Promise<void> {
    await this.writes.get(id);
  }

  /** Resolves when every line appended so far, for every extension, is written (the node stops). */
  async idleAll(): Promise<void> {
    await Promise.all([...this.writes.values()]);
  }

  async tail(id: string, lines = EXTENSION_LOG_TAIL_LINES): Promise<string[]> {
    await this.idle(id);
    try {
      return (await fs.readFile(this.fileOf(id), "utf8")).split("\n").filter(Boolean).slice(-lines);
    } catch {
      return [];
    }
  }
}
