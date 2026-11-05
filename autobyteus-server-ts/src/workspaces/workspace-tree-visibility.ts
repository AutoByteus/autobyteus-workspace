import fs from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../config/app-config-provider.js";
import { writeAtomicJsonSync } from "../persistence/file/atomic-json-sync.js";

export const WORKSPACES_HIDDEN_FROM_TREE_FILE_NAME = "workspaces_hidden_from_tree.json";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

/**
 * Which registered workspaces are hidden from the Workspaces tree (the desktop tree and the phone's work list).
 * A hidden workspace stays registered and choosable. Stored apart from `workspaces.json` in
 * `<appData>/workspaces_hidden_from_tree.json` as `{ "workspaceIds": [...] }`, so the registry keeps its shape and an
 * older build ignores this file.
 *
 * Reads are tolerant: a missing file means none hidden; an unreadable one also means none hidden, with a warning.
 * Writes are serialized and atomic, and drop IDs that are no longer registered. Only `WorkspaceManager` uses this.
 */
export class WorkspaceTreeVisibility {
  private hidden: Set<string> | null = null;
  private loading: Promise<Set<string>> | null = null;
  private mutationQueue: Promise<unknown> = Promise.resolve();

  async hiddenWorkspaceIds(): Promise<ReadonlySet<string>> {
    return this.load();
  }

  /** Hides a registered workspace. `registeredIds` is the registry's current IDs; others are dropped. */
  async hide(workspaceId: string, registeredIds: ReadonlySet<string>): Promise<void> {
    await this.mutate((hidden) => {
      if (hidden.has(workspaceId)) return null;
      return new Set([...hidden, workspaceId]);
    }, registeredIds);
  }

  /** Shows workspaces again (or forgets their mark after removal). Writes only when one of them was hidden. */
  async show(workspaceIds: readonly string[], registeredIds: ReadonlySet<string>): Promise<void> {
    await this.mutate((hidden) => {
      if (!workspaceIds.some((workspaceId) => hidden.has(workspaceId))) return null;
      return new Set([...hidden].filter((workspaceId) => !workspaceIds.includes(workspaceId)));
    }, registeredIds);
  }

  private filePath(): string {
    return path.join(appConfigProvider.config.getAppDataDir(), WORKSPACES_HIDDEN_FROM_TREE_FILE_NAME);
  }

  private async mutate(
    next: (hidden: ReadonlySet<string>) => Set<string> | null,
    registeredIds: ReadonlySet<string>,
  ): Promise<void> {
    const operation = async (): Promise<void> => {
      const hidden = await this.load();
      const changed = next(hidden);
      if (!changed) return;
      const kept = new Set([...changed].filter((workspaceId) => registeredIds.has(workspaceId)));
      const filePath = this.filePath();
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeAtomicJsonSync(filePath, { workspaceIds: [...kept].sort() });
      this.hidden = kept;
    };
    const run = this.mutationQueue.then(operation, operation);
    this.mutationQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private async load(): Promise<Set<string>> {
    if (this.hidden) return this.hidden;
    if (!this.loading) {
      this.loading = this.readFile().then((hidden) => {
        this.hidden = hidden;
        this.loading = null;
        return hidden;
      });
    }
    return this.loading;
  }

  private async readFile(): Promise<Set<string>> {
    const filePath = this.filePath();
    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Set();
      logger.warn(`Could not read ${filePath}; showing every workspace in the Workspaces tree: ${String(error)}`);
      return new Set();
    }
    try {
      const parsed = JSON.parse(raw) as { workspaceIds?: unknown };
      if (!Array.isArray(parsed?.workspaceIds) || parsed.workspaceIds.some((id) => typeof id !== "string")) {
        throw new Error("expected { \"workspaceIds\": string[] }");
      }
      return new Set(parsed.workspaceIds as string[]);
    } catch (error) {
      logger.warn(`Ignoring unreadable ${filePath}; showing every workspace in the Workspaces tree: ${String(error)}`);
      return new Set();
    }
  }
}
