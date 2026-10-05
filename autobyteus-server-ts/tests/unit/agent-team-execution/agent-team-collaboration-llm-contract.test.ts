import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION,
  WORK_REQUEST_EXECUTION_LLM_INSTRUCTION,
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
  "When you finish your own work or are blocked, call `get_handoff_rules`. Evaluate the returned rules against your outcome. Select the single rule whose `when` condition most specifically applies, and notify only its `recipient_address` using `send_message_to`. Do not notify additional recipients for the same outcome. If no rule applies to an incoming work request, return the result or specific blocker to the requesting agent using `send_message_to`; otherwise, finish normally.";

describe("approved AgentTeam collaboration LLM contract", () => {
  it("requires skill-governed work and preserves intermediate handoffs and requester fallback", () => {
    expect(WORK_REQUEST_EXECUTION_LLM_INSTRUCTION).toBe(
      "On receiving a work request, follow your own agent instructions and applicable skills. " +
      "Do not send acknowledgements or promises to work. " +
      "Use `send_message_to` only at a workflow-defined handoff point or when blocked and needing external input. " +
      "Follow applicable handoff rules; otherwise, return the result or specific blocker to the requesting agent.",
    );
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain("### Work Requests and Results");
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).not.toContain("### Ordinary Communication");
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).not.toContain("If no rule applies, finish normally.");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("work request, result, or blocker");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).not.toContain("ordinary message");
  });

  it("keeps the documented Team example identical to the rendered collaboration section", () => {
    const documentation = readFileSync(new URL("../../../docs/modules/prompt_engineering.md", import.meta.url), "utf8");
    expect(documentation).toContain(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION);
  });

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
      sendTool: "c2911fdc939324ebfa2cc7d66c32e479a4b4b996004e8628b2900ce78c365909",
      sendRecipient: "b9c340525eb1af6c31faaa12c1cb8ccb18d7110cec8577bef85df196dfd0b801",
      sendExactRun: "c847864e1dfe9745cab69b255ad3960185cf6c93ff78b647f809ec9fa85971cb",
      delegateTool: "83d4696113a9468b523d5db8379c98e81f63fa5c74657b8636681ba1d4dbfdf2",
      delegateRecipient: "c53d279b572b829451a03b34195be0dc913ca61f397412e769aecd128a04de0a",
      delegateDescription: "31d5193d5849bf4df65d443af5061384cf1e32e41839793d1d711bfe493b9da4",
      delegateReferences: "8f6e0bd3e58880db150c3516c898ac4fb00ab30dce9fa0161739c0a09c5763ae",
      collaborationPrompt: "930f41326bd9065c7a4a82a619b55fdcf5d1f2299e3a149eb05443cae995f4fa",
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
    expect(prompt).not.toMatch(/submit_task_result|review_task_result|Task Lifecycle|not_started|live-only/);
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
