import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { getProcessRemoteCollaboration } from "../../../remote-collaboration/remote-collaboration-services.js";
import { RemoteCollaborationSettingsError } from "../../../remote-collaboration/domain/remote-collaboration-settings-error.js";
import type { PeerNode, PeerRelation } from "../../../remote-collaboration/domain/peer-node.js";
import type { PeerRefusal } from "../../../remote-collaboration/domain/peer-refusal.js";
import type { PairOutcome } from "../../../remote-collaboration/pairing/peer-pairing.js";
import type { GraphqlRequestContext } from "../graphql-request-context.js";

@ObjectType()
export class PeerNodeGql {
  @Field(() => String) nodeId!: string;
  @Field(() => String) name!: string;
  /** Where this node reaches the peer (an address typed, found, or its private-network address). */
  @Field(() => String) address!: string;
  /** The private network's stable machine ID; null when paired by plain address. */
  @Field(() => String, { nullable: true }) machine!: string | null;
  /** The network account that added that machine ("added by"); null when paired by plain address. */
  @Field(() => String, { nullable: true }) account!: string | null;
  /** `own` or `teammate`; null for a pair made before node keys. */
  @Field(() => String, { nullable: true }) relation!: string | null;
  /** autobyteus-581: a sandbox this node created (the Nodes page labels it). */
  @Field(() => Boolean) sandbox!: boolean;
  @Field(() => String) addedAt!: string;
  /** This node holds the peer's node key; false for a pair made before node keys ("Pair again"). */
  @Field(() => Boolean) paired!: boolean;
}

/** A one-time grant this node gives the app that controls it, for one pair from one of its own nodes (contract §3). */
@ObjectType()
export class PairingGrantGql {
  @Field(() => String) grant!: string;
  @Field(() => String) expiresAt!: string;
}

/** What Pair did: `paired` (with the peer), or `waiting` for the other node's owner (with this node's request ID). */
@ObjectType()
export class PairOutcomeGql {
  @Field(() => String) state!: string;
  @Field(() => PeerNodeGql, { nullable: true }) peer!: PeerNodeGql | null;
  @Field(() => String, { nullable: true }) requestId!: string | null;
}

/** A pair request waiting for this node's owner: "<name> at <address> wants to pair" (or "added by <account>"). */
@ObjectType()
export class PendingPairRequestGql {
  @Field(() => String) id!: string;
  @Field(() => String) nodeId!: string;
  @Field(() => String) name!: string;
  @Field(() => String) address!: string;
  @Field(() => String, { nullable: true }) machine!: string | null;
  @Field(() => String, { nullable: true }) account!: string | null;
  @Field(() => String) receivedAt!: string;
}

/** A pair request this node sent: `waiting` for the other owner, or `declined`. */
@ObjectType()
export class OutstandingPairRequestGql {
  @Field(() => String) requestId!: string;
  @Field(() => String) address!: string;
  @Field(() => String) state!: string;
  @Field(() => String) createdAt!: string;
}

/** One entry a peer offers, as the Nodes page shows it (autobyteus-267): no address; a description only when it has one. */
@ObjectType()
export class PeerNodeOfferEntryGql {
  @Field(() => String) name!: string;
  /** `agent` or `agent_team`. */
  @Field(() => String) kind!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
}

/**
 * A peer's offer now: its entries, or the refusal code the page words itself (DEC-504). Exactly one of `entries` and
 * `refusalCode` is set; `unreachableReason` (one-nodes-tab REQ-707) only with `PEER_UNREACHABLE` from the transport.
 */
@ObjectType()
export class PeerNodeOfferGql {
  @Field(() => [PeerNodeOfferEntryGql], { nullable: true }) entries!: PeerNodeOfferEntryGql[] | null;
  @Field(() => String, { nullable: true }) refusalCode!: string | null;
  @Field(() => String, { nullable: true }) unreachableReason!: string | null;
}

/** Whether a peer admits this node's requests now (one-nodes-tab DS-004); the refusal that says why not otherwise. */
@ObjectType()
export class PeerNodeAvailabilityGql {
  @Field(() => Boolean) available!: boolean;
  @Field(() => String, { nullable: true }) refusalCode!: string | null;
  @Field(() => String, { nullable: true }) unreachableReason!: string | null;
}

