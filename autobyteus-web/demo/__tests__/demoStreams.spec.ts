// Every message of every demo stream passes the client's own parser (autobyteus-279, design spec Verification Plan):
// each run's view is opened, a message is sent to its agents and the scripted turns play to the end. The streams build
// their messages with the contract schemas already; this checks them again from the client's side, and that the demo
// logs no error (it is loud about anything it cannot answer).
import {
  CollaborationStreamServerMessageSchema,
  runStatusServerMessageSchema,
} from '@autobyteus/collaboration-stream-contracts';
import { teamStreamServerMessageSchema } from '@autobyteus/team-stream-contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAgentStreamMessage } from '~/services/agentStreaming/protocol/agentStreamEnvelope';
import { DEMO_ORIGIN } from '../demoIdentity';
import { openDemoStream } from '../streams';
import { createDemoWorld, type DemoAgent, type DemoRun, type DemoWorld } from '../world/DemoWorld';
import { addressOf } from '../world/projections';

type Opened = { sent: string[]; send: (message: unknown) => void };

const open = (world: DemoWorld, path: string): Opened => {
  const sent: string[] = [];
  const session = openDemoStream(new URL(path, DEMO_ORIGIN.replace(/^http/, 'ws')), world, (data) => sent.push(String(data)), () => undefined);
  if (!session) throw new Error(`no stream for ${path}`);
  session.opened?.();
  return { sent, send: (message) => session.received(JSON.stringify(message)) };
};

let ids = 0;
const message = (content = 'How is it going?') => ({ content, message_id: `test-message-${(ids += 1)}`, dedupe_key: `test-dedupe-${ids}` });

