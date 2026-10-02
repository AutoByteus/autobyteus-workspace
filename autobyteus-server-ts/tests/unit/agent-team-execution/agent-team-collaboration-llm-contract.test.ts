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
      sendTool: "9f1573a4fde6535ecb87ac75f0e8c28c06637bb4745723e4c3d9c1d3ab44b10c",
      sendRecipient: "b9c340525eb1af6c31faaa12c1cb8ccb18d7110cec8577bef85df196dfd0b801",
      sendExactRun: "80516600b7452a84f2ba972cb32aca0a2521f98959318386a94c5bb58cdf7bfd",
      delegateTool: "6119c6b09eba5dd0ba706de167daca3e0507b9d96d0fb703bc1b8611384ec7e6",
      delegateRecipient: "c53d279b572b829451a03b34195be0dc913ca61f397412e769aecd128a04de0a",
      delegateDescription: "b5e9223456da4f02bd95fa69a1b0298b255f62839f3a8ea657adece6ad4a88dc",
      delegateReferences: "7d4b59ec1a78e52a8c09657dbb5e296cf424bb0b5f9148c06fc59b3b10997c69",
      collaborationPrompt: "8bbb75a854846220183f819729557db5e2b9e85eb85b697931c25b0b97e943c2",
    });
  });

  it("describes the one instance at an address, a new copy per delegation, and run-ID follow-up (REQ-009)", () => {
    const prompt = AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION;
    expect(prompt).toContain("`send_message_to` reaches the one instance at an address, brought in on first use.");
    expect(prompt).toContain("`delegate_task` always spawns a new copy of an Agent or AgentTeam for new work.");
    expect(prompt).toContain("that Team instance's coordinator");
    expect(prompt).toContain("Inside your own team instance, a teammate's address reaches the member of\n  that same instance.");
    expect(prompt).toContain("A run ID\n  never brings anything in.");
    expect(prompt).toContain("### Delegated Agents");
    expect(prompt).toContain("Follow up on a copy only through `send_message_to` with its\n`target_agent_run_id`");
    expect(prompt).toContain("a message to its run ID restores it with its\nconversation");
    expect(prompt).toContain("including a\n  shut-down delegated agent");
    expect(prompt).not.toMatch(/submit_task_result|review_task_result|Task Lifecycle|task_id|not_started|live-only/);
    expect(prompt).not.toMatch(/REQ-|DEC-|TODO|TBD/);
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("shut-down delegated agent");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).not.toContain("live-only");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("restored with its conversation");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("brought in on first use");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("a run ID never brings anything in");
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
