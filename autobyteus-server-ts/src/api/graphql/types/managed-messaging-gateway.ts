import { GraphQLJSONObject } from "graphql-scalars";
import {
  Arg,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { getManagedMessagingGatewayService } from "../../../managed-capabilities/messaging-gateway/defaults.js";
import type {
  ManagedMessagingStatus,
  ManagedMessagingWeComAccount,
} from "../../../managed-capabilities/messaging-gateway/types.js";

@ObjectType()
class ManagedMessagingGatewayStatusObject {
  @Field(() => Boolean)
  supported!: boolean;

  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String)
  lifecycleState!: string;

  @Field(() => String, { nullable: true })
  message!: string | null;

  @Field(() => String, { nullable: true })
  lastError!: string | null;

  @Field(() => String, { nullable: true })
  activeVersion!: string | null;

  @Field(() => String, { nullable: true })
  desiredVersion!: string | null;

  @Field(() => String, { nullable: true })
  releaseTag!: string | null;

  @Field(() => [String])
  installedVersions!: string[];

  @Field(() => String, { nullable: true })
  bindHost!: string | null;

  @Field(() => Int, { nullable: true })
  bindPort!: number | null;

  @Field(() => Int, { nullable: true })
  pid!: number | null;

  @Field(() => GraphQLJSONObject)
  providerConfig!: Record<string, unknown>;

  @Field(() => GraphQLJSONObject)
  providerStatusByProvider!: Record<string, unknown>;

  @Field(() => [String])
  supportedProviders!: string[];

  @Field(() => [String])
  excludedProviders!: string[];

  @Field(() => GraphQLJSONObject)
  diagnostics!: Record<string, unknown>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  runtimeReliabilityStatus!: Record<string, unknown> | null;

  @Field(() => Boolean)
  runtimeRunning!: boolean;
}

@ObjectType()
class ManagedMessagingGatewayWeComAccountObject {
  @Field(() => String)
  accountId!: string;

  @Field(() => String)
  label!: string;

  @Field(() => String)
  mode!: string;
}

@ObjectType()
class ManagedMessagingGatewayPeerCandidateObject {
  @Field(() => String)
  peerId!: string;

  @Field(() => String)
  peerType!: string;

  @Field(() => String, { nullable: true })
  threadId!: string | null;

  @Field(() => String, { nullable: true })
  displayName!: string | null;

  @Field(() => String)
  lastMessageAt!: string;
}

@ObjectType()
class ManagedMessagingGatewayPeerCandidateListObject {
  @Field(() => String, { nullable: true })
  accountId!: string | null;

  @Field(() => String)
  updatedAt!: string;

  @Field(() => [ManagedMessagingGatewayPeerCandidateObject])
  items!: ManagedMessagingGatewayPeerCandidateObject[];
}

const toStatusObject = (
  status: ManagedMessagingStatus,
): ManagedMessagingGatewayStatusObject => ({
  supported: status.supported,
  enabled: status.enabled,
  lifecycleState: status.lifecycleState,
  message: status.message,
  lastError: status.lastError,
  activeVersion: status.activeVersion,
  desiredVersion: status.desiredVersion,
  releaseTag: status.releaseTag,
  installedVersions: status.installedVersions,
  bindHost: status.bindHost,
  bindPort: status.bindPort,
  pid: status.pid,
  providerConfig: status.providerConfig as unknown as Record<string, unknown>,
  providerStatusByProvider: Object.fromEntries(
    status.providerStatuses.map((providerStatus) => [
      providerStatus.provider,
      providerStatus,
    ]),
  ),
  supportedProviders: status.supportedProviders,
  excludedProviders: status.excludedProviders,
  diagnostics: status.diagnostics,
  runtimeReliabilityStatus: status.runtimeReliabilityStatus,
  runtimeRunning: status.runtimeRunning,
});

const toWeComAccountObject = (
  account: ManagedMessagingWeComAccount,
): ManagedMessagingGatewayWeComAccountObject => ({
  accountId: account.accountId,
  label: account.label,
  mode: account.mode,
});

@Resolver()
export class ManagedMessagingGatewayResolver {
  @Query(() => ManagedMessagingGatewayStatusObject)
  async managedMessagingGatewayStatus(): Promise<ManagedMessagingGatewayStatusObject> {
    return toStatusObject(await getManagedMessagingGatewayService().getStatus());
  }

  @Query(() => [ManagedMessagingGatewayWeComAccountObject])
  async managedMessagingGatewayWeComAccounts(): Promise<
    ManagedMessagingGatewayWeComAccountObject[]
  > {
    const accounts = (await getManagedMessagingGatewayService().getWeComAccounts()) as ManagedMessagingWeComAccount[];
    return accounts.map(toWeComAccountObject);
  }

  @Query(() => ManagedMessagingGatewayPeerCandidateListObject)
  async managedMessagingGatewayPeerCandidates(
    @Arg("provider", () => String) provider: string,
    @Arg("includeGroups", () => Boolean, { defaultValue: true })
    includeGroups: boolean,
    @Arg("limit", () => Int, { defaultValue: 50 }) limit: number,
  ): Promise<ManagedMessagingGatewayPeerCandidateListObject> {
    const response = await getManagedMessagingGatewayService().getPeerCandidates({
      provider: provider.toUpperCase(),
      includeGroups,
      limit,
    });
    const items = Array.isArray(response.items)
      ? response.items
      : [];
    return {
      accountId:
        typeof response.accountId === "string" ? response.accountId : null,
      updatedAt:
        typeof response.updatedAt === "string"
          ? response.updatedAt
          : new Date().toISOString(),
      items: items.map((item) => ({
        peerId: String(item.peerId ?? ""),
        peerType: String(item.peerType ?? "USER"),
        threadId:
          typeof item.threadId === "string" ? item.threadId : null,
        displayName:
          typeof item.displayName === "string" ? item.displayName : null,
        lastMessageAt: String(item.lastMessageAt ?? new Date().toISOString()),
      })),
    };
  }

  @Mutation(() => ManagedMessagingGatewayStatusObject)
  async enableManagedMessagingGateway(): Promise<ManagedMessagingGatewayStatusObject> {
    return toStatusObject(await getManagedMessagingGatewayService().enable());
  }

  @Mutation(() => ManagedMessagingGatewayStatusObject)
  async disableManagedMessagingGateway(): Promise<ManagedMessagingGatewayStatusObject> {
    return toStatusObject(await getManagedMessagingGatewayService().disable());
  }

  @Mutation(() => ManagedMessagingGatewayStatusObject)
  async updateManagedMessagingGateway(): Promise<ManagedMessagingGatewayStatusObject> {
    return toStatusObject(await getManagedMessagingGatewayService().update());
  }

  @Mutation(() => ManagedMessagingGatewayStatusObject)
  async saveManagedMessagingGatewayProviderConfig(
    @Arg("input", () => GraphQLJSONObject) input: Record<string, unknown>,
  ): Promise<ManagedMessagingGatewayStatusObject> {
    return toStatusObject(
      await getManagedMessagingGatewayService().saveProviderConfig(input),
    );
  }
}

