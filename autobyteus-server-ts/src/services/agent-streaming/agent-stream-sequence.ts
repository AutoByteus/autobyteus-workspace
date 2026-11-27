import { randomUUID } from "node:crypto";
import path from "node:path";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType, isAgentRunEvent, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { resolveAgentRunErrorEvidence } from "../../agent-execution/domain/agent-run-error-evidence.js";
import { RUNTIME_HANDOVER_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { AgentMemoryService } from "../../agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import { SnapshotBarrier, type SnapshotConnection } from "../../utils/snapshot-barrier.js";
import { getAgentRunEventMessageMapper, isClientRunEvent } from "./agent-run-event-message-mapper.js";
import { ServerMessageType, type ServerMessage } from "./models.js";
import { cloneStreamPayload, streamPayloadsEqual } from "./websocket-egress/stream-payload-equality.js";
import { logRuntimeEventForDebug } from "./runtime-event-debug.js";

/** One numbered frame of an agent run's own stream, with the turn it belongs to (null: no turn, e.g. a status). */
export type AgentStreamFrame = Readonly<{ sequence: number; turnId: string | null; message: ServerMessage }>;

/** What a snapshot is taken against, read in one synchronous step (SR-087, step 1). */
export type AgentStreamBase = Readonly<{
  liveSequenceId: string;
  baseSequence: number;
  /** The turns confirmed at the base: their stored entries are kept. */
  confirmed: ReadonlySet<string>;
  /** The frames of the turns not confirmed at the base, in sequence order. */
  turnFrames: readonly AgentStreamFrame[];
}>;

export type AgentStreamSequenceDeps = Readonly<{
  /** The run's turns already stored when it activated (active and archived traces), read once, synchronously. */
  storedTurnIds: () => ReadonlySet<string>;
  whenPersisted: (runId: string) => Promise<void>;
  map: (event: AgentRunEvent) => ServerMessage;
}>;

/** A turn ends completed, interrupted, or with a turn-terminal error; each closes its records. */
const endsTurn = (event: AgentRunEvent): boolean => event.eventType === AgentRunEventType.TURN_COMPLETED
  || event.eventType === AgentRunEventType.TURN_INTERRUPTED
  || resolveAgentRunErrorEvidence(event)?.kind === "TURN_TERMINAL";

/**
 * The runtime hand-over notice's live echo (CR-461-116). The switch marker it shows is written into the run's file at the
 * switch's activation, before this sequence began, so it predates the sequence and every snapshot's stored part carries
 * it, at its stored place. Numbering the echo too showed the notice twice live (base showed it once; a reload shows the
 * marker once). Other notices are recorded with their turn and come from one source as any turn does.
 */
const isStoredMarkerEcho = (event: AgentRunEvent): boolean => event.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION
  && event.payload.sender_id === RUNTIME_HANDOVER_NOTICE_SENDER_ID;

const turnOf = (event: AgentRunEvent): string | null => {
  const value = event.payload.turn_id ?? event.payload.turnId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/**
 * One agent run's own stream sequence (autobyteus-461 SR-085, SR-087; G-G1 revised), owned by the agent stream and
 * independent of the run's view stream (`RunViewStream`). It numbers every frame of the run, keeps the frames of every
 * turn not yet confirmed from that turn's first frame, and drops them when the turn is confirmed: its end seen
 * (`TURN_COMPLETED`, `TURN_INTERRUPTED` or a turn-terminal error) and its records written (`whenPersisted`). It lives while the run's `AgentRun` is active, whether or not a
 * session is connected; a new one (after a stop or a restart) has a new `liveSequenceId`.
 */
export class AgentStreamSequence {
  readonly liveSequenceId = randomUUID();
  private last = 0;
  private readonly buffers = new Map<string, AgentStreamFrame[]>();
  private readonly confirmed = new Set<string>();
  /** Every turn this sequence has numbered a frame of. */
  private readonly seen = new Set<string>();
  private readonly frames = new SnapshotBarrier<AgentStreamFrame>();
  private predating: ReadonlySet<string> | null = null;
  /** The last status numbered: an exact repeat is not numbered (the sequenced egress can suppress nothing). */
  private lastStatus: unknown = null;
  private disposed = false;

  constructor(readonly runId: string, private readonly deps: AgentStreamSequenceDeps) {}

  /**
   * Records the turns stored before this sequence: at activation, before the run takes input, so no turn of this
   * sequence can be among them. Reading the files synchronously here leaves no window for one.
   */
  recordPredating(): void {
    try {
      this.predating = this.deps.storedTurnIds();
    } catch (error) {
      console.error(`Agent stream sequence for '${this.runId}' could not read the run's stored turns: ${String(error)}`);
    }
  }

  /** Numbers one run event; called from the run's listener, subscribed after the memory recorder's. */
  accept(event: AgentRunEvent): void {
    if (this.disposed || isStoredMarkerEcho(event) || !isClientRunEvent(event)) return;
    let message: ServerMessage;
    try {
      message = this.deps.map(event);
    } catch (error) {
      console.error(`Agent stream sequence for '${this.runId}' could not map a run event: ${String(error)}`);
      return;
    }
    if (message.type === ServerMessageType.AGENT_STATUS) {
      if (this.lastStatus !== null && streamPayloadsEqual(this.lastStatus, message.payload)) return;
      this.lastStatus = cloneStreamPayload(message.payload);
    }
    const turnId = turnOf(event);
    const sequence = ++this.last;
    const frame: AgentStreamFrame = Object.freeze({ sequence, turnId, message: message.numbered(sequence) });
    logRuntimeEventForDebug(this.runId, event, frame.message);
    if (turnId) {
      this.seen.add(turnId);
      if (!this.confirmed.has(turnId)) {
        const buffer = this.buffers.get(turnId);
        if (buffer) buffer.push(frame); else this.buffers.set(turnId, [frame]);
      }
    }
    this.frames.deliver(frame);
    if (turnId && endsTurn(event)) {
      // Asked now, from the listener after the recorder's: it covers every record of this turn (CR-461-100: at every
      // turn end, so an interrupted or failed turn is read from the stored part too, once written).
      void this.deps.whenPersisted(this.runId).then(() => {
        this.confirmed.add(turnId);
        this.buffers.delete(turnId);
      }, (error: unknown) => {
        console.error(`Agent stream sequence for '${this.runId}' could not confirm turn '${turnId}': ${String(error)}`);
      });
    }
  }

  /** Step 1 of a snapshot: the base, the confirmed turns and a copy of the unconfirmed turns' frames, in one step. */
  base(): AgentStreamBase {
    return Object.freeze({
      liveSequenceId: this.liveSequenceId,
      baseSequence: this.last,
      confirmed: new Set(this.confirmed),
      turnFrames: Object.freeze([...this.buffers.values()].flat().sort((a, b) => a.sequence - b.sequence)),
    });
  }

  /**
   * Whether a stored entry of `turnId` belongs in a snapshot taken at `base`, asked after the stored read (step 2, by
   * exclusion): kept when it has no turn, when its turn predates this sequence, or when its turn was confirmed at the
   * base. A turn unconfirmed at the base is in its frames; a turn started after it follows the base.
   */
  keepsStored(base: AgentStreamBase): (turnId: string | null) => boolean {
    const predating = this.predating;
    if (!predating) throw new Error(`Agent run '${this.runId}' has no record of its stored turns.`);
    return (turnId) => turnId === null || (predating.has(turnId) && !this.seen.has(turnId)) || base.confirmed.has(turnId);
  }

  /** A snapshot connection: the base read now, `read` behind the queue, then the frames after the base. */
  async connect<TSnapshot>(read: (base: AgentStreamBase) => Promise<TSnapshot>): Promise<SnapshotConnection<TSnapshot, AgentStreamFrame>> {
    const base = this.base();
    return this.frames.open(() => read(base));
  }

  /** Every frame numbered from now on (a peer's observation of this agent: SR-088). */
  subscribe(listener: (frame: AgentStreamFrame) => void): () => void {
    return this.frames.subscribe(listener);
  }

  dispose(): void {
    this.disposed = true;
    this.buffers.clear();
  }
}

/** The run's stored turn IDs, from its memory directory: the chat's records and the archived ones. */
export const readStoredTurnIds = (memoryDir: string | null | undefined): ReadonlySet<string> => {
  const dir = memoryDir?.trim();
  if (!dir) return new Set();
  const service = new AgentMemoryService(new MemoryFileStore(path.dirname(dir), { runRootSubdir: "" }));
  const runId = path.basename(dir);
  const traces = [
    ...service.getChatRawTraceSnapshot(runId).rawTraces,
    ...(service.getRunMemoryView(runId, { includeRawTraces: true, includeArchive: true }).rawTraces ?? []),
  ];
  return new Set(traces.flatMap((trace) => (trace.turnId ? [trace.turnId] : [])));
};

/**
 * The process's agent stream sequences (G-G1 revised): one per active `AgentRun`, attached with the run's resources,
 * after its memory recorder, and released with them. The agent stream handler (and node B's peer snapshot) look a
 * run's sequence up here.
 */
export class AgentStreamSequences {
  private readonly sequences = new Map<string, AgentStreamSequence>();
  private readonly followers = new Map<string, Set<(sequence: AgentStreamSequence | null) => void>>();

  attachToRun(run: AgentRun, recorder: Pick<AgentRunMemoryRecorder, "whenPersisted">): () => void {
    const mapper = getAgentRunEventMessageMapper();
    const sequence = new AgentStreamSequence(run.runId, {
      storedTurnIds: () => readStoredTurnIds(run.config.memoryDir),
      whenPersisted: (runId) => recorder.whenPersisted(runId),
      map: (event) => mapper.map(event),
    });
    sequence.recordPredating();
    this.sequences.get(run.runId)?.dispose();
    this.sequences.set(run.runId, sequence);
    const unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (isAgentRunEvent(event)) sequence.accept(event);
    });
    this.notify(run.runId, sequence);
    return () => {
      unsubscribe();
      sequence.dispose();
      if (this.sequences.get(run.runId) !== sequence) return;
      this.sequences.delete(run.runId);
      this.notify(run.runId, null);
    };
  }

  /**
   * Follows an agent run's sequences across stops and restores (SR-088): `listener` gets its current one (or `null`),
   * then each new one as its run activates, and `null` when it stops.
   */
  follow(runId: string, listener: (sequence: AgentStreamSequence | null) => void): () => void {
    const listeners = this.followers.get(runId) ?? new Set();
    listeners.add(listener);
    this.followers.set(runId, listeners);
    listener(this.of(runId));
    return () => {
      listeners.delete(listener);
      if (!listeners.size && this.followers.get(runId) === listeners) this.followers.delete(runId);
    };
  }

  private notify(runId: string, sequence: AgentStreamSequence | null): void {
    for (const listener of [...this.followers.get(runId) ?? []]) {
      try { listener(sequence); } catch (error) { console.error(`Agent stream sequence follower of '${runId}' failed: ${String(error)}`); }
    }
  }

  of(runId: string): AgentStreamSequence | null {
    return this.sequences.get(runId) ?? null;
  }
}

let cachedAgentStreamSequences: AgentStreamSequences | null = null;

export const getAgentStreamSequences = (): AgentStreamSequences => {
  if (!cachedAgentStreamSequences) cachedAgentStreamSequences = new AgentStreamSequences();
  return cachedAgentStreamSequences;
};
