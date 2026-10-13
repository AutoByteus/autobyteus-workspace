# API/E2E Execution Coverage Report

## Authoritative round result
- **Fail — API-REV-001**, round 1 / IR-001 / SR-001/002, 2026-10-13. Overall final confidence **84.29%**. NOT validation Pass, Delivery Completed, release or Task completion.
- Finding **F-API-001**: actual current-worktree isolated Electron manager inspection reports `Failed to fetch` with `net::ERR_INSUFFICIENT_RESOURCES`. Preliminary classification **Unclear execution origin (product / transport / environment / harness)**. Request focused failure-origin review by Code Reviewer, not successful-test review. Do not infer a collapse source defect or a pre-existing problem until reviewed.
- task_size **Small**, architectural_risk **Low**, Direct Low-Risk; authoritative REQ-B1 / DS-B1 unchanged. Successful test-code review policy remains Not Required — direct low-risk route; this result instead requires failure-origin review. No scope/behavior/design change made.
- Worktree /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse; branch requirements/delegated-team-default-collapse. Production changed pin b9cbb749182d95a63750f70369ec08956018c5e8; cumulative input 13d6181c1; base 8d52dc4e; pre-change production 3230db73f172690c4c8eb08f1cc5891c62ffcdbd.

## Cumulative authorities and artifacts
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/requirements-doc.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/investigation-notes.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/design-spec.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/solution-revision-record.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/solution-handoff.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/implementation-handoff.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/implementation-revision-record.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/implementation-local-checks.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/api-e2e-coverage-investigation.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/api-e2e-test-case-ledger.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/api-e2e-revision-record.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/api-e2e-execution-coverage-report.md
- User screenshot absolute path and evidence-only status carried from solution-handoff.md. Product, architecture-review/revision, initial independent source-review/revision: N/A — not applicable. Delivery/rework report: N/A — no delivery yet.

Investigation written before edits/execution. TESTING.md, root/web/server AGENTS.md, DESIGN.md, root/web/server README testing/run instructions, manifests, runner configs, isolated-instance Linux/root-container documentation read. No closer testing guideline. Refinement from fixture page to real backend is recorded before authoring; no fixture transport boundary omitted. No stale tests removed. Ledger initialized before cases and checkpoints recorded by probe; native per-case ledger copied into canonical ledger after each session. Current native failed case and unstarted native cases reconciled explicitly.

## Durable coverage changes
| Path | Change / purpose / disposition |
|---|---|
| autobyteus-web/tests/e2e/delegated-team-default-collapse-probe.mjs | Added: real backend + Nuxt + Chromium, seven genuine Project Task Teams / six members each, second host same addresses, stored restart, actual Task summaries, button/body/Enter/Space coordinator and exact member conversation/draft, real Project Task-root click, live addition/checkpoint/reconnect/status/message/closure, zero disclosure mutation/commands; 3 cold/warm timing samples. Browser Pass. Optional caller-owned current-worktree Electron mode fails truthfully and captures network failures. |
| autobyteus-web/package.json | Registers test:e2e:delegated-team-default-collapse; no dependency/lockfile change |

Upstream durable store/component/stream/Task-root tests retained as Still Valid, no removals this round. No production source changed by API/E2E. Temporary desktop-session.mjs and baseline-session.mjs are evidence automation only: native UID/Xvfb lifecycle and historical measurement, not new product architecture or compatibility logic. Baseline source swap restores exact changed bytes in finally; hash receipts prove both files restored. Ordinary unused copied helper was removed from probe.

