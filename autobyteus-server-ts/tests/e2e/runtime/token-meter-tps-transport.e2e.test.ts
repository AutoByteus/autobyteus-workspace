/** TPS-TRANSPORT / R1 AC-002–005,007,008. Scripted AGY subprocess -> real canonical fold/
 * persistence -> real WebSocket -> production browser AgentStreamingService -> meter -> card.
 * NOT paid/live provider inference. Run in a clean env with a private HOME; Prisma test setup
 * owns tests/.tmp in this worktree. Prereqs: server prebuild, web dependencies/nuxt prepare, Chromium.
 * ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-tps-cli.mjs
 * RUN_TOKEN_TPS_E2E=1 TEST_TPS_OUTPUT_DIR=<fresh absolute dir> pnpm -C autobyteus-server-ts exec
 * vitest run tests/e2e/runtime/token-meter-tps-transport.e2e.test.ts --no-watch
 * Fixture tool reads only this test's file. All run/data/socket/server resources are owned here;
 * the browser probe owns its Nuxt/Chrome/route. Output JSON includes actual wire frames and hashes.
 */
import 'reflect-metadata';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rootPrismaClient } from 'repository_prisma';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { startStudioE2eRuntimeServer } from '../helpers/studio-runtime-test-server.js';
const suite = process.env.RUN_TOKEN_TPS_E2E === '1' ? describe : describe.skip;
suite('same-turn output TPS across real server and browser', () => {
  let dataDir = '', runId = '', definitionId = '';
  let app: FastifyInstance | undefined;
  let url: URL;
  const outputDir = process.env.TEST_TPS_OUTPUT_DIR || path.resolve('tests/.tmp/tps-' + Date.now());

  const graphql = async (query: string, variables: Record<string, unknown> = {}) => {
    const response = await fetch(new URL('/graphql', url), { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as any;
    if (!response.ok || body.errors?.length || !body.data) throw new Error(JSON.stringify(body));
    return body.data;
  };
  beforeAll(async () => {
    // Discovery is instantiated at import time: the fixture command MUST be in the launch environment.
    expect(process.env.ANTIGRAVITY_CLI_COMMAND).toBe(path.resolve('tests/fixtures/agy-tps-cli.mjs'));
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'token-tps-transport-'));
    await fs.mkdir(path.join(dataDir, 'workspace'));
    await fs.writeFile(path.join(dataDir, 'workspace', 'tool.txt'), 'TPS_OWNED_TOOL_CONTENT');
    await fs.writeFile(path.join(dataDir, '.env'), 'AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n');
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    definitionId = (await graphql('mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }',
      { input: { name: 'TPS-' + randomUUID(), role: 'assistant', description: 'Scripted TPS',
        instructions: 'Read the supplied file and reply.', category: 'runtime-e2e', toolNames: [] } })).createAgentDefinition.id;
    const created = (await graphql('mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }',
      { input: { agentDefinitionId: definitionId, workspaceRootPath: path.join(dataDir, 'workspace'),
        llmModelIdentifier: 'gemini-3.8-flash-low', autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
    expect(created.success, created.message).toBe(true); runId = created.runId;
  }, 60000);
  afterAll(async () => {
    const cleanup: Record<string, unknown> = { runId, dataDir };
    try {
      if (runId) cleanup.terminated = await graphql('mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }', { agentRunId: runId });
      if (definitionId) cleanup.definitionDeleted = await graphql('mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }', { id: definitionId });
    } finally {
      if (runId) await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId } });
      await app?.close(); cleanup.serverClosed = true;
      if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
      cleanup.dataRemoved = true;
      await fs.mkdir(path.dirname(outputDir), { recursive: true });
      await fs.writeFile(outputDir + '-cleanup.json', JSON.stringify(cleanup, null, 2));
    }
  });
  it('renders exact-run estimates from three compatible calls and a real tool gap', async () => {
    const root = path.resolve('..');
    const { code, output } = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(root, 'autobyteus-web/tests/e2e/token-meter-tps-probe.mjs'),
        '--output-dir', outputDir, '--backend-url', url.origin, '--run-id', runId,
        '--file', path.join(dataDir, 'workspace', 'tool.txt')], { cwd: root, env: process.env });
      let output = '';
      child.stdout.on('data', data => { output += String(data); });
      child.stderr.on('data', data => { output += String(data); });
      child.once('error', reject); child.once('close', code => resolve({ code, output }));
    });
    console.log(output);
    expect(code, output).toBe(0);
    const receipt = JSON.parse(await fs.readFile(path.join(outputDir, 'result.json'), 'utf8'));
    expect(receipt.status).toBe('pass');
    expect(receipt.errors).toEqual([]);
    expect(receipt.cleanup).toMatchObject({ browserClosed: true, nuxtStopped: true, routeRemoved: true });
    const summary = (await graphql('query($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) { runId outputTokens usageReportCount latestRuntimeKind latestModelIdentifier } }', { runId })).getAgentRunTokenUsageSummary;
    expect(summary).toMatchObject({ runId, outputTokens: 1349, usageReportCount: 3,
      latestRuntimeKind: 'antigravity_cli', latestModelIdentifier: 'gemini-3.8-flash-low' });
    await fs.writeFile(path.join(outputDir, 'persisted-summary.json'), JSON.stringify(summary, null, 2));
  }, 180000);
});
