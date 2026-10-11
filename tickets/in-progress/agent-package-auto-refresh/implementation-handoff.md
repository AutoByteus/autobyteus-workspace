# Implementation Handoff — `agent-package-auto-refresh`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected (Large / High). ARCH-REV-002 **Pass** with implementation notes N-1 (mandatory) … N-4. Route after implementation: source review (Large/High) — recipient from `get_handoff_rules`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/requirements-doc.md` (Approved SR-005; editorial SR-007)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-spec.md` (SR-007)
- Supplemental task artifacts: probes in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/probes/` (evidence only); implementation evidence in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-evidence/`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md` (ARCH-REV-002 Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-005` (approval), `SR-007` (design)
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Branch / commits: `codex/agent-package-auto-refresh`, fast-forwarded to `origin/personal@359d2c0ef` before any change (no source changes existed; the 52 upstream commits did not touch the definition subsystems), then:
  - `9777af682` feat(server): definition catalog with package monitor and change feed
  - `0cd763fd0` fix(server): drop the removed fresh definition read from the bootstrap smoke and live harness
  - `f7fcf9055` feat(web): live definition catalog feed, issue badges and package watch status

What exists now:

- **Server `src/definition-catalog/`** — `domain/` (types, node-file helpers, registered package roots), `services/definition-catalog.ts` (the inventory and the per-node last-good rule; never does I/O; returns deep copies that keep class prototypes), `services/definition-catalog-sync.ts` (sole writer: initial population, pending set, 1000 ms quiet / 3000 ms cap settle window, flush-on-read, serialized queue, `reloadAll` (coalesced), `reconcileNow`, dependency-aware subject expansion, publication, registration listener, trailing re-check — see Deviations), `services/definition-catalog-runtime.ts` (catalog + sync + three readers per process), `providers/` (agent / team-unit / org-unit readers, duplicate and presence rules), `monitor/` (path grammar allow-list; `PackageDefinitionMonitor` with `WATCHING` / `ROOT_MISSING` / `UNAVAILABLE`, root dev+ino identity, parent-folder presence watch, ancestor watch while missing), `changes/` (zod frame contract + hub).
- **Node reads** — classified per-definition reads live with their subjects: `agent-definition/providers/agent-definition-node-reader.ts`, `agent-team-definition/providers/agent-team-definition-node-reader.ts`, `agent-org-definition/providers/agent-org-definition-node-reader.ts`. The file providers reuse their builders for write results, application-owned reads and startup migrations.
- **Services** — the three definition services read the catalog behind `sync.settle()`; application-owned IDs (and team-local agents of application-owned teams) stay file-provider reads; writes go through the file providers and then `reconcileNow` on the owning unit (`catalog.unitOf`, N-3). Issue accessors (`listDefinitionIssues`, `getDefinitionIssue`) and admission entry lists (`listAdmissionEntries`) added. `refreshCache()` = `sync.reloadAll()` on all three services (the Orgs service gained it).
- **Admission** — enumerates catalog Team units, **org-owned Team nodes of Org units (N-1)**, Org units, and application-owned Teams from the narrowed `DefinitionSourceRegistry`; validation (flat team, org resolver with preliminary Team results, handoff compiler) is unchanged. Duplicate identities arrive as reader issues (`DEFINITION_IDENTITY_DUPLICATED`).
- **Composition** — `createBundleBackedDefinitionServices` builds one runtime; `createHostDefinitionServices` exposes `definitionCatalogSync` and closes it; `compositions/definition-catalog-feed-composition.ts` (studio only) creates the hub and monitor, wires publish and registration, binds the monitor process instance and arms `syncRoots` before the startup admission scan; close order monitor → hub → definitions. `/ws/definition-catalog` registered with remote-access auth.
- **GraphQL** — `definitionDiagnostics(subject: DefinitionSubject!)` replaces `definitionAdmissionDiagnostics`; `catalogIssue` on `AgentDefinition`, `AgentTeamDefinition`, `AgentOrgDefinition`; `AgentPackage.autoRefresh { state message }`; `refreshAgentOrgDefinitionCatalog` mutation; the Teams Reload mutation now does one reconcile.
- **Packages** — `AgentPackageService` uses `reloadDefinitionCatalog` (one full reconcile; it re-syncs root watching and publishes) and reads root status from the process monitor. `AppConfig.getRegisteredAgentPackageRoots()` keeps roots whose folder is missing; the root settings store lists them so Settings can report them.
- **Built-in bootstrap (AR-006)** — write every built-in agent's files → one `refreshCache()` → resolve each → seed setting defaults.
- **Web** — `services/nodeChangeFeed/nodeChangeFeed.ts` (shared socket lifecycle; `ProjectChangeFeed` now extends it with an unchanged public API); `services/definitionCatalog/definitionCatalogChangeFeed.ts` + `composables/definitionCatalog/useDefinitionCatalogChangeFeed.ts` retained from `app.vue` while the app is ready; `reloadIfLoaded()` on the agent, team, org and package stores via `utils/definitionCatalog/loadedListReloader.ts`; `stores/definitionDiagnosticsStore.ts`; `components/definitions/DefinitionCatalogIssueBadge.vue` and `DefinitionDiagnosticsNotice.vue` on the Agents/Teams/Orgs cards and lists; the Settings package row shows the watch state; the Orgs Reload calls the new refresh mutation; en/zh-CN strings; regenerated `generated/graphql.ts`.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation is exactly the designed surface — a new server subsystem, a new websocket contract and GraphQL fields, concurrency (settle/flush/queue vs. in-app writes), watcher lifecycle, and every definition reader plus admission rewired. No escalation trigger fired: no reader needed to bypass the service boundary, nothing is persisted, the Linux watch count (603) is inside the expected 400–700, run history and execution trees are untouched, admission policy is unchanged beyond DSN-002, and application-owned definitions are not monitored.
- Selected route: `Code Review` (Large/High) — exact recipient from `get_handoff_rules`.
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (two implementation-level refinements are recorded under Known Risks / Deviations; neither changes the design's ownership, contracts or approved behavior).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | External add/change/remove detected, settled and applied per unit; every reader (admission included) reads the catalog; a read applies pending changes first (REQ-018) | `monitor/package-definition-monitor.ts` → `classifyDefinitionUnit` → `sync.noteUnitChange` → settle/`settle()` → readers → `catalog.apply`; services and admission read through `settle()` | Implemented. Integration `package-auto-refresh.integration.test.ts` AC-001/002/003/006/015/016 pass (new agent/team listed by the `list_available_agents` policy and delegable in < 1 s; AC-016 read inside the window sees the change before any publication). |
| BEH-002 | Reload buttons and package Reload/Update do a full reconcile and notify other clients | GraphQL refresh mutations → `refreshCache()` → `sync.reloadAll()` → publish all four subjects; `AgentPackageService.refreshCatalogCaches` → `reloadDefinitionCatalog` | Implemented; Orgs page Reload now calls `refreshAgentOrgDefinitionCatalog`. |
| BEH-003 | Connected web clients reload affected lists; reconnect re-reads | Hub broadcast → `/ws/definition-catalog` → `DefinitionCatalogChangeFeed` → `reloadDefinitionCatalogSubjects` → stores `reloadIfLoaded()`; `connected` → all subjects | Implemented; verified live in the browser against the real backend (Agents, Teams, Settings) — see Frontend check. |
| BEH-004 | Broken edit keeps last good + issue at every level (nested included); first-seen invalid → issue only | `catalog.applyNode` rule table; readers classify `valid` / `invalid {code, reason, file}` / `absent`; Org units correlate owned folders through last-good members when the Org file breaks | Implemented; unit + integration (AC-004, DSN-003) pass; badge rendered live. |
| BEH-005 | Runs read current definitions at create/restore; active runs untouched | Backend factories / org run service / team topology read `getAgentDefinitionById` / `getDefinitionById` (catalog) | Fresh path removed; no run-state code changed. AC-008 run-continuity journey left to API/E2E. |
| BEH-006 | GitHub Update stays explicit; its result reaches other clients; the replaced root is re-armed | Update → `reloadDefinitionCatalog` → `reloadAll` → `monitor.syncRoots` identity check → re-arm; presence watch also sees the swap | Implemented; macOS unit test and Linux probe show re-arm and no events from the moved backup. No polling or download added. |
| BEH-007 | Skills not monitored or published | Grammar allow-list excludes `skills/`, other files, `.git`, `_` templates, dot names | Unit (grammar, monitor) and integration AC-007 (no frames for skill edits) pass. |
| BEH-008 | One diagnostics surface per subject; missing root keeps last good everywhere (admission included); truthful root status; watch failure → `UNAVAILABLE` + Reload works | `definition-diagnostics.ts`; `catalog.markSourceMissing`; monitor state machine; `AgentPackage.autoRefresh` | Implemented; integration AC-011/AC-012 (incl. injected `ENOSPC`) pass; Settings row rendered live (`Folder not found` → `Auto-refreshing`). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/definition-catalog/**`, `src/{agent-definition,agent-team-definition,agent-org-definition}/{providers,services}/*`, `src/collaboration-definition-admission/**`, `src/compositions/{host-definition-services,definition-catalog-feed-composition,build-studio-server}.ts`, `src/application-platform/definitions/create-bundle-backed-definition-services.ts`, `src/agent-packages/**`, `src/api/graphql/types/{definition-diagnostics,agent-definition,agent-team-definition,agent-org-definition,agent-packages}.ts`, `src/api/websocket/{definition-catalog,index}.ts`, `src/built-in-agents/built-in-agent-bootstrapper.ts`, `src/config/{app-config,config-value-parsers}.ts`.
- Web: `autobyteus-web/services/{nodeChangeFeed,definitionCatalog}/**`, `services/projects/projectChangeFeed.ts`, `stores/{agentDefinitionStore,agentTeamDefinitionStore,agentOrgDefinitionStore,agentPackagesStore,definitionDiagnosticsStore}.ts`, `components/definitions/**`, `components/agentOrgs/AgentOrgCatalogCard.vue`, card/list/Settings components, `graphql/**`, `localization/messages/*/definitionCatalog.ts`, `app.vue`.
- Tests added: `tests/unit/definition-catalog/*` (catalog rules, sync incl. trailing re-check, readers, grammar, monitor), `tests/integration/definition-catalog/package-auto-refresh.integration.test.ts` (13 journey cases), `tests/unit/api/graphql/types/definition-diagnostics.test.ts`, `tests/helpers/definition-catalog-test-runtime.ts`; web `utils/definitionCatalog/__tests__`, `services/definitionCatalog/__tests__`, `components/definitions/__tests__`, package-row cases.

## Important Assumptions

- The app-data default package root is `dirname(appConfig.getAgentsDir())` with the three kind dirs taken from the config getters (identical to `appDataDir` in real configs).
- `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` entries are absolute; non-absolute entries are ignored with a warning as before.
- Application-owned agent and Team **list entries** are catalog units refreshed only by a full reconcile (readiness, Reload); exact application-owned reads stay disk reads, as designed.

## Known Risks

- **Implementation refinements beyond the spec text (no contract change):**
  1. *Parent-folder presence watch.* On macOS, renaming a root away emits **no** chokidar events and leaves the old watcher dead (verified). The monitor therefore watches each armed root's parent folder one level deep (Node `fs.watch`, filtered to the root's own entry). This is the design's "ancestor presence watch" applied while armed as well as while missing. Linux and macOS both transition in ≈ 25 ms.
  2. *Trailing re-check after a read-triggered flush.* chokidar drops a second `change` event for the same file within 5 ms, so a truncate-then-write can be reported once; if a read flushes at that moment, the unit can be applied mid-write. Units applied early by a read are re-read once after the quiet window. This is local to the sync and never publishes when nothing changed.
  3. *One catalog with subject-keyed units* instead of three catalog instances; nested nodes are indexed by `(nodeSubject, canonicalId)`. Ownership and the reconcile rule are as designed.
- **DSN-002 visible effect (for delivery docs):** a Team or Org ID present in more than one registered package is no longer offered by `list_available_agents` / `@` (launch already rejected it). Its team-local agents are not listed either, because a duplicated unit is issue-only.
- **Behavior notes worth a reviewer's eye:** a present agent folder without `agent.md` (but with `agent-config.json`) is now an issue (`agent.md is missing.`) instead of silently absent; malformed application-owned agents become catalog issues instead of failing the whole list; the agents list, Teams list and exact reads no longer see disk writes until the monitor (or a Reload) reports them — in the studio server this is within the settle window.
- **macOS watch start-up latency:** directory watches start a few hundred ms after chokidar's `ready`. Writes in that window right after (re-)arming are covered because every (re-)arm also requests a full reconcile of the root.
- **Pre-existing failures observed (not caused by this change, confirmed on a base worktree):** integration `agent-status-websocket` (2, the documented exception); E2E `agent-team-definitions-graphql` (5: `refType` field / `buildTeamLocalTeamDefinitionId` no longer exist), `agent-packages-graphql` (3: live GitHub access), `agent-package-private-skills` (2: runtime mocks lack `assertAccepting` / `ownLlm`). These belong to their owners / API/E2E; listed under follow-ups.
- `generated/graphql.ts` was regenerated from the current server schema, so it also picks up unrelated schema drift already on `personal` (e.g. `ArchiveStoredAgentRunGroup`, project workspace `workspaceRootPath`); no web code depends on the changed generated types.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement (feature + defect fix + refactor)
- Reviewed root-cause classification: Boundary Or Ownership Issue + Missing Invariant
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one owner of "current definitions" (catalog behind the services); one change applier (sync); admission on the catalog; one diagnostics query; cache providers, persistence wrappers and the fresh path removed; the bricking defect is covered by a regression test.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — `CachedAgentDefinitionProvider`, `CachedAgentTeamDefinitionProvider`, both `*PersistenceProvider` pass-through wrappers (they became empty indirection), `getFreshAgentDefinitionById` / `getFreshDefinitionById` / `freshProvider` and the backend factory's duck-typed probe, `AgentDefinitionService.refresh()` alias and `provider` field, `FileAgentDefinitionProvider.getAll/getAllVisible`, `FileAgentTeamDefinitionProvider.getAll`, `FileAgentOrgDefinitionProvider.getAll`, the team/org revision hash duplicates, admission decode disk pre-read and duplicate grouping, `DefinitionSourceRegistry` shared-root/org-owned enumeration and its `appConfig` / `implementationPackageRoots` options, GraphQL `definitionAdmissionDiagnostics` + type + test, `AgentPackageService` refresh deps, the bootstrapper's trailing refresh, the projects feed's own socket lifecycle, stale compiled `.test.js` twins of touched tests (5 files).
- Dead code found elsewhere, listed as follow-up: 83 other stale compiled `tests/**/*.test.js` files remain tracked in `autobyteus-server-ts` (`vitest.config.ts` only includes `*.test.ts`; `git ls-files 'tests/**/*.test.js'` lists them).
- Shared structures remain tight: `Yes` (`DefinitionCatalogIssue` core vs. `DefinitionDiagnostic` web projection, as reviewed).
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — `AgentOrgExperience.vue` was exactly 500 non-empty lines at base; the Org catalog card moved to `AgentOrgCatalogCard.vue` (now 489). Largest new files: monitor 317, sync 296, catalog 222.
- Notes: the file providers keep their org-owned/team-local exact reads because the startup run-history migrations and write results still use them (not dead).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes` — package files are only read; settings/registry unchanged; catalog, issues and watch status are in memory.
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- No new dependency (chokidar 4.0.3 was already a server dependency).
- The web worktree needed `pnpm -C autobyteus-web exec nuxt prepare` once (missing `.nuxt/tsconfig.json`), and `pnpm -C autobyteus-ts build` after the fast-forward for the web integration test that imports server source.
- A throwaway base worktree (`/tmp/apar/basewt`, deps symlinked) was used only to confirm pre-existing E2E failures and was removed.

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts typecheck` — pass.
- `pnpm -C autobyteus-server-ts test:unit` — 672 files / 5312 tests pass, 4 skipped (baseline before the change: 669 / 5255).
- `pnpm -C autobyteus-server-ts test:integration` — all pass except the two documented `agent-status-websocket` cases (baseline exception). The final re-run on the committed code is recorded in `implementation-revision-record.md` IR-001.
- Catalog-specific: `tests/unit/definition-catalog/**` (68 tests) and `tests/integration/definition-catalog/**` (13 cases) pass; the monitor test passed 15/15 consecutive runs; the journey integration passed repeatedly (one AC-001 timeout observed once while three heavy suites ran in parallel on the machine; 10/10 in isolation).
- N-1 guards: `tests/integration/collaboration-definition-admission/org-owned-team-local-agent.test.ts` and `tests/unit/collaboration-definition-admission/org-local-roundtrip.test.ts` pass (ported to the catalog-backed services).
- Server E2E files touching definitions/packages (`tests/e2e/agent-definitions`, `agent-team-definitions`, `skills/skill-name-catalog-graphql`): failure counts identical to base (see Known Risks); the three cases this change broke were fixed (test isolation and setup only).
- `pnpm -C autobyteus-web test:nuxt --run` — 600 files: all pass after updating two specs whose strict query allow-lists did not include the new diagnostics read, and building `autobyteus-ts` for one web integration file.
- Build: `pnpm --filter autobyteus-server-ts build` (incl. the sanitized built-in agents bootstrap smoke) — pass after updating the smoke script.
- **Linux (QR-002 / AC-012 residual):** `implementation-evidence/apar-linux-monitor-probe.mjs` run in `node:22-bookworm` (kernel 6.12, aarch64) against the built monitor: rename-away → `ROOT_MISSING` 26 ms, restore → `WATCHING` ≈ 25 ms, edits resume; rename-swap re-armed, 0 events from the moved backup; **603 inotify watches** for copies of the user's two packages (461 definition dirs), ready 117 ms, 0 watches after close (7 ms). Output: `implementation-evidence/apar-linux-monitor-probe-output.txt`. The Vitest files themselves were not run on Linux (the worktree's native toolchain is macOS-built); the probe drives the same compiled monitor through the same sequences.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Agents page cards and list notice; Teams page list and notice; Orgs page cards/notice and Reload; Settings → Agent Packages row status.
- Approved UI/UX references: requirements § UI, Interaction, And Experience Requirements (lists update in place, error indicator with file and reason, package row error / "not auto-refreshing"; styling illustrative).
- Existing design system reviewed: existing card badge/tag patterns (amber notice styles used elsewhere), `useLocalization`, Settings row text styles.
- Rendered surface used: `pnpm dev` (real built backend on 8000 with repo-local data, Nuxt dev on 3000) with the in-app browser; a temporary local package imported through the real GraphQL API and edited on disk.
- States inspected (each without page reload, verified by a window marker): new agent appears on the open Agents page ≈ 3.4 s after the write; broken `agent-config.json` → "Using last working version" badge with file path and `Invalid JSON: Unexpected end of JSON input`, fix → badge cleared; new valid Team appears and an unresolved Team shows in the Teams notice with reason and folder; adding the missing agent makes that Team appear and the notice disappear (AR-001); package folder renamed away → row "Folder not found — Its definitions keep their last loaded version until the folder returns." in red, restored → "Auto-refreshing".
- Visual or interaction issues found and corrected: duplicate status wording ("Folder not found — Folder not found …", "Not auto-refreshing — Not auto-refreshing: …") → server messages now carry only the explanation; badge/notice text used `$t` that rendered untranslated keys in component tests → switched to `useLocalization`.
- Supporting evidence / limitations: screenshots were inspected during the session (browser artifacts); not checked: zh-CN rendering in the browser (unit catalog only), narrow viewports, the new-chat `@` menu and live-run `@` in the browser (both read the reloaded stores / server catalog), reconnect after a server restart in the browser (covered by the feed unit test), Electron desktop shell.

## Downstream Coverage Hints / Suggested Scenarios

- Desktop isolated instance (TESTING Rule 1): the approved SCN-012 journey with the Project Task Manager and the Agent Package Creator — create agent + team, edit a team's members/handoffs and an agent's instructions, delete an agent, then delegate again; confirm `list_available_agents`, `@`, Teams page and a Codex-runtime launch use current definitions; a broken nested agent keeps its Team usable with a badge.
- AC-008 run continuity: edit and then delete the definition of an active run; restore after stop shows the existing "definition not found".
- AC-009: two windows, GitHub package Update in one; the other updates without Reload.
- AC-010: disconnect / restart the backend with the Agents page open; changes made meanwhile appear after reconnect.
- AC-014: idle CPU with the user's real configuration; macOS and Linux watch counts (Linux measured 603 in a container).
- Web dev-path probe for live list updates could be made durable under `autobyteus-web/tests/e2e/`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation of AC-001…AC-016 on the real product, including the desktop user journey above, AC-008/009/010/014, and remote-access auth on `/ws/definition-catalog` (QR-006: reuses `authorizeRemoteAccessWebSocket`, not separately exercised here).
- Decision on the pre-existing E2E failures listed in Known Risks (owners outside this ticket).
