import { describe, expect, it } from 'vitest';
import { getCatalog } from '~/localization/runtime/catalogRegistry';

// autobyteus-458 REQ-009 / AC-007: the phone's run Settings texts; autobyteus-525 REQ-009 / AC-008: the run list's
// "On this phone" menu with the Text size. English and Chinese.
const KEYS = [
  'mobile.settings.menuEntry', 'mobile.settings.title', 'mobile.settings.stopRun', 'mobile.settings.save',
  'mobile.onThisPhone.title', 'mobile.onThisPhone.close', 'mobile.onThisPhone.textSize',
  'mobile.onThisPhone.textSize.standard', 'mobile.onThisPhone.textSize.large', 'mobile.onThisPhone.textSize.largest',
] as const;

describe('mobile.settings and mobile.onThisPhone catalogs', () => {
  it('carries every key in English and Chinese', () => {
    const en = getCatalog('en') as Record<string, string>;
    const zh = getCatalog('zh-CN') as Record<string, string>;
    for (const key of KEYS) {
      expect(en[key], key).toBeTruthy();
      expect(zh[key], key).toBeTruthy();
    }
    expect(KEYS.map((key) => en[key])).toEqual(['Settings', 'Settings', 'Stop run', 'Save', 'On this phone', 'Close menu', 'Text size', 'Standard', 'Large', 'Largest']);
    // autobyteus-534: no Small step.
    expect(en['mobile.onThisPhone.textSize.small']).toBeUndefined();
    expect(zh['mobile.onThisPhone.textSize.small']).toBeUndefined();
    expect(zh['mobile.onThisPhone.title']).toBe('本机设置');
    // The Text size texts moved: the run's Settings no longer carries them.
    expect(Object.keys(en).filter((key) => key.startsWith('mobile.settings.textSize'))).toEqual([]);
    expect(Object.keys(zh).filter((key) => key.startsWith('mobile.settings.textSize'))).toEqual([]);
  });
});
