import { describe, expect, it } from 'vitest';
import { NodeWindowCommandRelay } from '../node-window-command-relay';
import type { NodeWindowCommand } from '../window-command-types';

function makeCommand(index: number): NodeWindowCommand {
  return {
    commandId: `cmd-${index}`,
    commandType: 'START_AGENT_RUN',
    issuedAtIso: new Date(1700000000000 + index).toISOString(),
    payload: {
      agentDefinitionId: `agent-${index}`,
      agentName: `Agent ${index}`,
      sourceNodeId: 'embedded-local',
      homeNodeId: 'remote-1',
    },
  };
}

describe('NodeWindowCommandRelay', () => {
  it('queues and drains commands by node', () => {
    const relay = new NodeWindowCommandRelay();

    relay.enqueue('remote-1', makeCommand(1));
    relay.enqueue('remote-1', makeCommand(2));

    expect(relay.getPendingCount('remote-1')).toBe(2);

    const drained = relay.drain('remote-1');
    expect(drained.map((item) => item.commandId)).toEqual(['cmd-1', 'cmd-2']);
    expect(relay.getPendingCount('remote-1')).toBe(0);
  });

  it('enforces maxPendingPerNode by dropping oldest commands', () => {
    const relay = new NodeWindowCommandRelay({ maxPendingPerNode: 2 });

    relay.enqueue('remote-1', makeCommand(1));
    relay.enqueue('remote-1', makeCommand(2));
    relay.enqueue('remote-1', makeCommand(3));

    const drained = relay.drain('remote-1');
    expect(drained.map((item) => item.commandId)).toEqual(['cmd-2', 'cmd-3']);
  });

  it('can clear queued commands for one node only', () => {
    const relay = new NodeWindowCommandRelay();

    relay.enqueue('remote-1', makeCommand(1));
    relay.enqueue('remote-2', makeCommand(2));

    relay.clearNode('remote-1');

    expect(relay.getPendingCount('remote-1')).toBe(0);
    expect(relay.getPendingCount('remote-2')).toBe(1);
  });
});
