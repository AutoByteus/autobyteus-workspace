import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { runIdentityOf } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { DelegatedRunAgentsReader } from "./delegated-run-agents-reader.js";
import type { RunRecordsSource } from "./run-records-source.js";
import { composeRunViewMessages, type RunViewMessages } from "./run-view-messages.js";

/**
 * The one reader of "the messages of the view of run X" (autobyteus-615; SR-072, SR-074 of autobyteus-461): X's own log
 * composed with the own log of every local run of its open subtree (`composeRunViewMessages`), the set taken once, at the
 * read's start (ARCH-REV-048). The participant page and the message reference reader both read a view through it.
 */
export class RunViewMessagesReader {
  constructor(private readonly dependencies: Readonly<{
    records: RunRecordsSource;
    /** The view's open subtree (its rows on this node). */
    delegatedRunAgents: Pick<DelegatedRunAgentsReader, "prepare" | "openRunsBelow">;
  }>) {}

  async read(view: RootExecutionIdentity): Promise<RunViewMessages> {
    const readBelow = async (ref: TaskExecutionReference) => {
      const run = runIdentityOf(ref);
      const records = await this.dependencies.records.read(run.rootSubjectKind, run.rootRunId)
        .catch((error: unknown) => error instanceof Error ? error : new Error(String(error)));
      return { run: run.rootRunId, records };
    };
    await this.dependencies.delegatedRunAgents.prepare(view);
    const [own, runs] = await Promise.all([this.dependencies.records.read(view.rootSubjectKind, view.rootRunId),
      Promise.all(this.dependencies.delegatedRunAgents.openRunsBelow(view).map(readBelow))]);
    return composeRunViewMessages({ own, below: runs });
  }
}
