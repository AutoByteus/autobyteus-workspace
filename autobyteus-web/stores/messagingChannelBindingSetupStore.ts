import { defineStore } from 'pinia';
import { validateDiscordBindingIdentity } from '~/utils/discordBindingIdentityValidation';
import { getApolloClient } from '~/utils/apolloClient';
import {
  EXTERNAL_CHANNEL_CAPABILITIES,
  EXTERNAL_CHANNEL_BINDINGS,
} from '~/graphql/queries/externalChannelSetupQueries';
import {
  DELETE_EXTERNAL_CHANNEL_BINDING,
  UPSERT_EXTERNAL_CHANNEL_BINDING,
} from '~/graphql/mutations/externalChannelSetupMutations';
import type {
  BindingScopeInput,
  BindingReadinessSnapshot,
  ExternalChannelBindingDraft,
  ExternalChannelBindingModel,
  ExternalChannelCapabilityModel,
} from '~/types/messaging';
import { useGatewayCapabilityStore } from '~/stores/gatewayCapabilityStore';

interface BindingSetupState {
  capabilities: ExternalChannelCapabilityModel;
  capabilityLoaded: boolean;
  capabilityLoading: boolean;
  capabilityError: string | null;
  capabilityBlocked: boolean;
  rolloutGateError: string | null;
  bindings: ExternalChannelBindingModel[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  fieldErrors: Partial<Record<keyof ExternalChannelBindingDraft, string>>;
}

type BindingField = keyof ExternalChannelBindingDraft;

class ServerFieldValidationError extends Error {
  readonly field: BindingField;

