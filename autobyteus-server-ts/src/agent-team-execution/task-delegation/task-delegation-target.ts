import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

export type TaskDelegationTarget =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress }>
  | Readonly<{
      kind: "agent_team";
      address: AgentTeamAddress;
      coordinatorAddress: AgentTeamAddress;
    }>;

export const cloneTaskDelegationTarget = (
  target: TaskDelegationTarget,
): TaskDelegationTarget => target.kind === "agent"
  ? Object.freeze({ kind: "agent", address: target.address })
  : Object.freeze({
      kind: "agent_team",
      address: target.address,
      coordinatorAddress: target.coordinatorAddress,
    });

export const getTaskDelegationTargetAddress = (
  target: TaskDelegationTarget,
): AgentTeamAddress => target.address;
