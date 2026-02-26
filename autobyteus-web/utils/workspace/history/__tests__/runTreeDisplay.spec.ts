import { describe, expect, it } from 'vitest';
import {
  agentInitials,
  getAgentAvatarKey,
  getAgentNodeKey,
  workspacePathLeafName,
} from '~/utils/workspace/history/runTreeDisplay';

describe('runTreeDisplay', () => {
  it('builds stable agent node and avatar keys', () => {
    expect(getAgentNodeKey('/ws/a', 'agent-1')).toBe('/ws/a::agent-1');
    expect(getAgentAvatarKey('/ws/a', 'agent-1', ' https://avatar.png ')).toBe(
      '/ws/a::agent-1::https://avatar.png',
    );
  });

  it('returns deterministic agent initials', () => {
    expect(agentInitials('')).toBe('AG');
    expect(agentInitials('super')).toBe('S');
    expect(agentInitials('Super Agent')).toBe('SA');
    expect(agentInitials('  reflective   storyteller   bot  ')).toBe('RS');
  });

  it('renders workspace leaf name from unix and windows-style paths', () => {
    expect(workspacePathLeafName('/Users/normy/autobyteus-web')).toBe('autobyteus-web');
    expect(workspacePathLeafName('/Users/normy/autobyteus-web/')).toBe('autobyteus-web');
    expect(workspacePathLeafName('C:\\work\\autobyteus-web\\')).toBe('autobyteus-web');
  });

  it('returns original value for root-like paths', () => {
    expect(workspacePathLeafName('/')).toBe('/');
    expect(workspacePathLeafName('')).toBe('');
  });
});
