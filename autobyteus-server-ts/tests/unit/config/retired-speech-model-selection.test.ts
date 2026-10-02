import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { migrateRetiredSpeechModelSelection } from '../../../src/config/migrations/retired-speech-model-selection.js';

const key = 'DEFAULT_SPEECH_GENERATION_MODEL';
const prior = process.env[key];
afterEach(() => {
  vi.restoreAllMocks();
  if (prior === undefined) delete process.env[key];
  else process.env[key] = prior;
});

it('keeps the source and in-memory values intact on a pre-rename write failure', async () => {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'speech-migration-failure-'));
  const file = path.join(dir, '.env');
  const original = `PRIVATE_SYNTHETIC_SETTING=unchanged\n${key}=gemini-2.5-flash-tts\n`;
  const data = { [key]: 'gemini-2.5-flash-tts' };
  process.env[key] = data[key];
  try {
    await fsPromises.writeFile(file, original, { mode: 0o600 });
    vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('synthetic failure'); });
    expect(() => migrateRetiredSpeechModelSelection(file, data, undefined))
      .toThrow('Unable to migrate the saved speech model selection');
    expect(await fsPromises.readFile(file, 'utf-8')).toBe(original);
    expect(data[key]).toBe('gemini-2.5-flash-tts');
    expect(process.env[key]).toBe('gemini-2.5-flash-tts');
    expect((await fsPromises.readdir(dir)).sort()).toEqual(['.env']);
  } finally { await fsPromises.rm(dir, { recursive: true, force: true }); }
});
