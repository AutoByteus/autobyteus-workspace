# API/E2E Execution Coverage Report
## Latest authoritative result
**Pass — 95% validation confidence.** Round 1, API-REV-001, 2026-09-26. All critical AC-001–005 directly proven for the approved renderer-only scope. No applicable category below 90%. Broader validation Required and completed in Browser. No production changes made by API/E2E.
Task size **Small**; architectural risk **Low**; input Direct Low-Risk. Proportional test-code review **Not Required — direct low-risk route**. Successful-output route Delivery, subject to configured handoff rule.

## Authority and round context
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar; branch codex/task-agent-peer-sidebar; implementation 90d71e7f3 (IR-001).
Canonical artifacts in this directory: requirements-doc.md (SR-001 approved through SR-002), investigation-notes.md, design-spec.md, solution-revision-record.md, solution-handoff.md, implementation-handoff.md, implementation-revision-record.md, api-e2e-coverage-investigation.md, api-e2e-test-case-ledger.md and api-e2e-revision-record.md. User screenshot path is in upstream handoff; current-state evidence, not normative target. Implementation evidence/rendered-check.md, peer-sidebar-preview.vue, peer-sidebar.png and local-tests.log remain supporting upstream evidence.
Architecture/source review reports and revision records: N/A — not applicable. Product spec/prototype, delivery revision/rework: N/A — not applicable. Prior API round/result/confidence: N/A, not inferred from missing records.

## Investigation and execution basis
Read cumulative approved package and repository instructions before execution. Initial investigation and ledger written before durable changes or final execution. Plan followed: narrow tests, surrounding integration-owner tests, then production-renderer browser journey. Coverage validity unchanged. Added joined browser regression because existing monitor probe exercises TeamMembersPanel, not this history sidebar.
Three API-owned fixture development corrections occurred within this round (export name, workspace registration, presentation key); all resolved and same scenario IDs rerun. No production defect, requirement ambiguity or design impact observed. See ledger and preserved harness-attempt evidence; these are not prior completed API rounds.

## Case reconciliation and evidence matrix
Ledger initialized before execution; repository cases checkpointed before next case, browser probe checkpoints JSON and appends ledger immediately per case. No case remains running/unstarted/blocked. Final summary below supersedes setup-attempt failures without deleting their evidence.
| Case | Scope | Final result | Direct evidence |
| --- | --- | --- | --- |
| REPO-001 | REQ-001–004, AC-001–005; adapter, index, renderer components, retained navigation | Pass — 5 files / 35 tests | evidence/api-e2e/repo-narrow.log |
| REPO-002 | AC-002/004/005; selection, tree state, inspection and projection hydration | Pass — 6 files / 28 tests | evidence/api-e2e/repo-integration.log |
| PEER-001 | AC-001/002/003/005; initially visible peers, two tasks sharing address, exact conversations, keyboard, failure/retry, narrow width | Pass | evidence/api-e2e/browser/evidence.json; initial-peers.png, retry-error.png, narrow-selected.png |
| PEER-002 | AC-001/004; task-Team ancestry, real container collapse, nested task conversation, outer collapse/reopen | Pass | same JSON; task-team-containment.png |
| PEER-003 | AC-003/004; inactive accepted tasks, browser reload, both task identities, no-task regular list | Pass | same JSON; retained-selected.png |
Total: 63 repository tests; three browser cases passed twice from clean startup (final repeat includes extra live/retained status assertions).

## Exact execution
Repository commands and working directory are recorded verbatim in the coverage investigation; no additional repository suites beyond those planned. `node --check autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs` and `git diff --check` pass.
Final browser command, cwd worktree:
```sh
node autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs --timeout-ms 30000 --output-dir ../tickets/in-progress/task-agent-peer-sidebar/evidence/api-e2e/browser --ledger "$PWD/tickets/in-progress/task-agent-peer-sidebar/api-e2e-test-case-ledger.md"
```
stdout: evidence/api-e2e/browser-run.log. Nuxt readiness/runtime log: browser/nuxt.log. Harness starts `pnpm exec nuxi dev --host 127.0.0.1 --port <ephemeral>` in autobyteus-web with NUXT_TELEMETRY_DISABLED=1 and BACKEND_NODE_BASE_URL=http://127.0.0.1:65534, installs only a temporary fixture page, then uses isolated Chrome context. Test page exists only during execution and is removed in finally.
Platform darwin-arm64, Node v22.23.1, Nuxt 3.21.1 / Nitro 2.13.1 / Vite 7.3.1 / Vue 3.5.28, Chrome 153.0.8010.54. Viewport 1440×960, en-US, light color scheme, sidebars 360px and 260px. No authentication/secrets required; no account, shared data or product app used.

