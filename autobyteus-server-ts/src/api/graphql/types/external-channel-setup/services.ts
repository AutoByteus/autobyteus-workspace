import { getProviderProxySet } from "../../../../external-channel/providers/provider-proxy-set.js";
import { ChannelBindingService } from "../../../../external-channel/services/channel-binding-service.js";
import { ChannelBindingConstraintService } from "../../../../external-channel/services/channel-binding-constraint-service.js";
import { ChannelBindingTargetOptionsService } from "../../../../external-channel/services/channel-binding-target-options-service.js";
import { DiscordBindingIdentityValidator } from "../../../../external-channel/services/discord-binding-identity-validator.js";

let cachedBindingService: ChannelBindingService | null = null;
let cachedTargetOptionsService: ChannelBindingTargetOptionsService | null = null;
let cachedConstraintService: ChannelBindingConstraintService | null = null;
let cachedDiscordBindingIdentityValidator: DiscordBindingIdentityValidator | null = null;

export const getBindingService = (): ChannelBindingService => {
  if (!cachedBindingService) {
    const providerSet = getProviderProxySet();
    cachedBindingService = new ChannelBindingService(providerSet.bindingProvider);
  }
  return cachedBindingService;
};

export const getTargetOptionsService = (): ChannelBindingTargetOptionsService => {
  if (!cachedTargetOptionsService) {
    cachedTargetOptionsService = new ChannelBindingTargetOptionsService();
  }
  return cachedTargetOptionsService;
};

export const getConstraintService = (): ChannelBindingConstraintService => {
  if (!cachedConstraintService) {
    cachedConstraintService = new ChannelBindingConstraintService();
  }
  return cachedConstraintService;
};

export const getDiscordBindingIdentityValidator = (): DiscordBindingIdentityValidator => {
  if (!cachedDiscordBindingIdentityValidator) {
    cachedDiscordBindingIdentityValidator = new DiscordBindingIdentityValidator();
  }
  return cachedDiscordBindingIdentityValidator;
};
