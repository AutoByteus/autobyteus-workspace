import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRun } from "../domain/agent-run.js";

export type AgentRunCandidateAbortResult =
  | Readonly<{ kind: "aborted" }>
  | Readonly<{ kind: "quarantined"; error: Error }>;

type CandidateState = "PREPARED" | "ABORTING" | "PUBLISHED" | "ABORTED" | "QUARANTINED";

/**
 * The only public handle for a privately constructed AgentRun. It deliberately
 * exposes no input, backend, context, event, or raw-run access before publication.
 */
export class AgentRunActivationCandidate {
  readonly runId: string;
  readonly runtimeKind: RuntimeKind;
  readonly platformAgentRunId: string | null;
  private state: CandidateState = "PREPARED";
  private abortTask: Promise<AgentRunCandidateAbortResult> | null = null;

  constructor(input: {
    runId: string;
    runtimeKind: RuntimeKind;
    platformAgentRunId: string | null;
    publish(): AgentRun;
    abort(): Promise<AgentRunCandidateAbortResult>;
  }) {
    this.runId = input.runId;
    this.runtimeKind = input.runtimeKind;
    this.platformAgentRunId = input.platformAgentRunId;
    this.publishCandidate = input.publish;
    this.abortCandidate = input.abort;
  }

  private readonly publishCandidate: () => AgentRun;
  private readonly abortCandidate: () => Promise<AgentRunCandidateAbortResult>;

  commitPublication(): AgentRun {
    if (this.state !== "PREPARED") {
      throw new Error(`AgentRun candidate '${this.runId}' is not publishable from '${this.state}'.`);
    }
    const run = this.publishCandidate();
    this.state = "PUBLISHED";
    return run;
  }

  abort(): Promise<AgentRunCandidateAbortResult> {
    if (this.abortTask) return this.abortTask;
    if (this.state === "ABORTED") return Promise.resolve({ kind: "aborted" });
    if (this.state === "QUARANTINED") {
      return Promise.resolve({
        kind: "quarantined",
        error: new Error(`AgentRun candidate '${this.runId}' is quarantined.`),
      });
    }
    if (this.state === "PUBLISHED") {
      return Promise.resolve({
        kind: "quarantined",
        error: new Error(`Published AgentRun '${this.runId}' cannot be candidate-aborted.`),
      });
    }
    this.state = "ABORTING";
    this.abortTask = this.abortCandidate().then((result) => {
      this.state = result.kind === "aborted" ? "ABORTED" : "QUARANTINED";
      return result;
    }, (error: unknown) => {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.state = "QUARANTINED";
      return { kind: "quarantined", error: normalized } as const;
    });
    return this.abortTask;
  }
}
