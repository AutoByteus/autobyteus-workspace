import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stderr } from 'node:process';
import {
  ApplicationDatabaseLocation,
  ApplicationDatabaseLocationError,
} from '../../config/application-database-location.js';
import { LocalEnvironmentSecretImportService } from '../provisioning/local-environment-secret-import-service.js';
import {
  LocalEnvironmentSecretImportError,
  type ImportRequest,
  type LocalEnvironmentSecretImportPlan,
  type LocalEnvironmentSecretImportResult,
} from '../provisioning/local-environment-secret-import.js';

export type RawImportCliRequest = Readonly<{
  sourcePath: string;
  databaseUrl: string;
  dryRun: boolean;
  overwrite: boolean;
}>;

const invalidOptions = (): never => {
  throw new LocalEnvironmentSecretImportError('IMPORT_OPTIONS_INVALID');
};

export const parseLocalImportArguments = (args: readonly string[]): RawImportCliRequest => {
  const normalizedArgs = args[0] === '--' ? args.slice(1) : args;
  let sourcePath: string | null = null;
  let databaseUrl: string | null = null;
  let dryRun = false;
  let overwrite = false;
  const seen = new Set<string>();
  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const option = normalizedArgs[index];
    if (
      !['--source', '--database-url', '--dry-run', '--overwrite'].includes(option)
      || seen.has(option)
    ) {
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
    if (option === '--source') sourcePath = value;
    if (option === '--database-url') databaseUrl = value;
    index += 1;
  }
  if (!sourcePath || !path.isAbsolute(sourcePath) || !databaseUrl) return invalidOptions();
  return { sourcePath, databaseUrl, dryRun, overwrite };
};

export const createImportRequest = (raw: RawImportCliRequest): ImportRequest => {
  let targetLocation: ApplicationDatabaseLocation;
  try {
    targetLocation = ApplicationDatabaseLocation.fromAbsoluteFileUrl(raw.databaseUrl);
  } catch (error) {
    if (error instanceof ApplicationDatabaseLocationError) invalidOptions();
    throw error;
  }
  return Object.freeze({
    sourcePath: raw.sourcePath,
    targetLocation,
    dryRun: raw.dryRun,
    overwrite: raw.overwrite,
  });
};

export const formatLocalImportPlan = (plan: LocalEnvironmentSecretImportPlan): string => [
  `TARGET ${plan.targetIdentity}`,
  `TARGET_STATUS ${plan.targetState}`,
  ...plan.entries.map((entry) =>
    `${String(entry.secretId)} ${entry.observedStatus} ${entry.plannedAction}`),
  `CREATE ${plan.counts.create}`,
  `SKIP_CONFIGURED ${plan.counts.skipConfigured}`,
  `REPLACE ${plan.counts.replace}`,
  `BLOCKED ${plan.counts.blocked}`,
  `INSTRUCTION ${plan.instructionCode ?? 'NONE'}`,
].join('\n') + '\n';

export const formatLocalImportResult = (result: LocalEnvironmentSecretImportResult): string => [
  `TARGET ${result.targetIdentity}`,
  `TARGET_STATUS ${result.targetState}`,
  ...result.secretIds.map((id) => `SECRET ${String(id)}`),
  `CONFIGURED ${result.configuredCount}`,
  `SKIPPED ${result.skippedCount}`,
  `REPLACED ${result.replacedCount}`,
  `INSTRUCTION ${result.instructionCode}`,
].join('\n') + '\n';

const createConfirmationPort = () => ({
  isDirectTty: (): boolean => Boolean(stdin.isTTY && stderr.isTTY),
  readChallenge: async (
    expectedPhrase: string,
    targetLocation: ApplicationDatabaseLocation,
    plan: LocalEnvironmentSecretImportPlan,
  ): Promise<string | null> => {
    const prompt = createInterface({ input: stdin, output: stderr, terminal: true });
    try {
      stderr.write(formatLocalImportPlan(plan));
      return await prompt.question(
        `Target ${targetLocation.databasePath} (${plan.targetState}). ` +
          `Type ${expectedPhrase} to continue: `,
      );
    } finally {
      prompt.close();
    }
  },
});

type CliExecution = { output: string; blocked: boolean };

const executeCli = async (args: readonly string[]): Promise<CliExecution> => {
  const request = createImportRequest(parseLocalImportArguments(args));
  const service = new LocalEnvironmentSecretImportService();
  if (request.dryRun) {
    const plan = await service.preview(request);
    return { output: formatLocalImportPlan(plan), blocked: plan.counts.blocked > 0 };
  }
  return {
    output: formatLocalImportResult(await service.execute(request, createConfirmationPort())),
    blocked: false,
  };
};

export const runLocalEnvironmentImportCli = async (args: readonly string[]): Promise<string> =>
  (await executeCli(args)).output;

const main = async (): Promise<void> => {
  try {
    const result = await executeCli(process.argv.slice(2));
    process.stdout.write(result.output);
    if (result.blocked) process.exitCode = 1;
  } catch (error) {
    const projected = error instanceof LocalEnvironmentSecretImportError
      ? error.toJSON()
      : { code: 'IMPORT_BATCH_FAILED' as const };
    process.stderr.write(`LOCAL_SECRET_IMPORT_FAILED ${projected.code}\n`);
    process.exitCode = 1;
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) void main();
