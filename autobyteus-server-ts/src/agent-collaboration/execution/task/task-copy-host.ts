import { getParentAgentTeamAddress, type AgentTeamAddress } from "../../domain/agent-team-address.js";
import type { MessageRecipientIndexPort } from "../../collaborators/message-recipient-resolution.js";

/** Where a new task copy is recorded and hosted: the root, or one Team instance of the delegator. */
export type TaskCopyHost =
  | Readonly<{ hostKind: "root" }>
  | Readonly<{ hostKind: "team"; hostRunId: string; hostAddress: AgentTeamAddress }>;

/**
 * REQ-012 (DI-01): the one owner of copy placement by address, shared by the Team, Org and
 * Agent roots. Walking the delegator's containing Team instances deepest first, the host is the
 * first instance whose address is the copy address's parent: a teammate copy stays inside its
 * Team instance. Otherwise the copy is placed at the root (a catalog Agent or Team, a
 * collaborator, an Org-level configured placement). Root-hosted delegators have no containing
 * instance, so their copies go to the root. Pure; restore keeps each copy's recorded host.
 */
export const resolveTaskCopyHost = (
  index: Pick<MessageRecipientIndexPort, "teamInstancesOf">,
  delegatorAgentRunId: string,
  targetAddress: AgentTeamAddress,
): TaskCopyHost => {
  const parent = getParentAgentTeamAddress(targetAddress);
  if (!parent) throw new Error(`Copy target '${targetAddress}' has no containing placement.`);
  const instance = index.teamInstancesOf(delegatorAgentRunId).find((team) => team.address === parent);
  return instance
    ? Object.freeze({ hostKind: "team", hostRunId: instance.teamRunId, hostAddress: instance.address })
    : Object.freeze({ hostKind: "root" });
};
