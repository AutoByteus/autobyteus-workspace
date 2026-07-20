import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import MermaidDiagram from '~/components/conversation/segments/renderer/MermaidDiagram.vue';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import type { MobileNodeSession } from '~/types/remoteAccess';

// Mock components
vi.mock('~/components/conversation/segments/renderer/MermaidDiagram.vue', () => ({
  default: {
    name: 'MermaidDiagram',
    template: '<button class="mermaid-diagram-mock" @click="$emit(\'external-link\', \'https://example.com/diagram\')"></button>',
    props: ['content'],
    emits: ['external-link'],
  }
}));

describe('MarkdownRenderer', () => {
  let pinia: Pinia;

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('should render markdown content correctly', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '# Hello World'
      },
      global: { plugins: [pinia] },
    });

    expect(wrapper.html()).toContain('<h1>Hello World</h1>');
  });

  it('keeps the generic renderer inert and enables scoped file actions only when opted in', async () => {
    const generic = mount(MarkdownRenderer, {
      props: { content: '/tmp/result.md' },
      global: { plugins: [pinia] },
    });
    expect(generic.find('[data-event-monitor-file-action-id]').exists()).toBe(false);

    const monitor = mount(MarkdownRenderer, {
      props: {
        content: '[result.md](/tmp/result.md) and `/tmp/inline.txt`\n\n```text\n/tmp/fenced.csv\n```',
        enableEventMonitorFileActions: true,
      },
      global: { plugins: [pinia] },
    });
    await flushPromises();
    expect(monitor.findAll('[data-event-monitor-file-action-id]')).toHaveLength(3);
    expect(monitor.text()).toContain('/tmp/inline.txt');
    expect(monitor.text()).toContain('/tmp/fenced.csv');
    expect(monitor.find('code').text()).toBe('/tmp/inline.txt');
  });

  it('emits the raw-token action on explicit click without classifying anchor.href', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '[report.md](/Users/name/report.md), /tmp/result.png',
        enableEventMonitorFileActions: true,
      },
      global: { plugins: [pinia] },
    });
    const controls = wrapper.findAll('[data-event-monitor-file-action-id]');
    await controls[0].trigger('click');
    const action = wrapper.emitted('file-path-action')?.[0]?.[0] as { normalizedCandidate: string };
    expect(action.normalizedCandidate).toBe('/Users/name/report.md');
    expect(wrapper.find('a').attributes('href')).toBe('#');
  });

  it('decodes encoded POSIX and Windows link destinations while retaining source text', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '[posix](/tmp/my%20file.md) [windows](C%3A%5CWork%5Cmy%20report.md)',
        enableEventMonitorFileActions: true,
      },
      global: { plugins: [pinia] },
    });
    await flushPromises();

    const controls = wrapper.findAll('[data-event-monitor-file-action-id]');
    await controls[0].trigger('click');
    await controls[1].trigger('click');
    const actions = wrapper.emitted('file-path-action')?.map((entry) => entry[0] as { normalizedCandidate: string });
    expect(actions).toEqual([
      expect.objectContaining({ normalizedCandidate: '/tmp/my file.md' }),
      expect.objectContaining({ normalizedCandidate: 'C:/Work/my report.md' }),
    ]);
    expect(wrapper.text()).toContain('posix');
    expect(wrapper.text()).toContain('windows');
  });

  it('keeps fenced code text unchanged while exposing complete space-containing paths', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '```text\n/tmp/my file.md\n[report](C:\\Work\\my report.md)\n```',
        enableEventMonitorFileActions: true,
      },
      global: { plugins: [pinia] },
    });
    await flushPromises();

    expect(wrapper.find('code').text()).toContain('/tmp/my file.md');
    expect(wrapper.find('code').text()).toContain('[report](C:\\Work\\my report.md)');
    expect(wrapper.findAll('[data-event-monitor-file-action-id]')).toHaveLength(2);
    expect(wrapper.findAll('.event-monitor-file-action')).toHaveLength(0);
    expect(wrapper.findAll('.event-monitor-file-action-link')).toHaveLength(2);
    expect(wrapper.findAll('.event-monitor-file-action-link')[0].text()).toBe('my file.md');
  });

  it('renders supported paths as compact inline links while preserving labels and source text', async () => {
    const inlinePath = '/tmp/inline.txt';
    const fencedPath = '/tmp/fenced.csv';
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: `[compaction-lifecycle-contract.md](/tmp/compaction-lifecycle-contract.md)\n\n${inlinePath}\n\n\`${inlinePath}\`\n\n\`\`\`text\n${fencedPath}\n\`\`\``,
        enableEventMonitorFileActions: true,
      },
      global: { plugins: [pinia] },
    });
    await flushPromises();

    const controls = wrapper.findAll('[data-event-monitor-file-action-id]');
    expect(controls).toHaveLength(4);
    expect(wrapper.findAll('.event-monitor-file-action')).toHaveLength(0);
    expect(controls.every((control) => control.element.tagName === 'A')).toBe(true);
    expect(wrapper.find('a').text()).toBe('compaction-lifecycle-contract.md');
    expect(controls[1].text()).toBe(inlinePath);
    expect(controls[2].text()).toBe(inlinePath);
    expect(wrapper.text()).toContain(inlinePath);
    expect(wrapper.findAll('code')[0].text()).toBe(inlinePath);
    expect(wrapper.find('pre code').text()).toBe(fencedPath);
    expect(controls[3].text()).toBe('fenced.csv');
    expect(controls.every((control) => !control.text().includes('Open'))).toBe(true);
    expect(controls.every((control) => !control.text().includes('in Files'))).toBe(true);
    expect(controls[0].attributes('aria-label')).toContain('Open');
    expect(controls[0].attributes('aria-label')).toContain('in Files');
    expect(controls[0].attributes('title')).toBe('/tmp/compaction-lifecycle-contract.md');
    expect(wrapper.findAll('button')).toHaveLength(0);
  });

  it('keeps inline file links keyboard accessible for Enter and Space', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '/tmp/keyboard.md',
        enableEventMonitorFileActions: true,
      },
      global: { plugins: [pinia] },
    });
    await flushPromises();

    const control = wrapper.get('[data-event-monitor-file-action-id]');
    await control.trigger('keydown', { key: 'Enter' });
    await control.trigger('keydown', { key: ' ' });

    expect(wrapper.emitted('file-path-action')).toHaveLength(2);
    expect(wrapper.findAll('.event-monitor-file-action')).toHaveLength(0);
  });

  it('keeps unsupported archive, installer, and binary paths source-faithful without actions', async () => {
    const source = '/tmp/archive.zip /tmp/installer.dmg /tmp/setup.pkg /tmp/payload.bin /tmp/unknown.custom';
    const fencedSource = '```text\n/tmp/archive.tar.gz\n/tmp/application.app\n```';
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: `${source}\n\n${fencedSource}`,
        enableEventMonitorFileActions: true,
      },
      global: { plugins: [pinia] },
    });
    await flushPromises();

    expect(wrapper.findAll('[data-event-monitor-file-action-id]')).toHaveLength(0);
    expect(wrapper.text()).toContain(source);
    expect(wrapper.find('code').text()).toBe('/tmp/archive.tar.gz\n/tmp/application.app');
  });

  it('renders supported Lua code paths as Event Monitor actions', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '/tmp/script.lua',
        enableEventMonitorFileActions: true,
      },
      global: { plugins: [pinia] },
    });
    await flushPromises();

    const actionControl = wrapper.get('[data-event-monitor-file-action-id]');
    await actionControl.trigger('click');

    expect(wrapper.emitted('file-path-action')?.[0]?.[0]).toEqual(expect.objectContaining({
      normalizedCandidate: '/tmp/script.lua',
      previewType: 'Text',
    }));
  });

  it('keeps incomplete absolute paths unchanged across links, prose, inline code, and fences', async () => {
    const incompletePath = '/Users/normy/.../compaction-lifecycle-contract.md';
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: [
          `[truncated](${incompletePath})`,
          incompletePath,
          `\`${incompletePath}\``,
          `\`\`\`text\n${incompletePath}\n\`\`\``,
        ].join('\n'),
        enableEventMonitorFileActions: true,
      },
      global: { plugins: [pinia] },
    });
    await flushPromises();

    expect(wrapper.findAll('[data-event-monitor-file-action-id]')).toHaveLength(0);
    expect(wrapper.find('a').attributes('href')).toBe(incompletePath);
    expect(wrapper.text()).toContain(incompletePath);
    expect(wrapper.findAll('code').map((code) => code.text())).toContain(incompletePath);
    expect(wrapper.find('pre code').text()).toBe(incompletePath);
    expect(wrapper.emitted('file-path-action')).toBeUndefined();
  });

  it('should render MermaidDiagram component for mermaid blocks', () => {
    // We rely on useMarkdownSegments to parse this. 
    // Since useMarkdownSegments is a real composable (not mocked here), 
    // we need to ensure it processes the fence rule correctly.
    // However, in a unit test for the Renderer, typically we want to see if it renders the child component.
    
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '```mermaid\ngraph TD;\nA-->B;\n```'
      },
      global: {
        plugins: [pinia],
        stubs: {
          MermaidDiagram: true // Stub it to verify it's rendered
        }
      }
    });

    // Check if MermaidDiagram is present
    const mermaidComponent = wrapper.findComponent(MermaidDiagram);
    expect(mermaidComponent.exists()).toBe(true);
    expect(mermaidComponent.props('content')).toContain('graph TD;\nA-->B;');
  });

  it('routes a teleported Mermaid external-link event through the existing link authority', async () => {
    const openExternalLink = vi.fn();
    const priorElectronApi = window.electronAPI;
    window.electronAPI = {
      ...window.electronAPI,
      openExternalLink,
    } as typeof window.electronAPI;
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '```mermaid\ngraph TD;\nA-->B;\n```' },
      global: { plugins: [pinia] },
    });

    await wrapper.get('.mermaid-diagram-mock').trigger('click');

    expect(openExternalLink).toHaveBeenCalledWith('https://example.com/diagram');
    window.electronAPI = priorElectronApi;
  });

  it('binds a managed image only after authorized resolution completes', async () => {
    const session: MobileNodeSession = {
      version: 1,
      nodeId: 'mobile-paired-node',
      serverBaseUrl: 'http://node.example',
      credential: 'credential-a',
      pairedAt: '2026-07-12T00:00:00.000Z',
      device: {
        deviceId: 'device-1',
        displayName: 'Phone',
        clientFacingBaseUrl: 'http://node.example',
        createdAt: '2026-07-12T00:00:00.000Z',
        lastSeenAt: null,
        revokedAt: null,
      },
    };
    useMobileNodeSessionStore().$patch({ session });
    let resolveFetch!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:managed-image');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '![Diagram](assets/diagram.svg)',
        imageResourceResolver: () => ({
          kind: 'managed',
          fetchUrl: '/rest/workspaces/ws/content?path=docs%2Fassets%2Fdiagram.svg',
          fragment: '#node-a',
        }),
      },
      global: { plugins: [pinia] },
    });

    const image = wrapper.get('img');
    expect(image.attributes('src')).toBeUndefined();
    expect(image.attributes('alt')).toBe('Diagram');

    resolveFetch({
      ok: true,
      status: 200,
      statusText: 'OK',
      blob: () => Promise.resolve(new Blob(['image'], { type: 'image/svg+xml' })),
    } as Response);
    await flushPromises();

    expect(image.attributes('src')).toBe('blob:managed-image#node-a');
    wrapper.unmount();
  });
});
