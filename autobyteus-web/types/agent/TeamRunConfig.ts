import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import {
    DEFAULT_AGENT_RUNTIME_KIND,
    type AgentRuntimeKind,
    type SkillAccessMode,
} from '~/types/agent/AgentRunConfig';

export interface MemberConfigOverride {
    agentDefinitionId: string; // The ID of the agent definition for this member (for verification/display)
    llmModelIdentifier?: string;
    autoExecuteTools?: boolean;
    llmConfig?: Record<string, unknown> | null;
}

export interface TeamRunConfig {
    /** The ID of the Team Definition being run */
    teamDefinitionId: string;
    
    /** The name of the Team Definition */
    teamDefinitionName: string;
    
    /** Runtime kind used by all members in this team run */
    runtimeKind: AgentRuntimeKind;

    /** Global workspace ID (shared by all members) */
    workspaceId: string | null;
    
    /** Default LLM model for the team (can be overridden per member) */
    llmModelIdentifier: string;

    /** Global model-specific config for the team (can be overridden per member) */
    llmConfig?: Record<string, unknown> | null;
    
    /** Whether to auto-execute tools globally */
    autoExecuteTools: boolean;

    /** Which skills team members are allowed to use */
    skillAccessMode: SkillAccessMode;
    
    /** 
     * Overrides for specific members.
     * Key: Member Name in the Team Definition.
     * Value: Configuration overrides.
     */
    memberOverrides: Record<string, MemberConfigOverride>;
    
    /** If true, configuration cannot be changed (running state) */
    isLocked: boolean;
}

/**
 * Creates a default TeamRunConfig from a definition.
 */
export const createDefaultTeamRunConfig = (def: AgentTeamDefinition): TeamRunConfig => {
    return {
        teamDefinitionId: def.id,
        teamDefinitionName: def.name,
        runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
        workspaceId: null,
        llmModelIdentifier: '',
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        memberOverrides: {},
        isLocked: false,
    };
};
