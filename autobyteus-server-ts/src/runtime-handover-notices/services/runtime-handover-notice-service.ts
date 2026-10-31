import { randomUUID } from "node:crypto";
import path from "node:path";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunPreface, AgentRunPrefaceContext } from "../../agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunActivationKind } from "../../agent-execution/domain/agent-run-lifecycle-observer.js";
import type { AgentRunPlatformNoticeSource } from "../../agent-execution/domain/agent-run-platform-notices.js";
import { RUNTIME_HANDOVER_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { PendingRuntimeHandover } from "../../agent-memory/services/runtime-handover-reader.js";
import type { WorkJournalService } from "../../agent-work-journal/services/work-journal-service.js";
import { WORK_JOURNAL_DIR_NAME } from "../../agent-work-journal/store/work-journal-store.js";
import { buildRuntimeHandoverNoticeText } from "./runtime-handover-notice-builder.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/** What the service knows of a published run: nothing is stored on disk, so a restart derives it again. */
type HandoverState =
  | Readonly<{ phase: "none" }>
  | Readonly<{ phase: "pending"; marker: PendingRuntimeHandover }>
  | Readonly<{ phase: "in_flight"; marker: PendingRuntimeHandover; prefaceId: string }>;

/**
 * The hand-over notice of an agent runtime switch (autobyteus-316), a platform notice source. Whether a hand-over is pending is
 * derived from the run's raw traces once per publication (the marker is the active file's first record and no `user` record
 * follows it) and cached until the run is published or released again, so no flag is stored and nothing is lost with a
 * process. The text is built from the run's journals (made current first) and handed over with the next external input;
 * delivery settles it, a notice that was not forwarded stays pending. Facts only; no model writes it. It knows nothing of the
 * activation: the lifecycle never calls it.
 */
export class RuntimeHandoverNoticeService implements AgentRunPlatformNoticeSource {
  private readonly states = new Map<string, HandoverState>();

  constructor(private readonly deps: Readonly<{
    journals: Pick<WorkJournalService, "ensureCurrent" | "listJournalFiles">;
    /** The pending hand-over of a run's raw traces (a bounded, read-only scan), or null. */
    readPending: (memoryDir: string) => PendingRuntimeHandover | null;
  }>) {}

  runPublished(run: AgentRun, _activationKind: AgentRunActivationKind): void {
    this.states.delete(run.runId);
  }

  runReleased(run: AgentRun): void {
    this.states.delete(run.runId);
  }

  async takePreface(run: AgentRun, _context: AgentRunPrefaceContext): Promise<AgentRunPreface | null> {
    const memoryDir = run.config.memoryDir;
    if (!memoryDir) return null;
    let state = this.states.get(run.runId);
    if (!state) {
      try {
        const marker = this.deps.readPending(memoryDir);
        state = marker ? { phase: "pending", marker } : { phase: "none" };
      } catch (error) {
        // Not cached: the next input reads again; this input goes on without the notice.
        logger.warn(`RUNTIME_HANDOVER_PENDING_READ_FAILED:${run.runId}: ${String(error)}`);
        return null;
      }
      this.states.set(run.runId, state);
    }
    if (state.phase !== "pending") return null;
    let text: string;
    try {
      // The journals are made current from the raw traces before the notice names them (REQ-003).
      await this.deps.journals.ensureCurrent({ runId: run.runId, memoryDir, runtimeKind: run.runtimeKind });
      const files = await this.deps.journals.listJournalFiles(memoryDir) ?? [];
      text = buildRuntimeHandoverNoticeText({ journalFolder: path.join(memoryDir, WORK_JOURNAL_DIR_NAME), files });
    } catch (error) {
      // The input goes on without the notice; the notice stays pending for the next input.
      logger.warn(`RUNTIME_HANDOVER_NOTICE_BUILD_FAILED:${run.runId}: ${String(error)}`);
      return null;
    }
    const id = randomUUID();
    this.states.set(run.runId, { phase: "in_flight", marker: state.marker, prefaceId: id });
    return Object.freeze({
      id,
      text,
      presentation: Object.freeze({ senderId: RUNTIME_HANDOVER_NOTICE_SENDER_ID, content: state.marker.markerText }),
    });
  }

  prefaceDelivered(run: AgentRun, preface: AgentRunPreface, _turnId: string | null): void {
    const state = this.states.get(run.runId);
    if (state?.phase === "in_flight" && state.prefaceId === preface.id) this.states.set(run.runId, { phase: "none" });
  }

  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void {
    const state = this.states.get(run.runId);
    if (state?.phase === "in_flight" && state.prefaceId === preface.id) {
      this.states.set(run.runId, { phase: "pending", marker: state.marker });
    }
  }
}
