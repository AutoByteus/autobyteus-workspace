# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `<T>/requirements-doc.md` (SR-001, Approved)
- Investigation Notes Reviewed As Context: `<T>/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `<T>/solution-revision-record.md`
- Design Spec Reviewed As Context: `<T>/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: None
- Relevant Solution Revision IDs: `SR-001`
- Design Review Report Reviewed As Context: `<T>/design-review-report.md` (Pass; advisory REC-001, REC-002; MP-001)
- Architecture Review Revision Record Reviewed As Context: `<T>/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`
- Implementation Handoff Reviewed As Context: `<T>/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `<T>/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `<T>/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation complete from `/implementation_engineer` (IR-001)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The diff (+77/−18 in 3 source files) changes exactly the ownership boundary and cache lifecycle the design flagged as High risk. No escalation trigger was found. The only other `new RunFileChangeService` in `src` is the application-scope kernel builder (`application-execution-scope-kernel-builder.ts:90`), which never binds.

## Review Scope

- Changed implementation and behavior reviewed: diff `5c74fed71..061d4698b -- autobyteus-server-ts`. Commit `061d4698b` on branch `codex/run-file-change-live-projection-ownership`.
- Files / areas reviewed:
  - `src/services/run-file-changes/run-file-change-service.ts` (full file)
  - `src/agent-execution/runtime/general-process-run-supervisor.ts`: construction, bind, rollback, `closeInternal`
  - `src/run-history/services/run-file-change-projection-service.ts`
  - `src/agent-execution/services/agent-run-resource-manager.ts`: attach/release lifecycle, read-only context
  - the four changed test files
  - the two docs
  - the `defaulting-owner` entry in `tests/architecture/application-framework-boundaries.test.ts`
- Independent verification run by the reviewer (from `autobyteus-server-ts`):
  - `tsc -p tsconfig.build.json --noEmit`: clean.
  - vitest on the service, reader, supervisor-ownership, `tests/unit/api/rest` and integration suites: 46/47 pass.
  - The one failure is "hydrates historical AutoByteus team-member file changes". I reproduced it on base source by temporarily checking out base `src` and the base integration test, then restored the worktree; its git status is clean apart from the pre-existing untracked `dist/`. The failure is pre-existing and is on the inactive path.
  - `tests/architecture`: 44/44 pass.
- Explicit exclusions:
  - the frontend 404 wording (RSK-001, out of scope)
  - the AC-006 live multi-image check (API/E2E stage)
  - the 23 other pre-existing base failures listed in the handoff, which were not re-run

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Every artifact an active run records must be listable and previewable while its file exists (REQ-001, REQ-002). Inactive runs and the persisted format stay unchanged (REQ-003). The 409/404 semantics are kept (REQ-004).
- Design-spec behavior map verified against the implementation: Yes.
  - DS-001: the writer path is unchanged. The same instance now also serves reads.
  - DS-002: the reader resolves the bound authority per call. `load()` serves attached runs from memory and reads any other run fresh.
  - DS-003: the inactive branches are untouched.
- Design review report and round confirmed: ARCH-REV-001 Pass. REC-001 and REC-002 were both adopted and verified below.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | REST route (unchanged) → `RunFileChangeProjectionService.resolveEntry` → `changes()` → `getRunFileChangeService()` (the bound supervisor instance) → `load()` serves the attached cache, which `handle()` updates on each `FILE_CHANGE`. The integration regression shows A, B, C → 200 with bytes, streaming D → 409, unknown path → 404. Reviewer re-run: pass | — |
| BEH-002 | Confirmed | GraphQL resolver → same per-call resolution. The integration and unit regressions show the second list contains every entry (standalone and Team member) | — |
| BEH-003 | Confirmed | `readProjectionContext` inactive branches are byte-identical. Existing historical and 404 cases pass. The historical team-member failure is identical on base | — |
| BEH-004 | Confirmed | `attachToRun → enqueue → handle → writeProjection` is unchanged. The write still happens after detach. The store and normalizer are unchanged | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001, REQ-004 | User | User watching an active agent | Preview each produced artifact | Artifacts tab preview → REST `/file-change-content` | Normal | Activation → `AgentRunResourceManager.attach` → process authority `attachToRun` → `FILE_CHANGE` → `handle` → cache + disk; request → projection service → authority → attached cache | 200 for every recorded existing file; 409 streaming; 404 missing | User screenshots; curl reproduction; requirements | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, REQ-002 | User | User reopening an active run | Full artifact list | Artifacts tab hydration → GraphQL `getRunFileChanges` | Normal | Same as SCN-001, read side | Full list | Requirements; code path | Supported Normal Scenario | Use |
| SCN-003 | BEH-003, REQ-003 | User | User browsing history | View past artifacts | Artifacts tab, inactive run | Normal | Projection service inactive branches → store | Unchanged | Requirements; code | Supported Normal Scenario | Use |
| CTR-001 | Design spec Interface Mapping / Dependency Rules | Contract | Process composition | One bound process authority; bind/release symmetric with the other process services, including rollback | `createGeneralProcessRunSupervisor` in `build-studio-server.ts` / `start-standalone-application-host.ts` | Normal | Supervisor constructor → bind → rollback or `closeInternal` → release | Getter returns the wired instance; it throws when unbound | Design spec; repo `bindProcess*` pattern | Supported Normal Scenario | Use |
| SCN-MP-001 | MP-001 (ARCH-REV-001) | User | User stops a run just after a `FILE_CHANGE` | Run control | Stop/terminate → resource release → detach | Explicit Edge (narrow timing) | Pending `handle()` awaiting `load()` disk read → detach → `clear` → late cache write | Invariant leak only, with no user-visible staleness (per ARCH-REV-001) | design-review-report MP-001 | Supported Explicit Edge Scenario (negligible consequence) | Use (only to verify that the adopted REC-001 guard is correct; it creates no requirement) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | `clear()` on an old attachment could delete a newer attachment of the same `runId` if attach/detach interleaved | SCN-001 lifecycle | Run re-activation | `AgentRunResourceManager.attach` throws if `resourcesByRunId` already has the runId, so release must finish before a new attach | `agent-run-resource-manager.ts:53-56, 108-110` | Reject | Not reachable through the production attach owner. No reference counting is needed |
| CAND-002 | A late `handle()` after detach still writes `file_changes.json` | BEH-004 | SCN-MP-001 | The write is derived from a fresh disk read plus the event, so it is the correct persisted state | `run-file-change-service.ts:81-99`; unchanged pre-existing behavior | Reject | Correct preserved writer behavior, not a defect |
| CAND-003 | Getter throws after `close()` and REST would return 500 for an in-flight request | CTR-001 | Server shutdown | The same holds for `AgentRunManager.getInstance()` on base | Base projection service constructor; supervisor `closeInternal` | Reject | Pre-existing shutdown semantics. No supported product goal for reads after close |
| CAND-004 | Supervisor file is 464 effective non-empty lines | Engineering contract (size guardrail) | — | Delta +17/−4; below 500; no new concern | `grep -cv` counts; numstat | Reject | Under the hard limit. The delta is small and stays within the composition-root concern |
| CAND-005 | Tests construct `new RunFileChangeService()` without `workspaceManager` | `defaulting-owner` architecture contract | — | The contract applies to `src`. The architecture suite passes 44/44 | Reviewer run | Reject | Test-only construction is acceptable |

No candidate was promoted.

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present, evidence-backed, preserved | Pass | Boundary/ownership + missing invariant, both fixed as designed | — |
| Matches behavior-defining supplemental artifacts | Pass | None exist | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..003 map one-to-one onto the code | — |
| Ownership boundary preservation and clarity | Pass | One process instance is constructed in the supervisor, wired into `AgentRunResourceManager` and bound. The reader never constructs an instance | — |
| Off-spine concern clarity | Pass | `readStored` extracted as the store-read concern inside the owner | — |
| Existing capability reuse | Pass | Reuses the `bindProcess*` pattern: throw on double bind or falsy instance; release only the same instance | — |
| Reusable owned structures | Pass | None needed | — |
| Shared-structure tightness | Pass | No type changes | — |
| Repeated coordination ownership | Pass | The attachment check is local to the owner | — |
| Empty indirection | Pass | The `changes()`/`agentRuns()` resolvers own per-call resolution (design requirement) | — |
| Separation of concerns / file responsibility | Pass | Each file changed only within its concern | — |
| Ownership-driven dependency | Pass | run-history → services getter (same direction). Only the supervisor binds. Application-platform does not bind | — |
| Authoritative Boundary Rule | Pass | Transport → projection service only. The reader → authority boundary has no bypass into the store for active runs | — |
| File placement | Pass | No moves | — |
| Flat-vs-over-split layout | Pass | No new files | — |
| Interface boundary clarity | Pass | Binding trio as designed. `getProjectionFor*` signatures unchanged | — |
| Naming quality | Pass | `attachedRunIds`, `readStored`, `injectedChanges` and `bindProcessRunFileChangeService` are clear | — |
| No unjustified duplication | Pass | The cache write guard is duplicated only intentionally (REC-001: `load` and `handle`) | — |
| Patch-on-patch complexity | Pass | A single coherent change | — |
| Dead/obsolete cleanup | Pass | Lazy singleton and unconditional caching removed. Captured `changes`/`agentRuns` fields replaced | — |
| Test scenarios clear and requirement-aligned | Pass | AC-001, AC-002/AC-003 (unit, real bound authority), AC-005 (integration REST+GraphQL), REC-001 gate test, binding semantics, supervisor wiring/close/rollback | — |
| Test fixtures/helpers reusable, coherent | Pass | Local `liveRun`/`record` helpers. Polling on the persisted record avoids timing sleeps | — |
| No stale/compat-only tests | Pass | — | — |
| API/E2E readiness | Pass | Build clean. Targeted suites green except the pre-existing base failure. AC-006 is left for API/E2E | — |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/agent-execution/runtime/general-process-run-supervisor.ts` | 464 | Pass | Pass (+17/−4) | Pass | Pass | Pre-existing size, no new pressure | None |
| `src/services/run-file-changes/run-file-change-service.ts` | 149 | Pass | Pass (+44/−7) | Pass | Pass | — | None |
| `src/run-history/services/run-file-change-projection-service.ts` | 127 | Pass | Pass (+16/−7) | Pass | Pass | — | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No unbound fallback |
| No legacy old-behavior retention | Pass | Lazy singleton removed |
| Dead/obsolete cleanup | Pass | — |
| Persisted-data decision followed | Pass | `Not Affected`; store/normalizer untouched |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, and already addressed.
- Why: the ownership and cache invariant are documented design facts.
- Files updated: `docs/features/artifact_file_serving_design.md` and `docs/modules/agent_artifacts.md`. Both accurately describe the single bound authority, the attached-only cache and the application-scope exclusion.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | REC-001 adopted. Both cache writes (`load` L97, `handle` L88) check attachment. The gated-read unit test proves no re-cache, and per the handoff the test fails without the `handle()` guard |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Read and write spines now converge on one owner, exactly as designed | Nothing material | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Single process authority; cache lifetime equals attachment lifetime; no reader-side construction | Nothing material | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Binding trio mirrors the repo convention. Public read signatures unchanged | Nothing material | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Changes stay in owning files; `readStored` extraction is clean | The supervisor remains a large composition root (pre-existing, 464 lines) | Out of scope |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | No shape changes | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Clear names; short doc comments state the invariant | The two-step `injected* ?? get*()` resolvers are slightly indirect but justified for test injection | — |
| 7 | API/E2E Readiness | 9.2 | Build and targeted suites green. The regression tests fail on the old wiring | AC-006 live check still pending (expected at the next stage) | API/E2E to run AC-006 |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Root cause removed. REQ-004 branches untouched. REC-001 race guarded | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut; no fallback | — | — |
| 10 | Cleanup Completeness | 9.5 | Singleton, unconditional cache and captured fields all removed. Docs synced | — | — |

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

