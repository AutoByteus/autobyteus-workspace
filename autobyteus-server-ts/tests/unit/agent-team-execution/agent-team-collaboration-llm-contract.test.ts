import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION,
  DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION,
  DELEGATE_TASK_LLM_DESCRIPTION,
  DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION,
  DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION,
  SEND_MESSAGE_TO_LLM_DESCRIPTION,
  SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION,
  SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION,
} from "../../../src/agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

const APPROVED_SINGLE_RECIPIENT_HANDOFF_PARAGRAPH =
  "When you finish your own work or are blocked, call `get_handoff_rules`. Evaluate the returned rules against your outcome. Select the single rule whose `when` condition most specifically applies, and notify only its `recipient_address` using `send_message_to`. Do not notify additional recipients for the same outcome. If no rule applies, finish normally.";

describe("approved AgentTeam collaboration LLM contract", () => {
  it("pins the exact approved prompt, tool descriptions, and field descriptions", () => {
    expect({
      sendTool: sha256(SEND_MESSAGE_TO_LLM_DESCRIPTION),
      sendRecipient: sha256(SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION),
      sendExactRun: sha256(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION),
      delegateTool: sha256(DELEGATE_TASK_LLM_DESCRIPTION),
      delegateRecipient: sha256(DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION),
      delegateDescription: sha256(DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION),
      delegateReferences: sha256(DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION),
      collaborationPrompt: sha256(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION),
    }).toEqual({
      sendTool: "1132ec46d3338e71340907779070103e4d4536ea826709e285b0f1b244f758cc",
      sendRecipient: "2b0ee61bd3d105d980d38c6f3e4dc507e63ccc96fc5871c09426213b240f0a5d",
      sendExactRun: "bfbb3d0a1bea1328b4fc1ad04f8897d0b37a3c0c1a7509eb5b435afa8a1e466c",
      delegateTool: "aab0cf1fe4c9291dd4ac5cf9068340a51ac4352f97ca89e6d27856d3176cf43c",
      delegateRecipient: "78e926b55753c36b8890a6c75e1f2b090d232bdd43bb86a5fa57f5fb3185dc04",
      delegateDescription: "b5e9223456da4f02bd95fa69a1b0298b255f62839f3a8ea657adece6ad4a88dc",
      delegateReferences: "7d4b59ec1a78e52a8c09657dbb5e296cf424bb0b5f9148c06fc59b3b10997c69",
      collaborationPrompt: "19a444fd619aeef672c64dbc4a46cfcddf7ef89e39c22716f250d7984e5b5e22",
    });
  });

  it("describes spawn-then-message and wake-on-message with no task lifecycle (AC-016)", () => {
    const prompt = AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION;
    expect(prompt).toContain("that mounted Agent's existing execution");
    expect(prompt).toContain("that mounted Team's existing configured coordinator");
    expect(prompt).toContain("### Delegated Agents");
    expect(prompt).toContain("communicate with the instance only through `send_message_to`");
    expect(prompt).toContain("a message to its run ID restores it\nwith its conversation");
    expect(prompt).toContain("including a\n  shut-down delegated agent");
    expect(prompt).not.toMatch(/submit_task_result|review_task_result|Task Lifecycle|task_id|not_started|live-only/);
    expect(prompt).not.toMatch(/REQ-|DEC-|TODO|TBD/);
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("shut-down delegated agent");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).not.toContain("live-only");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("restored with its conversation");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("target_agent_run_id is null and message explains why");
  });

  it("encodes SCN-001 as one most-specific rule and at most one recipient", () => {
    const ruleBasedHandoffParagraph = AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION
      .split("### Rule-Based Handoffs\n\n")[1]
      ?.split("\n\nDo not claim that a message")[0];

    expect(ruleBasedHandoffParagraph).toBe(
      APPROVED_SINGLE_RECIPIENT_HANDOFF_PARAGRAPH,
    );
    expect(ruleBasedHandoffParagraph).not.toContain("Apply every matching rule");
    expect(ruleBasedHandoffParagraph).not.toContain("follow distinct recipients");
    expect(ruleBasedHandoffParagraph).not.toContain("Combine applicable reasons");
  });
});
