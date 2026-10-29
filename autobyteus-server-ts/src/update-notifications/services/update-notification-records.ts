import {
  notificationKey,
  type UpdateNotificationKind,
  type UpdateNotificationRecord,
  type UpdateNotificationView,
  type UpdateSourceState,
} from "../domain/update-notification.js";

/** One source's facts with the kind of the owner that reported it. */
export type SourceState = UpdateSourceState & { kind: UpdateNotificationKind };

/**
 * An automatic update's outcome, with the revision of the record it was tried for:
 * `candidateFrom` (the record's installed revision) for an update, `candidateLatest` (the found
 * revision) for a failure or a wait.
 */
export type OutcomeReport =
  | Readonly<{ outcome: "AUTO_UPDATED"; candidateFrom: string }>
  | Readonly<{ outcome: "AUTO_FAILED" | "AUTO_WAITING"; candidateLatest: string; reason: string }>;

const isWaiting = (record: UpdateNotificationRecord): boolean => record.handledRevision === null;

const NO_OUTCOME = { outcome: null, outcomeReason: null, outcomeAt: null } as const;

/**
 * DS-007 with DS-008's outcome rules: the records that match the sources' current facts. Records
 * of a kind whose owner could not be read are kept unchanged: their source is unknown, not gone.
 * A newer revision replaces a record and a record that becomes handled loses its outcome.
 */
export const reconcileRecords = (
  stored: readonly UpdateNotificationRecord[],
  states: ReadonlyMap<string, SourceState>,
  unavailableKinds: ReadonlySet<UpdateNotificationKind>,
  now: string,
): { records: UpdateNotificationRecord[]; changed: boolean } => {
  let changed = false;
  const byKey = new Map<string, UpdateNotificationRecord>();
  for (const record of stored) {
    const key = notificationKey(record.kind, record.sourceId);
    if (byKey.has(key) || (!states.has(key) && !unavailableKinds.has(record.kind))) {
      changed = true; // Source gone, or a duplicate row.
      continue;
    }
    byKey.set(key, { ...record });
  }

  for (const [key, state] of states) {
    const record = byKey.get(key);
    const installed = state.installedRevision;
    if (installed === null) continue;
    const latest = state.latestRevision;
    if (latest !== null && latest !== installed) {
      if (!record || !isWaiting(record) || record.latestRevision !== latest) {
        byKey.set(key, {
          kind: state.kind, sourceId: state.sourceId, latestRevision: latest, fromRevision: installed,
          foundAt: now, read: false, handledRevision: null, handledAt: null, ...NO_OUTCOME,
        });
        changed = true;
      }
      continue;
    }
    if (!record || !isWaiting(record)) continue;
    if (installed !== record.fromRevision) {
      // Updated by any path: a manual update after an automatic failure or wait shows "Updated to …".
      byKey.set(key, { ...record, handledRevision: installed, handledAt: now, ...NO_OUTCOME });
      changed = true;
    } else if (latest === installed) {
      // Nothing was updated and no update is offered any more (DEC-015).
      byKey.delete(key);
      changed = true;
    }
  }
  return { records: [...byKey.values()], changed };
};

/**
 * Applies an automatic outcome to the record it was tried for (DS-008). `not_applied` (nothing
 * changed) when the record is no longer that one.
 * - `AUTO_UPDATED`: the record is handled and still from `candidateFrom`; it becomes unread.
 * - `AUTO_FAILED` / `AUTO_WAITING`: the record still waits for `candidateLatest`; it becomes unread
 *   only when the previous outcome was not the same one (one notice per revision, REQ-009). A wait
 *   repeated with the same reason (every tick while agents run) changes nothing.
 */
export const applyOutcome = (
  record: UpdateNotificationRecord,
  report: OutcomeReport,
  now: string,
): "changed" | "unchanged" | "not_applied" => {
  if (report.outcome === "AUTO_UPDATED") {
    if (isWaiting(record) || record.fromRevision !== report.candidateFrom) return "not_applied";
    Object.assign(record, { outcome: "AUTO_UPDATED", outcomeReason: null, outcomeAt: now, read: false });
    return "changed";
  }
  if (!isWaiting(record) || record.latestRevision !== report.candidateLatest) return "not_applied";
  const repeated = record.outcome === report.outcome;
  if (repeated && report.outcome === "AUTO_WAITING" && record.outcomeReason === report.reason) return "unchanged";
  Object.assign(record, { outcome: report.outcome, outcomeReason: report.reason, outcomeAt: now });
  if (!repeated) record.read = false;
  return "changed";
};

export const toViews = (
  records: readonly UpdateNotificationRecord[],
  states: ReadonlyMap<string, SourceState>,
): UpdateNotificationView[] => records.flatMap((record) => {
  const state = states.get(notificationKey(record.kind, record.sourceId));
  if (!state) return [];
  return [{
    kind: record.kind,
    sourceId: record.sourceId,
    name: state.displayName,
    repositoryUrl: state.repositoryUrl,
    defaultBranch: state.defaultBranch,
    installedRevision: record.fromRevision,
    latestRevision: record.latestRevision,
    foundAt: record.foundAt,
    read: record.read,
    state: isWaiting(record) ? "WAITING" : "HANDLED",
    handledRevision: record.handledRevision,
    handledAt: record.handledAt,
    outcome: record.outcome,
    outcomeReason: record.outcomeReason,
    outcomeAt: record.outcomeAt,
  }];
});
