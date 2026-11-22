// autobyteus-590 D-5: a phone Activity row shows a tool call's name, the shared summary of its current arguments (never
// the name twice, nothing when there is nothing to summarize) and its status, never by color alone: a success is its
// check icon (named "Success"), any other status its icon and word. The whole row opens the call's details.
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import MobileRunActivityItem from '../MobileRunActivityItem.vue';
import type { CompactionActivity, ToolActivity } from '~/types/activity/RunActivity';

const tool = (patch: Partial<ToolActivity> = {}): ToolActivity => ({
  kind: 'tool', activityId: 'call-1', timestamp: new Date(0), invocationId: 'call-1', toolName: 'run_bash', type: 'terminal_command',
  status: 'success', arguments: {}, logs: [], result: null, error: null, ...patch,
});
const row = (activity: ToolActivity | CompactionActivity) => mount(MobileRunActivityItem, { props: { activity } });
const summaryOf = (wrapper: ReturnType<typeof row>) => wrapper.find('[data-testid="mobile-run-activity-summary"]');

describe('MobileRunActivityItem (autobyteus-590)', () => {
  it.each([
    ['run_bash', { command: 'cd /Users/me/repo && pnpm test' }, 'pnpm test', 'cd /Users/me/repo && pnpm test'],
    ['Bash', { command: 'git status --short' }, 'git status --short', 'git status --short'],
    ['edit_file', { path: '/Users/me/repo/components/Row.vue', patch: '…' }, 'components/Row.vue', '/Users/me/repo/components/Row.vue'],
    ['read_file', { file_path: '/Users/me/repo/README.md' }, 'repo/README.md', '/Users/me/repo/README.md'],
    ['send_message_to', { recipient_address: '/architecture_reviewer', content: 'Please review.' }, '→ /architecture_reviewer', '→ /architecture_reviewer'],
    ['delegate_task', { recipient_address: '/video_producer', description: 'Render it.' }, '→ /video_producer', '→ /video_producer'],
    ['get_project_task', { task_id: 'autobyteus-590' }, 'autobyteus-590', 'autobyteus-590'],
    ['create_task', { title: 'Write the spec' }, 'Write the spec', 'Write the spec'],
  ])('%s: the name, then the shared summary of its arguments', (toolName, args, text, title) => {
    const wrapper = row(tool({ toolName, arguments: args }));
    expect(wrapper.text()).toContain(toolName);
    expect(summaryOf(wrapper).text()).toBe(text);
    expect(summaryOf(wrapper).attributes('title')).toBe(title);
    expect(summaryOf(wrapper).classes()).toContain('line-clamp-2');
  });

  it('a tool with nothing to summarize shows its name once and no summary line', () => {
    const wrapper = row(tool({ toolName: 'update_task', arguments: { status: 'DONE' } }));
    expect(summaryOf(wrapper).exists()).toBe(false);
    expect(wrapper.text().split('update_task')).toHaveLength(2);
  });

  it('arguments that arrive after the row appears show in its summary (computed from the current arguments)', async () => {
    const activity = reactive(tool({ toolName: 'write_file', type: 'write_file', status: 'executing', arguments: {} }));
    const wrapper = row(activity as ToolActivity);
    expect(summaryOf(wrapper).exists()).toBe(false);
    activity.arguments = { file_path: '/Users/me/repo/docs/plan.md', content: '# Plan' };
    await nextTick();
    expect(summaryOf(wrapper).text()).toBe('docs/plan.md');
    expect(wrapper.text().split('write_file')).toHaveLength(2);
  });

  it('a success shows only its check icon, named "Success"', () => {
    const status = row(tool({ status: 'success', arguments: { command: 'ls' } })).get('[data-testid="mobile-run-activity-status"]');
    expect(status.attributes('role')).toBe('img');
    expect(status.attributes('aria-label')).toBe('Success');
    expect(status.text()).toBe('');
  });

  it.each([
    ['error', 'Failed'], ['executing', 'Running'], ['parsing', 'Running'], ['awaiting-approval', 'Review'],
    ['denied', 'Denied'], ['approved', 'Approved'], ['parsed', 'Parsed'],
  ] as const)('%s shows its icon and the word %s', (status, word) => {
    const chip = row(tool({ status })).get('[data-testid="mobile-run-activity-status"]');
    expect(chip.text()).toBe(word);
    expect(chip.find('svg, [aria-hidden="true"]').exists()).toBe(true);
  });

  it('a failed call shows a two-line excerpt of its error', () => {
    const error = row(tool({ status: 'error', error: 'ENOENT: no such file\nat line 3' })).get('[data-testid="mobile-run-activity-error"]');
    expect(error.text()).toContain('ENOENT: no such file');
    expect(error.classes()).toContain('line-clamp-2');
  });

  it('the whole row is a button of at least 44 px that opens the call\'s details', async () => {
    const wrapper = row(tool({ activityId: 'call-7' }));
    const button = wrapper.get('button[data-testid="mobile-run-activity-row"]');
    expect(button.classes()).toContain('min-h-[2.75rem]');
    await button.trigger('click');
    expect(wrapper.emitted('open')).toEqual([['call-7']]);
  });

  it('a compaction row opens its details too, and shows a failure\'s excerpt', async () => {
    const wrapper = row({ kind: 'compaction', activityId: 'compaction-1', timestamp: new Date(0), updatedAt: new Date(0), phase: 'failed', message: 'Compaction failed', errorMessage: 'Summarizer timed out' });
    expect(wrapper.get('[data-testid="mobile-run-activity-error"]').text()).toBe('Summarizer timed out');
    await wrapper.get('button[data-testid="mobile-run-activity-row"]').trigger('click');
    expect(wrapper.emitted('open')).toEqual([['compaction-1']]);
  });
});
