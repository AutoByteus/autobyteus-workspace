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
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): the IR-002 delta `14c28a91f9..0c58796856` changes only the Org save path (`agent-org-run-manager.ts:234`, a new launch-only `previewAgentOrgLaunchConfigurations` in `agent-org-run-config-mutator.ts`), the Org container writer (`container-config-trees.ts`, two lines writing the node's `platformAgentRunId`), one new unit test file and one renamed rule test. That is CR-001's area. No shared interface, data shape or other save path changed. Round 1 evidence carries forward for the rest
- Trigger: IR-002 local-fix handoff (CR-001) from `/implementation_engineer` (commit `0c58796856`). Round 1: IR-001, `14c28a91f9`
- Prior Review Round Reviewed: 1 (CRR-001, `Fail`, CR-001)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage / API/E2E / Delivery records: N/A (implementation review)
- Failing Scenario IDs / Commands / Evidence: N/A (see CR-001 for the reviewer-run reproduction)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none; the change stayed within the design's file mapping and owners.

## Round 2 Delta Summary

- **CR-001 resolved.**
  - The pre-validation `proposed` tree now comes from `previewAgentOrgLaunchConfigurations`, which merges each patched scope's launch with the existing `replaceLaunchConfiguration` and touches no session or pending-switch state. It yields the same launch per scope that the switch rule would (the rule's configured-member write also takes the selection as the launch). It is used only to list the scopes to validate.
  - The commit (`:276`) still goes through `applyAgentOrgRunSelectionPatches` with the decided continuation, and `patchAgent`'s throw still guards it.
- **Second fix, `container-config-trees.ts` (`writeAgent`, `withLaunch`): accepted as this ticket.** The Org container writer kept the stored `platformAgentRunId` instead of the edited node's. A hand-over clears the session ID and an undo restores it, so the readback never matched `expected` and the save reported `PERSISTENCE_INDETERMINATE`. That blocks AC-008's "Save succeeds" for any Org member with a session, and it is the same Save path. Untouched nodes are composed from the same metadata on read, so they write nothing new.
- **New test** `agent-org-run-manager-model-selection-save.test.ts` drives the real `AgentOrgRunManager` on real stored fixtures: a direct member's hand-over (session cleared on disk, `from` correct) and a mounted Team member's hand-over. The direct-member hand-over case also proves the writer fix.
- **Reviewer checks:**
  - The new test file passes 3/3.
  - A temporary probe of a real equal-to-bigger edit (baseline `equal`, target `large`): `UPDATED`, the session kept on disk, nothing pending. It passed and was removed; `git status` is clean.
  - The implementer's IMP-06 covers the typecheck, the build, the Org e2e (1/1), the full unit (8930) and integration (523) suites. The code those runs exercise has not changed since, so I did not rerun them.
- **Non-blocking note (test):** the case "a direct member's equal/bigger native edit stays in the same session" saves the model the member already has (`large` → `large`), so it asserts the `UNCHANGED` no-op, not a same-session edit. My probe shows the behavior is correct. Tightening it is a two-line change: give the direct member `equal` as its baseline and expect `UPDATED`. API/E2E may take it with their coverage.
- **The rule test rename (C-05) is done.**

## Review Scope

