import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import {
  runIdentityOf, runReferenceOf,
  type PeerRunMember, type RunDelegatedFrom, type TaskEntriesListener, type TaskExecutionResourcePort, type TaskRunEntry,
} from "../execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../execution/task/task-execution-reference.js";
import { CollaborationTree, type RunFilesReader, type SubtreeRow } from "./collaboration-tree.js";
import type { RunAgent, RunParts, RunStanding } from "./run-parts.js";

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

/** A run's rows changed (DS-8, SR-042; at every depth, CR-461-033): the rows that came and the runs that left its view. */
export type ChildRowsChange = Readonly<{
  run: RootExecutionIdentity;
  added: readonly SubtreeRow[];
  removed: readonly TaskExecutionReference[];
}>;

type Source = Pick<TaskExecutionResourcePort, "taskIdsWithEntries" | "entriesOf">;
const keyOf = rootExecutionIdentityKey;
const newest = (entries: readonly TaskRunEntry[]): TaskRunEntry | undefined =>
  entries.reduce<TaskRunEntry | undefined>((best, entry) => !best || entry.linkedAt > best.linkedAt
    || (entry.linkedAt === best.linkedAt && entry.taskId > best.taskId) ? entry : best, undefined);

/**
 * The relationships between runs, in memory (contract §2.6, §4, TC-11): the `DelegationIndex` (the design's
 * `DelegationTree` until SR-061), a forest of one tree per run the user started, from which each run's
 * `CollaborationTree` is derived (`collaborationTreeOf(run)`). Owner: collaboration. It holds no run's life (P6).
 *
 * - Nodes: every run a Task entry names, and every run an entry names as its delegating run. Edges: child → parent, one
 *   hop, from the entry's `delegatedFrom`. Per node: its Tasks (each run's last entry per Task). Per Task: its assigner.
 * - Built from the Task side's loaded records (`build()`), and kept current by `entriesChanged(taskId)`, which the Task
 *   side calls synchronously inside that Task's ordered change (AR-017), so no reader sees the tree behind the records.
 * - A run's agents: a standalone run's own agent, the entry agents, and a peer team's `members`, from the entries. A
 *   run's parts (its agents, a team's coordinator, an org's mounted teams) are read once from its own file and kept: the
 *   tree is their one owner (Principle 11). An org run is read again on a miss (it can mount a team later), an agent
 *   run until its address is stored (written when it first collaborates). A run that cannot be read is left out, with a
 *   warning naming it and the reason (`DESIGN.md` rule 7).
 *
 * The Task side stays the authority for "is this run's Task open" at a gate head (`isOpen`); the tree answers who is
 * related to whom, and who may message whom (`canMessage`, contract §10.2).
 */
export class DelegationIndex implements TaskEntriesListener {
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
  /** Per run key: its parts, read once from its own file (an org run again on a miss). */
  private readonly partsByRun = new Map<string, RunParts>();
  private readonly membersRead = new Set<string>();
  /** Deleted runs (SR-067 G-2): the entries naming them stay as the Task's record; the tree skips them. */
  private readonly deleted = new Set<string>();
  private reading: Promise<void> | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly childRowsListeners = new Set<(change: ChildRowsChange) => void>();

  constructor(private readonly source: () => Source, private readonly reader: RunFilesReader) {}

  /** A run's collaboration tree (SR-060): every cross-run answer for it, derived now, never stored. */
  collaborationTreeOf(run: RootExecutionIdentity): CollaborationTree {
    return new CollaborationTree(this, this.reader, run);
  }

  /** `byRunId` (contract §4): a run's node, `null` for a run no Task names (nor names as delegating run). */
  nodeOf(run: RootExecutionIdentity): Readonly<{ run: RootExecutionIdentity; parent: RunDelegatedFrom | null; top: RootExecutionIdentity; tasks: readonly TaskRunEntry[] }> | null {
    const known = this.nodes.get(keyOf(run));
    if (!known) return null;
    const reference = runReferenceOf(known);
    return Object.freeze({ run: known, parent: reference ? this.parentOf(reference) : null, top: this.topOf(known), tasks: reference ? this.tasksOf(reference) : [] });
  }

  /**
   * The run at the top of a run's tree (contract §4): derived by walking up its parents, never stored (ARCH-REV-035).
   * A run whose parent is not a node (its own entries were deleted with their Task) is the top of a tree of its own.
   */
  topOf(run: RootExecutionIdentity): RootExecutionIdentity {
    return this.chainOf(run).at(-1)!;
  }

