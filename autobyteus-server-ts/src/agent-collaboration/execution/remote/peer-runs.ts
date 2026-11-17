import type { DelegationIndex } from "../../delegation/delegation-index.js";
import { peerRunIdOf, peerRunLinksOf } from "./peer-run-link.js";
import type { PeerChannel } from "./peer-run-calls.js";
import { PeerAgentRun } from "./peer-agent-run.js";
import { PeerTeamRun } from "./peer-team-run.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { TeamMemberExecutionCommand } from "../../../agent-team-execution/domain/team-member-execution-command.js";
import { remoteOwnerCommandOf } from "./remote-child-commands.js";

export type PeerRun = PeerAgentRun | PeerTeamRun;

/** Finds a run on a peer node by its own ID (SR-066); given to the run services and the views at composition. */
export type PeerRunOf = (id: string) => PeerRun | null;

/**
 * `peerRunOf(id)` (SR-066, REQ-013): the handle of the run on a peer node with this run ID, or of the Team run this agent
 * run is a member of; `null` for a run that is not on a peer node. It looks the run up in the `DelegationIndex` and
 * builds its link with `peerRunLinksOf`, the builder the roots' `RemoteRunLinks` use (ARCH-REV-040 note 2). It never
 * reads a root, so it answers the same whether the delegator is running, stopped or deleted.
 */
export const createPeerRunOf = (
  tree: Pick<DelegationIndex, "peerRunNamed" | "parentOf" | "peerChildrenOf">,
  channel: PeerChannel,
): PeerRunOf => (id) => {
  const run = tree.peerRunNamed(id.trim());
  const parent = run ? tree.parentOf(run) : null;
  if (!run || !parent) return null;
  const [kind, runId] = "agentRunId" in run ? ["agent", run.agentRunId] : ["agent_team", run.teamRunId];
  const link = peerRunLinksOf(parent.delegatingRun, tree).find((candidate) => candidate.kind === kind && peerRunIdOf(candidate) === runId);
  if (!link) return null;
  return link.kind === "agent" ? new PeerAgentRun(link, channel) : new PeerTeamRun(link, channel);
};

/**
 * A view's command for one agent of a peer run (SR-066), as base applied it: a message keeps its text and its window
 * identity, an interrupt is an interrupt; a run on another node approves its own tools, and is resumed by its own node.
 */
export const executePeerCommand = (peer: PeerRun, agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> => {
  if (command.kind === "post_message" && command.postOptions?.onlyAsFirstInput) {
    return Promise.resolve({ accepted: false, code: "REMOTE_RUN_FIRST_INPUT_UNSUPPORTED", message: "A run on another node is resumed by its own node." });
  }
  const owner = remoteOwnerCommandOf(command);
  if (!owner || owner.kind === "terminate") {
    return Promise.resolve({ accepted: false, code: "REMOTE_RUN_COMMAND_UNSUPPORTED", message: "A run on another node approves its own tools." });
  }
  if (peer.kind === "agent") {
    if (agentRunId !== peer.runId) return Promise.resolve({ accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not the run on another node.` });
    return owner.kind === "interrupt" ? peer.interrupt() : peer.postMessage(owner);
  }
  return owner.kind === "interrupt" ? peer.interrupt(agentRunId) : peer.postMessage(agentRunId, owner);
};

/** `@` mentions are resolved by a run's own root; a view sends a run on another node its text only (SR-066). */
export const PEER_MENTIONS_REFUSAL: AgentOperationResult = Object.freeze({ accepted: false, code: "REMOTE_RUN_MENTIONS_UNSUPPORTED",
  message: "A run on another node can't be sent @ mentions from here. Send the message without them." });
