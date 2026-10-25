# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited by the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-001, Ready; `Small` + `Low`, direct route)
- Supplemental Task Artifacts Reviewed As Context: `evidence/repro-imported-app-codex-launch.e2e.test.ts`
- Relevant Solution Revision IDs: SR-001
- Design Review Report Reviewed As Context: `N/A — direct route`
- Architecture Review Revision Record Reviewed As Context: `N/A`
- Relevant Architecture Review Revision IDs: `N/A`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): N/A
- Trigger: API/E2E `Fail` at API-REV-001, case API-06
- Prior Review Round Reviewed: none
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed: N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: API-06 → AC-003, REQ-001 (reload), UC-002, SCN-003
- Exact Failing Commands / Execution Mode: `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/repro-ab238-reload-reentry.e2e.test.ts --no-watch` (the reproduction copied from evidence into `tests/e2e/runtime/`); real studio server over HTTP, scripted runtime CLIs
- Failure Evidence Paths: `evidence/API-06-repro-reload-reentry.e2e.test.ts`, `evidence/API-06-repro-reload-reentry-on-fix.log`, `evidence/API-06-probe-base-startup-reload.log`, `evidence/API-06-probe-fix-startup-reload.log`, `evidence/API-06-cause-stack-diagnostic.log`, `evidence/API-06-probe-active-reload-repair.log`, `evidence/API-06-probe-startup-quarantine.log`, `evidence/API-06-probe-package-reload.log`

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route; no source review before API/E2E)
- Classification evidence or correction required: the `Small`/`Low` classification is right for the change that was made (catalog transition: 10 lines; wiring: 1 line). Whether it still holds depends on the Solution Designer's scope decision below. Fixing reentry admission in this ticket would touch the reentry/availability contract, which `recoverParticipants` shares with import and repair.

## Review Scope

