export const COMPACTION_MODEL_SETTINGS_KEY = 'AUTOBYTEUS_COMPACTION_MODEL_SETTINGS';
export type CompactionModelSettings = { modelIdentifier: string | null; llmConfig: Record<string, unknown> | null };
export const DEFAULT_COMPACTION_MODEL_SETTINGS: CompactionModelSettings = { modelIdentifier: null, llmConfig: null };

const SECRET_KEYS = new Set(['apikey', 'authorization', 'accesstoken', 'refreshtoken', 'password', 'secret', 'credentials', 'credential', 'headers', 'extraheaders']);
const assertNoCredentials = (value: unknown): void => {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEYS.has(key.replace(/[_-]/g, '').toLowerCase())) throw new Error('Compaction configuration cannot contain credentials; use provider secret settings.');
    assertNoCredentials(child);
  }
};

export const parseCompactionModelSettings = (value: string): CompactionModelSettings => {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Compaction model settings must be an object.');
  const input = parsed as Record<string, unknown>;
  if (!(input.modelIdentifier === null || typeof input.modelIdentifier === 'string' && input.modelIdentifier.trim()) ||
      !(input.llmConfig === null || input.llmConfig && typeof input.llmConfig === 'object' && !Array.isArray(input.llmConfig))) {
    throw new Error('Compaction settings require modelIdentifier (nonempty string or null) and llmConfig (object or null).');
  }
  assertNoCredentials(input.llmConfig);
  return { modelIdentifier: typeof input.modelIdentifier === 'string' ? input.modelIdentifier.trim() : null,
    llmConfig: input.llmConfig as Record<string, unknown> | null };
};

export const normalizeCompactionModelSettingsForPersistence = (value: string): [true, string] | [false, string] => {
  try { return [true, JSON.stringify(parseCompactionModelSettings(value))]; }
  catch { return [false, `Invalid ${COMPACTION_MODEL_SETTINGS_KEY}: expected modelIdentifier and llmConfig.`]; }
};
