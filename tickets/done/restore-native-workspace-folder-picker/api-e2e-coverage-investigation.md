# API/E2E Coverage Investigation

## Investigation Meta / Routing
Round 1, 2026-10-07, initial IR-001 against SR-007 / R3 UREQ-001 / Product UCONF-001. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker; source 39d0e996258fe3688963748899636f8ec02144b1; input HEAD f8eff6e07. Prior API results N/A. Small / Low; Direct Low-Risk; successful output Delivery; test-review decision **Not Required — direct low-risk route**. Architecture/source review reports and revision records, delivery re-entry: **N/A — not applicable**. Canonical ledger/report/revision files are alongside this investigation.

## Active Cumulative Basis
- /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/requirements-approval.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/solution-handoff.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/implementation-handoff.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/implementation-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-ux-spec.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/user-confirmation.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/visual-references/manifest.json
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/product-handoff.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/final-validation.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-behavior-test-matrix.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/integration-record.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-reference-runbook.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/baseline-reevaluation.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/scoped-baseline-check.json
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/review-round-1.md
- /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/product-ticket.md

Complete external supporting inventory and historical approval snapshots remain indexed by implementation-handoff and investigation-notes; no competing UI spec authored. Product images/fixture checks are reference evidence, not native proof. Product whole-root static overflow and production unavailable vue-tsc are distinct limits.

## Supported Behavior / Changed Boundaries
SCN-001..005 / BEH-001..004: local embedded non-mobile Browse provides text only. Use folder alone chooses known/folder union; Save/Send/Run remain separate. Cancel/empty silent, error-member before canceled, rejection inline, pending single request and guarded confirmation, lifetime stale-result rejection and focus, manual/search/temp/locks unchanged. REQ-001..005 / AC-001..008 all active. No unsupported/contrived designer scenarios; no additional product obligation inferred.

| Surface | Affected / risk | Evidence / selected mode |
|---|---|---|
| Frontend component, renderer, browser journey | Yes; input/pending/focus/localization | Nuxt components, durable caller regression and rendered actual callers |
| Native host IPC / OS | Integration yes; main/preload code unchanged, mocks bypass OS | Electron tests plus source-current isolated desktop and actual OS UI |
| Domain/API/backend/persistence | Production unchanged; explicit apply/save/launch preservation | Existing services/store tests plus network/state observation of owned desktop |
| Process/form lifetime | Local ephemeral state yes; no process ownership change | Pending result unit cases, real OS focus/Escape |
| Authentication/external providers/workers/distributed | No change | No model inference, secrets or paid services needed |
| Persisted transition | Not Affected | No schema/read/write/migration; no legacy/compatibility branch found |

## Project Execution Discovery
Authorities: /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/AGENTS.md, DESIGN.md, TESTING.md; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/autobyteus-web/AGENTS.md, README.md, ARCHITECTURE.md, package.json, vitest.config.ts, electron/vitest.config.ts; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/docs/isolated-app-instances.md and skills/autobyteus-isolated-app/SKILL.md. No closer testing guideline. Node22/pnpm10; Nuxt3/Vue3, Vitest3/happy-dom, Electron42. All one-shot tests use --run. Existing generated contracts/dist retained untracked, never staged.

Owned setup: normal `pnpm --silent isolated-app start --build`, auto-free server/control ports and disposable private data root. Readiness is real /rest/health and renderer CDP. Only reported instance ID/ports used; stop exact ID via CLI and verify ports free. Browser automation attach-only / project Playwright CDP probe patterns permitted for renderer, OS computer-use for picker. Native chooser not simulated as native proof. Plan: never target user app/data. All tests used isolated data; the later auto-launch safety deviation is recorded in the ledger and report. Minimal owned empty directories and catalog Agent/Team/Org fixtures using public setup/API where available. No credentials required. Do not run costly existing run-settings live model suite merely to check a folder field.

