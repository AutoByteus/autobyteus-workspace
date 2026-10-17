import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { observeSharedMount, type SharedMountObservation } from "./shared-workspace-mount-observation.js";

/** Public nonsecret descriptor written by the standalone service, never by the app. */
export type SharedMountBinding = Readonly<{
  storageId: string;
  mountRoot: string;
  endpoint: string;
  export: string;
  protocol: "3" | "4.1";
}>;
const descriptorPath = "/etc/autobyteus-nfs/attachment.json";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isWithinSharedRoot = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, path.resolve(candidate));
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
};
const failure = (detail: string): Error => new Error(`SHARED_WORKSPACE_NOT_READY: ${detail}. No local substitute will be used.`);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const absolute = (value: unknown): value is string => typeof value === "string" && path.isAbsolute(value) && !/[\x00-\x1f\x7f]/.test(value);

export function parseSharedMountBinding(value: unknown): SharedMountBinding {
  if (!record(value) || typeof value.storageId !== "string" || !uuid.test(value.storageId) ||
    !absolute(value.mountRoot) || path.resolve(value.mountRoot) === "/" ||
    typeof value.endpoint !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9.:-]*$/.test(value.endpoint) ||
    !absolute(value.export) || (value.protocol !== "3" && value.protocol !== "4.1")) {
    throw failure("invalid attachment descriptor; repair the configured attachment");
  }
  return { storageId: value.storageId, mountRoot: path.resolve(value.mountRoot), endpoint: value.endpoint,
    export: value.export, protocol: value.protocol };
}

/** Lazy new-run/restore admission only. Hard NFS may stall this check; no timeout guarantee. */
export class SharedWorkspaceBinding {
  constructor(private readonly input: {
    descriptorPath?: string;
    observe?: (binding: SharedMountBinding) => Promise<SharedMountObservation | null>;
  } = {}) {}

  async configuredForPath(projectPath: string): Promise<SharedMountBinding | null> {
    let raw: unknown;
    try {
      const descriptor = this.input.descriptorPath ?? descriptorPath;
      if ((await fs.stat(descriptor)).size > 16384) throw failure("attachment descriptor is oversized");
      raw = JSON.parse(await fs.readFile(descriptor, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw failure(`cannot read attachment descriptor (${error instanceof Error ? error.message : "invalid data"})`);
    }
    // If the root is known and unrelated, bad endpoint fields must not gate ordinary local work.
    if (record(raw) && absolute(raw.mountRoot) && !isWithinSharedRoot(raw.mountRoot, projectPath)) return null;
    const binding = parseSharedMountBinding(raw);
    return isWithinSharedRoot(binding.mountRoot, projectPath) ? binding : null;
  }

  async checkForRun(projectPath: string): Promise<SharedMountBinding | null> {
    const binding = await this.configuredForPath(projectPath);
    if (!binding) return null;
    const observed = await (this.input.observe ?? observeSharedMount)(binding);
    if (!observed) throw failure(`expected NFS mount at '${binding.mountRoot}' is absent`);
    if (observed.endpoint !== binding.endpoint || observed.export !== binding.export || observed.protocol !== binding.protocol) {
      throw failure(`mount source or protocol differs at '${binding.mountRoot}'`);
    }
    const marker = path.join(binding.mountRoot, ".autobyteus-nfs", "storage.json");
    try {
      if ((await fs.stat(marker)).size > 16384) throw new Error("oversized storage marker");
      const identity: unknown = JSON.parse(await fs.readFile(marker, "utf8"));
      if (!record(identity) || identity.storageId !== binding.storageId) throw new Error("storage identity differs");
      if (!(await fs.stat(projectPath)).isDirectory()) throw new Error("selected project is not a directory");
      await fs.access(projectPath, constants.R_OK | constants.W_OK | constants.X_OK);
    } catch (error) { throw failure(`shared project '${projectPath}' failed identity/access checks (${String(error)})`); }
    return binding;
  }
}
const sharedBinding = new SharedWorkspaceBinding();
export const checkSharedWorkspaceForRun = (projectPath: string): Promise<SharedMountBinding | null> => sharedBinding.checkForRun(projectPath);
export const configuredSharedWorkspace = (projectPath: string): Promise<SharedMountBinding | null> => sharedBinding.configuredForPath(projectPath);