  /** `byAgentRunId` (contract §4): the run an agent run is in, its address in that run's own space, and its tree's top. */
  async agentOf(agentRunId: string): Promise<Readonly<{ run: RootExecutionIdentity; address: string | null; top: RootExecutionIdentity }> | null> {
    const run = await this.runOfAgent(agentRunId);
    if (!run) return null;
    const address = (await this.agentsOf(run)).find((agent) => agent.agentRunId === agentRunId.trim())?.address ?? null;
    return Object.freeze({ run, address, top: this.topOf(run) });
  }

  /** The whole tree from the loaded Task records. */
  build(): void {
    for (const taskId of [...this.byTask.keys()]) this.forgetTask(taskId);
    for (const taskId of this.source().taskIdsWithEntries()) this.indexTask(taskId);
    this.rebuildEntryAgents();
    this.notify();
  }

  /**
   * A run was deleted (SR-067 G-2; contract T-8, R-11; model S26, S27), told before its files go: its node and agents
   * leave the tree, while the Task entries naming it stay as the Task's record. A run it delegated to is the top of its
   * own tree, a Task it assigned has no assigner, and its agents' run IDs are unknown (a message to one is
   * `TARGET_AGENT_RUN_NOT_ACTIVE`). Its ancestors' views lose its row and every row below it.
   */
  runDeleted(run: RootExecutionIdentity): void {
    const key = keyOf(run);
    if (this.deleted.has(key)) return;
    const above = this.chainOf(run).slice(1);
    const before = new Map(above.map((ancestor) => [keyOf(ancestor), this.collaborationTreeOf(ancestor).rows()]));
    this.deleted.add(key);
    this.forgetNode(key);
    this.rebuildEntryAgents();
    this.notify();
    for (const ancestor of above) this.reportChildRows(ancestor, before.get(keyOf(ancestor)) ?? []);
  }

  /**
   * A team run followed its definition (DS-007 b): what was read of its own file is read again on next use, and its
   * rows and every row above it are reported changed (its views read their trees again).
   */
  runPartsChanged(run: RootExecutionIdentity): void {
    const key = keyOf(run);
    this.partsByRun.delete(key);
    this.membersRead.delete(key);
    for (const ancestor of this.chainOf(run)) {
      for (const listener of [...this.childRowsListeners]) {
        try { listener({ run: ancestor, added: [], removed: [] }); } catch (error) { console.warn("A delegation tree child-rows listener failed:", error); }
      }
    }
  }

  /** At startup (SR-067): the runs the Task records name whose own files are gone were deleted; the tree skips them. */
  async skipUnstored(): Promise<void> {
    for (const [key, run] of [...this.nodes]) {
      if (this.isPeerRun(key)) continue;
      const stored = await this.reader.isStored(run).catch(() => true);
      if (!stored) this.runDeleted(run);
    }
  }

  /** Told after every change (a build, a Task's change), inside the Task's ordered change: a listener must not wait. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /**
   * Told, inside a Task's change and after the tree is updated, of each run whose rows changed (DS-8, SR-042; its open
   * subtree, so a run and every ancestor, CR-461-033): one report per run per change. A listener must not wait.
   */
  subscribeChildRows(listener: (change: ChildRowsChange) => void): () => void {
    this.childRowsListeners.add(listener);
    return () => { this.childRowsListeners.delete(listener); };
  }

  /** The Task side's change notice: that Task's entries are read again from its memory (no file read). */
  entriesChanged(taskId: string): void {
    // The runs whose rows this change can move (CR-461-033): the delegating runs of the Task's entries before and after
    // it, and every ancestor of each, before and after (a row is under every run above it).
    const delegating = [...this.byTask.get(taskId) ?? [], ...this.source().entriesOf(taskId)].map((entry) => entry.delegatedFrom.delegatingRun);
    const affected = new Map<string, RootExecutionIdentity>();
    const withAncestors = () => { for (const run of delegating) for (const above of this.chainOf(run)) affected.set(keyOf(above), above); };
    withAncestors();
    const before = new Map([...affected].map(([key, run]) => [key, this.collaborationTreeOf(run).rows()]));
    this.forgetTask(taskId);
    this.indexTask(taskId);
    this.rebuildEntryAgents();
    this.notify();
    withAncestors();
    for (const [key, run] of affected) this.reportChildRows(run, before.get(key) ?? []);
  }

