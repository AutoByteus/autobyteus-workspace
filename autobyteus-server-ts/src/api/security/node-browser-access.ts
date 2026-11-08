import { isIP } from "node:net";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { hostNameOfUrl, normalizeHostName } from "./request-host-name.js";

const ALLOWED_ORIGINS_SETTING = "AUTOBYTEUS_ALLOWED_ORIGINS";
const ALLOWED_HOSTS_SETTING = "AUTOBYTEUS_ALLOWED_HOSTS";
const SERVER_HOST_SETTING = "AUTOBYTEUS_SERVER_HOST";

/** The node's browser-access settings, read once at start. */
export type NodeBrowserAccess = {
  /** Exact web origins of `AUTOBYTEUS_ALLOWED_ORIGINS`. */
  readonly allowedOrigins: readonly string[];
  /** Exact host names: the hosts of `AUTOBYTEUS_SERVER_HOST` and of the allowed origins, the names of `AUTOBYTEUS_ALLOWED_HOSTS`. */
  readonly allowedHostNames: ReadonlySet<string>;
  /** From `.x` entries of `AUTOBYTEUS_ALLOWED_HOSTS`: `x` and every name under it. */
  readonly allowedHostSuffixes: readonly string[];
};

export type ConfiguredOrigins = {
  origins: string[];
  invalidEntries: string[];
};

export type ConfiguredHosts = {
  names: string[];
  suffixes: string[];
  invalidEntries: string[];
};

const HOST_LABEL = "[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?";
const HOST_NAME = new RegExp(`^${HOST_LABEL}(?:\\.${HOST_LABEL})*$`);

const splitEntries = (raw: string): string[] => raw.split(",").map((value) => value.trim()).filter(Boolean);

const parseWebOrigin = (value: string): URL | null => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
};

/** Parses the comma-separated `AUTOBYTEUS_ALLOWED_ORIGINS` value into exact web origins. */
export const parseConfiguredOrigins = (raw: string): ConfiguredOrigins => {
  const origins: string[] = [];
  const invalidEntries: string[] = [];
  for (const entry of splitEntries(raw)) {
    const parsed = parseWebOrigin(entry);
    if (parsed) {
      origins.push(parsed.origin);
    } else {
      invalidEntries.push(entry);
    }
  }
  return { origins, invalidEntries };
};

const toConfiguredHostName = (value: string): string | null => {
  const name = normalizeHostName(value);
  if (!name) return null;
  return HOST_NAME.test(name) || isIP(name) !== 0 ? name : null;
};

/** Parses the comma-separated `AUTOBYTEUS_ALLOWED_HOSTS` value: names, and `.x` entries covering `x` and every name under it. */
export const parseConfiguredHosts = (raw: string): ConfiguredHosts => {
  const names: string[] = [];
  const suffixes: string[] = [];
  const invalidEntries: string[] = [];
  for (const entry of splitEntries(raw)) {
    const isSuffix = entry.startsWith(".");
    const name = toConfiguredHostName(isSuffix ? entry.slice(1) : entry);
    if (!name || (isSuffix && isIP(name) !== 0)) {
      invalidEntries.push(entry);
    } else {
      (isSuffix ? suffixes : names).push(name);
    }
  }
  return { names, suffixes, invalidEntries };
};

const readSetting = (key: string): string => appConfigProvider.config.get(key, "") ?? "";

const warnInvalid = (setting: string, expected: string, entries: readonly string[]): void => {
  if (entries.length > 0) {
    console.warn(`${setting}: ignoring entries that are not ${expected}: ${entries.join(", ")}`);
  }
};

const readNodeBrowserAccess = (): NodeBrowserAccess => {
  const origins = parseConfiguredOrigins(readSetting(ALLOWED_ORIGINS_SETTING));
  warnInvalid(ALLOWED_ORIGINS_SETTING, "http(s) origins", origins.invalidEntries);
  const hosts = parseConfiguredHosts(readSetting(ALLOWED_HOSTS_SETTING));
  warnInvalid(ALLOWED_HOSTS_SETTING, "host names or .suffix entries", hosts.invalidEntries);

  const serverHost = readSetting(SERVER_HOST_SETTING).trim();
  const serverHostName = serverHost ? hostNameOfUrl(serverHost) : null;
  warnInvalid(SERVER_HOST_SETTING, "a URL with a host", serverHost && !serverHostName ? [serverHost] : []);

  const allowedHostNames = new Set<string>(hosts.names);
  for (const name of [serverHostName, ...origins.origins.map(hostNameOfUrl)]) {
    if (name) allowedHostNames.add(name);
  }
  return {
    allowedOrigins: origins.origins,
    allowedHostNames,
    allowedHostSuffixes: hosts.suffixes,
  };
};

let current: NodeBrowserAccess | null = null;

/** The node's browser-access settings, read and validated once per process (one warning per setting). */
export const getNodeBrowserAccess = (): NodeBrowserAccess => {
  current ??= readNodeBrowserAccess();
  return current;
};

export const resetNodeBrowserAccessForTests = (): void => {
  current = null;
};
