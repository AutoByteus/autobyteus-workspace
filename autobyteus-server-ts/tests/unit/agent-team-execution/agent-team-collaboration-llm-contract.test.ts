import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION,
  DELEGATE_TASK_ID_DESCRIPTION,
  DELEGATE_TASK_LLM_DESCRIPTION,
  DELEGATE_TASK_NODE_DESCRIPTION,
  DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION,
  DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION,
  DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION,
  DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION,
  SEND_MESSAGE_TO_LLM_DESCRIPTION,
  SEND_MESSAGE_TO_NODE_DESCRIPTION,
  SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION,
  SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION,
} from "../../../src/agent-collaboration/domain/agent-team-collaboration-llm-contract.js";
import { LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION } from "../../../src/agent-tools/agent-discovery/list-available-agents-contract.js";
import { LIST_RUNNING_AGENTS_TOOL_DESCRIPTION } from "../../../src/agent-tools/agent-discovery/list-running-agents-contract.js";
import { GET_HANDOFF_RULES_TOOL_DESCRIPTION } from "../../../src/agent-communication/services/get-handoff-rules-tool-contract.js";
import { PROJECT_TASK_TOOL_DESCRIPTIONS } from "../../../src/agent-tools/project-tasks/project-task-tool-contract.js";

const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

/**
 * The collaboration tool descriptions are the approved wording (collaboration-prompt-wording §6),
 * written for the agent and identical on every runtime (native tools and the Agent Tools MCP server,
 * which import these constants). A change to any of them is a change to intended behavior.
 */
