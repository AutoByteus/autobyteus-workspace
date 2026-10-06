# API/E2E Coverage Investigation — electron-host-file-open

## Investigation Meta
- Round 1; trigger /implementation_engineer IR-002, Approved R1 / Ready D2 / SR-004; 2026-10-06.
- No prior API/E2E investigation/result/revision exists; upstream implementation checks are not an API Pass.
- Assigned worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open`, branch codex/electron-host-file-open; intake HEAD28bb23ba54b3e3ac7026e18e548940c71f7bc9c4. D1 source17e1e201, D2 source3d8395bb; shared dirty checkout excluded.
- Canonical ledger `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/api-e2e-test-case-ledger.md`; report/revision same ticket, initialized after completed execution.
- Independent architecture/source report and revision records: **N/A — not applicable**, Medium/Low direct route. Delivery/triggering test-review: N/A — not yet performed.
- Complete upstream basis read (historical statements retain their original round meaning):
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/user-approval-r1.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/user-drawer-clarification.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/architecture-design-complete.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/implementation-design-impact.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/implementation-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/implementation-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/historical-investigation-result.md`
- Relevant implementation evidence read: d2-self-review, d2-native-build-source, d2-native-inspection-controller/notes, cumulative test log; IR-001/DI-001 manual-reveal evidence retained historically. Designer source probes are not changed-build proof.

## Routing Classification
- task_size **Medium**; architectural_risk **Low**; Direct Low-Risk.
- Successful output route subject to returned rules; expected Delivery.
- Test-review decision **Not Required — direct low-risk route**.

## Current Requirement And Design Basis
AC-001/002 require explicit activation to visibly show correct selected read-only Files content, including known ID/null metadata and missing ID recovery. AC-003 preserves conversation/selection, other tabs/dedupe and passive no-read behavior. AC-004/005 preserve actual selected-root mapping and deny native fallback for remote/browser/mobile or bridge absence. AC-006 exposes ordinary native content errors visibly. D2 adds shell-local setup-captured capability with lazy monitor lifetime guards, explicit tab intent before host mount, live post-preference policy, awaited render, guarded focus. No global fallback/inject-after-setup/registry/viewport guess. Missing desktop provider fails without reading. Persisted data **Not Affected**; no legacy wrapper or parallel/versioned reader found. Global no-target path is a distinct current scenario, not a selected-context fallback.

## Supported Scenarios And Real Usage
SCN-001–004 all included. Added normal-use timing/presentation variants: selection changes during metadata/content awaits; monitor run changes/unmounts during lazy import/content; active-file delayed focus becomes obsolete; hidden fitting dock, ordinary/narrow/short drawer, dismiss/reopen. These follow actual user actions, not arbitrary multi-session races. Unsupported arbitrary host access/guessed workspace not tested as success. Designer lists no contrived case requiring validation.

## Changed Surfaces / Coverage Consequences
| Surface | Change | Repository evidence | Remaining material gap / broader mode |
| --- | --- | --- | --- |
| Selected target/context projection | Changed, exact nullable root + bounded metadata recovery | activeContext/collaboration/Org/Team specs | Actual metadata HTTP + renderer binding |
| Frontend component/state | Changed shell action/explicit intent/lazy monitor/currentness | shell, monitor, launcher, tabs specs | Existing shell test substitutes monitor with a consumer; add real lazy monitor integration |
| Desktop renderer/Electron integration | Renderer changed, byte reader preserved | Files and native validation/protocol tests | Real preload/main/bytes/native error and first visible Files: owned packaged desktop |
| Browser/remote/mobile | Preserved containment | Launcher currently mocks mapper/runtime; separate real mapper/Files tests | Add real mapper + Files I/O tests; do not treat mock return as authorization proof |
| Focus/lifecycle | Changed guards | origin tests + drawer/stack tests | Additional selected/root/node guards across reveal/focus; monitor content-delay integration |
| Backend/API/permissions | No implementation change; consumed metadata/content API | Existing reader tests | Real local metadata + native error check; no new permissions |
| Persistence/worker/queue/external provider | No change | N/A | No migration/restart/model/provider quota justified |

