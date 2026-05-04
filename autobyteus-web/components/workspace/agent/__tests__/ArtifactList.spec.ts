import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ArtifactList from '../ArtifactList.vue';
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import {
  toAgentArtifactViewerItem,
  toMessageReferenceArtifactViewerItem,
  type ArtifactViewerItem,
} from '../artifactViewerItem';
import type { MessageFileReferencePerspectiveItem } from '~/stores/messageFileReferencesStore';

const agentArtifacts: RunFileChangeArtifact[] = [
  { id: '1', runId: 'a1', path: 'test.txt', type: 'file', status: 'available', sourceTool: 'edit_file', sourceInvocationId: 'edit-1', createdAt: '', updatedAt: '' },
  { id: '2', runId: 'a1', path: 'image.png', type: 'image', status: 'available', sourceTool: 'generated_output', sourceInvocationId: 'image-1', createdAt: '', updatedAt: '' },
];

const buildMessageReferenceItem = (
  overrides: Partial<MessageFileReferencePerspectiveItem> & { referenceId: string; direction: 'sent' | 'received'; path: string },
) => {
  const base = {
    referenceId: overrides.referenceId,
    teamRunId: 'team-1',
    senderRunId: overrides.direction === 'sent' ? 'focused-run' : 'reviewer-run',
    senderMemberName: overrides.direction === 'sent' ? 'Focused' : 'Reviewer',
    receiverRunId: overrides.direction === 'sent' ? 'worker-run' : 'focused-run',
    receiverMemberName: overrides.direction === 'sent' ? 'Worker' : 'Focused',
    path: overrides.path,
    type: 'file' as const,
    messageType: 'handoff',
    createdAt: '',
    updatedAt: overrides.updatedAt ?? '',
  };
  const item: MessageFileReferencePerspectiveItem = {
    ...base,
    direction: overrides.direction,
    counterpartRunId: overrides.direction === 'sent' ? base.receiverRunId : base.senderRunId,
    counterpartMemberName: overrides.direction === 'sent' ? base.receiverMemberName : base.senderMemberName,
    reference: base,
  };
  return toMessageReferenceArtifactViewerItem(item);
};

const mockArtifacts: ArtifactViewerItem[] = [
  ...agentArtifacts.map(toAgentArtifactViewerItem),
  buildMessageReferenceItem({ referenceId: 'sent-ref-1', direction: 'sent', path: '/tmp/sent-report.md' }),
  buildMessageReferenceItem({ referenceId: 'received-ref-1', direction: 'received', path: '/tmp/received-report.md' }),
];

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
          'workspace.components.workspace.agent.ArtifactList.sent_artifacts': 'Sent Artifacts',
          'workspace.components.workspace.agent.ArtifactList.received_artifacts': 'Received Artifacts',
          'workspace.components.workspace.agent.ArtifactList.unknown_teammate': 'Unknown teammate',
        }[key] ?? key),
      },
    },
  });

  it('renders empty state when no artifacts exist', () => {
    const wrapper = mountSubject({ artifacts: [] });

    expect(wrapper.text()).toContain('No touched files yet');
  });

  it('categorizes artifacts into Agent, Sent, and Received sections grouped by counterpart', () => {
    const wrapper = mountSubject({ artifacts: mockArtifacts });

    expect(wrapper.text()).toContain('Agent Artifacts');
    expect(wrapper.text()).toContain('Sent Artifacts');
    expect(wrapper.text()).toContain('Received Artifacts');
    expect(wrapper.text()).toContain('Worker');
    expect(wrapper.text()).toContain('Reviewer');
    expect(wrapper.text()).toContain('test.txt');
    expect(wrapper.text()).toContain('image.png');
    expect(wrapper.text()).toContain('sent-report.md');
    expect(wrapper.text()).toContain('received-report.md');
    expect(wrapper.text()).not.toContain(['Referenced', 'Artifacts'].join(' '));
  });

  it('emits select when an item is clicked', async () => {
    const wrapper = mountSubject({ artifacts: mockArtifacts });

    const items = wrapper.findAllComponents({ name: 'ArtifactItem' });
    await items[0].trigger('click');

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')?.[0][0]).toEqual(mockArtifacts[0]);
  });

  it('navigates artifacts using arrow keys in agent-then-sent-then-received order', async () => {
    const wrapper = mountSubject({
      artifacts: mockArtifacts,
      selectedArtifactId: mockArtifacts[0].itemId,
    });

    await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowDown' });
    const event1 = wrapper.emitted('select')?.[0] as unknown as [ArtifactViewerItem];
    expect(event1[0].itemId).toBe(mockArtifacts[1].itemId);

    await wrapper.setProps({ selectedArtifactId: mockArtifacts[1].itemId });
    await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowDown' });
    const event2 = wrapper.emitted('select')?.[1] as unknown as [ArtifactViewerItem];
    expect(event2[0].itemId).toBe(mockArtifacts[2].itemId);

    await wrapper.setProps({ selectedArtifactId: mockArtifacts[2].itemId });
    await wrapper.find('div[tabindex="0"]').trigger('keydown', { key: 'ArrowDown' });
    const event3 = wrapper.emitted('select')?.[2] as unknown as [ArtifactViewerItem];
    expect(event3[0].itemId).toBe(mockArtifacts[3].itemId);
  });
});
