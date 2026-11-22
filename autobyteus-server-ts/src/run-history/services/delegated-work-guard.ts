import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { PeerRunOf } from "../../agent-collaboration/execution/remote/peer-runs.js";

/** Working means not stopped: running, initializing or idle (SR-072 F-30; contract T-5), so "stop it first" is true. */
const WORKING = new Set(["running", "initializing", "idle"]);

type ActionResult = Readonly<{ success: boolean; message: string }>;

/**
 * Archive and delete of a run (DS-13; REQ-007, AR-007, TC-2; SR-067): refused while a run it delegated to works on an
 * open Task, naming the working runs. A run on this node is asked by its own live status; a run on a peer node through
 * its handle's `status()` (one request per node), and an unreachable node does not block: the result names the runs
 * not asked. On delete the `DelegationIndex` is told first (`runDeleted`), so nothing finds the run while its files go;
 * if their removal fails, the startup build adds it back. After a committed delete, the node's received files are swept
 * (autobyteus-587 RF-10): the run's folder held its names of them, so a file no other run received may now be unused.
 * Created with the tree, the runs' own statuses (SR-047), `peerRunOf` (SR-066) and the received files, and passed to the
 * run services that archive and delete.
 */
export class DelegatedWorkGuard {
  constructor(private readonly input: Readonly<{
    tree: Pick<DelegationIndex, "openChildrenOf" | "runDeleted">;
    /** A run's own live status by its identity; `null` when it is not running. */
    statusOf(child: TaskExecutionReference): string | null;
    peerRunOf: PeerRunOf;
    /** The node's received files (`ReceivedFiles`): removes the stored files no run uses any more. */
    receivedFiles: Readonly<{ sweep(): Promise<void> }>;
  }>) {}

  /** `perform` archives or deletes `run` unless a run it delegated to works; a run whose node did not answer is named. */
  async guard<R extends ActionResult>(run: RootExecutionIdentity, action: "archived" | "deleted", perform: () => Promise<R>): Promise<R | ActionResult> {
    const children = this.input.tree.openChildrenOf(run);
    const working = children.filter((child) => child.nodeId === undefined && WORKING.has(this.input.statusOf(child.run) ?? ""))
      .map((child) => child.recipientAddress);
    const notAsked: string[] = [];
    await Promise.all(children.filter((child) => child.nodeId !== undefined).map(async (child) => {
      const peer = this.input.peerRunOf("agentRunId" in child.run ? child.run.agentRunId : child.run.teamRunId);
      const status = peer ? await peer.status() : null;
      if (!status?.reachable) notAsked.push(child.recipientAddress);
      else if (status.statuses.some((agent) => WORKING.has(agent.status))) working.push(child.recipientAddress);
    }));
    if (working.length) {
      return { success: false, message: `This run can't be ${action} while a run it delegated to is working (${working.join(", ")}). Try again when it has finished, or stop it first.` };
    }
    if (action === "deleted") this.input.tree.runDeleted(run);
    const result = await perform();
    if (action === "deleted" && result.success) {
      void this.input.receivedFiles.sweep().catch((error: unknown) =>
        console.warn(`Received files were not swept after run '${run.rootRunId}' was deleted: ${error instanceof Error ? error.message : String(error)}`));
    }
    if (!result.success || !notAsked.length) return result;
    return { ...result, message: `${result.message} Not asked, because their nodes didn't answer: ${notAsked.join(", ")}.` };
  }
}
