# API/E2E Execution Coverage Report — workspaces-sidebar-dock

## Execution Round Meta
**Round 1 / API-REV-001 / Pass / 95%**. Initial Implementation Complete IR-001, approved R1/SR-001 and completed design SR-002. No prior authoritative API/E2E result or confidence. Assigned worktree `/home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock`, branch `codex/workspaces-sidebar-dock`.

Canonical ticket directory (all artifact names below resolve against this absolute path):
`/home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock`.

Upstream authorities read: requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md, solution-handoff.md, implementation-handoff.md, implementation-revision-record.md; original screenshot inventory and implementation baseline evidence. Current validation authorities: api-e2e-coverage-investigation.md, api-e2e-test-case-ledger.md, this report, api-e2e-revision-record.md. Architecture/source review reports and revision records, Product supplements, delivery/rework reports: **N/A — not applicable**. User screenshots are evidence-only, not prescribed data fixtures.

## Routing Classification
- Task size **Medium**; architectural risk **Low**, preserved.
- Input **Direct Low-Risk**; successful output **Delivery**.
- Test-code review **Not Required — direct low-risk route**. Narrow maintained test/fixture/package script self-inspected; no production edits in this stage.
- Production commit `1262714f6494a1292b69bda1f0cda02f2c2f1014`; durable coverage commit `6bb3c822c13a82815f70c279866ab5afbe959fbd`. Artifact commits do not claim an installed update.

## Investigation And Execution Basis
Investigation and ledger created before coverage changes/execution. Root TESTING.md/AGENTS.md/DESIGN.md, web/server AGENTS.md, package/README testing and docs/isolated-app-instances.md followed. No closer TESTING guideline. Narrow repository→adjacent→build→browser/current desktop→negative discrimination→restored checks. No invalid upstream compatibility or stale assertion found.

Material execution refinements: strict boundary fixture and real pointer controls; actual Electron did not implement CDP Browser window commands, so native **xdotool targeted only the returned instance PID's X11 window**. Private baseline PATH/HOME allowed a test-owned AGY wrapper despite filtered test runtime variables. Alternate workspace/run selection moved from duplicate fixture selection to real Electron. Explicit root-Agent selection normally enters `/chat?id=<run>`; Workspaces preserves that current route, not an invented `/workspace` invariant across explicit selection.

## Acceptance-Criteria Proof
**Evidence folder:** [evidence/api-e2e/](evidence/api-e2e/). Relative links in this table are the direct review index. JSON assertions are primary proof; screenshots support them.

