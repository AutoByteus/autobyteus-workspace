/**
 * autobyteus-285 D4 (REQ-004): the restart notice is a SYSTEM input from `system.restart_resume`; a member shows it
 * as a system notice, and a run's memory records it once as a system notice, never as a user message.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { shouldSuppressSystemTaskNotification } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { buildRestartNotice, buildRestartNoticeText } from "../../../src/restart-resume/restart-notice.js";
import type { BusyRunEntry } from "../../../src/restart-resume/busy-run-record.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { CollaborationAgentPresentationEventAdapter } from "../../../src/agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";

const entry = (place: BusyRunEntry["place"]): BusyRunEntry => ({
  root: { rootSubjectKind: "agent", rootRunId: "host-1" }, agentRunId: place === "host" ? "host-1" : "copy-1", place,
  status: "running", recordedAt: "2026-11-01T09:59:58.000Z", version: "1.5.11-beta.9",
});
const restartedAt = new Date("2026-11-01T10:00:30.000Z");

describe("buildRestartNotice", () => {
  it("says what happened, that the turn was interrupted and that running tool calls have unknown results", () => {
    expect(buildRestartNoticeText({ entry: entry("host"), version: "1.5.11-beta.10", restartedAt, resumedDelegated: [] })).toBe([
      "The application restarted at 2026-11-01T10:00:30.000Z after an update to 1.5.11-beta.10.",
      "Your previous turn was interrupted.",
      "Tool calls that were running have unknown results; check before repeating any of them.",
    ].join("\n"));
  });

  it("lists the accepted delegated runs for a host or a member, never for a delegated run itself", () => {
    const names = ["Researcher (copy-1)", "copy-2"];
    expect(buildRestartNoticeText({ entry: entry("host"), version: "2", restartedAt, resumedDelegated: names }))
      .toContain("These runs you delegated were resumed too and are working: Researcher (copy-1), copy-2.");
    expect(buildRestartNoticeText({ entry: entry("member"), version: "2", restartedAt, resumedDelegated: names })).toContain("Researcher (copy-1)");
    expect(buildRestartNoticeText({ entry: entry("delegated"), version: "2", restartedAt, resumedDelegated: names })).not.toContain("delegated were resumed");
  });

  it("is a notice-only SYSTEM input with the named message and dedupe keys", () => {
    const message = buildRestartNotice({ entry: entry("delegated"), version: "2", restartedAt, resumedDelegated: [] });
    expect(message.senderType).toBe(SenderType.SYSTEM);
    expect(message.metadata).toMatchObject({
      sender_id: RESTART_RESUME_NOTICE_SENDER_ID,
      message_id: "restart-resume:2026-11-01T09:59:58.000Z:copy-1",
      dedupe_key: "agent_run_input:copy-1:restart-resume:2026-11-01T09:59:58.000Z:copy-1",
    });
    expect(shouldSuppressSystemTaskNotification(message.metadata)).toBe(true);
    expect(readPlatformInputPreface(message.metadata)).toEqual({ content: message.content, senderId: RESTART_RESUME_NOTICE_SENDER_ID, originalContent: null });
  });
});

describe("restart notice presentation for a member (N-10)", () => {
  const identity = createCollaborationMemberExecutionIdentity({ root: createTeamRootExecutionIdentity("team-1"), memberAddress: "/Worker", agentRunId: "worker-1" });
  const adapter = new CollaborationAgentPresentationEventAdapter(() => identity);

  it("shows the restart notice posted as member input as a system notice", () => {
    const notice = buildRestartNotice({ entry: entry("member"), version: "2", restartedAt, resumedDelegated: [] });
    expect(adapter.adapt(identity, { kind: "member_input", message: notice })).toMatchObject({
      kind: "publish", message: { type: "SYSTEM_TASK_NOTIFICATION", payload: { sender: { kind: "system" }, content: notice.content } },
    });
  });

  it("leaves other member input unchanged (a user message, a SYSTEM input from another sender)", () => {
    const user = new AgentInputUserMessage("Please continue.", SenderType.USER, null, { sender_id: RESTART_RESUME_NOTICE_SENDER_ID });
    const other = new AgentInputUserMessage("Routing request", SenderType.SYSTEM, null, { sender_id: "system.other" });
    expect(adapter.adapt(identity, { kind: "member_input", message: user })).toMatchObject({ kind: "publish", message: { type: "MEMBER_INPUT_MESSAGE" } });
    expect(adapter.adapt(identity, { kind: "member_input", message: other })).toMatchObject({ kind: "publish", message: { type: "MEMBER_INPUT_MESSAGE" } });
  });
});

describe("restart notice in a run's memory", () => {
  const dirs: string[] = [];
  afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

  it("records the notice once, as a system notice and never as a user message", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "restart-notice-memory-"));
    dirs.push(memoryDir);
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
    const accumulator = new RuntimeMemoryEventAccumulator({ runId: "host-1", writer, toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups() });
    const notice = buildRestartNotice({ entry: entry("host"), version: "2", restartedAt, resumedDelegated: [] });
    accumulator.recordRunEvent({ eventType: AgentRunEventType.TURN_STARTED, runId: "host-1", payload: { turn_id: "turn-9" }, statusHint: null });
    accumulator.recordForwardedUserMessage({ runId: "host-1", runtimeKind: "codex_app_server" as never, config: {} as never,
      platformAgentRunId: null, message: notice, result: { accepted: true, turnId: "turn-9" }, forwardedAt: new Date() });
    accumulator.recordRunEvent({ eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: "host-1", statusHint: null,
      payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: notice.content, turn_id: "turn-9" } });

    const traces = new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
      .getRunMemoryView(path.basename(memoryDir), { includeRawTraces: true, includeArchive: false }).rawTraces ?? [];
    expect(traces.map((trace) => [trace.traceType, trace.senderId, trace.content])).toEqual([
      ["system_task_notification", RESTART_RESUME_NOTICE_SENDER_ID, notice.content],
    ]);
  });
});
