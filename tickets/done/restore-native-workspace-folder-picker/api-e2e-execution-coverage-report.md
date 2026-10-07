# API/E2E Execution Coverage Report — Native Workspace Folder Picker

## Latest Authoritative Result
**Pass — API-REV-001, round 1, 2026-10-07. Final validation confidence 95%.**
89 current repository tests (84 renderer/caller/service/store/gate, 5 preload) and all 8 final native-assisted packaged/API cases passed. Broader validation **Required → completed**; no critical scoped AC lacks proof. No production defect or design escalation found. This is executable validation, not final user verification or release approval.

**Execution incident requiring disclosure:** after a failed harness attempt cleaned up its isolated instance, CUA app selection auto-launched the closed worktree bundle without isolated arguments (observed PID4683). No tests or UI actions used that process; it was immediately terminated by exact owned PID. Default startup may have accessed the default profile. **We cannot certify that user data was untouched by that startup.** No existing user process was stopped/reused, and no default data was inspected, reset, or deleted. All reported functional validation used isolated instances. Delivery must carry this disclosure into user verification; do not present this round as incident-free.

## Execution Round Meta / Cumulative Authority
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker`; branch `codex/restore-native-workspace-folder-picker`; target `origin/personal`.
- Production implementation: `39d0e996258fe3688963748899636f8ec02144b1`; incoming package HEAD `f8eff6e07`; base `88fad73cbd20201642acdcfe75e69b1897ec135c`. API changes are tests, runbook and evidence only.
- Ticket directory T: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker`; evidence directory E: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence`. Evidence paths below are relative to E unless otherwise stated.
- Approved requirements: T/`requirements-doc.md`, T/`requirements-approval.md` — R3, UREQ-001.
- Investigation/design/history: T/`investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `solution-handoff.md` — SR-007.
- Trigger: initial Implementation Engineer handoff T/`implementation-handoff.md` and `implementation-revision-record.md` — IR-001.
- Product authority: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-ux-spec.md`, `user-confirmation.md` (UCONF-001), `visual-references/manifest.json`. Complete active supplement inventory remains in T/`api-e2e-coverage-investigation.md` and upstream handoff; no reference or approval superseded.
- Canonical current investigation, ledger and history: T/`api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`.
- Architecture/source-review reports and revision records: **N/A — not applicable**, direct Small/Low route.
- Prior completed API result, triggering finding IDs, delivery report/revision IDs: **N/A — not applicable**. Attempts 01..05 are intra-round executions, not invented prior approvals.

## Routing Classification
- task_size **Small**; architectural_risk **Low**, unchanged.
- Input **Direct Low-Risk**; successful output **Delivery**.
- Proportional test-code review: **Not Required — direct low-risk route**.
- Fresh get_handoff_rules returned the direct Small/Low Pass rule with exact recipient **/delivery_engineer**; selected that rule only.
- No push, merge, tag, release or deployment performed.

## Investigation And Execution Basis
Investigation and multi-case ledger were written before durable test edits and broader execution. Existing coverage retained as Still Valid; no tests removed or production assertion relaxed. Initial narrow tests preceded callers/services, scorecard and packaged execution. Root DESIGN.md/TESTING.md, package AGENTS.md, documented isolated-app CLI and current repository E2E patterns govern execution.

The testing guide's named `autobyteus_mcps/browser-automation` skill was not available in this checkout/tool set. Used the existing repository probe pattern: Playwright CDP attaches only to the isolated CLI's reported control endpoint; real OS dialogs operated through computer-use. No alternate user desktop or bridge mock substituted. Actual Settings controls own locale changes; public GraphQL creates fixtures; Pinia reads are evidence only, not state injection.

Two harness assumptions failed during probe development and were corrected without production changes:
1. run02 expected Edit Config before selecting a member from the legitimate no-recipient Org landing.
2. run03 expected a member section to stay expanded across Stop/remount.
Corrected user journey selects /product and re-expands after Stop. Raw failures retained in caller-run-02/03; caller-run-04 and native-run-05 prove resolution. The separate auto-launch incident above is not a product finding and is not concealed by passing tests.

## Compatibility / Persisted-Data Scope
Upstream removal and persisted-data checks reviewed against the production diff. No compatibility wrapper, legacy branch, dual reader/writer, migration, reset or schema change. No compatibility-only test added or retained.
Approved decision **Not Affected** followed. Representative saved Org data was created through Run, read through `getAgentOrgRunConfig`, stopped, edited and explicitly saved/read back through current production paths. This is preserved current-reader/save proof, not an upgrade/migration certification.

## Changed Boundary / Acceptance Evidence
| Cases | Requirements / AC | Boundary and actual evidence | Final result |
|---|---|---|---|
| FP-001 | SCN004/005; AC003/005/007 | 29 real-menu controlled tests: error-member precedence including empty error, rejection, silent cancel/empty, pending double/submit/Enter prevention, stale/lifetime/context/focus, search/temp/manual/placement | Pass |
| FP-002 | SCN001..003/005; AC002/004/006/007 | Actual menu/card/member plus ExistingRunSettings root ownership; real gate policy; Chat/Org launch resolver and saved-config store; public preload full-result/rejection transport | Pass |
| FP-003 / FP-P01 | AC001..008 | Source-current full desktop build, real isolated backend/CDP, public catalog/workspace fixtures and bundle hash | Pass |
| FP-004 / FP-P02 | SCN001; AC001/003/006 | Agent Chat → native OS choice → input only; focus input; no GraphQL mutation, selection change or registration until Use folder; then correct pending folder | Pass |
| FP-005 / FP-P03 | SCN004; AC003/005 | Tab/Enter native opening, real Cancel button and native Escape; typed text/selection preserved, silent feedback, Browse focus; later renderer Escape closes form | Pass |
| FP-006 / FP-P04/05 | SCN001/002/005; AC001/002/006 | Team known directory reuses ID; Org root and /product native choices target their correct owner only; /other unchanged; no registration from browse/apply | Pass |
| FP-007 / FP-P07 | SCN002; AC002/006/007 | Real no-message Org Run, active/root locks, Stop, native saved-member input, Use folder leaves API tree unchanged, explicit Save sends only /product workspace patch, real persisted readback | Pass |
| FP-008 / FP-P06/08 | SCN003/004/005; AC004/005/007/008 | Full actual caller desktop/narrow en/zh-CN; invalid/manual path + Cancel; long text/no overflow, exact style geometry; controlled local/remote/browser/mobile/error matrix complements actual native run | Pass |
| FP-009 | AC001..008 | Repeat probe, exact source-current asar, owned cleanup receipts and final list | Pass |

Critical native integration is direct OS evidence; controlled errors/context/lifetime are direct assertions at their changed renderer boundary, **not induced OS-error or remote-device proof**. AC008 uses actual layouts plus approved Product reference comparison, not pixel-identical surrounding fixtures.

## Exact Reproduction / Executed Commands
All commands below have cwd `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker`. Dependencies were already installed by Implementation; no new dependency/lockfile change.

| Command | Result | Evidence |
|---|---|---|
| `pnpm -C autobyteus-web test:nuxt components/chat/__tests__/ChatWorkspaceMenu.spec.ts components/chat/__tests__/ChatWorkspaceMenu.nativeFolder.spec.ts --run` | 29 pass, initial narrow | menu-tests.log |
| `pnpm -C autobyteus-web test:nuxt components/run-settings/__tests__ utils/__tests__/mobileFeatureGates.spec.ts services/chat/__tests__/chatLaunchService.spec.ts services/agentOrgExecution/__tests__/agentOrgLaunchService.spec.ts stores/__tests__/existingRunConfigStore.spec.ts --run` | 51 pass, before 4 new root-policy assertions | caller-tests.log |
| `pnpm -C autobyteus-web test:electron __tests__/preload.spec.ts --run` | 5 pass, initial and final | preload-tests.log; preload-final.log |
| `pnpm --silent isolated-app start --build`, then exact-ID `isolated-app stop iso-60871-e991` | Full build/readiness and owned stop pass | build.log; start.json; build-instance-stop.json |
| `pnpm -C autobyteus-web test:e2e:workspace-folder-picker --skip-build --native-assisted --output-dir /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05 --ledger-file /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-test-case-ledger.md` | all 8 pass; real OS assistance, five native directory choices + Cancel/Escape | native-run-05.log; native-run-05/evidence.json; native-observations.md |
| `pnpm -C autobyteus-web test:nuxt components/run-settings/__tests__/RunSettingsCard.workspace.spec.ts --run` | 8 pass after coverage addition | saved-locks-tests.log |
| `pnpm -C autobyteus-web test:nuxt components/chat/__tests__/ChatWorkspaceMenu.spec.ts components/chat/__tests__/ChatWorkspaceMenu.nativeFolder.spec.ts components/run-settings/__tests__ utils/__tests__/mobileFeatureGates.spec.ts services/chat/__tests__/chatLaunchService.spec.ts services/agentOrgExecution/__tests__/agentOrgLaunchService.spec.ts stores/__tests__/existingRunConfigStore.spec.ts --run` | final 84 pass / 9 files | repository-final.log |
| `node --check autobyteus-web/tests/e2e/workspace-folder-picker-probe.mjs`; `pnpm -C autobyteus-web guard:web-boundary`; `pnpm -C autobyteus-web guard:localization-boundary`; `git diff --check` | pass | final-checks.log |
| `pnpm --silent isolated-app list` | no task instances remain; unrelated records untouched | final-checks.log |

Earlier probe attempts use the same script/output-dir/ledger arguments: native-run-01 used --native-assisted, caller-run-02/03/04 omitted it. Native P03 is explicitly Not Tested in manual-only attempts. Latest native-run-05 supersedes their gaps, not their history. Source build precedes --skip-build; only tests/scripts/docs changed afterwards.

## Broader Validation / Actual Environment
Decision **Required**, because repository-only confidence was 72.14% with missing actual OS/full-caller boundaries. Selected **Project Desktop Validation**, completed.
- Darwin 25.5, arm64; Node22.23.1; pnpm10.28.2; Electron42.4.1; Chromium148.0.7778.265; app1.4.96-beta.2.
- Source-current executable: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus`.
- Asar SHA256: `89988272f75a937f841cf6d4e1b6a388493ceb87cdb8fdb7af3b7bde647f234d`, same across five runs.
- Final run 2026-10-07T18:15:55.430Z–18:18:59.668Z, iso-62325-e520, PID54911, control62325/backend62326.
- Renderer1512×862 and390×844 by CDP metrics; mobile=false. English then Settings-selected zh-CN. German native OS “Öffnen”/“Abbrechen” chrome is allowed platform variance. Host timezone Europe/Berlin.
- Dedicated CLI-owned private SQLite/data root, own canonicalized empty directory fixture. Public createAgentDefinition/createAgentTeamDefinition/createAgentOrgDefinition/createWorkspace; Agent→Team lead→Org /product and /other. No credentials or provider model turn.
- Real GraphQL request capture and API reads corroborate UI. Only intended registration at Run, CreateAgentOrgRun, TerminateAgentOrgRun, UpdateStoppedAgentOrgRunConfig; no browse-triggered mutation. Saved patch has empty modelPatches and exactly one /product teamWorkspacePatch. /other remains Org-root path.
- Actual Org run `folder_proof_org_1ff69cbeec834dac92c6e61c28b66b8d` was owned disposable data. No paid Send/agent inference requested.
- Desktop menu384; input34px; 14px/20px; radius6; gap8; padding6/12. Narrow menu x8/right382/width374; saved-member menu bottom852 in862 viewport. Long path contained. Screens/state: native-run-05/{agent-selected,team-known,org-root,org-member,org-narrow-long,saved-active-locked,saved-member-draft,saved-member-committed,chat-zh-1512,chat-zh-390}.{png,json,txt}.
- Product VIS-002 selected / VIS-007 member inspected against actual full caller renders; broader approved reference checks retained in implementation render evidence. No in-scope visual mismatch. No renderer page errors in final run.

