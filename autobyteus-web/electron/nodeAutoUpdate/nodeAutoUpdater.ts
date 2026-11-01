import { logger } from '../logger';
import type { NodeEntry } from '../../types/node';
import type { NodeAutoUpdateEntries } from '../../shared/nodeAutoUpdateTypes';
import { decideNodeAutoUpdate, reconcileNodeAutoUpdate } from './decideNodeAutoUpdate';
import type { NodeAutoUpdateRecord } from './nodeAutoUpdateRecord';
import type { NodeUpdateClient } from './nodeUpdateClient';

export const NODE_AUTO_UPDATE_FIRST_PASS_MS = 2 * 60_000;
export const NODE_AUTO_UPDATE_PASS_INTERVAL_MS = 60 * 60_000;
export const NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS = 10_000;
export const NODE_AUTO_UPDATE_FOLLOW_MAX_MS = 15 * 60_000;

type NodeAutoUpdaterOptions = Readonly<{
  /** The registry snapshot's nodes, read at every step (a switch or address change applies at once). */
  getNodes: () => readonly NodeEntry[];
  /** The version every node is updated to: this desktop's own (DEC-003). */
  appVersion: string;
  isPackaged: boolean;
  record: NodeAutoUpdateRecord;
  client: NodeUpdateClient;
  /** The record changed (the application broadcasts it to the windows). */
  onChange?: (entries: NodeAutoUpdateEntries) => void;
  now?: () => number;
}>;

const isAutoUpdated = (node: NodeEntry): boolean => node.nodeType === 'remote' && node.autoUpdate === true;

/**
 * The desktop's automatic node updates (autobyteus-356, DS-003), in the main process so they run with no window open.
 * Packaged builds only, remote entries with the switch on only. A pass runs 2 minutes after the start and then every
 * 60 minutes, never overlapping, checking the nodes one after another; a node whose switch turns on is checked at
 * once. An accepted update is followed on its own timer (every 10 s, at most 15 minutes), and a followed node is
 * skipped by passes until its follow ends.
 */
export class NodeAutoUpdater {
  private passTimer: ReturnType<typeof setTimeout> | null = null;
  private pass: Promise<void> | null = null;
  private readonly checking = new Set<string>();
  private readonly follows = new Map<string, ReturnType<typeof setTimeout>>();
  private enabledIds = new Set<string>();
  private started = false;
  private stopped = false;
  private readonly now: () => number;

  constructor(private readonly options: NodeAutoUpdaterOptions) {
    this.now = options.now ?? Date.now;
  }

  start(): void {
    if (!this.options.isPackaged) {
      logger.info('[node-auto-update] Skipping automatic node updates in an unpackaged runtime.');
      return;
    }
    if (this.started || this.stopped) return;
    this.started = true;
    this.enabledIds = this.currentEnabledIds();
    this.schedulePass(NODE_AUTO_UPDATE_FIRST_PASS_MS);
  }

  stop(): void {
    this.stopped = true;
    if (this.passTimer) clearTimeout(this.passTimer);
    this.passTimer = null;
    for (const timer of this.follows.values()) clearTimeout(timer);
    this.follows.clear();
  }

  /** The registry changed: drop the entries of removed nodes, and check at once a node whose switch turned on. */
  nodesChanged(): void {
    const nodes = this.options.getNodes();
    if (this.options.record.retain(new Set(nodes.map((node) => node.id)))) this.emitChange();
    for (const [entryId, timer] of this.follows) {
      if (!nodes.some((node) => node.id === entryId)) { clearTimeout(timer); this.follows.delete(entryId); }
    }
    if (!this.started || this.stopped) return;
    const enabled = this.currentEnabledIds();
    const turnedOn = [...enabled].filter((entryId) => !this.enabledIds.has(entryId));
    this.enabledIds = enabled;
    for (const entryId of turnedOn) void this.checkNode(entryId);
  }

  /** One pass over the nodes with the switch on; a pass already running is returned, never doubled. */
  runPass(): Promise<void> {
    if (!this.pass) {
      this.pass = (async () => {
        for (const entryId of this.currentEnabledIds()) {
          if (this.stopped) return;
          await this.checkNode(entryId);
        }
      })().finally(() => { this.pass = null; });
    }
    return this.pass;
  }

  private schedulePass(delayMs: number): void {
    this.passTimer = setTimeout(() => {
      this.passTimer = null;
      void this.runPass().finally(() => { if (!this.stopped) this.schedulePass(NODE_AUTO_UPDATE_PASS_INTERVAL_MS); });
    }, delayMs);
  }

  private currentEnabledIds(): Set<string> {
    return new Set(this.options.getNodes().filter(isAutoUpdated).map((node) => node.id));
  }

  private enabledNode(entryId: string): NodeEntry | null {
    return this.options.getNodes().find((node) => node.id === entryId && isAutoUpdated(node)) ?? null;
  }

  /** DS-003 steps 1–4 for one node. A node being checked or followed is left alone. */
  private async checkNode(entryId: string): Promise<void> {
    if (this.checking.has(entryId) || this.follows.has(entryId)) return;
    const node = this.enabledNode(entryId);
    if (!node) return;
    this.checking.add(entryId);
    try {
      const version = this.options.appVersion;
      const status = await this.options.client.getStatus(node.baseUrl, version);
      if (this.stopped || !status) return;
      this.reconcile(entryId, status, version);
      // The switch is read again after the answer: turned off meanwhile, nothing is requested.
      const current = this.enabledNode(entryId);
      if (!current || decideNodeAutoUpdate(status, version, this.options.record.get(entryId)) !== 'request') return;
      const result = await this.options.client.requestUpdate(current.baseUrl, version);
      if (this.stopped) return;
      if (result.kind !== 'accepted') {
        logger.info(`[node-auto-update] Node ${entryId} did not take the update to ${version} (${result.kind}): ${result.message}`);
        return;
      }
      this.options.record.set(entryId, {
        version, requestedAt: new Date(this.now()).toISOString(), outcome: 'PENDING', reason: null, read: false,
      });
      this.emitChange();
      this.follow(entryId, version);
    } finally {
      this.checking.delete(entryId);
    }
  }

  /** Follows an accepted update until it ends or 15 minutes pass (the entry then stays pending for a later pass). */
  private follow(entryId: string, version: string): void {
    const startedAt = this.now();
    const tick = async (): Promise<void> => {
      const node = this.options.getNodes().find((candidate) => candidate.id === entryId);
      if (this.stopped || !node || !this.follows.has(entryId)) return;
      // A node that restarts does not answer for a while; that is expected.
      const status = await this.options.client.getStatus(node.baseUrl, version);
      if (this.stopped || !this.follows.has(entryId)) return;
      if (status) this.reconcile(entryId, status, version);
      const ended = this.options.record.get(entryId)?.outcome !== 'PENDING';
      if (ended || this.now() - startedAt >= NODE_AUTO_UPDATE_FOLLOW_MAX_MS) {
        this.follows.delete(entryId);
        return;
      }
      this.follows.set(entryId, setTimeout(() => { void tick(); }, NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS));
    };
    this.follows.set(entryId, setTimeout(() => { void tick(); }, NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS));
  }

  private reconcile(entryId: string, status: Parameters<typeof reconcileNodeAutoUpdate>[1], version: string): void {
    const next = reconcileNodeAutoUpdate(this.options.record.get(entryId), status, version, this.now());
    if (!next) return;
    this.options.record.set(entryId, next);
    this.emitChange();
  }

  private emitChange(): void {
    this.options.onChange?.(this.options.record.all());
  }
}
