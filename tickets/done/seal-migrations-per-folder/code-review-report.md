# Code Review Report

Ticket `seal-migrations-per-folder` (autobyteus-280). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/seal-migrations-per-folder`, branch `codex/seal-migrations-per-folder`, base `origin/personal` `27f2d2f72d`, code reviewed at `9b013fcc09` (round 2; handoff `706e532a0c`). Round 1 reviewed `8b091176bf`.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-002; REQ-001..REQ-011, AC-001..AC-007, DEC-001..DEC-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited by the design; not re-audited)
- Solution Revision Record Reviewed As Context: via the design spec (SR-001..SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, including DI-001)
- Supplemental Task Artifacts Reviewed As Context: `frozen-layer-record.md`, `release-notes.md`, `follow-ups.md` (FU-001)
- Relevant Solution Revision IDs: SR-001..SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass; ARCH-REV-003 after DI-001)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001..ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round 2): `git diff 8b091176bf 9b013fcc09` changes six code files, all within CR-001 and CR-002:
  - the boundary test's package rule and its negative case;
  - a new frozen file holding the two contract types;
  - the two frozen files repointed to it;
  - the 205 migration's session sources;
  - one new 205 test.

  No spine, interface or data shape changed outside these findings. Round-1 evidence for every other check carries forward.
- Trigger: implementation handoff IR-002 (CRR-001 Local Fixes) from `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: 1 (`CRR-001`, Fail, CR-001 and CR-002)
- Latest Authoritative Round: 2
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. 386 files changed. Released migrations are rewritten internally, a startup gate changes, shared readiness is renamed across 11 production files, and code moves across packages. No correction.

## Review Scope

- **Changed implementation and behavior reviewed:**
  - **Production side:** both startup hosts; `startup/app-data-capability-readiness.ts`; `TokenUsageCapability`; the custom-provider gate in `CustomLlmProviderStore` and `custom-llm-provider-availability.ts`; and the GraphQL retry. Every caller of the store was traced for its pending outcome.
  - **Contract:** `AppDataCapability`, `holdsBackCapabilities`, `runner.capabilityReadiness()`, and the three ports in `domain/`. The registry wiring was read in full.
  - **Enforcement:** `tests/architecture/app-data-migration-boundaries.test.ts`, read in full.
  - **The 205 same-ID repair:** M1 sources and the M4 guard, read in full in the diff.
  - **Frozen layer:** a mechanical check that each `frozen/server/**` and `frozen/autobyteus-ts/**` file is a line subset of its source at `27f2d2f72d`, apart from imports and comments.
  - **Tests:** the test-script filters and test-file counts; the IMP-04 assertion record; a spot check of the least-similar moved test (the 205 suite).
