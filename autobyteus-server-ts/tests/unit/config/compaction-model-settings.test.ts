import { describe, expect, it } from 'vitest';
import { parseCompactionModelSettings, normalizeCompactionModelSettingsForPersistence } from '../../../src/config/compaction-model-settings.js';
describe('current compaction settings projection', () => {
  it('projects recognized tuple fields and saves only them without dropping tuning maps', () => {
    const tuple = { modelIdentifier: 'override', llmConfig: { temperature: 0.2, extraParams: { vendor: { opaque: true } } } };
    const source = JSON.stringify({ ...tuple, obsolete: { ignored: true }, schema_version: 1 });
    expect(parseCompactionModelSettings(source)).toEqual(tuple);
    expect(normalizeCompactionModelSettingsForPersistence(source)).toEqual([true, JSON.stringify(tuple)]);
  });
  it.each([{}, { modelIdentifier: 3, llmConfig: null }, { modelIdentifier: '', llmConfig: null },
    { modelIdentifier: null, llmConfig: [] }, { modelIdentifier: null, llmConfig: { extraParams: { api_key: 'forbidden' } } },
    { modelIdentifier: null, llmConfig: { headers: { Authorization: 'forbidden' } } }])('rejects invalid current known fields %j', (value) => {
    expect(() => parseCompactionModelSettings(JSON.stringify(value))).toThrow();
    expect(normalizeCompactionModelSettingsForPersistence(JSON.stringify(value))[0]).toBe(false);
  });
});
