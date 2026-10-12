/**
 * Saved model selections that name the removed remote AutoByteus provider.
 *
 * Purpose: identifiers such as `gpt-4o:autobyteus@host:8000` were valid while the
 * remote AutoByteus LLM provider existed and may remain in saved work. After the
 * removal they must be treated as unavailable: launching a native AutoByteus
 * runtime run with one is refused, and a stopped run that saved one stays listed
 * with its value but cannot be restored. The saved value is never cleared or
 * silently replaced. The native runtime itself keeps working.
 *
 * Boundary: the built server (`dist/app.js`) on a test-owned runtime root and
 * SQLite database, driven over HTTP GraphQL across a real restart. The stopped
 * run's metadata is rewritten to the shape a provider-era run carried, while the
 * server is stopped.
 *
 * Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree.
 * Run: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/removed-remote-provider-saved-selection-graphql.e2e.test.ts --no-watch`
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Message, MessageRole } from 'autobyteus-ts/llm/utils/messages.js';
import { WorkingContextFinalizer } from 'autobyteus-ts/memory/working-context-finalizer.js';
import { WorkingContextSnapshotSerializer } from 'autobyteus-ts/memory/working-context-snapshot-serializer.js';
import {
  createSanitizedTestEnvironment,
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type DatabaseLocation = ReturnType<typeof resolveTestDatabaseLocation>;
type RunResult = { success: boolean; message: string; runId: string | null };

const REMOTE_LLM_IDENTIFIER = 'gpt-4o:autobyteus@remote-llm.example.invalid:8000';

const ownedServers = new Set<RunningTestServer>();
const ownedTargets: Array<{ runtimeRoot: string; database: DatabaseLocation }> = [];

afterEach(async () => {
  for (const server of [...ownedServers]) {
    if (server.child.exitCode === null) {
      await server.stop().catch(() => server.child.kill('SIGKILL'));
    }
    ownedServers.delete(server);
  }
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

const makeTarget = () => {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runtimeRoot = path.join(testRuntimeRoot, `removed-remote-selection-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/removed-remote-selection-${suffix}.db`);
  const isolatedHome = path.join(runtimeRoot, 'isolated-home');
  fs.mkdirSync(isolatedHome, { recursive: true, mode: 0o700 });
  ownedTargets.push({ runtimeRoot, database });
  return { runtimeRoot, database, isolatedHome };
};

const startServer = async (target: ReturnType<typeof makeTarget>): Promise<RunningTestServer> => {
  const server = await startBuiltTestServer({
    runtimeRoot: target.runtimeRoot,
    databaseUrlOverride: target.database.databaseUrl,
    environment: createSanitizedTestEnvironment({
      HOME: target.isolatedHome,
      OLLAMA_HOSTS: 'http://127.0.0.1:9',
      LMSTUDIO_HOSTS: 'http://127.0.0.1:9',
    }),
  });
  ownedServers.add(server);
  return server;
};

const stopServer = async (server: RunningTestServer): Promise<void> => {
  await server.stop();
  ownedServers.delete(server);
};

const createAgentDefinition = async (serverUrl: string): Promise<string> => {
  const result = await executeGraphql<{ createAgentDefinition: { id: string } }>(serverUrl, `
    mutation CreateRemoteSelectionAgent($input: CreateAgentDefinitionInput!) {
      createAgentDefinition(input: $input) { id }
    }
  `, {
    input: {
      name: `removed-remote-selection-${Date.now()}`,
      role: 'Removed remote provider saved-selection fixture',
      description: 'Owned deterministic API/E2E fixture',
      instructions: 'Do not perform work until explicitly messaged.',
      category: 'api-e2e',
    },
  });
  return result.createAgentDefinition.id;
};

const currentApiModel = async (serverUrl: string): Promise<string> => {
  const result = await executeGraphql<{
    providerModelCatalogSnapshots: Array<{
      ownerProvider: { id: string };
      llmModels: Array<{ modelIdentifier: string; providerName: string; runtime: string }>;
    }>;
  }>(serverUrl, `
    query RemoteSelectionModels {
      providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
        ownerProvider { id }
        llmModels { modelIdentifier providerName runtime }
      }
    }
  `);
  expect(result.providerModelCatalogSnapshots.map(({ ownerProvider }) => ownerProvider.id)).not.toContain('AUTOBYTEUS');
  const model = result.providerModelCatalogSnapshots
    .flatMap((snapshot) => snapshot.llmModels)
    .find((candidate) => candidate.modelIdentifier === 'gpt-5.6-luna');
  if (!model) throw new Error('REMOTE_SELECTION_E2E_CURRENT_MODEL_MISSING');
  expect(model.runtime).toBe('api');
  return model.modelIdentifier;
};

const createAgentRun = (serverUrl: string, input: Record<string, unknown>) => executeGraphql<{
  createAgentRun: RunResult;
}>(serverUrl, `
  mutation CreateRemoteSelectionRun($input: CreateAgentRunInput!) {
    createAgentRun(input: $input) { success message runId }
  }
`, { input }).then((result) => result.createAgentRun);

const restoreAgentRun = (serverUrl: string, runId: string) => executeGraphql<{
  restoreAgentRun: RunResult;
}>(serverUrl, `
  mutation RestoreRemoteSelectionRun($runId: String!) {
    restoreAgentRun(agentRunId: $runId) { success message runId }
  }
`, { runId }).then((result) => result.restoreAgentRun);

const agentResume = (serverUrl: string, runId: string) => executeGraphql<{
  getAgentRunResumeConfig: {
    runId: string;
    isActive: boolean;
    metadataConfig: { llmModelIdentifier: string; runtimeKind: string };
    modelConfigEditability: { editable: boolean; reason: string | null };
  };
}>(serverUrl, `
  query RemoteSelectionResume($runId: String!) {
    getAgentRunResumeConfig(runId: $runId) {
      runId isActive
      metadataConfig { llmModelIdentifier runtimeKind }
      modelConfigEditability { editable reason }
    }
  }
`, { runId }).then((result) => result.getAgentRunResumeConfig);

describe('saved selections of the removed remote AutoByteus provider', () => {
  it('refuses a native runtime launch with a remote identifier and still launches with a current model', async () => {
    const target = makeTarget();
    const server = await startServer(target);
    const definitionId = await createAgentDefinition(server.serverUrl);
    const workspaceRootPath = path.join(target.runtimeRoot, 'workspaces', 'launch');
    fs.mkdirSync(workspaceRootPath, { recursive: true, mode: 0o700 });

    const refused = await createAgentRun(server.serverUrl, {
      agentDefinitionId: definitionId,
      workspaceRootPath,
      llmModelIdentifier: REMOTE_LLM_IDENTIFIER,
      autoExecuteTools: false,
      runtimeKind: 'autobyteus',
    });
    expect(refused.success).toBe(false);
    expect(refused.runId).toBeNull();
    expect(refused.message).toContain('MODEL_IDENTIFIER_NOT_AVAILABLE');
    // (A refused launch keeps the established FAILED_ATTEMPT package; it is not a usable run.)

    // The native runtime itself still launches with a current model.
    const accepted = await createAgentRun(server.serverUrl, {
      agentDefinitionId: definitionId,
      workspaceRootPath,
      llmModelIdentifier: await currentApiModel(server.serverUrl),
      autoExecuteTools: false,
      runtimeKind: 'autobyteus',
    });
    expect(accepted, server.output()).toMatchObject({ success: true });
    expect(accepted.runId).toBeTruthy();
    expect(server.output()).not.toContain('remote-llm.example.invalid:8000/');
  }, 180_000);

  it('keeps a stopped run that saved a remote model visible with its value and blocks its restore', async () => {
    const target = makeTarget();
    const first = await startServer(target);
    const definitionId = await createAgentDefinition(first.serverUrl);
    const currentModel = await currentApiModel(first.serverUrl);
    const workspaceRootPath = path.join(target.runtimeRoot, 'workspaces', 'restore');
    fs.mkdirSync(workspaceRootPath, { recursive: true, mode: 0o700 });

    const created = await createAgentRun(first.serverUrl, {
      agentDefinitionId: definitionId,
      workspaceRootPath,
      llmModelIdentifier: currentModel,
      autoExecuteTools: false,
      runtimeKind: 'autobyteus',
    });
    if (!created.success || !created.runId) throw new Error(`REMOTE_SELECTION_RUN_CREATE_FAILED: ${created.message}`);
    const runId = created.runId;
    const metadataPath = path.join(target.runtimeRoot, 'memory', 'agents', runId, 'run_metadata.json');
    const snapshot = new WorkingContextFinalizer().finalize({
      messages: [new Message(MessageRole.SYSTEM, { content: 'Owned removed-remote-provider snapshot' })],
    });
    fs.writeFileSync(
      path.join(path.dirname(metadataPath), 'working_context_snapshot.json'),
      JSON.stringify(WorkingContextSnapshotSerializer.serialize(snapshot, { agent_id: runId })),
      'utf8',
    );
    const terminated = await executeGraphql<{ terminateAgentRun: { success: boolean } }>(first.serverUrl, `
      mutation StopRemoteSelectionRun($runId: String!) { terminateAgentRun(agentRunId: $runId) { success } }
    `, { runId });
    expect(terminated.terminateAgentRun.success).toBe(true);
    await stopServer(first);

    // The run as a provider-era release saved it.
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as Record<string, unknown>;
    expect(metadata.llmModelIdentifier).toBe(currentModel);
    metadata.llmModelIdentifier = REMOTE_LLM_IDENTIFIER;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    const savedBytes = fs.readFileSync(metadataPath, 'utf8');

    const second = await startServer(target);
    await expect(agentResume(second.serverUrl, runId)).resolves.toMatchObject({
      runId,
      isActive: false,
      metadataConfig: { llmModelIdentifier: REMOTE_LLM_IDENTIFIER, runtimeKind: 'autobyteus' },
      modelConfigEditability: { editable: true, reason: null },
    });

    const blocked = await restoreAgentRun(second.serverUrl, runId);
    expect(blocked.success).toBe(false);
    expect(blocked.message).toContain('MODEL_IDENTIFIER_NOT_AVAILABLE');
    expect(fs.readFileSync(metadataPath, 'utf8')).toBe(savedBytes);
    await expect(agentResume(second.serverUrl, runId)).resolves.toMatchObject({
      isActive: false,
      metadataConfig: { llmModelIdentifier: REMOTE_LLM_IDENTIFIER },
    });
    await stopServer(second);

    // A later restart still lists the run with its saved value and refuses to resume it.
    const third = await startServer(target);
    await expect(agentResume(third.serverUrl, runId)).resolves.toMatchObject({
      isActive: false,
      metadataConfig: { llmModelIdentifier: REMOTE_LLM_IDENTIFIER, runtimeKind: 'autobyteus' },
    });
    const stillBlocked = await restoreAgentRun(third.serverUrl, runId);
    expect(stillBlocked.success).toBe(false);
    expect(stillBlocked.message).toContain('MODEL_IDENTIFIER_NOT_AVAILABLE');
    expect(fs.readFileSync(metadataPath, 'utf8')).toBe(savedBytes);
  }, 240_000);
});
