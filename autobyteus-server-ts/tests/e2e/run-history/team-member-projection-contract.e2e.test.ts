import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GraphQLSchema, graphql as graphqlFn } from "graphql";
import type { AgentInputUserMessage } from "autobyteus-ts";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import type { TeamRunManifest } from "../../../src/run-history/domain/team-models.js";
import { getTeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { TeamMemberMemoryLayoutStore } from "../../../src/run-history/store/team-member-memory-layout-store.js";
import { buildTeamMemberRunId } from "../../../src/run-history/utils/team-member-run-id.js";

type RuntimeMemberConfig = {
  memberName: string;
  memberRouteKey?: string | null;
  memberRunId?: string | null;
  memoryDir?: string | null;
};

type TeamRuntimeStub = {
  teamRunId: string;
  postMessage: (message: AgentInputUserMessage, targetMemberName?: string | null) => Promise<void>;
};

const createAgentTeamRunMutation = `
  mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
    createAgentTeamRun(input: $input) {
      success
      message
      teamRunId
    }
  }
`;

const getTeamRunResumeConfigQuery = `
  query GetTeamRunResumeConfig($teamRunId: String!) {
    getTeamRunResumeConfig(teamRunId: $teamRunId) {
      teamRunId
      isActive
      manifest
    }
  }
`;

const getTeamMemberRunProjectionQuery = `
  query GetTeamMemberRunProjection($teamRunId: String!, $memberRouteKey: String!) {
    getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
      agentRunId
      conversation
      summary
    }
  }
`;

const terminateAgentTeamRunMutation = `
  mutation TerminateAgentTeamRun($id: String!) {
    terminateAgentTeamRun(id: $id) {
      success
      message
    }
  }
`;

const sendMessageToTeamMutation = `
  mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
    sendMessageToTeam(input: $input) {
      success
      message
      teamRunId
    }
  }
`;

describe("Team member projection contract e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  const seededTeamRunIds = new Set<string>();
  const activeTeams = new Map<string, TeamRuntimeStub>();
  const runtimeConfigsByTeam = new Map<string, RuntimeMemberConfig[]>();
  const postedMessages: Array<{ teamRunId: string; targetMemberName: string | null; content: string }> =
    [];

  const memoryDir = appConfigProvider.config.getMemoryDir();
  const memberLayoutStore = new TeamMemberMemoryLayoutStore(memoryDir);

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    activeTeams.clear();
    runtimeConfigsByTeam.clear();
    postedMessages.length = 0;

    const teamRunHistoryService = getTeamRunHistoryService();
    for (const teamRunId of seededTeamRunIds) {
      await teamRunHistoryService.deleteTeamRunHistory(teamRunId);
      await fs.rm(memberLayoutStore.getTeamDirPath(teamRunId), { recursive: true, force: true });
    }
    seededTeamRunIds.clear();
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const seedMemberMemory = async (
    teamRunId: string,
    memberConfig: RuntimeMemberConfig,
    content: string,
  ): Promise<void> => {
    const routeKey = memberConfig.memberRouteKey ?? memberConfig.memberName;
    const memberRunId = memberConfig.memberRunId ?? buildTeamMemberRunId(teamRunId, routeKey);
    const memberDir = memberConfig.memoryDir ?? memberLayoutStore.getMemberDirPath(teamRunId, memberRunId);
    await fs.mkdir(memberDir, { recursive: true });
    await fs.appendFile(
      path.join(memberDir, "raw_traces.jsonl"),
      `${JSON.stringify({
        trace_type: "user",
        content,
        turn_id: `turn_${Date.now()}`,
        seq: Date.now(),
        ts: Math.floor(Date.now() / 1000),
      })}\n`,
      "utf-8",
    );
  };

  const installTeamManagerSpies = () => {
    const manager = AgentTeamRunManager.getInstance();

    const createSpy = vi
      .spyOn(manager, "createTeamRunWithId")
      .mockImplementation(async (teamRunId: string, _teamDefinitionId: string, memberConfigs: any[]) => {
        const runtimeConfigs = (memberConfigs as RuntimeMemberConfig[]).map((config) => ({ ...config }));
        runtimeConfigsByTeam.set(teamRunId, runtimeConfigs);
        for (const memberConfig of runtimeConfigs) {
          const routeKey = memberConfig.memberRouteKey ?? memberConfig.memberName;
          const memberRunId = memberConfig.memberRunId ?? buildTeamMemberRunId(teamRunId, routeKey);
          const expectedMemberDir = memberLayoutStore.getMemberDirPath(teamRunId, memberRunId);
          const memberDir = memberConfig.memoryDir ?? expectedMemberDir;
          await fs.mkdir(memberDir, { recursive: true });
          await seedMemberMemory(teamRunId, { ...memberConfig, memberRunId, memoryDir: memberDir }, `seed:${routeKey}`);
        }

        activeTeams.set(teamRunId, {
          teamRunId,
          postMessage: async (message: AgentInputUserMessage, targetMemberName?: string | null) => {
            const runtime = runtimeConfigsByTeam.get(teamRunId) ?? [];
            const target =
              runtime.find((config) => config.memberName === targetMemberName) ??
              runtime.find((config) => config.memberRouteKey === targetMemberName) ??
              runtime[0];

            if (target) {
              await seedMemberMemory(teamRunId, target, message.content);
            }
            postedMessages.push({
              teamRunId,
              targetMemberName: targetMemberName ?? null,
              content: message.content,
            });
          },
        });
        return teamRunId;
      });

    const getSpy = vi
      .spyOn(manager, "getTeamRun")
      .mockImplementation((teamRunId: string) => (activeTeams.get(teamRunId) as any) ?? null);

    const terminateSpy = vi.spyOn(manager, "terminateTeamRun").mockImplementation(async (teamRunId: string) => {
      activeTeams.delete(teamRunId);
      return true;
    });

    return { createSpy, getSpy, terminateSpy };
  };

  it("keeps runtime member memoryDir aligned with manifest memberRunId and projection IDs", async () => {
    const { createSpy } = installTeamManagerSpies();

    const createResult = await execGraphql<{
      createAgentTeamRun: { success: boolean; teamRunId: string | null };
    }>(createAgentTeamRunMutation, {
      input: {
        teamDefinitionId: "contract-def",
        memberConfigs: [
          {
            memberName: "professor",
            agentDefinitionId: "agent-professor",
            llmModelIdentifier: "dummy-model",
            autoExecuteTools: false,
          },
          {
            memberName: "student",
            agentDefinitionId: "agent-student",
            llmModelIdentifier: "dummy-model",
            autoExecuteTools: false,
          },
        ],
      },
    });

    expect(createResult.createAgentTeamRun.success).toBe(true);
    const teamRunId = createResult.createAgentTeamRun.teamRunId as string;
    seededTeamRunIds.add(teamRunId);

    expect(createSpy).toHaveBeenCalledTimes(1);
    const runtimeMemberConfigs = createSpy.mock.calls[0]?.[2] as RuntimeMemberConfig[];
    expect(runtimeMemberConfigs).toHaveLength(2);

    const expectedProfessorRunId = buildTeamMemberRunId(teamRunId, "professor");
    const expectedStudentRunId = buildTeamMemberRunId(teamRunId, "student");

    expect(runtimeMemberConfigs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberName: "professor",
          memberRouteKey: "professor",
          memberRunId: expectedProfessorRunId,
          memoryDir: memberLayoutStore.getMemberDirPath(teamRunId, expectedProfessorRunId),
        }),
        expect.objectContaining({
          memberName: "student",
          memberRouteKey: "student",
          memberRunId: expectedStudentRunId,
          memoryDir: memberLayoutStore.getMemberDirPath(teamRunId, expectedStudentRunId),
        }),
      ]),
    );

    const resume = await execGraphql<{
      getTeamRunResumeConfig: {
        teamRunId: string;
        manifest: TeamRunManifest;
      };
    }>(getTeamRunResumeConfigQuery, { teamRunId });

    expect(resume.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
    expect(resume.getTeamRunResumeConfig.manifest.memberBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberRouteKey: "professor",
          memberRunId: expectedProfessorRunId,
        }),
        expect.objectContaining({
          memberRouteKey: "student",
          memberRunId: expectedStudentRunId,
        }),
      ]),
    );

    const professorProjection = await execGraphql<{
      getTeamMemberRunProjection: { agentRunId: string; conversation: Array<{ content?: string | null }> };
    }>(getTeamMemberRunProjectionQuery, {
      teamRunId,
      memberRouteKey: "professor",
    });

    expect(professorProjection.getTeamMemberRunProjection.agentRunId).toBe(expectedProfessorRunId);
    expect(
      professorProjection.getTeamMemberRunProjection.conversation.some((entry) =>
        String(entry.content ?? "").includes("seed:professor"),
      ),
    ).toBe(true);

    const professorManifestPath = path.join(
      memberLayoutStore.getMemberDirPath(teamRunId, expectedProfessorRunId),
      "run_manifest.json",
    );
    const professorManifest = JSON.parse(await fs.readFile(professorManifestPath, "utf-8")) as {
      teamRunId?: string;
      memberRunId?: string;
    };
    expect(professorManifest.teamRunId).toBe(teamRunId);
    expect(professorManifest.memberRunId).toBe(expectedProfessorRunId);
  });

  it("restores canonical member memoryDir when sending to a terminated team", async () => {
    const { createSpy } = installTeamManagerSpies();

    const createResult = await execGraphql<{
      createAgentTeamRun: { success: boolean; teamRunId: string | null };
    }>(createAgentTeamRunMutation, {
      input: {
        teamDefinitionId: "contract-def-continue",
        memberConfigs: [
          {
            memberName: "professor",
            agentDefinitionId: "agent-professor",
            llmModelIdentifier: "dummy-model",
            autoExecuteTools: false,
          },
        ],
      },
    });

    expect(createResult.createAgentTeamRun.success).toBe(true);
    const teamRunId = createResult.createAgentTeamRun.teamRunId as string;
    seededTeamRunIds.add(teamRunId);

    const terminateResult = await execGraphql<{
      terminateAgentTeamRun: { success: boolean };
    }>(terminateAgentTeamRunMutation, { id: teamRunId });
    expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

    const sendResult = await execGraphql<{
      sendMessageToTeam: { success: boolean; teamRunId: string | null };
    }>(sendMessageToTeamMutation, {
      input: {
        teamRunId,
        targetMemberName: "professor",
        userInput: {
          content: "continue-after-terminate-check",
          contextFiles: [],
        },
      },
    });

    expect(sendResult.sendMessageToTeam.success).toBe(true);
    expect(sendResult.sendMessageToTeam.teamRunId).toBe(teamRunId);
    expect(createSpy).toHaveBeenCalledTimes(2);

    const secondCreateMemberConfigs = createSpy.mock.calls[1]?.[2] as RuntimeMemberConfig[];
    const expectedProfessorRunId = buildTeamMemberRunId(teamRunId, "professor");
    expect(secondCreateMemberConfigs[0]).toEqual(
      expect.objectContaining({
        memberName: "professor",
        memberRouteKey: "professor",
        memberRunId: expectedProfessorRunId,
        memoryDir: memberLayoutStore.getMemberDirPath(teamRunId, expectedProfessorRunId),
      }),
    );

    expect(postedMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          teamRunId,
          targetMemberName: "professor",
          content: "continue-after-terminate-check",
        }),
      ]),
    );
  });
});
