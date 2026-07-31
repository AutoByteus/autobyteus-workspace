import type { AgentRun } from "../domain/agent-run.js";
import type { ApplicationAgentToolMcpSessionScope } from "../../agent-tools/mcp/application-agent-tool-mcp-session-scope.js";
import type { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import type { ApplicationPublishedArtifactRelayService } from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import type { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";

export type AgentRunResourceReleaseResult = Readonly<{
  state: "released" | "already_released";
  runId: string;
  revokedSessionCount: number;
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
  private readonly resourcesByRunId = new Map<string, ResourceRecord>();

  constructor(private readonly dependencies: {
    sessionScope: Pick<ApplicationAgentToolMcpSessionScope, "revokeForRun">;
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
    if (!record || record.run !== expectedRun) {
      return this.alreadyReleased(runId);
    }
    this.resourcesByRunId.delete(runId);
    const errors: Error[] = [];
    let revokedSessionCount = 0;
    const detached = {
      fileChanges: false,
      artifactRelay: false,
      memoryRecorder: false,
    };

    try {
      revokedSessionCount = this.dependencies.sessionScope.revokeForRun(runId);
    } catch (error) {
      errors.push(toError(error));
    }
    this.detach(record.fileChanges, "fileChanges", detached, errors);
    this.detach(record.artifactRelay, "artifactRelay", detached, errors);
    this.detach(record.memoryRecorder, "memoryRecorder", detached, errors);

    return Object.freeze({
      state: "released" as const,
      runId,
      revokedSessionCount,
      detached: Object.freeze(detached),
      errors: Object.freeze(errors),
    });
  }

  private detach(
    disposer: (() => void) | null,
    key: keyof AgentRunResourceReleaseResult["detached"],
    detached: { fileChanges: boolean; artifactRelay: boolean; memoryRecorder: boolean },
    errors: Error[],
  ): void {
    if (!disposer) {
      return;
    }
    try {
      disposer();
      detached[key] = true;
    } catch (error) {
      errors.push(toError(error));
    }
  }

  private alreadyReleased(runId: string): AgentRunResourceReleaseResult {
    return Object.freeze({
      state: "already_released" as const,
      runId,
      revokedSessionCount: 0,
      detached: Object.freeze({
        fileChanges: false,
        artifactRelay: false,
        memoryRecorder: false,
      }),
      errors: Object.freeze([]),
    });
  }
}
