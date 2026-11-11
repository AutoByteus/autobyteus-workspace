# Implementation Revision Record — autobyteus-461

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `design-spec.md` (DS-1 … DS-11), contract revision 8; initial implementation | N/A | `Initial Baseline` | SR-018 … SR-039, ARCH-REV-005 … ARCH-REV-014 | Implemented; handed to Code Review |

## Revision Entries

### IR-001 — Delegated runs are runs of their own; hosting removed; one migration

- Triggering role, report path, and round: Solution Designer, `design-spec.md` with `target-collaboration-contract.md` revision 8 and `evidence/collaboration-model/model.py`; ARCH-REV-014 pass on SR-039. Round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented on `codex/delegated-copies-outlive-delegator-461` (commits from `f7bc67d248`, step 1d, through the final commit named in the handoff).
- Related solution revision IDs: SR-018 … SR-039 (notably SR-036 old-address correction, SR-037 own-definition refusal, SR-038 peer launches read from the peer, SR-039 child rows' Settings go to each child's own save)
- Related architecture-review revision IDs: ARCH-REV-005 … ARCH-REV-014
- Related code-review / API-E2E / delivery revision IDs: N/A
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001 … REQ-012; DS-1 … DS-11; contract P1 … P8, TC-1 … TC-13, E1 … E12.
- Implementation delta (by design step):
  1. Data model and the Task side: `delegatedFrom` on Task entries and on runs, `subWork`, `recipientAddress` on every entry, peer `nodeId`/`members`; `DelegationTree` (+ `subscribe` for views); migration `20261111_delegated_runs_own_runs_v1` (DS-10).
  2. `DelegatedRunStarter` (from the peer path); the two idle shutdowns generalized to every delegated run (DS-7).
  3. `TaskDelegation` for all three root kinds (`toNewRun`, `toPeerRun`, `toExistingRun`) (DS-1, DS-6).
  4. `CrossRunMessageDelivery`, the router's cross-run path, address step 2 and the old-address correction (DS-2, DS-3).
  5. Task closure, reopen and deletion by the run's own identity (`TaskRunControl`) (DS-5).
  6. Stop of each root kind: own parts only (DS-4).
  7. Views: child rows from the Task entries (`delegated-children-dtos.ts`), child commands to the child's own run (`DelegatedRunCommands`), connect never starts the host, Settings/Stop on child rows through each child's own save (SR-039), and this round the live part: `LocalChildObservation` (new rows, closed rows, statuses and output while viewed) (DS-8); web: `TaskRoot.delegatingRun`.
  8. Restart resume bottom-up along `delegatedFrom`; places `host`/`member` only (DS-9).
  9. Removal of the hosting machinery (63 source files deleted; see below) and of the removed fields' code; this round also the unused `taskExecutionIdentity` capability.
  10. Documents: `collaboration_model.md`, `GLOSSARY.md`, ten module docs.
  - Also: DS-11 run-list rule (`top-level-run-rule.ts`), REQ-007 archive/delete guard (`delegated-work-guard.ts`), the Task worker status notice (`task-worker-status-notice.ts`, restoring live worker status on the Projects page).
- Changed files or areas: see the handoff's Key Files. Deleted source (hosting only): copy registries (`task-agent-execution-registry`, `task-team-execution-registry`, `task-team-execution-factory`), the shared root task lifecycle and its queue, scope, adapters and publication helpers, closure fence and leases, `task-execution-tree-split`, `coordinating-tree-shapes`, `remote-task-execution-links`, `open-delegated-run-source`, `task-agent-own-*`, `task-agent-message-logs`, `task-agent-team-tree*`, launch-selection command and stop set, `task-team-root-memory-source`, `standalone-root-tree*`, `standalone-root-location-service`, `task-execution-identity-capabilities`, `task-team-run-identity-factory`, and others listed by `git diff --name-status 827f1e68dc HEAD -- autobyteus-server-ts/src | grep ^D`.
- Deleted tests (60 files), with the reason: each tested hosting-only behavior that no longer exists — a root hosting, idling, waking, fencing, re-leasing, publishing or stopping its copies; copy records, copy launch selection and copy sources; hosted-copy memory placements and own-file stores; the closed-set projection; the standalone tree's containment and location service; the native compaction root tests that drove a hosted stopped copy through its root (`native-compaction-root*`, `native-root-*`; native recovery stays covered by `tests/unit/agent-execution/agent-run-compaction-recovery.test.ts` and `root-recovery-command.test.ts`); the identity-capability test. Behavior that is preserved was re-tested at its new owner (for example `task-delegation.test.ts` CM-6 folder case, `delegated-child-launches.test.ts`, `local-child-observation.test.ts`, `task-worker-status-notice.test.ts`, `delegated-run-listing-and-guard.test.ts`, the restart-resume tests).
- Test adaptations this round: released migrations' tests read their results through the frozen readers and seed the pre-461 shape (`tests/fixtures/before-461-tree-fixtures.ts`, `tests/fixtures/app-data-migrations/released-message-log-views.ts`); registry-order tests include `20261111`; full-registry upgrade tests assert the 461 final state; integration fixtures write delegated runs as runs of their own.
- Local validation and result: see the handoff's Checks Run (IMP-01 … IMP-08).
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: FU-008 (hosting-only contract fields kept for the unchanged web), FU-009 (history poll statuses of children), FU-010 (names); `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` needs the API/E2E rewrite; the live child view is not browser-checked; the migration is fixture-tested only.
