import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {
  AgentInputUserMessage,
  LLMFactory,
  LLMRuntime,
  MultimediaRuntime,
} from '../../autobyteus-ts/src/index.js';
import { SkillAccessMode } from '../../autobyteus-ts/src/agent/context/skill-access-mode.js';
import { AudioClientFactory } from '../../autobyteus-ts/src/multimedia/audio/audio-client-factory.js';
import { ImageClientFactory } from '../../autobyteus-ts/src/multimedia/image/image-client-factory.js';
import { SearchClientFactory } from '../../autobyteus-ts/src/tools/search/factory.js';
import { SearchProvider } from '../../autobyteus-ts/src/tools/search/providers.js';
import { appConfigProvider } from '../../autobyteus-server-ts/src/config/app-config-provider.js';
import { SecretManagementProviderApiKeyResolver } from '../../autobyteus-server-ts/src/secret-management/resolution/secret-management-provider-api-key-resolver.js';
import {
  getSecretVaultRuntime,
  resetSecretVaultRuntimeForTests,
} from '../../autobyteus-server-ts/src/secret-management/secret-vault-runtime.js';
import type { SecretManagementService } from '../../autobyteus-server-ts/src/secret-management/services/secret-management-service.js';
import { AutobyteusRemoteModelDiscoveryService } from '../../autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.js';
import { createGeminiRuntimeResolver } from '../../autobyteus-server-ts/src/llm-management/services/gemini-runtime-resolver-adapter.js';
import { getGeminiConfigurationService } from '../../autobyteus-server-ts/src/llm-management/services/gemini-configuration-service.js';
import { ClaudeSdkClient } from '../../autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.js';
import { AgentDefinition } from '../../autobyteus-server-ts/src/agent-definition/domain/models.js';
import type { AgentDefinitionService } from '../../autobyteus-server-ts/src/agent-definition/services/agent-definition-service.js';
import { AutoByteusAgentRunBackendFactory } from '../../autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js';
import type { AgentRunBackend } from '../../autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.js';
import { AgentRunConfig } from '../../autobyteus-server-ts/src/agent-execution/domain/agent-run-config.js';
import {
  AgentRunEventType,
  isAgentRunEvent,
} from '../../autobyteus-server-ts/src/agent-execution/domain/agent-run-event.js';
import { RuntimeKind } from '../../autobyteus-server-ts/src/runtime-management/runtime-kind-enum.js';
import { FileSystemWorkspace } from '../../autobyteus-server-ts/src/workspaces/filesystem-workspace.js';
import type { WorkspaceManager } from '../../autobyteus-server-ts/src/workspaces/workspace-manager.js';
import {
  liveE2eScenarios,
  type LiveE2eScenario,
} from './live-e2e-scenarios.mjs';
import {
  executeGraphql,
  persistentTestRuntimeRoot,
  readTrackedTestEnvironment,
  testRuntimeRoot,
} from './test-runtime-bootstrap.mjs';

export type LiveE2ePreflight = {
  scenarioId: string;
  health: 'READY' | 'LOCKED' | 'UNAVAILABLE' | 'CORRUPT' | 'INCOMPATIBLE';
  configured: string[];
  missing: string[];
  instructionCode: string | null;
};

export type LiveE2eAgentBackend = Pick<
  AgentRunBackend,
  'subscribeToEvents' | 'postUserMessage' | 'terminate'
>;

type LiveE2eAgentBackendFactory = {
  createBackend(config: AgentRunConfig, agentRunId: string): Promise<LiveE2eAgentBackend>;
};

export type LiveE2eAgentFlowResult = {
  scenarioId: string;
  capability: 'agent-turn';
  status: 'PASSED';
  observedEventCount: number;
};

