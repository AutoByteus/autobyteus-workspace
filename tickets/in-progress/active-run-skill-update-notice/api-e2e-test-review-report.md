# API/E2E Test Review Report — `active-run-skill-update-notice`

## Review Meta

- Review Round: 2
- Trigger: API/E2E validation **Pass** (API-REV-003, round 3, DR-001 re-entry after CRR-006) from `/software_engineering_team/api_e2e_engineer`. Reviewed: API/E2E `06c4a62f1` (live restore and delete case) and the IR-004 (`f977849b2`) test changes. Round 1 (CRR-005) covered `c9e100778` and the IR-001…IR-003 tests
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `follow-up-tasks.md`; API/E2E probes in `api-e2e-evidence/` (evidence only)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001…IR-004)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/code-review-report.md` (CRR-004, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Coverage Investigation: `api-e2e-coverage-investigation.md` (incl. § Round 2 Delta)
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001…API-REV-003); delivery records (DR-001) as context
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` (API-REV-003); DR-001 verified live (Codex, Claude) and on desktop (AutoByteus)
- Final Validation Confidence: 96% (reported)
- Prior unresolved test-review findings rechecked: None (round 1 had no findings)
- Project testing guideline(s) applied: root `TESTING.md`, as recorded by the coverage investigation:
  - Rules 1–6 (isolated instances, never the user's configs or data, assertions first);
  - the gated scripted-AGY pattern;
  - `env -u AUTOBYTEUS_*` machine-independent runs.

  No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. Tests reproduce SCN-001…SCN-006, AC-001…AC-010 and the CR fixes; none establishes a scenario by itself.

## Round 2 Scope And Checks (API-REV-003; DR-001)

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/skill-update-notice-live.e2e.test.ts` | Updated (`06c4a62f1`): new `it.each` case "a stopped run continued after a change gets one notice; a deleted run's memory stays deleted", plus the `findRunMemoryDir` helper | AC-003/REQ-006 (stopped → change → continue), DR-001 (no folder creation, no write after release or delete), QR-003 (no wake) | Live runtimes, same gated suite | Real triggers: first turn, `terminateAgentRun`, skill edit on disk, continue by message, `deleteStoredRun`. Asserts the record appears after the runtime creates the folder (within the retry schedule), no notice while stopped, exactly one notice with the `SKILL.md` path and the new codeword, and that the deleted folder stays absent 22 s past the longest pre-steady-state retry |
| `tests/integration/skill-update-notices/skill-update-notice-service.integration.test.ts` | Updated (IR-004): 3 DR-001 cases; fakes create run memory folders as the platform does; gated service accepts injected retry delays; `tracker.close()` awaited in teardown | DR-001; CR-001 cases updated | Notice service lifecycle | Cases: released and deleted mid-scan (folder not re-created); late folder (written by retry, then released and deleted → stays deleted); close waits and writes nothing afterwards (no `.tmp`, a clean `rm` without `ENOTEMPTY`) |
| `tests/unit/skill-update-notices/skill-update-notice-parts.test.ts` | Updated (IR-004): 2 store cases | DR-001 store rule | Store | `folder_missing` creates nothing; `aborted` mid-write leaves no file |

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | DR-001 and AC IDs in names; comments state the real-world step (for example "the run is deleted", "the runtime writes its first trace") |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Observable outcomes: notice counts, codewords, folder existence and absence, the record file named in the design's persisted-data contract, no temp files. See TN-1 |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `createGatedService` extended with an option; `fakeRun` helper; live case reuses the suite's `gql`, `pickModel` and frame helpers |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Injected retry delays (`[20]`) in integration; awaited `tracker.close()` in teardown removes the `ENOTEMPTY` race; my CRR-006 run was 37/37 ×5 and API/E2E's ×5. The live case uses fixed waits (1.5 s, 5 s, 22 s) that are bounded and documented against the retry schedule |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | DR-001 cases sit under the existing lifecycle `describe` |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | See TN-2 (a leftover fake shape, harmless) |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches API-REV-003 (§ Round 3; ledger events 24–32) and IR-004 |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Release then delete, a late runtime folder, and shutdown are real lifecycles (DR-001 evidence) |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Live: real GraphQL and WebSocket triggers. Integration fakes now mirror the platform creating memory folders, which removes a setup real use does not produce |

Round-2 notes (non-blocking, no action required):

- **TN-1:** the store unit case stops the write with a guard that allows exactly two checks (`++checks <= 2`). That couples the case to the store's internal step order. It still proves the contract ("aborted mid-write leaves no file"); a later refactor could assert via a guard that flips after the temp write instead.
- **TN-2:** the gated integration service's watcher fake still returns `add` / `unwatch` members removed from `SkillFolderWatch` in IR-003. It is harmless; drop them in a later cleanup.

## Round 1 — Changed Durable Test Scope (CRR-005, retained)


| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts` | Added (API/E2E `c9e100778`) | AC-007, REQ-002/011 (SUN-E2E-001); AC-003, REQ-006, QR-003 (SUN-E2E-002); AC-005b, REQ-009 (SUN-E2E-003) | Notices across run roots at the real server/wire boundary | Real Team, Org, delegated copy, idle shutdown and GitHub Update (only GitHub HTTP controlled). Asserts the exact provider input via `ECHO_INPUT`: one notice, first, then the message unchanged; no launch caused by a change |
| `autobyteus-server-ts/tests/e2e/runtime/skill-update-notice-live.e2e.test.ts` | Added (IR-001); `grok_build` case (`c9e100778`) | AC-001 (busy, per runtime class), AC-002 idle, R-1 re-read, history | Live runtimes | Gated (`RUN_SKILL_NOTICE_E2E`). Temporary `CODEX_HOME` / `GROK_HOME` holding only an auth symlink; user config folders are never written. Turn expectations follow the runtime class (`APPEND_RUNTIMES`) |
| `autobyteus-server-ts/tests/e2e/runtime/agy-skill-update-notice-transport.e2e.test.ts` | Added (IR-001) | REQ-004 next-turn class, REQ-013, AC-003 | Scripted AGY transport | Busy → next turn; stop keeps the notice pending; idle → combined; stop → change → continue |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated (`interrupt_resend` `HOLD_MS`, IR-001; `ECHO_INPUT`, `c9e100778`) | Supports the above | Scripted actor | Read-only, additive routes; the existing transport suites still pass (reported) |
| `tests/integration/skill-update-notices/skill-update-notice-service.integration.test.ts` | Added (IR-001), updated (IR-002, IR-003) | AC-001…AC-009, R-5, CR-001, CR-002, DS-003 | Notice service with real folders, real `AgentRun` and the real watcher | Named by AC / CR. CR-001 uses a gated snapshotter; CR-002 covers definition edit and delete |
| `tests/integration/skill-update-notices/native-skill-notice-history.integration.test.ts` | Added | BEH-004, SR-004 | Native history replay | Combined and notice-only cases |
| `tests/unit/skill-update-notices/skill-folder-watcher.test.ts` | Added, updated (IR-003) | DEC-005, REQ-010, CR-005/QR-002 | Watcher | A fake factory for settle, cap and per-folder close; a real-chokidar test of descriptor release (macOS) and of reporting in kept and re-watched folders |
| `tests/unit/skill-update-notices/skill-update-notice-parts.test.ts` | Added | REQ-008/009/010, DEC-011 | Snapshotter, diff, builder, store | — |
| `tests/unit/agent-execution/agent-run-input-preface.test.ts` | Added | DS-003, REQ-005, REQ-013, recovery exclusion | `AgentRun` preface dispatch | 8 cases (start, append, not forwarded, failure / undelivered retry, reserved, notice-on-notice, port failure, recovery) |
| `agent-run-manager.test.ts`, `agent-run-resource-manager.test.ts` (one case each), `runtime-memory-system-task-notification.test.ts` (2 cases), `standalone-application-host-lifecycle.test.ts` (expectation) | Updated | DS-001 lifecycle; BEH-004 history | Existing suites | Focused additions |
| `autobyteus-ts/tests/unit/agent/platform-input-preface-memory.test.ts` | Added | SR-004, N-1 | Native memory | Includes the untagged-unchanged case |
| `autobyteus-web/components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` | Updated | REQ-007 label | Web segment | — |

- No durable test file changed: `No`
- Removed tests: none

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case names carry AC/REQ/CR/SUN IDs; E2E headers document gates, isolation and run time |
| Assertions prove approved requirements instead of incidental implementation details | Pass | They assert observable outcomes: provider input content and order, notice counts, launches (no wake), history projections, the closed watches or released descriptors, and the turn class per runtime |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared E2E helpers (`startStudioE2eRuntimeServer`, `until`, `sendE2eSendMessageCommand`, `flattenE2eConfiguredAgentExecutions`); integration "world" builders; fixture routes are additive |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Temp app-data, `CODEX_HOME` and `GROK_HOME`; env stubs; gated suites; injectable settle constants and a gated snapshotter; platform-conditional descriptor assertions. SUN-E2E-002 waits through a real 60 s idle grace, which is slow but realistic and documented |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The integration file is organized under three `describe`s; the roots E2E is one surface (run roots) |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Gated skips follow the documented sibling patterns |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches API-REV-001/002 (SUN-E2E-001…003, live runtimes, APE-001 rerun) and IR-001…IR-003 |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case maps to an approved scenario or AC; `ECHO_INPUT` only reports what the provider received |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Triggers are real: skill file writes on disk, real team/org/delegated copies, real idle shutdown and restore by message, a real GitHub Update flow, and real terminate/release; no hidden state is mutated |

## Findings

None.

Non-blocking notes (no action required):

- On Linux, the watcher unit test asserts closed watches rather than inotify counts. Linux release is proven by the API/E2E container probe (68 → 34 → 0).
- R-1, the test-only `tracker` field, is source rather than test code; it remains an optional cleanup.

## Latest Authoritative Result

- Result: `Pass` (round 2)
- Changed durable test paths reviewed (round 2):
  - `autobyteus-server-ts/tests/e2e/runtime/skill-update-notice-live.e2e.test.ts` (`06c4a62f1`);
  - `autobyteus-server-ts/tests/integration/skill-update-notices/skill-update-notice-service.integration.test.ts` (IR-004);
  - `autobyteus-server-ts/tests/unit/skill-update-notices/skill-update-notice-parts.test.ts` (IR-004).
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - No rerun was needed: my CRR-006 run (37/37 ×5) plus API-REV-003's 5× runs, the scripted E2E 2×, live Codex and Claude 4/4, and the desktop AutoByteus run.
  - Non-blocking TN-1 and TN-2, plus R-1 and C-06 (source/follow-up).
  - Execution note recorded by API/E2E (user, 2026-10-17): Codex budget exhausted; live work continues on Claude and AutoByteus.