## Executed commands and evidence
Working directory /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse, PATH=/tmp/delegated-team-toolchain:$PATH.
1. `pnpm -C autobyteus-web test:nuxt stores/__tests__/agentRunCollaborationDisclosure.spec.ts components/workspace/history/__tests__/AgentRunTaskRowsDisclosure.spec.ts composables/projects/__tests__/useTaskRootNavigationDisclosure.spec.ts --run --maxWorkers=2`: 3 files / 9 tests Pass (r-001.log); post-probe rerun recheck-direct.log: 3 files / 9 tests Pass, zero unhandled errors.
2. Neighboring command: `pnpm -C autobyteus-web test:nuxt stores/__tests__/agentRunCollaborationStore.spec.ts stores/__tests__/agentRunCollaborationStoreClosure.spec.ts stores/__tests__/agentRootCompactionIntegration.spec.ts services/agentCollaboration/__tests__ components/workspace/history/__tests__/AgentRunTaskRowsSelect.spec.ts components/workspace/history/__tests__/TaskWorkerTaskSummaryHosts.spec.ts components/projects/__tests__/ProjectTaskWorkers.spec.ts --run --maxWorkers=2`: 10 files / 68 tests Pass, r-002.log. Zero unhandled errors across the two independent suites.
3. `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` via pnpm -C autobyteus-web: all Pass, r-003.log; post-probe exact-current-code recheck guards-current.log also Pass. `node --check` new probe and `git diff --check` Pass.
4. `pnpm -C autobyteus-web build:electron:linux`: Pass, electron-build.log. Includes current server prebuild/build, Nuxt static generation, Electron transpilation and native ARM64 packaging. Build flavor enterprise, source version 1.5.3-beta.3. This is NOT a journey pass.
5. `pnpm -C autobyteus-web exec nuxt prepare` before dev probe: dev-prepare.log. Serialized builds/dev servers. App-manifest pre-transform warmup messages retained, not used as asserted product evidence; no browser-error filtering in cases.
6. `pnpm -C autobyteus-web test:e2e:delegated-team-default-collapse --output-dir <fresh absolute evidence directory> --ledger-file <canonical ledger>`: browser-current/evidence.json **Pass** B-001..006/P-001 with zero browser errors, actual HTTP/WS and public API data. Earlier changed-final also passes with stronger live marker/status evidence. All servers/ports/data closed in cleanup receipt.
7. Historical source wrapper `node <evidence>/baseline-session.mjs <evidence>/baseline-final`: baseline policy observed, NOT approved behavior Pass. Source receipts record baseline/changed hashes and restoration; baseline-final/evidence.json, changed-final/evidence.json, performance-comparison.json.
8. Full desktop session (exact recipe in desktop-session.mjs and session logs): private HOME/TMPDIR/runtime, uid/gid 24017, `xvfb-run` wrapping **start → setup → actual restarts → automation → stop**. `pnpm --silent isolated-app start --from-worktree`, canonical restart/stop/list. Test-only `agy` executable on private PATH runs repository agy-failure-cli.mjs with linked_skills; embedded server gets no inherited provider keys. No paid/local model inference. Latest desktop-current/desktop-receipt.json and journey/evidence.json **Fail**.

Full web/server/Electron unit suites not run: no source change to backend/shell; targeted repository coverage, current package build and owned real boundaries selected. Browser and packaged native evidence remain distinct.

## Requirement / changed boundary results
| AC / scenario | Direct repository/browser proof | Actual native result / limitation |
|---|---|---|
| AC-001 SCN-001/004 | Fresh 7 team rows, 42 hydrated children, default false; stored and real live paths; primary/other host exact IDs | Seven collapsed rows and host commit observed, but strict B-001 fails on store/network error; not native sign-off |
| AC-002 SCN-002/004 | Only one Team reveals six members; same-address copies isolated; explicit choice/reselection retained, button does not select; draft retained | Not executed beyond latest first native case |
| AC-003 SCN-003 | Persisted Tasks and both host/child conversations compared before/after, zero GraphQL mutation/stream commands; live exact member message and idle/running status; real DONE removes Task and returns host | Full native continuity/lifecycle journey incomplete |
| AC-004 SCN-002 | Actual coordinator/member/host selection and actual Project Task-root UI, target-only reveal | Full native navigation not certified |
| AC-005 SCN-001 | Comparable labelled baseline/changed browser samples, exact read/row counts and source pins | Native cold/warm measurements incomplete; browser times not desktop/user times |
| AC-006 all | Durable command/tests, real browser changed-source assertions, current Linux build, owned cleanup receipts | Critical full actual isolated-product journey **not proven**. Explicit user runtime/verification and Delivery finalization remain pending |

