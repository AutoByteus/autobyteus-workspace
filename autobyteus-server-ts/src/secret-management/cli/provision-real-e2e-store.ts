import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SecretValue } from 'autobyteus-ts';
import { secretDefinitionId } from '../domain/secret-binding.js';
import { LocalSecretStoreProvisioningService } from '../backends/local/local-secret-store-provisioning-service.js';

type LiveConfiguration = {
  version: 1;
  backend: {
    kind: 'local-store';
    databaseFile: string;
    keyFile: string;
    accessMode: 'READ_ONLY';
  };
};

const argument = (name: string): string | null => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
};

const readHiddenValue = async (): Promise<string> => {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('TRUSTED_TTY_REQUIRED');
  }
  process.stderr.write('Credential (hidden): ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  return new Promise<string>((resolve, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.setRawMode?.(false);
      process.stdin.pause();
      process.stderr.write('\n');
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          finish();
          reject(new Error('INPUT_CANCELLED'));
          return;
        }
        if (character === '\r' || character === '\n') {
          process.stdin.off('data', onData);
          finish();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else value += character;
      }
    };
    process.stdin.on('data', onData);
  });
};

const main = async (): Promise<void> => {
  const configurationPath = argument('--config');
  const requestedDefinition = argument('--definition');
  if (!configurationPath || !requestedDefinition) throw new Error('CONFIG_AND_DEFINITION_REQUIRED');
  const configuration = JSON.parse(fs.readFileSync(path.resolve(configurationPath), 'utf8')) as LiveConfiguration;
  if (
    configuration.version !== 1
    || configuration.backend.kind !== 'local-store'
    || configuration.backend.accessMode !== 'READ_ONLY'
    || path.basename(configuration.backend.databaseFile) !== configuration.backend.databaseFile
    || path.basename(configuration.backend.keyFile) !== configuration.backend.keyFile
  ) throw new Error('LIVE_E2E_CONFIG_INVALID');

  const storeRoot = path.join(os.homedir(), '.autobyteus', 'server-data', 'secret-store');
  const target = {
    kind: 'local-store',
    databasePath: path.join(storeRoot, configuration.backend.databaseFile),
    keyPath: path.join(storeRoot, configuration.backend.keyFile),
    accessMode: 'READ_WRITE',
  } as const;
  const definitionId = secretDefinitionId(requestedDefinition);
  const provisioning = new LocalSecretStoreProvisioningService(target);
  const targetSnapshot = await provisioning.inspectExact([definitionId]);
  if (
    targetSnapshot.targetStatus.state !== 'READY'
    && targetSnapshot.targetStatus.state !== 'INITIALIZATION_REQUIRED'
  ) {
    process.stdout.write(`Real-E2E Store: ${targetSnapshot.targetStatus.state}\n`);
    process.exitCode = 1;
    return;
  }
  const rawValue = await readHiddenValue();
  const result = await provisioning.provisionExact(definitionId, SecretValue.fromString(rawValue));
  process.stdout.write(`Real-E2E Store: READY\n${String(result.definitionId)}: CONFIGURED\n`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(() => {
    process.stderr.write('Real-E2E provisioning failed.\n');
    process.exitCode = 1;
  });
}
