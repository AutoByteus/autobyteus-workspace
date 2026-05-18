import { describe, expect, it } from 'vitest';
import {
  buildTeamLocalAgentDefinitionId,
  buildTeamLocalTeamDefinitionId,
  parseTeamLocalDefinitionId,
} from '../../../src/agent-team/utils/team-local-definition-id.js';

describe('team-local-definition-id', () => {
  it('builds subject-specific local agent and team ids', () => {
    expect(buildTeamLocalAgentDefinitionId('team-1', 'reviewer')).toBe('team-local-agent:team-1:reviewer');
    expect(buildTeamLocalTeamDefinitionId('team-1', 'review-cell')).toBe('team-local-team:team-1:review-cell');
  });

  it('round-trips nested owner ids with separators', () => {
    const localTeamId = buildTeamLocalTeamDefinitionId('bundle-team:pkg:app:main-team', 'drafting-cell');
    const localAgentId = buildTeamLocalAgentDefinitionId(localTeamId, 'planner');

    expect(parseTeamLocalDefinitionId(localTeamId)).toEqual({
      subject: 'agent_team',
      ownerTeamId: 'bundle-team:pkg:app:main-team',
      localDefinitionId: 'drafting-cell',
    });
    expect(parseTeamLocalDefinitionId(localAgentId)).toEqual({
      subject: 'agent',
      ownerTeamId: localTeamId,
      localDefinitionId: 'planner',
    });
  });

  it('rejects empty required build parts', () => {
    expect(() => buildTeamLocalAgentDefinitionId(' ', 'reviewer')).toThrow('ownerTeamId is required.');
    expect(() => buildTeamLocalAgentDefinitionId('team-1', ' ')).toThrow('localDefinitionId is required.');
  });

  it('rejects unsafe path-like id parts', () => {
    expect(() => buildTeamLocalAgentDefinitionId('team-1', '../reviewer')).toThrow(
      'localDefinitionId must be a safe local definition segment.',
    );
    expect(parseTeamLocalDefinitionId('team-local-agent:team-1:..%2Freviewer')).toBeNull();
    expect(parseTeamLocalDefinitionId('team-local-team:team-1:.')).toBeNull();
  });

  it('returns null for invalid or non-local ids', () => {
    expect(parseTeamLocalDefinitionId('team-local:team-1:reviewer')).toBeNull();
    expect(parseTeamLocalDefinitionId('team-local-agent:team-1')).toBeNull();
    expect(parseTeamLocalDefinitionId('team-local-agent:team-1:reviewer:extra')).toBeNull();
    expect(parseTeamLocalDefinitionId('agent-1')).toBeNull();
  });
});
