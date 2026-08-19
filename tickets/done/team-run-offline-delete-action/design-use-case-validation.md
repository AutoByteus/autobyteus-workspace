# Design Use-Case Validation

## Status And Purpose

`Complete — SR-003 requirement-reset self-validation, 2026-08-19`

This supplement statically walks every materially different approved case across the target data-flow spines. It proves design coherence, not executable correctness. The authoritative behavior is in `requirements.md` and `ui-ux-spec.md`.

## Authoritative Inputs

- `requirements.md` — user-approved strict Stop-then-later-Delete requirements.
- `ui-ux-spec.md` — user-approved row states, journeys, confirmation, and recovery.
- `investigation-notes.md` — runtime reproduction, production paths, base/WIP comparison, and API/E2E reroute.
- `design-spec.md` — target `DS-001`, `DS-003`–`DS-007` and decommissioned `DS-002`.
- `runtime-reproduction-evidence.md` — pending-approval Stop reachability.

## Cross-Case Invariants

1. Active or stopping root exposes Stop only; inactive `READY` history exposes Archive/Delete.
2. Stop and Delete are separate user intents and separate technical spines. Stop never opens a Delete modal or invokes deletion.
3. Stop retains the exact catalog row, package, context, and history.
4. Delete is admitted only from an inactive `READY` row and requires independent confirmation.
5. Member `offline` never determines root lifecycle or Delete eligibility.
6. Exact `teamRunId` is the only root selector.
7. One manager-owned root identity persists through nonterminal shutdown and retry.
8. Root shutdown joins admitted materialization, freezes one exact recursive scope once, and reuses it across phases/retry.
9. Interruption precedes quiescence; only the existing AgentRun interruption contract cancels pending approval.
10. Inactive Delete holds exact-ID exclusion against restore/create and returns ordinary failure only with a valid visible retry target.
11. No persisted-data migration or compatibility path is introduced.

## Validation Matrix

| Case | Starting Shape | User/System Intent | Primary / Return / Local Spines | Expected Outcome | Verdict |
| --- | --- | --- | --- | --- | --- |
| `VAL-001` | active root; all members offline | Stop and retain | `DS-001`, `DS-004`, `DS-005`, `DS-006` | full stop; same inactive history; Archive/Delete appear | Pass |
| `VAL-002` | active or stop-pending row | inspect/actions | `DS-006` | no Delete/Archive/modal; Stop only | Pass |
| `VAL-003` | inactive `READY` history | separate Delete | `DS-003`, `DS-006`, `DS-007` | independently confirmed exact disposal | Pass |
| `VAL-004` | configured Agent approval pending | Stop | `DS-001`, `DS-004`, `DS-005` | interrupt, no tool execution, retained history | Pass |
| `VAL-005` | delegated Agent preparation/approval | Stop | `DS-001`, `DS-005` | admitted object captured/aborted, then fully stopped | Pass |
| `VAL-006` | configured/delegated nested Teams | Stop | `DS-001`, `DS-005` | deepest-first complete stop before inactive | Pass |
| `VAL-007` | descendant termination rejection | retry Stop | `DS-001`, `DS-004`, `DS-005` | same root/scope retry; Delete absent | Pass |
| `VAL-008` | repeated Stop / late materialization | concurrency | `DS-005` | one attempt/scope; late add rejected | Pass |
| `VAL-009` | inactive Delete storage failure | retry Delete | `DS-003`, `DS-007` | inactive visible valid retry target | Pass |
| `VAL-010` | same-summary roots | exact Stop/Delete | `DS-001`, `DS-003` | only clicked ID changes | Pass |
| `VAL-011` | inactive Delete confirmation | cancel | `DS-006` | no mutation | Pass |
| `VAL-012` | stopped retained history | restore/continue | `DS-004` then existing restore path | current data directly usable | Pass |
| `VAL-013` | inactive Delete concurrent with restore | serialization | `DS-003`, `DS-007` | restore wins/rejects Delete or Delete completes first | Pass |
| `VAL-014` | already-admitted message/delegation vs Stop | stabilization | `DS-005` | register-or-abort before one frozen scope | Pass |

## Per-Case Data-Flow Proof

### `VAL-001` — Stop Active Root With All Members Offline

- **Given:** root is manager-owned/admitting, every configured member projects offline, checkpoint has no open work.
- **UI proof (`DS-006`):** row branches on root `isActive`, not member snapshots; it renders Stop and no Archive/Delete.
- **Execution proof (`DS-001`/`DS-005`):** Stop carries exact root ID to the existing termination boundary; gate closes/joins, empty or materialized scope is captured, phases complete, root terminalizes.
- **Data proof:** no history Delete call exists on this spine; row/package/context remain.
- **Return proof (`DS-004`):** only terminal success projects inactive; then the same row renders Archive/Delete.
- **Verdict:** Pass. The observed state reaches the desired later Delete without changing the workflow.

