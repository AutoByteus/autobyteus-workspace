import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { TeamRunManifestStore } from "../../../src/run-history/store/team-run-manifest-store.js";

const writeJson = async (filePath: string, payload: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload), "utf-8");
};

const writeJsonl = async (filePath: string, payloads: unknown[]): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, payloads.map((item) => JSON.stringify(item)).join("\n"), "utf-8");
};

describe("Memory GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  const execGraphql = async <T>(
    source: string,
    variableValues?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source,
      variableValues,
    });

    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it("returns team memory index and team member memory view", async () => {
    const memoryDir = appConfigProvider.config.getMemoryDir();
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const teamRunId = `team-memory-${unique}`;
    const memberRunId = `member-memory-${unique}`;

    const manifestStore = new TeamRunManifestStore(memoryDir);
    await manifestStore.writeManifest(teamRunId, {
      teamRunId,
      teamDefinitionId: `team-def-${unique}`,
      teamDefinitionName: `Memory Team ${unique}`,
      workspaceRootPath: null,
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberBindings: [
        {
          memberRouteKey: "coordinator",
          memberName: "Coordinator",
          memberRunId,
          runtimeKind: "autobyteus",
          runtimeReference: null,
          agentDefinitionId: `agent-def-${unique}`,
          llmModelIdentifier: "test-model",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
        },
      ],
    });

    const memberDir = path.join(memoryDir, "agent_teams", teamRunId, memberRunId);
    await writeJson(path.join(memberDir, "working_context_snapshot.json"), {
      messages: [{ role: "user", content: "hello from team memory" }],
    });
    await writeJsonl(path.join(memberDir, "raw_traces.jsonl"), [
      { trace_type: "user", content: "hello from team memory", ts: 1, turn_id: "t1", seq: 1 },
    ]);

    const listResult = await execGraphql<{
      listTeamRunMemorySnapshots: {
        entries: Array<{
          teamRunId: string;
          members: Array<{
            memberRunId: string;
            hasWorkingContext: boolean;
          }>;
        }>;
      };
    }>(
      `
      query ListTeamRunMemorySnapshots($search: String) {
        listTeamRunMemorySnapshots(search: $search) {
          entries {
            teamRunId
            members {
              memberRunId
              hasWorkingContext
            }
          }
        }
      }
      `,
      { search: unique },
    );

    expect(listResult.listTeamRunMemorySnapshots.entries.length).toBeGreaterThan(0);
    const teamEntry = listResult.listTeamRunMemorySnapshots.entries.find(
      (entry) => entry.teamRunId === teamRunId,
    );
    expect(teamEntry).toBeTruthy();
    expect(teamEntry?.members[0]?.memberRunId).toBe(memberRunId);
    expect(teamEntry?.members[0]?.hasWorkingContext).toBe(true);

    const viewResult = await execGraphql<{
      getTeamMemberRunMemoryView: {
        runId: string;
        workingContext: Array<{ role: string; content: string | null }>;
      };
    }>(
      `
      query GetTeamMemberRunMemoryView($teamRunId: String!, $memberRunId: String!) {
        getTeamMemberRunMemoryView(teamRunId: $teamRunId, memberRunId: $memberRunId) {
          runId
          workingContext {
            role
            content
          }
        }
      }
      `,
      { teamRunId, memberRunId },
    );

    expect(viewResult.getTeamMemberRunMemoryView.runId).toBe(memberRunId);
    expect(viewResult.getTeamMemberRunMemoryView.workingContext[0]?.role).toBe("user");
  });

  it("keeps legacy agent memory queries working", async () => {
    const memoryDir = appConfigProvider.config.getMemoryDir();
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const runId = `agent-memory-${unique}`;
    const runDir = path.join(memoryDir, "agents", runId);

    await writeJson(path.join(runDir, "working_context_snapshot.json"), {
      messages: [{ role: "user", content: "hello from agent memory" }],
    });

    const listResult = await execGraphql<{
      listRunMemorySnapshots: {
        entries: Array<{ runId: string }>;
      };
    }>(
      `
      query ListRunMemorySnapshots($search: String) {
        listRunMemorySnapshots(search: $search) {
          entries {
            runId
          }
        }
      }
      `,
      { search: unique },
    );

    expect(listResult.listRunMemorySnapshots.entries.some((entry) => entry.runId === runId)).toBe(true);

    const viewResult = await execGraphql<{
      getRunMemoryView: {
        runId: string;
        workingContext: Array<{ role: string; content: string | null }>;
      };
    }>(
      `
      query GetRunMemoryView($runId: String!) {
        getRunMemoryView(runId: $runId) {
          runId
          workingContext {
            role
            content
          }
        }
      }
      `,
      { runId },
    );

    expect(viewResult.getRunMemoryView.runId).toBe(runId);
    expect(viewResult.getRunMemoryView.workingContext[0]?.role).toBe("user");
  });
});
