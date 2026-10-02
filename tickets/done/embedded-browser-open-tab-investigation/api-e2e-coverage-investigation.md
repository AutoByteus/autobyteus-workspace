# API/E2E Coverage Investigation
## Meta / authority
Round 1; upstream IR-001 / SR-005 / AP-001. Prior API result N/A.
Canonical package: requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md, solution-handoff.md, implementation-handoff.md and implementation-revision-record.md in this ticket. Evidence inventory in solution-handoff.md and evidence/implementation/desktop-self-check.md read; historical diagnostic assertions are NOT fix validation.
Architecture/source reviews, their revision records and delivery re-entry: N/A — not applicable.
Small / Low, Direct Low-Risk. Successful output route subject to rules: Delivery. Test review: Not Required — direct low-risk route.
Canonical ledger: api-e2e-test-case-ledger.md; report: api-e2e-execution-coverage-report.md; revision record to be created at completed result.

## Approved behavior / scenarios / changed boundaries
- SCN-001 / BEH-001 / REQ-001 / AC-001: real local Daily Assistant/AGY successful own MCP open_tab emits canonical actual tab ID, automatically selects Browser and visibly attaches it.
- SCN-002–003 / BEH-002–003 / REQ-002 / AC-002: canonical object/string works; remote/unavailable shell and leases remain protected.
- SCN-004 / BEH-004 / REQ-003 / AC-003: generic/native/third-party/errors/images/background results and saved data preserved.
No new product scenario or unsupported/contrived scenario added. Repeated normal requests from Activity and saved-run reopen are approved verification journeys.
Changed production surface: backend adapter result contract; propagated API/WebSocket and persisted opaque result. Renderer, Electron IPC/lease/bounds are unchanged consumers but material end-to-end risk. External AGY integration is material. Authentication, workers/distributed ownership and deployment mechanisms unchanged.

## Project discovery / safe setup
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation, codex/embedded-browser-open-tab-investigation, source e67f6f4f3, artifacts 8c15bd4d4.
Read root TESTING.md (no closer testing guideline), server/web AGENTS.md, root README packaged and development/testing sections, server README Tests, web README Testing, package manifests, server vitest.config.ts and tests/setup/prisma-{env,global-setup,test-config}.ts, web vitest.config.ts, docs/isolated-app-instances.md, browser-automation SKILL.md at /Users/normy/autobyteus_org/autobyteus-skills/browser-automation/SKILL.md.
Node/pnpm/Vitest/Fastify/GraphQL/ws; Nuxt renderer; Electron desktop. Project commands: vitest run --no-watch; test:nuxt --run; test:electron; isolated-app start --from-worktree and stop exact instance ID. Server test setup resets ONLY this worktree tests/.tmp/autobyteus-server-test.db; run server suites serially, no shared production data. Fixture CLI enabled by RUN_AGY_FAILURE_E2E=1 and absolute ANTIGRAVITY_CLI_COMMAND. E2E server selects free ports, creates temporary data/workspace and deletes it.
Live CLI uses existing AGY authentication (no secret printed or vault copied). Packaged worktree build already exists, verify packaged converter identity before using it. Isolated desktop creates private data and own ports. Use reported control port with BROWSER_AUTOMATION_ATTACH_ONLY=1, health-check before DOM interaction. Fixture local HTTP server on free loopback port; owned process removed after test. Never target user's app.
No guideline conflict. No Compose or external database required for selected SQLite/isolated desktop surfaces.

## Persisted-data / legacy check
Implementation Legacy / Compatibility Removal and Persisted Data Transition sections reviewed: clean narrow removal, no dual reader/renderer fallback.
Directly Usable — No Migration. Existing nested and new canonical results are arbitrary opaque tool values. Preserve unchanged stored bytes and normal GraphQL history presentation; historical display must not reopen browser sessions. No reset, migration, schema gate or legacy-only fallback expected.

## Existing durable coverage validity
| Coverage | Decision | Rationale |
| --- | --- | --- |
| AGY converter unit suite and shared normalizer units | Still Valid | Canonical success variants, duplicate terminal, exact own/native/third-party discrimination, malformed/null/error/denial/image/background |
| raw-trace-to-historical-replay-events unit | Still Valid | Old nested/new canonical opaque read, no mutation |
| agy-mcp-tool-call-transport.e2e.test.ts + agy-failure-cli.mjs | Needs Update | Existing seven-tool matrix valid but missing open_tab through actual transport/history |
| Renderer browserToolExecutionSucceededHandler | Still Valid | Canonical object/string, unrelated/missing ID, remote/unavailable suppression |
| Electron browser-shell-controller/browser-tab-manager | Still Valid | Existing ownership and lifecycle |
| AGY failure/background and GraphQL history suites | Still Valid | Broader unchanged semantics and real API reader |
No stale coverage removals or replacements. Other live runtimes out of changed scope; their canonical consumer covered.