## F-API-001 focused failure package
- Surface: unpacked **actual current worktree** Electron 42.4.1 / Chromium 148.0.7778.265 (exact CDP browser version in latest JSON), Linux ARM64, UID 24017 with normal Chromium sandbox and own Xvfb display. No `--no-sandbox` in Electron. Browser probe uses a separate installed Chromium 153; that success is not shell proof.
- Trigger: public APIs create seven legitimate Task copies of one six-member Team and one same-address copy under a second host; terminate fixture hosts; canonical app restart after seed, then another full-shell restart before cold manager selection. Open workspace → Project Task Manager Probe role → exact primary run. This is the supported existing-Tasks startup path, not two-tab racing or a made-up identifier.
- Expected: all seven Teams listed collapsed; host committed; no store/network/browser error, followed by manual/member/live/closure journey and final actual restart.
- Latest observed: seven retained Teams all collapsed, host target and persisted conversation correct, but `agentRunCollaboration.errors[host] = Failed to fetch`. **49 GraphQL failures**: 25 GetRunFileChanges and 24 GetAgentRunCollaborationMemberProjection, all `net::ERR_INSUFFICIENT_RESOURCES`; 49 console errors. Failures are real and NOT filtered out. This fails B-001 / D-001, AC-001/006 confidence; later native cases not started.
- Captured reads since observation: 90 member projections, 91 artifact reads, 3 collaboration reads (includes second host and repeated inspections). Source derives 42 + 42 per complete primary hydration; multiple inspections amplify it. This suggests an unchanged eager-hydration/overlap cost, NOT proven cause or proof that the defect predates b9cbb7491.
- Evidence: desktop-current/journey/evidence.json (failureState, failedRequests, requests, failures, errors, source/setup identities), failure.png, desktop-current/case-ledger.md, desktop-current/desktop-receipt.json and lifecycle JSONs. Initial PID 77246; canonical owned restart PIDs 77929 and 78190. Same instance iso-40299-273a; ports 40299 / 42731; all stopped/removed now.
- Attempted corrections/diagnostics: genuine 7-Task setup vs initial mistaken 6; asynchronous summary readiness; semantic ancestor reveal; quiet reads before navigation; actual router readiness; CDP socket observation for existing documents; full app rather than renderer reload; startup restart after seed. Resource failure **remains after these corrections**. High fd/process limits, cgroup no OOM, Xvfb available, /dev/shm 64MiB and about 4.8GiB available at diagnostic. No sysctl, AppArmor, setuid helper or host security changes.
- Earlier desktop-attempt-1/2/3/4/desktop-final retained; some iterations are harness failures (not product defects). Actual restart initially passed B-001 in attempt4, then P-001 reload failed. That partial observation is NOT a successful desktop journey and does not close latest failure.
- Requested origin review: distinguish packaging/network/platform environment, harness timing and a pre-existing inspection/transport problem from this disclosure delta. Validate assertions against REQ-B1. If pre-existing product cost is proven, route a scoped follow-up to Task owner through team rules, with a reference; do not silently label out of scope or redesign hydration here. Return test/environment Local Fix to API/E2E when appropriate. A behavior/readiness redesign requires Solution Designer authority.

## Performance evidence (three samples each, medians in milliseconds)
Cold = fresh browser page/Pinia AFTER optimizer warmup, not cold OS cache or app launch; warm = same-page host reselection. Capture-phase trusted run click to per-frame host commit/row publication; selected-member clock to exact child/conversation context readiness. Functional DOM/conversation/composer assertions separately prove display/target, not a production latency SLA. Role expansion can preload rows before run click; flags and request counts retained.

| Mode | Cold host / rows / member | Warm host / rows / member | Initial visible rows |
|---|---|---|---|
| Baseline 3230db73f | 98.4 / 38.2 / 29.9 | 7 / 7.1 / 13.4 | 49 |
| Changed b9cbb7491 | 81.4 / 81.5 / 17.2 | 9.4 / 9.5 / 15.2 | 7 |

