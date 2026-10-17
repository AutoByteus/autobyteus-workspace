import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SystemTaskNotificationSegment from '../SystemTaskNotificationSegment.vue';

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
});
