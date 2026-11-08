/** One GraphQL call to a node as its owner: the `data` of the answer (it throws on errors). */
export type OwnerGraphqlCall = (query: string, variables?: Record<string, unknown>) => Promise<Record<string, any>>;

/**
 * Pairs two nodes as the owner does on the Nodes page (node access model NA-9, design DS-004): an invite on the
 * inviting node, accepted on the other; both then hold the peer secret. Each node finds the other's address among
 * the other's address candidates (its `AUTOBYTEUS_SERVER_HOST` first). Returns the accepting node's new peer row.
 */
export const pairNodes = async (input: Readonly<{
  inviter: OwnerGraphqlCall;
  accepter: OwnerGraphqlCall;
  /** The accepting node's name for the inviting node. */
  inviterName: string;
  /** The inviting node's name for the accepting node. */
  accepterName: string;
}>): Promise<Record<string, any>> => {
  const invite = await input.inviter("mutation { createPeerInvite { inviteText } }");
  const accepted = await input.accepter(
    "mutation($inviteText: String!, $name: String!, $nameOnInviter: String) { acceptPeerInvite(inviteText: $inviteText, name: $name, nameOnInviter: $nameOnInviter) { nodeId name baseUrl paired } }",
    { inviteText: invite.createPeerInvite.inviteText, name: input.inviterName, nameOnInviter: input.accepterName },
  );
  return accepted.acceptPeerInvite;
};
