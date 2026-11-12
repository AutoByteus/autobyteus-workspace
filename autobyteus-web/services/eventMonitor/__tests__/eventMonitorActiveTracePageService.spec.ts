import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchEventMonitorActiveTracePage } from '../eventMonitorActiveTracePageService';
import {
  GetAgentOrgMemberEventMonitorActiveTracePage,
  GetRunEventMonitorActiveTracePage,
  GetTeamMemberEventMonitorActiveTracePage,
} from '~/graphql/queries/runHistoryQueries';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));

const page = { events: [], beforeCursor: null, hasEarlier: false, loadedEarlierCount: 0, activeGeneration: 'g', cursorStatus: 'VALID' };

describe('fetchEventMonitorActiveTracePage', () => {
  const query = vi.fn();
  beforeEach(() => {
    query.mockReset();
    vi.mocked(getApolloClient).mockReturnValue({ query } as never);
  });

  it('a run on a peer node keeps its trace there: refused, and nothing is asked (autobyteus-461 CR-461-022)', async () => {
    await expect(fetchEventMonitorActiveTracePage(
      { kind: 'standaloneMember', hostRunId: 'host-run', memberAddress: '/research', agentRunId: 'far-run' }, 'cursor-1',
    )).rejects.toThrow("AgentRun 'far-run' runs on another node; its trace is kept there.");
    expect(query).not.toHaveBeenCalled();
  });

  it('keeps every other subject on its own query', async () => {
    query.mockImplementation(async ({ query: document }: { query: unknown }) => ({ data: {
      getRunEventMonitorActiveTracePage: document === GetRunEventMonitorActiveTracePage ? page : null,
      getTeamMemberEventMonitorActiveTracePage: document === GetTeamMemberEventMonitorActiveTracePage ? page : null,
      getAgentOrgMemberEventMonitorActiveTracePage: document === GetAgentOrgMemberEventMonitorActiveTracePage ? page : null,
    } }));
    await expect(fetchEventMonitorActiveTracePage({ kind: 'run', runId: 'host-run' }, null)).resolves.toBe(page);
    await expect(fetchEventMonitorActiveTracePage({ kind: 'teamMember', teamRunId: 't', memberAddress: '/a', agentRunId: 'a' }, null)).resolves.toBe(page);
    await expect(fetchEventMonitorActiveTracePage({ kind: 'agentOrgMember', orgRunId: 'o', memberAddress: '/b', agentRunId: 'b' }, null)).resolves.toBe(page);
    expect(query.mock.calls.map(([options]) => options.variables)).toEqual([
      { runId: 'host-run', beforeCursor: null },
      { teamRunId: 't', memberAddress: '/a', agentRunId: 'a', beforeCursor: null },
      { orgRunId: 'o', memberAddress: '/b', agentRunId: 'b', beforeCursor: null },
    ]);
  });

  it('surfaces GraphQL errors', async () => {
    query.mockResolvedValue({ data: null, errors: [{ message: "Run package 'agent:x' is unavailable." }] });
    await expect(fetchEventMonitorActiveTracePage({ kind: 'run', runId: 'x' }, null)).rejects.toThrow("Run package 'agent:x' is unavailable.");
  });
});
