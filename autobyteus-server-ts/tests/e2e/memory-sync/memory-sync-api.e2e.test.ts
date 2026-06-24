import "reflect-metadata";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerMemorySyncRoutes } from "../../../src/api/rest/memory-sync.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { resetMemoryExplorerSourceServiceForTests } from "../../../src/agent-memory/services/memory-explorer-source-service.js";
import { resetLocalFileMemoryHubCredentialStoreForTests } from "../../../src/memory-sync/hub/local-file-memory-hub-credential-store.js";
import { resetLocalFileMemoryImportStoreForTests } from "../../../src/memory-sync/hub/local-file-memory-import-store.js";
import { resetMemoryHubConnectionInfoServiceForTests } from "../../../src/memory-sync/hub/memory-hub-connection-info-service.js";
import { resetMemoryHubCredentialServiceForTests } from "../../../src/memory-sync/hub/memory-hub-credential-service.js";
import { resetMemoryHubIngestionServiceForTests } from "../../../src/memory-sync/hub/memory-hub-ingestion-service.js";
import { resetMemoryImportCatalogServiceForTests } from "../../../src/memory-sync/hub/memory-import-catalog-service.js";
import { resetLocalFileMemorySyncStateStoreForTests } from "../../../src/memory-sync/source/local-file-memory-sync-state-store.js";
import { resetMemorySyncConfigServiceForTests } from "../../../src/memory-sync/source/memory-sync-config-service.js";
import { resetMemorySyncServiceForTests } from "../../../src/memory-sync/source/memory-sync-service.js";
import { resetMemorySyncWorkerForTests } from "../../../src/memory-sync/source/memory-sync-worker.js";
import { resetServerAddressCandidateServiceForTests } from "../../../src/server-addressing/server-address-candidate-service.js";
import type { MemoryFileOperation, MemorySyncBatch } from "../../../src/memory-sync/shared/memory-sync-types.js";

const SOURCE_NODE_ID = "cluster-a__finance__autobyteus-server";

const resetMemorySyncSingletons = () => {
  resetMemoryExplorerSourceServiceForTests();
  resetLocalFileMemoryHubCredentialStoreForTests();
  resetLocalFileMemoryImportStoreForTests();
  resetMemoryHubConnectionInfoServiceForTests();
  resetMemoryHubCredentialServiceForTests();
  resetMemoryHubIngestionServiceForTests();
  resetMemoryImportCatalogServiceForTests();
  resetLocalFileMemorySyncStateStoreForTests();
  resetMemorySyncConfigServiceForTests();
  resetMemorySyncServiceForTests();
  resetMemorySyncWorkerForTests();
  resetServerAddressCandidateServiceForTests();
};

const sha256 = (content: string): string => createHash("sha256").update(content).digest("hex");

const writeText = (filePath: string, content: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
};

const makeOperation = (kind: "agents" | "agent_teams", relativePath: string, content: string): MemoryFileOperation => ({
  opId: `${kind}:${relativePath}`,
  operation: "replace",
  kind,
  relativePath,
  size: Buffer.byteLength(content),
  sha256: sha256(content),
  mtimeMs: 1000,
  contentEncoding: "base64",
  contentBase64: Buffer.from(content).toString("base64"),
});

const makeBatch = (input: {
  batchId: string;
  sourceNodeId?: string;
  operations: MemoryFileOperation[];
}): MemorySyncBatch => ({
  protocolVersion: 1,
  batchId: input.batchId,
  sourceNodeId: input.sourceNodeId ?? SOURCE_NODE_ID,
  sourceDisplayName: "Finance Kubernetes Node",
  sourceEndpoint: "http://source.local:8000",
  generatedAt: new Date(0).toISOString(),
  operations: input.operations,
});

