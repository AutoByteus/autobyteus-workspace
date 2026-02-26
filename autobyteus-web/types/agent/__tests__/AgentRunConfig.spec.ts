import { describe, it, expect } from 'vitest';
import type { AgentRunConfig } from '../AgentRunConfig';

describe('AgentRunConfig', () => {
  it('should have required fields for new architecture', () => {
    const config: AgentRunConfig = {
      agentDefinitionId: 'def-123',
      agentDefinitionName: 'SuperAgent',
      agentAvatarUrl: '/rest/files/images/super-agent.png',
      llmModelIdentifier: 'gpt-4-turbo',
      workspaceId: 'ws-456',
      autoExecuteTools: true,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: false,
    };

    expect(config.agentDefinitionId).toBe('def-123');
    expect(config.agentDefinitionName).toBe('SuperAgent');
    expect(config.agentAvatarUrl).toBe('/rest/files/images/super-agent.png');
    expect(config.llmModelIdentifier).toBe('gpt-4-turbo');
    expect(config.workspaceId).toBe('ws-456');
    expect(config.autoExecuteTools).toBe(true);
    expect(config.isLocked).toBe(false);
  });

  it('should allow null workspaceId', () => {
    const config: AgentRunConfig = {
      agentDefinitionId: 'def-123',
      agentDefinitionName: 'SuperAgent',
      llmModelIdentifier: 'gpt-4',
      workspaceId: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: false,
    };

    expect(config.workspaceId).toBeNull();
  });

  it('should have isLocked for config locking after first message', () => {
    const config: AgentRunConfig = {
      agentDefinitionId: 'def-123',
      agentDefinitionName: 'SuperAgent',
      llmModelIdentifier: 'gpt-4',
      workspaceId: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: true, // Locked after first message
    };

    expect(config.isLocked).toBe(true);
  });
});
