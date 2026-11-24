/**
 * The demo's scripted runtime (autobyteus-279, DS-003, REQ-005): what an agent does when the phone sends it a message or
 * stops it. A send is acknowledged, the run turns Running, calls one tool (reading the run's main file, or listing the
 * demo folder), streams its answer in 3-word steps of 70 ms ending with the exact closing line, then turns Idle. A Stop
 * ends the turn and the run is Idle in about 0.3 s ("Background task running" when it still has background tasks).
 *
 * Every frame is a message of the agent stream's own wire format (`/ws/agent`: a segment's id is `id`), validated by the
 * phone's own boundary check (`validateCanonicalBoundary`), numbered in the agent's run sequence and published on the
 * world's change bus; a Team or Org stream maps it to its contract. The world keeps the turn in the agent's conversation
 * and Activity, as a node keeps them.
 */
import { agentPresentationPayloadSchemas } from '@autobyteus/agent-presentation-contracts';
import { TIMED_MESSAGE_TYPES, validateCanonicalBoundary } from '~/services/agentStreaming/protocol/messageParser';
import { backgroundTasksRunningOf } from './world/backgroundTasks';
import { replyFor, words } from './world/content/replies';
import { activitiesOf, conversationOf } from './world/conversations';
import type { DemoAgent, DemoRun, DemoStatus, DemoWorld } from './world/DemoWorld';

type PresentationType = keyof typeof agentPresentationPayloadSchemas;

/**
 * One frame of an agent: numbered in the agent's own stream (`sequence`, `/ws/agent`) and in its run's one change sequence
 * (`changeSequence`, the Team and Org streams).
 */
export type DemoAgentFrame = { type: PresentationType; payload: Record<string, unknown>; sequence: number; changeSequence: number };

/** A member's input, as a Team or Org run publishes it (`MEMBER_INPUT_MESSAGE`), numbered in the run's change sequence. */
export type DemoMemberInput = {
  changeSequence: number; recipientAgentRunId: string; messageId: string; dedupeKey: string; content: string; receivedAt: string;
  contextFilePaths: Array<{ path: string; type: string | null }>;
};

export type DemoSendPayload = {
  message_id?: string;
  dedupe_key?: string;
  content?: string;
  context_file_paths?: Array<string | { path?: string | null }>;
};

