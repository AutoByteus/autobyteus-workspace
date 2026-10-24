import { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import type { ApplicationPlatformHostManagementContracts } from "../application-platform/runtime/application-platform-runtime-contracts.js";
import type { CodexAppServerClientManager } from "../runtime-management/codex/client/codex-app-server-client-manager.js";
import { AgentRuntimeSignInReader } from "../runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";
import {
  AgentRuntimeStatusService, configureAgentRuntimeStatusService,
} from "../runtime-management/agent-runtimes/agent-runtime-status-service.js";
import type { AgentRuntimeKind } from "../runtime-management/agent-runtimes/agent-runtime-types.js";
import { createAgentRuntimeStrategies } from "../runtime-management/agent-runtimes/strategies/create-agent-runtime-strategies.js";

export type AgentRuntimeStatusHandle = Readonly<{ service: AgentRuntimeStatusService; close(): Promise<void> }>;

/** Standalone, team and Org member agents of the process `AgentRunManager` running on `runtimeKind`. */
const countProcessAgentRuns = (runtimeKind: AgentRuntimeKind): number => {
  const manager = AgentRunManager.getInstance();
  let count = 0;
  for (const runId of manager.listActiveRuns()) {
    if (manager.getActiveRun(runId)?.runtimeKind === runtimeKind) count += 1;
  }
  return count;
};

/**
 * Settings → Agent Runtimes for the studio server: the status service with its sign-in reader
 * (the same Codex client manager as agent runs) and the running-agent count across the process
 * and the application platform (SR-011). Bound for the GraphQL resolver until `close()`.
 */
export const composeAgentRuntimeStatus = (input: Readonly<{
  codexClientManager: CodexAppServerClientManager;
  applicationActiveAgentRuns: ApplicationPlatformHostManagementContracts["activeAgentRuns"];
}>): AgentRuntimeStatusHandle => {
  const strategies = createAgentRuntimeStrategies({ codexClientManager: input.codexClientManager });
  const service = new AgentRuntimeStatusService({
    strategies,
    signInReader: new AgentRuntimeSignInReader(strategies),
    countRunningAgents: (runtimeKind) =>
      countProcessAgentRuns(runtimeKind) + input.applicationActiveAgentRuns.countByRuntimeKind(runtimeKind),
  });
  const binding = configureAgentRuntimeStatusService(service);
  return Object.freeze({ service, close: () => binding.close() });
};
