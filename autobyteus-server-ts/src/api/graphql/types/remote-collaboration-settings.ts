import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { getProcessRemoteCollaboration } from "../../../remote-collaboration/remote-collaboration-services.js";
import { RemoteCollaborationSettingsError } from "../../../remote-collaboration/domain/remote-collaboration-settings-error.js";
import type { PeerNode } from "../../../remote-collaboration/domain/peer-node.js";
import type { PeerRefusal } from "../../../remote-collaboration/domain/peer-refusal.js";
import type { GraphqlRequestContext } from "../graphql-request-context.js";

@ObjectType()
export class RemoteCollaborationCapabilityGql {
  @Field(() => Boolean) enabled!: boolean;
  @Field(() => String) settingKey!: string;
  @Field(() => String) source!: string;
}

@ObjectType()
export class PeerNodeGql {
  @Field(() => String) nodeId!: string;
  @Field(() => String) name!: string;
  @Field(() => String) baseUrl!: string;
  @Field(() => String) addedAt!: string;
  /** Both nodes hold the pair's peer secret; an unpaired peer (registered before pairing) shows "Pair again". */
  @Field(() => Boolean) paired!: boolean;
}

/** An invite another node accepts to pair with this node (design M-9). */
@ObjectType()
export class PeerInviteGql {
  /** The invite as one copyable text (`abpi_…`); `acceptPeerInvite` takes it. */
  @Field(() => String) inviteText!: string;
  @Field(() => String) expiresAt!: string;
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
const refusalFields = (refusal: PeerRefusal) => ({ refusalCode: refusal.code, unreachableReason: refusal.reason ?? null });

/**
 * A refused change is a GraphQL error with the settings code and the details the Nodes page words itself
 * (one-nodes-tab REQ-707, REQ-708): `reason`, `address`, `loopbackInContainer`, `attempts`, each only when known.
 */
const settingsError = (error: unknown): GraphQLError => error instanceof RemoteCollaborationSettingsError
  ? new GraphQLError(error.message, { extensions: { code: error.code, ...error.details } })
  : new GraphQLError(error instanceof Error ? error.message : String(error), { extensions: { code: "REMOTE_COLLABORATION_SETTINGS_FAILED" } });
const guarded = async <T>(operation: () => Promise<T>): Promise<T> => {
  try { return await operation(); } catch (error) { throw settingsError(error); }
};

/** Changing the peers or the switch is an owner action (node access model NA-7): a phone's credential is refused. */
const requireOwner = (context: GraphqlRequestContext): void => {
  if (context.clientIdentity?.kind !== "owner") {
    throw new GraphQLError("This credential does not open this action.", { extensions: { code: "NODE_ROUTE_NOT_PERMITTED" } });
  }
};

/**
 * The Nodes tab's API for remote collaboration (DEC-108): the switch, the peers, and (one-nodes-tab) what a window
 * needs to connect two nodes: an invite here and its acceptance there (autobyteus-437 pairing; each node finds the
 * other's address itself), and whether a peer admits this node now. The window calls the same API on both nodes.
 */
@Resolver()
export class RemoteCollaborationSettingsResolver {
  @Query(() => RemoteCollaborationCapabilityGql)
  remoteCollaborationCapability(): RemoteCollaborationCapabilityGql {
    return { ...getProcessRemoteCollaboration().capability.getState() };
  }

  @Mutation(() => RemoteCollaborationCapabilityGql)
  setRemoteCollaborationEnabled(
    @Arg("enabled", () => Boolean) enabled: boolean,
    @Ctx() context: GraphqlRequestContext,
  ): RemoteCollaborationCapabilityGql {
    requireOwner(context);
    return { ...getProcessRemoteCollaboration().capability.setEnabled(enabled) };
  }

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

  /** On node A: an invite for one other node (10 minutes, single use). */
  @Mutation(() => PeerInviteGql)
  createPeerInvite(@Ctx() context: GraphqlRequestContext): Promise<PeerInviteGql> {
    requireOwner(context);
    return guarded(async () => {
      const created = await getProcessRemoteCollaboration().pairing.createInvite();
      return { inviteText: created.inviteText, expiresAt: created.expiresAt };
    });
  }

  /**
   * On node B: pairs with the node that created the invite; both nodes then hold the peer secret. `name` is this node's
   * label for that node; `nameOnInviter` that node's label for this one (this computer's name when not given). Takes
   * at most about a minute (both nodes look for each other's address).
   */
  @Mutation(() => PeerNodeGql)
  acceptPeerInvite(
    @Arg("inviteText", () => String) inviteText: string,
    @Arg("name", () => String) name: string,
    @Arg("nameOnInviter", () => String, { nullable: true }) nameOnInviter: string | null,
    @Ctx() context: GraphqlRequestContext,
  ): Promise<PeerNodeGql> {
    requireOwner(context);
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().pairing.acceptInvite(inviteText, name, nameOnInviter ?? null)));
  }

  @Mutation(() => PeerNodeGql)
  changePeerAddress(
    @Arg("nodeId", () => String) nodeId: string,
    @Arg("baseUrl", () => String) baseUrl: string,
    @Ctx() context: GraphqlRequestContext,
  ): Promise<PeerNodeGql> {
    requireOwner(context);
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().peers.changeAddress(nodeId, baseUrl)));
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

  /** Removes the peer and forgets its secret here; its open sockets close (NA-11). */
  @Mutation(() => Boolean)
  removePeerNode(@Arg("nodeId", () => String) nodeId: string, @Ctx() context: GraphqlRequestContext): Promise<boolean> {
    requireOwner(context);
    return guarded(async () => { await getProcessRemoteCollaboration().peers.remove(nodeId); return true; });
  }
}
