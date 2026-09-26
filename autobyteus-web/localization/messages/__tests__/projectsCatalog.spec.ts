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

  it('label every Project Task status in both locales (REQ-003, REQ-015)', () => {
    for (const status of ['TODO', 'IN_PROGRESS', 'DONE']) {
      expect(enProjectMessages[`projects.task.status.${status}` as keyof typeof enProjectMessages]).toBeTruthy()
      expect(zhCnProjectMessages[`projects.task.status.${status}` as keyof typeof zhCnProjectMessages]).toBeTruthy()
    }
    expect(enProjectMessages['projects.task.status.TODO']).toBe('To Do')
    expect(zhCnProjectMessages['projects.task.status.TODO']).toBe('待办')
  });

  it('no longer carries the removed card-grid copy', () => {
    const keys = Object.keys(enProjectMessages)
    expect(keys.filter((key) => /ProjectsList\.|ProjectCard\.|backToProjects/.test(key))).toEqual([])
  });
});
