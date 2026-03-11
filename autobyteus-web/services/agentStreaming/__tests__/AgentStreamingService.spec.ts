import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentStreamingService } from '../AgentStreamingService';
// import { AgentContext } from '~/types/agent/AgentContext'; // We can just mock the context interface for testing

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

describe('AgentStreamingService', () => {
    let service: AgentStreamingService;
    let mockAgentContext: any;
    let mockConversation: any;

    beforeEach(() => {
        service = new AgentStreamingService('ws://localhost:8000/ws/agent');
        mockConversation = {
            messages: [],
            updatedAt: '',
        };
        mockAgentContext = {
            state: { 
                runId: 'test-agent-id',
                conversation: mockConversation,
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
                {
                    path: 'https://example.com/voice.wav',
                    type: 'Audio',
                },
            ],
        });
        expect(mockConversation.messages[0].timestamp.toISOString()).toBe('2026-03-09T11:22:33.000Z');
        expect(mockConversation.updatedAt).toBeTruthy();
        expect(mockAgentContext.isSending).toBe(true);
    });
});
