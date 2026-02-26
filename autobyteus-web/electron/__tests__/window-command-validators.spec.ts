import { describe, expect, it } from 'vitest';
import {
  isNodeWindowCommand,
  isStartAgentRunPayload,
  isStartTeamRunPayload,
} from '../window-command-validators';

describe('window-command-validators', () => {
  it('accepts valid START_AGENT_RUN payload and command', () => {
    const payload = {
      agentDefinitionId: 'agent-1',
      agentName: 'Agent One',
      sourceNodeId: 'embedded-local',
      homeNodeId: 'remote-1',
    };
    const command = {
      commandId: 'cmd-1',
      commandType: 'START_AGENT_RUN',
      issuedAtIso: '2026-02-13T00:00:00.000Z',
      payload,
    };

    expect(isStartAgentRunPayload(payload)).toBe(true);
    expect(isNodeWindowCommand(command)).toBe(true);
  });

  it('accepts valid START_TEAM_RUN payload and command', () => {
    const payload = {
      teamDefinitionId: 'team-1',
      teamName: 'Team One',
      sourceNodeId: 'embedded-local',
      homeNodeId: 'remote-1',
    };
    const command = {
      commandId: 'cmd-2',
      commandType: 'START_TEAM_RUN',
      issuedAtIso: '2026-02-13T00:00:00.000Z',
      payload,
    };

    expect(isStartTeamRunPayload(payload)).toBe(true);
    expect(isNodeWindowCommand(command)).toBe(true);
  });

  it('rejects malformed payloads and unknown command type', () => {
    expect(isStartAgentRunPayload({
      agentDefinitionId: 'agent-1',
      agentName: '',
      sourceNodeId: 'embedded-local',
      homeNodeId: 'remote-1',
    })).toBe(false);

    expect(isStartTeamRunPayload({
      teamDefinitionId: '',
      teamName: 'Team',
      sourceNodeId: 'embedded-local',
      homeNodeId: 'remote-1',
    })).toBe(false);

    expect(isNodeWindowCommand({
      commandId: 'cmd-3',
      commandType: 'UNKNOWN',
      issuedAtIso: '2026-02-13T00:00:00.000Z',
      payload: {},
    })).toBe(false);
  });
});
