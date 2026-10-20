import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentPackageService } from "../../agent-packages/services/agent-package-service.js";
import { SkillSourceService } from "../../skills/services/skill-source-service.js";
import type { GitHubSourceUpdateState } from "../../integrations/github/github-source-update-state.js";
import {
  notificationKey,
  type UpdateNotificationKind,
  type UpdateNotificationRecord,
  type UpdateNotificationSource,
  type UpdateNotificationView,
} from "../domain/update-notification.js";
import { UpdateNotificationStore } from "../stores/update-notification-store.js";
import { getUpdateNotificationChangeHub } from "../changes/update-notification-change-messages.js";

type SourceState = GitHubSourceUpdateState & { kind: UpdateNotificationKind };
/** The owners' facts this operation could read; the kinds whose owner failed are unavailable. */
type SourceStates = { states: Map<string, SourceState>; unavailableKinds: Set<UpdateNotificationKind> };
type Store = Pick<UpdateNotificationStore, "read" | "write">;

const isWaiting = (record: UpdateNotificationRecord): boolean => record.handledRevision === null;

/**
 * The node's update notifications: one record per source, derived from the source owners' update
 * facts plus the user's read and clear actions (DS-007). Every operation runs one at a time;
 * records are persisted and announced only when something changed.
 */
export class UpdateNotificationService {
  private static instance: UpdateNotificationService | null = null;

  static getInstance(): UpdateNotificationService {
    return UpdateNotificationService.instance ??= new UpdateNotificationService({
      sources: [
        { kind: "AGENT_PACKAGE", listGitHubSourceUpdateStates: () => AgentPackageService.getInstance().listGitHubSourceUpdateStates() },
        { kind: "SKILL_SOURCE", listGitHubSourceUpdateStates: () => SkillSourceService.getInstance().listGitHubSourceUpdateStates() },
      ],
      store: new UpdateNotificationStore(appConfigProvider.config.getAppDataDir()),
      publish: () => getUpdateNotificationChangeHub().broadcast({ type: "update_notifications_changed" }),
    });
  }

  static resetInstance(): void {
    UpdateNotificationService.instance = null;
  }

  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: {
    sources: readonly UpdateNotificationSource[];
    store: Store;
    publish: () => void;
    now?: () => Date;
  }) {}

  listNotifications(): Promise<UpdateNotificationView[]> {
    return this.run(() => false);
  }

  reconcile(): Promise<UpdateNotificationView[]> {
    return this.run(() => false);
  }

  /** Marks every listed waiting notification read (the user opened the notification area). */
  markAllRead(): Promise<UpdateNotificationView[]> {
    return this.run((records, isListed) => {
      let changed = false;
      for (const record of records) {
        if (isListed(record) && isWaiting(record) && !record.read) {
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
   * Reconciles, applies the command, persists and announces when anything changed. A command acts
   * on listed records only: those whose owner could be read in this operation.
   */
  private run(
    command: (records: UpdateNotificationRecord[], isListed: (record: UpdateNotificationRecord) => boolean) => boolean,
  ): Promise<UpdateNotificationView[]> {
    const next = this.queue.catch(() => undefined).then(async () => {
      const { states, unavailableKinds } = await this.readSourceStates();
      const stored = await this.deps.store.read();
      const { records, changed } = reconcileRecords(stored, states, unavailableKinds, this.now().toISOString());
      const isListed = (record: UpdateNotificationRecord) => states.has(notificationKey(record.kind, record.sourceId));
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
    for (const source of this.deps.sources) {
      let ownerStates: GitHubSourceUpdateState[];
      try {
        ownerStates = await source.listGitHubSourceUpdateStates();
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

/**
 * DS-007: the records that match the sources' current facts. Records of a kind whose owner could
 * not be read are kept unchanged: their source is unknown, not gone.
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
          foundAt: now, read: false, handledRevision: null, handledAt: null,
        });
        changed = true;
      }
      continue;
    }
    if (!record || !isWaiting(record)) continue;
    if (installed !== record.fromRevision) {
      byKey.set(key, { ...record, handledRevision: installed, handledAt: now });
      changed = true;
    } else if (latest === installed) {
      // Nothing was updated and no update is offered any more (DEC-015).
      byKey.delete(key);
      changed = true;
    }
  }
  return { records: [...byKey.values()], changed };
};

const toViews = (
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
  }];
});
