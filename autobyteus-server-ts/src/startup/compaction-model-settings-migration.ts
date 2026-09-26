import fs from 'node:fs/promises';
import path from 'node:path';
import { COMPACTION_MODEL_SETTINGS_KEY, DEFAULT_COMPACTION_MODEL_SETTINGS, parseCompactionModelSettings } from '../config/compaction-model-settings.js';

type MigrationConfig = {
  get(key: string): string | undefined;
  getAgentsDir(): string;
  setDurably(key: string, value: string): { persisted: true };
};

// Historical knowledge stays at startup; the current runtime never reads this definition.
export const migrateCompactionModelSettings = async (config: MigrationConfig): Promise<void> => {
  const current = config.get(COMPACTION_MODEL_SETTINGS_KEY);
  if (current !== undefined) { parseCompactionModelSettings(current); return; }
  let settings = DEFAULT_COMPACTION_MODEL_SETTINGS;
  const source = path.join(config.getAgentsDir(), 'autobyteus-memory-compactor', 'agent-config.json');
  let text: string | null = null;
  try { text = await fs.readFile(source, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (text !== null) {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid historical compactor configuration.');
    const launch = (parsed as Record<string, unknown>).defaultLaunchConfig;
    if (launch !== null && launch !== undefined) {
      if (typeof launch !== 'object' || Array.isArray(launch)) throw new Error('Invalid historical compactor launch configuration.');
      const record = launch as Record<string, unknown>;
      settings = parseCompactionModelSettings(JSON.stringify({
        modelIdentifier: record.llmModelIdentifier ?? null, llmConfig: record.llmConfig ?? null,
      }));
    }
  }
  config.setDurably(COMPACTION_MODEL_SETTINGS_KEY, JSON.stringify(settings));
};
