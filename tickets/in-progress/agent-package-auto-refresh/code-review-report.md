# Code Review Report — `agent-package-auto-refresh`

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 6, IR-004 / SR-009: rename plus the application-package accuracy change). Earlier rounds are kept below for history.
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/requirements-doc.md` (Approved SR-005; editorial SR-007)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed As Context: `probes/` (evidence only); `implementation-evidence/apar-linux-monitor-probe-output.txt`
- Relevant Solution Revision IDs: SR-005 (approval), SR-007, SR-008 (design)
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md` (ARCH-REV-002 Pass, notes N-1…N-4)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003 (SR-008 delta Pass; notes N-5, N-6)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Current Review Round: 6
- Review Scope: `Full Re-Audit`
- Review Scope Evidence (round >1): IR-004 renames every public contract, plus the subsystem, the services and the web. It also changes the data flow: application-package agents and Teams leave the store and are read on demand (N-7), and the readiness reload is removed. All structural checks were rerun on the renamed code, and the full scorecard was rescored.
- Trigger: IR-004 (SR-009 / DSN-005, resolving CR-005…CR-011) from `/software_engineering_team/implementation_engineer`. Commits `e89085f3e`, `8d89b8cdf` on base `061ea7ab3`
- Prior Review Round Reviewed: 5 (CRR-006, naming Fail, Design Impact)
- Latest Authoritative Round: 6
- Round-5 trigger: direct user request (2026-10-11): "why don't we call it … agent package definition … make the naming more clear … there's so many definitions. What definition? … we must improve the naming"
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record: N/A
- Failing Scenario IDs: APE-001 (DESK-002, nested part); REQ-009 under DSN-003; SCN-004, AC-004
- Exact Failing Commands / Execution Mode: isolated desktop instance `iso-53228-c43b` (`pnpm --silent isolated-app start --build` from this worktree), with copies of the user's two packages imported through Settings. `half-written` was written into `agent-teams/evidence-driven-delivery-team/agents/validator/agent.md`.
- Failure Evidence Paths: `api-e2e-evidence/desktop/d03-nested-badge.png`, `d03-nested-team-detail.png`, `desktop-journey-receipt.json` (`DESK-002_nested_team_local_broken`); contrast `d02-agent-badge-expanded.png`
- Branch / commits reviewed: `codex/agent-package-auto-refresh` at `3cc17135f` (base `359d2c0ef`; `9777af682`, `0cd763fd0`, `f7fcf9055`, `0bbfaa8e3`, `3cc17135f`)

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review` (rounds 1–2, 4); `API/E2E Failure-Origin Review` (round 3)
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. New server subsystem, new websocket and GraphQL contracts, a settle/flush/queue concurrency model, watcher lifecycle, and every definition reader plus admission rewired (150 files). No correction.

## Review Scope

- Changed implementation and behavior reviewed: the whole server `src/definition-catalog/**` subsystem (types, node-file helpers, registered roots, catalog, sync, runtime, three source readers, unit presence, path grammar, monitor, hub and messages); the three definition services and their node readers and file providers; admission and the narrowed registry; compositions (`host-definition-services`, `create-bundle-backed-definition-services`, `definition-catalog-feed-composition`, `build-studio-server`); GraphQL (`definition-diagnostics`, agent/team/org types and converters, `agent-packages`); `/ws/definition-catalog`; package service, mappers and root settings store; app config; built-in bootstrapper; fresh-path callers (backend factory, org run service, skill-improvement resolvers, migrations' provider swap, standalone validator). Web: `NodeChangeFeed`, `ProjectChangeFeed`, definition feed and composable, `loadedListReloader`, the four store `reloadIfLoaded` additions, `definitionDiagnosticsStore`, badge and notice components, card/list/Settings changes, `app.vue`.
- Files / areas reviewed: as above.
  - Round 1: catalog unit tests and journey integration read and run (6 files, 81 tests pass).
  - Round 2: the IR-002 delta in `definition-catalog-sync.ts`, `definition-catalog.ts`, `package-definition-monitor.ts`, `build-studio-server.ts`, `definitionDiagnosticsStore.ts`, `projectChangeFeed.ts`, localization and the new or changed tests. Reran `vitest run tests/unit/definition-catalog tests/integration/definition-catalog` (7 files, 86 tests pass), server `typecheck` (clean) and the affected web specs (5 files, 18 tests pass).
- Explicit exclusions: `generated/graphql.ts` (regenerated; skimmed only), localization strings (content only), the pre-existing E2E failures listed in the handoff (owned elsewhere), and the desktop/remote-auth journeys left to API/E2E.

## Round 6 — SR-009 Rename And Application-Package Change (IR-004)

**Rename verification**
- **Design-spec § Naming (SR-009) map:** every row was checked against the code.
  - The server subsystem is `src/agent-package-definitions/`, with `AgentPackageDefinitionStore`, `AgentPackageDefinitionReloader`, `AgentPackageDefinitions`, `AgentPackageFolderWatcher`, the `*FolderReader`s, `agent-package-layout.ts` and `AgentPackageDefinitionChange*`.
  - The WebSocket is `/ws/agent-package-definitions`, with frame `agent_package_definitions_changed {changedLists}` and a strict zod schema.
  - GraphQL has `loadIssue` / `loadIssues`, `DefinitionLoadIssue(Entry)` (field `kind`), `definitionProblems(kind: DefinitionKind!)` and one `reloadAgentPackageDefinitions` mutation, used by the Agents, Teams and Orgs Reload paths.
  - The codes are `FOLDER_MISSING` and `DEFINITION_SOURCE_UNAVAILABLE`.
  - The web uses `agentPackageDefinitionsWs`, `services/` / `composables/` / `utils/agentPackages/`, `DefinitionLoadIssueBadge.vue`, `DefinitionProblemsNotice.vue`, `definitionProblemsStore` and the localization namespace `agentPackageDefinitions.*`.
  - Docs live in `docs/modules/agent_package_definitions.md`.
- **Spec verification search** (`definition-catalog|definitionCatalog|DefinitionCatalog|catalogIssue|definitionDiagnostics|DefinitionSubject|definitions_changed|refreshCache|refresh*DefinitionCatalog|PackageDefinitionMonitor|ROOT_MISSING|DEFINITION_SOURCE_MISSING`, excluding `tickets/` and build outputs). The only hits are these:
  - (a) `CollaboratorDefinitionCatalog` / `collaborator-definition-catalog.ts`: pre-existing at base `359d2c0ef`, a different concept (the collaborator candidate port), and not in the SR-009 rename map;
  - (b) the web type `TeamLocalDefinitionSubject`: pre-existing, also not in the map;
  - (c) one web spec asserting that the **old** frame is rejected. This is intentional.

  None of these is part of this feature's names. The spec's search pattern is broader than its rename map, which is a wording discrepancy only. Renaming (a)/(b) is an optional follow-up.
- **Logic preservation:** `AgentPackageDefinitionReloader` and `AgentPackageDefinitionStore` were read in full. Settle, flush, queue, the trailing re-check (read flushes only), per-root readability isolation, the last-good rule, nested path order and the list-expansion table (`listsAffectedBy`) match round 4 apart from the renames. The application-owned enumeration and `fromRegisteredRoot` are removed as designed.
- **R-2 applied:** `kindFoldersUnreadableError` and `errorText` live in `domain/definition-files.ts`, shared by the watcher and the reloader.

**N-7 (mandatory), verified**
- `FileAgentDefinitionProvider.listApplicationOwnedAgents()` and `FileAgentTeamDefinitionProvider.listApplicationOwnedTeams()` read one definition at a time inside a try/catch. A failure is logged (`APPLICATION_PACKAGE_AGENT_SKIPPED` / `APPLICATION_PACKAGE_TEAM_SKIPPED`) and that entry is skipped.
- A failing source listing reads as empty (logged).
- Team-local agents of application-package Teams go through `listTeamLocalAgentDefinitions`, which already isolates each agent.
- The services merge these after the store's entries, de-duplicated by ID (`agent-definition-service.ts:233–254`, `agent-team-definition-service.ts:205–212`).
- `ApplicationDefinitionRuntimeReadiness.prepare()` no longer reloads. Its validator still uses both services (not dead).
- Test `tests/unit/agent-package-definitions/application-package-list-isolation.test.ts` covers three cases: malformed beside valid, a failing listing, and not held in the store.

**Accepted visible effects (designer-recorded; out of scope per the requirements)**
- A malformed application-package agent is now logged and skipped. Before, it appeared as a load issue in the Agents problems notice (IR-001), and at base it failed the whole list.
- Application-package files are read on each list call. Exact-ID reads already did this, and there are few application packages. No measured problem, so no machinery is required (DESIGN.md "start simple").

**Reruns (round 6)**
- Server `typecheck`: clean.
- Server `vitest run` over `tests/unit/agent-package-definitions`, `tests/integration/agent-package-definitions`, `tests/unit/api/graphql`, `tests/{unit,integration}/collaboration-definition-admission`, `tests/unit/agent-packages`, `tests/unit/built-in-agents`, `tests/unit/application-platform` and `tests/integration/agent-definition`: 63 files pass (1 skipped), 428 tests.
- Gated E2E `agent-package-definitions-live-refresh` plus `agent-definitions-graphql`: 2 files, 16/16 pass.
- Web `vitest run` over `components/{definitions,agentTeams,agentOrgs,agents,settings}`, `stores/__tests__`, `services` and `utils/agentPackages`: 227 files, 1855 tests pass.
- Size audit: no changed source file is above 500 effective lines. The largest are `AgentOrgExperience.vue` at 489 (pre-existing) and `agent-package-service.ts` at 461.

## Round 5 — Naming Review (User-Requested)

**Basis.** The user's direct instruction: the feature's names must say *which* definitions they mean. They are the definitions in the user's **agent packages** (Settings → Agent Packages), so the user wants "agent package definition(s)". Under Core Principle 3 and the Derived Checks ("Names that do not describe the actual owner or role" is a listed design smell), the generic `definition catalog` / `definitions_changed` names do not tell a reader what is held, watched or changed. The repository already has many other "definitions": application definitions, run definitions, tool definitions, the GraphQL schema. Several names also leak internal design terms (`catalog`, `unit`, `subject`) into the public API, or no longer describe what the code does (`refreshCache` with no cache; `DEFINITION_SOURCE_MISSING` used for unreadable folders).

**Scope note for the Solution Designer (naming accuracy).** The catalog also holds *application-owned* agents and Teams (from application bundles) as list entries, refreshed only by full reconciles. These are not agent-package definitions. "Agent package definitions" is exact for everything watched and published, and nearly exact for the catalog. The designer should either accept that, with a one-line note in the catalog's doc comment, or keep application-owned entries outside the renamed catalog's name. **Proposed names below are recommendations; the final names need the user's confirmation through the Solution Designer.**

### Proposed rename map

| Area | Current | Proposed | Finding |
| --- | --- | --- | --- |
| WebSocket path | `/ws/definition-catalog` | `/ws/agent-package-definitions` | CR-005 |
| Change frame type | `definitions_changed` | `agent_package_definitions_changed` | CR-005 |
| Web endpoint key | `definitionCatalogWs` (`utils/nodeEndpoints.ts`, `types/node.ts`) | `agentPackageDefinitionsWs` | CR-005 |
| Server subsystem folder | `src/definition-catalog/` | `src/agent-package-definitions/` | CR-006 |
| Catalog store | `DefinitionCatalog` (`definition-catalog.ts`) | `AgentPackageDefinitionCatalog` | CR-006 |
| Sync | `DefinitionCatalogSync`, `DefinitionCatalogPublisher`, `DefinitionCatalogSyncOptions` | `AgentPackageDefinitionSync`, `…Publisher`, `…SyncOptions` | CR-006 |
| Runtime | `DefinitionCatalogRuntime`, `createDefinitionCatalogRuntime`, `getDefaultDefinitionCatalogRuntime` | `AgentPackageDefinitionRuntime`, … | CR-006 |
| Monitor | `PackageDefinitionMonitor` | `AgentPackageDefinitionMonitor` | CR-006 |
| Hub and messages | `DefinitionCatalogChangeHub`, `DefinitionCatalogChangeMessage(Schema)`, `definition-catalog-change-*.ts` | `AgentPackageDefinitionChangeHub`, `AgentPackageDefinitionChangeMessage(Schema)`, `agent-package-definition-change-*.ts` | CR-006 |
| Studio composition | `definition-catalog-feed-composition.ts`, `composeDefinitionCatalogFeed`, `definitionCatalogSync`, `definitionCatalogChangeHub` | `agent-package-definition-feed-composition.ts`, `composeAgentPackageDefinitionFeed`, `agentPackageDefinitionSync`, `agentPackageDefinitionChangeHub` | CR-006 |
| WS route file | `api/websocket/definition-catalog.ts`, `registerDefinitionCatalogWebsocket` | `api/websocket/agent-package-definitions.ts`, `registerAgentPackageDefinitionsWebsocket` | CR-005 |
| Web feed | `services/definitionCatalog/definitionCatalogChangeFeed.ts`, `DefinitionCatalogChangeFeed`, `deliverDefinitionCatalogChange`, `reloadDefinitionCatalogSubjects`, `getDefinitionCatalogChangeFeed` | `services/agentPackageDefinitions/agentPackageDefinitionChangeFeed.ts`, `AgentPackageDefinitionChangeFeed`, … | CR-007 |
| Web composable, utils, types | `composables/definitionCatalog/useDefinitionCatalogChangeFeed.ts`, `utils/definitionCatalog/`, `types/definitionCatalog.ts` | `…/agentPackageDefinitions/…`, `useAgentPackageDefinitionChangeFeed` | CR-007 |
| Localization namespace | `definitionCatalog.*` (en, zh-CN) | `agentPackageDefinitions.*` | CR-007 |
| Badge component | `components/definitions/DefinitionCatalogIssueBadge.vue` | `DefinitionIssueBadge.vue` (it marks *a definition's* problem) | CR-007 / CR-008 |
| GraphQL agent field | `AgentDefinition.catalogIssue` | `definitionIssue` | CR-008 |
| GraphQL Team/Org field | `catalogIssues` | `definitionIssues` | CR-008 |
| GraphQL types | `DefinitionCatalogIssue`, `DefinitionUnitIssue` | `DefinitionIssue`, `DefinitionIssueEntry` (no internal "catalog" or "unit") | CR-008 |
| Domain types | `DefinitionCatalogIssue`, `DefinitionUnitIssueEntry` | `AgentPackageDefinitionIssue`, `AgentPackageDefinitionIssueEntry` | CR-008 |
| Service reload method | `refreshCache()` on the three definition services (no cache exists any more; it runs a full catalog reconcile) | `reloadAgentPackageDefinitions()` | CR-009 |
| Package service | `refreshCatalogCaches()` (private), dependency `reloadDefinitionCatalog` | `reloadAgentPackageDefinitions` | CR-009 |
| Issue code | `DEFINITION_SOURCE_MISSING` (also used for **unreadable** folders since IR-002; the method is already `markSourceUnavailable` and the badge says "unavailable") | `DEFINITION_SOURCE_UNAVAILABLE` | CR-010 |
| GraphQL enum | `DefinitionSubject` (`AGENT/AGENT_TEAM/AGENT_ORG`) in `definitionDiagnostics(subject:)` | `DefinitionKind` and argument `kind` ("subject" is design jargon) | CR-011 |

Out of scope (pre-existing names this ticket did not introduce): `refreshAgentDefinitionCatalog` / `refreshAgentTeamDefinitionCatalog` mutations, and `refreshAgentOrgDefinitionCatalog`, which deliberately mirrors them. Rename them only if the user wants the whole family changed.

Internal-only terms (`unit`, `node`, reader `subject`) may stay inside the server subsystem, where they are defined in the design spec's Terminology. They must not appear in the GraphQL schema or web types (CR-008, CR-011).

## Round 4 — SR-008 Nested-Surface Trace And Delta Review (IR-003)

### Nested-surface trace (SR-008 Verification Additions)

| Nested kind | Catalog location | Service accessor (N-5) | GraphQL | Rendered surface | Status |
| --- | --- | --- | --- | --- | --- |
| Team-local agent of a shared Team | `agent_team` unit child (`readTeamLocalAgentNodes`) | `AgentTeamDefinitionService.listUnitIssues()` (list), `getUnitIssues(id)` (exact) | `AgentTeamDefinition.catalogIssues` through `toGraphqlDefinitionUnitIssues` (N-6) | `AgentTeamCard.vue` → `DefinitionCatalogIssueBadge :issues` on the Teams page | Traced |
| Org-owned agent | `agent_org` unit child | `AgentOrgDefinitionService.listUnitIssues()` / `getUnitIssues(id)` | `AgentOrgDefinition.catalogIssues` | `AgentOrgCatalogCard.vue` badge on the Orgs page | Traced |
| Org-owned Team | `agent_org` unit child (subject `agent_team`) | same as above | same as above | Org card | Traced |
| Local agent of an org-owned Team | `agent_org` unit child | same as above | same as above | Org card | Traced |
| Shared agent (unchanged) | `agent` unit root | `getDefinitionIssue` / `listDefinitionIssues` | `AgentDefinition.catalogIssue` | `AgentCard.vue` (one-item list) | Traced |
| Unusable (first-seen invalid) nested node | unit child, `definition: null` | also in `listDefinitionIssues` by node subject | `definitionDiagnostics(subject)` | List notice, **and** the owning card entry marked "No working version" | Traced |

- Ordering: `catalog.apply` now merges reader order first (`definition-catalog.ts:91–93`), so nested entries stay in path order after edits. Previously-present children missing from a read are still removed. Change detection is unaffected. A unit test covers it.
- N-5 honored. Resolvers call `listUnitIssues()` once per list query and never touch the catalog. `listIssueEntries` (node subject) remains only for the notice.
- N-6 honored. One mapper, `toGraphqlDefinitionUnitIssues` (`definition-diagnostics.ts`), composes from `toGraphqlDefinitionCatalogIssue`.
- An exact read of an org-owned Team returns only its own issue; its siblings stay on the Org card. This matches the design wording "for an org-owned agent/team, the badge is on the owning org's card".
- Removed `AgentTeamDefinitionService.getDefinitionIssue` and `AgentOrgDefinitionService.getDefinitionIssue`. Grep finds no remaining callers; the agent service's version stays in use.
- Badge status priority:
  - root `DEFINITION_SOURCE_MISSING` → "Package folder unavailable";
  - any non-last-good entry → "Some members couldn't be loaded";
  - otherwise "Using last working version".

  This matches design-spec § File Responsibility Mapping. The count is shown, and each entry gives the name or folder, the file and the reason (REQ-009).
- Reruns (round 4):
  - server `vitest run tests/unit/definition-catalog tests/integration/definition-catalog tests/unit/api/graphql/types/definition-unit-issues.test.ts tests/unit/api/graphql/types/definition-diagnostics.test.ts tests/unit/collaboration-definition-admission`: 16 files, 177 tests pass;
  - server `typecheck`: clean;
  - web `vitest run components/definitions components/agentTeams components/agentOrgs components/agents stores/__tests__`: 98 files, 958 tests pass.

### API/E2E-owned durable test made stale by the approved contract change (not a source finding)

- `autobyteus-server-ts/tests/e2e/agent-definitions/definition-catalog-live-refresh.e2e.test.ts:42,154,156` (API/E2E commit `a28465175`) queries `catalogIssue` on `agentTeamDefinitions` and `agentOrgDefinitions`. SR-008 replaced that field with `catalogIssues` on both types (design-spec Removal Plan).
- Reviewer run with the documented gated command: **3 of 8 fail** (DCF-E2E-002, 006, 007), each with `Cannot query field "catalogIssue" on type "AgentTeamDefinition". Did you mean "catalogIssues"?`. The other 5 pass.
- Classification: stale test after an approved contract change. API/E2E-owned test code, carried as a **required update** in the API/E2E rerun: query `catalogIssues { … }` for teams and orgs, and keep `catalogIssue` for agents. The product source is correct, so this does not block the source-review pass.

## API/E2E Failure-Origin Review (Round 3) — APE-001

### Failure context

- Supported scenario: SCN-004 (Supported Normal Scenario). A user or the Agent Package Creator makes a broken or half-written edit to a **team-local** agent. Nested agents are 111 of the user's 156 agents, and the Agent Package Creator writes team-local agents.
- Governing requirement: REQ-009 ("errors … MUST be visible in the web on the affected card or row (Agents/Teams/Orgs pages …), naming the file and the reason. Logs alone are not enough."), applied to nested definitions by DSN-003 (requirements § Open Decisions) and AR-004.
- The failing case still represents approved behavior: **Yes**. It was entered through the real supported trigger: a file write in a watched package on an isolated desktop build.

### Observed production path

1. Server side, correct:
   - The catalog keeps the team-local node's last good version with a `DEFINITION_CONTRACT_INVALID` issue.
   - `definitionDiagnostics(AGENT)` returns `team-local-agent:evidence-driven-delivery-team:validator`, `usingLastGood: true`, with the file and reason.
   - The Team stays listed and launchable (DEC-001).
2. Web, no surface carries the issue:
   - **Agents page:** `autobyteus-web/components/agents/AgentList.vue:167–169` filters out `TEAM_LOCAL` definitions (`discoverableAgentDefinitions`). This filter exists at base `359d2c0ef:AgentList.vue:168`, so the team-local agent has no card for `AgentCard`'s badge.
   - **Lists notice:** `components/definitions/DefinitionDiagnosticsNotice.vue:31` drops `usingLastGood` entries by design, since the notice lists unusable definitions.
   - **Teams page:** the `AgentTeamCard` badge shows `teamDef.catalogIssue`. The server fills that from `listDefinitionIssues()` keyed by the **team's** ID (`api/graphql/types/agent-team-definition.ts:297`), so nested agent issues never reach it. The Team detail and `TeamLocalAgentMemberDetails.vue` render no issue.
   - **Orgs page:** by code, the same gap applies to org-owned agents and teams. `AgentOrgCatalogCard.vue:8` shows only `org.catalogIssue`, which is filled per org ID (`agent-org-definition.ts:113`). This was not executed separately.

### Origin classification

- **Design Impact.**
  - The design's surface mapping for nested issues points at a surface the product does not have. The only nested example (design-spec § Concrete Examples, "Nested last good (AR-004)") says "the Agents page card for `a` shows the badge", but team-local agents have no card on the Agents page.
  - The File Responsibility Mapping assigns badges to `AgentCard`, `AgentTeamCard` and the org card, and a notice "for unusable definitions", but no surface for a **nested** node's last-good issue.
  - The implementation followed that mapping faithfully. It is not an implementation defect against the reviewed design.
- Fixing it needs a design decision, not a bounded local patch. Options include:
  - an aggregate nested-issue indicator on Team/Org cards, which needs a GraphQL contract change: today `catalogIssue` is a single root-node issue;
  - member-row issues on Team/Org detail;
  - and/or showing `usingLastGood` nested entries in a notice.

  The choice spans the Agents, Teams and Orgs surfaces, and the Solution Designer owns it under REQ-009/DSN-003. Whether the chosen surface needs renewed user confirmation is the Solution Designer's call. The approved requirement text already states the intent.
- **Earlier review gap: Yes (CRR-001/CRR-002).**
  - The source review confirmed BEH-004 as "GraphQL `catalogIssue` / `definitionDiagnostics` → web badge or notice" without tracing the nested path to a rendered surface.
  - It was reasonably detectable: the design example names the Agents page card, and `AgentList.vue`, a file this ticket changed to add the notice, shows the `TEAM_LOCAL` filter a few lines from that edit.
  - Invariant that should have been checked: every node that can carry a last-good issue (DSN-003) has a rendered surface naming file and reason (REQ-009).
  - Affected round-2 score rationale: **Runtime Correctness And Behavioral Fidelity** should not have been 9.2. REQ-009 is unmet for nested definitions, which are most of the user's agents. The round-2 Pass is superseded by this failure-origin result.
- Not the origin: test code, fixtures, environment or execution. The evidence comes from the real desktop build against real package copies, and the shared-agent contrast case passes.

### Out-of-scope observations passed along (no attribution here)

- `list_available_agents` lists a Team whose member is missing. API/E2E reports the same at base. Whether REQ-002 ("readers agree") covers member-availability filtering in `list_available_agents` is for the Solution Designer to note; it is not part of APE-001.

### Durable test-code changes

- `a28465175` (new `definition-catalog-live-refresh.e2e.test.ts`; `agy-failure-cli.mjs` `READ_AGENT_PROMPT` route) and `6b3a10822` (`agent-packages-graphql.e2e.test.ts` baseline fix) are **not reviewed in this round**. The run failed, and the proportional test-code review happens after a successful API/E2E run.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (SR-005; DEC-001…DEC-006 recommended options; DEC-007 = A; DSN-001…DSN-003).
- Design-spec behavior map verified against the implementation: Yes. DS-001…DS-005 are implemented as designed. Three implementation refinements were checked and stay within the design's ownership and contracts:
  - parent-folder presence watch while armed;
  - trailing re-check of units applied early;
  - one catalog with subject-keyed units.
- Design review report and round confirmed: ARCH-REV-002 Pass. N-1…N-4 verified in code:
  - N-1: `agent-team-definition-service.ts:209–224` lists `listNestedNodes("agent_org", "agent_team")`.
  - N-2: `agent-definition-service.ts:243`, `listApplicationOwnedTeamLocalAgents`.
  - N-3: `reconcileOwningUnit` through `catalog.unitOf` in the agent and team services.
  - N-4: `unit-presence.ts:31–50`, `seenPaths`.
- Behavior-basis status: `Confirmed`. The CR-001 defect is resolved in round 2.
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Monitor `handleEvent` → `classifyDefinitionUnit` → `sync.noteUnitChange` → timer or a read's `settle()` → `reconcileBatch` → reader `readUnit` → `catalog.apply`. Services, admission and GraphQL read behind `settle()`. Integration AC-001/002/003/006/015/016 pass. | — |
| BEH-002 | Confirmed | Refresh mutations → `refreshCache()` → `sync.reloadAll()` (coalesced) → publish all four subjects. Package actions → `reloadDefinitionCatalog`. | — |
| BEH-003 | Confirmed | Hub → `/ws/definition-catalog` (remote-access auth) → `DefinitionCatalogChangeFeed` → `reloadDefinitionCatalogSubjects` → store `reloadIfLoaded`; `connected` reloads all subjects. Round 2: the diagnostics store uses `createLoadedListReloader` per subject (CR-002 resolved). | — |
| BEH-004 | Confirmed | `catalog.applyNode` rule table (last good, issue-only, duplicate without last good); nested nodes per unit; Org correlation through last-good members. **Round 4 (SR-008):** every nested kind is traced to a rendered surface (owning Team/Org card through `catalogIssues`; unusable nodes also in the notice). See § Round 4. | — |
| BEH-005 | Confirmed | Backend factory, org run service and team topology read the catalog; no run-state code changed. | — |
| BEH-006 | Confirmed | Update → `reloadAll` → registration listener → `monitor.syncRoots` identity re-arm; presence watch also catches the swap. | — |
| BEH-007 | Confirmed | Grammar allow-list excludes `skills/`, dot names, `_` templates and other files. | — |
| BEH-008 | Confirmed | Round 2: the root context splits `readable` from `unavailable` (missing → null; unreadable → reason) and enumerates per root, so one failing root never fails population or a batch. Units of an unavailable root keep their last good version through `markSourceUnavailable` (`DEFINITION_SOURCE_MISSING`, with a reason naming the folder and error). The monitor reports `UNAVAILABLE` when a kind folder cannot be listed and re-arms on the next full reconcile. The startup admission scan is guarded. Regression coverage: `unreadable-package-root.test.ts`, a monitor case, and a journey integration case. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-012 / SCN-001–003 | BEH-001, REQ-001–004, REQ-010, REQ-018 | User/System | User via Project Task Manager; Agent Package Creator | Change packages, then delegate against the result | File tools write under a registered root; `list_available_agents` / `delegate_task` | Normal | DS-001 → DS-002 → DS-003 | Current definitions used | Requirements; integration journey | Supported Normal Scenario | Use |
| SCN-004 | BEH-004, REQ-007–009 | User/System | Same | Survive a broken or half-written edit | Partial or bad write | Normal | DS-002 rule table → GraphQL `catalogIssue` / `definitionDiagnostics` → web badge or notice | Last good plus issue; fix clears it | Requirements AC-004/005 | Supported Normal Scenario | Use |
| SCN-005 | BEH-001, REQ-004 | Operational | User | `git pull` in a package | Many file events | Normal | Settle coalescing; a read flush may split a burst (design Key Tradeoffs) | Bounded publications; consistent final state | Requirements; design | Supported Normal Scenario | Use (CR-002) |
| SCN-011 (unreadable root) | BEH-008, REQ-015, REQ-016, REQ-008; preserved "startup never blocked" | Operational | User/OS | A registered package folder exists but cannot be read (permissions; macOS privacy-protected folders for a desktop app) | Server start, or any catalog read | Explicit Edge | `build-studio-server` → `admission.scan()` → `settle()` → `ensurePopulated` → `runFullReconcile` → `reader.listUnitIds` → `listChildDirNames` throws EACCES | Required: no crash; error reported; other roots unaffected; definitions per DEC-005 | REQ-015 names "missing **or unreadable**"; BEH-008 preserved column; base code skipped unreadable folders | Supported Explicit Edge Scenario | Use (CR-001) |
| SCN-009 | BEH-003, REQ-006 | System | Web client | Recover after disconnect | Reconnect → `connected` | Normal | NodeChangeFeed retry → `connected` → reload all loaded | Current lists | Requirements | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 (resolved round 2) | One unreadable folder under a registered root rejects catalog population, so every definition read throws and the startup admission scan rejects | SCN-011 (unreadable), REQ-015, BEH-008 preserved, REQ-008 | A registered root (or one of its kind folders) is present but unreadable at start or at any later full reconcile | `listChildDirNames` rethrows non-ENOENT errors (`definition-node-files.ts:20–29`). Its callers are `AgentDefinitionSourceReader.listUnitIds` (`:31–38`) and `listUnitDirNames` (`unit-presence.ts:16–25`). `runFullReconcile` (`definition-catalog-sync.ts:275–296`) has no per-root isolation, so `ensurePopulated` rejects, then `settle()`, then every service read, admission `scan()`, and the unguarded startup scan (`build-studio-server.ts`, after `composeDefinitionCatalogFeed`). The base code skipped such folders (`file-agent-definition-provider.ts@359d2c0ef:303–306` `catch { continue; }`; registry `readdir(...).catch(() => [])`). | Reviewer probe (temporary test, removed): default root with agent `alpha`, external root with `agents/` chmod 000 → `getAllAgentDefinitions()` and `admission.scan()` both threw `EACCES: permission denied, scandir …/ext/agents`. | Promote | CR-001 (High). Resolved in IR-002 (verified). |
| C-02 | The diagnostics store drops a change notification that arrives while the same subject's load is in flight | REQ-005, REQ-009, AC-004; the change-feed contract that a notification makes loaded views current | Two publications close together: a burst split by flush-on-read (the design's acknowledged behavior), or two quick edits | `definitionDiagnosticsStore.ts:19–21` returns the running promise without a follow-up, so a query that already passed its server `settle()` answers with pre-change data and the notice stays stale until the next change. The list stores use `createLoadedListReloader`, whose follow-up exists for exactly this case (`loadedListReloader.ts:1–6`). | Code read; the same file pair shows both semantics | Promote | CR-002 (Low). Resolved in IR-002 (verified). |
| C-03 | `projectChangeRetryDelayMs` is now an alias that only its own spec imports | Core Principle 7 (dead code in touched files) | Engineering contract | `projectChangeFeed.ts:12`; grep shows only `projectChangeFeed.spec.ts:2,91` | grep | Promote | CR-003 (Low). Resolved in IR-002 (verified). |
| C-04 | Trailing re-check also runs for timer-fired settles, while its comment and the handoff say "units a read applied early" | REQ-018 / SCN-012 (read flush mid-write); chokidar change throttle | Every settled burst | The timer callback calls `settle()`, which copies pending units to `trailingUnits` (`definition-catalog-sync.ts:128–136, 197–199`). One extra small read per unit, with no publication when nothing changed. | Code read | Reject (as a finding) | The consequence is negligible and the mechanism is correct for its supported premise. Non-blocking R-1 was adopted in IR-002: the timer flush no longer arms the re-check. |
| C-05 | The `definition-catalog` subsystem imports `collaboration-definition-admission/domain/definition-source-descriptor` despite the design's "must not import admission" | Design dependency rules | Engineering contract | Type/value import of the descriptor that the Team and Org domain models already carry (`agent-team-definition/domain/agent-team-definition.ts:6`, `agent-org-definition/domain/agent-org-definition.ts:6`). No dependency on admission services and no cycle. | grep | Reject | Pre-existing placement of shared domain vocabulary, not a new shortcut. |
| C-06 | Package service reads root status through the static `PackageDefinitionMonitor.getProcessInstance()` | Design "narrow port" | Engineering contract | The `rootWatchStatus` port is injectable; the default follows the existing process-instance pattern of the definition services. | Code read | Reject | Consistent with the established pattern. |
| C-07 | Teams-page diagnostics notice can include org-owned Team unavailability | REQ-009 | — | Admission lists org-owned Teams as `agent_team` subjects (N-1) | Code read | Reject | No approved requirement is contradicted; extra visibility only. |
| C-08 (round 2) | The same "can this root's kind folders be listed" check (and `errorText`) now exists in both the sync (`kindDirsUnreadableReason`) and the monitor (`unreadableKindDirError`) | Reusable owned structures (engineering contract) | Engineering contract | The two copies agree today (ENOENT/ENOTDIR tolerated, anything else unreadable). If they drift, Settings status and the catalog issue could disagree. | Code read | Reject (as a blocking finding) | About ten duplicated lines inside one subsystem, with no current behavior divergence. Non-blocking R-2: move the check and `errorText` into `definition-catalog/domain/definition-node-files.ts` next to `listChildDirNames`. |
| C-09 (round 2) | A team or org in both an unreadable root and a readable root reads as available from the readable root, instead of as duplicated | DSN-002 | Unreadable root holding a duplicated identity | The duplicate rule only sees readable roots | Code read | Reject | The unreadable root's content cannot be known. This combines two edge conditions, and the requirements assign it no behavior. |
| C-10 (round 2) | After an unreadable root becomes readable again, its catalog and watch recover only on the next full reconcile (Reload, package action or readiness) | REQ-016 ("not auto-refreshing"; manual Reload still works) | Permissions restored | Monitor `UNAVAILABLE` → `syncRoots` re-arms on `reloadAll` | `unreadable-package-root.test.ts` (recovery after `refreshCache`) | Reject | Matches REQ-016's fallback contract. Automatic resumption is required only for a missing root (REQ-015), and that path is unchanged. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | One inventory owner (catalog behind services); one change applier (sync); admission on the catalog; fresh path and caches removed | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements; probes used as evidence only | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001…DS-005 map one-to-one to monitor → sync → catalog/readers → services/admission → hub/feed | — |
| Ownership boundary preservation and clarity | Pass | Sync is the only catalog writer (grep: `catalog.apply`/`markSourceMissing` only in the sync and the test helper); monitor never reads definitions | — |
| Off-spine concern clarity | Pass | Grammar, fingerprints, presence and subject expansion each sit with their owner | — |
| Existing capability/subsystem reuse check | Pass | Reuses parsers, codecs, ID helpers, org-owned correlation, chokidar, the projects feed pattern (extracted `NodeChangeFeed`) | — |
| Reusable owned structures check | Pass | `unit-presence.ts` shared by the Team and Org readers; `loadedListReloader` now shared by all five reloadable stores. The readability check is duplicated in the sync and the monitor (non-blocking R-2) | R-2 (optional) |
| Shared-structure/data-model tightness check | Pass | `DefinitionCatalogIssue` core vs. `DefinitionDiagnostic` projection; `UnitReadOutcome` / `NodeReadOutcome` tight | — |
| Repeated coordination ownership check | Pass | Settle, flush, queue and expansion live only in the sync | — |
| Empty indirection check | Pass | Persistence-provider pass-through wrappers removed | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Node readers sit with their subjects; source readers handle enumeration and precedence | — |
| Ownership-driven dependency check | Pass | No catalog import of services, GraphQL, collaboration or run execution (C-05 rejected) | — |
| Authoritative Boundary Rule check | Pass | Callers use the services; admission uses the services plus the narrowed registry; no `getFresh*` remains (grep) | — |
| File placement check | Pass | `src/definition-catalog/{domain,services,providers,monitor,changes}` as designed | — |
| Flat-vs-over-split layout judgment | Pass | Readable | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Subject-specific service methods; `definitionDiagnostics(subject)` enum; `noteUnitChange(subject, unitId)` | — |
| Naming quality and naming-to-responsibility alignment check | Pass | Natural names. `markSourceUnavailable` matches its widened meaning; the trailing re-check comment now matches its scope | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | Initial implementation; refinements are local | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | The `projectChangeRetryDelayMs` alias is removed; the spec asserts `nodeChangeRetryDelayMs` | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Journey test names map to AC IDs. Round 2 adds an unreadable-root unit test (REQ-015/BEH-008), a monitor `UNAVAILABLE` case, a journey startup case and a diagnostics change-during-load spec | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `definition-catalog-test-runtime.ts` | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Stale `.test.js` twins of touched tests removed; 83 others listed as follow-up | — |
| API/E2E readiness for the next workflow stage | Pass | CR-001 resolved; startup is guarded; affected suites and typecheck pass | — |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `definition-catalog/monitor/package-definition-monitor.ts` | 334 (new) | Pass | Delta pressure (new file) | One owner: watch lifecycle and root state machine | Pass | Acceptable | — |
| `definition-catalog/services/definition-catalog-sync.ts` | 360 (new; +64 in round 2) | Pass | Delta pressure (new file) | One owner: population, root context, settle, queue, publication | Pass | Acceptable | — |
| `definition-catalog/services/definition-catalog.ts` | 222 (new) | Pass | Borderline | Pure state and rules, no I/O | Pass | Acceptable | — |
| `web/components/agentOrgs/AgentOrgExperience.vue` | 489 | Pass | Net shrink (card extracted) | Pass | Pass | Acceptable | — |
| `config/app-config.ts` | 488 | Pass | +10 | Pass | Pass | Acceptable | — |
| `agent-packages/services/agent-package-service.ts` | 464 | Pass | +21/−16 | Pass | Pass | Acceptable | — |
| Other changed source files | ≤ 355 | Pass | Small deltas | Pass | Pass | Acceptable | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Fresh path, cache providers, registry shared enumeration and the old diagnostics query are gone (grep clean) |
| No legacy old-behavior retention in changed scope | Pass | Application-owned disk reads are a distinct, out-of-scope source |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | CR-003 resolved |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`; the migrations only swap a removed pass-through wrapper for the file provider |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining. The round-1 item (`projectChangeRetryDelayMs` alias) was removed in IR-002.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new live-refresh behavior, issue badges, package auto-refresh status, the new websocket and GraphQL fields, the DSN-002 effect (a duplicated Team/Org is no longer offered by `list_available_agents`), and the changed package-row wording.
- Files or areas likely affected: server `docs/modules` for agent definitions and agent packages; web `docs/agent_management.md`, `agent_teams.md`, `agent_orgs.md`, `settings.md` (as listed in design step 6, owned by delivery).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001…P-004 | Confirmed | Implemented as designed (expansion, admission on catalog, units, root state machine) |
| P-005 | Confirmed (rejected; closed anyway by arming before the first scan) | — |
| P-006 | Confirmed | N-1 implemented; guard tests pass |

### `CR-P-01` — A registered package root that is present but unreadable

- Origin: `New`
- Related approved requirement or established contract: REQ-015 ("missing or unreadable … MUST NOT crash … report an error … handle its definitions per DEC-005"); BEH-008 preserved ("Startup is never blocked; other definitions are unaffected"); REQ-008 ("MUST NOT affect other definitions").
- Relevant behavior ID(s): BEH-008, BEH-001
- Coherent product goal or governing event: the server keeps serving every other package when one registered folder cannot be read.
- Scenario validity: `Supported Explicit Edge Scenario`. The approved requirement names it, and the base code already tolerated it.
- Initiating basis kind: `Operational`
- Independent trigger or governing contract: REQ-015. Real causes include folder permissions and, for the desktop app, macOS privacy-protected locations (Documents/Desktop) that return EPERM/EACCES to `readdir`.
- Support evidence: REQ-015 text; base `FileAgentDefinitionProvider.getAll` and `DefinitionSourceRegistry.scan` skipped unreadable folders.
- Forward path: server start → `buildStudioServer` → `composeDefinitionCatalogFeed` → `definitionAdmissionService.scan()` → `teams.listAdmissionEntries()` → `sync.settle()` → `ensurePopulated()` → `runFullReconcile(false)` → `reader.listUnitIds(context.present)` → `listChildDirNames` throws EACCES. Population rejects and is retried on every later read, failing each time.
- Lifecycle preconditions and material consequence: the root folder exists (stat succeeds, so it counts as present) but one of its kind folders cannot be listed. Startup rejects. In a running server, a later `reloadAll` (Reload, package action) rejects instead, and `noteRootChanged` batches fail and re-pend.
- Reachability: `Reachable` (reproduced by the reviewer probe).
- Review consequence / proportionate response: CR-001, Local Fix. Resolved in IR-002 with per-root isolation in the sync's root context and enumeration, an issue naming the folder, monitor `UNAVAILABLE`, and a guarded startup scan. The response is proportionate: no new owner or state beyond the root context.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3 (round 6)
- Overall score (`/100`): 93
- Score calculation note: simple average of the ten categories (round 4, Full Re-Audit); the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001…DS-005 readable in code; the SR-008 issue path extends DS-003/DS-005 through the same owners (catalog → services → GraphQL → card) | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.3 | Unit issues come from the catalog and are exposed only through the Team/Org services (N-5); resolvers never touch the catalog | Static monitor process instance for package status (existing pattern, C-06) | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | `catalogIssues` is unit-scoped with an explicit node identity (`subject`, `definitionId`); one subject per accessor | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.2 | The badge owns presentation; the catalog owns ordering and issue collection; one GraphQL mapper | Monitor and sync dense but single-owner | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Tight load-issue and read-result types; R-2 applied (one readability rule in `definition-files.ts`); one GraphQL mapper (N-6) | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Round 6: names now say what each thing is (agent package definitions, definition folder, kind, load issue, definition problem); internal terms no longer leak into the API; `reloadAgentPackageDefinitions` and `DEFINITION_SOURCE_UNAVAILABLE` match their behavior | Pre-existing `CollaboratorDefinitionCatalog` / `TeamLocalDefinitionSubject` remain (outside the map) | Optional follow-up rename |
| `7` | `API/E2E Readiness` | 9.1 | GraphQL, component and integration coverage for nested surfaces | The API/E2E durable test must switch Teams/Orgs to `catalogIssues` (stale after the approved contract change; API/E2E-owned) | API/E2E updates its query |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.2 | Round 6: reloader and store logic unchanged apart from renames; N-7 per-definition isolation for application-package lists; reruns green | Recovery from an unreadable root waits for a full reload (REQ-016 fallback, C-10) | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean replacement of the root-only Team/Org `catalogIssue` (no dual field); unused Team/Org `getDefinitionIssue` removed | — | — |
| `10` | `Cleanup Completeness` | 9.3 | Stale accessors removed; web queries, stores and types updated together | — | — |

## Findings

### CR-005 — Feed contract names do not say which definitions (WebSocket path, frame type, endpoint key) — **Resolved (round 6, IR-004 / SR-009)**

- Evidence: `/ws/definition-catalog` (`api/websocket/definition-catalog.ts`, `index.ts`); `definitions_changed` (`definition-catalog-change-messages.ts`, web feed parser, sync publisher); web `definitionCatalogWs`.
- Required action: rename per § Round 5 map (`/ws/agent-package-definitions`, `agent_package_definitions_changed`, `agentPackageDefinitionsWs`). This is a clean cut with no old-path alias, because the server and web ship together.

### CR-006 — Server subsystem and class names ("definition catalog") are generic — **Resolved (round 6, IR-004 / SR-009)**

- Evidence: `src/definition-catalog/**` (47 files reference it), `DefinitionCatalog*`, `PackageDefinitionMonitor`, `definition-catalog-feed-composition.ts`, `HostDefinitionServices.definitionCatalogSync`.
- Required action: rename to `agent-package-definitions` / `AgentPackageDefinition*` per the map. Resolve the application-owned-entries naming note.

### CR-007 — Web feed, composable, utils, types, localization and badge names repeat the generic term — **Resolved (round 6, IR-004 / SR-009)**

- Evidence: `services/definitionCatalog/`, `composables/definitionCatalog/`, `utils/definitionCatalog/`, `types/definitionCatalog.ts`, `localization/messages/*/definitionCatalog.ts`, `DefinitionCatalogIssueBadge.vue` (25 web files).
- Required action: rename per the map. Regenerate `generated/graphql.ts`.

### CR-008 — Public API leaks internal design terms ("catalog", "unit") — **Resolved (round 6, IR-004 / SR-009)**

- Evidence: GraphQL `catalogIssue`, `catalogIssues`, `DefinitionCatalogIssue`, `DefinitionUnitIssue`; domain `DefinitionUnitIssueEntry`.
- Required action: `definitionIssue` / `definitionIssues`, `DefinitionIssue` / `DefinitionIssueEntry` (GraphQL); `AgentPackageDefinitionIssue(Entry)` (domain). Update the converters, queries, stores, the badge and the E2E query constants (`ISSUE`, `UNIT_ISSUES`).

### CR-009 — `refreshCache()` names a cache that no longer exists — **Resolved (round 6, IR-004 / SR-009)**

- Evidence: `refreshCache()` on `AgentDefinitionService:360`, `AgentTeamDefinitionService:322`, `AgentOrgDefinitionService:91` now calls `sync.reloadAll()`; the caches were removed in this ticket. Callers: GraphQL refresh mutations, `application-definition-runtime-readiness.ts:36–37`, `built-in-agent-bootstrapper.ts:20`, `agent-package-service.ts:88` (plus its private `refreshCatalogCaches`).
- Required action: rename to `reloadAgentPackageDefinitions()` everywhere (clean cut).

### CR-010 — `DEFINITION_SOURCE_MISSING` also means "unreadable" — **Resolved (round 6, IR-004 / SR-009)**

- Evidence: since IR-002, `catalog.markSourceUnavailable(…, unreadableReason)` emits `DEFINITION_SOURCE_MISSING` for unreadable folders; the web badge text already says "Package folder unavailable".
- Required action: rename the code to `DEFINITION_SOURCE_UNAVAILABLE` (domain type, catalog, admission code union, web badge check, tests).

### CR-011 — GraphQL enum `DefinitionSubject` uses design jargon — **Resolved (round 6, IR-004 / SR-009)**

- Evidence: `definitionDiagnostics(subject: DefinitionSubject!)`; `DefinitionUnitIssue.subject`.
- Required action: `DefinitionKind` with argument and field `kind`. The internal server type may keep "subject".

### CR-004 — Nested definitions' last-good issues have no web surface (REQ-009 / DSN-003) — **Resolved (round 4)**: SR-008/DSN-004 design, IR-003 implementation; see § Round 4 trace

- Source: APE-001 failure-origin review (CRR-003). Contract: REQ-009, DSN-003, AC-004, SCN-004.
- Evidence: see § API/E2E Failure-Origin Review (Round 3).
  - `AgentList.vue:167–169` `TEAM_LOCAL` filter (pre-existing);
  - `DefinitionDiagnosticsNotice.vue:31` drops `usingLastGood`;
  - Team and Org `catalogIssue` carry only root-node issues (`agent-team-definition.ts:297`, `agent-org-definition.ts:113`);
  - design-spec example "the Agents page card for `a` shows the badge".
- Required action (Solution Designer): choose and specify the web surface for nested (team-local, org-owned agent and org-owned team) last-good issues, plus any contract change it needs, in the design spec. The implementation then follows. Whatever the surface, the cumulative package must keep REQ-009's "naming the file and the reason".

Round-1 findings CR-001…CR-003 are resolved in IR-002 (verified in round 2; see CRR-002) and kept below for traceability.

### CR-001 — An unreadable registered package folder fails every catalog read and blocks server startup (High) — **Resolved (round 2)**

- Candidate / premise: C-01, CR-P-01. Contract: REQ-015, REQ-008, BEH-008 preserved ("Startup is never blocked; other definitions are unaffected").
- Evidence:
  - `definition-catalog/domain/definition-node-files.ts:20–29`: `listChildDirNames` rethrows every error except ENOENT/ENOTDIR.
  - Callers: `providers/agent-definition-source-reader.ts:31–38`, `providers/unit-presence.ts:16–25` (Team/Org `listUnitIds`), and `readTeamLocalAgentNodes` / the org reader (per-unit, already caught by `reconcileUnit`).
  - `services/definition-catalog-sync.ts:275–296` `runFullReconcile` has no per-root isolation. `ensurePopulated` (`:171–184`) rejects, so `settle()` rejects for every service read and for admission. `reconcileBatch` (`:242–273`) fails the whole batch for a root change and re-pends it on every later read.
  - `compositions/build-studio-server.ts`: the startup `admission.scan()` is awaited unguarded, so startup rejects.
  - Base behavior: unreadable folders were skipped (`file-agent-definition-provider.ts@359d2c0ef` `getAll`: `catch { continue; }`; registry `readdir(...).catch(() => [])`).
  - Reviewer probe (temporary test, removed after the run): an external root with `agents/` at mode 000 → `getAllAgentDefinitions()` and `admission.scan()` both threw `EACCES: permission denied, scandir …/ext/agents`, even though the default root was healthy.
- Required action (Local Fix, implementation):
  - Isolate enumeration failure per root in the readers or the sync, so one unreadable root never fails population, a full reconcile or a batch.
  - Keep that root's existing units as last good (DEC-005) with an issue or log that names the unreadable folder; first-seen units from that root simply stay absent. Other roots reconcile normally.
  - Confirm that Settings shows the root as not auto-refreshing (chokidar's EACCES error should already drive `UNAVAILABLE`).
  - Add a regression test with an unreadable kind folder: other roots stay readable and `admission.scan()` resolves.

### CR-002 — Diagnostics store drops a change notification that arrives during an in-flight load (Low) — **Resolved (round 2)**

- Candidate: C-02. Contract: REQ-005 and REQ-009, AC-004 ("fixing the file … clears the error"), and the feed's own reload contract.
- Evidence: `autobyteus-web/stores/definitionDiagnosticsStore.ts:19–21` returns the running promise with no follow-up. The list stores use `utils/definitionCatalog/loadedListReloader.ts`, which schedules one follow-up "so a change during a reload is never missed". Back-to-back publications are expected when a read flush splits a burst (design § Key Tradeoffs). The web's own reloads call `settle()` and can trigger such a flush.
- Required action (Local Fix, implementation): give each diagnostics subject the same in-flight-plus-one-follow-up semantics, preferably by reusing `createLoadedListReloader`. Add a unit case: a reload requested during an in-flight load runs once more.

### CR-003 — Test-only alias left in a touched file (Low) — **Resolved (round 2)**

- Candidate: C-03. Contract: Core Principle 7.
- Evidence: `autobyteus-web/services/projects/projectChangeFeed.ts:12` `export const projectChangeRetryDelayMs = nodeChangeRetryDelayMs`. Its only consumer is `services/projects/__tests__/projectChangeFeed.spec.ts:2,91`.
- Required action (Local Fix, implementation): remove the alias and assert the backoff against `nodeChangeRetryDelayMs` where it is defined.

### Non-blocking recommendations

- **R-1 (C-04): adopted in IR-002.** The quiet-window timer flushes without arming the trailing re-check.
- **R-2 (C-08, open, optional):** move the shared "kind folders listable" check and `errorText` into `definition-catalog/domain/definition-node-files.ts`. The sync and the monitor would then share one readability rule.

## Classification

- Round 6: N/A (Pass). CR-005…CR-011 are resolved.
- History:
  - round 5: `Design Impact` (naming, resolved);
  - round 4: Pass;
  - round 3: `Design Impact` (CR-004, resolved);
  - round 1: `Local Fix` (CR-001…CR-003, resolved).

## Recommended Recipient

- Primary: `/software_engineering_team/api_e2e_engineer`, for the API/E2E rerun of the renamed contracts. The durable E2E has been updated; it needs reruns, evidence and the desktop spot checks.
- Informational: `/software_engineering_team/implementation_engineer`.
- After that: proportional test review, then delivery (redo docs sync).

## Residual Risks

- Remote-access auth on `/ws/definition-catalog` reuses `authorizeRemoteAccessWebSocket`, but this change does not exercise it. That belongs to API/E2E (QR-006).
- Unreadable-root behavior is covered on macOS (chmod) only.
- Vitest monitor tests were run on macOS only. Linux behavior is evidenced by the container probe, not by the test files.
- The desktop SCN-012 journey and AC-008/009/010/014 remain for API/E2E.
- DSN-002's visible effect needs delivery docs.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 6, Full Re-Audit)
- Supported Product Scenario Gate: `Pass` (no intended-behavior change; application packages are out of scope)
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10; every category ≥ 9.0 (Naming 9.3)
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer` (primary); `/software_engineering_team/implementation_engineer` (informational)
- Notes:
  - Rename and N-7 verified.
  - Optional follow-ups: the pre-existing `CollaboratorDefinitionCatalog` / `TeamLocalDefinitionSubject` names; the spec's verification-search wording is broader than its rename map.
