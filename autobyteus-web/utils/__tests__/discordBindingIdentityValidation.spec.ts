import { describe, expect, it } from 'vitest';
import { validateDiscordBindingIdentity } from '~/utils/discordBindingIdentityValidation';

describe('validateDiscordBindingIdentity', () => {
  it('accepts a valid channel target with thread id', () => {
    const issues = validateDiscordBindingIdentity({
      accountId: 'discord-acct-1',
      peerId: 'channel:123456789',
      threadId: '987654321',
      expectedAccountId: 'discord-acct-1',
    });

    expect(issues).toHaveLength(0);
  });

  it('flags user target with thread id as invalid', () => {
    const issues = validateDiscordBindingIdentity({
      accountId: 'discord-acct-1',
      peerId: 'user:123456789',
      threadId: '987654321',
    });

    expect(issues.some((issue) => issue.code === 'INVALID_DISCORD_THREAD_TARGET_COMBINATION')).toBe(true);
  });

  it('flags mismatched expected account id', () => {
    const issues = validateDiscordBindingIdentity({
      accountId: 'discord-acct-2',
      peerId: 'channel:123456789',
      expectedAccountId: 'discord-acct-1',
    });

    expect(issues.some((issue) => issue.code === 'INVALID_DISCORD_ACCOUNT_ID')).toBe(true);
  });
});
