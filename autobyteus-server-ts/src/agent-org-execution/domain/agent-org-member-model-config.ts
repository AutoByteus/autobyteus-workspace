import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { RunModelConfigEditability, RunModelConfigUpdateResult } from "../../run-history/domain/run-model-config.js";
import type { RunModelSelection } from "../../llm-management/domain/run-model-selection.js";
export type AgentOrgMemberModelConfigIdentity = Readonly<{ orgRunId: string; memberAddress: string; agentRunId: string }>;
export type AgentOrgMemberModelConfig = AgentOrgMemberModelConfigIdentity & Readonly<{
  launchConfiguration: AgentLaunchConfiguration;
  isActive: boolean;
  editability: RunModelConfigEditability;
}>;
export type UpdateAgentOrgMemberModelConfig = AgentOrgMemberModelConfigIdentity & RunModelSelection;
export type AgentOrgMemberModelConfigResult = RunModelConfigUpdateResult<AgentOrgMemberModelConfig | null>;
