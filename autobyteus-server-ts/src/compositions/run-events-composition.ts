import { randomUUID } from "node:crypto";
import { getActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { RunRuntimeSwitcher } from "../agent-collaboration/execution/services/run-runtime-switcher.js";
import type { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { configureModelBlockedReading } from "../agent-execution/backends/shared/late-usage-limit-classification.js";
import { AgentRunEventType } from "../agent-execution/domain/agent-run-event.js";
import { USAGE_LIMIT_NOTICE_SENDER_ID } from "../agent-execution/domain/system-task-notification-senders.js";
import { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import { findAvailableAgentRuntimesService } from "../available-agent-runtimes/available-agent-runtimes-service.js";
import type { NodeRuntimesReading } from "../available-agent-runtimes/available-agent-runtimes-report.js";
import { readUsageLimitSwitchEnabled } from "../model-routing/model-routing-settings.js";
import { FallbackChooser } from "../model-routing/services/fallback-chooser.js";
import { findModelRouting } from "../model-routing/services/model-routing-binding.js";
import { SwitchRecordLog, switchRecordLogDir } from "../model-routing/stores/switch-record-log.js";
import { UsageLimitDetector } from "../run-events/detectors/usage-limit-detector.js";
import { RuntimeExhaustionView } from "../run-events/listeners/runtime-exhaustion-view.js";
import { UsageLimitSwitchListener } from "../run-events/listeners/usage-limit-switch-listener.js";
import { RunEventHub } from "../run-events/run-event-hub.js";
import { RunEventLog } from "../run-events/run-event-log.js";
import { configureFallbackLaunch, configureRuntimeExhaustion } from "../launch-preferences/launch-fallback-ports.js";
import { AgentMemoryLayout } from "../agent-memory/store/agent-memory-layout.js";
import { AgentLaunchHistory } from "../run-history/services/agent-launch-history.js";
import { AgentRunHistoryIndexStore } from "../run-history/store/agent-run-history-index-store.js";
import { AgentRunMetadataStore } from "../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../run-history/store/team-run-history-index-store.js";
import type { RuntimeKind } from "../runtime-management/runtime-kind-enum.js";
import type { CollaborationRootResolver } from "./collaboration-root-resolver.js";

/** How long a switch waits for a run still in its turn to become idle before it is recorded as failed. */
const NEXT_IDLE_WAIT_MS = 2 * 60 * 1000;

const readNodeRuntimes = (): Promise<NodeRuntimesReading> => {
  const service = findAvailableAgentRuntimesService();
  return service ? service.readWithSignIn() : Promise.reject(new Error("the runtime report is not composed on this server"));
};

/** C-8's sources: the agent and Team history indexes, an Agent run's metadata and a Team's tree, read when needed. */
const launchHistory = (memoryDir: string): AgentLaunchHistory => {
  const layout = new AgentMemoryLayout(memoryDir);
  const metadata = new AgentRunMetadataStore(memoryDir);
  const trees = new TeamRunExecutionTreeStore();
  return new AgentLaunchHistory({
    agentRows: () => new AgentRunHistoryIndexStore(memoryDir).listRows(),
    agentLaunch: async (runId) => {
      const stored = await metadata.readMetadata(runId);
      return stored ? { runtimeKind: stored.runtimeKind, llmModelIdentifier: stored.llmModelIdentifier } : null;
    },
    teamRows: async () => (await new TeamRunHistoryIndexStore(memoryDir).readIndexStrict()).rows,
    teamMembers: async (teamRunId) => {
      const tree = await trees.read(layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId);
      return (tree?.rootTeam.members ?? []).flatMap((member) => member.agentDefinitionId && member.launchConfiguration.runtimeKind
        && member.launchConfiguration.llmModelIdentifier
        ? [{ agentDefinitionId: member.agentDefinitionId, runtimeKind: member.launchConfiguration.runtimeKind,
          llmModelIdentifier: member.launchConfiguration.llmModelIdentifier }]
        : []);
    },
  });
};

/** Resolves true at the run's next idle status, false when it does not come within the wait or the run is gone. */
const nextIdle = (agentRunId: string): Promise<boolean> => new Promise((resolve) => {
  const run = AgentRunManager.getInstance().getActiveRun(agentRunId);
  if (!run) { resolve(false); return; }
  let settled = false;
  const settle = (idle: boolean) => { if (settled) return; settled = true; clearTimeout(timer); unsubscribe(); resolve(idle); };
  const timer = setTimeout(() => settle(false), NEXT_IDLE_WAIT_MS);
  timer.unref?.();
  const unsubscribe = run.subscribeToEvents((event) => {
    if (event.eventType === AgentRunEventType.AGENT_STATUS && (event.payload.status === "idle" || event.payload.new_status === "idle")) settle(true);
  });
});

/**
 * The run event hub (autobyteus-646 C-1) for the studio server, in two steps. `composeRunEvents`, before the run
 * supervisor: the hub and its log, the exhaustion view (loaded from the log, then kept current, listening first), and the
 * usage-limit detector for the platform notice fan-out. `startSwitching`, once the roots and Model Routing are composed:
 * the switch listener with its chooser, switcher and switch records. Nothing is replayed: an event before a listener
 * subscribes is in the log only.
 */
export const composeRunEvents = async (input: Readonly<{ appDataDir: string }>) => {
  const eventLog = new RunEventLog({ appDataDir: input.appDataDir });
  // R-14: sealed files past the retention go at startup (and after each seal).
  await eventLog.removeExpired().catch((error: unknown) => console.warn(`Run events: old log files could not be removed: ${String(error)}`));
  const hub = new RunEventHub({ log: eventLog });
  const exhaustion = new RuntimeExhaustionView({ log: eventLog });
  await exhaustion.load().catch((error: unknown) => console.warn(`Run events: the usage limits in force could not be read: ${String(error)}`));
  const unsubscribeExhaustion = hub.subscribe("usage_limit_reached", (event) => exhaustion.record(event));
  // R-2: delegation's launch check reads exhaustion always.
  const exhaustionBinding = configureRuntimeExhaustion(exhaustion);
  // R-16: the backends without a usage-limit signal classify by their runtime's limits read after a terminal error.
  const blockedReadingBinding = configureModelBlockedReading({ isModelBlocked: async (runtimeKind, llmModelIdentifier) => {
    const entry = await findAvailableAgentRuntimesService()?.readRuntime(runtimeKind);
    return Boolean(entry && Array.isArray(entry.models) && entry.models.find((model) => model.id === llmModelIdentifier)?.blocked);
  } });
  let historyBinding: Readonly<{ close(): void }> | null = null;
  const detector = new UsageLimitDetector({
    publish: (event) => hub.publish(event),
    roots: getActiveCollaborationRootDirectory(),
    runtimes: { readRuntime: (kind) => findAvailableAgentRuntimesService()?.readRuntime(kind) ?? Promise.resolve(null) },
  });
  let unsubscribeSwitching: (() => void) | null = null;

  const startSwitching = (wiring: Readonly<{
    appDataDir: string; memoryDir: string; rootResolver: CollaborationRootResolver;
    agentDefinitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  }>): FallbackChooser => {
    const switchRecords = new SwitchRecordLog({ dir: switchRecordLogDir(wiring.appDataDir) });
    void switchRecords.removeExpired().catch((error: unknown) => console.warn(`Switch records: old log files could not be removed: ${String(error)}`));
    const chooser = new FallbackChooser({
      readNodeRuntimes, exhaustion, history: launchHistory(wiring.memoryDir), switchRecords,
      router: { requestSwitch: (request) => findModelRouting()?.router.requestSwitch(request)
        ?? Promise.resolve({ kind: "failed" as const, reason: "Model Routing is not available on this server" }) },
    });
    const switcher = new RunRuntimeSwitcher({
      roots: getActiveCollaborationRootDirectory(),
      liveRoot: (root) => {
        const resolved = wiring.rootResolver.resolveActive(root);
        return resolved && resolved.kind !== "agent_org" ? resolved.root : null;
      },
    });
    const listener = new UsageLimitSwitchListener({
      enabled: () => readUsageLimitSwitchEnabled(),
      describeRun: async (agentRunId) => {
        const run = AgentRunManager.getInstance().getActiveRun(agentRunId);
        if (!run) return null;
        const definition = await wiring.agentDefinitions.getAgentDefinitionById(run.config.agentDefinitionId).catch(() => null);
        return { agentDefinitionId: run.config.agentDefinitionId, agentName: definition?.name ?? run.config.agentDefinitionId,
          agentDescription: definition?.description?.trim() || null };
      },
      chooser,
      switcher: { switchAgentRuntime: (agentRunId, action) => switcher.switchAgentRuntime(agentRunId,
        { ...action, launch: { ...action.launch, runtimeKind: action.launch.runtimeKind as RuntimeKind } }) },
      nextIdle,
      exhaustion,
      showNotice: async (agentRunId, notice) => {
        const run = AgentRunManager.getInstance().getActiveRun(agentRunId);
        if (!run) return;
        await run.publishEvent({ eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: agentRunId, statusHint: null,
          payload: { sender_id: USAGE_LIMIT_NOTICE_SENDER_ID, content: notice.text, message_id: notice.messageId ?? randomUUID(),
            ...(notice.turnId ? { turn_id: notice.turnId } : {}) } });
      },
      records: switchRecords,
    });
    unsubscribeSwitching = hub.subscribe("usage_limit_reached", (event) => listener.handle(event));
    // R-2, R-17: delegation's layers after an exhausted skip (this agent's history, then the node fallback).
    historyBinding = configureFallbackLaunch({ fallbackLaunch: async (agentDefinitionId, withNodeFallback) => {
      const chosen = await chooser.fallbackLaunch(agentDefinitionId, withNodeFallback);
      return chosen && chosen.chosenBy !== "model_router" ? { ...chosen.launch, chosenBy: chosen.chosenBy } : null;
    } });
    return chooser;
  };

  return Object.freeze({
    hub, exhaustion, detector, startSwitching,
    close: () => { unsubscribeSwitching?.(); unsubscribeExhaustion(); historyBinding?.close(); exhaustionBinding.close(); blockedReadingBinding.close(); },
  });
};
