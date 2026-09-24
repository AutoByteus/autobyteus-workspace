import { throwParseError } from './errors.js';

const DISCORD_PEER_ID_PATTERN = /^(user|channel):[0-9]+$/;
const DISCORD_THREAD_ID_PATTERN = /^[0-9]+$/;

export type DiscordBindingIdentityValidationCode =
  | 'INVALID_DISCORD_PEER_ID'
  | 'INVALID_DISCORD_THREAD_ID'
  | 'INVALID_DISCORD_ACCOUNT_ID'
  | 'INVALID_DISCORD_THREAD_TARGET_COMBINATION';

export type DiscordBindingIdentityValidationIssue = {
  code: DiscordBindingIdentityValidationCode;
  field: 'peerId' | 'threadId' | 'accountId';
  detail: string;
};

export type DiscordBindingIdentityInput = {
  accountId: unknown;
  peerId: unknown;
  threadId?: unknown;
  expectedAccountId?: unknown;
};

export function validateDiscordBindingIdentity(
  input: DiscordBindingIdentityInput
): DiscordBindingIdentityValidationIssue[] {
  const issues: DiscordBindingIdentityValidationIssue[] = [];

  const accountId = normalizeRequiredString(input.accountId);
  const peerId = normalizeRequiredString(input.peerId);
  const threadId = normalizeOptionalString(input.threadId);
  const expectedAccountId = normalizeOptionalString(input.expectedAccountId);

  if (accountId === null) {
    issues.push({
      code: 'INVALID_DISCORD_ACCOUNT_ID',
      field: 'accountId',
      detail: 'Discord accountId must be a non-empty string.'
    });
  }

  if (peerId === null || !DISCORD_PEER_ID_PATTERN.test(peerId)) {
    issues.push({
      code: 'INVALID_DISCORD_PEER_ID',
      field: 'peerId',
      detail: 'Discord peerId must match user:<snowflake> or channel:<snowflake>.'
    });
  }

  if (threadId !== null && !DISCORD_THREAD_ID_PATTERN.test(threadId)) {
    issues.push({
      code: 'INVALID_DISCORD_THREAD_ID',
      field: 'threadId',
      detail: 'Discord threadId must be a snowflake string when provided.'
    });
  }

  if (expectedAccountId !== null && accountId !== null && accountId !== expectedAccountId) {
    issues.push({
      code: 'INVALID_DISCORD_ACCOUNT_ID',
      field: 'accountId',
      detail: `Discord accountId must match configured account (${expectedAccountId}).`
    });
  }

  if (threadId !== null && peerId !== null && peerId.startsWith('user:')) {
    issues.push({
      code: 'INVALID_DISCORD_THREAD_TARGET_COMBINATION',
      field: 'threadId',
      detail: 'Discord threadId can only be used with channel:<snowflake> peerId targets.'
    });
  }

  return issues;
}

export function assertValidDiscordBindingIdentity(input: DiscordBindingIdentityInput): void {
  const issues = validateDiscordBindingIdentity(input);
  if (issues.length > 0) {
    const firstIssue = issues[0];
    throwParseError(firstIssue.code, firstIssue.detail, firstIssue.field);
  }
}

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return normalizeRequiredString(value);
}