export type DemoSendAck = {
  command_type: 'SEND_MESSAGE';
  /** The demo node's time of the ack (autobyteus-628 D-3). */
  occurred_at: string;
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
  private readonly runSequences = new WeakMap<DemoRun, { changeSequence: number; liveSequenceId: string }>();

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

  /** A run's one change sequence (a Team's or Org's view counts in it) and the sequence's id. */
  runSequenceOf(run: DemoRun): { changeSequence: number; liveSequenceId: string } {
    let sequence = this.runSequences.get(run);
    if (!sequence) {
      sequence = { changeSequence: 0, liveSequenceId: nextId(`demo-root-seq-${run.runId}`) };
      this.runSequences.set(run, sequence);
    }
    return sequence;
  }

  private nextChange(run: DemoRun): number {
    const sequence = this.runSequenceOf(run);
    sequence.changeSequence += 1;
    return sequence.changeSequence;
  }

  /** The agent's input state: the demo's inputs are taken at once, so none waits. */
  inputState(agent: DemoAgent, entries: unknown[] = []) {
    const stream = this.streamOf(agent);
    return { run_instance_id: stream.runInstanceId, revision: stream.inputRevision, entries, recoverableBlock: null };
  }

  private publish(agent: DemoAgent, type: PresentationType, untimed: Record<string, unknown>): void {
    // The demo plays the node: it records each timed event's time, as a node does (autobyteus-628 D-3).
    const payload = TIMED_MESSAGE_TYPES.has(type) ? { ...untimed, occurred_at: new Date().toISOString() } : untimed;
    validateCanonicalBoundary(type, payload);
    // The frames outside the boundary check share the presentation contract's wire shape (a segment's differs: its id).
    if (!type.startsWith('SEGMENT_')) (agentPresentationPayloadSchemas[type] as { parse(value: unknown): unknown }).parse(payload);
    const stream = this.streamOf(agent);
    stream.sequence += 1;
    this.world.emit({ type: 'agent_frame', agent, frame: { type, payload, sequence: stream.sequence, changeSequence: this.nextChange(agent.run) } });
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

  /**
   * A message to a stopped run starts it (the node restores it): its agents are Idle in a new run instance, then its
   * views switch to live (`run_lifecycle`) before the turn's frames.
   */
  private start(run: DemoRun): void {
    for (const agent of run.agents) {
      const stream = this.streamOf(agent);
      stream.liveSequenceId = nextId(`demo-seq-${agent.agentRunId}`);
      stream.runInstanceId = nextId(`demo-instance-${agent.agentRunId}`);
      this.world.setStatus(agent, 'idle');
    }
    this.world.emit({ type: 'run_lifecycle', run, live: true });
  }

  /** A message to the agent (`SEND_MESSAGE`): accepted at once (a stopped run starts first); the scripted turn follows. */
  send(agent: DemoAgent, payload: DemoSendPayload): DemoSendAck {
    if (this.world.statusOf(agent.run) === 'offline') this.start(agent.run);
    const messageId = payload.message_id || nextId('demo-message');
    const dedupeKey = payload.dedupe_key || messageId;
    const content = payload.content ?? '';
    const attached = (payload.context_file_paths ?? []).map((item) => (typeof item === 'string' ? item : String(item?.path ?? ''))).filter(Boolean);
    // An uploaded file is named as the user named it (its locator holds the node's stored name).
    const names = attached.map((path) => this.world.contextFiles.displayNameOf(path) ?? path.split('/').pop() ?? path);
    const stream = this.streamOf(agent);
    const turnId = nextId('demo-turn');
    const sentAt = Date.now();

    if (agent.memberName) {
      this.world.emit({ type: 'member_input', agent, input: {
        changeSequence: this.nextChange(agent.run), recipientAgentRunId: agent.agentRunId, messageId, dedupeKey, content,
        receivedAt: new Date(sentAt).toISOString(), contextFilePaths: attached.map((path) => ({ path, type: null })),
      } });
    }
    conversationOf(this.world, agent).push({
      kind: 'message', role: 'user', content, messageId, dedupeKey, ts: Math.floor(sentAt / 1000),
      ...(attached.length ? { fileAttachments: attached.map((path, index) => ({ uri: path, fileType: 'Text', fileName: names[index]! })) } : {}),
    });
    stream.inputRevision += 1;
    this.publish(agent, 'AGENT_INPUT_STATE', this.inputState(agent, [{
      sequence: stream.inputRevision, message_id: messageId, dedupe_key: dedupeKey, turn_id: null, state: 'queued', content, sender_type: 'user',
      file_attachments: attached.map((path, index) => ({ uri: path, file_type: 'Text', file_name: names[index]! })),
      accepted_at: new Date(sentAt).toISOString(),
    }]));
    this.play(agent, turnId, content, names);
    return { command_type: 'SEND_MESSAGE', run_id: agent.agentRunId, message_id: messageId, dedupe_key: dedupeKey, state: 'accepted', accepted: true, duplicate: false, occurred_at: new Date(sentAt).toISOString() };
  }

  /** The scripted turn; `attached` holds the names of the files the message carries. */
  private play(agent: DemoAgent, turnId: string, content: string, attached: string[]): void {
    const stream = this.streamOf(agent);
    const reply = replyFor({ showcase: agent.run === this.world.showcaseRun, member: agent.memberName !== null }, content, attached);
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
      [700, () => this.publish(agent, 'SEGMENT_START', { id: toolId, turn_id: turnId, segment_type: 'tool_call', metadata: { tool_name: reply.tool, arguments: reply.args } })],
      [200, () => this.publish(agent, 'SEGMENT_END', { id: toolId, turn_id: turnId, metadata: { tool_name: reply.tool, arguments: reply.args }, interrupted: false, reason: null, failed: false, error: null })],
      [100, () => this.publish(agent, 'TOOL_EXECUTION_STARTED', { invocation_id: toolId, tool_name: reply.tool, turn_id: turnId, arguments: reply.args })],
      [900, () => {
        this.publish(agent, 'TOOL_EXECUTION_SUCCEEDED', { invocation_id: toolId, tool_name: reply.tool, turn_id: turnId, arguments: reply.args, result: reply.result });
        const ts = Math.floor(Date.now() / 1000);
        conversationOf(this.world, agent).push({ kind: 'tool_call', invocationId: toolId, toolName: reply.tool, toolArgs: reply.args, toolResult: reply.result, ts });
        activitiesOf(this.world, agent).push({ kind: 'tool', invocationId: toolId, toolName: reply.tool, type: 'tool_call', status: 'success',
          arguments: reply.args, logs: [], result: reply.result, error: null, ts });
      }],
      [300, () => this.publish(agent, 'SEGMENT_START', { id: textId, turn_id: turnId, segment_type: 'text', metadata: null })],
      ...words(reply.text).map((delta): [number, () => void] => [70, () => this.publish(agent, 'SEGMENT_CONTENT', { id: textId, turn_id: turnId, segment_type: 'text', delta })]),
      [80, () => {
        this.publish(agent, 'SEGMENT_END', { id: textId, turn_id: turnId, metadata: null, interrupted: false, reason: null, failed: false, error: null });
        conversationOf(this.world, agent).push({ kind: 'message', role: 'assistant', content: reply.text, ts: Math.floor(Date.now() / 1000) });
      }],
      [120, () => { this.publish(agent, 'TURN_COMPLETED', { turn_id: turnId, reason: null }); stream.turnId = null; }],
      [80, () => this.setStatus(agent, 'idle')],
    ];
    let at = 0;
    for (const [delay, step] of steps) { at += delay; this.later(agent, at, step); }
  }

  /**
   * Terminate (the node's terminate): the runs its agents delegated first, then its own agents end their turns and go
   * offline. A later message to it starts it again, as on the node.
   */
  terminate(run: DemoRun): void {
    for (const agent of run.agents) for (const child of agent.delegated) this.terminate(child);
    for (const agent of run.agents) {
      const stream = this.streamOf(agent);
      for (const timer of stream.timers) clearTimeout(timer);
      stream.timers.clear();
      if (stream.turnId) this.publish(agent, 'TURN_INTERRUPTED', { turn_id: stream.turnId, reason: null });
      stream.turnId = null;
      if (agent.status !== 'offline') this.setStatus(agent, 'offline');
    }
    run.terminatedAt = new Date().toISOString();
    this.world.emit({ type: 'run_lifecycle', run, live: false });
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
