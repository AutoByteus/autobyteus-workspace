import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import type { IntegrationRunAccess } from "../../../credential-proxy/integration-run-access.js";
import type { ProviderRelayAccess } from "../../../credential-proxy/provider-relays/provider-relay-access.js";
import type { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import { SkillService } from "../../../skills/services/skill-service.js";
import type { AgentToolMcpRunSessionActivator, AgentToolMcpRunSessionExposure } from "../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import {
  deepSeekHarnessLaunchProfile,
  DSH_WORKSPACE_SKILLS_SEGMENTS,
} from "../../../runtime-management/deepseek-harness/deepseek-harness-launch-profile.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import {
  AcpAgentRunBackendFactory,
  type AcpWorkingDirectoryResolver,
} from "../acp/backend/acp-agent-run-backend-factory.js";
import { WorkspaceSkillMaterializer } from "../shared/workspace-skill-materializer.js";
import { deepSeekHarnessSessionProfile } from "./deepseek-harness-session-profile.js";

let cachedSkillMaterializer: WorkspaceSkillMaterializer | null = null;

/** dsh's skills are linked under `<workspace>/.dsh/skills`, the one skills folder its launch gives it (DEC-008). */
const getDeepSeekHarnessWorkspaceSkillMaterializer = (): WorkspaceSkillMaterializer => {
  cachedSkillMaterializer ??= new WorkspaceSkillMaterializer({
    runtimeLabel: agentRuntimeName(RuntimeKind.DEEPSEEK_HARNESS),
    workspaceSkillsRootSegments: [...DSH_WORKSPACE_SKILLS_SEGMENTS],
  }, { resolveManagedSkill: (sourceId, name) => SkillService.getInstance().resolveManagedSkillForMaterialization(sourceId, name) });
  return cachedSkillMaterializer;
};

/** Binds the shared ACP backend factory to the DeepSeek Harness launch and session profiles. */
export const createDeepSeekHarnessAgentRunBackendFactory = (input: Readonly<{
  definitions: AgentDefinitionService;
  skills: SkillService;
  workspaces: AcpWorkingDirectoryResolver;
  mcpSessions: AgentToolMcpRunSessionActivator & AgentToolMcpRunSessionExposure;
  integrationRunAccess: IntegrationRunAccess | null;
  /** `null`: this host runs no credential proxy, so dsh runs are refused before dsh starts (DEC-020). */
  providerRelayAccess: ProviderRelayAccess | null;
}>): AcpAgentRunBackendFactory => new AcpAgentRunBackendFactory({
  launchProfile: deepSeekHarnessLaunchProfile,
  sessionProfile: deepSeekHarnessSessionProfile,
  definitions: input.definitions,
  skills: input.skills,
  workspaces: input.workspaces,
  mcpSessions: input.mcpSessions,
  skillMaterializer: getDeepSeekHarnessWorkspaceSkillMaterializer(),
  integrationRunAccess: input.integrationRunAccess,
  providerRelayAccess: input.providerRelayAccess,
});
