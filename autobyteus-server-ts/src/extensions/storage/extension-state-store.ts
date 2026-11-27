import fs from "node:fs/promises";
import path from "node:path";

/** `state.json`: the only fact AutoByteus keeps per extension (extension-contract.md §7). */
export type ExtensionStates = Readonly<Record<string, Readonly<{ enabled: boolean }>>>;

/**
 * The node's extensions folder (`<data dir>/extensions`, contract §7): `state.json` and each extension's folder.
 *
 * Reading is tolerant: an unreadable `state.json` reads as no entries (so every installed extension is Off), is logged,
 * and is not rewritten until a change. Writing replaces the file atomically (temporary file, then rename); changes are
 * applied one after another, so two switches at the same time cannot lose each other's entry.
 */
export class ExtensionStateStore {
  private changes: Promise<unknown> = Promise.resolve();
  private warnedUnreadable = false;

  constructor(readonly root: string) {}

  folder(id: string): string { return path.join(this.root, id); }
  /** The installed package; installed ⇔ a valid `package/extension.json`. */
  packageDir(id: string): string { return path.join(this.root, id, "package"); }
  /** Where Install and Update unpack and prepare the package before it is renamed to `package/`. */
  stagedPackageDir(id: string): string { return path.join(this.root, id, "package.new"); }
  /** The extension's own folder, its `ctx.dir`: kept on update, deleted on remove. */
  dataDir(id: string): string { return path.join(this.root, id, "data"); }
  logFile(id: string): string { return path.join(this.root, id, "extension.log"); }

  /** The extension ids that have a folder with `package/extension.json` (its validity is the caller's to check). */
  async packagedIds(): Promise<string[]> {
    let names: string[];
    try {
      names = await fs.readdir(this.root);
    } catch {
      return [];
    }
    const packaged = await Promise.all(names.map(async (name) =>
      fs.access(path.join(this.packageDir(name), "extension.json")).then(() => name, () => null)));
    return packaged.filter((name): name is string => name !== null);
  }

  async read(): Promise<ExtensionStates> {
    let raw: string;
    try {
      raw = await fs.readFile(path.join(this.root, "state.json"), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      return this.unreadable(error);
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not a JSON object");
      this.warnedUnreadable = false;
      return Object.fromEntries(Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => typeof (value as { enabled?: unknown } | null)?.enabled === "boolean")
        .map(([id, value]) => [id, { enabled: (value as { enabled: boolean }).enabled }]));
    } catch (error) {
      return this.unreadable(error);
    }
  }

  /** Applies one change to the stored entries and writes the result. */
  update(change: (states: Record<string, { enabled: boolean }>) => void): Promise<void> {
    const next = this.changes.then(async () => {
      const states = Object.fromEntries(Object.entries(await this.read()).map(([id, value]) => [id, { ...value }]));
      change(states);
      await fs.mkdir(this.root, { recursive: true });
      const file = path.join(this.root, "state.json");
      const temporary = `${file}.${process.pid}.tmp`;
      await fs.writeFile(temporary, `${JSON.stringify(states)}\n`);
      await fs.rename(temporary, file);
    });
    this.changes = next.catch(() => undefined);
    return next;
  }

  private unreadable(error: unknown): ExtensionStates {
    if (!this.warnedUnreadable) {
      this.warnedUnreadable = true;
      console.warn(`EXTENSIONS_STATE_UNREADABLE: ${path.join(this.root, "state.json")}: ${String(error)}; every installed extension is shown Off until it is changed`);
    }
    return {};
  }
}
