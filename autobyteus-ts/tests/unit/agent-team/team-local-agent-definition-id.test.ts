import { describe, expect, it } from 'vitest';
import {
  buildTeamLocalAgentDefinitionId,
  parseTeamLocalAgentDefinitionId,
} from '../../../src/agent-team/utils/team-local-agent-definition-id.js';

describe('team-local-agent-definition-id', () => {
  it('builds a stable local agent definition id', () => {
    expect(buildTeamLocalAgentDefinitionId('team-1', 'reviewer')).toBe('team-local:team-1:reviewer');
  });

  it('rejects empty or colon-delimited parts when building', () => {
    expect(() => buildTeamLocalAgentDefinitionId(' ', 'reviewer')).toThrow('teamId is required.');
    expect(() => buildTeamLocalAgentDefinitionId('team:1', 'reviewer')).toThrow("teamId cannot contain ':'.");
    expect(() => buildTeamLocalAgentDefinitionId('team-1', 'review:er')).toThrow("agentId cannot contain ':'.");
  });

  it('parses valid local agent ids and rejects invalid shapes', () => {
    expect(parseTeamLocalAgentDefinitionId(' team-local:team-1:reviewer ')).toEqual({
      teamId: 'team-1',
      agentId: 'reviewer',
    });
    expect(parseTeamLocalAgentDefinitionId('team-local:team-1')).toBeNull();
    expect(parseTeamLocalAgentDefinitionId('team-local:team-1:reviewer:extra')).toBeNull();
    expect(parseTeamLocalAgentDefinitionId('agent-1')).toBeNull();
  });
});
