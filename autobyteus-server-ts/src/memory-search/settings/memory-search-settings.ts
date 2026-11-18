import { appConfigProvider } from "../../config/app-config-provider.js";

/** The server setting for how many runs memory search returns when a call gives no `limit` (UD-013). */
export const MEMORY_SEARCH_DEFAULT_LIMIT_SETTING_KEY = "AUTOBYTEUS_MEMORY_SEARCH_DEFAULT_LIMIT";
export const MEMORY_SEARCH_DEFAULT_LIMIT = 10;
export const MEMORY_SEARCH_MAX_LIMIT = 20;

export const MEMORY_SEARCH_DEFAULT_LIMIT_SETTING_DESCRIPTION =
  `How many runs memory search (search_memory and the Memory page) returns when a search gives no limit. Blank uses ${MEMORY_SEARCH_DEFAULT_LIMIT}; allowed 1 to ${MEMORY_SEARCH_MAX_LIMIT}.`;

const parseLimit = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const limit = Number(value);
  return limit >= 1 && limit <= MEMORY_SEARCH_MAX_LIMIT ? limit : null;
};

/** Blank, or a whole number from 1 to 20. */
export const normalizeMemorySearchDefaultLimitForPersistence = (value: string): [true, string] | [false, string] => {
  const normalized = value.trim();
  if (!normalized || parseLimit(normalized) !== null) return [true, normalized];
  return [false, `Memory search default limit must be blank (${MEMORY_SEARCH_DEFAULT_LIMIT}) or a whole number from 1 to ${MEMORY_SEARCH_MAX_LIMIT}.`];
};

let warnedValue: string | null = null;

/** The default limit, read at use time. A value that is not 1–20 (set outside the settings list) gives 10, warned once. */
export const resolveMemorySearchDefaultLimit = (
  rawValue: string | undefined = appConfigProvider.config.get(MEMORY_SEARCH_DEFAULT_LIMIT_SETTING_KEY),
): number => {
  const value = rawValue?.trim() ?? "";
  if (!value) return MEMORY_SEARCH_DEFAULT_LIMIT;
  const limit = parseLimit(value);
  if (limit !== null) return limit;
  if (warnedValue !== value) {
    warnedValue = value;
    console.warn("MEMORY_SEARCH_DEFAULT_LIMIT_INVALID", { value, using: MEMORY_SEARCH_DEFAULT_LIMIT });
  }
  return MEMORY_SEARCH_DEFAULT_LIMIT;
};
