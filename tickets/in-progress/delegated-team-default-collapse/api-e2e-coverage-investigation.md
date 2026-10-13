# API/E2E Coverage Investigation

## Investigation meta / current basis
Round 1, initial IR-001 input, 2026-10-13. Approved REQ-B1/DS-B1, SR-001/002 unchanged. No previous API result. Small / Low, Direct Low-Risk. Successful-output route Delivery; test review Not Required — direct low-risk route. Independent architecture/source reviews and Product supplement N/A — not applicable. Canonical upstream read before durable edits:
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/requirements-doc.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/investigation-notes.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/design-spec.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/solution-revision-record.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/solution-handoff.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/implementation-handoff.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/implementation-revision-record.md
- /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse/tickets/in-progress/delegated-team-default-collapse/implementation-local-checks.md

Source pin 13d6181c1 (production b9cbb7491); baseline production 3230db73f172690c4c8eb08f1cc5891c62ffcdbd. Worktree /home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse; branch requirements/delegated-team-default-collapse. All canonical API artifacts reside beside this investigation. Screenshot is evidence-only at the absolute path in solution-handoff.md.

## Supported scenarios / boundary map
SCN-001 startup/restart stored manager; SCN-002 independent exact-ID disclosure and coordinator/member/Task-root selection; SCN-003 ongoing status/conversation and closure; SCN-004 refresh/reselection/new teams. No contrived scenarios defined or planned. Additional real trigger: active host receives collaborator_added, task_execution_started checkpoint and transport reconnect; existing manual choice must survive. Empty host is harmless.

| Boundary | Change | Requirement / evidence | Validation |
|---|---|---|---|
| Pinia disclosure publication | Removed automatic opener/suppression, absent choice false | AC-001/002; store/context/stream | Actual-store suites, durable browser fixture, real product |
| Components/browser/web-equivalent desktop renderer | Preserved rows, body vs button, Enter/Space, exact selected child | AC-002/004/006 | Actual product components, trusted browser input, isolated Electron |
| API/transport | Preserved hydration, event sequencing, host scope and exact member identity | AC-001/003/005 | Fixture HTTP/WS plus real-stack/public API journey |
| Persistence | Not Affected; memory-only disclosure, no migration | AC-003 | Mutation/command capture, real Task and conversation snapshots |
| Shell/lifecycle | No source change; full product evidence still required by TESTING.md | AC-006 | Current worktree Electron, restart and canonical cleanup |
| Backend/domain/auth/workers/external integrations | No source change | Preservation only | Small scripted AGY/public API setup, no paid inference |

## Discovery / execution authority
Read root AGENTS.md, TESTING.md, DESIGN.md; autobyteus-web/AGENTS.md, autobyteus-server-ts/AGENTS.md; root README.md local/packaged execution; web README testing/packaged launch; web vitest config, manifests; docs/isolated-app-instances.md Linux/root-container recipes. No closer TESTING guideline. Skill templates loaded from shared root because .codex skills are not tracked in assigned worktree. Test ordering: focused Nuxt, neighboring suites, guards; browser probe; actual isolated app for full user journey. Never use user server 8000/data. Never parallel build/dev server in this worktree.

| Resource | Setup / readiness / stop |
|---|---|
| Dependencies | Upstream install, SDK dist, Prisma and Nuxt prepare retained; PATH=/tmp/delegated-team-toolchain:$PATH |
| Browser fixture | Own free port, temporary unique Nuxt page, fresh headless Chromium; warm optimizer before cases; strict unknown GraphQL/WS errors; stop own process group/remove route |
| Isolated Electron | pnpm -C autobyteus-web build:electron:linux, then isolated-app start --from-worktree under private HOME, unused uid/gid 24017 and Xvfb for entire session; use returned instance/ports; canonical stop/list |
| Scripted runtime | tests/fixtures/agy-failure-cli.mjs and CALL_TOOL through real socket/public APIs for own data; no user credentials or model needed |
| Data | Fresh temp root/database/workspace, definitions/Tasks through public APIs; never edit shared data |