- **Explicit exclusions:**
  - a line-by-line read of all 31 migration folders. Their moves are repointed imports, verified by typecheck, the boundary test, IMP-04 (no lost assertion) and the frozen subset check;
  - checks were not rerun. IMP-01..IMP-07 ran on `8b091176bf`, and the later commits change only ticket documents.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`
- Design-spec behavior map verified against the implementation: `Yes`, with one deviation (BEH-004, CR-002)
- Design review report and round confirmed: ARCH-REV-003 (DI-001 accepted); MP-002 (the improver session file as a source)
- Behavior-basis status: `Confirmed` for BEH-001..003 and BEH-005; BEH-004 has a deviation from the approved text (CR-002)
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none. REQ-008's list is explicit.

| Behavior ID | Status | Implementation Path And Evidence | Notes |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Registry wires the 31 folders. The frozen copies differ from their sources only by the 7 edits `frozen-layer-record.md` lists (my subset check). No test deleted; base 815 unit / 100 integration files against 818 / 96 plus 4 migration-integration files now. IMP-04 shows no migration assertion lost | — |
| BEH-002 | Confirmed | `capabilityReadiness()`: ready if and only if every holder is `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS`, the same rule as the old G-2 status check. `applyCapabilityReadiness` runs after `runPending()` in both hosts (`server-runtime.ts:194`) and after a non-failed retry. A current-schema failure is still fatal (`server-runtime.ts:161-170`). Codes unchanged | — |
| BEH-003 | Confirmed | `CustomLlmProviderStore`: `listProviders`, `createProvider` and `deleteProvider` assert readiness, and `getProviderById` goes through `listProviders`. Callers traced: <ul><li>model catalog `.catch(() => [])`;</li><li>Settings read `listCustomProvidersForRead` → `[]`;</li><li>create, through `assertProviderNameAvailable`, refuses with the code;</li><li>token-usage display lookups fall back on failure;</li><li>model availability and runtime sync propagate the code.</li></ul> No production startup step reads the store unguarded | — |
| BEH-004 | **Deviation** | M1 now takes helper-run ids from both session kinds, `improver_session.json` (`currentImproverRunId` / `priorImproverRunIds`) **and** `evolver_session.json` (`currentEvolverRunId` / `priorEvolverRunIds`) | CR-002 |
| BEH-005 | Confirmed | Guideline written by the Solution Designer; the code matches its layout | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface / Event | Shape | Forward Path / Lifecycle | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SC-1 | BEH-001, REQ-007 | Operational | App startup | Upgrade start runs pending migrations | Runner | Normal | DS-001 / DS-001b | Same outputs as before | requirements UC-001 | Supported Normal Scenario | Use |
| SC-2 | BEH-002/003, REQ-006 | System | Startup; Settings; run start | A gated feature while its migration is pending | Hosts, store, token usage | Normal | DS-001, DS-002 | Refuse with the codes; server starts | requirements UC-002 | Supported Normal Scenario | Use |
| SC-3 | BEH-004, REQ-008 | Operational | App startup | 205 runs on an install that has not run it yet (upgrading from before its release, or pending / failed) | Runner | Normal | 205 M1..M6 | Deletes only what REQ-008 lists | REQ-008; the design's "deletes less, never more" decision; released session shapes (`3e98a3f314`, `97de8f6a9e`) | Supported Normal Scenario | Use |
| C-1 | REQ-003, REQ-005 | Contract | — | The migration area imports no production or workspace package, enforced by the test | Code and test | — | — | — | requirements; design DS-004 and Dependency Rules | Governing contract | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / Contract | Trigger | Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-01 | The boundary test's `WORKSPACE_PACKAGE = /^autobyteus(?:-[a-z-]+)?(?:\/\|$)/` does not match the `@autobyteus/*` scoped workspace packages. Two frozen files import `@autobyteus/application-sdk-contracts` (`workspace:*`): `frozen/server/application-orchestration/domain/models.ts:1` and `.../application-execution-producer-projector.ts:4`, both type-only | C-1 | — | Frozen "released" types re-export the live contract types, so a change to that package changes what the frozen run-metadata store type-checks against, the coupling REQ-003 removes. The test would also pass a new value import from any `@autobyteus/*` package, so REQ-005 ("fails on any import that breaks REQ-003") does not hold for that family | `grep` of the migration area's non-relative imports (only these two are `@autobyteus/*`); `package.json:28,30,31` | Promote | This ticket | **CR-001** |
| CAND-02 | 205 M1 uses `evolver_session.json` as a helper-run source | SC-3 | Upgrade of an install with self-evolution session folders whose named evolver runs still exist and are not named by an evolution record | M1 adds the run, M2 removes its row, M3 deletes its folder. The released 205 kept such a run (its only other source was `server_helper`, which self-evolution-era runs predate). So the repair deletes more, not less. Self-evolution sessions exist in real data (205's F-4: 4 of them), and their runs may be runs of the kept Skill Self-Evolver | code (`collectSessions` uses `SESSION_FOLDERS` for both kinds); REQ-008 lists "the improver session files"; MP-002 covers `improver_session.json` only; design § Persisted Data: "it deletes less, never more". The fixture's F-4 session names `EVOLVER_RUNS[1]`, which a record already names, so the widening is not visible in the tests | Promote | This ticket | **CR-002** |
| CAND-03 | `CustomLlmProviderStore` gate before `runPending()` (`markCapabilitiesPending`) | SC-2 | — | The readable-identity migration uses its frozen store, not the gated production store, so the gate cannot block the migration itself | boundary test; registry | Reject | — | Correct |
| CAND-04 | `applyCapabilityReadiness` could overwrite a `CRITICAL_CURRENT_SCHEMA_FAILURE` | SC-2 | — | A schema failure exits through `fatalAfterPrerequisiteUnwind` before migrations run (`server-runtime.ts:161-170`); the old code had the same order | code read | Reject | — | Not reachable |
| CAND-05 | The Org flat-families migration gets the live `config` object while the context-file migration gets a getter | — | — | The Org one declares a structural port `{ getBaseUrl(): string }` (`…-app-data-migration.ts:58`), so the shape is narrow | code read | Reject | — | A matter of style |
| CAND-06 | The registry's `liveRunHistoryCatalogs.collaborationRunHistoryChanged(…, "agent_team")` replaces the base's `resetTeamRunHistoryCatalogState` | SC-1 | — | `resetTeamRunHistoryCatalogState` is exactly `resetCollaborationRunHistoryCatalogState(memoryDir, "agent_team")` (`team-run-history-catalog-service.ts:24-26`) | code read | Reject | — | Equivalent |
| CAND-07 | Frozen layer of 14,336 lines, above the 7,000–12,000 estimate | — | — | Copies are line subsets of their sources (check above); the size is a cost, not a defect, and the design marked the estimate unverified | `frozen-layer-record.md`; subset check | Reject | — | Recorded as a residual |
| CAND-08 | `test:unit --exclude "**/*.integration.test.ts"` and `test:integration … .integration.test.ts` | — | — | No `*.integration.test.ts` exists under `tests/unit` or elsewhere outside `tests/integration` and `tests/app-data-migrations`, so no test changes suite | `find` | Reject | — | Correct; the handoff names the naming rule |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Boundary issue resolved by the seal; both hosts traced (Principle 1) | — |
| Matches approved supplemental artifacts | Pass | `frozen-layer-record.md` matches the code exactly (subset check: the 7 listed edits, nothing else) | — |
| Data-flow spine clarity and preservation | Pass | DS-001/001b call order as designed; DS-003 generic | — |
| Ownership boundary preservation | Pass (round 2) | CR-001 resolved: the rule covers `@autobyteus/*`, the negative case proves it, and no `@autobyteus/` import remains in the migration area | — |
| Off-spine concern clarity | Pass | Ports in `domain/`, wired by the registry | — |
| Existing capability reuse | Pass | Runner `listRecords`; architecture-test pattern | — |
| Reusable owned structures | Pass | Code shared by several migrations is in `frozen/`; no folder imports another | — |
| Shared-structure tightness | Pass | Closed capability union; narrow ports | — |
| Repeated coordination ownership | Pass | One readiness owner used by three paths (AR-004) | — |
| Empty indirection | Pass | — | — |
| Separation of concerns / file responsibility | Pass | — | — |
| Ownership-driven dependency | Pass (round 2) | CR-001 resolved | — |
| Authoritative Boundary Rule | Pass | Production imports only the contract (test plus typecheck) | — |
| File placement | Pass | `migrations/<name>/`, `frozen/server/<path>`, `frozen/autobyteus-ts/<path>`; tests in `tests/app-data-migrations/<name>/` | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | `capabilityReadiness()` keyed by a closed union; no migration id in production | — |
| Naming | Pass | — | — |
| No unjustified duplication | Pass | Frozen copies are the approved duplication (DEC-001) | — |
| Patch-on-patch control | Pass | — | — |
| Dead code removed in touched files | Pass | The D-8 bridge, the warning, the special case, the old readiness state and the exception list are removed; migration-only production modules are moved into `frozen/` | — |
| Test scenarios and assertions clear | Pass | Capability readiness and host gate tests; the 205 suite gains 11 assertions | — |
| Fixtures reusable | Pass | The 205 fixture module gains `session` and `writeRun` | — |
| No stale or compatibility-only tests | Pass | — | — |
| API/E2E readiness | Pass | The handoff's hints: a real startup with a failing readable-identity or token-usage migration, then a retry | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `frozen/autobyteus-ts/memory/migration/native-working-context-snapshot-v5-converter.ts` | 497 (in the library) | 497 | Pass | moved | Pass | Pass | — | — |
| `agent-execution/runtime/general-process-run-supervisor.ts` | 491 | 491 | Pass | 4 (import rename) | Pass | Pass | — | — |
| `frozen/released-run-package-shapes/released-task-agent-own-files-with-origin.ts` | 479 | 479 | Pass | moved | Pass | Pass | — | — |
| `migrations/team-run-history-index-v2/team-run-history-index-v2-migration.ts` | ~480 | 478 | Pass | moved, port | Pass | Pass | — | — |
| `app-data-migration-registry.ts` | — | 197 | Pass | over 220 (repointed imports and wiring) | Pass: wiring only | Pass | — | — |
| `server-runtime.ts`, `start-standalone-application-host.ts` | larger | 226 / 353 | Pass | shrink | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in touched files | Pass | — |
| Approved persisted-data transition decision followed | Pass (round 2) | CR-002 resolved: run ids come only from improver session files; a run only an evolver session names is kept (new test) |
| No version-specific runtime fallback | Pass | Old shapes only in `frozen/` |
| Transition mechanics match the reviewed design | Pass (round 2) | M1 sources as REQ-008 lists; the M4 guard and the preservation of unreadable files as designed |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done. The guideline is the Solution Designer's; module docs were updated for the moved files.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-002 | Confirmed for `improver_session.json` | The implementation extends the same treatment to `evolver_session.json`, which MP-002 and REQ-008 do not cover (CR-002) |

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.45
- Overall score (`/100`): 94.5
- Score calculation note: simple average; the decision follows the findings and the per-category floor.

