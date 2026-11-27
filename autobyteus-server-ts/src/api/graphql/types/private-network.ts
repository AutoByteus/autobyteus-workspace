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

const requireOwner = (context: GraphqlRequestContext): void => {
  if (context.clientIdentity?.kind !== "owner") {
    throw new GraphQLError("This credential does not open this action.", { extensions: { code: "NODE_ROUTE_NOT_PERMITTED" } });
  }
};

/** The private network's settings on the Nodes tab (autobyteus-661): this node's two visibility switches, owner only. */
@Resolver()
export class PrivateNetworkResolver {
  @Query(() => NodeVisibilityGql)
  nodeVisibility(@Ctx() context: GraphqlRequestContext): NodeVisibilityGql {
    requireOwner(context);
    return { ...getProcessPrivateNetwork().visibility.state() };
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
