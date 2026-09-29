import "reflect-metadata";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

/**
 * AC-019 / AC-002: the task lifecycle's public API surface is gone from the running
 * studio server. Only `delegate_task` remains; there is no task query, no task
 * record type, and no task reference-content route.
 */
describe("Task delegation public API surface on the running studio server", () => {
  let testDataDir: string | null = null;
  let app: FastifyInstance | null = null;

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "task-delegation-api-surface-e2e-"));
    await writeFile(path.join(testDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    app = (await startStudioE2eRuntimeServer()).fastify;
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    app = null;
    if (testDataDir) await rm(testDataDir, { recursive: true, force: true });
  }, 60_000);

  const postGraphql = async (query: string, variables?: Record<string, unknown>, expectedStatus = 200) => {
    const response = await app!.inject({ method: "POST", url: "/graphql", payload: { query, variables } });
    expect(response.statusCode).toBe(expectedStatus);
    return response.json() as { data?: Record<string, unknown>; errors?: Array<{ message: string }> };
  };

  it("serves no task-delegation query or task record type over GraphQL", async () => {
    const introspection = await postGraphql(`{
      __schema {
        queryType { fields { name } }
        mutationType { fields { name } }
        types { name }
      }
    }`);
    expect(introspection.errors).toBeUndefined();
    const schema = introspection.data!.__schema as {
      queryType: { fields: Array<{ name: string }> };
      mutationType: { fields: Array<{ name: string }> };
      types: Array<{ name: string }>;
    };
    const operationNames = [...schema.queryType.fields, ...schema.mutationType.fields].map((field) => field.name);
    expect(operationNames).toContain("getTeamRunExecutionCheckpoint");
    expect(operationNames).not.toContain("getTaskDelegationRecords");
    expect(operationNames.filter((name) => /taskDelegation|taskRecord|delegatedTask/i.test(name))).toEqual([]);
    expect(schema.types.map((type) => type.name).filter((name) => /TaskDelegation|TaskRecord/i.test(name))).toEqual([]);

    // The removed query fails schema validation (HTTP 400) instead of resolving.
    const removedQuery = await postGraphql(`{ getTaskDelegationRecords(teamRunId: "any") { taskId } }`, undefined, 400);
    expect(removedQuery.errors?.[0]?.message).toMatch(/Cannot query field "getTaskDelegationRecords"/);
  });

  it("registers no task reference-content REST route for Team or Org roots", async () => {
    for (const url of [
      "/rest/team-runs/team-run-1/task-delegations/task-1/references/reference-1/content",
      "/rest/agent-org-runs/org-run-1/task-delegations/task-1/references/reference-1/content",
    ]) {
      const response = await app!.inject({ method: "GET", url });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ message: `Route GET:${url} not found` });
    }

    // The retained Org communication reference route is still registered (it answers for the resource, not the route).
    const retained = "/rest/agent-org-runs/org-run-1/communication/messages/message-1/references/reference-1/content";
    const retainedResponse = await app!.inject({ method: "GET", url: retained });
    expect(JSON.stringify(retainedResponse.json())).not.toContain(`Route GET:${retained} not found`);
  });

  it("lists delegate_task as the only task-delegation tool in the LOCAL tool catalog", async () => {
    const result = await postGraphql(`query LocalTools($origin: ToolOriginEnum!) { tools(origin: $origin) { name } }`, {
      origin: "LOCAL",
    });
    expect(result.errors).toBeUndefined();
    const toolNames = (result.data!.tools as Array<{ name: string }>).map((tool) => tool.name);
    expect(toolNames).toContain("delegate_task");
    expect(toolNames).toContain("send_message_to");
    expect(toolNames).not.toContain("submit_task_result");
    expect(toolNames).not.toContain("review_task_result");
  });
});