## Project Execution Discovery
| Instructions/configuration read | Learned command/constraint |
| --- | --- |
| Root AGENTS.md, DESIGN.md, TESTING.md | Narrow→affected checks; worktree-current package; never user app/data; assert DOM/API before screenshot; own cleanup |
| autobyteus-web/AGENTS.md; no closer source AGENTS or TESTING found | --run required; explicit staging only |
| autobyteus-web/README.md testing/packaged sections; package.json; vitest.config.mts; electron/vitest.config.ts | test:nuxt happy-dom/Nuxt, test:electron; dependencies already installed, .nuxt ready |
| docs/isolated-app-instances.md; root package.json; scripts/isolated-app/cli.mjs | Build by default or --from-worktree only exact current artifact; own free ports/data; readiness health; stop exact instance, retain receipts |
| Existing team-reload-member-freshness-probe.mjs and d2 controller | Repository-owned Playwright CDP over exact receipt is working execution path. Named browser-automation skill/CLI not in available skill list; do not bind global browser tool to unknown/user app. Retain discrepancy. |
- Host macOS arm64, Node22.23.1/pnpm10.28.2; no secrets/model required.
- Existing package hash/source manifest will be independently checked before reuse. Test-only edits do not change bundled runtime. If mismatch, rebuild.
- Setup new isolated instance, private tempfile A/B + readable Markdown + directory/missing path; saved Org inspection/member projection controlled at public GraphQL; initial metadata failure enabled then real API used. No private renderer state writes. Use public route/action and real monitor Markdown button.
- Capture DOM, selected identity/readOnly/error/focus/file tabs, native/build hashes, HTTP requests/page errors, screenshots, cleanup. CDP device metrics may provide explicitly-emulated renderer width/height, not actual OS resize. Actual default desktop retained.

## Existing Durable Coverage Inventory
| Paths under autobyteus-web | Validity | Approved evidence / action |
| --- | --- | --- |
| composables/__tests__/useEventMonitorFilePreview.spec.ts | Still Valid; Needs Update for gaps | AC001–006/DS004–005; mocks disclosed; add target/root/node across reveal and delayed focus |
| components/layout/__tests__/WorkspaceToolShell.spec.ts | Still Valid; Needs Update | Real policy/tabs/selected Files; add actual monitor lazy activation and disposal/read settlement |
| components/workspace/agent/__tests__/AgentEventMonitor.spec.ts | Still Valid | Provider capture/import/result lifetime; launcher double, not end-to-end success |
| stores/__tests__/activeContextStore.spec.ts; agentRunCollaborationStore.spec.ts | Still Valid | Exact root/ID/cache/currentness publication |
| services/teamExecution/__tests__/teamExecutionViewState.spec.ts; services/agentOrgExecution/__tests__/agentOrgContextHydration.spec.ts | Still Valid | Configured/catalog/collaborator source identity; selected context |
| components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts | Still Valid | A preservation/B binding/readOnly using editor double |
| stores/__tests__/fileExplorerStore.spec.ts; fileExplorerNodeRouting.spec.ts; utils/fileExplorer/__tests__/absoluteWorkspacePathMapping.spec.ts | Still Valid | Actual content/readOnly/dedupe and mapping/security paths; add enclosing remote containment |
| utils/eventMonitorFilePaths; MarkdownRenderer.spec.ts | Still Valid | Real explicit trigger/type boundaries/passive rendering |
| useRightSideTabs.contextualDefault; WorkspaceAdaptiveLayout; WorkspaceRightToolDrawer; useAccessibleDrawer specs | Still Valid | Defaults/resize/start-surface/drawer stack preserved |
| electron localFileValidation/local-file-protocol/local-file-response specs | Still Valid | Absolute regular file, unavailable/protocol validation unchanged |
| Other provider/server/all-repo suites | Out Of Scope | No wire/provider/persistence/runtime producer changes |

## Durable Coverage Decisions
- Add real lazy monitor cases and real mapper/Files remote/no-bridge containment to existing shell spec; keep external GraphQL/editor/IPC doubles explicit.
- Add selected/root/node reveal and delayed focus checks to launcher spec.
- Add repository-resident packaged `tests/e2e/event-monitor-file-preview-probe.mjs` + script/docs: normal first visible native path is durable regression-worthy, not a second ticket-only controller. Own fixture/launch/cleanup and metadata controls; no paid inference.
- No removals/stale assertions/compatibility-only tests.

## Execution Plan
| Case | Command / boundary | State |
| --- | --- | --- |
| R-001 | pnpm -C autobyteus-web test:nuxt composables/__tests__/useEventMonitorFilePreview.spec.ts components/layout/__tests__/WorkspaceToolShell.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts --run | Planned |
| R-002 | Cumulative 17 files from implementation log plus new focused tests, --run | Planned |
| R-003 | pnpm -C autobyteus-web test:electron electron/__tests__/localFileValidation.spec.ts electron/local-file-protocol/__tests__/local-file-protocol.spec.ts electron/local-file-protocol/__tests__/local-file-response.spec.ts --run | Planned |
| R-004 | pnpm -C autobyteus-web guard:web-boundary; source/test git diff --check; package/source hash verification | Planned |
| N-001–008 | Durable packaged probe exact receipt; native first recovery/full metadata/reopen/readOnly/errors/focus/responsiveness/currentness and cleanup | Planned; run after repository scorecard |

