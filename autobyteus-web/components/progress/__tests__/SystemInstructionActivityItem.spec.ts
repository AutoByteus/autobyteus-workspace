import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const appLocale = vi.hoisted(() => ({ value: 'en' }));
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ resolvedLocale: ref(appLocale.value) }),
}));

import SystemInstructionActivityItem from '../SystemInstructionActivityItem.vue';

const translations: Record<string, string> = {
  'workspace.components.progress.SystemInstructionActivityItem.title': 'System instructions',
  'workspace.components.progress.SystemInstructionActivityItem.available': 'Available',
  'workspace.components.progress.SystemInstructionActivityItem.source.native': 'AutoByteus-supplied · AutoByteus configured system prompt',
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
  beforeEach(() => { appLocale.value = 'en'; });

  it('is collapsed by default and reveals exact selectable whitespace in the flow: no height cap, no inner scroll (autobyteus-435 AC-014-1)', async () => {
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
    expect(button.attributes('aria-label')).toContain('AutoByteus configured system prompt');
    expect(button.attributes('aria-label')).toContain('Captured');
    expect(contentRegion.attributes()).toMatchObject({
      role: 'region',
      'aria-labelledby': 'system-instruction-title-raw-system-id',
    });
    expect(pre.attributes('tabindex')).toBeUndefined();
    expect(contentRegion.attributes('style')).toContain('display: none');

    await button.trigger('click');

    expect(button.attributes('aria-expanded')).toBe('true');
    expect(contentRegion.attributes('style') ?? '').not.toContain('display: none');
    expect(pre.element.textContent).toBe(content);
    expect(pre.classes()).toEqual(expect.arrayContaining([
      'whitespace-pre-wrap', '[overflow-wrap:anywhere]', 'font-mono', 'select-text', 'border', 'bg-gray-50',
    ]));
    // No class caps its height or gives it its own scroll, on the text or the region around it.
    for (const element of [pre, contentRegion]) {
      expect(element.classes().filter((name) => /^max-h-|^overflow-(auto|scroll|y-auto|y-scroll)$/.test(name))).toEqual([]);
    }
    expect(wrapper.text()).toContain('517 characters');
    expect(wrapper.text()).toContain(`Captured ${new Date(10_000).toLocaleString('en', {
      dateStyle: 'medium', timeStyle: 'medium',
    })}`);
  });

  it('shows a long text whole and collapses it again with the header (autobyteus-435 AC-014-1)', async () => {
    const content = Array.from({ length: 250 }, (_, line) => `Line ${line}: ${'instruction text '.repeat(3)}`).join('\n');
    expect(content.length).toBeGreaterThan(10_000);
    const wrapper = mount(SystemInstructionActivityItem, {
      props: { activity: { kind: 'system_instruction', activityId: 'long', content, timestamp: new Date(10_000) }, runtimeKind: 'autobyteus' },
      global: { stubs: { Icon: { props: ['icon'], template: '<svg />' } }, mocks: { $t: translate } },
    });
    const button = wrapper.get('button');
    const region = wrapper.get('#system-instruction-content-long');
    await button.trigger('click');
    expect(wrapper.get('pre').element.textContent).toBe(content);
    expect(region.attributes('style') ?? '').not.toContain('display: none');
    await button.trigger('click');
    expect(button.attributes('aria-expanded')).toBe('false');
    expect(region.attributes('style')).toContain('display: none');
  });

  // autobyteus-426 AC-017: the capture time inside the translated sentence follows the app's language, not the OS's.
  it('formats the capture time in the app locale', () => {
    appLocale.value = 'zh-CN';
    const wrapper = mount(SystemInstructionActivityItem, {
      props: {
        activity: { kind: 'system_instruction', activityId: 'zh', content: 'x', timestamp: new Date(Date.UTC(2026, 10, 7, 9, 30, 5)) },
        runtimeKind: 'autobyteus',
      },
      global: { stubs: { Icon: { props: ['icon'], template: '<svg />' } }, mocks: { $t: translate } },
    });
    const options = { dateStyle: 'medium', timeStyle: 'medium' } as const;
    const zh = new Intl.DateTimeFormat('zh-CN', options).format(new Date(Date.UTC(2026, 10, 7, 9, 30, 5)));
    const de = new Intl.DateTimeFormat('de-DE', options).format(new Date(Date.UTC(2026, 10, 7, 9, 30, 5)));
    expect(zh).not.toBe(de);
    expect(wrapper.text()).toContain(`Captured ${zh}`);
  });
});
