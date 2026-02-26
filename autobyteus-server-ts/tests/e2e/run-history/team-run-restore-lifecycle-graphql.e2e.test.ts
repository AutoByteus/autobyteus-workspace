import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { getDefaultTeamCommandIngressService } from "../../../src/distributed/bootstrap/default-distributed-runtime-composition.js";
import { buildTeamMemberAgentId } from "../../../src/run-history/utils/team-member-agent-id.js";

type TeamRunIndexRow = {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: "ACTIVE" | "IDLE" | "ERROR";
  deleteLifecycle: "READY" | "CLEANUP_PENDING";
};

type TeamRunIndexFile = {
  version: number;
  rows: TeamRunIndexRow[];
};

const readTeamIndex = (indexFilePath: string): TeamRunIndexFile => {
  try {
    const raw = fs.readFileSync(indexFilePath, "utf-8");
    const parsed = JSON.parse(raw) as TeamRunIndexFile;
    return {
      version: 1,
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],
    };
  } catch {
    return { version: 1, rows: [] };
  }
};

const writeTeamIndex = (indexFilePath: string, index: TeamRunIndexFile): void => {
  fs.mkdirSync(path.dirname(indexFilePath), { recursive: true });
  fs.writeFileSync(indexFilePath, JSON.stringify(index, null, 2), "utf-8");
};

