# Implementation Handoff — runtime-switch-members (autobyteus-348)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Large / High) and passed (ARCH-REV-002); `get_handoff_rules` returns the Code Reviewer for this classification.
- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/requirements-doc.md
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/investigation-notes.md
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/solution-revision-record.md
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/design-spec.md (with /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/switch-member-record-contract.md)
- Supplemental task artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/switch-member-record-contract.md, /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/follow-ups.md
- Design review report: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/design-review-report.md
- Architecture review revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/architecture-review-revision-record.md
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

The autobyteus-316 standalone switch is extended to a Team member, an Org member (a direct Agent and an Agent of a mounted Team) and a delegated copy (a task Agent, and a member of a task Team). The shape is one shared pure rule, per-family adapters that only locate the record, one activation class and one new commit kind.

- **Rule (D-1).** `applyRuntimeSelection` in `autobyteus-server-ts/src/run-history/domain/runtime-selection-rule.ts` decides switch / undo / model-only for a standalone run, a configured member and a copy; `commitRuntimeSwitch` and `commitRuntimeSwitchOnRecord` do the activation commit and return a conflict for `not_pending` and `switch_id_mismatch`.
- **Records (D-2).** `pendingRuntimeSwitch` (the 316 `PendingRuntimeSwitch`, unchanged) on the configured Agent node, the task Agent (its own file's `taskAgent` section) and the task Team member node; schemas parse and write it exactly. A copy's choice (`userLaunchSelection` / `userTeamLaunchSelection`) gains an optional `runtimeKind`, recorded only when it differs from the started runtime; the started values are never changed.
- **Saves (D-4, D-5, D-10).** Team (`updateStoppedTeamRunSelections`), Org (`updateStoppedAgentOrgRunConfig`, `selectionPatches`) and delegated (`updateDelegatedLaunchSelections`) saves carry a required `runtimeKind`; a pending switch is recorded on every affected member whose effective runtime changes (ARCH-F-007), including members linked to a Team default; another runtime is validated as a fresh selection (`selectionContextFor`). The save touches no running state. The Team and Org chains are renamed as a clean cut.
- **Activation (D-6, D-7, D-8).** `ConfiguredAgentExecutionHandle.initializeReady`: planner `beginSwitch` (history present -> ticket before the candidate; none -> plain start with no marker, archive or note; unreadable -> fail closed) -> prepare -> `record` -> commit `runtime_switch` (`{kind, execution, switchId, platformAgentRunId|null}`, through `RootTeamRun`, `AgentOrgRun` or `StandaloneAgentRunRoot`) -> publish; `discard` only after a confirmed release. M-7: after a commit every holder drops the pending switch and takes the binding (the handle's spec and session ID, the Team wrapper's configuration and `FlatAgentExecutionContext`, the root's tree). Copies refresh at the restore sites by `replaceSelection` (`RootAgentExecutionRegistry.restoreTask`, `TaskAgentExecutionRegistry.restore`).
- **Readers (D-9).** Memory discovery names the open-file runtime (the previous runtime while a switch is pending; a copy's choice over its started runtime) for Team, Org, task Team and task Agent runs.
- **Wire.** Optional `runtimeKind` / `runtime_kind` on the user launch selection in both stream-contract packages; the pending switch is not on the wire. The three launch-rule mirrors (`effectiveCopyAgentLaunch`, `collaborationCopyAgentLaunch`, `teamCopyAgentLaunch`) are held equal by `tests/unit/agent-collaboration/collaborators/copy-launch-rule-parity.test.ts`.
- **Web.** Hierarchical drafts, patches, the delegated draft and clients carry the runtime; member and copy rows open the runtime control exactly when their model control opens (`RunMemberRow`: `runtimeLocked || locked.model`); a Team or Org root's own runtime stays fixed; renamed operations; regenerated GraphQL types; hint text in en and zh-CN.

- Implementation cycle: `Initial`
- Implementation revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/implementation-revision-record.md
- Current implementation revision ID: `IR-003` (IR-001 baseline; IR-002 fixes CRR-002 F-1 and F-2; IR-003 fixes CRR-003 F-3)
- Related solution revision IDs: SR-001 (notes 1-2)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-002, CRR-003
- Related API/E2E revision IDs: API/E2E Fail round 1
- Related delivery revision IDs: N/A
- Triggering finding IDs: F-1, F-2 (CRR-002); F-3 (CRR-003)
- Branch / commits: `codex/runtime-switch-members`; implementation commits `572677be95`, `888063bbef`, `3b4f10435a`, `dba00b2416`, `877ee8ba33`, `0649bb6b44`, `b47e49c509`, `a199e9d543`, `d3463e0a7e`; the documents and evidence are committed after them on the same branch.

## Routing Classification (Mandatory)

- Task size: Large
- Architecture risk: High
- Design classification section / evidence reference: design-spec.md, Design Health / classification (line 19: Large; persisted-data decision `Directly Usable — No Migration`)
- Classification confirmed or changed: Confirmed
- Evidence and rationale for confirmation or change: implementation touched two stream-contract packages, three roots' commit seams, the shared activation handle, persisted record schemas, three save paths and the web draft chain, as the design predicted; no new persistence, security or deployment impact was found.
- Selected route: Code Review
- Lightweight implementation self-review completed for the direct route: Not Applicable
- New design impact or escalation trigger: None

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 / AC-001, AC-002 | Team and Org stopped-run save offers another runtime for a configured Agent member; pending switch, binding dropped, nothing archived | `team-run-selection-mutator.ts` (`applyTeamRunSelectionPatches`), `agent-org-run-config-mutator` path (`applyAgentOrgRunSelectionPatches`), `runtime-selection-rule.ts`; web `existing*ModelConfigDraft.ts`, `RunMemberRow.vue` | Done. Built server MS-01 (Team), MS-04 (Org: direct Agent and mounted-Team Agent in one save) |
| REQ-001 / AC-003 | Undo to the previous runtime; save twice before first input | same rule (`applyRuntimeSelection` undo / keep `from`) | Done. Unit: `runtime-selection-rule.test.ts`, draft specs |
| REQ-002 / AC-004 | Stopped delegated Agent copy and Team copy (Team-level choice, own choice) record the choice and a pending switch | `delegated-launch-selection.ts` (`applyToAgentCopy`, `applyToTeamCopy`, `applyToTeamMember`), `delegated-launch-selection-command.ts`, own-file records | Done. Unit `delegated-launch-selection.test.ts`; DCM-009 |
| REQ-003, REQ-004 / AC-005 | The next input activates the switch through the one shared class: archive exactly the previous agent's records, marker, notice | `configured-agent-execution-handle.ts`, `configured-agent-activation-planner.ts`, `configured-agent-switch-attempt.ts`; `flat-team-agent-execution-handle.ts` (second construction site) | Done at 3 placements in unit (`runtime-switch-member-activation.test.ts`); built server MS-01, MS-04, DCM-009 (Team, Org, Agent roots) |
| REQ-003 / AC-006 | A start that fails after the new agent wrote its own record leaves nothing; retry; abandoned attempt | handle failure branch + `discard` after confirmed release | Done. Built server MS-02 (Team member, native target); unit at 3 placements; 316 RS-05..07 unchanged and green |
| REQ-005 / AC-007 | No history: plain start, no marker, archive or note; pending cleared | planner `beginSwitch` -> `switching: false` path | Done. Unit (`configured-agent-switch-activation.test.ts`, member activation test) |
| REQ-006 / AC-008 | Reloaded chat shows earlier conversation, marker, new records; journal/memory read the open-file runtime | unchanged 316 readers; `memory-run-discovery.ts`, `task-team-root-memory-source.ts` (effective launch + pending) | Done. MS-01 reopened-chat assertions; `memory-run-discovery.test.ts` |
| REQ-007 | Reject for application-owned, archived, unadmitted or running roots; a running copy refuses | existing root guards of the Team/Org/delegated save paths (unchanged) | Preserved. `RUN_ACTIVE` and `COPY_RUNNING` e2e cases green |
| REQ-008 / AC-009 | Clean-cut renames | server + web names; `generated/graphql.ts` regenerated; `codegen:check` current | Done. A search for the old names outside migrations/frozen shapes finds none in sources |
| REQ-009 / AC-010 | Same-runtime edit, default propagation, restore without a pending switch unchanged | model-only branch of the rule | Preserved. Full unit/integration/web suites green; 316 built-server regression green |
| M-7 | Every holder drops pending and takes the binding | handle spec, `FlatAgentExecutionContext.refreshSelection`, wrapper config, root tree mutators | Done; `runtime-switch-copy-commit.test.ts` (copy records in 3 roots), member activation test |

- Changes stayed within the requirements doc's Scope Guardrail: Yes

## Key Files Or Areas

- Rule and records: `autobyteus-server-ts/src/run-history/domain/runtime-selection-rule.ts`, `run-execution-tree-shared-records.ts`, `run-history/store/*schema*`, `task-agent-own-*`, `agent-team-execution/domain/{team-run-config,task-agent-team-tree}.ts`.
- Commit seams: `agent-collaboration/execution/domain/collaboration-agent-platform-binding.ts`, `team-run-execution-tree-mutator.ts`, `agent-org-run-execution-tree-mutator.ts`, `standalone-root-tree-mutator.ts`, `team-agent-platform-binding-committer.ts`.
- Activation: `agent-collaboration/execution/backends/configured-agent-{execution-handle,activation-planner,switch-attempt,execution-support}.ts`, `root-agent-execution-registry.ts`, `agent-team-execution/local/{flat-team-agent-execution-handle,flat-team-execution-context}.ts`, `registries/task-agent-execution-registry.ts`.
- Saves and renames: `team-run-selection-mutator.ts` (was `team-run-model-config-mutator.ts`), `agent-org-execution/services/*`, `agent-collaboration/domain/delegated-launch-selection*.ts`, `api/graphql/types/{agent-team-run,agent-org-run,run-model-config,delegated-launch-selection}.ts`, `agent-execution/services/stopped-run-selection-context.ts`.
- Readers: `memory-search/runs/memory-run-discovery.ts`, `agent-memory/services/task-team-root-memory-source.ts`.
- Contracts: `autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts` (sources, tests, tracked `dist/`).
- Web: `autobyteus-web/services/runConfigEditing/*`, `stores/{existingRunConfigStore,existingRunConfigEditActions,delegatedLaunchDraftStore,agentOrgContextsStore}.ts`, `components/run-settings/{ExistingRunSettings,RunMemberRow}.vue`, `components/workspace/config/ExistingRunConfigEditor.vue`, `utils/runSettings/{runMemberTree,delegatedLaunchRows}.ts`, `generated/graphql.ts`, localization.
- Docs: `GLOSSARY.md`, server `agent_team_execution.md`, `agent_orgs.md`, `agent_communication.md`, `run_history.md`, `agent_work_journal.md`, `llm_management.md`; web `settings.md`, `chat.md`, `agent_execution_architecture.md`.
- New tests: server unit `runtime-selection-rule`, `member-pending-switch-records`, `configured-agent-switch-activation`, `runtime-switch-member-activation` (3 placements through real roots), `runtime-switch-copy-commit`, `copy-launch-rule-parity`, `team-run-selection-validation-context`; built-server `runtime-switch-members-built-server.e2e.test.ts` (MS-01..04) and DCM-009 in `delegated-copy-model-change.e2e.test.ts`; web specs for drafts, stores, rows.

## Important Assumptions

- A Team's or Org's own default launch has no run and never holds a pending switch; its runtime stays fixed in the UI. Editing a default's runtime carries it to linked members, each of which switches on its own.
- Members and copies start lazily, so a stopped Org is restored (as the Settings page does) before a member is messaged; the switch happens at that member's first input.
- No history means a plain start on the new runtime (REQ-005); the planner decides this at activation, not at save (ARCH-F-007).

## Known Risks

- The launch rule still exists three times (FU-C1 is the designer's convergence follow-up); the parity test is the guard.
- Switching a Team default's runtime switches every linked member at once; each activates separately, so a partially activated Team is a normal state.
- The web runtime control for members uses the same model menu as the root agent card; the menu is not narrowed to server-allowed replacements when the runtime control is open (the server validates on Save, as for the root Agent).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: extend a proven mechanism to more record kinds through one rule and one activation class.
- Reviewed root-cause classification: capability gap (members and copies could not switch), not a defect.
- Reviewed refactor decision: as designed (shared rule extraction, handle helper extraction, clean-cut renames).
- Implementation matched the reviewed assessment: Yes
- If challenged, routed as `Design Impact`: N/A
- Evidence / notes: the one divergence from the design text is mechanical: the handle's termination wrapper moved to `configured-agent-execution-support.ts` (`wrapPreparedLocalTermination`) to keep the handle from growing.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead code in the touched files and modules removed (Core Principle 7): Yes (`AgentModelChoice`, `replaceModelChoice`, `DelegatedHostSelectionValue`, the old mutator file and names are gone)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes (`PendingRuntimeSwitch` reused unchanged; `RecordedPendingRuntimeSwitch` is a one-field mixin)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes
- Changed source implementation files stayed within proactive size-pressure guardrails: Yes. The configured-agent execution handle is 520 lines by raw count (525 before) and 497 non-empty-line count: not grown. `autobyteus-web/stores/existingRunConfigStore.ts` is 501 non-empty lines (503 before): not grown. No other changed source file is over 500. Several files changed by more than 220 lines in total across the ticket (the rule and records, the delegated selection domain, the web drafts); each is the owner of its new behavior and none was split further.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md, "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: Yes
- Direct-use evidence: the new fields are optional with truthful absence; schema tests (`member-pending-switch-records.test.ts`) read old shapes unchanged and write the new fields exactly; the app-data migration suites pass unchanged.
- Migration implementation: N/A
- Deviation from the reviewed transition decision: None

## Environment Or Dependency Notes

- Clean clone at `d3463e0a7e` in `/tmp/clean-348`: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts build` (runs `prepare:shared` and `prisma generate`). The web typecheck needs `nuxt prepare` (part of `pnpm typecheck`).
- The built-server cases need `pnpm -C autobyteus-server-ts build` first and the gate `RUN_AGY_FAILURE_E2E=1` with `ANTIGRAVITY_CLI_COMMAND` set to `tests/fixtures/agy-failure-cli.mjs` (command in each test header). They use test-owned data roots and an isolated HOME; no user data or `~/.autobyteus` was touched, and no secret was used.
- Typecheck baselines: the server baseline shrank from 1200/370 to 1185/366 (files whose type errors my changes removed); the web baseline is unchanged at 99/43.

## Checks Run

Evidence files are in /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/evidence/.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | clean clone; `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts build` | d3463e0a7e | macOS arm64, Node 22 | whole workspace build | all | Pass | evidence/IMP-01-clean-clone-install-build.log | `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.`, exit 0 |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | d3463e0a7e | same | server src + tests | all | Pass | evidence/IMP-02-server-typecheck.log | `production errors: 0; test-file errors: 1185 in 366 files (baseline 1185 in 366 files)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | d3463e0a7e | same | server unit, migrations, architecture | all | Pass | evidence/IMP-03-server-unit.log | `Test Files  921 passed | 5 skipped (926)`, `Tests  7861 passed | 9 skipped` |
| IMP-04 | `test:integration:prepare`; `test:integration` | d3463e0a7e | same | server integration | all | Pass | evidence/IMP-04-server-integration.log | `Test Files  87 passed | 20 skipped (107)`, `Tests  500 passed | 69 skipped` |
| IMP-05 | `pnpm -C autobyteus-web typecheck` | d3463e0a7e | same | web | REQ-001,002,008 | Pass | evidence/IMP-05-web-typecheck.log | `production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)` |
| IMP-06 | `pnpm -C autobyteus-web test:nuxt --run` | d3463e0a7e | same | web unit/component | REQ-001,002,008 | Pass | evidence/IMP-06-web-nuxt.log | `Test Files  686 passed (686)`, `Tests  5008 passed | 2 skipped` |
| IMP-07 | web guards and `codegen:check` | d3463e0a7e | same | web boundary, localization, generated types | REQ-008 | Pass | evidence/IMP-07-web-guards-codegen.log | `autobyteus-web/generated/graphql.ts is current.` |
| IMP-08 | contracts `pnpm test` (both packages) | d3463e0a7e | same | stream contracts | wire | Pass | evidence/IMP-08-contracts.log | collaboration pass 40, team pass 22; tracked `dist/` unchanged |
| IMP-09 | built-server members e2e (gated) | a199e9d543 (dist; tests-only change after) | same + scripted native / Antigravity | Team member, Org members | AC-001,002,005,006,008 | Pass | evidence/IMP-09-built-server-members-e2e.log | `Tests  4 passed (4)` (MS-01..MS-04) |
| IMP-10 | built-server 316 regression (gated) | a199e9d543 | same + fake Grok | standalone switch | AC-010 | Pass | evidence/IMP-10-built-server-316-regression.log | `Tests  8 passed (8)` |
| IMP-11 | delegated-copy e2e (gated), DCM-001..009 | d3463e0a7e (dist from a199e9d543) | same | copies in Team, Org, Agent roots | AC-004,005 | Pass | evidence/IMP-11-delegated-copy-e2e.log | last block: `Tests  9 passed (9)` |
| IMP-12 | affected e2e and integration files | a199e9d543 | same | stopped Org, stopped Agent, task-agent startup, Team manager, application-owned | REQ-007, AC-009 | Pass | evidence/IMP-12-affected-e2e-integration.log | `Tests  22 passed` and the TAU-2 rerun `Tests  3 passed (3)` |
| IMP-13 | \`pnpm -C autobyteus-web test:e2e:existing-run-model-config\` (headless Chrome, fixture page) | working tree after d3463e0a7e, probe fixed in the following commit | macOS arm64, Chrome | Team/Agent Settings save through the real renderer | REQ-001, REQ-008 | Fail, same as base | evidence/IMP-13-existing-run-probe.log | 4 failures (API-E2E-004-A, -D, -E, BROWSER-PAGE-ERRORS), the same 4 at the base commit \`6672bed39f\`; the Team save assertions (B, F) pass |
| IMP-14 | server build, typecheck, `test:unit` (IR-002) | 9e28c019b6 | worktree | server | F-1 | Pass (1 load-sensitive file-watcher test passed alone twice) | evidence/IMP-14-fix-server.log | `Tests  1 failed | 7864 passed` then the file alone `20 passed (20)` |
| IMP-15 | web typecheck, nuxt, guards, codegen (IR-002) | 9e28c019b6 | worktree | web | F-1, F-2 | Pass | evidence/IMP-15-fix-web.log | `Tests  5013 passed | 2 skipped` |
| IMP-16 | `test:e2e:runtime-switch-members` (rendered, real built server) | 9e28c019b6 | worktree + Chrome | Team, Org (direct, nested), copy rows | AC-001,002,004,005,008 | Pass | evidence/IMP-16-rsm-probe.log | `RSM-01..RSM-05 Pass` |
| IMP-17 | gated built-server: members e2e, agent-org-runs, delegated-copy | 9e28c019b6 | worktree | Org config wire | F-1 | Pass | evidence/IMP-17-fix-built-server-e2e.log | `Tests  16 passed (16)` |
| IMP-18 | web typecheck, nuxt (IR-003) | 4c7a70698d | worktree | web Org config adoption | F-3 | Pass | evidence/IMP-18-f3-web.log | `Tests  5016 passed | 2 skipped` |
| IMP-19 | `test:e2e:runtime-switch-members` after F-3 | 4c7a70698d | worktree + Chrome | Team, Org, copy rows | AC-001,002,004,005 | Pass | evidence/IMP-19-rsm-probe-after-f3.log | `RSM-01..RSM-05 Pass` |

Runtime pairs actually run, each with the previous agent's records asserted as the only content of its archived segment (I-7): native -> Antigravity (Team member, two Org members), Antigravity -> native with a failed start then a retry (Team member), Antigravity -> Grok (delegated agent copy in the Team, Org and Agent roots); the 316 cases cover native <-> Antigravity and Grok for a standalone run. The new Org and Team cases were first run red on harness mistakes (stream envelopes, a stopped Org must be restored first), not on production behavior.

- Not run, and why: a live Claude Agent SDK / Codex App Server pair (needs the user's own sign-in or the test vault; an isolated HOME has no credentials; left to API/E2E with the vault); an Org member or a copy with a failed start in the built server (the failed start is built-server-tested for a Team member and unit-tested at all three placements); browser rendering of the new row controls (see below); `test:electron` and `autobyteus-ts` suites (no Electron or core-library code changed).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Edit config of a stopped Team and Org run (member rows, mounted Team rows) and of a run's delegated copy rows; the runtime change hint.
- Approved references: requirements doc REQ-001/002; the 316 root-card behavior.
- Existing components reviewed: `RunSettingsCard`, `ChatModelMenu` (runtime-locked mode), `RunMemberRow`, `ExistingRunSettings`.
- Rendered surface used (IR-002): the RSM probe (`test:e2e:runtime-switch-members`, IMP-16) renders the real Settings on a built server for a Team member, a direct Org Agent, a mounted-Team Agent and a copy row: RSM-01..05 pass. Before that, the existing browser probe (headless Chrome, fixture page, IMP-13) exercises the Team Settings save with the new patch shape; it has four failures that also fail at the base commit (the locked-runtime menu locator and a blocked-port websocket console error), so it is not a clean pass. I did not otherwise render the new member and copy rows in a browser or an isolated instance. The behavior is covered by component and store specs (`RunMemberRow.runtime.spec.ts`, `ExistingRunSettings.runtime.spec.ts`, `ExistingRunConfigEditor.delegatedSave.spec.ts`, `existingRunConfigStore.spec.ts`, draft specs) and by the built-server mutations the UI sends.
- Visual or interaction issues found and corrected: none observed (not rendered).
- Limitation: layout, menu behavior with the open runtime control on nested member rows and the hint's placement are unverified visually. A browser probe of Edit config on a stopped Team and a stopped Org is the first thing to run.

## Downstream Coverage Hints / Suggested Scenarios

- Browser or isolated-instance journey: stop a Team, open Edit config, switch one member's runtime, Save, send that member a message, reopen the chat; repeat for an Org member and a delegated copy.
- A Team default runtime change with linked members (cascade) followed by messages to two members in different orders.
- A live Claude <-> Codex pair with the test vault (I-7 asserted on both archived segments).
- A failed start for an Org member and for a copy on the built server.
- Restart between the save and the first message for a Team member (pending survives) and for a copy.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Everything above that is marked not run. The API/E2E engineer owns broader coverage, the rendered web journey and the live runtime pair.