export const classifyAutoByteusDiscoveryUnavailable = (
  error: unknown,
  kind: 'llm' | 'audio' | 'image',
): string | null => {
  const expected = `AUTOBYTEUS_${kind.toUpperCase()}_DISCOVERY_FAILED`;
  return error instanceof Error && error.message === expected ? expected : null;
};

export const runLiveE2eAgentFlow = async (input: {
  scenarioId: string;
  scenario: LiveE2eScenario;
  backendFactory: LiveE2eAgentBackendFactory;
  memoryDirectory: string;
  evidenceObserver?: (value: unknown) => void;
  timeoutMs?: number;
}): Promise<LiveE2eAgentFlowResult> => {
  if (input.scenario.operation !== 'agent-flow' || !input.scenario.model) {
    throw new Error('LIVE_E2E_AGENT_FLOW_SCENARIO_INVALID');
  }
  const runId = `live_e2e_agent_${randomUUID().replace(/-/g, '')}`;
  const backend = await input.backendFactory.createBackend(new AgentRunConfig({
    agentDefinitionId: 'live-e2e-agent-flow',
    llmModelIdentifier: input.scenario.model,
    autoExecuteTools: false,
    memoryDir: input.memoryDirectory,
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind: RuntimeKind.AUTOBYTEUS,
  }), runId);
  let observedEventCount = 0;
  let unsubscribe = (): void => {};
  let timeout: NodeJS.Timeout | null = null;
  let operationError: unknown = null;

  try {
    const completion = new Promise<void>((resolve, reject) => {
      timeout = setTimeout(
        () => reject(new Error('LIVE_E2E_GATEWAY_AGENT_FLOW_TIMEOUT')),
        input.timeoutMs ?? 120_000,
      );
      unsubscribe = backend.subscribeToEvents((value) => {
        try {
          input.evidenceObserver?.(value);
        } catch (error) {
          reject(error);
          return;
        }
        if (!isAgentRunEvent(value)) return;
        observedEventCount += 1;
        if (value.eventType === AgentRunEventType.ERROR) {
          reject(new Error('LIVE_E2E_GATEWAY_AGENT_FLOW_RUNTIME_ERROR'));
        } else if (value.eventType === AgentRunEventType.ASSISTANT_COMPLETE) {
          resolve();
        }
      });
    });
    const sendResult = await backend.postUserMessage(
      new AgentInputUserMessage('Reply with the single word pong.'),
    );
    if (!sendResult.accepted) throw new Error('LIVE_E2E_GATEWAY_AGENT_FLOW_SEND_REJECTED');
    await completion;
    return {
      scenarioId: input.scenarioId,
      capability: 'agent-turn',
      status: 'PASSED',
      observedEventCount,
    };
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
    unsubscribe();
    const terminateResult = await backend.terminate();
    if (!terminateResult.accepted && !operationError) {
      throw new Error('LIVE_E2E_GATEWAY_AGENT_FLOW_TERMINATION_FAILED');
    }
  }
};

const runtimeRootFromEnvironment = (): string => {
  const value = process.env.AUTOBYTEUS_TEST_RUNTIME_ROOT?.trim();
  const resolved = path.resolve(value || persistentTestRuntimeRoot);
  const relative = path.relative(testRuntimeRoot, resolved);
  if (
    relative === ''
    || relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error('TEST_RUNTIME_PATH_UNSAFE');
  }
  return resolved;
};

const serverUrlFromEnvironment = (): string => {
  const value = process.env.AUTOBYTEUS_TEST_SERVER_URL?.trim();
  if (!value) throw new Error('TEST_SERVER_URL_REQUIRED');
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error('TEST_SERVER_URL_INVALID');
  }
  return parsed.origin;
};

export const withoutAmbientTestDatabaseUrls = async <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  const inheritedDatabaseUrl = process.env.DATABASE_URL;
  const inheritedTestDatabaseUrl = process.env.DATABASE_URL_TEST;
  delete process.env.DATABASE_URL;
  delete process.env.DATABASE_URL_TEST;
  try {
    return await operation();
  } finally {
    if (inheritedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = inheritedDatabaseUrl;
    if (inheritedTestDatabaseUrl === undefined) delete process.env.DATABASE_URL_TEST;
    else process.env.DATABASE_URL_TEST = inheritedTestDatabaseUrl;
  }
};