The primary pass recipient from the handoff rules (normally `/api_e2e_engineer`), with an informational notice to `/implementation_engineer`.

## Residual Risks

- AC-006 (live multi-image preview with a real runtime) and ASM-001 (no frontend change needed) remain to be confirmed by API/E2E.
- 24 pre-existing base failures are unchanged (per the handoff). I confirmed the historical team-member integration case on base.
- RSK-001: frontend "deleted or moved" wording is out of scope.

## API/E2E Failure-Origin Review (Round 2, CRR-002)

### Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-002`
- Review Scope: `N/A` (failure-origin round). The round-1 implementation review, its scorecard and its findings above remain authoritative for the server source.
- Trigger: API/E2E `Fail`, `API-REV-001` round 1, from `/api_e2e_engineer`
- Coverage investigation reviewed: `<T>/api-e2e-coverage-investigation.md`
- Execution coverage report reviewed: `<T>/api-e2e-execution-coverage-report.md`
- API/E2E revision record reviewed: `<T>/api-e2e-revision-record.md` (API-REV-001)
- Failing scenario IDs:
  - B-003: SCN-002, Team member, reload of an active run
  - B-004: SCN-003 UI side, Team member, historical run
- Execution mode: headless Chromium against a test-owned stack (worktree `dist/app.js` + `nuxt dev` + fake AGY CLI). Launcher: `<T>/api-e2e-evidence/browser/launch.mjs`.
- Failure evidence:
  - `<T>/api-e2e-evidence/browser/12-team-after-reload.png`
  - `<T>/api-e2e-evidence/browser/13-team-historical-member-empty.png`
  - the curl output in `api-e2e-test-case-ledger.md`: the server returns 3 entries, and REST returns 200 for each
