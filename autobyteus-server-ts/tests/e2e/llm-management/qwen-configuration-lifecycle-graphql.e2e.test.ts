import 'reflect-metadata';
import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { graphql as graphqlFn } from 'graphql';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import {
  QWEN_CONFIGURATION_REPAIR_REQUIRED,
  QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
  QwenConfigurationError,
  getLlmProviderService,
} from '../../../src/llm-management/llm-providers/services/llm-provider-service.js';
import { resetSecretVaultRuntimeForTests } from '../../../src/secret-management/secret-vault-runtime.js';
import {
  createSanitizedTestEnvironment,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;

type GraphqlPayload<T> = {
  data?: T | null;
  errors?: Array<{
    message: string;
    extensions?: Record<string, unknown>;
  }>;
};

type QwenStatus = {
  effectiveBaseUrl: string;
  endpointSource: 'DEFAULT' | 'CONFIGURED';
  apiKeyConfigured: boolean;
};

type QwenStatusPayload = {
  qwenSetupStatus: Omit<QwenStatus, 'apiKeyConfigured'>;
  providerCredentialSettings: Array<{
    provider: { id: string };
    apiKeyConfigured: boolean;
  }>;
};

type QwenCommandResult = {
  setup: Omit<QwenStatus, 'apiKeyConfigured'>;
  credentialSetting: {
    provider: { id: string };
    apiKeyConfigured: boolean;
  };
};

type CatalogModel = {
  modelIdentifier: string;
  value: string;
  providerId: string;
  maxContextTokens: number | null;
};

type CatalogProvider = {
  ownerProvider: { id: string; name: string };
  llmModels: CatalogModel[];
};

const serverEnvironment = {
  OLLAMA_HOSTS: ' ',
  LMSTUDIO_HOSTS: ' ',
  AUTOBYTEUS_LLM_SERVER_HOSTS: ' ',
};

const statusQuery = `
  query QwenLifecycleStatus {
    qwenSetupStatus {
      effectiveBaseUrl
      endpointSource
    }
    providerCredentialSettings(runtimeKind: "autobyteus") {
      provider { id }
      apiKeyConfigured
    }
  }
`;

const saveMutation = `
  mutation SaveQwenLifecycleConfiguration($input: QwenConfigurationInput!) {
    saveQwenConfiguration(input: $input) {
      setup { effectiveBaseUrl endpointSource }
      credentialSetting {
        provider { id }
        apiKeyConfigured
      }
    }
  }
`;

const catalogQuery = `
  query QwenLifecycleCatalog {
    providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
      ownerProvider { id name }
      llmModels {
        modelIdentifier
        value
        providerId
        maxContextTokens
      }
    }
  }
`;

const postGraphql = async <T>(
  serverUrl: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GraphqlPayload<T>> => {
  const response = await fetch(`${serverUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  expect(response.ok).toBe(true);
  return await response.json() as GraphqlPayload<T>;
};

const requireData = <T>(payload: GraphqlPayload<T>): T => {
  expect(payload.errors).toBeUndefined();
  expect(payload.data).toBeTruthy();
  return payload.data!;
};

const readQwenStatus = async (serverUrl: string): Promise<QwenStatus> => {
  const data = requireData(await postGraphql<QwenStatusPayload>(serverUrl, statusQuery));
  const credential = data.providerCredentialSettings.find(
    ({ provider }) => provider.id === 'QWEN',
  );
  expect(credential).toBeDefined();
  return {
    ...data.qwenSetupStatus,
    apiKeyConfigured: credential!.apiKeyConfigured,
  };
};

const mapQwenCommandResult = (result: QwenCommandResult): QwenStatus => ({
  ...result.setup,
  apiKeyConfigured: result.credentialSetting.apiKeyConfigured,
});

const obstructDurableEnvironmentCommit = async <T>(
  environmentPath: string,
  action: () => Promise<T>,
): Promise<T> => {
  const backupPath = `${environmentPath}.qwen-e2e-backup`;
  await fsPromises.rename(environmentPath, backupPath);
  await fsPromises.mkdir(environmentPath);
  try {
    return await action();
  } finally {
    await fsPromises.rm(environmentPath, { recursive: true, force: true });
    await fsPromises.rename(backupPath, environmentPath);
  }
};

const readOwnedFiles = async (root: string): Promise<Buffer[]> => {
  const values: Buffer[] = [];
  const visit = async (candidate: string): Promise<void> => {
    const stat = await fsPromises.lstat(candidate);
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      for (const entry of await fsPromises.readdir(candidate)) {
        await visit(path.join(candidate, entry));
      }
      return;
    }
    if (stat.isFile()) values.push(await fsPromises.readFile(candidate));
  };
  if (fs.existsSync(root)) await visit(root);
  return values;
};

const exerciseQwenRoutesInFreshProcess = async (input: {
  runtimeRoot: string;
  databaseUrl: string;
}): Promise<string> => {
  const script = `
    const runtimeRoot = process.argv[1];
    const values = JSON.parse(process.argv[2]);
    const { appConfigProvider } = await import('./dist/config/app-config-provider.js');
    const { getSecretVaultRuntime } = await import('./dist/secret-management/secret-vault-runtime.js');
    const { createLlmProviderApiKeyResolver } = await import('./dist/secret-management/resolution/secret-management-provider-api-key-resolver.js');
    const { QwenLLM } = await import('autobyteus-ts/llm/api/qwen-llm.js');
    const { LLMModel } = await import('autobyteus-ts/llm/models.js');
    const { LLMProvider } = await import('autobyteus-ts/llm/providers.js');
    const { LLMUserMessage } = await import('autobyteus-ts/llm/user-message.js');
    const { LLMConfig } = await import('autobyteus-ts/llm/utils/llm-config.js');

    const config = appConfigProvider.initialize({ appDataDir: runtimeRoot });
    config.initialize();
    await getSecretVaultRuntime().initialize(config.getOperationalDatabaseLocation());
    try {
      for (const value of values) {
        const llm = new QwenLLM(new LLMModel({
          name: value,
          value,
          canonicalName: value,
          provider: LLMProvider.QWEN,
        }), new LLMConfig(), createLlmProviderApiKeyResolver());
        try {
          const response = await llm._sendUserMessageToLLM(
            new LLMUserMessage({ content: 'route check' }),
            {},
          );
          if (response.content !== 'ok:' + value) throw new Error('QWEN_ROUTE_RESPONSE_MISMATCH');
        } finally {
          await llm.cleanup();
        }
      }
      process.stdout.write('\\nQWEN_ROUTE_PROBE_OK\\n');
    } finally {
      await getSecretVaultRuntime().close();
      appConfigProvider.resetForTests();
    }
  `;

  const child = spawn(process.execPath, [
    '--input-type=module',
    '--eval',
    script,
    input.runtimeRoot,
    JSON.stringify(['qwen3.8-max', 'deepseek-v4-pro', 'glm-5.2']),
  ], {
    cwd: process.cwd(),
    env: createSanitizedTestEnvironment({
      APP_ENV: 'test',
      DB_TYPE: 'sqlite',
      DATABASE_URL: input.databaseUrl,
      AUTOBYTEUS_SERVER_HOST: 'http://127.0.0.1:1',
      ...serverEnvironment,
    }),
    stdio: 'pipe',
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
  child.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
  const exitCode = await new Promise<number | null>((resolve) => child.once('close', resolve));
  if (exitCode !== 0 || !output.includes('QWEN_ROUTE_PROBE_OK')) {
    throw new Error(`QWEN_ROUTE_PROBE_FAILED:${exitCode}\n${output}`);
  }
  return output;
};

const runningServers = new Set<RunningTestServer>();
const ownedTargets: Array<{
  runtimeRoot: string;
  database: ReturnType<typeof resolveTestDatabaseLocation>;
}> = [];
const ownedHttpServers = new Set<http.Server>();

afterEach(async () => {
  for (const server of runningServers) {
    if (server.child.exitCode === null) server.child.kill('SIGKILL');
  }
  runningServers.clear();
  for (const server of ownedHttpServers) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  ownedHttpServers.clear();
  await resetSecretVaultRuntimeForTests();
  appConfigProvider.resetForTests();
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

describe('Qwen configuration GraphQL lifecycle E2E', () => {
  it('commits one probed pair durably, compensates failures, restarts, and routes every exact Qwen model', async () => {
    const suffix = `${process.pid}-${Date.now()}-${randomUUID()}`;
    const runtimeRoot = path.join(testRuntimeRoot, `qwen-configuration-${suffix}`);
    const database = resolveTestDatabaseLocation(`file:./db/qwen-configuration-${suffix}.db`);
    ownedTargets.push({ runtimeRoot, database });

    const noPriorFailureKey = `qwen-e2e-${randomUUID()}`;
    const durableKey = `qwen-e2e-${randomUUID()}`;
    const rejectedReplacementKey = `qwen-e2e-${randomUUID()}`;
    const badProbeKey = `qwen-e2e-${randomUUID()}`;
    const providerPrivateMarker = `provider-private-${randomUUID()}`;
    const allSensitiveValues = [
      noPriorFailureKey,
      durableKey,
      rejectedReplacementKey,
      badProbeKey,
      providerPrivateMarker,
    ];

    const probeAuthorizations: string[] = [];
    const chatRequests: Array<{ authorization: string; model: string; path: string }> = [];
    const provider = http.createServer(async (request, response) => {
      const authorization = String(request.headers.authorization ?? '');
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (request.method === 'GET' && requestUrl.pathname === '/compatible-mode/v1/models') {
        probeAuthorizations.push(authorization);
        if (authorization === `Bearer ${badProbeKey}`) {
          response.writeHead(401, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: { message: providerPrivateMarker } }));
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({
          data: [
            { id: 'qwen3.8-max' },
            { id: 'deepseek-v4-pro' },
            { id: 'glm-5.2' },
          ],
        }));
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/compatible-mode/v1/chat/completions') {
        let body = '';
        for await (const chunk of request) body += chunk.toString('utf8');
        const parsed = JSON.parse(body) as { model: string };
        chatRequests.push({ authorization, model: parsed.model, path: requestUrl.pathname });
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({
          id: `chatcmpl-${randomUUID()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: parsed.model,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: `ok:${parsed.model}` },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }));
        return;
      }

      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not found' }));
    });
    ownedHttpServers.add(provider);
    await new Promise<void>((resolve, reject) => {
      provider.once('error', reject);
      provider.listen(0, '127.0.0.1', () => resolve());
    });
    const address = provider.address();
    if (!address || typeof address === 'string') throw new Error('QWEN_E2E_PROVIDER_ADDRESS_MISSING');
    const qwenBaseUrl = `http://127.0.0.1:${address.port}/compatible-mode/v1`;

    try {
      const firstServer = await startBuiltTestServer({
        runtimeRoot,
        databaseUrlOverride: database.databaseUrl,
        environment: serverEnvironment,
      });
      runningServers.add(firstServer);

      const initial = await readQwenStatus(firstServer.serverUrl);
      expect(initial.endpointSource).toBe('DEFAULT');
      expect(initial.apiKeyConfigured).toBe(false);

      const noPriorFailure = await obstructDurableEnvironmentCommit(
        firstServer.runtimeEnvironmentPath,
        () => postGraphql<{ saveQwenConfiguration: QwenCommandResult }>(
          firstServer.serverUrl,
          saveMutation,
          { input: { baseUrl: qwenBaseUrl, apiKey: noPriorFailureKey } },
        ),
      );
      expect(noPriorFailure.errors).toEqual([
        expect.objectContaining({
          message: expect.stringContaining('previous configuration is still active'),
          extensions: expect.objectContaining({
            code: QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
          }),
        }),
      ]);
      const afterNoPriorFailure = await readQwenStatus(firstServer.serverUrl);
      expect(afterNoPriorFailure).toEqual(initial);

      const failedProbe = await postGraphql<{ saveQwenConfiguration: QwenCommandResult }>(
        firstServer.serverUrl,
        saveMutation,
        { input: { baseUrl: qwenBaseUrl, apiKey: badProbeKey } },
      );
      expect(failedProbe.errors).toHaveLength(1);
      expect(JSON.stringify(failedProbe)).not.toContain(badProbeKey);
      expect(JSON.stringify(failedProbe)).not.toContain(providerPrivateMarker);
      expect(await readQwenStatus(firstServer.serverUrl)).toEqual(initial);

      const savedCommand = requireData(await postGraphql<{ saveQwenConfiguration: QwenCommandResult }>(
        firstServer.serverUrl,
        saveMutation,
        { input: { baseUrl: `${qwenBaseUrl}/`, apiKey: durableKey } },
      )).saveQwenConfiguration;
      expect(savedCommand.credentialSetting.provider.id).toBe('QWEN');
      const saved = mapQwenCommandResult(savedCommand);
      expect(saved).toEqual({
        effectiveBaseUrl: qwenBaseUrl,
        endpointSource: 'CONFIGURED',
        apiKeyConfigured: true,
      });
      expect(JSON.stringify(saved)).not.toContain(durableKey);

      const firstCatalog = requireData(await postGraphql<{
        providerModelCatalogSnapshots: CatalogProvider[];
      }>(firstServer.serverUrl, catalogQuery)).providerModelCatalogSnapshots;
      const qwenProvider = firstCatalog.find(({ ownerProvider: candidate }) => candidate.id === 'QWEN');
      expect(qwenProvider).toBeDefined();
      const qwenModels = new Map(qwenProvider!.llmModels.map((model) => [model.value, model]));
      expect(qwenModels.get('qwen3.8-max')).toMatchObject({
        modelIdentifier: 'qwen3.8-max', providerId: 'QWEN', maxContextTokens: 1_000_000,
      });
      expect(qwenModels.get('deepseek-v4-pro')).toMatchObject({
        modelIdentifier: 'qwen:deepseek-v4-pro', providerId: 'QWEN', maxContextTokens: 1_000_000,
      });
      expect(qwenModels.get('glm-5.2')).toMatchObject({
        modelIdentifier: 'qwen:glm-5.2', providerId: 'QWEN', maxContextTokens: 198_000,
      });
      expect(qwenProvider!.llmModels.some(({ value }) => value === 'qwen3.8-max-preview')).toBe(false);
      expect(firstCatalog.find(({ ownerProvider: candidate }) => candidate.id === 'DEEPSEEK')?.llmModels)
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ modelIdentifier: 'deepseek-v4-pro', value: 'deepseek-v4-pro' }),
        ]));
      expect(firstCatalog.find(({ ownerProvider: candidate }) => candidate.id === 'GLM')?.llmModels)
        .toEqual(expect.arrayContaining([
          expect.objectContaining({
            modelIdentifier: 'glm-5.3',
            value: 'glm-5.3',
            maxContextTokens: 1_000_000,
          }),
        ]));

      const restoredFailure = await obstructDurableEnvironmentCommit(
        firstServer.runtimeEnvironmentPath,
        () => postGraphql<{ saveQwenConfiguration: QwenCommandResult }>(
          firstServer.serverUrl,
          saveMutation,
          { input: { baseUrl: `${qwenBaseUrl}/`, apiKey: rejectedReplacementKey } },
        ),
      );
      expect(restoredFailure.errors).toEqual([
        expect.objectContaining({
          message: expect.stringContaining('previous configuration is still active'),
          extensions: expect.objectContaining({
            code: QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
          }),
        }),
      ]);
      expect(await readQwenStatus(firstServer.serverUrl)).toEqual(saved);

      const environmentAfterCommit = await fsPromises.readFile(firstServer.runtimeEnvironmentPath, 'utf8');
      expect(environmentAfterCommit.match(/^QWEN_BASE_URL=/gm)).toHaveLength(1);
      expect(environmentAfterCommit).toContain(`QWEN_BASE_URL=${qwenBaseUrl}`);
      for (const sensitive of allSensitiveValues) expect(environmentAfterCommit).not.toContain(sensitive);

      const firstServerOutput = firstServer.output();
      await firstServer.stop();
      runningServers.delete(firstServer);

      const secondServer = await startBuiltTestServer({
        runtimeRoot,
        databaseUrlOverride: database.databaseUrl,
        environment: serverEnvironment,
      });
      runningServers.add(secondServer);
      expect(await readQwenStatus(secondServer.serverUrl)).toEqual(saved);
      const restartedCatalog = requireData(await postGraphql<{
        providerModelCatalogSnapshots: CatalogProvider[];
      }>(secondServer.serverUrl, catalogQuery)).providerModelCatalogSnapshots;
      expect(restartedCatalog.find(({ ownerProvider: candidate }) => candidate.id === 'QWEN')?.llmModels)
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ modelIdentifier: 'qwen3.8-max', value: 'qwen3.8-max' }),
          expect.objectContaining({ modelIdentifier: 'qwen:deepseek-v4-pro', value: 'deepseek-v4-pro' }),
          expect.objectContaining({ modelIdentifier: 'qwen:glm-5.2', value: 'glm-5.2' }),
        ]));

      const serverOutput = secondServer.output();
      await secondServer.stop();
      runningServers.delete(secondServer);

      const routeProbeOutput = await exerciseQwenRoutesInFreshProcess({
        runtimeRoot,
        databaseUrl: database.databaseUrl,
      });
      expect(chatRequests).toEqual([
        { authorization: `Bearer ${durableKey}`, model: 'qwen3.8-max', path: '/compatible-mode/v1/chat/completions' },
        { authorization: `Bearer ${durableKey}`, model: 'deepseek-v4-pro', path: '/compatible-mode/v1/chat/completions' },
        { authorization: `Bearer ${durableKey}`, model: 'glm-5.2', path: '/compatible-mode/v1/chat/completions' },
      ]);
      expect(probeAuthorizations).toEqual(expect.arrayContaining([
        `Bearer ${noPriorFailureKey}`,
        `Bearer ${badProbeKey}`,
        `Bearer ${durableKey}`,
        `Bearer ${rejectedReplacementKey}`,
      ]));

      const keyOnlyEnvironmentSource = (await fsPromises.readFile(
        path.join(runtimeRoot, '.env'),
        'utf8',
      )).split(/\r?\n/)
        .filter((line) => !line.startsWith('QWEN_BASE_URL='))
        .join('\n');
      await fsPromises.writeFile(
        path.join(runtimeRoot, '.env'),
        keyOnlyEnvironmentSource.endsWith('\n') ? keyOnlyEnvironmentSource : `${keyOnlyEnvironmentSource}\n`,
        { mode: 0o600 },
      );
      const keyOnlyServer = await startBuiltTestServer({
        runtimeRoot,
        databaseUrlOverride: database.databaseUrl,
        environment: serverEnvironment,
      });
      runningServers.add(keyOnlyServer);
      expect(await readQwenStatus(keyOnlyServer.serverUrl)).toEqual({
        effectiveBaseUrl: initial.effectiveBaseUrl,
        endpointSource: 'DEFAULT',
        apiKeyConfigured: true,
      });
      const keyOnlyServerOutput = keyOnlyServer.output();
      await keyOnlyServer.stop();
      runningServers.delete(keyOnlyServer);

      const schema = await buildGraphqlSchema();
      const require = createRequire(import.meta.url);
      const typeGraphqlRoot = path.dirname(require.resolve('type-graphql'));
      const graphqlPath = require.resolve('graphql', { paths: [typeGraphqlRoot] });
      const graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
      const repairBoundary = vi.spyOn(getLlmProviderService(), 'saveQwenConfiguration')
        .mockRejectedValueOnce(new QwenConfigurationError(QWEN_CONFIGURATION_REPAIR_REQUIRED));
      const repairResult = await graphql({
        schema,
        source: saveMutation,
        variableValues: { input: { baseUrl: qwenBaseUrl, apiKey: durableKey } },
      });
      repairBoundary.mockRestore();
      expect(repairResult.errors).toEqual([
        expect.objectContaining({
          message: expect.stringContaining('needs repair'),
          extensions: expect.objectContaining({ code: QWEN_CONFIGURATION_REPAIR_REQUIRED }),
        }),
      ]);
      expect(JSON.stringify(repairResult)).not.toContain(durableKey);

      const ownedFileContents = [
        ...(await readOwnedFiles(runtimeRoot)),
        ...(await readOwnedFiles(path.dirname(database.databasePath))),
        Buffer.from(firstServerOutput),
        Buffer.from(serverOutput),
        Buffer.from(keyOnlyServerOutput),
        Buffer.from(routeProbeOutput),
      ];
      for (const content of ownedFileContents) {
        for (const sensitive of allSensitiveValues) {
          expect(content.includes(Buffer.from(sensitive))).toBe(false);
        }
      }
    } finally {
      await resetSecretVaultRuntimeForTests();
      appConfigProvider.resetForTests();
    }
  }, 240_000);
});