### `VAL-002` — Active Delete Is Unreachable

- **Given:** root is active, stopping, or retained after failed Stop; `deleteLifecycle` may otherwise be `READY`.
- **UI proof:** action rendering requires inactive for Archive/Delete. `onDeleteTeam` also rejects active input defensively.
- **Modal proof:** the only Team Delete pending state is an inactive exact ID; no `wasActive`, combined message, or stop-then-delete branch exists.
- **Server proof:** catalog independently rejects any manager-owned exact root.
- **Verdict:** Pass. Both presentation and authoritative storage boundary reject the removed WIP path.

### `VAL-003` — Delete Inactive History

- **Given:** exact root is inactive/unmanaged and row is `READY`.
- **Intent proof (`DS-006`):** Delete opens only inactive permanent-deletion confirmation. Cancel is side-effect free.
- **Execution proof (`DS-003`/`DS-007`):** confirm calls history Delete only; manager lane rechecks unmanaged; catalog removes exact index/package and publishes complete success.
- **Negative proof:** no termination/restore call occurs.
- **Client proof:** exact row/context/selection cleanup happens after success.
- **Verdict:** Pass.

### `VAL-004` — Configured Agent Pending Tool Approval

- **Given:** configured AgentRun has an active turn at tool approval.
- **Stabilization:** root gate closes/joins; scope contains that exact AgentRun.
- **Interruption:** frozen scope calls existing `AgentRun.interrupt()`; no Team Approve/Deny and pending tool does not execute.
- **Quiescence/finish:** terminal turn event settles input; preparation completes; provider/runtime terminates.
- **Publication:** root remains nonterminal/Delete-hidden until every finish succeeds, then becomes inactive with retained history.
- **Verdict:** Pass; directly covers reproduced defect.

### `VAL-005` — Delegated Task Agent Preparation And Pending Approval

- **Given:** delegation passed root admission and is preparing or registered; it may wait at approval.
- **Gate proof:** entered delegation remains counted until candidate registration or abort is authoritative.
- **Freeze proof:** after join, prepared/active task Agent registries reject additions and contribute exact objects to frozen scope.
- **Shutdown proof:** registered object is interrupted/quiesced/finished; aborted candidate is not leaked.
- **Task proof:** task record settles deepest-first without reactivating work.
- **Verdict:** Pass.

### `VAL-006` — Configured And Delegated Nested Teams

- **Given:** root contains materialized configured subteam and delegated/nested Team executions, possibly with active leaf Agents.
- **Capture:** recursive `freezeForRootTermination` returns one deduplicated object graph.
- **Phase order:** all leaves interrupt before any quiescence wait; every captured Team/Agent finishes deepest-first; root local Team finishes last.
- **UI:** Delete absent until root terminal event.
- **Verdict:** Pass.

### `VAL-007` — Nonterminal Stop Failure And Retry

- **Given:** one descendant interrupt/termination returns nonaccepted or throws.
- **First result:** RootTeamRun does not terminalize/unregister; lifecycle remains nonterminal and history remains; Delete stays absent.
- **Cache proof:** only in-flight promise clears; frozen scope and exact objects remain owned.
- **Retry:** later Stop joins/starts a new attempt on the same root/scope; accepted descendants are idempotent and failed descendant retries.
- **Verdict:** Pass.

### `VAL-008` — Concurrent Repeated Stop And Late Addition

- **Repeated Stop:** manager/root share one in-flight promise; no duplicate traversal.
- **Already-admitted addition:** gate join waits for register-or-abort before freeze.
- **Late addition:** gate/closed registries reject operations entering after shutdown begins.
- **Scope:** phases reuse one frozen set; no re-enumeration race.
- **Verdict:** Pass.

### `VAL-009` — Inactive Delete Candidate-Index Or Package Failure

- **Given:** root is inactive/unmanaged and separately confirmed for Delete.
- **Candidate-index failure:** catalog still holds original memory state/package; failure returns with visible row.
- **Package failure after candidate index:** catalog re-flushes and validates captured original index/package before ordinary failure returns; in-memory removal/package exclusion were not published.
- **UI:** row remains inactive/Delete-ready; retry calls only Delete.
- **No combined outcome:** Stop is not part of this attempt.
- **Verdict:** Pass.

### `VAL-010` — Same-Summary Exact Identity