- Classification carried: `Medium` / `High` (unchanged)

### Does the failing scenario still represent approved behavior?

- SCN-002 ("User reopening a run … Artifacts tab hydration") and SCN-003 are approved `Supported Normal Scenario`s. Their wording does not exclude Team members, and AC-001 explicitly names Team-member runs. `docs/modules/agent_artifacts.md` says "Hydrate active and historical Agent Artifact rows through `getRunFileChanges(runId)`" and "Team-member produced artifacts remain scoped to the producing member run id".
- However, the approved scope is server-only. The UI outcome rested on the open assumption ASM-001 ("frontend does not need changes once the server returns correct data"), which was to be validated by AC-006. All written acceptance criteria (AC-001..AC-006) pass.
- So the scenario is supported, and the user trigger is real: reloading the UI or reselecting a Team member are ordinary actions. But the intended scope for the frontend part was never approved. That is an authority gap, not an implementation contradiction.

### Origin analysis

| Check | Evidence | Result |
| --- | --- | --- |
| Server returns correct data for the failing scenarios | Ledger curl: `getRunFileChanges(content_creator_…)` returns 3 available entries; REST returns 200 image/png ×3. E-002 and E-004 durable E2E pass | Server correct |
| Frontend Team-member hydration path exists | `GetRunFileChanges` is referenced only by `services/runHydration/runContextHydrationService.ts`, called from `services/runOpen/agentRunOpenCoordinator.ts`. There are no references in `teamRunOpenCoordinator.ts`, `teamMemberInspectionCoordinator.ts`, `teamRunContextHydrationService.ts`, `teamMemberProjectionHydrationService.ts` or `teamRunHydrationCommit.ts`. Team-member rows come only from the live `fileChangeHandler.ts` stream | Missing (reviewer-verified grep) |
| Introduced by this ticket | `git diff --stat 5c74fed71 HEAD -- autobyteus-web` is empty. Frontend hydration has been agent-only since `544f32c48` | Pre-existing |
| Implementation defect in reviewed source | The server change behaves per REQ-001..REQ-004 on every tested boundary (E-001..E-004, I-001, B-001, B-002). Against base `src`, E2E reproduces the user's 404 | None |
| Earlier source-review gap | The frontend was outside the approved scope and the reviewed diff. ASM-001 was explicitly deferred to API/E2E validation. The gap was not reasonably detectable in source review, and it is not a review defect | No review gap |
| Invalid/stale test or environment | The browser steps follow real user actions (reload, reselect member, open Artifacts) on a real stack. The server-side evidence is consistent | Valid test |

