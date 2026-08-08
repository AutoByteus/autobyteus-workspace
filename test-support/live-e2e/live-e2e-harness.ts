import fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AgentInputUserMessage,
  FileCompactionLineageStore,
  FileMemoryStore,
  LLMFactory,
  LLMRuntime,
  MemoryType,
  MultimediaRuntime,
} from '../../autobyteus-ts/src/index.js';
import type { BaseLLM } from '../../autobyteus-ts/src/index.js';
import { LLMExtension } from '../../autobyteus-ts/src/llm/extensions/base-extension.js';
import { LLMProvider } from '../../autobyteus-ts/src/llm/providers.js';
import { MessageRole, type Message } from '../../autobyteus-ts/src/llm/utils/messages.js';
import type { CompleteResponse } from '../../autobyteus-ts/src/llm/utils/response-types.js';
import { SkillAccessMode } from '../../autobyteus-ts/src/agent/context/skill-access-mode.js';
import { resolveTokenBudget } from '../../autobyteus-ts/src/agent/token-budget.js';
import { CompactionPolicy } from '../../autobyteus-ts/src/memory/policies/compaction-policy.js';
import {
  getWorkingContextMessageProvenance,
  type WorkingContextMessageProvenance,
} from '../../autobyteus-ts/src/memory/working-context-provenance.js';
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
import { AgentDefinitionService } from '../../autobyteus-server-ts/src/agent-definition/services/agent-definition-service.js';
import { MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from '../../autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.js';
import { AutoByteusAgentRunBackendFactory } from '../../autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js';
import type { AgentRunBackend } from '../../autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.js';
import { AgentRun } from '../../autobyteus-server-ts/src/agent-execution/domain/agent-run.js';
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
  AgentRun,
  'subscribeToEvents' | 'postUserMessage' | 'terminate'
>;

type LiveE2eAgentBackendFactory = {
  createBackend(config: AgentRunConfig, agentRunId: string): Promise<LiveE2eAgentBackend>;
};

export const wrapProductAgentBackendForLiveE2e = (
  backend: AgentRunBackend,
): LiveE2eAgentBackend => new AgentRun({
  context: backend.getContext(),
  backend,
});

export type LiveE2eAgentFlowResult = {
  scenarioId: string;
  capability: 'agent-turn';
  status: 'PASSED';
  observedEventCount: number;
};

export type LiveE2eCompactionAgentFlowResult = {
  scenarioId: string;
  capability: 'agent-compaction-turns';
  status: 'PASSED';
  modelIdentifier: string;
  effectiveContextWindowTokens: number;
  compactionRatio: 0.05;
  triggerThresholdTokens: number;
  observedBelowThreshold: true;
  observedAtOrAboveThreshold: true;
  completedCompactionCount: number;
  promptContractVersions: 2[];
  successfulToolCount: number;
  recoverableToolFailureCount: number;
  exactRetainedArtifactVerified: true;
  projectedMemoryAndCurrentUserVerified: true;
  qualityEvidence: {
    persistedMemory: {
      episodes: Record<string, unknown>[];
      semanticFacts: Record<string, unknown>[];
    };
    projectedCompactedMemoryUserRegion: string;
    nextCurrentUserRegion: string;
  };
  canonicalCompactorAgentUsed: true;
  canonicalCompactorPromptSha256: string;
  managedSecretResolverUsed: boolean;
};

const REAL_COMPACTION_RATIO = 0.05 as const;
const REAL_COMPACTION_TIMEOUT_MS = 300_000;
const MEMORY_COMPACTOR_TEMPLATE_PATH = fileURLToPath(new URL(
  '../../autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md',
  import.meta.url,
));

const buildCompactionEvidence = (
  group: 'A' | 'B',
  anchors: Record<string, string>,
  recordCount: number,
): string => {
  const anchorRecord = JSON.stringify({
    record_type: 'task_anchor',
    evidence_group: group,
    ...anchors,
  });
  const records = Array.from({ length: recordCount }, (_, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    return JSON.stringify({
      record_type: 'operational_observation',
      evidence_group: group,
      sequence,
      service: index % 2 === 0 ? 'payments-api' : 'ledger-writer',
      shard: `checkout-${String((index % 11) + 1).padStart(2, '0')}`,
      observation:
        `Observation ${group}-${sequence} confirms the sampled batch checksum, retry state, queue depth, ` +
        'and service health. It supplies realistic operational context but never supersedes the task anchor.',
    });
  });
  return [anchorRecord, ...records, anchorRecord].join('\n');
};

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const extractAgentMarkdownInstructions = (source: string): string => {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/u.exec(source);
  const instructions = match?.[1]?.trim();
  if (!instructions) throw new Error('LIVE_E2E_CANONICAL_COMPACTOR_TEMPLATE_INVALID');
  return instructions;
};

const loadCanonicalCompactorEvidence = async (): Promise<{
  promptSha256: string;
}> => {
  const source = await fs.readFile(MEMORY_COMPACTOR_TEMPLATE_PATH, 'utf8');
  const canonicalInstructions = extractAgentMarkdownInstructions(source);
  const definition = await AgentDefinitionService.getInstance()
    .getFreshAgentDefinitionById(MEMORY_COMPACTOR_AGENT_DEFINITION_ID);
  if (
    !definition
    || definition.id !== MEMORY_COMPACTOR_AGENT_DEFINITION_ID
    || definition.defaultLaunchConfig !== null
    || definition.instructions.trim() !== canonicalInstructions
  ) {
    throw new Error('LIVE_E2E_CANONICAL_COMPACTOR_DEFINITION_MISMATCH');
  }
  return {
    promptSha256: createHash('sha256').update(canonicalInstructions).digest('hex'),
  };
};

type InvocationMessageSnapshot = {
  role: MessageRole;
  content: string | null;
  toolPayload: unknown;
  provenance: WorkingContextMessageProvenance | null;
};

type InvocationSnapshot = {
  messages: InvocationMessageSnapshot[];
};

class InvocationCaptureExtension extends LLMExtension {
  readonly invocations: InvocationSnapshot[] = [];

  async beforeInvoke(messages: Message[]): Promise<void> {
    this.invocations.push({
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
        toolPayload: message.tool_payload,
        provenance: getWorkingContextMessageProvenance(message),
      })),
    });
  }

  async afterInvoke(
    _messages: Message[],
    _response: CompleteResponse | null,
  ): Promise<void> {}
}

