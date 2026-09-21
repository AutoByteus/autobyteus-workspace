import { validateAgentOrgRunExecutionTreePayload } from "../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../src/agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { ConfiguredAgentExecutionNode, ConfiguredTeamExecutionNode } from "../../src/run-history/domain/run-execution-tree-shared-records.js";
import { assertAgentTeamAddress } from "../../src/agent-collaboration/domain/agent-team-address.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";

export const testOrgLaunchConfiguration = (workspaceRootPath: string | null = "/workspace") => ({
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  llmModelIdentifier: "test-model",
  llmConfig: null,
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  workspaceRootPath,
});

export const testOrgAgentNode = (address: string, agentRunId: string): ConfiguredAgentExecutionNode => ({
  address: assertAgentTeamAddress(address),
  agentDefinitionId: `definition-${agentRunId}`,
  role: null,
  description: null,
  agentRunId,
  platformAgentRunId: null,
  launchConfiguration: testOrgLaunchConfiguration(),
});

export const testOrgTeamNode = (input: {
  address: string
  teamRunId: string
  members: readonly ConfiguredAgentExecutionNode[]
  coordinatorAddress: string
}): ConfiguredTeamExecutionNode => ({
  address: assertAgentTeamAddress(input.address),
  teamDefinitionId: `definition-${input.teamRunId}`,
  role: null,
  description: null,
  teamRunId: input.teamRunId,
  coordinatorAddress: assertAgentTeamAddress(input.coordinatorAddress),
  defaultLaunchConfiguration: testOrgLaunchConfiguration(),
  members: input.members,
  taskExecutions: [],
});

export const testAgentOrgExecutionTree = (input: {
  orgRunId: string
  members: readonly (ConfiguredAgentExecutionNode | ConfiguredTeamExecutionNode)[]
  orgDefinitionId?: string
  orgDefinitionName?: string
}): AgentOrgRunExecutionTreeSnapshot => validateAgentOrgRunExecutionTreePayload({
  schemaVersion: 1,
  subjectKind: "agent_org",
  createdAt: "2026-09-01T00:00:00.000Z",
  archivedAt: null,
  applicationBinding: null,
  handoffs: [],
  rootOrg: {
    address: "/",
    orgDefinitionId: input.orgDefinitionId ?? `definition-${input.orgRunId}`,
    orgDefinitionName: input.orgDefinitionName ?? "Test Org",
    orgRunId: input.orgRunId,
    defaultLaunchConfiguration: testOrgLaunchConfiguration(),
    members: input.members,
    taskExecutions: [],
  },
}, input.orgRunId);
