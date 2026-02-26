import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useApplicationRunStore } from '../applicationRunStore';
import { TeamStreamingService } from '~/services/agentStreaming';

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockGetRun = vi.fn();

vi.mock('~/services/agentStreaming', () => ({
  TeamStreamingService: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    approveTool: vi.fn(),
    denyTool: vi.fn(),
  })),
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({
      teamWs: 'ws://node-b.example/ws/agent-team',
    }),
  }),
}));

vi.mock('~/stores/applicationContextStore', () => ({
  useApplicationContextStore: () => ({
    getRun: mockGetRun,
  }),
}));

describe('applicationRunStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('connects application stream using bound node team WS endpoint', () => {
    const teamContext = {
      teamId: 'team-app-1',
      isSubscribed: false,
      unsubscribe: undefined as undefined | (() => void),
    };
    mockGetRun.mockReturnValue({
      teamContext,
    });

    const store = useApplicationRunStore();
    store.connectToApplicationStream('app-run-1');

    expect(TeamStreamingService).toHaveBeenCalledWith('ws://node-b.example/ws/agent-team');
    expect(mockConnect).toHaveBeenCalledWith('team-app-1', teamContext);
    expect(teamContext.isSubscribed).toBe(true);
    expect(typeof teamContext.unsubscribe).toBe('function');

    teamContext.unsubscribe?.();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
