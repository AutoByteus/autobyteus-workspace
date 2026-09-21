import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRecordedUploadLabelFixture, recordedUploadLabelCases } from '../../../../autobyteus-server-ts/tests/fixtures/recorded-upload-labels';
import UserMessageComponent from '../UserMessage.vue';
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation';
import { buildEventMonitorActiveTraceBrowsePresentation } from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation';
import type { UserMessage } from '~/types/conversation';

vi.mock('~/stores/fileExplorer', () => ({ useFileExplorerStore: () => ({ openFile: vi.fn(), openFilePreview: vi.fn() }) }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ isEmbeddedWindow: false }) }));
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => ({ activeWorkspace: null }) }));

describe('ordinary stored upload names through raw/history/page/shared Open', () => {
  beforeEach(() => { window.open = vi.fn(); });
  it.each(['initial', 'cold', 'page'])('%s formats only the recognized ordinary upload basename', async surface => {
    for (const input of recordedUploadLabelCases) {
      // Actual server-owned ContextFile default, raw codec and read projections.
      const { raw, bytes, savedRow, recordedFileName, eventId, conversation, page } =
        createRecordedUploadLabelFixture(input, surface !== 'initial');
      if (!input.name) expect(recordedFileName).toBe(input.uri.split('/').at(-1));
      const message = surface === 'page'
        ? (buildEventMonitorActiveTraceBrowsePresentation(page as any)[0] as { message: UserMessage }).message
        : buildConversationFromProjection('exact-run', conversation, {
          agentDefinitionId: 'd', agentName: 'agent', llmModelIdentifier: 'model',
        }).messages[0] as UserMessage;
      const attachment = message.contextFilePaths![0];
      expect(attachment.displayName).toBe(input.label);
      expect(attachment.locator).toBe(input.uri);
      expect(attachment.type).toBe(input.type === 'unknown' ? 'Unknown' : input.type === 'image' ? 'Image' : 'Text');
      const wrapper = mount(UserMessageComponent, { props: { message } });
      const button = wrapper.get('button');
      expect(button.attributes('aria-label')).toBe(`Open ${input.label}`);
      expect(button.attributes('title')).toBe(`Open ${input.label}`);
      await button.trigger('click');
      expect(window.open).toHaveBeenLastCalledWith(input.uri.startsWith('https:') ? input.uri : 'http://localhost:8000' + input.uri, '_blank', 'noopener,noreferrer');
      expect(JSON.stringify(raw)).toBe(bytes);
      expect(JSON.stringify(savedRow)).toBe(bytes);
      expect(eventId).toContain('recorded-user');
      wrapper.unmount();
    }
  });
});
