# API/E2E Execution Coverage Report — followup-cleanups-568 (autobyteus-568): five follow-up cleanups

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; the implementation engineer's handoff IR-001 (direct route); HEAD `52e75f2357` (code `eb7e4bf2af`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: none. Load average on this Mac 43–90 during the run (other processes).
- Evidence folder (absolute path): `/Users/normy/autobyteus_org/autobyteus-worktrees/followup-cleanups-568/tickets/in-progress/followup-cleanups-568/evidence/api-e2e/`
  - `WEB-01-basics-spec.log`, `CH-01-chooser-real-simctl.log`, `GH-01-run-44747687988.log`, `FS-DOCKER.log`, `API-01-schema.log`, `E2E-01-ws-approval.log`, `E2E-01-evidence/native-tool-search-e2e.json`, `DL-01-deadline-x10.log`, `IOS-01.log`, `IOS-01-smoke/`, `FS-DESKTOP.log`, `FS-DESKTOP-verify.log`
  - `scripts/` (temporary: `fs-other.sh` (from ios-demo-mode-279), `fs-desktop-verify.sh`, `api-01-schema.mjs`, `ios-01.sh`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `52e75f2357` (code = `eb7e4bf2af`) | macOS 26.5.2 arm64, Node 22.23.1, pnpm 10.28.2, Xcode 26.1.1 (iOS 26.1 simulator SDK) | the worktree (WEB-01, CH-01, E2E-01, DL-01) | E2E-01 in a clean environment (`env -i`, temp HOME) with the test's own synthetic vault; no real key |
| ENV-2 | `52e75f2357` | macOS | fresh clones (`git clone --no-local`, 0 prior build folders): `~/.cache/abtest568/fs-docker`, `fs-desktop`; `/tmp/abtest568/ios` (symlinked on purpose, AC-003) | the release jobs' commands |
| ENV-3 | `52e75f2357` | macOS | the FS-DOCKER clone's `dist/app.js` on 127.0.0.1, temp data root and HOME, its own launch credential (never printed) | `APP_ENV=test` |
| ENV-4 | `52e75f2357` | iOS 26.1 simulator `apie2e568-iphone` (iPhone 17 Pro Max, English), mine | — | deleted afterwards; other simulators only read by the chooser, never booted |
| ENV-5 | `eb7e4bf2af` | GitHub `xcode-27-arm64`, Xcode 27.2 | build-only run 44747687988 (dispatched by the implementation engineer; read here with `gh`, read only) | `publish_app_store_connect=false` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-001…005 | codegen check, both typechecks, server agent-run tests, contract check (4 negatives), web suite, Electron suite, deadline ×20 under load, demo check, iOS core tests (plain and `/tmp`) | IMP-01…IMP-09 | — | Reused (`Pass`) | `evidence/implementation/IMP-0*.log` | each log's result line | `git diff --name-only eb7e4bf2af 52e75f2357`: ticket documents only. IMP-06's Electron suite needed a rerun for an untouched timing test (FU-003) |
| WEB-01 | AC-004 | the Basics spec | `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts` | ENV-1 | `Pass` | `WEB-01-basics-spec.log` | `Tests  2 passed (2)`; `exit=0` | — |
| CH-01 | AC-005; SCN-A2 | the chooser on this Mac's real `simctl` (12 iOS 26.1 devices: iPhone 17, 17 Pro, 17 Pro Max …) | `select-ios-simulator.py` with the default, my simulator's exact name, a prefix of it, and a missing name | ENV-1, ENV-4 | `Pass` | `CH-01-chooser-real-simctl.log` | default: "Selected simulator: iPhone 17 (iOS 26.1)" (not Pro / Pro Max); `IOS_SIMULATOR_NAME=apie2e568-iphone` → mine (`same=yes`); `apie2e568` → `mine? no` with "No 'apie2e568' simulator; using 'iPhone 17 Pro' (iOS 26.1)."; `iPhone 99` → the same notice; my simulator still `Shutdown` | it reads the list and boots nothing |
| GH-01 | AC-005; SCN-A1 | the iOS job on the runner | `gh run view 44747687988 --json …`/`--log` (8,188 lines), grepped | ENV-5 | `Pass` | `GH-01-run-44747687988.log` | `head eb7e4bf2af…`; `INPUT_PUBLISH_APP_STORE_CONNECT: false`; `Image: xcode-27-arm64`; "Selected Xcode app: /Applications/Xcode_27.2.app"; "Selected simulator: iPhone 17 (iOS 27.2), UDID D7F008F7-…" in "Select available iOS simulator" **and** in the smoke step (same UDID); runtimes named: iOS 27.0, 27.1, 27.2; `IOS_SIMULATOR_DESTINATION: platform=iOS Simulator,id=D7F008F7-…`; contract check passed; `BUILD SUCCEEDED`; "Executed 56 tests, with 0 failures"; "Executed 8 tests, with 0 failures"; "Smoke UI tests: executed and passed without skips"; publish jobs `skipped` | my own reading of IMP-10; code unchanged since |
| FS-DOCKER | AC-001; SCN-A1 | the server image's builder stage | `scripts/fs-other.sh docker <worktree> 52e75f2357 ~/.cache/abtest568/fs-docker <evidence>`: install, three contract builds, `prisma generate`, server build, `build:mobile-web` | ENV-2 | `Pass` | `FS-DOCKER.log` | `# fresh: 0 prior build folders`; each step `exit=0` | — |
| API-01 | AC-001; SCN-A3 | the built server's GraphQL | `node scripts/api-01-schema.mjs ~/.cache/abtest568/fs-docker API-01-schema.log` | ENV-3 | `Pass` | `API-01-schema.log` | the removed mutation → `["Unknown type \"ApproveToolInvocationInput\".","Cannot query field \"approveToolInvocation\" on type \"Mutation\"."]`, `data: null`; no `ApproveToolInvocation*` type; `terminateAgentRun`, `createAgentRun`, `prepareAgentRun`, `cancelPreparedAgentRun`, `restoreAgentRun`, `updateStoppedAgentRunSelection`, `agentRunCollaborationMemberProjection` still served; `terminateAgentRun(unknown)` → `{"success":false,"message":"Agent run not found."}`; "temp root removed: true" | the out-of-scope fields stay (FU-001) |
| E2E-01 | AC-001 ("approval over the WebSocket still works") | a real server, a native run with tools not auto-executed, `APPROVE_TOOL` over the WebSocket | `env -i PATH HOME=<temp> TMPDIR NATIVE_TOOL_SEARCH_E2E_EVIDENCE_DIR=<evidence> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts --no-watch` | ENV-1 | `Pass` | `E2E-01-ws-approval.log`, `E2E-01-evidence/native-tool-search-e2e.json` | "✓ NTS-E2E-001…005: search and call a found tool with approval, restore, add and remove a tool"; `Tests 1 passed`; the JSON's `approvals`: 5 (`search_tools`, `list_projects` ×3, `list_project_tasks`), `unscripted: []` | a scripted model and a synthetic vault (no real key) |
| DL-01 | AC-002 | the port-inspector deadline case | 10 × `pnpm exec vitest run --config ./electron/vitest.config.ts server/__tests__/PortOwnerInspectorFaults.spec.ts -t 'enforces the real 1000ms'` (autobyteus-web) | ENV-1 | `Pass` | `DL-01-deadline-x10.log` | `run 1 … run 10`: `exit=0`, "✓ … enforces the real 1000ms subprocess deadline and reaps only its owned child", at load1 68–72 | no added load (the machine's own); IMP-07 adds 20 runs under 10 busy loops |
| IOS-01 | AC-003, AC-005 | the core tests from a `/tmp` checkout; the smoke with the chooser | `scripts/ios-01.sh <worktree> 52e75f2357 <evidence> apie2e568-iphone`: clone into `/tmp/abtest568/ios`; install; `prepare-demo-web.sh --build`; contract check; `generate-project.sh`; core tests; `IOS_SIMULATOR_NAME=apie2e568-iphone ios-simulator-smoke.sh` | ENV-2, ENV-4 | `Pass` | `IOS-01.log`, `IOS-01-smoke/summary.txt` | `# pwd: /tmp/abtest568/ios (logical), /private/tmp/abtest568/ios (physical)`; "The demo answers all 249 compiled operations" (252 in 279, less the 3 removed); "SavedNodeEntryKeysMigrationTests testOnlyTheStartUpCallSiteReferencesTheMigrationFolder]' passed"; core "Executed 56 tests, with 0 failures"; smoke "Selected simulator: apie2e568-iphone (iOS 26.1)", "Executed 8 tests, with 0 failures", "Smoke UI tests: executed and passed without skips" | the path that failed in 279 (FU-005) |
| FS-DESKTOP | AC-001; SCN-A1 | the desktop release build | `scripts/fs-other.sh desktop …`: install; `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=… CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; then `scripts/fs-desktop-verify.sh` (the job's two verify steps, taken from the clone's workflow) | ENV-2 | `Pass` | `FS-DESKTOP.log`, `FS-DESKTOP-verify.log` | `# fresh: 0 prior build folders`; "[typecheck] production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)", `[typecheck] PASS`; "The /mobile build holds no demo code."; the DMG and zip; `step exit=0` ×2, `[terminal-runtime] ok: node-pty spawn probe` | signing, notarization, x64, Windows and Linux: the runners |

## Failures

None.

- Not a failure of this ticket: IMP-06's Electron-suite timing test (`browser-screenshot-capture.electron.spec.ts`, untouched; FU-003).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | R-IMP (IMP-01…04, 08: codegen, typechecks, server tests, demo check), API-01 (the built server's schema), E2E-01 (WebSocket approval), FS-DOCKER, FS-DESKTOP; a search: the names remain only in FU-002's two probes | `Proven` | — |
| AC-002 | Yes | R-IMP (IMP-06 suite, IMP-07 20× under load), DL-01 (10×) | `Proven` | — |
| AC-003 | Yes | IOS-01 (from `/tmp`), R-IMP (IMP-09 plain and `/tmp`) | `Proven` | — |
| AC-004 | Yes | WEB-01, R-IMP (IMP-06: 784 files, 5886 tests) | `Proven` | — |
| AC-005 | Yes | GH-01 (iPhone 17 on iOS 27.2 in the step and the smoke), CH-01 (real device list: exact name, fallback notice), IOS-01 (the smoke through the chooser), R-IMP (IMP-05: the contract check's fixtures) | `Proven` | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | every AC by a direct case | — | — |
| Changed-boundary execution directness | 88% | 95% | the built server's schema, a real WebSocket approval, the real `simctl`, the runner | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | real server and simulator; the E2E's model is scripted (not changed here) | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | fresh clones of three release jobs; the runner's fresh start | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | the removed mutation from an old client; the chooser's prefix, missing-name, beta-runtime and no-iPhone paths (real list and fixtures); the deadline under load | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no user-facing change (tests, CI scripts, dead GraphQL) | — | — |
| Durable regression coverage quality and relevance | 92% | 93% | the three repaired tests; the contract check runs the chooser against fixtures in every release run; the removed unit case's behavior stays covered by the stream-handler tests and E2E-01 | the Electron suite still has an untouched load-sensitive timing test (FU-003) | FU-003 |

- Overall post-repository confidence: 88% (R-IMP, WEB-01, CH-01, DL-01)
- Overall final confidence: 95% (94.7%, simple average of the six applicable categories)
- Calculation method: simple average; the user-surface category is not applicable
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` at 94.7%, by FU-003 alone (out of scope, recorded)
- Confidence-limiting residual risks: FU-003 (an untouched Electron timing test may still fail on a busy machine)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (fresh-start Docker and desktop builds), `Other` (a built server's GraphQL; a real-server WebSocket E2E; the iOS simulator and the real `simctl`; the GitHub run read independently)
- Confidence gap or residual risk it addresses, and the expected gain: the regenerated types in a from-scratch build; the server's schema as a client sees it; WebSocket approval without the mutation; the chooser against a real device list
- Browser validation needed, and why or why not: no; no renderer behavior changed
- If `Not Required`: —
- If `Blocked`: —

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the mutation and its types are gone, no alias; API-01)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (by API/E2E). The implementation's test changes (D-2, D-3, D-4, the contract check's chooser cases, the removed approval unit case) were exercised by DL-01, IOS-01, WEB-01, GH-01/IOS-01 and R-IMP.
- Added or updated paths attached for proportional test-code review: `N/A` (direct route)
- Diff or repository evidence supplied for removed paths: none removed by API/E2E

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The model in E2E-01 | the test's scripted Anthropic-compatible endpoint and synthetic vault | no provider needed for approval routing | none for the approval path |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Simulator `apie2e568-iphone` | Yes | `simctl delete` | deleted; other simulators only read by the chooser |
| Clones `~/.cache/abtest568/{fs-docker,fs-desktop}`, `/tmp/abtest568` (clone, DerivedData), the downloaded run log, the one `AutoByteusMobile-*` DerivedData folder whose workspace was my `/tmp` clone | Yes | removed | — |
| The built server of API-01 and its temp root | Yes | killed; removed | "temp root removed: true" |
| GitHub | No (read only) | nothing dispatched, pushed, tagged or uploaded by API/E2E | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none
- Next recipient from `get_handoff_rules`: Delivery Engineer (direct Medium / Low Pass)
- Notes: FU-001, FU-002 (the Solution Designer's) and FU-003 (the implementation's) stay recorded, outside this ticket.
