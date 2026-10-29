import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentPackageService } from "../../agent-packages/services/agent-package-service.js";
import { SkillSourceService } from "../../skills/services/skill-source-service.js";
import {
  notificationKey,
  type UpdateNotificationKind,
  type UpdateNotificationRecord,
  type UpdateNotificationSource,
  type UpdateNotificationView,
  type UpdateSourceState,
} from "../domain/update-notification.js";
import { UpdateNotificationStore } from "../stores/update-notification-store.js";
import { getUpdateNotificationChangeHub } from "../changes/update-notification-change-messages.js";
import { applyOutcome, reconcileRecords, toViews, type OutcomeReport, type SourceState } from "./update-notification-records.js";

/** The owners' facts this operation could read; the kinds whose owner failed are unavailable. */
type SourceStates = { states: Map<string, SourceState>; unavailableKinds: Set<UpdateNotificationKind> };
type Store = Pick<UpdateNotificationStore, "read" | "write">;
type IsListed = (record: UpdateNotificationRecord) => boolean;
/** A command on the reconciled records; returns whether it changed them. */
type Command = (records: UpdateNotificationRecord[], isListed: IsListed) => boolean;

/** A waiting record an automatic update may try, with the revisions the outcome is checked against. */
export type AutomationCandidate = Readonly<{ sourceId: string; latestRevision: string; fromRevision: string }>;

const isWaiting = (record: UpdateNotificationRecord): boolean => record.handledRevision === null;

/**
 * The node's update notifications: one record per source, derived from the source owners' update
 * facts plus the user's read and clear actions and the automatic outcomes (DS-007, DS-008). Every
 * operation runs one at a time; records are persisted and announced only when something changed.
 */
export class UpdateNotificationService {
  private static instance: UpdateNotificationService | null = null;

  static getInstance(): UpdateNotificationService {
    return UpdateNotificationService.instance ??= new UpdateNotificationService({
      sources: [
        { kind: "AGENT_PACKAGE", listUpdateStates: () => AgentPackageService.getInstance().listGitHubSourceUpdateStates() },
        { kind: "SKILL_SOURCE", listUpdateStates: () => SkillSourceService.getInstance().listGitHubSourceUpdateStates() },
      ],
      store: new UpdateNotificationStore(appConfigProvider.config.getAppDataDir()),
      publish: () => getUpdateNotificationChangeHub().broadcast({ type: "update_notifications_changed" }),
    });
  }

  static resetInstance(): void {
    UpdateNotificationService.instance = null;
  }

  private queue: Promise<unknown> = Promise.resolve();
  /** The agent runtimes, on the desktop's embedded node only (set by the composition). */
  private runtimeSource: UpdateNotificationSource | null = null;

  constructor(private readonly deps: {
    sources: readonly UpdateNotificationSource[];
    store: Store;
    publish: () => void;
    now?: () => Date;
  }) {}

  /** The agent runtime kind's source; null where this node does not check runtimes (AR-005). */
  setRuntimeSource(source: UpdateNotificationSource | null): void {
    this.runtimeSource = source;
  }

  listNotifications(): Promise<UpdateNotificationView[]> {
    return this.run(() => false);
  }

  reconcile(): Promise<UpdateNotificationView[]> {
    return this.run(() => false);
  }

  /** The user opened the notification area: every listed waiting record and every unread automatic outcome is read. */
  markAllRead(): Promise<UpdateNotificationView[]> {
    return this.run((records, isListed) => {
      let changed = false;
      for (const record of records) {
        const unreadOutcome = record.outcome === "AUTO_UPDATED";
        if (isListed(record) && (isWaiting(record) || unreadOutcome) && !record.read) {
          record.read = true;
          changed = true;
        }
      }
      return changed;
    });
  }

