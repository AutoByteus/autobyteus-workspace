import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ExtensionProgress } from "../domain/extension-item.js";
import { errorMessage } from "../domain/extension-error.js";

/** `status()` that does not answer within this time counts as failed: one extension never holds up the list. */
export const SERVER_PART_STATUS_TIMEOUT_MS = 5_000;
/** At node shutdown each server part gets this long to stop. */
export const SERVER_PART_STOP_TIMEOUT_MS = 5_000;

/** What an action receives (contract §4): the JSON body, or the bytes of an audio body. */
export type ServerPartActionInput = Readonly<{ json: unknown; bytes: Uint8Array | null }>;

type Context = Readonly<{ dir: string; platform: string; log(line: string): void }>;
type InstallContext = Context & Readonly<{ progress(progress: ExtensionProgress): void }>;

/** The default export of `server/index.mjs` (contract §4). */
type ServerPartModule = {
  install(ctx: InstallContext): Promise<void>;
  start?: (ctx: Context) => Promise<void>;
  status(ctx: Context): Promise<{ ready: boolean; message: string }>;
  stop(ctx: Context): Promise<void>;
  actions: Record<string, (ctx: Context, input: ServerPartActionInput) => Promise<unknown>>;
};

export type ServerPartStatus = Readonly<{ ready: boolean; message: string }>;

/** One loaded server part, with its context bound. Everything the extension throws comes back as an `Error`. */
export type LoadedServerPart = Readonly<{
  hasStart: boolean;
  install(progress: (progress: ExtensionProgress) => void): Promise<void>;
  start(): Promise<void>;
  status(): Promise<ServerPartStatus>;
  stop(timeoutMs?: number): Promise<void>;
  /** Only the module's own `actions` keys (an inherited name such as `constructor` is not an action). */
  hasAction(name: string): boolean;
  call(name: string, input: ServerPartActionInput): Promise<unknown>;
}>;

export class ServerPartLoadError extends Error {}

const isFunction = (value: unknown): value is (...args: never[]) => unknown => typeof value === "function";

/** Runs a call into extension code; a value that is not an `Error` is wrapped, so callers always get a message. */
const contained = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

const bounded = <T>(promise: Promise<T>, timeoutMs: number, what: string): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`${what} did not answer within ${timeoutMs / 1000} seconds`)), timeoutMs);
  timer.unref?.();
  promise.then(resolve, reject).finally(() => clearTimeout(timer));
});

/**
 * The Server Part Host: the boundary between AutoByteus and an extension's code. It imports a package's
 * `server/index.mjs` (each load with its own counter in the URL, so an update or a Remove + Install gets fresh module
 * state), checks its shape, builds the extension's context (`dir`, `platform`, `log`, and `progress` while
 * installing) and calls it.
 */
export class ServerPartHost {
  private loads = 0;

  constructor(private readonly deps: Readonly<{ platform: string; log(id: string, line: string): void }>) {}

  async load(id: string, packageDir: string, dataDir: string): Promise<LoadedServerPart> {
    const url = pathToFileURL(path.join(packageDir, "server", "index.mjs"));
    url.search = `?load=${++this.loads}`;
    let part: unknown;
    try {
      part = ((await import(url.href)) as { default?: unknown }).default;
    } catch (error) {
      throw new ServerPartLoadError(`server/index.mjs could not be loaded: ${errorMessage(error)}`);
    }
    const module = part as Partial<ServerPartModule> | null | undefined;
    const missing = [
      !isFunction(module?.install) && "install",
      !isFunction(module?.status) && "status",
      !isFunction(module?.stop) && "stop",
      (typeof module?.actions !== "object" || module.actions === null) && "actions",
      module?.start !== undefined && !isFunction(module.start) && "start",
    ].filter(Boolean);
    if (!module || missing.length) {
      throw new ServerPartLoadError(`server/index.mjs does not export what an extension needs: ${missing.join(", ") || "a default export"}`);
    }
    return this.bind(id, module as ServerPartModule, dataDir);
  }

  private bind(id: string, module: ServerPartModule, dataDir: string): LoadedServerPart {
    const ctx: Context = Object.freeze({
      dir: dataDir,
      platform: this.deps.platform,
      log: (line: string) => this.deps.log(id, String(line)),
    });
    const ensureDir = () => fs.mkdir(dataDir, { recursive: true });
    return Object.freeze({
      hasStart: isFunction(module.start),
      install: (progress) => contained(async () => {
        await ensureDir();
        await module.install(Object.freeze({
          ...ctx,
          progress: (value: ExtensionProgress) => progress({
            message: String(value?.message ?? ""),
            percent: typeof value?.percent === "number" && Number.isFinite(value.percent)
              ? Math.max(0, Math.min(100, Math.round(value.percent))) : null,
          }),
        }));
      }),
      start: () => contained(async () => {
        await ensureDir();
        await module.start?.(ctx);
      }),
      status: () => contained(async () => {
        const status = await bounded(module.status(ctx), SERVER_PART_STATUS_TIMEOUT_MS, "status()");
        if (typeof status?.ready !== "boolean" || typeof status.message !== "string") {
          throw new Error("status() did not answer { ready, message }");
        }
        return { ready: status.ready, message: status.message };
      }),
      stop: (timeoutMs) => contained(async () => {
        const stopping = module.stop(ctx);
        await (timeoutMs === undefined ? stopping : bounded(stopping, timeoutMs, "stop()"));
      }),
      hasAction: (name) => Object.hasOwn(module.actions, name) && isFunction(module.actions[name]),
      call: (name, input) => contained(async () => {
        if (!Object.hasOwn(module.actions, name) || !isFunction(module.actions[name])) throw new Error(`${name} is not an action`);
        await ensureDir();
        return module.actions[name]!(ctx, input);
      }),
    });
  }
}
