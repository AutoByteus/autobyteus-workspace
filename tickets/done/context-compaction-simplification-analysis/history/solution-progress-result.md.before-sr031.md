# SR-030 — Post-response failure design correction

Requirements **Approved SR028**, design **Ready SR030 / Architecture Design Complete**, **Large/High**. Ongoing reviewer prospective ARCH-F002 addressed in target design; no independent verdict yet.

Pre-parent failure holds unsent A as approved. Post-response failure completes already-consumed A once, preserves its answer, but leaves the live run in recoverable error with a separate compaction gate. Neither turn completion/IDLE nor prequeued user messages clear that gate. A genuinely later user admission permits one next FIFO turn to compact before parent dispatch; failure there holds that new input. No replay of A, new tool-continuation safe point, queue or migration.

SR029's assertion that the old post-response IDLE/different-turn retry should be preserved is explicitly corrected, not treated as an approved exception. Body-only strategy contract and actual user ingress remain.

Full context `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/architecture-review-clarification.sr030.md`; E30/current design/cumulative history and audits. No production/tests/probes/model work. Existing validation limits unchanged; same architecture review continues before implementation, API005 remains interrupted. Finalization target origin/personal remains Delivery-owned.

SR030 handoff confirmed DELIVERED to `/architecture_reviewer` (same existing review execution); receipt `solution-recovery-evidence/sr030/handoff-receipt.json`. No implementation/API/Delivery advancement; awaiting reviewer outcome without polling.
