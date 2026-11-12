import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import {
  runIdentityOf,
  type PeerRunMember, type RunDelegatedFrom, type TaskEntriesListener, type TaskExecutionResourcePort, type TaskRunEntry,
} from "../execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../execution/task/task-execution-reference.js";

/** One agent of a run: its run ID and its own address in its run's space (`null`: an agent run not yet collaborating). */
/** An agent of a run: its run, its address in the run, and its definition (`null` for a peer's run, whose node keeps it). */
export type RunAgent = Readonly<{ agentRunId: string; address: string | null; agentDefinitionId: string | null }>;

/**
 * The agents of a run, read from the run's own file (contract §4, `model.py` `agents_with_addresses`): an agent run's
 * own agent; a team run's members; an org run's direct agents and its mounted teams' members. `null` when the file is
 * absent or unreadable. Bound by the composition (run-history owns the files).
 */
export interface RunAgentsReader {
  agentsOf(run: RootExecutionIdentity): Promise<readonly RunAgent[] | null>;
}

/** A run that a run delegated to, whose Task work is open (one hop, DS-8). */
export type DelegatedChild = Readonly<{
  run: TaskExecutionReference;
  /** Its newest open Task. */
  taskId: string;
  delegatorAgentRunId: string;
  entryAgentRunId: string;
  started: boolean;
  linkedAt: string;
  /** Its name under this run: the address it was delegated to. */
  recipientAddress: string;
  nodeId?: string;
  members?: readonly PeerRunMember[];
}>;

/** A run's open children changed (DS-8, SR-042): the rows that came and the runs that left its view. */
export type ChildRowsChange = Readonly<{
  run: RootExecutionIdentity;
  added: readonly DelegatedChild[];
  removed: readonly TaskExecutionReference[];
}>;

type Source = Pick<TaskExecutionResourcePort, "taskIdsWithEntries" | "entriesOf">;
const keyOf = rootExecutionIdentityKey;
const newest = (entries: readonly TaskRunEntry[]): TaskRunEntry | undefined =>
  entries.reduce<TaskRunEntry | undefined>((best, entry) => !best || entry.linkedAt > best.linkedAt
    || (entry.linkedAt === best.linkedAt && entry.taskId > best.taskId) ? entry : best, undefined);

/**
 * The relationships between runs, in memory (contract §2.6, TC-11). Owner: collaboration. It holds no run's life (P6).
 *
 * - Nodes: every run a Task entry names, and every run an entry names as its delegating run. Edges: child → parent, one
 *   hop, from the entry's `delegatedFrom`. Per node: its Tasks (each run's last entry per Task). Per Task: its assigner.
 * - Built from the Task side's loaded records (`build()`), and kept current by `entriesChanged(taskId)`, which the Task
 *   side calls synchronously inside that Task's ordered change (AR-017), so no reader sees the tree behind the records.
 * - A run's agents: a standalone run's own agent, the entry agents, and a peer team's `members`, from the entries; a
 *   team or org run's agents are read once from its own file and kept; an org run is read again on a miss (it can mount
 *   a team later).
 *
 * The Task side stays the authority for "is this run's Task open" at a gate head (`isOpen`); the tree answers who is
 * related to whom, and who may message whom (`canMessage`, contract §10.2).
 */
export class DelegationTree implements TaskEntriesListener {
  /** Each Task's entries (each run's last one). */
  private readonly byTask = new Map<string, readonly TaskRunEntry[]>();
  /** Per run key: its entry in each Task. */
  private readonly byRun = new Map<string, Map<string, TaskRunEntry>>();
  /** Per delegating run key: the run keys whose entries name it. */
  private readonly childrenOfRun = new Map<string, Set<string>>();
  /** Every node, by key: a run named by an entry, or as a delegating run. */
  private readonly nodes = new Map<string, RootExecutionIdentity>();
  /** Entry agents and a peer team's members → their run. */
  private readonly entryAgents = new Map<string, RootExecutionIdentity>();
  private readonly memberAgents = new Map<string, RootExecutionIdentity>();
  /** Per run key: its agents with their addresses, read once from its own file (an org run again on a miss). */
  private readonly agentsByRun = new Map<string, readonly RunAgent[]>();
  private readonly membersRead = new Set<string>();
  private reading: Promise<void> | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly childRowsListeners = new Set<(change: ChildRowsChange) => void>();