## Existing Durable Coverage Inventory
| Path (relative to autobyteus-web) | Assertion / relation | Decision / action |
|---|---|---|
| components/chat/__tests__/ChatWorkspaceMenu.nativeFolder.spec.ts | 21 response/error/pending/lifetime/eligibility cases, AC003..007 | Still Valid; retain/run; mocks are not OS proof |
| components/chat/__tests__/ChatWorkspaceMenu.spec.ts | search/temp/keyboard/menu placement AC007 | Still Valid; retain/run |
| components/run-settings/__tests__/RunSettingsCard.workspace.spec.ts | real shared menu/card/member intent/locks AC002/006 | Still Valid; retain/run; stops at intent |
| components/run-settings/__tests__/OrgLaunchPage.spec.ts, RunMembersLine.spec.ts | caller mapping/inheritance | Still Valid; retain/run |
| electron/__tests__/preload.spec.ts | full response and rejection transport | Still Valid; retain/run; mocked IPC |
| utils/__tests__/mobileFeatureGates.spec.ts | actual gate policy AC004 | Still Valid; retain/run |
| services/chat/__tests__/chatLaunchService.spec.ts, services/agentOrgExecution/__tests__/agentOrgLaunchService.spec.ts | explicit launch resolution/registration, dedupe AC006 | Still Valid; retain/run |
| stores/__tests__/existingRunConfigStore.spec.ts | saved Org workspace intent to explicit Save and invalid/locked scopes AC002/006 | Still Valid; retain/run |
| tests/e2e/run-settings-live-probe.mjs | real model run settings/save; broad costly configuration regression | Still Valid but Out Of Scope execution; use focused new probe, do not replace |
| tests/e2e/team-reload-member-freshness-probe.mjs, event-monitor-file-preview-probe.mjs | isolated app/data/CDP/public catalog setup | Still Valid; reuse patterns, not their unrelated assertions |

## Durable Coverage Decisions
Add focused `autobyteus-web/tests/e2e/workspace-folder-picker-probe.mjs` if desktop setup succeeds: own isolated build/fixtures, real shared callers, explicit apply/no mutation proof and snapshots; keep OS picker actions explicit/manual when portable automation cannot drive native UI. Add/update narrowly scoped real-caller tests if gaps remain after probe. No removals or obsolete tests identified. No production changes authorized in this stage.

## Planned Execution / Ledger
Ledger required: multiple independent journeys, long build and interruption risk. /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-test-case-ledger.md initialized before execution. Narrow tests first, broader callers/services/stores second, source-current native build third. Case mapping and exact commands in ledger.

## Confidence And Broader Validation Decision
Post-repository scorecard pending execution (not a pass). **Broader Required — Project Desktop Validation**: unit mocks cannot prove native OS open/select/Escape/focus, actual caller containment and renderer/backend no-browse side effects. Expected evidence gain: direct critical AC001..003/005 proof. Target >=95% overall with no category <90%, cannot average away missing critical AC. Temporary OS-assisted journeys acceptable because native UI varies by platform and cannot be truthfully replaced by response stubs; retain precise steps and semantic observations. No full-platform/physical-mobile/screen-reader/translation certification claimed. OS permission-error injection is controlled boundary proof only.

## Not Tested / Escalation Triggers
Other OSes, physical mobile keyboard, comprehensive accessibility/linguistic QA outside bounded certification. Full Vue static check currently unavailable, frontend bundling not static proof. If existing host bridge cannot satisfy approved native semantics, classify Design Impact; do not rewrite IPC/window ownership or weaken expected behavior. Proceed to execution: Yes; no reroute before execution.

## Post-Repository Result / Confidence Gate
Fresh API execution: 29 native-menu/search tests, 51 caller/service/store/gate tests and 5 preload tests pass (85 total), logs api-e2e-evidence/menu-tests.log, caller-tests.log, preload-tests.log. Commands in ledger/execution shell; cwd task root. No durable coverage edits yet.

| Category | Score | Rationale / needed evidence |
|---|---|---|
| Requirements / AC | 75% | Controlled semantics proven; critical native/caller journeys missing |
| Changed-boundary directness | 75% | Actual menu but synthetic native host |
| Integration realism / mock gap | 50% | OS/main/renderer crossing unexecuted |
| Environment / identity / fixtures | 75% | Clean worktree tests, private desktop not yet built |
| Failure / edge / lifetime | 90% | Error/cancel/stale guards direct assertions; native Escape unknown |
| User-surface / desktop-shell | 50% | Implementation preview only, not native proof |
| Durable regression relevance | 90% | Strong component/owner suite; no folder native journey probe |