  /** A run and each run above it, up to its tree's top: the runs whose subtree holds it (SR-072, the Team tab's live messages). */
  chainOf(run: RootExecutionIdentity): RootExecutionIdentity[] {
    const chain = [run];
    for (let current = run; ;) {
      const reference = runReferenceOf(current);
      const parent = reference ? this.parentOf(reference)?.delegatingRun : undefined;
      if (!parent || chain.some((seen) => keyOf(seen) === keyOf(parent))) return chain;
      chain.push(parent);
      current = parent;
    }
  }

  private reportChildRows(run: RootExecutionIdentity, before: readonly SubtreeRow[]): void {
    const childKey = (child: DelegatedChild): string => keyOf(runIdentityOf(child.run));
    const after = this.collaborationTreeOf(run).rows();
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
    const parent = newest(this.tasksOf(run))?.delegatedFrom ?? null;
    return parent && !this.deleted.has(keyOf(parent.delegatingRun)) ? parent : null;
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
    return newest((this.byTask.get(taskId) ?? []).filter((entry) => entry.role === "assigned"
      && !this.deleted.has(keyOf(entry.delegatedFrom.delegatingRun))))?.delegatedFrom.delegatingRun ?? null;
  }

  /** Every run that assigned the Task: the delegating runs of its `assigned` entries (`model.py` `assigners`). */
  assignersOf(taskId: string): readonly RootExecutionIdentity[] {
    const runs = new Map<string, RootExecutionIdentity>();
    for (const entry of this.byTask.get(taskId) ?? []) {
      if (entry.role === "assigned" && !this.deleted.has(keyOf(entry.delegatedFrom.delegatingRun))) runs.set(keyOf(entry.delegatedFrom.delegatingRun), entry.delegatedFrom.delegatingRun);
    }
    return [...runs.values()];
  }