| AC | Critical | Proven by | Evidence | Result |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | REP-001/002; BR-001 | [browser-final/evidence.json](evidence/api-e2e/browser-final/evidence.json): `cases.BR-001`, wide snapshots; [1000 Team](evidence/api-e2e/browser-final/1000-teamMembers-max-0.png), [1280 Activity](evidence/api-e2e/browser-final/1280-progress-max-0.png), [1440 Team](evidence/api-e2e/browser-final/1440-teamMembers-max-0.png); [old-source failure](evidence/api-e2e/browser-old-source/evidence.json), [old-source scrim](evidence/api-e2e/browser-old-source/1000-teamMembers-intermediate.png) | Proven |
| AC-002 | Yes | REP-001/002; BR-002/004 | [browser-final/evidence.json](evidence/api-e2e/browser-final/evidence.json): `nav-320-capacity-929/930/931`, `nav-520-capacity-1129/1130/1131`, `automatic-1209/1210/1211/1259/1260`; [restored repository log](evidence/api-e2e/restored-repository.log) covers260/320/520 nav policy boundaries | Proven |
| AC-003 | Yes | BR-001/002; DT-001 | [browser-final/evidence.json](evidence/api-e2e/browser-final/evidence.json): each wide/tab3cycles, restore, raw preference, intent, drift/observer equality,52/52 hit checks and26/26 pointer focus+tab click effects; [desktop-docked-0](evidence/api-e2e/desktop-06/desktop-docked-0.png), [desktop JSON](evidence/api-e2e/desktop-06/evidence.json) | Proven |
| AC-004 | Yes | BR-003; DT-001 | [browser-final/evidence.json](evidence/api-e2e/browser-final/evidence.json): constrained→wide while drawer open; [wide recovery](evidence/api-e2e/browser-final/wide-recovery.png); [native narrow](evidence/api-e2e/desktop-06/desktop-narrow.png), [native wide recovery](evidence/api-e2e/desktop-06/desktop-wide-recovery.png) and [desktop JSON](evidence/api-e2e/desktop-06/evidence.json) | Proven |
| AC-005 | Yes | REP-002; BR-003 | [browser-final/evidence.json](evidence/api-e2e/browser-final/evidence.json):767/768/700 and1440×480, modal capture/forward+reverse Tab/Escape/opener return/backdrop; [short drawer](evidence/api-e2e/browser-final/constrained-1440-480.png); [repository-adjacent](evidence/api-e2e/repository-adjacent.log) accessible lifecycle | Proven |
| AC-006 | Yes | BR-001; DT-001 | [desktop-06/evidence.json](evidence/api-e2e/desktop-06/evidence.json): `seed`, selected checkpoints, `snapshots`, native resizes, `before`/`after` exact projections/documents/Task+root and3 runtime PID/start identities; real Alpha→Beta→Alpha selection, exact message feed, draft retention, tool and current-route invariant. [server/runtime log](evidence/api-e2e/desktop-06/isolated-app.log) correlates HTTP/WS/delegation | Proven |
| AC-007 | Yes | SET-001; reports; negative/restore; cleanup | [build.log](evidence/api-e2e/build.log), [source-identity.json](evidence/api-e2e/source-identity.json), [regression-restoration.json](evidence/api-e2e/regression-restoration.json), [environment-cleanup.json](evidence/api-e2e/environment-cleanup.json), [isolated-list-final.json](evidence/api-e2e/isolated-list-final.json); upstream rendered pre-edit [baseline browser](evidence/preview/baseline-clean/browser.json). Commands/results/known runtime separation below | Proven for validation package; actual affected client identity/macOS acceptance/update remains Only The User Can Check through Delivery |

No critical source behavior lacks direct proof. No release/runtime update was performed or implied. Remaining user-only part is specifically identified, not omitted to inflate confidence.

## Changed Boundary And Evidence Matrix / Ledger Reconciliation
Ledger initialized before execution and records each case/attempt before proceeding; initial setup and final cleanup checkpoints preserved. No interrupted/unstarted required case. Completed final outcomes:

