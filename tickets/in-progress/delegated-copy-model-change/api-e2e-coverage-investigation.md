# API/E2E Coverage Investigation — delegated-copy-model-change

## Investigation Meta

- Requirements Doc: `tickets/in-progress/delegated-copy-model-change/requirements-doc.md` (Approved, SR-007)
- Investigation Notes: `tickets/in-progress/delegated-copy-model-change/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/delegated-copy-model-change/solution-revision-record.md`
- Design Spec: `tickets/in-progress/delegated-copy-model-change/design-spec.md` (SR-007, `Ready`; Revision Notes SR-005..SR-007 authoritative over the body)
- Supplemental Task Artifacts: N/A — not applicable
- Design Review Report: `tickets/in-progress/delegated-copy-model-change/design-review-report.md` (ARCH-REV-003, `Pass`)
- Architecture Review Revision Record: `tickets/in-progress/delegated-copy-model-change/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/delegated-copy-model-change/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `tickets/in-progress/delegated-copy-model-change/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/delegated-copy-model-change/code-review-report.md` (CRR-002, `Pass`)
- Code Review Revision Record: `tickets/in-progress/delegated-copy-model-change/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `tickets/in-progress/delegated-copy-model-change/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `tickets/in-progress/delegated-copy-model-change/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-002 `Pass` from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this document, round 1

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; input route `Reviewed`; successful-output route `Code Review`; test-code review `Required`.

## Current Requirement And Design Basis

The user can stop one delegated copy or collaborator (Agent or Team, and the copies it started) from its sidebar row or its Settings row, while the rest of the run keeps running and the copy's Task stays open (REQ-009, DEC-008/009). While it is stopped (by the user, idle shutdown or a stopped root), the model and model settings of each of its agents, and a Team's own model, can be changed in Settings with the existing Save bar; runtime fixed; while running the controls are locked with "Stop this copy to change its model" and a Save that finds it running again is refused (`COPY_RUNNING`) with nothing written (REQ-001, AC-011). A Team choice reaches members that follow the Team only (REQ-002, DEC-003). Validation as stopped-run switching (catalog, schema, AutoByteus capacity; REQ-003). The next message resumes it in the same conversation on the chosen model; a never-started member starts on it (REQ-004). The choice is per instance, survives idle shutdown/wake, root stop/reopen and app restart, shows like any edited member without a label (REQ-005); later copies, extra copies and teammate copies use normal resolution (REQ-006). Provider rejection stays visible (REQ-008). Persisted decision `Directly Usable — No Migration` (optional fields). Live roots publish committed choices (`DELEGATED_LAUNCH_SELECTIONS_CHANGED` / `delegated_launch_selections_changed`); member contexts and "+" use the per-instance choice (IR-002).

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001..SCN-006.
- Added from the implementation: SCN-A1 a member mid-turn when its Team copy is stopped (interrupt); SCN-A2 the copy woken by its delegating agent while the user edits; SCN-A3 a provider refusing the chosen model at resume (REQ-008); SCN-A4 another copy of the same definition delegated after a change (AC-007); SCN-A5 the app restarted (backend process) after a change.
- Contrived / unsupported: none recorded.

## Changed Surface And Boundary Classification

