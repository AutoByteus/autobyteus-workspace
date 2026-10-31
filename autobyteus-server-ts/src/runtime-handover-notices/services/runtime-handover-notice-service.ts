import { randomUUID } from "node:crypto";
import path from "node:path";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunPreface, AgentRunPrefaceContext } from "../../agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunActivationKind } from "../../agent-execution/domain/agent-run-lifecycle-observer.js";
import type { AgentRunPlatformNoticeSource } from "../../agent-execution/domain/agent-run-platform-notices.js";
import type { RuntimeSwitch } from "../../agent-execution/domain/runtime-switch.js";
import type { RuntimeHandoverNotices } from "../../agent-execution/domain/runtime-switch-ports.js";
import { RUNTIME_HANDOVER_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { WorkJournalService } from "../../agent-work-journal/services/work-journal-service.js";
import { WORK_JOURNAL_DIR_NAME } from "../../agent-work-journal/store/work-journal-store.js";
import { buildRuntimeHandoverNoticeText } from "./runtime-handover-notice-builder.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * The hand-over notice of an agent runtime switch (autobyteus-316): remembers, per run, that its next external input carries
 * the notice, builds the text from the run's journals (made current first) and hands it over through the platform notice slot.
 * It is sent once per switch: delivery settles it, a notice that was not forwarded stays pending. The notice is built from
 * facts only; no model writes it. It knows nothing of the activation: the lifecycle only registers a switch.
 *
 * As a notice source it follows run lifetimes without acting on them: registration is explicit (`runPublished` does nothing),
 * and a released run keeps a pending hand-over, because a restored run of the same ID has still not received it.
 */
export class RuntimeHandoverNoticeService implements AgentRunPlatformNoticeSource, RuntimeHandoverNotices {
  private readonly pending = new Map<string, RuntimeSwitch>();
  private readonly inFlight = new Map<string, string>();

  constructor(private readonly deps: Readonly<{
    journals: Pick<WorkJournalService, "ensureCurrent" | "listJournalFiles">;
  }>) {}

  register(runtimeSwitch: RuntimeSwitch): void {
    this.pending.set(runtimeSwitch.runId, runtimeSwitch);
    this.inFlight.delete(runtimeSwitch.runId);
  }

  runPublished(_run: AgentRun, _activationKind: AgentRunActivationKind): void {}

  runReleased(_run: AgentRun): void {}

  async takePreface(run: AgentRun, _context: AgentRunPrefaceContext): Promise<AgentRunPreface | null> {
    const runtimeSwitch = this.pending.get(run.runId);
    if (!runtimeSwitch || this.inFlight.has(run.runId)) return null;
    const memoryDir = run.config.memoryDir;
    if (!memoryDir) return null;
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
    this.inFlight.set(run.runId, id);
    return Object.freeze({
      id,
      text,
      presentation: Object.freeze({ senderId: RUNTIME_HANDOVER_NOTICE_SENDER_ID, content: runtimeSwitch.markerText }),
    });
  }

  prefaceDelivered(run: AgentRun, preface: AgentRunPreface, _turnId: string | null): void {
    if (this.inFlight.get(run.runId) !== preface.id) return;
    this.inFlight.delete(run.runId);
    this.pending.delete(run.runId);
  }

  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void {
    if (this.inFlight.get(run.runId) === preface.id) this.inFlight.delete(run.runId);
  }
}