describe("approved collaboration tool descriptions", () => {
  it("pins the exact approved texts", () => {
    expect({
      sendTool: sha256(SEND_MESSAGE_TO_LLM_DESCRIPTION),
      sendRecipient: sha256(SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION),
      sendExactRun: sha256(SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION),
      sendNode: sha256(SEND_MESSAGE_TO_NODE_DESCRIPTION),
      delegateTool: sha256(DELEGATE_TASK_LLM_DESCRIPTION),
      delegateRecipient: sha256(DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION),
      delegateTeamId: sha256(DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION),
      delegateAgentId: sha256(DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION),
      delegateTaskId: sha256(DELEGATE_TASK_ID_DESCRIPTION),
      delegateDescription: sha256(DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION),
      delegateReferences: sha256(DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION),
      delegateNode: sha256(DELEGATE_TASK_NODE_DESCRIPTION),
    }).toEqual({
      // autobyteus-260: a refused message leaves target_agent_run_id out (no "null").
      // autobyteus-492 (REQ-012): the run ID is the address: any running agent, `node` for another node, never woken.
      // autobyteus-587 (RF-14): an agent on another node is always named with `node`.
      sendTool: "9a195805099d0c4477ff62eca04d7bd2de4058debc2c4a92b9f9213ce3261ac0",
      sendRecipient: "6be9ed29689ec44cf8775b00e0d34ab473126416a1330a63aa3ccef2b6d14806",
      sendExactRun: "6a94fca2a5bb4b1cf65e4b621ac5f7e82fa015c1c7759418cc5b7d98aaa27909",
      sendNode: "2843534bf316396fd48391370ca54dfc2f137bd4de18022fda68a8975013e8e3",
      // `node` (DEC-111, autobyteus-191): a new task agent on a registered peer node; "agent or agent team" (autobyteus-261 DEC-406).
      // task-agent-several-tasks (autobyteus-275): mode (3) also while the task agent holds other open Tasks.
      // autobyteus-587 (CM-14, RF-14): reference_files go to another node as copies; follow-ups name the node.
      // autobyteus-587 SR-010/011 (DEC-009): a saved Task goes to another node with its own files; mode (3) takes node there.
      delegateTool: "e89d25a0d97beed2c41bb9b1f0f62e34d18d6e515b76f5894cfad7d4cfd509ad",
      delegateRecipient: "501c11b0aa0cf1eeb1c64e9d9c0b852356c5d55f45e8288ecbb16c4e60d18c7b",
      delegateTeamId: "a5c42d384ae1876a854104fcfe807ceb52a35c5777c76a527a2a3c13fededbcf",
      delegateAgentId: "488eb077b10da8ede5e3b91386bd4a2b90f1c1f09c14ee3548085486ea352319",
      delegateTaskId: "758d12d753234f54a47324aee40fbd746044ed150ece92d0d2c69abbd9f83017",
      delegateDescription: "e4b27c311d0bbe3a2a28745f12ecf495e9b4437d4c6ff36f95f7edda99993bb5",
      delegateReferences: "b793e2600ab5da95c1050176e15403f52299166af5e752b9eff19b1ca3eb2481",
      delegateNode: "2258cf7371e060f2ca6e527efa3d9dc7918e746cb3179a91e876704f2da1a458",
    });
  });

  it("autobyteus-261 DEC-406: a peer node's agent or agent team; autobyteus-587 SR-011: node also for a task agent on another node (the approved new wording)", () => {
    expect(DELEGATE_TASK_NODE_DESCRIPTION).toBe("Optional: the name of a peer node registered on this node. With recipient_address, the new task agent runs on that node, and recipient_address is the address of an agent or agent team on that node. With target_agent_run_id or target_team_run_id, required when that task agent runs on another node: its node, as the delegation result named it.");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("With node in mode (1) or (2), the task agent starts on that peer node, from the agent or agent team at recipient_address there; the result also gives node: message it by its run id with that node. In mode (3), a task agent on another node takes node too: the node the delegation result named. The files go to that node: reference_files only from your workspace, a saved Task's own files with it; files_sent in the result says how many.");
  });

  it("states how each tool works, each fact once: messaging never creates an agent, a delegation with an address always creates one", () => {
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("send_message_to never creates an agent and never wakes a stopped one; to have work done by a new agent, use delegate_task.");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("Use exactly one selector, never both:");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("the run id of any running agent. For an agent team, use its coordinator's run id; a team's own run id is refused. For an agent on another node, always also pass node.");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("Delegating to yourself, a teammate or your own team is refused.");
    expect(DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION).toContain("Every call with an address creates another task agent or task agent team.");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("together with your run id");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("If you are a task agent yourself");
    // task-agent-several-tasks: a task agent may hold several Tasks; it is freed when its last one closes.
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("This works only when you made its most recent assignment; its other open Tasks stay open, and it is freed when its last Task is closed.");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).not.toContain("its current Task is DONE or CANCELLED");
  });

  it("names the IDs a delegation returns for what they are", () => {
    for (const field of ["target_agent_run_id", "target_team_run_id", "target_team_coordinator_agent_run_id", "target_kind"]) {
      expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain(field);
    }
  });

  it("uses only the agent vocabulary and names no internal term (wording §2, AC-007)", () => {
    const texts = [
      SEND_MESSAGE_TO_LLM_DESCRIPTION, SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION, SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION,
      DELEGATE_TASK_LLM_DESCRIPTION, DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION, DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION,
      DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION, DELEGATE_TASK_ID_DESCRIPTION, DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION,
      DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION, DELEGATE_TASK_NODE_DESCRIPTION, LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION, GET_HANDOFF_RULES_TOOL_DESCRIPTION,
      SEND_MESSAGE_TO_NODE_DESCRIPTION, LIST_RUNNING_AGENTS_TOOL_DESCRIPTION,
      PROJECT_TASK_TOOL_DESCRIPTIONS.update_task, PROJECT_TASK_TOOL_DESCRIPTIONS.list_project_tasks,
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/\b(copy|copies|spawn|spawns|this run(?! id)|your run(?! id)|the run(?! id)|in the run(?! id)|mounted|collaborator|brought in|bring-in|pause|wake|restore|shut down|shut-down|nested|Task worker|work packet)\b/i);
      expect(text).not.toMatch(/REQ-|DEC-|\bTBD\b/);
      expect(text).not.toMatch(/(?<!Task's |Task |Unknown )\bIDs?\b|\bsender id\b/);
    }
  });

  it("names no task tool outside update_task's own description, and update_task carries the closing guidance", () => {
    for (const text of [SEND_MESSAGE_TO_LLM_DESCRIPTION, DELEGATE_TASK_LLM_DESCRIPTION, DELEGATE_TASK_ID_DESCRIPTION]) {
      expect(text).not.toMatch(/create_or_update_task|update_task|create_task/);
    }
    expect(PROJECT_TASK_TOOL_DESCRIPTIONS.update_task).toContain("Close a Task you delegated when its work is done.");
  });
});
