import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  runLiveE2eOpenAiAgentFlow,
} from '../../../../test-support/live-e2e/live-e2e-harness.js';
import { loadLiveE2eManifest } from '../../../../test-support/live-e2e/live-e2e-manifest.js';
import {
  LiveE2eEvidenceScanner,
  runCapturedLiveE2eProcess,
} from '../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';
import { AgentRunEventType } from '../../../src/agent-execution/domain/agent-run-event.js';

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

  it('rejects an ID/mode mismatch before any Store-backed secret status can be resolved', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-manifest-mode-'));
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
        'openai.agent-flow': {
          mode: 'REAL_DIRECT_SECRET',
          requiredSecrets: ['provider.openai.api-key'],
        },
      },
    }));

    expect(() => loadLiveE2eManifest(file)).toThrow(
      'LIVE_E2E_SCENARIO_MODE_MISMATCH:openai.agent-flow:REAL_GATEWAY:REAL_DIRECT_SECRET',
    );
  });

  it('requires the declared gateway model and agent-turn capability', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-manifest-capability-'));
    tempDirectories.push(directory);
    const missingModelFile = path.join(directory, 'missing-model.json');
    const missingCapabilityFile = path.join(directory, 'missing-capability.json');
    const root = {
      version: 1,
      backend: {
        kind: 'local-store',
        databaseFile: 'real-e2e-secret-store.db',
        keyFile: 'real-e2e-secret-store.key',
        accessMode: 'READ_ONLY',
      },
    };
    fs.writeFileSync(missingModelFile, JSON.stringify({
      ...root,
      scenarios: {
        'openai.agent-flow': {
          mode: 'REAL_GATEWAY',
          requiredSecrets: ['provider.openai.api-key'],
          expectedCapabilities: ['agent-turn'],
        },
      },
    }));
    fs.writeFileSync(missingCapabilityFile, JSON.stringify({
      ...root,
      scenarios: {
        'openai.agent-flow': {
          mode: 'REAL_GATEWAY',
          requiredSecrets: ['provider.openai.api-key'],
          model: 'gpt-4o-mini',
        },
      },
    }));

    expect(() => loadLiveE2eManifest(missingModelFile)).toThrow(
      'LIVE_E2E_GATEWAY_CAPABILITY_UNAVAILABLE:openai.agent-flow:model',
    );
    expect(() => loadLiveE2eManifest(missingCapabilityFile)).toThrow(
      'LIVE_E2E_GATEWAY_CAPABILITY_UNAVAILABLE:openai.agent-flow:agent-turn',
    );
  });

  it('executes the declared gateway agent turn and returns only a value-free summary', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-agent-flow-'));
    tempDirectories.push(directory);
    const listeners = new Set<(value: unknown) => void>();
    let configuredModel = '';
    let terminated = false;
    const result = await runLiveE2eOpenAiAgentFlow({
      scenario: {
        mode: 'REAL_GATEWAY',
        requiredSecrets: ['provider.openai.api-key'],
        model: 'gpt-4o-mini',
        expectedCapabilities: ['agent-turn'],
      },
      memoryDirectory: path.join(directory, 'memory'),
      backendFactory: {
        createBackend: async (config, runId) => {
          configuredModel = config.llmModelIdentifier;
          return {
            subscribeToEvents: (listener: (value: unknown) => void) => {
              listeners.add(listener);
              return () => listeners.delete(listener);
            },
            postUserMessage: async () => {
              queueMicrotask(() => {
                for (const listener of listeners) {
                  listener({
                    eventType: AgentRunEventType.ASSISTANT_COMPLETE,
                    runId,
                    payload: { content: 'pong' },
                    statusHint: 'IDLE',
                  });
                }
              });
              return { accepted: true };
            },
            terminate: async () => {
              terminated = true;
              return { accepted: true };
            },
          };
        },
      },
      evidenceObserver: (value) => new LiveE2eEvidenceScanner([]).assertEvidenceClean(value),
      timeoutMs: 1_000,
    });

    expect(configuredModel).toBe('gpt-4o-mini');
    expect(terminated).toBe(true);
    expect(result).toEqual({
      scenarioId: 'openai.agent-flow',
      mode: 'REAL_GATEWAY',
      capability: 'agent-turn',
      status: 'PASSED',
      observedEventCount: 1,
    });
    new LiveE2eEvidenceScanner([]).assertEvidenceClean(result);
  });

  it('rejects a gateway execution mode mismatch before backend provisioning', async () => {
    let createBackendCalls = 0;
    await expect(runLiveE2eOpenAiAgentFlow({
      scenario: {
        mode: 'REAL_DIRECT_SECRET',
        requiredSecrets: ['provider.openai.api-key'],
        model: 'gpt-4o-mini',
        expectedCapabilities: ['agent-turn'],
      },
      memoryDirectory: path.join(os.tmpdir(), 'unused-live-e2e-memory'),
      backendFactory: {
        createBackend: async () => {
          createBackendCalls += 1;
          throw new Error('must not be reached');
        },
      },
    })).rejects.toThrow(
      'LIVE_E2E_SCENARIO_MODE_MISMATCH:openai.agent-flow:REAL_GATEWAY:REAL_DIRECT_SECRET',
    );
    expect(createBackendCalls).toBe(0);
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

  it('captures and releases clean full-run output through the canonical process boundary', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-clean-evidence-'));
    tempDirectories.push(directory);
    fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify({ status: 'PASSED' }));
    const result = await runCapturedLiveE2eProcess({
      command: process.execPath,
      args: ['-e', "process.stdout.write('clean-control\\n'); process.stderr.write('clean-stderr\\n')"],
      evidencePaths: [directory],
      syntheticCanaries: ['seeded-runner-canary'],
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('clean-control\n');
    expect(result.stderr).toBe('clean-stderr\n');
  });

  it('fails the same canonical capture path without echoing a seeded leak', async () => {
    const canary = 'seeded-runner-canary';
    let capturedError: unknown;
    try {
      await runCapturedLiveE2eProcess({
        command: process.execPath,
        args: ['-e', `process.stdout.write(${JSON.stringify(canary)})`],
        syntheticCanaries: [canary],
      });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(Error);
    expect((capturedError as Error).message).toBe('LIVE_E2E_EVIDENCE_LEAK_DETECTED');
    expect((capturedError as Error).message).not.toContain(canary);
  });

  it('fails the canonical artifact scan without exposing seeded artifact content', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-leaking-evidence-'));
    tempDirectories.push(directory);
    const canary = 'seeded-artifact-canary';
    fs.writeFileSync(path.join(directory, 'provider-result.json'), JSON.stringify({ output: canary }));
    let capturedError: unknown;
    try {
      await runCapturedLiveE2eProcess({
        command: process.execPath,
        args: ['-e', "process.stdout.write('withheld-on-artifact-failure\\n')"],
        evidencePaths: [directory],
        syntheticCanaries: [canary],
      });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(Error);
    expect((capturedError as Error).message).toBe('LIVE_E2E_EVIDENCE_LEAK_DETECTED');
    expect((capturedError as Error).message).not.toContain(canary);
  });
});
