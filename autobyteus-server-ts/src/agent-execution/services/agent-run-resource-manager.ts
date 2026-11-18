import type { RunPassRevocation } from "../../credential-proxy/run-pass-revocation.js";
import type { McpServerInstanceManager } from "autobyteus-ts/tools/mcp/server-instance-manager.js";
import type { AgentRun } from "../domain/agent-run.js";
import type {
  AgentToolMcpRunSessionDeactivator,
} from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import type { WorkJournalRunUpdater } from "../../agent-work-journal/services/work-journal-run-updater.js";
import type { ApplicationPublishedArtifactRelayService } from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import type { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import type { AgentStreamSequences } from "../../services/agent-streaming/agent-stream-sequence.js";
import type { AgentRunLifecycleObserver } from "../domain/agent-run-lifecycle-observer.js";

export type AgentRunResourceReleaseResult = Readonly<{
  state: "released" | "already_released" | "failed";
  runId: string;
  deactivatedSessionCount: number;
  detached: Readonly<{
    fileChanges: boolean;
    artifactRelay: boolean;
    memoryRecorder: boolean;
    streamSequence: boolean;
    workJournal: boolean;
  }>;
  errors: readonly Error[];
}>;

type ResourceRecord = {
  run: AgentRun;
  fileChanges: (() => void) | null;
  artifactRelay: (() => void) | null;
  memoryRecorder: (() => void) | null;
  streamSequence: (() => void) | null;
  workJournal: (() => void) | null;
  /** The run's Agent Tools MCP endpoint sessions. */
  mcpSessionsReleased: boolean;
  /** The MCP server instances (stdio processes, HTTP sessions) opened for the run's tool calls. */
  mcpServersReleased: boolean;
};

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

export class AgentRunResourceAttachmentError extends AggregateError {
  constructor(
    readonly runId: string,
    errors: readonly Error[],
  ) {
    super(errors, `Failed to attach resources for agent run '${runId}'.`);
    this.name = "AgentRunResourceAttachmentError";
  }
}

export class AgentRunResourceManager {
  private readonly released = new WeakSet<AgentRun>();
  private readonly resourcesByRunId = new Map<string, ResourceRecord>();

  constructor(private readonly dependencies: {
    runSessions: AgentToolMcpRunSessionDeactivator;
    runFileChangeService: Pick<RunFileChangeService, "attachToRun">;
    publishedArtifactRelayService: Pick<ApplicationPublishedArtifactRelayService, "attachToRun">;
    memoryRecorder: Pick<AgentRunMemoryRecorder, "attachToRun" | "whenPersisted">;
    /** The process's agent stream sequences (SR-087): one per active run, from its activation to its release. */
    streamSequences: Pick<AgentStreamSequences, "attachToRun">;
    workJournalUpdater: Pick<WorkJournalRunUpdater, "attachToRun">;
    /** Closes the MCP server instances opened for a run (keyed by its runId on every runtime). */
    mcpServerInstances: Pick<McpServerInstanceManager, "cleanupMcpServerInstancesForAgent">;
    /** Ends the run's credential-proxy pass with all its grants (`null`: this host issues no passes). */
    runPasses: RunPassRevocation | null;
    /** Told after a run's attachments are released, which every removal of a run goes through. */
    lifecycleObserver?: Pick<AgentRunLifecycleObserver, "runReleased"> | null;
  }) {}

  attach(run: AgentRun): void {
    if (this.resourcesByRunId.has(run.runId)) {
      throw new Error(`Resources for agent run '${run.runId}' are already attached.`);
    }
    const record: ResourceRecord = {
      run,
      fileChanges: null,
      artifactRelay: null,
      memoryRecorder: null,
      streamSequence: null,
      workJournal: null,
      mcpSessionsReleased: false,
      mcpServersReleased: false,
    };
    this.resourcesByRunId.set(run.runId, record);
    try {
      record.fileChanges = this.dependencies.runFileChangeService.attachToRun(run);
      record.artifactRelay =
        this.dependencies.publishedArtifactRelayService.attachToRun(run);
      record.memoryRecorder = this.dependencies.memoryRecorder.attachToRun(run);
      // After the memory recorder (listeners run in subscription order): at a turn's TURN_COMPLETED the recorder has
      // enqueued the turn's last records, so the sequence's `whenPersisted` covers them (SR-087).
      record.streamSequence = this.dependencies.streamSequences.attachToRun(run, this.dependencies.memoryRecorder);
      // After the memory recorder: run listeners are called in subscription order, so the recorder
      // has enqueued a turn's last records (e.g. a segment flushed on TURN_COMPLETED) before the
      // journal updater waits for its queue.
      record.workJournal = this.dependencies.workJournalUpdater.attachToRun(run);
    } catch (error) {
      const release = this.release(run.runId, run);
      throw new AgentRunResourceAttachmentError(
        run.runId,
        [toError(error), ...release.errors],
      );
    }
  }

  release(runId: string, expectedRun: AgentRun): AgentRunResourceReleaseResult {
    const record = this.resourcesByRunId.get(runId);
    if (this.released.has(expectedRun)) return this.alreadyReleased(runId);
    if (!record || record.run !== expectedRun) {
      return Object.freeze({ ...this.alreadyReleased(runId), state: "failed" as const,
        errors: [new Error(`No exact attachment release authority for '${runId}'.`)] });
    }
    const errors: Error[] = [];
    let deactivatedSessionCount = 0;
    const detached = {
      fileChanges: false,
      artifactRelay: false,
      memoryRecorder: false,
      streamSequence: false,
      workJournal: false,
    };

    if (!record.mcpSessionsReleased) {
      try {
        deactivatedSessionCount = this.dependencies.runSessions.deactivateForRun(runId);
        record.mcpSessionsReleased = true;
      } catch (error) { errors.push(toError(error)); }
    }
    try {
      this.dependencies.runPasses?.revokeForRun(runId);
    } catch (error) { errors.push(toError(error)); }
    if (!record.mcpServersReleased) {
      record.mcpServersReleased = true;
      this.closeMcpServerInstances(runId);
    }
    for (const key of ["fileChanges", "artifactRelay", "memoryRecorder", "streamSequence", "workJournal"] as const) {
      if (!record[key]) continue;
      try {
        record[key]!();
        record[key] = null;
        detached[key] = true;
      } catch (error) { errors.push(toError(error)); }
    }
    if (!errors.length) {
      this.resourcesByRunId.delete(runId);
      this.released.add(expectedRun);
      try {
        this.dependencies.lifecycleObserver?.runReleased(expectedRun);
      } catch (error) {
        console.warn(`AgentRun lifecycle observer failed on release of '${runId}': ${String(error)}`);
      }
    }

    return Object.freeze({
      state: errors.length ? "failed" as const : "released" as const,
      runId,
      deactivatedSessionCount,
      detached: Object.freeze(detached),
      errors: Object.freeze(errors),
    });
  }

  /** Started, never awaited: closing a run's MCP servers neither delays nor fails its release. */
  private closeMcpServerInstances(runId: string): void {
    const warn = (error: unknown) =>
      console.warn(`Closing the MCP server instances of agent run '${runId}' failed: ${String(error)}`);
    try {
      void this.dependencies.mcpServerInstances.cleanupMcpServerInstancesForAgent(runId).catch(warn);
    } catch (error) {
      warn(error);
    }
  }

  private alreadyReleased(runId: string): AgentRunResourceReleaseResult {
    return Object.freeze({
      state: "already_released" as const,
      runId,
      deactivatedSessionCount: 0,
      detached: Object.freeze({
        fileChanges: false,
        artifactRelay: false,
        memoryRecorder: false,
        streamSequence: false,
        workJournal: false,
      }),
      errors: Object.freeze([]),
    });
  }
}
