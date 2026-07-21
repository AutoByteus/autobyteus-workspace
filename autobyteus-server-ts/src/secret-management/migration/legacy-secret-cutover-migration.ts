import fs from 'node:fs';
import path from 'node:path';

export const LEGACY_SECRET_ALIASES = Object.freeze([
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'MISTRAL_API_KEY',
  'DEEPSEEK_API_KEY',
  'GROK_API_KEY',
  'KIMI_API_KEY',
  'DASHSCOPE_API_KEY',
  'GLM_API_KEY',
  'MINIMAX_API_KEY',
  'LMSTUDIO_API_KEY',
  'AUTOBYTEUS_API_KEY',
  'GEMINI_API_KEY',
  'VERTEX_AI_API_KEY',
  'SERPER_API_KEY',
  'SERPAPI_API_KEY',
  'VERTEX_AI_SEARCH_API_KEY',
  'CLAUDE_CODE_API_KEY',
  'CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR',
] as const);

const aliasSet = new Set<string>(LEGACY_SECRET_ALIASES);

type MigrationLedger = {
  version: 1;
  migrationId: 'secure-centralized-secret-provisioning-v1';
  reprovisionDefinitionIds: string[];
  migratedCustomProviderIds: string[];
};

const aliasDefinition = new Map<string, string>([
  ['OPENAI_API_KEY', 'provider.openai.api-key'],
  ['ANTHROPIC_API_KEY', 'provider.anthropic.api-key'],
  ['MISTRAL_API_KEY', 'provider.mistral.api-key'],
  ['DEEPSEEK_API_KEY', 'provider.deepseek.api-key'],
  ['GROK_API_KEY', 'provider.grok.api-key'],
  ['KIMI_API_KEY', 'provider.kimi.api-key'],
  ['DASHSCOPE_API_KEY', 'provider.qwen.api-key'],
  ['GLM_API_KEY', 'provider.glm.api-key'],
  ['MINIMAX_API_KEY', 'provider.minimax.api-key'],
  ['LMSTUDIO_API_KEY', 'provider.lmstudio.api-key'],
  ['AUTOBYTEUS_API_KEY', 'provider.autobyteus.api-key'],
  ['GEMINI_API_KEY', 'provider.gemini.ai-studio-api-key'],
  ['VERTEX_AI_API_KEY', 'provider.google.vertex-express-api-key'],
  ['SERPER_API_KEY', 'search.serper.api-key'],
  ['SERPAPI_API_KEY', 'search.serpapi.api-key'],
  ['VERTEX_AI_SEARCH_API_KEY', 'search.vertex-ai.api-key'],
]);

const atomicWrite = (filePath: string, content: string): void => {
  const temp = `${filePath}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(temp, content, { mode: 0o600 });
  fs.renameSync(temp, filePath);
  if (process.platform !== 'win32') fs.chmodSync(filePath, 0o600);
};

const scrubEnvironmentFile = (filePath: string, ledger: MigrationLedger): void => {
  if (!fs.existsSync(filePath)) return;
  const input = fs.readFileSync(filePath, 'utf8');
  const lines = input.split(/\r?\n/);
  const presentKeys = new Set<string>();
  for (const line of lines) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (match?.[1]) presentKeys.add(match[1]);
  }

  const hasExplicitGeminiMode = presentKeys.has('GEMINI_SETUP_MODE');
  const output = lines.filter((line) => {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    const key = match?.[1];
    return !key || !aliasSet.has(key);
  });
  if (!hasExplicitGeminiMode) {
    if (presentKeys.has('GEMINI_API_KEY')) output.push('GEMINI_SETUP_MODE=AI_STUDIO');
    else if (presentKeys.has('VERTEX_AI_API_KEY')) output.push('GEMINI_SETUP_MODE=VERTEX_EXPRESS');
  }
  for (const key of presentKeys) {
    const definitionId = aliasDefinition.get(key);
    if (definitionId) ledger.reprovisionDefinitionIds.push(definitionId);
  }
  atomicWrite(filePath, output.join('\n'));
};

const migrateCustomProviderFile = (filePath: string, ledger: MigrationLedger): void => {
  if (!fs.existsSync(filePath)) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (cause) {
    throw new Error('SECRET_CUSTODY_MIGRATION_INVALID_SOURCE', { cause });
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('SECRET_CUSTODY_MIGRATION_INVALID_SOURCE');
  }
  const source = parsed as { version?: unknown; providers?: unknown };
  if (!Array.isArray(source.providers) || (source.version !== 1 && source.version !== 2)) {
    throw new Error('SECRET_CUSTODY_MIGRATION_INVALID_SOURCE');
  }
  if (source.version === 2) {
    if (source.providers.some((item) => item && typeof item === 'object' && Object.hasOwn(item, 'apiKey'))) {
      throw new Error('SECRET_CUSTODY_MIGRATION_INVALID_SOURCE');
    }
    return;
  }
  const migratedProviders = source.providers.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('SECRET_CUSTODY_MIGRATION_INVALID_SOURCE');
    }
    const record = item as Record<string, unknown>;
    if (
      typeof record.id !== 'string'
      || typeof record.name !== 'string'
      || record.providerType !== 'OPENAI_COMPATIBLE'
      || typeof record.baseUrl !== 'string'
    ) throw new Error('SECRET_CUSTODY_MIGRATION_INVALID_SOURCE');
    if (Object.hasOwn(record, 'apiKey')) {
      ledger.migratedCustomProviderIds.push(record.id);
      ledger.reprovisionDefinitionIds.push(
        `provider.openai-compatible.${record.id.toLowerCase()}.api-key`,
      );
    }
    return {
      id: record.id,
      name: record.name,
      providerType: record.providerType,
      baseUrl: record.baseUrl,
    };
  });
  atomicWrite(filePath, `${JSON.stringify({ version: 2, providers: migratedProviders }, null, 2)}\n`);
};

export const runLegacySecretCutoverMigration = (appDataDir: string): MigrationLedger => {
  const ledgerPath = path.join(appDataDir, 'migrations', 'secure-centralized-secret-provisioning-v1.json');
  let previous: Partial<MigrationLedger> = {};
  try {
    previous = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as Partial<MigrationLedger>;
  } catch {
    previous = {};
  }
  const ledger: MigrationLedger = {
    version: 1,
    migrationId: 'secure-centralized-secret-provisioning-v1',
    reprovisionDefinitionIds: Array.isArray(previous.reprovisionDefinitionIds)
      ? previous.reprovisionDefinitionIds.filter((value): value is string => typeof value === 'string')
      : [],
    migratedCustomProviderIds: Array.isArray(previous.migratedCustomProviderIds)
      ? previous.migratedCustomProviderIds.filter((value): value is string => typeof value === 'string')
      : [],
  };
  scrubEnvironmentFile(path.join(appDataDir, '.env'), ledger);
  migrateCustomProviderFile(path.join(appDataDir, 'llm', 'custom-llm-providers.json'), ledger);
  for (const alias of LEGACY_SECRET_ALIASES) delete process.env[alias];
  ledger.reprovisionDefinitionIds = [...new Set(ledger.reprovisionDefinitionIds)].sort();
  ledger.migratedCustomProviderIds = [...new Set(ledger.migratedCustomProviderIds)].sort();
  atomicWrite(
    ledgerPath,
    `${JSON.stringify(ledger, null, 2)}\n`,
  );
  return ledger;
};