  constructor(private readonly source: () => Source, private readonly reader: () => RunAgentsReader | null = () => null) {}

  /** The whole tree from the loaded Task records. */
  build(): void {
    for (const taskId of [...this.byTask.keys()]) this.forgetTask(taskId);
    for (const taskId of this.source().taskIdsWithEntries()) this.indexTask(taskId);
    this.rebuildEntryAgents();
    this.notify();
  }

  /** Told after every change (a build, a Task's change), inside the Task's ordered change: a listener must not wait. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /**
   * Told, inside a Task's change and after the tree is updated, of each run whose open children changed (DS-8, SR-042):
   * one report per run per change. A listener must not wait.
   */
  subscribeChildRows(listener: (change: ChildRowsChange) => void): () => void {
    this.childRowsListeners.add(listener);
    return () => { this.childRowsListeners.delete(listener); };
  }

  /** The Task side's change notice: that Task's entries are read again from its memory (no file read). */
  entriesChanged(taskId: string): void {
    // The runs whose children this change can move: the delegating runs of the Task's entries before and after it.
    const parents = new Map([...this.byTask.get(taskId) ?? [], ...this.source().entriesOf(taskId)]
      .map((entry) => [keyOf(entry.delegatedFrom.delegatingRun), entry.delegatedFrom.delegatingRun] as const));
    const before = new Map([...parents].map(([key, run]) => [key, this.openChildrenOf(run)]));
    this.forgetTask(taskId);
    this.indexTask(taskId);
    this.rebuildEntryAgents();
    this.notify();
    for (const [key, run] of parents) this.reportChildRows(run, before.get(key)!);
  }

  private reportChildRows(run: RootExecutionIdentity, before: readonly DelegatedChild[]): void {
    const childKey = (child: DelegatedChild): string => keyOf(runIdentityOf(child.run));
    const after = this.openChildrenOf(run);
    const held = new Set(before.map(childKey));
    const kept = new Set(after.map(childKey));
    const change: ChildRowsChange = { run, added: after.filter((child) => !held.has(childKey(child))),
      removed: before.filter((child) => !kept.has(childKey(child))).map((child) => child.run) };
    if (!change.added.length && !change.removed.length) return;
    for (const listener of [...this.childRowsListeners]) {
      try { listener(change); } catch (error) { console.warn("A delegation tree child-rows listener failed:", error); }
    }
  }

  private notify(): void {
    for (const listener of [...this.listeners]) {
      try { listener(); } catch (error) { console.warn("A delegation tree listener failed:", error); }
    }
  }

  /** Who delegated this run (one hop): the newest entry's `delegatedFrom`; null for a run no Task names. */
  parentOf(run: TaskExecutionReference): RunDelegatedFrom | null {
    return newest(this.tasksOf(run))?.delegatedFrom ?? null;
  }

  /** The run's entry in each Task it works on, open or closed. */
  tasksOf(run: TaskExecutionReference): readonly TaskRunEntry[] {
    return [...this.byRun.get(keyOf(runIdentityOf(run)))?.values() ?? []];
  }

  /** The run's current Task: its newest open entry, else its newest entry; null for a run no Task names. */
  currentTaskOf(run: TaskExecutionReference): TaskRunEntry | null {
    const entries = this.tasksOf(run);
    return newest(entries.filter((entry) => entry.open)) ?? newest(entries) ?? null;
  }

  /** The Tasks the run holds open, oldest first. */
  openTaskIdsOf(run: TaskExecutionReference): readonly string[] {
    return this.tasksOf(run).filter((entry) => entry.open)
      .sort((a, b) => a.linkedAt.localeCompare(b.linkedAt) || a.taskId.localeCompare(b.taskId)).map((entry) => entry.taskId);
  }

