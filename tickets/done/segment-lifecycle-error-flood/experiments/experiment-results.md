# Design Experiments — segment-lifecycle-error-flood

The user asked for experiments on whether the existing design is sound or needs a refactor (2026-10-18).
All experiments ran in a throwaway worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood-experiments`
(detached at base `1c718202b2`). The ticket branch has no source changes.

## Scoring probe

`autobyteus-server-ts/tests/unit/zz-investigation/turn-race-experiment.probe.test.ts` (copy in this folder: `turn-race-experiment.probe.test.ts`).
Real `ClaudeSession` on a scripted SDK stream → real `ClaudeAgentRunBackend` → real `AgentRun`:

| Case | Shape | Pass condition |
| --- | --- | --- |
| X1 | Input turn starts a background task and completes; task completes; CLI runs a task-notification turn (no output) and immediately another turn with text, in one burst | 0 lifecycle diagnostics, all text delivered |
| X2 | X1, status mid-turn-2 and after | `running` mid, `idle` after |
| X3 | Late text segment for an ended turn | not delivered (rejection preserved) |
| X4 | X1 with the queue drained between the turns | 0 diagnostics (control) |
| X5 | First provider turn also writes text, runtime moves to turn 2 before the queue drains | both turns' text delivered, 0 diagnostics, `running` mid |
| X6 | Provider turn, then a user message turn | 0 diagnostics, both texts delivered |

Command: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/zz-investigation/turn-race-experiment.probe.test.ts --no-watch`

## Results

| Variant | What it changes | X1 | X2 | X3 | X4 | X5 | X6 | Related unit (60 files / 623 tests) | Related integration (23 files) | Full unit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E0 base `1c718202b2` | — | **6 diagnostics, turn-2 text lost** | **idle mid-turn** | pass | pass | **3 diagnostics, turn-1 text lost** | pass | pass | 20 pass / 3 skipped | 720 pass / 4 skipped (exit 0) |
| E1 | Runtime snapshot never opens a turn (both states) | pass | pass | pass | pass | — | — | **3 files fail, 22 tests** (interrupt targeting, active-turn append, quiescent preparation, root shutdown, input-state cadence, snapshot reconcile) | — | — |
| E2 (`E2-provisional-snapshot-turn.patch`) | Both states: a snapshot-known turn is provisional: it never retires a turn and is replaced without retirement by a stream-observed start; implemented separately in each state | pass | pass | pass | pass | pass | pass | pass | — | — |
| E3 (`E3-arrival-snapshot.patch`) | Pipeline snapshot captured when the batch arrives instead of when the queued task runs; no state change | pass | pass | pass | pass | pass | pass | — | — | — |
| E4 (`E4-shared-turn-identity.patch`) | E2's rule in **one** owner (`AgentTurnIdentity`) used by both states; duplicated retirement code removed (+115/−63, 3 files) | pass | pass | pass | pass | pass | pass | pass | 20 pass / 3 skipped (same as base) | 721 pass / 4 skipped, exit 0 (base 720 + the scoring probe file) |

## Conclusions

1. **E1 shows two different questions mixed in one state.** The turn state answers both "which turn is the runtime in now" (commands: Stop, append, shutdown; needs the live runtime snapshot) and "which turn do these queued events belong to" (status/segment projection; needs ordered stream evidence). Removing the snapshot breaks the first.
2. **The root flaw is unordered evidence acting as ordered evidence.** A live snapshot can be ahead of the queued events. Both states let it open a turn and then let an older queued `TURN_STARTED` retire that turn permanently (X1/X2). They also let a snapshot retire a stream-observed turn whose text is still queued (X5).
3. **E3 fixes the probe only by timing.** It relies on every backend updating its state synchronously before emitting each batch. Codex documents the opposite ("a synchronous native terminal update does not mean its async canonical batch reached AgentRun"), and the native AutoByteus stream is asynchronous. E3 also leaves the live `reconcileRecovery()` reconciles on the turn state unchanged. Rejected as the fix, and not added as extra hardening, because it adds nothing once the evidence rule holds.
4. **E2 and E4 fix every case with the same semantics.** E2 copies the rule into two classes that already duplicate the same turn-tracking policy (this bug lived in both copies). E4 gives the rule one owner at moderate cost and the same test results. **Chosen: E4.**
