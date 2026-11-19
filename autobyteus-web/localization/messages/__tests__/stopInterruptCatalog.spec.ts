import { describe, expect, it } from 'vitest';
import type { TranslationCatalog } from '../../runtime/types';
import enAgentsMessages from '../en/agents';
import zhCnAgentsMessages from '../zh-CN/agents';

const KEYS = ['agents.interrupt.stopping', 'agents.interrupt.notSent', 'agents.interrupt.failed'];
/** Words a user must never read in a Stop message (autobyteus-533 REQ-006, QR-001): ids, codes, internal terms. */
const INTERNAL = /AgentRun|canonical|turn|NO_ACTIVE_TURN|RUN_NOT|stream is|_/i;

describe('Stop texts (autobyteus-533 REQ-006, QR-001)', () => {
  it.each([
    ['en', enAgentsMessages],
    ['zh-CN', zhCnAgentsMessages],
  ])('%s: plain Stopping / not sent / could not stop texts, naming the agent, with no internal words', (_locale, messages) => {
    const catalog = messages as TranslationCatalog;
    for (const key of KEYS) {
      expect(catalog[key], key).toBeTruthy();
      expect(catalog[key]).not.toMatch(INTERNAL);
    }
    expect(catalog['agents.interrupt.failed']).toContain('{{name}}');
    expect(Object.keys(catalog).filter((key) => key.startsWith('agents.store.interrupt.'))).toEqual([]);
  });

  it('English reads as the design states', () => {
    const en = enAgentsMessages as TranslationCatalog;
    expect(en['agents.interrupt.stopping']).toBe('Stopping…');
    expect(en['agents.interrupt.notSent']).toBe('Stop was not sent: not connected to the node. Check the connection and try again.');
    expect(en['agents.interrupt.failed']).toBe('Could not stop {{name}}. Please try again.');
  });
});
