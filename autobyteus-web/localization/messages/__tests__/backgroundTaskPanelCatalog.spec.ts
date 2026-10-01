import { describe, expect, it } from 'vitest';
import type { TranslationCatalog } from '../../runtime/types';
import enWorkspaceMessages from '../en/workspace';
import enWorkspaceGeneratedMessages from '../en/workspace.generated';
import zhCnWorkspaceMessages from '../zh-CN/workspace';
import zhCnWorkspaceGeneratedMessages from '../zh-CN/workspace.generated';

const PREFIX = 'workspace.components.progress.BackgroundTaskPanel.';
const keysWith = (catalog: TranslationCatalog, fragment: string) => Object.keys(catalog).filter((key) => key.includes(fragment)).sort();

describe('Background Tasks panel localization', () => {
  it('names the section Background Tasks in English and Simplified Chinese with the same keys', () => {
    const en = enWorkspaceMessages as TranslationCatalog;
    const zhCn = zhCnWorkspaceMessages as TranslationCatalog;

    expect(keysWith(zhCn, PREFIX)).toEqual(keysWith(en, PREFIX));
    expect(keysWith(en, PREFIX)).toHaveLength(13);
    expect(en[`${PREFIX}title`]).toBe('Background Tasks');
    expect(en[`${PREFIX}empty`]).toBe('No background tasks');
    expect(en[`${PREFIX}counts`]).toBe('{{running}} running · {{total}} total');
    expect(zhCn[`${PREFIX}title`]).toBe('后台任务');
    expect(zhCn[`${PREFIX}counts`]).toContain('{{running}}');
    expect(zhCn[`${PREFIX}counts`]).toContain('{{total}}');
  });

  it('has no To-Do panel entries left (REQ-005)', () => {
    for (const catalog of [enWorkspaceMessages, enWorkspaceGeneratedMessages, zhCnWorkspaceMessages, zhCnWorkspaceGeneratedMessages]) {
      expect(keysWith(catalog as TranslationCatalog, 'TodoListPanel')).toEqual([]);
    }
  });
});
