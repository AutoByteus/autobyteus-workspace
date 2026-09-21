import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import UserMessageComponent from '../UserMessage.vue';
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation';
import { buildEventMonitorActiveTraceBrowsePresentation } from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation';
import { buildRecentEventMonitorPresentationWitness, areRecentEventMonitorPresentationWitnessesEqual } from '~/services/eventMonitor/recentEventMonitorPresentationWitness';
import type { UserMessage } from '~/types/conversation';

vi.mock('~/stores/fileExplorer', () => ({ useFileExplorerStore: () => ({ openFile: vi.fn(), openFilePreview: vi.fn() }) }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ isEmbeddedWindow: false }) }));
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => ({ activeWorkspace: null }) }));
const defaults = { agentDefinitionId: 'd', agentName: 'agent', llmModelIdentifier: 'model' };
const uri = '/rest/agent-org-runs/root/agent-runs/task-repeat/context-files/ctx_t__notes.txt';
const reference = { uri, fileType: 'text', fileName: 'accepted label.txt' };
const entry = { kind: 'message', role: 'user', content: '', ts: 10, fileAttachments: [reference] };
const hydrate = (entries = [entry]) => buildConversationFromProjection('exact-run', entries, defaults);
const witness = (message: UserMessage) => buildRecentEventMonitorPresentationWitness([
  { kind: 'message', key: 'user', messageIndex: 0, message },
], (key: string) => key);

describe('cold and paged user file associations use shared UserMessage Open', () => {
  beforeEach(() => { window.open = vi.fn(); });
  it.each(['initial/cold', 'active-trace page'])('%s displays a file-only label and opens its saved owner, not a selected peer', async source => {
    const message = source === 'initial/cold' ? hydrate().messages[0] as UserMessage :
      (buildEventMonitorActiveTraceBrowsePresentation([{
        eventId: 'raw:exact', turnGroupId: 'turn', occurredAtMs: 10_000, visuals: [{
          __typename: 'EventMonitorUserVisual', kind: 'user', visualId: 'visual', eventId: 'raw:exact', kindOrdinal: 0,
          text: '', attachments: [{ attachmentId: 'file:0', locator: uri, fileType: 'text', fileName: reference.fileName }],
        }],
      }])[0] as { message: UserMessage }).message;
    const wrapper = mount(UserMessageComponent, { props: { message }, global: { mocks: { $t: (key: string) => key } } });
    expect(wrapper.text()).toContain(reference.fileName);
    expect(message.contextFilePaths![0]).toMatchObject({ locator: uri, type: 'Text', displayName: reference.fileName, phase: 'final' });
    await wrapper.get('button.message-attachment-chip').trigger('click');
    expect(window.open).toHaveBeenCalledExactlyOnceWith('http://localhost:8000' + uri, '_blank', 'noopener,noreferrer');
    wrapper.unmount();
  });

  it('does not merge distinct file identities/types/names; witnesses change for each attachment fact', () => {
    const message = hydrate().messages[0] as UserMessage;
    for (const change of [{ uri: uri.replace('task-repeat', 'configured') }, { fileType: 'pdf' }, { fileName: 'different.txt' }]) {
      const otherEntry = { ...entry, fileAttachments: [{ ...reference, ...change }] };
      const other = hydrate([otherEntry]).messages[0] as UserMessage;
      expect(hydrate([entry, otherEntry]).messages).toHaveLength(2);
      expect(areRecentEventMonitorPresentationWitnessesEqual(witness(message), witness(other))).toBe(false);
    }
    expect(hydrate([entry, entry]).messages).toHaveLength(1);
  });

  it('preserves media thumbnails, nullable-name/unknown type, and old rows without inventing association', () => {
    const conversation = buildConversationFromProjection('run', [
      { ...entry, fileAttachments: undefined, media: { images: ['/rest/runs/r/context-files/ctx_i__image.png'] } },
      { ...entry, ts: 11, fileAttachments: [{ uri, fileType: 'unknown', fileName: null }] },
      { ...entry, ts: 12, fileAttachments: undefined },
    ], defaults);
    const [media, unknown, old] = conversation.messages as UserMessage[];
    expect(media.contextFilePaths).toHaveLength(1);
    expect(media.contextFilePaths![0].type).toBe('Image');
    expect(unknown.contextFilePaths![0].type).toBe('Unknown');
    expect(old.contextFilePaths).toEqual([]);
  });
});
