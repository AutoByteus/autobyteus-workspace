import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { getProcessRemoteCollaboration } from "../../../remote-collaboration/remote-collaboration-services.js";
import { RemoteCollaborationSettingsError } from "../../../remote-collaboration/domain/remote-collaboration-settings-error.js";
import type { PeerNode } from "../../../remote-collaboration/domain/peer-node.js";

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

/** A peer's offer now: its entries, or the refusal code the page words itself (DEC-504). Exactly one is set. */
@ObjectType()
export class PeerNodeOfferGql {
  @Field(() => [PeerNodeOfferEntryGql], { nullable: true }) entries!: PeerNodeOfferEntryGql[] | null;
  @Field(() => String, { nullable: true }) refusalCode!: string | null;
}

@InputType()
export class AddPeerNodeInput {
  @Field(() => String) baseUrl!: string;
  @Field(() => String) name!: string;
}

const toPeer = (peer: PeerNode): PeerNodeGql => ({ ...peer });

/** A refused change is a GraphQL error with the settings code (the Nodes tab shows its message). */
const settingsError = (error: unknown): GraphQLError => error instanceof RemoteCollaborationSettingsError
  ? new GraphQLError(error.message, { extensions: { code: error.code } })
  : new GraphQLError(error instanceof Error ? error.message : String(error), { extensions: { code: "REMOTE_COLLABORATION_SETTINGS_FAILED" } });
const guarded = async <T>(operation: () => Promise<T>): Promise<T> => {
  try { return await operation(); } catch (error) { throw settingsError(error); }
};

/** The Nodes tab's API for remote collaboration (DEC-108): the switch and the peers. */
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
    if ("accepted" in offer) return { entries: null, refusalCode: offer.code };
    return {
      entries: offer.map((entry) => ({ name: entry.name, kind: entry.kind, description: entry.description ?? null })),
      refusalCode: null,
    };
  }

  @Mutation(() => PeerNodeGql)
  addPeerNode(@Arg("input", () => AddPeerNodeInput) input: AddPeerNodeInput): Promise<PeerNodeGql> {
    return guarded(async () => toPeer(await getProcessRemoteCollaboration().peers.add(input)));
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
