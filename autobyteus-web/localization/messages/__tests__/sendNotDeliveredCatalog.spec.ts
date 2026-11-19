import { describe, expect, it } from 'vitest';
import type { TranslationCatalog } from '../../runtime/types';
import enAgentsMessages from '../en/agents';
import zhCnAgentsMessages from '../zh-CN/agents';

const KEYS = ['agents.send.notDelivered.notSent', 'agents.send.notDelivered.unknown', 'agents.send.notDelivered.dismiss'];
/** Words a user must never read in the notice (autobyteus-540 REQ-004, QR-001). */
const INTERNAL = /SESSION_NOT_READY|stream|session|socket|AgentRun|run id|_|会话|套接字/i;

describe('not-delivered notice texts (autobyteus-540 REQ-004, QR-001)', () => {
  it.each([
    ['en', enAgentsMessages],
    ['zh-CN', zhCnAgentsMessages],
  ])('%s: both texts and the dismiss label exist and use no internal words', (_locale, messages) => {
    const catalog = messages as TranslationCatalog;
    for (const key of KEYS) {
      expect(catalog[key], key).toBeTruthy();
      expect(catalog[key]).not.toMatch(INTERNAL);
    }
  });

  it('English reads as REQ-004 states', () => {
    const en = enAgentsMessages as TranslationCatalog;
    expect(en['agents.send.notDelivered.notSent']).toBe('Your message was not sent: not connected to the node. It is back in the message box; send it again.');
    expect(en['agents.send.notDelivered.unknown']).toBe('The connection to the node was lost while sending. Your message is back in the message box; if it does not appear in the conversation, send it again.');
  });
});
