# API/E2E Coverage Investigation — autobyteus-381 (remove the last traces of read_media_file)

## Investigation Meta

- Requirements Doc: `tickets/in-progress/remove-read-media-file-381/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/remove-read-media-file-381/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/remove-read-media-file-381/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/remove-read-media-file-381/design-spec.md`
- Supplemental Task Artifacts: `handoff-implementation.md`
- Design Review Report: `N/A — not applicable` (direct Small / Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/remove-read-media-file-381/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/remove-read-media-file-381/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation_engineer handoff, IR-001, HEAD `67ed4d9e03`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001: `readMediaFileAsContextFile` is renamed `readMediaAsContextFile`; `read_file`'s media behavior is unchanged.
- REQ-002 / AC-002, AC-003: the AutoByteus Work Journal converter for `read_media_file` is removed with its table entry, oracle entry, synthetic row, test lines and doc sentence. `WORK_JOURNAL_RENDERER_REVISION` stays 2, and no existing journal or raw trace is touched (DEC-001). A recorded call renders by the generic tool rule when its file is rendered again. The golden fixture is regenerated (DEC-004).
- REQ-003 / AC-004: the resolver test that singles out `read_media_file` and the tool-schema sentence are removed, with no resolver code change.
- REQ-004 / AC-005: `read_media_file` and `readMediaFile` remain only in historical records (DEC-003).
- REQ-005 / AC-006: the affected suites and both type gates pass.
- Persisted data: `Not Affected` (the user: "do NOT touch existing data").

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (read media with `read_file`), SCN-002 (render a run's journal), SCN-003 (launch from a stored definition).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1: a run recorded before v1.5.11 contains `read_media_file` calls, and its journal was already written at revision 2 in the old wording. On the new build the user opens the journal, or memory search catches up (`ensureCurrent`). The existing journal file must be reused byte for byte, because the revision is unchanged (DEC-001: no data touched).
  - SCN-A2: the same run is rebuilt by memory search's Rebuild (`ensureCurrent({ regenerate: true })`). The call then reads as the generic tool line (AC-003 through the real service, not only a direct renderer call).
  - SCN-A3: a new live AutoByteus run records tool calls and its journal is rendered. The live e2e reads the edited oracle and checks that no built-in tool appears as a generic `Tool:` line.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 `read_file` media branch helper | Changed (rename only) | `b04138c777` | Existing read_file media tests prove it; the build compiles the rename |
| BEH-002 AutoByteus journal converter for `read_media_file` | Removed | `bba6ab3edd` | Translation and golden tests updated; need proof that existing journals are reused (SCN-A1) and that Rebuild renders generically (SCN-A2) |
| BEH-002 renderer revision 2 | Preserved | `work-journal-service.ts` L174 reuse condition | The probe proves reuse with the old wording intact |
| BEH-003 resolver general unknown-tool rule | Preserved (test removed) | `7cd914394d` | Sibling removed-tool tests remain |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | AutoByteus translation table; `read_file` helper name | translation, golden and service tests; read_file tests | Reuse of an existing old-wording journal across the change | Service-level probe on a temp memory folder, with a journal written by the base renderer |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | Existing journals must stay untouched | Service tests prove reuse in general | That the specific old lines survive | The same probe (SCN-A1) |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Indirect | The live e2e reads the edited oracle | Gated live suite | Live runtime journal with the edited oracle | `work-journal-live-runtimes.e2e.test.ts`, AutoByteus on local LM Studio |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-read-media-file-381`, branch `codex/remove-read-media-file-381`, HEAD `67ed4d9e03`
- Project type and runtime stack: pnpm monorepo; TypeScript server (Fastify, Prisma, vitest), `autobyteus-ts` core library
- Project testing guideline path(s): `TESTING.md` (root); no closer `TESTING*.md` under the changed folders
- Conflicting, missing, or unclear project instructions: None
- Required environment variables or secrets available: `N/A` (the live case uses local LM Studio, no key)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Choosing the path | Layers and commands | `pnpm -C autobyteus-server-ts test:unit`; one file with `exec vitest run <path> --no-watch`; gated runtime suites take their gate from the file |
| `TESTING.md` § Rerun by impact | Reuse | Reuse implementation checks whose exercised code has not changed since their commit |
| `TESTING.md` § Environments | Clean env | `env -i PATH HOME=<temp> TMPDIR`; never the user's data |
| `autobyteus-server-ts/tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts` header | Live gate | `RUN_LMSTUDIO_E2E=1`, `LMSTUDIO_TARGET_TEXT_MODEL` default `qwen3.6-35b-a3b`, `WORK_JOURNAL_E2E_EVIDENCE_DIR` |
| `autobyteus-server-ts/package.json` | Scripts | `test:unit` covers `tests/unit tests/app-data-migrations tests/architecture tests/agent-work-journal` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process studio server (live e2e) | `autobyteus-server-ts` | started by the test (`startStudioE2eRuntimeServer`) on a temp data dir | test-owned | test's own | the test's `afterAll` |
| LM Studio `qwen/qwen3.6-35b-a3b` | host | loaded on demand by the run | ~20 GB; one model at a time | `lms ps` | `lms unload --all` after the run (no model was loaded before) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| A pre-v1.5.11 AutoByteus run folder with a `read_media_file` call | Hand-built raw trace (same shape as `synthetic-run-traces.ts` / `raw-trace-folder-fixtures.ts`), under a fresh temp dir | Synthetic only; never `~/.autobyteus` | Temp dir removed; journal outputs copied to evidence |
| Live run data | Test-owned temp data dir | Synthetic task, local model | Removed by the test; journal copied to evidence |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: design-spec § Persisted Data; handoff § Persisted Data Transition Check
- Representative existing-data setup and required behavior: a journal written at revision 2 by the base renderer (`fe351591f2`) for a run with a `read_media_file` call must be reused unchanged by the new build's `ensureCurrent`.
- Evidence planned: API-07 (byte-identical journal and manifest before and after).
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/tools/file/read-file-media.test.ts`, `tests/integration/agent/read-file-media-*.test.ts`, read_file unit tests | read_file media behavior | AC-001 | Still Valid | IMP-01 | Reuse |
| `autobyteus-server-ts/tests/agent-work-journal/rendering/runtime-translations.test.ts` | Tables match the oracle; per-tool lines | AC-002 | Still Valid (updated by implementation) | diff | Reuse IMP-02 |
| `tests/agent-work-journal/rendering/unchanged-lines.test.ts` + `unchanged-groups-before.json` | Revision-1 lines unchanged | AC-002 | Still Valid (golden regenerated per DEC-004; diff is the two removed lines only) | diff above | Reuse IMP-02 |
| `tests/agent-work-journal/services/work-journal-service.test.ts` | Reuse when revision and runtime match; regenerate on Rebuild | DEC-001 | Still Valid | — | Run in API-06 |
| `tests/unit/.../autobyteus-agent-tool-resolver.test.ts` | General unknown-tool rule (siblings) | AC-004 | Still Valid; the removed test was a duplicate for one name (REQ-003) | IMP-04 | Reuse |
| `tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts` | Live journal; no built-in as generic line (reads the oracle) | AC-002 (oracle consumer) | Still Valid | — | Run (API-08) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | read_file media branch | Reused | IMP-01 | Ran at `b04138c777`; the later commits touch no `autobyteus-ts/src` file (only `autobyteus-ts/docs`) |
| API-02 | AC-002, AC-003 | journal rendering | Reused | IMP-02, IMP-03 | Ran at `bba6ab3edd`; `7cd914394d` and `67ed4d9e03` touch no journal file |
| API-03 | AC-004 | resolver | Reused | IMP-04 | Ran at `7cd914394d`; HEAD adds only ticket documents |
| API-04 | AC-006 | type gates | Reused | IMP-06 | Ran at `7cd914394d`; HEAD adds only ticket documents |
| API-05 | AC-005 | whole tree | Existing Test (rerun) | `git grep -i -n -I "read_media_file\|readMediaFile"` at HEAD, then classify each hit's path | Cheap; HEAD added ticket files after IMP-05 |
| API-06 | AC-002, REQ-005 | server unit + journal, autobyteus-ts unit | Existing Test | `pnpm -C autobyteus-server-ts test:unit`; `pnpm -C autobyteus-ts exec vitest run tests/unit`, clean env | Broader regression beyond the implementation's targeted runs |
| API-07 | AC-003, DEC-001, Not Affected | `WorkJournalService.ensureCurrent` on a real temp run folder | Temporary Probe | (1) base renderer (`fe351591f2`'s `autobyteus-translation.ts` checked out temporarily) writes the journal of a run with a `read_media_file` call; (2) HEAD's `ensureCurrent` must leave the journal and manifest byte-identical; (3) HEAD's `ensureCurrent({ regenerate: true })` renders the call as `Tool: read_media_file …` | Cross-version: needs the base renderer, which a durable test in the tree cannot contain. The general reuse rule already has durable coverage (`work-journal-service.test.ts`) |
| API-08 | AC-002 (oracle consumer), SCN-A3 | live AutoByteus run through the in-process studio server | Existing Test (gated) | `RUN_LMSTUDIO_E2E=1 vitest run tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts`, real HOME for nothing (no CLI), LM Studio `qwen3.6-35b-a3b` | The handoff left this to API/E2E; it reads the edited oracle |

| API-09 | AC-006 | server type gate | Existing Test | `pnpm -C autobyteus-server-ts typecheck` with the API-08 baseline fix in place | Added during execution: the baseline fix edits a type-checked test file |

- Test progress log needed: `Yes`

Update during execution: API-08's first run failed on a cause in the test (its task names `notes.txt` by a relative path, which `read_file` has refused since `4cb3167a26`). Per TESTING.md Rule 9 the test gets a labelled baseline fix (below), and API-09 was added for it.

## Durable Coverage To Add

None. The cross-version reuse (API-07) needs the base renderer and stays a probe; the general rule is durable already.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-08 | `autobyteus-server-ts/tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts` | Name the task's files by absolute workspace path | Baseline fix (Rule 9), own commit `0e5e2f3029`; not part of the ticket's change |

## Durable Coverage To Remove

Done by the implementation, checked here:

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `runtime-translations.test.ts` `read_media_file` lines | Asserted the removed converter | REQ-002 | No replacement: the generic rule has its own tests (`tool-call-line.test.ts`); API-07 records the new line |
| `synthetic-run-traces.ts` `read_media_file` row and its golden lines | Exercised only the converter | REQ-002, DEC-004 | No replacement |
| Resolver test "launches … read_media_file …" | Duplicated the general rule for one name | REQ-003 | Sibling removed-tool tests in the same file |

## Live Environment And Fixture Plan

- Startup order and commands: no model loaded beforehand; the test loads `qwen3.6-35b-a3b` through LM Studio; afterwards `lms unload --all`.
- Environment choices: clean env, temp HOME, `WORK_JOURNAL_E2E_EVIDENCE_DIR` set to a temp dir.
- Seed data / fixtures: the test's own `notes.txt` task.
- Evidence to capture: test output, the run's `work_journal_active.md`.
- Owned processes and temporary state to clean up: the test's server and data dir (the test removes them); the LM Studio model load; the temp dirs.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Live journal e2e on Claude, Codex, Antigravity | Their oracle entries did not change; each run spends the user's credits | None for this change | No | None |
| The user's real journals and stored definitions | Never touched by tests (data safety); the change touches no data | Low; API-07 proves the mechanism on a representative copy | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (beyond the implementation's reviewed removals)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: —