| Priority | Category | Score | Why | Weak / Holding Down | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Startup, gate and retry spines are as designed, in both hosts | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | The seal is enforced for relative imports, `autobyteus-ts` and `@autobyteus/*` (round 2) | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Closed capability union; narrow ports | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | One folder per migration; frozen paths mirror their sources | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | — | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | — | — | — |
| 7 | API/E2E Readiness | 9.0 | Strong unit and e2e evidence | Real-startup gate scenarios left to API/E2E | As the handoff lists |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Frozen copies are faithful; gates match the old rules; the 205 repair deletes only what REQ-008 lists (round 2) | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | All migration-id reads gone from production | — | — |
| 10 | Cleanup Completeness | 9.5 | — | — | — |

## Findings

No open findings (round 2).

### CR-001 — **Resolved (round 2)**: the boundary test does not cover `@autobyteus/*` workspace packages, and two frozen files import one

- Resolution (`9b013fcc09`):
  - `WORKSPACE_PACKAGE` is now `^(?:autobyteus(?:-[a-z-]+)?|@autobyteus\/[a-z0-9-]+)(?:\/|$)`, and the negative case imports `@autobyteus/application-sdk-contracts` and expects the violation.
  - `ApplicationExecutionProducer` and `ApplicationExecutionContext` are frozen in `frozen/application-sdk-contracts/application-agent-bindings.ts`, verbatim against `27f2d2f72d` `autobyteus-application-sdk-contracts/src/application-agent-bindings.ts:69-78`.
  - The record is updated, and `grep -rn '@autobyteus/' src/app-data-migrations` has no match.
  - IMP-01 (r2) passes with 0 errors, and IMP-02 (r2) passes 3/3.