## Mandatory Confidence Scorecard
Scores concern scoped product behavior, not a probability or an incident-free environment claim.
| Category | Post-repository | Final | Evidence gained / residual |
|---|---:|---:|---|
| Requirements / AC | 75% | 95% | Every scoped material AC mapped above; mac native/full callers supplement controlled errors/gates. Not universal-platform certification. |
| Changed-boundary directness | 75% | 95% | Actual source-current shared component→preload→main→OS→input; no mocked bridge in native run. Induced OS failures not run. |
| Cross-boundary realism / mock gap | 50% | 95% | Real backend/workspace registration and Org lifecycle/save/readback. Unchanged Agent/Team Send uses service tests, not paid inference. |
| Environment / identity / fixtures | 75% | 95% | Exact worktree artifact, owned public API fixtures, private instance and hash. Real run evidence isolated; separate auto-launch safety incident remains disclosed and is not a fidelity claim for that process. |
| Failure / edge / lifecycle / recovery | 90% | 95% | Controlled full error/lifetime matrix plus real native Cancel/Escape and post-Stop/Save recovery. OS permission failure not injected. |
| User-surface / desktop shell | 50% | 95% | Actual native keyboard/focus and full callers/locale/narrow geometry. Physical mobile, screen-reader and linguistic certification outside scope. |
| Durable regression relevance | 90% | 95% | Existing valid tests plus real-policy locks and repeatable packaged/API probe; native assistance required and honestly labeled. Not fully unattended OS automation. |

