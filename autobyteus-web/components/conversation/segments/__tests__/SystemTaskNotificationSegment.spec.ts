import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SystemTaskNotificationSegment from '../SystemTaskNotificationSegment.vue';
import enWorkspaceMessages from '~/localization/messages/en/workspace';
import zhWorkspaceMessages from '~/localization/messages/zh-CN/workspace';

const enWorkspace = enWorkspaceMessages as Record<string, string>;
const zhWorkspace = zhWorkspaceMessages as Record<string, string>;

const restartRunWithNewTools = vi.fn();
vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => ({ restartRunWithNewTools }),
}));

const mountSegment = (content: string, senderId = 'system') => mount(SystemTaskNotificationSegment, {
  props: {
    segment: {
      type: 'system_task_notification',
      senderId,
      content,
    },
  },
});

const SKILL_NOTICE = [
  '[Platform notice — skill updated]',
  'The following skills you use changed on disk since you last read them:',
  '- code-review (/skills/code-review/SKILL.md): SKILL.md',
].join('\n');

describe('SystemTaskNotificationSegment', () => {
  it('renders multiline task notification content in normal markdown flow', () => {
    const wrapper = mountSegment([
      'You have a new task.',
      '',
      'Task ID: task_0001',
      '',
      'Task:',
      'Write a summary.',
      '',
      'Reference files:',
      '- /tmp/source.md',
    ].join('\n'));

    const segmentRoot = wrapper.get('[data-testid="system-task-notification-segment"]');

    expect(segmentRoot.classes()).toContain('system-task-notification');
    expect(segmentRoot.attributes('role')).toBe('note');
    expect(segmentRoot.attributes('aria-label')).toBeTruthy();
    expect(wrapper.text()).toContain('You have a new task.');
    expect(wrapper.text()).toContain('Task ID: task_0001');
    expect(wrapper.text()).toContain('Write a summary.');
    expect(wrapper.find('pre').exists()).toBe(false);
  });

  it('does not render the old purple alert card title, icon, or monospace panel', () => {
    const wrapper = mountSegment('Task finished successfully.');
    const html = wrapper.html();

    expect(wrapper.text()).not.toContain('System Task Notification');
    expect(wrapper.text()).not.toContain('System task notification');
    expect(wrapper.text()).not.toContain('📥');
    expect(html).not.toContain('bg-purple-');
    expect(html).not.toContain('border-purple-');
    expect(html).not.toContain('text-purple-');
    expect(html).not.toContain('font-mono');
    expect(wrapper.find('pre').exists()).toBe(false);
  });

  it('uses the markdown renderer for normal message formatting', () => {
    const wrapper = mountSegment('Reference files:\n- [source.md](/tmp/source.md)');

    expect(wrapper.find('.markdown-renderer-segments').exists()).toBe(true);
    expect(wrapper.find('li').text()).toContain('source.md');

    const link = wrapper.get('a');
    expect(link.text()).toBe('source.md');
    expect(link.attributes('href')).toContain('/tmp/source.md');
  });

  it('labels the skill update notice "Skill updated", live or replayed from history', () => {
    for (const wrapper of [
      mountSegment(SKILL_NOTICE, 'system.skill_update_notifier'),
      mountSegment(SKILL_NOTICE, 'system'),
    ]) {
      expect(wrapper.get('[data-testid="system-task-notification-label"]').text()).toBe('Skill updated');
      expect(wrapper.get('[data-testid="system-task-notification-segment"]').attributes('aria-label')).toBe('Skill updated');
      expect(wrapper.text()).toContain('code-review (/skills/code-review/SKILL.md): SKILL.md');
    }
    expect(mountSegment('Task finished successfully.').find('[data-testid="system-task-notification-label"]').exists()).toBe(false);
  });

  it('renders the per-package changed-files notice as separate paragraphs and one list item per file', () => {
    // The text `buildSkillUpdateNoticeText` produces for one updated package (server, skill-update-notices).
    const wrapper = mountSegment([
      '[Platform notice — skill updated]',
      '',
      'Your skill package `agent-package-creation` has been updated (`/skills/agent-package-creation`).',
      '',
      'Changed files:',
      '- `references/package-anti-patterns.md` (changed)',
      '- `references/new-guide.md` (added)',
      '- `scripts/old.sh` (removed)',
      '',
      'Re-read the updated files before continuing work that relies on this skill.',
      'Removed files are no longer available.',
    ].join('\n'), 'system.skill_update_notifier');

    expect(wrapper.get('[data-testid="system-task-notification-label"]').text()).toBe('Skill updated');
    expect(wrapper.find('pre').exists()).toBe(false);
    expect(wrapper.get('code').text()).toBe('agent-package-creation');
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
      'references/package-anti-patterns.md (changed)',
      'references/new-guide.md (added)',
      'scripts/old.sh (removed)',
    ]);
    const paragraphs = wrapper.findAll('p').map((paragraph) => paragraph.text());
    expect(paragraphs.some((text) => text.startsWith('Your skill package') && text.endsWith('(/skills/agent-package-creation).'))).toBe(true);
    expect(paragraphs.some((text) => text.startsWith('Re-read the updated files before continuing work that relies on this skill.'))).toBe(true);
    // The closing lines are not swallowed into the last list item.
    expect(wrapper.findAll('li').at(-1)!.text()).not.toContain('Re-read');
    expect(wrapper.text()).not.toContain('SKILL.md');
  });

  it('shows the changed paths and the skill folder literally (autobyteus-320, AC-009)', () => {
    // The text the server's builder now writes: every path and the folder as inline code.
    const wrapper = mountSegment([
      '[Platform notice — skill updated]',
      '',
      'Your skill package `py-tools` has been updated (`/skills/py_tools`).',
      '',
      'Changed files:',
      '- `references/__init__.py` (added)',
      '- `notes/*draft*.md` (changed)',
      '- ``odd`name.md`` (removed)',
      '',
      'Re-read the updated files before continuing work that relies on this skill.',
    ].join('\n'), 'system.skill_update_notifier');

    expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
      'references/__init__.py (added)',
      'notes/*draft*.md (changed)',
      'odd`name.md (removed)',
    ]);
    expect(wrapper.findAll('code').map((code) => code.text())).toEqual([
      'py-tools', '/skills/py_tools', 'references/__init__.py', 'notes/*draft*.md', 'odd`name.md',
    ]);
    expect(wrapper.find('strong').exists()).toBe(false);
    expect(wrapper.find('em').exists()).toBe(false);
  });

  // The text `buildToolListUpdateNoticeText` produces (server, tool-list-updates).
  const TOOLS_NOTICE = [
    '[Platform notice — tools updated]',
    '',
    'Your tools changed. Now available: get_project_task, send_message_to. No longer available: search_memory.',
  ].join('\n');

  it('labels the tool list notice "Tools updated" and shows only what changed, live or replayed', () => {
    for (const wrapper of [
      mountSegment(TOOLS_NOTICE, 'system.tool_list_update_notifier'),
      mountSegment(TOOLS_NOTICE, 'system'),
    ]) {
      expect(wrapper.get('[data-testid="system-task-notification-label"]').text()).toBe('Tools updated');
      expect(wrapper.get('[data-testid="system-task-notification-segment"]').attributes('aria-label')).toBe('Tools updated');
      expect(wrapper.text()).toContain('Now available: get_project_task, send_message_to. No longer available: search_memory.');
      expect(wrapper.text()).not.toContain('[Platform notice');
      expect(wrapper.text()).not.toContain('Your tools changed.');
      expect(wrapper.find('[data-testid="system-task-notification-restart-run"]').exists()).toBe(false);
    }
  });

  it('shows a failed reopen with a button that restarts the run with the new tools', async () => {
    restartRunWithNewTools.mockReset().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const wrapper = mount(SystemTaskNotificationSegment, {
      props: {
        runId: 'run-codex',
        segment: {
          type: 'system_task_notification',
          senderId: 'system.tool_list_update_notifier',
          content: "Couldn't give this run its new tools.",
          action: 'restart_run',
        },
      },
    });
    expect(wrapper.get('[data-testid="system-task-notification-label"]').text()).toBe('Tools updated');
    // Template texts render through the test `$t` stub (humanized keys); the wording is checked below.
    expect(wrapper.get('[data-testid="system-task-notification-reopen-failed"]').text()).toBe('Tools reopen failed');
    const button = wrapper.get('[data-testid="system-task-notification-restart-run"]');
    expect(button.text()).toBe('Restart with new tools');

    await button.trigger('click');
    await flushPromises();
    expect(restartRunWithNewTools).toHaveBeenCalledWith('run-codex');
    expect(wrapper.find('[data-testid="system-task-notification-restart-failed"]').exists()).toBe(true);

    await button.trigger('click');
    await flushPromises();
    expect(restartRunWithNewTools).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="system-task-notification-restart-failed"]').exists()).toBe(false);
  });

  it('recognizes a replayed failed reopen by its text (Team streams carry no action)', () => {
    const wrapper = mount(SystemTaskNotificationSegment, {
      props: {
        runId: 'member-run',
        segment: { type: 'system_task_notification', senderId: 'system', content: "Couldn't give this run its new tools." },
      },
    });
    expect(wrapper.find('[data-testid="system-task-notification-restart-run"]').exists()).toBe(true);
  });

  it('words the failed reopen and its button as approved (REQ-010), in both locales', () => {
    const key = (tail: string) => `workspace.components.conversation.segments.SystemTaskNotificationSegment.${tail}`;
    expect(enWorkspace[key('toolsUpdated')]).toBe('Tools updated');
    expect(enWorkspace[key('toolsReopenFailed')]).toBe("Couldn't give this run its new tools.");
    expect(enWorkspace[key('restartWithNewTools')]).toBe('Restart this run with the new tools');
    for (const tail of ['toolsUpdated', 'toolsReopenFailed', 'restartWithNewTools', 'restartingWithNewTools', 'restartFailed']) {
      expect(zhWorkspace[key(tail)]).toBeTruthy();
    }
  });
});
