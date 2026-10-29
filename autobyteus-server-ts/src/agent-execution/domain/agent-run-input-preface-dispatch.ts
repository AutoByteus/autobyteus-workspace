import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { platformInputPrefaceMetadata, readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { AgentRunBackendInputDispatch } from "../input/agent-run-input-contract.js";
import type { AgentRun } from "./agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "./agent-run-event.js";
import type { AgentRunInputPreface, AgentRunPreface, AgentRunPrefaceContext } from "./agent-run-input-preface.js";

const logger = console;

/**
 * Only external inputs (user, agent, task and application messages) carry a platform notice.
 * Never the compaction-recovery dispatch, a tool continuation, or a message that already is or
 * carries a platform notice.
 */
export const canCarryPreface = (isRecoveryDispatch: boolean, message: AgentInputUserMessage): boolean =>
  !isRecoveryDispatch
  && message.senderType !== SenderType.TOOL
  && readPlatformInputPreface(message.metadata) === null;

/** One provider message: the delimited notice first, then the input unchanged (sender, files, metadata). */
export const combinePreface = (
  dispatch: AgentRunBackendInputDispatch,
  preface: AgentRunPreface,
): AgentRunBackendInputDispatch => {
  const original = dispatch.message;
  const message = new AgentInputUserMessage(
    `${preface.text}\n\n${original.content}`,
    original.senderType,
    original.contextFiles,
    {
      ...original.metadata,
      ...platformInputPrefaceMetadata({
        content: preface.text,
        senderId: preface.presentation.senderId,
        originalContent: original.content,
      }),
    },
    original.recordingFileAttachments,
  );
  return dispatch.kind === "start_turn"
    ? { kind: "start_turn", message }
    : { kind: "append_to_active_turn", turnId: dispatch.turnId, message };
};

/**
 * One run's side of the `AgentRunInputPreface` port (DEC-010): takes the pending notice for a
 * dispatch and settles it once the dispatch outcome is known. A failing port never affects the
 * input.
 */
export class AgentRunInputPrefaceDispatch {
  constructor(private readonly input: Readonly<{
    run: AgentRun;
    port: AgentRunInputPreface | null;
    publishEvent: (event: AgentRunEvent) => Promise<void>;
  }>) {}

  async take(dispatchKind: AgentRunPrefaceContext["dispatchKind"]): Promise<AgentRunPreface | null> {
    if (!this.input.port) return null;
    try {
      return await this.input.port.takePreface(this.input.run, { dispatchKind });
    } catch (error) {
      logger.warn(`[AgentRun] input preface could not be taken for run '${this.input.run.runId}': ${String(error)}`);
      return null;
    }
  }

  /**
   * `forwardedTurnId` is the turn the provider accepted the dispatch into (undefined: not
   * forwarded; null: forwarded before the runtime reported its turn). A forwarded notice is
   * published as the run's system notice; any other outcome returns it to pending.
   */
  settle(preface: AgentRunPreface | null | undefined, forwardedTurnId: string | null | undefined): void {
    const { port, run } = this.input;
    if (!preface || !port) return;
    try {
      if (forwardedTurnId === undefined) {
        port.prefaceReturned(run, preface);
        return;
      }
      port.prefaceDelivered(run, preface, forwardedTurnId);
    } catch (error) {
      logger.warn(`[AgentRun] input preface settlement failed for run '${run.runId}': ${String(error)}`);
    }
    if (forwardedTurnId === undefined) return;
    // Not awaited: publication is serialized on the run's dispatch queue, which may be settling this dispatch.
    void this.input.publishEvent({
      eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
      runId: run.runId,
      payload: {
        sender_id: preface.presentation.senderId,
        content: preface.presentation.content,
        ...(forwardedTurnId ? { turn_id: forwardedTurnId } : {}),
      },
      statusHint: null,
    }).catch((error) => logger.warn(`[AgentRun] input preface notice could not be published for run '${run.runId}': ${String(error)}`));
  }
}
