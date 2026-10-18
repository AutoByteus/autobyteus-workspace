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
      sendTool: "6ff131924d8cef4ed04f0702af3544484356ec6f1947197da2192455db6dc18f",
      sendRecipient: "6be9ed29689ec44cf8775b00e0d34ab473126416a1330a63aa3ccef2b6d14806",
      sendExactRun: "9a9c650c745f2fcaca353a639339f712e9d9bba60e3de0f3bbad5d43e1cc8b5f",
      delegateTool: "796ecc82693c309fbaeec15ce634dbbafa28b5b34b982e74a61a6fc010eecb83",
      delegateRecipient: "501c11b0aa0cf1eeb1c64e9d9c0b852356c5d55f45e8288ecbb16c4e60d18c7b",
      delegateTeamId: "3719a0d1346594ec7b0f4e0ca33e1ae3f265c9ed2ddc6d742c8e10339494692c",
      delegateAgentId: "95a9198e3fbabcd86c78b6de25483e16903655b1bd5ddca40313d11c65c907a0",
      delegateTaskId: "758d12d753234f54a47324aee40fbd746044ed150ece92d0d2c69abbd9f83017",
      delegateDescription: "e4b27c311d0bbe3a2a28745f12ecf495e9b4437d4c6ff36f95f7edda99993bb5",
      delegateReferences: "dc26162eff418e5fe6ee52377cc0e89521ac1206cc1a13a1ad3c0ac23a5e4610",
    });
  });

  it("states how each tool works, each fact once: messaging never creates an agent, delegation always does", () => {
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("send_message_to never creates an agent; to have work done by a new agent, use delegate_task.");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("Use exactly one selector, never both:");
    expect(SEND_MESSAGE_TO_LLM_DESCRIPTION).toContain("For a task agent team, use its coordinator's run id; a team's own run id is refused.");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("Delegating to yourself, a teammate or your own team is refused.");
    expect(DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION).toContain("Every call with an address creates another task agent or task agent team.");
    expect(DELEGATE_TASK_LLM_DESCRIPTION).toContain("together with your run id");
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