## Test-Case Ledger Decision
Required: multiple meaningful cases/long launch/interruption risk. Initialize now, record after each attempt and before next case.

## Post-Repository Confidence / Broader Decision
Not scored before execution. Expected significant mock gap; **broader validation Required**, Project Desktop Validation. Target ≥95% overall, all categories≥90%, direct critical AC proof. Browser-emulated responsive checks support renderer policy only; actual native default path is mandatory. Exact installed user's node/bridge/config/version unverified and Delivery explicit user verification remains separate. Physical phone/other OS/permission-denied native fixture may remain bounded preserved-boundary risks, with owners/tests disclosed, not fictitious passes.

## Investigation Decision
Proceed Yes. Durable changes Yes. No reroute required before validation; approved R1/design sufficient. This initial investigation precedes all API-owned edits/final execution.

## Execution Updates — before broader execution
- R-001 initial new fixtures counted hydration/background queries as file requests; repaired to classify by public GetFileContent operation and retain other fixtures. No source workaround; first failure log retained. Rerun3 files/49 assertions Pass, api-focused-rerun.log.
- Durable shell new tests use actual monitor/lazy launcher and provider, actual mapper+Files+relative public content query; feed/editor and external I/O remain doubles. Launcher adds six selected/root/node reveal/focus timing cases. No production edits.
- Native probe added per plan, package script/testing instructions added; source-current package verified independently against all nine runtime hashes + exact app.asar73a823c3 (api-package-provenance.json). Reuse --skip-build now justified; original successful build receipt retained.
- Additional coverage decision before execution: add `useEventMonitorFilePreview.mobileBoundary.spec.ts` to compose actual mapper/mobile request owner/metadata action with only build detection/Apollo doubled. Existing mobile tests mock the mapper; prefix/traversal refusal and obsolete origin after mobile metadata now have durable direct owner checks. This is preserved SCN002/003, not a new physical-phone claim.

## Post-Repository Confidence Scorecard — mandatory completed before native run
Repository result: R001 focused49 assertions, R002 cumulative209 across17 files, R003 native19 across3 files, R004 guard/diff/syntax/provenance, R005 actual mobile5 across1 file. Total distinct current renderer214 across18 files; focused overlaps cumulative and is not added again. Commands exact in raw logs, worktree root above.

| Category | Score | Evidence / uncertainty / gain |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | All owner assertions supported; AC001/002 native first visible content still needs independently executed package |
| Changed-boundary execution directness | 90% | Real enclosing shell/policy/tabs/Files/monitor; native bytes replaced in repository tests |
| Cross-boundary integration realism and mock gap | 75% | GraphQL/editor/native doubles; actual native IPC/main/HTTP integration missing this round |
| Environment/configuration/identity/fixture fidelity | 90% | Actual selected hydration/source snapshots/A preservation; exact runtime/package hashes verified, but live fixture not yet executed |
| Failure/edge/lifecycle/recovery | 90% | Real monitor content disposal, selected/root/node across recovery/reveal/focus, errors via doubles; native errors/navigation still needed |
| User-surface/browser/desktop-shell | 75% | happy-dom cannot certify native visible Markdown/real focus/keyboard behavior |
| Durable regression quality/relevance | 95% | Requirement-linked tests, actual mapper/mobile owner composed, real lazy caller, durable native probe prepared; its execution pending |
- Overall **86.43%** (605/7); clean target not met; categories realism/user-surface below90. Critical ACs not all directly proven this round, **not Pass**.
- Broader **Required — Project Desktop Validation**: run `pnpm -C autobyteus-web test:e2e:event-monitor-file-preview --skip-build --output-dir <fresh ticket evidence dir> --ledger-file <canonical ledger>` after exact current runtime/asar verification. Expected gain real IPC/native errors, server metadata, lazy real monitor/file action, visibly mounted shell and navigation currentness; target≥95 overall, every category≥90.
- Direct source-current artifact reuse is documented and independently hashed; no renderer source edits or rebuild required. Browser metrics responsive cases explicitly not OS resize; real default native shell path is separately asserted.
- Initial new remote test fixtures were wrong about total query counts, not product failures. No unresolved repository failure or owner reroute; no stale coverage removed.