| Surface | Affected | Changed boundary | Repository evidence | Not exercised by it | Broader mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | Yes | stop set, task lifecycle stop/drain, selection command, effective launch rule | unit (lifecycle, command, rule, roots) | real queue/lease timing with real processes; Org root end to end | Server E2E (scripted runtimes) |
| API / transport / contract | Yes | GraphQL `stopDelegatedExecution`, `updateDelegatedLaunchSelections`, `delegatedLaunchModelOptions`; stream events; DTO fields | resolver/projection/contract tests | real HTTP/WS | Server E2E |
| Frontend | Yes | Settings rows editable/locked, stop icons, draft store, selectors, live event handling | web specs | rendered journeys for Team/Org roots, "+" and member context after Save | Browser probe |
| Process / lifecycle | Yes | per-copy shutdown of agents and Team runs; interrupt mid-turn; idle shutdown/wake; restore | unit | real runtime processes | Server E2E (AGY argv, fake Grok mid-turn) |
| Persisted data | Yes | optional `userLaunchSelection` / `userTeamLaunchSelection` | old-record unit test | app restart | Probe (backend restart) |
| External runtimes | Yes | model swap on a retained handle and resume of the same conversation | scripted AGY only | real Codex/Claude thread resume on another model; AutoByteus capacity rule with a real native catalog | Isolated desktop instance |
| Desktop shell | No | — | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change`, branch `codex/delegated-copy-model-change`, base `a609de982a`.
- Guideline: `TESTING.md` (root); package `AGENTS.md`. Discrepancy: none new (the stream-contract `dist/` is tracked, as recorded in the earlier ticket).
- Scripted runtimes: `agy-failure-cli.mjs` (`AGY_FAKE_EXTRA_MODELS`, argv log), fake Grok (`FAKE_ACP_FIXTURE`, `FAKE_ACP_RECORD`), as used by the earlier ticket's suites. Real runtimes only in an isolated instance (user-approved key import into the instance DB when a native catalog is needed).

## Persisted Data Transition Coverage Basis

- Decision `Directly Usable — No Migration`. Evidence planned: unit old-record restore (existing), E2E reopen (existing DCM-003), app restart through the probe (new), plus round-1 delegated-launch E2E/probe old-shape cases rerun.

## Existing Durable Coverage Inventory

| Path / Test | Decision | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` DCM-001..004 | Still Valid | Team + Agent roots: COPY_RUNNING while running, Stop/ALREADY_STOPPED, options, MODEL_UNAVAILABLE, Save, resume on choice; Team choice → follower lead; stopped root combined Save; reopen |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` DCP-001 | Still Valid | Agent root: locked row + stop icon, sidebar Stop, edit, Save, resume |
| Same probe DLP-001..010; `delegated-launch-config-defaults.e2e.test.ts` | Still Valid | earlier ticket; regression for the shared Settings rows and launch rules |
| `tests/architecture/application-framework-boundaries.test.ts` SR-011 case | Needs Update (baseline) | Stale since base `9777af682c` (providers renamed, one singleton call removed); fixed as its own commit `aaf6f010f1` (TESTING.md Rule 9) |
| Unit/component suites (server, contracts, web) | Still Valid | run in full |

## Durable Coverage To Add

| Case ID | Behavior | AC | Artifact | Why |
| --- | --- | --- | --- | --- |
| DCM-005 | Org root: agent copy and Team copy Stop/Save/resume; collaborator Agent Stop/Save/resume; live `delegated_launch_selections_changed`; later delegation of the same definition on normal resolution | AC-001, AC-002, AC-007, DEC-001 | DCM E2E | Org root untested end to end; collaborators untested; AC-007 |
| DCM-006 | Team copy with a member mid-turn (fake Grok `cancel` turn): Stop interrupts it (`session/cancel`), stops all members and the nested copy it started; the PM and another copy keep running; Team choice reaches followers only; a never-started member starts on its own choice | AC-002, AC-003, AC-004, QR-001, DEC-008 | DCM E2E | interrupt and containment at real process level |
| DCM-007 | Woken during the edit (AC-011); invalid settings (AC-006); idle shutdown and wake keep the choice (AC-005); provider refusal at resume is visible and recoverable (REQ-008); Team stream `DELEGATED_LAUNCH_SELECTIONS_CHANGED` after `UPDATED` | AC-005, AC-006, AC-011, REQ-008 | DCM E2E | lifecycle and failure paths |
| DCP-002 | Team root through the UI: sidebar stop icon on a Team copy; Team model edited and saved; live view updated in place; copy lead's "+" and member context show the choice; resume | AC-002, AC-003, round-2 | probe | UI for Team roots |
| DCP-003 | Org root through the UI: Org row stop icon; Settings Stop; edit; Save; resume | AC-001, AC-002 | probe | UI for Org roots |
| DCP-004 | Woken during the edit through the UI: Save shows the refusal and keeps nothing; backend restart (as an app restart) keeps the choice in Settings and at resume | AC-011, AC-005 | probe | UI refusal text; restart persistence |

## Broader Validation Decision

- `Required`: server E2E and browser probe as above; isolated desktop instance with real runtimes for the design's step 6 (real Codex copy stopped, switched and resumed in its thread) and the AutoByteus capacity refusal with a real native catalog (AC-006).

## Not Tested / Infeasible

| Item | Reason | Follow-up |
| --- | --- | --- |
| AC-010 | User verification | Delivery |
| Copies without a recorded delegator not stopped with their starter | Only records older than this feature; residual stated | — |
