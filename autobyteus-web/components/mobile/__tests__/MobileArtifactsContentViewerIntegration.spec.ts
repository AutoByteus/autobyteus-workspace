import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileArtifacts from '../MobileArtifacts.vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { useRunFileChangesStore, type RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';
import type { MobileNodeSession } from '~/types/remoteAccess';

const {
  determineFileTypeMock,
  createObjectURLMock,
  revokeObjectURLMock,
} = vi.hoisted(() => ({
  determineFileTypeMock: vi.fn(),
  createObjectURLMock: vi.fn(() => 'blob:mobile-artifact-preview'),
  revokeObjectURLMock: vi.fn(),
}));

vi.mock('~/components/fileExplorer/FileViewer.vue', () => ({
  default: {
    name: 'FileViewer',
    props: ['file', 'mode', 'readOnly', 'error'],
    template: `
      <div
        data-testid="file-viewer"
        :data-file-type="file.type"
        :data-mode="mode"
        :data-url="file.url || ''"
      >
        {{ file.content || file.url || error || '' }}
      </div>
    `,
  },
}));

vi.mock('~/utils/fileExplorer/fileUtils', () => ({
  determineFileType: determineFileTypeMock,
}));

let pinia: Pinia;
let mountedWrapper: VueWrapper | null = null;

const agentRunId = 'run-mobile-credential';

const agentRunContext: MobileWorkContext = {
  kind: 'agent-run',
  runId: agentRunId,
  agentDefinitionId: 'agent-1',
  title: 'Builder Agent',
  summary: 'Existing run',
  workspaceRootPath: '/Users/normy/project',
  isActive: true,
  lastActivityAt: '2026-05-22T14:00:00.000Z',
  statusLabel: 'Running',
};

const storedSession = (): MobileNodeSession => ({
  version: 1,
  nodeId: 'mobile-paired-node',
  serverBaseUrl: 'http://desktop-private.local:29695',
  credential: 'mra_secret',
  pairedAt: '2026-05-22T14:00:00.000Z',
  device: {
    deviceId: 'device-1',
    displayName: 'Phone',
    clientFacingBaseUrl: 'http://desktop-private.local:29695',
    createdAt: '2026-05-22T14:00:00.000Z',
    lastSeenAt: null,
    revokedAt: null,
  },
});

function makeAgentRunConfig(agentDefinitionId = 'agent-1'): AgentRunConfig {
  return {
    agentDefinitionId,
    agentDefinitionName: 'Builder Agent',
    llmModelIdentifier: 'test-model',
    runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: 'workspace-1',
    autoExecuteTools: false,
    skillAccessMode: 'GLOBAL_DISCOVERY',
    isLocked: false,
  };
}

function makeAgentContext(runId: string, agentDefinitionId = 'agent-1'): AgentContext {
  const conversation: Conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-05-22T14:00:00.000Z',
    updatedAt: '2026-05-22T14:00:00.000Z',
    agentDefinitionId,
  };
  return new AgentContext(makeAgentRunConfig(agentDefinitionId), new AgentRunState(runId, conversation));
}

function makeArtifact(path: string, updatedAt: string, patch: Partial<RunFileChangeArtifact> = {}): RunFileChangeArtifact {
  return {
    id: `${agentRunId}:${path}`,
    runId: agentRunId,
    path,
    type: 'file',
    status: 'available',
    sourceTool: 'generated_output',
    sourceInvocationId: null,
    createdAt: updatedAt,
    updatedAt,
    ...patch,
  };
}

const requestHeaders = (call: Parameters<typeof fetch>[1]): Headers => call?.headers as Headers;

describe('MobileArtifacts content viewer integration', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    determineFileTypeMock.mockReset();
    determineFileTypeMock.mockResolvedValue('Text');
    createObjectURLMock.mockReset();
    createObjectURLMock.mockReturnValue('blob:mobile-artifact-preview');
    revokeObjectURLMock.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });
  });

  afterEach(() => {
    mountedWrapper?.unmount();
    mountedWrapper = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('fetches selected text and PDF artifact content through the active mobile credential', async () => {
    useWindowNodeContextStore().bindNodeContext('mobile-paired-node', 'http://desktop-private.local:29695');
    useMobileNodeSessionStore().session = storedSession();
    useMobileNodeSessionStore().initialized = true;
    useAgentContextsStore().runs.set(agentRunId, makeAgentContext(agentRunId));
    useAgentSelectionStore().selectRunWithoutShellNavigation(agentRunId, 'agent');
    useRunFileChangesStore().replaceRunProjection(agentRunId, [
      makeArtifact('reports/output.pdf', '2026-05-22T14:01:00.000Z', { type: 'pdf' }),
      makeArtifact('docs/readme.md', '2026-05-22T14:02:00.000Z'),
    ]);

    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async (input) => {
      const url = String(input);
      if (url.includes('docs%2Freadme.md')) {
        return {
          ok: true,
          status: 200,
          text: async () => '# Mobile artifact text',
        } as Response;
      }
      if (url.includes('reports%2Foutput.pdf')) {
        return {
          ok: true,
          status: 200,
          blob: async () => new Blob(['%PDF-mobile'], { type: 'application/pdf' }),
        } as Response;
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    mountedWrapper = mount(MobileArtifacts, {
      props: { context: agentRunContext },
      global: {
        plugins: [pinia],
        stubs: {
          Icon: true,
        },
      },
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://desktop-private.local:29695/rest/runs/run-mobile-credential/file-change-content?path=docs%2Freadme.md',
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(requestHeaders(fetchMock.mock.calls[0][1]).get('Authorization')).toBe('Bearer mra_secret');
    expect(mountedWrapper.get('[data-testid="file-viewer"]').text()).toContain('# Mobile artifact text');
    expect(mountedWrapper.get('[data-testid="file-viewer"]').attributes('data-file-type')).toBe('Text');

    const pdfRow = mountedWrapper.findAll('[data-testid="mobile-artifact-row"]')
      .find((row) => row.text().includes('output.pdf'));
    expect(pdfRow).toBeTruthy();
    await pdfRow!.trigger('click');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://desktop-private.local:29695/rest/runs/run-mobile-credential/file-change-content?path=reports%2Foutput.pdf',
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(requestHeaders(fetchMock.mock.calls[1][1]).get('Authorization')).toBe('Bearer mra_secret');
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(mountedWrapper.get('[data-testid="file-viewer"]').attributes('data-file-type')).toBe('PDF');
    expect(mountedWrapper.get('[data-testid="file-viewer"]').attributes('data-url')).toBe('blob:mobile-artifact-preview');
  });
});
