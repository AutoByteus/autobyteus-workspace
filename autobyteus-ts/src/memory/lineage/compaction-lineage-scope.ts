export type CompactionLineageScope =
  | { targetKind: 'agent_run'; runId: string; memberId: null }
  | { targetKind: 'team_member'; runId: string; memberId: string };

const requireId = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
};

export const normalizeCompactionLineageScope = (value: unknown): CompactionLineageScope => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Compaction lineage scope must be an object.');
  }
  const record = value as Record<string, unknown>;
  const runId = requireId(record.runId, 'scope.runId');
  if (record.targetKind === 'agent_run') {
    if (record.memberId !== null) throw new Error('Agent-run lineage scope requires memberId null.');
    return { targetKind: 'agent_run', runId, memberId: null };
  }
  if (record.targetKind === 'team_member') {
    return {
      targetKind: 'team_member',
      runId,
      memberId: requireId(record.memberId, 'scope.memberId'),
    };
  }
  throw new Error(`Unsupported lineage target kind '${String(record.targetKind)}'.`);
};

export const sameCompactionLineageScope = (
  left: CompactionLineageScope,
  right: CompactionLineageScope,
): boolean =>
  left.targetKind === right.targetKind
  && left.runId === right.runId
  && left.memberId === right.memberId;
