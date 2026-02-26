import {
  parseExternalChannelProvider,
  ExternalChannelProvider,
} from "autobyteus-ts/external-channel/provider.js";
import {
  parseExternalChannelTransport,
  type ExternalChannelTransport,
} from "autobyteus-ts/external-channel/channel-transport.js";
import { GraphQLError } from "graphql";
import type { ChannelBindingTargetType } from "../../../../external-channel/domain/models.js";
import {
  DiscordBindingIdentityValidationError,
  DiscordBindingIdentityValidator,
} from "../../../../external-channel/services/discord-binding-identity-validator.js";

export const parseTargetType = (value: string): ChannelBindingTargetType => {
  const normalized = normalizeRequiredString(value, "targetType").toUpperCase();
  if (normalized === "AGENT" || normalized === "TEAM") {
    return normalized;
  }
  throw new Error(`Unsupported targetType: ${value}`);
};

export const parseProvider = (value: string): ExternalChannelProvider =>
  parseExternalChannelProvider(normalizeRequiredString(value, "provider"));

export const parseTransport = (value: string): ExternalChannelTransport =>
  parseExternalChannelTransport(normalizeRequiredString(value, "transport"));

export const validateDiscordIdentityOrThrow = (
  input: {
    accountId: string;
    peerId: string;
    threadId: string | null;
  },
  validator: DiscordBindingIdentityValidator,
): void => {
  try {
    validator.validate(input);
  } catch (error) {
    if (error instanceof DiscordBindingIdentityValidationError) {
      const payload = error.toPayload();
      throw new GraphQLError(payload.detail, {
        extensions: payload,
      });
    }
    throw error;
  }
};

export const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

export const normalizeOptionalString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
