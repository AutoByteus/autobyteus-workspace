import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";

const listWorkspaceRunHistory = vi.hoisted(() => vi.fn(async (_limitPerAgent?: number | null) => []));
const getWorkspaceRunHistory = vi.hoisted(() => vi.fn(async (root: string, _limitPerAgent?: number | null) => ({
  workspaceRootPath: root, workspaceName: "ws", agentDefinitions: [], teamDefinitions: [],
})));
vi.mock("../../../../src/run-history/services/workspace-run-history-service.js", () => ({
  getWorkspaceRunHistoryService: () => ({ listWorkspaceRunHistory, getWorkspaceRunHistory }),
}));
// The resolver's other services, built in its constructor, are not used here.
vi.mock("../../../../src/run-history/services/agent-run-history-service.js", () => ({ getAgentRunHistoryService: () => ({}) }));
vi.mock("../../../../src/run-history/services/agent-run-view-projection-service.js", () => ({ getAgentRunViewProjectionService: () => ({}) }));
vi.mock("../../../../src/workspaces/workspace-manager.js", () => ({
  getWorkspaceManager: () => ({ getWorkspaceRootPathForHistory: async () => "/work/a" }),
}));
vi.mock("../../../../src/api/graphql/studio-application-api-services.js", async (importOriginal) => ({
  ...(await importOriginal<object>()), getStudioRunModelConfigService: () => ({}),
}));

import { buildGraphqlSchema } from "../../../../src/api/graphql/schema.js";

/**
 * The history read window (workspace-tree-vs-chooser DS-002, ported from autobyteus-378): `limitPerAgent` omitted keeps
 * the 6 newest per agent; an explicit null, as an argument or a variable, reads every run.
 */
describe("run history read window", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    graphql = (await import(require.resolve("graphql", { paths: [typeGraphqlRoot] }))).graphql as typeof graphqlFn;
  });
  beforeEach(() => {
    listWorkspaceRunHistory.mockClear();
    getWorkspaceRunHistory.mockClear();
  });

  const run = async (spy: typeof listWorkspaceRunHistory | typeof getWorkspaceRunHistory, argIndex: number,
    source: string, variableValues?: Record<string, unknown>) => {
    const result = await graphql({ schema, source, variableValues });
    expect(result.errors?.map((error) => error.message)).toBeUndefined();
    return (spy.mock.calls.at(-1) as unknown[] | undefined)?.[argIndex];
  };

  describe("listWorkspaceRunHistory", () => {
    const list = (source: string, variables?: Record<string, unknown>) => run(listWorkspaceRunHistory, 0, source, variables);
    it("omitted: the default 6", async () => {
      await expect(list("{ listWorkspaceRunHistory { workspaceRootPath } }")).resolves.toBe(6);
    });
    it("an explicit null argument: every run", async () => {
      await expect(list("{ listWorkspaceRunHistory(limitPerAgent: null) { workspaceRootPath } }")).resolves.toBeNull();
    });
    it("a null variable: every run; a number: that window", async () => {
      const source = "query($limit: Int) { listWorkspaceRunHistory(limitPerAgent: $limit) { workspaceRootPath } }";
      await expect(list(source, { limit: null })).resolves.toBeNull();
      await expect(list(source, { limit: 5 })).resolves.toBe(5);
    });
  });

  describe("workspaceRunHistory", () => {
    const one = (source: string, variables?: Record<string, unknown>) => run(getWorkspaceRunHistory, 1, source, variables);
    it("omitted: the default 6", async () => {
      await expect(one('{ workspaceRunHistory(workspaceId: "agent_ws_a") { workspaceRootPath } }')).resolves.toBe(6);
    });
    it("an explicit null argument or variable: every run", async () => {
      await expect(one('{ workspaceRunHistory(workspaceId: "agent_ws_a", limitPerAgent: null) { workspaceRootPath } }')).resolves.toBeNull();
      const source = 'query($limit: Int) { workspaceRunHistory(workspaceId: "agent_ws_a", limitPerAgent: $limit) { workspaceRootPath } }';
      await expect(one(source, { limit: null })).resolves.toBeNull();
    });
  });
});
