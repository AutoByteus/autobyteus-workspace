import type { DelegationIndex } from "../../delegation/delegation-index.js";
import type { DelegationSource } from "../task/member-task-capability.js";
import type { TaskDelegation } from "../task/task-delegation.js";
import { assertAgentTeamAddress } from "../../domain/agent-team-address.js";
import type { RemoteAgentPlacement } from "../../collaborators/catalog-delegation.js";
import type { SpawnTaskInput, TaskDelegationOutcome } from "../task/task-delegation-command.js";
import { REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import type { RemoteAgentLaunch, RemoteRunChannel, RemoteRunChannelAccess } from "./remote-run-channel.js";
import { launchNotesOf } from "../../collaborators/launch-configuration-notes.js";
import { getAgentTeamAddressBasename } from "../../domain/agent-team-address.js";
import { peerRunIdOf, peerRunLinksOf, type PeerRunLink } from "./peer-run-link.js";

/** Notes for a peer's launches: one line per agent the peer's Model Router chose for, one per skipped layer. */
const remoteLaunchNotes = (launches: readonly RemoteAgentLaunch[]): string[] => launchNotesOf(launches.map((launch) => ({
  name: getAgentTeamAddressBasename(launch.address) ?? launch.address,
  subject: "agent" as const,
  launch: { runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier },
  source: launch.source,
})));

/** A remote placement before its work is prepared: the peer and the address there. */
export type RemotePlacementTarget = Omit<RemoteAgentPlacement, "work">;


/**
 * Delegations to a peer node (DS-001, CM-10), on the tool path (autobyteus-461 SR-049): the peer and address
 * (`delegationPlacement`), then `TaskDelegation.toPeerRun`, which records the peer's run in its Task entry; the sender's
 * root is told of the new peer run. Created by the composition root (SR-047 step 8).
 */
export class RemoteDelegation {

  constructor(private readonly options: Readonly<{
    delegation: Pick<TaskDelegation, "toPeerRun">;
    tree: Pick<DelegationIndex, "peerChildrenOf">;
    channel: RemoteRunChannelAccess;
  }>) {}

  /**
   * `delegate_task` with `node` (DEC-111): refuses a saved Task before anything is sent (REQ-110; its files go with it,
   * autobyteus-587), resolves the peer by this owner's label, and returns the remote placement for the root's lifecycle.
   */
  async delegationPlacement(input: SpawnTaskInput & Readonly<{ node: string }>): Promise<RemotePlacementTarget | TaskDelegationOutcome> {
    if (input.task_id !== undefined) return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.savedTask };
    const channel = this.channel();
    if (!channel) return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    const peer = await channel.findPeer(input.node);
    if ("accepted" in peer) return { delegated: false, message: peer.message };
    let address;
    try { address = assertAgentTeamAddress(input.recipient_address.trim()); }
    catch { return { delegated: false, message: `"${input.recipient_address}" is not an address: an Agent's address begins with '/'.` }; }
    return Object.freeze({ kind: "remote_agent", address, peer, description: input.description });
  }

  /**
   * `delegate_task` with `node`: the peer and address, then `TaskDelegation.toPeerRun` with the input without `node`
   * (autobyteus-461: the run's relationship is its Task entry, not a link in this run). A delegated result names the
   * peer (CM-11) and carries the peer's launch notes (REQ-009), as for a run on this node.
   */
  async delegate(input: SpawnTaskInput & Readonly<{ node: string }>, source: DelegationSource): Promise<TaskDelegationOutcome> {
    const placement = await this.delegationPlacement(input);
    if (!("kind" in placement)) return placement;
    const { node: _node, ...local } = input;
    const started = await this.options.delegation.toPeerRun({ sender: source.sender, senderRun: source.senderRun, spawn: local as SpawnTaskInput, placement });
    const { outcome, launches } = started;
    if (!outcome.delegated) return outcome;
    const notes = remoteLaunchNotes(launches);
    return { ...outcome, ...(notes.length ? { launchNotes: notes } : {}) };
  }

  private channel(): RemoteRunChannel | null {
    return this.options.channel();
  }
}
