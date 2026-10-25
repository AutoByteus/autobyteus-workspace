import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { getProcessRemoteCollaboration } from "../../../remote-collaboration/remote-collaboration-services.js";
import { RemoteCollaborationSettingsError } from "../../../remote-collaboration/domain/remote-collaboration-settings-error.js";
import type { PeerNode } from "../../../remote-collaboration/domain/peer-node.js";
import type { PeerRefusal } from "../../../remote-collaboration/domain/peer-refusal.js";
import { getServerAddressCandidateService } from "../../../server-addressing/server-address-candidate-service.js";

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

/** Register the node `nodeId` (its server instance ID) at `baseUrl`, which must answer with it (one-nodes-tab). */
@InputType()
export class AddPeerNodeInput {
  @Field(() => String) nodeId!: string;
  @Field(() => String) name!: string;
  @Field(() => String) baseUrl!: string;
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

/**
 * The Nodes tab's API for remote collaboration (DEC-108): the switch, the peers, and (one-nodes-tab) what a window
 * needs to connect two nodes: this node's own addresses, the address that works for this node to reach another one,
 * and whether a peer admits this node now. The window calls the same API on both nodes.
 */
@Resolver()
export class RemoteCollaborationSettingsResolver {
  @Query(() => RemoteCollaborationCapabilityGql)
  remoteCollaborationCapability(): RemoteCollaborationCapabilityGql {
    return { ...getProcessRemoteCollaboration().capability.getState() };
  }

  @Mutation(() => RemoteCollaborationCapabilityGql)
  setRemoteCollaborationEnabled(@Arg("enabled", () => Boolean) enabled: boolean): RemoteCollaborationCapabilityGql {
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

  /** How other nodes may reach this node, as this node lists its own addresses; the other side tries them in order. */
  @Query(() => [String])
  peerAddressCandidates(): string[] {
    return getServerAddressCandidateService().listCandidates().map((candidate) => candidate.baseUrl);
  }

  /**
   * The first of `baseUrls`, in order, at which this node reaches the node `nodeId` (one-nodes-tab DS-005). Read-only;
   * the switch must be on. Takes at most about 20 s.
   */
  @Query(() => String)
  resolvePeerAddress(
    @Arg("nodeId", () => String) nodeId: string,
    @Arg("baseUrls", () => [String]) baseUrls: string[],
  ): Promise<string> {
    return guarded(() => getProcessRemoteCollaboration().addresses.resolve(nodeId, baseUrls));
  }

  @Mutation(() => PeerNodeGql)
  addPeerNode(@Arg("input", () => AddPeerNodeInput) input: AddPeerNodeInput): Promise<PeerNodeGql> {
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().peers.add(input)));
  }

  @Mutation(() => PeerNodeGql)
  changePeerAddress(@Arg("nodeId", () => String) nodeId: string, @Arg("baseUrl", () => String) baseUrl: string): Promise<PeerNodeGql> {
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().peers.changeAddress(nodeId, baseUrl)));
  }

  @Mutation(() => PeerNodeGql)
  renamePeerNode(@Arg("nodeId", () => String) nodeId: string, @Arg("name", () => String) name: string): Promise<PeerNodeGql> {
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().peers.rename(nodeId, name)));
  }

  @Mutation(() => Boolean)
  removePeerNode(@Arg("nodeId", () => String) nodeId: string): Promise<boolean> {
    return guarded(async () => { await getProcessRemoteCollaboration().peers.remove(nodeId); return true; });
  }
}
