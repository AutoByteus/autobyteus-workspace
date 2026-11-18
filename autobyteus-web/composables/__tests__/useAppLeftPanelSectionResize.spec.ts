import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useAppLeftPanelSectionResize } from '../useAppLeftPanelSectionResize';

// The left menu section follows the menu's own height until the user drags the divider (autobyteus-337, r2), so an
// item that appears after mount (Integrations, Nodes, Applications) is never cut off.

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  disconnected = false;
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element) { this.observed.push(target); }
  unobserve() {}
  disconnect() { this.disconnected = true; }
  fire() { this.callback([], this as unknown as ResizeObserver); }
}

const sizes = { container: 900, nav: 200 };

const Harness = defineComponent({
  setup() {
    const resize = useAppLeftPanelSectionResize();
    return () => h('div', { ref: resize.panelSectionsContainerRef, 'data-testid': 'container' }, [
      h('div', { ref: resize.primaryNavSectionRef, style: resize.primaryNavSectionStyle.value, 'data-testid': 'nav' }, [h('ul')]),
      h('div', { 'data-testid': 'divider', onMousedown: resize.initPrimarySectionResize }),
    ]);
  },
});

const mountHarness = async () => {
  const wrapper = mount(Harness, { attachTo: document.body });
  await nextTick();
  await nextTick();
  return wrapper;
};

describe('useAppLeftPanelSectionResize', () => {
  beforeEach(() => {
    window.localStorage.clear();
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    sizes.container = 900;
    sizes.nav = 200;
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'container' ? sizes.container : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'nav' ? sizes.nav : 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('grows the section with the menu when an item appears after mount', async () => {
    const wrapper = await mountHarness();
    const nav = wrapper.get('[data-testid="nav"]');
    expect(nav.attributes('style')).toContain('height: 200px');
    expect(FakeResizeObserver.instances).toHaveLength(1);

    sizes.nav = 240; // Integrations appears
    FakeResizeObserver.instances[0]!.fire();
    await nextTick();
    expect(nav.attributes('style')).toContain('height: 240px');
    wrapper.unmount();
    expect(FakeResizeObserver.instances[0]!.disconnected).toBe(true);
  });

  it('stops following the menu once the user drags the divider, and remembers that', async () => {
    const wrapper = await mountHarness();
    await wrapper.get('[data-testid="divider"]').trigger('mousedown', { clientY: 200 });
    expect(FakeResizeObserver.instances[0]!.disconnected).toBe(true);
    expect(window.localStorage.getItem('autobyteus.app-left-panel.primary-nav-user-sized')).toBe('1');
    document.dispatchEvent(new MouseEvent('mouseup'));
    wrapper.unmount();

    FakeResizeObserver.instances = [];
    const again = await mountHarness();
    expect(FakeResizeObserver.instances).toHaveLength(0);
    again.unmount();
  });
});
