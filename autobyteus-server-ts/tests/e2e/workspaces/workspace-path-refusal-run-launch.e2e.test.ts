/**
 * A run launched in a workspace folder that is not registered and does not exist (autobyteus-426 REQ-008, RR-03).
 *
 * Purpose: the workspace folder check applies to the server-internal registration a run launch makes
 * (`AgentRunProvisioningService` → `WorkspaceManager.ensureWorkspaceByRootPath`), not only to `createWorkspace`:
 * the launch is refused with the folder reason at registration, before any runtime starts, and nothing is registered.
 *
 * Prerequisites: none (an in-process studio server on a test-owned data folder; no runtime or provider is reached).
 *
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/workspace-path-refusal-run-launch.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

describe("Run launch in an unregistered missing workspace folder", () => {
  let dataDir: string;
  let server: Awaited<ReturnType<typeof startStudioE2eRuntimeServer>>;

  const graphql = async (query: string, variables: Record<string, unknown>) => {
    const response = await fetch(new URL("/graphql", server.mainUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    return await response.json() as { data?: any; errors?: Array<{ message: string }> };
  };

  beforeAll(async () => {
    dataDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "workspace-path-refusal-run-")));
    fs.writeFileSync(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    server = await startStudioE2eRuntimeServer();
  }, 120_000);

  afterAll(async () => {
    await server?.fastify.close();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it("refuses the launch at workspace registration with the folder reason and registers nothing", async () => {
    const created = await graphql(`
      mutation CreateAgent($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }
    `, {
      input: {
        name: "Workspace path refusal fixture",
        role: "fixture",
        description: "Owned fixture for autobyteus-426 RR-03",
        instructions: "Do nothing.",
        category: "api-e2e",
      },
    });
    expect(created.errors).toBeUndefined();
    const missing = path.join(dataDir, "deleted-project");

    const launched = await graphql(`
      mutation CreateAgentRun($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }
    `, {
      input: {
        agentDefinitionId: created.data.createAgentDefinition.id,
        workspaceRootPath: missing,
        llmModelIdentifier: "any-model",
        autoExecuteTools: false,
        runtimeKind: "autobyteus",
      },
    });

    expect(launched.data.createAgentRun).toMatchObject({ success: false, runId: null });
    expect(launched.data.createAgentRun.message).toContain("WorkspacePathRefusedError: No folder exists at the workspace path.");
    const registryFile = path.join(dataDir, "workspaces.json");
    const registered = fs.existsSync(registryFile) ? Object.values(JSON.parse(fs.readFileSync(registryFile, "utf8"))) : [];
    expect(registered).not.toContain(missing);
  });
});
