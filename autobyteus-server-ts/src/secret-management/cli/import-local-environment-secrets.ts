import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stderr } from 'node:process';
import { CanonicalHostLocalImportTargetResolver } from '../provisioning/local-import-target-resolver.js';
import { LocalEnvironmentSecretImportService } from '../provisioning/local-environment-secret-import-service.js';
import {
  LocalEnvironmentSecretImportError,
  type LocalEnvironmentSecretImportPlan,
  type LocalEnvironmentSecretImportRequest,
  type LocalEnvironmentSecretImportResult,
} from '../provisioning/local-environment-secret-import.js';

const invalidOptions = (): never => {
  throw new LocalEnvironmentSecretImportError('IMPORT_OPTIONS_INVALID');
};

export const parseLocalImportArguments = (args: readonly string[]): LocalEnvironmentSecretImportRequest => {
  const normalizedArgs = args[0] === '--' ? args.slice(1) : args;
  let sourceAbsolutePath: string | null = null;
  let target: 'default' | 'e2e' | null = null;
  let dryRun = false;
  let overwrite = false;
  const seen = new Set<string>();

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const option = normalizedArgs[index];
    if (!['--source', '--target', '--dry-run', '--overwrite'].includes(option) || seen.has(option)) {
      invalidOptions();
    }
    seen.add(option);
    if (option === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (option === '--overwrite') {
      overwrite = true;
      continue;
    }
    const value = normalizedArgs[index + 1];
    if (!value || value.startsWith('--')) invalidOptions();
    index += 1;
    if (option === '--source') sourceAbsolutePath = value;
    else if (value === 'default' || value === 'e2e') target = value;
    else invalidOptions();
  }

  if (!sourceAbsolutePath || !path.isAbsolute(sourceAbsolutePath) || !target) return invalidOptions();
  return { sourceAbsolutePath, target, dryRun, overwrite };
};

export const formatLocalImportPlan = (
  target: 'default' | 'e2e',
  plan: LocalEnvironmentSecretImportPlan,
): string => {
  const instruction = 'instructionCode' in plan.targetStatus
    ? plan.targetStatus.instructionCode
    : 'NONE';
  return [
    `TARGET ${target}`,
    `TARGET_STATUS ${plan.targetStatus.state}`,
    ...plan.entries.map((entry) => `${String(entry.definitionId)} ${entry.action}`),
    `CONFIGURED 0`,
    `SKIPPED ${plan.entries.filter((entry) => entry.action === 'SKIPPED_CONFIGURED').length}`,
    `REPLACED 0`,
    `INSTRUCTION ${instruction}`,
  ].join('\n') + '\n';
};

export const formatLocalImportResult = (
  target: 'default' | 'e2e',
  result: LocalEnvironmentSecretImportResult,
): string => [
  `TARGET ${target}`,
  `TARGET_STATUS ${result.targetStatus.state}`,
  ...result.definitionIds.map((definitionId) => `DEFINITION ${String(definitionId)}`),
  `CONFIGURED ${result.configuredCount}`,
  `SKIPPED ${result.skippedCount}`,
  `REPLACED ${result.replacedCount}`,
  `INSTRUCTION ${result.instructionCode}`,
].join('\n') + '\n';

const createConfirmationPort = () => ({
  isDirectTty: (): boolean => Boolean(stdin.isTTY && stderr.isTTY),
  readChallenge: async (expectedPhrase: string): Promise<string | null> => {
    const prompt = createInterface({ input: stdin, output: stderr, terminal: true });
    try {
      return await prompt.question(`Type ${expectedPhrase} to continue: `);
    } finally {
      prompt.close();
    }
  },
});

export const runLocalEnvironmentImportCli = async (args: readonly string[]): Promise<string> => {
  const request = parseLocalImportArguments(args);
  const service = new LocalEnvironmentSecretImportService(
    new CanonicalHostLocalImportTargetResolver(),
  );
  if (request.dryRun) {
    return formatLocalImportPlan(request.target, await service.preview(request));
  }
  return formatLocalImportResult(
    request.target,
    await service.execute(request, createConfirmationPort()),
  );
};

const main = async (): Promise<void> => {
  try {
    process.stdout.write(await runLocalEnvironmentImportCli(process.argv.slice(2)));
  } catch (error) {
    const projected = error instanceof LocalEnvironmentSecretImportError
      ? error.toJSON()
      : { code: 'IMPORT_BATCH_FAILED' as const };
    process.stderr.write(
      `LOCAL_SECRET_IMPORT_FAILED ${projected.code}${projected.target ? ` TARGET ${projected.target}` : ''}\n`,
    );
    process.exitCode = 1;
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main();
}
