import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';

const { TabStub } = vi.hoisted(() => ({
  TabStub: {
    name: 'Tab',
    template: '<button class="tab-stub" @click="$emit(\'select\', name)">{{ name }}</button>',
    props: ['name', 'selected', 'density'],
  },
}));

vi.mock('../Tab.vue', () => ({
  default: TabStub,
}));

import TabList from '../TabList.vue';

describe('TabList.vue', () => {

  // Sample tab data for testing
  const sampleTabs = [
    { name: 'Tab1' },
    { name: 'Tab2' },
    { name: 'Tab3' },
  ];
  
  it('renders the correct number of Tab components', () => {
    const wrapper = mount(TabList, {
      props: {
        tabs: sampleTabs,
        selectedTab: 'Tab1'
      },
      global: {
        stubs: { Tab: TabStub },
      },
    });

    // Expecting three Tab components
    expect(wrapper.findAllComponents(TabStub).length).toBe(3);
  });

  it('passes the correct props to each Tab component', () => {
    const wrapper = mount(TabList, {
      props: {
        tabs: sampleTabs,
        selectedTab: 'Tab1'
      },
      global: {
        stubs: { Tab: TabStub },
      },
    });

    const tabs = wrapper.findAllComponents(TabStub);
    for (let i = 0; i < sampleTabs.length; i++) {
      expect(tabs[i].props().name).toBe(sampleTabs[i].name);
      expect(tabs[i].props().selected).toBe(sampleTabs[i].name === 'Tab1');
      expect(tabs[i].props().density).toBe('comfortable');
    }
  });

  it('forwards compact density to tabs', () => {
    const wrapper = mount(TabList, {
      props: {
        tabs: sampleTabs,
        selectedTab: 'Tab1',
        density: 'compact',
      },
      global: {
        stubs: { Tab: TabStub },
      },
    });

    const tabs = wrapper.findAllComponents(TabStub);
    expect(tabs.every((tab) => tab.props().density === 'compact')).toBe(true);
  });

  it('keeps the tab row single-line and natively horizontally scrollable', () => {
    const wrapper = mount(TabList, {
      props: {
        tabs: sampleTabs,
        selectedTab: 'Tab1',
      },
      global: {
        stubs: { Tab: TabStub },
      },
    });

    expect(wrapper.classes()).toContain('flex-nowrap');
    expect(wrapper.classes()).toContain('overflow-x-auto');
    expect(wrapper.classes()).not.toContain('flex-wrap');
  });

  it('pins overflow affordances to the scrollport instead of scrolling with tabs', async () => {
    const wrapper = mount(TabList, {
      props: {
        tabs: sampleTabs,
        selectedTab: 'Tab1',
        showOverflowAffordances: true,
        previousLabel: 'Previous tabs',
        nextLabel: 'Next tabs',
      },
      global: {
        stubs: { Tab: TabStub },
      },
    });

    const scrollContainer = wrapper.element as HTMLElement;
    Object.defineProperties(scrollContainer, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 320 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });

    await wrapper.trigger('scroll');
    await nextTick();

    const affordanceLayer = wrapper.get('[data-test="tab-list-affordance-layer"]');
    expect(affordanceLayer.classes()).toContain('tab-list-affordance-layer');
    expect(affordanceLayer.element.parentElement).toBe(scrollContainer);
    expect(wrapper.find('[data-test="tab-list-scroll-left"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="tab-list-scroll-right"]').attributes('aria-label')).toBe('Next tabs');
  });

  it('emits the select event with the correct tab name when a Tab is clicked', async () => {
    const wrapper = mount(TabList, {
      props: {
        tabs: sampleTabs,
        selectedTab: 'Tab1'
      },
      global: {
        stubs: { Tab: TabStub },
      },
    });

    // Simulating a click on the second tab
    await wrapper.findAllComponents(TabStub)[1].trigger('click');

    // Expecting the emitted event's payload to be 'Tab2'
    expect(wrapper.emitted().select[0]).toEqual(['Tab2']);
  });

});
