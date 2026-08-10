import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppDataMigrationRecordSnapshot } from '../../../src/app-data-migrations/domain/app-data-migration-types.js';
import { CustomProviderV1AppDataMigration } from '../../../src/app-data-migrations/migrations/custom-provider-v1-app-data-migration.js';
import { CustomProviderReadableIdAppDataMigration } from '../../../src/app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.js';
import {
  CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS,
  CustomProviderReadableIdPrerequisiteGuard,
} from '../../../src/app-data-migrations/migrations/custom-provider-readable-id-prerequisite-guard.js';

const OLD_ID = 'provider_5b8b1ce1baf945c483248bdef87c554e';
const NEW_ID = 'provider_alibaba_cloud_token_plan';
const MODEL_SUFFIX = 'deepseek-v4-flash-0731';
const oldIdentifier = `openai-compatible:${OLD_ID}:${MODEL_SUFFIX}`;
const newIdentifier = `openai-compatible:${NEW_ID}:${MODEL_SUFFIX}`;
const directories: string[] = [];

const record = (migrationId: string): AppDataMigrationRecordSnapshot => ({
  migrationId,
  displayName: migrationId,
  status: 'SUCCEEDED',
  attempts: 1,
  startedAt: new Date(),
  completedAt: new Date(),
  summaryJson: null,
  errorMessage: null,
  logPath: null,
});

const terminalGuard = (): CustomProviderReadableIdPrerequisiteGuard =>
  new CustomProviderReadableIdPrerequisiteGuard({
    getRecord: async (migrationId) => CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS
      .includes(migrationId as typeof CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS[number])
      ? record(migrationId)
      : null,
  });

const writeJson = async (filePath: string, value: unknown): Promise<Buffer> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(filePath, bytes);
  return bytes;
};

const readJson = async (filePath: string): Promise<any> =>
  JSON.parse(await fs.readFile(filePath, 'utf8'));