Overall **72.14%**, arithmetic mean 505/7. Critical AC directly proven: No. Target unmet; broader validation Required as planned. No inference of failure from lack of evidence.

## Broader Checkpoint / Coverage Refinement
Native-assisted FP-P01..06 passed on source-current Electron42/macOS arm64: 4 real OS directory choices (Agent, Team known, Org root, /product member), native Cancel button and native Escape, all required focus/explicit-apply/no-registration assertions. CUA targeted exact owned .app path; selector API and native main/preload unmodified. Mac chooser German chrome is allowed OS variation. Source build succeeded, both launch instances cleaned up with free ports; no user app touched.

Durable probe added under planned path and package script. Its native-assisted mode waits for real OS choices, never returns canned host values; unassisted mode labels native Cancel/Escape Not Tested. Native mechanism evidence is OS-assisted, not fully unattended native automation. FP-P01..06 = FP003/004/005/006/008 subset. Evidence api-e2e-evidence/native-run-01. Add FP-P07 real Org Run (without a message/model turn), active locks, Stop, saved member draft then explicit Save/readback; add FP-P08 Settings-owned zh-CN Chat desktop/narrow. These close preserved lifecycle/layout gaps, no production changes.

FP-P07 run02 first attempt is a harness navigation failure, not production: real Org Run produced the approved unfocused landing, and the script skipped the user's member-selection action before expecting Edit Config. Update durable journey to select actual /product sidebar row first. Preserve run02 evidence. No requirement/production assertion changed. Safety deviation and immediate owned-PID cleanup are recorded in ledger; future CUA only during explicit native waits, no post-cleanup rebinding.

FP-P07 run03: real launch, member select, active lock checks and Stop succeeded. Test then waited for a field in a member section that collapses when Stop remounts saved settings; read-only live DOM confirmed stopped page with collapsed product/other rows. Harness fixed to wait for stopped state and explicitly re-expand /product. No weakened assertions or source changes. Save proof still outstanding until rerun.

## Final Coverage Addition Decision
Native-run05 completed all 8 durable cases including actual native saved-member selection plus real Save/readback. Remaining inexpensive durable policy gap: RunSettingsCard locks were tested only with supplied flags, while ExistingRunSettings owns those flags. Add actual ExistingRunSettings root-policy assertions for Agent/Team/Org and active-vs-stopped Org member editability to the existing real-menu suite. This directly preserves AC002/007 across root kinds; no production edit, no removed assertion.

## Completed Baseline — API-REV-001
Plan completed with narrow durable additions above. New ExistingRunSettings policy tests8/8; final affected repository rerun84 renderer/caller/store/service/gate and5 preload =89/89 current tests. Final durable native-assisted probe all8 cases Pass, including saved member. Exact commands, build/runtime/hash, API mutations/readback, visual geometry and cleanup are in canonical api-e2e-execution-coverage-report.md; ledger fully reconciled.

Final scorecard: requirements95; directness95; integration realism95; environment/fixtures95; failure/lifecycle95; user/shell95; durable regression95. Mean665/7=95%, up from72.14%. Real native and backend/full callers closed the material gap; bounded platform/static/controlled-edge limits remain explicit. No critical scoped AC unproven, no production changes or requirement/design reroute. Broader **Required → completed**, result **Pass**. Not Required — direct low-risk route for test review.

Execution plan deviations: documented browser-automation skill unavailable; used current repository-owned Playwright/CDP probe pattern plus actual OS computer-use. All validation attaches to owned isolated CLI endpoints. Separately, an after-cleanup CUA binding auto-launched the worktree bundle unisolated; immediately stopped exact own PID, no tests used it, but possible default-profile access cannot be ruled out. This disclosure remains prominent in the report; “all tests isolated” is not “all startups isolated.” Prevention added to TESTING.md. Delivery must disclose this during user verification.

Legacy/compatibility clean; persisted-data Not Affected confirmed and normal current saved read/save exercised. Architecture/source review and triggering delivery records N/A. Small/Low unchanged. Complete upstream artifact inventory remains active.
