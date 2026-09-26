import { describe, expect, it } from 'vitest';

import enProjectMessages from '../en/projects';
import zhCnProjectMessages from '../zh-CN/projects';
import enSettingsMessages from '../en/settings';
import zhCnSettingsMessages from '../zh-CN/settings';
import enShellMessages from '../en/shell';
import zhCnShellMessages from '../zh-CN/shell';

const projectsSettingsKeys = (catalog: Record<string, string>) =>
  Object.keys(catalog).filter((key) => key.startsWith('settings.components.settings.ProjectsFeatureToggleCard.')).sort();

describe('Projects catalogs', () => {
  it('provide the same keys in en and zh-CN', () => {
    expect(Object.keys(zhCnProjectMessages).sort()).toEqual(Object.keys(enProjectMessages).sort());
    expect(projectsSettingsKeys(zhCnSettingsMessages)).toEqual(projectsSettingsKeys(enSettingsMessages));
    expect(projectsSettingsKeys(enSettingsMessages).length).toBeGreaterThan(0);
  });

  it('label the navigation destination', () => {
    expect(enShellMessages['shell.navigation.projects']).toBe('Projects');
    expect(zhCnShellMessages['shell.navigation.projects']).toBe('项目');
  });

  it('never mention Tasks on Project surfaces (REQ-014)', () => {
    const englishCopy = [
      ...Object.values(enProjectMessages),
      ...projectsSettingsKeys(enSettingsMessages).map((key) => enSettingsMessages[key as keyof typeof enSettingsMessages]),
    ];
    const chineseCopy = [
      ...Object.values(zhCnProjectMessages),
      ...projectsSettingsKeys(zhCnSettingsMessages).map((key) => zhCnSettingsMessages[key as keyof typeof zhCnSettingsMessages]),
    ];

    expect(englishCopy.filter((text) => /\btasks?\b/i.test(String(text)))).toEqual([]);
    expect(chineseCopy.filter((text) => String(text).includes('任务'))).toEqual([]);
  });
});