const createApplicationDatabase = async (directory: string): Promise<string> => {
  const databasePath = path.join(directory, 'applications', 'example', 'db', 'platform.sqlite');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE __autobyteus_resource_configurations (
      slot_key TEXT PRIMARY KEY,
      launch_profile_json TEXT,
      launch_defaults_json TEXT
    );
  `);
  const insert = database.prepare(`
    INSERT INTO __autobyteus_resource_configurations
      (slot_key, launch_profile_json, launch_defaults_json)
    VALUES (?, ?, ?)
  `);
  insert.run(
    'agent',
    JSON.stringify({ kind: 'AGENT', llmModelIdentifier: oldIdentifier, nested: { llmModelIdentifier: oldIdentifier } }),
    JSON.stringify({ llmModelIdentifier: oldIdentifier, untouched: { llmModelIdentifier: oldIdentifier } }),
  );
  insert.run(
    'team',
    JSON.stringify({
      kind: 'AGENT_TEAM',
      defaults: { llmModelIdentifier: oldIdentifier },
      memberProfiles: [
        { memberRouteKey: 'writer', llmModelIdentifier: oldIdentifier },
        { memberRouteKey: 'reviewer', llmModelIdentifier: 'OPENAI:gpt-5' },
      ],
      nested: { llmModelIdentifier: oldIdentifier },
    }),
    null,
  );
  database.close();
  return databasePath;
};

const listApplicationRows = (databasePath: string): Array<Record<string, string | null>> => {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return database.prepare(`
      SELECT slot_key, launch_profile_json, launch_defaults_json
      FROM __autobyteus_resource_configurations ORDER BY slot_key
    `).all() as Array<Record<string, string | null>>;
  } finally {
    database.close();
  }
};

const setupFixture = async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'custom-provider-readable-id-'));
  directories.push(directory);
  const providerPath = path.join(directory, 'llm', 'custom-llm-providers.json');
  const providerBytes = await writeJson(providerPath, {
    version: 2,
    providers: [{
      id: OLD_ID,
      name: 'Alibaba Cloud Token Plan',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://legacy-endpoint.synthetic.invalid/v1',
    }],
  });
  const selectorPaths = {
    agent: path.join(directory, 'agents', 'alpha', 'agent-config.json'),
    team: path.join(directory, 'agent-teams', 'alpha', 'team-config.json'),
    bindings: path.join(directory, 'external-channel', 'bindings.json'),
    agentRun: path.join(directory, 'memory', 'agents', 'run-1', 'run_metadata.json'),
    teamRun: path.join(directory, 'memory', 'agent_teams', 'run-2', 'team_run_metadata.json'),
    improver: path.join(
      directory,
      'memory',
      'agents',
      'run-1',
      'skill_improvement',
      'writer',
      'improver_session.json',
    ),
  };
  await writeJson(selectorPaths.agent, {
    defaultLaunchConfig: { llmModelIdentifier: oldIdentifier },
    arbitrary: { llmModelIdentifier: oldIdentifier },
  });
  await writeJson(selectorPaths.team, {
    defaultLaunchConfig: { llmModelIdentifier: oldIdentifier },
    arbitrary: { llmModelIdentifier: oldIdentifier },
  });
  await writeJson(selectorPaths.bindings, [{
    id: 'binding-1',
    launchPreset: { llmModelIdentifier: oldIdentifier },
    arbitrary: { llmModelIdentifier: oldIdentifier },
  }]);
  await writeJson(selectorPaths.agentRun, {
    llmModelIdentifier: oldIdentifier,
    nested: { llmModelIdentifier: oldIdentifier },
  });
  await writeJson(selectorPaths.teamRun, {
    memberTree: [
      { memberKind: 'agent', llmModelIdentifier: oldIdentifier },
      {
        memberKind: 'agent_team',
        memberTree: [{ memberKind: 'agent', llmModelIdentifier: oldIdentifier }],
      },
    ],
    llmModelIdentifier: oldIdentifier,
  });
  await writeJson(selectorPaths.improver, {
    llmModelIdentifier: oldIdentifier,
    nested: { llmModelIdentifier: oldIdentifier },
  });
  const excludedPaths = [
    path.join(directory, 'memory', 'agents', 'run-1', 'raw_traces', 'trace.jsonl'),
    path.join(directory, 'memory', 'run_history_index.json'),
    path.join(directory, 'token-usage-ledger-snapshot.json'),
  ];
  const excluded = new Map<string, Buffer>();
  for (const filePath of excludedPaths) {
    excluded.set(filePath, await writeJson(filePath, {
      llmModelIdentifier: oldIdentifier,
      observation: `free-text:${oldIdentifier}`,
    }));
  }
  const databasePath = await createApplicationDatabase(directory);

  const stateAtRemoval: unknown[] = [];
  const secretOwner = {
    getStatusForConsumer: vi.fn(),
    resolveForUse: vi.fn(),
    saveForConsumer: vi.fn(),
    removeForConsumer: vi.fn(async () => {
      stateAtRemoval.push(await readJson(providerPath));
    }),
  };
  const getSecretOwner = vi.fn(() => secretOwner);
  const migration = new CustomProviderReadableIdAppDataMigration(
    directory,
    terminalGuard(),
    getSecretOwner,
    [directory],
    [],
  );
  return {
    directory,
    providerPath,
    providerBytes,
    selectorPaths,
    excluded,
    databasePath,
    stateAtRemoval,
    secretOwner,
    getSecretOwner,
    migration,
  };
};

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map(
    (directory) => fs.rm(directory, { recursive: true, force: true }),
  ));
});

describe('CustomProviderReadableIdAppDataMigration', () => {
  it('takes V1 through secretless V2 staging to empty V3 without preserving the inline key or Base URL', async () => {
    const fixture = await setupFixture();
    await writeJson(fixture.providerPath, {
      version: 1,
      providers: [{
        id: OLD_ID,
        name: 'Alibaba Cloud Token Plan',
        providerType: LLMProvider.OPENAI_COMPATIBLE,
        baseUrl: 'https://legacy-endpoint.synthetic.invalid/v1',
        apiKey: 'synthetic-inline-secret-canary',
      }],
    });

    await expect(new CustomProviderV1AppDataMigration(fixture.directory).execute())
      .resolves.toMatchObject({ status: 'SUCCEEDED_WITH_WARNINGS' });
    const staged = await fs.readFile(fixture.providerPath, 'utf8');
    expect(JSON.parse(staged)).toMatchObject({ version: 2 });
    expect(staged).not.toContain('synthetic-inline-secret-canary');

    await expect(fixture.migration.execute()).resolves.toMatchObject({ status: 'SUCCEEDED' });
    expect(await readJson(fixture.providerPath)).toEqual({ version: 3, providers: [] });
    expect(await fs.readFile(fixture.providerPath, 'utf8')).not.toContain('legacy-endpoint');
    expect(fixture.stateAtRemoval).toEqual([{ version: 3, providers: [] }]);
  });

  it('maps every exact selector, preserves suffixes/excluded fields, publishes empty V3, then removes only the old key', async () => {
    const fixture = await setupFixture();

    await expect(fixture.migration.execute()).resolves.toMatchObject({
      status: 'SUCCEEDED',
      summary: { failedCount: 0 },
    });

    expect(await readJson(fixture.providerPath)).toEqual({ version: 3, providers: [] });
    expect(await fs.readFile(fixture.providerPath, 'utf8')).not.toContain('legacy-endpoint');
    expect(fixture.stateAtRemoval).toEqual([{ version: 3, providers: [] }]);
    expect(fixture.secretOwner.removeForConsumer).toHaveBeenCalledWith({
      kind: 'llm',
      providerId: OLD_ID,
      credentialSlot: 'apiKey',
    });
    expect(fixture.secretOwner.getStatusForConsumer).not.toHaveBeenCalled();
    expect(fixture.secretOwner.resolveForUse).not.toHaveBeenCalled();
    expect(fixture.secretOwner.saveForConsumer).not.toHaveBeenCalled();

    const agent = await readJson(fixture.selectorPaths.agent);
    const team = await readJson(fixture.selectorPaths.team);
    const bindings = await readJson(fixture.selectorPaths.bindings);
    const agentRun = await readJson(fixture.selectorPaths.agentRun);
    const teamRun = await readJson(fixture.selectorPaths.teamRun);
    const improver = await readJson(fixture.selectorPaths.improver);
    expect(agent.defaultLaunchConfig.llmModelIdentifier).toBe(newIdentifier);
    expect(team.defaultLaunchConfig.llmModelIdentifier).toBe(newIdentifier);
    expect(bindings[0].launchPreset.llmModelIdentifier).toBe(newIdentifier);
    expect(agentRun.llmModelIdentifier).toBe(newIdentifier);
    expect(teamRun.memberTree[0].llmModelIdentifier).toBe(newIdentifier);
    expect(teamRun.memberTree[1].memberTree[0].llmModelIdentifier).toBe(newIdentifier);
    expect(improver.llmModelIdentifier).toBe(newIdentifier);
    for (const current of [agent, team, bindings[0], agentRun, teamRun, improver]) {
      expect(JSON.stringify(current)).toContain(oldIdentifier);
    }

    const rows = listApplicationRows(fixture.databasePath);
    const agentProfile = JSON.parse(rows[0]!.launch_profile_json!);
    const defaults = JSON.parse(rows[0]!.launch_defaults_json!);
    const teamProfile = JSON.parse(rows[1]!.launch_profile_json!);
    expect(agentProfile.llmModelIdentifier).toBe(newIdentifier);
    expect(defaults.llmModelIdentifier).toBe(newIdentifier);
    expect(teamProfile.defaults.llmModelIdentifier).toBe(newIdentifier);
    expect(teamProfile.memberProfiles[0].llmModelIdentifier).toBe(newIdentifier);
    expect(agentProfile.nested.llmModelIdentifier).toBe(oldIdentifier);
    expect(defaults.untouched.llmModelIdentifier).toBe(oldIdentifier);
    expect(teamProfile.nested.llmModelIdentifier).toBe(oldIdentifier);
    for (const [filePath, bytes] of fixture.excluded) {
      expect(await fs.readFile(filePath)).toEqual(bytes);
    }

    await expect(fixture.migration.execute()).resolves.toMatchObject({
      status: 'SUCCEEDED',
      summary: { migratedCount: 0 },
    });
    expect(fixture.secretOwner.removeForConsumer).toHaveBeenCalledOnce();
  });

  it('publishes empty V3 with no selector map, then removes every trusted old key when readable IDs collide', async () => {
    const fixture = await setupFixture();
    await writeJson(fixture.providerPath, {
      version: 2,
      providers: [
        { id: 'provider_old_one', name: 'A-B', providerType: 'OPENAI_COMPATIBLE', baseUrl: 'https://one.invalid/v1' },
        { id: 'provider_old_two', name: 'A B', providerType: 'OPENAI_COMPATIBLE', baseUrl: 'https://two.invalid/v1' },
      ],
    });

    const result = await fixture.migration.execute();

    expect(result).toMatchObject({ status: 'SUCCEEDED_WITH_WARNINGS' });
    expect(result.summary.details).toContainEqual(expect.objectContaining({
      message: 'CUSTOM_PROVIDER_READABLE_ID_MAPPING_INVALID',
    }));
    expect(await readJson(fixture.providerPath)).toEqual({ version: 3, providers: [] });
    expect((await readJson(fixture.selectorPaths.agent)).defaultLaunchConfig.llmModelIdentifier)
      .toBe(oldIdentifier);
    expect(fixture.stateAtRemoval).toEqual([
      { version: 3, providers: [] },
      { version: 3, providers: [] },
    ]);
    expect(fixture.secretOwner.removeForConsumer).toHaveBeenNthCalledWith(1, {
      kind: 'llm',
      providerId: 'provider_old_one',
      credentialSlot: 'apiKey',
    });
    expect(fixture.secretOwner.removeForConsumer).toHaveBeenNthCalledWith(2, {
      kind: 'llm',
      providerId: 'provider_old_two',
      credentialSlot: 'apiKey',
    });
    expect(fixture.secretOwner.getStatusForConsumer).not.toHaveBeenCalled();
    expect(fixture.secretOwner.resolveForUse).not.toHaveBeenCalled();
    expect(fixture.secretOwner.saveForConsumer).not.toHaveBeenCalled();
  });

  it('attempts trusted old-key removal after a non-derivable-name reset and keeps cleanup failure warning-only', async () => {
    const fixture = await setupFixture();
    await writeJson(fixture.providerPath, {
      version: 2,
      providers: [{
        id: OLD_ID,
        name: '---',
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://one.invalid/v1',
      }],
    });
    fixture.secretOwner.removeForConsumer.mockImplementationOnce(async () => {
      fixture.stateAtRemoval.push(await readJson(fixture.providerPath));
      throw new Error('vault unavailable');
    });

    const result = await fixture.migration.execute();

    expect(result).toMatchObject({ status: 'SUCCEEDED_WITH_WARNINGS' });
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'CUSTOM_PROVIDER_READABLE_ID_MAPPING_INVALID' }),
      expect.objectContaining({ message: 'CUSTOM_PROVIDER_READABLE_ID_OLD_SECRET_REMOVAL_FAILED' }),
    ]));
    expect(await readJson(fixture.providerPath)).toEqual({ version: 3, providers: [] });
    expect(fixture.stateAtRemoval).toEqual([{ version: 3, providers: [] }]);
    expect(fixture.secretOwner.removeForConsumer).toHaveBeenCalledWith({
      kind: 'llm',
      providerId: OLD_ID,
      credentialSlot: 'apiKey',
    });
    expect(fixture.secretOwner.getStatusForConsumer).not.toHaveBeenCalled();
    expect(fixture.secretOwner.resolveForUse).not.toHaveBeenCalled();
    expect(fixture.secretOwner.saveForConsumer).not.toHaveBeenCalled();
  });

  it('continues after malformed and read-only selector targets and leaves them unchanged', async () => {
    const fixture = await setupFixture();
    const malformedPath = fixture.selectorPaths.team;
    const readOnlyPath = fixture.selectorPaths.agentRun;
    await fs.writeFile(malformedPath, '{bad-json');
    if (process.platform !== 'win32') await fs.chmod(readOnlyPath, 0o444);

    const result = await fixture.migration.execute();

    expect(result).toMatchObject({ status: 'SUCCEEDED_WITH_WARNINGS' });
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: malformedPath, status: 'FAILED' }),
      ...(process.platform === 'win32'
        ? []
        : [expect.objectContaining({ filePath: readOnlyPath, status: 'FAILED' })]),
    ]));
    expect(await readJson(fixture.providerPath)).toEqual({ version: 3, providers: [] });
    expect(await fs.readFile(malformedPath, 'utf8')).toBe('{bad-json');
    if (process.platform !== 'win32') {
      expect((await readJson(readOnlyPath)).llmModelIdentifier).toBe(oldIdentifier);
      await fs.chmod(readOnlyPath, 0o600);
    }
    expect((await readJson(fixture.selectorPaths.agent)).defaultLaunchConfig.llmModelIdentifier)
      .toBe(newIdentifier);
  });

  it('detects a concurrently changed JSON target without overwriting it', async () => {
    const fixture = await setupFixture();
    const targetPath = fixture.selectorPaths.agent;
    const changedBytes = Buffer.from(`${JSON.stringify({
      defaultLaunchConfig: { llmModelIdentifier: oldIdentifier },
      concurrent: true,
    }, null, 2)}\n`);
    const originalReadFile = fs.readFile.bind(fs);
    let targetReads = 0;
    vi.spyOn(fs, 'readFile').mockImplementation((async (filePath: any, ...args: any[]) => {
      if (String(filePath) === targetPath && ++targetReads === 2) {
        await fs.writeFile(targetPath, changedBytes);
      }
      return originalReadFile(filePath, ...args as []);
    }) as typeof fs.readFile);

    const result = await fixture.migration.execute();

    expect(result).toMatchObject({ status: 'SUCCEEDED_WITH_WARNINGS' });
    expect(result.summary.details).toContainEqual(expect.objectContaining({
      filePath: targetPath,
      status: 'FAILED',
      message: 'CUSTOM_PROVIDER_READABLE_ID_SELECTOR_CHANGED',
    }));
    expect(await fs.readFile(targetPath)).toEqual(changedBytes);
    expect(await readJson(fixture.providerPath)).toEqual({ version: 3, providers: [] });
  });

  it('keeps V2 and blocks cleanup when empty-V3 publication fails, then converges on an ordinary retry', async () => {
    const fixture = await setupFixture();
    const originalRename = fs.rename.bind(fs);
    const rename = vi.spyOn(fs, 'rename').mockImplementation(async (source, target) => {
      if (String(source).endsWith('.v3-stage')) throw new Error('synthetic publication failure');
      return originalRename(source, target);
    });

    await expect(fixture.migration.execute()).resolves.toMatchObject({
      status: 'FAILED',
      errorMessage: 'CUSTOM_PROVIDER_READABLE_ID_PROVIDER_PUBLISH_FAILED',
    });
    expect(await fs.readFile(fixture.providerPath)).toEqual(fixture.providerBytes);
    expect((await readJson(fixture.selectorPaths.agent)).defaultLaunchConfig.llmModelIdentifier)
      .toBe(newIdentifier);
    expect(fixture.getSecretOwner).not.toHaveBeenCalled();

    rename.mockRestore();
    await expect(fixture.migration.execute()).resolves.toMatchObject({ status: 'SUCCEEDED' });
    expect(await readJson(fixture.providerPath)).toEqual({ version: 3, providers: [] });
    expect(fixture.secretOwner.removeForConsumer).toHaveBeenCalledOnce();
  });

  it('treats old-secret removal failure as warning success after empty V3 without fallback calls', async () => {
    const fixture = await setupFixture();
    fixture.secretOwner.removeForConsumer.mockRejectedValueOnce(new Error('vault unavailable'));

    const result = await fixture.migration.execute();

    expect(result).toMatchObject({ status: 'SUCCEEDED_WITH_WARNINGS' });
    expect(await readJson(fixture.providerPath)).toEqual({ version: 3, providers: [] });
    expect(fixture.secretOwner.resolveForUse).not.toHaveBeenCalled();
    expect(fixture.secretOwner.saveForConsumer).not.toHaveBeenCalled();
  });

  it('does not read or mutate provider/selectors while a prerequisite is incomplete', async () => {
    const fixture = await setupFixture();
    const blocked = new CustomProviderReadableIdAppDataMigration(
      fixture.directory,
      new CustomProviderReadableIdPrerequisiteGuard({ getRecord: async () => null }),
      fixture.getSecretOwner,
      [fixture.directory],
      [],
    );
    const selectorBytes = await fs.readFile(fixture.selectorPaths.agent);

    const result = await blocked.execute();

    expect(result).toMatchObject({
      status: 'FAILED',
      errorMessage: expect.stringContaining('CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_INCOMPLETE'),
    });
    expect(await fs.readFile(fixture.providerPath)).toEqual(fixture.providerBytes);
    expect(await fs.readFile(fixture.selectorPaths.agent)).toEqual(selectorBytes);
    expect(fixture.getSecretOwner).not.toHaveBeenCalled();
  });

  it('resets malformed legacy provider data with sanitized warnings and no endpoint leakage', async () => {
    const fixture = await setupFixture();
    await fs.writeFile(
      fixture.providerPath,
      '{"version":2,"providers":[{"baseUrl":"https://private.invalid/secret-path"}]}',
    );

    const result = await fixture.migration.execute();

    expect(result).toMatchObject({ status: 'SUCCEEDED_WITH_WARNINGS' });
    expect(JSON.stringify(result)).not.toContain('private.invalid');
    expect(await readJson(fixture.providerPath)).toEqual({ version: 3, providers: [] });
    expect(fixture.getSecretOwner).not.toHaveBeenCalled();
  });
});
