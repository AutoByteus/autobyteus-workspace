import { randomUUID } from "node:crypto";
import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { presentAsNoticeMetadata } from "autobyteus-ts/agent/message/present-as-notice-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { resetTimeText } from "../../agent-execution/domain/runtime-switch.js";
import { USAGE_LIMIT_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { AgentRunInputOptions } from "../../agent-execution/input/agent-run-input-contract.js";
import type { RunEvent, UsageLimitReachedData } from "../run-event-types.js";
import type { ExhaustedModel } from "./runtime-exhaustion-view.js";

type Launch = Readonly<{ runtimeKind: string; llmModelIdentifier: string }>;
type ChosenBy = "model_router" | "agent_history";

/** The run's agent, as the switch needs it (from the live run and its agent definition). */
export type SwitchSubject = Readonly<{ agentDefinitionId: string; agentName: string; agentDescription: string | null }>;

/** The chooser's answer (`FallbackChooser.choose`, read structurally). */
export type SwitchChoice =
  | Readonly<{ kind: "chosen"; launch: Launch; chosenBy: ChosenBy; reason: string; routerFailure: string | null }>
  | Readonly<{ kind: "no_fallback"; routerFailure: string | null }>;

/** The switch action's request and outcome (`RunRuntimeSwitcher.switchAgentRuntime`, read structurally). */
export type SwitchAction = Readonly<{
  from: Launch;
  launch: Launch & Readonly<{ llmConfig: null }>;
  cause: Readonly<{ kind: "usage_limit"; resetAt: string | null; chosenBy: ChosenBy; reason: string | null }>;
  notice: AgentInputUserMessage;
  postOptions: AgentRunInputOptions;
}>;
export type SwitchActionOutcome = Readonly<{ kind: "switched" }> | Readonly<{ kind: "not_quiet" }> | Readonly<{ kind: "already_switched" }>
  | Readonly<{ kind: "failed"; reason: string }>;

/** One C-2 line (`SwitchRecordLog.record`, read structurally). */
export type HandledSwitch = Readonly<{
  at: string; agentRunId: string; agentDefinitionId: string; from: Launch; to: Launch | null; chosenBy: ChosenBy | null;
  reason: string | null; routerFailure: string | null; outcome: "switched" | "no_fallback" | "switch_failed";
}>;

/** R-10: the continue message, shown to the person as a notice; the hand-over preface combines into it. */
export const CONTINUE_TEXT = "Continue the task where you left off.";

/** A notice shown in the run's conversation (published by the run, so it is recorded with its turn). */
export type ShownNotice = Readonly<{ text: string; messageId?: string; turnId?: string | null }>;

/** C-5: the Error notice when nothing is usable, each exhausted runtime with when it is usable again (its earliest reset). */
export const noFallbackText = (exhausted: readonly ExhaustedModel[]): string => {
  const earliest = new Map<string, string>();
  for (const model of exhausted) {
    const known = earliest.get(model.runtimeKind);
    if (!known || Date.parse(model.until) < Date.parse(known)) earliest.set(model.runtimeKind, model.until);
  }
  const listed = [...earliest.entries()].map(([runtimeKind, until]) => `${agentRuntimeName(runtimeKind)} until ${resetTimeText(until)}`);
  return `${listed.length ? `Usage limits reached: ${listed.join("; ")}.` : "A usage limit was reached."} No other runtime is usable.`;
};

/**
 * The switch policy (autobyteus-646 DS-003, REQ-004..008): on `usage_limit_reached`, when the setting is on, it chooses
 * where the run's agent continues (the router, then history), has the agent's root switch it (a quiet stop, the pending
 * switch with its cause, the continue message as a system input that shows no row), and records the outcome (C-2). With
 * nothing usable it shows one Error notice. Whether the run is already switched is the root's to say, from the run's own
 * state (R-12: no longer on the failed launch, or a switch pending): then nothing is recorded. A root that finds the agent
 * still in its turn is asked once more after the run's next idle status.
 */
export class UsageLimitSwitchListener {
  constructor(private readonly dependencies: Readonly<{
    /** `AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED`, read at each event. */
    enabled(): boolean;
    describeRun(agentRunId: string): Promise<SwitchSubject | null>;
    chooser: Readonly<{ choose(request: Readonly<{ agentDefinitionId: string; agentName: string; agentDescription: string | null; why: UsageLimitReachedData }>): Promise<SwitchChoice> }>;
    switcher: Readonly<{ switchAgentRuntime(agentRunId: string, action: SwitchAction): Promise<SwitchActionOutcome> }>;
    /** Resolves true at the run's next idle status, false when it does not come in time. */
    nextIdle(agentRunId: string): Promise<boolean>;
    exhaustion: Readonly<{ exhaustedNow(): readonly ExhaustedModel[] }>;
    showNotice(agentRunId: string, notice: ShownNotice): Promise<void>;
    records: Readonly<{ record(record: HandledSwitch): Promise<void> }>;
    now?: () => Date;
  }>) {}

  /** The hub's listener. */
  async handle(event: RunEvent<"usage_limit_reached">): Promise<void> {
    const agentRunId = event.agentRunId;
    if (!this.dependencies.enabled()) {
      console.info(`Usage limit switch: off; agent run '${agentRunId}' stays in Error.`);
      return;
    }
    await this.switchRun(event);
  }

  private async switchRun(event: RunEvent<"usage_limit_reached">): Promise<void> {
    const { agentRunId, data: why } = event;
    const subject = await this.dependencies.describeRun(agentRunId);
    if (!subject) {
      console.info(`Usage limit switch: agent run '${agentRunId}' is no longer live; nothing to switch.`);
      return;
    }
    const from: Launch = { runtimeKind: why.runtimeKind, llmModelIdentifier: why.llmModelIdentifier };
    const choice = await this.dependencies.chooser.choose({
      agentDefinitionId: subject.agentDefinitionId, agentName: subject.agentName, agentDescription: subject.agentDescription, why,
    });
    const base = { agentRunId, agentDefinitionId: subject.agentDefinitionId, from, routerFailure: choice.routerFailure };
    if (choice.kind === "no_fallback") {
      console.info(`Usage limit switch: no usable runtime for agent run '${agentRunId}'${choice.routerFailure ? ` (router: ${choice.routerFailure})` : ""}; it stays in Error.`);
      await this.dependencies.showNotice(agentRunId, { text: noFallbackText(this.dependencies.exhaustion.exhaustedNow()) })
        .catch((error: unknown) => console.warn(`Usage limit switch: the notice of agent run '${agentRunId}' could not be shown: ${String(error)}`));
      await this.record({ ...base, to: null, chosenBy: null, reason: null, outcome: "no_fallback" });
      return;
    }
    const action = (): SwitchAction => {
      // R-10: an ordinary SYSTEM input (the hand-over preface combines into it on the same turn), presented as a notice:
      // memory records it as one, and the run publishes it once forwarded.
      const messageId = randomUUID();
      return {
        from,
        launch: { ...choice.launch, llmConfig: null },
        cause: { kind: "usage_limit", resetAt: why.resetAt, chosenBy: choice.chosenBy, reason: choice.chosenBy === "model_router" ? choice.reason : null },
        notice: new AgentInputUserMessage(CONTINUE_TEXT, SenderType.SYSTEM, null, {
          sender_id: USAGE_LIMIT_NOTICE_SENDER_ID,
          message_id: messageId,
          [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
          ...presentAsNoticeMetadata({ senderId: USAGE_LIMIT_NOTICE_SENDER_ID }),
        }),
        postOptions: {
          lifecycleObserver: (fact) => {
            if (fact.kind !== "forwarded") return;
            void this.dependencies.showNotice(agentRunId, { text: CONTINUE_TEXT, messageId, turnId: fact.turnId ?? null }).catch(() => undefined);
          },
        },
      };
    };
    let outcome = await this.attempt(agentRunId, action());
    if (outcome.kind === "not_quiet") {
      outcome = await this.dependencies.nextIdle(agentRunId)
        ? await this.attempt(agentRunId, action())
        : { kind: "failed", reason: "its turn did not end in time" };
    }
    const target = `${choice.launch.runtimeKind} · ${choice.launch.llmModelIdentifier} (${choice.chosenBy})`;
    if (outcome.kind === "already_switched") {
      console.info(`Usage limit switch: agent run '${agentRunId}' is no longer on ${from.runtimeKind} · ${from.llmModelIdentifier}, or a switch is pending; nothing to switch.`);
      return;
    }
    if (outcome.kind === "switched") console.info(`Usage limit switch: agent run '${agentRunId}' switched to ${target}.`);
    else console.warn(`Usage limit switch: agent run '${agentRunId}' was not switched to ${target}: ${outcome.kind === "failed" ? outcome.reason : "it was not quiet"}.`);
    await this.record({ ...base, to: choice.launch, chosenBy: choice.chosenBy, reason: choice.reason,
      outcome: outcome.kind === "switched" ? "switched" : "switch_failed" });
  }

  private attempt(agentRunId: string, action: SwitchAction): Promise<SwitchActionOutcome> {
    return this.dependencies.switcher.switchAgentRuntime(agentRunId, action)
      .catch((error: unknown) => ({ kind: "failed" as const, reason: error instanceof Error ? error.message : String(error) }));
  }

  private async record(record: Omit<HandledSwitch, "at">): Promise<void> {
    await this.dependencies.records.record({ at: (this.dependencies.now?.() ?? new Date()).toISOString(), ...record })
      .catch((error: unknown) => console.warn(`Usage limit switch: the switch record of agent run '${record.agentRunId}' could not be written: ${String(error)}`));
  }
}
