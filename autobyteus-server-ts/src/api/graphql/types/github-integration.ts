import { GraphQLError } from "graphql";
import { Arg, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import {
  getIntegrationConnectionService,
  IntegrationConnectionError,
  type IntegrationConnectionStatus as ConnectionStatus,
} from "../../../credential-proxy/integration-connection-service.js";

/** GitHub's connection on this node. Never carries the token. */
@ObjectType()
export class IntegrationConnectionStatus {
  @Field(() => Boolean)
  connected!: boolean;

  @Field(() => String, { nullable: true })
  login!: string | null;

  @Field(() => String, { nullable: true })
  connectedAt!: string | null;

  @Field(() => [String])
  agentDefinitionIds!: string[];
}

const toGraphql = (status: ConnectionStatus): IntegrationConnectionStatus => ({
  connected: status.connected,
  login: status.login,
  connectedAt: status.connectedAt,
  agentDefinitionIds: [...status.agentDefinitionIds],
});

/** A coded connection failure becomes a GraphQL error with that code; its message never holds the token. */
const withCodedErrors = async (operation: () => Promise<ConnectionStatus>): Promise<IntegrationConnectionStatus> => {
  try {
    return toGraphql(await operation());
  } catch (error) {
    if (error instanceof IntegrationConnectionError) {
      throw new GraphQLError(error.message, { extensions: { code: error.code } });
    }
    throw error;
  }
};

/**
 * GitHub connection for the credential proxy (DS-001). GitHub-specific on purpose: another integration's credential
 * has other fields, so it gets its own operations.
 */
@Resolver()
export class GitHubIntegrationResolver {
  @Query(() => IntegrationConnectionStatus)
  async githubIntegration(): Promise<IntegrationConnectionStatus> {
    return withCodedErrors(() => getIntegrationConnectionService().status());
  }

  @Mutation(() => IntegrationConnectionStatus)
  async connectGitHubIntegration(@Arg("token", () => String) token: string): Promise<IntegrationConnectionStatus> {
    const trimmed = token.trim();
    if (!trimmed) throw new GraphQLError("Enter a GitHub token.", { extensions: { code: "TOKEN_REQUIRED" } });
    return withCodedErrors(() => getIntegrationConnectionService().connect(SecretValue.fromString(trimmed)));
  }

  @Mutation(() => IntegrationConnectionStatus)
  async testGitHubIntegration(): Promise<IntegrationConnectionStatus> {
    return withCodedErrors(() => getIntegrationConnectionService().test());
  }

  @Mutation(() => IntegrationConnectionStatus)
  async disconnectGitHubIntegration(): Promise<IntegrationConnectionStatus> {
    return withCodedErrors(() => getIntegrationConnectionService().disconnect());
  }

  @Mutation(() => IntegrationConnectionStatus)
  async setGitHubIntegrationAgentAccess(
    @Arg("agentDefinitionIds", () => [String]) agentDefinitionIds: string[],
  ): Promise<IntegrationConnectionStatus> {
    return withCodedErrors(() => getIntegrationConnectionService().setAgentAccess(agentDefinitionIds));
  }
}
