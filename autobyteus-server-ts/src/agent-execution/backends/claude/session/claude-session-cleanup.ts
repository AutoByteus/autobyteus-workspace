import type { ClaudeSession } from "./claude-session.js";

export type ClaudeSessionCleanupTarget = {
  session: ClaudeSession;
  cancelPendingToolApprovalsReason?: string;
};

export class ClaudeSessionCleanup {
  private readonly released = new WeakSet<ClaudeSession>();
  private readonly proofs = new WeakMap<ClaudeSession, Set<string>>();

  /** Independent exact releases; only listener detachment depends on canonical turn handoff. */
  async cleanupSessionResources(input: ClaudeSessionCleanupTarget): Promise<void> {
    if (this.released.has(input.session)) return;
    const proof = this.proofs.get(input.session) ?? new Set<string>();
    this.proofs.set(input.session, proof);
    const reason = input.cancelPendingToolApprovalsReason ?? "Tool approval cancelled because run was closed.";
    const stages: Array<[string, () => void | Promise<void>]> = [
      ["process", () => input.session.closeProcess(reason)],
      ["listeners", async () => {
        await input.session.closeTurnForTermination(reason);
        input.session.clearRuntimeListeners();
      }],
      // The run's only release of its links: it closes them to mid-run adds first and waits for one in flight.
      ["skills", () => input.session.runContext.runtimeContext.requireWorkspaceSkills().release()],
      ["mcp", () => input.session.releaseAgentToolsMcp()],
    ];
    const results = await Promise.allSettled(stages.map(async ([stage, release]) => {
      if (proof.has(stage)) return;
      await release();
      proof.add(stage);
    }));
    const errors = results.flatMap(result => result.status === "rejected" ? [result.reason] : []);
    if (errors.length) throw new AggregateError(errors, "Claude exact component cleanup failed.");
    this.proofs.delete(input.session);
    this.released.add(input.session);
  }
}
