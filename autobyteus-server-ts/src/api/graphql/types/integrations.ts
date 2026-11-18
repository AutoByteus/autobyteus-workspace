import { GraphQLError } from "graphql";
import { Arg, Field, Int, Mutation, ObjectType, Query, registerEnumType, Resolver } from "type-graphql";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import {
  getIntegrationCatalog,
  type IntegrationListing,
  type IntegrationSourceListing,
} from "../../../credential-proxy/integration-catalog.js";
import { IntegrationCatalogError } from "../../../credential-proxy/integration-import-outcomes.js";
import {
  getIntegrationConnectionService,
  IntegrationConnectionError,
} from "../../../credential-proxy/integration-connection-service.js";

const IntegrationState = { NEEDS_TOKEN: "NEEDS_TOKEN", CONNECTED: "CONNECTED", NEEDS_NEWER_APP: "NEEDS_NEWER_APP" } as const;
const IntegrationSourceKind = { LOCAL_PATH: "LOCAL_PATH", GITHUB_REPOSITORY: "GITHUB_REPOSITORY" } as const;
registerEnumType(IntegrationState, { name: "IntegrationState" });
registerEnumType(IntegrationSourceKind, { name: "IntegrationSourceKind" });

@ObjectType()
export class IntegrationSourceRef {
  @Field(() => String) sourceId!: string;
  @Field(() => IntegrationSourceKind) kind!: keyof typeof IntegrationSourceKind;
  /** `owner/repository`, or the folder path. */
  @Field(() => String) label!: string;
}

@ObjectType()
export class IntegrationTool {
  @Field(() => String) tool!: string;
  @Field(() => Boolean) found!: boolean;
}

/** One card of the Integrations page. Never carries a token. */
@ObjectType()
export class IntegrationView {
  @Field(() => String) id!: string;
  @Field(() => String) name!: string;
  @Field(() => String) description!: string;
  /** `icon.svg` as a `data:image/svg+xml` URL; shown only as an `<img>`. */
  @Field(() => String, { nullable: true }) iconDataUrl!: string | null;
  @Field(() => IntegrationState) state!: keyof typeof IntegrationState;
  @Field(() => String, { nullable: true }) login!: string | null;
  @Field(() => String, { nullable: true }) connectedAt!: string | null;
  /** The manifest's `token.help` (repository text, shown as text). */
  @Field(() => String, { nullable: true }) tokenHelp!: string | null;
  @Field(() => String) skillName!: string;
  @Field(() => IntegrationSourceRef) source!: IntegrationSourceRef;
  @Field(() => [IntegrationTool]) tools!: IntegrationTool[];
}

@ObjectType()
export class IntegrationSourceGitHub {
  @Field(() => String) status!: string;
  @Field(() => String) repositoryUrl!: string;
  @Field(() => String) defaultBranch!: string;
  @Field(() => String) installedRevision!: string;
  @Field(() => String, { nullable: true }) latestRevision!: string | null;
}

/** An imported source that holds integrations, for Manage sources. */
@ObjectType()
export class IntegrationSourceView {
  @Field(() => String) sourceId!: string;
  @Field(() => IntegrationSourceKind) kind!: keyof typeof IntegrationSourceKind;
  @Field(() => String) label!: string;
  /** The repository link, or the folder path. */
  @Field(() => String) location!: string;
  @Field(() => Int) skillCount!: number;
  @Field(() => [String]) integrationIds!: string[];
  @Field(() => [String]) integrationNames!: string[];
  @Field(() => IntegrationSourceGitHub, { nullable: true }) github!: IntegrationSourceGitHub | null;
}

@ObjectType()
export class IntegrationSourceRemoval {
  /** The integrations whose connection went with the source (DEC-015). */
  @Field(() => [String]) removedConnectionNames!: string[];
}

const toView = (listing: IntegrationListing): IntegrationView => ({
  id: listing.id,
  name: listing.name,
  description: listing.description,
  iconDataUrl: listing.iconDataUrl,
  state: listing.state,
  login: listing.login,
  connectedAt: listing.connectedAt,
  tokenHelp: listing.tokenHelp,
  skillName: listing.skillName,
  source: { sourceId: listing.source.sourceId, kind: listing.source.kind, label: listing.source.label },
  tools: listing.tools.map((check) => ({ tool: check.tool, found: check.found })),
});

