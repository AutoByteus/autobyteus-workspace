import { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import type { ApplicationPlatformHostManagementContracts } from "../application-platform/runtime/application-platform-runtime-contracts.js";
import type { CodexAppServerClientManager } from "../runtime-management/codex/client/codex-app-server-client-manager.js";
import { AgentRuntimeSignInReader } from "../runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";
import {
  AgentRuntimeStatusService, configureAgentRuntimeStatusService,
} from "../runtime-management/agent-runtimes/agent-runtime-status-service.js";
import type { AgentRuntimeKind } from "../runtime-management/agent-runtimes/agent-runtime-types.js";
import { createAgentRuntimeStrategies } from "../runtime-management/agent-runtimes/strategies/create-agent-runtime-strategies.js";
import {
  AvailableAgentRuntimesService, configureAvailableAgentRuntimesService,
} from "../runtime-management/agent-runtimes/available-agent-runtimes-service.js";
import { getModelCatalogService } from "../llm-management/services/model-catalog-service.js";
import { getLlmProviderService } from "../llm-management/llm-providers/services/llm-provider-service.js";
import { createProviderUsageReaders } from "../llm-management/provider-usage/provider-usage-readers.js";

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
 * and the application platform (SR-011). Also "what can run on this node now" (autobyteus-303) from the same
 * strategies and sign-in reader, for `list_available_agent_runtimes` and Settings → Model Routing. Both are bound
 * for their callers until `close()`.
 */
export const composeAgentRuntimeStatus = (input: Readonly<{
  codexClientManager: CodexAppServerClientManager;
  applicationActiveAgentRuns: ApplicationPlatformHostManagementContracts["activeAgentRuns"];
}>): AgentRuntimeStatusHandle => {
  const strategies = createAgentRuntimeStrategies({ codexClientManager: input.codexClientManager });
  const signInReader = new AgentRuntimeSignInReader(strategies);
  const service = new AgentRuntimeStatusService({
    strategies,
    signInReader,
    countRunningAgents: (runtimeKind) =>
      countProcessAgentRuns(runtimeKind) + input.applicationActiveAgentRuns.countByRuntimeKind(runtimeKind),
  });
  const binding = configureAgentRuntimeStatusService(service);
  const availableBinding = configureAvailableAgentRuntimesService(new AvailableAgentRuntimesService({
    strategies,
    signInReader,
    modelCatalog: getModelCatalogService(),
    providerCredentials: getLlmProviderService(),
    providerUsageReaders: createProviderUsageReaders(),
  }));
  return Object.freeze({
    service,
    close: async () => {
      availableBinding.close();
      await binding.close();
    },
  });
};
