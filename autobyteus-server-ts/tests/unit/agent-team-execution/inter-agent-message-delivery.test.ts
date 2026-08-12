import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageParticipant,
} from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";

const buildParticipant = (
  overrides: Partial<InterAgentMessageParticipant> = {},
): InterAgentMessageParticipant => ({
  kind: "agent",
  displayName: "review_lead",
  agentRunId: "review-lead-run",
  executionAddress: createTeamExecutionAddress({
    rootTeamRunId: "team-parent",
    taskTeamRunIds: [],
    memberAddress: "/BuildSquad/review_lead",
  }),
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "codex-review-lead-run",
  taskId: null,
  ...overrides,
});

describe("inter-agent-message-delivery endpoint", () => {
  it("carries the exact current participant without synthesizing a legacy selector", () => {
    const participant = buildParticipant();
    const endpoint = buildDeliveryEndpointForParticipant(participant);

    expect(endpoint).toEqual({ participant });
    expect(endpoint).not.toHaveProperty("selector");
    expect(Object.isFrozen(endpoint)).toBe(true);
  });

  it("preserves task Agent and ordered task-Team execution identity unchanged", () => {
    const participant = buildParticipant({
      agentRunId: "task-agent-run",
      taskId: "task-1",
      executionAddress: createTeamExecutionAddress({
        rootTeamRunId: "team-parent",
        taskTeamRunIds: ["outer-task-team", "inner-task-team"],
        memberAddress: "/BuildSquad/review_lead",
        taskAgentRunId: "task-agent-run",
      }),
    });

    expect(buildDeliveryEndpointForParticipant(participant).participant).toBe(participant);
  });
});
