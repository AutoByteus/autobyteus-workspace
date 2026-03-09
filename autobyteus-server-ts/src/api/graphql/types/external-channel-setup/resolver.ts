import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import type { ChannelBindingLaunchPreset } from "../../../../external-channel/domain/models.js";
import { normalizeRuntimeKind } from "../../../../runtime-management/runtime-kind.js";
import {
  ExternalChannelCapabilities,
  ExternalChannelBindingGql,
  UpsertExternalChannelBindingInput,
} from "./types.js";
import {
  getBindingService,
  getConstraintService,
  getDiscordBindingIdentityValidator,
} from "./services.js";
import { toGraphqlBinding } from "./mapper.js";
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
  private readonly agentDefinitionService = AgentDefinitionService.getInstance();

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
    if (targetType !== "AGENT") {
      throw new GraphQLError(
        "Definition-bound messaging bindings currently support AGENT targets only.",
        {
          extensions: {
            code: "EXTERNAL_CHANNEL_TARGET_TYPE_NOT_SUPPORTED",
            field: "targetType",
            detail:
              "Definition-bound messaging bindings currently support AGENT targets only.",
          },
        },
      );
    }

    const targetAgentDefinitionId = normalizeRequiredString(
      input.targetAgentDefinitionId,
      "targetAgentDefinitionId",
    );
    const agentDefinition = await this.agentDefinitionService.getAgentDefinitionById(
      targetAgentDefinitionId,
    );
    if (!agentDefinition) {
      throw new GraphQLError("Selected agent definition does not exist.", {
        extensions: {
          code: "TARGET_AGENT_DEFINITION_NOT_FOUND",
          field: "targetAgentDefinitionId",
          detail: `Agent definition '${targetAgentDefinitionId}' was not found.`,
        },
      });
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
      targetType: "AGENT",
      agentDefinitionId: targetAgentDefinitionId,
      launchPreset: normalizeLaunchPreset(input.launchPreset),
      agentRunId: null,
      teamRunId: null,
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

const normalizeLaunchPreset = (
  input: UpsertExternalChannelBindingInput["launchPreset"],
): ChannelBindingLaunchPreset => {
  return {
    workspaceRootPath: normalizeRequiredString(
      input.workspaceRootPath,
      "launchPreset.workspaceRootPath",
    ),
    llmModelIdentifier: normalizeRequiredString(
      input.llmModelIdentifier,
      "launchPreset.llmModelIdentifier",
    ),
    runtimeKind: normalizeRuntimeKind(input.runtimeKind),
    autoExecuteTools: input.autoExecuteTools ?? false,
    skillAccessMode: input.skillAccessMode ?? null,
    llmConfig: input.llmConfig ?? null,
  };
};
