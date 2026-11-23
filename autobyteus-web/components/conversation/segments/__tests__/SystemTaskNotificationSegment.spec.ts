import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SystemTaskNotificationSegment from '../SystemTaskNotificationSegment.vue';
import { getCatalog } from '~/localization/runtime/catalogRegistry';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';

const enCatalog = getCatalog('en') as Record<string, string>;
const zhCatalog = getCatalog('zh-CN') as Record<string, string>;

const mountSegment = (content: string, senderId = 'system') => mount(SystemTaskNotificationSegment, {
  props: {
    segment: {
      type: 'system_task_notification',
      senderId,
      content,
      messageId: null,
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
    // autobyteus-585: every notice is labelled; one the label mapping does not name reads "Platform notice"
    expect(mountSegment('Task finished successfully.').get('[data-testid="system-task-notification-label"]').text()).toBe('Platform notice');
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
    }
  });

  it('labels the tool list notice in both locales', () => {
    const key = 'workspace.components.conversation.segments.SystemTaskNotificationSegment.toolsUpdated';
    expect(enCatalog[key]).toBe('Tools updated');
    expect(zhCatalog[key]).toBeTruthy();
  });

  it('labels the agent runtime switch marker by its sender and shows the sentence as written, in both languages', () => {
    const wrapper = mountSegment('Agent runtime changed from Claude Agent SDK (sonnet) to Codex App Server (gpt-5).', 'system.runtime_handover');
    expect(wrapper.get('[data-testid="system-task-notification-label"]').text()).toBe(enCatalog['workspace.components.conversation.segments.SystemTaskNotificationSegment.runtimeChanged']);
    expect(enCatalog['workspace.components.conversation.segments.SystemTaskNotificationSegment.runtimeChanged']).toBe('Agent runtime changed');
    expect(zhCatalog['workspace.components.conversation.segments.SystemTaskNotificationSegment.runtimeChanged']).toBeTruthy();
    expect(wrapper.text()).toContain('Agent runtime changed from Claude Agent SDK (sonnet) to Codex App Server (gpt-5).');
  });

  describe('the restart reminder (autobyteus-526 AC-003)', () => {
    const REMINDER = [
      '[Platform notice — application restarted]',
      '',
      'The application restarted at 2026-11-18 05:41 UTC (reason: a restart).',
    ].join('\n');
    const withViewerZone = (zone: string, run: () => void) => {
      const previous = process.env.TZ;
      process.env.TZ = zone;
      try { run(); } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
    };

    it('shows the restart time in the viewer\'s zone (Europe/Berlin: 06:41 CET), by sender or by header; the segment keeps UTC', () => {
      withViewerZone('Europe/Berlin', () => {
        for (const wrapper of [mountSegment(REMINDER, 'system.restart_resume'), mountSegment(REMINDER)]) {
          const text = wrapper.get('[data-testid="system-task-notification-segment"]').text();
          expect(text).toContain('The application restarted at 18 Nov 2026, 06:41 CET (reason: a restart).');
          expect(text).not.toContain('05:41 UTC');
        }
        const segment = { type: 'system_task_notification', senderId: 'system.restart_resume', content: REMINDER, messageId: 'n1' } as const;
        mount(SystemTaskNotificationSegment, { props: { segment } });
        expect(segment.content).toContain('2026-11-18 05:41 UTC');
      });
    });

    it('leaves another notice\'s UTC text as it is', () => {
      withViewerZone('Europe/Berlin', () => {
        const other = mountSegment('You have a new task. Due 2026-11-18 05:41 UTC.');
        expect(other.text()).toContain('2026-11-18 05:41 UTC');
      });
    });
  });

  // autobyteus-585: every notice is its own labelled row; the label names it, the header line is not repeated.
  describe('labels and row layout (autobyteus-585)', () => {
    const notice = (header: string, body: string) => `${header}\n\n${body}`;
    const CASES: Array<[string, string, string, string]> = [
      // [kind, senderId, content, en label key]
      ['restart', 'system.restart_resume', notice('[Platform notice — application restarted]', 'The application restarted at 2026-11-21 07:32 UTC. Continue your task.'), 'applicationRestarted'],
      ['skill', 'system.skill_update_notifier', notice('[Platform notice — skill updated]', 'Your skill package `x` has been updated.'), 'skillUpdated'],
      ['tools', 'system.tool_list_update_notifier', notice('[Platform notice — tools updated]', 'Your tools changed. Now available: search.'), 'toolsUpdated'],
      ['runtime change', 'system.runtime_handover', 'Agent runtime changed from A to B.', 'runtimeChanged'],
      ['background tasks', 'system.background_task_notifier', notice('[Platform notice — background tasks finished]', 'build (completed, 3s)'), 'backgroundTasksFinished'],
      ['background tasks, replayed', 'system', notice('[Platform notice — background tasks finished]', 'build (completed, 3s)'), 'backgroundTasksFinished'],
      ['task notice', 'system_task_runner', 'You have a new task.\n\nTask ID: task_0001', 'platformNotice'],
      ['other, unknown sender', 'system.something_new', notice('[Platform notice — something new]', 'Details.'), 'platformNotice'],
    ];
    const KEY = 'workspace.components.conversation.segments.SystemTaskNotificationSegment';

    it.each(CASES)('labels the %s notice in both locales, as its aria-label, and does not repeat the header line', async (_kind, senderId, content, labelKey) => {
      for (const locale of ['en', 'zh-CN'] as const) {
        await localizationRuntime.setPreference(locale);
        try {
          const wrapper = mountSegment(content, senderId);
          const label = getCatalog(locale)[`${KEY}.${labelKey}`];
          expect(label).toBeTruthy();
          expect(wrapper.get('[data-testid="system-task-notification-label"]').text()).toBe(label);
          const root = wrapper.get('[data-testid="system-task-notification-segment"]');
          expect(root.attributes('role')).toBe('note');
          expect(root.attributes('aria-label')).toBe(label);
          expect(wrapper.get('[data-testid="system-task-notification-body"]').text()).not.toContain('[Platform notice');
        } finally {
          await localizationRuntime.setPreference('en');
        }
      }
    });

    it('keeps a body that has no header line as written, and the tools body as only what changed', () => {
      expect(mountSegment('You have a new task.\n\nTask ID: task_0001', 'system_task_runner')
        .get('[data-testid="system-task-notification-body"]').text()).toContain('You have a new task.');
      expect(mountSegment(TOOLS_NOTICE, 'system.tool_list_update_notifier')
        .get('[data-testid="system-task-notification-body"]').text())
        .toBe('Now available: get_project_task, send_message_to. No longer available: search_memory.');
    });

    it('is laid out as its own light turn: an icon where an avatar would be, the label as the phone speaker line', () => {
      const wrapper = mountSegment(TOOLS_NOTICE, 'system.tool_list_update_notifier');
      const root = wrapper.get('[data-testid="system-task-notification-segment"]');
      expect(root.classes()).toContain('conv-turn');
      expect(root.get('.conv-avatar').find('img').exists()).toBe(false);
      expect(root.get('.conv-speaker').text()).toBe('Tools updated');
      expect(root.find('.conv-body').exists()).toBe(true);
      expect(root.html()).not.toMatch(/bg-(purple|amber|blue|indigo)-|border-(purple|amber)-|font-mono/);
    });
  });
});

