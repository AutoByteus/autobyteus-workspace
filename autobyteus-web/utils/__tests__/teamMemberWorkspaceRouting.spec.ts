import { describe, expect, it } from 'vitest';
import { resolveWorkspaceIdForTeamMember } from '~/utils/teamMemberWorkspaceRouting';

describe('resolveWorkspaceIdForTeamMember', () => {
  it('applies selected workspace for embedded members', () => {
    expect(resolveWorkspaceIdForTeamMember('embedded-local', 'ws-1')).toBe('ws-1');
    expect(resolveWorkspaceIdForTeamMember(undefined, 'ws-1')).toBe('ws-1');
  });

  it('returns null for remote members', () => {
    expect(resolveWorkspaceIdForTeamMember('node-docker-8001', 'ws-1')).toBeNull();
  });

  it('returns null when workspace is not selected', () => {
    expect(resolveWorkspaceIdForTeamMember('embedded-local', null)).toBeNull();
  });
});
