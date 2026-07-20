import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MermaidDiagram from '../MermaidDiagram.vue';

const mermaidMocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock('~/services/mermaidService', () => ({
  mermaidService: mermaidMocks,
}));

vi.mock('../MermaidDiagramViewer.vue', () => ({
  default: {
    name: 'MermaidDiagramViewer',
    props: ['svgContent'],
    emits: ['close', 'external-link'],
    template: `
      <div class="viewer-mock">
        <div class="viewer-svg" v-html="svgContent"></div>
        <button class="viewer-close" @click="$emit('close')">close</button>
        <button class="viewer-link" @click="$emit('external-link', 'https://example.com/docs')">link</button>
      </div>
    `,
  },
}));

const svg = (label: string) => `
  <svg id="${label}" viewBox="0 0 800 400">
    <a href="https://example.com/${label}"><text>${label}</text></a>
    <rect class="background" width="800" height="400"></rect>
  </svg>
`;

const mountedWrappers: VueWrapper[] = [];
const mountTargets: HTMLElement[] = [];
const mountDiagram = (content = 'graph TD; A-->B') => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const wrapper = mount(MermaidDiagram, {
    props: { content },
    attachTo: target,
    global: { stubs: { Icon: true } },
  });
  mountedWrappers.push(wrapper);
  mountTargets.push(target);
  return wrapper;
};

describe('MermaidDiagram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mermaidMocks.render.mockResolvedValue(svg('current'));
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    mountTargets.splice(0).forEach((target) => target.remove());
    vi.restoreAllMocks();
  });

  it('preserves loading and error states without exposing an empty viewer action', async () => {
    let rejectRender!: (error: Error) => void;
    mermaidMocks.render.mockReturnValue(new Promise((_, reject) => {
      rejectRender = reject;
    }));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const wrapper = mountDiagram();

    expect(wrapper.find('.loading-state').exists()).toBe(true);
    expect(wrapper.find('.mermaid-expand-button').exists()).toBe(false);

    rejectRender(new Error('bad diagram'));
    await flushPromises();

    expect(wrapper.find('.error-state').text()).toContain('bad diagram');
    expect(wrapper.find('.mermaid-expand-button').exists()).toBe(false);
    expect(consoleError).toHaveBeenCalledWith('Mermaid rendering failed:', expect.any(Error));
  });

  it('renders a full-width intrinsic-capped preview with no duplicate wrapper id', async () => {
    const wrapper = mountDiagram();
    await flushPromises();

    expect(mermaidMocks.initialize).toHaveBeenCalledOnce();
    expect(mermaidMocks.render).toHaveBeenCalledWith('graph TD; A-->B', expect.stringMatching(/^mermaid-/));
    expect(wrapper.get('.diagram-content').classes()).toContain('w-full');
    expect(wrapper.get('.mermaid-svg-container').classes()).toContain('w-full');
    expect(wrapper.get('.mermaid-svg-container').attributes('id')).toBeUndefined();
    expect(wrapper.findAll('.mermaid-svg-container svg')).toHaveLength(1);
    expect(wrapper.get('.mermaid-expand-button').attributes('aria-label')).toBe('Expand diagram');
  });

  it('moves the one SVG copy into the viewer from the button or non-interactive preview', async () => {
    const wrapper = mountDiagram();
    await flushPromises();
    vi.spyOn(wrapper.get('.diagram-content').element, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 260,
    } as DOMRect);

    await wrapper.get('.mermaid-expand-button').trigger('click');
    expect(wrapper.find('.mermaid-svg-container').exists()).toBe(false);
    expect(wrapper.findAll('.viewer-svg svg')).toHaveLength(1);
    expect(wrapper.get('.diagram-content').attributes('style')).toContain('height: 260px');

    await wrapper.get('.viewer-close').trigger('click');
    await flushPromises();
    expect(wrapper.find('.viewer-mock').exists()).toBe(false);
    expect(wrapper.findAll('.mermaid-svg-container svg')).toHaveLength(1);
    expect(wrapper.get('.diagram-content').attributes('style')).toBeUndefined();
    expect(document.activeElement).toBe(wrapper.get('.mermaid-expand-button').element);

    await wrapper.get('.mermaid-svg-container .background').trigger('click');
    expect(wrapper.find('.viewer-mock').exists()).toBe(true);
    expect(wrapper.findAll('.viewer-svg > svg')).toHaveLength(1);
  });

  it('preserves interactive descendants instead of treating them as expand actions', async () => {
    const wrapper = mountDiagram();
    await flushPromises();

    await wrapper.get('.mermaid-svg-container a').trigger('click');
    expect(wrapper.find('.viewer-mock').exists()).toBe(false);
  });

  it('forwards expanded links to the owning Markdown boundary', async () => {
    const wrapper = mountDiagram();
    await flushPromises();
    await wrapper.get('.mermaid-expand-button').trigger('click');
    await wrapper.get('.viewer-link').trigger('click');

    expect(wrapper.emitted('external-link')).toEqual([['https://example.com/docs']]);
  });

  it('commits only the newest async render generation and invalidates an open viewer', async () => {
    const pending: Array<(value: string) => void> = [];
    mermaidMocks.render.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const wrapper = mountDiagram('graph TD; A-->B');
    await Promise.resolve();

    await wrapper.setProps({ content: 'graph TD; C-->D' });
    expect(pending).toHaveLength(2);
    pending[0](svg('stale'));
    await flushPromises();
    expect(wrapper.find('.loading-state').exists()).toBe(true);
    expect(wrapper.html()).not.toContain('stale');

    pending[1](svg('fresh'));
    await flushPromises();
    expect(wrapper.get('.mermaid-svg-container').html()).toContain('fresh');

    await wrapper.get('.mermaid-expand-button').trigger('click');
    expect(wrapper.find('.viewer-mock').exists()).toBe(true);
    await wrapper.setProps({ content: 'graph TD; E-->F' });
    expect(wrapper.find('.viewer-mock').exists()).toBe(false);
    expect(wrapper.find('.mermaid-expand-button').exists()).toBe(false);
  });
});