Arithmetic mean: post-repository505/7 = **72.14%**; final665/7 = **95%**; gain22.86 points. No final category <90%; clean product-confidence target met. Every critical scoped AC directly proven at the appropriate boundary. No further material broader behavior-validation gap remains for this bounded restore; incident disclosure/user verification remains a delivery responsibility, not hidden score credit.

## Durable Coverage Changes
| Path relative to worktree | Change / role | Execution |
|---|---|---|
| autobyteus-web/tests/e2e/workspace-folder-picker-probe.mjs | Added owned packaged/API probe; FP-P01..08; native-assisted mode and truthful manual-only limitations | all8 native cases pass |
| autobyteus-web/components/run-settings/__tests__/RunSettingsCard.workspace.spec.ts | Added 4 cases proving actual ExistingRunSettings policy: locked saved Agent/Team/Org roots and active vs stopped member draft-only intent | all8 file cases pass |
| autobyteus-web/package.json | Added test:e2e:workspace-folder-picker entry, no dependency change | final native command pass |
| TESTING.md | Added setup, evidence, native assistance, ownership/safe bind, no-inference and scope-limit runbook | followed during execution |

No durable coverage removed. Added/updated paths included in cumulative handoff; independent test-code review **Not Required — direct low-risk route**. No production code changed in API stage.

