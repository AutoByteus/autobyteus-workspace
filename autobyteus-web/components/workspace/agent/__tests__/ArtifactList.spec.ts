import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ArtifactList from '../ArtifactList.vue';
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';

describe('ArtifactList.vue', () => {
  const mockArtifacts: RunFileChangeArtifact[] = [
    { id: '1', runId: 'a1', path: 'test.txt', type: 'file', status: 'available', sourceTool: 'edit_file', sourceInvocationId: 'edit-1', createdAt: '', updatedAt: '' },
    { id: '2', runId: 'a1', path: 'image.png', type: 'image', status: 'available', sourceTool: 'generated_output', sourceInvocationId: 'image-1', createdAt: '', updatedAt: '' },
    { id: '3', runId: 'a1', path: 'script.py', type: 'file', status: 'streaming', sourceTool: 'write_file', sourceInvocationId: 'write-1', createdAt: '', updatedAt: '' },
    { id: '4', runId: 'a1', path: 'video.mp4', type: 'video', status: 'pending', sourceTool: 'generated_output', sourceInvocationId: 'video-1', createdAt: '', updatedAt: '' },
  ];

  const mountSubject = (props: Record<string, unknown>) => mount(ArtifactList, {
    props,
    global: {
      stubs: {
        Icon: true,
      },
      mocks: {
        $t: (key: string) => key.includes('no_touched_files_yet') ? 'No touched files yet' : key,
      },
    },
  });

  it('renders empty state when no artifacts exist', () => {
    const wrapper = mountSubject({ artifacts: [] });

    expect(wrapper.text()).toContain('No touched files yet');
  });

  it('categorizes artifacts correctly into Assets and Files', () => {
    const wrapper = mountSubject({ artifacts: mockArtifacts });

    expect(wrapper.text()).toContain('Assets');
    expect(wrapper.text()).toContain('Files');
    expect(wrapper.text()).toContain('test.txt');
    expect(wrapper.text()).toContain('image.png');
    expect(wrapper.text()).toContain('script.py');
    expect(wrapper.text()).toContain('video.mp4');
  });

  it('emits select when an item is clicked', async () => {
    const wrapper = mountSubject({ artifacts: mockArtifacts });

    const items = wrapper.findAllComponents({ name: 'ArtifactItem' });
    await items[0].trigger('click');

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')?.[0][0]).toEqual(mockArtifacts[1]);
  });

  it('navigates artifacts using arrow keys in flattened asset-first order', async () => {
    const wrapper = mountSubject({
      artifacts: mockArtifacts,
      selectedArtifactId: mockArtifacts[1].id,
    });

    await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowDown' });
    const event1 = wrapper.emitted('select')?.[0] as unknown as [RunFileChangeArtifact];
    expect(event1[0].id).toBe('4');

    await wrapper.setProps({ selectedArtifactId: '4' });
    await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowDown' });
    const event2 = wrapper.emitted('select')?.[1] as unknown as [RunFileChangeArtifact];
    expect(event2[0].id).toBe('1');

    await wrapper.setProps({ selectedArtifactId: '1' });
    await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowUp' });
    const event3 = wrapper.emitted('select')?.[2] as unknown as [RunFileChangeArtifact];
    expect(event3[0].id).toBe('4');
  });
});
