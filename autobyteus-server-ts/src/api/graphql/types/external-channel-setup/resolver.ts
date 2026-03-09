import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import {
  ExternalChannelCapabilities,
  ExternalChannelBindingGql,
  ExternalChannelBindingTargetOptionGql,
  UpsertExternalChannelBindingInput,
} from "./types.js";
import {
  getBindingService,
  getConstraintService,
  getDiscordBindingIdentityValidator,
  getTargetOptionsService,
} from "./services.js";
import { toGraphqlBinding, toGraphqlTargetOption } from "./mapper.js";
import {
  normalizeOptionalString,
  normalizeRequiredString,
  parseProvider,
  parseTargetType,
  parseTransport,
  validateDiscordIdentityOrThrow,
} from "./validator.js";

@Resolver()
export class ExternalChannelSetupResolver {
  @Query(() => ExternalChannelCapabilities)
  externalChannelCapabilities(): ExternalChannelCapabilities {
    return {
      bindingCrudEnabled: true,
      reason: null,
      acceptedProviderTransportPairs: getConstraintService().getAcceptedProviderTransportPairs(),
    };
  }

  @Query(() => [ExternalChannelBindingGql])
  async externalChannelBindings(): Promise<ExternalChannelBindingGql[]> {
    const bindings = await getBindingService().listBindings();
    return bindings.map((binding) => toGraphqlBinding(binding));
  }

  @Query(() => [ExternalChannelBindingTargetOptionGql])
  async externalChannelBindingTargetOptions(): Promise<
    ExternalChannelBindingTargetOptionGql[]
  > {
    const options = await getTargetOptionsService().listActiveTargetOptions();
    return options.map((option) => toGraphqlTargetOption(option));
  }

  @Mutation(() => ExternalChannelBindingGql)
  async upsertExternalChannelBinding(
    @Arg("input", () => UpsertExternalChannelBindingInput)
    input: UpsertExternalChannelBindingInput,
  ): Promise<ExternalChannelBindingGql> {
    const provider = parseProvider(input.provider);
    const transport = parseTransport(input.transport);
    getConstraintService().validateProviderTransport(provider, transport);
    const accountId = normalizeRequiredString(input.accountId, "accountId");
    const peerId = normalizeRequiredString(input.peerId, "peerId");
    const threadId = normalizeOptionalString(input.threadId ?? null);

    const targetType = parseTargetType(input.targetType);
    const targetRunId = normalizeRequiredString(input.targetRunId, "targetRunId");

    if (provider === ExternalChannelProvider.TELEGRAM && targetType === "TEAM") {
      throw new GraphQLError("Telegram bindings currently support AGENT targets only.", {
        extensions: {
          code: "TELEGRAM_TEAM_TARGET_NOT_SUPPORTED",
          field: "targetType",
          detail: "Telegram bindings currently support AGENT targets only.",
        },
      });
    }

    const isActiveTarget = await getTargetOptionsService().isActiveTarget(
      targetType,
      targetRunId,
    );
    if (!isActiveTarget) {
      throw new Error(
        `TARGET_NOT_ACTIVE: selected ${targetType.toLowerCase()} target '${targetRunId}' is not active.`,
      );
    }

    if (provider === ExternalChannelProvider.DISCORD) {
      validateDiscordIdentityOrThrow(
        {
          accountId,
          peerId,
          threadId,
        },
        getDiscordBindingIdentityValidator(),
      );
    }

    const binding = await getBindingService().upsertBinding({
      provider,
      transport,
      accountId,
      peerId,
      threadId,
      targetType,
      agentRunId: targetType === "AGENT" ? targetRunId : null,
      teamRunId: targetType === "TEAM" ? targetRunId : null,
    });

    return toGraphqlBinding(binding);
  }

  @Mutation(() => Boolean)
  async deleteExternalChannelBinding(
    @Arg("id", () => String) id: string,
  ): Promise<boolean> {
    return getBindingService().deleteBinding(id);
  }
}