describe("Memory Sync public API and imported memory e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let app: FastifyInstance;
  let tempRoot: string;
  let memoryDir: string;
  let hubBaseUrl: string;
  let sourceToken: string;
  const originalEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const key of ["AUTOBYTEUS_SERVER_HOST", "AUTOBYTEUS_MEMORY_DIR", "AUTOBYTEUS_LOG_DIR"]) {
      originalEnv[key] = process.env[key];
    }

    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-memory-sync-api-"));
    process.env.AUTOBYTEUS_SERVER_HOST = "http://127.0.0.1:37654";
    writeText(path.join(tempRoot, ".env"), "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:37654\nAPP_ENV=test\n");

    appConfigProvider.resetForTests();
    resetMemorySyncSingletons();
    const config = appConfigProvider.initialize({ appDataDir: tempRoot });
    config.initialize();
    memoryDir = config.getMemoryDir();

    app = fastify();
    await app.register(registerMemorySyncRoutes, { prefix: "/rest" });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address() as AddressInfo;
    hubBaseUrl = `http://127.0.0.1:${address.port}`;

    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    await app?.close();
    appConfigProvider.resetForTests();
    resetMemorySyncSingletons();
    for (const [key, value] of Object.entries(originalEnv)) {
      if (typeof value === "string") {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join("\n"));
    }
    return result.data as T;
  };

  const execGraphqlRaw = async (query: string, variables?: Record<string, unknown>) =>
    graphql({ schema, source: query, variableValues: variables });

  it("configures hub/source, syncs local memory through GraphQL to REST, and exposes imported memory by explicit source", async () => {
    const candidates = await execGraphql<{ listMemoryHubUrlCandidates: Array<{ id: string; baseUrl: string }> }>(`
      query Candidates($currentNodeBaseUrl: String!, $manualBaseUrl: String!) {
        listMemoryHubUrlCandidates(currentNodeBaseUrl: $currentNodeBaseUrl, manualBaseUrl: $manualBaseUrl) {
          id
          kind
          label
          baseUrl
          source
        }
      }
    `, { currentNodeBaseUrl: hubBaseUrl, manualBaseUrl: "https://memory-hub.example.test" });
    expect(candidates.listMemoryHubUrlCandidates.map((candidate) => candidate.id)).toEqual(
      expect.arrayContaining(["configured-public-url", "current-node-url", "docker-host", "manual"]),
    );

    const hubStatus = await execGraphql<{
      updateMemoryHubConfig: {
        hub: { enabled: boolean; advertisedHubBaseUrl: string | null };
        connectionInfo: {
          ingestEndpointUrl: string | null;
          healthEndpointUrl: string | null;
          credentials: Array<{ credentialId: string; status: string; boundSourceNodeId: string | null }>;
        };
        oneTimePlaintextToken: string | null;
      };
    }>(`
      mutation EnableHub($input: UpdateMemoryHubConfigInput!) {
        updateMemoryHubConfig(input: $input) {
          hub { enabled advertisedHubBaseUrl }
          connectionInfo {
            ingestEndpointUrl
            healthEndpointUrl
            credentials { credentialId status boundSourceNodeId }
          }
          oneTimePlaintextToken
        }
      }
    `, { input: { enabled: true, advertisedHubBaseUrl: hubBaseUrl } });

    expect(hubStatus.updateMemoryHubConfig.hub).toMatchObject({ enabled: true, advertisedHubBaseUrl: hubBaseUrl });
    expect(hubStatus.updateMemoryHubConfig.connectionInfo.ingestEndpointUrl).toBe(`${hubBaseUrl}/rest/memory-sync/v1/batches`);
    expect(hubStatus.updateMemoryHubConfig.connectionInfo.healthEndpointUrl).toBe(`${hubBaseUrl}/rest/memory-sync/v1/health`);
    expect(hubStatus.updateMemoryHubConfig.connectionInfo.credentials[0]?.status).toBe("active");
    sourceToken = hubStatus.updateMemoryHubConfig.oneTimePlaintextToken ?? "";
    expect(sourceToken).toMatch(/^mhub_/);

    const connectionTest = await execGraphql<{ testMemoryHubConnection: { ok: boolean; hubEnabled: boolean; authenticated: boolean; sourceNodeId: string } }>(`
      mutation TestConnection($input: TestMemoryHubConnectionInput!) {
        testMemoryHubConnection(input: $input) { ok hubEnabled authenticated sourceNodeId }
      }
    `, { input: { mode: "DRAFT", hubBaseUrl, token: sourceToken, sourceNodeId: SOURCE_NODE_ID } });
    expect(connectionTest.testMemoryHubConnection).toEqual({
      ok: true,
      hubEnabled: true,
      authenticated: true,
      sourceNodeId: SOURCE_NODE_ID,
    });

    const sourceStatus = await execGraphql<{ updateMemorySyncSourceConfig: { source: Record<string, unknown>; oneTimePlaintextToken: string | null } }>(`
      mutation ConfigureSource($input: UpdateMemorySyncSourceConfigInput!) {
        updateMemorySyncSourceConfig(input: $input) {
          source {
            enabled
            sourceNodeId
            displayName
            hubBaseUrl
            hubTokenConfigured
            hubTokenPreview
            backgroundEnabled
            batchSize
          }
          oneTimePlaintextToken
        }
      }
    `, {
      input: {
        enabled: true,
        sourceNodeId: SOURCE_NODE_ID,
        displayName: "Finance Kubernetes Node",
        hubBaseUrl,
        hubToken: sourceToken,
        backgroundEnabled: false,
        batchSize: 25,
      },
    });
    expect(sourceStatus.updateMemorySyncSourceConfig.source).toMatchObject({
      enabled: true,
      sourceNodeId: SOURCE_NODE_ID,
      hubBaseUrl,
      hubTokenConfigured: true,
      hubTokenPreview: "••••••••",
    });
    expect(sourceStatus.updateMemorySyncSourceConfig.oneTimePlaintextToken).toBeNull();
    expect(JSON.stringify(sourceStatus)).not.toContain(sourceToken);
    expect(Object.prototype.hasOwnProperty.call(sourceStatus.updateMemorySyncSourceConfig.source, "hubToken")).toBe(false);

    const savedConnectionTest = await execGraphql<{ testMemoryHubConnection: { ok: boolean; hubEnabled: boolean; authenticated: boolean; sourceNodeId: string } }>(`
      mutation TestSavedConnection($input: TestMemoryHubConnectionInput!) {
        testMemoryHubConnection(input: $input) { ok hubEnabled authenticated sourceNodeId }
      }
    `, {
      input: {
        mode: "SAVED",
        hubBaseUrl: "http://127.0.0.1:9",
        token: "mhub_poisoned_draft_token",
        sourceNodeId: "poisoned-draft-source",
      },
    });
    expect(savedConnectionTest.testMemoryHubConnection).toEqual({
      ok: true,
      hubEnabled: true,
      authenticated: true,
      sourceNodeId: SOURCE_NODE_ID,
    });

    const localRunId = "source-local-run";
    await new AgentRunMetadataStore(memoryDir).writeMetadata(localRunId, {
      runId: localRunId,
      agentDefinitionId: "source-local-agent",
      workspaceRootPath: "/workspace/source-node",
      memoryDir: path.join(memoryDir, "agents", localRunId),
      llmModelIdentifier: "model-a",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: null,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
      startedAt: "2026-06-23T00:00:00.000Z",
    });
    writeText(path.join(memoryDir, "agents", localRunId, "raw_traces.jsonl"), JSON.stringify({
      id: "local-trace",
      traceType: "user",
      sourceEvent: "AgentRun.postUserMessage",
      content: "local source trace",
      turnId: "t1",
      seq: 1,
      ts: 1,
    }) + "\n");
    writeText(path.join(memoryDir, "agents", localRunId, "ignored.partial"), "do not sync");
    writeText(path.join(memoryDir, "agent_teams", "source-team-run", "team_run_metadata.json"), JSON.stringify({
      schemaVersion: 1,
      teamRunId: "source-team-run",
      teamDefinitionId: "source-team",
      teamDefinitionName: "Source Team",
      coordinatorMemberRouteKey: "lead",
      createdAt: "2026-06-23T00:00:00.000Z",
      memberTree: [],
    }));
    writeText(path.join(memoryDir, "imports", "echo-source", "agents", "must-not-sync.txt"), "echo");

    const runResult = await execGraphql<{ startMemorySync: { scannedFiles: number; changedFiles: number; committedBatches: number; duplicateBatches: number; deferredFiles: number } }>(`
      mutation StartSync {
        startMemorySync { scannedFiles changedFiles committedBatches duplicateBatches deferredFiles }
      }
    `);
    expect(runResult.startMemorySync).toMatchObject({ committedBatches: 1, duplicateBatches: 0, deferredFiles: 0 });
    expect(runResult.startMemorySync.scannedFiles).toBeGreaterThanOrEqual(3);
    expect(runResult.startMemorySync.changedFiles).toBeGreaterThanOrEqual(3);

    const importRoot = path.join(memoryDir, "imports", SOURCE_NODE_ID);
    expect(fs.readFileSync(path.join(importRoot, "agents", localRunId, "raw_traces.jsonl"), "utf-8")).toContain("local source trace");
    expect(fs.existsSync(path.join(importRoot, "agents", localRunId, "ignored.partial"))).toBe(false);
    expect(fs.existsSync(path.join(importRoot, "agent_teams", "source-team-run", "team_run_metadata.json"))).toBe(true);
    expect(fs.existsSync(path.join(importRoot, "imports", "echo-source", "agents", "must-not-sync.txt"))).toBe(false);

    const statusAfterSync = await execGraphql<{
      getMemorySyncStatus: {
        sourceState: { jobState: string; lastSuccessfulSyncAt: string | null; lastError: string | null; trackedFileCount: number } | null;
        imports: Array<{ sourceNodeId: string; fileCount: number; lastCommittedBatchId: string | null }>;
        oneTimePlaintextToken: string | null;
      };
    }>(`
      query Status {
        getMemorySyncStatus {
          sourceState { jobState lastSuccessfulSyncAt lastError trackedFileCount }
          imports { sourceNodeId fileCount lastCommittedBatchId }
          oneTimePlaintextToken
        }
      }
    `);
    expect(statusAfterSync.getMemorySyncStatus.sourceState?.jobState).toBe("success");
    expect(statusAfterSync.getMemorySyncStatus.sourceState?.lastSuccessfulSyncAt).toEqual(expect.any(String));
    expect(statusAfterSync.getMemorySyncStatus.sourceState?.lastError).toBeNull();
    expect(statusAfterSync.getMemorySyncStatus.sourceState?.trackedFileCount).toBeGreaterThanOrEqual(3);
    expect(statusAfterSync.getMemorySyncStatus.imports.find((item) => item.sourceNodeId === SOURCE_NODE_ID)?.fileCount).toBeGreaterThanOrEqual(3);
    expect(statusAfterSync.getMemorySyncStatus.oneTimePlaintextToken).toBeNull();
    const lastSuccessfulSyncAt = statusAfterSync.getMemorySyncStatus.sourceState?.lastSuccessfulSyncAt;

    const importedOnlyMetadata = JSON.stringify({
      runId: "rest-only-run",
      agentDefinitionId: "rest-only-agent",
      workspaceRootPath: "/workspace/rest-only",
      memoryDir: "/source/absolute/path/rest-only-run",
      llmModelIdentifier: "model-a",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: null,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
      startedAt: "2026-06-23T01:00:00.000Z",
    });
    const importedOnlyTrace = JSON.stringify({
      id: "rest-trace",
      traceType: "user",
      sourceEvent: "AgentRun.postUserMessage",
      content: "imported-only trace",
      turnId: "t-imported",
      seq: 1,
      ts: 10,
    }) + "\n";
    const restBatch = makeBatch({
      batchId: "rest-duplicate-batch",
      operations: [
        makeOperation("agents", "rest-only-run/run_metadata.json", importedOnlyMetadata),
        makeOperation("agents", "rest-only-run/raw_traces.jsonl", importedOnlyTrace),
      ],
    });
    const postBatch = async (batch: MemorySyncBatch) => fetch(`${hubBaseUrl}/rest/memory-sync/v1/batches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sourceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });
    const firstRestCommit = await postBatch(restBatch);
    const firstRestJson = await firstRestCommit.json() as { duplicate: boolean; operationCount: number };
    const duplicateRestCommit = await postBatch(restBatch);
    const duplicateRestJson = await duplicateRestCommit.json() as { duplicate: boolean; operationCount: number };
    expect(firstRestCommit.status).toBe(200);
    expect(firstRestJson).toMatchObject({ duplicate: false, operationCount: 2 });
    expect(duplicateRestCommit.status).toBe(200);
    expect(duplicateRestJson).toMatchObject({ duplicate: true, operationCount: 2 });

    const wrongSourceHealth = await fetch(`${hubBaseUrl}/rest/memory-sync/v1/health?sourceNodeId=other-source`, {
      headers: { Authorization: `Bearer ${sourceToken}` },
    });
    expect(wrongSourceHealth.status).toBe(403);
    expect(await wrongSourceHealth.json()).toMatchObject({ error: "MemoryHubCredentialError" });

    const badPathBatch = makeBatch({
      batchId: "rest-bad-path",
      operations: [makeOperation("agents", "../escape.txt", "escape")],
    });
    const badPathResponse = await postBatch(badPathBatch);
    expect(badPathResponse.status).toBe(400);
    expect(fs.existsSync(path.join(memoryDir, "imports", "escape.txt"))).toBe(false);

    const sourceInput = { type: "IMPORTED", sourceNodeId: SOURCE_NODE_ID };
    const sources = await execGraphql<{ listMemoryExplorerSources: Array<{ key: string; type: string; sourceNodeId: string | null; readOnly: boolean }> }>(`
      query Sources {
        listMemoryExplorerSources { key type sourceNodeId readOnly lastSyncStatus }
      }
    `);
    expect(sources.listMemoryExplorerSources).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "local", type: "LOCAL", readOnly: false }),
      expect.objectContaining({ key: `imported:${SOURCE_NODE_ID}`, type: "IMPORTED", sourceNodeId: SOURCE_NODE_ID, readOnly: true }),
    ]));

    const localOnlySearch = await execGraphql<{ listAgentsWithMemory: { total: number } }>(`
      query LocalSearch($search: String!) {
        listAgentsWithMemory(search: $search, page: 1, pageSize: 10) { total }
      }
    `, { search: "rest-only-agent" });
    expect(localOnlySearch.listAgentsWithMemory.total).toBe(0);

    const importedAgents = await execGraphql<{
      listAgentsWithMemory: { total: number; entries: Array<{ agentDefinitionId: string | null; runCount: number; memory: { hasRawTraces: boolean } }> };
    }>(`
      query ImportedAgents($source: MemoryExplorerSourceInput!, $search: String!) {
        listAgentsWithMemory(source: $source, search: $search, page: 1, pageSize: 10) {
          entries { agentDefinitionId runCount memory { hasRawTraces } }
          total
        }
      }
    `, { source: sourceInput, search: "rest-only-agent" });
    expect(importedAgents.listAgentsWithMemory.total).toBe(1);
    expect(importedAgents.listAgentsWithMemory.entries[0]).toMatchObject({
      agentDefinitionId: "rest-only-agent",
      runCount: 1,
      memory: { hasRawTraces: true },
    });

    const importedView = await execGraphql<{ getAgentRunMemoryView: { runId: string; rawTraces: Array<{ id: string | null; content: string | null }> } }>(`
      query ImportedView($source: MemoryExplorerSourceInput!, $runId: String!) {
        getAgentRunMemoryView(source: $source, runId: $runId, includeRawTraces: true) {
          runId
          rawTraces { id content }
        }
      }
    `, { source: sourceInput, runId: "rest-only-run" });
    expect(importedView.getAgentRunMemoryView.runId).toBe("rest-only-run");
    expect(importedView.getAgentRunMemoryView.rawTraces).toEqual([
      expect.objectContaining({ id: "rest-trace", content: "imported-only trace" }),
    ]);

    const missingSourceResult = await execGraphqlRaw(`
      query MissingSource($source: MemoryExplorerSourceInput!) {
        listAgentsWithMemory(source: $source, search: null, page: 1, pageSize: 10) { total }
      }
    `, { source: { type: "IMPORTED", sourceNodeId: "missing-source" } });
    expect(missingSourceResult.errors?.[0]?.message).toContain("Imported memory source 'missing-source' was not found");

    await execGraphql(`
      mutation PoisonSourceToken($input: UpdateMemorySyncSourceConfigInput!) {
        updateMemorySyncSourceConfig(input: $input) { source { hubTokenConfigured } }
      }
    `, { input: { hubToken: "mhub_invalid_for_latest_error_probe" } });
    writeText(path.join(memoryDir, "agents", localRunId, "latest-error-probe.txt"), "force a changed file for the failed sync");

    const failedSync = await execGraphqlRaw(`
      mutation StartFailedSync {
        startMemorySync { committedBatches }
      }
    `);
    expect(failedSync.errors?.[0]?.message).toContain("Memory Hub source token is invalid");

    const statusAfterFailedSync = await execGraphql<{
      getMemorySyncStatus: {
        sourceState: { jobState: string; lastSuccessfulSyncAt: string | null; lastError: string | null } | null;
      };
    }>(`
      query StatusAfterFailedSync {
        getMemorySyncStatus {
          sourceState { jobState lastSuccessfulSyncAt lastError }
        }
      }
    `);
    expect(statusAfterFailedSync.getMemorySyncStatus.sourceState).toMatchObject({
      jobState: "error",
      lastSuccessfulSyncAt,
      lastError: "Memory Hub source token is invalid.",
    });
  });
});