## What the browser directly proves
- Real history store builds execution rows; real section/tree/row components render them with all member disclosure initially closed. Worker and both tasks share aria-level 1, x=56 and padding-left=14px. No Worker disclosure; order Worker, task A, task B, Reviewer preserved.
- Real selection composable → history store → inspection coordinator → Apollo exact projection query → conversation hydration → TeamWorkspaceView. Enter selects task A, mouse selects task B, retry succeeds, Space selects configured Worker. During 500ms delayed response focus remains on prior execution. Failed task B leaves task A selected and exposes row alert/retry.
- First exact request sequence is peer-task-a, peer-task-b (error), peer-task-b (retry), peer-worker, all under peer-root. Distinct conversation markers and unique aria-selected assert no address-based substitution/leak.
- Nested task remains inside its two Team containers; real index returns only those Team keys, not task-Team Agent. Actual tree-state expansion with stable presentation key reveals it; task-Team collapse hides its children. Nested task and its related member share level 3 with no member disclosure. Outer collapse hides all rows, reopening restores peers.
- Reloaded inactive settled fixture preserves two accepted tasks at peer level; both exact conversations hydrate independently. Empty fixture has exactly two regular Agent rows and no transient rows.
- Explicit status assertions prove live `In progress · Offline` and retained `Accepted · Offline`. Screenshots inspected for peers, dashed task treatment, narrow truncation and meaningful task-Team indentation.

## Confidence scorecard
Simple unweighted average of seven applicable categories; percentage is reasoned scoped confidence, not measured defect probability.
| Mandatory category | Post-repository | Final | Supporting change / residual uncertainty |
| --- | --- | --- | --- |
| Requirement/acceptance proof | 90% | 95% | All ACs mapped to real DOM/selection plus repository edge cases; bounded fixture scope |
| Changed-boundary directness | 95% | 100% | Actual changed adapter → index → actual history components; no adapter/renderer mocks |
| Cross-boundary realism/mock gap | 75% | 90% | Actual Apollo request, hydration, focus and rendered conversation; backend response/persistence emulated, not live-server proof |
| Environment/configuration/identity/fixture fidelity | 90% | 95% | Project Nuxt path, current schema builders, isolated registered workspace, exact root/AgentRun IDs; not production data |
| Failure/edge/lifecycle/recovery | 90% | 95% | Real delayed/error/retry, retained reload, no-task, multiple peers and real containers; no live delegation generation |
| User-surface/browser/desktop-shell | 75% | 95% | Real Chrome DOM, keyboard/mouse, visual evidence at two sidebar widths; shell unchanged and not tested |
| Durable regression quality/relevance | 95% | 95% | Existing valid tests retained; new scoped browser fixture/probe passing twice, cleanup/checkpoints included |
Overall: **87.14% → 95.00%** (610/7 → 665/7). No score below 90; default clean gate met. The remaining emulated-backend gap is bounded to unchanged behavior and does not leave a critical changed-boundary criterion unproven. Full live-system/packaged-release confidence is not claimed.

## Durable changes
Added only:
- autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs
- autobyteus-web/tests/e2e/fixtures/task-agent-peer-sidebar.page.vue
No existing durable test updated or removed. Existing task-agent-monitor-visibility probe remains unchanged. New probe is directly runnable following its header; no permanent production test route. No temporary production edits remain. Attach additions with cumulative package; proportional review not required on direct Small/Low route.

## Emulation and exclusions
GraphQL health/bootstrap/projection responses intercepted by Playwright; exact outgoing root/run IDs recorded. Projection responses include deterministic unique conversations, delay and one intentional error. Team contexts and current execution tree are seeded in memory with repository builders. No backend DB/server, LLM provider, real delegation/WebSocket transport, persisted-history fetch or packaged Electron shell exercised. Retained evidence means reloaded current-format fixture through production view/projection/inspection, not disk/server persistence proof. These surfaces are unchanged by the sole production adapter delta. Existing historical configured-Team shape is regression context, not a new supported configuration feature. Other external navigation entrypoints are not claimed by the probe-only stable-key ancestor control.
No process/worker/distributed/external integration change. Full repository suite, build/typecheck, cross-platform packaging not run; no claims made. No material in-scope broader risk remains.

## Compatibility and persisted data
Approved transition Not Affected; no writer/schema/migration/reset. No legacy-only tests retained, no version-specific wrapper, dual path or compatibility fallback introduced. Shared source navigation and exact identities remain untouched. No invalid scope/reroute trigger found.

## Artifacts, warnings and cleanup
- browser/evidence.json authoritative final browser case details, eight exact projection requests, errors and cleanup; screenshots support semantic assertions.
- browser-pass-initial contains prior clean full pass. harness-attempt-1/2/3 preserve diagnostic runs, moved from original browser output directory; their embedded original absolute output paths reflect that earlier location. Ledger explains corrections.
- Only console error in final browser validation is the deliberately injected PEER_EXPECTED_PROJECTION_FAILURE; asserted retry clears it and commits correct task. No unexpected console/page errors. Existing Nuxt Browserslist warning and Vitest intentional disabled-send errors are nonfatal.
- Every attempt closed its owned browser/context, terminated its owned Nuxt process group and removed its installed fixture. Final cleanup in evidence.json confirmed all; no user app/process/data stopped or changed. No persistent data created. Generation helper scripts in /tmp removed after use.
- Task worktree retained for Delivery; no merge, push, release or worktree cleanup performed.

## Outcome and routing
Preliminary failure classification: N/A — no unresolved failure. Recommended recipient Delivery Engineer on configured direct low-risk rule. Delivery owns documentation sync, explicit user verification, integration/finalization and release decisions. No downstream delivery completion claimed.

Configured routing checked: `get_handoff_rules` selected the single matching Pass + direct Small/Low rule → `/delivery_engineer`. Other source-review/failure/upstream-gap rules do not apply. Cumulative artifacts and two durable additions accompany the handoff.
