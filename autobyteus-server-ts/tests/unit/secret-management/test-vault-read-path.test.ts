import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { ApplicationDatabaseLocation } from '../../../src/config/application-database-location.js';
import { SecretVaultRuntime } from '../../../src/secret-management/secret-vault-runtime.js';
import {
  isRealAppServerDataDir,
  selectedTestVaultPaths,
  selectSecretVaultSource,
  TEST_VAULT_IGNORED_ON_REAL_APP_DATA,
} from '../../../src/secret-management/secret-vault-source.js';
import { openReadOnlyTestVault } from '../../../src/secret-management/test-vault/read-only-test-vault.js';
import {
  forbiddenTestVaultRoots,
  isForbiddenTestVaultLocation,
  parseTestVaultSetting,
  resolveTestVaultLocation,
} from 'autobyteus-ts/secrets/vault/test-vault-location.js';
import { createSyntheticTestVault } from '../../../../test-support/test-vault/synthetic-test-vault.js';

const SYNTHETIC_DEEPSEEK = 'synthetic-deepseek-vault-value';

const digest = (file: string): string => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const applicationLocation = (root: string) => ApplicationDatabaseLocation.fromAbsoluteFileUrl(
  pathToFileURL(path.join(root, 'db', 'production.db')).href,
);

// A home that does not exist, under the temp root (macOS mounts /home through autofs, which is slow to probe).
const home = path.join(os.tmpdir(), 'test-vault-policy-home-never-created');

describe('test-vault location policy', () => {

  it('parses an absolute or home-relative directory and refuses relative values', () => {
    expect(parseTestVaultSetting('/srv/vault/', home)).toBe('/srv/vault');
    expect(parseTestVaultSetting('~/.autobyteus-test/vault', home)).toBe(`${home}/.autobyteus-test/vault`);
    for (const value of ['vault', './vault', '', '   ']) {
      expect(() => parseTestVaultSetting(value, home)).toThrow(expect.objectContaining({
        code: 'TEST_VAULT_LOCATION_INVALID',
      }));
    }
  });

  it.each([
    ['darwin', {}, [`${home}/.autobyteus`, `${home}/Library/Application Support/autobyteus`, `${home}/Library/Logs/autobyteus`]],
    ['linux', {}, [`${home}/.autobyteus`, `${home}/.config/autobyteus`]],
    ['linux', { XDG_CONFIG_HOME: '/xdg' }, [`${home}/.autobyteus`, '/xdg/autobyteus']],
    ['win32', { APPDATA: `${home}/AppData/Roaming` }, [`${home}/.autobyteus`, `${home}/AppData/Roaming/autobyteus`]],
  ] as const)('refuses the production app data folders on %s (%j)', (platform, env, roots) => {
    const policy = { platform, homeDir: home, env } as const;
    expect(forbiddenTestVaultRoots(policy)).toEqual(roots);
    for (const root of roots) {
      expect(isForbiddenTestVaultLocation(root, policy)).toBe(true);
      expect(isForbiddenTestVaultLocation(path.join(root, 'nested', 'vault'), policy)).toBe(true);
    }
    expect(isForbiddenTestVaultLocation(`${home}/.autobyteus-test/vault`, policy)).toBe(false);
    expect(isForbiddenTestVaultLocation(`${home}/.autobyteusx`, policy)).toBe(false);
  });

  it('matches folders case-insensitively where the file system is (macOS, Windows)', () => {
    expect(isForbiddenTestVaultLocation(`${home}/.AutoByteus/vault`, {
      platform: 'darwin', homeDir: home, env: {},
    })).toBe(true);
    expect(isForbiddenTestVaultLocation(`${home}/.AutoByteus/vault`, {
      platform: 'linux', homeDir: home, env: {},
    })).toBe(false);
  });

  it('refuses a location that reaches app data through a symlink', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'test-vault-symlink-'));
    try {
      const fakeHome = fs.realpathSync(root);
      fs.mkdirSync(path.join(fakeHome, '.autobyteus'));
      fs.symlinkSync(path.join(fakeHome, '.autobyteus'), path.join(fakeHome, 'innocent'));
      const policy = { platform: process.platform, homeDir: fakeHome, env: {} };
      expect(isForbiddenTestVaultLocation(path.join(fakeHome, 'innocent', 'vault'), policy)).toBe(true);
      expect(() => resolveTestVaultLocation(path.join(fakeHome, 'innocent'), policy)).toThrow(expect.objectContaining({
        code: 'TEST_VAULT_LOCATION_FORBIDDEN',
      }));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps the real-app-data guard a separate predicate: exactly ~/.autobyteus/server-data', () => {
    const policy = { platform: 'linux' as const, homeDir: home };
    expect(isRealAppServerDataDir(`${home}/.autobyteus/server-data`, policy)).toBe(true);
    expect(isRealAppServerDataDir(`${home}/.autobyteus/server-data/`, policy)).toBe(true);
    expect(isRealAppServerDataDir(`${home}/.autobyteus`, policy)).toBe(false);
    expect(isRealAppServerDataDir('/tmp/isolated/server-data', policy)).toBe(false);
  });
});

