import { describe, expect, it } from "vitest";
import { resolveSendMessageConversationTargetAddress } from "../../../../src/services/agent-streaming/team-conversation-target-address-parser.js";

describe("resolveSendMessageConversationTargetAddress", () => {
  it("normalizes flat structural route and path selectors to one member segment", () => {
    expect(resolveSendMessageConversationTargetAddress({
      target_member_route_key: " BuildSquad/review_lead ",
    }, "team-1")).toEqual({
      ok: true,
      address: {
        segments: [{ kind: "member", memberRouteKey: "BuildSquad/review_lead" }],
      },
    });

    expect(resolveSendMessageConversationTargetAddress({
      targetMemberPath: ["BuildSquad", "qa_specialist"],
    }, "team-1")).toEqual({
      ok: true,
      address: {
        segments: [{ kind: "member", memberPath: ["BuildSquad", "qa_specialist"] }],
      },
    });
  });

  it("parses typed nested conversation target addresses", () => {
    expect(resolveSendMessageConversationTargetAddress({
      conversation_target_address: {
        parent_team_run_id: "team-1",
        segments: [
          { kind: "member", member_route_key: "BuildSquad" },
          { kind: "task_team", task_team_run_id: "task-team-run-1" },
          { kind: "member", member_route_key: "review_lead" },
          { kind: "task_agent", task_agent_run_id: "task-agent-run-2" },
        ],
      },
    }, "team-1")).toEqual({
      ok: true,
      address: {
        parentTeamRunId: "team-1",
        segments: [
          { kind: "member", memberRouteKey: "BuildSquad" },
          { kind: "task_team", taskTeamRunId: "task-team-run-1" },
          { kind: "member", memberRouteKey: "review_lead" },
          { kind: "task_agent", taskAgentRunId: "task-agent-run-2" },
        ],
      },
    });
  });

  it("rejects scalar selectors, mixed nested and flat targets, parent mismatch, and invalid segment order", () => {
    expect(resolveSendMessageConversationTargetAddress({
      target_member_name: "worker",
    }, "team-1")).toMatchObject({ ok: false });

    expect(resolveSendMessageConversationTargetAddress({
      target_member_route_key: "worker",
      conversation_target_address: {
        segments: [{ kind: "member", member_route_key: "worker" }],
      },
    }, "team-1")).toMatchObject({ ok: false });

    expect(resolveSendMessageConversationTargetAddress({
      conversation_target_address: {
        parent_team_run_id: "other-team",
        segments: [{ kind: "member", member_route_key: "worker" }],
      },
    }, "team-1")).toMatchObject({ ok: false });

    expect(resolveSendMessageConversationTargetAddress({
      conversation_target_address: {
        segments: [
          { kind: "member", member_route_key: "worker" },
          { kind: "task_agent", task_agent_run_id: "task-agent-run-1" },
          { kind: "member", member_route_key: "nested" },
        ],
      },
    }, "team-1")).toMatchObject({ ok: false });
  });

  it("rejects route/path disagreement on member selectors", () => {
    expect(resolveSendMessageConversationTargetAddress({
      target_member_route_key: "BuildSquad/review_lead",
      target_member_path: ["BuildSquad", "qa_specialist"],
    }, "team-1")).toMatchObject({ ok: false });

    expect(resolveSendMessageConversationTargetAddress({
      conversation_target_address: {
        segments: [{
          kind: "member",
          member_route_key: "BuildSquad/review_lead",
          member_path: ["BuildSquad", "qa_specialist"],
        }],
      },
    }, "team-1")).toMatchObject({ ok: false });
  });

  it("rejects malformed member path array entries without coercion", () => {
    expect(resolveSendMessageConversationTargetAddress({
      target_member_path: ["BuildSquad", 123],
    }, "team-1")).toMatchObject({ ok: false });

    expect(resolveSendMessageConversationTargetAddress({
      conversation_target_address: {
        segments: [{
          kind: "member",
          member_path: ["BuildSquad", { name: "review_lead" }],
        }],
      },
    }, "team-1")).toMatchObject({ ok: false });
  });
});