const extractConstituent = (
  invocation: InvocationSnapshot,
  kind: 'compacted_memory' | 'current_user',
  expectedValue?: string,
): string | null => {
  let first: string | null = null;
  for (const message of invocation.messages) {
    if (message.role !== MessageRole.USER || !message.content) continue;
    if (message.provenance?.kind !== 'composed_user') continue;
    for (const constituent of message.provenance.constituents) {
      if (constituent.kind !== kind || !constituent.textRange) continue;
      const value = message.content.slice(constituent.textRange.start, constituent.textRange.end);
      if (expectedValue === undefined) first ??= value;
      if (value === expectedValue) return value;
    }
  }
  return expectedValue === undefined ? first : null;
};

const waitForLiveCondition = async (
  predicate: () => boolean,
  timeoutMs = REAL_COMPACTION_TIMEOUT_MS,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('LIVE_E2E_COMPACTION_FLOW_TIMEOUT');
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

export const databaseTargetsMatch = (
  left: Readonly<{ databasePath: string }>,
  right: Readonly<{ databasePath: string }>,
): boolean => path.resolve(left.databasePath) === path.resolve(right.databasePath);

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
    const productBackendFactory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: definitionService,
      createLLM: (modelIdentifier, configInput) =>
        LLMFactory.createLLM(modelIdentifier, configInput, this.llmResolver),
      workspaceManager,
      compactionAgentRunnerFactory: () => null,
    });
    const backendFactory: LiveE2eAgentBackendFactory = {
      createBackend: async (config, runId) => wrapProductAgentBackendForLiveE2e(
        await productBackendFactory.createBackend(config, runId),
      ),
    };

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

  async executeCompactionAgentFlow(
    evidenceObserver?: (value: unknown) => void,
  ): Promise<LiveE2eCompactionAgentFlowResult> {
    if (this.scenario.operation !== 'compaction-agent-flow' || !this.scenario.model) {
      throw new Error('LIVE_E2E_COMPACTION_AGENT_FLOW_SCENARIO_INVALID');
    }

    const ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'live-e2e-compaction-agent-flow-'));
    const workspaceDirectory = path.join(ownedRoot, 'workspace');
    const memoryDirectory = path.join(ownedRoot, 'memory');
    const evidenceAPath = path.join(workspaceDirectory, 'incident-evidence-a.jsonl');
    const evidenceBPath = path.join(workspaceDirectory, 'incident-evidence-b.jsonl');
    const finalArtifactPath = path.join(workspaceDirectory, 'retained-incident-plan.json');
    await fs.mkdir(workspaceDirectory, { recursive: true });
    await fs.mkdir(memoryDirectory, { recursive: true });

    const partA = {
      customer: 'Northwind Helios',
      rollback_action: 'restore the last stable payments build',
      safety_rule: 'the ledger delta must remain zero',
      verification: 'reconcile both ledgers before reopening retries',
    };
    const partB = {
      owner: 'Mira Chen',
      mitigation: 'freeze payment retries',
      rejection_condition: 'any duplicate ledger entry',
      communication_channel: 'payments incident bridge',
    };
    const newConstraint = 'preserve auditable rollback proof';
    const localModelScenario = this.scenario.providerId === 'LMSTUDIO';
    await fs.writeFile(
      evidenceAPath,
      buildCompactionEvidence('A', partA, localModelScenario ? 170 : 180),
      'utf8',
    );
    await fs.writeFile(
      evidenceBPath,
      buildCompactionEvidence('B', partB, localModelScenario ? 20 : 570),
      'utf8',
    );

    const definition = new AgentDefinition({
      id: 'live-e2e-compaction-agent-flow',
      name: 'Managed-provider live compaction E2E agent',
      role: 'Incident response analyst',
      description: 'Exercises managed-provider tools, real compaction, retained quality, and continuation.',
      instructions: [
        'You are a careful incident response analyst.',
        'Follow the requested file-tool sequence exactly and use provider-native tool calls.',
        'Never invent task values; preserve exact literal values from tool evidence.',
        'For write_file, use the exact absolute path supplied by the user.',
        'The write_file content argument must always be a string, including when that string contains serialized JSON.',
        'Do not finish a write request until write_file succeeds.',
      ].join(' '),
      toolNames: ['read_file', 'write_file'],
      ownershipScope: 'shared',
    });
    const definitionService = {
      getFreshAgentDefinitionById: async (id: string) => id === definition.id ? definition : null,
      getAgentDefinitionById: async (id: string) => id === definition.id ? definition : null,
    } as unknown as AgentDefinitionService;
    const workspace = new FileSystemWorkspace({
      rootPath: workspaceDirectory,
      workspaceId: 'live-e2e-compaction-agent-workspace',
    });
    const workspaceManager = {
      getWorkspaceById: () => undefined,
      getOrCreateTempWorkspace: async () => workspace,
    } as unknown as WorkspaceManager;

    const modelIdentifier = await this.resolveScenarioModelIdentifier();
    const canonicalCompactor = await loadCanonicalCompactorEvidence();
    const providerExtraParams = this.scenario.providerId === 'DEEPSEEK'
      ? { thinking_type: 'disabled' }
      : {};
    let primaryLlm: BaseLLM | null = null;
    let invocationCapture: InvocationCaptureExtension | null = null;
    const productBackendFactory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: definitionService,
      createLLM: async (modelIdentifier, configInput) => {
        const llm = await LLMFactory.createLLM(modelIdentifier, configInput, this.llmResolver);
        primaryLlm = llm;
        invocationCapture = new InvocationCaptureExtension(llm);
        llm.registerExtension(invocationCapture);
        return llm;
      },
      workspaceManager,
    });
    const backendFactory: LiveE2eAgentBackendFactory = {
      createBackend: async (config, id) => wrapProductAgentBackendForLiveE2e(
        await productBackendFactory.createBackend(config, id),
      ),
    };
    const runId = `live_e2e_compaction_agent_${randomUUID().replace(/-/g, '')}`;
    let backend: LiveE2eAgentBackend | null = null;
    let unsubscribe = (): void => {};
    const events: Array<{
      eventType: AgentRunEventType;
      payload: Record<string, unknown>;
      terminalError: boolean;
    }> = [];
    let completedTurns = 0;
    let observerError: unknown = null;

    try {
      backend = await backendFactory.createBackend(new AgentRunConfig({
        agentDefinitionId: definition.id!,
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        memoryDir: memoryDirectory,
        llmConfig: {
          temperature: 0,
          max_tokens: 1_024,
          compaction_ratio: REAL_COMPACTION_RATIO,
          safety_margin_tokens: 256,
          extra_params: providerExtraParams,
        },
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }), runId);

      unsubscribe = backend.subscribeToEvents((value) => {
        try {
          evidenceObserver?.(value);
        } catch (error) {
          observerError = error;
          return;
        }
        if (!isAgentRunEvent(value)) return;
        events.push({
          eventType: value.eventType,
          payload: value.payload,
          terminalError:
            value.eventType === AgentRunEventType.ERROR
            && value.statusHint === 'ERROR',
        });
        if (value.eventType === AgentRunEventType.TURN_COMPLETED) completedTurns += 1;
      });

      const postAndWait = async (content: string, expectedTurnCount: number): Promise<void> => {
        const result = await backend!.postUserMessage(new AgentInputUserMessage(content));
        if (!result.accepted) throw new Error('LIVE_E2E_COMPACTION_AGENT_FLOW_SEND_REJECTED');
        await waitForLiveCondition(() =>
          observerError !== null
          || events.some(({ terminalError }) => terminalError)
          || completedTurns >= expectedTurnCount,
        localModelScenario ? 600_000 : REAL_COMPACTION_TIMEOUT_MS);
        if (observerError) throw observerError;
        if (events.some(({ terminalError }) => terminalError)) {
          throw new Error('LIVE_E2E_COMPACTION_AGENT_FLOW_RUNTIME_ERROR');
        }
      };

      await postAndWait(
        `Call read_file exactly once for "${evidenceAPath}" with include_line_numbers=false. ` +
        'Do not call write_file. Learn the task anchor and then respond concisely with EVIDENCE_A_INGESTED ' +
        'plus the exact customer, rollback_action, safety_rule, and verification values.',
        1,
      );
      await postAndWait(
        `Call read_file exactly once for "${evidenceBPath}" with include_line_numbers=false. ` +
        'Do not call write_file. Learn the task anchor and then respond concisely with EVIDENCE_B_INGESTED ' +
        'plus the exact owner, mitigation, rejection_condition, and communication_channel values.',
        2,
      );

      await fs.rm(evidenceAPath, { force: true });
      await fs.rm(evidenceBPath, { force: true });
      const finalInstruction =
        `The evidence files are deleted. Without rereading them, call write_file exactly once with the exact ` +
        `absolute path="${finalArtifactPath}". The content tool argument must be a string containing ` +
        `serialized JSON, not a nested object. Write one valid JSON object with exactly these keys: ` +
        'customer, rollback_action, safety_rule, verification, owner, mitigation, rejection_condition, ' +
        `communication_channel, new_constraint. Use the exact retained values and set new_constraint to ` +
        `"${newConstraint}". Do not write Markdown.`;
      await postAndWait(finalInstruction, 3);

      const finalContent = await fs.readFile(finalArtifactPath, 'utf8');
      const finalArtifact = JSON.parse(finalContent) as Record<string, unknown>;
      const expectedArtifact = {
        ...partA,
        ...partB,
        new_constraint: newConstraint,
      };
      if (
        Object.keys(finalArtifact).length !== Object.keys(expectedArtifact).length
        || Object.entries(expectedArtifact).some(([key, value]) => finalArtifact[key] !== value)
      ) {
        throw new Error('LIVE_E2E_COMPACTION_EXACT_ARTIFACT_MISMATCH');
      }

      const compactionEvents = events
        .filter(({ eventType }) => eventType === AgentRunEventType.COMPACTION_STATUS)
        .map(({ payload }) => payload);
      const phases = compactionEvents.map(({ phase }) => asString(phase)).filter(Boolean);
      const completedCompactions = compactionEvents.filter(({ phase }) => phase === 'completed');
      const tokenEvents = events
        .filter(({ eventType }) => eventType === AgentRunEventType.TOKEN_USAGE_UPDATED)
        .map(({ payload }) => payload);
      const promptTokens = tokenEvents
        .map(({ latest_prompt_tokens }) => asFiniteNumber(latest_prompt_tokens))
        .filter((value): value is number => value !== null);
      const contextWindows = tokenEvents
        .map(({ effective_context_window_tokens }) => asFiniteNumber(effective_context_window_tokens))
        .filter((value): value is number => value !== null);
      const observedPrimaryLlm = primaryLlm as BaseLLM | null;
      if (!observedPrimaryLlm) {
        throw new Error('LIVE_E2E_COMPACTION_PRIMARY_LLM_MISSING');
      }
      const budget = resolveTokenBudget(
        observedPrimaryLlm.model,
        observedPrimaryLlm.config,
        new CompactionPolicy(),
      );
      process.stdout.write(`${JSON.stringify({
        event: 'managed_compaction_budget_probe',
        compactionRatio: REAL_COMPACTION_RATIO,
        promptTokens,
        triggerThresholdTokens: budget?.triggerThresholdTokens ?? null,
        phases,
      })}\n`);
      if (
        completedCompactions.length < 1
        || !phases.includes('requested')
        || !phases.includes('started')
        || phases.includes('failed')
      ) {
        throw new Error('LIVE_E2E_COMPACTION_LIFECYCLE_NOT_COMPLETED');
      }

      const triggerThresholdTokens = budget?.triggerThresholdTokens ?? 0;
      const effectiveContextWindowTokens = budget?.effectiveContextCapacity ?? 0;
      if (
        budget?.compactionRatio !== REAL_COMPACTION_RATIO
        || triggerThresholdTokens <= 0
        || effectiveContextWindowTokens <= 0
        || !contextWindows.includes(effectiveContextWindowTokens)
        || !promptTokens.some((tokens) => tokens < triggerThresholdTokens)
        || !promptTokens.some((tokens) => tokens >= triggerThresholdTokens)
      ) {
        throw new Error('LIVE_E2E_COMPACTION_BUDGET_EVIDENCE_INVALID');
      }

      const compactionAgentDefinitionIds = completedCompactions
        .map(({ compaction_agent_definition_id }) => asString(compaction_agent_definition_id));
      const compactionModelIdentifiers = completedCompactions
        .map(({ compaction_model_identifier }) => asString(compaction_model_identifier));
      const compactionRunIds = completedCompactions
        .map(({ compaction_run_id }) => asString(compaction_run_id));
      if (
        compactionAgentDefinitionIds.some((id) => id !== MEMORY_COMPACTOR_AGENT_DEFINITION_ID)
        || compactionModelIdentifiers.some((id) => id !== modelIdentifier)
        || compactionRunIds.some((id) => id === null)
        || compactionRunIds.length !== completedCompactions.length
      ) {
        throw new Error('LIVE_E2E_CANONICAL_COMPACTOR_EXECUTION_METADATA_INVALID');
      }

      const successfulTools = events.filter(
        ({ eventType }) => eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      );
      const failedTools = events.filter(
        ({ eventType }) => eventType === AgentRunEventType.TOOL_EXECUTION_FAILED,
      );
      const successfulToolNames = successfulTools
        .map(({ payload }) => asString(payload.tool_name))
        .filter((value): value is string => value !== null);
      if (
        successfulToolNames.filter((name) => name === 'read_file').length !== 2
        || successfulToolNames.filter((name) => name === 'write_file').length !== 1
        || successfulTools.length !== 3
        || failedTools.length !== 0
      ) {
        throw new Error('LIVE_E2E_COMPACTION_TOOL_SEQUENCE_INVALID');
      }

      const memoryStore = new FileMemoryStore(memoryDirectory, runId, {
        agentRootSubdir: '',
      });
      const episodes = memoryStore.list(MemoryType.EPISODIC)
        .map((item) => item.toDict());
      const semanticFacts = memoryStore.list(MemoryType.SEMANTIC)
        .map((item) => item.toDict());
      if (
        memoryStore.readArchiveRawTraces().length < 1
        || episodes.length < 1
      ) {
        throw new Error('LIVE_E2E_COMPACTION_PERSISTENCE_MISSING');
      }
      const lineageStore = new FileCompactionLineageStore(memoryStore.agentDir, {
        targetKind: 'agent_run',
        runId,
        memberId: null,
      });
      const lineageRecords = lineageStore.list();
      const promptContractVersions = lineageRecords
        .map(({ execution }) => execution.promptContractVersion);
      if (
        lineageRecords.length !== completedCompactions.length
        || promptContractVersions.some((version) => version !== 2)
      ) {
        throw new Error('LIVE_E2E_COMPACTION_LINEAGE_COUNT_MISMATCH');
      }

      const capturedInvocations = invocationCapture?.invocations ?? [];
      const finalInvocation = [...capturedInvocations].reverse().find(({ messages }) =>
        messages.some(({ role, content }) =>
          role === MessageRole.USER && content?.includes(finalArtifactPath)));
      if (!finalInvocation) {
        throw new Error('LIVE_E2E_COMPACTION_FINAL_INVOCATION_NOT_CAPTURED');
      }
      const projectedCompactedMemoryUserRegion = extractConstituent(
        finalInvocation,
        'compacted_memory',
      );
      const nextCurrentUserRegion = extractConstituent(
        finalInvocation,
        'current_user',
        finalInstruction,
      );
      const projectedInvocation = JSON.stringify(finalInvocation);
      const compactedAnchorValues = Object.values(partA);
      const activeAnchorValues = Object.values(partB);
      const expectedAnchorValues = [...compactedAnchorValues, ...activeAnchorValues];
      process.stdout.write(`${JSON.stringify({
        event: 'product_compactor_quality_probe',
        requestedModelIdentifier: this.scenario.model,
        modelIdentifier,
        compactionRatio: REAL_COMPACTION_RATIO,
        completedCompactionCount: completedCompactions.length,
        compactionAgentDefinitionIds,
        compactionRunIds,
        promptContractVersions,
        canonicalCompactorPromptSha256: canonicalCompactor.promptSha256,
        persistedMemory: {
          episodes,
          semanticFacts,
        },
        projectedCompactedMemoryUserRegion,
        nextCurrentUserRegion,
        anchorPresence: Object.fromEntries(expectedAnchorValues.map((anchor) => [
          anchor,
          projectedCompactedMemoryUserRegion?.includes(anchor) ?? false,
        ])),
        projectedInvocationAnchorPresence: Object.fromEntries(expectedAnchorValues.map((anchor) => [
          anchor,
          projectedInvocation.includes(anchor),
        ])),
        exactContinuationArtifact: finalArtifact,
      })}\n`);
      if (
        !projectedCompactedMemoryUserRegion
        || !projectedCompactedMemoryUserRegion.includes(
          'You are continuing an ongoing task. Here is a concise summary of earlier work',
        )
        || /"record_type"\s*:/u.test(projectedCompactedMemoryUserRegion)
        || nextCurrentUserRegion !== finalInstruction
        || compactedAnchorValues.some((anchor) =>
          !projectedCompactedMemoryUserRegion.includes(anchor))
        || expectedAnchorValues.some((anchor) => !projectedInvocation.includes(anchor))
      ) {
        throw new Error('LIVE_E2E_COMPACTION_PROJECTED_CONTINUATION_QUALITY_INVALID');
      }

      return {
        scenarioId: this.scenarioId,
        capability: 'agent-compaction-turns',
        status: 'PASSED',
        modelIdentifier,
        effectiveContextWindowTokens,
        compactionRatio: REAL_COMPACTION_RATIO,
        triggerThresholdTokens,
        observedBelowThreshold: true,
        observedAtOrAboveThreshold: true,
        completedCompactionCount: completedCompactions.length,
        promptContractVersions: promptContractVersions as 2[],
        successfulToolCount: successfulTools.length,
        recoverableToolFailureCount: failedTools.length,
        exactRetainedArtifactVerified: true,
        projectedMemoryAndCurrentUserVerified: true,
        qualityEvidence: {
          persistedMemory: {
            episodes,
            semanticFacts,
          },
          projectedCompactedMemoryUserRegion,
          nextCurrentUserRegion,
        },
        canonicalCompactorAgentUsed: true,
        canonicalCompactorPromptSha256: canonicalCompactor.promptSha256,
        managedSecretResolverUsed: this.scenario.requiredSecretId !== null,
      };
    } finally {
      unsubscribe();
      if (backend) await backend.terminate().catch(() => undefined);
      await workspace.close();
      await fs.rm(ownedRoot, { recursive: true, force: true });
    }
  }

  private async resolveScenarioModelIdentifier(): Promise<string> {
    if (!this.scenario.model) {
      throw new Error('LIVE_E2E_SCENARIO_MODEL_REQUIRED');
    }
    if (this.scenario.providerId !== 'LMSTUDIO') {
      return this.scenario.model;
    }
    await LLMFactory.reloadModels(LLMProvider.LMSTUDIO);
    const matches = (await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO))
      .filter((model) => model.value === this.scenario.model);
    if (matches.length !== 1) {
      throw new Error('LIVE_E2E_LOCAL_MODEL_UNAVAILABLE');
    }
    return matches[0]!.model_identifier;
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

  async createLlm(
    modelIdentifier: string,
    configInput?: Record<string, unknown>,
  ) {
    const gemini = await LLMFactory.requiresGeminiRuntimeResolver(modelIdentifier);
    return LLMFactory.createLLM(
      modelIdentifier,
      configInput,
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
      if (!databaseTargetsMatch(
        config.getOperationalDatabaseLocation(),
        tracked.database,
      )) {
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
    if (scenario.providerId === 'LMSTUDIO' && scenario.requiredSecretId === null) {
      await LLMFactory.reloadModels(LLMProvider.LMSTUDIO);
      const configured = (await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO))
        .some((model) => model.value === scenario.model);
      return {
        scenarioId,
        health: configured ? 'READY' : 'UNAVAILABLE',
        configured: configured && scenario.model ? [`local-model.${scenario.model}`] : [],
        missing: [],
        instructionCode: configured ? null : 'LOCAL_MODEL_UNAVAILABLE',
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
    if (!scenario.requiredSecretId) {
      throw new Error('LIVE_E2E_REQUIRED_SECRET_ID_MISSING');
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