- **Given:** at least two rows share summary/definition.
- **Stop:** exact clicked `teamRunId` reaches manager/root and only that row transitions.
- **Delete:** exact inactive pending ID reaches catalog safe path and only that row/package is removed.
- **Verdict:** Pass.

### `VAL-011` — Cancel Confirmation

- **Given:** inactive Delete modal is open.
- **Action:** user cancels/Escape.
- **Result:** pending ID/modal clear; no Team store, history store, GraphQL, runtime, filesystem, or client-cleanup call.
- **Verdict:** Pass.

### `VAL-012` — Restore Retained Stopped History

- **Given:** Stop succeeded and exact current-format package remains inactive.
- **Data proof:** Stop changed lifecycle metadata only; no representation/migration/disposal.
- **Restore proof:** existing restore enters manager exact-ID lane, registers one root, and uses normal current reader.
- **UI proof:** because user has not separately chosen Delete, retained history is available.
- **Verdict:** Pass; proves why Stop and Delete must remain separate.

### `VAL-013` — Concurrent Restore And Delete

- **Order A (Delete wins lane):** catalog queue acquires exact-ID lane, rechecks unmanaged, holds through complete outcome; restore waits. After successful removal, restore cannot consume removed history through the old row.
- **Order B (restore wins lane):** restore registers exact root before releasing lane; later Delete recheck sees manager-owned root and rejects without mutation.
- **Lock order:** catalog queue then manager lane; restore releases manager lane after registration before awaiting catalog record updates.
- **Verdict:** Pass.

### `VAL-014` — Already-Admitted Message Or Delegation Versus Stop

- **Given:** message/delegation entered root admission, then pauses during `ensureReady`/preparation before current queue registration.
- **Stop:** closes the gate and awaits the entered operation.
- **Branch 1:** operation commits materialized object; registries include it before freeze.
- **Branch 2:** operation aborts and releases reservation; no leaked object exists.
- **After join:** resolver/local registries close, one scope is frozen, late work is rejected.
- **Verdict:** Pass; closes the ARCH-REV-001 materialization gap while preserving strict UI flow.

## Negative-Path And Shortcut Rejection Proof

| Rejected Shortcut | Failure | Target Prevention |
| --- | --- | --- |
| Show Delete beside active Stop | collapses safe two-decision workflow | inactive guard in row/composable + server guard |
| Make Stop open delete confirmation | misrepresents non-destructive intent | direct `onTerminateTeam`; modal belongs only to inactive Delete |
| Stop then Delete inside one confirm | deletes data without later post-stop choice | no active Delete spine/`wasActive` state |
| Infer root terminal from all members offline | supported active lazy state would become destructively eligible | root `isActive` is authority |
| Project inactive at termination start | Delete appears before descendants finish | terminal-only lifecycle publication |
| Wait for approval without interrupt | Stop hangs | AgentRun interrupt before quiescence |
| Re-enumerate mutable registries per phase | misses/changes object set | one frozen scope |
| Unregister on read/non-admission | replacement root can appear mid-stop | managed identity retained until terminal |
| One-time manager check before Delete I/O | restore can register mid-delete | held exact-ID lane |
| Publish index removal before package success | failed Delete loses visible retry | candidate/original compensation |
| Revert all backend WIP | restores actual lifecycle/catalog defects | selective UI removal only |

## Requirements And Spine Completeness Check

| Requirement Group | Covered Cases | Spine Coverage | Complete? |
| --- | --- | --- | --- |
| strict active Stop / inactive Archive-Delete | `VAL-001`–`VAL-003`, `VAL-011` | `DS-001`, `DS-003`, `DS-006` | Yes |
| exact identity/client history | `VAL-003`, `VAL-009`–`VAL-013` | `DS-003`, `DS-004`, `DS-007` | Yes |
| pending approval/full recursive Stop | `VAL-004`–`VAL-008`, `VAL-014` | `DS-001`, `DS-004`, `DS-005` | Yes |
| retained history/direct restore | `VAL-001`, `VAL-004`, `VAL-007`, `VAL-012` | `DS-001`, `DS-004` | Yes |
| failure truth/retry | `VAL-007`, `VAL-009`, `VAL-013` | `DS-004`, `DS-005`, `DS-007` | Yes |

## Validation Conclusion

The reset design is internally coherent for every observed and supported case. The actual bug fix—reliable exact-root shutdown—makes the original safe workflow work again. No active Delete, combined confirmation, stop-delete orchestration, migration, or generic framework is required. Executable coverage must now prove the transition `active Stop only -> full terminal Stop with retained history -> inactive Archive/Delete -> optional separately confirmed Delete`.
