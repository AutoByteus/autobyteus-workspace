import { vi } from "vitest";
import type { AgentRunBackend, AgentRunSourceEventBatchListener } from "../../src/agent-execution/backends/agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../src/agent-execution/backends/agent-run-backend-factory.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType } from "../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunManager } from "../../src/agent-execution/services/agent-run-manager.js";
import { AgentRunActivationRegistry } from "../../src/agent-execution/runtime/agent-run-activation-registry.js";
import { AgentRunResourceManager } from "../../src/agent-execution/services/agent-run-resource-manager.js";
import { AgentRunMemoryRecorder } from "../../src/agent-memory/services/agent-run-memory-recorder.js";
import { AgentConversationActivityInspector } from "../../src/agent-memory/services/agent-conversation-activity-inspector.js";
import { RootedAgentMemoryLocator } from "../../src/agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { ActiveCollaborationRootDirectory } from "../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { FlatTeamExecutionFactory } from "../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { AgentOrgExecutionScopeBuilder } from "../../src/agent-org-execution/services/agent-org-execution-scope-builder.js";
import { AgentOrgRunManager } from "../../src/agent-org-execution/services/agent-org-run-manager.js";
import { createNoopAgentToolMcpRunSessionDeactivator } from "../fixtures/agent-tool-mcp-run-session-deactivator-fixtures.js";
import type { TokenUsageRunStore } from "../../src/token-usage/providers/token-usage-run-store.js";
import { buildCurrentTokenUsagePayload } from "./token-usage-run-record-fixtures.js";

export const retainedThread = "isolated-retained-provider-thread";
export const migrationUsage = (ordinal: number) => buildCurrentTokenUsagePayload({
  runId: "org-lead", rootTeamRunId: ordinal === 1 ? "org" : null,
  eventId: `usage-${ordinal}`, idempotencyKey: `usage-${ordinal}`,
  observedAt: `2026-09-01T00:00:0${ordinal}.000Z`, runtimeKind: "codex_app_server", ingestionKind: "codex_thread_token_usage",
  usageScope: "cumulative_snapshot", snapshotSeriesKey: `codex_thread:${retainedThread}`,
  sourceInputTokens: ordinal * 100, sourceOutputTokens: ordinal * 20,
  inputTokens: ordinal * 100, outputTokens: ordinal * 20,
  inputCost: 0.0123, outputCost: 0.0234, totalCost: 0.0357,
});

/** Only the external provider backend is scripted; no fake Org, AgentRun, scope, token fold or presentation adapter. */
export const createMigrationContinuationRuntime = (memoryDir: string, store: TokenUsageRunStore) => {
  const received: string[] = [];
  const restored: AgentRunContext<RuntimeAgentRunContext>[] = [];
  const tasks = new Set<Promise<void>>();
  const failures: unknown[] = [];
  const restoreBackend = vi.fn(async (context: AgentRunContext<RuntimeAgentRunContext>): Promise<AgentRunBackend> => {
    restored.push(context);
    let active = true, listener: AgentRunSourceEventBatchListener | null = null, ordinal = 0;
    return {
      runId: context.runId, runtimeKind: context.config.runtimeKind, inputCapabilities: { activeTurnAppend: "unsupported" },
      getContext: () => context, getPlatformAgentRunId: () => retainedThread, isActive: () => active,
      getLifecycleSnapshot: () => ({ availability: active ? "active" : "offline", phase: active ? "running" : "idle", currentTurn: { kind: "NONE" } }),
      subscribeToSourceEventBatches: (next) => { listener = next; return () => { listener = null; }; },
      dispatchUserInput: async (dispatch) => {
        received.push(dispatch.message.content);
        const turnId = `continued-turn-${++ordinal}`;
        // Simulate asynchronous provider return after input forwarding; emit the saved
        // cumulative observation first, then an advancing observation and response.
        const work = new Promise<void>((resolve) => setTimeout(resolve, 0)).then(async () => {
          const event = (eventType: AgentRunEventType, payload: Record<string, unknown>) => ({ eventType, payload, runId: context.runId, statusHint: null });
          await listener?.([event(AgentRunEventType.TURN_STARTED, { turn_id: turnId }),
            event(AgentRunEventType.TOKEN_USAGE_UPDATED, { ...migrationUsage(ordinal), root_team_run_id: null }),
            event(AgentRunEventType.ASSISTANT_COMPLETE, { content: `Continued response ${ordinal}`, turn_id: turnId }),
            event(AgentRunEventType.TURN_COMPLETED, { turn_id: turnId })]);
        }).catch((error) => { failures.push(error); });
        tasks.add(work); void work.finally(() => tasks.delete(work));
        return { forwarded: true, turnId, platformAgentRunId: retainedThread };
      },
      approveToolInvocation: async () => ({ accepted: true }), interrupt: async () => ({ accepted: true }),
      terminate: async () => { active = false; await Promise.all(tasks); return { accepted: true }; },
    };
  });
  const unavailable = async (): Promise<never> => { throw new Error("Unexpected new provider conversation or task activation"); };
  const factory: AgentRunBackendFactory = { restoreBackend, createBackend: unavailable };
  const recorder = new AgentRunMemoryRecorder();
  const sessions = createNoopAgentToolMcpRunSessionDeactivator();
  const noAttachment = { attachToRun: () => () => undefined };
  const agentManager = new AgentRunManager({
    autoByteusBackendFactory: factory, codexBackendFactory: factory, claudeBackendFactory: factory,
    agyBackendFactory: factory,
    memoryRecorder: recorder, agentToolMcpRunSessionDeactivator: sessions,
    providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
    activationRegistry: new AgentRunActivationRegistry(new AgentRunResourceManager({ runSessions: sessions,
      memoryRecorder: recorder, runFileChangeService: noAttachment as never, publishedArtifactRelayService: noAttachment as never })),
  });
  const dependencies = { agentRunManager: agentManager, memoryLocator: new RootedAgentMemoryLocator({ memoryDir }),
    activityInspector: new AgentConversationActivityInspector() };
  const manager = new AgentOrgRunManager({ memoryDir, tokenUsageRunStore: store,
    activeRootDirectory: new ActiveCollaborationRootDirectory(),
    scopeBuilder: new AgentOrgExecutionScopeBuilder({ ...dependencies,
      flatTeamExecutionFactory: new FlatTeamExecutionFactory(dependencies),
      orgDefinitions: { getDefinitionById: unavailable }, teamDefinitions: { getDefinitionById: unavailable },
      taskExecutionIdentity: { agentRuns: { allocateForAgentDefinition: unavailable }, taskTeams: { create: unavailable } } as never,
    }),
  });
  return { manager, agentManager, recorder, received, restored, failures, restoreBackend };
};
