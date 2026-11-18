# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004; REQ-002, REQ-004, REQ-006…REQ-011; AC-002, AC-005, AC-007, AC-009…AC-014; DEC-008…DEC-010; Scope Guardrail)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-01…E-16, as cited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004; DS-001…DS-007, Removal Plan, Porting Rules, Tests, Risks)
- Supplemental Task Artifacts Reviewed As Context: `product-design-request.md` (UXJ-001/002, VIS-001…VIS-017 references); `evidence/implementation/IMP-20-run.log` and `IMP-20/IMP-20-evidence.json`
- Relevant Solution Revision IDs: SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001; deviation notes 1–4)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001 (`e07896a22b`, `a5fc23849e`, `0d3c31c4ae`; evidence `2b012a21e1`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review` (round 2); round 1 was a `Full Review`
- Review Scope Evidence (round 2): `git diff c20d13fa02 71ce23ced8` (17 files, +133/−83). It changes `projectWorkspaceHistoryByWorkspace` and removes the "No workspace" bucket it fed (`NO_WORKSPACE_HISTORY_ROOT`, the display branch, one key in en and zh-CN). It also fixes the `runListStore` comment and the dead mock, and updates the Org specs and fixtures to register the Org's folder, plus one docs line. It stays within CR-001…CR-003; no spine, interface, data shape or server code changed. `155f7680e4` is ticket records and evidence only
- Trigger: implementation complete (IR-001), `Large`/`High`, so source review is required
- Prior Review Round Reviewed: none
- Latest Authoritative Round: 2
- Project rules applied: `DESIGN.md` (rules 1, 3, 5, 7, 9, 11) and `GLOSSARY.md`. The team's design principles were updated 2026-11-05: adding to a file already over 500 lines now belongs to this ticket. No changed file is affected.

## Round 2: CR-001…CR-003 Local Fix (IR-002)

| Finding | Status | Verification |
| --- | --- | --- |
| CR-001 | Resolved | `projectWorkspaceHistoryByWorkspace` now maps only the established, registered nodes and attaches each root's Org groups. No `history:<root>` node is created, so a removed folder with a stopped Org run leaves the view, as one with Agent or Team runs does. New cases in `runHistoryListedFolders.spec.ts`: each kind removed; all three removed, with no node, index or ancestry left; the folder stays out after the next read and after a patch-triggered rebuild; a registered Org-only folder is still listed (AC-012). IMP-08 is red/green: 3 of 12 fail on `c20d13fa02`'s projection, and 12/12 pass on the fix. The implementer's check that Remove is the only way an Org root becomes unregistered is confirmed for launch: `agent-org-run-service.ts:142-143` refuses a placement without a workspace (`AGENT_ORG_WORKSPACE_REQUIRED`). I rely on the handoff for the registry and stopped-run update paths. So no `Design Impact` |
| CR-002 | Resolved | `runListStore.ts:14` now names `runHistoryStore`, loaded by the run section (`WorkspaceAgentRunsTreePanel`) |
| CR-003 | Resolved | The mock line is gone (`WorkspaceAgentRunsTreePanel.regressions.spec.ts`) |

- The "No workspace" bucket removal. A stored Org run with no root folder no longer gets a "No Workspace" folder in the Workspaces view.
  - Removing it is consistent with the rule: a run without a folder belongs to no folder.
  - Such a run is still read and listed in the Runs view (`runListStore` takes every `agentOrgHistory` row), and the store keeps it: the updated `runHistoryStore.spec.ts` asserts `org-missing` and `org-no-workspace` stay in `agentOrgHistory`. Nothing is lost, and DESIGN.md rule 7 holds.
  - The display branch, the constant, the key and its catalog-spec entry went with it, and `grep` finds no reference left.
  - Candidate C-09 (Reject): there is no requirement to show runs without a folder in the Workspaces view, and they stay reachable.
- Test-fixture changes (`registeredWorkspaceFixture.ts`, `withOrgRootWorkspace`, an optional root on `historyData`). They make the six Org specs register the folder that a launched Org always has. They test real behavior and are not a compatibility seam. The shared task-bearing fixture is unchanged.
- Checks reused, not rerun:
  - IMP-09 web suite: 701 files, 5156 passed.
  - IMP-10 web typecheck: PASS at baseline 99; the three guards pass.
  - IMP-01…03: no server code changed.
  - IMP-20 was not rerun. Its states have no unregistered Org root, and the change only removes nodes for roots that are not registered.
- C-04 (recommendation) was not taken. That is acceptable, because DS-002 specifies one read per view change.
- Scorecard after round 2: Runtime Correctness 8.9 → 9.4 (CR-001 resolved, with tests per run kind); API/E2E Readiness 9.2 → 9.4; Naming 9.2 → 9.4; Cleanup 9.2 → 9.5. The other categories are unchanged. Overall 9.4/10, with every category at 9.4 or above.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. GraphQL argument meaning (`limitPerAgent: null`), a new field on every history item read from memory files, one shared read window, and a broad UI change (120 files, +3752/−835 excluding the ticket folder).

## Review Scope

- Changed implementation and behavior reviewed:
  - Server: `RunLastActivityReader`, the Agent, Team and Org history items, the `null` window on both reads, and the guard copy.
  - Web, read window: `runHistoryStore` and its load, folder and reconcile actions, and the phone.
  - Web, views: the run section host, `RunSectionHeader`, `runSectionModeStore` and the strip label.
  - Web, the Runs view: projection, store, panel, row, disclosure, archive-older and the archive split.
  - Web, the rules: `hasListedRun` in the navigation projection with the patch rebuild, `projectHasListedRun`, the empty states, and the tree-state prune.
  - Web, the chooser Remove: `ChatWorkspaceMenu` and the removal composable.
  - The removals and the SR-003 revert.
- Files / areas reviewed: every non-test source file in `git diff 3ef5e33eec 0d3c31c4ae`; the specs named in the handoff; the revert `e07896a22b` (it restores base, checked by `git diff 3ef5e33eec e07896a22b --stat -- . ':!tickets'`, which shows no source).
- Explicit exclusions: the browser probes' runs and the 250 ms read budget (API/E2E's, per the design); pixel-level VIS comparison beyond IMP-20's evidence.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`. The left panel shows where runs are, through three views of the same runs. The chooser holds every folder, and Remove is deliberate and unregisters the folder "so the folder leaves the chooser and every view of the left panel" (REQ-002, AC-002).
- Design-spec behavior map verified against the implementation: `Yes`, DS-001…DS-007 traced in code (below). There is one gap, where the design does not trace every run kind through removal (CR-001).
- Design review report and round confirmed: ARCH-REV-004 Pass on SR-004.
- Behavior-basis status: `Confirmed`

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A | REQ-006, AC-009 | User | User | Group the same runs another way | Run-section `⋯` "View" menu | Normal | `RunSectionHeader.choose` → `runSectionModeStore.setMode` → localStorage → host renders one view; host watcher sets the window and reads once | The chosen view; it survives a reload | UXJ-001, VIS-002/004/006/011/013 | Supported Normal Scenario | Use |
| SCN-B | REQ-008, AC-011 | User | User | See their runs newest first | The Runs view | Normal | host `setHistoryWindow(null)` → `fetchTree` → `listWorkspaceRunHistory(null)` + Org history → `runListStore.entries` → `RunListPanel` | Every non-archived run, newest by `lastActivityAt`, fold after 5 | 378 spec, VIS-003 | Supported Normal Scenario | Use |
| SCN-C | REQ-009, AC-012 | User/System | User, or a run's lifecycle | A folder or Project appears with its first sent run and leaves when its last run is archived | Chat send; archive | Normal | history or context change → `buildRunHistoryNavigationProjection` (`hasListedRun`), or the patch rebuild → tree; `projectHasListedRun` → Projects | Listed only while it has a listed run | VIS-017, DEC-010 | Supported Normal Scenario | Use |
| SCN-D | REQ-002, REQ-004, AC-002, AC-005 | User | User | Remove a folder they no longer want | Chat chooser "Remove" | Normal | `ChatWorkspaceMenu.askToRemove` → `ConfirmationModal` → `workspaceStore.removeWorkspace` (server guard) → `runHistoryStore.pruneWorkspace` → next poll and rebuild | Gone from the chooser and every view of the left panel; refused while a run is running | REQ-002 text, VIS-007…010 | Supported Normal Scenario | Use |
| SCN-D2 | REQ-002, AC-002 | User | User | As SCN-D, for a folder whose runs are stopped but not archived. The guard allows it (`workspace-removal-guard.ts` refuses only while a run is running), and AC-002 does not require that runs are archived first | Chat chooser "Remove" | Normal | As SCN-D. Then for each run kind of the removed root: Agent groups have no descriptor, so no node (`runTreeProjection.ts:246-248`); Team rows have no node; Org history creates a history-only node (`runTreeProjection.ts:394-407`), which `hasListedRun` keeps | Expected: gone from every view of the left panel | REQ-002 ("so the folder leaves … every view of the left panel"); REQ-004 refuses only running runs | Supported Normal Scenario | Use |
| SCN-E | DS-005 | System | History read (mount, 5 s poll) | Order the Runs view by last activity | `listWorkspaceRunHistory`, `listCollaborationRootHistory` | Normal | catalog row → `RunLastActivityReader.for{Agent,Team,Org}Run` → item `lastActivityAt` | Newest memory mtime over the run and its located agents, else `createdAt`; an unreadable tree or folder is contained | Design DS-005, DESIGN.md rule 7 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | A folder removed in the chooser stays in the Workspaces view when it has a stopped Org run, as a history-only node. A removed folder with Agent or Team runs leaves | SCN-D2, AC-002 | The user removes a folder whose Org run is stopped but not archived | `projectWorkspaceHistoryByWorkspace` adds `history:<root>` for each Org history root with no folder node, and `hasListedRun` keeps it because it has an Org run. The folder stays in the left panel after "Removed" | `Reproduced`: a temporary spec on this head built the projection with the Agent, Team and Org folders unregistered. Output: `[["history:/work/org","/work/org"]]`, so only the Org folder stays (spec reverted). By reading, pre-existing on base for the tree's X | Promote | This ticket | An old gap in the functionality this ticket changes (removal and the Workspaces folder rule) makes AC-002 fail for one run kind. The bounded fix is to make Org runs follow the same rule as Agent and Team runs |
| C-02 | `runListStore.ts:14` says the store reads "the history the app keeps loaded (`useRunHistoryLoad`)"; that owner was not ported (Porting Rules) | Design Porting Rules; Principle 15 | — | A reader looks for an owner that does not exist; the load lives in the run section host | `grep useRunHistoryLoad`: this comment only | Promote | This ticket | One-line comment fix |
| C-03 | `WorkspaceAgentRunsTreePanel.regressions.spec.ts:177` mocks `refreshWorkspaceHistoryQuietly`, an action this change removed | Principle 7 (mocks for code that no longer exists, in a touched file) | — | A dead mock in a touched spec | `grep`: no source defines it | Promote | This ticket | Delete the mock line |
| C-04 | The host's view watcher reads again on every view change, also Projects ↔ Workspaces, where the window stays 6 | DESIGN.md rule 3 | User switches between those two views | One extra read per user switch, not per update | Host `watch(() => modeStore.mode, …)` | Reject | — | The design asks for one read per change; a single read per user action is not repeated full-history transfer. Recommendation only |
| C-05 | The uncapped read stats memory files synchronously (`fs.statSync`) for every non-archived run on each 5 s poll while Runs is shown | DS-005, Risks (250 ms budget) | Runs view shown | Cost on the poll | `memory-file-store.ts:62-67` | Hold for Evidence | — | The design gives the budget to API/E2E as an escalation trigger; no measurement yet |
| C-06 | `RunListPanel` passes a `removeDraftRun` the Runs view never reaches ("the composable needs one") | Principle 7 | — | An adapter argument for a shared composable, not an unreachable branch of this code | `RunListPanel.vue` mutations | Reject | — | Not dead code: the composable's contract requires it, and the shared composable is out of this change |
| C-07 | Team rows not yet in the history use the node's own time (deviation 2) | DS-003 | A Team just started | Ordered by its node time until the next read | Handoff deviation 2 | Reject | — | The counterpart of the approved Agent `local` rule; consistent with DS-003 |
| C-08 | The guard copy changed on the server (deviation 1) | REQ-004 | Remove with a running run | Toast shows REQ-004's text | `workspace-removal-guard.ts:65`, test updated | Reject | — | Required by REQ-004; the only caller is this removal |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Host 491 → 390 effective lines; the header and the Runs view are their own components; FU-003 records the rename | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | IMP-20 12/12 against VIS-001…017. Menu roles and keyboard as UXJ-001. Text-only empty states. Chooser Remove sizing and visibility as DS-006 | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001…DS-007 each have one owner in code: the mode store; `runHistoryStore.historyWindow` and `setHistoryWindow`; `runListStore`; the two view rules; `RunLastActivityReader`; the chooser; `archiveRuns` | — |
| Ownership boundary preservation and clarity | Pass | The window has one owner: `fetchTree`, `refreshTreeQuietly` and `fetchWorkspaceHistory` take no limit. The rule is applied only in the Workspaces projection, and `buildRunHistoryTreeNodes` is unchanged for Projects | — |
| Off-spine concern clarity | Pass | Last activity is an off-spine reader serving the three history services; the empty states belong to their views | — |
| Existing capability/subsystem reuse check | Pass | Reuses `MemoryRunSummaryBuilder`/`mergeMemoryAvailability`, the three location services, `ConfirmationModal`, `removeWorkspace`, `mergeHistoryRowWithContext`, and the record-level archive cores | — |
| Reusable owned structures check | Pass | `RunArchiveTargets`, `RemovableWorkspace` (three fields) and `RunListEntry` (a discriminated union over a small base) | — |
| Shared-structure/data-model tightness check | Pass | `canRemoveFromWorkspaces` was removed everywhere. The temp-identity rule in `ensureWorkspaceNode` is equivalent to the base's, because the only caller passes descriptors, and they are not removable exactly when temp (`runHistoryReadModel.ts:131-146`) | — |
| Repeated coordination ownership check | Pass | One window and one rule per view | — |
| Empty indirection check | Pass | None | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | See the size audit | — |
| Ownership-driven dependency check | Pass | `run-last-activity-reader.ts` imports only the allowed memory builder and store and the three location services. Run-list components do not import Apollo | — |
| Authoritative Boundary Rule check | Pass | No caller uses both `runHistoryStore` and one of its action modules | — |
| File placement check | Pass | `components/runList/*`, `stores/runListStore.ts`, `utils/runListProjection.ts`, `run-history/services/run-last-activity-reader.ts` | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `limitPerAgent: Int` nullable with the default of 6 kept; `null` means every run, as the design states. `lastActivityAt: String!` / `last_activity_at` follows each type's existing casing | — |
| Naming quality and naming-to-responsibility alignment check (Principle 15) | Pass (one comment, C-02) | "Listed run", "view" and `RunSectionMode` match the GLOSSARY entries added. `useWorkspaceHistoryWorkspaceRemoval` keeps its name by the design's decision | Fix C-02 |
| No unjustified duplication of code / repeated structures in changed scope | Pass | `historyRow` in `runListProjection` mirrors the tree's history row on purpose: the Runs view keeps its own contract (deviation 3) | — |
| Patch-on-patch complexity control | Pass | The patch rebuild is one guarded branch (`runHistoryNavigationPatches.ts`), with a store-level full rebuild | — |
| Dead code removed in the touched files and modules (Principle 7) | Fail (minor, C-03) | `createWorkspace`, `refreshWorkspaceHistoryQuietly`, `setWorkspaceExpandedByRootPath`, `canRemoveFromWorkspaces`, the unreachable no-runs rows and the obsolete keys are removed. One dead mock remains in a touched spec | Remove C-03 |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass, with one gap | `runHistoryListedFolders`, `runHistoryReadWindow` (shrink without retiring), `ChatWorkspaceMenu.remove`, `RunSectionHeader`, run-list specs, server window schema and reader tests. No test covers a removed folder per run kind | Add with CR-001 |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | — | — |
| API/E2E readiness for the next workflow stage | Pass after CR-001 | The probes were updated for the removed switch and add form; the budget and full probes are API/E2E's | — |

## Source File Size And Structure Audit (If Applicable)

Effective non-empty lines (`grep -cv '^\s*$'`), base `3ef5e33eec` → `0d3c31c4ae`. The table lists changed source files over 220 lines; every other changed source file is smaller.

| Source File | Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `stores/runHistoryStore.ts` | 498 | 491 | Pass | — | Pass | Pass | — | — |
| `stores/runHistoryLoadActions.ts` | 464 | 466 | Pass | — | Pass | Pass | — | — |
| `composables/useWorkspaceHistoryTreeState.ts` | 453 | 454 | Pass | — | Pass | Pass | — | — |
| `components/chat/ChatWorkspaceMenu.vue` | 356 | 406 | Pass | +50 | Pass: the menu owns its rows' actions; the logic lives in the removal composable | Pass | — | — |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | 491 | 390 | Pass | −101 | Pass (FU-003 rename) | Pass | — | — |
| `utils/runTreeProjection.ts` | 381 | 373 | Pass | — | Pass | Pass | — | — |
| `stores/runHistoryMutationActions.ts` | 328 | 360 | Pass | +32 | Pass | Pass | — | — |
| `components/runList/RunListPanel.vue` | new | 278 | Pass | new, over 220 | Pass: the list, its fold and its actions | Pass | — | — |
| `components/runList/RunListRow.vue` | new | 245 | Pass | new, over 220 | Pass: one row with its nested trees | Pass | — | — |
| `stores/runHistoryNavigationProjection.ts` | 251 | 266 | Pass | +15 | Pass | Pass | — | — |
| server `api/graphql/types/run-history.ts` | 269 | 277 | Pass | — | Pass | Pass | — | — |
| server `services/agent-run-history-service.ts` | 222 | 231 | Pass | — | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The default of 6 is the existing contract; `null` is new. No version checks (DESIGN.md rule 9) |
| No legacy old-behavior retention in changed scope | Pass | Switch, add form, X and "New Project" are gone; SR-003 is reverted |
| Dead code removed in the touched files and modules (Principle 7) | Fail (minor) | C-03 |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`: `lastActivityAt` is derived at read time; the mode key adds `runs`, and an unknown value reads as `workspaces` |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts:177` `refreshWorkspaceHistoryQuietly` mock | UnusedTest | The action was removed from `runHistoryStore` in this change; `grep` finds no definition | A mock of code that no longer exists, in a touched file | Delete the line |

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change: `autobyteus-web/docs/{workspace_layout,projects,chat,file_explorer}.md`, `GLOSSARY.md`, and server `docs/modules/{run_history,workspaces}.md`.
- Why: the views, the read window, the Remove location, `lastActivityAt` and the guard copy.
- Files or areas likely affected after CR-001: `docs/workspace_layout.md`, a line on what a removed folder's runs show.

## Review Scorecard (Mandatory)

- Overall score: 9.3/10 (simple average; the decision follows the findings, not the average)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | Each DS has one owner in code, as designed | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | One window owner; the rules stay in view-only owners; Projects is untouched by the Workspaces rule | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | Nullable window with the default kept; `lastActivityAt` on every item kind | `null` meaning "every run" is a convention, documented on the resolver | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | Header and Runs view split out; host shrunk to 390 | The host name (FU-003) | FU-003 |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | `canRemoveFromWorkspaces` removed cleanly; tight new types | — | — |
| `6` | `Naming Quality and Local Readability` | 9.2 | Vocabulary matches GLOSSARY | C-02 stale owner name in a comment | Fix C-02 |
| `7` | `API/E2E Readiness` | 9.2 | Probes updated; budget assigned | A removal path untested per run kind (CR-001) | Specs with CR-001 |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.9 | Window, rules, patch rebuild, archive-older and Remove behave as designed | CR-001: AC-002 fails for a folder with a stopped Org run | Fix CR-001 |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean-cut removals; SR-003 reverted | — | — |
| `10` | `Cleanup Completeness` | 9.2 | Dead actions, fields and keys removed | C-03 dead mock | Remove C-03 |

## Findings

| ID | Severity | Path | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| CR-001 | Blocking (AC-002, REQ-002) | `utils/runTreeProjection.ts:383-424` (`projectWorkspaceHistoryByWorkspace`), applied by `stores/runHistoryNavigationProjection.ts` (`hasListedRun`) | C-01. A removed folder that still has a stopped Org run stays in the Workspaces view as `history:<root>`. Agent and Team runs of a removed folder leave, because they have no folder node. Reproduced by a temporary spec (reverted). Pre-existing for the tree's X, but REQ-002 makes the removal's outcome explicit, and this ticket owns both the removal and the Workspaces folder rule | Make Org runs follow the same rule as Agent and Team runs: a folder that is not registered (removed in the chooser) has no node in the Workspaces view, whatever kind of run it has. Its runs remain in the Runs view and on disk. Add specs: after removal, a folder with a stopped Agent run, a stopped Team run and a stopped Org run each leaves the Workspaces view and stays out after the next read; a registered Org-only folder is still listed (AC-012). If you find that an Org run's folder can be unregistered by something other than Remove, stop and return it as a `Design Impact`: whether to show such Org runs needs a decision | `Local Fix` / implementation |
| CR-002 | Minor | `stores/runListStore.ts:14` | C-02 | Name the real load owner (the run section host) | `Local Fix` / implementation |
| CR-003 | Minor | `WorkspaceAgentRunsTreePanel.regressions.spec.ts:177` | C-03 | Delete the dead `refreshWorkspaceHistoryQuietly` mock | `Local Fix` / implementation |

Recommendation, not a finding (C-04): the view watcher could skip the read when the window does not change (Projects ↔ Workspaces).

## Follow-ups

- Follow-ups this review added: None. FU-001…FU-003 stand as the Solution Designer recorded them.

## Classification

- `Local Fix` (CR-001, CR-002, CR-003), owned by implementation.

## Recommended Recipient

- Implementation Engineer (`/software_engineering_team/implementation_engineer`).
- After the fix, the change returns through source review (a `Targeted Delta Review` of CR-001…CR-003), then API/E2E.

## Residual Risks

- The uncapped poll's cost (C-05): `statSync` per memory file and an execution-tree read per Team and Org root on every 5 s read while the Runs view shows. The 250 ms budget is API/E2E's escalation trigger.
- The Runs view between a view switch and the new read briefly shows the previous window's data. That is inherent in "one read on change" and corrects itself.

## Latest Authoritative Result

- Review Decision (round 2): `Pass`. CR-001…CR-003 are resolved. Scorecard 9.4/10, every category at 9.4 or above. Recipient: API/E2E Engineer (primary); informational to the Implementation Engineer.
- Round 1:
- Review Decision: `Fail`
- Supported Product Scenario Gate: `Pass` (SCN-A…SCN-E; SCN-D2 promoted)
- Material-Premise Gate: `Pass` (C-05 held for API/E2E's budget; C-04, C-06…C-08 rejected)
- Score Summary: 9.3/10. Below 9.2: Runtime Correctness and Behavioral Fidelity at 8.9 (CR-001)
- Failure Origin: N/A
- Recommended Recipient: Implementation Engineer
- Notes:
  - A faithful implementation of SR-004, with one gap in a run kind the design did not trace through removal.
  - Checks reused from the handoff without rerunning: IMP-01…IMP-07 and IMP-20 (all at `0d3c31c4ae`).
  - My one run was a temporary diagnostic spec, reverted. The worktree is clean apart from untracked build output.