- Severity (round 1): Medium. A bounded `Local Fix`.
- Scope: this ticket (REQ-003, REQ-005, AC-001; design DS-004 and Dependency Rules: "`autobyteus-ts` is not allowed"; the test names its own pattern `WORKSPACE_PACKAGE`).
- Where:
  - `tests/architecture/app-data-migration-boundaries.test.ts` (`WORKSPACE_PACKAGE`);
  - `src/app-data-migrations/frozen/server/application-orchestration/domain/models.ts:1`;
  - `src/app-data-migrations/frozen/server/application-orchestration/domain/application-execution-producer-projector.ts:1-4`.
- Evidence:
  - `@autobyteus/application-sdk-contracts` is `workspace:*` (`autobyteus-server-ts/package.json:28`), with `@autobyteus/collaboration-stream-contracts` and `@autobyteus/team-stream-contracts` beside it.
  - The test's pattern matches only `autobyteus` and `autobyteus-*` names.
  - The two frozen files import `ApplicationExecutionContext` / `ApplicationExecutionProducer` from the live package (type-only). `frozen/server/run-history/store/agent-run-metadata-types.ts` and `agent-run-metadata-store.ts` use them.
- Required action:
  1. Extend the workspace-package rule to the `@autobyteus/` scope (for example `^(?:@autobyteus\/|autobyteus(?:-[a-z-]+)?(?:\/|$))`), and add an `@autobyteus/*` import to the negative case.
  2. Freeze the two types: copy their definitions as of `27f2d2f72d` into the frozen layer, for example `frozen/server/application-orchestration/domain/` or a frozen copy of the contract file under `frozen/`, recorded in `frozen-layer-record.md`.
  3. Rerun IMP-01 and IMP-02 (and the unit suite if anything else moves).

