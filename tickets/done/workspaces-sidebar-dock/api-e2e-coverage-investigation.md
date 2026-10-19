# API/E2E Coverage Investigation — workspaces-sidebar-dock

## Investigation Meta
Round 1, initial IR-001 implementation completion, 2026-10-13. Assigned worktree `/home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock`, branch `codex/workspaces-sidebar-dock`, source commit `1262714f6494a1292b69bda1f0cda02f2c2f1014`, received artifact HEAD `9848d80ee`. Approved R1/SR-001, design SR-002, IR-001 read before edits. Canonical package is `tickets/in-progress/workspaces-sidebar-dock/` within this absolute worktree: requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md, solution-handoff.md, implementation-handoff.md, implementation-revision-record.md. Original screenshot paths are indexed by solution-handoff.md. Architecture/source reviews and Product supplements: **N/A — not applicable**. No prior API/E2E result or delivery revision. Revision record will be created at completion; ledger api-e2e-test-case-ledger.md is required for independent multi-case, long-running execution. This investigation is the current authority, not implementation inspection provenance.

## Routing Classification
Medium / Low; Direct Low-Risk; successful output Delivery; test-code review **Not Required — direct low-risk route**. No changed public contract, persistence, Electron-main or backend owner. Failures require failure-origin review; missing dependency stops validation and requires user input, not a false pass.

## Project Instruction And Execution Discovery
Read root AGENTS.md, DESIGN.md, TESTING.md; autobyteus-web/AGENTS.md; autobyteus-server-ts/AGENTS.md; root README.md packaged Electron and local full-stack sections; web README.md testing/packaged launches; docs/isolated-app-instances.md including headless/root-container recipes. No closer TESTING guideline under changed directories. Package scripts, workspace-responsive-probe.mjs, delegated-team-default-collapse-probe.mjs, shared task-worker-boundaries.mjs and implementation's temporary preview inspected. Colocated layout policy/provider/default docking/drawer/drag and tool-shell tests inspected against R1. DESIGN asks functional owner/invariant replacement, no speculative or legacy layers.

Commands: corepack pnpm (bare pnpm absent); test:nuxt must use --run; prepare contract prerequisites and nuxt prepare; backend prebuild/build before dist consumers; builds/dev servers serialized. Browser probes must own free loopback ports, HOME, temp routes, stack and fresh Chromium and fail on browser errors. Full-product selection needs **current worktree isolated Electron**, not a fixture/browser substitution. Headless ARM64 Linux root environment observed; ordinary setup includes private runtime directories, unprivileged identity, Xvfb/xauth if missing, preserved Chromium sandbox. Isolated launch/stop/list via root isolated-app command; record returned instanceId/controlPort/serverPort. Never user app/8001, installed build, paid model, inherited provider keys, user's CLI config or shared data. Stage explicit paths; never generated SDK dist. Release/finalization are downstream only.

## Scenario / Boundary Mapping
| Scenarios / AC | Surface and actual entry | Required proof |
| --- | --- | --- |
| SCN-001 / AC-001,002 | Left collapse + trusted divider pointer drag + Workspaces; default/provider/policy/tool shell/browser flow | Team/Activity at 1000/1280/1440, intermediate/max intent, both docks, no overlap/scrim, >=400 tools and >=200 center, hit tests and focus/click effects |
| SCN-002 / AC-002,003 | Repeat normal actions, navigation-divider pointer resize, viewport resize | Three cycles; preference/intent/draft/selection/tab stable; restored width; neighboring default930/nondefault1130 and automatic1210 capacities; stable observer output |
| SCN-003 / AC-004,005 | Window resize; constrained Workspaces; keyboard/backdrop dismissal | 767/768,700,480-height, drawer focus trap/Escape/focus return, wide recovery while drawer open, no stale hit blockers |
| SCN-004 / AC-006,007 | Real test-owned workspace/run selection in current Electron; public API seed, actual retained conversations and work | Workspaces route/run/tab invariant, explicit selection still works, Tasks/documents and active-worker identity persist; source/build/runtime and cleanup truthfully separate |

Changed surfaces: pure frontend layout policy + reactive provider, browser integration, web-equivalent desktop renderer and drawer lifecycle. Desktop launch/native boundary unchanged but required realistic-product execution surface. Backend transport/persistence/workers unchanged, used for preservation proof; no migration (Not Affected) or compatibility route.

