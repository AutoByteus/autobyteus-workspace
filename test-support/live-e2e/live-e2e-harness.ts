import os from 'node:os';
import path from 'node:path';
import { LLMFactory, LLMRuntime, MultimediaRuntime } from '../../autobyteus-ts/src/index.js';
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
import {
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

  async discoverAutoByteus(kind: 'llm' | 'audio' | 'image'): Promise<number> {
    if (!this.scenario.hosts?.length) throw new Error('LIVE_E2E_HOSTS_NOT_CONFIGURED');
    return this.discovery.refresh(kind);
  }

  async listAutoByteusModels(kind: 'llm' | 'audio' | 'image') {
    if (kind === 'llm') return LLMFactory.listModelsByRuntime(LLMRuntime.AUTOBYTEUS);
    if (kind === 'audio') {
      return AudioClientFactory.listModels().filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
    }
    return ImageClientFactory.listModels().filter((model) => model.runtime === MultimediaRuntime.AUTOBYTEUS);
  }

  createLlm(modelIdentifier: string) {
    return this.llmProvisioning.createLLM(modelIdentifier);
  }

  createAudioClient(modelIdentifier: string) {
    return this.withGoogleSetupMode(() => this.mediaProvisioning.createAudioClient(modelIdentifier));
  }

  createImageClient(modelIdentifier: string) {
    return this.withGoogleSetupMode(() => this.mediaProvisioning.createImageClient(modelIdentifier));
  }

  createManagedClaudeClient(): ClaudeSdkClient {
    if (this.scenario.runtimeAuthMode !== 'managed-secret') {
      throw new Error('LIVE_E2E_CLAUDE_MODE_INVALID');
    }
    return new ClaudeSdkClient(new ClaudeRuntimeAuthenticationService(
      () => 'managed-secret',
      () => this.management,
    ));
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
