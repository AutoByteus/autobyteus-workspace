import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  assertAgentTeamAddress,
  getAgentTeamAddressBasename,
  type AgentTeamAddress,
} from "../../src/agent-collaboration/domain/agent-team-address.js";
import { MemberCollaborationContext } from "../../src/agent-team-execution/domain/member-collaboration-context.js";
import { MemberTeamContext } from "../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  TeamRunConfig,
  type TeamRunAgentNode,
  type TeamRunAgentTeamNode,
  type TeamRunNode,
} from "../../src/agent-team-execution/domain/team-run-config.js";
import { createTeamExecutionAddress } from "../../src/agent-team-execution/domain/team-execution-address.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";

export const testAgentNode = (
  addressValue: string,
  overrides: Partial<TeamRunAgentNode> = {},
): TeamRunAgentNode => {
  const address = assertAgentTeamAddress(addressValue);
  const name = getAgentTeamAddressBasename(address) ?? "agent";
  return {
    agentDefinitionId: `agent-${name}`,
    agentRunId: `run-${address.slice(1).replaceAll("/", "-")}`,
    platformAgentRunId: null,
    role: null,
    description: null,
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    llmModelIdentifier: "test-model",
    llmConfig: null,
    autoExecuteTools: true,
    skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    workspaceRootPath: null,
    applicationExecutionContext: null,
    ...overrides,
    address,
    kind: "agent",
  };
};

export const testAgentTeamNode = (input: {
  address: string;
  coordinatorAddress: string;
  children: readonly TeamRunNode[];
  teamRunId?: string;
  teamDefinitionId?: string;
  role?: string | null;
  description?: string | null;
}): TeamRunAgentTeamNode => {
  const address = assertAgentTeamAddress(input.address);
  const name = getAgentTeamAddressBasename(address) ?? "root";
  return {
    kind: "agent_team",
    address,
    teamDefinitionId: input.teamDefinitionId ?? `team-${name}`,
    teamRunId: input.teamRunId ?? `team-run-${name}`,
    coordinatorAddress: assertAgentTeamAddress(input.coordinatorAddress),
    ...(address === "/" ? {} : {
      role: input.role ?? null,
      description: input.description ?? null,
    }),
    children: input.children,
  };
};

export const testTeamRunConfig = (input: {
  children: readonly TeamRunNode[];
  coordinatorAddress: string;
  rootTeamRunId?: string;
  rootTeamDefinitionId?: string;
  handoffs?: ConstructorParameters<typeof TeamRunConfig>[0]["handoffs"];
}): TeamRunConfig => new TeamRunConfig({
  teamBackendKind: TeamBackendKind.MIXED,
  rootTeam: testAgentTeamNode({
    address: "/",
    coordinatorAddress: input.coordinatorAddress,
    children: input.children,
    teamRunId: input.rootTeamRunId ?? "root-team-run",
    teamDefinitionId: input.rootTeamDefinitionId ?? "root-team-definition",
  }),
  handoffs: input.handoffs,
});

export const testMemberTeamContext = (input: {
  memberAddress?: string;
  teamAddress?: string;
  coordinatorAddress?: string;
  rootTeamRunId?: string;
  teamRunId?: string;
  teamDefinitionId?: string;
  agentRunId?: string;
  runtimeKind?: RuntimeKind;
  taskTeamRunIds?: readonly string[];
  deliverInterAgentMessage?: MemberCollaborationContext["deliverInterAgentMessage"];
  outgoingHandoffs?: MemberCollaborationContext["outgoingHandoffs"];
  teamInstruction?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
} = {}): MemberTeamContext => {
  const memberAddress = assertAgentTeamAddress(input.memberAddress ?? "/coordinator");
  const teamAddress = assertAgentTeamAddress(input.teamAddress ?? "/");
  const coordinatorAddress = assertAgentTeamAddress(input.coordinatorAddress ?? memberAddress);
  const rootTeamRunId = input.rootTeamRunId ?? "root-team-run";
  const agentRunId = input.agentRunId ?? `run-${getAgentTeamAddressBasename(memberAddress) ?? "agent"}`;
  return new MemberTeamContext({
    teamRunId: input.teamRunId ?? rootTeamRunId,
    teamDefinitionId: input.teamDefinitionId ?? "root-team-definition",
    teamName: getAgentTeamAddressBasename(teamAddress) ?? "Root Team",
    teamBackendKind: TeamBackendKind.MIXED,
    teamAddress,
    memberAddress,
    agentRunId,
    runtimeKind: input.runtimeKind ?? RuntimeKind.AUTOBYTEUS,
    coordinatorAddress,
    teamInstruction: input.teamInstruction ?? null,
    collaboration: new MemberCollaborationContext({
      addressing: {
        rootTeamRunId,
        memberAddress,
      },
      outgoingHandoffs: input.outgoingHandoffs,
      deliverInterAgentMessage: input.deliverInterAgentMessage,
    }),
    executionAddress: createTeamExecutionAddress({
      rootTeamRunId,
      taskTeamRunIds: input.taskTeamRunIds ?? [],
      memberAddress,
      taskAgentRunId: input.taskAgentRunId ?? null,
    }),
    taskId: input.taskId ?? null,
  });
};

export const address = (value: string): AgentTeamAddress => assertAgentTeamAddress(value);
