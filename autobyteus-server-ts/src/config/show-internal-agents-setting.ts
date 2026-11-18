import { appConfigProvider } from "./app-config-provider.js";

/** Server setting "Show internal agents" (autobyteus-308): `true` shows the system's own helper agents. */
export const SHOW_INTERNAL_AGENTS_SETTING_KEY = "AUTOBYTEUS_SHOW_INTERNAL_AGENTS";

const parse = (rawValue: string | undefined): boolean | null => {
  const normalized = rawValue?.trim().toLowerCase();
  return normalized === "true" ? true : normalized === "false" ? false : null;
};

/** Read on each use, so a changed setting applies to the next list or read. Absent or anything else means off. */
export const readShowInternalAgents = (
  rawValue: string | undefined = appConfigProvider.config.get(SHOW_INTERNAL_AGENTS_SETTING_KEY),
): boolean => parse(rawValue) === true;

export const normalizeShowInternalAgentsForPersistence = (rawValue: string): [true, string] | [false, string] => {
  const parsed = parse(rawValue);
  return parsed === null
    ? [false, "Show internal agents must be true or false."]
    : [true, String(parsed)];
};