| Case | Boundary / layer | Result | Exact command / evidence |
| --- | --- | --- | --- |
| REP-001 | Actual policy/provider/default composition (mocked I/O content) | Pass,3files/37tests | `corepack pnpm -C autobyteus-web test:nuxt --run utils/layout/__tests__/responsiveLayoutPolicy.spec.ts composables/layout/__tests__/useResponsiveWorkspaceShell.spec.ts layouts/__tests__/default-docking.spec.ts`; [repository-focused.log](evidence/api-e2e/repository-focused.log) |
| REP-002 | Adjacent policy/adaptive/tool/drag/drawer/modal | Pass,15files/146tests (overlap, NOT37+146) | `corepack pnpm -C autobyteus-web test:nuxt --run utils/layout/__tests__ composables/layout/__tests__/useResponsiveWorkspaceShell.spec.ts layouts/__tests__/default-docking.spec.ts layouts/__tests__/default-drawer.spec.ts composables/__tests__/useRightPanel.spec.ts components/layout/__tests__ composables/__tests__/useAccessibleDrawer.spec.ts`; [repository-adjacent.log](evidence/api-e2e/repository-adjacent.log), restored-current [restored-repository.log](evidence/api-e2e/restored-repository.log) |
| REP-002 guard | Web boundary | Pass | `corepack pnpm -C autobyteus-web guard:web-boundary`; [boundary.log](evidence/api-e2e/boundary.log); Electron build also runs localization guard/audit |
| SET-001 | Current backend + Linux packaged artifact | Pass | Private Corepack shim `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build && pnpm -C autobyteus-web build:electron:linux`; [build.log](evidence/api-e2e/build.log). Serial, no Nuxt server during build |
| BR-001 | Real renderer pointer drag/cycles/hit effects | Pass | Durable command below; browser-final/evidence.json |
| BR-002 | Prospective allocation/exact capacity/open drag/observer settle | Pass | Same; browser-final/evidence.json |
| BR-003 | Genuine modal/focus/recovery | Pass | Same; browser-final/evidence.json |
| BR-004 | Automatic480 floor and right400 bound | Pass | Same; browser-final/evidence.json |
| DT-001 | Actual current Electron/API/WS/persistence/scripted live runtimes | Pass | Ticket driver below; desktop-06/evidence.json, isolated-app.log |
| Negative BR-001 | Maintained test against pinned base policy/provider | Expected Fail — regression discriminator, NOT current failure | `node autobyteus-web/tests/e2e/workspaces-sidebar-dock-probe.mjs --browser-uid 1000 --output-dir ../tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-old-source`; [old-source-browser-command.log](evidence/api-e2e/old-source-browser-command.log), [restoration receipt](evidence/api-e2e/regression-restoration.json). Base d9bccf255 sources swapped/restored in try/finally |

Broader browser command, from root with private pnpm shim on PATH:
`pnpm -C autobyteus-web test:e2e:workspaces-sidebar-dock --browser-uid 1000 --output-dir ../tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-final --ledger-file "$PWD/tickets/in-progress/workspaces-sidebar-dock/api-e2e-test-case-ledger.md"`.
Final command exit0; **85records/59screenshots,52hit assertions,26focus effects,26tab effects; zero browser or warmup errors**. Prior complete browser-03 also passed; not additive coverage.

Desktop command (root wrapper supplies only owned paths):
`setpriv --reuid=1000 --regid=1000 --clear-groups env -i PATH="$OWN/bin:/usr/local/bin:/usr/bin:/bin" HOME="$OWN/home" TMPDIR="$OWN/tmp" XDG_RUNTIME_DIR="$OWN/runtime" SHELL=/bin/bash LANG=C.UTF-8 xvfb-run -a -e "$OUT/xvfb.log" -s '-screen 0 1600x1100x24 -nolisten tcp' node tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/desktop-journey.mjs "$OUT"`.
`OUT` is fresh desktop-06 evidence directory; OWN is recorded in setup-root.txt (now removed). Driver invokes canonical `node autobyteus-web/scripts/isolated-app/cli.mjs start --from-worktree`, attaches only to returned controlEndpoint and stops exact instanceId. This is the executable underlying root `pnpm --silent isolated-app`, no alternate launch bypass. Script and command.log retained.

## Broader Validation And Actual Journeys
- Decision **Required — completed**: browser plus current isolated desktop/API/WS/scripted worker; repository mocks alone did not close UI/integration gap.
- Browser production default shell, Team center, tools, drag/modal/provider; only initial context and reached catalog/history/settings/WS boundaries deterministic. Strict unknown GraphQL operations and browser errors fail. Warm Nuxt optimizer before assertion window. No user backend connection: proxy target loopback port1 and intercepted fixture boundaries; owned Nuxt/free port only.
- Default320 nav, user-sized center200/tools400; maximum effective right470/750/910 at1000/1280/1440. Navigation pushes center to x323, no modal/scrim or overlap; raw preference restored after collapse.520px nav pointer resize moves feasible boundary to1130. Policy tests also260px nav. Automatic minimum1210 retains480 center and400 right.
- Desktop actual packaged version1.5.3-beta.3 (not installed client identity), current embedded server entry SHA equals current worktree server entry; executable/asar/server hashes in desktop JSON. Native1440×900→700×900→1440×900, DPR1. Selected exact Alpha and Beta root runs via real workspace/role/run rows, then Alpha again. Workspaces3cycles and drag preserve `/chat?id=<Alpha>` and selected run/conversation, Activity and unsent draft. Narrow keyboard trap/Escape and wide cleanup directly exercised.
- Public API seed: two file-system workspaces; createFileOrFolder/writeFileContent for two Markdown documents; two Agent definitions; two real Agent runs; real WebSocket messages; one Project and saved Task; **real scoped delegate_task and send_message_to** through repository scripted AGY. Active Task worker acknowledged background daemon step (`STARTED`), three loaded CLI processes. Before/after exact Task/root/status, Alpha/Beta/worker conversation projections, document content and owned PID/start identities equal. Task root not closed. Runtime surrogate spends no provider credits; paid inference quality is not part of this layout requirement.

