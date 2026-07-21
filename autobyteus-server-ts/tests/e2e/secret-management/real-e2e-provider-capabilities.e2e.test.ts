import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LLMUserMessage } from 'autobyteus-ts/llm/user-message.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import {
  LiveE2eHarness,
  type LiveE2ePreflight,
} from '../../../../test-support/live-e2e/live-e2e-harness.js';
import {
  loadLiveE2eManifest,
  requireTrackedLiveE2eManifestPath,
  selectedLiveE2eScenarioIds,
} from '../../../../test-support/live-e2e/live-e2e-manifest.js';
import { LiveE2eEvidenceScanner } from '../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';

const enabled = process.env.RUN_REAL_E2E === '1';
const preflightOnly = process.env.AUTOBYTEUS_LIVE_E2E_PREFLIGHT_ONLY === '1';
const run = enabled ? describe : describe.skip;
const manifestPath = enabled ? requireTrackedLiveE2eManifestPath() : '';
const manifest = enabled ? loadLiveE2eManifest(manifestPath) : null;
const selectedScenarioIds = manifest ? selectedLiveE2eScenarioIds(manifest) : [];
const scanner = new LiveE2eEvidenceScanner(['synthetic-live-e2e-scan-canary']);

const safeExternalOperation = async <T>(scenarioId: string, operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch {
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
  scanner.assertClean(report);
  scanner.assertStructurallyValueFree(report);
  process.stdout.write(`${JSON.stringify(report)}\n`);
};

run('read-only Store-backed real provider capabilities', () => {
  let harness: LiveE2eHarness;

  beforeAll(async () => {
    harness = await LiveE2eHarness.open(manifestPath);
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

    it(`executes ${scenarioId} through its reviewed product boundary`, { timeout: 180_000 }, async () => {
      const execution = await harness.requireScenario(scenarioId);
      const scenario = execution.scenario;

      if (scenarioId === 'openai.llm') {
        const llm = await safeExternalOperation(scenarioId, () => execution.createLlm(scenario.model!));
        try {
          const response = await safeExternalOperation(scenarioId, () => llm.sendUserMessage(
            new LLMUserMessage({ content: 'Reply with the single word pong.' }),
            { logicalConversationId: 'secure-secret-real-openai-llm' },
          ));
          expect(response.content.trim().length).toBeGreaterThan(0);
        } finally {
          await llm.cleanup();
        }
        return;
      }

      if (scenarioId === 'openai.agent-flow') {
        throw new Error('LIVE_E2E_GATEWAY_CAPABILITY_NOT_CONFIGURED:openai.agent-flow');
      }

      if (scenarioId === 'serper.search') {
        const result = await safeExternalOperation(scenarioId, () => execution.search('AutoByteus', 2));
        expect(result.length).toBeGreaterThan(0);
        return;
      }

      if (scenarioId === 'openai.audio' || scenarioId === 'gemini.audio') {
        const client = await safeExternalOperation(scenarioId, () => execution.createAudioClient(scenario.model!));
        try {
          const result = await safeExternalOperation(scenarioId, () => client.generateSpeech(
            'Hello from the secure Store-backed audio test.',
          ));
          expect(result.audio_urls.length).toBeGreaterThan(0);
        } finally {
          await client.cleanup();
        }
        return;
      }

      if (scenarioId === 'openai.image' || scenarioId === 'gemini.image') {
        const client = await safeExternalOperation(scenarioId, () => execution.createImageClient(scenario.model!));
        try {
          const result = await safeExternalOperation(scenarioId, () => client.generateImage(
            'A simple blue circle centered on a white background.',
          ));
          expect(result.image_urls.length).toBeGreaterThan(0);
        } finally {
          await client.cleanup();
        }
        return;
      }

      if (scenarioId === 'anthropic.claude-agent-sdk') {
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
            for await (const _event of query!) observedEvents += 1;
          });
          expect(observedEvents).toBeGreaterThan(0);
        } finally {
          client.closeQuery(query);
          appConfigProvider.resetForTests();
          await fs.rm(tempDirectory, { recursive: true, force: true });
        }
        return;
      }

      if (scenarioId.startsWith('autobyteus.remote-')) {
        const kind = scenarioId.endsWith('llm') ? 'llm' : scenarioId.endsWith('audio') ? 'audio' : 'image';
        const discovered = await safeExternalOperation(scenarioId, () => execution.discoverAutoByteus(kind));
        if (discovered === 0) throw new Error(`LIVE_E2E_CAPABILITY_UNAVAILABLE:${scenarioId}`);
        const models = await execution.listAutoByteusModels(kind);
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
