import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  supportedModelDefinitions,
} from 'autobyteus-ts/llm/supported-model-definitions.js';
import { AudioClientFactory } from 'autobyteus-ts/multimedia/audio/audio-client-factory.js';
import { ImageClientFactory } from 'autobyteus-ts/multimedia/image/image-client-factory.js';
import {
  classifyAutoByteusDiscoveryUnavailable,
  runLiveE2eAgentFlow,
  withoutAmbientTestDatabaseUrls,
} from '../../../../test-support/live-e2e/live-e2e-harness.js';
import {
  liveE2eScenarios,
  selectedLiveE2eScenarioIds,
} from '../../../../test-support/live-e2e/live-e2e-scenarios.mjs';
import {
  createSanitizedTestEnvironment,
  materializeTestRuntime,
  parseTrackedTestEnvironmentSource,
  readTrackedTestEnvironment,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  testDatabaseRoot,
  testRuntimeRoot,
  trackedTestEnvironmentPath,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
import {
  LiveE2eEvidenceScanner,
  runCapturedLiveE2eProcess,
} from '../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';
import { AgentRunEventType } from '../../../src/agent-execution/domain/agent-run-event.js';

const cleanup: Array<() => void | Promise<void>> = [];

afterEach(async () => {
  while (cleanup.length > 0) await cleanup.pop()?.();
  delete process.env.AUTOBYTEUS_LIVE_E2E_SCENARIOS;
  delete process.env.OPENAI_API_KEY;
});

describe('one-database live E2E runtime and evidence boundary', () => {
  it('keeps the tracked template exact, non-secret, and inside the ignored test DB root', () => {
    const first = readTrackedTestEnvironment();
    const second = readTrackedTestEnvironment();
    expect(first.bytes).toEqual(second.bytes);
    expect(first.values).toEqual({
      APP_ENV: 'test',
      DB_TYPE: 'sqlite',
      DATABASE_URL: 'file:./db/test.db',
      AUTOBYTEUS_SERVER_HOST: 'http://127.0.0.1:8000',
    });
    expect(first.database.databasePath.startsWith(`${testDatabaseRoot}${path.sep}`)).toBe(true);
    expect(first.database.rootKeyPath).toBe(`${first.database.databasePath}.secret.key`);
    expect(first.bytes.toString('utf8')).not.toMatch(
      /(?:API_KEY|TOKEN|PASSWORD|SECRET_VALUE|GEMINI_SETUP_MODE|VERTEX_AI_PROJECT)/,
    );
    expect(fs.lstatSync(trackedTestEnvironmentPath).isSymbolicLink()).toBe(false);
  });

  it('accepts only the fixed launch schema and rejects unknown, duplicate, dynamic, or unsafe values', () => {
    const valid = [
      'APP_ENV=test',
      'DB_TYPE=sqlite',
      'DATABASE_URL=file:./db/test.db',
      'AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000',
      '',
    ].join('\n');
    expect(parseTrackedTestEnvironmentSource(valid).DATABASE_URL).toBe('file:./db/test.db');
    expect(() => parseTrackedTestEnvironmentSource(`${valid}OPENAI_API_KEY=x\n`))
      .toThrow('TEST_ENV_TEMPLATE_KEY_NOT_ALLOWED');
    expect(() => parseTrackedTestEnvironmentSource(`${valid}APP_ENV=test\n`))
      .toThrow('TEST_ENV_TEMPLATE_DUPLICATE_KEY');
    expect(() => parseTrackedTestEnvironmentSource(valid.replace('file:./db/test.db', 'file:$DB')))
      .toThrow('TEST_ENV_TEMPLATE_VALUE_INVALID');
    expect(() => parseTrackedTestEnvironmentSource(valid.replace('APP_ENV=test', 'APP_ENV=prod')))
      .toThrow('TEST_ENV_TEMPLATE_SCHEMA_INVALID');
    expect(() => resolveTestDatabaseLocation('file:../production.db'))
      .toThrow('TEST_DATABASE_PATH_UNSAFE');
  });

  it('materializes fixed keys into an ordinary runtime .env while preserving mutable Settings', async () => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const runtimeRoot = path.join(testRuntimeRoot, `materialize-${suffix}`);
    const database = resolveTestDatabaseLocation(`file:./db/materialize-${suffix}.db`);
    fs.mkdirSync(runtimeRoot, { recursive: true });
    fs.writeFileSync(path.join(runtimeRoot, '.env'), [
      'GEMINI_SETUP_MODE=AI_STUDIO',
      'VERTEX_AI_PROJECT=synthetic-project',
      'DATABASE_URL=file:./db/stale.db',
      'APP_ENV=stale',
      '',
    ].join('\n'));
    cleanup.push(() => removeOwnedTestRuntime(runtimeRoot, database));

    const before = readTrackedTestEnvironment().bytes;
    const result = materializeTestRuntime({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
      serverUrlOverride: 'http://127.0.0.1:32123',
    });
    const runtimeSource = fs.readFileSync(result.runtimeEnvironmentPath, 'utf8');
    expect(runtimeSource).toContain('GEMINI_SETUP_MODE=AI_STUDIO');
    expect(runtimeSource).toContain('VERTEX_AI_PROJECT=synthetic-project');
    expect(runtimeSource.match(/^DATABASE_URL=/gm)).toHaveLength(1);
    expect(runtimeSource.match(/^APP_ENV=/gm)).toHaveLength(1);
    expect(runtimeSource).toContain(`DATABASE_URL=${database.databaseUrl}`);
    expect(runtimeSource).toContain('AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:32123');
    expect(readTrackedTestEnvironment().bytes).toEqual(before);
  });

  it('constructs a clean child environment without database or provider aliases', () => {
    process.env.OPENAI_API_KEY = 'synthetic-ambient-canary';
    const environment = createSanitizedTestEnvironment({ RUN_REAL_E2E: '1' });
    expect(environment.RUN_REAL_E2E).toBe('1');
    expect(environment.DATABASE_URL).toBeUndefined();
    expect(environment.OPENAI_API_KEY).toBeUndefined();
    expect(JSON.stringify(environment)).not.toContain('synthetic-ambient-canary');
  });

  it('masks Vitest database aliases only while selecting the persistent live-E2E vault', async () => {
    const inheritedDatabaseUrl = process.env.DATABASE_URL;
    const inheritedTestDatabaseUrl = process.env.DATABASE_URL_TEST;
    process.env.DATABASE_URL = 'file:/tmp/synthetic-vitest.db';
    process.env.DATABASE_URL_TEST = 'file:/tmp/synthetic-vitest.db';

    try {
      await expect(withoutAmbientTestDatabaseUrls(async () => {
        expect(process.env.DATABASE_URL).toBeUndefined();
        expect(process.env.DATABASE_URL_TEST).toBeUndefined();
        return 'selected';
      })).resolves.toBe('selected');
      expect(process.env.DATABASE_URL).toBe('file:/tmp/synthetic-vitest.db');
      expect(process.env.DATABASE_URL_TEST).toBe('file:/tmp/synthetic-vitest.db');
    } finally {
      if (inheritedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = inheritedDatabaseUrl;
      if (inheritedTestDatabaseUrl === undefined) delete process.env.DATABASE_URL_TEST;
      else process.env.DATABASE_URL_TEST = inheritedTestDatabaseUrl;
    }
  });

  it('keeps all native model fixtures in code and mapped to their static product factories', () => {
    for (const [scenarioId, scenario] of Object.entries(liveE2eScenarios)) {
      if (!scenario.model) continue;
      if (scenario.operation === 'llm' || scenario.operation === 'agent-flow') {
        const matches = supportedModelDefinitions.filter((definition) =>
          (definition.modelIdentifierOverride?.trim() || definition.name) === scenario.model);
        expect(matches, scenarioId).toHaveLength(1);
        expect(matches[0]?.provider, scenarioId).toBe(scenario.providerId);
        expect(matches[0]?.llmClass, scenarioId).toBeTypeOf('function');
      } else if (scenario.operation === 'audio') {
        const matches = AudioClientFactory.listModels()
          .filter((model) => model.modelIdentifier === scenario.model);
        expect(matches, scenarioId).toHaveLength(1);
        expect(matches[0]?.provider, scenarioId).toBe(scenario.providerId);
        expect(matches[0]?.clientClass, scenarioId).toBeTypeOf('function');
      } else if (scenario.operation === 'image') {
        const matches = ImageClientFactory.listModels()
          .filter((model) => model.modelIdentifier === scenario.model);
        expect(matches, scenarioId).toHaveLength(1);
        expect(matches[0]?.provider, scenarioId).toBe(scenario.providerId);
        expect(matches[0]?.clientClass, scenarioId).toBeTypeOf('function');
      }
    }
    expect(Object.values(liveE2eScenarios).every((scenario) =>
      scenario.requiredSecretId.startsWith('provider.')
      || scenario.requiredSecretId.startsWith('search.'))).toBe(true);
  });

  it('selects only known code-owned scenarios', () => {
    process.env.AUTOBYTEUS_LIVE_E2E_SCENARIOS = 'openai.llm,gemini.vertex-express.llm';
    expect(selectedLiveE2eScenarioIds()).toEqual([
      'openai.llm',
      'gemini.vertex-express.llm',
    ]);
    process.env.AUTOBYTEUS_LIVE_E2E_SCENARIOS = 'unknown.scenario';
    expect(() => selectedLiveE2eScenarioIds()).toThrow(
      'LIVE_E2E_SCENARIO_UNKNOWN:unknown.scenario',
    );
  });

  it('classifies only the exact value-free AutoByteus discovery-unavailable boundary', () => {
    expect(classifyAutoByteusDiscoveryUnavailable(
      new Error('AUTOBYTEUS_LLM_DISCOVERY_FAILED'),
      'llm',
    )).toBe('AUTOBYTEUS_LLM_DISCOVERY_FAILED');
    expect(classifyAutoByteusDiscoveryUnavailable(
      new Error('AUTOBYTEUS_AUDIO_DISCOVERY_FAILED'),
      'image',
    )).toBeNull();
    expect(classifyAutoByteusDiscoveryUnavailable(
      new Error('unexpected-provider-failure'),
      'llm',
    )).toBeNull();
  });

  it('executes every declared agent operation and returns only value-free summaries', async () => {
    for (const scenarioId of ['openai.agent-flow', 'deepseek.agent-flow']) {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-agent-flow-'));
      cleanup.push(() => fs.rmSync(directory, { recursive: true, force: true }));
      const listeners = new Set<(value: unknown) => void>();
      let configuredModel = '';
      let terminated = false;
      const scenario = liveE2eScenarios[scenarioId]!;
      const result = await runLiveE2eAgentFlow({
        scenarioId,
        scenario,
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

      expect(configuredModel).toBe(scenario.model);
      expect(terminated).toBe(true);
      expect(result).toEqual({
        scenarioId,
        capability: 'agent-turn',
        status: 'PASSED',
        observedEventCount: 1,
      });
    }
  });

  it('rejects an invalid agent operation before backend provisioning', async () => {
    let createBackendCalls = 0;
    await expect(runLiveE2eAgentFlow({
      scenarioId: 'openai.llm',
      scenario: liveE2eScenarios['openai.llm']!,
      memoryDirectory: path.join(os.tmpdir(), 'unused-live-e2e-memory'),
      backendFactory: {
        createBackend: async () => {
          createBackendCalls += 1;
          throw new Error('must not be reached');
        },
      },
    })).rejects.toThrow('LIVE_E2E_AGENT_FLOW_SCENARIO_INVALID');
    expect(createBackendCalls).toBe(0);
  });

  it('detects exact, encoded, and structural synthetic leaks', () => {
    const canary = 'synthetic-live-e2e-secret';
    const scanner = new LiveE2eEvidenceScanner([canary]);
    expect(() => scanner.assertClean({ output: canary })).toThrow('LIVE_E2E_EVIDENCE_LEAK_DETECTED');
    expect(() => scanner.assertClean({ output: Buffer.from(canary).toString('base64') }))
      .toThrow('LIVE_E2E_EVIDENCE_LEAK_DETECTED');
    expect(() => scanner.assertStructurallyValueFree({ apiKey: 'synthetic-value' }))
      .toThrow('LIVE_E2E_EVIDENCE_SECRET_FIELD_DETECTED');
    expect(() => scanner.assertStructurallyValueFree('Authorization: synthetic-value'))
      .toThrow('LIVE_E2E_EVIDENCE_SECRET_FIELD_DETECTED');
    expect(() => scanner.assertStructurallyValueFree({
      configured: ['provider.openai.api-key'],
      missing: ['provider.google.vertex-express.api-key'],
    })).not.toThrow();
  });

  it('captures and releases clean full-run output through the canonical process boundary', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-clean-evidence-'));
    cleanup.push(() => fs.rmSync(directory, { recursive: true, force: true }));
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

  it('fails the canonical capture/artifact path without echoing seeded content', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-leaking-evidence-'));
    cleanup.push(() => fs.rmSync(directory, { recursive: true, force: true }));
    const canary = 'seeded-runner-canary';
    fs.writeFileSync(path.join(directory, 'provider-result.json'), JSON.stringify({ output: canary }));
    await expect(runCapturedLiveE2eProcess({
      command: process.execPath,
      args: ['-e', "process.stdout.write('withheld-on-artifact-failure\\n')"],
      evidencePaths: [directory],
      syntheticCanaries: [canary],
    })).rejects.toThrow('LIVE_E2E_EVIDENCE_LEAK_DETECTED');
  });
});
