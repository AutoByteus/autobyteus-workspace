/**
 * The MCP server form's env and header rows, and its token, as the user edits them.
 *
 * - The server owns the secret suggestion rule; this module only applies the rule it read (`mcpSecretSuggestionRule`).
 * - A row is `locked` when its value is, or will be, an MCP secret. A secret value is never returned by the server, so
 *   a stored secret row starts empty: leaving it empty keeps what is stored, typing a value replaces it.
 * - The JSON tab shows a stored value it cannot show as a keep marker: `{"stored": "vault"}` or `{"stored": "plain"}`.
 */

export type McpSecretState = 'PLAIN' | 'CONFIGURED' | 'MISSING' | 'VAULT_UNAVAILABLE';
export type McpSecretMatch = 'ALWAYS_SECRET' | 'NAME' | 'VALUE_PREFIX';
export type McpRowKind = 'env' | 'header';

export interface McpSecretSuggestionRule {
  nameKeywords: string[];
  valuePrefixes: string[];
  alwaysSecretFields: string[];
}

/** One saved env or header value, as the server returns it (`value` only for a plain setting). */
export interface McpConfigEntry {
  name: string;
  value: string | null;
  state: McpSecretState;
}

export interface McpConfigEntryInput {
  name: string;
  secret: boolean;
  value: string | null;
}

export interface McpConfigRow {
  id: number;
  name: string;
  /** The typed value: a plain value, or a new secret value. */
  value: string;
  locked: boolean;
  /** The user set the lock by hand, so the rule no longer pre-ticks it. */
  lockTouched: boolean;
  /** What is saved for this row, if anything. `plainValue` is set only for a plain setting. */
  stored: { name: string; state: McpSecretState; plainValue: string | null } | null;
}

/** The token: `stored` is its saved state (`null` = no saved token); `remove` drops the saved one. */
export interface McpTokenDraft {
  stored: McpSecretState | null;
  value: string;
  remove: boolean;
}

export type McpKeepMarker = { stored: 'vault' | 'plain' };

let nextRowId = 1;
const newRowId = (): number => nextRowId++;

export const fieldOf = (kind: McpRowKind, name: string): string => `${kind}:${name}`;

export const isAlwaysSecretField = (rule: McpSecretSuggestionRule | null, field: string): boolean =>
  !!rule && rule.alwaysSecretFields.some(alwaysSecret =>
    alwaysSecret === 'token' ? field === 'token' : alwaysSecret.toLowerCase() === field.toLowerCase());

/** The rule's match for a value, as the server computes it; `null` when the rule does not suggest it. */
export const matchMcpSecret = (rule: McpSecretSuggestionRule | null, field: string, value: string): McpSecretMatch | null => {
  if (!rule) return null;
  if (isAlwaysSecretField(rule, field)) return 'ALWAYS_SECRET';
  const name = field.slice(field.indexOf(':') + 1).toUpperCase();
  if (rule.nameKeywords.some(keyword => name.includes(keyword))) return 'NAME';
  const trimmed = value.trim();
  if (rule.valuePrefixes.some(prefix => trimmed.startsWith(prefix))) return 'VALUE_PREFIX';
  return null;
};

export const emptyRow = (): McpConfigRow => ({ id: newRowId(), name: '', value: '', locked: false, lockTouched: false, stored: null });

export const rowsFromEntries = (entries: McpConfigEntry[] | null | undefined, kind: McpRowKind, rule: McpSecretSuggestionRule | null): McpConfigRow[] =>
  (entries ?? []).map(entry => ({
    id: newRowId(),
    name: entry.name,
    value: entry.value ?? '',
    locked: entry.state !== 'PLAIN' || isAlwaysSecretField(rule, fieldOf(kind, entry.name)),
    lockTouched: false,
    stored: { name: entry.name, state: entry.state, plainValue: entry.value },
  }));

