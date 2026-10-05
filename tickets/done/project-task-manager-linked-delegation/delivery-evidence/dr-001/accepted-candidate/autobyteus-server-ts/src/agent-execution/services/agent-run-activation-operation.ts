import type { AgentRunActivationRegistry, AgentRunActivationClaim } from "../runtime/agent-run-activation-registry.js";
import { AgentRunActivationCandidate } from "./agent-run-activation-candidate.js";
import type { AgentRunBackendPreparation } from "../backends/agent-run-backend-preparation.js";
import type { AgentRun } from "../domain/agent-run.js";
import type { AgentRunBackend } from "../backends/agent-run-backend.js";

export type AgentRunPrivateRelease =
  | Readonly<{ kind: "released" | "pending" | "published" }>
  | Readonly<{ kind: "quarantined"; error: Error }>;
export interface AgentRunActivationOperation {
  prepare(): Promise<AgentRunActivationCandidate>;
  cancel(): void;
  releasePrivate(): Promise<AgentRunPrivateRelease>;
  inspect(): "reserved" | "preparing" | "prepared" | "published" | "closing" | "quarantined" | "released";
}

/** Retains the exact claim and factory control, including pre-candidate failure. */
export function beginAgentRunActivation(input: {
  claim: AgentRunActivationClaim;
  registry: AgentRunActivationRegistry;
  preparation: AgentRunBackendPreparation;
  constructRun(backend: AgentRunBackend): AgentRun;
  deactivateMcp(): void;
  validateRun?(run: AgentRun): void;
  onTerminal?(): void;
}): AgentRunActivationOperation {
  const runId = input.claim.runId;
  let stage: ReturnType<AgentRunActivationOperation["inspect"]> = "reserved";
  let cancelled = false;
  let run: AgentRun | null = null;
  let preparation: Promise<AgentRunActivationCandidate> | null = null;
  let settled = false;
  let attachmentsAttempted = false;
  let mcpReleased = false;
  let releaseAttempt: Promise<AgentRunPrivateRelease> | null = null;
  const assertAccepting = () => { if (cancelled) throw new Error(`AgentRun '${runId}' activation cancelled.`); };
  const operation: AgentRunActivationOperation = Object.freeze({
    inspect: () => stage,
    cancel: () => { cancelled = true; if (stage !== "released" && stage !== "published") input.preparation.cancel(); },
    prepare: () => {
      if (preparation) return preparation;
      try { assertAccepting(); } catch (error) { return Promise.reject(error); }
      stage = "preparing";
      preparation = (async () => {
        const backend = await input.preparation.prepare();
        assertAccepting();
        run = input.constructRun(backend);
        input.validateRun?.(run);
        if (run.runId !== input.claim.runId) throw new Error("Backend returned a different exact AgentRun identity.");
        attachmentsAttempted = true;
        input.registry.markPrepared(input.claim, run);
        assertAccepting();
        stage = "prepared";
        const exactRun = run;
        return new AgentRunActivationCandidate({
          runId: run.runId, runtimeKind: run.runtimeKind, platformAgentRunId: run.getPlatformAgentRunId(),
          publish: () => {
            assertAccepting();
            const published = input.registry.publish(input.claim, exactRun);
            stage = "published";
            input.onTerminal?.();
            return published;
          },
          abort: async () => {
            const result = await operation.releasePrivate();
            return result.kind === "released" ? { kind: "aborted" } : {
              kind: "quarantined", error: result.kind === "quarantined" ? result.error : new Error(`Private release is ${result.kind}.`),
            };
          },
        });
      })().catch(async (error) => {
        operation.cancel();
        const cleanup = await operation.releasePrivate();
        if (cleanup.kind === "quarantined") throw new AggregateError([error, cleanup.error], "AgentRun preparation and cleanup failed.");
        throw error;
      }).finally(() => {
        settled = true;
        if (cancelled && stage !== "published") void operation.releasePrivate();
      });
      return preparation;
    },
    releasePrivate: () => {
      if (stage === "published") return Promise.resolve({ kind: "published" as const });
      operation.cancel();
      if (stage === "released") return Promise.resolve({ kind: "released" as const });
      if (releaseAttempt) return releaseAttempt;
      stage = "closing";
      const attempt = (async (): Promise<AgentRunPrivateRelease> => {
        const errors: unknown[] = [];
        const backendRelease = await input.preparation.release();
        if (backendRelease.kind === "failed") errors.push(backendRelease.error);
        if (run && attachmentsAttempted) {
          const released = input.registry.releasePrepared(input.claim, run);
          errors.push(...released.errors);
        } else {
          if (!mcpReleased) try { input.deactivateMcp(); mcpReleased = true; } catch (error) { errors.push(error); }
        }
        if (errors.length) {
          const error = new AggregateError(errors, `Exact AgentRun '${input.claim.runId}' cleanup failed.`);
          stage = "quarantined";
          input.registry.completeAbort(input.claim, run, { kind: "quarantined", error });
          return { kind: "quarantined", error };
        }
        if (backendRelease.kind === "pending" || (preparation && !settled)) return { kind: "pending" };
        stage = "released";
        input.registry.completeAbort(input.claim, run, { kind: "aborted" });
        input.onTerminal?.();
        run = null; preparation = null; input = null as never;
        return { kind: "released" };
      })();
      releaseAttempt = attempt;
      void attempt.finally(() => { if (releaseAttempt === attempt) releaseAttempt = null; });
      return attempt;
    },
  });
  return operation;
}