const toSourceView = (source: IntegrationSourceListing): IntegrationSourceView => ({
  sourceId: source.sourceId,
  kind: source.kind,
  label: source.label,
  location: source.location,
  skillCount: source.skillCount,
  integrationIds: source.integrations.map((integration) => integration.id),
  integrationNames: source.integrations.map((integration) => integration.name),
  github: source.github ? {
    status: source.github.status,
    repositoryUrl: source.github.repositoryUrl,
    defaultBranch: source.github.defaultBranch,
    installedRevision: source.github.installedRevision,
    latestRevision: source.github.latestRevision,
  } : null,
});

/** A coded failure becomes a GraphQL error with its code and details; no message ever holds a token. */
const withCodedErrors = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof IntegrationCatalogError) {
      throw new GraphQLError(error.message, { extensions: { code: error.code, ...error.details } });
    }
    if (error instanceof IntegrationConnectionError) {
      throw new GraphQLError(error.message, { extensions: { code: error.code } });
    }
    throw error;
  }
};

/** The card of an imported integration after a connection change; refused for an ID that is not imported. */
const listingOf = async (integrationId: string): Promise<IntegrationView> => {
  const listing = (await getIntegrationCatalog().list()).find((candidate) => candidate.id === integrationId);
  if (!listing) {
    throw new GraphQLError("This integration is not imported.", { extensions: { code: "INTEGRATION_NOT_FOUND" } });
  }
  return toView(listing);
};

const requireImported = (integrationId: string): void => {
  if (!getIntegrationCatalog().entries().some((entry) => entry.id === integrationId)) {
    throw new GraphQLError("This integration is not imported.", { extensions: { code: "INTEGRATION_NOT_FOUND" } });
  }
};

/**
 * The Integrations page (DS-001…DS-003, DS-005): the cards, the imported sources, import, update and removal of a
 * source, and connect, test and disconnect of one integration.
 */
@Resolver()
export class IntegrationsResolver {
  @Query(() => [IntegrationView])
  async integrations(): Promise<IntegrationView[]> {
    return (await getIntegrationCatalog().list()).map(toView);
  }

  @Query(() => [IntegrationSourceView])
  integrationSources(): IntegrationSourceView[] {
    return getIntegrationCatalog().sourceListings().map(toSourceView);
  }

  /** Imports a GitHub repository link or a folder path; returns only the newly imported integrations. */
  @Mutation(() => [IntegrationView])
  async importIntegrations(@Arg("location", () => String) location: string): Promise<IntegrationView[]> {
    return withCodedErrors(async () => (await getIntegrationCatalog().import(location)).map(toView));
  }

  @Mutation(() => [IntegrationSourceView])
  async updateIntegrationSource(@Arg("sourceId", () => String) sourceId: string): Promise<IntegrationSourceView[]> {
    return withCodedErrors(async () => (await getIntegrationCatalog().updateSource(sourceId)).map(toSourceView));
  }

  @Mutation(() => IntegrationSourceRemoval)
  async removeIntegrationSource(@Arg("sourceId", () => String) sourceId: string): Promise<IntegrationSourceRemoval> {
    return withCodedErrors(async () => ({ removedConnectionNames: await getIntegrationCatalog().removeSource(sourceId) }));
  }

  @Mutation(() => IntegrationView)
  async connectIntegration(
    @Arg("id", () => String) integrationId: string,
    @Arg("token", () => String) token: string,
  ): Promise<IntegrationView> {
    const trimmed = token.trim();
    if (!trimmed) throw new GraphQLError("Enter a token.", { extensions: { code: "TOKEN_REQUIRED" } });
    requireImported(integrationId);
    return withCodedErrors(async () => {
      await getIntegrationConnectionService().connect(integrationId, SecretValue.fromString(trimmed));
      return listingOf(integrationId);
    });
  }

  @Mutation(() => IntegrationView)
  async testIntegration(@Arg("id", () => String) integrationId: string): Promise<IntegrationView> {
    requireImported(integrationId);
    return withCodedErrors(async () => {
      await getIntegrationConnectionService().test(integrationId);
      return listingOf(integrationId);
    });
  }

  @Mutation(() => IntegrationView)
  async disconnectIntegration(@Arg("id", () => String) integrationId: string): Promise<IntegrationView> {
    requireImported(integrationId);
    return withCodedErrors(async () => {
      await getIntegrationConnectionService().disconnect(integrationId);
      return listingOf(integrationId);
    });
  }
}