## Confidence Scorecard
Arithmetic average over seven applicable categories; user-only installed target/macOS part excluded by skill rule and explicitly passed to Delivery. Passing commands alone are not the score basis.

| Mandatory category | Post-repository | Final | Proof gained / negligible residual uncertainty |
| --- | --- | --- | --- |
| Requirement and AC proof |75%|95%|All source-critical AC direct DOM/API/native proof; exact affected client's confirmation separate user-only |
| Changed-boundary execution directness |90%|95%|Actual pure policy, provider, default shell, real pointer and viewport; same maintained probe rejects original source |
| Cross-boundary realism / mock gap |75%|95%|Real packaged renderer/server/HTTP/WS/scoped delegation/work data; only external inference scripted, irrelevant to capacity behavior |
| Environment/configuration/identity/fixture fidelity |75%|95%|Own data/ports/private HOME/non-root sandbox; current build source/hash identity and same embedded server; not claiming unknown installed binary |
| Failure/edge/lifecycle/recovery |90%|95%|Exact neighbor capacity, automatic/nondefault/narrow/short, keyboard/backdrop, observer equality, cycles, cleanup and old-source discrimination |
| User/browser/desktop-shell |75%|95%|Independent headless browser + actual native-sized Linux Electron worktree journey; changed behavior web-equivalent, native macOS dialogs/update out of scope/user-only |
| Durable regression quality/relevance |90%|95%|Maintained self-owned strict probe + valid146unit/component tests, source-negative then restored-positive replay; no obsolete assertion protected |

Overall **81.43%→95%**. All final categories >=90; default clean95 target met. No unproven source-critical criterion or material broader-validation risk. Not100: Linux and scripted external runtime are precisely scoped proof; unknown installed client is not invented. Native IPC/updater/OS dialogs are unchanged and not comprehensively certified by this layout validation.

## Compatibility / Persistence / Lifecycle
Implementation removal and data-transition checks reviewed: no legacy wrapper/dual read/version-specific compatibility retained; obsolete fixed-width fit replaced upstream. Persistence **Not Affected**, no schema/migration/reset or layout preference storage added. Existing test-owned work read through normal current APIs/UI before and after layout transitions, exact values preserved. No historical schema migration or discard scenario authorized/tested. No compatibility-only durable coverage. No upgrade/restart of user services.

## Durable Coverage Changes
| Path (relative to worktree) | Change | Links / result |
| --- | --- | --- |
| autobyteus-web/tests/e2e/workspaces-sidebar-dock-probe.mjs | Added | AC-001–005, selected context/tab/draft/route invariant AC-006; final4/4Pass, original source expectedFail |
| autobyteus-web/tests/e2e/fixtures/workspaces-sidebar-dock.page.vue | Added | Actual product composition + deterministic initial I/O/context, no substitute geometry; executed by probe |
| autobyteus-web/package.json | Updated | Discoverable test:e2e:workspaces-sidebar-dock script; no dependency/lock changes |

No removed tests or production edits. Review Not Required — direct low-risk route; changed test paths attached to Delivery anyway. Whole repo/server suites not run: backend/runtime owners unchanged; current backend build/bootstrap smoke plus real isolated API/WS/data journey used for preserved boundaries. Broader unrelated suites would not replace direct layout proof.