  /** The run that assigned the Task: its newest `assigned` entry's delegating run. */
  assignerOf(taskId: string): RootExecutionIdentity | null {
    return newest((this.byTask.get(taskId) ?? []).filter((entry) => entry.role === "assigned"))?.delegatedFrom.delegatingRun ?? null;
  }

  /** Every run that assigned the Task: the delegating runs of its `assigned` entries (`model.py` `assigners`). */
  assignersOf(taskId: string): readonly RootExecutionIdentity[] {
    const runs = new Map<string, RootExecutionIdentity>();
    for (const entry of this.byTask.get(taskId) ?? []) {
      if (entry.role === "assigned") runs.set(keyOf(entry.delegatedFrom.delegatingRun), entry.delegatedFrom.delegatingRun);
    }
    return [...runs.values()];
  }

  /** One hop (DS-8): the runs whose entries name this run as delegating run and that hold an open Task. */
  openChildrenOf(run: RootExecutionIdentity): readonly DelegatedChild[] {
    const children: Array<DelegatedChild & { firstLinkedAt: string }> = [];
    for (const childKey of this.childrenOfRun.get(keyOf(run)) ?? []) {
      const entries = [...this.byRun.get(childKey)?.values() ?? []];
      const current = newest(entries.filter((entry) => entry.open));
      if (!current || keyOf(current.delegatedFrom.delegatingRun) !== keyOf(run)) continue;
      const firstLinkedAt = entries.reduce((first, entry) => entry.linkedAt < first ? entry.linkedAt : first, current.linkedAt);
      children.push({ firstLinkedAt,
        run: current.run, taskId: current.taskId, delegatorAgentRunId: current.delegatedFrom.delegatorAgentRunId,
        entryAgentRunId: current.entryAgentRunId, started: current.start === "started", linkedAt: current.linkedAt,
        recipientAddress: current.recipientAddress,
        ...(current.nodeId !== undefined ? { nodeId: current.nodeId } : {}), ...(current.members ? { members: current.members } : {}),
      });
    }
    // Rows keep the order the runs were first delegated in; a follow-up Task does not move a row.
    return children.sort((a, b) => a.firstLinkedAt.localeCompare(b.firstLinkedAt)).map(({ firstLinkedAt: _first, ...child }) => child);
  }

  /**
   * The runs on peer nodes this run delegated to, one hop, open or closed (their endpoints, and the closure fence of a
   * closed one, AR-020): each run's newest entry, in the order the runs were first delegated.
   */
  peerChildrenOf(run: RootExecutionIdentity): readonly (DelegatedChild & { open: boolean; nodeId: string })[] {
    const children: Array<DelegatedChild & { open: boolean; nodeId: string; firstLinkedAt: string }> = [];
    for (const childKey of this.childrenOfRun.get(keyOf(run)) ?? []) {
      const entries = [...this.byRun.get(childKey)?.values() ?? []];
      const current = newest(entries);
      if (!current || current.nodeId === undefined || keyOf(current.delegatedFrom.delegatingRun) !== keyOf(run)) continue;
      children.push({ firstLinkedAt: entries.reduce((first, entry) => entry.linkedAt < first ? entry.linkedAt : first, current.linkedAt),
        run: current.run, taskId: current.taskId, delegatorAgentRunId: current.delegatedFrom.delegatorAgentRunId,
        entryAgentRunId: current.entryAgentRunId, started: current.start === "started", linkedAt: current.linkedAt,
        recipientAddress: current.recipientAddress, nodeId: current.nodeId, ...(current.members ? { members: current.members } : {}),
        open: entries.some((entry) => entry.open) });
    }
    return children.sort((a, b) => a.firstLinkedAt.localeCompare(b.firstLinkedAt)).map(({ firstLinkedAt: _first, ...child }) => child);
  }