describe("Team run restore lifecycle GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempRoot: string;
  let memoryDir: string;
  let indexFilePath: string;
  let originalMemoryDirEnv: string | undefined;
  const createdTeamIds = new Set<string>();

  const activeTeams = new Set<string>();
  let createTeamRunWithIdSpy: ReturnType<typeof vi.spyOn> | null = null;
  let terminateTeamRunSpy: ReturnType<typeof vi.spyOn> | null = null;
  let getTeamRunSpy: ReturnType<typeof vi.spyOn> | null = null;
  let ingressDispatchSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-team-run-restore-e2e-"));
    originalMemoryDirEnv = process.env.AUTOBYTEUS_MEMORY_DIR;
    memoryDir = path.join(tempRoot, "memory");
    process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;
    fs.mkdirSync(memoryDir, { recursive: true });
    indexFilePath = path.join(memoryDir, "team_run_history_index.json");

    const teamManager = AgentTeamRunManager.getInstance();
    createTeamRunWithIdSpy = vi
      .spyOn(teamManager, "createTeamRunWithId")
      .mockImplementation(async (teamRunId: string) => {
        createdTeamIds.add(teamRunId);
        activeTeams.add(teamRunId);
        return teamRunId;
      });
    terminateTeamRunSpy = vi
      .spyOn(teamManager, "terminateTeamRun")
      .mockImplementation(async (teamRunId: string) => {
        activeTeams.delete(teamRunId);
        return true;
      });
    getTeamRunSpy = vi
      .spyOn(teamManager, "getTeamRun")
      .mockImplementation((teamRunId: string) => (activeTeams.has(teamRunId) ? ({ teamRunId } as any) : null));

    ingressDispatchSpy = vi
      .spyOn(getDefaultTeamCommandIngressService(), "dispatchUserMessage")
      .mockResolvedValue({
        teamId: "stub-team",
        teamRunId: "stub-run",
        runVersion: 1,
      } as any);

    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(() => {
    const index = readTeamIndex(indexFilePath);
    index.rows = index.rows.filter((row) => !createdTeamIds.has(row.teamRunId));
    writeTeamIndex(indexFilePath, index);

    for (const teamRunId of createdTeamIds) {
      activeTeams.delete(teamRunId);
      fs.rmSync(path.join(memoryDir, "agent_teams", teamRunId), { recursive: true, force: true });
    }
    createdTeamIds.clear();
  });

  afterAll(() => {
    ingressDispatchSpy?.mockRestore();
    getTeamRunSpy?.mockRestore();
    terminateTeamRunSpy?.mockRestore();
    createTeamRunWithIdSpy?.mockRestore();
    vi.restoreAllMocks();
    if (typeof originalMemoryDirEnv === "string") {
      process.env.AUTOBYTEUS_MEMORY_DIR = originalMemoryDirEnv;
    } else {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
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

  it("supports single-node team create, terminate, restore, and rerun via GraphQL", async () => {
    const sendMutation = `
      mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
        sendMessageToTeam(input: $input) {
          success
          message
          teamRunId
        }
      }
    `;

    const firstSend = await execGraphql<{
      sendMessageToTeam: { success: boolean; teamRunId: string };
    }>(sendMutation, {
      input: {
        userInput: {
          content: "start team",
          contextFiles: null,
        },
        teamDefinitionId: "team-def-e2e",
        targetMemberName: "coordinator",
        memberConfigs: [
          {
            memberName: "coordinator",
            agentDefinitionId: "agent-def-1",
            llmModelIdentifier: "gpt-4o-mini",
            autoExecuteTools: true,
          },
        ],
      },
    });

    expect(firstSend.sendMessageToTeam.success).toBe(true);
    const teamRunId = firstSend.sendMessageToTeam.teamRunId;
    expect(teamRunId).toBeTruthy();
    expect(createTeamRunWithIdSpy).toHaveBeenCalledTimes(1);
    expect(ingressDispatchSpy).toHaveBeenCalledTimes(1);
    const firstCreateCall = createTeamRunWithIdSpy?.mock.calls[0];
    const firstCreateMemberConfigs = (firstCreateCall?.[2] ?? []) as Array<Record<string, unknown>>;
    expect(firstCreateMemberConfigs).toEqual([
      expect.objectContaining({
        memberRouteKey: "coordinator",
        memberAgentId: buildTeamMemberAgentId(teamRunId, "coordinator"),
      }),
    ]);

    const listQuery = `
      query ListTeamRunHistory {
        listTeamRunHistory {
          teamRunId
          lastKnownStatus
          summary
        }
      }
    `;
    const listedAfterFirstSend = await execGraphql<{
      listTeamRunHistory: Array<{ teamRunId: string; lastKnownStatus: string; summary: string }>;
    }>(listQuery);
    const firstRow = listedAfterFirstSend.listTeamRunHistory.find((item) => item.teamRunId === teamRunId);
    expect(firstRow).toBeTruthy();
    expect(firstRow?.lastKnownStatus).toBe("ACTIVE");
    expect(firstRow?.summary).toContain("start team");

    const resumeQuery = `
      query GetTeamRunResumeConfig($teamRunId: String!) {
        getTeamRunResumeConfig(teamRunId: $teamRunId) {
          teamRunId
          isActive
          manifest
        }
      }
    `;
    const resumeBeforeTerminate = await execGraphql<{
      getTeamRunResumeConfig: {
        teamRunId: string;
        isActive: boolean;
        manifest: { memberBindings: Array<{ memberRouteKey: string; memberAgentId: string }> };
      };
    }>(resumeQuery, { teamRunId });
    expect(resumeBeforeTerminate.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
    expect(resumeBeforeTerminate.getTeamRunResumeConfig.isActive).toBe(true);
    expect(
      resumeBeforeTerminate.getTeamRunResumeConfig.manifest.memberBindings[0]?.memberRouteKey,
    ).toBe("coordinator");
    expect(
      resumeBeforeTerminate.getTeamRunResumeConfig.manifest.memberBindings[0]?.memberAgentId,
    ).toBe(buildTeamMemberAgentId(teamRunId, "coordinator"));

    const terminateMutation = `
      mutation TerminateTeam($id: String!) {
        terminateAgentTeamRun(id: $id) {
          success
          message
        }
      }
    `;
    const terminated = await execGraphql<{
      terminateAgentTeamRun: { success: boolean };
    }>(terminateMutation, { id: teamRunId });
    expect(terminated.terminateAgentTeamRun.success).toBe(true);

    const listedAfterTerminate = await execGraphql<{
      listTeamRunHistory: Array<{ teamRunId: string; lastKnownStatus: string; summary: string }>;
    }>(listQuery);
    const terminatedRow = listedAfterTerminate.listTeamRunHistory.find((item) => item.teamRunId === teamRunId);
    expect(terminatedRow).toBeTruthy();
    expect(terminatedRow?.lastKnownStatus).toBe("IDLE");

    const secondSend = await execGraphql<{
      sendMessageToTeam: { success: boolean; teamRunId: string };
    }>(sendMutation, {
      input: {
        userInput: {
          content: "resume team",
          contextFiles: null,
        },
        teamRunId,
        targetMemberName: "coordinator",
      },
    });
    expect(secondSend.sendMessageToTeam.success).toBe(true);
    expect(secondSend.sendMessageToTeam.teamRunId).toBe(teamRunId);
    expect(createTeamRunWithIdSpy).toHaveBeenCalledTimes(2);
    expect(ingressDispatchSpy).toHaveBeenCalledTimes(2);

    const listed = await execGraphql<{
      listTeamRunHistory: Array<{ teamRunId: string; lastKnownStatus: string; summary: string }>;
    }>(listQuery);
    const row = listed.listTeamRunHistory.find((item) => item.teamRunId === teamRunId);
    expect(row).toBeTruthy();
    expect(row?.lastKnownStatus).toBe("ACTIVE");
    expect(row?.summary).toContain("resume team");
  });
});
