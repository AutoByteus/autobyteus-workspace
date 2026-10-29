# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` at SR-005 (REQ-011, AC-011, AC-012, AC-013, DEC-011, BEH-007, SCN-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (SRC-011, SRC-019, SRC-020, SRC-023, SRC-024)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-003 → SR-005)
- Design Spec Reviewed As Context: `design-spec.md` SR-005 (SR-005 Delta: rule, DS-004 spine, 10-caller inventory, examples table, verification; SR-004 Delta; classification)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-004)
- Relevant Solution Revision IDs: SR-004, SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 pass; AR-001, AR-002, IG-1, IG-2). The worktree holds uncommitted edits to it from the architecture reviewer; I read the working-tree version.
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002, Checks Run IMP-15..IMP-21)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-002 (src `47f44c3df`, docs/evidence `7daf47430`); IR-001 (`574aa0bd7`) as context
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: CRR-002
- Current Review Round: 2. Round 1 (CRR-001) was a failure-origin review; this is the first implementation-source review.
- Review Scope: `Full Review` of the IR-002 delta. The CRR-001 finding is rechecked first.
- Review Scope Evidence (round >1): CRR-001 had no source scorecard. IR-002 changes a shared validator contract and two caller interfaces (`AgentOrgRunPlanner.build`, `LaunchUsabilityResult`), so every structural check is rerun on this delta.
- Trigger: implementation complete IR-002 (Medium / High → source review)
- Prior Review Round Reviewed: CRR-001 (API/E2E failure-origin review, Design Impact CR-FO-001)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Report / API/E2E Revision Record: `api-e2e-*.md` used as context for API-REV-001
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed: N/A
- Failing Scenario IDs / Commands / Evidence: N/A (implementation review)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High` (shared server validator contract changed for every runtime and every save/edit/launch path)
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. 5 src files, +81/−49, all inside existing owners; the contract change justifies `High`.

## Review Scope

- Changed implementation and behavior reviewed (IR-002, `git diff 1425eb3ec 47f44c3df`):
  - `llm-management/services/model-config-schema-validation.ts`: undeclared top-level keys are left out of the canonical config; a null schema gives `null`; a config whose keys were all left out gives `null`.
  - `agent-org-execution/services/agent-org-run-service.ts` and `agent-org-run-planner.ts`: Org launch builds the tree from the canonical plan (caller #6, IG-1).
  - `launch-preferences/launch-usability-check.ts` and `agent-collaboration/collaborators/collaborator-launch-resolver.ts`: canonical candidate and inherited launches (caller #7, IG-2).
  - Docs: `run_history.md`, `llm_management.md`, `autobyteus-web/docs/settings.md`.
  - Tests: the new e2e `autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts`, the new unit test `launch-usability-check.test.ts`, the validator unit cases, 4 updated e2e suites, the 8 fakes changed to echo input, and the web probe DLP-003.
- Files / areas reviewed: the files above, plus callers #1–#10 at their call sites. `rg "\.validate\(|\.validateMany\("` in `src` gives 10 model-selection call sites, which matches the inventory. I read the code of caller #4 (`agent-org-run-manager.ts` L290-321) and caller #10 (`standalone-agent-run-root-manager.ts` L323-345).
- Explicit exclusions:
  - IR-001 source (SR-002 Claude effort work, `574aa0bd7`). It was classified Medium / Low under SR-002, went the direct route, and API/E2E validated it in API-REV-001 (API-01/02/03/05/07/07b/08 passed). IR-002 does not touch autobyteus-ts, the web source or the catalog.
  - The paths that do not go through the validator (resume, new standalone launch). The design records them, and FU-004 covers them.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: DEC-011 (B), chosen by the user: keys the current schema does not declare are left out of saved model settings instead of blocking the save, and no stored data is rewritten. AC-012 covers the stopped-run edit for agent, team and Org runs, including the Org workspace-only edit. AC-013 covers launches from stored launch configurations.
- Design-spec behavior map verified against the implementation: DS-004 `Caller -> RunModelSelectionService.validate(Many) -> validateModelConfigSchema -> validation.selection -> caller stores/launches selection` matches the code. Callers #6 and #7 now use the selection. The other 8 already did, which I confirmed at the call sites I read and through the inventory.
- Design review report and round confirmed: ARCH-REV-002 pass. AR-001 (canonical-only callers) and AR-002 (stale cumulative wording) are applied.
- Behavior-basis status: `Confirmed`

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-007 / AC-012 (a) agent and team stopped-run edit | Confirmed | `updateStoppedAgentRunModelConfig` → updater stores `validation.selection` (caller #1); team (caller #2) stores `result.selection`. The validator leaves out `thinking_display`. IMP-17 cases 1–2: `UPDATED`, and the resumed config is `{reasoning_effort:"high"}`. | — |
| BEH-007 / AC-012 (b) Org workspace-only edit and Org model edit | Confirmed | `agent-org-run-manager.ts` L290-321: the untouched scopes are validated (now valid) but not normalized (L313). Patched scopes take `validation.selection`. IMP-17 case 3. | — |
| BEH-007 / AC-013 (a) Org launch | Confirmed | `validateCompleteConfiguration` returns the canonical placements, and `planner.build({plan})` builds from them. IMP-17 case 4 asserts no stale key in the tree. | — |
| BEH-007 / AC-013 (b) delegated copy from a stored default | Confirmed | `LaunchUsabilityCheck.check` → `canonicalLaunch(launch, result.selection)` → `CollaboratorLaunchResolver` launches `verdict.launch`. The inherited layer uses `verdicts.inherited.launch` when it is usable. IMP-17 case 5 and the unit test. | — |
| AC-012/013 exception: an invalid declared value is still refused | Confirmed | Declared keys still go through `validateValue`, and the errors are unchanged. Unit cases `ultra` and updated e2e refusals. | — |
| BEH-007 / AC-011 resume | Confirmed (unchanged) | Does not go through the validator. Rerun in IMP-06. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-005 edit | REQ-011, AC-012 | User | User | Change the settings of a stopped run created before this change | Run settings → Save (agent / team / Org; Org workspace-only) | Normal | as above | `UPDATED`, saved without the key | SRC-019 real data; API-REV-001 reproduction | Supported Normal Scenario | Use |
| SCN-005 launch | REQ-011, AC-013 | User / System | User; delegation | Launch an Org, or delegate to an agent whose stored launch preference predates the change | Org launch; `delegate_task` collaborator launch | Normal | as above | Launch succeeds; the launched config has no key | REQ-011 "launch configs"; ARCH-REV-001 AR-001 | Supported Normal Scenario | Use |
| RISK-6 | DEC-011, design SR-004 | Contract | — | A non-null config on a model without a schema (e.g. AGY) now canonicalizes to `null` instead of being refused | any validated path | Normal | validator | Usable with `null` settings | Design SR-004 decision, examples table row 4 | Supported Normal Scenario (decided behavior) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Trigger → Path → Consequence | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| C-1 | Empty-config rule: a submitted `{}` gives `{}`, but a config whose keys were all left out gives `null`. The design's "as today" claim for this row is inaccurate: before this change `{}` came back as `{}`. | Design SR-005 examples table | Validator output | `model-config-schema-validation.ts` L139-141; unit `it.each` rows 3–4 | Reject | The implementation follows the design's table (row 3 → `null`) and keeps today's `{}` behavior. Both values mean "no explicit settings" to every consumer, so nothing changes in behavior. The implementation engineer raised it and a unit test pins it. Only the design's wording is off, and it is not material. |
| C-2 | Org launch keys a single `canonical` map by address across root `/`, teams and agents | Org topology contract | Address collision would mix up placements | `resolveOrg` builds team and agent addresses from distinct member `absolutePath`s; the root is `/` | Reject | Addresses are unique absolute paths, so there is no supported collision. |
| C-3 | When the inherited check fails, the raw delegator launch is still used for the Team-level recorded default and the routing hint | Collaborator launch contract | Invalid inherited launch → members refused | `collaborator-launch-resolver.ts` L118, L170-174 | Reject | Pre-existing behavior for invalid launches, and the comment documents it. Undeclared keys no longer make the check fail, so this path cannot carry a stale key through a passing check. |
| C-4 | "Launch with selection" is written three times: `canonicalLaunch`, the inline spread in the Org service, and the Org manager patch spread | Principle 11 | — | 1–2 lines each | Reject | Trivial and local. Extracting it would add a helper with no owned concern. |
| C-5 | The 8 test fakes now echo the input instead of returning a fixed selection | Test realism | — | Unit diffs | Reject (positive) | Echoing matches the real validator when every key is declared. The fixed selection was a latent fake inaccuracy. |
| C-6 | Existing tests that asserted the old reject contract were rewritten to use an invalid declared value | DEC-011 B | — | 4 e2e suites, DLP-003 | Reject (positive) | Required by the approved contract change, and they still prove the refusal path. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Missing invariant, with one owner at the validator; callers use the canonical selection | — |
| Matches approved supplemental artifacts | Pass | SR-005 caller inventory, examples table and docs list implemented | — |
| Data-flow spine clarity | Pass | DS-004 is exactly the code path; Org launch is now resolve → validate (canonical) → build, a single resolve | — |
| Ownership boundary preservation | Pass | The validator owns canonicalization; callers only choose the selection | — |
| Off-spine concern clarity | Pass | `canonicalLaunch` is a local mapper inside the usability owner | — |
| Capability reuse | Pass | Reuses `RunModelSelectionService`; no new helper | — |
| Reusable owned structures | Pass | C-4 rejected | — |
| Shared-structure tightness | Pass | `InheritedLaunchVerdict` replaces `inheritedFailure: string \| null` with a discriminated verdict that carries the launch, so one structure no longer has two meanings | — |
| Repeated coordination ownership | Pass | The rule is decided once, in the validator | — |
| Empty indirection | Pass | `planner.build` no longer re-resolves the configuration; the duplicate resolution is removed | — |
| Separation of concerns and file responsibility | Pass | Every change stays in its owning file | — |
| Dependency direction | Pass | `launch-usability-check` imports the `RunModelSelection` type from `llm-management/domain`, the allowed direction | — |
| Authoritative Boundary Rule | Pass | Callers depend on `RunModelSelectionValidator` only | — |
| File placement | Pass | Unchanged | — |
| Flat vs over-split | Pass | — | — |
| Interface clarity | Pass | `build({definition, plan})` takes the resolved plan explicitly; the inherited verdict is explicit | — |
| Naming / vocabulary | Pass | "canonical" is used consistently for the validated selection; `delegatorLaunch` vs `inherited` is clearer than before | — |
| No unjustified duplication | Pass | C-4 | — |
| Patch-on-patch control | Pass | SR-003's client filter was dropped, not layered on; the validator change is a clean replacement | — |
| Dead code removed | Pass | `inheritedFailure` gone (`rg` finds no hits in src or tests); the old "This model has no adjustable settings" refusal and the unknown-key error branch were removed; the duplicate resolve in `build` was removed | — |
| Test scenarios and assertions requirement-aligned | Pass | The e2e names map to AC-012 (a)/(b) and AC-013 (a)/(b), and assert the stored config and the absence of the key; the unit cases are the design's examples table; the failing-first run (IMP-21: 14 fail on the old src) | — |
| Test fixtures and helpers coherent | Pass | The new e2e reuses e2e helpers (`flattenE2eConfiguredAgentExecutions`); the fakes are now realistic | — |
| No stale or compatibility-only tests | Pass | The old reject assertions were rewritten (C-6) | — |
| API/E2E readiness | Pass | Server e2e green; rerun plan for API-04, API-06 and the Org edit path is stated | — |

## Source File Size And Structure Audit

| Source File | Lines Before | Lines After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `collaborator-launch-resolver.ts` | 325 | 329 | Pass | Pass (+4) | Pass | Pass | — | — |
| `agent-org-run-planner.ts` | 85 | 87 | Pass | Pass | Pass | Pass | — | — |
| `agent-org-run-service.ts` | 278 | 287 | Pass | Pass | Pass | Pass | — | — |
| `launch-usability-check.ts` | 191 | 207 | Pass | Pass | Pass | Pass | — | — |
| `model-config-schema-validation.ts` | 142 | 143 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Leaving out undeclared keys is a generic tolerant reader with no version or key-name branching (Principle 5) |
| No legacy retention | Pass | — |
| Dead code removed | Pass | See above |
| Persisted-data decision followed | Pass | Directly Usable, no migration; untouched Org scopes are not rewritten (AC-012 b) |
| No dual reads/writes | Pass | — |
| Transition mechanics match the design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`. Done in IR-002.
- Why: the validator contract changed.
- Files: `autobyteus-server-ts/docs/modules/llm_management.md` (contract and the caller rule), `run_history.md` (save outcomes), `autobyteus-web/docs/settings.md` (undeclared setting is left out on save; residual only in read-only views). All three match the code.

