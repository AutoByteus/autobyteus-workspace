import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { getProcessPrivateNetwork } from "../../../compositions/private-network-composition.js";
import { NodeVisibilityError } from "../../../private-network/node-visibility.js";
import type { GraphqlRequestContext } from "../graphql-request-context.js";

/** Whether other nodes may find this node (autobyteus-661 contract §1): both off by default. */
@ObjectType()
export class NodeVisibilityGql {
  /** "Visible on my private network". */
  @Field(() => Boolean) privateNetwork!: boolean;
  /** "Visible on my local network". */
  @Field(() => Boolean) localNetwork!: boolean;
}

/** The machine a found node runs on (contract §4). */
@ObjectType()
export class FoundMachineGql {
  @Field(() => String) id!: string;
  @Field(() => String) name!: string;
  /** The account that added the machine ("added by"). */
  @Field(() => String, { nullable: true }) account!: string | null;
  /** The account that shared it into this network, when it is shared. */
  @Field(() => String, { nullable: true }) sharedBy!: string | null;
}

/** A node found on the private network: visible there, not this node, not paired with it. */
@ObjectType()
export class FoundOnPrivateNetworkGql {
  @Field(() => String) nodeId!: string;
  @Field(() => String) name!: string;
  /** Its private address (pair with `machine`). */
  @Field(() => String) address!: string;
  @Field(() => FoundMachineGql) machine!: FoundMachineGql;
  /** A machine on the owner's account (an unknown machine of yours); otherwise someone else's. */
  @Field(() => Boolean) mine!: boolean;
}

/** A node found on the local network: "<name> at <address>". */
@ObjectType()
export class FoundOnLocalNetworkGql {
  @Field(() => String) nodeId!: string;
  @Field(() => String) name!: string;
  @Field(() => String) address!: string;
}

/** The private network's part of Found: its state (notSetUp without the extension) and the nodes found while joined. */
@ObjectType()
export class FoundOnPrivateNetworkListGql {
  @Field(() => String) state!: string;
  @Field(() => String) message!: string;
  @Field(() => [FoundOnPrivateNetworkGql]) nodes!: FoundOnPrivateNetworkGql[];
}

/** The Nodes tab's Found lists (autobyteus-661 contract §4, §4b); the app also leaves out the nodes it controls. */
@ObjectType()
export class FoundNodesGql {
  @Field(() => FoundOnPrivateNetworkListGql) privateNetwork!: FoundOnPrivateNetworkListGql;
  @Field(() => [FoundOnLocalNetworkGql]) localNetwork!: FoundOnLocalNetworkGql[];
}

const requireOwner = (context: GraphqlRequestContext): void => {
  if (context.clientIdentity?.kind !== "owner") {
    throw new GraphQLError("This credential does not open this action.", { extensions: { code: "NODE_ROUTE_NOT_PERMITTED" } });
  }
};

/** The private network on the Nodes tab (autobyteus-661): this node's two visibility switches and the Found lists, owner only. */
@Resolver()
export class PrivateNetworkResolver {
  @Query(() => NodeVisibilityGql)
  nodeVisibility(@Ctx() context: GraphqlRequestContext): NodeVisibilityGql {
    requireOwner(context);
    return { ...getProcessPrivateNetwork().visibility.state() };
  }

  /** What the Nodes tab finds now; asked when the tab opens and when the machine list changes. */
  @Query(() => FoundNodesGql)
  async foundNodes(@Ctx() context: GraphqlRequestContext): Promise<FoundNodesGql> {
    requireOwner(context);
    const found = await getProcessPrivateNetwork().found.list();
    return {
      privateNetwork: { ...found.privateNetwork, nodes: found.privateNetwork.nodes.map((node) => ({ ...node, machine: { ...node.machine } })) },
      localNetwork: found.localNetwork.map((node) => ({ ...node })),
    };
  }

  /** Changes one or both switches; turning the local one on needs local-network connections allowed first. */
  @Mutation(() => NodeVisibilityGql)
  async setNodeVisibility(
    @Arg("privateNetwork", () => Boolean, { nullable: true }) privateNetwork: boolean | null,
    @Arg("localNetwork", () => Boolean, { nullable: true }) localNetwork: boolean | null,
    @Ctx() context: GraphqlRequestContext,
  ): Promise<NodeVisibilityGql> {
    requireOwner(context);
    try {
      return { ...await getProcessPrivateNetwork().visibility.set({ privateNetwork, localNetwork }) };
    } catch (error) {
      if (error instanceof NodeVisibilityError) throw new GraphQLError(error.message, { extensions: { code: error.code } });
      throw error;
    }
  }
}
