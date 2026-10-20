import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TEST_VAULT_SETTING_NAME } from "../test-vault-setting.js";
import { SecretVaultError } from "./secret-vault-types.js";

export const TEST_VAULT_DATABASE_FILE_NAME = "test-vault.db";
export const TEST_VAULT_SETUP_COMMAND = "pnpm test-vault setup";

/** The production desktop app's name; Electron derives its OS data folders from it. */
const DESKTOP_APP_NAME = "autobyteus";

export type PathPolicyEnvironment = Readonly<{
  platform: NodeJS.Platform;
  homeDir: string;
  env: Readonly<Record<string, string | undefined>>;
}>;

export const currentPathPolicyEnvironment = (): PathPolicyEnvironment => ({
  platform: process.platform,
  homeDir: os.homedir(),
  env: process.env,
});

export type TestVaultLocation = Readonly<{
  directory: string;
  databasePath: string;
  rootKeyPath: string;
}>;

export const defaultTestVaultDirectory = (homeDir: string = os.homedir()): string =>
  path.join(homeDir, ".autobyteus-test", "vault");

const locationInvalid = (): SecretVaultError => new SecretVaultError(
  "TEST_VAULT_LOCATION_INVALID",
  false,
  "TEST_VAULT_LOCATION_INVALID",
  { detail: `${TEST_VAULT_SETTING_NAME} must be an absolute directory` },
);

/**
 * Parses a selector value into an absolute, normalized directory. A leading
 * `~` names the home directory, so the documented setting also works where no
 * shell expands it (an `.env` file).
 */
export const parseTestVaultSetting = (value: string, homeDir: string = os.homedir()): string => {
  const trimmed = value.trim();
  const expanded = trimmed === "~"
    ? homeDir
    : trimmed.startsWith("~/") ? path.join(homeDir, trimmed.slice(2)) : trimmed;
  if (!expanded || expanded.includes("\0") || !path.isAbsolute(expanded)) throw locationInvalid();
  return path.resolve(expanded);
};

const caseInsensitive = (platform: NodeJS.Platform): boolean =>
  platform === "darwin" || platform === "win32";

/** Resolves symlinks in the longest existing ancestor and keeps the rest of the path as given. */
const realpathOfExistingAncestor = (candidate: string): string => {
  const missing: string[] = [];
  let current = path.resolve(candidate);
  for (;;) {
    try {
      return path.join(fs.realpathSync.native(current), ...missing.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return path.join(current, ...missing.reverse());
      missing.push(path.basename(current));
      current = parent;
    }
  }
};

/**
 * A path in the form used to compare locations on `platform`: symlinks of the
 * existing ancestor resolved, and case-folded where the file system ignores case.
 */
export const comparablePath = (value: string, platform: NodeJS.Platform): string => {
  const resolved = realpathOfExistingAncestor(value);
  return caseInsensitive(platform) ? resolved.toLowerCase() : resolved;
};

const isWithinOrEqual = (candidate: string, root: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative === ""
    || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

/** The user's production app data folders (REQ-004). */
export const forbiddenTestVaultRoots = ({ platform, homeDir, env }: PathPolicyEnvironment): string[] => {
  const roots = [path.join(homeDir, ".autobyteus")];
  if (platform === "darwin") {
    roots.push(
      path.join(homeDir, "Library", "Application Support", DESKTOP_APP_NAME),
      path.join(homeDir, "Library", "Logs", DESKTOP_APP_NAME),
    );
  } else if (platform === "win32") {
    roots.push(path.join(env.APPDATA || path.join(homeDir, "AppData", "Roaming"), DESKTOP_APP_NAME));
  } else {
    roots.push(path.join(env.XDG_CONFIG_HOME || path.join(homeDir, ".config"), DESKTOP_APP_NAME));
  }
  return roots;
};

/** True when `candidate` is inside (or is) one of the user's production app data folders. */
export const isForbiddenTestVaultLocation = (
  candidate: string,
  policy: PathPolicyEnvironment = currentPathPolicyEnvironment(),
): boolean => {
  const target = comparablePath(candidate, policy.platform);
  return forbiddenTestVaultRoots(policy)
    .some((root) => isWithinOrEqual(target, comparablePath(root, policy.platform)));
};

const isSymbolicLink = (candidate: string): boolean => {
  try {
    return fs.lstatSync(candidate).isSymbolicLink();
  } catch {
    return false;
  }
};

/**
 * The vault files inside a test-vault directory. A forbidden directory is
 * refused here, before any file is touched.
 */
export const resolveTestVaultLocation = (
  directory: string,
  policy: PathPolicyEnvironment = currentPathPolicyEnvironment(),
): TestVaultLocation => {
  const resolved = parseTestVaultSetting(directory, policy.homeDir);
  if (isForbiddenTestVaultLocation(resolved, policy)) {
    throw new SecretVaultError(
      "TEST_VAULT_LOCATION_FORBIDDEN",
      false,
      "TEST_VAULT_LOCATION_FORBIDDEN",
      { detail: `${resolved} is inside the user's AutoByteus app data` },
    );
  }
  if (isSymbolicLink(resolved)) throw locationInvalid();
  const databasePath = path.join(resolved, TEST_VAULT_DATABASE_FILE_NAME);
  return Object.freeze({
    directory: resolved,
    databasePath,
    rootKeyPath: `${databasePath}.secret.key`,
  });
};
