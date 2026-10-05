import { describe, expect, it } from "vitest";
import {
  backgroundTaskKindSchema,
  backgroundTaskStatusSchema,
  agentPresentationMessageSchema,
} from "@autobyteus/agent-presentation-contracts";
import {
  AGENT_BACKGROUND_TASK_KINDS,
  AGENT_BACKGROUND_TASK_STATUSES,
  buildBackgroundTaskUpdatedPayload,
  parseBackgroundTaskUpdatedPayload,
  type AgentBackgroundTask,
} from "../../../../src/agent-execution/domain/agent-background-task.js";

const task: AgentBackgroundTask = {
  taskId: "4e9ce167-65fe-4808-8472-494eae8e7a80/task-2",
  kind: "shell",
  description: "Write the marker",
  command: "sleep 20; echo done > marker",
  status: "completed",
  summary: "The command exited with code 0.",
  startedAt: "2026-09-29T16:48:20.000Z",
};

describe("agent background task vocabulary", () => {
  it("keeps the server kinds and statuses identical to the shared contract enums", () => {
    expect([...AGENT_BACKGROUND_TASK_KINDS]).toEqual(backgroundTaskKindSchema.options);
    expect([...AGENT_BACKGROUND_TASK_STATUSES]).toEqual(backgroundTaskStatusSchema.options);
  });

  it("builds the snake_case wire payload that the presentation contract accepts, and parses it back", () => {
    const payload = buildBackgroundTaskUpdatedPayload(task);

    expect(payload).toEqual({
      task_id: task.taskId,
      kind: "shell",
      description: task.description,
      command: task.command,
      status: "completed",
      summary: task.summary,
      started_at: task.startedAt,
    });
    expect(agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload }).type)
      .toBe("BACKGROUND_TASK_UPDATED");
    expect(parseBackgroundTaskUpdatedPayload(payload)).toEqual(task);
  });

  it("carries an unknown command as null on the wire (REQ-001, REQ-004)", () => {
    const payload = buildBackgroundTaskUpdatedPayload({ ...task, kind: "subagent", command: null });

    expect(payload.command).toBeNull();
    expect(agentPresentationMessageSchema.parse({ type: "BACKGROUND_TASK_UPDATED", payload }).type)
      .toBe("BACKGROUND_TASK_UPDATED");
    expect(parseBackgroundTaskUpdatedPayload(payload).command).toBeNull();
  });

  it.each([
    [{ task_id: "" }, "task_id"],
    [{ kind: "local_bash" }, "kind"],
    [{ description: 3 }, "description"],
    [{ command: 5 }, "command"],
    [{ command: undefined }, "command"],
    [{ status: "pending" }, "status"],
    [{ summary: 7 }, "summary"],
    [{ started_at: undefined }, "started_at"],
  ])("rejects an invalid payload field %o", (override, field) => {
    expect(() => parseBackgroundTaskUpdatedPayload({ ...buildBackgroundTaskUpdatedPayload(task), ...override }))
      .toThrow(field);
  });
});