  /** One hop (DS-8): the runs whose entries name this run as delegating run and that hold an open Task. */
  openChildrenOf(run: RootExecutionIdentity): readonly DelegatedChild[] {
    const children: Array<DelegatedChild & { firstLinkedAt: string }> = [];
    for (const childKey of this.childrenOfRun.get(keyOf(run)) ?? []) {
      if (this.deleted.has(childKey)) continue;
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
      if (this.deleted.has(childKey)) continue;
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

  /**
   * The run on a peer node named by this ID (SR-066): the Agent or Team run with this run ID, or the Team run this agent
   * run is a member of, from its Task entries; null for a run that is not on a peer node.
   */
  peerRunNamed(id: string): TaskExecutionReference | null {
    for (const entries of this.byRun.values()) {
      for (const entry of entries.values()) {
        if (entry.nodeId === undefined) continue;
        const runId = "agentRunId" in entry.run ? entry.run.agentRunId : entry.run.teamRunId;
        if (runId === id || entry.members?.some((member) => member.agentRunId === id)) return entry.run;
      }
    }
    return null;
  }

  /** Every local run this run delegated to, one hop, open or closed (past participants of its log; AR-012). */
  childrenOf(run: RootExecutionIdentity): readonly TaskExecutionReference[] {
    return [...this.childrenOfRun.get(keyOf(run)) ?? []].flatMap((childKey) => {
      if (this.deleted.has(childKey)) return [];
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
        if (seen.has(childKey) || this.deleted.has(childKey)) continue;
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
   * A run's agents by run ID and address (contract §4); a peer's run from its entry's `members`. An agent run with no
   * stored address shows the address it was delegated to (its entry's `recipientAddress`, as its view row does). Empty
   * for a run whose file cannot be read.
   */
  async agentsOf(run: RootExecutionIdentity): Promise<readonly RunAgent[]> {
    const latest = newest([...this.byRun.get(keyOf(run))?.values() ?? []]);
    if (latest?.nodeId !== undefined) {
      return latest.members?.map((member) => ({ agentRunId: member.agentRunId, address: member.address, agentDefinitionId: null }))
        ?? ("agentRunId" in latest.run ? [{ agentRunId: latest.run.agentRunId, address: latest.recipientAddress, agentDefinitionId: null }] : []);
    }
    const parts = await this.partsOf(run);
    if (!parts) return [];
    // A team run's former members are still its agents (their messages are in its history), never standing ones.
    if (parts.formerAgents.length) return [...parts.agents, ...parts.formerAgents];
    return run.rootSubjectKind === "agent" && latest
      ? parts.agents.map((agent) => agent.address ? agent : Object.freeze({ ...agent, address: latest.recipientAddress }))
      : parts.agents;
  }

  /**
   * A run's standing agents by address (`model.py` `standing`): an agent run's own address once stored; a team run's
   * members; an org run's direct agents, its mounted teams' members, and each mounted team's address for its coordinator.
   * `null` for a run whose file cannot be read.
   */
  async standingOf(run: RootExecutionIdentity): Promise<RunStanding | null> {
    const parts = await this.partsOf(run);
    if (!parts) return null;
    const agents = new Map<string, string>();
    for (const agent of parts.agents) if (agent.address) agents.set(agent.address, agent.agentRunId);
    for (const team of parts.mountedTeams) agents.set(team.address, team.coordinatorAgentRunId);
    return Object.freeze({ agents, coordinatorAddress: parts.coordinatorAddress });
  }

  /**
   * A team run's coordinator, running or not (R-12, SR-071): its standing's, from its own file; where that cannot answer
   * (a peer's file is on its node, or it is unreadable), its Task entry's entry agent. `null`, reading no file, for a run
   * no Task names (a live one is the live directory's).
   */
  async teamCoordinatorOf(teamRunId: string): Promise<string | null> {
    const run: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: teamRunId };
    if (!this.hasNode(run)) return null;
    const entry = this.currentTaskOf({ teamRunId });
    const standing = entry?.nodeId === undefined ? await this.standingOf(run) : null;
    return (standing?.coordinatorAddress && standing.agents.get(standing.coordinatorAddress)) || (entry?.entryAgentRunId ?? null);
  }

  /** A run's parts: kept for a node once read (an agent run once its address is stored); read again otherwise. */
  private async partsOf(run: RootExecutionIdentity): Promise<RunParts | null> {
    const key = keyOf(run);
    const kept = this.partsByRun.get(key);
    if (kept) return kept;
    const parts = await this.readParts(run);
    if (parts && this.nodes.has(key) && (run.rootSubjectKind !== "agent" || parts.agents.every((agent) => agent.address))) {
      this.partsByRun.set(key, parts);
    }
    return parts;
  }

  /** One read of a run's own file; an absent or unreadable one is left out with a warning naming the run and the reason. */
  private async readParts(run: RootExecutionIdentity): Promise<RunParts | null> {
    const name = `${run.rootSubjectKind} run '${run.rootRunId}'`;
    try {
      const parts = await this.reader.partsOf(run);
      if (!parts) console.warn(`The agents of ${name} are left out: its own file was not found.`);
      return parts && Object.freeze({ ...parts, agents: Object.freeze(parts.agents.map((agent) => Object.freeze({ ...agent }))),
        formerAgents: Object.freeze(parts.formerAgents.map((agent) => Object.freeze({ ...agent }))) });
    } catch (error) {
      console.warn(`The agents of ${name} are left out: its own file could not be read (${error instanceof Error ? error.message : String(error)}).`);
      return null;
    }
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
      for (const [key, run] of this.nodes) {
        if (run.rootSubjectKind === "agent" || this.isPeerRun(key)) continue;
        if (this.membersRead.has(key) && run.rootSubjectKind !== "agent_org") continue;
        const parts = await this.readParts(run);
        if (parts === null) continue;
        this.membersRead.add(key);
        this.partsByRun.set(key, parts);
        for (const { agentRunId } of [...parts.agents, ...parts.formerAgents]) this.memberAgents.set(agentRunId, run);
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
      if (!this.deleted.has(runKey)) this.nodes.set(runKey, run);
      const parentKey = keyOf(entry.delegatedFrom.delegatingRun);
      if (!this.deleted.has(parentKey)) this.nodes.set(parentKey, entry.delegatedFrom.delegatingRun);
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
        this.forgetNode(key);
      }
    }
  }

  /** A node and what was read of it leave the tree. */
  private forgetNode(key: string): void {
    this.nodes.delete(key);
    this.membersRead.delete(key);
    this.partsByRun.delete(key);
    for (const [agentRunId, run] of [...this.memberAgents]) if (keyOf(run) === key) this.memberAgents.delete(agentRunId);
  }

  private rebuildEntryAgents(): void {
    this.entryAgents.clear();
    for (const entries of this.byTask.values()) {
      for (const entry of entries) {
        const run = runIdentityOf(entry.run);
        if (this.deleted.has(keyOf(run))) continue;
        this.entryAgents.set(entry.entryAgentRunId, run);
        for (const member of entry.members ?? []) this.entryAgents.set(member.agentRunId, run);
      }
    }
  }
}
