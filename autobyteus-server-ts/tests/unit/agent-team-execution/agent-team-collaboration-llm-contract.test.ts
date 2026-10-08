import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION,
  WORK_REQUEST_EXECUTION_LLM_INSTRUCTION,
  DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION,
  DELEGATE_TASK_ID_DESCRIPTION,
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
      sendTool: "172c78fd61a1f7c522872596b31fd5f9e86c98e3417c6cde95ed40f41dacb128",
      sendRecipient: "b9c340525eb1af6c31faaa12c1cb8ccb18d7110cec8577bef85df196dfd0b801",
      sendExactRun: "fea015b28391ff2ebc659d799c3b1df2ed5a2cfda66e4eec7d5f3ba808964d02",
      delegateTool: "46f73f6aedd4a4bc9aa9471724eccaaf6d70077a3fc7c852ee1c6bd98677b95e",
      delegateRecipient: "c53d279b572b829451a03b34195be0dc913ca61f397412e769aecd128a04de0a",
      delegateDescription: "31d5193d5849bf4df65d443af5061384cf1e32e41839793d1d711bfe493b9da4",
      delegateReferences: "8f6e0bd3e58880db150c3516c898ac4fb00ab30dce9fa0161739c0a09c5763ae",
      collaborationPrompt: "5ad3d6d64307ebd107e74f5db6a5eb02ab9f02a05223eb92f4efaccccc17521a",
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
    expect(prompt).toContain("A copy that stays quiet is shut\ndown after a while, but not while it has a running background task; a\nmessage to its run ID restores it with its\nconversation");
    expect(prompt).toContain("including a\n  shut-down delegated agent");
    expect(prompt).not.toMatch(/submit_task_result|review_task_result|Task Lifecycle|not_started|live-only/);
    expect(prompt).not.toMatch(/REQ-|DEC-|TODO|TBD/);
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("shut-down delegated agent");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).not.toContain("live-only");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("restored with its conversation");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("brought in on first use");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("a run ID never brings anything in");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("target_agent_run_id is null and message explains why");
    // A description-only delegation that creates a Task returns its task_id; DONE (or CANCELLED) closes the copy.
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("that creates a Task also returns its task_id");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("create_or_update_task with that task_id and status DONE");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("status DONE (or CANCELLED if the work\nturned out not to be needed), which stops the copy and removes it from the run.");
    expect(prompt).toContain("`task_id`. When the work is finished, call `create_or_update_task` with that\n  `task_id` and status `DONE` (or `CANCELLED` if the work turned out not to be\n  needed); this stops the copy and removes it from the run.");
  });

  it("describes DONE and CANCELLED as a stop and the reopen-then-message reactivation, never as final (REQ-011)", () => {
    const texts = [SEND_MESSAGE_TO_LLM_DESCRIPTION, SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION, DELEGATE_TASK_LLM_DESCRIPTION, AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION];
    for (const text of texts) expect(text).not.toMatch(/for good|unless its Task is DONE|can never/);
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain("A copy whose Task is `DONE` or `CANCELLED` is stopped.");
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain("run that assigned the work first moves the Task out of `DONE` or\n`CANCELLED`");
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain("then\nmessages the copy's run ID; that reactivates it with its conversation. Setting\nthe status alone starts nothing.");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("A copy whose Task is DONE or CANCELLED is stopped");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("A delegated copy whose Task is DONE or CANCELLED is reactivated only");
    expect(DELEGATE_TASK_ID_DESCRIPTION).toContain("Blank, unknown, ambiguous, DONE or CANCELLED Tasks fail.");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("moving the Task to TODO or IN_PROGRESS with\ncreate_or_update_task and then messaging the run ID delegate_task returned");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("reactivated only by the run that assigned it, after it moves the Task to TODO or IN_PROGRESS");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("target_agent_run_id and target_kind (agent, or team");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("move the Task to TODO or IN_PROGRESS\nfirst, then message its run ID: that reactivates it with its conversation.");
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain("`target_kind` says whether it is an `agent` or a `team`.");
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
