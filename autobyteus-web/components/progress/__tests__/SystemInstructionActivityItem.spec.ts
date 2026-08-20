import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SystemInstructionActivityItem from '../SystemInstructionActivityItem.vue';

const translations: Record<string, string> = {
  'workspace.components.progress.SystemInstructionActivityItem.title': 'System instructions',
  'workspace.components.progress.SystemInstructionActivityItem.available': 'Available',
  'workspace.components.progress.SystemInstructionActivityItem.source.native': 'AutoByteus-supplied · Native configured system prompt',
  'workspace.components.progress.SystemInstructionActivityItem.character_count': '{{count}} characters',
  'workspace.components.progress.SystemInstructionActivityItem.captured_at': 'Captured {{time}}',
  'workspace.components.progress.SystemInstructionActivityItem.aria_label': '{{title}}. {{source}}. {{availability}}. Captured {{time}}. {{count}} characters.',
};

const translate = (key: string, values: Record<string, unknown> = {}) =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
    translations[key] ?? key,
  );

describe('SystemInstructionActivityItem', () => {
  it('is collapsed by default and reveals exact selectable whitespace in a bounded pre', async () => {
    const content = '  first\n\nemoji 😀\n' + 'x'.repeat(500);
    const wrapper = mount(SystemInstructionActivityItem, {
      props: {
        activity: {
          kind: 'system_instruction', activityId: 'raw-system-id', content,
          timestamp: new Date(10_000),
        },
        runtimeKind: 'autobyteus',
      },
      global: {
        stubs: { Icon: { props: ['icon'], template: '<svg />' } },
        mocks: { $t: translate },
      },
    });

    const button = wrapper.get('button');
    const contentRegion = wrapper.get('#system-instruction-content-raw-system-id');
    const pre = wrapper.get('pre');
    expect(button.attributes('aria-expanded')).toBe('false');
    expect(button.attributes('aria-controls')).toBe('system-instruction-content-raw-system-id');
    expect(button.attributes('aria-label')).toContain('Native configured system prompt');
    expect(button.attributes('aria-label')).toContain('Captured');
    expect(contentRegion.attributes()).toMatchObject({
      role: 'region',
      'aria-labelledby': 'system-instruction-title-raw-system-id',
    });
    expect(pre.attributes('tabindex')).toBe('0');
    expect(contentRegion.attributes('style')).toContain('display: none');

    await button.trigger('click');

    expect(button.attributes('aria-expanded')).toBe('true');
    expect(contentRegion.attributes('style') ?? '').not.toContain('display: none');
    expect(pre.element.textContent).toBe(content);
    expect(pre.classes()).toEqual(expect.arrayContaining([
      'max-h-80', 'overflow-auto', 'whitespace-pre-wrap', 'font-mono', 'select-text',
    ]));
    expect(wrapper.text()).toContain('517 characters');
    expect(wrapper.text()).toContain(`Captured ${new Date(10_000).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'medium',
    })}`);
  });
});
