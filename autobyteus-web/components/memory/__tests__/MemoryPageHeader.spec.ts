import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MemoryPageHeader from '../MemoryPageHeader.vue';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/**
 * An owner's or a run's page header (autobyteus-608 DC-001, DC-002, DC-007; spec Responsive: "one row when it fits,
 * wraps otherwise"). Production: MemoryPageHeader. jsdom has no layout, so the wrap rule is pinned by its classes; the
 * widths are measured by the semantic-memory view probe (SMV-120, SMV-122).
 */
const mountHeader = () => mount(MemoryPageHeader, {
  props: { backText: 'Memory', backLabel: 'Back to Memory' },
  slots: { default: '<h1>Project Task Manager</h1>', actions: '<input data-test="filter" /><div data-test="switch" />' },
});

describe('MemoryPageHeader', () => {
  it('shows Back with its destination, its accessible name "Back to …", the title and the actions in one row', async () => {
    const wrapper = mountHeader();
    const back = wrapper.get('[data-test="memory-page-back"]');
    expect(back.text()).toBe('Memory');
    expect(back.attributes('aria-label')).toBe('Back to Memory');
    expect(back.attributes('title')).toBe('Back to Memory');
    await back.trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
    const header = wrapper.get('header');
    expect(header.classes()).toContain('flex-wrap');
    // The actions are items of the row itself, so each can wrap to its own row.
    expect(header.element.children[1]?.getAttribute('data-test')).toBe('filter');
    expect(header.element.children[2]?.getAttribute('data-test')).toBe('switch');
  });

  it('gives Back · / · title its own width as basis, so the actions wrap below before the title gives way (CRR-002 CR-003)', () => {
    const left = mountHeader().get('header').element.children[0]!;
    // flex: 1 1 auto: the row wraps when Back, the title and a run's title do not fit beside the actions.
    expect([...left.classList]).toEqual(expect.arrayContaining(['flex-auto', 'min-w-0']));
    // Not flex: 1 1 0%: with a zero basis the row never wraps and the title shrinks to nothing.
    expect(left.classList.contains('flex-1')).toBe(false);
  });

  it('lets Back give way with the title on a row too narrow for both: its text truncates, its arrow stays (CRR-002 CR-003)', () => {
    const back = mountHeader().get('[data-test="memory-page-back"]');
    expect(back.classes()).toContain('min-w-0');
    expect(back.classes()).not.toContain('flex-shrink-0');
    expect(back.findAll('span').at(-1)!.classes()).toEqual(expect.arrayContaining(['min-w-0', 'max-w-[16rem]', 'truncate']));
    expect(back.get('[data-icon]').classes()).toContain('flex-shrink-0');
  });
});
