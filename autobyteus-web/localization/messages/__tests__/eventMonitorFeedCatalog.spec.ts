import { describe, expect, it } from 'vitest';
import type { TranslationCatalog } from '../../runtime/types';
import enWorkspaceMessages from '../en/workspace';
import zhCnWorkspaceMessages from '../zh-CN/workspace';

describe('Event Monitor feed localization', () => {
  it('keeps only the approved non-visual names and exposes no internal page count', () => {
    const en = enWorkspaceMessages as TranslationCatalog;
    const zhCn = zhCnWorkspaceMessages as TranslationCatalog;
    const prefix = 'workspace.components.workspace.agent.AgentConversationFeed.';
    const obsoleteSuffixes = [
      'load_50_earlier', 'loading_earlier', 'active_trace_beginning', 'earlier_cursor_expired',
      'return_to_latest', 'newer_browse_released',
    ];

    expect(en[`${prefix}jump_to_latest`]).toBe('Jump to latest activity');
    expect(zhCn[`${prefix}jump_to_latest`]).toBe('跳到最新动态');
    expect(en[`${prefix}retry_earlier`]).toBe('Retry');
    expect(zhCn[`${prefix}retry_earlier`]).toBe('重试');
    for (const suffix of obsoleteSuffixes) {
      expect(en[`${prefix}${suffix}`]).toBeUndefined();
      expect(zhCn[`${prefix}${suffix}`]).toBeUndefined();
    }
  });
});
