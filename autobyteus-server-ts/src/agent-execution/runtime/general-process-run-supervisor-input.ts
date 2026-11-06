import type { IntegrationRunAccess } from "../../credential-proxy/integration-run-access.js";
import type { ProviderRelayAccess } from "../../credential-proxy/provider-relays/provider-relay-access.js";
import type { RunPassRevocation } from "../../credential-proxy/run-pass-revocation.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { AgentOrgDefinitionService } from "../../agent-org-definition/services/agent-org-definition-service.js";
import type { AgentProviderFactoryBuilder } from "../providers/agent-provider-factory-builder.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { ContextFilePathEnvironment } from "../../context-files/domain/context-file-path-environment.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { RunModelSelectionValidator, RunModelSelectionService } from "../../llm-management/services/run-model-selection-service.js";
import type { DefinitionAdmissionService } from "../../collaboration-definition-admission/services/definition-admission-service.js";
import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { RuntimeSwitching } from "../domain/runtime-switch-memory-port.js";
import type { AgentRunInputPreface } from "../domain/agent-run-input-preface.js";
import type { AgentRunLifecycleObserver } from "../domain/agent-run-lifecycle-observer.js";

/** What the host composition gives the general process run supervisor: its definitions, owners and dispositions. */
export type GeneralProcessRunSupervisorInput = Readonly<{
  memoryDir: string;
  contextFilePathEnvironment: ContextFilePathEnvironment;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentOrgDefinitionService: AgentOrgDefinitionService;
  definitionAdmissionService: DefinitionAdmissionService;
  workspaceManager: WorkspaceManager;
  agentProviderFactoryBuilder: AgentProviderFactoryBuilder;
  agentToolMcpSessionAuthority: ScopedAgentToolMcpSessionAuthority;
  /**
   * The studio's credential proxy: runs of allowed agents get its variables; their passes end at release. `null`
   * (the standalone application host): its runs get no integration access in this step.
   */
  integrationRunAccess: IntegrationRunAccess | null;
  /** The studio's provider relays for runtimes that call their model through one (`null`: no credential proxy here). */
  providerRelayAccess: ProviderRelayAccess | null;
  /** Ends a run's pass at release and on a failed activation; from the same proxy host, non-null whenever an access is. */
  runPasses: RunPassRevocation | null;
  modelSelectionValidator: RunModelSelectionValidator & Pick<RunModelSelectionService, "listOptions" | "listOptionsMany">;
  /** Neutral Task agent resource port from the host composition, forwarded to every root builder. */
  taskExecutionResources: TaskExecutionResourcePort;
  /**
   * Platform notices that ride along with each run's next external input, told when runs are
   * published and released (the host composition owns and closes it). None by default.
   */
  platformInputNotices?: (AgentRunInputPreface & AgentRunLifecycleObserver) | null;
  /**
   * The memory and hand-over notice ports of an agent runtime switch (autobyteus-316), forwarded to the standalone lifecycle.
   * None (the application host): a lifecycle without them fails closed on a pending switch.
   */
  runtimeSwitching?: RuntimeSwitching | null;
}>;

/** The supervisor's construction input, refused whole before any manager is touched. */
export const requireGeneralProcessRunSupervisorInput = (
  input: GeneralProcessRunSupervisorInput | null | undefined,
): GeneralProcessRunSupervisorInput => {
  if (
    !input
    || typeof input.memoryDir !== "string"
    || !input.memoryDir.trim()
    || !input.contextFilePathEnvironment
    || typeof input.contextFilePathEnvironment.appDataDir !== "string"
    || !input.contextFilePathEnvironment.appDataDir.trim()
    || typeof input.contextFilePathEnvironment.baseUrl !== "string"
    || !input.contextFilePathEnvironment.baseUrl.trim()
    || !input.agentDefinitionService
    || !input.agentTeamDefinitionService
    || !input.agentOrgDefinitionService
    || !input.definitionAdmissionService
    || !input.workspaceManager
    || !input.agentProviderFactoryBuilder
    || !input.agentToolMcpSessionAuthority
    || input.integrationRunAccess === undefined
    || input.providerRelayAccess === undefined
    || input.runPasses === undefined
    || ((input.integrationRunAccess || input.providerRelayAccess) && !input.runPasses)
    || !input.modelSelectionValidator
    || typeof input.modelSelectionValidator.validate !== "function"
    || typeof input.modelSelectionValidator.listOptions !== "function"
    || !input.taskExecutionResources
  ) {
    throw new Error("Complete GeneralProcessRunSupervisor input is required.");
  }
  return input;
};
