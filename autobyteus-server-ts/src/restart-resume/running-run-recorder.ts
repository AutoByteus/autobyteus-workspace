import type { RootExecutionIdentity } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { rootExecutionIdentityKey } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RunningAgents } from "../agent-collaboration/running/running-agents.js";
import type { RunOwnAgentsReader } from "../run-history/store/run-own-agents-reader.js";
import { removeRunningRunRecord, sortedRunningRuns, writeRunningRunRecord } from "./running-run-record.js";
import type { RunningRunRestorer } from "./running-run-restorer.js";

/** How often the live record is checked for a change (a crash loses at most this much). */
const RUNNING_RUN_RECORD_INTERVAL_MS = 2_000;
/** The longest the graceful final write waits for the "started by a person" reads still in flight (R-1). */
const STARTED_BY_PERSON_BUDGET_MS = 1_000;

/** What this session knows of a root: whether a person started it, once its read finished. */
type PersonFact = { startedByPerson: boolean | null; read: Promise<void> };

/**
 * Keeps the running-run record (autobyteus-638 DS-001): the runs a person started whose entry agent is running (an
 * Agent run's agent; a Team run's coordinator), plus the runs the restorer has taken and not handled yet
 * (`running ∪ pending`, AR-001), so a stop or crash during the restore keeps them. The file's only writer.
 *
 * `startSession()` checks every 2 s and rewrites the file only when the set changed, removing it when the set is empty.
 * The first check always writes or removes (AR-002: nothing is assumed about the file it finds). Whether a person
 * started a root is read from its run file once per root while it is live in this session; a check skips its write
 * while such a read is in flight. `record()`, at a graceful stop, stops the checks and writes the final set, after
 * waiting for the reads in flight (at most 1 s; a root whose read did not finish is left out and logged). Org roots are
 * never recorded (DEC-004). An entry agent in `error` counts as running (R-2). Nothing is written before
 * `startSession()`. It never throws.
 */
export class RunningRunRecorder {
  private timer: NodeJS.Timeout | null = null;
  private started = false;
  private finished = false;
  /** The last written set; `null` until the first write (AR-002: unknown, so the first check reconciles the file). */
  private written: string | null = null;
  private writing: Promise<void> | null = null;
  private readonly facts = new Map<string, PersonFact>();

  constructor(private readonly dependencies: Readonly<{
    running: Pick<RunningAgents, "liveRoots" | "statusesOf" | "teamCoordinatorOf">;
    runFiles: Pick<RunOwnAgentsReader, "listingFactsOf">;
    /** The runs the restorer has taken and not yet restored, skipped or failed (a question; the restorer owns the set). */
    pending: Pick<RunningRunRestorer, "pending">;
    recordPath: string;
    intervalMs?: number;
    startedByPersonBudgetMs?: number;
  }>) {}

  startSession(): void {
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => this.tick(), this.dependencies.intervalMs ?? RUNNING_RUN_RECORD_INTERVAL_MS);
    this.timer.unref();
  }

  /** The graceful end of the session: the final `running ∪ pending`. Waits for a write and the reads in flight. */
  async record(): Promise<void> {
    if (!this.started || this.finished) return;
    this.finished = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    try {
      await this.writing;
      const live = this.liveEntryRoots();
      const reads = live.flatMap((root) => {
        const fact = this.factOf(root);
        return fact.startedByPerson === null ? [fact.read] : [];
      });
      if (reads.length) {
        let timer: NodeJS.Timeout | undefined;
        const budget = new Promise<void>((resolve) => { timer = setTimeout(resolve, this.dependencies.startedByPersonBudgetMs ?? STARTED_BY_PERSON_BUDGET_MS); });
        await Promise.race([Promise.all(reads), budget]);
        clearTimeout(timer);
      }
      const runs = this.runsToRecord(live, (root) => console.warn(
        `Running run '${root.rootSubjectKind}:${root.rootRunId}' was left out of the running-run record: whether a person started it was not read in time`));
      if (runs.length) await writeRunningRunRecord(this.dependencies.recordPath, { runs });
      else await removeRunningRunRecord(this.dependencies.recordPath);
      if (runs.length) console.info(`Recorded ${runs.length} running run(s) to bring back after the restart`);
    } catch (error) {
      console.warn(`Running runs could not be recorded for the restart: ${String(error)}`);
    }
  }

  /** One check: writes only when the set changed; a check during a write, or while a read is in flight, is skipped. */
  private tick(): void {
    if (this.finished || this.writing) return;
    try {
      const live = this.liveEntryRoots();
      this.forgetRootsNotIn(live);
      if (live.some((root) => this.factOf(root).startedByPerson === null)) return;
      const runs = this.runsToRecord(live);
      const key = JSON.stringify(runs);
      if (key === this.written) return;
      const write = runs.length
        ? writeRunningRunRecord(this.dependencies.recordPath, { runs })
        : removeRunningRunRecord(this.dependencies.recordPath);
      this.writing = write.then(
        () => { this.written = key; },
        (error) => console.warn(`The running-run record could not be updated: ${String(error)}`),
      ).finally(() => { this.writing = null; });
    } catch (error) {
      console.warn(`The running-run record could not be updated: ${String(error)}`);
    }
  }

  /** The live Agent and Team roots whose entry agent runs now (any live status, `error` included); Orgs skipped. */
  private liveEntryRoots(): RootExecutionIdentity[] {
    return this.dependencies.running.liveRoots().filter((root) => {
      if (root.rootSubjectKind === "agent_org") return false;
      try {
        const statuses = this.dependencies.running.statusesOf(root);
        if (root.rootSubjectKind === "agent") return statuses.some((agent) => agent.agentRunId === root.rootRunId);
        const coordinator = this.dependencies.running.teamCoordinatorOf(root.rootRunId);
        return coordinator !== null && statuses.some((agent) => agent.agentRunId === coordinator);
      } catch {
        return false;
      }
    });
  }

  /** The live roots a person started (a root whose read has not finished is left out and told), with the pending runs. */
  private runsToRecord(live: readonly RootExecutionIdentity[], unknown?: (root: RootExecutionIdentity) => void) {
    const recorded = live.filter((root) => {
      const startedByPerson = this.factOf(root).startedByPerson;
      if (startedByPerson === null) unknown?.(root);
      return startedByPerson === true;
    });
    return sortedRunningRuns([...recorded, ...this.dependencies.pending.pending()]);
  }

  /** The root's fact; its read starts the first time the root is seen live in this session. */
  private factOf(root: RootExecutionIdentity): PersonFact {
    const key = rootExecutionIdentityKey(root);
    const known = this.facts.get(key);
    if (known) return known;
    const fact: PersonFact = { startedByPerson: null, read: Promise.resolve() };
    fact.read = this.dependencies.runFiles.listingFactsOf(root).then(
      (listing) => { fact.startedByPerson = listing?.startedByPerson === true; },
      (error) => {
        fact.startedByPerson = false;
        console.warn(`Running run '${root.rootSubjectKind}:${root.rootRunId}' is not recorded: its run file could not be read: ${String(error)}`);
      },
    );
    this.facts.set(key, fact);
    return fact;
  }

  /** A root that is no longer live is forgotten; if it runs again, its fact is read again. */
  private forgetRootsNotIn(live: readonly RootExecutionIdentity[]): void {
    const keys = new Set(live.map(rootExecutionIdentityKey));
    for (const key of this.facts.keys()) if (!keys.has(key)) this.facts.delete(key);
  }
}
