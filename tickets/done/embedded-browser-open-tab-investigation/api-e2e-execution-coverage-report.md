# API/E2E Execution Coverage Report
## Latest authoritative result
**Pass — 95% final confidence. API-REV-001, round 1, 2026-10-02.**
Broader validation **Required and completed — Project Desktop Validation**. Every critical AC directly proven for approved scope; no final category below 90%. No unresolved in-scope failure/blocker.
Small / Low; Direct Low-Risk. Successful test-code review: **Not Required — direct low-risk route**. Successful output route Delivery, subject to current handoff rules. Finalization/push/release/user verification remain Delivery-owned.

## Execution round / cumulative authority
Trigger: Implementation Engineer implementation-handoff.md / IR-001, approved AP-001 / SR-005 (SR-001 behavior basis, evidence SR-002–004). Prior API result/confidence N/A; current round 1 / latest authoritative round 1.
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/solution-handoff.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/implementation-handoff.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/implementation-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/api-e2e-coverage-investigation.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/api-e2e-test-case-ledger.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/api-e2e-revision-record.md
Architecture review/report/revision and independent source review/report/revision: **N/A — not applicable**. Delivery revision / triggering rework: **N/A — not applicable**.
Supplement inventory: solution-handoff.md (absolute pre-fix evidence inventory), evidence/implementation/local-checks.md and desktop-self-check.md; new evidence/api-e2e/commands.md and desktop-validation.md. No behavior-defining Product supplement. Pre-fix probes deliberately assert the old defect and are not rerun as green checks.

## Investigation and ledger reconciliation
Investigation written before durable edits/execution: Yes. Ledger initialized before execution: Yes. Case attempts/checkpoints/results persisted during work, all reconciled here; no interrupted/running/unstarted case remains.
Plan followed with two documented refinements: stale GraphQL fixture admission corrected after observed failures; initial desktop open with collapsed tools panel counted only as setup, then TWO Activity-origin opens directly validated. No requirements/design/source changes or reroute needed.
| Case | Final | Boundary / AC | Evidence |
| --- | --- | --- | --- |
| C-001 | Pass | Canonical producer/normalizer and opaque reader; AC-001–003 | c001.log: 78 tests |
| C-002 | Pass | Real WebSocket/event identity/result exactness + persisted terminated projection; AC-001/003 | c002.log, agy-mcp-tool-call-transport.json; final-server-e2e.log |
| C-003 | Pass | Old nested/new canonical history, error/denial/native image/background and GraphQL current admission; AC-003 | c003 initial failures; c003-rerun 14 pass; final combined 15 pass |
| C-004 | Pass | Canonical renderer, remote/unavailable suppression, web boundary, shell lease/manager; AC-002 | c004-renderer 9 pass; c004-electron 22 pass |
| C-005 | Pass | Real AGY → MCP → native browser → converter/stream → UI/IPC/visible attachment; AC-001 | desktop-validation.md, trace/metadata, second/third before/after/native JSON, PNG, assertions |
| C-006 | Pass | Normal saved-run UI reopen/exact projection, no focus replay, owned cleanup; AC-003 | desktop-reopened.json/projection.json, desktop-assertions.json, cleanup receipts |
124 unique repository tests passed across selected 12 files (78 server units + 15 server E2E + 9 Nuxt/guard + 22 Electron). This is targeted coverage, not whole-repository test pass. Initial C-003 had 5 failing fixture cases, retained transparently.

## Coverage/failure validity and maintenance
The five initial failures were unchanged Codex history fixtures failing admission, not assertions about this AGY change. File beforeEach deletes the memory root while RootRunPackageReadinessIndex maintains process-local current admission. First test passed; later seeded run IDs were not admitted. The fixture now uses real admitCurrent before its GraphQL read, matching production publication and still validating structural packages (no mocks/bypass). All original assertions retained; 6/6 history file and final 15/15 combined suite pass.
This is bounded API/E2E-owned fixture maintenance, not an implementation defect or compatibility fallback. No unresolved preliminary failure classification. Initial evidence c003.log and resolution c003-rerun.log retained.

## Confidence scorecard
Arithmetic mean, applicable categories only. All seven apply.
| Category | Post-repository | Final | Evidence gained / remaining uncertainty |
| --- | --- | --- | --- |
| Requirement and AC proof | 75% | 95% | Two independent Activity-origin live opens + preserved guards/history; no broader reliability claim |
| Changed-boundary execution directness | 95% | 95% | Actual production adapter in WebSocket/history and matching packaged converter; actual provider result correlated |
| Cross-boundary realism/mock gap | 75% | 95% | Real model/MCP/renderer/IPC/native view closes fake-CLI and consumer mock gap |
| Environment/configuration/identity/fixture fidelity | 90% | 95% | Worktree package hash, isolated data/ports, real Daily Assistant + same model family, test-owned loopback page |
| Failure/edge/lifecycle/recovery | 95% | 95% | Error/denial/null/scope boundaries + stop/background/native image and shell leases; F-002 not approved scope |
| User surface/browser/desktop shell | 75% | 95% | Activity → Browser twice, exact returned sessions, native content/positive viewport, normal saved reopen |
| Durable regression quality/relevance | 95% | 95% | Exact result (not subset), one start/terminal, identity/order, same-name exclusions, old/new opaque results, current admission |
Overall **85.71% → 95%**. Every critical AC directly proven: Yes, scoped to approved valid-output local presentation and preserved behavior. Default clean target met: Yes. No material broader-validation risk remains in narrow correction.
Residual uncertainty is negligible for changed path, not zero system-wide: model/provider availability, every OS/viewport, unrelated focus-IPC failure/recovery, and historical intermittent failures are not fully characterized. Scores do not promise global browser reliability.