## Temporary Scaffolding / Diagnostics
Temporary desktop driver and public-API fixtures retained as evidence, not general maintained harness. Private bin/agy wrapper, bashrc and homes removed; no user's sign-in/config file copied.

| Attempt | Observed issue / classification | Final resolution |
| --- | --- | --- |
| browser-01 | Chromium profile created root-owned then intentionally launched non-root; setup failed before case | Explicit probe-owned chowned persistent profile, sandbox retained |
| browser-02 | Tried selecting hidden Team tab at1000 automatic layout before collapse | Correct real-use order: collapse navigation first, then select visible tool; browser-03/final pass |
| desktop-01/02 | Electron lacks CDP Browser.getWindowForTarget; second loaded pre-edit driver; first cleanup field names incorrectly Free rather than Released | Actual X11 window sizing; canonical receipts already bothReleased true; serial final pass |
| desktop-03 | Unscoped marker matched title and real message | Scope to actual message feed |
| desktop-04 | Feed uses data-testid, not guessed data-test | Read component, use exact actual attribute; rerun |
| desktop-05 | HOME-only PID set included other owned attempt stopping concurrently | Scope to returned instance data root; require exactly3; final identity equality |

All raw attempts remain reviewable in evidence; none treated as product passes/failures or authoritative failed API round. No product source fix resulted. In-flight final evidence is now completed; ledger reconciled.

## Cleanup Performed
[evidence/api-e2e/environment-cleanup.json](evidence/api-e2e/environment-cleanup.json) plus per-probe receipts and final canonical [list](evidence/api-e2e/isolated-list-final.json):
- Every owned browser closed; Nuxt stopped and free port confirmed; exclusive temporary route removed; private browser profile/HOME removed.
- Six attempted owned Electron instances stopped by exact ID, graceful (no forced stop); ports released, data roots removed. Registry empty; own AGY runtime processes0. Only their Xvfb wrappers stopped; user's Chromium/display/session untouched.
- Owned setup bin/home/tmp/runtime root removed after registry check. xdotool/Xvfb dependencies intentionally retained as environment tooling; source worktree/dependencies/current build outputs retained for Delivery. Do not stage generated SDK dist.
- No live app/8001 request, paid inference, user key/config mutation, service restart, merge/push/tag/release or installed update.

## Latest Authoritative Result / Delivery Limits
**Pass —95%, Medium/Low, Required broader validation completed.** No in-scope failure or reroute classification. Receipt includes proof table/evidence, not only summary.

Only user/Delivery can complete actual affected client platform/version/server connection and macOS-specific final acceptance/installed update. Tried current source repository, strict browser and actual unprivileged current Linux Electron/native window journey; container cannot supply the user's macOS binary/display/session and safety forbids touching live app/data to infer its identity. Designer's direct question still unanswered. Delivery must obtain those facts and any chosen release/runtime authorization, distinguish integrated source from shipped client, and close its own completion gates. This API pass is not Delivery Completed or Terminal.

Existing compact Team/Agent header crowding at approved200px center is the upstream recorded separate polish follow-up; composer focus/hit tests pass, no minima redesign or scope expansion here. No additional accountable Tasks-owner dispatch performed at this stage; include follow-up context in final coordinated delivery.

## Selected Handoff Rule
`get_handoff_rules` returned the direct Pass / Small-or-Medium / Low / no test review / complete validated package rule. **Single most-specific recipient: `/software_engineering_team/delivery_engineer`**. Reviewed-route test review, failed-validation origin review and pre-execution upstream-gap rules do not apply. Persisted before sending; tool confirmation determines delivery of the handoff. No duplicate forwarding to Implementation/Solution Designer/Project Task Manager.

Evidence formatting audit: retained logs/diagnostic HTML had generated trailing whitespace; normalized trailing whitespace only for repository checkability. No assertions, results, screenshots or source/test identity changed. Final complete-branch git diff --check passes.
