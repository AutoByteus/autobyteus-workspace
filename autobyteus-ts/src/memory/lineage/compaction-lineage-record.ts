import {
  normalizeCompactionLineageScope,
  type CompactionLineageScope,
} from './compaction-lineage-scope.js';

export const COMPACTION_LINEAGE_SCHEMA_VERSION = 1;
export const COMPACTION_LINEAGE_SUPPORTED_PROMPT_CONTRACT_VERSIONS = [1, 2, 3] as const;
export type CompactionLineagePromptContractVersion =
  typeof COMPACTION_LINEAGE_SUPPORTED_PROMPT_CONTRACT_VERSIONS[number];
export const COMPACTION_LINEAGE_CURRENT_PROMPT_CONTRACT_VERSION:
  CompactionLineagePromptContractVersion = 3;

const isSupportedPromptContractVersion = (
  value: unknown,
): value is CompactionLineagePromptContractVersion =>
  COMPACTION_LINEAGE_SUPPORTED_PROMPT_CONTRACT_VERSIONS.some(
    (version) => version === value,
  );

export type CompactionLineageExecution = {
  runtimeKind: string;
  provider: string;
  model: string;
  selectionPolicyVersion: 1;
  promptContractVersion: CompactionLineagePromptContractVersion;
  renderedInputSha256?: string;
};

export type CompactionLineageRecord = {
  schemaVersion: 1;
  scope: CompactionLineageScope;
  compactionId: string;
  previousCompactionId: string | null;
  episodeIds: string[];
  semanticIds: string[];
  derivedAt: string;
  execution: CompactionLineageExecution;
  integrity?: { recordSha256: string };
};

const requireText = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
};

const requireIds = (value: unknown, fieldName: string): string[] => {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array.`);
  const ids = value.map((item, index) => requireText(item, `${fieldName}[${index}]`));
  if (new Set(ids).size !== ids.length) throw new Error(`${fieldName} contains duplicate IDs.`);
  return ids;
};

const requireIsoTime = (value: unknown, fieldName: string): string => {
  const text = requireText(value, fieldName);
  if (!Number.isFinite(Date.parse(text))) throw new Error(`${fieldName} must be an ISO timestamp.`);
  return text;
};

export const normalizeCompactionLineageRecord = (value: unknown): CompactionLineageRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Compaction lineage record must be an object.');
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== COMPACTION_LINEAGE_SCHEMA_VERSION) {
    throw new Error(`Unsupported compaction lineage schema '${String(record.schemaVersion)}'.`);
  }
  const previousCompactionId = record.previousCompactionId === null
    ? null
    : requireText(record.previousCompactionId, 'previousCompactionId');
  const episodeIds = requireIds(record.episodeIds, 'episodeIds');
  const semanticIds = requireIds(record.semanticIds, 'semanticIds');
  if (episodeIds.length < 1) {
    throw new Error('Compaction output membership requires at least one episode.');
  }
  if (!record.execution || typeof record.execution !== 'object' || Array.isArray(record.execution)) {
    throw new Error('Compaction lineage execution metadata is required.');
  }
  const execution = record.execution as Record<string, unknown>;
  if (execution.selectionPolicyVersion !== 1) {
    throw new Error('Unsupported compaction selection policy version.');
  }
  const promptContractVersion = execution.promptContractVersion;
  if (!isSupportedPromptContractVersion(promptContractVersion)) {
    throw new Error('Unsupported compaction selection or prompt contract version.');
  }
  const renderedInputSha256 = execution.renderedInputSha256 === undefined
    ? undefined
    : requireText(execution.renderedInputSha256, 'execution.renderedInputSha256');
  if (renderedInputSha256 && !/^[a-f0-9]{64}$/i.test(renderedInputSha256)) {
    throw new Error('execution.renderedInputSha256 must be a SHA-256 hex digest.');
  }
  const integrity = record.integrity === undefined
    ? undefined
    : {
        recordSha256: requireText(
          (record.integrity as Record<string, unknown>)?.recordSha256,
          'integrity.recordSha256',
        ),
      };
  return {
    schemaVersion: 1,
    scope: normalizeCompactionLineageScope(record.scope),
    compactionId: requireText(record.compactionId, 'compactionId'),
    previousCompactionId,
    episodeIds,
    semanticIds,
    derivedAt: requireIsoTime(record.derivedAt, 'derivedAt'),
    execution: {
      runtimeKind: requireText(execution.runtimeKind, 'execution.runtimeKind'),
      provider: requireText(execution.provider, 'execution.provider'),
      model: requireText(execution.model, 'execution.model'),
      selectionPolicyVersion: 1,
      promptContractVersion,
      ...(renderedInputSha256 ? { renderedInputSha256 } : {}),
    },
    ...(integrity ? { integrity } : {}),
  };
};
