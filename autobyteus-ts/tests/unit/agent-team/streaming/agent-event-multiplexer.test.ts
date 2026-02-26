import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/agent-team/streaming/agent-event-bridge.js', () => {
  return {
    AgentEventBridge: vi.fn().mockImplementation(function (this: any, ..._args: any[]) {
      this.cancel = vi.fn(async () => undefined);
    })
  };
});

vi.mock('../../../../src/agent-team/streaming/team-event-bridge.js', () => {
  return {
    TeamEventBridge: vi.fn().mockImplementation(function (this: any, ..._args: any[]) {
      this.cancel = vi.fn(async () => undefined);
    })
  };
});

import { AgentEventMultiplexer } from '../../../../src/agent-team/streaming/agent-event-multiplexer.js';
import { AgentEventBridge } from '../../../../src/agent-team/streaming/agent-event-bridge.js';
import { TeamEventBridge } from '../../../../src/agent-team/streaming/team-event-bridge.js';

const makeMultiplexer = () => {
  const notifier = {} as any;
  const loop = { loop: true };
  const worker = { getWorkerLoop: vi.fn(() => loop) } as any;
  const multiplexer = new AgentEventMultiplexer('team-mux-test', notifier, worker);
  return { multiplexer, notifier, worker, loop };
};

describe('AgentEventMultiplexer', () => {
  it('creates and stores agent event bridge', () => {
    const { multiplexer, notifier, loop } = makeMultiplexer();
    const mockAgent = {} as any;
    const agentName = 'Agent1';

    multiplexer.startBridgingAgentEvents(mockAgent, agentName);

    expect(AgentEventBridge).toHaveBeenCalledWith(mockAgent, agentName, notifier, loop);
    const bridges = (multiplexer as any).agentBridges as Map<string, any>;
    expect(bridges.has(agentName)).toBe(true);
  });

  it('creates and stores team event bridge', () => {
    const { multiplexer, notifier, loop } = makeMultiplexer();
    const mockTeam = {} as any;
    const nodeName = 'SubTeam1';

    multiplexer.startBridgingTeamEvents(mockTeam, nodeName);

    expect(TeamEventBridge).toHaveBeenCalledWith(mockTeam, nodeName, notifier, loop);
    const bridges = (multiplexer as any).teamBridges as Map<string, any>;
    expect(bridges.has(nodeName)).toBe(true);
  });

  it('shutdown cancels all bridges', async () => {
    const { multiplexer } = makeMultiplexer();
    const agentBridge = { cancel: vi.fn(async () => undefined) };
    const teamBridge = { cancel: vi.fn(async () => undefined) };

    (multiplexer as any).agentBridges = new Map([['Agent1', agentBridge]]);
    (multiplexer as any).teamBridges = new Map([['SubTeam1', teamBridge]]);

    await multiplexer.shutdown();

    expect(agentBridge.cancel).toHaveBeenCalledTimes(1);
    expect(teamBridge.cancel).toHaveBeenCalledTimes(1);
    expect((multiplexer as any).agentBridges.size).toBe(0);
    expect((multiplexer as any).teamBridges.size).toBe(0);
  });
});