/** A stored value the server does not return (a secret, or an always-secret field stored plain). */
export const isStoredHidden = (row: McpConfigRow): boolean =>
  !!row.stored && (row.stored.state !== 'PLAIN' || row.stored.plainValue === null);

/** Leaving the value empty keeps what is stored for this row. */
export const isKeepable = (row: McpConfigRow): boolean =>
  row.locked && isStoredHidden(row) && row.stored!.name === row.name;

/**
 * A saved plain setting the user has not changed. Only the move turns it into a vault entry (with its backup), so
 * its row offers "Move to vault" instead of a lock toggle, and a save keeps it plain. Changing its value brings the
 * lock toggle back: locking a new value stores it as a new secret.
 */
export const offersMove = (row: McpConfigRow): boolean =>
  !!row.stored && row.stored.state === 'PLAIN' && row.stored.plainValue !== null
  && row.stored.name === row.name && row.value === row.stored.plainValue;

/** A stored plain setting the rule matches (or an always-secret field stored plain): offered for the move. */
export const moveMatch = (row: McpConfigRow, kind: McpRowKind, rule: McpSecretSuggestionRule | null): McpSecretMatch | null => {
  if (!row.stored || row.stored.state !== 'PLAIN' || row.stored.name !== row.name) return null;
  if (row.stored.plainValue === null) return 'ALWAYS_SECRET';
  return row.stored.plainValue.trim() ? matchMcpSecret(rule, fieldOf(kind, row.name), row.stored.plainValue) : null;
};

/** Pre-ticks the lock of a new row while the user types, until the user sets it by hand. */
export const applySuggestedLock = (row: McpConfigRow, kind: McpRowKind, rule: McpSecretSuggestionRule | null): void => {
  const field = fieldOf(kind, row.name);
  if (isAlwaysSecretField(rule, field)) {
    row.locked = true;
    return;
  }
  if (row.stored || row.lockTouched) return;
  row.locked = !!row.name && !!matchMcpSecret(rule, field, row.value);
};

/**
 * The fields of rows the rule suggested locking that the user unlocked by hand: saved plain on purpose, so they
 * count as reviewed for the move banner (MDEC-006).
 */
export const unlockedSuggestions = (rows: McpConfigRow[], kind: McpRowKind, rule: McpSecretSuggestionRule | null): string[] =>
  rows
    .filter(row => row.name.trim() && row.lockTouched && !row.locked)
    .filter(row => {
      const match = matchMcpSecret(rule, fieldOf(kind, row.name), row.value);
      return match === 'NAME' || match === 'VALUE_PREFIX';
    })
    .map(row => fieldOf(kind, row.name));

/** The GraphQL input rows; empty names are skipped. A locked row needs a value unless it keeps a stored one. */
export const rowsToInput = (rows: McpConfigRow[], kind: McpRowKind, rule: McpSecretSuggestionRule | null): McpConfigEntryInput[] =>
  rows.filter(row => row.name.trim()).map(row => {
    const field = fieldOf(kind, row.name);
    if (offersMove(row)) return { name: row.name, secret: false, value: row.value };
    if (row.locked || isAlwaysSecretField(rule, field)) {
      if (row.value) return { name: row.name, secret: true, value: row.value };
      if (isKeepable(row)) return { name: row.name, secret: true, value: null };
      throw new Error(`Enter a value for ${field}.`);
    }
    return { name: row.name, secret: false, value: row.value };
  });

const markerFor = (state: McpSecretState): McpKeepMarker => ({ stored: state === 'PLAIN' ? 'plain' : 'vault' });

const isKeepMarker = (value: unknown): value is McpKeepMarker =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1
  && ((value as McpKeepMarker).stored === 'vault' || (value as McpKeepMarker).stored === 'plain');

/** The JSON tab's object for these rows: values as strings, kept stored values as keep markers. */
export const rowsToJson = (rows: McpConfigRow[]): Record<string, string | McpKeepMarker> => {
  const record: Record<string, string | McpKeepMarker> = {};
  for (const row of rows) {
    if (!row.name.trim()) continue;
    record[row.name] = !row.value && isKeepable(row) ? markerFor(row.stored!.state) : row.value;
  }
  return record;
};