Observed Linux-arm64, Node22, uid0 builder. Xvfb/xauth/setpriv present. Non-root user namespace diagnostic under uid24017 succeeds; no security policy modification. Actual packaged launch must still be verified. Inherited env/keys must be stripped from live/server tests. Build output untracked; stage explicit paths only.

## Existing durable coverage decisions
| Path / family beneath autobyteus-web | Validity | Reason / action |
|---|---|---|
| stores/__tests__/agentRunCollaborationStore.spec.ts | Still Valid | Updated default false matches REQ-B1; inspect/submit/navigation preserved |
| stores/__tests__/agentRunCollaborationDisclosure.spec.ts | Still Valid | Actual store/context/stream seven teams; stored/live/checkpoint/new child/restart/host isolation |
| components/workspace/history/__tests__/AgentRunTaskRowsDisclosure.spec.ts | Still Valid | Actual component/store exact member and selection; count actionable rows |
| composables/projects/__tests__/useTaskRootNavigationDisclosure.spec.ts | Still Valid | Intentional targeted-only reveal |
| stores/__tests__/agentRunCollaborationStoreClosure.spec.ts, agentRootCompactionIntegration.spec.ts | Still Valid | Closure/recovery/termination/adoption; explicit-open assertions now valid |
| services/agentCollaboration/__tests__ | Still Valid | Transport/index/context/hydration contract; dead callback removed upstream |
| components/workspace/history/__tests__/AgentRunTaskRowsSelect.spec.ts, TaskWorkerTaskSummaryHosts.spec.ts; components/projects/__tests__/ProjectTaskWorkers.spec.ts | Still Valid | Selection, summaries, closure; upstream unmount fix retained |
| tests/e2e/task-closure-tree-probe.mjs | Still Valid | Real Tasks/AGY API pattern, unchanged lifecycle; use setup guidance not whole unrelated suite |
| tests/e2e/agent-org-task-team-disclosure-probe.mjs | Out Of Scope assertions | Org policy unchanged; reuse owned probe style only |
| implementation-evidence/ir-001/rendered-preview.mjs | Temporary evidence, not durable | Host button bypasses actual open; empty Task answers; no product proof |

No stale removal necessary this round. No unknown requirement assertion.

## Durable changes planned (before edits)
Add tests/e2e/delegated-team-default-collapse-probe.mjs, fixtures/delegated-team-default-collapse.page.vue and register test:e2e:delegated-team-default-collapse in web package.json. Cases B-001..006: seven Teams, independent button/body/key selection and exact conversations, two hosts/same addresses, stored refresh/restart, live addition/checkpoint/reconnect/closure and zero disclosure commands/mutations. Supply nonempty Task summaries/statuses and Projects/package-definition WS. Probe evidence JSON and optional --ledger-file append immediate per-case outcomes. Temporary current-build full-product journey D-001 through isolated Electron; comparable baseline/changed click→host commit, rows ready, selected member ready P-001 with request/row counts. Baseline source override allowed only as isolated temporary measurement with finally restore, never production compatibility.

## Repository plan / confidence
R-001 narrow store/disclosure/component/Task-root suites then R-002 neighboring stream/closure/compaction/summary; R-003 guards. Ledger required (multiple meaningful cases + long build/runtime). Initial all cases Not Tested. Post-repository scorecard will be populated immediately after execution; no inferred percentages/pass from upstream. Broader validation Required: Nuxt fixtures bypass backend and shell, full critical AC-006 product proof and AC-005 timings are absent. Browser and isolated desktop/public API complement, never substitute. No blocker currently established.

## Compatibility and persisted-data checks
Upstream handoff Legacy/Persisted sections read. Clean deletion; no fallback/dual branch/migration. Not Affected approved. Retain complete hydration, no lazy-loading refactor. Latency has no SLA/speedup promise. Actual user runtime/version still unknown and final user verification remains Delivery-owned, not an execution permission shortcut.

## Proceed decision
Proceed Yes. Durable additions Yes; removals None. Reroute before validation No. Final result/confidence pending execution. No merge/push/release/deploy/user restart authorized or planned.

