import { describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import {
  ApplicationAgentStreamProjectionError,
  ApplicationAgentStreamPublicEventProjector,
} from "../../../src/application-agent-streaming/services/application-agent-stream-public-event-projector.js";

const projector = new ApplicationAgentStreamPublicEventProjector();
const agentEvent = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent => ({
  eventType,
  payload: { ...payload, providerSecret: "must-not-escape" },
  runId: "physical-run-secret",
  statusHint: null,
});
const agent = (type: string, data: unknown) => ({ source: "AGENT", type, data });

describe("ApplicationAgentStreamPublicEventProjector", () => {
  it.each([
    [AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" }, agent("TURN_STARTED", { turnId: "turn-1" })],
    [AgentRunEventType.TURN_COMPLETED, { turnId: "turn-1" }, agent("TURN_COMPLETED", { turnId: "turn-1" })],
    [AgentRunEventType.TURN_INTERRUPTED, { turnId: "turn-1", reason: "stop" }, agent("TURN_INTERRUPTED", { turnId: "turn-1", reason: "stop" })],
    [AgentRunEventType.SEGMENT_START, { segment_id: "segment-1", turn_id: "turn-1", kind: "reasoning", tool_name: "search" }, agent("SEGMENT_START", { segmentId: "segment-1", turnId: "turn-1", kind: "REASONING", toolName: "search" })],
    [AgentRunEventType.SEGMENT_CONTENT, { segmentId: "segment-1", turnId: "turn-1", type: "text", delta: "hello" }, agent("SEGMENT_CONTENT", { segmentId: "segment-1", turnId: "turn-1", kind: "TEXT", delta: "hello" })],
    [AgentRunEventType.SEGMENT_END, { id: "segment-1", failed: true, error: { message: "failed", stack: "secret" } }, agent("SEGMENT_END", { segmentId: "segment-1", turnId: null, kind: "OTHER", interrupted: false, failed: true, reason: null, error: { code: "SEGMENT_ERROR", message: "failed" } })],
    [AgentRunEventType.AGENT_STATUS, { status: "busy", can_interrupt: true, trigger: "input", tool_name: "search" }, agent("AGENT_STATUS", { status: "RUNNING", canInterrupt: true, trigger: "input", toolName: "search", error: null })],
    [AgentRunEventType.COMPACTION_STATUS, { status: "unexpected", selected_block_count: 2, compactedBlockCount: 1 }, agent("COMPACTION_STATUS", { phase: "UNKNOWN", turnId: null, trigger: null, selectedBlockCount: 2, compactedBlockCount: 1, error: null })],
    [AgentRunEventType.TOKEN_USAGE_UPDATED, { usage_event_id: "usage-1", observed_at: "2026-07-21T00:00:00.000Z", input_tokens: 2, outputTokens: 3, total_tokens: 5, model: "secret" }, agent("TOKEN_USAGE_UPDATED", { usageEventId: "usage-1", observedAt: "2026-07-21T00:00:00.000Z", turnId: null, inputTokens: 2, cachedInputTokens: null, outputTokens: 3, reasoningOutputTokens: null, totalTokens: 5, contextWindowUsagePercent: null })],
    [AgentRunEventType.ASSISTANT_COMPLETE, { content: "answer", reasoning: "because", rawResponse: { secret: true } }, agent("AGENT_RESPONSE_COMPLETED", { content: "answer", reasoning: "because" })],
    [AgentRunEventType.TOOL_APPROVAL_REQUESTED, { invocation_id: "invoke-1", tool_name: "search", turn_id: "turn-1", argument_summary: "query" }, agent("TOOL_APPROVAL_REQUESTED", { invocationId: "invoke-1", toolName: "search", turnId: "turn-1", argumentSummary: "query" })],
    [AgentRunEventType.TOOL_APPROVED, { invocationId: "invoke-1", reason: "allowed" }, agent("TOOL_APPROVED", { invocationId: "invoke-1", toolName: null, turnId: null, reason: "allowed" })],
    [AgentRunEventType.TOOL_DENIED, { toolCallId: "invoke-1", arguments: { summary: "unsafe" }, reason: "denied", error: { message: "blocked", code: "provider" } }, agent("TOOL_DENIED", { invocationId: "invoke-1", toolName: null, turnId: null, argumentSummary: "unsafe", reason: "denied", error: { code: "TOOL_EXECUTION_ERROR", message: "blocked" } })],
    [AgentRunEventType.TOOL_EXECUTION_STARTED, { tool_call_id: "invoke-1", arguments: { text: "query" } }, agent("TOOL_EXECUTION_STARTED", { invocationId: "invoke-1", toolName: null, turnId: null, argumentSummary: "query" })],
    [AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, { invocationId: "invoke-1", result: { content: "done", provider: "secret" } }, agent("TOOL_EXECUTION_SUCCEEDED", { invocationId: "invoke-1", toolName: null, turnId: null, resultSummary: "done" })],
    [AgentRunEventType.TOOL_EXECUTION_FAILED, { invocationId: "invoke-1", error: { message: "failed\nstack detail", stack: "secret" } }, agent("TOOL_EXECUTION_FAILED", { invocationId: "invoke-1", toolName: null, turnId: null, error: { code: "TOOL_EXECUTION_ERROR", message: "failed" } })],
    [AgentRunEventType.TOOL_EXECUTION_INTERRUPTED, { invocationId: "invoke-1", reason: "cancelled" }, agent("TOOL_EXECUTION_INTERRUPTED", { invocationId: "invoke-1", toolName: null, turnId: null, reason: "cancelled" })],
    [AgentRunEventType.TOOL_LOG, { invocationId: "invoke-1", log_entry: "progress" }, agent("TOOL_LOG", { invocationId: "invoke-1", toolName: null, turnId: null, entry: "progress" })],
    [AgentRunEventType.TODO_LIST_UPDATE, { todos: [{ id: "todo-1", content: "Finish", status: "in progress", provider: "secret" }, { bad: true }] }, agent("TODO_LIST_UPDATE", { items: [{ id: "todo-1", description: "Finish", status: "IN_PROGRESS" }] })],
    [AgentRunEventType.INTER_AGENT_MESSAGE, { message_id: "message-1", sender_member_route_key: "writer", receiverMemberRouteKey: "reviewer", content: "review", message_type: "request", created_at: "now" }, agent("INTER_AGENT_MESSAGE", { messageId: "message-1", senderMemberRouteKey: "writer", receiverMemberRouteKey: "reviewer", content: "review", messageType: "request", createdAt: "now" })],
    [AgentRunEventType.TEAM_COMMUNICATION_MESSAGE, { messageId: "message-1", sender: { kind: "MEMBER", memberRouteKey: "writer" }, receiver: { kind: "TEAM" }, content: "review", messageType: "request", createdAt: "now", referenceFiles: [{ path: "secret" }] }, agent("TEAM_COMMUNICATION_MESSAGE", { messageId: "message-1", sender: { kind: "MEMBER", memberRouteKey: "writer" }, receiver: { kind: "TEAM", memberRouteKey: null }, content: "review", messageType: "request", createdAt: "now" })],
    [AgentRunEventType.SYSTEM_TASK_NOTIFICATION, { content: "assigned", senderRunId: "secret" }, agent("SYSTEM_TASK_NOTIFICATION", { content: "assigned" })],
    [AgentRunEventType.ERROR, { error: { message: "provider failed\nsecret stack", code: "provider", stack: "secret", cause: { secret: true } } }, agent("ERROR", { error: { code: "RUNTIME_ERROR", message: "provider failed" } })],
  ])("projects %s to the exact closed public shape", (eventType, payload, expected) => {
    const actual = projector.projectAgent(agentEvent(eventType, payload));
    expect(actual).toEqual(expected);
    expect(JSON.stringify(actual)).not.toContain("secret");
  });

  it("drops artifact/file events and fails malformed required content without leaking source values", () => {
    expect(projector.projectAgent(agentEvent(AgentRunEventType.ARTIFACT_PERSISTED, { path: "/secret" }))).toBeNull();
    expect(projector.projectAgent(agentEvent(AgentRunEventType.FILE_CHANGE, { diff: "secret" }))).toBeNull();
    expect(() => projector.projectAgent(agentEvent(AgentRunEventType.SEGMENT_CONTENT, { segmentId: "segment-1" })))
      .toThrow(ApplicationAgentStreamProjectionError);
  });

  it.each([
    [
      { eventSourceType: TeamRunEventSourceType.TEAM, teamRunId: "team-secret", sourcePath: [], data: { status: "idle", error_message: null, provider: "secret" } },
      { source: "AGENT_TEAM", type: "TEAM_STATUS", data: { status: "IDLE", error: null } },
    ],
    [
      { eventSourceType: TeamRunEventSourceType.COMMUNICATION, teamRunId: "team-secret", sourcePath: [], data: { messageId: "message-1", senderAddress: { kind: "MEMBER", memberRouteKey: "writer" }, receiverAddress: { kind: "TEAM" }, content: "review", messageType: "request", createdAt: "now", referenceFiles: [{ path: "secret" }] } },
      { source: "AGENT_TEAM", type: "TEAM_COMMUNICATION_MESSAGE", data: { messageId: "message-1", sender: { kind: "MEMBER", memberRouteKey: "writer" }, receiver: { kind: "TEAM", memberRouteKey: null }, content: "review", messageType: "request", createdAt: "now" } },
    ],
    [
      { eventSourceType: TeamRunEventSourceType.MEMBER_INPUT, teamRunId: "team-secret", sourcePath: ["reviewer"], data: { messageId: "message-1", dedupeKey: "secret", teamRunId: "team-secret", recipientMemberRunId: "run-secret", recipientMemberName: "Reviewer", recipientMemberPath: ["reviewer"], recipientMemberRouteKey: "reviewer", content: "please review", inputOrigin: "user_message", receivedAt: "now", contextFilePaths: [{ path: "secret" }], senderMemberRouteKey: null, parentCommunicationMessageId: null } },
      { source: "AGENT_TEAM", type: "MEMBER_INPUT_MESSAGE", data: { messageId: "message-1", inputOrigin: "USER_MESSAGE", recipientMemberRouteKey: "reviewer", senderMemberRouteKey: null, content: "please review", receivedAt: "now", parentCommunicationMessageId: null } },
    ],
    [
      { eventSourceType: TeamRunEventSourceType.TASK_DELEGATION, teamRunId: "team-secret", sourcePath: [], data: { eventType: "TASK_DELEGATION_ACTIVATED", payload: { taskId: "task-1", taskIds: ["task-1"], taskLabel: "Research", description: "Find", status: "ACTIVE", previousStatus: null, target: { kind: "MEMBER", memberRouteKey: "researcher" }, execution: { kind: "task_agent", arguments: { secret: true } }, terminal: false, message: "go", occurredAt: "now", referenceFiles: [{ path: "secret" }] } } },
      { source: "AGENT_TEAM", type: "TASK_DELEGATION_EVENT", data: { delegationEventType: "ACTIVATED", taskId: "task-1", taskIds: ["task-1"], taskLabel: "Research", description: "Find", status: "ACTIVE", previousStatus: null, target: { kind: "MEMBER", memberRouteKey: "researcher" }, executionKind: "AGENT", terminal: false, message: "go", occurredAt: "now" } },
    ],
  ])("projects team event %# without physical identities or nested private data", (source, expected) => {
    const actual = projector.projectTeam(source as TeamRunEvent);
    expect(actual).toEqual(expected);
    expect(JSON.stringify(actual)).not.toContain("secret");
  });
});