## Existing Coverage Validity
| Coverage | Decision | Reason |
| --- | --- | --- |
| utils/layout/__tests__/*.spec.ts | Still Valid | Updated candidate/minimum assertions match approved bounds; source discrimination already shows 17 old-source failures, independent rerun required |
| composables/layout/__tests__/useResponsiveWorkspaceShell.spec.ts | Still Valid | Raw preferred input vs stale DOM measurement is intended invariant |
| layouts/__tests__/default-docking.spec.ts and default-drawer.spec.ts | Still Valid | Real composition, click, keyboard and cleanup; content mocks limit rendered proof |
| composables/__tests__/useRightPanel.spec.ts and useAccessibleDrawer.spec.ts | Still Valid | Preserved drag/preference and modal ownership |
| components/layout/__tests__/*.spec.ts | Still Valid | Existing tools/task locator/adaptive routes with aligned raw-input helpers |
| tests/e2e/workspace-responsive-probe.mjs | Still Valid (not selected for sign-off) | Broad externally addressed probe; lacks self-owned deterministic stack and exact new regression assertions |
| tests/e2e/delegated-team-default-collapse-probe.mjs | Out Of Scope as suite; reuse setup patterns | Different Team default-collapse requirement, not expanded into this ticket |
| tickets/.../evidence/preview/*.mjs/vue | Temporary executable inspection only | Provenance, not maintained regression tests; no independent sign-off |

No stale coverage removed. Existing tests are not behavior authority.

## Durable Coverage Plan
**Add Durable Coverage**: autobyteus-web/tests/e2e/workspaces-sidebar-dock-probe.mjs, its fixture in tests/e2e/fixtures, package script test:e2e:workspaces-sidebar-dock. Deterministic actual product shell, complete reached GraphQL/WS fixtures, free ports, fresh evidence, fail on errors, meaningful geometry/hit/pointer/keyboard assertions. Controlled context fixture proves renderer state, not real persistence. No other durable test changes planned. **Use Temporary Executable Probe Only** for isolated Electron preservation journey: platform-specific setup and full-product seeding are ticket-owned evidence; maintained browser suite already covers changed geometry. No permanent launch/framework refactor warranted.

## Repository Coverage Execution Plan And Results
| Order / case | Command | Result / evidence |
| --- | --- | --- |
| REP-001 | corepack pnpm -C autobyteus-web test:nuxt --run utils/layout/__tests__/responsiveLayoutPolicy.spec.ts composables/layout/__tests__/useResponsiveWorkspaceShell.spec.ts layouts/__tests__/default-docking.spec.ts | Planned; evidence/api-e2e/repository-focused.log |
| REP-002 | corepack pnpm -C autobyteus-web test:nuxt --run utils/layout/__tests__ composables/layout/__tests__/useResponsiveWorkspaceShell.spec.ts layouts/__tests__/default-docking.spec.ts layouts/__tests__/default-drawer.spec.ts composables/__tests__/useRightPanel.spec.ts components/layout/__tests__ composables/__tests__/useAccessibleDrawer.spec.ts; guard:web-boundary | Planned; evidence/api-e2e/repository-adjacent.log and boundary.log |
| SET-001 | corepack pnpm -C autobyteus-server-ts prebuild; build; corepack pnpm -C autobyteus-web build:electron:linux | Planned, serialize; evidence/api-e2e/build.log. Dependency/display preflight and isolated launch identity separate from journey pass |

## Post-Repository Confidence Scorecard
Pending execution; no inherited implementation pass treated as independent result. Scores will be written after repository checks before broader run.

## Broader Validation Decision
**Required**. Browser plus Project Desktop Validation/Live API/Worker preservation. Unit geometry/composition mocks do not prove DOM hit testing, browser focus and observer timing or persisted-work preservation in packaged current build. Expected gain: close renderer mock gap plus actual test-owned application boundary; target >=95% average, no category <90%, direct critical AC proof. Shell-specific integration unchanged; Linux Electron cannot prove user's exact macOS client or installed update.

## Live Environment And Fixture Plan
Browser: private HOME, unprivileged sandboxed Chromium, owned Nuxt/free port with actual default/product components; warm optimizer before clean assertion window; strict operation fixtures; evidence JSON/screenshots/logs/cleanup, remove temporary route and stop own stack on failure. Desktop: build as worktree owner, private HOME/TMPDIR/runtime, dedicated unprivileged runtime UID, own Xvfb if needed; canonical --from-worktree start on current build, attach only to returned controlPort. Public createWorkspace/createAgentDefinition/createAgentRun/Tasks APIs for minimum deterministic work; repository scripted AGY runtime where environment permits (no provider call). Embedded server system-baseline environment may require test-owned local public setup or retained run plus safe emulation; record actual mechanism, do not infer worker proof. Stop via canonical instance ID then check list, ports, data root and display. No disruption to existing processes.

## Not Tested / Deferred
Actual affected client/platform/version/8001 relationship pending user's designer question. Try current Linux desktop first; if macOS-specific confirmation cannot be proved locally, list as user-only delivery check, not source-runtime-updated claim. Installed update/release/native OS dialogs outside changed scope; no release chosen here. Existing compact Team header at200 floor is upstream recorded separate polish, not a floor change or ticket expansion.

## Ambiguities / Reroute Triggers
None initially. Reached unsupported fixture operations are harness gaps to fix locally; valid in-scope runtime defects require failure-origin review. Cannot reduce proof requirements to force confidence.

## Investigation Decision
Proceed; add narrow durable browser coverage; no coverage removals or source architecture edits. Post-repository score pending. Broader validation Required. No pre-execution reroute.

## Post-Repository Update
REP-001 Pass: 3 suites/37 tests; REP-002 Pass: 15 suites/146 tests plus guard (overlapping, not additive). Logs in evidence/api-e2e. Independent repository run confirms approved assertions; no invalid/stale test observed, no source correction. Builder setup now uses private Corepack shim; Xvfb installed locally; unprivileged UID1000 namespace diagnostic exits0. Current Electron/server build underway, not journey proof.

| Mandatory category | Score | Evidence and gap / further gain |
| --- | --- | --- |
| Requirement / AC | 75% | Strong policy/component evidence; rendered controls and AC-006 preservation not independently proven |
| Changed-boundary execution directness | 90% | Actual resolver/provider/default path; DOM browser missing |
| Cross-boundary realism / mock gap | 75% | Content and I/O stubs do not prove actual work selection/preservation |
| Environment/configuration/identity/fixture fidelity | 75% | Exact source/test identity established; desktop build and actual isolated runtime needed |
| Failure/edge/lifecycle/recovery | 90% | Exact capacity and modal tests; real focus/observer proof needed |
| User/browser/desktop | 75% | Implementation rendered evidence only; independent browser and desktop pending |
| Durable regression quality/relevance | 90% | Correct current regressions with old-source discrimination; maintained real-pointer probe needed |

Overall **81.43%**, arithmetic mean; four categories below90. Critical AC-006 not yet directly proven; clean95 target not met. Broader **Required**, mode browser plus current isolated desktop/live preservation, as planned. No Pass until direct critical proof and gate satisfied.

### Desktop fixture refinement before execution
Embedded server permits baseline PATH/HOME and obtains PATH from private login shell. Instead of trying to inject filtered ANTIGRAVITY_CLI_COMMAND, use a **test-owned private bin/agy wrapper** sourcing repository agy-failure-cli.mjs with linked_skills. Private HOME/.bashrc exposes only owned bin + system tools. No user CLI config/key. Real scoped delegate_task/send_message_to calls create a Project Task worker and a 3600-second scripted background step. Snapshot public projections, Task/root/status, fileContent and owned AGY PID/start identities before and after normal trusted selection/collapse/drag/open/native resize. Actual OS window resizing uses CDP Browser.setWindowBounds rather than browser fixture emulation. Temporary driver retained as evidence/api-e2e/desktop-journey.mjs. This emulates only external runtime turns, not product transport, delegation, work persistence or renderer.

### Harness diagnostics and correction (before rerun)
Browser-01 failed before cases: root Playwright created a private profile inaccessible to the deliberately non-root Chromium wrapper. Use an explicitly probe-owned/chowned persistent profile; do not disable sandbox. Desktop-01 successfully launched current owned Electron and seeded real conversations/documents/Task/active worker, but its Electron CDP endpoint does not implement Browser.getWindowForTarget. Switched ticket-only native sizing to xdotool targeting the **returned instance PID's visible X11 window**. No shell/product edits. Stop receipt uses actual `controlPortReleased`/`serverPortReleased` (first driver incorrectly looked for Free fields; observed receipt already had both true). Both first attempts cleaned their resources; neither counts as a journey pass. Diagnostics retained. xdotool ordinary local package installed. Original plan's CDP-native sizing revised by runtime evidence; actual X11 resize is stronger than emulated viewport. Same case IDs reused.
Browser-02 reached BR-001 but attempted Team-tab click before navigation collapse at1000px, when valid automatic policy exposes tools as a strip. Reordered **normal user collapse before tab selection**, matching SCN-001; no product assertion relaxed. Desktop-03 native sizing and actual Alpha selection succeeded, but an unscoped text locator matched both the conversation title and message. Scoped to actual agent-conversation-feed, not first arbitrary match. Both are owned harness corrections, not product defects; retained diagnostics and cleanup. Cases rerun on fresh stacks.
Desktop-04 scoped the message correctly conceptually but used data-test rather than the component's actual data-testid attribute. Corrected after reading AgentConversationFeed.vue. No guessed source fix or passing claim; rerun exact same journey with actual selector. This is probe authoring, not a product behavior change.
Browser-03: BR-001–004 Pass,85 records, clean errors and owned cleanup. Desktop-05 completed actual selection/layout/native-resize/data assertions, but PID enumeration scoped only to HOME and included the still-stopping desktop-04 run (distinct data root); those unrelated-to-this-instance fixture PIDs disappeared. Corrected enumeration to **this returned instance.dataRoot**, require exactly3 active runtimes. No product worker restarted: own three PIDs/start ticks are present identically in before/after evidence. Complete serial desktop rerun required, not an inferred Pass from partial success.
Added focused old-source browser discrimination to prove maintained BR-001 fails the original bug. Swap only policy/provider to pinned base in a try/finally, restore byte-for-byte before other current-source runs. Fresh evidence, expected old-source failure is not a current product failure; no changed production commit.

## Final execution update
Durable coverage commit `6bb3c822c13a82815f70c279866ab5afbe959fbd` adds only probe/fixture/package script; no production changes by this stage. Browser-03 passed all four cases; old-source browser fails exactly BR-001 at1000px (strip/drawer instead of dock), byte-for-byte current restoration confirmed. Restored repository run again15/146 Pass. Final identical restored-current browser rerun completed4/4Pass,85records/59screenshots,52/52hit checks,26/26focus+tab effects, zero browser/warmup errors. Desktop-06 fully passed current packaged Linux app with native X11 sizing, real root selection in two workspaces, exact Alpha/Beta messages, draft and tool invariants, Tasks/document/worker projections and three own runtime PID/start identities equal before/after. Zero desktop browser errors; canonical stop reports both ports released, dataRootRemoved true, private registry empty. Diagnostics desktop-01–05 and browser-01–02 remain explicit authoring failures, not product passes.

BR-004 narrowed to automatic allocation only: alternate workspace/run selection is proved through actual Electron public API-backed data in DT-001 rather than duplicating the implementation's controlled fixture selection; BR-001 retains selected fixture/draft/tab/route invariants. This improves integration directness without expanding production scope. Runtime-seeded Agents route normally to `/chat?id=<run>` on explicit selection; Workspaces preserves **that actual current route**. Do not claim every selected standalone Agent remains on `/workspace`.

Broader validation **Required — executed**, selected browser + isolated current Electron/API/WS/scripted active worker. No unresolved source/coverage/design findings. Remaining installed affected client/version/8001 relationship and user's macOS display are Delivery/user-only factual verification: source build cannot identify or update that binary, and no live app/data access is authorized. Actual Linux worktree app was built/launched/driven with preserved sandbox and private environment; deeper safe local proof done. No macOS OS/Xcode/device here. No user process touched; no paid inference or release operation. Scope remains Medium/Low; review Not Required — direct low-risk route.

Final confidence:95% (all seven mandatory categories95%; arithmetic mean). Full category evidence and acceptance proof are in api-e2e-execution-coverage-report.md. All critical source behavior directly proven; clean target met; no category below90. Owned setup root, all six desktop roots/registrations/processes and browser route/homes/ports cleaned; environment-cleanup.json and isolated-list-final.json authoritative. No unresolved pre-execution ambiguity, no reroute.