describe('selectSecretVaultSource', () => {
  const policy = { platform: 'linux' as const, homeDir: home };
  const databaseLocation = applicationLocation('/tmp/run-data');

  it('selects the application vault when the selector is unset or blank (today\'s behavior)', () => {
    for (const testVaultSetting of [undefined, '', '   ']) {
      expect(selectSecretVaultSource({ testVaultSetting, appDataDir: '/tmp/run-data', databaseLocation }, policy))
        .toEqual({ kind: 'application', location: databaseLocation });
    }
  });

  it('selects the test vault when the selector is set', () => {
    expect(selectSecretVaultSource({
      testVaultSetting: ' /srv/vault ',
      appDataDir: '/tmp/run-data',
      databaseLocation,
    }, policy)).toEqual({ kind: 'test', directory: '/srv/vault' });
  });

  it('ignores the selector on the real app data dir, with a notice', () => {
    expect(selectSecretVaultSource({
      testVaultSetting: '/srv/vault',
      appDataDir: `${home}/.autobyteus/server-data`,
      databaseLocation,
    }, policy)).toEqual({
      kind: 'application',
      location: databaseLocation,
      notice: TEST_VAULT_IGNORED_ON_REAL_APP_DATA,
    });
  });

  it('puts only a valid selected test vault directory off-limits to agent file tools', () => {
    expect(selectedTestVaultPaths({ kind: 'application', location: databaseLocation })).toEqual([]);
    expect(selectedTestVaultPaths({ kind: 'test', directory: '~/vault' }, home)).toEqual([`${home}/vault`]);
    expect(selectedTestVaultPaths({ kind: 'test', directory: 'relative' })).toEqual([]);
  });
});