## Native attempt-1 coverage correction (before rerun)
N001/002 Pass: exact selected B initially null ID/metadata, real API recovers B, native Markdown visible readOnly/focused from one activation. N003 failed the NEW probe's dedupe assertion because public `getOpenFiles` returns path strings, not file-state objects (array length2 passed, mapping `.path` collapsed to undefined). API-owned **Local Fix**, not a product AC003 failure. Updated Set assertion to actual public return shape; failed result/log retained evidence/api-native. Owned instance iso-51216-d5ab gracefully stopped, fixture/data removed, ports free/list empty, N008 Pass. N004–007 not executed in this attempt. Rerun entire native set with same case IDs/fresh owned fixture; no production edits or confidence Pass inferred.

## Native attempt-2 result and targeted final additions
N001–008 all Pass, evidence/api-native-rerun/evidence.json, iso-51279-2c38. Corrected public string-path dedupe assertion now passes alongside first visibility/errors/focus, actual member navigation during held real metadata, emulated responsive policy and owned graceful cleanup. No page errors/writes. This resolves attempt-1 API test defect, not a product source delta.
Before final run add: owned unreadable mode000 regular Markdown in N004 (explicit AC006 native validation, current non-root host), and N009 live GetFileContent HTTP selected-B relative read/out-of-scope traversal denial. This closes the server-content mock gap identified in AC004/005; no remote native-window/phone surface claim. Tests use only fixture-owned files and exact reported graphqlUrl. No additional user scenario or runtime changes.

- Native attempt-3 N004 new unreadable fixture exposed an invalid new probe expectation: permission denial is `local-file-preview:unreadable`, not missing-file `unavailable` (localFileValidation.ts explicit current taxonomy). Observed correctly rendered localized ordinary error, no secret bytes. Corrected expected code; failed JSON/screenshot retained api-native-final, graceful owned cleanup iso-51351-40fb/N008 Pass. No product failure/reroute; N009 remained unstarted. Repeat complete native set against fresh owned instance.
- Mobile fixture tightened to current complete MobileWorkContext fields and localization double (no locale scope); rerun identical five semantic boundary assertions, final log api-mobile-final.log. No production source change.

- Native attempt-4 N001–005 including permission denial Pass, N009 new negative HTTP test expected GraphQL top-level errors incorrectly. Current fileContent query returns an encoded JSON error string by explicit resolver contract and existing path-boundary E2E (file-explorer.ts:35–60; file-explorer-path-boundary.e2e.test.ts:185–196). API-owned Local Fix: decode that existing error envelope; assert exact out-of-workspace denial and no secret bytes, retain actual HTTP responses before assertion. No API/source/policy modification. Owned iso-51423-1d80 gracefully cleaned/N008 Pass, full failure evidence api-native-complete retained; new N009 remains unresolved until corrected rerun.


## Final Investigation Reconciliation — API-REV-001
- All final R001–005/N001–009 cases Pass. Current native evidence **/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/evidence/api-native-verified/evidence.json**, instance **iso-51507-ab1b**, nine cases. N004 includes real missing/non-regular/permission-unreadable errors; N009 confirms real B relative-content HTTP and encoded ordinary out-of-workspace error/no secret leak. Corrected assertions conform to current public APIs; earlier failing attempts retained, not product passes.
- Real default native1200×768 CSS px one activation→correct B Markdown/readOnly/focus. Emulated650×700 /1440×450 drawers,1600×900 hidden→dock; not native OS resizing. Whole enclosing shell and real lazy monitor exercised. Current rootC metadata response released after genuine member navigation does not reveal/focus replacement; selected identity/IO guards reinforced by durable owner tests.
- Zero page errors/write requests, byte sentinels unchanged. Screenshot first-native-activation/unreadable-file/emulated-wide-redock visually inspected as supporting evidence, not sole assertion.
- Final native cleanup graceful/non-forced; own profile/data/fixtures removed, both ports free, list empty. All previous attempt instances also cleaned; no user app/data/service touched.
- Final confidence **95%** (seven categories95%, direct critical AC proof); broader Required **completed**. Canonical report/revision record contain score rationale, residual scopes and next route.
- Durable tests/scripts/docs commit **aecc875321c59b292ed42572e061236ea87d7e91**. No runtime source change. All nine runtime source hashes and packaged hash remain matched to current D2. The host-run test script/TESTING entry does not require repackaging the runtime.
- Bare owner Nuxt injection/KaTeX/Browserslist warnings retained; no failure or new shell provider fallback. No full frontend typecheck/all-repo/provider/physical-phone/native-remote/other-OS/user-installed certification.

Final result-based rules lookup after result persistence: only direct Pass Medium/Low rule matches → /delivery_engineer; receipt evidence/api-handoff-rules.json. No additional recipient matched/notified.