  constructor(field: BindingField, message: string) {
    super(message);
    this.name = 'ServerFieldValidationError';
    this.field = field;
  }
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Messaging channel request failed';
}

function hasSchemaFieldMissingError(error: unknown): boolean {
  const message = normalizeErrorMessage(error).toLowerCase();
  return (
    message.includes('cannot query field') ||
    message.includes('cannot return null for non-nullable field') ||
    message.includes('unknown argument')
  );
}

function sortByUpdatedAtDesc(bindings: ExternalChannelBindingModel[]): ExternalChannelBindingModel[] {
  return [...bindings].sort((a, b) => {
    const left = new Date(a.updatedAt).getTime();
    const right = new Date(b.updatedAt).getTime();
    return right - left;
  });
}

function buildSupportedPairSet(capabilities: ExternalChannelCapabilityModel): Set<string> {
  const pairs = capabilities.acceptedProviderTransportPairs || [];
  return new Set(
    pairs
      .filter((pair) => typeof pair === 'string')
      .map((pair) => pair.trim().toUpperCase())
      .filter((pair) => pair.length > 0),
  );
}

function isProviderTransportSupported(
  draft: ExternalChannelBindingDraft,
  capabilities: ExternalChannelCapabilityModel,
): boolean {
  const supportedPairs = buildSupportedPairSet(capabilities);
  if (supportedPairs.size === 0) {
    return false;
  }
  const key = `${draft.provider}:${draft.transport}`.toUpperCase();
  return supportedPairs.has(key);
}

function normalizeScopeAccountId(accountId?: string | null): string | null {
  if (typeof accountId !== 'string') {
    return null;
  }
  const normalized = accountId.trim();
  return normalized.length > 0 ? normalized : null;
}

function bindingMatchesScope(
  binding: ExternalChannelBindingModel,
  scope: BindingScopeInput,
): boolean {
  if (binding.provider !== scope.provider) {
    return false;
  }
  if (binding.transport !== scope.transport) {
    return false;
  }
  const scopedAccountId = normalizeScopeAccountId(scope.accountId);
  if (!scopedAccountId) {
    return true;
  }
  return binding.accountId.trim() === scopedAccountId;
}

function isBindingField(value: unknown): value is BindingField {
  return (
    value === 'provider' ||
    value === 'transport' ||
    value === 'accountId' ||
    value === 'peerId' ||
    value === 'threadId' ||
    value === 'targetType' ||
    value === 'targetId'
  );
}

function issueCodeToField(code: string): BindingField | null {
  if (code === 'INVALID_DISCORD_PEER_ID') {
    return 'peerId';
  }
  if (code === 'INVALID_DISCORD_THREAD_ID') {
    return 'threadId';
  }
  if (code === 'INVALID_DISCORD_ACCOUNT_ID') {
    return 'accountId';
  }
  if (code === 'INVALID_DISCORD_THREAD_TARGET_COMBINATION') {
    return 'threadId';
  }
  if (code === 'TELEGRAM_TEAM_TARGET_NOT_SUPPORTED') {
    return 'targetType';
  }
  return null;
}

function toServerFieldValidationError(entry: {
  message?: unknown;
  extensions?: unknown;
}): ServerFieldValidationError | null {
  const extensions =
    typeof entry.extensions === 'object' && entry.extensions !== null
      ? (entry.extensions as Record<string, unknown>)
      : null;
  const extensionCode = typeof extensions?.code === 'string' ? extensions.code : null;
  const extensionField =
    typeof extensions?.field === 'string' && isBindingField(extensions.field)
      ? extensions.field
      : null;
  const extensionDetail = typeof extensions?.detail === 'string' ? extensions.detail : null;

  const resolvedField = extensionField ?? (extensionCode ? issueCodeToField(extensionCode) : null);
  if (!resolvedField) {
    return null;
  }

  const resolvedMessage =
    extensionDetail ||
    (typeof entry.message === 'string' ? entry.message : 'Binding validation failed.');
  return new ServerFieldValidationError(resolvedField, resolvedMessage);
}

function extractServerFieldValidationError(error: unknown): ServerFieldValidationError | null {
  if (error instanceof ServerFieldValidationError) {
    return error;
  }

  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const graphQLErrors = (error as { graphQLErrors?: unknown }).graphQLErrors;
  if (!Array.isArray(graphQLErrors)) {
    return null;
  }

  for (const graphQLError of graphQLErrors) {
    if (typeof graphQLError !== 'object' || graphQLError === null) {
      continue;
    }
    const mapped = toServerFieldValidationError(
      graphQLError as { message?: unknown; extensions?: unknown },
    );
    if (mapped) {
      return mapped;
    }
  }

  return null;
}

export const useMessagingChannelBindingSetupStore = defineStore(
  'messagingChannelBindingSetupStore',
  {
  state: (): BindingSetupState => ({
    capabilities: {
      bindingCrudEnabled: false,
      reason: undefined,
      acceptedProviderTransportPairs: [],
    },
    capabilityLoaded: false,
    capabilityLoading: false,
    capabilityError: null,
    capabilityBlocked: false,
    rolloutGateError: null,
    bindings: [],
    isLoading: false,
    isMutating: false,
    error: null,
    fieldErrors: {},
  }),

  actions: {
    async loadCapabilities() {
      this.capabilityLoading = true;
      this.capabilityError = null;

      try {
        const client = getApolloClient();
        const { data, errors } = await client.query({
          query: EXTERNAL_CHANNEL_CAPABILITIES,
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        }

        const capabilities = data?.externalChannelCapabilities as
          | ExternalChannelCapabilityModel
          | undefined;

        this.capabilities = capabilities || {
          bindingCrudEnabled: false,
          reason: 'Capability response unavailable',
          acceptedProviderTransportPairs: [],
        };
        this.capabilityBlocked = !this.capabilities.bindingCrudEnabled;
        this.capabilityLoaded = true;
        this.rolloutGateError = null;
        return this.capabilities;
      } catch (error) {
        this.capabilityLoaded = true;
        this.capabilityBlocked = true;
        this.capabilityError = normalizeErrorMessage(error);
        this.capabilities = {
          bindingCrudEnabled: false,
          reason: this.capabilityError,
          acceptedProviderTransportPairs: [],
        };
        throw error;
      } finally {
        this.capabilityLoading = false;
      }
    },

    async loadBindingsIfEnabled() {
      this.error = null;

      if (!this.capabilities.bindingCrudEnabled) {
        this.bindings = [];
        return [];
      }

      this.isLoading = true;
      try {
        const client = getApolloClient();
        const { data, errors } = await client.query({
          query: EXTERNAL_CHANNEL_BINDINGS,
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        }

        const bindings = (data?.externalChannelBindings || []) as ExternalChannelBindingModel[];
        this.bindings = sortByUpdatedAtDesc(bindings);
        return this.bindings;
      } catch (error) {
        this.error = normalizeErrorMessage(error);

        if (hasSchemaFieldMissingError(error)) {
          this.capabilityBlocked = true;
          this.rolloutGateError = this.error;
          this.capabilities = {
            bindingCrudEnabled: false,
            reason: this.error,
          };
        }

        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    validateDraft(
      draft: ExternalChannelBindingDraft,
    ): Partial<Record<keyof ExternalChannelBindingDraft, string>> {
      const errors: Partial<Record<keyof ExternalChannelBindingDraft, string>> = {};
      const gatewayCapabilityStore = useGatewayCapabilityStore();

      if (!draft.accountId.trim()) {
        errors.accountId = 'Account ID is required';
      }
      if (!draft.peerId.trim()) {
        errors.peerId = 'Peer ID is required';
      }
      if (!draft.targetId.trim()) {
        errors.targetId = 'Target ID is required';
      }
      if (!isProviderTransportSupported(draft, this.capabilities)) {
        errors.transport = `Transport ${draft.transport} is not supported for provider ${draft.provider}.`;
      }

      if (draft.provider === 'TELEGRAM' && draft.targetType === 'TEAM') {
        errors.targetType = 'Telegram bindings currently support AGENT targets only.';
      }

      if (draft.provider === 'DISCORD') {
        const validationIssues = validateDiscordBindingIdentity({
          accountId: draft.accountId,
          peerId: draft.peerId,
          threadId: draft.threadId,
          expectedAccountId: gatewayCapabilityStore.capabilities?.discordAccountId || undefined,
        });

        for (const issue of validationIssues) {
          if (!errors[issue.field]) {
            errors[issue.field] = issue.detail;
          }
        }
      }

      return errors;
    },

    async upsertBinding(draft: ExternalChannelBindingDraft) {
      this.error = null;

      if (!this.capabilities.bindingCrudEnabled) {
        try {
          await this.loadCapabilities();
        } catch (error) {
          this.error = this.capabilityError || 'Binding API is not available on the current server.';
          throw error;
        }
      }

      if (!this.capabilities.bindingCrudEnabled) {
        this.error =
          this.capabilities.reason || 'Binding API is not available on the current server.';
        throw new Error(this.error);
      }

      this.fieldErrors = this.validateDraft(draft);

      if (Object.keys(this.fieldErrors).length > 0) {
        throw new Error('Binding validation failed');
      }

      this.isMutating = true;
      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate({
          mutation: UPSERT_EXTERNAL_CHANNEL_BINDING,
          variables: {
            input: {
              provider: draft.provider,
              transport: draft.transport,
              accountId: draft.accountId,
              peerId: draft.peerId,
              threadId: draft.threadId,
              targetType: draft.targetType,
              targetId: draft.targetId,
            },
          },
        });

        if (errors && errors.length > 0) {
          const mappedError = toServerFieldValidationError(errors[0] as any);
          if (mappedError) {
            throw mappedError;
          }
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        }

        const binding = data?.upsertExternalChannelBinding as ExternalChannelBindingModel | undefined;
        if (!binding) {
          throw new Error('Binding mutation returned empty payload');
        }

        this.applyUpsertResult(binding);
        return binding;
      } catch (error) {
        const validationError = extractServerFieldValidationError(error);
        if (validationError) {
          this.fieldErrors = {
            ...this.fieldErrors,
            [validationError.field]: validationError.message,
          };
          this.error = validationError.message;
          throw validationError;
        }

        this.error = normalizeErrorMessage(error);
        if (hasSchemaFieldMissingError(error)) {
          this.capabilityBlocked = true;
          this.rolloutGateError = this.error;
          this.capabilities = {
            bindingCrudEnabled: false,
            reason: this.error,
          };
        }
        throw error;
      } finally {
        this.isMutating = false;
      }
    },

    applyUpsertResult(binding: ExternalChannelBindingModel) {
      const index = this.bindings.findIndex((item) => item.id === binding.id);
      if (index >= 0) {
        this.bindings[index] = binding;
      } else {
        this.bindings.push(binding);
      }
      this.bindings = sortByUpdatedAtDesc(this.bindings);
    },

    async deleteBinding(bindingId: string) {
      if (!this.capabilities.bindingCrudEnabled) {
        try {
          await this.loadCapabilities();
        } catch (error) {
          this.error = this.capabilityError || 'Binding API is not available on the current server.';
          throw error;
        }
      }

      if (!this.capabilities.bindingCrudEnabled) {
        this.error =
          this.capabilities.reason || 'Binding API is not available on the current server.';
        throw new Error(this.error);
      }

      this.isMutating = true;
      this.error = null;

      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate({
          mutation: DELETE_EXTERNAL_CHANNEL_BINDING,
          variables: {
            id: bindingId,
          },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        }

        if (!data?.deleteExternalChannelBinding) {
          throw new Error('Delete binding failed');
        }

        this.bindings = this.bindings.filter((binding) => binding.id !== bindingId);
      } catch (error) {
        this.error = normalizeErrorMessage(error);
        throw error;
      } finally {
        this.isMutating = false;
      }
    },

    getCapabilitySnapshot() {
      return {
        enabled: this.capabilities.bindingCrudEnabled,
        blockedReason: this.capabilities.bindingCrudEnabled
          ? null
          : this.capabilities.reason || this.capabilityError || 'Binding API unavailable',
      };
    },

    bindingsForScope(scope: BindingScopeInput): ExternalChannelBindingModel[] {
      return this.bindings.filter((binding) => bindingMatchesScope(binding, scope));
    },

    getReadinessSnapshotForScope(scope: BindingScopeInput): BindingReadinessSnapshot {
      const scopedBindings = this.bindingsForScope(scope);
      return {
        capabilityEnabled: this.capabilities.bindingCrudEnabled,
        capabilityBlockedReason: this.capabilities.bindingCrudEnabled
          ? null
          : this.capabilities.reason || this.capabilityError || 'Binding API unavailable',
        hasBindings: scopedBindings.length > 0,
        bindingError: this.error,
        bindingsInScope: scopedBindings.length,
      };
    },
  },
  },
);