  /** Removes a handled notification; a waiting one goes only by an update or a newer version. */
  clear(kind: UpdateNotificationKind, sourceId: string): Promise<UpdateNotificationView[]> {
    return this.run((records, isListed) => {
      const index = records.findIndex((record) => isListed(record) && record.kind === kind && record.sourceId === sourceId);
      if (index < 0) throw new Error("Update notification not found.");
      if (isWaiting(records[index]!)) throw new Error("Only an updated notification can be cleared.");
      records.splice(index, 1);
      return true;
    });
  }

  /**
   * The waiting records of a kind an automatic update may try now: all of them, except those whose
   * automatic update failed less than `failedRetryMs` ago (REQ-009).
   */
  async listAutomationCandidates(kind: UpdateNotificationKind, failedRetryMs: number): Promise<AutomationCandidate[]> {
    let candidates: AutomationCandidate[] = [];
    await this.run((records, isListed) => {
      const now = this.now().getTime();
      candidates = records
        .filter((record) => record.kind === kind && isListed(record) && isWaiting(record))
        .filter((record) => record.outcome !== "AUTO_FAILED" || Date.parse(record.outcomeAt ?? "") + failedRetryMs <= now)
        .map((record) => ({ sourceId: record.sourceId, latestRevision: record.latestRevision, fromRevision: record.fromRevision }));
      return false;
    });
    return candidates;
  }

  /**
   * Records an automatic update's outcome on the record it was tried for (DS-008). `not_applied`
   * when that record is gone or was replaced meanwhile; nothing is changed then.
   */
  async recordOutcome(kind: UpdateNotificationKind, sourceId: string, report: OutcomeReport): Promise<"applied" | "not_applied"> {
    let result: ReturnType<typeof applyOutcome> = "not_applied";
    await this.run((records, isListed) => {
      const record = records.find((entry) => entry.kind === kind && entry.sourceId === sourceId && isListed(entry));
      result = record ? applyOutcome(record, report, this.now().toISOString()) : "not_applied";
      return result === "changed";
    });
    if (result === "not_applied") console.info(`UPDATE_NOTIFICATIONS_OUTCOME_NOT_APPLIED:${kind}:${sourceId}:${report.outcome}`);
    return result === "not_applied" ? "not_applied" : "applied";
  }

  /**
   * Reconciles, applies the command, persists and announces when anything changed. A command acts
   * on listed records only: those whose owner could be read in this operation.
   */
  private run(command: Command): Promise<UpdateNotificationView[]> {
    const next = this.queue.catch(() => undefined).then(async () => {
      const { states, unavailableKinds } = await this.readSourceStates();
      const stored = await this.deps.store.read();
      const { records, changed } = reconcileRecords(stored, states, unavailableKinds, this.now().toISOString());
      const isListed: IsListed = (record) => states.has(notificationKey(record.kind, record.sourceId));
      const commandChanged = command(records, isListed);
      if (changed || commandChanged) {
        await this.deps.store.write(records);
        this.deps.publish();
      }
      return toViews(records, states);
    });
    this.queue = next;
    return next;
  }

  /**
   * Each owner is read on its own: one that cannot be read (for example an unreadable skill source
   * registry, which its owner reports elsewhere) leaves the other kinds working.
   */
  private async readSourceStates(): Promise<SourceStates> {
    const states = new Map<string, SourceState>();
    const unavailableKinds = new Set<UpdateNotificationKind>();
    const sources = this.runtimeSource ? [...this.deps.sources, this.runtimeSource] : this.deps.sources;
    for (const source of sources) {
      let ownerStates: UpdateSourceState[];
      try {
        ownerStates = await source.listUpdateStates();
      } catch (error) {
        console.warn(`UPDATE_NOTIFICATIONS_SOURCE_UNAVAILABLE:${source.kind}`, error);
        unavailableKinds.add(source.kind);
        continue;
      }
      for (const state of ownerStates) {
        states.set(notificationKey(source.kind, state.sourceId), { ...state, kind: source.kind });
      }
    }
    return { states, unavailableKinds };
  }

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }
}
