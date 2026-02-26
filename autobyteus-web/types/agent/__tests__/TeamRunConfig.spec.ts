import { describe, it, expect } from 'vitest';
import { createDefaultTeamRunConfig, type TeamRunConfig } from '../TeamRunConfig';
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';

describe('TeamRunConfig', () => {
    const mockTeamDef: AgentTeamDefinition = {
        id: 'team-def-1',
        name: 'Research Team',
        description: 'A team for research',
        coordinatorMemberName: 'Coordinator',
        nodes: []
    } as any;

    it('createDefaultTeamRunConfig initializes with defaults', () => {
        const config = createDefaultTeamRunConfig(mockTeamDef);

        expect(config.teamDefinitionId).toBe('team-def-1');
        expect(config.teamDefinitionName).toBe('Research Team');
        expect(config.workspaceId).toBeNull();
        expect(config.llmModelIdentifier).toBe('');
        expect(config.autoExecuteTools).toBe(false);
        expect(config.memberOverrides).toEqual({});
        expect(config.isLocked).toBe(false);
    });
});
