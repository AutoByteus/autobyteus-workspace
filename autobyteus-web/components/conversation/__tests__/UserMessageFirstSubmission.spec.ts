import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { isReactive, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import UserMessageComponent from '../UserMessage.vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { beginLocalUserSubmission, finalizeLocalSubmissionAttachments, retargetLocalUserSubmission, failLocalSubmission } from '~/services/runSubmission/localUserSubmission';
import type { ContextAttachment, UserMessage } from '~/types/conversation';

vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn(), refreshRunNavigationTopology: vi.fn() }) }));
vi.mock('~/stores/fileExplorer', () => ({ useFileExplorerStore: () => ({ openFile: vi.fn(), openFilePreview: vi.fn() }) }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ isEmbeddedWindow: false }) }));
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => ({ activeWorkspace: null }) }));

const attachment = (phase: 'draft' | 'final'): ContextAttachment => ({
  kind: 'uploaded', phase, id: 'file-1', storedFilename: 'note.txt', displayName: 'note.txt', type: 'Text',
  locator: `/rest/context-files/${phase}/note.txt`,
});

describe('canonical first-submission chip through actual Pinia promotion', () => {
  beforeEach(() => { setActivePinia(createPinia()); window.open = vi.fn(); });
  it.each(['standalone', 'team_member', 'org'] as const)('%s retains one proxy and opens the final text immediately without remount', async (kind) => {
    const contexts = useAgentContextsStore();
    useAgentRunConfigStore().setAgentConfig({ agentDefinitionId: 'def', agentDefinitionName: 'Writer',
      llmModelIdentifier: 'model', runtimeKind: 'autobyteus', workspaceId: null, workspaceMetadata: null, autoExecuteTools: true, skillAccessMode: 'NONE', isLocked: false });
    const temporary = contexts.createRunFromTemplate();
    const context = contexts.getRun(temporary)!;
    context.requirement = 'Read my note';
    context.contextFilePaths = [attachment('draft')];
    const navigationTarget = kind === 'org' ? null : kind === 'standalone'
      ? { kind, runId: temporary } : { kind, teamRunId: 'team-1', agentRunId: temporary };
    const handle = beginLocalUserSubmission(context, { text: context.requirement, attachments: context.contextFilePaths, navigationTarget });
    const rendered = context.conversation.messages[0] as UserMessage;
    const wrapper = mount(UserMessageComponent, { props: { message: rendered } });
    expect(wrapper.get('button').attributes('aria-label')).toBe('Open note.txt');
    contexts.promoteTemporaryId(temporary, 'permanent-agent');
    if (kind === 'standalone') retargetLocalUserSubmission(handle, { kind, runId: 'permanent-agent' });
    Object.assign(handle.message, { messageId: 'accepted-once', dedupeKey: 'input-1' });
    expect(finalizeLocalSubmissionAttachments(handle, [attachment('final')])).toBe(true);
    await nextTick();
    await wrapper.get('button').trigger('click');
    expect(window.open).toHaveBeenCalledExactlyOnceWith('http://localhost:8000/rest/context-files/final/note.txt', '_blank', 'noopener,noreferrer');
    expect(handle.message).toBe(rendered);
    expect(isReactive(handle.message)).toBe(true);
    expect(contexts.getRun('permanent-agent')).toBe(context);
    expect(context.conversation.messages).toHaveLength(1);
    expect(context.conversation.messages[0]).toBe(handle.message);
    expect(finalizeLocalSubmissionAttachments(handle, [attachment('final')])).toBe(false);
    failLocalSubmission(handle, new Error('send rejected'));
    expect(context.conversation.messages[0]).toBe(handle.message);
    expect(context.conversation.messages).toHaveLength(2);
    wrapper.unmount();
  });
});