### Candidate gate (failure-origin)

| Candidate ID | Observation | Scenario | Disposition | Reason |
| --- | --- | --- | --- | --- |
| FO-CAND-001 | Team-member Artifacts list is empty after a reload or for a historical run while the server is correct | SCN-002 / SCN-003 (Team member); user reload / reopen | Promote, as a `Requirement Gap`, not as a source defect | Supported scenario with real evidence. The frontend fix is outside the approved server-only scope, and ASM-001 is disproven. Scope needs an owner decision and approval |
| FO-CAND-002 | Pre-existing integration test "hydrates historical AutoByteus team-member file changes" fails | SCN-003 | Hold for Evidence (out of scope of this failure) | Fails on base. E-004 suggests a stale seed fixture. Not part of this failure classification; noted for the solution owner |

### Classification and routing

- Failure origin: a pre-existing frontend gap, outside the approved scope. It disproves assumption ASM-001.
- Classification: `Requirement Gap` → `/solution_designer`
- Decision needed from the solution owner, with user approval as required:
  - either extend this ticket with frontend Team-member artifact hydration (via `getRunFileChanges(memberRunId)` on Team-run open or member inspection), with the corresponding design revision, or
  - split it into a follow-up ticket and amend ASM-001 and SCN-002/SCN-003 to scope this ticket to the server and live UI.