### CR-002 — **Resolved (round 2)**: the 205 repair deletes runs named only by an evolver session file, beyond REQ-008

- Resolution (`9b013fcc09`):
  - `SESSION_FOLDERS` gives only the improver session its run-id fields; an evolver session names none.
  - M4 still handles both folder kinds: a readable folder goes, and an unreadable one is preserved.
  - New test: `skill_evolver_6666`, named only by an evolver session, survives byte-identical with its history row and no `helper-run:` item, while the session folder goes. The engineer reports it fails against IR-001.
  - IMP-08 (r2): every migration suite, the contract tests and the 205 startup e2e, 67 files and 554 tests, pass.
- Severity (round 1): Medium. A bounded `Local Fix`.
- Scope: this ticket (REQ-008; the design's persisted-data decision "it deletes less, never more"; MP-002).
- Where: `src/app-data-migrations/migrations/remove-skill-improvement-data/remove-skill-improvement-data-migration.ts`. `SESSION_FOLDERS` gives both kinds a run-id field pair, and `collectSessions` adds every named id to `helperRunIds`.
- Evidence:
  - REQ-008: "identifies helper runs only by the improver agent id, the `improverRunId`/`evolverRunId` the records name, and **the improver session files**". The design § Final File Responsibility Mapping says the same, and MP-002 covers `improver_session.json`.
  - The released 205 (`27f2d2f72d`) deleted an evolver run only when a record named it or it carried `server_helper`. Self-evolution-era runs predate that field.
  - With this change, an evolver run named only by `evolver_session.json` (`currentEvolverRunId` / `priorEvolverRunIds`, the released shape in `3e98a3f314`) loses its history row (M2) and its folder (M3). Its runs may be runs of the kept Skill Self-Evolver definition.
  - The fixture's F-4 session names `EVOLVER_RUNS[1]`, which an evolution record also names, so no test shows the difference.
- Required action:
  1. Take run ids only from `improver_session.json`. Keep the M4 handling of both folder kinds: an evolver session folder whose file is readable goes; an unreadable one is preserved.
  2. Add a test: an evolver run whose folder exists, named only by an evolver session, survives with its history row.
- If the intent is to treat evolver sessions as a source too, that widens deletion of user data. It needs a requirement change through the Solution Designer, with the user's approval, not an implementation choice.

## Follow-ups

Findings outside this ticket go in the ticket's `follow-ups.md`. They do not fail the review, lower the score, or reopen implementation.

- Follow-ups this review added: None. FU-001, the implementation's, stands.

## Classification

- None (round 2 passes). Round 1: `Local Fix` CR-001 and CR-002, both resolved.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (pass); informational notification to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Guideline wording, for the Solution Designer or delivery's docs sync: the new frozen path `frozen/application-sdk-contracts/<path>` follows the code's `frozen/<package>/<path>` pattern, but the guideline names only `frozen/server/` and `frozen/autobyteus-ts/`. A one-line addition; it does not block.

- Frozen-layer size: 14,336 lines, above the estimate. Faithfulness is checked (line subsets of their sources), but a pruned member referenced dynamically would show only at run time. The unit, integration and startup e2e suites are the cover.
- The frozen in-process locks and the atomic-writer singleton are separate from production's. Cross-process `.lock` files keep exclusion. The two `ANYTIME` migrations (`team-run-execution-tree-v2`, `team-agent-memory-layout`) can be retried while production runs.
- Real-startup gate scenarios (custom-provider and token-usage migrations failing, then a retry) are API/E2E scope.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 2, Targeted Delta Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`. MP-002 holds, and the code now matches it.
- Score Summary: 9.45 / 10 (94.5 / 100); every category ≥ 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: `CRR-002`, against IR-002 @ `9b013fcc09`. CR-001 and CR-002 are resolved. Round 1: `CRR-001` against IR-001 @ `8b091176bf`. The classification Large / High is preserved.
