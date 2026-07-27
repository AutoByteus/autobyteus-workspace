import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LLMUserMessage } from 'autobyteus-ts/llm/user-message.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import {
  classifyAutoByteusDiscoveryUnavailable,
  LiveE2eHarness,
  type LiveE2ePreflight,
} from '../../../../test-support/live-e2e/live-e2e-harness.js';
import {
  selectedLiveE2eScenarioIds,
} from '../../../../test-support/live-e2e/live-e2e-scenarios.mjs';
import { LiveE2eEvidenceScanner } from '../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';

const enabled = process.env.RUN_REAL_E2E === '1';
const preflightOnly = process.env.AUTOBYTEUS_LIVE_E2E_PREFLIGHT_ONLY === '1';
const run = enabled ? describe : describe.skip;
const selectedScenarioIds = enabled ? selectedLiveE2eScenarioIds() : [];
const scanner = new LiveE2eEvidenceScanner(['synthetic-live-e2e-scan-canary']);

const assertEvidenceClean = (value: unknown): void => {
  scanner.assertEvidenceClean(value);
};

const safeExternalOperation = async <T>(scenarioId: string, operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('LIVE_E2E_EVIDENCE_')) {
      throw error;
    }
    throw new Error(`LIVE_E2E_PROVIDER_OPERATION_FAILED:${scenarioId}`);
  }
};

const reportPreflight = (preflight: LiveE2ePreflight): void => {
  const report = {
    scenarioId: preflight.scenarioId,
    health: preflight.health,
    configured: preflight.configured,
    missing: preflight.missing,
    instructionCode: preflight.instructionCode,
  };
  assertEvidenceClean(report);
  process.stdout.write(`${JSON.stringify(report)}\n`);
};