  /** Every local run this run delegated to, one hop, open or closed (past participants of its log; AR-012). */
  childrenOf(run: RootExecutionIdentity): readonly TaskExecutionReference[] {
    return [...this.childrenOfRun.get(keyOf(run)) ?? []].flatMap((childKey) => {
      const entry = [...this.byRun.get(childKey)?.values() ?? []][0];
      return entry && entry.nodeId === undefined ? [entry.run] : [];
    });
  }

  /** Every local run below this run, open or closed, each once (token totals, the restart notice). Peer runs are left out. */
  subtreeOf(run: RootExecutionIdentity): readonly TaskExecutionReference[] {
    const seen = new Set<string>([keyOf(run)]);
    const found: TaskExecutionReference[] = [];
    const visit = (parentKey: string): void => {
      for (const childKey of this.childrenOfRun.get(parentKey) ?? []) {
        if (seen.has(childKey)) continue;
        seen.add(childKey);
        const entry = [...this.byRun.get(childKey)!.values()][0]!;
        if (entry.nodeId !== undefined) continue;
        found.push(entry.run);
        visit(childKey);
      }
    };
    visit(keyOf(run));
    return found;
  }

  /**
   * Contract §10.2 (DEC-011, DEC-012): two different runs may message each other when they share an open Task, or one
   * is the run that assigned one of the other's open Tasks. A run's several open Tasks all count.
   */
  canMessage(a: RootExecutionIdentity, b: RootExecutionIdentity): boolean {
    if (keyOf(a) === keyOf(b)) return false;
    const openOf = (run: RootExecutionIdentity) => [...this.byRun.get(keyOf(run))?.values() ?? []].filter((entry) => entry.open);
    const openA = openOf(a), openB = openOf(b);
    if (openA.some((x) => openB.some((y) => x.taskId === y.taskId))) return true;
    const assigns = (assigner: RootExecutionIdentity, open: readonly TaskRunEntry[]) =>
      open.some((entry) => this.assignersOf(entry.taskId).some((by) => keyOf(by) === keyOf(assigner)));
    return assigns(a, openB) || assigns(b, openA);
  }

  /** Which run an agent run is in (contract §10.5); null for an agent of a run no Task names. */
  async runOfAgent(agentRunId: string): Promise<RootExecutionIdentity | null> {
    const id = agentRunId.trim();
    const found = this.lookup(id);
    if (found) return found;
    await this.readMembers();
    return this.lookup(id);
  }

  /**
   * A run's agents by run ID and address (contract §4): read once from its own file and kept; a peer's run from its
   * entry's `members`. An agent run with no stored address shows the address it was delegated to (its entry's
   * `recipientAddress`, as its view row does). Empty for a run whose file cannot be read.
   */
  async agentsOf(run: RootExecutionIdentity): Promise<readonly RunAgent[]> {
    const key = keyOf(run);
    const latest = newest([...this.byRun.get(key)?.values() ?? []]);
    if (latest?.nodeId !== undefined) {
      return latest.members?.map((member) => ({ agentRunId: member.agentRunId, address: member.address, agentDefinitionId: null }))
        ?? ("agentRunId" in latest.run ? [{ agentRunId: latest.run.agentRunId, address: latest.recipientAddress, agentDefinitionId: null }] : []);
    }
    let agents = this.agentsByRun.get(key);
    if (!agents) {
      const read = await this.reader()?.agentsOf(run).catch(() => null) ?? null;
      if (!read) return [];
      agents = Object.freeze(read.map((agent) => Object.freeze({ agentRunId: agent.agentRunId, agentDefinitionId: agent.agentDefinitionId,
        address: agent.address ?? (run.rootSubjectKind === "agent" ? latest?.recipientAddress ?? null : null) })));
      if (this.nodes.has(key)) this.agentsByRun.set(key, agents);
    }
    return agents;
  }

  /** Whether the tree names this run (as a delegated run or as a delegating run). */
  hasNode(run: RootExecutionIdentity): boolean { return this.nodes.has(keyOf(run)); }

