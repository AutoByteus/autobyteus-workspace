import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { withFilePathLock } from '../../persistence/file/store-utils.js';

export type CustomProviderReadableIdMapping = {
  oldProviderId: string;
  futureProviderId: string;
};

export type ReadableIdSelectorMigrationDetail = {
  kind: 'JSON_SELECTOR' | 'APPLICATION_SQLITE_SELECTOR';
  filePath: string;
  status: 'MIGRATED' | 'SKIPPED' | 'FAILED';
  message: string;
};

type JsonSelectorKind =
  | 'AGENT_CONFIG'
  | 'TEAM_CONFIG'
  | 'BINDINGS'
  | 'AGENT_RUN_METADATA'
  | 'TEAM_RUN_METADATA'
  | 'IMPROVER_SESSION';

type JsonSelectorCandidate = { kind: JsonSelectorKind; filePath: string };
type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const rewriteCustomProviderModelIdentifier = (
  value: string,
  mappings: readonly CustomProviderReadableIdMapping[],
): string => {
  for (const mapping of mappings) {
    const oldPrefix = `openai-compatible:${mapping.oldProviderId}:`;
    if (value.startsWith(oldPrefix) && value.length > oldPrefix.length) {
      return `openai-compatible:${mapping.futureProviderId}:${value.slice(oldPrefix.length)}`;
    }
  }
  return value;
};

const rewriteField = (
  record: JsonRecord,
  field: string,
  mappings: readonly CustomProviderReadableIdMapping[],
): number => {
  const current = record[field];
  if (current === undefined || current === null) return 0;
  if (typeof current !== 'string') throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
  const next = rewriteCustomProviderModelIdentifier(current, mappings);
  if (next === current) return 0;
  record[field] = next;
  return 1;
};

const rewriteDefaultLaunchConfig = (
  value: unknown,
  mappings: readonly CustomProviderReadableIdMapping[],
): number => {
  if (!isRecord(value)) throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
  const launchConfig = value.defaultLaunchConfig;
  if (launchConfig === undefined || launchConfig === null) return 0;
  if (!isRecord(launchConfig)) throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
  return rewriteField(launchConfig, 'llmModelIdentifier', mappings);
};

const rewriteBindings = (
  value: unknown,
  mappings: readonly CustomProviderReadableIdMapping[],
): number => {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.bindings) ? value.bindings : null;
  if (!rows) throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
  let rewritten = 0;
  for (const row of rows) {
    if (!isRecord(row)) throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
    if (row.launchPreset === undefined || row.launchPreset === null) continue;
    if (!isRecord(row.launchPreset)) throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
    rewritten += rewriteField(row.launchPreset, 'llmModelIdentifier', mappings);
  }
  return rewritten;
};

const rewriteTeamMemberTree = (
  value: unknown,
  mappings: readonly CustomProviderReadableIdMapping[],
): number => {
  if (!Array.isArray(value)) throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
  let rewritten = 0;
  for (const member of value) {
    if (!isRecord(member)) throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
    if (member.memberKind === 'agent') {
      rewritten += rewriteField(member, 'llmModelIdentifier', mappings);
    } else if (member.memberKind === 'agent_team') {
      rewritten += rewriteTeamMemberTree(member.memberTree, mappings);
    } else {
      throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
    }
  }
  return rewritten;
};

const rewriteCandidate = (
  candidate: JsonSelectorCandidate,
  value: unknown,
  mappings: readonly CustomProviderReadableIdMapping[],
): number => {
  if (candidate.kind === 'AGENT_CONFIG' || candidate.kind === 'TEAM_CONFIG') {
    return rewriteDefaultLaunchConfig(value, mappings);
  }
  if (candidate.kind === 'BINDINGS') return rewriteBindings(value, mappings);
  if (!isRecord(value)) throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
  if (candidate.kind === 'TEAM_RUN_METADATA') {
    return rewriteTeamMemberTree(value.memberTree, mappings);
  }
  return rewriteField(value, 'llmModelIdentifier', mappings);
};

const visit = async (
  rootPath: string,
  select: (entryPath: string, entry: Dirent) => JsonSelectorCandidate | null,
  onUnavailable: (directoryPath: string) => void,
): Promise<JsonSelectorCandidate[]> => {
  const candidates: JsonSelectorCandidate[] = [];
  const walk = async (directoryPath: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      onUnavailable(directoryPath);
      return;
    }
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isSymbolicLink()) {
        const selected = select(entryPath, entry);
        if (selected) candidates.push(selected);
      } else if (entry.isDirectory()) await walk(entryPath);
      else if (entry.isFile()) {
        const selected = select(entryPath, entry);
        if (selected) candidates.push(selected);
      }
    }
  };
  await walk(rootPath);
  return candidates;
};

const configCandidate = (filePath: string, entry: Dirent): JsonSelectorCandidate | null => {
  if (entry.name === 'agent-config.json') return { kind: 'AGENT_CONFIG', filePath };
  if (entry.name === 'team-config.json') return { kind: 'TEAM_CONFIG', filePath };
  return null;
};