describe('read-only test vault', () => {
  let root: string;
  let vaultDirectory: string;

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'test-vault-read-')));
    vaultDirectory = path.join(root, 'vault');
    createSyntheticTestVault(vaultDirectory, { 'provider.deepseek.api-key': SYNTHETIC_DEEPSEEK });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('resolves secrets read-only: writes fail with SECRET_VAULT_READ_ONLY and the bytes never change', async () => {
    const location = resolveTestVaultLocation(vaultDirectory);
    const before = [digest(location.databasePath), digest(location.rootKeyPath)];
    const vault = await openReadOnlyTestVault(vaultDirectory);
    try {
      const consumer = { kind: 'llm', providerId: 'DEEPSEEK', credentialSlot: 'apiKey' } as const;
      expect(await vault.service.getHealth()).toEqual({ state: 'READY' });
      expect((await vault.service.resolveForUse(consumer)).revealToTrustedConsumer()).toBe(SYNTHETIC_DEEPSEEK);
      await expect(vault.service.saveForConsumer({
        consumer, value: SecretValue.fromString('synthetic-replacement'),
      })).rejects.toMatchObject({ code: 'READ_ONLY', instructionCode: 'SECRET_VAULT_READ_ONLY' });
      await expect(vault.service.removeForConsumer(consumer)).rejects.toMatchObject({ code: 'READ_ONLY' });
      await expect(vault.service.saveBatch([], true)).rejects.toMatchObject({ code: 'READ_ONLY' });
    } finally {
      vault.close();
    }
    expect([digest(location.databasePath), digest(location.rootKeyPath)]).toEqual(before);
    expect(fs.readdirSync(vaultDirectory).sort()).toEqual(['test-vault.db', 'test-vault.db.secret.key']);
  });

  it('marks the vault CORRUPT when a stored entry cannot be decrypted (CORRUPT_VAULT → markCorrupt)', async () => {
    const database = new DatabaseSync(path.join(vaultDirectory, 'test-vault.db'));
    database.exec("UPDATE secret_entries SET ciphertext = X'00112233'");
    database.close();
    const vault = await openReadOnlyTestVault(vaultDirectory);
    try {
      await expect(vault.service.resolveForUse({ kind: 'llm', providerId: 'DEEPSEEK', credentialSlot: 'apiKey' }))
        .rejects.toMatchObject({ code: 'CORRUPT_STORED_VALUE', instructionCode: 'SECRET_VAULT_CORRUPT' });
      expect(await vault.service.getHealth()).toEqual({ state: 'CORRUPT', instructionCode: 'SECRET_VAULT_CORRUPT' });
    } finally {
      vault.close();
    }
  });

  it('opens the selected test vault at runtime initialization and announces it (location only)', async () => {
    const lines: string[] = [];
    const runtime = new SecretVaultRuntime({ info: (line) => lines.push(line), warn: (line) => lines.push(line) });
    await runtime.initialize({ kind: 'test', directory: vaultDirectory });
    try {
      expect(await runtime.getHealth()).toEqual({ state: 'READY' });
      expect(lines).toEqual([`Secret vault: test vault ${vaultDirectory} (read-only)`]);
      expect(lines.join('\n')).not.toContain(SYNTHETIC_DEEPSEEK);
    } finally {
      await runtime.close();
    }
  });

  const failures: Array<[string, () => string, string]> = [
    ['a relative selector', () => 'relative/vault', 'TEST_VAULT_LOCATION_INVALID'],
    ['a forbidden location', () => path.join(os.homedir(), '.autobyteus', 'test-vault-never-created'), 'TEST_VAULT_LOCATION_FORBIDDEN'],
    ['a missing vault', () => path.join(root, 'absent'), 'TEST_VAULT_NOT_FOUND'],
    ['a mismatched key', () => {
      fs.writeFileSync(path.join(vaultDirectory, 'test-vault.db.secret.key'), randomBytes(32), { mode: 0o600 });
      return vaultDirectory;
    }, 'TEST_VAULT_UNAVAILABLE'],
    ['an unsafe key file', () => {
      fs.chmodSync(path.join(vaultDirectory, 'test-vault.db.secret.key'), 0o644);
      return vaultDirectory;
    }, 'TEST_VAULT_UNAVAILABLE'],
    ['a corrupt database', () => {
      fs.writeFileSync(path.join(vaultDirectory, 'test-vault.db'), 'not a database', { mode: 0o600 });
      return vaultDirectory;
    }, 'TEST_VAULT_UNAVAILABLE'],
  ];

  it.each(failures)('fails initialization for %s, opens nothing and never falls back', async (_label, prepare, code) => {
    const directory = prepare();
    const runtime = new SecretVaultRuntime();
    const failure = await runtime.initialize({ kind: 'test', directory }).catch((error: unknown) => error);
    expect(failure).toMatchObject({ name: 'SecretVaultError', code });
    expect(() => runtime.requireService()).toThrow('SECRET_VAULT_UNAVAILABLE');
    if (code === 'TEST_VAULT_NOT_FOUND') expect(String(failure)).toContain('pnpm test-vault setup');
    if (code === 'TEST_VAULT_LOCATION_FORBIDDEN') expect(fs.existsSync(directory)).toBe(false);
  });
});
