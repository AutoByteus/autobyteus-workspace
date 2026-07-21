import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadLiveE2eManifest } from '../../../../test-support/live-e2e/live-e2e-manifest.js';
import { LiveE2eEvidenceScanner } from '../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('live E2E manifest and evidence boundary', () => {
  it('accepts a tracked value-free scenario manifest', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-manifest-'));
    tempDirectories.push(directory);
    const file = path.join(directory, 'live-e2e.json');
    fs.writeFileSync(file, JSON.stringify({
      version: 1,
      backend: {
        kind: 'local-store',
        databaseFile: 'real-e2e-secret-store.db',
        keyFile: 'real-e2e-secret-store.key',
        accessMode: 'READ_ONLY',
      },
      scenarios: {
        'autobyteus.remote-audio': {
          mode: 'REAL_DIRECT_SECRET',
          requiredSecrets: ['provider.autobyteus.api-key'],
          hosts: ['https://api.autobyteus.com'],
          expectedCapabilities: ['audio-discovery', 'audio-generation'],
        },
      },
    }));

    expect(loadLiveE2eManifest(file).scenarios['autobyteus.remote-audio']).toMatchObject({
      requiredSecrets: ['provider.autobyteus.api-key'],
      expectedCapabilities: ['audio-discovery', 'audio-generation'],
    });
  });

  it('rejects Store path selection outside canonical filenames', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-manifest-invalid-'));
    tempDirectories.push(directory);
    const file = path.join(directory, 'live-e2e.json');
    fs.writeFileSync(file, JSON.stringify({
      version: 1,
      backend: {
        kind: 'local-store',
        databaseFile: '../default.db',
        keyFile: 'real-e2e-secret-store.key',
        accessMode: 'READ_ONLY',
      },
      scenarios: {
        'openai.llm': { mode: 'REAL_DIRECT_SECRET', requiredSecrets: ['provider.openai.api-key'] },
      },
    }));

    expect(() => loadLiveE2eManifest(file)).toThrow('LIVE_E2E_CONFIG_INVALID:backend');
  });

  it('detects exact and encoded synthetic leaks while accepting value-free evidence', () => {
    const canary = 'synthetic-live-e2e-secret';
    const scanner = new LiveE2eEvidenceScanner([canary]);
    expect(() => scanner.assertClean({ output: canary })).toThrow('LIVE_E2E_EVIDENCE_LEAK_DETECTED');
    expect(() => scanner.assertClean({ output: Buffer.from(canary).toString('base64') }))
      .toThrow('LIVE_E2E_EVIDENCE_LEAK_DETECTED');
    expect(() => scanner.assertStructurallyValueFree({ scenarioId: 'openai.llm', health: 'READY' }))
      .not.toThrow();
  });
});
