import type { RootExecutionIdentity } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { rootExecutionIdentityKey } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RunningAgents } from "../agent-collaboration/running/running-agents.js";
import type { CollaborationRootResolver } from "../compositions/collaboration-root-resolver.js";
import type { RunOwnAgentsReader } from "../run-history/store/run-own-agents-reader.js";
import { createConcurrencyLimiter } from "./concurrency-limiter.js";
import type { RootHistoryState } from "./restart-resumer.js";
import { readRunningRunRecord } from "./running-run-record.js";

/** At most this many runs are brought back at once (QR-002, as restart resume). */
export const RUNNING_RUN_RESTORE_CONCURRENCY = 3;

export type RunningRunRestoreReport = Readonly<{ restored: number; skipped: number; failed: number }>;

type Outcome = "restored" | "skipped" | "failed";

/**
 * Brings back, idle, the runs a person started that were running when the node stopped (autobyteus-638 DS-002).
 *
 * `take()`, at startup before this session's recorder starts, reads the running-run record (never removing it; the
 * recorder is the file's only writer) into `pending`. `restore()`, after the update wake, works through `pending`, at
 * most 3 at a time. Per run: its history must be `present`; a person must have started it; it must not run already.
 * Then its root is restored and its entry agent made ready without input (an Agent run's agent; a Team run's
 * coordinator), so no model call happens and a restart reminder still rides the run's next input. A run leaves
 * `pending` once it is restored, skipped or failed; every skip and failure is logged with the run and never stops the
 * others (DESIGN rule 7). It never throws.
 */
export class RunningRunRestorer {
  private readonly taken = new Map<string, RootExecutionIdentity>();

  constructor(private readonly dependencies: Readonly<{
    recordPath: string;
    rootHistory: (root: RootExecutionIdentity) => Promise<RootHistoryState>;
    runFiles: Pick<RunOwnAgentsReader, "listingFactsOf">;
    running: Pick<RunningAgents, "rootOf" | "teamCoordinatorOf">;
    rootResolver: CollaborationRootResolver;
    concurrency?: number;
  }>) {}

  /** Reads the previous session's record into `pending`. An invalid record is logged and nothing is taken. */
  async take(): Promise<void> {
    try {
      const read = await readRunningRunRecord(this.dependencies.recordPath);
      if (read.kind === "invalid") {
        console.warn(`Running runs after the restart: the running-run record is invalid, so none is brought back: ${read.reason}`);
        return;
      }
      if (read.kind === "present") for (const run of read.record.runs) this.taken.set(rootExecutionIdentityKey(run), run);
    } catch (error) {
      console.warn(`Running runs after the restart: the running-run record could not be read: ${String(error)}`);
    }
  }

  /** The taken runs not yet restored, skipped or failed (the recorder keeps them in the record). */
  pending(): readonly RootExecutionIdentity[] {
    return [...this.taken.values()];
  }

  async restore(): Promise<RunningRunRestoreReport> {
    const runs = this.pending();
    const report = { restored: 0, skipped: 0, failed: 0 };
    if (!runs.length) return report;
    const limit = createConcurrencyLimiter(this.dependencies.concurrency ?? RUNNING_RUN_RESTORE_CONCURRENCY);
    await Promise.all(runs.map((run) => limit(async () => {
      const outcome = await this.restoreOne(run);
      this.taken.delete(rootExecutionIdentityKey(run));
      report[outcome] += 1;
    })));
    console.info(`Running runs after the restart: ${report.restored} brought back, ${report.skipped} skipped, ${report.failed} failed`);
    return report;
  }

  private async restoreOne(root: RootExecutionIdentity): Promise<Outcome> {
    const label = `Running run '${root.rootSubjectKind}:${root.rootRunId}'`;
    const skip = (reason: string): Outcome => { console.info(`${label} skipped: ${reason}`); return "skipped"; };
    const fail = (reason: string): Outcome => { console.warn(`${label} was not brought back: ${reason}`); return "failed"; };
    try {
      const before = await this.dependencies.rootHistory(root);
      if (before !== "present") return skip(describeState(before));
      if ((await this.dependencies.runFiles.listingFactsOf(root))?.startedByPerson !== true) return skip("it was not started by a person");
      if (root.rootSubjectKind === "agent" && this.dependencies.running.rootOf(root.rootRunId)) return skip("it is already running");
      const resolved = await this.dependencies.rootResolver.resolveOrRestore(root);
      if (!resolved) return fail("its root is not on this node");
      // A person's Archive or Stop meanwhile wins through its own path; nothing is started for it.
      const after = await this.dependencies.rootHistory(root);
      if (after !== "present") return skip(`${describeState(after)} (after the restore)`);
      if (resolved.kind === "agent") {
        await resolved.root.ensureAgentReady();
        return "restored";
      }
      if (resolved.kind !== "agent_team") return fail("its root is not an Agent or Team run");
      const coordinator = this.dependencies.running.teamCoordinatorOf(root.rootRunId);
      if (!coordinator) return fail("its Team has no coordinator");
      if (this.dependencies.running.rootOf(coordinator)) return skip("it is already running");
      await resolved.root.ensureAgentReady(coordinator);
      return "restored";
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  }
}

const describeState = (state: RootHistoryState): string =>
  state === "gone" ? "it is no longer in history" : state === "terminated" ? "it was stopped" : "it is archived";