const preflightFromStatus = (
  scenarioId: string,
  requiredSecretId: string,
  status: { vaultHealth: LiveE2ePreflight['health']; storageState: string | null; instructionCode: string | null },
): LiveE2ePreflight => ({
  scenarioId,
  health: status.vaultHealth,
  configured: status.storageState === 'CONFIGURED' ? [requiredSecretId] : [],
  missing: status.storageState === 'MISSING' ? [requiredSecretId] : [],
  instructionCode: status.instructionCode,
});

export class LiveE2eScenarioExecution {
  private readonly llmResolver: SecretManagementProviderApiKeyResolver;
  private readonly audioResolver: SecretManagementProviderApiKeyResolver;
  private readonly imageResolver: SecretManagementProviderApiKeyResolver;
  private readonly discovery: AutobyteusRemoteModelDiscoveryService;

  constructor(
    readonly scenarioId: string,
    readonly scenario: LiveE2eScenario,
    private readonly management: SecretManagementService,
    private readonly serverUrl: string,
  ) {
    this.llmResolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'llm' },
      () => this.management,
    );
    this.audioResolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'media', mediaKind: 'audio' },
      () => this.management,
    );
    this.imageResolver = new SecretManagementProviderApiKeyResolver(
      { kind: 'media', mediaKind: 'image' },
      () => this.management,
    );
    this.discovery = new AutobyteusRemoteModelDiscoveryService(
      () => this.management,
      () => [...(this.scenario.hosts ?? [])],
    );
  }

  async activateGeminiMode(): Promise<void> {
    const option = this.scenario.geminiMode;
    if (!option) return;
    await executeGraphql(this.serverUrl, `
      mutation UseGeminiMode($mode: GeminiSetupMode!) {
        useGeminiMode(mode: $mode) {
          activeMode
          aiStudioConfigured
          vertexExpressConfigured
          vertexProject {
            project
            location
          }
        }
      }
    `, { mode: option });
    await getGeminiConfigurationService().activateOption(option);
  }

  async executeAgentFlow(
    evidenceObserver?: (value: unknown) => void,
  ): Promise<LiveE2eAgentFlowResult> {
    if (this.scenario.operation !== 'agent-flow') {
      throw new Error('LIVE_E2E_SCENARIO_ACCESS_DENIED');
    }
    const ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'live-e2e-agent-flow-'));
    const workspaceDirectory = path.join(ownedRoot, 'workspace');
    const memoryDirectory = path.join(ownedRoot, 'memory');
    await fs.mkdir(workspaceDirectory, { recursive: true });
    const definition = new AgentDefinition({
      id: 'live-e2e-agent-flow',
      name: 'Managed-provider live E2E agent',
      role: 'Test agent',
      description: 'Exercises the normal AutoByteus product agent boundary.',
      instructions: 'Reply concisely to the user without invoking tools.',
      ownershipScope: 'shared',
    });
    const definitionService = {
      getFreshAgentDefinitionById: async (id: string) => id === definition.id ? definition : null,
      getAgentDefinitionById: async (id: string) => id === definition.id ? definition : null,
    } as unknown as AgentDefinitionService;
    const workspace = new FileSystemWorkspace({
      rootPath: workspaceDirectory,
      workspaceId: 'live-e2e-agent-workspace',
    });
    const workspaceManager = {
      getWorkspaceById: () => undefined,
      getOrCreateTempWorkspace: async () => workspace,
    } as unknown as WorkspaceManager;
    const backendFactory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: definitionService,
      createLLM: (modelIdentifier, configInput) =>
        LLMFactory.createLLM(modelIdentifier, configInput, this.llmResolver),
      workspaceManager,
      compactionAgentRunnerFactory: () => null,
    });

    try {
      return await runLiveE2eAgentFlow({
        scenarioId: this.scenarioId,
        scenario: this.scenario,
        backendFactory,
        memoryDirectory,
        evidenceObserver,
      });
    } finally {
      await workspace.close();
      await fs.rm(ownedRoot, { recursive: true, force: true });
    }
  }

  async discoverAutoByteus(kind: 'llm' | 'audio' | 'image'): Promise<number> {
    if (!this.scenario.hosts?.length) throw new Error('LIVE_E2E_HOSTS_NOT_CONFIGURED');
    return this.discovery.refresh(kind);
  }

  async listAutoByteusModels(kind: 'llm' | 'audio' | 'image') {
    if (kind === 'llm') return LLMFactory.listModelsByRuntime(LLMRuntime.AUTOBYTEUS);
    if (kind === 'audio') {
      return AudioClientFactory.listModels()
        .filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
    }
    return ImageClientFactory.listModels()
      .filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
  }

  async createLlm(modelIdentifier: string) {
    const gemini = await LLMFactory.requiresGeminiRuntimeResolver(modelIdentifier);
    return LLMFactory.createLLM(
      modelIdentifier,
      undefined,
      this.llmResolver,
      gemini ? createGeminiRuntimeResolver() : undefined,
    );
  }

  createAudioClient(modelIdentifier: string) {
    const gemini = AudioClientFactory.requiresGeminiRuntimeResolver(modelIdentifier);
    return AudioClientFactory.createAudioClient(
      modelIdentifier,
      undefined,
      this.audioResolver,
      gemini ? createGeminiRuntimeResolver() : undefined,
    );
  }

  createImageClient(modelIdentifier: string) {
    const gemini = ImageClientFactory.requiresGeminiRuntimeResolver(modelIdentifier);
    return ImageClientFactory.createImageClient(
      modelIdentifier,
      undefined,
      this.imageResolver,
      gemini ? createGeminiRuntimeResolver() : undefined,
    );
  }

  createApiKeyClaudeClient(): ClaudeSdkClient {
    return new ClaudeSdkClient(() => this.management.resolveForUse({
      kind: 'agentRuntime',
      runtimeKind: 'claude_agent_sdk',
      credentialSlot: 'apiKey',
    }));
  }

  async search(query: string, numResults: number): Promise<string> {
    if (this.scenarioId !== 'serper.search') throw new Error('LIVE_E2E_SCENARIO_ACCESS_DENIED');
    const apiKey = await this.management.resolveForUse({
      kind: 'search',
      providerId: 'serper',
      credentialSlot: 'apiKey',
    });
    return SearchClientFactory.getInstance().createSearchClient({
      provider: SearchProvider.SERPER,
      apiKey,
    }).search(query, numResults);
  }
}

