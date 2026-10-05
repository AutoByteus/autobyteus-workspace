import type { AgentRun } from "../domain/agent-run.js";
import type {
  AgentToolMcpRunSessionDeactivator,
} from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import type { ApplicationPublishedArtifactRelayService } from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import type { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";

export type AgentRunResourceReleaseResult = Readonly<{
  state: "released" | "already_released" | "failed";
  runId: string;
  deactivatedSessionCount: number;
  detached: Readonly<{
    fileChanges: boolean;
    artifactRelay: boolean;
    memoryRecorder: boolean;
  }>;
  errors: readonly Error[];
}>;

type ResourceRecord = {
  run: AgentRun;
  fileChanges: (() => void) | null;
  artifactRelay: (() => void) | null;
  memoryRecorder: (() => void) | null;
  mcpReleased: boolean;
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
    memoryRecorder: Pick<AgentRunMemoryRecorder, "attachToRun">;
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
      mcpReleased: false,
    };
    this.resourcesByRunId.set(run.runId, record);
    try {
      record.fileChanges = this.dependencies.runFileChangeService.attachToRun(run);
      record.artifactRelay =
        this.dependencies.publishedArtifactRelayService.attachToRun(run);
      record.memoryRecorder = this.dependencies.memoryRecorder.attachToRun(run);
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
    };

    if (!record.mcpReleased) {
      try {
        deactivatedSessionCount = this.dependencies.runSessions.deactivateForRun(runId);
        record.mcpReleased = true;
      } catch (error) { errors.push(toError(error)); }
    }
    for (const key of ["fileChanges", "artifactRelay", "memoryRecorder"] as const) {
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
    }

    return Object.freeze({
      state: errors.length ? "failed" as const : "released" as const,
      runId,
      deactivatedSessionCount,
      detached: Object.freeze(detached),
      errors: Object.freeze(errors),
    });
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
      }),
      errors: Object.freeze([]),
    });
  }
}
