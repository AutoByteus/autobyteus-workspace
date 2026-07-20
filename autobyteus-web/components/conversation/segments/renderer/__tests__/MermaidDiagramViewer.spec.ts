import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MermaidDiagramViewer from '../MermaidDiagramViewer.vue';

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => ({
      'workspace.components.conversation.segments.renderer.MermaidDiagram.viewer': 'Diagram viewer',
      'workspace.components.conversation.segments.renderer.MermaidDiagram.zoom_out': 'Zoom out',
      'workspace.components.conversation.segments.renderer.MermaidDiagram.fit_diagram': 'Fit diagram',
      'workspace.components.conversation.segments.renderer.MermaidDiagram.zoom_in': 'Zoom in',
      'workspace.components.conversation.segments.renderer.MermaidDiagram.close_viewer': 'Close diagram viewer',
    }[key] ?? key),
  }),
}));

const renderedSvg = `
  <svg viewBox="0 0 1600 800" xmlns:xlink="http://www.w3.org/1999/xlink">
    <a xlink:href="https://example.com/diagram"><text>docs</text></a>
    <a class="local-link" href="mailto:hello@example.com"><text>mail</text></a>
    <rect class="background" width="1600" height="800"></rect>
  </svg>
`;

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(_callback: ResizeObserverCallback) {}
}

const rect = (width: number, height: number): DOMRect => ({
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: width,
  bottom: height,
  width,
  height,
  toJSON: () => ({}),
} as DOMRect);