- No implementation-owned correction is required for the reviewed server source. The round-1 Pass stands for that scope.
- Later stages still required:
  - After the gap is resolved, rerun API/E2E for the changed scope.
  - A proportional test-code review of the durable test changes is still owed after a passing API/E2E: the new `agy-native-image-multi-artifact-preview.e2e.test.ts`, plus the updated `agy-failure-cli.mjs` and `run-file-changes-api.integration.test.ts`, which are currently uncommitted.

## Implementation Review Round 3 (CRR-003) — Targeted Delta Review

### Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-003`
- Trigger: IR-002 from `/implementation_engineer`, following SR-002 and ARCH-REV-002 (Pass)
- Relevant revision IDs: SR-002, ARCH-REV-002, IR-002, API-REV-001
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence:
  - `git diff 061d4698b HEAD -- autobyteus-server-ts/src autobyteus-web` is empty.
  - The only new commit is `20258294c`, which touches only `implementation-handoff.md` and `implementation-revision-record.md`.
  - The uncommitted test changes in the working tree belong to API/E2E. They will get the separate proportional test-code review, not this source review.
  - The data-flow spine, interfaces and shared shapes are untouched.

### Behavior basis recheck under SR-002

- SR-002 has explicit user approval (requirements-doc, 2026-10-06: "agreed. but lets finish this current bug ticket first…"). Option 2 was chosen: Team-member UI hydration is split into the next ticket.
- The narrowing is recorded in four places:
  - SCN-002 and SCN-003 are narrowed for the Team-member UI.
  - AC-003 and AC-004 now cover the server API for any run plus the standalone UI.
  - ASM-001 is scoped.
  - Out Of Scope records the follow-up.
- The design is unchanged (SR-001 content), and ARCH-REV-002 passed.
- BEH-001..BEH-004 remain `Confirmed` against the unchanged source.
- FO-CAND-001 is resolved upstream: the requirement was narrowed and the follow-up recorded. No source action is implied.
- Amended AC-003 and AC-004 map onto the existing evidence:
  - AC-003: the reader regressions for an active Team member and a standalone run, plus the integration REST/GraphQL regression.
  - AC-004: the inactive branches, which are unchanged. API/E2E E-004 already showed the historical Team-member API path.
- The Supported Product Scenario Gate still passes. There are no new candidates.

### Result

- Structural checks, source audit, legacy verdict and scorecard are carried forward unchanged from round 1. The source is identical: 9.4/10, every category ≥ 9.2.
- Findings: none.

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, Targeted Delta Review, CRR-003)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (SR-002 basis)
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10 (carried forward; source unchanged since CRR-001)
- Failure Origin: N/A. The CRR-002 Requirement Gap was resolved upstream by SR-002.
- Recommended Recipient: `/api_e2e_engineer` (primary), `/implementation_engineer` (informational)
- Notes:
  - API/E2E should re-validate against the amended AC-003 and AC-004.
  - The proportional test-code review of the API/E2E durable test changes is still pending after a passing API/E2E. Those changes are the new `agy-native-image-multi-artifact-preview.e2e.test.ts` and the updated `agy-failure-cli.mjs` and `run-file-changes-api.integration.test.ts`.
