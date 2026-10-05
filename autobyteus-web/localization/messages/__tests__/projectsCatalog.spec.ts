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
  it('uses concise task placeholders and removes only superseded authoring copy', () => {
    expect(enProjectMessages['projects.components.projects.ProjectTaskEditor.descriptionPlaceholder']).toBe('Describe the task…')
    expect(zhCnProjectMessages['projects.components.projects.ProjectTaskEditor.descriptionPlaceholder']).toBe('描述任务…')
    for (const catalog of [enProjectMessages, zhCnProjectMessages]) {
      for (const key of ['taskCreateHelp', 'taskEditHelp', 'descriptionHelp', 'inputPolicy']) {
        expect(Object.keys(catalog)).not.toContain('projects.ui.' + key)
      }
      expect(catalog['projects.ui.taskDetails']).toBeTruthy()
    }
  });

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

  it('no longer carries the rejected two-pane, status-filter or row copy', () => {
    for (const catalog of [enProjectMessages, zhCnProjectMessages]) {
      const keys = Object.keys(catalog)
      expect(keys.filter((key) => /ProjectListPane\.|ProjectListItem\.|ProjectTasksPanel\.|ProjectTaskRow\.|projects\.time\./.test(key))).toEqual([])
    }
  });

  it('describe each Project card with open tasks and workspaces (REQ-009)', () => {
    expect(enProjectMessages['projects.components.projects.ProjectCard.oneOpenTask']).toBe('1 open task')
    expect(zhCnProjectMessages['projects.components.projects.ProjectCard.oneOpenTask']).toBeTruthy()
  });
});