## Broader execution and desktop details
Project mode and safe setup followed TESTING.md and docs/isolated-app-instances.md, no dev-browser substitute. Production source e67f6f4f3, cumulative baseline 8c15bd4d4; generated existing packaged build version 1.4.92-beta.9. Packaged converter hash equals worktree dist. No source changes since build (only tests/artifacts).
Started own iso-60354-9ef4 from --from-worktree; readiness confirmed by launcher and browser health-check. Own backend 60355/control 60354. Loopback HTTP fixture 60426. All controls through documented browser launcher attach-only, observed tab IDs.
Daily Assistant/antigravity_cli/gemini-3.8-flash-medium selected in UI, real authenticated AGY CLI 1.2.15. No secret copied/printed; no production vault or app access.
Second returned 874f12 and third 2a801b, each requested from Activity. Actual trace result direct tab_id matched active shell; Browser aria-selected=true, Activity=false; native same URL/title/marker, 696×757. No manual focus, Browser click, result injection or store mutation. Three native sessions retained.
Saved Offline run reopened through New chat then sidebar; normal GraphQL reader preserved exact three results. Activity stayed selected and shell snapshot unchanged: history did not replay focus.
Web-equivalent renderer and shell-specific visible view both exercised. Current app never stopped/restarted/altered. Main-renderer screenshot cannot contain native WebContentsView pixels; separate native screenshot + DOM/viewport is the proof.
First /first open c4cffe was assigned while tools panel collapsed; no visibility proof claimed for it. Two subsequent Activity-origin opens were the counted cases. One observation script and one time-sensitive text selector were corrected, no behavior expectation relaxed.
Platform macOS arm64 26.5.2; Node 22.23.1, pnpm 10.28.2; renderer 1512×917 in counted observations; native 696×757. Browser engine bundled Electron; no cross-platform claim.
Exact commands and evidence reproduction: evidence/api-e2e/commands.md. Temporary assertion source: evidence/api-e2e/assert-desktop.cjs.

## Persisted data / compatibility / legacy
Approved decision **Directly Usable — No Migration**, followed. Old nested result planted only in a terminated test-owned run, after newly canonical result generated through actual runtime transport; ordinary GraphQL reader returns both exact values and leaves bytes unchanged. No version-specific dual reader, schema rewrite, global recovery or migration.
No invalid compatibility retention in requirements/design/implementation/tests. Existing generic wrappers are current behavior for unrelated tools. No session/cookie/history reset in production correction. Existing session retention and history read exercised; no live user's cookies/history touched. Cookie persistence across app upgrades not tested because no relevant lifecycle/storage change.

## Durable coverage changes
All paths relative to worktree:
| Path | Change | Why/result |
| --- | --- | --- |
| autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs | Updated | Seven added provider steps, own JSON/envelope canonicalization, native/third-party/list_tabs/error/null preservation |
| autobyteus-server-ts/tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts | Updated | 14-call exact WebSocket/history matrix; old nested/new canonical ordinary reader and unchanged bytes |
| autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts | Updated | Real current-package admission for disk-seeded fixtures after reset; existing assertions unchanged |
No tests removed, no production source changed, no web→server/core dependency introduced. Added/updated durable paths attached to handoff; proportional independent review Not Required — direct low-risk route.
Final combined execution after last import-order cleanup: 15 tests/5 files pass, final-server-e2e.log. git diff --check pass.
Implementation whole-server tsconfig TS6059 limitation remains documented upstream, not rerun/hidden here; no whole-project typecheck pass asserted.

## Artifacts / mocks / cleanup
Evidence/api-e2e contains original command logs, observed wire/history JSON, desktop command/result JSON, screenshots, build hash, owned local-page scaffold, assertion source/result and lifecycle receipts. All retained as evidence; temporary scaffold not a new production test runner.
Fake AGY CLI emulates provider steps only in deterministic server tests, no real browser creation there. Nuxt stores/IPC and Electron managers have existing doubles. Real desktop closes material mock gap.
Owned isolated app stopped gracefully, auto-created data removed, both ports freed (desktop-cleanup.json); instance absent from list. Owned page PID 40950 stopped and port 60426 proven free. Server E2E closes app/socket and removes owned temp data/workspaces in afterAll. Worktree test DB is project-owned ignored tests/.tmp state; generated SDK dist outputs inherited from build remain uncommitted and intentionally retained.
External CLI may retain test conversation/provider records; no broad deletion of authenticated CLI state attempted. No other processes/data cleaned.
Blocked/infeasible scenarios: None required. Deferred/out-of-scope: F-002 IPC propagation, global adoption/recovery, unknown historical intermittency, broad runtime/platform/viewport sweeps.
## Handoff
Persisted result Pass, 95%, Small/Low. Rule lookup and exact recipient recorded below after completion. No release/push or user-verification bypass.

Routing lookup: get_handoff_rules selected direct Pass + Small/Low + no durable review required → exact recipient **/delivery_engineer**. Other conditions do not apply. Complete cumulative artifacts and updated durable files attached; no duplicate notification.
