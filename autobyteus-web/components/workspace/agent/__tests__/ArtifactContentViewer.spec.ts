import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ArtifactContentViewer from '../ArtifactContentViewer.vue';
import { createTestingPinia } from '@pinia/testing';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentContextsStore } from '~/stores/agentContextsStore';

// Mock child components to avoid rendering complexity
vi.mock('~/components/fileExplorer/FileViewer.vue', () => ({
  default: { template: '<div data-testid="file-viewer"></div>' }
}));

// Mock utils
vi.mock('~/utils/fileExplorer/fileUtils', () => ({
  determineFileType: vi.fn().mockResolvedValue('Text')
}));

describe('ArtifactContentViewer', () => {
  const defaultArtifact = {
    id: 'test-id',
    agentId: 'agent-1',
    path: 'test.md',
    type: 'file',
    status: 'streaming',
    content: '# Hello',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mountComponent = (artifact: any) => {
    return mount(ArtifactContentViewer, {
      props: {
        artifact
      },
      global: {
        plugins: [createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            workspace: { workspaces: {} },
            agentContexts: { activeContext: null }
          }
        })],
        stubs: {
          Icon: true
        }
      }
    });
  };

  it('defaults to edit mode when artifact is streaming', async () => {
    const wrapper = mountComponent({ ...defaultArtifact, status: 'streaming' });
    await wrapper.vm.$nextTick();

    const fileViewer = wrapper.findComponent({ name: 'FileViewer' }); // or find by stub
    // Since we didn't give the mock a name, we can find by the data-testid we put in the template or just findComponent
    // Using the mocked component definition might be tricky if not exported.
    // Easier: find by data-testid if we had one on the component ROOT, but FileViewer is a child.
    // Actually, findComponent(FileViewer) works if we import it.
    
    // We already imported: vi.mock... but we need the actual import symbol to pass to findComponent if we want type safety,
    // but here we can just use the stub. Use find('[data-testid="file-viewer"]') if the stub renders that.
    // The stub template is '<div data-testid="file-viewer"></div>'.
    // HOWEVER, Vue Test Utils findComponent works with the 'name' or the component object.
    
    // Let's rely on the props passed to the stub.
    // We can access vm.viewMode if we expose it or just check the child.
    
    expect((wrapper.vm as any).viewMode).toBe('edit');
  });

  it('defaults to edit mode when artifact is pending_approval', async () => {
    const wrapper = mountComponent({ ...defaultArtifact, status: 'pending_approval' });
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).viewMode).toBe('edit');
  });

  it('defaults to preview mode when artifact is persisted and supports preview', async () => {
    const wrapper = mountComponent({ ...defaultArtifact, status: 'persisted' });
    // Need to wait for async operations (updateFileType, etc.)
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10)); 
    expect((wrapper.vm as any).viewMode).toBe('preview');
  });

  it('defaults to edit mode when artifact is persisted but does not support preview', async () => {
    const wrapper = mountComponent({ ...defaultArtifact, path: 'test.ts', status: 'persisted' });
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect((wrapper.vm as any).viewMode).toBe('edit');
  });
});
