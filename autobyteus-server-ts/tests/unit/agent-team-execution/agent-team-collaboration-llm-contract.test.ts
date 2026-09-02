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
      sendTool: "162c44ac9681abd77f88874fdb7b025b8f3771dbe91eba2450d7f1f10fae13ab",
      sendRecipient: "2b0ee61bd3d105d980d38c6f3e4dc507e63ccc96fc5871c09426213b240f0a5d",
      sendExactRun: "773481e9ff138187a13939138a4aa333e7eb6cfdd65fd6d6894c96d3cacac985",
      delegateTool: "548178ab0112ad4236279dff75d73a5ea1dd1cba66592ba8452c040635c8a04c",
      delegateRecipient: "5a7dae3f8f1c6d0ac490282440af382887ca2a90a91993f07360e5696cc080fd",
      delegateDescription: "36c2f6b7bf5d8cab0b50024ccb0af343709ab94e38ee4b2657b64af1a6f84db3",
      delegateReferences: "2041ac773cd01e078ab457db50cfd561cdfe8839d835cc172a875b540726582b",
      collaborationPrompt: "1c63e9fea21d2edb3a8ce46cc4843f9eecde53b97938d2f87ff1213764349976",
    });
  });

  it("keeps the four ingress outcomes, exact-run clarification, and lifecycle split explicit", () => {
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain(
      "that mounted Agent's existing execution",
    );
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain(
      "that mounted Team's existing configured coordinator",
    );
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain(
      "spawns a fresh task\n  Agent instance",
    );
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain(
      "spawns a fresh\n  task AgentTeam instance",
    );
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain(
      "genuinely new clarification may be sent to the\nexact active task ingress",
    );
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain(
      "The spawned task assignee uses `submit_task_result`",
    );
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain(
      "The delegator uses `review_task_result`",
    );
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).not.toMatch(/REQ-|DEC-|TODO|TBD/);
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
