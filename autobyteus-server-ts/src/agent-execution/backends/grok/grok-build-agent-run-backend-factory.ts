import type { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../../skills/services/skill-service.js";
import type { AgentToolMcpRunSessionActivator } from "../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { grokBuildLaunchProfile } from "../../../runtime-management/grok/grok-build-launch-profile.js";
import {
  AcpAgentRunBackendFactory,
  type AcpWorkingDirectoryResolver,
} from "../acp/backend/acp-agent-run-backend-factory.js";
import { grokBuildSessionProfile } from "./grok-build-session-profile.js";
import { getGrokWorkspaceSkillMaterializer } from "./grok-workspace-skill-materializer.js";

/** Binds the shared ACP backend factory to the Grok Build launch and session profiles. */
export const createGrokBuildAgentRunBackendFactory = (input: Readonly<{
  definitions: AgentDefinitionService;
  skills: SkillService;
  workspaces: AcpWorkingDirectoryResolver;
  mcpSessions: AgentToolMcpRunSessionActivator;
}>): AcpAgentRunBackendFactory => new AcpAgentRunBackendFactory({
  launchProfile: grokBuildLaunchProfile,
  sessionProfile: grokBuildSessionProfile,
  definitions: input.definitions,
  skills: input.skills,
  workspaces: input.workspaces,
  mcpSessions: input.mcpSessions,
  skillMaterializer: getGrokWorkspaceSkillMaterializer(),
});
