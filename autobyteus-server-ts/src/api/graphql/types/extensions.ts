import { Arg, Ctx, Field, Float, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { GraphQLJSON } from "graphql-scalars";
import { ExtensionError, errorMessage } from "../../../extensions/domain/extension-error.js";
import type { ExtensionItem, ExtensionList } from "../../../extensions/domain/extension-item.js";
import type { GraphqlRequestContext } from "../graphql-request-context.js";

@ObjectType()
export class ExtensionProgressGql {
  @Field(() => String) message!: string;
  @Field(() => Float, { nullable: true }) percent!: number | null;
}

/** One extension of this node: the ExtensionItem of design-spec.md (Data Contract), field for field. */
@ObjectType()
export class ExtensionItemGql {
  @Field(() => String) id!: string;
  @Field(() => String) name!: string;
  @Field(() => String) description!: string;
  /** The contract's optional `translations` map: `{ "<locale>": { name, description } }`. */
  @Field(() => GraphQLJSON, { nullable: true }) translations!: Record<string, { name: string; description: string }> | null;
  @Field(() => [String]) platforms!: string[];
  /** `notAvailableHere` · `notInstalled` · `installing` · `updating` · `installed` · `failed`. */
  @Field(() => String) state!: string;
  @Field(() => String, { nullable: true }) catalogVersion!: string | null;
  /** `platform` · `newerAutoByteus`. */
  @Field(() => String, { nullable: true }) notAvailableReason!: string | null;
  @Field(() => ExtensionProgressGql, { nullable: true }) progress!: ExtensionProgressGql | null;
  @Field(() => String, { nullable: true }) installedVersion!: string | null;
  @Field(() => Boolean, { nullable: true }) enabled!: boolean | null;
  @Field(() => Boolean, { nullable: true }) ready!: boolean | null;
  @Field(() => String, { nullable: true }) message!: string | null;
  @Field(() => Boolean) starting!: boolean;
  /** `available` · `needsNewerAutoByteus` · `none`. */
  @Field(() => String, { nullable: true }) update!: string | null;
  @Field(() => String, { nullable: true }) failureMessage!: string | null;
}

@ObjectType()
export class ExtensionListGql {
  /** `verified` · `unverified` · `unreachable`: the result of the latest catalog fetch. */
  @Field(() => String) catalog!: string;
  /** This node's `<os>-<cpu>`. */
  @Field(() => String) platform!: string;
  @Field(() => [ExtensionItemGql]) extensions!: ExtensionItemGql[];
}

const toItem = (item: ExtensionItem): ExtensionItemGql => ({
  ...item,
  translations: item.translations ? JSON.parse(JSON.stringify(item.translations)) : null,
  platforms: [...item.platforms],
  progress: item.progress ? { ...item.progress } : null,
});
const toList = (list: ExtensionList): ExtensionListGql => ({
  catalog: list.catalog, platform: list.platform, extensions: list.extensions.map(toItem),
});

/** Managing a node's extensions is an owner action (REQ-005, DEC-005): GraphQL as a route is open to phones too. */
const requireOwner = (context: GraphqlRequestContext): void => {
  if (context.clientIdentity?.kind !== "owner") {
    throw new GraphQLError("This credential does not open this action.", { extensions: { code: "NODE_ROUTE_NOT_PERMITTED" } });
  }
};

const refused = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ExtensionError) throw new GraphQLError(error.message, { extensions: { code: error.code } });
    throw new GraphQLError(errorMessage(error), { extensions: { code: "EXTENSION_REQUEST_FAILED" } });
  }
};

/**
 * The extensions of this node (extension-contract.md §6): the list, the log, and Install, Update, Remove and the switch.
 * Install and Update return at once with `installing` / `updating`; the page polls the list.
 */
@Resolver()
export class ExtensionsResolver {
  @Query(() => ExtensionListGql)
  async extensions(
    @Arg("refreshCatalog", () => Boolean, { defaultValue: false }) refreshCatalog: boolean,
    @Ctx() context: GraphqlRequestContext,
  ): Promise<ExtensionListGql> {
    requireOwner(context);
    return toList(await context.extensions.list({ refreshCatalog }));
  }

  @Query(() => [String])
  async extensionLog(@Arg("id", () => String) id: string, @Ctx() context: GraphqlRequestContext): Promise<string[]> {
    requireOwner(context);
    return context.extensions.readLog(id);
  }

  @Mutation(() => ExtensionItemGql, { nullable: true })
  async installExtension(@Arg("id", () => String) id: string, @Ctx() context: GraphqlRequestContext): Promise<ExtensionItemGql | null> {
    requireOwner(context);
    return refused(async () => {
      const item = await context.extensions.install(id);
      return item ? toItem(item) : null;
    });
  }

  @Mutation(() => ExtensionItemGql, { nullable: true })
  async updateExtension(@Arg("id", () => String) id: string, @Ctx() context: GraphqlRequestContext): Promise<ExtensionItemGql | null> {
    requireOwner(context);
    return refused(async () => {
      const item = await context.extensions.update(id);
      return item ? toItem(item) : null;
    });
  }

  @Mutation(() => ExtensionItemGql, { nullable: true })
  async removeExtension(@Arg("id", () => String) id: string, @Ctx() context: GraphqlRequestContext): Promise<ExtensionItemGql | null> {
    requireOwner(context);
    return refused(async () => {
      const item = await context.extensions.remove(id);
      return item ? toItem(item) : null;
    });
  }

  @Mutation(() => ExtensionItemGql, { nullable: true })
  async setExtensionEnabled(
    @Arg("id", () => String) id: string,
    @Arg("enabled", () => Boolean) enabled: boolean,
    @Ctx() context: GraphqlRequestContext,
  ): Promise<ExtensionItemGql | null> {
    requireOwner(context);
    return refused(async () => {
      const item = await context.extensions.setEnabled(id, enabled);
      return item ? toItem(item) : null;
    });
  }
}
