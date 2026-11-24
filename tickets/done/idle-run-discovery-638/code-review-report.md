# Code Review Report — autobyteus-638 A restart keeps a person's runs running

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: [requirements-doc.md](requirements-doc.md) (Approved, SR-002)
- Investigation Notes Reviewed As Context: [investigation-notes.md](investigation-notes.md)
- Solution Revision Record Reviewed As Context: [solution-revision-record.md](solution-revision-record.md)
- Design Spec Reviewed As Context: [design-spec.md](design-spec.md) (Ready, SR-003), including its Data Contract (C-1, C-2) and walks 1-9 with 4b
- Supplemental Task Artifacts Reviewed As Context: [follow-ups.md](follow-ups.md) (FU-001), `evidence/IMP-01…IMP-08`
- Relevant Solution Revision IDs: SR-002, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 → SR-003; the reviewer's round-2 edits, uncommitted, not committed by me)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (same)
- Relevant Architecture Review Revision IDs: ARCH-REV-001 (AR-001 restore window, AR-002 first write, R-1…R-3), ARCH-REV-002
- Implementation Handoff Reviewed As Context: [implementation-handoff.md](implementation-handoff.md)
- Implementation Revision Record Reviewed As Context: [implementation-revision-record.md](implementation-revision-record.md)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: `/implementation_engineer`, implementation complete, IR-001, `Medium`/`High` (confirmed)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin / delivery fields: N/A

Reviewed commits: `ae1e36cded` (implementation), `dc5605c1bd` (handoff, evidence), on base `affa990598`.

## Routing Classification Review

- Task size: `Medium`; architectural risk: `High` (startup and shutdown lifecycle on every node, a new persisted transient record, a runtime process per restored run, concurrency with the update wake and first input)
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None

## Review Scope

