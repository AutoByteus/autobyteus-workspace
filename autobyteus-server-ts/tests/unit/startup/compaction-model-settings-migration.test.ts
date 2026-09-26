import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { migrateCompactionModelSettings } from '../../../src/startup/compaction-model-settings-migration.js';
import { COMPACTION_MODEL_SETTINGS_KEY as KEY, parseCompactionModelSettings } from '../../../src/config/compaction-model-settings.js';
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, {recursive: true, force: true}))); });
const harness = async (source?: string, current?: string) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'compaction-migration-')); dirs.push(dir);
  const sourcePath = path.join(dir, 'autobyteus-memory-compactor', 'agent-config.json');
  if (source !== undefined) { await fs.mkdir(path.dirname(sourcePath)); await fs.writeFile(sourcePath, source); }
  const config = { get: vi.fn(() => current), getAgentsDir: () => dir, setDurably: vi.fn(() => ({persisted: true as const})) };
  return {config, sourcePath};
};
describe('isolated compaction setting migration', () => {
  it.each([undefined, '{}', '{"defaultLaunchConfig":null}'])('writes default once with absent override %s', async source => {
    const {config} = await harness(source); await migrateCompactionModelSettings(config);
    expect(config.setDurably).toHaveBeenCalledExactlyOnceWith(KEY, '{"modelIdentifier":null,"llmConfig":null}');
  });
  it('copies only model/config and retains historical source unchanged', async () => {
    const source = JSON.stringify({defaultLaunchConfig:{llmModelIdentifier:'old-model',llmConfig:{temperature:0.3},skillNames:['old']}});
    const {config,sourcePath} = await harness(source); await migrateCompactionModelSettings(config);
    expect(config.setDurably).toHaveBeenCalledWith(KEY, '{"modelIdentifier":"old-model","llmConfig":{"temperature":0.3}}');
    expect(await fs.readFile(sourcePath,'utf8')).toBe(source);
  });
  it('valid current/env setting wins without consulting malformed old source', async () => {
    const {config} = await harness('broken','{"modelIdentifier":"current","llmConfig":null}');
    await migrateCompactionModelSettings(config); expect(config.setDurably).not.toHaveBeenCalled();
  });
  it.each(['broken','[]','{"defaultLaunchConfig":"bad"}','{"defaultLaunchConfig":{"llmModelIdentifier":3}}'])('fails startup for malformed source %s', async source => {
    const {config} = await harness(source); await expect(migrateCompactionModelSettings(config)).rejects.toThrow();
    expect(config.setDurably).not.toHaveBeenCalled();
  });
  it('fails startup on malformed current setting, never silently replaces it', async () => {
    const {config} = await harness(undefined,'{}'); await expect(migrateCompactionModelSettings(config)).rejects.toThrow();
    expect(config.setDurably).not.toHaveBeenCalled();
  });
  it('propagates durable write failure and can retry from retained source', async () => {
    const {config} = await harness(); config.setDurably.mockImplementationOnce(() => {throw new Error('disk');});
    await expect(migrateCompactionModelSettings(config)).rejects.toThrow('disk');
    await migrateCompactionModelSettings(config); expect(config.setDurably).toHaveBeenCalledTimes(2);
  });
  it.each([{api_key:'secret'},{extraParams:{Authorization:'secret'}},{nested:[{credentials:'secret'}]}])('rejects credentials in model config', llmConfig => {
    expect(() => parseCompactionModelSettings(JSON.stringify({modelIdentifier:null,llmConfig}))).toThrow('credentials');
  });
});
