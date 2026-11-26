import { realpath, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Where a shared folder appears inside a sandbox (read-only, DEC-113). */
export const SHARED_FOLDER_ROOT_IN_SANDBOX = "/home/autobyteus/shared";
/** The sandbox node's data folder (a fresh anonymous volume, removed with the container). */
export const DATA_IN_SANDBOX = "/home/autobyteus/data";
/** The sandbox's workspace (its delegated runs work here) and its node's memory folder, both mapped to host folders (C8). */
export const WORKSPACE_IN_SANDBOX = "/home/autobyteus/workspace";
export const MEMORY_IN_SANDBOX = `${DATA_IN_SANDBOX}/memory`;

const SHARED_NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** The user's credential and app-data folders a sandbox may never receive (R-G); `.autobyteus*` matched by prefix. */
const PROTECTED_HOME_ENTRIES = [".ssh", ".claude", ".codex", ".grok", ".config", ".aws", ".gnupg", ".docker", ".kube", ".netrc", "Library"];

const within = (child: string, parent: string): boolean =>
  child === parent || child.startsWith(parent.endsWith(path.sep) ? parent : `${parent}${path.sep}`);

/** A folder given to a sandbox, refused with the reason. */
export class SandboxFolderError extends Error {}

/**
 * A folder an agent gives a sandbox (a shared folder or an agent package): absolute, an existing directory, symbolic
 * links resolved, and neither the user's home folder (or a parent of it) nor in or around one of their credential or
 * app-data folders, the node's data folder or the test vault. Returns the resolved path.
 */
export const resolveGivenFolder = async (
  given: unknown,
  protectedFolders: Readonly<{ appDataDir: string; testVault: string | null; home?: string }>,
): Promise<string> => {
  if (typeof given !== "string" || !path.isAbsolute(given)) throw new SandboxFolderError("the path must be absolute.");
  let resolved: string;
  try {
    resolved = await realpath(given);
    if (!(await stat(resolved)).isDirectory()) throw new SandboxFolderError("it is not a folder.");
  } catch (error) {
    if (error instanceof SandboxFolderError) throw error;
    throw new SandboxFolderError("it does not exist.");
  }
  const home = await realpath(protectedFolders.home ?? os.homedir()).catch(() => protectedFolders.home ?? os.homedir());
  if (within(home, resolved)) throw new SandboxFolderError("it is your home folder, or contains it.");
  const relative = path.relative(home, resolved);
  const first = relative.startsWith("..") || path.isAbsolute(relative) ? null : relative.split(path.sep)[0] ?? null;
  if (first && (PROTECTED_HOME_ENTRIES.includes(first) || first.startsWith(".autobyteus"))) {
    throw new SandboxFolderError(`it is in ~/${first}, which holds credentials or app data.`);
  }
  for (const folder of [protectedFolders.appDataDir, protectedFolders.testVault]) {
    if (!folder) continue;
    const real = await realpath(folder).catch(() => path.resolve(folder));
    if (within(resolved, real) || within(real, resolved)) throw new SandboxFolderError("it is in or contains AutoByteus data or the test vault.");
  }
  for (const entry of PROTECTED_HOME_ENTRIES) {
    if (within(path.join(home, entry), resolved)) throw new SandboxFolderError(`it contains ~/${entry}, which holds credentials or app data.`);
  }
  return resolved;
};

/** A shared folder's name inside the sandbox: lower-case letters, digits and `-`, 1 to 40 characters. */
export const isSharedFolderName = (name: unknown): name is string => typeof name === "string" && SHARED_NAME.test(name);
