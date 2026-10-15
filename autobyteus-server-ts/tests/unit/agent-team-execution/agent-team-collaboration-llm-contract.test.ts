import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
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
import { LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION } from "../../../src/agent-tools/agent-discovery/list-available-agents-contract.js";
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
      delegateTool: sha256(DELEGATE_TASK_LLM_DESCRIPTION),
      delegateRecipient: sha256(DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION),
      delegateTeamId: sha256(DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION),
      delegateAgentId: sha256(DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION),
      delegateTaskId: sha256(DELEGATE_TASK_ID_DESCRIPTION),
      delegateDescription: sha256(DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION),
      delegateReferences: sha256(DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION),
    }).toEqual({
      sendTool: "6ccd3129abfcf3a04a94386d6c78c1ee5e07bdb19b8e419bfa4b554e43f9e01a",
      sendRecipient: "6be9ed29689ec44cf8775b00e0d34ab473126416a1330a63aa3ccef2b6d14806",
      sendExactRun: "7411f79a5673d4a0fb5344eb4c2a6e1f4d6b4f059b433628d72d40452d3dbc6e",
      delegateTool: "9cf4eddebf785b581bee0a7a3aae7b5d56aaf4f160d44f14cb1cd6f72fc85066",
      delegateRecipient: "501c11b0aa0cf1eeb1c64e9d9c0b852356c5d55f45e8288ecbb16c4e60d18c7b",
      delegateTeamId: "afb8c56b56a4b927ee1cb303d7701214e9f1eec2b20cb3e1515d572531a6ff96",
      delegateAgentId: "3feee9125a2fff6b97a656278d8980cd267128b2a314a12f03be4cc8ab506f8c",
      delegateTaskId: "d0ed960b9714eb20ac0a35c8d4c423ef5131983577b3b02ef5a6fa435afa8c17",
      delegateDescription: "e4b27c311d0bbe3a2a28745f12ecf495e9b4437d4c6ff36f95f7edda99993bb5",
      delegateReferences: "dc26162eff418e5fe6ee52377cc0e89521ac1206cc1a13a1ad3c0ac23a5e4610",
    });
  });

  it("states how each tool works, each fact once: messaging never creates an agent, delegation always does", () => {
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("send_message_to never creates an agent; to have work done by a new agent, use delegate_task.");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("Use exactly one selector, never both:");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("For a task agent team, use its coordinator's ID; a team's own ID is refused.");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("Delegating to yourself, a teammate or your own team is refused.");
    expect(DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION).toContain("Every call with an address creates another task agent or task agent team.");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("together with your ID");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("If you are a task agent yourself");
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
      DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION, LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION, GET_HANDOFF_RULES_TOOL_DESCRIPTION,
      PROJECT_TASK_TOOL_DESCRIPTIONS.update_task, PROJECT_TASK_TOOL_DESCRIPTIONS.list_project_tasks,
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/\b(copy|copies|spawn|spawns|this run|your run|the run|in the run|mounted|collaborator|brought in|bring-in|pause|wake|restore|shut down|shut-down|nested|Task worker|work packet)\b/i);
      expect(text).not.toMatch(/REQ-|DEC-|\bTBD\b/);
    }
  });

  it("names no task tool outside update_task's own description, and update_task carries the closing guidance", () => {
    for (const text of [SEND_MESSAGE_TO_LLM_DESCRIPTION, DELEGATE_TASK_LLM_DESCRIPTION, DELEGATE_TASK_ID_DESCRIPTION]) {
      expect(text).not.toMatch(/create_or_update_task|update_task|create_task/);
    }
    expect(PROJECT_TASK_TOOL_DESCRIPTIONS.update_task).toContain("Close a Task you delegated when its work is done.");
  });
});
