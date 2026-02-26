import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import MermaidDiagram from '~/components/conversation/segments/renderer/MermaidDiagram.vue';

// Mock components
vi.mock('~/components/conversation/segments/renderer/MermaidDiagram.vue', () => ({
  default: {
    name: 'MermaidDiagram',
    template: '<div class="mermaid-diagram-mock"></div>',
    props: ['content']
  }
}));

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render markdown content correctly', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '# Hello World'
      }
    });

    expect(wrapper.html()).toContain('<h1>Hello World</h1>');
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
});
