/**
 * The demo's scripted runtime (autobyteus-279, DS-003, REQ-005): what an agent does when the phone sends it a message or
 * stops it. A send is acknowledged, the run turns Running, calls one tool (reading the run's main file, or listing the
 * demo folder), streams its answer in 3-word steps of 70 ms ending with the exact closing line, then turns Idle. A Stop
 * ends the turn and the run is Idle in about 0.3 s ("Background task running" when it still has background tasks).
 *
 * Every frame is a presentation message of the node's own protocol, validated by its contract schema, numbered in the
 * agent's run sequence and published on the world's change bus; the world keeps the turn in the agent's conversation and
 * Activity, as a node keeps them.
 */
import { agentPresentationPayloadSchemas } from '@autobyteus/agent-presentation-contracts';
import { backgroundTasksRunningOf } from './world/backgroundTasks';
import { replyFor, words } from './world/content/replies';
import { activitiesOf, conversationOf } from './world/conversations';
import type { DemoAgent, DemoStatus, DemoWorld } from './world/DemoWorld';

type PresentationType = keyof typeof agentPresentationPayloadSchemas;

/** One numbered frame of an agent's own stream. */
export type DemoAgentFrame = { type: PresentationType; payload: Record<string, unknown>; sequence: number };

export type DemoSendPayload = {
  message_id?: string;
  dedupe_key?: string;
  content?: string;
  context_file_paths?: Array<string | { path?: string | null }>;
};

export type DemoSendAck = {
  command_type: 'SEND_MESSAGE';
  run_id: string;
  message_id: string;
  dedupe_key: string;
  state: 'accepted';
  accepted: true;
  duplicate: false;
};

/** The agent's status as the node's status payload carries it. */
export const statusPayload = (world: DemoWorld, agent: DemoAgent, status: DemoStatus = agent.status) => ({
  recoverableBlock: null, status, background_tasks_running: status === 'offline' ? 0 : backgroundTasksRunningOf(world, agent),
  trigger: null, tool_name: null, error_message: null, error_details: null,
});

type AgentStream = { sequence: number; liveSequenceId: string; inputRevision: number; timers: Set<ReturnType<typeof setTimeout>>; turnId: string | null; runInstanceId: string };

