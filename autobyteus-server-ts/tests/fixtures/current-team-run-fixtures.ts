import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  assertAgentTeamAddress,
  getAgentTeamAddressBasename,
  type AgentTeamAddress,
} from "../../src/agent-collaboration/domain/agent-team-address.js";
import { MemberCollaborationContext, MemberExecutionContext } from "../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberTaskCommandCapability } from "../../src/agent-collaboration/execution/task/member-task-command-capability.js";
import { TeamBackendKind } from "../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  TeamRunConfig,
  type TeamRunAgentNode,
  type TeamRunAgentTeamNode,
  type TeamRunNode,
} from "../../src/agent-team-execution/domain/team-run-config.js";
import type { TeamRunExecutionTreeSnapshot } from "../../src/agent-team-execution/domain/team-run-execution-tree.js";
import type { RootTeamRun } from "../../src/agent-team-execution/domain/root-team-run.js";
import { buildInitialTeamRunExecutionTree } from "../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
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
  const coordinatorAddress = assertAgentTeamAddress(input.coordinatorAddress);
  const coordinator = input.children.find((child): child is TeamRunAgentNode =>
    child.kind === "agent" && child.address === coordinatorAddress,
  );
  if (!coordinator) {
    throw new Error(`Test AgentTeam '${address}' requires direct coordinator '${coordinatorAddress}'.`);
  }
  return {
    kind: "agent_team",
    address,
    teamDefinitionId: input.teamDefinitionId ?? `team-${name}`,
    teamRunId: input.teamRunId ?? `team-run-${name}`,
    coordinatorAddress,
    defaultLaunchConfiguration: {
      runtimeKind: coordinator.runtimeKind,
      llmModelIdentifier: coordinator.llmModelIdentifier,
      llmConfig: coordinator.llmConfig,
      autoExecuteTools: coordinator.autoExecuteTools,
      skillAccessMode: coordinator.skillAccessMode,
      workspaceRootPath: coordinator.workspaceRootPath,
    },
    ...(address === "/" ? {} : {
      role: input.role ?? null,
      description: input.description ?? null,
    }),
    children: input.children,
  };
};

export const testTeamRunConfig = (input: {
  children: readonly TeamRunAgentNode[];
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

export const testMemberExecutionContext = (input: {
  memberAddress?: string;
  rootTeamRunId?: string;
  agentRunId?: string;
  deliverInterAgentMessage?: (input: unknown) => Promise<{ accepted: boolean }>;
  outgoingHandoffs?: MemberCollaborationContext["outgoingHandoffs"];
  teamInstruction?: string | null;
  taskCommands?: MemberTaskCommandCapability;
} = {}): MemberExecutionContext => {
  const memberAddress = assertAgentTeamAddress(input.memberAddress ?? "/coordinator");
  const rootTeamRunId = input.rootTeamRunId ?? "root-team-run";
  const agentRunId = input.agentRunId ?? `run-${getAgentTeamAddressBasename(memberAddress) ?? "agent"}`;
  return new MemberExecutionContext({
    identity: createCollaborationMemberExecutionIdentity({
      root: createTeamRootExecutionIdentity(rootTeamRunId),
      memberAddress,
      agentRunId,
    }),
    authoredEnclosingScopeInstruction: input.teamInstruction ?? null,
    collaboration: new MemberCollaborationContext({
      outgoingHandoffs: input.outgoingHandoffs,
      deliverLogicalMessage: async (message) => input.deliverInterAgentMessage
        ? input.deliverInterAgentMessage(message)
        : { accepted: true },
    }),
    tasks: input.taskCommands ?? testMemberTaskCommandCapability(rootTeamRunId),
  });
};

export const testMemberTaskCommandCapability = (
  rootTeamRunId = "root-team-run",
  root: RootTeamRun | null = null,
): MemberTaskCommandCapability => Object.freeze({
  root: createTeamRootExecutionIdentity(rootTeamRunId),
  delegateTask: async (caller, input) => {
    if (!root) throw new Error("Test task command capability has no RootTeamRun.");
    return root.delegateTask({ identity: caller }, input);
  },
  submitTaskResult: async (caller, input) => {
    if (!root) throw new Error("Test task command capability has no RootTeamRun.");
    return root.submitTaskResult({ identity: caller }, input);
  },
  reviewTaskResult: async (caller, input) => {
    if (!root) throw new Error("Test task command capability has no RootTeamRun.");
    return root.reviewTaskResult({ identity: caller }, input);
  },
});

export const address = (value: string): AgentTeamAddress => assertAgentTeamAddress(value);

/** Current strict V2 execution-tree fixture derived through the production builder. */
export const testExecutionTree = (input: {
  children: readonly TeamRunAgentNode[];
  coordinatorAddress: string;
  rootTeamRunId?: string;
  rootTeamDefinitionId?: string;
  teamDefinitionName?: string;
  createdAt?: string;
}): TeamRunExecutionTreeSnapshot => buildInitialTeamRunExecutionTree({
  config: testTeamRunConfig(input),
  teamDefinitionName: input.teamDefinitionName ?? "Test Team",
  createdAt: input.createdAt ?? "2026-08-15T00:00:00.000Z",
});
