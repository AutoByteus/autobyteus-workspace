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
  DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION,
  DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION,
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
      sendTool: "6e8681d650e6100f5ac27866ab6294617f94797656d7933e02883bf176432ef6",
      sendRecipient: "b9c340525eb1af6c31faaa12c1cb8ccb18d7110cec8577bef85df196dfd0b801",
      sendExactRun: "62e7add6181c1521f41ddaad05b9a87a0d3320f673bf6fc4bd851d4d9f9dc1c4",
      delegateTool: "01b2c0c09a3df8c166f0fd1472bda80f23b58b2390a6ab2f5f0e84ec7d2ea5d4",
      delegateRecipient: "1b715bcac89ebc4a77e7fda6b63397b940358cd0a17f91317b26419909e43af5",
      delegateDescription: "a2165576362e49586aef4ccef6338288d5ba865fd50363d1fd65494b173ca49a",
      delegateReferences: "43d07f7e31b5b6f03e0327fa89f427fb70dc5da6a91ec098a3430cd56ccb2533",
      collaborationPrompt: "061ff5a1ec46f5f49d11b85a46ea2d12be24a5eab744286c99516ebcda5ea37f",
    });
  });

  it("describes the one instance at an address, a new copy per address delegation, and agent-run-ID follow-up (REQ-009)", () => {
    const prompt = AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION;
    expect(prompt).toContain("`send_message_to` reaches the one instance at an address, brought in on first use.");
    expect(prompt).toContain("`delegate_task` with an address spawns a new copy of an Agent or AgentTeam for new work;\nwith a copy's own ID it gives a new saved Task to that existing copy.");
    expect(prompt).toContain("that Team instance's coordinator");
    expect(prompt).toContain("Inside your own team instance, a teammate's address reaches the member of\n  that same instance.");
    expect(prompt).toContain("A run ID\n  never brings anything in.");
    expect(prompt).toContain("### Delegated Agents");
    expect(prompt).toContain("Message a copy only through `send_message_to` with an agent run ID: its\n`target_agent_run_id`, or for a Team copy its `target_team_coordinator_agent_run_id`");
    expect(prompt).toContain("A copy that stays quiet is shut down after a while, but not\nwhile it has a running background task; a message to it restores it with its\nconversation");
    expect(prompt).toContain("including a\n  shut-down delegated agent");
    expect(prompt).not.toMatch(/submit_task_result|review_task_result|Task Lifecycle|not_started|live-only|always spawns/);
    expect(prompt).not.toMatch(/REQ-|DEC-|TODO|TBD/);
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("shut-down delegated agent");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).not.toContain("live-only");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("restored with its conversation");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("brought in on first use");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("a run ID never brings anything in");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("On failure delegated is false\nand message explains why; nothing was started.");
    // A description-only delegation that creates a Task returns its task_id; DONE (or CANCELLED) closes the copy.
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("that creates a\nTask also returns its task_id");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("call create_or_update_task with that\ntask_id and status DONE");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("status DONE (or CANCELLED if the work turned out not to be needed), which stops the\ncopy and removes it from the run.");
    expect(prompt).toContain("`task_id`. When the work is finished, call `create_or_update_task` with that\n  `task_id` and status `DONE` (or `CANCELLED` if the work turned out not to be\n  needed); this stops the copy and removes it from the run.");
  });

  it("names every copy ID for what it is and describes delegating a follow-up Task to an existing copy (REQ-001/002/004/012, AC-015)", () => {
    const prompt = AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION;
    for (const text of [DELEGATE_TASK_LLM_DESCRIPTION, prompt]) {
      expect(text).toContain("target_team_run_id");
      expect(text).toContain("target_team_coordinator_agent_run_id");
      expect(text).toContain("target_agent_run_id");
      expect(text).not.toMatch(/always spawns|target_agent_run_id is null|coordinator is the run ID/);
    }
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("(3) exactly one of target_team_run_id or target_agent_run_id, and task_id");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("A copy has one current Task at a time: you can give it a new\nTask only if you made its most recent assignment and its current Task is DONE or CANCELLED");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("closing it again never stops the copy");
    expect(prompt).toContain("A copy has one current Task at a time: this works only when you\nmade its most recent assignment and its current Task is `DONE` or `CANCELLED`");
    expect(DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION).toContain("not its coordinator's agent run ID");
    expect(DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("A Team coordinator's ID is refused: use target_team_run_id for a Team copy.");
    expect(DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION).toContain("With an address, every call spawns a new copy");
    expect(DELEGATE_TASK_ID_DESCRIPTION).toContain("With target_team_run_id or target_agent_run_id, supply only that ID and task_id");
    // send_message_to stays agent-only (REQ-009).
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("target_agent_run_id takes agent run IDs only");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("a team run ID is refused");
    // A worker's description-only delegation is sub-work of its Task (REQ-011).
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("While you work on a Task yourself, a\ndescription-only delegation is sub-work of your Task: it returns no task_id and closes only when\nyour Task is DONE or CANCELLED");
    expect(prompt).toContain("While you work on a Task yourself, a description-only delegation is sub-work\n  of your Task: it returns no `task_id` and closes only with your Task.");
  });

  it("describes DONE and CANCELLED as a stop and the reopen-then-message reactivation, never as final (REQ-011)", () => {
    const texts = [SEND_MESSAGE_TO_LLM_DESCRIPTION, SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION, DELEGATE_TASK_LLM_DESCRIPTION, AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION];
    for (const text of texts) expect(text).not.toMatch(/for good|unless its Task is DONE|can never/);
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain("A copy whose Task is `DONE` or `CANCELLED` is stopped.");
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain("the run that assigned the work first moves the Task out of\n`DONE` or `CANCELLED`");
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain("then messages the copy; that reactivates it with its conversation. Setting the\nstatus alone starts nothing.");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("A copy whose Task is DONE or CANCELLED is\nstopped");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("A delegated copy whose Task is DONE or CANCELLED is reactivated only");
    expect(DELEGATE_TASK_ID_DESCRIPTION).toContain("Blank, unknown, ambiguous, DONE or CANCELLED Tasks fail.");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("Task to TODO or IN_PROGRESS with create_or_update_task and then messaging the copy's agent\nrun ID");
    expect(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION).toContain("reactivated only by the run that assigned it, after it moves the Task to TODO or IN_PROGRESS");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("On success it returns delegated: true and\ntarget_kind.");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("To continue the same Task with the same copy later, move the\nTask to TODO or IN_PROGRESS first, then message the copy's agent run ID");
    expect(AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION).toContain("`target_kind` says whether the copy is an\n  `agent` or a `team`.");
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
