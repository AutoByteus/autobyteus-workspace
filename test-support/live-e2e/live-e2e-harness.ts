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
import { VideoClientFactory } from '../../autobyteus-ts/src/multimedia/video/video-client-factory.js';
import { SearchClientFactory } from '../../autobyteus-ts/src/tools/search/factory.js';
import { SearchProvider } from '../../autobyteus-ts/src/tools/search/providers.js';
import { secretDefinitionId } from '../../autobyteus-server-ts/src/secret-management/domain/secret-binding.js';
import { LocalReadOnlySecretStorageBackend } from '../../autobyteus-server-ts/src/secret-management/backends/local/local-secret-storage-backend.js';
import { SecretManagementService } from '../../autobyteus-server-ts/src/secret-management/services/secret-management-service.js';
import { AutobyteusRemoteModelDiscoveryService } from '../../autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.js';
import { LLMProvisioningService } from '../../autobyteus-server-ts/src/llm-management/services/llm-provisioning-service.js';
import { MediaClientProvisioningService } from '../../autobyteus-server-ts/src/agent-tools/media/media-client-provisioning-service.js';
import { ClaudeRuntimeAuthenticationService } from '../../autobyteus-server-ts/src/runtime-management/claude/client/claude-runtime-authentication-service.js';
import { ClaudeSdkClient } from '../../autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.js';
import { AgentDefinition } from '../../autobyteus-server-ts/src/agent-definition/domain/models.js';
import type { AgentDefinitionService } from '../../autobyteus-server-ts/src/agent-definition/services/agent-definition-service.js';
import {
  AutoByteusAgentRunBackendFactory,
} from '../../autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js';
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
  assertLiveE2eScenarioMode,
  loadLiveE2eManifest,
  type LiveE2eManifest,
  type LiveE2eScenario,
} from './live-e2e-manifest.js';

export type LiveE2ePreflight = {
  scenarioId: string;
  health: 'READY' | 'LOCKED' | 'UNAVAILABLE' | 'CORRUPT' | 'INCOMPATIBLE';
  configured: string[];
  missing: string[];
  instructionCode: string | null;
};

export type LiveE2eCapabilityResult = {
  scenarioId: string;
  capability: string;
  status: 'PASSED' | 'UNAVAILABLE';
  detailCode: string;
};

const canonicalStoreRoot = (): string =>
  path.join(os.homedir(), '.autobyteus', 'server-data', 'secret-store');

export type LiveE2eAgentBackend = Pick<
  AgentRunBackend,
  'subscribeToEvents' | 'postUserMessage' | 'terminate'
>;

type LiveE2eAgentBackendFactory = {
  createBackend(config: AgentRunConfig, agentRunId: string): Promise<LiveE2eAgentBackend>;
};

export type LiveE2eAgentFlowResult = {
  scenarioId: 'openai.agent-flow';
  mode: 'REAL_GATEWAY';
  capability: 'agent-turn';
  status: 'PASSED';
  observedEventCount: number;
};