Both still read 42 member projections + 42 artifacts **per full primary inspection**. Observed cold role-through-member primary reads: baseline [126,126,84] per family, changed [84,84,84] (2–3 complete inspections, scheduling-dependent); warm [0,0,0] child reads, plus host projection/resume/artifacts. Extra same-address host adds six member pairs. These are safe deterministic actual-backend fixtures, not user's workload or model inference latency. Differing overlap and row preload make short timing samples insufficient for a speedup claim. Some changed checkpoints are slower. **No product speedup or explanation of the user's long wait claimed.** Follow-up candidate: investigate repeated/eager complete inspections and native resource failure with origin evidence, outside authorized optimization scope.

## Mandatory confidence scorecard
| Category | Post-repository | Final | Supporting evidence / remaining gap |
|---|---:|---:|---|
| Requirement and acceptance-criteria proof | 75% | 75% | Browser functional proof strong; critical native AC-006 incomplete/error |
| Changed-boundary execution directness | 95% | 95% | Actual store/component/stream + real server/browser + actual native selected/collapsed observation; failure does not justify a higher score |
| Cross-boundary integration realism and mock gap | 75% | 85% | Real Tasks/HTTP/WS, scripted scoped MCP; native fetch boundary fails |
| Environment, configuration, identity, fixture fidelity | 75% | 90% | Current native package, exact IDs/public API data, sandbox/private HOME; network resource origin unresolved |
| Failure, edge-case, lifecycle, recovery | 90% | 75% | Real browser closure/checkpoint/reconnect, but actual native journey/recovery unfinished |
| User-surface, browser, desktop-shell | 75% | 75% | Real browser assertions; native actual journey fails |
| Durable regression coverage quality/relevance | 95% | 95% | Valid durable tests/probe rejects errors and captures complete failure rather than forcing pass |

Post repository 82.86%; final **84.29%**, simple mean. Applicable categories below 90 remain; every critical AC directly proven **No**. Clean ≥95% target **not met**. Broader Required and executed Browser + Project Desktop Validation; result Fail, not Blocked: ordinary setup works, no exact missing external dependency established. No score overrides native errors.

## Compatibility / data continuity / scope
Implementation Legacy/Compatibility and Persisted Data sections reviewed. Approved Not Affected; no migration, dual reader/writer, version-specific runtime compatibility branch or retained obsolete production opener. Ephemeral choices intentionally reset with fresh store/app; source-only baseline measurement is test evidence, not a legacy production path. No disclosure-driven persistence/stop/cancel command in real browser. API stage did not alter Task/runtime semantics, child hydration, Team/Org policy or source architecture.

## Cleanup / actual delivery / residual checks
All browser stacks and native instances stopped. Latest browser receipt proves frontend/backend ports closed and data removed. Every native canonical stop confirms auto data removed and control/server ports released; native registry empty. This stage's private HOME/bin/runtime removed after verifying no uid24017 processes or owned instance remained; build/dependencies/SDK dist/worktree intentionally retained for review and later Delivery. No user instance, files, credentials/config, provider/local model or existing processes touched. No paid inference/import, merge, push, release, deploy, installed-version upgrade or user restart. Entire Task is NOT complete.

Unproven: full native manual/Task-root/live/lifecycle journey, stable native cold/warm timings and final post-journey app restart; user actual OS/runtime/version and explicit final user verification. Later Delivery still owns docs sync, applicable finalization/release/cleanup and truthful receipt through Solution Designer to /project_task_manager. Current fail package goes only to configured failure-origin Code Reviewer.

### Failure evidence limit and reproduction guidance
Raw native server/launcher logs were auto-removed by canonical stop in completed attempts; client failed-request/console/store receipts and screenshots are retained. No native backend-log correlation beyond actual public API responses/current packaged identity is claimed. Temporary desktop-session.mjs now copies those logs before stop for the reviewer’s next reproduction. Provision fresh private HOME/bin/runtime and unused non-root uid per docs/isolated-app-instances.md; the retained session recipe/fixture CLI wrapper reproduce latest setup without user credentials. No additional attempt or resolution inferred from this reporting change.
