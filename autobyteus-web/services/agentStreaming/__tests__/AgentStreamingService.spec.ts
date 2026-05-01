import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentStreamingService } from '../AgentStreamingService';
// import { AgentContext } from '~/types/agent/AgentContext'; // We can just mock the context interface for testing

const { handleBrowserToolExecutionSucceededMock } = vi.hoisted(() => ({
    handleBrowserToolExecutionSucceededMock: vi.fn(),
}));

// Mock WebSocketClient
vi.mock('../transport', () => {
    return {
        WebSocketClient: vi.fn().mockImplementation(() => ({
            connect: vi.fn(),
            disconnect: vi.fn(),
            send: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
            state: 'disconnected',
        })),
        ConnectionState: {
            DISCONNECTED: 'disconnected',
            CONNECTING: 'connecting',
            CONNECTED: 'connected',
            DISCONNECTING: 'disconnecting',
        }
    };
});

vi.mock('../browser/browserToolExecutionSucceededHandler', () => ({
    handleBrowserToolExecutionSucceeded: handleBrowserToolExecutionSucceededMock,
}));

describe('AgentStreamingService', () => {
    let service: AgentStreamingService;
    let mockAgentContext: any;
    let mockConversation: any;

    beforeEach(() => {
        handleBrowserToolExecutionSucceededMock.mockReset();
        service = new AgentStreamingService('ws://localhost:8000/ws/agent');
        mockConversation = {
            messages: [],
            updatedAt: '',
        };
        mockAgentContext = {
            state: { 
                runId: 'test-agent-id',
                conversation: mockConversation,
                compactionStatus: null,
            },
            conversation: mockConversation,
            isSending: false,
            config: {}
        };
    });

    it('should initialize with disconnected state', () => {
        expect((service as any).wsClient).toBeDefined();
    });

    it('should connect and set agent context', async () => {
        const agentRunId = 'test-agent-id';
        service.connect(agentRunId, mockAgentContext);
        
        expect((service as any).context).toBe(mockAgentContext);
        const clientMock = (service as any).wsClient;
        expect(clientMock.connect).toHaveBeenCalledWith(expect.stringContaining(agentRunId));
    });

    it('tracks subscription state on connect and disconnect', () => {
        (service as any).attachContext(mockAgentContext);

        (service as any).handleConnect();
        expect(mockAgentContext.isSubscribed).toBe(true);

        (service as any).handleDisconnect('bye');
        expect(mockAgentContext.isSubscribed).toBe(false);
    });

    it('mirrors external user messages into the open conversation', () => {
        (service as any).dispatchMessage(
            {
                type: 'EXTERNAL_USER_MESSAGE',
                payload: {
                    content: 'hello from telegram',
                    received_at: '2026-03-09T11:22:33.000Z',
                    context_file_paths: [
                        {
                            path: 'https://example.com/voice.wav',
                            type: 'Audio',
                        },
                    ],
                },
            },
            mockAgentContext,
        );

        expect(mockConversation.messages).toHaveLength(1);
        expect(mockConversation.messages[0]).toMatchObject({
            type: 'user',
            text: 'hello from telegram',
            contextFilePaths: [
                expect.objectContaining({
                    kind: 'external_url',
                    locator: 'https://example.com/voice.wav',
                    displayName: 'voice.wav',
                    type: 'Audio',
                }),
            ],
        });
        expect(mockConversation.messages[0].timestamp.toISOString()).toBe('2026-03-09T11:22:33.000Z');
        expect(mockConversation.updatedAt).toBeTruthy();
        expect(mockAgentContext.isSending).toBe(true);
    });

    it('routes successful tool execution through the browser-owned post-success handler', () => {
        const payload = {
            invocation_id: 'call-1',
            tool_name: 'open_tab',
            result: {
                tab_id: 'browser-session-1',
                status: 'opened',
                url: 'https://example.com',
                title: 'Example',
            },
        };

        (service as any).dispatchMessage(
            {
                type: 'TOOL_EXECUTION_SUCCEEDED',
                payload,
            },
            mockAgentContext,
        );

        expect(handleBrowserToolExecutionSucceededMock).toHaveBeenCalledWith(payload);
    });

    it('routes compaction lifecycle messages through the compaction status handler', () => {
        (service as any).dispatchMessage(
            {
                type: 'COMPACTION_STATUS',
                payload: {
                    phase: 'started',
                    turn_id: 'turn-1',
                    selected_block_count: 3,
                    compacted_block_count: 2,
                    raw_trace_count: 4,
                    semantic_fact_count: 1,
                    compaction_agent_definition_id: 'memory-compactor',
                    compaction_agent_name: 'Memory Compactor',
                    compaction_runtime_kind: 'codex_app_server',
                    compaction_model_identifier: 'compaction-model',
                    compaction_run_id: 'compaction-run-1',
                    compaction_task_id: 'compaction-task-1',
                },
            },
            mockAgentContext,
        );

        expect(mockAgentContext.state.compactionStatus).toEqual({
            phase: 'started',
            message: 'Compacting memory…',
            turnId: 'turn-1',
            selectedBlockCount: 3,
            compactedBlockCount: 2,
            rawTraceCount: 4,
            semanticFactCount: 1,
            compactionAgentDefinitionId: 'memory-compactor',
            compactionAgentName: 'Memory Compactor',
            compactionRuntimeKind: 'codex_app_server',
            compactionModelIdentifier: 'compaction-model',
            compactionRunId: 'compaction-run-1',
            compactionTaskId: 'compaction-task-1',
            errorMessage: null,
        });
    });
});