## Additional Material Premise Validation

None new. RISK-6 is a design decision (SR-004), not a new premise.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | DS-004 is implemented exactly; Org launch now resolves once | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One owner for the rule; callers only choose the selection | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | `build({plan})` and `InheritedLaunchVerdict` are explicit | `build`'s doc says the caller "may replace" selections, which is a soft contract | — |
| 4 | Separation of Concerns and File Placement | 9.5 | All changes stay in their owning files | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | The verdict type replaces a two-meaning string | Trivial three-place mapping (C-4) | — |
| 6 | Naming Quality and Local Readability | 9.4 | "canonical" is consistent | `of` helper name in the Org service is terse | Optional |
| 7 | API/E2E Readiness | 9.5 | Server e2e, failing-first and updated suites are green | Browser reruns left to API/E2E as planned | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | AC-012 and AC-013 hold; declared-key refusals are preserved; RISK-6 matches the decision | Empty-config split (C-1) is a small special case | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Generic reader, no key-name branch | — | — |
| 10 | Cleanup Completeness | 9.5 | Dead branches and fields removed; docs synced | — | — |

## Findings

None. CR-FO-001 (CRR-001) is resolved: see the CRR-002 prior-finding table.

## Follow-ups

- Follow-ups this review added: None. FU-004, which the Solution Designer recorded, covers the paths that do not go through the validator.

## Classification

N/A (Pass)

## Recommended Recipient

API/E2E (`/software_engineering_team/api_e2e_engineer`): rerun API-04 and API-06 (old-run edit) and add the Org edit path. Implementation gets an informational notification.

## Residual Risks

- RISK-6: a non-null config on a schema-less model (e.g. AGY) is now accepted as `null` instead of refused. This is decided behavior; API/E2E may want to confirm the user-visible effect on one such model.
- The browser edit paths (agent, team, Org) are proven at the server level only (IMP-17). The API/E2E reruns close this.
- I did not re-audit IR-001 source here (see Explicit exclusions).

## Latest Authoritative Result

- Review Decision: Pass
- Review Entry Point: Implementation Review
- Supported Product Scenario Gate: Pass
- Material-Premise Gate: Pass
- Score Summary: 9.5 / 10; every category is ≥ 9.4
- Failure Origin: N/A
- Recommended Recipient: API/E2E
- Notes: CRR-002 resolves CR-FO-001.