- Changed implementation and behavior reviewed: the C-1 record (`running-run-record.ts`); `RunningRunRecorder` (DS-001); `RunningRunRestorer` (DS-002); `concurrency-limiter.ts` and its one use in `restart-resumer.ts`; C-2 `RootTeamRun.ensureAgentReady` → `TeamRun` → `TeamRunBackend`/`FlatTeamRunBackend` → `FlatTeamExecutionManager.ensureDirectAgentReady`; composition (`restart-resume-composition.ts`, `build-studio-server.ts`) and startup/shutdown order (`server-runtime.ts`); docs `restart_resume.md`, `collaboration_model.md` §1.
- Read for context: `RunningAgents.rootOf/statusesOf/liveRoots/teamCoordinatorOf` (offline filtered; decided from each root's own statuses), `RunOwnAgentsReader.listingFactsOf` (`startedByPerson = !delegatedFrom && !containedIn`, for `agent` and `agent_team`), `RestartResumer.resumeAfterRestart` (catches its own errors, returns a report).
- Tests reviewed: `running-run-record`, `running-run-recorder`, `running-run-restorer` (incl. the AR-001 stop/crash window), `team-root-ensure-agent-ready`, `team-run`, the server-runtime order test, and the built-server E2E `running-runs-built-server.e2e.test.ts`.
- Reviewer's own check: `vitest run tests/unit/restart-resume tests/unit/agent-team-execution` at `dc5605c1bd`: 52 files, 295 tests passed.
- Explicit exclusions: external runtimes and Docker across a real restart (API/E2E's).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: after any restart, each Agent or Team run a person started that was running at the stop is running again, idle, with no input (REQ-001/002, DEC-003 (1), DEC-005). Retired, delegated and Org runs stay down (REQ-003). Failures are isolated and logged (REQ-004). Reminders and the update wake are unchanged (REQ-005). A run unloaded before the stop stays unloaded (AC-006).
- Design-spec behavior map verified against the implementation: yes. DS-001 and DS-002 run through the named owners. The restorer's per-run code is the design's "good shape" plus the after-restore history read (walk 6) and a coordinator "already running" check.
- Design review report and round confirmed: ARCH-REV-001 findings taken into SR-003. Each is implemented and tested:
  - AR-001: `running ∪ pending`, with `take()` never removing the file;
  - AR-002: `written` starts as null;
  - R-1: the 1 s budget, with a log line;
  - R-2: an `error` entry agent is recorded;
  - R-3: Org roots are skipped.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Record: `RunningRunRecorder.tick` every 2 s → `liveEntryRoots` (Orgs out; entry agent non-offline) → `startedByPerson` once per root → `∪ restorer.pending()` → write when the sorted set changed, remove when empty. `record()` at cleanup runs before `app.close()`. Restore: `take()` before both recorders start → `resumeAfterRestart(...).then(() => restore())` → per run, at most 3: history `present` → `startedByPerson` → not live → `resolveOrRestore` → history again → `ensureAgentReady()` / `ensureAgentReady(coordinator)`. E2E RUN-01/RUN-02: "2 brought back, 0 skipped, 0 failed", no model call, both listed and messaged | — |
| BEH-002 | Confirmed | `list_running_agents`/`send_message_to` untouched; they see the restored runs because those runs are live (E2E) | — |
| BEH-003 | Confirmed | Delegated runs and Org units are never recorded (`startedByPerson` false; `agent_org` skipped by the recorder and refused by the reader); the restorer re-checks `startedByPerson` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001/002, C-1 | Operational | Node update / Restart server / docker stop-start | The person's running runs keep running | Graceful stop → start | Normal | DS-001 final write → DS-002 | Runs idle again, listed, messageable | Requirements SCN-001 (the docker-8001 incident); E2E RUN-01 | Supported Normal Scenario | Use |
| SCN-002 | BEH-001, REQ-001 | Operational | Crash / kill | Same | SIGKILL → start | Normal | Last 2 s write → DS-002 | Same (≤ 2 s lost) | Requirements SCN-002; E2E RUN-02 | Supported Normal Scenario | Use |
| SCN-003 | REQ-003 | Operational | Person archives or stops a run | Retired runs stay retired | Stop/Archive before or during restore | Normal | Not live → not recorded; restorer history before/after → skip | Not brought back | Requirements SCN-003; unit "skips…", "archived during its restore"; E2E stopped run | Supported Normal Scenario | Use |
| W-4b | AR-001, C-1 lifecycle | Operational | Stop or crash during the restore window | Unhandled runs come back next time | Stop while `restore()` runs | Explicit Edge | `record()` writes `running ∪ pending` | Unhandled runs stay recorded | Design walk 4b (ARCH-REV-001); unit "stop or crash during the restore window" | Supported Explicit Edge Scenario | Use |
| W-4/5 | REQ-005 | System | Update wake / plain restart with a busy run | Reminder exactly once, unchanged | Start after update / plain restart | Normal | Resumer first; restorer skips a run already live, or restores idle without posting | Reminder unchanged | Design walks 4, 5; restorer unit "already running"; IMP-06 RR-01…RR-06, RR-12 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | A run that fails to come back leaves `pending`, so it is dropped from the record and not retried at the next start | REQ-004, C-1 lifecycle | A runtime unavailable at startup | The person must open or message it | Design C-1 lifecycle; `restart_resume.md` "a failed run is not tried again at the next start" | Reject | — | Approved design decision, documented; not a defect |
| C-02 | RR-10 of the restart-reminder E2E fails (FU-001): is it this ticket's work? | AC-005 verification; ticket-scope | Running the existing suite | Shown order of reminder vs input differs from RR-10's expectation | IMP-06 and IMP-08: the same diff on the base build `c1147c8917`. The order comes from autobyteus-628 D-2 (`orderPrefaceNoticesAfterTheirInput`, `1c6f493625`), a deliberate change | Reject as a finding; FU-001 confirmed | Follow-up | Three-question check: (1) not introduced by this change (red on the base); (2) the reminder projection is not functionality this ticket changes, and the preserved behavior (REQ-005: reminder exactly once, with the input) holds; only a test expectation predates 628; (3) the file is not edited by this ticket. Ticket-scope: "everything the ticket delivers works without it" → follow-up. AC-005 is evidenced by RR-01…RR-06, RR-12 and the restorer's skip test |
| C-03 | `root-team-run.ts` is at 495 non-empty lines (481 → 495) | Size rule | Future growth | Next change would pass 500 | Measured | Reject | — | Under the limit; recorded as a residual |
| C-04 | A second `RunOwnAgentsReader` instance is built in `build-studio-server.ts` | P13/P16 | — | None (stateless file reader) | Six existing call sites build their own instance | Reject | — | Established pattern; no shared state |
| C-05 | A Team restored but archived during its restore is left registered without its coordinator made ready | Walk 6 | Person archives during restore | The person's archive path ends it | Design walk 6: "the person's action wins through its own path" | Reject | — | Approved design |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Feature, no refactor; only the allowed verbatim limiter extraction | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None behavior-defining; C-1/C-2 matched | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001/DS-002 as designed; startup order exactly the design's | — |
| Ownership boundary preservation and clarity | Pass | The recorder is the only writer (the restorer never writes or removes); the restorer owns `pending`, and the recorder only asks it; `rootHistory` is one function passed to both | — |
| Off-spine concern clarity | Pass | Logging lines as designed; the limiter is shared | — |
| Existing capability/subsystem reuse check | Pass | `resolveOrRestore`, `ensureAgentReady`, `RunningAgents`, `listingFactsOf`, `atomicWriteJsonFile`, `rootHistory` reused; `busy-runs.json` untouched (P15) | — |
| Reusable owned structures check | Pass | `createConcurrencyLimiter` extracted verbatim (diff identical but for the name) and used by both | — |
| Shared-structure/data-model tightness check | Pass | Record holds only root identities; no field without a reader (P17) | — |
| Repeated coordination ownership check | Pass | One `rootHistory`, one limiter | — |
| Empty indirection check | Pass | `TeamRun`/backend one-liners follow the existing per-command chain (`executeDirectAgentCommand`), each layer the established owner | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Record / recorder / restorer split as in the ownership map | — |
| Ownership-driven dependency check | Pass | `restart-resume` → `agent-collaboration/running`, `run-history/store`, the resolver; the Team method doesn't depend on restart-resume | — |
| Visible dependencies check (P16) | Pass | All new dependencies are constructor inputs; the composition builds the restorer first, then the recorder with it | — |
| Authoritative Boundary Rule check | Pass | The restorer calls the root (`RootTeamRun.ensureAgentReady`), never the manager or handle; the method runs in the root's materialization gate with `assertAdmitting` and the member check | — |
| File placement check | Pass | `src/restart-resume/` | — |
| Flat-vs-over-split layout judgment | Pass | Three small files plus the limiter | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `take`/`pending`/`restore`, `startSession`/`record`, `ensureAgentReady(agentRunId)` | — |
| Naming quality and naming-to-responsibility alignment (P15) | Pass | "running run" kept distinct from "busy run"; the record's name says what it holds | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | The limiter was extracted rather than copied | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules (P7) | Pass | `createPostLimiter` moved, not left behind | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Every skip, failure isolation, concurrency ≤ 3, pending shrinking, AR-001/AR-002/R-1/R-2/R-3 each named and asserted. The E2E asserts the record's content, the summary line, no model call (scripted model call counts unchanged), listing and delivery, and that the stopped run stays down | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Fakes per owner; E2E reuses the built-server launch and WebSocket helpers | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | — | — |
| API/E2E readiness for the next workflow stage | Pass | Whole unit (9077) and integration (523) suites, typecheck at baseline, built-server E2E 2/2, shutdown/Team E2Es; FU-001 explained with base evidence | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `restart-resume/running-run-record.ts` (new) | 0 | 57 | Pass | +57 | Pass | Pass | — | — |
| `restart-resume/running-run-recorder.ts` (new) | 0 | 142 | Pass | +142 | Pass | Pass | — | — |
| `restart-resume/running-run-restorer.ts` (new) | 0 | 94 | Pass | +94 | Pass | Pass | — | — |
| `restart-resume/concurrency-limiter.ts` (new) | 0 | 14 | Pass | +14 | Pass | Pass | — | — |
| `restart-resume/restart-resumer.ts` | 215 | 205 | Pass | −10 | Pass | Pass | — | — |
| `agent-team-execution/domain/root-team-run.ts` | 481 | 495 | Pass (near the limit) | +14 | Pass | Pass | — | Residual: the next change here must not grow it past 500 |
| `agent-team-execution/local/flat-team-execution-manager.ts` | 344 | 352 | Pass | +8 | Pass | Pass | — | — |
| `compositions/build-studio-server.ts` | 462 | 464 | Pass | +2 | Pass | Pass | — | — |
| `compositions/restart-resume-composition.ts` | 51 | 69 | Pass | +18 | Pass | Pass | — | — |
| `server-runtime.ts` | 237 | 249 | Pass | +12 | Pass | Pass | — | — |

`team-run.ts`, `team-run-backend.ts`, `flat-team-run-backend.ts`: +1 to +3 lines each.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No version field, no old-file branch |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules (P7) | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | New transient file only; an invalid file is logged and replaced by the first write (AR-002) |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Data Contract Check (Principle 17)

- C-1: `{ runs: [{ rootSubjectKind: "agent" | "agent_team", rootRunId }] }`, nothing else. The reader is all-or-nothing: `missing`, `invalid` (logged, nothing taken) or `present`. Any `agent_org` or malformed entry makes the whole file invalid. Writes are sorted and deduplicated by `rootExecutionIdentityKey`, so the recorder's `JSON.stringify` comparison is set equality. The writer is the recorder only; the reader is the restorer only (`take()` never removes the file). The lifecycle matches walks 1-9 and 4b, and AR-002's first write reconciles a stale file.
- C-2: `RootTeamRun.ensureAgentReady(agentRunId): Promise<AgentRun>` runs in the materialization gate, after `assertAdmitting`. An unknown member gives `RUN_NOT_FOUND` (`CollaborationMemberNotFoundError`); an existing member gives the handle's `getOrCreateAgentRun()`, so nothing is posted. Unit tests show that only that member starts and that a second call returns the live run.
- Verdict: the layers above use the contract as is, with no mapping or recomputed fact. The Team's coordinator is read from the live root after the restore, as designed (not stored).

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: a new startup/shutdown step, a new record file, and a change to what "running agent" means across a restart.
- Files: `restart_resume.md` (new section "Running runs come back", the startup order and the file list) and `collaboration_model.md` §1. Both are updated and accurate against the code: the order, the record shape, the skip/fail wording, the tests and the gate. No stale lines found.

## Additional Material Premise Validation

None new or reclassified. ARCH-REV-001 AR-001, AR-002 and R-1…R-3: `Confirmed`, as implemented and tested.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | DS-001/DS-002 and the startup order are exactly as designed and documented | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One writer, one reader, the pending set owned by the restorer, Team readiness through the root's gate | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Small explicit methods; `restore()` returns a report and never throws | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Record/recorder/restorer split | `root-team-run.ts` near 500 | Keep it from growing |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.6 | Record holds only identities; limiter shared | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | "running run" vs "busy run" kept distinct; the log texts name the run and the reason | — | — |
| 7 | API/E2E Readiness | 9.3 | Full unit and integration suites, built-server E2E across SIGTERM and SIGKILL | External runtimes and Docker not yet run; RR-10 red (FU-001, pre-existing) | API/E2E covers external runtimes and Docker |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Every skip, failure, concurrency and window case tested; no model call proven end to end | A run that fails is not retried at the next start (accepted design) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | — | — | — |
| 10 | Cleanup Completeness | 9.5 | Docs complete; limiter moved, not copied | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. I checked FU-001, recorded by implementation, against ticket-scope and the three questions (candidate C-02). It is correctly a follow-up: it is pre-existing on the base, comes from autobyteus-628's deliberate projection change, is in a file this ticket does not edit, and the preserved behavior holds.

## Classification

N/A (Pass).

## Recommended Recipient

- `/api_e2e_engineer` (pass), with an informational notice to `/implementation_engineer`.

## Residual Risks

- External runtimes (Claude, Antigravity, Codex) and a Docker node across a real restart have not been run yet. They take the same `resolveOrRestore` path that production restart resume uses.
- Startup load: each restored run is a runtime process (≈270–330 MB), at most 3 at a time, and it is the same set that was running before.
- A run that fails to come back is dropped from the record (documented); its person brings it back by opening or messaging it.
- `root-team-run.ts` is at 495 of 500 non-empty lines.
- RR-10 stays red until FU-001 is done (gated suite, pre-existing).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 / 10; every category ≥ 9.2 (lowest: API/E2E Readiness 9.3)
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes: AC-005 is evidenced by RR-01…RR-06, RR-12 and the restorer's skip test. RR-10 is FU-001, pre-existing on the base.