describe('MermaidDiagramViewer', () => {
  let wrapper: VueWrapper | null = null;
  let mountTarget: HTMLElement | null = null;

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('mermaid-viewer-canvas') ? rect(800, 600) : rect(100, 44);
    });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    mountTarget?.remove();
    mountTarget = null;
    document.body.style.overflow = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const mountViewer = async () => {
    mountTarget = document.createElement('div');
    document.body.appendChild(mountTarget);
    wrapper = mount(MermaidDiagramViewer, {
      props: { svgContent: renderedSvg },
      attachTo: mountTarget,
      global: { stubs: { Icon: true } },
    });
    await flushPromises();
    return wrapper;
  };

  const getDom = <T extends Element = Element>(selector: string) => {
    const element = document.body.querySelector<T>(selector);
    if (!element) throw new Error(`Missing teleported element: ${selector}`);
    return new DOMWrapper(element);
  };

  const actionButtons = () => Array.from(
    document.body.querySelectorAll<HTMLButtonElement>('.mermaid-viewer-action'),
  ).map((element) => new DOMWrapper(element));

  it('mounts a named modal with exactly four persistent actions and restores body overflow', async () => {
    document.body.style.overflow = 'clip';
    const mounted = await mountViewer();
    const dialog = getDom('.mermaid-viewer-dialog');
    const actions = actionButtons();

    expect(dialog.attributes('role')).toBe('dialog');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(getDom(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Diagram viewer');
    expect(getDom('.mermaid-viewer-canvas').attributes('aria-label')).toBe('Diagram viewer');
    expect(actions).toHaveLength(4);
    expect(actions.map((action) => action.attributes('aria-label'))).toEqual([
      'Zoom out', 'Fit diagram', 'Zoom in', 'Close diagram viewer',
    ]);
    expect(document.activeElement).toBe(actions[3].element);
    expect(document.body.style.overflow).toBe('hidden');

    mounted.unmount();
    wrapper = null;
    expect(document.body.style.overflow).toBe('clip');
  });

  it('fits from the SVG viewBox, creates real zoom extents, and resets with Fit', async () => {
    const mounted = await mountViewer();
    const actions = actionButtons();

    expect(getDom('.mermaid-diagram-plane').attributes('style')).toContain('width: 800px');
    expect(getDom('.mermaid-diagram-plane').attributes('style')).toContain('height: 600px');
    expect(getDom('.mermaid-diagram-stage').attributes('style')).toContain('width: 800px');
    expect(getDom('.mermaid-diagram-stage').attributes('style')).toContain('height: 400px');
    expect(actions[0].attributes()).toHaveProperty('disabled');

    await actions[2].trigger('click');
    await flushPromises();
    expect(getDom('.mermaid-diagram-plane').attributes('style')).toContain('width: 1000px');
    expect(getDom('.mermaid-diagram-stage').attributes('style')).toContain('width: 1000px');
    expect(actions[0].attributes()).not.toHaveProperty('disabled');

    await actions[1].trigger('click');
    await flushPromises();
    expect(getDom('.mermaid-diagram-stage').attributes('style')).toContain('width: 800px');
    expect((getDom<HTMLElement>('.mermaid-viewer-canvas').element as HTMLElement).scrollLeft).toBe(0);
  });

  it('zooms around the wheel interaction point and supports keyboard controls', async () => {
    const mounted = await mountViewer();
    const canvas = getDom<HTMLElement>('.mermaid-viewer-canvas');
    const dialog = getDom('.mermaid-viewer-dialog');

    await canvas.trigger('wheel', { deltaY: -1, clientX: 200, clientY: 100 });
    await flushPromises();
    expect(getDom('.mermaid-diagram-stage').attributes('style')).toContain('width: 920px');
    expect((canvas.element as HTMLElement).scrollLeft).toBeCloseTo(30);

    await getDom('.mermaid-diagram-stage .background').trigger('pointerdown', {
      pointerId: 7,
      isPrimary: true,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    await canvas.trigger('pointermove', {
      pointerId: 7,
      isPrimary: true,
      clientX: 400,
      clientY: 300,
    });
    expect((canvas.element as HTMLElement).scrollLeft).toBeCloseTo(130);
    await canvas.trigger('pointerup', { pointerId: 7, isPrimary: true });

    await getDom('.mermaid-diagram-stage a').trigger('pointerdown', {
      pointerId: 8,
      isPrimary: true,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    await canvas.trigger('pointermove', {
      pointerId: 8,
      isPrimary: true,
      clientX: 300,
      clientY: 300,
    });
    expect((canvas.element as HTMLElement).scrollLeft).toBeCloseTo(130);

    await dialog.trigger('keydown', { key: '0' });
    await flushPromises();
    expect(getDom('.mermaid-diagram-stage').attributes('style')).toContain('width: 800px');

    await dialog.trigger('keydown', { key: '=' });
    await flushPromises();
    expect(getDom('.mermaid-diagram-stage').attributes('style')).toContain('width: 1000px');
    await dialog.trigger('keydown', { key: '-' });
    await flushPromises();
    expect(getDom('.mermaid-diagram-stage').attributes('style')).toContain('width: 800px');
  });

  it('traps focus, dismisses conventionally, and reports backdrop or Escape closes', async () => {
    const mounted = await mountViewer();
    const actions = actionButtons();
    const lastLink = getDom<HTMLElement>('.mermaid-diagram-stage .local-link');

    lastLink.element.focus();
    await lastLink.trigger('keydown', { key: 'Tab' });
    expect(document.activeElement).toBe(actions[1].element);

    actions[1].element.focus();
    await actions[1].trigger('keydown', { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastLink.element);

    await getDom('.mermaid-viewer-dialog').trigger('keydown', { key: 'Escape' });
    expect(mounted.emitted('close')).toHaveLength(1);
    await getDom('.mermaid-viewer-backdrop').trigger('click');
    expect(mounted.emitted('close')).toHaveLength(2);
  });

  it('returns Mermaid xlink HTTP anchors while preserving other interactive descendants', async () => {
    const mounted = await mountViewer();

    await getDom('.mermaid-diagram-stage a').trigger('click');
    expect(mounted.emitted('external-link')).toEqual([['https://example.com/diagram']]);

    await getDom('.mermaid-diagram-stage .local-link').trigger('click');
    expect(mounted.emitted('external-link')).toHaveLength(1);
  });
});
