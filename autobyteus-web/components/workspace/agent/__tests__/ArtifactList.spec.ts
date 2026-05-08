import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ArtifactList from '../ArtifactList.vue';
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import { toAgentArtifactViewerItem, type ArtifactViewerItem } from '../artifactViewerItem';

const agentArtifacts: RunFileChangeArtifact[] = [
  {
    id: '1',
    runId: 'a1',
    path: 'test.txt',
    type: 'file',
    status: 'available',
    sourceTool: 'edit_file',
    sourceInvocationId: 'edit-1',
    createdAt: '2026-04-08T00:00:00.000Z',
    updatedAt: '2026-04-08T00:00:01.000Z',
  },
  {
    id: '2',
    runId: 'a1',
    path: 'image.png',
    type: 'image',
    status: 'available',
    sourceTool: 'generated_output',
    sourceInvocationId: 'image-1',
    createdAt: '2026-04-08T00:00:00.000Z',
    updatedAt: '2026-04-08T00:00:02.000Z',
  },
];

const mockArtifacts: ArtifactViewerItem[] = agentArtifacts.map(toAgentArtifactViewerItem);

describe('ArtifactList.vue', () => {
  const mountSubject = (props: Record<string, unknown>) => mount(ArtifactList, {
    props,
    global: {
      stubs: {
        Icon: true,
      },
      mocks: {
        $t: (key: string) => ({
          'workspace.components.workspace.agent.ArtifactList.no_touched_files_yet': 'No touched files yet',
          'workspace.components.workspace.agent.ArtifactList.agent_artifacts': 'Agent Artifacts',
        }[key] ?? key),
      },
    },
  });

  it('renders empty state when no artifacts exist', () => {
    const wrapper = mountSubject({ artifacts: [] });

    expect(wrapper.text()).toContain('No touched files yet');
  });

  it('renders only agent artifact rows without legacy sent/received sections', () => {
    const wrapper = mountSubject({ artifacts: mockArtifacts });

    expect(wrapper.text()).toContain('Agent Artifacts');
    expect(wrapper.text()).toContain('test.txt');
    expect(wrapper.text()).toContain('image.png');
    expect(wrapper.text()).not.toContain('Sent Artifacts');
    expect(wrapper.text()).not.toContain('Received Artifacts');
    expect(wrapper.text()).not.toContain('Sent to');
    expect(wrapper.text()).not.toContain('Received from');
  });

  it('emits select when an item is clicked', async () => {
    const wrapper = mountSubject({ artifacts: mockArtifacts });

    const items = wrapper.findAllComponents({ name: 'ArtifactItem' });
    await items[0].trigger('click');

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')?.[0][0]).toEqual(mockArtifacts[1]);
  });

  it('navigates artifacts using updated-time order', async () => {
    const wrapper = mountSubject({
      artifacts: mockArtifacts,
      selectedArtifactId: mockArtifacts[1].itemId,
    });

    await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowDown' });
    const event = wrapper.emitted('select')?.[0] as unknown as [ArtifactViewerItem];
    expect(event[0].itemId).toBe(mockArtifacts[0].itemId);
  });
});