run('value-safe one-database-vault managed-provider capabilities', () => {
  let harness: LiveE2eHarness;

  beforeAll(async () => {
    harness = await LiveE2eHarness.open();
  });

  afterAll(async () => {
    await harness?.close();
  });

  for (const scenarioId of selectedScenarioIds) {
    it(`preflights ${scenarioId} without value output`, async () => {
      const preflight = await harness.preflight(scenarioId);
      reportPreflight(preflight);
      expect(['READY', 'LOCKED', 'UNAVAILABLE', 'CORRUPT', 'INCOMPATIBLE']).toContain(preflight.health);
      if (preflight.health !== 'READY') {
        expect(preflight.configured).toEqual([]);
        expect(preflight.missing).toEqual([]);
        expect(preflight.instructionCode).toMatch(/^SECRET_BACKEND_/);
      }
    });

    if (preflightOnly) continue;

    it(`executes ${scenarioId} through its reviewed product boundary`, { timeout: 180_000 }, async ({ skip }) => {
      const preflight = await harness.preflight(scenarioId);
      if (preflight.health !== 'READY' || preflight.missing.length > 0) {
        const result = {
          scenarioId,
          status: 'SKIPPED_NOT_CONFIGURED',
          health: preflight.health,
          missing: preflight.missing,
          instructionCode: preflight.instructionCode,
        };
        assertEvidenceClean(result);
        process.stdout.write(`${JSON.stringify(result)}\n`);
        skip();
        return;
      }
      const execution = await harness.requireScenario(scenarioId);
      const scenario = execution.scenario;
      await execution.activateGeminiMode();

      if (scenario.operation === 'agent-flow') {
        const result = await safeExternalOperation(
          scenarioId,
          () => execution.executeAgentFlow(assertEvidenceClean),
        );
        assertEvidenceClean(result);
        expect(result).toMatchObject({
          scenarioId,
          capability: 'agent-turn',
          status: 'PASSED',
        });
        expect(result.observedEventCount).toBeGreaterThan(0);
        return;
      }

      if (scenario.operation === 'llm') {
        const llm = await safeExternalOperation(scenarioId, () => execution.createLlm(scenario.model!));
        try {
          const response = await safeExternalOperation(scenarioId, () => llm.sendUserMessage(
            new LLMUserMessage({ content: 'Reply with the single word pong.' }),
            { logicalConversationId: `secure-secret-real-${scenarioId.replace('.', '-')}` },
          ));
          assertEvidenceClean(response);
          expect(response.content.trim().length).toBeGreaterThan(0);
        } finally {
          await llm.cleanup();
        }
        return;
      }

      if (scenario.operation === 'search') {
        const result = await safeExternalOperation(scenarioId, () => execution.search('AutoByteus', 2));
        assertEvidenceClean(result);
        expect(result.length).toBeGreaterThan(0);
        return;
      }

      if (scenario.operation === 'audio') {
        const client = await safeExternalOperation(scenarioId, () => execution.createAudioClient(scenario.model!));
        try {
          const result = await safeExternalOperation(scenarioId, () => client.generateSpeech(
            'Hello from the value-safe managed-provider audio test.',
          ));
          assertEvidenceClean(result);
          expect(result.audio_urls.length).toBeGreaterThan(0);
        } finally {
          await client.cleanup();
        }
        return;
      }

      if (scenario.operation === 'image') {
        const client = await safeExternalOperation(scenarioId, () => execution.createImageClient(scenario.model!));
        try {
          const result = await safeExternalOperation(scenarioId, () => client.generateImage(
            'A simple blue circle centered on a white background.',
          ));
          assertEvidenceClean(result);
          expect(result.image_urls.length).toBeGreaterThan(0);
        } finally {
          await client.cleanup();
        }
        return;
      }

      if (scenario.operation === 'claude-managed') {
        const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-managed-real-e2e-'));
        appConfigProvider.resetForTests();
        appConfigProvider.config.setCustomAppDataDir(tempDirectory);
        const client = execution.createManagedClaudeClient();
        let query: Awaited<ReturnType<typeof client.startQueryTurn>> | null = null;
        try {
          query = await safeExternalOperation(scenarioId, () => client.startQueryTurn({
            prompt: 'Reply with the single word pong.',
            model: scenario.model!,
            workingDirectory: tempDirectory,
            mcpServers: {},
            allowedTools: [],
          }));
          let observedEvents = 0;
          await safeExternalOperation(scenarioId, async () => {
            for await (const event of query!) {
              assertEvidenceClean(event);
              observedEvents += 1;
            }
          });
          expect(observedEvents).toBeGreaterThan(0);
        } finally {
          client.closeQuery(query);
          appConfigProvider.resetForTests();
          await fs.rm(tempDirectory, { recursive: true, force: true });
        }
        return;
      }

      if (scenario.operation.startsWith('autobyteus-')) {
        const kind = scenario.operation.endsWith('llm')
          ? 'llm'
          : scenario.operation.endsWith('audio') ? 'audio' : 'image';
        let discovered: number;
        try {
          discovered = await execution.discoverAutoByteus(kind);
        } catch (error) {
          const instructionCode = classifyAutoByteusDiscoveryUnavailable(error, kind);
          if (!instructionCode) throw error;
          const result = {
            scenarioId,
            status: 'SKIPPED_CAPABILITY_UNAVAILABLE',
            capability: `${kind}-model-discovery`,
            instructionCode,
          };
          assertEvidenceClean(result);
          process.stdout.write(`${JSON.stringify(result)}\n`);
          skip();
          return;
        }
        assertEvidenceClean(discovered);
        if (discovered === 0) {
          const result = {
            scenarioId,
            status: 'SKIPPED_CAPABILITY_UNAVAILABLE',
            capability: `${kind}-model-discovery`,
            instructionCode: 'AUTOBYTEUS_DISCOVERY_EMPTY',
          };
          assertEvidenceClean(result);
          process.stdout.write(`${JSON.stringify(result)}\n`);
          skip();
          return;
        }
        const models = await execution.listAutoByteusModels(kind);
        assertEvidenceClean(models);
        const model = scenario.model
          ? models.find((candidate) => {
              const identifier = 'model_identifier' in candidate
                ? candidate.model_identifier
                : candidate.modelIdentifier;
              return identifier === scenario.model || candidate.name === scenario.model;
            })
          : models[0];
        if (!model) throw new Error(`LIVE_E2E_CAPABILITY_UNAVAILABLE:${scenarioId}`);
        const identifier = 'model_identifier' in model ? model.model_identifier : model.modelIdentifier;

        if (kind === 'llm') {
          const llm = await safeExternalOperation(scenarioId, () => execution.createLlm(identifier));
          try {
            const result = await safeExternalOperation(scenarioId, () => llm.sendUserMessage(
              new LLMUserMessage({ content: 'Reply with the single word pong.' }),
              { logicalConversationId: 'secure-secret-real-autobyteus-llm' },
            ));
            assertEvidenceClean(result);
            expect(result.content.trim().length).toBeGreaterThan(0);
          } finally {
            await llm.cleanup();
          }
        } else if (kind === 'audio') {
          const client = await safeExternalOperation(scenarioId, () => execution.createAudioClient(identifier));
          try {
            const result = await safeExternalOperation(scenarioId, () => client.generateSpeech(
              'Hello from the secure AutoByteus gateway test.',
            ));
            assertEvidenceClean(result);
            expect(result.audio_urls.length).toBeGreaterThan(0);
          } finally {
            await client.cleanup();
          }
        } else {
          const client = await safeExternalOperation(scenarioId, () => execution.createImageClient(identifier));
          try {
            const result = await safeExternalOperation(scenarioId, () => client.generateImage(
              'A simple blue circle centered on a white background.',
            ));
            assertEvidenceClean(result);
            expect(result.image_urls.length).toBeGreaterThan(0);
          } finally {
            await client.cleanup();
          }
        }
        return;
      }

      throw new Error(`LIVE_E2E_SCENARIO_EXECUTOR_MISSING:${scenarioId}`);
    });
  }
});
