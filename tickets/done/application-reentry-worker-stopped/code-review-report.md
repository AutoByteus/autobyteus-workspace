# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-08 corrected in SR-002)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed As Context: `evidence/repro-application-reentry.e2e.test.ts`, `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-reentry-order.log`, `application-framework-design-findings.md` (report), `follow-ups.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation complete (IR-001), `Medium`/`High` → source review
- Prior Review Round Reviewed: none
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. The change touches 6 source files in 3 subsystems, all within existing owners. It changes the lifecycle order of the shared reentry path, the transition→reentry contract and the worker stop's end state.

## Review Scope

- Changed implementation and behavior reviewed: `git diff ddd6fdcdf6 6950a24e1b -- autobyteus-server-ts`, 17 files: 6 source, 9 test, 2 docs. `946ada292e` adds only ticket files (`git diff --stat 6950a24e1b 946ada292e -- . ':!tickets'` is empty).
- Files / areas reviewed:
  - Source: `application-reentry-service.ts`, `application-catalog-transition-service.ts`, `application-definition-runtime-readiness.ts`, `application-platform-lifecycle.ts`, `application-engine-controller.ts`, `application-engine-launcher.ts`.
  - Unchanged paths read for context: `application-execution-event-dispatch-service.ts:84-200` (resume only schedules; the drain checks ACTIVE and starts the worker), `application-availability-service.ts` (`requireApplicationActive`), `application-backend-api-gateway-service.ts:90-114` (ensure-ready requires ACTIVE), `application-engine-launcher.ts:68-88,140-168` (stop waits for an in-flight start; crash → `failed` and detach), `application-engine-state-registry.ts:75-84` (a status file is written only with a path), `create-application-orchestration-services.ts:241` (readiness active set = selected set), `application-platform-lifecycle.ts:188-191` (`isSelected`).
  - All test diffs and both docs diffs.
- Explicit exclusions: `application-framework-design-findings.md` content (report, AC-009, owned by the Solution Designer); FU-001…FU-005.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood:
  - REQ-001: reentry → ACTIVE without starting the worker in REENTERING.
  - REQ-002: dispatch resumes after ACTIVE.
  - REQ-003: one owner for the setup text, used by startup and catalog change.
  - REQ-004: durable e2e.
  - REQ-005: docs.
  - REQ-006: report (not code).
