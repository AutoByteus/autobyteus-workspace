import { describe, expect, it } from "vitest";
import { ModelRoutingSessions, sessionClosedText } from "../../../src/model-routing/services/model-routing-sessions.js";
import { nodeFacts, routingRequest, validChoices } from "./model-routing-fixtures.js";

const open = () => {
  const sessions = new ModelRoutingSessions(() => "req_1");
  return { sessions, session: sessions.openSession(routingRequest(), nodeFacts()) };
};

describe("ModelRoutingSessions validates the router's decision against the session's report (DS-004, REQ-006)", () => {
  it("AC-004: an unusable model is returned to the router with the reason; a valid answer then settles the session", async () => {
    const { sessions, session } = open();
    const [ie, cr] = validChoices();
    const wrong = sessions.submit("req_1", [ie!, { ...cr!, model: "opus" }]);
    expect(wrong).toEqual({ accepted: false, message: expect.stringContaining("/set/code_reviewer: Claude Agent SDK does not offer the model opus on this node.") });
    expect(sessions.isOpen("req_1")).toBe(true);
    expect(sessions.submit("req_1", validChoices())).toEqual({ accepted: true, message: "Accepted: 2 launch choices for request req_1." });
    await expect(session.outcome).resolves.toEqual({ kind: "chosen", choices: [
      { address: "/set/implementation_engineer", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", taskKind: "implementation", reason: "Codex is strongest at code here." },
      { address: "/set/code_reviewer", runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", taskKind: "Code Review", reason: "Sonnet reviews with a long context." },
    ] });
  });

  it("refuses a blocked model, a signed-out runtime, the wrong runtime for a required one, a missing agent, a long task kind and no reason", () => {
    const { sessions } = open();
    const [ie, cr] = validChoices();
    const result = sessions.submit("req_1", [
      { ...ie!, runtime: "claude_agent_sdk", model: "sonnet" },
      { ...cr!, runtime: "antigravity_cli", model: "gemini", taskKind: "x".repeat(41), reason: " " },
    ]);
    expect(result.accepted).toBe(false);
    expect(result.message).toContain("/set/implementation_engineer: it must stay on codex_app_server");
    expect(result.message).toContain("/set/code_reviewer: antigravity_cli is not an available runtime on this node now");
    expect(result.message).toContain("/set/code_reviewer: taskKind must be 1-40 characters.");
    expect(result.message).toContain("/set/code_reviewer: a one-sentence reason is required.");
    expect(sessions.submit("req_1", [{ ...ie!, model: "gpt-mini" }]).message).toEqual(expect.stringContaining(
      "/set/implementation_engineer: gpt-mini is blocked until 2026-10-27 04:00 UTC (5-hour)."));
    expect(sessions.submit("req_1", [ie!]).message).toContain("/set/code_reviewer: no choice was given.");
    expect(sessions.submit("req_1", [...validChoices(), { ...ie!, address: "/other" }]).message).toContain("/other: this request does not ask about that agent.");
  });

  it("SR-012: an unknown, answered or failed request changes nothing and says so", async () => {
    const { sessions, session } = open();
    expect(sessions.submit("req_9", validChoices())).toEqual({ accepted: false, message: sessionClosedText("req_9") });
    session.fail("no valid answer within 40 seconds");
    await expect(session.outcome).resolves.toEqual({ kind: "failed", reason: "no valid answer within 40 seconds" });
    expect(sessions.submit("req_1", validChoices())).toEqual({ accepted: false,
      message: "Routing request req_1 is no longer open (answered or timed out); nothing was changed." });
  });
});
