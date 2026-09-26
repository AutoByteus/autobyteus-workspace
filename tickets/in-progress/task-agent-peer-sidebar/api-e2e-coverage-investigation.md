# API/E2E Coverage Investigation
## Round and authority
Round 1, initial implementation IR-001 at 90d71e7f3; prior API result/confidence N/A. Current revision pending completion (API-REV-001). Canonical package in this directory: approved requirements-doc.md (SR-001 approval captured SR-002), investigation-notes.md, design-spec.md, solution-revision-record.md, solution-handoff.md, implementation-handoff.md, implementation-revision-record.md. Read complete package; screenshot is current-state evidence only, no normative Product supplement. Architecture/source review and revision records, delivery/rework: N/A — not applicable.
Task size Small; architectural risk Low; Direct Low-Risk → Delivery on Pass. Test-code review: Not Required — direct low-risk route.

## Behavior and changed boundaries
BEH-001 / AC-001/004: Changed history-only task-Agent peer topology, no phantom disclosure; shared source hierarchy preserved.
BEH-002 / AC-002/005: Preserved exact run selection, task identity/style/status, keyboard, loading/error/retry.
BEH-003 / AC-003/004: Preserved multiple same-address identities, source-owned availability and retained inspection.
Frontend state, browser journey and web-equivalent desktop renderer: affected. API transport is an unchanged dependency of inspection, not changed implementation. Backend/domain, authentication, shell/IPC, process lifecycle, persistence, workers/distributed/external integrations: no changed boundary. No data transition (Not Affected, design and handoff agree); no migration/reset/compatibility path needed or observed.

## Execution discovery
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar. Nuxt 3/Vue/Pinia; Electron wraps same renderer.
- autobyteus-web/AGENTS.md: explicit git paths only; pnpm test:nuxt with --run.
- autobyteus-web/README.md Development/Testing/Environment: browser pnpm dev; external server endpoints configurable; avoid product storage for tests.
- autobyteus-web/ARCHITECTURE.md Testing Strategy: colocated Vitest; old Python backend overview is not current server authority.
- autobyteus-web/package.json, vitest.config.ts: Nuxt happy-dom tests; existing playwright-core browser probes. Dependencies and .nuxt already prepared by implementation.
- nuxt.config.ts, .env.example: BACKEND_NODE_BASE_URL override; no secrets required.
- tests/e2e/task-agent-monitor-visibility-probe.mjs + fixture: safe ephemeral loopback Nuxt process, temporary page install, isolated headless Chrome, deterministic GraphQL interception, finally cleanup. Existing probe targets TeamMembersPanel, not changed sidebar.
- test-support/currentTeamTestFixtures.ts: schema-v2 current Team execution fixture and exact run contexts. Use existing builders, no shared user data.
Browser setup: new scoped durable sidebar fixture/probe using same documented Nuxt runtime pattern. Ephemeral port; GraphQL responses emulated at browser transport; no live LLM/backend or user account required. Readiness via fixture HTTP + mounted control. Stop only owned child process group, remove installed route, close owned browser. Evidence retained in ticket/evidence/api-e2e.

## Coverage inventory and validity
All paths below relative autobyteus-web.
| Coverage | Decision | Basis/action |
| --- | --- | --- |
| stores/__tests__/runHistoryTeamExecutionRows.spec.ts | Still Valid | Current peer order/depth/immutability; no-context, multiple/settled/task-Team scenarios reflect approved behavior |
| stores/__tests__/runHistoryNavigationProjection.spec.ts | Still Valid | Projected peer ancestry and exact indexes; reuse |
| components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts | Still Valid | Updated peer/aria/events/outer collapse assertions; reuse |
| components/workspace/history/__tests__/WorkspaceTransientExecutionRow.task-monitor.spec.ts | Still Valid | Peer loading/error/retry; reuse |
| components/workspace/collaboration/__tests__/RetainedTeamTaskNavigation.spec.ts | Still Valid | Retained inspection lifecycle unchanged; reuse |
| composables/__tests__/useWorkspaceHistory{SelectionActions,TreeState}.spec.ts | Still Valid | Intent arbitration, ancestry and collapse policy; execute |
| stores/__tests__/runHistory{SelectionActions,TeamMemberInspectionActions}.spec.ts | Still Valid | Exact selection/error ownership; execute |
| services/runOpen/__tests__/teamMemberInspectionCoordinator.spec.ts; services/runHydration/__tests__/teamMemberProjectionHydrationService.spec.ts | Still Valid | Actual inspection/hydration owner contracts; execute |
| tests/e2e/task-agent-monitor-visibility-probe.mjs | Still Valid | Different TeamMembersPanel scope; do not replace or claim as sidebar proof |
| implementation ticket preview | Temporary evidence only | Callback capture insufficient for actual conversation selection |
No obsolete tests to remove. No validity ambiguity or reroute trigger.

