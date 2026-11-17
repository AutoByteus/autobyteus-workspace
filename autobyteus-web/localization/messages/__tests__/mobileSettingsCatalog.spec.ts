import { describe, expect, it } from 'vitest';
import { getCatalog } from '~/localization/runtime/catalogRegistry';

// autobyteus-458 REQ-009 / AC-007: the phone's Settings and Text size texts, English and Chinese.
const KEYS = [
  'mobile.settings.menuEntry', 'mobile.settings.title', 'mobile.settings.stopRun', 'mobile.settings.save',
  'mobile.settings.textSize', 'mobile.settings.textSize.small', 'mobile.settings.textSize.standard',
  'mobile.settings.textSize.large', 'mobile.settings.textSize.largest',
] as const;

describe('mobile.settings catalog', () => {
  it('carries every key in English and Chinese', () => {
    const en = getCatalog('en') as Record<string, string>;
    const zh = getCatalog('zh-CN') as Record<string, string>;
    for (const key of KEYS) {
      expect(en[key], key).toBeTruthy();
      expect(zh[key], key).toBeTruthy();
    }
    expect(KEYS.map((key) => en[key])).toEqual(['Settings', 'Settings', 'Stop run', 'Save', 'Text size', 'Small', 'Standard', 'Large', 'Largest']);
  });
});