export const runLiveE2eOpenAiAgentFlow = async (input: {
  scenario: LiveE2eScenario;
  backendFactory: LiveE2eAgentBackendFactory;
  memoryDirectory: string;
  evidenceObserver?: (value: unknown) => void;
  timeoutMs?: number;
}): Promise<LiveE2eAgentFlowResult> => {
  assertLiveE2eScenarioMode('openai.agent-flow', input.scenario.mode);
  if (!input.scenario.model) {
    throw new Error('LIVE_E2E_GATEWAY_CAPABILITY_UNAVAILABLE:openai.agent-flow:model');
  }
  if (!input.scenario.expectedCapabilities?.includes('agent-turn')) {
    throw new Error('LIVE_E2E_GATEWAY_CAPABILITY_UNAVAILABLE:openai.agent-flow:agent-turn');
  }

  const runId = `live_e2e_openai_agent_${randomUUID().replace(/-/g, '')}`;
  const backend = await input.backendFactory.createBackend(new AgentRunConfig({
    agentDefinitionId: 'live-e2e-openai-agent-flow',
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
          return;
        }
        if (value.eventType === AgentRunEventType.ASSISTANT_COMPLETE) {
          resolve();
        }
      });
    });

    const sendResult = await backend.postUserMessage(
      new AgentInputUserMessage('Reply with the single word pong.'),
    );
    if (!sendResult.accepted) {
      throw new Error('LIVE_E2E_GATEWAY_AGENT_FLOW_SEND_REJECTED');
    }
    await completion;
    return {
      scenarioId: 'openai.agent-flow',
      mode: 'REAL_GATEWAY',
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

export class LiveE2eScenarioExecution {
  private readonly management: SecretManagementService;
  private readonly discovery: AutobyteusRemoteModelDiscoveryService;
  private readonly llmProvisioning: LLMProvisioningService;
  private readonly mediaProvisioning: MediaClientProvisioningService;

  constructor(
    readonly scenarioId: string,
    readonly scenario: LiveE2eScenario,
    management: SecretManagementService,
  ) {
    assertLiveE2eScenarioMode(scenarioId, scenario.mode);
    this.management = management;
    this.discovery = new AutobyteusRemoteModelDiscoveryService(
      () => this.management,
      () => [...(this.scenario.hosts ?? [])],
    );
    this.llmProvisioning = new LLMProvisioningService(LLMFactory, () => this.management);
    this.mediaProvisioning = new MediaClientProvisioningService(
      AudioClientFactory,
      ImageClientFactory,
      VideoClientFactory,
      () => this.management,
    );
  }

  async executeOpenAiAgentFlow(
    evidenceObserver?: (value: unknown) => void,
  ): Promise<LiveE2eAgentFlowResult> {
    assertLiveE2eScenarioMode(this.scenarioId, this.scenario.mode);
    if (this.scenarioId !== 'openai.agent-flow') {
      throw new Error('LIVE_E2E_SCENARIO_ACCESS_DENIED');
    }

    const ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'live-e2e-openai-agent-flow-'));
    const workspaceDirectory = path.join(ownedRoot, 'workspace');
    const memoryDirectory = path.join(ownedRoot, 'memory');
    await fs.mkdir(workspaceDirectory, { recursive: true });
    const definition = new AgentDefinition({
      id: 'live-e2e-openai-agent-flow',
      name: 'Secure live E2E agent',
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
      workspaceId: 'live-e2e-openai-agent-workspace',
    });
    const workspaceManager = {
      getWorkspaceById: () => undefined,
      getOrCreateTempWorkspace: async () => workspace,
    } as unknown as WorkspaceManager;
    const backendFactory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: definitionService,
      llmProvisioningService: this.llmProvisioning,
      workspaceManager,
      compactionAgentRunnerFactory: () => null,
    });

    try {
      return await runLiveE2eOpenAiAgentFlow({
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
    this.assertDirectSecretBoundary();
    if (!this.scenario.hosts?.length) throw new Error('LIVE_E2E_HOSTS_NOT_CONFIGURED');
    return this.discovery.refresh(kind);
  }

  async listAutoByteusModels(kind: 'llm' | 'audio' | 'image') {
    this.assertDirectSecretBoundary();
    if (kind === 'llm') return LLMFactory.listModelsByRuntime(LLMRuntime.AUTOBYTEUS);
    if (kind === 'audio') {
      return AudioClientFactory.listModels().filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
    }
    return ImageClientFactory.listModels().filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
  }

  createLlm(modelIdentifier: string) {
    this.assertDirectSecretBoundary();
    return this.llmProvisioning.createLLM(modelIdentifier);
  }

  createAudioClient(modelIdentifier: string) {
    this.assertDirectSecretBoundary();
    return this.withGoogleSetupMode(() => this.mediaProvisioning.createAudioClient(modelIdentifier));
  }

  createImageClient(modelIdentifier: string) {
    this.assertDirectSecretBoundary();
    return this.withGoogleSetupMode(() => this.mediaProvisioning.createImageClient(modelIdentifier));
  }

  createManagedClaudeClient(): ClaudeSdkClient {
    this.assertDirectSecretBoundary();
    if (this.scenario.runtimeAuthMode !== 'managed-secret') {
      throw new Error('LIVE_E2E_CLAUDE_MODE_INVALID');
    }
    return new ClaudeSdkClient(new ClaudeRuntimeAuthenticationService(
      () => 'managed-secret',
      () => this.management,
    ));
  }

  async search(query: string, numResults: number): Promise<string> {
    this.assertDirectSecretBoundary();
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

  private async withGoogleSetupMode<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.scenario.googleSetupMode) return operation();
    const previous = process.env.GEMINI_SETUP_MODE;
    process.env.GEMINI_SETUP_MODE = this.scenario.googleSetupMode;
    try {
      return await operation();
    } finally {
      if (previous === undefined) delete process.env.GEMINI_SETUP_MODE;
      else process.env.GEMINI_SETUP_MODE = previous;
    }
  }

  private assertDirectSecretBoundary(): void {
    assertLiveE2eScenarioMode(this.scenarioId, this.scenario.mode);
    if (this.scenario.mode !== 'REAL_DIRECT_SECRET') {
      throw new Error(
        `LIVE_E2E_SCENARIO_BOUNDARY_VIOLATION:${this.scenarioId}:${this.scenario.mode}`,
      );
    }
  }
}

