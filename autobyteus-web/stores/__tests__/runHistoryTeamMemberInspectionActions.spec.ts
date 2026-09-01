import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectTeamMemberForStore, teamMemberInspectionIdentity } from '../runHistoryTeamMemberInspectionActions';

const mocks = vi.hoisted(() => ({ inspect: vi.fn() }));
vi.mock('~/services/runOpen/teamMemberInspectionCoordinator', () => ({
  inspectMountedTeamMember: mocks.inspect,
}));

const store = () => ({
  error: null as string | null,
  selectedRunId: 'previous-agent' as string | null,
  selectedTeamRunId: 'previous-team' as string | null,
  selectedTeamMemberAddress: '/previous' as string | null,
  teamMemberInspectionByIdentity: {},
});

describe('runHistoryTeamMemberInspectionActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes a row-scoped retry error without replacing the history panel or prior selection', async () => {
    mocks.inspect.mockResolvedValue({
      disposition: 'rejected', code: 'TEAM_MEMBER_INSPECTION_FAILED', message: 'projection unavailable',
    });
    const state = store();
    await expect(inspectTeamMemberForStore(state as any, 'team-1', 'task-run'))
      .resolves.toMatchObject({ disposition: 'rejected', message: 'projection unavailable' });
    expect(state.error).toBeNull();
    expect(state.selectedRunId).toBe('previous-agent');
    expect(state.selectedTeamRunId).toBe('previous-team');
    expect(state.selectedTeamMemberAddress).toBe('/previous');
    expect(state.teamMemberInspectionByIdentity[teamMemberInspectionIdentity('team-1', 'task-run')])
      .toEqual({ state: 'error', detail: 'projection unavailable' });
  });
});
