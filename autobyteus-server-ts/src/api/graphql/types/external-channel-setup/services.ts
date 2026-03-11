import { getProviderProxySet } from "../../../../external-channel/providers/provider-proxy-set.js";
import { ChannelBindingService } from "../../../../external-channel/services/channel-binding-service.js";
import { ChannelBindingConstraintService } from "../../../../external-channel/services/channel-binding-constraint-service.js";
import { ChannelBindingTeamDefinitionOptionsService } from "../../../../external-channel/services/channel-binding-team-definition-options-service.js";
import { DiscordBindingIdentityValidator } from "../../../../external-channel/services/discord-binding-identity-validator.js";

let cachedBindingService: ChannelBindingService | null = null;
let cachedConstraintService: ChannelBindingConstraintService | null = null;
let cachedTeamDefinitionOptionsService: ChannelBindingTeamDefinitionOptionsService | null = null;
let cachedDiscordBindingIdentityValidator: DiscordBindingIdentityValidator | null = null;

export const getBindingService = (): ChannelBindingService => {
  if (!cachedBindingService) {
    const providerSet = getProviderProxySet();
    cachedBindingService = new ChannelBindingService(providerSet.bindingProvider);
  }
  return cachedBindingService;
};

export const getConstraintService = (): ChannelBindingConstraintService => {
  if (!cachedConstraintService) {
    cachedConstraintService = new ChannelBindingConstraintService();
  }
  return cachedConstraintService;
};

export const getTeamDefinitionOptionsService = (): ChannelBindingTeamDefinitionOptionsService => {
  if (!cachedTeamDefinitionOptionsService) {
    cachedTeamDefinitionOptionsService = new ChannelBindingTeamDefinitionOptionsService();
  }
  return cachedTeamDefinitionOptionsService;
};

export const getDiscordBindingIdentityValidator = (): DiscordBindingIdentityValidator => {
  if (!cachedDiscordBindingIdentityValidator) {
    cachedDiscordBindingIdentityValidator = new DiscordBindingIdentityValidator();
  }
  return cachedDiscordBindingIdentityValidator;
};