- Changed implementation and behavior reviewed: `application-catalog-transition-service.ts` (new `ensureRuntimeDirectoryPrepared` step before readiness) and `build-application-platform-runtime.ts` (wiring), `1138e8fbef..1d49973440`.
- Files / areas reviewed for origin: `application-reentry-service.ts:74-178` (`recoverParticipants`), `application-availability-service.ts:209-215` (`requireApplicationActive`), `application-orchestration-host-service.ts:129-131,264-271` (`listRunBindings`), `application-platform-lifecycle.ts:40-132` (startup order and how it starts workers), `applications/brief-studio/backend-src/index.ts:18` (worker start hook), `autobyteus-server-ts/docs/modules/application_orchestration.md:169-180`, `autobyteus-server-ts/docs/modules/applications.md:111`, and history of `application-reentry-service.ts` (`598ee2c2f8`).
- Explicit exclusions: no general test-suite review; no full source audit or scorecard (failure-origin round).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001 makes a live catalog change (import, reload) prepare runtime folders before readiness. AC-003 expects that after a reload of the imported package, "Runtime folder exists; the application stays usable". Its verification intent is "Unit test of the catalog transition order".
- Design-spec behavior map verified against the implementation: DS-001 is implemented as designed. The step runs after `commitPreparedCatalogSlice`/`commitPreparedDelta` and before snapshot/reconcile/`definitionReadiness.prepare()`, through the storage owner. The design's spine ends at `ApplicationReentryService.recoverParticipants -> availability ACTIVE` and treats that tail as working.
- Design review report and round confirmed: N/A (direct route).
- Behavior-basis status: `Confirmed` for BEH-001/BEH-002. BEH-003 is `Contradicted` at its tail: the reload path reaches the readiness step correctly, but reentry then quarantines the application.
- Changed or newly discovered behavior: none new. The contradiction is in existing reentry behavior that BEH-003 relies on.
- Remaining material ambiguity: AC-003 has two possible readings. One is "the application stays usable" (the end-to-end outcome). The other is the verification intent "unit test of the order". Only the first fails. The Solution Designer decides which one holds (see Classification).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 (import) | Confirmed | IC-01/IC-02 pass on the fix and fail on base (IMP-00, IMP-01); re-passed in `API-06-probe-active-reload-repair.log` | — |
| BEH-002 (startup) | Confirmed | Startup prepares folders (`application-platform-lifecycle.ts:51-56`) and never starts the worker during recovery. Workers start lazily on `ensure-ready` once ACTIVE. IMP-03 passes | — |
| BEH-003 (reload) | Contradicted (pre-existing, outside the changed code) | Reload → `commitAndRecover` → folder step (new, correct) → readiness → `recoverParticipants`. For a previously ACTIVE participant it runs `resumeApplication`, **then `engineLauncher.ensureReady` while the state is still `REENTERING`** (`application-reentry-service.ts:150-151`), and only then `activateApplication` (:154) | Brief Studio's worker start hook calls `reconcilePublishedArtifacts()` (`applications/brief-studio/backend-src/index.ts:18`). That calls the host's `listRunBindings` (`application-engine-client.ts:255` → `application-orchestration-host-service.ts:269`), and `requireApplicationActive` refuses `REENTERING` (`application-availability-service.ts:209-215`). The error reaches the `catch` at :158-172 and quarantines the app with "…currently reentering. Please retry after repair/reload completes." (`API-06-cause-stack-diagnostic.log`, `API-06-repro-reload-reentry-on-fix.log`) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-003 | BEH-003, REQ-001, AC-003, UC-002 | User | User (Applications → reload; devkit sends GraphQL `reloadApplicationPackage`) | Pick up a changed package without a restart | GraphQL `reloadApplicationPackage` | Normal | `ApplicationPackageCommandService` → `runPackageTransition` → `commitAndRecover` → `recoverParticipants` (ACTIVE participant branch) | App ACTIVE and usable; observed QUARANTINED, launch settings 503 | Requirements SCN-003 (Supported Normal Scenario); in-scope UC-002 | Supported Normal Scenario | Use |
| CON-REENTRY | `application_orchestration.md:175-180`, `applications.md:111` | Contract | Server | App-scoped reload/repair returns the app to `ACTIVE` "with the worker still stopped so the next `ensure-ready` path boots a fresh worker" | `POST /rest/applications/:id/backend/reload`, package reload | Normal | Same tail | Documented: ACTIVE, worker stopped. Code: starts the worker while REENTERING | Module docs | Supported (governing contract) | Use |
| SCN-001b | FU-002 consequence | User | User imports while Codex is signed out, then signs in and repairs | Recover without a restart | Repair REST / package reload | Explicit Edge | Repair → same `ensureReady` refusal; package reload keeps the prior quarantine (`recoverPreviouslyInactive` unset for package transitions) | Cannot recover without a restart | `API-06-probe-startup-quarantine.log`, `API-06-probe-package-reload.log` | Supported Explicit Edge Scenario (same cause) | Use (as consequence of C-01) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `recoverParticipants` starts the application worker (`ensureReady`) before `activateApplication`, while the host refuses the worker's own host calls in `REENTERING`. A worker whose start hook calls the host (Brief Studio) quarantines its app on every reload/repair of a previously ACTIVE participant | SCN-003, CON-REENTRY | User reloads the package (or uses the documented repair) | REENTERING → `ensureReady` → worker start hook → `listRunBindings` → `requireApplicationActive` throws → catch quarantines → launch settings 503 | Stack diagnostic; reproduction fails on the fix; base and fix probe logs are identical after normalizing ids/timestamps (I diffed them); line introduced by `598ee2c2f8` (2026-08-27, ancestor of base `1138e8fbef`); contradicts the module docs | Promote | Prerequisite (Requirement Gap to Solution Designer), or this ticket if the Solution Designer extends scope | This change did not introduce it and does not touch the reentry service. It belongs to reentry/availability admission, which is other functionality. It does block in-scope AC-003's observable outcome. See Classification |
| C-02 | The ticket's own step (folder preparation before readiness) is wrong or incomplete for reload | SCN-003 | Reload | Folder step runs for `currentApplicationIds` after commits and before readiness | Diff; unit order test (IMP-02); reload reaches readiness and fails only later, in reentry; base and fix identical | Reject | — | No defect in the changed code |
| C-03 | The API-06 reproduction is invalid or stale | SCN-003 | — | It enters through GraphQL `reloadApplicationPackage` and the REST launch-settings read on a real server, as the devkit/UI does | `API-06-repro-reload-reentry.e2e.test.ts` | Reject | — | The test is valid evidence of the established path |
| C-04 | Source-review gap | — | — | Direct route: no source review was selected. The unit fakes (`engineLauncher`) cannot show the worker's host call | — | Reject | — | Not reasonably detectable without starting a real worker; not a reviewer gap |