## Plan refinement before durable authoring
2026-10-13: use a probe-owned real backend + Nuxt and scripted AGY, not a fixture page. Existing task-closure-tree probe demonstrates public setup for this exact standalone trigger. Durable browser probe can then prove actual Task summaries, status/conversation, exact Root navigation and real WS with no missing fixture boundary. Projects/package-definition feeds come from real server. No new fixtures/page or fake disclosure implementation. Add optional --desktop-instance JSON attach mode, with lifecycle owned by temporary desktop session. Extend B-003 two same-definition host executions. Live checkpoint/reconnect triggered by actual delegation/transport close. Paid provider N/A. Source-only baseline measurement override restored in finally and never committed.

## Post-repository execution and mandatory confidence gate
R-001 direct suites: 3 files / 9 tests Pass, 14.69s, r-001.log. R-002 neighboring suites: 10 files / 68 tests Pass, 37.08s, r-002.log. R-003 all three guards Pass, r-003.log. Zero unhandled errors. No full web/server suite claimed. Commands in logs/ledger and execution report. Source whitespace checked at finalization of API stage, not release.

| Mandatory category | Post-repository | Support / gap / needed gain |
|---|---:|---|
| Requirement and acceptance-criteria proof | 75% | Default/exact reveal proven locally; product/three-stage timing absent |
| Changed-boundary execution directness | 95% | Actual store/component/stream, hydration network mocked |
| Cross-boundary integration realism and mock gap | 75% | Backend transport/provider not executed; real-stack probe needed |
| Environment, configuration, identity, fixture fidelity | 75% | Seven same-address copies; generated fixture identities, no real Tasks yet |
| Failure, edge-case, lifecycle, recovery | 90% | Checkpoint/closure/adoption/compaction regressions; real restart remains |
| User-surface, browser, desktop-shell | 75% | happy-dom and upstream preview, not independent product/browser |
| Durable regression quality and relevance | 95% | Requirements-linked real-store tests; browser durable command planned |

Overall 82.86%, arithmetic mean. Critical AC-005/006 not yet directly proven; not Pass. Broader Required: owned real stack browser (no mocked HTTP/WS), actual isolated changed-build Electron product journey, comparable cold/warm timing. Target ≥95% only after direct critical proof. App build running serially; no dev server started yet. Build is not journey proof.

Execution setup finding: actual catalog delegation creates no hosted template by itself; seven genuine Project Task copies (not one hosted + six Tasks) better reproduce requested workload. Unit fixture remains valid for mixed hosted/delegated supported paths. Before browser cases, attempt1 workload guard rejected six teams; fixed test setup only. Nuxt manifest pretransform stale outputs after test/production builds require dev prepare; preserve logs.

Desktop investigation refinement: attempt3 is not a collapse assertion mismatch. Chromium reported ERR_INSUFFICIENT_RESOURCES on cold overlap, store Failed to fetch, 132 child projections / 133 artifacts (primary inspected three times plus other host). Resource diagnostics: normal high file/process limits, cgroup no OOM, 64MiB /dev/shm, about 4.8GiB available, no global security changes. Electron renderer receives rapid seed events while browser renderer is not started until after seed. Test the reported startup with existing Tasks by canonical restart AFTER public API seeding, before asserting fresh manager, eliminating this setup/event-overlap confound. Retain failed network/state evidence; no latency root-cause/product performance claim. Only caller-owned current worktree instances accepted; parent retains final cleanup. Broader result still unresolved pending actual journey.

## Final investigation / reroute decision
API-REV-001 **Fail**, 84.29%, F-API-001 Unclear execution origin. Browser-current all B cases/P-001 Pass with zero errors, ports/data cleanup. Actual current native desktop-current still reports 49 failed child projection/artifact reads with net::ERR_INSUFFICIENT_RESOURCES and store Failed to fetch after canonical startup/full-shell restarts. Seven retained Teams are collapsed and host target correct, but strict AC-006 full-product proof fails. Earlier setup-overlap/reload hypotheses did not close this condition. No known missing external dependency: not Blocked, no user setup request needed. Stop further repetition and request focused Code Reviewer origin review via returned failure rule. No expanded design or production optimization. Final scorecard and exact native reproduction/cleanup are in execution report; native manual/live/final restart cases remain Not Tested. Every critical AC directly proven No. Successful test-review policy Not Required — direct low-risk route remains, but this is a failure-origin review request.