export class LiveE2eHarness {
  private constructor(
    private readonly runtimeRoot: string,
    private readonly serverUrl: string,
    private readonly management: SecretManagementService,
  ) {}

  static async open(): Promise<LiveE2eHarness> {
    const tracked = readTrackedTestEnvironment();
    const runtimeRoot = runtimeRootFromEnvironment();
    const serverUrl = serverUrlFromEnvironment();
    await resetSecretVaultRuntimeForTests();
    const runtime = await withoutAmbientTestDatabaseUrls(async () => {
      appConfigProvider.resetForTests();
      const config = appConfigProvider.initialize({ appDataDir: runtimeRoot });
      config.initialize();
      if (
        config.getOperationalDatabaseLocation().databaseUrl
        !== tracked.database.databaseUrl
      ) {
        throw new Error('LIVE_E2E_DATABASE_TARGET_MISMATCH');
      }
      const selectedRuntime = getSecretVaultRuntime();
      await selectedRuntime.initialize(config.getOperationalDatabaseLocation());
      return selectedRuntime;
    });
    return new LiveE2eHarness(runtimeRoot, serverUrl, runtime.requireService());
  }

  async preflight(scenarioId: string): Promise<LiveE2ePreflight> {
    const scenario = liveE2eScenarios[scenarioId];
    if (!scenario) throw new Error(`LIVE_E2E_SCENARIO_UNKNOWN:${scenarioId}`);
    const vault = await executeGraphql<{
      getSecretVaultStatus: {
        health: LiveE2ePreflight['health'];
        instructionCode: string | null;
      };
    }>(this.serverUrl, `
      query VaultStatus {
        getSecretVaultStatus {
          health
          instructionCode
        }
      }
    `);
    if (vault.getSecretVaultStatus.health !== 'READY') {
      return {
        scenarioId,
        health: vault.getSecretVaultStatus.health,
        configured: [],
        missing: [],
        instructionCode: vault.getSecretVaultStatus.instructionCode,
      };
    }
    let configured: boolean;
    if (scenario.geminiMode === 'AI_STUDIO' || scenario.geminiMode === 'VERTEX_EXPRESS') {
      const data = await executeGraphql<{
        getGeminiSetupConfig: {
          aiStudioConfigured: boolean | null;
          vertexExpressConfigured: boolean | null;
        };
      }>(this.serverUrl, `
        query GeminiStatus {
          getGeminiSetupConfig {
            aiStudioConfigured
            vertexExpressConfigured
          }
        }
      `);
      configured = scenario.geminiMode === 'AI_STUDIO'
        ? data.getGeminiSetupConfig.aiStudioConfigured === true
        : data.getGeminiSetupConfig.vertexExpressConfigured === true;
    } else if (scenario.operation === 'search') {
      const data = await executeGraphql<{
        getSearchConfig: {
          serperStorageState: string | null;
        };
      }>(this.serverUrl, `
        query SearchStatus {
          getSearchConfig {
            serperStorageState
          }
        }
      `);
      configured = data.getSearchConfig.serperStorageState === 'CONFIGURED';
    } else {
      const data = await executeGraphql<{
        providerSettings: Array<{
          provider: { id: string; apiKeyConfigured: boolean };
        }>;
      }>(this.serverUrl, `
        query ProviderStatus {
          providerSettings(runtimeKind: "autobyteus") {
            provider {
              id
              apiKeyConfigured
            }
          }
        }
      `);
      const provider = data.providerSettings.find(
        ({ provider: candidate }) => candidate.id === scenario.providerId,
      );
      if (!provider) {
        return {
          scenarioId,
          health: 'UNAVAILABLE',
          configured: [],
          missing: [],
          instructionCode: 'SECRET_PROVIDER_STATUS_UNAVAILABLE',
        };
      }
      configured = provider.provider.apiKeyConfigured;
    }
    return preflightFromStatus(scenarioId, scenario.requiredSecretId, {
      vaultHealth: 'READY',
      storageState: configured ? 'CONFIGURED' : 'MISSING',
      instructionCode: null,
    });
  }

  async requireScenario(scenarioId: string): Promise<LiveE2eScenarioExecution> {
    const preflight = await this.preflight(scenarioId);
    if (preflight.health !== 'READY') {
      throw new Error(`LIVE_E2E_VAULT_${preflight.health}`);
    }
    if (preflight.missing.length > 0) {
      throw new Error(`LIVE_E2E_DEFINITION_MISSING:${preflight.missing.join(',')}`);
    }
    return new LiveE2eScenarioExecution(
      scenarioId,
      liveE2eScenarios[scenarioId]!,
      this.management,
      this.serverUrl,
    );
  }

  async close(): Promise<void> {
    await resetSecretVaultRuntimeForTests();
    appConfigProvider.resetForTests();
    void this.runtimeRoot;
  }
}
