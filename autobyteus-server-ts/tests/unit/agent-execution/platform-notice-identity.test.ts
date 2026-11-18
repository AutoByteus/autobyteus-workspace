/**
 * autobyteus-526 SR-002 "One identity per notice": every platform notice has one id, given where it is made, and the
 * same id travels with every copy: the message's preface metadata (`notice_id`), the stored trace (`message_id`), the
 * projection's conversation entry (`messageId`) and the published notice on the agent, collaboration and team streams
 * (`message_id`). A notice without an id (older history, R-1's two producers) carries `null`.
 */
import { describe, expect, it } from "vitest";
import { agentPresentationMessageSchema } from "@autobyteus/agent-presentation-contracts";
import { readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { buildToolListUpdateNoticeEvent, buildToolListUpdateNoticeMessage } from "../../../src/tool-list-updates/services/tool-list-update-notice-builder.js";
import { buildSkillUpdateNoticeEvent, buildSkillUpdateNoticeMessage } from "../../../src/skill-update-notices/services/skill-update-notice-builder.js";
import { buildBackgroundTaskNoticeEvent, buildBackgroundTaskNoticeMessage } from "../../../src/background-task-notices/services/background-task-notice-builder.js";
import { getAgentRunEventMessageMapper } from "../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { toMemoryTraceEvent } from "../../../src/agent-memory/services/raw-trace-record-normalizer.js";
import { buildHistoricalReplayEvents } from "../../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import { buildRunProjectionConversation } from "../../../src/run-history/projection/transformers/historical-replay-events-to-conversation.js";
import { projectAgentPresentationMessage } from "../../../src/agent-collaboration/execution/events/agent-presentation-message-projector.js";

describe("a notice's one id on every copy (autobyteus-526 SR-002)", () => {
  it.each([
    ["tool list", buildToolListUpdateNoticeMessage, buildToolListUpdateNoticeEvent],
    ["skill", buildSkillUpdateNoticeMessage, buildSkillUpdateNoticeEvent],
    ["background task", buildBackgroundTaskNoticeMessage, buildBackgroundTaskNoticeEvent],
  ] as const)("the %s notice: its message and its published notice carry the same id", (_name, message, event) => {
    expect(readPlatformInputPreface(message("notice text", "notice-1").metadata)?.noticeId).toBe("notice-1");
    expect(event("run-1", "notice text", "turn-1", "notice-1").payload).toMatchObject({ content: "notice text", message_id: "notice-1", turn_id: "turn-1" });
  });

  it("the agent stream carries the id, and null for a notice that has none", () => {
    const mapper = getAgentRunEventMessageMapper();
    const notice = (payload: Record<string, unknown>): AgentRunEvent =>
      ({ eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: "run-1", payload, statusHint: null });
    expect(mapper.map(notice({ sender_id: "system.restart_resume", content: "x", message_id: "notice-1" })).payload)
      .toMatchObject({ sender_id: "system.restart_resume", content: "x", message_id: "notice-1" });
    expect(mapper.map(notice({ sender_id: "system", content: "x" })).payload).toMatchObject({ message_id: null });
  });

  it("the stored notice trace's id reaches the projection's conversation entry; an older trace has none", () => {
    const trace = (extra: Record<string, unknown>) => ({ id: `rt-${String(extra.message_id ?? "old")}`, trace_type: "system_task_notification",
      turn_id: "turn_0002", seq: 1, ts: 10, content: "[Platform notice — application restarted]\n\n…", source_event: "input",
      sender_id: "system.restart_resume", ...extra });
    const project = (raw: Record<string, unknown>) => buildRunProjectionConversation(buildHistoricalReplayEvents([toMemoryTraceEvent(raw)]) as never);
    expect(project(trace({ message_id: "notice-1" }))).toEqual([expect.objectContaining({ kind: "system_task_notification", messageId: "notice-1" })]);
    const [older] = project(trace({}));
    expect(older).toMatchObject({ kind: "system_task_notification" });
    expect(older).not.toHaveProperty("messageId");
  });

  it("the collaboration presentation carries the id (strict contract; required, nullable)", () => {
    const message = projectAgentPresentationMessage({ eventType: "SYSTEM_TASK_NOTIFICATION",
      details: { sender: { kind: "system" }, content: "x", messageId: "notice-1" }, statusHint: null } as never);
    expect(message).toEqual({ type: "SYSTEM_TASK_NOTIFICATION", payload: { sender: { kind: "system" }, content: "x", message_id: "notice-1" } });
    expect(agentPresentationMessageSchema.parse({ type: "SYSTEM_TASK_NOTIFICATION", payload: { sender: { kind: "system" }, content: "x", message_id: null } }))
      .toMatchObject({ payload: { message_id: null } });
    expect(() => agentPresentationMessageSchema.parse({ type: "SYSTEM_TASK_NOTIFICATION", payload: { sender: { kind: "system" }, content: "x" } })).toThrow();
  });
});
