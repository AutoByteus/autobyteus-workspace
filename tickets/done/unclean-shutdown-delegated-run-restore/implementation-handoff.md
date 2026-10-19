# Implementation Handoff

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore/tickets/in-progress/unclean-shutdown-delegated-run-restore/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore`, branch `codex/unclean-shutdown-delegated-run-restore`, base `origin/personal` @ `f171032e88`
- Implementation commits: `a9b5230505` (fix), `b166e0db70` (baseline test fix, unrelated to the ticket; TESTING.md Rule 9). The ticket documents and evidence are committed after them (see the handoff message for the docs commit).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Medium / High → independent architecture review selected; ARCH-REV-002 `Pass`.
- Requirements doc: `requirements-doc.md` (SR-002, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001, SR-002)
- Design spec (required on every route): `design-spec.md` (SR-002, Ready)
- Supplemental task artifacts: None (the evidence folder `/Users/normy/autobyteus_org/unclean-shutdown-evidence/` was not opened or used, per TESTING.md)
- Design review report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

In short:

- One byte-level JSONL line rule in `autobyteus-ts` decides what a complete record and a damaged end are. The store cuts a damaged end exactly when it opens a log for use and before the first append to each file, and logs it.
- The store's whole-file rewrites are synced to disk before they replace the old file.
- The server's restore check uses the same rule read-only. Every refusal says which Agent/Team and member are affected, what is wrong and what the user can do.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - The implementation stayed inside the designed owners: 2 new + 3 modified files in `autobyteus-ts/src/memory/store`, and 1 new + 5 modified server files.
  - It changes the read/repair/append behavior of the persistence layer every runtime writes through, and it cuts bytes from users' files. That is the designed High risk.
  - No contract, format, migration, security or concurrency change was added.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large/High route; I still reviewed my own diff)
- New design impact or escalation trigger: `None`. None of the escalation triggers fired:
  - No reader depends on the old strict behavior. Two test fixtures used an out-of-contract inspector value; see Known Risks.
  - No format change or startup scan.
  - Every memory append still goes through `RunMemoryFileStore`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Damaged end ignored by the restore check; classify from complete records; `none` only when fully readable | `AgentConversationActivityInspector.inspect` → `readConversationRecords` → `readJsonlRecords` (`autobyteus-ts/src/memory/store/jsonl-log-file.ts`); never writes | Done. AC-001/AC-002 unit tests (IMP-06). Archive segments are read with the same rule, without cutting (sealed files). |
| BEH-002 | Byte-exact cut, logged, at open-for-use | `RunMemoryFileStore.readMemoryDicts` → `repairJsonlDamagedEnd` (`fs.truncateSync(completeByteLength)` on `Buffer` offsets; `console.warn('Removed the damaged end of a memory log.', { filePath, bytesRemoved, recordsKept })`, no content) | Done. AC-003 (IMP-02). Intact files are not touched and log nothing. |
| BEH-003 | An append never joins a damaged end | `RunMemoryFileStore.appendJsonlRecord` (used by `add` and `recordSystemInstructionSupply`): first append per file path per instance → `jsonlLogEndsCleanly` (≤ 64 KiB tail read) → if not proven clean, `repairJsonlDamagedEnd`; path added to `verifiedEndPaths` only after success | Done. AC-004 store tests and `ExternalRuntimeMemoryWriter` tests (IMP-02, IMP-06). Mid-file damage blocks the append, leaves the file unchanged, and is checked again on the next attempt. |
| BEH-004 | Refusal names the Agent/Team, member, reason in plain words, next step; code unchanged | `taskExecutionConversationUnavailable` (`autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-conversation-availability.ts`), called by the three adapters' `assertRestorableChain` via `ingressMember` (address + run id). The planner's `COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE` message carries the reason. Inspector reasons follow the design's "Refusal reasons" table | Done. AC-006 over the real Team, AgentOrg and standalone adapters (IMP-06). |
| BEH-005 | Whole-file replacements on disk before rename | `replaceFileDurably` (`durable-file-replace.ts`): tmp write → `fsyncSync` → `renameSync` → folder `fsyncSync` (EPERM/EISDIR/EINVAL from the folder sync are ignored). Used for the active-log rewrite, archive segment, manifest, and both snapshot writers | Done. AC-007 (IMP-02). |
| BEH-006 | Message logs and package JSON unchanged | Not touched | Preserved. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The display readers (FU-002), per-append sync (FU-001), message logs and the user's real data (DEC-008) were not touched.

## Key Files Or Areas

`autobyteus-ts/src/memory/store/`:

- `jsonl-log-file.ts` (Add): the line rule.
  - `readJsonlRecords`, `repairJsonlDamagedEnd`, `jsonlLogEndsCleanly`, `serializeJsonlRecords`, `JsonlLogDamagedError` (message ``line ${n} of ${basename} is damaged``).
- `durable-file-replace.ts` (Add): `replaceFileDurably`.
- `run-memory-file-store.ts` (Modify):
  - Removed the private `readJsonl`, `writeJsonl` and `writeJson`.
  - Added `verifiedEndPaths`, `appendJsonlRecord` and `writeActiveRawTraces`.
- `raw-trace-archive-manager.ts` (Modify):
  - Removed the strict `readJsonl` and the duplicate writers.
  - Segments are now read with `readJsonlRecords`.
  - Segments and the manifest are written with `replaceFileDurably`.
- `working-context-snapshot-store.ts` (Modify): writes with `replaceFileDurably`.

`autobyteus-server-ts/src/`:

- `agent-memory/services/agent-conversation-activity-inspector.ts` (Modify):
  - Removed `readJsonlStrict`.
  - Every `indeterminate` cause now has a plain-words reason, per the design's table.
  - Validation order and decisions are unchanged.
- `agent-collaboration/execution/task/task-execution-conversation-availability.ts` (Add): the refusal and the `logger.warn("TASK_EXECUTION_CONVERSATION_UNAVAILABLE", …)` call.
- The three adapters (Modify): `agent-team-execution/task-delegation/team-task-execution-adapter.ts`, `agent-org-execution/services/agent-org-task-execution-adapter.ts`, `standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts`.
  - `ingressAgentRunId` → `ingressMember`.
  - The duplicated refusal text is removed.
- `agent-collaboration/execution/backends/configured-agent-activation-planner.ts` (Modify):
  - One `unreadableConversationState(reason)` builds all three refusals.
  - The missing-`memoryDir` reason is now "its memory folder is unknown".

Tests (synthesized data only):

- New in `autobyteus-ts`:
  - `tests/unit/memory/jsonl-log-file.test.ts` (26).
  - `tests/unit/memory/durable-file-replace.test.ts` (3).
  - `tests/unit/memory/run-memory-file-store-damaged-end.test.ts` (11).
- New in the server: `tests/unit/agent-collaboration/task-execution-conversation-availability.test.ts` (12).
- Extended in the server:
  - `tests/unit/agent-memory/agent-conversation-activity-inspector.test.ts`.
  - `tests/unit/agent-memory/external-runtime-memory-writer.test.ts`.
  - `tests/unit/agent-collaboration/configured-agent-activation-planner.test.ts`.
- Fixture corrections: `tests/unit/agent-org-execution/agent-org-task-idle-shutdown.test.ts` and `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` now return `{ kind: "none" }` instead of the out-of-contract `"absent"`.
- E2E assertion updated to the new `none` wording: `tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` (EXC-E2E-007). Not run here.

## Important Assumptions

- **Append end check refined beyond the design's Guidance.**
  - The Guidance said "`statSync` size 0 or last byte `0x0A` → append; otherwise repair". A last-byte check alone misses a torn or interior-zero last record whose `\n` did land, e.g. `{…}\n{"id":"b","tr\n` (the design's own "Damaged end with newline" example).
  - Appending after such a line would turn the damaged end into mid-file damage, making the run unrestorable (REQ-001/REQ-004).
  - `jsonlLogEndsCleanly` therefore reads at most the last 64 KiB and checks, with the same line rule, that the last non-empty line is a complete, newline-terminated record.
  - Anything it cannot prove clean, such as a last record longer than 64 KiB, falls back to `repairJsonlDamagedEnd`. That full read is the same cost as today's read-for-use, once per file per store instance.
  - Still at most one check per file path per instance; no per-append fsync (QR-001). DEC-003 left the exact shape to design detail.
- **A read for use also marks the path as verified.** After a successful `repairJsonlDamagedEnd`, the file ends cleanly, so `recordSystemInstructionSupply`, which reads first, needs no second check.
- **The refusal keeps the original error.** It uses `activity.error.message` verbatim inside "cannot be read (…)". The original error is attached as `cause` on both the inspector error and the `TaskDelegationError`, and the warning logs it.
  - The only parse error text that can reach the log is a manifest `SyntaxError`. That is index metadata, never conversation content.
- **Wording.** The design examples are followed. "restore that file from a backup" became "restore its saved conversation from a backup", because some reasons (for example "its memory folder is unknown") do not name a file.
  - Team `none` names the coordinator: "its coordinator '<addr>' has no saved conversation to continue."

## Known Risks

- RSK-001 (shared foundation): mitigated by the full `autobyteus-ts` unit run, the store-related `autobyteus-ts` integration tests, and the full server unit and integration runs (IMP-03, 04, 07, 08).
- **Fixture contract.** Two existing test fixtures fed the inspector `{ kind: "absent" }` (cast with `as never`). The old adapter only printed `activity.kind`, so that worked. The refusal function relies on the typed contract (`none | present | indeterminate`). No production inspector returns another kind.
- **Text changes.** The refusal and planner texts change: user-visible error-card text, and one E2E regex (updated, not run here). The error codes are unchanged.
- **Sealed archive segments.** One with a damaged end is read tolerantly and never cut, as designed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix.
- Reviewed root-cause classification: Duplicated Policy Or Coordination, plus a Local Implementation Defect (cut position) and a Missing Invariant (append onto damage).
- Reviewed refactor decision: `Refactor Needed Now` (bounded).
- Implementation matched the reviewed assessment: `Yes`. One line rule replaces three readers, one durable writer replaces three, and one refusal function replaces three copies.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: removal plan rows 1–5 done; row 6 (display readers) is FU-002, as designed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. The private readers and writers and the triplicated refusal text are gone. The inspector's legacy-manifest probe and `getOldArchiveManifestPath` stay: they read data written by older versions (architecture review confirmed).
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`. `JsonlLogReadResult` has 4 single-meaning fields; `ingressMember` is `{ address, agentRunId }`.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`. Largest is `agent-org-task-execution-adapter.ts` at 394 effective lines; the largest source delta is `agent-conversation-activity-inspector.ts` at +61/−36.
- Notes: the server imports only `readJsonlRecords` and `JsonlLogDamagedError` from `jsonl-log-file.js`, never `repairJsonlDamagedEnd`, as the Dependency Rules require.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` → "Persisted Data / State Transition Decision".
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`. The format is unchanged and there is no startup scan; repair is lazy, per file, on use.
- Direct-use evidence: the existing store and archive tests read store-written files unchanged (IMP-02, IMP-03), and the full server suites pass (IMP-07, IMP-08).
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- macOS 26.5.2, Node v22.23.1, pnpm per the evidence headers.
- `pnpm -C autobyteus-server-ts prebuild` (Prisma client) and `test:integration:prepare` were run once. Both write untracked build outputs (`*/dist/`, `applications/brief-studio/dist/`), which are not committed.
- No real user data, Docker nodes, volumes or `~/.autobyteus` were used. The user's node was not touched.

## Checks Run

Evidence files are in `tickets/in-progress/unclean-shutdown-delegated-run-restore/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` | `a9b5230505` | macOS, Node 22 | `autobyteus-ts/src` | — | Pass | `IMP-01-ts-typecheck.log` | `tsc exit=0` |
| IMP-02 | `pnpm -C autobyteus-ts exec vitest run` on the 3 new store test files plus `run-memory-file-store`, `raw-trace-archive-manager`, `working-context-snapshot-store` tests | `a9b5230505` | same | `jsonl-log-file.ts`, `durable-file-replace.ts`, the 3 store files | REQ-001, REQ-003, REQ-004, REQ-006; AC-003, AC-004, AC-007 | Pass | `IMP-02-ts-store-focused.log` | `Tests  53 passed (53)` |
| IMP-03 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | `a9b5230505` (`autobyteus-ts` unchanged since) | same | all of `autobyteus-ts` | RSK-001, AC-008 | Pass | `IMP-03-ts-unit-excerpt.log`, `IMP-03-ts-unit-full.log.gz` | `Tests  2087 passed (2087)` |
| IMP-04 | `env -i PATH HOME=<temp> TMPDIR … vitest run` `tests/integration/agent/working-context-snapshot-restore-flow.test.ts` and `incomplete-tool-call-resume-recovery.test.ts` | `a9b5230505` | clean env | store through native restore flows | RSK-001 | Pass | `IMP-04-ts-integration-store.log` | `Tests  2 passed (2)` |
| IMP-05 | `pnpm -C autobyteus-server-ts typecheck` (builds shared packages first) | `b166e0db70` | same | server `src` | AC-008 | Pass | `IMP-05-server-typecheck.log` | `typecheck exit=0` |
| IMP-06 | `vitest run` inspector, refusal/adapters, planner, `ExternalRuntimeMemoryWriter`, Org idle-shutdown tests | `b166e0db70` | same | inspector, refusal function, 3 adapters, planner, writer → store | REQ-001, REQ-002, REQ-004, REQ-005; AC-001, AC-002, AC-004, AC-006 | Pass | `IMP-06-server-focused.log` | `Tests  48 passed (48)` |
| IMP-07 | `pnpm -C autobyteus-server-ts test:unit` (clean run, nothing else running) | `b166e0db70` | same | whole server unit suite | AC-008, RSK-001 | Pass | `IMP-07-server-unit-excerpt.log`, `IMP-07-server-unit-full.log.gz` | `Tests  6106 passed \| 7 skipped (6113)` |
| IMP-08 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | content equal to `a9b5230505` (`b166e0db70` changes one unit test only) | same | whole server integration suite | AC-008, RSK-001 | Pass | `IMP-08-server-integration-excerpt.log`, `IMP-08-server-integration-full.log.gz` | `Tests  419 passed \| 70 skipped (489)` |
| IMP-09 | `vitest run tests/architecture` (not part of the kept-green suites) | content equal to `a9b5230505` | same | architecture guards | — | Fail (unrelated, already on the base) | `IMP-09-server-architecture.log` | `Tests  1 failed \| 43 passed (44)`; cause line at the end of the file |

Earlier full server unit runs, not used as evidence:

- First run: 1 failure. The Org idle-shutdown fixture returned `"absent"`; the fixture was fixed and is in IMP-06.
- Second run: 1 failure, `agent-package-folder-watcher.test.ts` timing out at 5005 ms. Its `waitFor` budget equals the default 5 s test timeout, and my concurrent `autobyteus-ts` checks loaded the machine. Alone it passes 3/3. Baseline fix commit `b166e0db70` (Rule 9).

- Not run, and why:
  - AC-005, the server integration/E2E restore on a test-owned data root with a scripted runtime (design step 5): API/E2E-owned executable coverage under the implementation-engineer skill.
  - Server E2E EXC-E2E-007: assertion text updated, not run (API/E2E).
  - Web, Electron and other packages: unaffected. Only a server error message changes; it is shown in the existing error card.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. Backend-only: the server's refusal text changes and is shown in the existing error card (requirements: UI `No`).

## Downstream Coverage Hints / Suggested Scenarios

- **AC-005, the user's journey.** On an isolated server and data root with the scripted AGY CLI (`autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`) or a native fake runtime:
  1. Delegate a Team and let its coordinator work.
  2. Shut the Team down (idle or DONE).
  3. Append 1,241 zero bytes to the coordinator's `raw_traces_active.jsonl`.
  4. Restart the server and send "continue".
  - Expect: accepted, the member answers, the log holds the earlier records plus the new turn and no `0x00`, and the server log has "Removed the damaged end of a memory log." with the file and `bytesRemoved: 1241`.
  - Variant: a torn last record (`{"id":"x","trace_type":"tool_res`), with and without `\n`.
- **AC-006 end to end.** The same setup, but with a damaged line before the last record, e.g. `{broken` followed by a valid line.
  - Expect a refusal with `TASK_EXECUTION_CONTEXT_UNAVAILABLE` naming '/<team>', its coordinator, "line N of raw_traces_active.jsonl is damaged" and "Start a new delegation for this work…", and the file left byte for byte unchanged.
- **EXC-E2E-007** (updated regex): a copy whose memory folder was removed is refused with "…cannot be restored: it has no saved conversation to continue. Start a new delegation…".
- **Native runtime restore with a damaged end.** `MemoryManager` → `FileMemoryStore.add` appends without a prior read; IMP-02 covers this at store level.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-005 (not run here).
- An E2E check of AC-006 through the real HTTP/GraphQL boundary, if API/E2E judges it useful.
- EXC-E2E-007 rerun with the updated wording.
- Rerun scope per TESTING.md: `autobyteus-ts` changed (a shared foundation), so mark everything Rerun. IMP-03, IMP-07 and IMP-08 can be reused for the code they ran on.

## Follow-Ups (not this ticket)

- **FU-IMP-001** (architecture guard; owner: whoever owns the SR-011 definition-getter guard). `tests/architecture/application-framework-boundaries.test.ts` "guards the exact SR-011 host definition and public/general run authority" fails on base `f171032e88`.
  - Cause: `src/agent-memory/services/agent-memory-explorer-service.ts:53` calls `AgentDefinitionService.getInstance(`. It was added by `3e3a7b08cc` ("Memory page shows a task-agent group's definition name"), and the guard's allowlist was not updated.
  - Deciding whether the call or the allowlist is wrong belongs to that guard's owner. Evidence: `IMP-09-server-architecture.log`.
- FU-001 and FU-002 are unchanged (from the design).