const toPeer = (peer: PeerNode): PeerNodeGql => ({ ...peer });
const toOutcome = (outcome: PairOutcome): PairOutcomeGql => outcome.state === "paired"
  ? { state: "paired", peer: toPeer(outcome.peer), requestId: null }
  : { state: "waiting", peer: null, requestId: outcome.requestId };
const refusalFields = (refusal: PeerRefusal) => ({ refusalCode: refusal.code, unreachableReason: refusal.reason ?? null });

/**
 * A refused change is a GraphQL error with the settings code and the details the Nodes page words itself
 * (one-nodes-tab REQ-707, REQ-708): `reason`, `address`, `loopbackInContainer`, each only when known.
 */
const settingsError = (error: unknown): GraphQLError => error instanceof RemoteCollaborationSettingsError
  ? new GraphQLError(error.message, { extensions: { code: error.code, ...error.details } })
  : new GraphQLError(error instanceof Error ? error.message : String(error), { extensions: { code: "REMOTE_COLLABORATION_SETTINGS_FAILED" } });
const guarded = async <T>(operation: () => Promise<T> | T): Promise<T> => {
  try { return await operation(); } catch (error) { throw settingsError(error); }
};

/** Pairing and changing the peers is an owner action (node access model NA-7): a phone's credential is refused. */
const requireOwner = (context: GraphqlRequestContext): void => {
  if (context.clientIdentity?.kind !== "owner") {
    throw new GraphQLError("This credential does not open this action.", { extensions: { code: "NODE_ROUTE_NOT_PERMITTED" } });
  }
};

const relationOf = (value: string): PeerRelation => {
  if (value !== "own" && value !== "teammate") {
    throw new GraphQLError("relation is `own` or `teammate`.", { extensions: { code: "BAD_USER_INPUT" } });
  }
  return value;
};

/**
 * The Nodes tab's API for remote collaboration (DEC-108; autobyteus-661 contract §3): the peers, and what a window
 * needs to pair two nodes: a grant on the node it pairs with and Pair on its own node (own nodes, one click), or Pair
 * and the other owner's Accept; Reject, Cancel and Unpair; and whether a peer admits this node now. The window calls
 * the same API on both nodes.
 */
@Resolver()
export class RemoteCollaborationSettingsResolver {
  @Query(() => [PeerNodeGql])
  peerNodes(): Promise<PeerNodeGql[]> {
    return guarded(async () => (await getProcessRemoteCollaboration().peers.list()).map(toPeer));
  }

  /**
   * The Nodes page asks this node's server for one peer's offer (autobyteus-267 DS-001), through the discovery the agent
   * tools use; the window never contacts the peer. It takes at most about 20 s (the peer request bound).
   */
  @Query(() => PeerNodeOfferGql)
  async peerNodeOffer(@Arg("nodeId", () => String) nodeId: string): Promise<PeerNodeOfferGql> {
    const offer = await getProcessRemoteCollaboration().discovery.listAvailableAgentsOf(nodeId);
    if ("accepted" in offer) return { entries: null, ...refusalFields(offer) };
    return {
      entries: offer.map((entry) => ({ name: entry.name, kind: entry.kind, description: entry.description ?? null })),
      refusalCode: null,
      unreachableReason: null,
    };
  }

  /** Asked on the other node by a window that connects it with its own node: does that peer admit this node now? */
  @Query(() => PeerNodeAvailabilityGql)
  async peerNodeAvailability(@Arg("nodeId", () => String) nodeId: string): Promise<PeerNodeAvailabilityGql> {
    const answer = await getProcessRemoteCollaboration().discovery.checkAvailabilityOf(nodeId);
    return answer.accepted ? { available: true, refusalCode: null, unreachableReason: null } : { available: false, ...refusalFields(answer) };
  }

  /** The pair requests waiting for this node's owner (Accept / Reject). */
  @Query(() => [PendingPairRequestGql])
  pendingPairRequests(@Ctx() context: GraphqlRequestContext): PendingPairRequestGql[] {
    requireOwner(context);
    return getProcessRemoteCollaboration().pairing.pendingRequests().map((request) => ({ ...request }));
  }