describe('the demo streams', () => {
  let errors: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    errors = vi.spyOn(console, 'error');
  });
  afterEach(() => {
    vi.useRealTimers();
    errors.mockRestore();
  });

  const playOut = () => vi.advanceTimersByTime(60_000);

  it('/ws/agent: every agent run, opened, sent to and played out, parses as the client parses it', () => {
    const world = createDemoWorld(new Date('2026-11-19T12:00:00Z'));
    const runs = world.allRuns().filter((run) => run.kind === 'agent');
    const streams = runs.map((run) => open(world, `/ws/agent/${run.runId}`));
    streams.forEach((stream) => stream.send({ type: 'SEND_MESSAGE', payload: message() }));
    playOut();
    const all = streams.flatMap((stream) => stream.sent);
    expect(all.length).toBeGreaterThan(runs.length * 10);
    for (const raw of all) expect(() => parseAgentStreamMessage(raw)).not.toThrow();
    expect(errors).not.toHaveBeenCalled();
  });

  it('/ws/agent-team: every Team, a message to each member, parses with the Team stream contract', () => {
    const world = createDemoWorld(new Date('2026-11-19T12:00:00Z'));
    const teams = world.allRuns().filter((run) => run.kind === 'team');
    const streams = teams.map((run) => ({ run, stream: open(world, `/ws/agent-team/${run.runId}`) }));
    for (const { run, stream } of streams) {
      for (const agent of run.agents) stream.send({ type: 'SEND_MESSAGE', payload: { ...message(), context_file_paths: [], image_urls: [], agent_run_id: agent.agentRunId } });
    }
    playOut();
    for (const { stream } of streams) for (const raw of stream.sent) expect(() => teamStreamServerMessageSchema.parse(JSON.parse(raw))).not.toThrow();
    // A stopped Team started on the first message: its view switched to live in band.
    const stopped = streams.find(({ run }) => run.key === 'billing-team-1')!;
    expect(stopped.stream.sent.filter((raw) => JSON.parse(raw).type === 'TEAM_RUN_LIFECYCLE').map((raw) => JSON.parse(raw).payload.is_active)).toEqual([false, true]);
    expect(errors).not.toHaveBeenCalled();
  });

  it('/ws/agent-org and /ws/agent-collaboration parse with the collaboration contract, and commands are acknowledged', () => {
    const world = createDemoWorld(new Date('2026-11-19T12:00:00Z'));
    const org = world.allRuns().find((run) => run.kind === 'org')!;
    const stream = open(world, `/ws/agent-org/${org.runId}`);
    const root = { root_subject_kind: 'agent_org', root_run_id: org.runId };
    for (const agent of org.agents) {
      stream.send({ type: 'SEND_MESSAGE', payload: { ...root, ...message(), target_agent_run_id: agent.agentRunId, command_id: `c-${agent.agentRunId}`, context_file_paths: [], image_urls: [] } });
    }
    stream.send({ type: 'INTERRUPT_GENERATION', payload: { ...root, target_agent_run_id: org.coordinator.agentRunId, command_id: 'c-stop' } });
    const hubs = world.allRuns().filter((run: DemoRun) => run.kind === 'agent' && run.coordinator.delegated.length > 0);
    const collaboration = hubs.map((run) => open(world, `/ws/agent-collaboration/${run.runId}`));
    playOut();
    const parsed = stream.sent.map((raw) => CollaborationStreamServerMessageSchema.parse(JSON.parse(raw)));
    expect(parsed.filter((item) => item.type === 'AGENT_COMMAND_ACK')).toHaveLength(org.agents.length + 1);
    expect(parsed.some((item) => item.type === 'ROOT_EXECUTION_EVENT')).toBe(true);
    for (const raw of collaboration.flatMap((item) => item.sent)) expect(() => CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))).not.toThrow();
    expect(hubs.length).toBeGreaterThan(0);
    expect(errors).not.toHaveBeenCalled();
  });

  it('/ws/run-status: a snapshot of every run, then each change, parses with the run-status contract', () => {
    const world = createDemoWorld(new Date('2026-11-19T12:00:00Z'));
    const stream = open(world, '/ws/run-status');
    const refOf = (run: DemoRun) => ({ kind: run.kind === 'agent' ? 'agent' : run.kind === 'team' ? 'agent_team' : 'agent_org', runId: run.runId });
    stream.send({ type: 'SUBSCRIBE', payload: { runs: world.allRuns().map(refOf) } });
    const agent = world.allRuns().find((run) => run.kind === 'agent')!.coordinator as DemoAgent;
    open(world, `/ws/agent/${agent.agentRunId}`).send({ type: 'SEND_MESSAGE', payload: message() });
    playOut();
    const parsed = stream.sent.map((raw) => runStatusServerMessageSchema.parse(JSON.parse(raw)));
    expect(parsed[0]!.type).toBe('RUN_STATUS_SNAPSHOT');
    expect(parsed.some((item) => item.type === 'RUN_STATUS_CHANGED')).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it('terminate stops a run and its delegated runs, and a later message starts it again', () => {
    const world = createDemoWorld(new Date('2026-11-19T12:00:00Z'));
    const hub = world.allRuns().find((run) => run.kind === 'agent' && run.coordinator.delegated.length > 0)!;
    world.runtime.terminate(hub);
    const tree = (run: DemoRun): DemoRun[] => [run, ...run.agents.flatMap((agent) => agent.delegated.flatMap(tree))];
    expect(tree(hub).every((run) => world.statusOf(run) === 'offline')).toBe(true);
    expect(hub.terminatedAt).not.toBeNull();
    const stream = open(world, `/ws/agent/${hub.runId}`);
    stream.send({ type: 'SEND_MESSAGE', payload: message() });
    playOut();
    const types = stream.sent.map((raw) => parseAgentStreamMessage(raw).type);
    // The stopped run's snapshot, then (on the message) a live snapshot before any numbered frame.
    expect(types.filter((type) => type === 'AGENT_STREAM_SNAPSHOT')).toHaveLength(2);
    expect(world.statusOf(hub)).toBe('idle');
    expect(addressOf(hub.coordinator)).toBe('/');
  });
});