## Durable additions / execution plan
1. C-001 narrow converter/normalizer/history units (existing valid suite).
2. C-002 extend fixture/transport E2E with canonical own open_tab, native/third-party same-name exclusions, other browser unchanged, failures/denials. Assert exact result (not subset), identity, one terminal, WebSocket and terminated-run projection.
3. C-003 old nested result plus new canonical through normal saved GraphQL projection, retained bytes; fixture only in test-owned history. Broader history/AGY regression suites.
4. C-004 renderer guards/web boundary + Electron controller/manager suites.
5. C-005 independent real AGY desktop first open and repeat from Activity with test-owned local content; no manual focus/payload injection/store mutation. Capture canonical trace, read-only shell snapshot, selected tab DOM, native URL/content/positive viewport, screenshots.
6. C-006 saved live run reopen, preserve results/session count; clean owned resources.
Ledger required for multiple cases/live interruption risk. All planned initially; exact execution commands/results added below.

## Broader validation decision
Required — Project Desktop Validation. Repository doubles cannot prove AGY model/MCP result through packaged renderer/native visible attachment; AC-001 requires it. Browser-only dev path would bypass shell and is not sufficient. Expected final target >=95%, no category <90%, all critical AC direct.
Initial post-repository scores pending execution (not inferred from implementation self-checks).
Temporary live journey appropriate because authenticated model outputs are nondeterministic; durable adapter/transport/history suite provides repeatable regression.
Not tested/deferred: F-002 IPC rejection propagation/global recovery, other intermittent failures, broad viewports/other live runtimes. Outside approved correction; do not count as failing supported scenario.
Proceed: Yes; narrow durable updates required; no ambiguity/reroute before execution.

## Execution finding / coverage decision update
C-001 passed 78 tests; C-002 passed 14-call wire/history matrix and exact result assertions; old nested/new canonical read preserves stored bytes.
C-003 broader command: 9 passed, 5 failed in unchanged run-projection-toolcalls-graphql suite, all "Run package ... unavailable". Inspection: beforeEach removes memory directory, but process-global RootRunPackageReadinessIndex remains initialized from first case. Subsequent cases directly seed files without current admission (unlike real createAgentRun).
Validity update: assertions remain approved generic history behavior; fixture Needs Update to publish its complete test-owned current package with real admitCurrent before GraphQL query. No production changes, bypass, fallback or relaxed assertion. Add this third durable path narrowly; rerun full file and broader matrix. This is API/E2E-owned fixture maintenance, not an inferred implementation defect.

## Post-repository execution and confidence
Exact commands: evidence/api-e2e/commands.md (consolidated before handoff); logs c001.log (78 pass), c002.log (1 transport journey / 14 calls pass), c003.log (5 fixture failures), c003-rerun.log (14 pass after real admission fixture correction), c004-renderer.log (9 pass), c004-electron.log (22 pass). No tests skipped in selected suites.
| Category | Score | Evidence / uncertainty / next action |
| --- | --- | --- |
| Requirement/AC | 75% | AC-002/003 strong; critical visible AC-001 not independently live yet |
| Changed-boundary directness | 95% | Actual converter → WebSocket → history, fixture producer |
| Integration realism/mock gap | 75% | Real server; fake CLI and mocked consumer; live shell closes gap |
| Environment/config/identity/fixture | 90% | Isolated real server, exact source discrimination; packaged actual AGY still needed |
| Failure/edge/lifecycle/recovery | 95% | Existing error/denial/background/image suites + remote/lease preservation |
| User surface/browser/shell | 75% | Valid units only; fixed desktop mandatory |
| Durable regression | 95% | Exact producer/transport/history assertions including opaque retained shape |
Overall 85.71% arithmetic mean. No Pass; critical AC-001 outstanding. Broader validation Required confirmed.
Live plan: verified converter hashes equal worktree dist; start --from-worktree, ephemeral loopback HTTP page, existing AGY auth. Select Daily Assistant/antigravity_cli/gemini-3.8-flash-medium through UI. First and repeat open from Activity; inspect only read-only shell snapshot. Reopen conversation through normal navigation; compare native session count/results. Stop owned app and local page server.

## Final investigation disposition
All C-001–006 Pass. Final combined server 15/15; 124 unique targeted repository tests overall. Broader desktop completed, final 95% (all seven categories 95%), direct critical AC proof complete. Current truth: api-e2e-execution-coverage-report.md / API-REV-001. No production change or independent-review requirement added. Initial fixture failures resolved as documented; no unresolved reroute.
