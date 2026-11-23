# Code Review Report — autobyteus-53 (`stopped-run-unavailable-model`)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-006)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (A-01..A-17)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-006, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `probes/autobyteus-53-repro.test.ts` (disposable reproduction; superseded by the permanent unit cases)
- Relevant Solution Revision IDs: SR-006
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, `Pass`)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: IR-001 handoff from `/implementation_engineer` (commit `14c28a91f9`, base `1f761bc8db`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E / Delivery records: N/A (implementation review)
- Failing Scenario IDs / Commands / Evidence: N/A (see CR-001 for the reviewer-run reproduction)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none; the change stayed within the design's file mapping and owners.

## Review Scope

- Changed implementation and behavior reviewed: the continuation decision (`RunModelSelectionService.continuationFor`), options listing, the DEC-005 reference model in `selectionContextFor`, `stoppedRunHandOver`, the rewritten `applyRuntimeSelection`, the standalone, Team and Org save paths, both options paths, the three `no_session` launch validators, the marker text (DEC-008/N-4), the standalone Save message, the locale strings and `GLOSSARY.md`.
- Files / areas reviewed: the 17 changed `autobyteus-server-ts/src` files, the 2 locale files, `GLOSSARY.md`, and the changed unit/integration tests (`runtime-selection-rule.test.ts`, `run-model-selection-service.test.ts`, `team-run-model-selection-save.test.ts`, `team-run-selection-mutator.test.ts`, `runtime-switch-session-renewal.test.ts`, `standalone-stopped-run-selection-updater.test.ts` and the others in the commit).
- Explicit exclusions: activation, memory archive and notice paths (unchanged by design, DS-002).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`. The user's rule (DEC-003): equal or bigger verified capacity continues the session; smaller or unknown hands over; one reference model (DEC-005).
- Design-spec behavior map verified against the implementation: `Yes`, except the Org member save path (CR-001).
- Design review report and round confirmed: ARCH-REV-002 `Pass`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001/002 | Confirmed (standalone, Team); broken for Org members (CR-001) | `optionsWithEvidence` lists every offered model unless `handOver === "unavailable"`; `continuationFor` returns `hand_over` for a mismatch when `available`; the updater forwards `continuation` to `commitRunRuntimeSwitch` | — |
| BEH-006 | Confirmed (standalone, Team); broken for Org members (CR-001) | Same decision row | — |
| BEH-005 | Confirmed | `continuationFor`: both verified and target ≥ reference → `same_session` | — |
| BEH-003 | Confirmed for the rule; Org member saves broken (CR-001) | `selectionContextFor` reference = `pendingRuntimeSwitch.from` or the binding; `applyRuntimeSelection` two branches; the `same_session` runtime guard throws | — |
| BEH-004 | Confirmed for the rule; Org member saves broken (CR-001) | External runtime → `same_session` | — |
| DEC-006 | Confirmed | `stoppedRunHandOver`: `canSwitchRuntime` → `available`; never started → `no_session`; else `unavailable` → today's two refusals | — |
| DEC-007 | Confirmed | Team/Org default scopes and the three launch validators pass `no_session` → `same_session`; default scopes use `replaceLaunchConfig`, not the switch rule | — |
| DEC-008 / N-4 | Confirmed | `buildRuntimeSwitchBetween`: same runtime **and** a different model → "Model changed from … to …" | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001/002/005 (Org member) | BEH-001, BEH-006; REQ-005; AC-008 | User | The user | Continue a stopped Org run whose member's model is gone, or move a member to a smaller model | Org run Settings → member model → Save (`updateStoppedAgentOrgRunConfig`) | Normal | `AgentOrgRunManager.stoppedRunConfig` → `resolveAgentOrgRunSelectionTargets` → proposal → `validateMany` → normalize → `applyAgentOrgRunSelectionPatches` → write | Save accepted, hand-over pending | REQ-005 names Org members; the existing e2e `stopped-org-workspace-graphql.e2e.test.ts:133-136` saves a `CONFIGURED_AGENT` patch | Supported Normal Scenario | Use |
| BEH-003/004 (Org member) | REQ-004 preserved; AC-007 | User | The user | Any model or runtime edit of a stopped Org member (preserved since autobyteus-348) | Same | Normal | Same | Save accepted or refused for a field reason, as today | Same e2e | Supported Normal Scenario | Use |
| SCN-001/002/005 (standalone, Team member) | BEH-001, BEH-006; AC-001, AC-004, AC-005, AC-008 | User | The user | As above | Run Settings → Save | Normal | Updater / `planStoppedTeamLaunchSave` | Hand-over pending | Unit tests; code | Supported Normal Scenario | Use |
| AC-006 (a)-(d), RS-08 | BEH-003; REQ-004 | User | The user | Re-edit while a hand-over is pending | Settings → Save | Normal | Same | As specified | Requirements | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The Org save's pre-validation proposal applies targets that carry no `continuation`; `patchAgent` throws for every configured Agent target | SCN-001/002/005 (Org member), BEH-003/004 (Org member) | The user saves a model for an Org member | `agent-org-run-manager.ts:234` `applyAgentOrgRunSelectionPatches(..., modelTargets)` → `patchAgent` (`agent-org-run-config-mutator.ts:112`) throws "has no decided continuation" → the GraphQL mutation fails; nothing saved | Reviewer reproduction (CR-001 evidence) | Promote | This ticket | CR-001 |
| C-02 | Team members are always `available` (also in a peer-started Team run) | DEC-006 | — | The Team save has no runtime-switch gate today (`agent-team-run-manager.ts:337-352`), so members can already switch runtime; `available` matches it. The design states this rule (Ownership Map) and ARCH-REV-002 passed it | Code | Reject | — | Consistent with existing Team behavior |
| C-03 | `no_session` returns `same_session` before the `null`-reference check, so a runtime change on a `no_session` record would reach the rule's throw | DEC-007 | A runtime change on a never-started standalone run | The updater refuses a runtime change when `!canSwitchRuntime` before validation (`standalone-stopped-run-selection-updater.ts:131-139`); Team/Org default scopes never reach the rule | Code | Reject | — | Not reachable |
| C-04 | The `'same_session'` fallback continuation for a non-valid result in the Team and Org normalization | — | — | Non-valid results are refused before normalization (Team plan `:40-51`; Org `:256-266`) | Code | Reject | — | Unreachable typing fallback, mirrors the existing `selection` fallback |
| C-05 | Test title in `runtime-selection-rule.test.ts:52` says "continuation same_session … a pending switch stays untouched", but its second half uses `hand_over` (from the `codex` constant) | — | — | Readability of one test name | Test file | Reject (note only) | — | Non-blocking note: rename when touched |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The continuation is an explicit input decided by `RunModelSelectionService`; the rule has two branches with no runtime-equality inference | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | The probe's native cases are permanent unit cases | — |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | DS-001 for Org members breaks at the proposal step before validation (CR-001) | Fix CR-001 |
| Ownership boundary preservation and clarity | Pass | Only the selection service compares capacities; save paths state `handOver` and forward `continuation`; the rule applies it | — |
| Off-spine concern clarity | Pass | Capacity resolution and marker text stay off the main line | — |
| Existing capability/subsystem reuse check | Pass | Reuses the pending-switch field, activation, recorder and notice | — |
| Reusable owned structures check | Pass | `RunContinuation` / `RunHandOver` defined once in `run-model-selection.ts` | — |
| Shared-structure/data-model tightness check | Pass | One field each, one meaning; `currentModelIdentifier: null` read only inside the selection service | — |
| Repeated coordination ownership check | Pass | `handOver` by `scopeKind` at each tree's call site, as designed; standalone through `stoppedRunHandOver` | — |
| Empty indirection check | Pass | No new port or wrapper | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Changes sit in the owners the design mapped | — |
| Ownership-driven dependency check | Pass | `run-history/domain` → `llm-management/domain` (pure type), the direction ARCH-REV-002 passed | — |
| Visible dependencies check | Pass | No new lookups | — |
| Authoritative Boundary Rule check | Pass | Save paths use the validator boundary only | — |
| File placement check | Pass | — | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Required `handOver` on both contexts; `continuation` on the valid result; target-level `continuation` for Team/Org is the design's stated implementer's choice | — |
| Naming quality and naming-to-responsibility alignment check | Pass — deviation recorded, reason holds | `pendingRuntimeSwitch` holds a same-runtime hand-over; design deviation (Principle 15) with glossary entries added | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | The old runtime branches are replaced, not extended | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | The runtime-only branches and the "fresh because null" semantics are removed | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | No test exercises the Org manager's stopped save of a configured Agent, so IMP-02..04 could not catch CR-001. Otherwise AC-006 (a)-(d), RS-08, DEC-007, AC-009 and N-4 are asserted exactly | Add the Org member save test (CR-001) |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Old-rule pins rewritten (REQ-008); AC-009 refusal kept | — |
| API/E2E readiness for the next workflow stage | Fail | AC-008 (Org member) and the existing Org e2e fail | Fix CR-001 |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines Before (base) | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-org-execution/services/agent-org-run-manager.ts` | ~362 | 365 | Pass | Pass | Pass | Pass | CR-001 (behavior) | Fix CR-001 |
| `agent-org-execution/services/agent-org-run-service.ts` | ~320 | 324 | Pass | Pass | Pass | Pass | — | — |
| `llm-management/services/run-model-selection-service.ts` | ~175 | 195 | Pass | Pass | Pass | Pass | — | — |
| `agent-org-execution/services/agent-org-run-config-mutator.ts` | ~165 | 175 | Pass | Pass | Pass | Pass | CR-001 (throw site) | — |
| Other changed `src` files | < 210 | < 210 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration`; same-runtime pending switches read unchanged |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A beyond direct use |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: `GLOSSARY.md` already updated (continuation, model hand-over, switch marker); the native help text changed.
- Files or areas likely affected: user-facing Settings docs for the native model menu (delivery to sync-check).

## Additional Material Premise Validation (When Required)

None. ARCH-REV-002 premises are unchanged.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 8.8
- Score calculation note: simple average; the decision follows CR-001.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 8.8 | DS-001 is clear for standalone and Team | The Org path's pre-validation proposal goes through the switch rule, which now needs a decided continuation | Build the validation inputs without the switch rule |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | One decision owner, one rule, callers state capability only | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | Required `handOver`; `continuation` only on the valid result; GraphQL unchanged | Target-level `continuation?` is optional with a runtime throw, which is how CR-001 surfaced at run time rather than compile time | Keep the throw; make every caller that reaches the rule have a decided continuation |
| `4` | `Separation of Concerns and File Placement` | 9.4 | Changes in the mapped owners | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | Two tight unions, one meaning each | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Clear doc comments tied to REQ/DEC IDs; glossary updated | One misleading test title (C-05) | Rename when touched |
| `7` | `API/E2E Readiness` | 7.5 | Standalone and Team ready | Org member Save fails; the existing Org e2e fails | Fix CR-001 and rerun that e2e |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 7.0 | Rule, decision table, reference model, marker and messages correct and tested | Every Org member model save fails (CR-001), a regression of preserved BEH-003/BEH-004 for Org members and a miss of AC-008 | Fix CR-001 with a test |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | No wrappers; direct use of stored data | — | — |
| `10` | `Cleanup Completeness` | 9.4 | Old branches and refusals removed | — | — |

## Findings

### CR-001 — Every Org member model save fails: the pre-validation proposal applies targets without a continuation (High, Local Fix)

- Affected behavior: REQ-005 / AC-008 (Org members), and preserved BEH-003/BEH-004 for Org members (any stopped Org member's model or runtime edit since autobyteus-348).
- Where: `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts:234`
  `const proposed = applyAgentOrgRunSelectionPatches(applyAgentOrgTeamWorkspacePatches(tree, normalizedWorkspaces), modelTargets);`
  runs **before** validation, with `modelTargets` from `resolveAgentOrgRunSelectionTargets`, which carry no `continuation`. The new `patchAgent` (`agent-org-run-config-mutator.ts:108-114`) throws `Configured AgentOrg scope '…' has no decided continuation.` for every configured Agent target. The call is not inside a `try`, so the mutation fails with an internal error and nothing is saved. Only the Org's own default and mounted Team default scopes still save.
- Why the checks missed it: no unit or integration test drives `AgentOrgRunManager`'s stopped save for a `CONFIGURED_AGENT`; the Org tests changed in this commit cover options and the launch validator only.
- Reviewer reproduction:
  1. `pnpm -C autobyteus-server-ts build`, then `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts --no-watch`: **fails** at `:135` (the `CONFIGURED_AGENT` patch for `/team/lead`) with `TEST_GRAPHQL_REQUEST_FAILED`, where it expects a `VALIDATION_FAILED` result.
  2. With line 234 temporarily given a continuation (probe only), rebuilt: the same e2e **passes** 1/1. The source was restored with `git checkout` and the server rebuilt at `14c28a91f9`; `git status` shows no source change.
- Required action:
  1. Make the Org save's validation inputs independent of the switch rule. The proposal only needs each scope's proposed launch configuration (runtime, model, settings, workspace), which does not depend on the continuation. For example, derive the proposed launch per scope from the patch and the workspace patches without `applySelectionToConfiguredMember`, or split the mutator's launch-only projection from the rule application. Do not feed a placeholder continuation into the rule.
  2. Keep the `patchAgent` throw for the final write, so a missing decision still fails loudly.
  3. Add a unit test of `AgentOrgRunManager`'s stopped save for an Org member: a native member on a gone or smaller model saves with a pending same-runtime hand-over (`from` = the old binding), and a member's equal-or-bigger native edit stays in the same session. Include a member inside a mounted Team.
  4. Rerun the server typecheck, the affected unit suites, `pnpm -C autobyteus-server-ts build` and `stopped-org-workspace-graphql.e2e.test.ts`. Update the handoff and the implementation revision record (IR-002).

Non-blocking note: the test title at `runtime-selection-rule.test.ts:52` describes both halves as `same_session`, but the second half is a `hand_over` edit while a switch is pending (C-05).

## Follow-ups

- Follow-ups this review added: None

## Classification

- `Local Fix` (implementation): one bounded defect in the Org save path plus its missing test. The design and requirements stand.

## Recommended Recipient

- `/implementation_engineer`
- Routing note: after the fix, a targeted delta source review, then API/E2E.

## Residual Risks

- Carried from the design review: the native→native hand-over (AC-002) and the Team-member case (AC-008) are proven end to end only by the planned built-server E2E.
- The other built-server e2e suites were not rerun by this review; API/E2E owns that (AC-007).
- `autobyteus-server-ts/dist` in the worktree was rebuilt by this review at `14c28a91f9` (untracked build output).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review` (round 1, Full Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 8.8 / 88; Runtime Correctness 7.0, API/E2E Readiness 7.5, Data-Flow Spine 8.8
- Failure Origin: N/A
- Recommended Recipient: `/implementation_engineer`
- Notes: the rule, the decision table, the reference model, the standalone and Team paths, the options paths, the launch validators and the marker text match SR-006 and are well tested. One blocking defect: every Org member model save throws (CR-001).
