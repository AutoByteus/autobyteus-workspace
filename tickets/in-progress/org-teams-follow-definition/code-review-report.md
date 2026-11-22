# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-015; DEC-007 added for CRR-004 A-1)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-015)
- Design Spec Reviewed As Context: `design-spec.md` (§ SR-015 Revision; DS-004/R-3''/R-7; R-5)
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md`, `follow-ups.md`; autobyteus-22's approved behavior and § Exact Texts
- Relevant Solution Revision IDs: SR-007, SR-014, SR-015
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-010 Pass for SR-015)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-009, ARCH-REV-010
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (§ IR-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-003, IR-004
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: `5`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): IR-004 (`1357635a64..cd6a777b24`, 11 source files, +60 effective lines) changes only the CRR-004 paths:
  - F-1: Team-unit members in the Org rows and composition;
  - F-2: the listing facts;
  - F-3: the stopped-settings write;
  - F-4: the Team package validator, the Team records source, and logging in the receiver;
  - SR-015: one read-only port method and its use in `CollaborationTree.resolve`.
  - CRR-002's full re-audit and CRR-003's delta cover everything else. I read the whole delta, re-traced each changed path from its trigger, and ran the gate.
- Trigger: IR-004 ready for source review (implementation engineer)
- Prior Review Round Reviewed: CRR-004 (failure-origin review, Fail)
- Latest Authoritative Round: 5
- API/E2E and delivery records: API-REV-001 (Fail, analyzed in CRR-004)

Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition`, branch `codex/org-teams-follow-definition`, commit `cd6a777b24` (IR-004; cumulative base `9f6add773b`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None (unchanged from CRR-001).

## Review Scope

- Paths re-traced from their real triggers:
  - **F-1:**
    - A Team unit's busy member is removed. The Team root's `parts_changed` reaches `OrgViewComposition.relay`, then `learnAgents` (file marked `live: true`), then `composeOrgExecutionTree` → `teamUnitMembersInOrg(tree, space, true)`. The leaving member stays in `agents`, so its frames are relayed and its status is in `liveStatuses`/`snapshot`.
    - After its release write, the next `parts_changed` drops it.
    - Rows: `containerTreeOf` → `teamUnitMembersInOrg(…, true)` tagged `leaving`; `RunTreeView` → `teamMemberRowsOf(part.members, isLiveTeamRun(teamRunId))`, the Team's own row rule. The `org_team` row's `statusIds` include the leaving member, so the Team row no longer reads Offline while it works.
    - A stored (not live) unit's file never shows leaving members.
  - **F-2:** `RunningAgentsListing.entryOf` → `listingFactsOf`: `startedByPerson = !delegatedFrom && !containedIn` for both kinds. One rule, in the facts.
  - **F-3:** `AgentOrgRunManager` stopped save → `ContainerConfigTrees.write`: `withLaunch` (Team-unit member) and `writeAgent` (agent unit) now write `launchSource` as the edit gives it. `orgAgentNodeOf` composes it back from the metadata, so the readback equals `expected`, and the composed tree carries the agent unit's provenance it had lost.
  - **F-4:**
    - `TeamRunService.restoreTeamRun` → `TeamRunStatePackageLoader.load` → `validateTeamRunStatePackage`: an endpoint counts as the run's own when it is a current or a former member (`formerMemberByRunId`). A line with neither endpoint is still refused.
    - `runRecordsOfRootOwners` (agent_team) uses the same rule, so the restored run's views keep those lines.
    - `rg` of the remaining endpoint checks: `root-team-run.ts:151` routes the log owner; the two `ownAddressOf` lookups only name senders. None refuses or drops a former member's line.
    - `RemoteMessageReceiver.resolve` now logs `REMOTE_TARGET_ROOT_UNAVAILABLE` with the error.
  - **SR-015:** a unit's `send_message_to('P/x')` → own-root miss → `CollaborationTree.resolve` → step 2 misses → `containedIn` → `formerUnitAt` (as before), then `OrgContainerPort.formerMemberAt`. That finds the current Team unit at `P`, maps `P/x` → `/x` through `ContainedTeamAddressSpace`, and calls `TeamExecutionIndex(tree).formerMemberAt('/x')` over the live tree, or the stored file (`teamTreeOf`; never restored; `null` when a current member has the address). It throws autobyteus-22's `formerMemberRefusal` naming `P/x` (code `COLLABORATION_TARGET_NOT_FOUND`).
- Gate run by me (with `pnpm` on PATH):
  - `node scripts/typecheck.mjs`: production 0 errors; tests 974 in 300 files, equal to the baseline. PASS.
  - `vitest run tests/unit/agent-org-execution tests/unit/agent-collaboration tests/unit/run-history tests/unit/remote-collaboration tests/unit/agent-communication tests/unit/agent-team-execution tests/unit/agent-execution tests/unit/agent-memory tests/unit/api tests/app-data-migrations tests/architecture tests/integration/agent-org-execution`: **527 files passed, 4 skipped; 4315 tests passed, 9 skipped; 0 failures**.
  - Controls: with F-1's `live` condition forced off and F-4's former-member clause removed, the F-1 composition case and the F-4 validator case fail (2 failed / 344). Restored, they pass. Worktree clean.
- Explicit exclusions: built-server, two-node, real-runtime and rendered proof are API/E2E's next rerun (the implementation engineer reran org-follows-definition 6/6 with OF-04's exact SR-015 refusal, and AOML 2/2).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: as before, plus DEC-007 (SR-015): another unit gets the teammate's former-member refusal, naming `P/x`.
- Design-spec behavior map verified against the implementation: Yes (§ SR-015 Revision; F-1..F-4 restore approved behavior without design change).
- Design review report and round confirmed: ARCH-REV-010.
- Behavior-basis status: `Confirmed`.
- Remaining material ambiguity: None.

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| AC-002 in the Org view (F-1) | Confirmed | Traced above; test "its row and its frames and status are the Org view's while it is leaving; after its release they are gone"; rows test "only while that Team unit runs" | — |
| REQ-006 / R-5 listing (F-2) | Confirmed | Test "a unit of an Org, of either kind, is not a run a person started" | — |
| REQ-006 stopped settings (F-3) | Confirmed | Test "a model patch records its source … the readback equals the saved tree" (Team-unit member and direct agent) | — |
| REQ-002/REQ-005 reopen, AC-007 follow-up (F-4) | Confirmed | Validator test with an outside sender to a former member, and a line with no own endpoint still refused; records source consistent | — |
| DEC-007 / SR-015 | Confirmed | 3 cases (idle/stopped, leaving/stopped, leaving/live with the stored file unread), each from an agent unit and another Team unit's member; OF-04 exact text | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-01..S-09 | As CRR-003 | — | — | — | — | Normal | Unchanged apart from the paths below | As CRR-003 | Gate green | Supported Normal Scenario | Use |
| S-10 a busy Team-unit member removed, seen and answered in the Org view | AC-002, REQ-002 | User/System | Team definition change | The member finishes in view; the user answers its approval | Definition change; Org view | Normal | F-1 path | Leaving row, frames, status; gone after release | F-1 tests | Supported Normal Scenario | Use |
| S-11 reopen a Team (unit or peer copy) whose removed member had an outside correspondent | REQ-002/REQ-005, AC-005, AC-007 | User/System | Stop/idle, then message or open | Restore | Restore | Normal | F-4 path | Restored with the lines kept | Validator test; API/E2E rerun pending | Supported Normal Scenario | Use |
| S-12 another unit addresses a Team unit's removed member | DEC-007, SR-015 | System | Unit agent | Clear refusal | `send_message_to('P/x')` | Normal | SR-015 path | Former-member refusal naming `P/x` | 3 cases + OF-04 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-25 | The composed Org tree strips the `leaving` tag from a live Team unit's leaving member (the node type has none) | F-1 | — | Its consumers (agents map, statuses, snapshot) need the agent, not the tag. The Leaving tag on screen comes from the rows, which keep it | Code read; web `AgentOrgRunMemberTree.vue` reads `row.leaving` | Reject | — | Correct split |
| C-26 | `containerTreeOf` always lists leaving members; a stale marker of a stopped unit is filtered by `teamMemberRowsOf(…, isLiveTeamRun)` | F-1 | — | Same as a Team's own `ownTreeOf` + rows | Code read | Reject | — | Consistent with autobyteus-22 |
| C-27 | `formerMemberAt` reads the stored Team file on each address miss | SR-015 | — | One small read, only on a miss, never a restore | Code read | Reject | — | Proportionate |
| C-28 | A run delegated by a unit (R-8 reach, not contained) that addresses a removed member or unit gets the generic not-found (the `!containedIn` early return) | SR-015 / DEC-007 scope ("another unit") | — | Behaves as designed: DEC-007 covers units. The same held for removed units since IR-002 | Design text | Reject (outside DEC-007) | — | Recorded as a residual note, not a defect against the approved basis |
| C-29 | CRR-004 asked for a restore test of the AC-005 shape too; IR-004 has the validator test only | F-4 | — | Restore goes through the validator, and the validator test reproduces the exact refusal. The end-to-end shape belongs to API/E2E's rerun | Code read | Reject as a defect | — | Asked of API/E2E in the handoff (an OC case: removed member that took a cross-unit hand-off, Org stop/reopen) |
| C-30 | `REMOTE_TARGET_ROOT_UNAVAILABLE` logs the error message only, not the root ID | Readability | — | The error text names the run (the validator's message names the message; restore errors name the run). Adequate for finding the cause | Code read | Reject | — | — |

## Structural / Design Checks

| Check | Result (`Pass`/`Pass — deviation recorded, reason holds`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | — | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | autobyteus-22 texts reused for SR-015 | — |
| Data-flow spine inventory clarity and preservation | Pass | F-1 restores the existing relay spine for leaving members | — |
| Ownership boundary preservation and clarity | Pass | One owner `teamUnitMembersInOrg` for rows and view; the Team's own `TeamExecutionIndex.formerMemberAt` answers SR-015 through the container port | — |
| Off-spine concern clarity | Pass | — | — |
| Existing capability/subsystem reuse check | Pass | `teamMemberRowsOf`, `formerMemberRefusal`, `ContainedTeamAddressSpace`, `TeamExecutionIndex` reused | — |
| Reusable owned structures check | Pass | — | — |
| Shared-structure/data-model tightness check | Pass | `OrgUnitFile.live` is an explicit read-side flag; no persisted change | — |
| Repeated coordination ownership check | Pass | One endpoint rule in the validator and the records source | — |
| Empty indirection check | Pass | — | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | All touched files ≤ 382 effective lines | — |
| Ownership-driven dependency check | Pass | `run-own-agents-reader` imports the composition's owner function; no cycle (typecheck, architecture tests green) | — |
| Authoritative Boundary Rule check | Pass | Readers ask the container port; the directory reads the Team's own tree | — |
| File placement check | Pass | — | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass — deviation recorded, reason holds | `OrgContainerPort` now has ten read-only, single-subject methods; `formerMemberAt` is the one SR-015 names | — |
| Naming quality and naming-to-responsibility alignment (Principle 15) | Pass | — | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | The former inline member mapping in `containerTreeOf` and the composition is replaced by the one owner | — |
| Patch-on-patch complexity control | Pass | Each fix is at its owner, not a caller-side special case | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | — | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | One case per fix through the owning path; each fails with its fix reverted (two checked by me) | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | — | — |
| API/E2E readiness for the next workflow stage | Pass | Gate green; reruns named | — |

## Source File Size And Structure Audit (If Applicable)

Effective non-empty lines, `1357635a64` → `cd6a777b24`: `collaboration-tree.ts` 378 → 382; `run-tree-view.ts` 273 → 274; `org-container-port.ts` 52 → 58; `container-config-trees.ts` 71 → 74; `org-container-directory.ts` 286 → 296; `org-execution-tree-composition.ts` 51 → 67; `org-view-composition.ts` 215 → 220; `remote-message-receiver.ts` 168 → 174; `run-records-source.ts` 38 → 39; `team-run-state-package-validator.ts` 41 → 44; `run-own-agents-reader.ts` 206 → 210. All pass the 500 limit and the delta check.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention in changed scope | Pass | The frozen validator stays frozen (migrations only) |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | No stored shape changed |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done: `agent_orgs.md` (SR-015 refusal). F-1..F-4 restore documented behavior; no further docs change needed. Delivery verifies the docs set.

## Additional Material Premise Validation (When Required)

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-CR-01, MP-CR-02 | Confirmed resolved | Unchanged |
| CRR-004 F-1..F-4 premises | Confirmed resolved | Traced above; two controls run by me |

## Review Scorecard (Mandatory)

- Overall score: `9.45/10` (simple average; not the decision rule). Pass bar: at least 9.4 in every category (user's standing instruction).

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | The relay spine now carries a leaving member to its release, as the Team's own view does | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | One owner for Team-unit members in the Org; the Team answers its own former members through the port | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | One read-only port method, named by the design | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | Each fix at its owner; small deltas | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | No persisted change; `live` read flag explicit | — | — |
| `6` | `Naming Quality and Local Readability` | 9.4 | Comments say why (liveness, provenance, former endpoints) | — | — |
| `7` | `API/E2E Readiness` | 9.4 | Gate green; every fix tested with a control; reruns named | The AC-005 shape and the two-node file still need API/E2E's rerun | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.4 | F-1..F-4 fixed at their causes; the swallowed restore error is now logged; SR-015 per DEC-007 | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | — | — | — |
| `10` | `Cleanup Completeness` | 9.6 | Inline member mappings replaced by the owner | — | — |

## Findings

No open findings. CRR-004's F-1..F-4 and A-1 are resolved (revision record CRR-005).

## Follow-ups

- Follow-ups this review added: None. FU-001 unchanged.

## Classification

- N/A (Pass).

## Recommended Recipient

API/E2E engineer (implementation review passes), then the informational note to the implementation engineer.

## Residual Risks

- API/E2E reruns, per CRR-004: the OC file (with OC-04), OCL-02, the OCU probe, the whole two-server file (RC-56 then RC-12/13/24) and `stopped-org-workspace-graphql`. Also recommended: one OC case of the AC-005 shape, where a removed Team-unit member that took a cross-unit hand-off is followed by an Org stop/reopen (C-29).
- C-28: a run delegated by a unit gets the generic not-found for a removed unit or member (outside DEC-007, unchanged since IR-002).
- FU-001 remains.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.45/10 average; every category at least 9.4
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: Large/High preserved. CR-001..CR-007, N-1, F-1..F-4 and A-1 are resolved.
