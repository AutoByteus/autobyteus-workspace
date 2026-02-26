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

describe("Team member projection contract e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempRoot: string;
  let memoryDir: string;
  let indexFilePath: string;
  let originalMemoryDirEnv: string | undefined;

  const activeTeams = new Set<string>();
  const createdTeamIds = new Set<string>();
  const createdMemberDirs = new Set<string>();

  let createTeamRunWithIdSpy: ReturnType<typeof vi.spyOn> | null = null;
  let terminateTeamRunSpy: ReturnType<typeof vi.spyOn> | null = null;
  let getTeamRunSpy: ReturnType<typeof vi.spyOn> | null = null;
  let ingressDispatchSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-team-member-projection-e2e-"));
    originalMemoryDirEnv = process.env.AUTOBYTEUS_MEMORY_DIR;
    memoryDir = path.join(tempRoot, "memory");
    process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;
    fs.mkdirSync(memoryDir, { recursive: true });
    indexFilePath = path.join(memoryDir, "team_run_history_index.json");

    const teamManager = AgentTeamRunManager.getInstance();
    createTeamRunWithIdSpy = vi
      .spyOn(teamManager, "createTeamRunWithId")
      .mockImplementation(async (teamRunId: string, _teamDefinitionId: string, memberConfigs: any[]) => {
        activeTeams.add(teamRunId);
        createdTeamIds.add(teamRunId);

        for (const memberConfig of memberConfigs) {
          const memberAgentId =
            typeof memberConfig?.memberAgentId === "string" ? memberConfig.memberAgentId.trim() : "";
          if (!memberAgentId) {
            continue;
          }
          const memberDir =
            typeof memberConfig?.memoryDir === "string" && memberConfig.memoryDir.trim().length > 0
              ? memberConfig.memoryDir.trim()
              : path.join(memoryDir, "agent_teams", teamRunId, memberAgentId);
          createdMemberDirs.add(memberDir);
          fs.mkdirSync(memberDir, { recursive: true });
          fs.writeFileSync(
            path.join(memberDir, "raw_traces.jsonl"),
            [
              JSON.stringify({
                trace_type: "user",
                content: `hello ${memberConfig.memberName}`,
                turn_id: "turn_1",
                seq: 1,
                ts: 1_700_000_000,
              }),
              JSON.stringify({
                trace_type: "assistant",
                content: `hi from ${memberConfig.memberName}`,
                turn_id: "turn_1",
                seq: 2,
                ts: 1_700_000_001,
              }),
            ].join("\n") + "\n",
            "utf-8",
          );
        }

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
        teamRunId: "stub-team",
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

    for (const memberDir of createdMemberDirs) {
      fs.rmSync(memberDir, { recursive: true, force: true });
    }
    createdMemberDirs.clear();
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

  it("keeps manifest member IDs aligned with runtime projection IDs", async () => {
    const sendMutation = `
      mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
        sendMessageToTeam(input: $input) {
          success
          teamRunId
        }
      }
    `;

    const sent = await execGraphql<{
      sendMessageToTeam: { success: boolean; teamRunId: string };
    }>(sendMutation, {
      input: {
        userInput: {
          content: "start team",
          contextFiles: null,
        },
        teamDefinitionId: "def-projection",
        targetMemberName: "professor",
        memberConfigs: [
          {
            memberName: "professor",
            agentDefinitionId: "agent-def-professor",
            llmModelIdentifier: "gpt-4o-mini",
            autoExecuteTools: false,
          },
          {
            memberName: "student",
            agentDefinitionId: "agent-def-student",
            llmModelIdentifier: "gpt-4o-mini",
            autoExecuteTools: false,
          },
        ],
      },
    });

    expect(sent.sendMessageToTeam.success).toBe(true);
    expect(createTeamRunWithIdSpy).toHaveBeenCalledTimes(1);
    const teamRunId = sent.sendMessageToTeam.teamRunId;
    const createdCall = createTeamRunWithIdSpy?.mock.calls[0];
    const createdMemberConfigs = (createdCall?.[2] ?? []) as Array<{
      memberName: string;
      memberRouteKey: string;
      memberAgentId: string;
      memoryDir?: string;
    }>;
    expect(createdMemberConfigs).toHaveLength(2);
    expect(createdMemberConfigs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberName: "professor",
          memberRouteKey: "professor",
          memberAgentId: buildTeamMemberAgentId(teamRunId, "professor"),
          memoryDir: expect.stringContaining(
            `/agent_teams/${teamRunId}/${buildTeamMemberAgentId(teamRunId, "professor")}`,
          ),
        }),
        expect.objectContaining({
          memberName: "student",
          memberRouteKey: "student",
          memberAgentId: buildTeamMemberAgentId(teamRunId, "student"),
          memoryDir: expect.stringContaining(
            `/agent_teams/${teamRunId}/${buildTeamMemberAgentId(teamRunId, "student")}`,
          ),
        }),
      ]),
    );

    const resumeQuery = `
      query GetTeamRunResumeConfig($teamRunId: String!) {
        getTeamRunResumeConfig(teamRunId: $teamRunId) {
          teamRunId
          manifest
        }
      }
    `;
    const resumed = await execGraphql<{
      getTeamRunResumeConfig: {
        teamRunId: string;
        manifest: {
          memberBindings: Array<{
            memberRouteKey: string;
            memberAgentId: string;
          }>;
        };
      };
    }>(resumeQuery, { teamRunId });

    const manifestBindings = resumed.getTeamRunResumeConfig.manifest.memberBindings;
    for (const member of createdMemberConfigs) {
      const manifestBinding = manifestBindings.find(
        (binding) => binding.memberRouteKey === member.memberRouteKey,
      );
      expect(manifestBinding?.memberAgentId).toBe(member.memberAgentId);
    }

    const projectionQuery = `
      query GetTeamMemberRunProjection($teamRunId: String!, $memberRouteKey: String!) {
        getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
          runId
          conversation
        }
      }
    `;
    for (const member of createdMemberConfigs) {
      const projection = await execGraphql<{
        getTeamMemberRunProjection: {
          runId: string;
          conversation: Array<Record<string, unknown>>;
        };
      }>(projectionQuery, { teamRunId, memberRouteKey: member.memberRouteKey });
      expect(projection.getTeamMemberRunProjection.runId).toBe(member.memberAgentId);
      expect(projection.getTeamMemberRunProjection.conversation.length).toBeGreaterThan(0);
    }
  });
});
