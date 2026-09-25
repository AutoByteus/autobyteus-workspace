import { describe, expect, it } from 'vitest';
import {
  assertValidDiscordBindingIdentity,
  validateDiscordBindingIdentity
} from '../../../src/external-channel/discord-binding-identity.js';
import { ExternalChannelParseError } from '../../../src/external-channel/errors.js';

describe('discord-binding-identity', () => {
  it('accepts valid channel peer with threadId', () => {
    const issues = validateDiscordBindingIdentity({
      accountId: 'discord-acct-1',
      peerId: 'channel:1234567890',
      threadId: '9876543210',
      expectedAccountId: 'discord-acct-1'
    });

    expect(issues).toEqual([]);
  });

  it('accepts valid user peer without threadId', () => {
    const issues = validateDiscordBindingIdentity({
      accountId: 'discord-acct-1',
      peerId: 'user:1234567890',
      threadId: null
    });

    expect(issues).toEqual([]);
  });

  it('flags invalid peerId format', () => {
    const issues = validateDiscordBindingIdentity({
      accountId: 'discord-acct-1',
      peerId: 'peer-123',
      threadId: null
    });

    expect(issues.some((issue) => issue.code === 'INVALID_DISCORD_PEER_ID')).toBe(true);
  });

  it('flags invalid threadId format', () => {
    const issues = validateDiscordBindingIdentity({
      accountId: 'discord-acct-1',
      peerId: 'channel:1234567890',
      threadId: 'thread-abc'
    });

    expect(issues.some((issue) => issue.code === 'INVALID_DISCORD_THREAD_ID')).toBe(true);
  });

  it('flags invalid thread-target pairing', () => {
    const issues = validateDiscordBindingIdentity({
      accountId: 'discord-acct-1',
      peerId: 'user:1234567890',
      threadId: '9876543210'
    });

    expect(issues.some((issue) => issue.code === 'INVALID_DISCORD_THREAD_TARGET_COMBINATION')).toBe(true);
  });

  it('flags account mismatch when expectedAccountId is provided', () => {
    const issues = validateDiscordBindingIdentity({
      accountId: 'discord-acct-1',
      peerId: 'channel:1234567890',
      threadId: null,
      expectedAccountId: 'discord-acct-2'
    });

    expect(issues.some((issue) => issue.code === 'INVALID_DISCORD_ACCOUNT_ID')).toBe(true);
  });

  it('assert helper throws parse error for first validation issue', () => {
    expect(() =>
      assertValidDiscordBindingIdentity({
        accountId: 'discord-acct-1',
        peerId: 'user:1234567890',
        threadId: '9876543210'
      })
    ).toThrowError(ExternalChannelParseError);

    try {
      assertValidDiscordBindingIdentity({
        accountId: 'discord-acct-1',
        peerId: 'user:1234567890',
        threadId: '9876543210'
      });
    } catch (error) {
      expect((error as ExternalChannelParseError).code).toBe('INVALID_DISCORD_THREAD_TARGET_COMBINATION');
      expect((error as ExternalChannelParseError).field).toBe('threadId');
    }
  });
});