  private lookup(agentRunId: string): RootExecutionIdentity | null {
    const entry = this.entryAgents.get(agentRunId);
    if (entry) return entry;
    // A standalone run's one agent is the run itself.
    const standalone = this.nodes.get(keyOf({ rootSubjectKind: "agent", rootRunId: agentRunId }));
    return standalone ?? this.memberAgents.get(agentRunId) ?? null;
  }

  /** One reading at a time: the team and org runs not read yet, and every org run again. */
  private readMembers(): Promise<void> {
    this.reading ??= (async () => {
      const reader = this.reader();
      if (!reader) return;
      for (const [key, run] of this.nodes) {
        if (run.rootSubjectKind === "agent" || this.isPeerRun(key)) continue;
        if (this.membersRead.has(key) && run.rootSubjectKind !== "agent_org") continue;
        const agents = await reader.agentsOf(run).catch(() => null);
        if (agents === null) continue;
        this.membersRead.add(key);
        this.agentsByRun.set(key, Object.freeze(agents.map((agent) => Object.freeze({ ...agent }))));
        for (const { agentRunId } of agents) this.memberAgents.set(agentRunId, run);
      }
    })().finally(() => { this.reading = null; });
    return this.reading;
  }

  private isPeerRun(key: string): boolean {
    return [...this.byRun.get(key)?.values() ?? []].some((entry) => entry.nodeId !== undefined);
  }

  private indexTask(taskId: string): void {
    const entries = this.source().entriesOf(taskId);
    if (!entries.length) return;
    this.byTask.set(taskId, entries);
    for (const entry of entries) {
      const run = runIdentityOf(entry.run);
      const runKey = keyOf(run);
      const perTask = this.byRun.get(runKey) ?? new Map<string, TaskRunEntry>();
      perTask.set(taskId, entry);
      this.byRun.set(runKey, perTask);
      this.nodes.set(runKey, run);
      const parentKey = keyOf(entry.delegatedFrom.delegatingRun);
      this.nodes.set(parentKey, entry.delegatedFrom.delegatingRun);
      const children = this.childrenOfRun.get(parentKey) ?? new Set<string>();
      children.add(runKey);
      this.childrenOfRun.set(parentKey, children);
    }
  }

  private forgetTask(taskId: string): void {
    const entries = this.byTask.get(taskId);
    if (!entries) return;
    this.byTask.delete(taskId);
    for (const entry of entries) {
      const runKey = keyOf(runIdentityOf(entry.run));
      const perTask = this.byRun.get(runKey);
      perTask?.delete(taskId);
      if (!perTask?.size) this.byRun.delete(runKey);
      const parentKey = keyOf(entry.delegatedFrom.delegatingRun);
      // The edge stays while another of the run's entries names the same parent.
      const stillChild = [...this.byRun.get(runKey)?.values() ?? []].some((other) => keyOf(other.delegatedFrom.delegatingRun) === parentKey);
      if (!stillChild) {
        const children = this.childrenOfRun.get(parentKey);
        children?.delete(runKey);
        if (!children?.size) this.childrenOfRun.delete(parentKey);
      }
    }
    this.pruneNodes();
  }

  /** A node stays while an entry names it, as a run or as a delegating run. */
  private pruneNodes(): void {
    for (const key of [...this.nodes.keys()]) {
      if (!this.byRun.has(key) && !this.childrenOfRun.has(key)) {
        this.nodes.delete(key);
        this.membersRead.delete(key);
        this.agentsByRun.delete(key);
        for (const [agentRunId, run] of [...this.memberAgents]) if (keyOf(run) === key) this.memberAgents.delete(agentRunId);
      }
    }
  }

  private rebuildEntryAgents(): void {
    this.entryAgents.clear();
    for (const entries of this.byTask.values()) {
      for (const entry of entries) {
        const run = runIdentityOf(entry.run);
        this.entryAgents.set(entry.entryAgentRunId, run);
        for (const member of entry.members ?? []) this.entryAgents.set(member.agentRunId, run);
      }
    }
  }
}