## Coverage decisions before edits
Add Durable Coverage: tests/e2e/task-agent-peer-sidebar-probe.mjs and fixtures/task-agent-peer-sidebar.page.vue. Reuse production history section, history projection/store, selection/tree composables, inspection/Apollo hydration and TeamWorkspaceView. Assert browser DOM and exact outgoing GraphQL IDs with deterministic delayed/failing responses. Cover peer discoverability; two same-address tasks; keyboard/mouse conversations; loading/error/retry; outer collapse/reopen; retained reload; no-task; real task-Team containment and projected ancestry. This belongs in existing repository browser probe convention, not a ticket-only preview.
No production changes planned. No removal/update of old E2E necessary.

## Execution plan / ledger
Canonical api-e2e-test-case-ledger.md initialized before execution. Cases:
- REPO-001 narrow five implementation suites (AC-001–005), then
- REPO-002 surrounding selection/tree/inspection/hydration suites (AC-002/004/005), then
- PEER-001 browser live peers/multiple exact conversations and failure/retry (AC-001/002/003/005),
- PEER-002 task-Team containment, ancestry and outer collapse (AC-001/004),
- PEER-003 retained reload and no-task (AC-003/004).
Exact commands/results and scorecard appended after repository execution.

## Confidence / broader decision
Post-repository scores pending execution. Broader validation Required: happy-dom/component mocks cannot prove rendered hierarchy plus actual selection-to-Apollo-to-conversation continuity. Browser mode directly exercises changed renderer; transport is intentionally emulated because backend behavior unchanged. No Electron-shell-specific risk, desktop app execution unnecessary and existing app untouched. Full backend/LLM generation, packaged shell, cross-platform packaging, full repository suite: out of scope, not claimed. Target clean confidence >=95% after direct browser evidence; no critical criterion may remain unproven.
Proceed Yes; durable tests Add; no reroute before execution.

## Repository results and confidence gate
REPO-001 command (cwd worktree): `pnpm --dir autobyteus-web test:nuxt stores/__tests__/runHistoryTeamExecutionRows.spec.ts stores/__tests__/runHistoryNavigationProjection.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts components/workspace/history/__tests__/WorkspaceTransientExecutionRow.task-monitor.spec.ts components/workspace/collaboration/__tests__/RetainedTeamTaskNavigation.spec.ts --run` — Pass 35/35.
REPO-002 command: `pnpm --dir autobyteus-web test:nuxt composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts composables/__tests__/useWorkspaceHistoryTreeState.spec.ts stores/__tests__/runHistorySelectionActions.spec.ts stores/__tests__/runHistoryTeamMemberInspectionActions.spec.ts services/runOpen/__tests__/teamMemberInspectionCoordinator.spec.ts services/runHydration/__tests__/teamMemberProjectionHydrationService.spec.ts --run` — Pass 28/28.
Logs: evidence/api-e2e/repo-narrow.log and repo-integration.log. Existing intentional disabled-send negative errors, KaTeX and Browserslist warnings are nonfatal.

| Mandatory category | Post-repository | Evidence / gap / next proof |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Pure hierarchy and component events proven; joined rendered conversation journey missing |
| Changed-boundary execution directness | 95% | Actual adapter/index exercised, browser rendering remains |
| Cross-boundary integration realism and mock gap | 75% | Happy-dom and coordinator mocks; need browser Apollo round trip/hydration |
| Environment, configuration, identity, fixture fidelity | 90% | Current schema exact-ID builders; browser runtime not yet executed |
| Failure, edge-case, lifecycle, recovery | 90% | Retained and errors unit-tested; need browser retry plus container/collapse |
| User-surface/browser/desktop-shell | 75% | No independent browser proof yet; shell genuinely unaffected |
| Durable coverage quality/relevance | 95% | Relevant current assertions; new joined browser regression still to execute |
Overall 87.14% (610/7); critical criteria not all directly proven end-to-end. Two categories below 90; clean gate not met. Broader validation remains Required, Browser; expected >=95% if scoped journeys pass. No blocker.

## Final investigation update — API-REV-001
Durable additions completed at the two planned test paths; no existing durable tests changed/removed and no production code changed in API/E2E. Three development setup defects corrected locally: helper export name, missing workspace catalog seed, and probe-only ancestor reveal using catalog ID instead of stable presentation key. Diagnostics preserved in evidence/api-e2e/harness-attempt-{1,2,3}; no implementation defect inferred from these. First full clean browser pass preserved in browser-pass-initial; final clean repeat with explicit live/retained status assertions in browser. Both complete browser runs pass PEER-001/002/003.
Broader Required → Executed, Browser. Final confidence 95% (scorecard in execution report). All scoped critical ACs directly proven by combined repository/browser evidence. No unresolved failure or blocker. APIs/backend storage are emulated, not live backend proof; no source/API change makes that residual a blocker for this Small/Low renderer-only package. Desktop shell not applicable. Task-Team fixture protects existing historical configured-Team shape only; no new nested-Team product support asserted.
The browser probe invokes the actual tree-state ancestor expansion using its stable presentation key; it does not claim validation of every unrelated external navigation entrypoint. Root peer tasks have no Agent ancestors, directly asserted in real history index.
