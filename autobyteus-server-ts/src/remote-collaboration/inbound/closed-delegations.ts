import fs from "node:fs/promises";
import path from "node:path";
import { atomicWriteJsonFile } from "../../run-history/store/atomic-json-file-writer.js";
import type { RemoteStartedRunRef } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * The file's one entry: a peer-started run whose delegating node (`nodeId`) closed every Task naming it, and when this node
 * learned it.
 */
type ClosedDelegationEntry = Readonly<{ kind: RemoteStartedRunRef["kind"]; runId: string; nodeId: string; closedAt: string }>;

const FILE_NAME = "closed-delegations.json";
const keyOf = (run: RemoteStartedRunRef): string => `${run.kind}:${run.runId}`;
const entryOf = (value: unknown): ClosedDelegationEntry | null => {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  if ((v.kind !== "agent" && v.kind !== "agent_team") || typeof v.runId !== "string" || !v.runId.trim()) return null;
  return { kind: v.kind, runId: v.runId, nodeId: typeof v.nodeId === "string" ? v.nodeId : "", closedAt: typeof v.closedAt === "string" ? v.closedAt : "" };
};

/** A host that takes no delegations from peers (the application host): no run of it was closed by one. */
export const NO_CLOSED_DELEGATIONS: Readonly<Pick<ClosedDelegations, "has">> = Object.freeze({ has: () => false });

/**
 * autobyteus-591 DN-5 (SR-009): this node's one record of the peer-started runs whose delegating node closed every Task
 * naming them (`<appDataDir>/remote-collaboration/closed-delegations.json`). Absence means open. It loads once at
 * start; each change is written whole and atomically, in order. The reader is tolerant (it keeps the known fields of
 * the entries it can read); the writer is exact. Written by the delegated-run state handler and by an inbound message
 * from the delegating node (S-5); read by the run list (DN-6) in memory.
 */
export class ClosedDelegations {
  private readonly entries = new Map<string, ClosedDelegationEntry>();
  private writes: Promise<void> = Promise.resolve();
  private loaded = false;

  constructor(private readonly filePath: string, private readonly now: () => Date = () => new Date()) {}

  static inAppDataDir(appDataDir: string, now?: () => Date): ClosedDelegations {
    return new ClosedDelegations(path.join(appDataDir, "remote-collaboration", FILE_NAME), now);
  }

  /** Reads the record once; no file is an empty record, and an unreadable one is empty with a warning (every run listed). */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    let raw: string;
    try { raw = await fs.readFile(this.filePath, "utf-8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") console.warn("CLOSED_DELEGATIONS_UNREADABLE", { file: this.filePath, error: String(error) });
      return;
    }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch (error) { console.warn("CLOSED_DELEGATIONS_UNREADABLE", { file: this.filePath, error: String(error) }); return; }
    if (!Array.isArray(parsed)) { console.warn("CLOSED_DELEGATIONS_UNREADABLE", { file: this.filePath, error: "the file is not a list" }); return; }
    for (const value of parsed) {
      const entry = entryOf(value);
      if (entry) this.entries.set(keyOf(entry), entry);
    }
  }

  has(run: RemoteStartedRunRef): boolean {
    return this.entries.has(keyOf(run));
  }

  /** Records the run as closed by its delegating node; already recorded keeps its first time (idempotent). */
  async close(run: RemoteStartedRunRef, nodeId: string): Promise<void> {
    if (this.has(run)) return this.writes;
    this.entries.set(keyOf(run), { kind: run.kind, runId: run.runId, nodeId, closedAt: this.now().toISOString() });
    return this.write();
  }

  /** Removes the run (open again, or deleted on this node); absent is a no-op. */
  async open(run: RemoteStartedRunRef): Promise<void> {
    if (!this.entries.delete(keyOf(run))) return this.writes;
    return this.write();
  }

  /**
   * S-5: the run took a linked message or work from `nodeId`. Only its delegating node's opens it: a node this run
   * delegated to may message it too, and says nothing about the delegating node's Tasks.
   */
  async openedBy(run: RemoteStartedRunRef, nodeId: string): Promise<void> {
    const entry = this.entries.get(keyOf(run));
    if (!entry || (entry.nodeId && entry.nodeId !== nodeId)) return this.writes;
    return this.open(run);
  }

  /** A run deleted on this node (after its delete committed) leaves the record (ARCH-REV-004 note 1); never throws. */
  runDeleted(root: Pick<RootExecutionIdentity, "rootSubjectKind" | "rootRunId">): void {
    if (root.rootSubjectKind === "agent_org") return;
    void this.open({ kind: root.rootSubjectKind, runId: root.rootRunId })
      .catch((error: unknown) => console.warn("CLOSED_DELEGATIONS_WRITE_FAILED", { run: root, error: String(error) }));
  }

  /** Writes the whole record after any earlier write; each write carries the state at its turn. */
  private write(): Promise<void> {
    const next = this.writes.catch(() => undefined).then(() => atomicWriteJsonFile(this.filePath,
      [...this.entries.values()].map((entry) => ({ kind: entry.kind, runId: entry.runId, nodeId: entry.nodeId, closedAt: entry.closedAt }))));
    this.writes = next;
    return next;
  }
}
