import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID } from '../../../src/built-in-agents/built-in-agent-registry.js';
import { AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID } from '../../../src/skill-improvement/domain/settings.js';
import {
  executeGraphql,
  materializeTestRuntime,
  readTrackedTestEnvironment,
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;

const runningServers = new Set<RunningTestServer>();
const ownedTargets: Array<{
  runtimeRoot: string;
  database: ReturnType<typeof resolveTestDatabaseLocation>;
}> = [];

const digest = (candidate: string): string =>
  createHash('sha256').update(fs.readFileSync(candidate)).digest('hex');

const credentialStatus = async (serverUrl: string) =>
  await executeGraphql<{
    getSecretVaultStatus: {
      health: string;
      instructionCode: string | null;
    };
    providerSettings: Array<{
      provider: { id: string; apiKeyConfigured: boolean };
    }>;
  }>(serverUrl, `
    query Status {
      getSecretVaultStatus {
        health
        instructionCode
      }
      providerSettings(runtimeKind: "autobyteus") {
        provider { id apiKeyConfigured }
      }
    }
  `);

const autoByteusStatus = async (serverUrl: string) => {
  const result = await credentialStatus(serverUrl);
  const provider = result.providerSettings.find(
    ({ provider: candidate }) => candidate.id === 'AUTOBYTEUS',
  );
  if (!provider) throw new Error('AUTOBYTEUS_PROVIDER_STATUS_MISSING');
  return {
    vaultHealth: result.getSecretVaultStatus.health,
    storageState: provider.provider.apiKeyConfigured ? 'CONFIGURED' : 'MISSING',
    instructionCode: result.getSecretVaultStatus.instructionCode,
  };
};

const retrospectiveSkillImproverRuntimeDefault = async (serverUrl: string) => {
  const settings = await executeGraphql<{
    getServerSettings: Array<{ key: string; value: string }>;
  }>(serverUrl, `
    query RuntimeDefault {
      getServerSettings {
        key
        value
      }
    }
  `);
  return settings.getServerSettings.find(
    (entry) => entry.key === AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
  );
};

afterEach(async () => {
  for (const server of runningServers) {
    if (server.child.exitCode === null) server.child.kill('SIGKILL');
  }
  runningServers.clear();
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

describe('server restart one-database secret-vault lifecycle', () => {
  it('materializes the immutable template, migrates, initializes one adjacent key, and reopens value-free', async () => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const runtimeRoot = path.join(testRuntimeRoot, `restart-${suffix}`);
    const database = resolveTestDatabaseLocation(`file:./db/restart-${suffix}.db`);
    ownedTargets.push({ runtimeRoot, database });
    const templateBefore = readTrackedTestEnvironment().bytes;
    const port = await reserveLoopbackPort();
    const materialized = materializeTestRuntime({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
      serverUrlOverride: `http://127.0.0.1:${port}`,
    });
    const runtimeEnvironmentBefore = fs.readFileSync(materialized.runtimeEnvironmentPath);
    const syntheticCanary = 'synthetic-restart-secret-canary';

    const firstServer = await startBuiltTestServer({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
      port,
    });
    runningServers.add(firstServer);
    expect(await retrospectiveSkillImproverRuntimeDefault(firstServer.serverUrl)).toEqual({
      key: AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
      value: RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    });
    const missing = await autoByteusStatus(firstServer.serverUrl);
    expect(missing).toEqual({
      vaultHealth: 'READY',
      storageState: 'MISSING',
      instructionCode: null,
    });
    const saved = await executeGraphql<{ saveProviderApiKey: boolean }>(firstServer.serverUrl, `
      mutation Save($providerId: String!, $apiKey: String!) {
        saveProviderApiKey(providerId: $providerId, apiKey: $apiKey)
      }
    `, { providerId: 'AUTOBYTEUS', apiKey: syntheticCanary });
    expect(saved.saveProviderApiKey).toBe(true);
    expect(JSON.stringify(saved)).not.toContain(syntheticCanary);
    expect((await autoByteusStatus(firstServer.serverUrl)).storageState).toBe('CONFIGURED');
    await firstServer.stop();
    runningServers.delete(firstServer);

    expect(fs.existsSync(database.databasePath)).toBe(true);
    expect(fs.existsSync(database.rootKeyPath)).toBe(true);
    expect(fs.existsSync(`${database.databasePath}.secret-store.db`)).toBe(false);
    expect(fs.existsSync(`${database.databasePath}.secret-store.key`)).toBe(false);
    const firstDatabaseHash = digest(database.databasePath);
    const firstDatabaseMtime = fs.statSync(database.databasePath).mtimeMs;
    const firstKeyHash = digest(database.rootKeyPath);
    const firstKeyMtime = fs.statSync(database.rootKeyPath).mtimeMs;

    const secondServer = await startBuiltTestServer({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
      port,
    });
    runningServers.add(secondServer);
    const reopened = await autoByteusStatus(secondServer.serverUrl);
    expect(reopened).toEqual({
      vaultHealth: 'READY',
      storageState: 'CONFIGURED',
      instructionCode: null,
    });
    expect(await retrospectiveSkillImproverRuntimeDefault(secondServer.serverUrl)).toEqual({
      key: AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
      value: RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    });
    expect(JSON.stringify(reopened)).not.toContain(syntheticCanary);
    expect(digest(database.databasePath)).toBe(firstDatabaseHash);
    expect(fs.statSync(database.databasePath).mtimeMs).toBe(firstDatabaseMtime);
    expect(digest(database.rootKeyPath)).toBe(firstKeyHash);
    expect(fs.statSync(database.rootKeyPath).mtimeMs).toBe(firstKeyMtime);

    await secondServer.stop();
    runningServers.delete(secondServer);

    expect(readTrackedTestEnvironment().bytes).toEqual(templateBefore);
    expect(fs.readFileSync(materialized.runtimeEnvironmentPath)).toEqual(runtimeEnvironmentBefore);
    const combinedOutput = firstServer.output() + secondServer.output();
    expect(combinedOutput).toContain('Database migrations completed successfully.');
    expect(combinedOutput).not.toContain(syntheticCanary);
    expect(combinedOutput).not.toContain('Environment variable not found: DATABASE_URL');
    expect(combinedOutput).not.toContain('P1012');
  }, 240_000);
});