- Design-spec behavior map verified against the implementation: DS-001, DS-002 and DS-003 match the code (traces below). The removal plan is fully applied.
- Design review report and round confirmed: ARCH-REV-002 Pass. MP-001 (reentry of a participant whose worker crashed) is implemented as designed and covered by the controller unit and the new invoker unit.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `commitAndRecover` → `recoverParticipants` (`application-reentry-service.ts:152-160`): `resumeApplication` → `activateApplication` → `resumePendingEventsForApplication` → tools `open`. The launcher dependency is `Pick<…,"stop">` (`:39`), so a worker start is impossible at the type level. The worker starts later, through ensure-ready (gated on ACTIVE, gateway `:111-113`), the tool invoker, or the dispatch drain. e2e RE-01/RE-02 pass and fail on base (IMP-00a, IMP-01) | — |
| BEH-002 | Confirmed | `resumePendingEventsForApplication` now runs after activation. It only checks ACTIVE and enqueues (`dispatch-service.ts:84-94`); the drain then calls `ensureReady` with the app ACTIVE (`:166`). The journal-recovery unit asserts the handler runs after activation | — |
| BEH-003 | Confirmed | `getSetupRequiredDetail` (`readiness.ts:116-119`) uses the module-local formatter that `ApplicationSetupRequiredError` also uses (`:11-12,18`). Transition builds the map (`catalog-transition-service.ts:155-160`). Reentry quarantines with it, before the not-a-participant branch, so a new import gets it too (`reentry:110-118`). Startup quarantines selected apps with it (`lifecycle.ts:113-120`). e2e RE-03 shows the 503 detail with both strings | — |
| BEH-004 | Confirmed | Repair → `reloadAndReenter` (`recoverPreviouslyInactive: true`) → the ready path above. e2e RE-03, second half | — |
| MP-001 | Confirmed | `launcher.stop` → `controller.stopEngine`: with no handle it writes the base `stopped` status (`controller.ts:207-210`), so the invoker starts the worker on demand. The controller unit and the invoker unit fail with the reset removed (IMP-00c) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001/002, AC-001, AC-005 | User | Developer (devkit) | Pick up a changed package | GraphQL `reloadApplicationPackage` | Normal | DS-001 | ACTIVE, usable | Requirements; devkit | Supported Normal Scenario | Use |
| SCN-002 | BEH-001, AC-002 | Operational | User/operator | Repair one app | `POST /rest/applications/:id/backend/reload` | Normal | DS-001 (`recoverPreviouslyInactive`) | ACTIVE when ready | `application_orchestration.md` | Supported Normal Scenario | Use |
| SCN-003 | BEH-003/004, AC-003/004/006 | User | User | Use an app imported while signed out | Import; sign in; repair | Explicit Edge | DS-001 + DS-002 text owner | Quarantine with reason, then ACTIVE | Task; SD-01 | Supported Explicit Edge Scenario | Use |
| MP-001 | BEH-001, `application-owned-mcp-capability/requirements.md:217` | System → Operational | Crash, then repair/reload | Crashed worker usable again after reentry | Worker exit; repair/reload | Explicit Edge | stop → `stopped` → on-demand start | Tool call reaches a fresh worker | ARCH-REV-002 MP-001 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `stopEngine` without a handle overwrites the status even if a start is concurrently in progress | MP-001 / none | Would need an `ensureReady` begun during participant preparation | `launcher.stop` first awaits any registered start (`launcher.ts:69-70`). Every on-demand start path is closed during preparation: the app is REENTERING (ensure-ready requires ACTIVE), tools are drained and closed, and dispatch checks ACTIVE before draining | Code read | Reject | — | Needs artificial concurrent timing with no product contract (Principle 6) |
| C-02 | `stopEngine` without a handle creates a status entry for an app that never started or was removed | — | prepare/quarantine of any participant | In-memory map entry with the base status, which `getStatus` already returns by default; no file (`state-registry.ts:81`) | Code read | Reject | — | No observable consequence |
| C-03 | Startup now iterates `snapshot.applications ∩ isSelected` instead of the diagnostics map; could the quarantined set differ? | DS-002, AC-006 | Startup | Readiness checks `bundleService.listApplications()` filtered by `activeApplicationIds = selectedApplicationIds` (`create-application-orchestration-services.ts:241`). `isSelected` is the same set, or everything when unset (`lifecycle.ts:188-191`). The snapshot comes from the same bundle state | Code read | Reject | — | Equivalent set |
| C-04 | Readiness exposes both `isApplicationReady` and `getSetupRequiredDetail`, two views of one map | Principle 11 (derived data) | — | Both read the one owner's map; neither recomputes the fact. The lifecycle needs the boolean for `readyApplicationIds` and the text for quarantine | Code read | Reject | — | One derivation owner; not duplication |
| C-05 | e2e RE-03 re-imports after RE-02's removal instead of importing into a fresh data dir; RE-02/RE-03 depend on RE-01's state | SCN-003, AC-003 | — | The setup-required branch comes before both the participant and the not-a-participant branch (`reentry:110-118`), so a fresh import and a re-import quarantine with the same reason. Ordered cases in one describe match the sibling `application-import-codex-launch.e2e.test.ts` pattern | Code read; IMP-01 | Reject | — | Same production path; sequencing is explicit (`expect(imported).not.toBeNull()`, `finally` cleanup) |
| C-06 | `application-engine-controller.ts` crosses 220 effective lines (219 → 224) | Size guardrail | — | +5 lines: a 4-line doc comment plus the one-line reset. The file still owns one concern (worker control) | Line count | Reject | — | Not structural pressure; no split warranted |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Missing Invariant fixed (ACTIVE before any worker start); duplicated setup text has one owner; behavior-by-absence replaced by an explicit reason map | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements; the reproduction became the durable e2e | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001/DS-003 order in code equals the design's chain; DS-002 uses the same text owner | — |
| Ownership boundary preservation and clarity | Pass | Readiness owns text; transition carries data; reentry owns per-participant order; launcher/controller own worker state | — |
| Off-spine concern clarity | Pass | Formatter is module-local in the readiness owner | — |
| Existing capability/subsystem reuse | Pass | On-demand start reused (invoker, dispatch, ensure-ready); no new helper | — |
| Reusable owned structures | Pass | One formatter for three former builders | — |
| Shared-structure / data-model tightness | Pass | `ReadonlyMap<applicationId, setupRequiredDetail>` replaces the ID list; one meaning | — |
| Repeated coordination ownership | Pass | Setup text built once | — |
| Empty indirection | Pass | None added | — |
| Separation of concerns and file responsibility | Pass | Each edit lands in its owner | — |
| Ownership-driven dependency check | Pass | No new dependency direction; reentry's launcher dependency narrowed | — |
| Authoritative Boundary Rule | Pass | Reentry calls `launcher.stop` only; the controller's end state stays behind the launcher | — |
| File placement | Pass | Existing files; new tests in existing test folders | — |
| Flat-vs-over-split layout | Pass | No new structure | — |
| Interface boundary clarity | Pass | `getSetupRequiredDetail(applicationId)`; `recoverParticipants(token, current, setupRequiredDetails, options)` with the map required and no default; `stopEngine` named for what it does | — |
| Naming quality / one vocabulary | Pass | "setup required detail" matches `ApplicationSetupRequiredError` / `APPLICATION_SETUP_REQUIRED`; "engine" kept in the controller (engine/worker drift is FU-005) | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | Removes a step and a parameter instead of adding a guard | — |
| Dead code removed in touched files | Pass | `ensureReady` Pick member, `recoverableApplicationIds`, generic text, inline lifecycle text, `getDiagnosticsByApplicationId` + 2 stubs, `stopAttachedEngine`. Grep of `src tests docs` finds no old names. `isApplicationReady` is still used (`lifecycle.ts:65,98`) | — |
| Test scenarios and assertions are clear and requirement-aligned | Pass | Reentry order asserted after the stop (AC-005); recovery failure quarantines and keeps tools closed; transition passes reasons (AC-006); lifecycle and readiness text (AC-006); controller reset and invoker on-demand start (MP-001, with a negative "fails closed without a stop"); e2e RE-01…03 through GraphQL/REST as the devkit and UI do (AC-001…004) | — |
| Test fixtures/helpers reusable, structure coherent | Pass | The e2e reuses `agent-runtimes-e2e-harness` and the studio server helper; the invoker unit uses the real controller and launcher, faking only the process start | — |
| No stale, duplicated, or compatibility-only tests | Pass | Old order assertion and old texts replaced, not kept | — |
| API/E2E readiness | Pass | Durable e2e green; regression e2e and integration green (IMP-01…04) | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `application-orchestration/services/application-reentry-service.ts` | 206 | 209 | Pass | Pass | Pass | Pass | — | — |
| `application-orchestration/services/application-catalog-transition-service.ts` | 175 | 177 | Pass | Pass | Pass | Pass | — | — |
| `application-platform/runtime/application-definition-runtime-readiness.ts` | 105 | 110 | Pass | Pass | Pass | Pass | — | — |
| `application-platform/runtime/application-platform-lifecycle.ts` | 197 | 197 | Pass | Pass | Pass | Pass | — | — |
| `application-engine/services/application-engine-controller.ts` | 219 | 224 | Pass | Pass (crosses by 5: doc comment + reset line; one concern, C-06) | Pass | Pass | — | — |
| `application-engine/services/application-engine-launcher.ts` | 216 | 216 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No alias for `stopAttachedEngine`; no optional/default for the replaced parameter |
| No legacy old-behavior retention | Pass | Worker start removed outright |
| Dead code removed in touched files | Pass | See structural check |
| Approved persisted-data transition decision followed | Pass | `Not Affected`; the stop's `updateStatus` writes no file |
| No version-specific dual reads/writes or fallback | Pass | — |
| Transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change (AC-008).
- Why: the reentry order, worker state and quarantine reason changed.
- Files: `autobyteus-server-ts/docs/modules/application_orchestration.md` (repair section) and `applications.md:111`. Both now state: binding recovery → ACTIVE with the worker stopped → dispatch resume → tools open; reentry never starts the worker; a crashed worker is reset; not-ready → "Application setup is required: …". This matches the code.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | — |

No new premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.5
- Overall score (`/100`): 95

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Reentry order is the documented and startup order, readable in 4 lines | Startup and reentry still bring apps into service separately (FU-001, out of scope) | FU-001 |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Text owned by readiness; reentry gets data, not a readiness dependency; stop end state owned by the controller | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Required map, no default; per-application getter; method named for its effect | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Every edit in its owner; files small | Controller just over 220 (doc comment) | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | One map with one meaning; one formatter | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Consistent "setup required detail"; comments say why | — | — |
| 7 | API/E2E Readiness | 9.5 | Durable real-server e2e for AC-001…004, base-failing; regressions green | No test-file typecheck exists (recorded limitation) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Traced each path including dispatch (enqueue only), ensure-ready gate, crash reset and new import branch | Accepted residuals: brief ACTIVE-before-tools window; start failure surfaces on first request | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 10 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.5 | Removal plan fully applied, stubs included; docs updated | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E Engineer (primary pass rule); informational notification to the Implementation Engineer.

## Residual Risks

- Accepted by design and ARCH-REV-002:
  - a stop clears `lastFailure`;
  - an app is briefly ACTIVE before its tools open;
  - a worker start failure surfaces on the first on-demand request (dispatch retries with backoff).
- Not verified here; for API/E2E's judgement (handoff's Downstream Coverage Hints):
  - a real crashed worker followed by a repair (the unit fakes only the process start);
  - a pending event recorded before a reentry, dispatched after ACTIVE on the real stack.
- Test-file typecheck is unavailable in the project (`rootDir: src`); vitest caught runtime shape errors.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10, every category ≥ 9.5
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer
- Notes: checks IMP-00…05 reused (code unchanged since they ran); none rerun.