  /** The pair requests this node sent that wait for the other owner, or were declined. */
  @Query(() => [OutstandingPairRequestGql])
  outstandingPairRequests(@Ctx() context: GraphqlRequestContext): OutstandingPairRequestGql[] {
    requireOwner(context);
    return getProcessRemoteCollaboration().pairing.outstandingRequests().map((request) => ({ ...request }));
  }

  /**
   * On B: a one-time grant (10 minutes) for one pair from a node the same app controls. `forMachine`: the asking
   * node's private-network machine, when it asks over the private network; `nameForAsker`: B's name for it.
   */
  @Mutation(() => PairingGrantGql)
  createPairingGrant(
    @Arg("relation", () => String) relation: string,
    @Arg("forMachine", () => String, { nullable: true }) forMachine: string | null,
    @Arg("nameForAsker", () => String, { nullable: true }) nameForAsker: string | null,
    @Ctx() context: GraphqlRequestContext,
  ): PairingGrantGql {
    requireOwner(context);
    return { ...getProcessRemoteCollaboration().pairing.createGrant({ relation: relationOf(relation), forMachine, nameForAsker }) };
  }

  /**
   * On A: Pair with the node at `address`: with B's `grant`, paired at once; without, a request B's owner Accepts.
   * `nodeId`: the node expected there; `name`: this node's label for B. B finds where it reaches this node among this
   * node's addresses.
   */
  @Mutation(() => PairOutcomeGql)
  pairWithNode(
    @Arg("address", () => String) address: string,
    @Arg("grant", () => String, { nullable: true }) grant: string | null,
    @Arg("nodeId", () => String, { nullable: true }) nodeId: string | null,
    @Arg("name", () => String, { nullable: true }) name: string | null,
    @Ctx() context: GraphqlRequestContext,
  ): Promise<PairOutcomeGql> {
    requireOwner(context);
    return guarded(async () => toOutcome(await getProcessRemoteCollaboration().pairing.pair({ address, grant, nodeId, name })));
  }

  @Mutation(() => PeerNodeGql)
  acceptPairRequest(
    @Arg("id", () => String) id: string,
    @Arg("name", () => String, { nullable: true }) name: string | null,
    @Ctx() context: GraphqlRequestContext,
  ): Promise<PeerNodeGql> {
    requireOwner(context);
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().pairing.accept(id, name)));
  }

  @Mutation(() => Boolean)
  rejectPairRequest(@Arg("id", () => String) id: string, @Ctx() context: GraphqlRequestContext): Promise<boolean> {
    requireOwner(context);
    return guarded(async () => { await getProcessRemoteCollaboration().pairing.reject(id); return true; });
  }

  /** Withdraws a pair request this node sent; a later acceptance is refused. False when none waited. */
  @Mutation(() => Boolean)
  cancelPairRequest(@Arg("requestId", () => String) requestId: string, @Ctx() context: GraphqlRequestContext): boolean {
    requireOwner(context);
    return getProcessRemoteCollaboration().pairing.cancel(requestId);
  }

  @Mutation(() => PeerNodeGql)
  changePeerAddress(
    @Arg("nodeId", () => String) nodeId: string,
    @Arg("address", () => String) address: string,
    @Ctx() context: GraphqlRequestContext,
  ): Promise<PeerNodeGql> {
    requireOwner(context);
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().peers.changeAddress(nodeId, address)));
  }

  @Mutation(() => PeerNodeGql)
  renamePeerNode(
    @Arg("nodeId", () => String) nodeId: string,
    @Arg("name", () => String) name: string,
    @Ctx() context: GraphqlRequestContext,
  ): Promise<PeerNodeGql> {
    requireOwner(context);
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().peers.rename(nodeId, name)));
  }

  /** Unpair: the other node is told (when it can be reached) and the pair is removed here; its open sockets close (NA-11). */
  @Mutation(() => Boolean)
  unpairPeerNode(@Arg("nodeId", () => String) nodeId: string, @Ctx() context: GraphqlRequestContext): Promise<boolean> {
    requireOwner(context);
    return guarded(async () => { await getProcessRemoteCollaboration().pairing.unpair(nodeId); return true; });
  }
}