## Source File Size And Structure Audit

Not repeated (failure-origin round). The changed source is small and follows the design's shape exactly.

## Legacy / Backward-Compatibility Verdict

Unchanged from API/E2E: no compatibility behavior introduced.

## Docs-Impact Verdict

- Docs impact: `No` for this ticket's change. C-01 is a docs/code divergence (`application_orchestration.md:175-180`, `applications.md:111` vs `application-reentry-service.ts:150-151`). Whoever owns the fix must settle which one is right.

## Findings

No finding against this ticket's changed code.

- **C-01 (pre-existing, blocks AC-003 as written).** During reentry, `ApplicationReentryService.recoverParticipants` (`autobyteus-server-ts/src/application-orchestration/services/application-reentry-service.ts:150-155`) calls `engineLauncher.ensureReady` before `availabilityService.activateApplication`. The started worker's own host calls go through `ApplicationOrchestrationHostService.requireApplicationActive` (`application-orchestration-host-service.ts:129-131`), which refuses `REENTERING`. Brief Studio's start hook (`applications/brief-studio/backend-src/index.ts:18`) lists run bindings, so every reload or repair of a previously ACTIVE Brief Studio ends QUARANTINED. This holds on base and on the fix. The module docs describe a different order: activate with the worker stopped, and start it lazily on the next `ensure-ready`. Startup follows that documented order, which is why startup works. Two fix directions (for the Solution Designer, not prescribed here):
  - (a) reentry does not start the worker before ACTIVE, as documented;
  - (b) the host admits the application's own worker calls during `REENTERING`.

  Either changes reentry/admission behavior shared by import, package reload and repair.

## Follow-ups

- Follow-ups this review added: None. C-01 blocks an in-scope acceptance criterion, so it is not a follow-up. If the Solution Designer narrows AC-003 and moves C-01 out, it records the resulting follow-up or prerequisite Task, together with the SCN-001b recovery consequence, which relates to FU-002.

## Classification

- `Requirement Gap` (prerequisite candidate), owned by the Solution Designer.
- Why not `Local Fix`: the ticket's code is correct, and the cause lies in functionality this ticket does not change (reentry/availability admission, `598ee2c2f8`).
- Why a prerequisite rather than a follow-up: it is pre-existing and outside the Change Scope. It still keeps in-scope AC-003 ("the application stays usable" after a reload, UC-002) from passing. This matches the design's own escalation trigger ("another missing prerequisite").
- I agree with API/E2E's diagnosis and owner. The label differs: the team's ticket-scope rule routes a blocking pre-existing problem in other functionality as a `Requirement Gap` that names a prerequisite. The Solution Designer may instead absorb it into this ticket as `Design Impact`, if it judges reload recovery to be the functionality this ticket changes.
- The Solution Designer decides one of:
  1. A prerequisite Task for reentry admission (C-01), done first. This ticket waits, then AC-003 is re-validated end to end.
  2. Extend this ticket's scope to fix C-01. This needs a revised design and a re-check of the `Small`/`Low` classification, since `recoverParticipants` is shared by import, reload and repair.
  3. Narrow AC-003 to the order proof (its stated verification intent), with user approval because it changes an acceptance criterion. C-01 then becomes a follow-up Task.

## Recommended Recipient

- Owner: Solution Designer, per `get_handoff_rules`.
- After the decision, API/E2E reruns API-06 (and the deferred API-07) on whatever lands. If C-01's fix lands in this ticket, `recoverParticipants` changes, so implementation, then API/E2E, rerun the import cases too (IC-01/IC-02).

## Residual Risks

- AC-005 (desktop journey) remains unrun, deferred by API/E2E pending this decision.
- Other applications whose worker start hook calls the host are affected the same way on reload/repair. The cause is generic, not Brief-Studio-specific.

## Latest Authoritative Result

- Review Decision: `Fail` (failure origin classified; not caused by this change)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (SCN-003 and CON-REENTRY supported)
- Material-Premise Gate: `Pass`
- Score Summary: N/A (failure-origin round)
- Failure Origin: pre-existing reentry admission defect (`application-reentry-service.ts:150-151`, since `598ee2c2f8`); the ticket's change is correct and does not cause the failure
- Classification: `Requirement Gap` (prerequisite candidate) → Solution Designer