/**
 * Rows from the JSON tab's object, against the current rows (which know what is stored):
 * - a keep marker keeps the stored value of that name (it must exist);
 * - a string under a locked or always-secret name is a new secret value; under an unlocked name, a plain value;
 * - a string under a new name the rule matches is locked, and `needsReview` asks the user to look before saving.
 */
export const rowsFromJson = (
  value: unknown,
  kind: McpRowKind,
  current: McpConfigRow[],
  rule: McpSecretSuggestionRule | null,
): { rows: McpConfigRow[]; needsReview: boolean } => {
  const label = kind === 'env' ? 'env' : 'headers';
  if (value === undefined || value === null) return { rows: [], needsReview: false };
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`'${label}' must be a JSON object.`);
  let needsReview = false;
  const rows = Object.entries(value as Record<string, unknown>).map(([name, entry]): McpConfigRow => {
    const field = fieldOf(kind, name);
    const existing = current.find(row => row.name === name) ?? null;
    if (isKeepMarker(entry)) {
      if (!existing || !isStoredHidden(existing)) throw new Error(`${field} has no stored value to keep.`);
      return { ...existing, id: newRowId(), value: '', locked: true };
    }
    if (typeof entry !== 'string') throw new Error(`'${label}.${name}' must be a string or a keep marker.`);
    const alwaysSecret = isAlwaysSecretField(rule, field);
    if (existing) {
      return { ...existing, id: newRowId(), value: entry, locked: existing.locked || alwaysSecret };
    }
    const suggested = !alwaysSecret && !!matchMcpSecret(rule, field, entry);
    needsReview ||= suggested;
    return { id: newRowId(), name, value: entry, locked: alwaysSecret || suggested, lockTouched: false, stored: null };
  });
  return { rows, needsReview };
};

export const tokenFromServer = (tokenState: McpSecretState | null | undefined): McpTokenDraft =>
  ({ stored: tokenState ?? null, value: '', remove: false });

/** `{ value }` replaces the token, `{ keep: true }` keeps the stored one, `null` means no token. */
export const tokenToInput = (token: McpTokenDraft): { value: string } | { keep: true } | null => {
  if (token.value) return { value: token.value };
  if (token.stored && !token.remove) return { keep: true };
  return null;
};

export const tokenToJson = (token: McpTokenDraft): string | McpKeepMarker | undefined => {
  if (token.value) return token.value;
  return token.stored && !token.remove ? markerFor(token.stored) : undefined;
};

/** The token from the JSON tab: absent removes the stored one, a keep marker keeps it (it must exist). */
export const tokenFromJson = (value: unknown, current: McpTokenDraft): McpTokenDraft => {
  if (value === undefined || value === null || value === '') return { stored: current.stored, value: '', remove: true };
  if (isKeepMarker(value)) {
    if (!current.stored) throw new Error('token has no stored value to keep.');
    return { stored: current.stored, value: '', remove: false };
  }
  if (typeof value !== 'string') throw new Error("'token' must be a string or a keep marker.");
  return { stored: current.stored, value, remove: false };
};

/** The fields of a saved server that need a secret: a reference with no entry, or while the vault is unavailable. */
export const fieldsNeedingSecret = (server: { env?: McpConfigEntry[] | null; headers?: McpConfigEntry[] | null; tokenState?: McpSecretState | null }): string[] => {
  const needs = (state: McpSecretState | null | undefined) => state === 'MISSING' || state === 'VAULT_UNAVAILABLE';
  return [
    ...(server.env ?? []).filter(entry => needs(entry.state)).map(entry => fieldOf('env', entry.name)),
    ...(server.headers ?? []).filter(entry => needs(entry.state)).map(entry => fieldOf('header', entry.name)),
    ...(needs(server.tokenState) ? ['token'] : []),
  ];
};
