# Implementation Design Impact DI-002

- Ticket: `delegated-copy-restore-from-own-file` (autobyteus-197)
- Raised by: implementation_engineer, 2026-10-19, after Change Sequence steps 1–5, while running the startup e2e suites that cover both migrations
- Basis: design-spec SR-007, Migration Plan "Predecessor gate" and step M5; Data Migration Guideline Checklist item 3 ("Predecessor dispositions … leave records unmoved, so there are no own files to convert"); guideline §4 (released migrations keep their released behavior)
- Classification: `Design Impact`. Intended behavior is unchanged; the gate the design specifies breaks the released 10-17 migration's retry.
- Protected authority: REQ-005 / AC-009 (the released migration still produces its released output); the previous ticket's AC-010 (a coordinating run that cannot be moved on one start is completed on the next), proven by `task-agent-own-run-startup.e2e.test.ts` TAU-2

## Finding

M5 says the new migration "converts every file present, but the run stays non-terminal … while that predecessor is not `SUCCEEDED`". Checklist item 3 assumes that while 10-17 is pending, it has left no own files behind. **That does not hold when 10-17 partly fails.** In one coordinating run, 10-17 can write the own files of some copies (for example a copy that never ran, `SKIPPED_UNMATERIALIZED`, or one moved before a later step fails), then fail the run, and retry it on the next start.

On the retry, 10-17 recognizes its own earlier output with `isOwnedHere` (and `partsAtL1` for the log merge). Both read the own file through the frozen released reader (`ReleasedTaskAgentOwnFiles.readAgent/readTeam` → `parseReleasedTaskAgentSection`, which requires `taskAgent.origin`). The new migration ran in the same start, so those files are already in the current shape (no `origin`). The frozen reader rejects them, `isOwnedHere` returns false, and 10-17 then stops at:

```
'<memory>/agents/c7-helper' already exists; it is never overwritten.
```

10-17 stays `FAILED` on every later start, and its coordinating run's copies are never moved. This is a permanent stall, not a delay.

## Evidence

- `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` TAU-2, run against the built server on commit `7d689455ad` (evidence `evidence/IMP-11-e2e-startup-migrations.log`). The hub's collaboration folder is read-only on start 1. 10-17 writes the own files of `c7-helper` and `never-ran`, then fails the hub. The new migration completes those files. On start 2:

  ```
  {"migrationId":"20261017_task_agent_own_run_v1","status":"FAILED","attempts":2,"summary":"Scanned 3; migrated 3; skipped 0; failed 2."}
  {"itemId":"agent:hub/c7-helper", … "status":"FAILED","message":"FAILED_OPERATION: '…/memory/agents/c7-helper' already exists; it is never overwritten."}
  {"itemId":"agent:hub/never-ran", … "status":"FAILED","message":"FAILED_OPERATION: '…/memory/agents/never-ran' already exists; it is never overwritten."}
  ```

- TAU-1, TAU-3 and both append-only suites (AOML-1, AOML-2) pass on the same commit. Only the partial-failure retry is affected.
- The mechanism in code:
  - `migrations/task-agent-own-run-v1/coordinating-run-migration.ts`, `migrateOne` → `isOwnedHere` → `this.files.readAgent` (frozen reader);
  - `legacy/released-run-package-shapes/released-task-agent-own-files-with-origin.ts` `parseReleasedTaskAgentSection`: `requireKeys(section, ["coordinatingRun", "address", "origin"])`.
- At the base commit this could not happen: no later migration rewrote own files, and the runtime writer wrote the released shape.
- A prototype of option A below (two lines; diff in `evidence/IMP-13-DI-002-option-A-prototype.diff`) passes TAU-1, TAU-2 and TAU-3 (`evidence/IMP-13-DI-002-option-A-prototype-e2e.log`). Its only unit-level effect is that the M5 gate test, which asserts "converts what is present while pending", must change. The prototype is **not** in the committed code; the committed code follows M5 as designed.

## Options

| Option | What changes | Effect | Cost / risk |
| --- | --- | --- | --- |
| **A (recommended)** | M5 becomes a real prerequisite: while 10-17 is not `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS`, the new migration reads and writes nothing and stays non-terminal (`FAILED`, "Waiting for 20261017_task_agent_own_run_v1; the next start continues"). Once 10-17 is terminal, it converts everything in one pass. Checklist item 3 and the M5 row are reworded. | 10-17's retry only ever sees its own released output. In a start where 10-17 partly fails, the copies it moved keep the released shape until the next start. Catalog agent copies stay readable (the reader ignores `origin`, as for the F-X3 mirrors); configured-place agent copies with a null launch and Team copies (released member shape) are left out (L5) until the next start. TAU-2's model edit of a migrated catalog agent copy still works. | Two lines plus one unit test. The window applies only to installs that upgrade from before 10-17 **and** whose 10-17 run partly fails; the user's install has 10-17 `SUCCEEDED`. No change to released code. |
| B | Keep M5. Make 10-17's ownership checks (`isOwnedHere`, `partsAtL1`) read only the shape-stable fields (`taskAgent.coordinatingRun`; a Team's `rootTeam.members[].agentRunId`) instead of fully parsing the released shape. | Copies stay usable in the partly failed start too. | It changes released migration logic beyond the repoint: 10-17 would accept a shape that a later migration writes, which guideline §4 discourages. A future change to the own-file section could break it again. |
| C | The new migration skips copies whose coordinating run 10-17 has not finished (for example, the run's tree still holds the full record rather than a link). | Same as B, without touching 10-17. | Couples the new migration to 10-17's intermediate states. More code and more cases to test. Rejected in my view. |

## Requested decision

Choose A, B or another resolution, and record it in the design (Migration Plan "Predecessor gate", the M5 row, Checklist items 3 and 4). I will apply it, update the M5 unit test and rerun IMP-02, IMP-09 and IMP-11.

## Implementation state at escalation

- Committed on `codex/delegated-copy-restore-from-own-file`:
  - `3ed550595c` (step 1 freeze);
  - `35675e3b5e` (contracts and both rebuilt `dist/` folders);
  - `65ae647bc9` (server, including the new migration as designed and D-8);
  - `7d689455ad` (web).
- Checks on `7d689455ad` (`evidence/IMP-00-summary.txt`):

  | Check | Result |
  | --- | --- |
  | IMP-01 server typecheck | pass |
  | IMP-02 server unit | 743 files, 6098 tests, pass |
  | IMP-03 server integration | 78 files, 419 tests, pass |
  | IMP-04, IMP-05 contract tests | pass |
  | IMP-06 committed contract `dist/` | matches a fresh build |
  | IMP-07 web unit | 639 files, 4549 tests, pass |
  | IMP-08 web guards | pass |
  | IMP-09 migration-focused units, including the four unchanged D-8 suites | 87 tests, pass |
  | IMP-10 server build | pass |
  | IMP-11 startup e2e | TAU-1, TAU-3, AOML-1 and AOML-2 pass; **TAU-2 fails (this DI)** |
  | IMP-12 production-upgrade e2e (now also asserts the completed own file and the new migration's gate) | 4 tests, pass |
  | IMP-13 option A prototype (not committed) | TAU-1..3 pass |

  The full logs for IMP-02, IMP-03 and IMP-07 are not committed because of their size; their excerpts are.
- Everything else in the design is implemented. No other escalation trigger was found: every remaining configured-placement read of a copy is F-1 (skill improvement, memory targets), and no product path writes a copy without `source`.