let ids = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(ids += 1).toString(36)}`;

export class DemoRuntime {
  private readonly streams = new WeakMap<DemoAgent, AgentStream>();

  constructor(private readonly world: DemoWorld) {}

  /** The agent's place in its run sequence (a snapshot's base) and the sequence's id. */
  streamOf(agent: DemoAgent): AgentStream {
    let stream = this.streams.get(agent);
    if (!stream) {
      stream = { sequence: 0, liveSequenceId: nextId(`demo-seq-${agent.agentRunId}`), inputRevision: 0, timers: new Set(), turnId: null, runInstanceId: nextId(`demo-instance-${agent.agentRunId}`) };
      this.streams.set(agent, stream);
    }
    return stream;
  }

  /** The agent's input state: the demo's inputs are taken at once, so none waits. */
  inputState(agent: DemoAgent, entries: unknown[] = []) {
    const stream = this.streamOf(agent);
    return { run_instance_id: stream.runInstanceId, revision: stream.inputRevision, entries, recoverableBlock: null };
  }

  private publish(agent: DemoAgent, type: PresentationType, payload: Record<string, unknown>): void {
    const schema = agentPresentationPayloadSchemas[type] as { parse(value: unknown): unknown };
    const stream = this.streamOf(agent);
    stream.sequence += 1;
    this.world.emit({ type: 'agent_frame', agent, frame: { type, payload: schema.parse(payload) as Record<string, unknown>, sequence: stream.sequence } });
  }

  private setStatus(agent: DemoAgent, status: DemoStatus): void {
    this.world.setStatus(agent, status);
    this.publish(agent, 'AGENT_STATUS', statusPayload(this.world, agent, status));
  }

  private later(agent: DemoAgent, delayMs: number, step: () => void): void {
    const stream = this.streamOf(agent);
    const timer = setTimeout(() => { stream.timers.delete(timer); step(); }, delayMs);
    stream.timers.add(timer);
  }

  /** A message to the agent (`SEND_MESSAGE`): accepted at once; the scripted turn follows. */
  send(agent: DemoAgent, payload: DemoSendPayload): DemoSendAck {
    const messageId = payload.message_id || nextId('demo-message');
    const dedupeKey = payload.dedupe_key || messageId;
    const content = payload.content ?? '';
    const attached = (payload.context_file_paths ?? []).map((item) => (typeof item === 'string' ? item : String(item?.path ?? ''))).filter(Boolean);
    const stream = this.streamOf(agent);
    const turnId = nextId('demo-turn');
    const sentAt = Date.now();

    conversationOf(this.world, agent).push({
      kind: 'message', role: 'user', content, messageId, dedupeKey, ts: Math.floor(sentAt / 1000),
      ...(attached.length ? { fileAttachments: attached.map((path) => ({ uri: path, fileType: 'Text', fileName: path.split('/').pop() ?? path })) } : {}),
    });
    stream.inputRevision += 1;
    this.publish(agent, 'AGENT_INPUT_STATE', this.inputState(agent, [{
      sequence: stream.inputRevision, message_id: messageId, dedupe_key: dedupeKey, turn_id: null, state: 'queued', content, sender_type: 'user',
      file_attachments: attached.map((path) => ({ uri: path, file_type: 'Text', file_name: path.split('/').pop() ?? null })),
    }]));
    this.play(agent, turnId, content, attached);
    return { command_type: 'SEND_MESSAGE', run_id: agent.agentRunId, message_id: messageId, dedupe_key: dedupeKey, state: 'accepted', accepted: true, duplicate: false };
  }

  private play(agent: DemoAgent, turnId: string, content: string, attached: string[]): void {
    const stream = this.streamOf(agent);
    const reply = replyFor(agent.run === this.world.showcaseRun, content, attached);
    const toolId = `${turnId}-tool`;
    const textId = `${turnId}-text`;
    const steps: Array<[number, () => void]> = [
      [200, () => this.setStatus(agent, 'running')],
      [100, () => {
        stream.turnId = turnId;
        this.publish(agent, 'TURN_STARTED', { turn_id: turnId });
        stream.inputRevision += 1;
        this.publish(agent, 'AGENT_INPUT_STATE', this.inputState(agent));
      }],
      [700, () => this.publish(agent, 'SEGMENT_START', { segment_id: toolId, turn_id: turnId, segment_type: 'tool_call', metadata: { tool_name: reply.tool, arguments: reply.args } })],
      [200, () => this.publish(agent, 'SEGMENT_END', { segment_id: toolId, turn_id: turnId, metadata: { tool_name: reply.tool, arguments: reply.args }, interrupted: false, reason: null, failed: false, error: null })],
      [100, () => this.publish(agent, 'TOOL_EXECUTION_STARTED', { invocation_id: toolId, tool_name: reply.tool, turn_id: turnId, arguments: reply.args })],
      [900, () => {
        this.publish(agent, 'TOOL_EXECUTION_SUCCEEDED', { invocation_id: toolId, tool_name: reply.tool, turn_id: turnId, arguments: reply.args, result: reply.result });
        const ts = Math.floor(Date.now() / 1000);
        conversationOf(this.world, agent).push({ kind: 'tool_call', invocationId: toolId, toolName: reply.tool, toolArgs: reply.args, toolResult: reply.result, ts });
        activitiesOf(this.world, agent).push({ kind: 'tool', invocationId: toolId, toolName: reply.tool, type: 'tool_call', status: 'success',
          contextText: String(Object.values(reply.args)[0] ?? ''), arguments: reply.args, logs: [], result: reply.result, error: null, ts });
      }],
      [300, () => this.publish(agent, 'SEGMENT_START', { segment_id: textId, turn_id: turnId, segment_type: 'text', metadata: null })],
      ...words(reply.text).map((delta): [number, () => void] => [70, () => this.publish(agent, 'SEGMENT_CONTENT', { segment_id: textId, turn_id: turnId, segment_type: 'text', delta })]),
      [80, () => {
        this.publish(agent, 'SEGMENT_END', { segment_id: textId, turn_id: turnId, metadata: null, interrupted: false, reason: null, failed: false, error: null });
        conversationOf(this.world, agent).push({ kind: 'message', role: 'assistant', content: reply.text, ts: Math.floor(Date.now() / 1000) });
      }],
      [120, () => { this.publish(agent, 'TURN_COMPLETED', { turn_id: turnId, reason: null }); stream.turnId = null; }],
      [80, () => this.setStatus(agent, 'idle')],
    ];
    let at = 0;
    for (const [delay, step] of steps) { at += delay; this.later(agent, at, step); }
  }

  /** Stop (`INTERRUPT_GENERATION`): the turn ends and the run is Idle in about 0.3 s. */
  stop(agent: DemoAgent): void {
    const stream = this.streamOf(agent);
    for (const timer of stream.timers) clearTimeout(timer);
    stream.timers.clear();
    const turnId = stream.turnId;
    stream.turnId = null;
    setTimeout(() => {
      if (turnId) this.publish(agent, 'TURN_INTERRUPTED', { turn_id: turnId, reason: null });
      this.setStatus(agent, 'idle');
    }, 300);
  }
}
