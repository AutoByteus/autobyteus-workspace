import { describe, it, expect } from 'vitest';
import { AgentContext } from '../AgentContext';
import { AgentRunState } from '../AgentRunState';
import type { AgentRunConfig } from '../AgentRunConfig';
import type { Conversation, AIMessage } from '~/types/conversation';

describe('AgentContext', () => {
    it('should initialize correctly', () => {
        const mockConfig: AgentRunConfig = {
            agentDefinitionId: 'def-1',
            agentDefinitionName: 'TestAgent',
            workspaceId: 'ws-1',
            llmModelIdentifier: 'gpt-4',
            autoExecuteTools: true,
            skillAccessMode: 'PRELOADED_ONLY',
            isLocked: false,
        };

        const mockConversation: Conversation = {
            id: 'conv-1',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            agentDefinitionId: 'def-1',
        };

        const mockState = new AgentRunState('agent-1', mockConversation);

        const context = new AgentContext(mockConfig, mockState);

        expect(context.config).toBe(mockConfig);
        expect(context.state).toBe(mockState);
        expect(context.requirement).toBe('');
        expect(context.contextFilePaths).toEqual([]);
        expect(context.isSending).toBe(false);
        expect(context.isSubscribed).toBe(false);
    });

    it('should provide access to conversation via getter', () => {
        const mockConfig: AgentRunConfig = {
            agentDefinitionId: 'def-1',
            agentDefinitionName: 'TestAgent',
            workspaceId: 'ws-1',
            llmModelIdentifier: 'gpt-4',
            autoExecuteTools: true,
            skillAccessMode: 'PRELOADED_ONLY',
            isLocked: false,
        };
        const mockConversation: Conversation = {
            id: 'conv-1',
            messages: [],
            createdAt: '',
            updatedAt: '',
            agentDefinitionId: 'def-1',
        };
        const mockState = new AgentRunState('agent-1', mockConversation);
        const context = new AgentContext(mockConfig, mockState);

        expect(context.conversation).toBe(mockConversation);
    });


});