export class LiveE2eHarness {
  readonly manifest: LiveE2eManifest;
  private constructor(
    manifest: LiveE2eManifest,
    private readonly backend: LocalReadOnlySecretStorageBackend,
  ) {
    this.manifest = manifest;
  }

  static async open(configurationPath: string): Promise<LiveE2eHarness> {
    const manifest = loadLiveE2eManifest(configurationPath);
    const storeRoot = canonicalStoreRoot();
    const backend = await LocalReadOnlySecretStorageBackend.open({
      kind: 'local-store',
      databasePath: path.join(storeRoot, manifest.backend.databaseFile),
      keyPath: path.join(storeRoot, manifest.backend.keyFile),
      accessMode: 'READ_ONLY',
    });
    return new LiveE2eHarness(manifest, backend);
  }

  async preflight(scenarioId: string): Promise<LiveE2ePreflight> {
    const scenario = this.manifest.scenarios[scenarioId];
    if (!scenario) throw new Error(`LIVE_E2E_SCENARIO_UNKNOWN:${scenarioId}`);
    assertLiveE2eScenarioMode(scenarioId, scenario.mode);
    const health = await this.backend.health();
    if (health.state !== 'READY') {
      return {
        scenarioId,
        health: health.state,
        configured: [],
        missing: [],
        instructionCode: health.instructionCode,
      };
    }
    const configured: string[] = [];
    const missing: string[] = [];
    for (const definition of scenario.requiredSecrets) {
      const status = await this.backend.getStatus(secretDefinitionId(definition));
      (status.storageState === 'CONFIGURED' ? configured : missing).push(definition);
    }
    return {
      scenarioId,
      health: 'READY',
      configured,
      missing,
      instructionCode: null,
    };
  }

  async requireScenario(scenarioId: string): Promise<LiveE2eScenarioExecution> {
    const preflight = await this.preflight(scenarioId);
    if (preflight.health !== 'READY') {
      throw new Error(`LIVE_E2E_STORE_${preflight.health}`);
    }
    if (preflight.missing.length > 0) {
      throw new Error(`LIVE_E2E_DEFINITION_MISSING:${preflight.missing.join(',')}`);
    }
    return new LiveE2eScenarioExecution(
      scenarioId,
      this.manifest.scenarios[scenarioId]!,
      new SecretManagementService(this.backend),
    );
  }

  async close(): Promise<void> {
    await this.backend.close();
  }
}
