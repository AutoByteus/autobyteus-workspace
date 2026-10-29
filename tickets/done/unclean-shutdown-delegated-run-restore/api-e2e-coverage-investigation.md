# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec (required on every route): `design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts: None
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass, 9.4/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (Medium / High, reviewed route)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001/REQ-002 (BEH-001): the restore check reads a raw-trace log with one byte-level line rule. A damaged end (torn last line, zero bytes, or a last line with interior zeros) is ignored read-only; the run is classified from its complete records. Damage before the last non-empty line is reported as "line N of <file> is damaged".
- REQ-003 (BEH-002): opening the active log for use cuts exactly the bytes after the last complete record and logs `Removed the damaged end of a memory log.` with `filePath`, `bytesRemoved`, `recordsKept`.
- REQ-004 (BEH-003): an append never joins a damaged end. The first append per file per store instance checks a tail of at most 64 KiB and repairs it if the end is not proven clean.
- REQ-005 (BEH-004): a refusal (`TASK_EXECUTION_CONTEXT_UNAVAILABLE`) names the delegated Agent/Team, the member, the reason in plain words and a next step. The file stays unchanged.
- REQ-006 (BEH-005): whole-file rewrites are synced before rename. This is unit-only (AC-007, IMP-02); no system surface can observe an fsync.
- BEH-006: message logs and package JSON stay unchanged (not touched).
- Persisted data: `Directly Usable — No Migration`; repair is lazy, per file, on use.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (continue a delegated Team after a power loss), SCN-002 (clear refusal for mid-file damage), SCN-003 (keep recording after the repair; the restored turn's records must survive a later read).
- Real-use scenarios added from the implementation:
  - SCN-001 with a torn last record and **no** `\n`, and with a torn last record whose `\n` **did** land. The second shape is the one a last-byte check alone would miss (code-review probe). Trigger: the user's message to the coordinator after a server restart.
  - SCN-003 confirmed after a second restart: a fresh read of the repaired log (a new process) returns the earlier records plus the new turn. Without REQ-004 the new turn would be glued to the damage and deleted on that next read.
- The power loss is simulated as `SIGKILL` of the server process (an abrupt end with no graceful shutdown), then the file damage the filesystem leaves behind. Damage shapes are taken from IN-DAT-01 (zero-filled end) and the design's examples.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none recorded. Damage in the middle of a log is a Non-Goal for repair, but its clear refusal is SCN-002.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 restore check (inspector) | Changed | handoff trace; IMP-06 | E2E through a user's message after restart (AC-005, AC-006) |
| BEH-002 byte-exact cut + warning | Changed | IMP-02 | E2E: server output warning with exact `bytesRemoved`; byte-prefix check of the file |
| BEH-003 append guard | Changed | IMP-02, IMP-06; code-review probe | E2E: new turn present after a second restart; no `0x00` |
| BEH-004 refusal text | Changed | IMP-06 (unit, 3 adapters) | E2E: WebSocket ERROR frame text and code; file byte-identical; EXC-E2E-007 regex |
| BEH-005 durable rewrites | Changed | IMP-02 (spied fsync) | Unit only (not observable at a system boundary) |
| BEH-006 message logs | Preserved | not touched | Covered by full suites (IMP-07, IMP-08) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `autobyteus-ts` store, server inspector, adapters | IMP-02, IMP-03, IMP-06, IMP-07 | Unit tests use injected inspectors/stores; the real chain (restore → AGY backend → writer → store) is not run together | Server E2E on a built server |
| API / transport / contract | Yes (text only) | Team stream `ERROR` frame message; delegate_task tool result | IMP-06 asserts the thrown error | The text reaching the client through the stream handler | Server E2E |
| Frontend component / state | No | Existing error card shows the text | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Crash → restart → lazy repair on first use | None | Restart in a new process with fresh store instances | Built server `dist/app.js`, killed and restarted |
| Persisted-data transition | Yes (direct use) | Existing logs read by the new reader | IMP-02, IMP-03 | Damaged logs written by a real run | Same E2E |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (runtime) | AGY runtime records through `ExternalRuntimeMemoryWriter` | IMP-06 (writer unit) | Real AGY backend appending after restore | Scripted AGY CLI (TESTING.md) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore`, branch `codex/unclean-shutdown-delegated-run-restore`
- Project type and runtime stack: pnpm monorepo; Node 22; Fastify/GraphQL/WebSocket server (`autobyteus-server-ts`); core library `autobyteus-ts`; Prisma SQLite.
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md` (same file in the worktree). No closer `TESTING*.md` under `autobyteus-server-ts` or `autobyteus-ts`.
- Conflicting, missing, or unclear instructions: none.
- Required environment variables or secrets available: N/A. No provider is used; the scripted AGY CLI needs none.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Server E2E layer; scripted AGY CLI (`ANTIGRAVITY_CLI_COMMAND`, `RUN_AGY_FAILURE_E2E=1`); clean env (`env -i`, resolved temp `HOME`); suites that run `dist/app.js` need `pnpm -C autobyteus-server-ts build`; rerun everything when `autobyteus-ts` changes; never use the user's node or data |
| `AGENTS.md` (repo root) | Repository rules | Read DESIGN/TESTING/RELEASE |
| `autobyteus-server-ts/package.json` | Scripts | `prebuild` (shared packages + Prisma), `build` |
| `autobyteus-server-ts/vitest.config.ts` | Runner config | `pool: forks`, `fileParallelism: false`; setup files |
| `tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts`, `tests/e2e/projects/projects-startup-migration.e2e.test.ts` | Precedent | Start `dist/app.js --data-dir <root> --host 127.0.0.1 --port 0`; ready on `Server listening on 127.0.0.1:0`; GraphQL listener found by probing `Server listening at …` URLs; `DATABASE_URL=file:<root>/db/production.db` |
| `tests/e2e/helpers/collaboration-root-harness.ts` | Precedent | Team root creation, Team stream `SEND_MESSAGE`, `restoreAgentTeamRun`, member projection query |
| `tests/fixtures/agy-failure-cli.mjs` | Scripted runtime | `linked_skills`: `CALL_TOOL:{…}` calls the real tool and replies `CALLED:<result>`; any other message is answered `OK`; resumes with `--conversation` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Shared packages + server build | worktree | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | Run once, alone (no parallel builds) | `exit=0`; `dist` contains `Removed the damaged end` | Untracked outputs, not committed |
| Server process #1, #2, #3 | `autobyteus-server-ts` | `node dist/app.js --data-dir <tmp root> --host 127.0.0.1 --port 0` | Own data root, SQLite DB, ephemeral port, temp `HOME` | Log line `Server listening on 127.0.0.1:0` + GraphQL `{__typename}` | #1 `SIGKILL` (the crash); #2/#3 `SIGTERM`, then `SIGKILL` after 8 s |
| Scripted AGY CLI | — | Started by the server | Children of the server | — | Checked: no process referencing the data root is left |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent and Team definitions, a Team root, 4 delegated Teams | Public GraphQL + the root's Team stream (scripted `delegate_task`) | Test-owned temp root; no user data | Removed after the run |
| Damaged coordinator logs | Test writes damage onto logs the real run wrote (the filesystem's part of a power loss) | Synthesized; never the user's node | Removed with the root; JSON receipt kept as evidence |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: `design-spec.md` "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing data: logs written by a real run on the same build, then damaged. The format is unchanged, so logs from older builds have the same shape.
- Evidence planned: the intact prefix is byte-identical after the repair; intact logs of other runs are not rewritten (the root manager's log stays byte-identical across the restart and is not named in any warning).
- Migration-specific scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/jsonl-log-file.test.ts`, `durable-file-replace.test.ts`, `run-memory-file-store-damaged-end.test.ts` (new) | Line rule, cut, append guard, fsync | REQ-001, 003, 004, 006 | Still Valid | IMP-02 | Reuse (IMP-02) |
| `autobyteus-ts` store/archive/snapshot tests | Store behavior | RSK-001 | Still Valid | IMP-02, IMP-03 | Reuse |
| Server inspector, refusal, planner, writer, Org idle-shutdown unit tests | AC-001, 002, 004, 006 | REQ-001…005 | Still Valid | IMP-06 | Reuse |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Fixture now returns `none` | Contract | Still Valid | IMP-08 | Reuse |
| `tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` EXC-E2E-007 | A copy whose memory folder is gone is refused with the `none` wording | REQ-005, BEH-004 | Needs Update (done by implementation: regex) | Not run yet | Run (API-03) |
| Other `tests/e2e/projects/*` restore suites (`delegation-forest-restore`, `task-reactivation-root-visibility`) | Restore after Stop with intact logs | Preserved behavior (intact log restores as today) | Still Valid | Not run in this ticket | Run `delegation-forest-restore` (API-05) as the intact-log restore regression on a real root |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| IMP-02 | AC-003, AC-004, AC-007 | `autobyteus-ts` store | Reused | IMP-02 | Ran on `a9b5230505`; `autobyteus-ts` unchanged since (`git diff --name-only a9b5230505 HEAD -- autobyteus-ts` empty) |
| IMP-03 | AC-008, RSK-001 | all `autobyteus-ts` unit | Reused | IMP-03 | Same commit reasoning |
| IMP-06 | AC-001, AC-002, AC-004, AC-006 | server units | Reused | IMP-06 | Ran on `b166e0db70`; HEAD adds only ticket docs |
| IMP-07 | AC-008 | server unit suite | Reused | IMP-07 | Ran on `b166e0db70`; HEAD adds only ticket docs |
| IMP-08 | AC-008 | server integration suite | Reused | IMP-08 | Content equal to `a9b5230505`; HEAD adds only ticket docs |
| API-01 | AC-005, REQ-001…004, QR-002 | Built server, Team stream, GraphQL, AGY backend, store, restart | Durable | New E2E file, case USR-1: zero-filled end (1,241 bytes) | The user's journey; not covered by any existing test |
| API-02 | AC-005 variants, REQ-001, REQ-003, REQ-004 | same | Durable | Same file, cases USR-2 (torn, no `\n`) and USR-3 (torn, `\n` landed) | Shapes the code-review probe singled out |
| API-04 | AC-006, REQ-005 | same | Durable | Same file, case USR-4: a line with interior zeros before the last record → refusal, file byte-identical | The real refusal text through the Team stream |
| API-03 | REQ-005 (`none` wording), BEH-004 | Studio server, Org root, delegate_task | Existing Test | `vitest run tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts -t "EXC-E2E-007"` | Its regex was updated and never run |
| API-05 | Preserved: intact logs restore as today | Studio server, 3 root kinds | Existing Test | `vitest run tests/e2e/projects/delegation-forest-restore.e2e.test.ts` | Restore after Stop through the changed inspector/adapters with intact logs |
| API-06 | — (test hygiene) | Type check of the new test file | Temporary Probe | `tsc -p tsconfig.json --noEmit --rootDir .`, filtered to the new file | The project `typecheck` covers `src` only (IMP-05 still valid; `src` unchanged). Tests are in no type-check gate, so this is a one-off hygiene check |
| API-07 | SCN-003, REQ-004, AC-005 | same as API-01 | Durable | Same file, case USR-5: a third server process; a second message to each repaired coordinator | Proves the new turn survives the next open, the failure mode of the old append path |
| API-08 | AC-005, AC-006 (test discrimination) | Same E2E on the base build | Temporary Probe | Temp `git worktree` at `f171032e88`, install + build, run the new file there; remove the worktree | Shows the new test fails without the fix, reproducing the user's refusal. One-off; a base build is not durable coverage |

API-01, API-02, API-04 and API-07 run in one file (cases USR-1…USR-5) with one setup: one Team root delegates four Teams; each coordinator gets its Task and two non-ASCII user turns; one crash; four damage shapes; one restart. Each case is one user message to one coordinator. A second restart then reads every repaired log fresh (USR-5, SCN-003).

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01, API-02, API-04, API-07 | `autobyteus-server-ts/tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts` | The crash → restart → continue journey crosses the restore lifecycle, adapter, inspector, AGY backend, memory writer and store in a new process. No unit or existing E2E runs that chain. It is gated like the other scripted-AGY suites (`RUN_AGY_FAILURE_E2E=1`). |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-03 | `tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` | Already updated by the implementation (regex) | Run only |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order: build once → server #1 (create definitions, Team root, delegate four Teams, wait for each coordinator's `OK`) → `SIGKILL` server #1 → damage four coordinator logs → server #2 → restore the root → one user message per coordinator → server #3 (fresh read) → stop.
- Environment: `env -i PATH HOME=<resolved temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture>`; child servers get only `PATH`, `HOME=<root>/home`, `TMPDIR`, `USER`, `DATABASE_URL=file:<root>/db/production.db`, `ANTIGRAVITY_CLI_COMMAND`, `AGY_FAKE_CASE=linked_skills`, `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=""`, `LMSTUDIO_HOSTS=http://127.0.0.1:1`.
- Health checks: the server's `Server listening on 127.0.0.1:0` line and GraphQL `{__typename}`.
- Evidence: a JSON receipt (`USDR_E2E_EVIDENCE_DIR`) with every message, refusal, byte counts, hashes and warning lines; the vitest output.
- Cleanup: servers stopped, no AGY process referencing the root, temp root removed.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| REQ-006 fsync at a system boundary | A power loss cannot be produced or observed in a test; the unit test spies the fsync (IMP-02, AC-007) | Low | No | None |
| A real power loss on the user's Docker node | TESTING.md forbids testing on the user's node; the shape is reproduced from IN-DAT-01 on synthesized data | Low | Yes, optional: the user's own node after the fixed release | Delivery decides |
| Native/Codex/Claude runtimes end to end | All write through the same `RunMemoryFileStore`; native `add` path covered at store level (IMP-02) | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one new E2E file)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the reuse check for IMP-* was done with `git diff --name-only <commit> HEAD` (only ticket docs changed since `b166e0db70`).
