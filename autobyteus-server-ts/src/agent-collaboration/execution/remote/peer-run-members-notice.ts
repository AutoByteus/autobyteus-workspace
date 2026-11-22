import type { RemoteRunChannelAccess, RemoteRunMembers } from "./remote-run-channel.js";

/** What the notice reads of its Team run at send time: its peer delegator's node, and its members now. */
export type PeerRunMembersSource = Readonly<{ teamRunId: string; nodeId: string; members(): RemoteRunMembers }>;

/**
 * FU-003 (org-teams-follow-definition DS-007): a Team run a peer started on this node tells that peer, the delegating node,
 * its members after each committed change of its membership (autobyteus-22). One notice at a time, the members read when it
 * is sent, so a later change never arrives before an earlier one; a change while one is on its way sends once more. Best
 * effort: a peer that does not answer, or an older one that refuses the request, is reconciled at its next contact (its
 * run summaries carry the members). Nothing is persisted.
 */
export class PeerRunMembersNotice {
  private sending: Promise<void> | null = null;
  private again = false;
  private lastFailure: string | null = null;

  constructor(private readonly source: PeerRunMembersSource, private readonly channel: RemoteRunChannelAccess) {}

  changed(): Promise<void> {
    if (this.sending) { this.again = true; return this.sending; }
    const sending = (async () => {
      do {
        this.again = false;
        await this.send();
      } while (this.again);
    })().finally(() => { this.sending = null; });
    this.sending = sending;
    return sending;
  }

  private async send(): Promise<void> {
    const channel = this.channel();
    if (!channel) return;
    const receipt = await channel.deliveredRunMembers(this.source.nodeId, { kind: "agent_team", runId: this.source.teamRunId }, this.source.members())
      .catch((error: unknown) => ({ accepted: false as const, code: "PEER_RUN_MEMBERS_FAILED", message: error instanceof Error ? error.message : String(error) }));
    if (receipt.accepted) { this.lastFailure = null; return; }
    if (this.lastFailure !== receipt.code) {
      this.lastFailure = receipt.code;
      console.warn("PEER_RUN_MEMBERS_NOT_TOLD", { teamRunId: this.source.teamRunId, nodeId: this.source.nodeId, code: receipt.code, reason: receipt.message });
    }
  }
}

/** The notice of a Team run a peer started on this node (its tree names the peer's node); `null` for any other Team run. */
export const peerRunMembersNoticeOf = (tree: () => Readonly<{ delegatedFrom?: Readonly<{ nodeId?: string }>; rootTeam: Readonly<{
  teamRunId: string; coordinatorAddress: string; members: readonly Readonly<{ address: string; agentRunId: string }>[] }> }>,
channel: RemoteRunChannelAccess): PeerRunMembersNotice | null => {
  const nodeId = tree().delegatedFrom?.nodeId;
  return nodeId ? new PeerRunMembersNotice({ teamRunId: tree().rootTeam.teamRunId, nodeId, members: () => Object.freeze({
    coordinatorAddress: tree().rootTeam.coordinatorAddress,
    members: Object.freeze(tree().rootTeam.members.map((member) => Object.freeze({ address: member.address, agentRunId: member.agentRunId }))) }) }, channel) : null;
};

/** A Team run's change notices, and, for a run a peer started here, its peer's members notice after each committed change (FU-003). */
export const withPeerRunMembers = <TChange>(notices: Readonly<{ recordChange(change: TChange): void }>,
  tree: Parameters<typeof peerRunMembersNoticeOf>[0], channel: RemoteRunChannelAccess): Readonly<{ recordChange(change: TChange): void }> => {
  const peer = peerRunMembersNoticeOf(tree, channel);
  return peer ? Object.freeze({ recordChange: (change: TChange) => { notices.recordChange(change); void peer.changed(); } }) : notices;
};
