# API/E2E Coverage Investigation — `agent-package-auto-refresh`

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/requirements-doc.md` (Approved SR-005; editorial SR-007)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-spec.md` (SR-007)
- Supplemental Task Artifacts: `probes/` (evidence only); `implementation-evidence/apar-linux-monitor-probe.mjs`, `implementation-evidence/apar-linux-monitor-probe-output.txt`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/api-e2e-test-case-ledger.md`
- Current Investigation Round: 2
- Trigger: round 2: CRR-004 Pass (IR-003 `bd4c63796`, SR-008/DSN-004 resolving CR-004 = APE-001) from `/software_engineering_team/code_reviewer`; round 1: CRR-002 Pass
- Prior Investigation Reviewed: round 1 (API-REV-001, Fail — APE-001)
- Latest Authoritative Investigation: this file (round 2)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the changed durable test code)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

One server-side definition catalog (`src/definition-catalog/**`) is now the single inventory behind the three definition services and admission. A structural package monitor (chokidar on `agents/`, `agent-teams/`, `agent-orgs/` of every registered root) reports unit changes to a sync. The sync applies them after a 1000 ms quiet window (3000 ms cap), and any read applies pending changes first (REQ-018). Each node keeps a last-good copy plus an issue (DEC-001, DSN-003). Admission enumerates the catalog. Team/org IDs duplicated across packages are unavailable everywhere (DSN-002). Root status is `WATCHING` / `ROOT_MISSING` / `UNAVAILABLE`. Changes are published on `/ws/definition-catalog` (remote-access auth) with dependency-aware subjects. The web reloads loaded stores, re-reads on `connected`, shows issue badges and notices and a Settings watch-status row. GraphQL adds `definitionDiagnostics(subject)`, `catalogIssue`, `AgentPackage.autoRefresh` and `refreshAgentOrgDefinitionCatalog`. Must prove AC-001…AC-016 plus QR-001…QR-006. Critical ACs: AC-001, AC-003, AC-004, AC-008, AC-015, AC-016 (critical REQs 001/002/005/007/010/012/018).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001…SCN-012 (SCN-006 as a no-change boundary; SCN-012 primary).
- Real-use scenarios added from investigating the implemented behavior:
  - **RU-01 Imported through the UI/API, not an env var.** A package registered by `importAgentPackage(LOCAL_PATH)` at runtime (the real Settings path) is watched immediately (REQ-014 via the real GraphQL mutation, not a config stub).
  - **RU-02 A paired phone/remote browser on the feed.** A paired mobile credential (`mra_…`) receives catalog frames; a revoked one is rejected (QR-006, real trigger: Phone Access pairing).
  - **RU-03 Spawned copy prompt.** A delegated copy of an edited agent receives the current instructions in its runtime prompt (AC-015(b): observed in the materialized AGY agent prompt, not only in the GraphQL definition).
  - **RU-04 Desktop app with a second client.** The desktop window plus a browser on the same node (the remote-browser/mobile real use of AC-009/AC-013) both update.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none in the requirements. C-09 (duplicate identity across an unreadable and a readable root) was rejected by code review as unassigned behavior; not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 detection → settle → catalog for every reader | Added | REQ-001–004, 010, 018; DS-001…003 | Existing integration (in-process) + new server E2E through real GraphQL/MCP tools + desktop journey |
| BEH-002 Reload buttons notify other clients | Changed | REQ-017, AC-013 | New E2E: refresh mutations publish to a second socket; desktop/browser second client |
| BEH-003 web live reload + reconnect | Added | REQ-005/006, AC-009/010 | Web unit specs (existing) + desktop/browser journey incl. backend restart |
| BEH-004 last good + issue, nested included | Added | REQ-007–009, AC-004/005, DSN-003 | Integration (existing) + E2E GraphQL `catalogIssue`/`definitionDiagnostics` + rendered badge |
| BEH-005 run continuity | Preserved | REQ-012, AC-008 | New gated E2E with scripted AGY actor (active run, edit, delete, restore → not found) |
| BEH-006 GitHub Update explicit; result pushed | Changed | REQ-013, AC-009, DSN-001 | New E2E with controlled GitHub HTTP: Check → Update → second socket frame + list change + root re-armed |
| BEH-007 skills not monitored | Preserved (no-change boundary) | REQ-011, AC-007 | Integration (existing) + E2E: no frames for skill edits in a real server |
| BEH-008 diagnostics, missing/unreadable root, watch failure | Added | REQ-008, 015, 016, AC-011/012 | Integration/unit (existing) + E2E `autoRefresh` states through GraphQL + rendered Settings row |
| DSN-002 duplicate team across packages unavailable everywhere | Changed (consistency) | requirements DSN-002 | E2E: `list_available_agents` excludes it; `definitionDiagnostics` shows `DEFINITION_IDENTITY_DUPLICATED` |
| `definitionAdmissionDiagnostics` | Removed | design Removal Plan | Confirm no web consumer and schema no longer exposes it (schema check in E2E) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | catalog rules, sync, readers, monitor | 6 unit files (catalog, sync, readers, grammar, monitor, unreadable root) | — | — |
| API / transport / contract | Yes | `/ws/definition-catalog`, GraphQL fields/query/mutation | Integration uses an in-memory hub connection; one GraphQL unit test | Real websocket route, strict frames on the wire, real GraphQL resolvers over the studio server | Server E2E (real HTTP/WS) |
| Frontend component / state | Yes | feed, stores `reloadIfLoaded`, badge, notice, package row | web specs (feed, reloader, diagnostics store, badge, package row) | Real backend frames driving real stores | Desktop isolated instance |
| Browser integration / user journey | Yes | Agents/Teams/Orgs pages, `@` menu, Settings | Implementer's manual dev-stack check | Repeatable proof; `@` menu; reconnect; second client | Desktop instance + browser on same node |
| Authentication / session / permissions | Yes | remote-access auth on the new socket | None | QR-006 entirely | Server E2E (loopback, invalid, paired, revoked) |
| Desktop renderer / web-equivalent UI | Yes | renderer only | as above | as above | Desktop isolated instance |
| Desktop shell / Electron-specific integration | No (no main/preload change) | — | — | Embedded server startup with the monitor in the packaged app | Desktop isolated instance (start/restart) |
| Process / lifecycle | Yes | watcher start/stop, startup order, close order, restart | Integration (in-process) | Real server start/stop with watchers; packaged app restart | E2E server lifecycle; desktop restart |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | Yes (in-process) | settle/flush/queue | unit + integration | — | — |
| External integration | Yes | OS file notifications; GitHub Update path; runtimes (AGY, Codex) | macOS integration; Linux container probe | Real delegation path via MCP tools; GitHub Update; Codex launch | E2E (scripted AGY, controlled GitHub HTTP); desktop (real Codex) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh` (branch `codex/agent-package-auto-refresh` @ `3cc17135f`)
- Project type and runtime stack: pnpm monorepo; Node 22; Fastify + type-graphql server (`autobyteus-server-ts`); Nuxt 3 + Electron (`autobyteus-web`); Vitest.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/TESTING.md` (root; no closer `TESTING*.md` under `autobyteus-server-ts/` or `autobyteus-web/`).
- Conflicting, missing, or unclear project instructions: None found so far.
- Required environment variables or secrets available: scripted AGY fixture needs none; Codex CLI is logged in locally (used only for the desktop Codex-runtime launch); GitHub HTTP is controlled (no token).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Root testing guideline | Server unit/integration baseline + typecheck; gated scripted-AGY E2E pattern (`RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs`); `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS …` for machine-independent runs; isolated desktop instance for full product journeys (Rules 1–6); fix base failures (Rule 9) |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | Repo/package instructions | Respect DESIGN.md/TESTING.md |
| `docs/isolated-app-instances.md` | Desktop instance lifecycle | `pnpm --silent isolated-app start --build`, `stop <id>`, `restart <id>`; browser-automation via CDP control port |
| `autobyteus-server-ts/tests/setup/test-environment-isolation.ts` | Unit/integration env isolation | E2E keeps the inherited env → unset package-root vars in the suite |
| `tests/e2e/projects/project-change-feed.e2e.test.ts` | Precedent | Feed contract + remote-access rejection (4401 equal to sibling) |
| `tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts` | Precedent | Controlled GitHub HTTP via `vi.stubGlobal("fetch")` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server (E2E) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` in the suite | private temp data dir, port 0 | `listen` resolves | `fastify.close()`; temp dir removed |
| Scripted AGY CLI | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | `ANTIGRAVITY_CLI_COMMAND` | no model calls | `--version` | processes owned by runs; terminate |
| Isolated desktop instance | repo root | `pnpm --silent isolated-app start --build` | own ports and data root | `start` JSON result | `pnpm --silent isolated-app stop <id>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Local package roots | temp folders written by the test (as file tools do) | never the user's packages; user package copied to temp for the desktop journey | removed with the temp root |
| GitHub package | controlled `fetch` for `api.github.com` / `codeload.github.com` only | no network | managed install dir inside temp data dir |
| Paired phone credential | real REST pairing (`/rest/remote-access/*`) on the test server | test-owned settings | temp data dir |
| Codex runtime (desktop) | user's logged-in Codex CLI | uses Codex quota for a few turns | none |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/definition-catalog/definition-catalog.test.ts` | rule table, last good, issues, copies | REQ-007/008/010, DS-002 | Still Valid | read + pass | Keep |
| `tests/unit/definition-catalog/definition-catalog-sync.test.ts` | settle/flush/queue/expansion/trailing re-check | REQ-003/004/018, AR-001 | Still Valid | read + pass | Keep |
| `tests/unit/definition-catalog/definition-source-readers.test.ts` | enumeration, precedence, duplicates, nested | DSN-002/003 | Still Valid | pass | Keep |
| `tests/unit/definition-catalog/definition-structure-paths.test.ts` | allow-list grammar | REQ-011, QR-002 | Still Valid | pass | Keep |
| `tests/unit/definition-catalog/package-definition-monitor.test.ts` | root state machine, re-arm, UNAVAILABLE | REQ-014–016, AC-011/012 | Still Valid | pass | Keep |
| `tests/unit/definition-catalog/unreadable-package-root.test.ts` | CR-001 isolation | REQ-015, BEH-008 | Still Valid | pass | Keep |
| `tests/integration/definition-catalog/package-auto-refresh.integration.test.ts` | 14 journey cases in-process (real fs + watcher, in-memory hub) | AC-001…007, 011, 012, 015, 016, AR-001, DSN-003, CR-001 | Still Valid | read + pass | Keep; complement at the wire |
| `tests/unit/api/graphql/types/definition-diagnostics.test.ts` | resolver projection | AR-003 | Still Valid | read | Keep |
| `tests/unit/api/graphql/types/definition-catalog-refresh.test.ts` | refresh mutations call `refreshCache` | REQ-017 | Still Valid | read | Keep |
| web `services/definitionCatalog/__tests__/definitionCatalogChangeFeed.spec.ts` | subjects → store reloads; `connected` → all | REQ-005/006 | Still Valid | — | Keep |
| web `utils/definitionCatalog/__tests__/loadedListReloader.spec.ts`, `stores/__tests__/definitionDiagnosticsStore.spec.ts` | in-flight + follow-up | CR-002 | Still Valid | — | Keep |
| web `components/definitions/__tests__/DefinitionCatalogIssueBadge.spec.ts`, `settings/__tests__/AgentPackagesManager.spec.ts` | badge and row rendering | REQ-009, REQ-015/016 | Still Valid | — | Keep |
| `tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` (3 failing on base) | GitHub package import/update/rollback with controlled GitHub | REQ-013, preserved Update/rollback semantics | Needs Update (revised during execution): the service's `githubClient` (c6c4afbf4) was not controlled, so live GitHub was reached | `reg-sibling-e2e.log` | Fixed as baseline commit `6b3a10822`; 8/8 pass |
| `tests/e2e/agent-team-definitions/*` (5 failing on base) | team definitions GraphQL | — | Out Of Scope (pre-existing): uses `refType`/`buildTeamLocalTeamDefinitionId`, removed by 37d05c7f7; needs a flat-model rewrite | `reg-sibling-e2e.log`; base source | Reported to owner |
| `tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` (2 failing on base) | private skills runtime materialization | — | Out Of Scope (pre-existing): calls `bootstrapForCreate` without its guard (028cca231) and the now-private `createBackend` without its ownership hooks (54eaac53a) | `reg-sibling-e2e.log`; base source | Reported to owner |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DCF-E2E-001 | Feed contract + remote-access auth: loopback `connected`, no replay, broadcast, invalid `mra_` → 4401 equal to sibling socket, paired credential accepted and receives frames, revoked → 4403 | QR-006, REQ-005 | `autobyteus-server-ts/tests/e2e/agent-definitions/definition-catalog-live-refresh.e2e.test.ts` (ungated) | No coverage of the real route or auth exists |
| DCF-E2E-002 | Imported local package (real `importAgentPackage`) → `autoRefresh` WATCHING; files written → GraphQL lists + frames ≤ 5 s; broken edit → `catalogIssue` + `definitionDiagnostics(AGENT)` `usingLastGood`; fix clears; new invalid Team → `definitionDiagnostics(AGENT_TEAM)`; delete → gone; skill edits → no frames | AC-001…005, AC-007, REQ-009, REQ-014 | same file (ungated) | Proves resolvers + wire contract over the real studio server, not the in-memory hub |
| DCF-E2E-003 | Root renamed away → `ROOT_MISSING` + `agent_package` frame + definitions kept; restore → WATCHING; package removed → released and no frames | AC-011, AC-012, REQ-015 | same file (ungated) | Real server lifecycle via the GraphQL package surface |
| DCF-E2E-004 | Manual Reload mutations (agents, teams, orgs, package Reload) notify another client | AC-013, REQ-017 | same file (ungated) | Cross-client publication at the wire |
| DCF-E2E-005 | GitHub package Check → UPDATE_AVAILABLE (no download) → Update → second socket gets frames, list reflects new revision, `autoRefresh` WATCHING after the swap | AC-009, REQ-013, DSN-001, BEH-006 | same file (ungated; controlled GitHub HTTP) | Update path never exercised at API level by this change |
| DCF-E2E-006 | DSN-002: a Team present in two packages is unavailable everywhere with `DEFINITION_IDENTITY_DUPLICATED` | DSN-002, REQ-002 | same file (ungated) | Consistency fix visible to delivery docs |
| DCF-E2E-007 | SCN-012 through the real tools: Manager (scripted AGY) `list_available_agents` and `delegate_task` immediately after writes (AC-016), new agent/Team found and spawned, edited Team spawns with current members, edited agent copy receives current instructions (materialized prompt), deleted agent not listed and refused | AC-015, AC-016, REQ-002, REQ-018 | same file (gated `RUN_AGY_FAILURE_E2E`) | Integration test stops before the real MCP tool/delegation and runtime launch |
| DCF-E2E-008 | AC-008 run continuity: active run keeps working after edit and delete; a new run uses the edit; restore after stop → "not found" | AC-008, REQ-012, DEC-003 | same file (gated) | No coverage of run continuity |
| FIX-001 | Scripted AGY route `READ_AGENT_PROMPT` (reports the run's materialized agent prompt) | supports DCF-E2E-007/008 | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Read-only additive route; coexists with existing routes |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| BASE-FIX-001 | `tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Give `AgentPackageService` a `GitHubRepositoryClient` over the same controlled upstream as the installer | REQ-013; preserved package Update/rollback semantics (requirements Preserved Behavior Boundary) | TESTING.md Rule 9 baseline fix, own commit `6b3a10822` |

### Round 2 durable coverage changes (SR-008 / DSN-004)

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| DCF-E2E-002/006/007 | `definition-catalog-live-refresh.e2e.test.ts` | Teams and Orgs queried with `catalogIssues { subject definitionId name code reason definitionPath packageRoot usingLastGood }` (SR-008 replaced root-only `catalogIssue`); DCF-E2E-002 asserts the nested team-local issue on the owning Team and its clearing | SR-008, DSN-004, REQ-009 | Needs Update (stale after the approved contract change, CRR-004) |
| DCF-E2E-009 (new) | same file | Org-owned agent, org-owned Team and its local agent listed on the Org in path order; last good kept; cleared | REQ-007, REQ-009, DSN-003, DSN-004; design § SR-008 Verification Additions | Add Durable Coverage |
| DCF-E2E-007 | same file | The AC-016 in-window lookup asserts the first-written agent; the Team must be listed by the tool within 5 s (AC-015) | REQ-018 ("already detected"), QR-003 | A run-1 miss traced to a rare slow folder detection under load (isolated: Team 5–23 ms over 40 trials; 11/11 reruns pass) |

Committed as `33d290187`.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/definition-catalog tests/integration/definition-catalog --no-watch` | worktree root | catalog unit + journey integration | Pass (7 files, 86 tests) | console |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | worktree root | production compile unit | Pass | console |
| 3 | `pnpm -C autobyteus-server-ts test:unit` | worktree root | server unit baseline | Pass (673 files, 4 skipped) | `api-e2e-evidence/server-unit.log` |
| 4 | `pnpm -C autobyteus-server-ts test:integration:prepare && … test:integration` | worktree root | server integration baseline | Pass (72 files; only the 2 documented `agent-status-websocket` cases fail) | `api-e2e-evidence/server-integration.log` |
| 5 | `pnpm -C autobyteus-web test:nuxt --run` | worktree root | web unit/component | Pass (599 files / 4149 tests) | `api-e2e-evidence/web-nuxt.log` |
| 6 | new E2E (ungated cases) | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` | DCF-E2E-001…006 | Pass (after two test-defect fixes) | `api-e2e-evidence/dcf-e2e-ungated-run1.log`, final runs |
| 7 | new E2E (gated cases) | `+ RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | DCF-E2E-007/008 | Pass 8/8 ×3 | `api-e2e-evidence/dcf-e2e-gated-final-{1,2,3}.log` |
| 8 | sibling E2E (`tests/e2e/agent-definitions`, `agent-team-definitions`, `skills/skill-name-catalog-graphql`) + AGY fixture coexistence (`agy-failure-cli-routing`, `agy-native-tool-arguments-transport`, `ad-hoc-task-delegation`) | gated where applicable | regression | Pass (no regression; 1 base failure fixed, 2 reported) | `reg-*.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`: many independent cases, a long desktop journey with real-model turns, and interruption risk.
- Canonical ledger path: `api-e2e-test-case-ledger.md` in the ticket folder.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | AC-001…009, 011…013, 015, 016, DSN-002/003, QR-006 proven at the wire; AC-014 by probe | the user surface for badges, `@` and the desktop journey with real models | desktop journey |
| Changed-boundary execution directness | 92% | real websocket/auth, GraphQL resolvers, MCP tools, run launches | renderer reaction to real frames | desktop |
| Cross-boundary integration realism and mock gap | 88% | real Studio server; scripted AGY actor; controlled GitHub | real model-driven creator writes; Codex launch | desktop with Codex |
| Environment, configuration, identity, and fixture fidelity | 90% | real pairing credential; temp packages; copies of the user's packages for MEAS | packaged app, embedded server | desktop |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | broken/fix, missing root, removal, Update/rollback, run continuity | server restart / reconnect | desktop restart |
| User-surface, browser, and desktop-shell confidence | 70% | web specs only | live lists, badges, `@`, Settings row | desktop |
| Durable regression coverage quality and relevance | 88% | new wire E2E, stable ×3 | — | — |

- Overall post-repository confidence: 87%
- Calculation method: simple average, each category reported separately
- Every critical acceptance criterion directly proven: `No` (the user-surface parts were pending the desktop run)
- Any applicable category below `90%`: `Yes` — User-surface (70%), Requirement proof (88%), Integration realism (88%), Durable regression (88%)
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: renderer/desktop behavior; real-model journey

### Round 2 Post-Repository Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | DCF-E2E-001…009 ×3 including nested Team/Org unit issues at the API; baselines green | rendered nested badges (APE-001) not yet seen live | desktop DESK-002 / DESK-006 |
| Changed-boundary execution directness | 94% | real GraphQL `catalogIssues` resolvers | renderer cards | desktop |
| Cross-boundary integration realism and mock gap | 93% | as round 1 | — | — |
| Environment, configuration, identity, and fixture fidelity | 94% | as round 1 | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | org-owned break/fix added | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | component specs only for the new badge list | live Team/Org cards | desktop |
| Durable regression coverage quality and relevance | 94% | E2E covers both nested kinds | — | — |

- Overall round-2 post-repository confidence: 91%; User-surface below 90% → broader validation `Required` (desktop rechecks of APE-001 and the org-owned case).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (planned)
- Selected execution mode: `Project Desktop Validation` (isolated desktop instance of a worktree build) with a second browser client on the same node.
- Specific confidence gap: SCN-012 primary journey with the real Project Task Manager and Agent Package Creator; live UI updates (Agents/Teams pages, `@` menu, badges, Settings row); AC-009/AC-013 second client; AC-010 reconnect after a real backend restart; Codex-runtime launch of a new/edited agent (AC-001, AC-015(b)); AC-014 idle CPU and watch counts.
- Why the selected mode can materially improve confidence: it is the only surface that exercises the packaged app's embedded server, real renderer stores against real frames, real model-driven file tools and real Codex launch.
- Expected confidence after the selected validation: ≥ 95%.
- Browser-specific decision: a second browser client against the isolated instance's backend is the real "remote browser" use; renderer behavior is otherwise proven in the desktop window.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron + Nuxt renderer with embedded server.
- Testing guideline used: `TESTING.md` (Choosing the path, Rules 1–6), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: lists, badges, notices, Settings row, `@` menu, reconnect.
- Shell-specific or lifecycle behavior: embedded server startup with the monitor; restart.
- Chosen validation approach: isolated instance from a worktree build (`--build`), owned data root, the user's package copied to a temp folder and imported through Settings.
- Effect on any already-running desktop application: None (own ports/data; never the user's app).

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-AC014 | watcher count / idle CPU measurement on copies of the user's packages (macOS `lsof`/`ps`; Linux probe output from implementation) | AC-014, QR-001/002 | Machine- and configuration-specific measurement |
| TMP-DESKTOP | isolated instance journey driven via CDP | SCN-012, AC-001/003/004/009/010/013, AC-015 | Needs a real model and a packaged build |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| GitHub Update against real GitHub | no public test repository; controlled HTTP used in E2E | Low (installer/transport unchanged) | none |
| Two physical windows | the second client was a GraphQL client; frame broadcast is proven at the wire | Low | none |
| Unreadable root on Linux | Vitest is macOS-built here; Linux container probe covers the rename transitions | Low | none |
| Org-owned nested issue visibility | round 1: same code path as APE-001 (by code) | — | round 2: executed live (DESK-006) and durably (DCF-E2E-009), Pass |
| Round 2: real-model SCN-012 journey, reconnect, Settings row, second client, idle CPU | not rerun: IR-003 changed only Team/Org issue projection, cards, badge and the stores' issue mapping; live lists, badges and delegation re-exercised (DESK-001/002/006/007, DCF-E2E-001…009) | Low | none |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| APE-001: a nested (team-local / org-owned) definition's last-good issue is visible nowhere in the web UI (REQ-009 + DSN-003) | Confirmed `Design Impact` (CR-004) → SR-008/DSN-004 → IR-003 | round 1 desktop DESK-002 | **Resolved in round 2** (DESK-002, DESK-006, DCF-E2E-002/009) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`. One new E2E file and one additive fixture route (`a28465175`); one baseline test fix (`6b3a10822`).
- Post-repository confidence: 87%
- Broader validation decision: `Required`, executed (desktop isolated instance); final 90%, result `Fail` (APE-001)
- Reroute Required Before Validation Execution: `No`. Reroute after execution: `Yes` (APE-001).
- Notes: round 2 is `Pass` at 95% (see `api-e2e-execution-coverage-report.md`).