## Ledger Reconciliation
Ledger initialized before execution: Yes. Completed probe cases logged immediately and build/native checkpoints recorded. Final FP-001..009 all Pass; FP-P01..08 final Pass. No running/interrupted/unstarted in-scope cases. Last final events: repository84/preload5 pass and final cleanup/report reconciliation.
- Native-run01: first six cases pass.
- Caller-run02/03: FP-P07 harness failures retained and resolved; P03 Not Tested by design in those manual modes.
- Caller-run04: seven executed cases pass, P03 Not Tested.
- Native-run05: all8 pass; authoritative completed native result.
These are not five completed validation rounds. API-REV-001 is first completed result.

## Residual / Not-Tested Scope
- Real macOS native path only. No Windows/Linux native certification; 390px is renderer metric emulation, not a mobile OS/device.
- Browser/remote/mobile eligibility, errors/rejection/empty/error+canceled and stale lifetimes use actual production components/policy with controlled dependencies. No connected remote node, OS permission-failure induction or physical-mobile end-to-end session.
- English/Chinese authored copy/render observed; no independent translation, exhaustive screen-reader or OS-wide accessibility audit.
- Agent/Team draft and known reuse are live; unchanged launch resolution/save guards are repository coverage. No paid model Send/inference, unrelated distributed runtime or restart/upgrade program.
- Full Vue static check remains **Not run: vue-tsc unavailable** from implementation, not a pass. Desktop build/Electron typing does not replace it. Product repository's historical static stack-overflow is a distinct limitation.
- The auto-launch incident's possible default-profile access is unknown. No speculative data cleanup or inspection was performed. User-facing disclosure is required.

## Cleanup And Retained Evidence
| Resource | Ownership / action | Result |
|---|---|---|
| Build instance iso-60871-e991 | exact CLI ID stop | both ports free, data removed; build-instance-stop.json |
| Probe iso-61285-8808 / iso-61809-c591 / iso-62033-8e28 / iso-62171-fe0b / iso-62325-e520 | each probe stops its own exact instance in finally | all stop receipts: forced=false, dataRootRemoved/controlPortReleased/serverPortReleased=true |
| Per-run autobyteus-folder-picker-* fixture dirs | own mkdtemp only | removed; final fixtureRemoved=true |
| Accidental nonisolated PID4683 | exact observed worktree process terminated immediately; no testing on it | process gone; no assertion of untouched default profile |
| Final app state | CLI list + owned bundle process check | no task instance/process remains; unrelated apps/records untouched |
| Generated contracts/dist and backend-sdk/dist | build output | untracked, not staged; retain for Delivery, not source |
| Temporary setup script | API-owned /tmp/folder-picker-init.py | removed |

Staged diff checking initially flagged terminal-log trailing whitespace/blank EOF lines; normalized only trailing whitespace in retained .log files, with no result content removed. Retained E/build.log, repository logs, initial failure evidence, native-observations.md, each run's JSON/screenshots/state and final copied isolated-app.log. No secrets used. Temporary OS computer-use was needed because native dialogs are outside DOM automation; persisted native action receipt and live renderer/API outcomes carry that boundary evidence. No bridge-stub “native” claim.

## Preliminary Classification / Handoff
No unresolved product failure: failure-origin reroute N/A. Corrected harness navigation/remount assumptions were API-owned local execution fixes inside this baseline. Safety incident remains explicitly disclosed, not an implementation defect.
Successful-output route Delivery; fresh get_handoff_rules selected exact recipient **/delivery_engineer** for direct Small/Low Pass. Delivery owns integrated docs, explicit user verification (including incident disclosure), finalization and any authorized release/cleanup. The current package does not authorize a merge/release by itself.
