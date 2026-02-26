import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { ChunkResponse, CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import type { LLMUserMessage } from "autobyteus-ts/llm/user-message.js";
import { waitForTeamToBeIdle } from "autobyteus-ts/agent-team/utils/wait-for-idle.js";
import { AgentFactory } from "autobyteus-ts/agent/factory/agent-factory.js";
import { AgentTeamFactory } from "autobyteus-ts/agent-team/factory/agent-team-factory.js";
import {
  AgentTeamRunManager,
  TeamMemberConfigInput,
} from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: "ok" });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage,
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: "ok", is_complete: true });
  }
}

const resetFactories = (): void => {
  (AgentFactory as any).instance = undefined;
  (AgentTeamFactory as any).instance = undefined;
};

describe("AgentTeamRunManager restore-after-terminate integration", () => {
  const teamId = "team_restore_after_terminate";
  const teamDefinitionId = "team_def_restore";
  const coordinatorMemberId = "member_restore_professor";

  let tempMemoryDir: string;
  let originalMemoryDir: string | undefined;

  beforeEach(async () => {
    tempMemoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-restore-manager-"));
    originalMemoryDir = process.env.AUTOBYTEUS_MEMORY_DIR;
    process.env.AUTOBYTEUS_MEMORY_DIR = tempMemoryDir;
    resetFactories();
  });

  afterEach(async () => {
    const teamFactory = AgentTeamFactory.getInstance();
    if (teamFactory.getTeam(teamId)) {
      await teamFactory.removeTeam(teamId, 2.0);
    }
    const agentFactory = AgentFactory.getInstance();
    if (agentFactory.getAgent(coordinatorMemberId)) {
      await agentFactory.removeAgent(coordinatorMemberId, 2.0);
    }

    if (originalMemoryDir === undefined) {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    } else {
      process.env.AUTOBYTEUS_MEMORY_DIR = originalMemoryDir;
    }
    resetFactories();
    await fs.rm(tempMemoryDir, { recursive: true, force: true });
  });

  it("recreates same teamId and memberAgentId after terminate", async () => {
    const teamDefinitionService = {
      getDefinitionById: vi.fn(async (id: string) => {
        if (id !== teamDefinitionId) {
          return null;
        }
        return new AgentTeamDefinition({
          id: teamDefinitionId,
          name: "Class Room Simulation",
          description: "restore lifecycle integration",
          nodes: [
            new TeamMember({
              memberName: "professor",
              referenceId: "agent_def_professor",
              referenceType: NodeType.AGENT,
            }),
          ],
          coordinatorMemberName: "professor",
        });
      }),
    };

    const agentDefinitionService = {
      getAgentDefinitionById: vi.fn(async (id: string) => {
        if (id !== "agent_def_professor") {
          return null;
        }
        return new AgentDefinition({
          id,
          name: "Professor",
          role: "Professor",
          description: "Professor agent",
        });
      }),
    };

    const llmFactory = {
      createLLM: vi.fn(async () => {
        const model = new LLMModel({
          name: "dummy",
          value: "dummy",
          canonicalName: "dummy",
          provider: LLMProvider.OPENAI,
        });
        return new DummyLLM(model, new LLMConfig());
      }),
    };

    const manager = new AgentTeamRunManager({
      teamDefinitionService: teamDefinitionService as any,
      agentDefinitionService: agentDefinitionService as any,
      llmFactory: llmFactory as any,
      workspaceManager: { getWorkspaceById: vi.fn(() => null) } as any,
      skillService: { getSkill: vi.fn(() => null) } as any,
      promptLoader: { getPromptTemplateForAgent: vi.fn(async () => null) } as any,
      waitForIdle: async (team) => waitForTeamToBeIdle(team as any, 30.0),
    });

    const memberConfigs: TeamMemberConfigInput[] = [
      {
        memberName: "professor",
        agentDefinitionId: "agent_def_professor",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        memberRouteKey: "professor",
        memberAgentId: coordinatorMemberId,
      },
    ];

    await manager.createTeamRunWithId(teamId, teamDefinitionId, memberConfigs);
    await manager.terminateTeamRun(teamId);

    await expect(
      manager.createTeamRunWithId(teamId, teamDefinitionId, memberConfigs),
    ).resolves.toBe(teamId);
  });
});