const namedCandidate = (
  fileName: string,
  kind: JsonSelectorKind,
): ((filePath: string, entry: Dirent) => JsonSelectorCandidate | null) =>
  (filePath, entry) => entry.name === fileName ? { kind, filePath } : null;

const assertWritableRegularFile = async (filePath: string): Promise<number> => {
  const stat = await fs.lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_UNSAFE');
  }
  if ((stat.mode & 0o222) === 0) {
    throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_READ_ONLY');
  }
  await fs.access(filePath, fs.constants.W_OK);
  await fs.access(path.dirname(filePath), fs.constants.W_OK);
  return stat.mode & 0o777;
};

const atomicRewrite = async (filePath: string, bytes: Buffer, mode: number): Promise<void> => {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    const handle = await fs.open(temporaryPath, 'wx', mode);
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temporaryPath, filePath);
    const directory = await fs.open(path.dirname(filePath), 'r');
    try { await directory.sync(); } finally { await directory.close(); }
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
};

const sanitizeFailure = (error: unknown): string =>
  error instanceof Error && /^CUSTOM_PROVIDER_READABLE_ID_SELECTOR_[A-Z_]+$/.test(error.message)
    ? error.message
    : 'CUSTOM_PROVIDER_READABLE_ID_SELECTOR_UNAVAILABLE';

export class CustomProviderReadableIdJsonSelectorMigrator {
  constructor(private readonly paths: {
    configRoots: readonly string[];
    bindingsPath: string;
    agentRunsRoot: string;
    teamRunsRoot: string;
    memoryRoot: string;
  }) {}

  async migrate(
    mappings: readonly CustomProviderReadableIdMapping[],
  ): Promise<ReadableIdSelectorMigrationDetail[]> {
    const candidates = new Map<string, JsonSelectorCandidate>();
    const details: ReadableIdSelectorMigrationDetail[] = [];
    const recordInventoryFailure = (filePath: string): void => {
      details.push({
        kind: 'JSON_SELECTOR',
        filePath,
        status: 'FAILED',
        message: 'CUSTOM_PROVIDER_READABLE_ID_SELECTOR_UNAVAILABLE',
      });
    };
    for (const root of new Set(this.paths.configRoots.map((value) => path.resolve(value)))) {
      for (const candidate of await visit(root, configCandidate, recordInventoryFailure)) {
        candidates.set(candidate.filePath, candidate);
      }
    }
    for (const candidate of await visit(
      this.paths.agentRunsRoot,
      namedCandidate('run_metadata.json', 'AGENT_RUN_METADATA'),
      recordInventoryFailure,
    )) candidates.set(candidate.filePath, candidate);
    for (const candidate of await visit(
      this.paths.teamRunsRoot,
      namedCandidate('team_run_metadata.json', 'TEAM_RUN_METADATA'),
      recordInventoryFailure,
    )) candidates.set(candidate.filePath, candidate);
    for (const candidate of await visit(
      this.paths.memoryRoot,
      (filePath, entry) => entry.name === 'improver_session.json'
        && filePath.split(path.sep).includes('skill_improvement')
        ? { kind: 'IMPROVER_SESSION', filePath }
        : null,
      recordInventoryFailure,
    )) candidates.set(candidate.filePath, candidate);
    try {
      const bindingStat = await fs.lstat(this.paths.bindingsPath);
      if (bindingStat.isFile() || bindingStat.isSymbolicLink()) {
        candidates.set(this.paths.bindingsPath, { kind: 'BINDINGS', filePath: this.paths.bindingsPath });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        recordInventoryFailure(this.paths.bindingsPath);
      }
    }

    for (const candidate of Array.from(candidates.values()).sort(
      (left, right) => left.filePath.localeCompare(right.filePath),
    )) {
      try {
        const detail = await withFilePathLock(candidate.filePath, async () => {
          const mode = await assertWritableRegularFile(candidate.filePath);
          const original = await fs.readFile(candidate.filePath);
          let parsed: unknown;
          try { parsed = JSON.parse(original.toString('utf8')); } catch {
            throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_INVALID');
          }
          const rewrittenCount = rewriteCandidate(candidate, parsed, mappings);
          if (rewrittenCount === 0) return {
            kind: 'JSON_SELECTOR' as const,
            filePath: candidate.filePath,
            status: 'SKIPPED' as const,
            message: 'CUSTOM_PROVIDER_READABLE_ID_SELECTOR_NOT_AFFECTED',
          };
          const next = Buffer.from(`${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
          if (!(await fs.readFile(candidate.filePath)).equals(original)) {
            throw new Error('CUSTOM_PROVIDER_READABLE_ID_SELECTOR_CHANGED');
          }
          await atomicRewrite(candidate.filePath, next, mode);
          return {
            kind: 'JSON_SELECTOR' as const,
            filePath: candidate.filePath,
            status: 'MIGRATED' as const,
            message: `CUSTOM_PROVIDER_READABLE_ID_SELECTOR_REWRITTEN:${rewrittenCount}`,
          };
        });
        details.push(detail);
      } catch (error) {
        details.push({
          kind: 'JSON_SELECTOR',
          filePath: candidate.filePath,
          status: 'FAILED',
          message: sanitizeFailure(error),
        });
      }
    }
    return details;
  }
}
