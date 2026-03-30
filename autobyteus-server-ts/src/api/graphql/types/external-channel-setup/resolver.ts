import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import type {
  ChannelBindingLaunchPreset,
  ChannelBindingTeamLaunchPreset,
} from "../../../../external-channel/domain/models.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../../../runtime-management/runtime-kind-enum.js";
import {
  ExternalChannelCapabilities,
  ExternalChannelBindingGql,
  ExternalChannelTeamDefinitionOptionGql,
  UpsertExternalChannelBindingInput,
} from "./types.js";
import {
  getBindingService,
  getConstraintService,
  getDiscordBindingIdentityValidator,
  getTeamDefinitionOptionsService,
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

  @Query(() => [ExternalChannelTeamDefinitionOptionGql])
  async externalChannelTeamDefinitionOptions(): Promise<
    ExternalChannelTeamDefinitionOptionGql[]
  > {
    return getTeamDefinitionOptionsService().listTeamDefinitionOptions();
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

    if (targetType === "TEAM") {
      const targetTeamDefinitionId = normalizeRequiredString(
        input.targetTeamDefinitionId ?? "",
        "targetTeamDefinitionId",
      );
      await getTeamDefinitionOptionsService().requireTeamDefinition(targetTeamDefinitionId);

      const binding = await getBindingService().upsertBinding({
        provider,
        transport,
        accountId,
        peerId,
        threadId,
        targetType: "TEAM",
        agentDefinitionId: null,
        launchPreset: null,
        agentRunId: null,
        teamDefinitionId: targetTeamDefinitionId,
        teamLaunchPreset: normalizeTeamLaunchPreset(input.teamLaunchPreset),
        teamRunId: null,
        targetNodeName: null,
      });

      return toGraphqlBinding(binding);
    }

    const targetAgentDefinitionId = normalizeRequiredString(
      input.targetAgentDefinitionId ?? "",
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
      teamDefinitionId: null,
      teamLaunchPreset: null,
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
  if (!input) {
    throw new Error("launchPreset is required for AGENT bindings.");
  }
  return {
    workspaceRootPath: normalizeRequiredString(
      input.workspaceRootPath,
      "launchPreset.workspaceRootPath",
    ),
    llmModelIdentifier: normalizeRequiredString(
      input.llmModelIdentifier,
      "launchPreset.llmModelIdentifier",
    ),
    runtimeKind: runtimeKindFromString(input.runtimeKind, RuntimeKind.AUTOBYTEUS) ?? RuntimeKind.AUTOBYTEUS,
    autoExecuteTools: input.autoExecuteTools ?? false,
    skillAccessMode: input.skillAccessMode,
    llmConfig: input.llmConfig ?? null,
  };
};

const normalizeTeamLaunchPreset = (
  input: UpsertExternalChannelBindingInput["teamLaunchPreset"],
): ChannelBindingTeamLaunchPreset => {
  if (!input) {
    throw new Error("teamLaunchPreset is required for TEAM bindings.");
  }
  return {
    workspaceRootPath: normalizeRequiredString(
      input.workspaceRootPath,
      "teamLaunchPreset.workspaceRootPath",
    ),
    llmModelIdentifier: normalizeRequiredString(
      input.llmModelIdentifier,
      "teamLaunchPreset.llmModelIdentifier",
    ),
    runtimeKind: runtimeKindFromString(input.runtimeKind, RuntimeKind.AUTOBYTEUS) ?? RuntimeKind.AUTOBYTEUS,
    autoExecuteTools: input.autoExecuteTools ?? false,
    skillAccessMode: input.skillAccessMode ?? SkillAccessMode.PRELOADED_ONLY,
    llmConfig: input.llmConfig ?? null,
  };
};