- Changed implementation and behavior reviewed: the continuation decision (`RunModelSelectionService.continuationFor`), options listing, the DEC-005 reference model in `selectionContextFor`, `stoppedRunHandOver`, the rewritten `applyRuntimeSelection`, the standalone, Team and Org save paths, both options paths, the three `no_session` launch validators, the marker text (DEC-008/N-4), the standalone Save message, the locale strings and `GLOSSARY.md`.
- Files / areas reviewed: the 17 changed `autobyteus-server-ts/src` files, the 2 locale files, `GLOSSARY.md`, and the changed unit/integration tests (`runtime-selection-rule.test.ts`, `run-model-selection-service.test.ts`, `team-run-model-selection-save.test.ts`, `team-run-selection-mutator.test.ts`, `runtime-switch-session-renewal.test.ts`, `standalone-stopped-run-selection-updater.test.ts` and the others in the commit).
- Explicit exclusions: activation, memory archive and notice paths (unchanged by design, DS-002).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`. The user's rule (DEC-003): equal or bigger verified capacity continues the session; smaller or unknown hands over; one reference model (DEC-005).
- Design-spec behavior map verified against the implementation: `Yes` (the Org member save path since round 2).
- Design review report and round confirmed: ARCH-REV-002 `Pass`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001/002 | Confirmed (all surfaces; round 2) | `optionsWithEvidence` lists every offered model unless `handOver === "unavailable"`; `continuationFor` returns `hand_over` for a mismatch when `available`; the updater forwards `continuation` to `commitRunRuntimeSwitch` | — |
| BEH-006 | Confirmed (all surfaces; round 2) | Same decision row | — |
| BEH-005 | Confirmed | `continuationFor`: both verified and target ≥ reference → `same_session` | — |
| BEH-003 | Confirmed (all surfaces; round 2) | `selectionContextFor` reference = `pendingRuntimeSwitch.from` or the binding; `applyRuntimeSelection` two branches; the `same_session` runtime guard throws | — |
| BEH-004 | Confirmed (all surfaces; round 2) | External runtime → `same_session` | — |
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
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Round 2: the Org preview is launch-only; the switch rule runs once, after validation | — |
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
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Round 2: the Org manager save is tested for a direct and a mounted-Team member hand-over. Non-blocking: its same-session case saves the unchanged model (see Round 2 Delta Summary) | Optional tightening |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Old-rule pins rewritten (REQ-008); AC-009 refusal kept | — |
| API/E2E readiness for the next workflow stage | Pass | Round 2: the Org e2e passes (IMP-06) | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines Before (base) | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-org-execution/services/agent-org-run-manager.ts` | ~362 | 366 | Pass | Pass | Pass | Pass | CR-001 resolved | — |
| `agent-org-execution/services/agent-org-run-service.ts` | ~320 | 324 | Pass | Pass | Pass | Pass | — | — |
| `llm-management/services/run-model-selection-service.ts` | ~175 | 195 | Pass | Pass | Pass | Pass | — | — |
| `agent-org-execution/services/agent-org-run-config-mutator.ts` | ~165 | ~205 | Pass | Pass | Pass | Pass | — | — |
| `agent-org-execution/container/container-config-trees.ts` | ~70 | ~71 | Pass | Pass | Pass | Pass | — | — |
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

- Overall score (`/10`): 9.4
- Score calculation note: simple average; the decision follows CR-001.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.4 | DS-001 is clear on every surface; the Org preview is launch-only and the rule runs once, after validation | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | One decision owner, one rule, callers state capability only | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | Required `handOver`; `continuation` only on the valid result; GraphQL unchanged; the preview and the commit are separate functions | Target-level `continuation?` stays optional with a runtime guard (the design's implementer's choice) | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | Changes in the mapped owners | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | Two tight unions, one meaning each | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Clear doc comments; glossary updated; C-05 renamed | The new Org test's same-session case is named for an edit it does not make | Optional tightening |
| `7` | `API/E2E Readiness` | 9.3 | Every save path works; the Org e2e passes | AC-002/AC-008 end to end remain for API/E2E | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.3 | CR-001 fixed; the Org writer now persists the session ID a hand-over or undo sets; reviewer probe confirms a same-session Org edit | Native→native and Team-member hand-over end to end not yet run | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | No wrappers; direct use of stored data | — | — |
| `10` | `Cleanup Completeness` | 9.4 | Old branches and refusals removed | — | — |

## Findings

### CR-001 — Every Org member model save fails: the pre-validation proposal applies targets without a continuation (High, Local Fix) — **Resolved (round 2, `0c58796856`)**

- Resolution: the pre-validation proposal uses the launch-only `previewAgentOrgLaunchConfigurations`; the commit keeps the switch rule and its guard; the Org container writer now writes the edited node's session ID; the new manager-level test covers a direct and a mounted-Team member hand-over. Verified by code reading, the new test (3/3) and a reviewer probe of a same-session edit.

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

Round 1 non-blocking note (C-05, the rule test title) is resolved in round 2.

## Follow-ups

- Follow-ups this review added: None

## Classification

- Round 2: N/A (Pass). Round 1 was `Local Fix` for CR-001, now resolved.

## Recommended Recipient

- `/api_e2e_engineer` (primary). Informational pass notice to `/implementation_engineer`.

## Residual Risks

- Carried from the design review: the native→native hand-over (AC-002) and the Team-member case (AC-008) are proven end to end only by the planned built-server E2E.
- The other built-server e2e suites were not rerun by this review; API/E2E owns that (AC-007).
- `autobyteus-server-ts/dist` was rebuilt in round 1 by this review and again by the implementer at `0c58796856` (IMP-06); API/E2E should rebuild if the code changes.
- The new Org test's same-session case asserts the `UNCHANGED` no-op only (non-blocking; see Round 2 Delta Summary).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 2, Targeted Delta Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 94; every category at least 9.3
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes: CR-001 is resolved, with the Org container writer's session-ID fix accepted as this ticket. Ready for API/E2E: AC-002 (native→native hand-over with the fake LM Studio endpoint), AC-008 (a Team member and an Org member; a Team default row on a gone model), and the existing switch E2Es unchanged (AC-007).
