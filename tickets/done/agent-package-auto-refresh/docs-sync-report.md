# Docs Sync Report — agent-package-auto-refresh

Current for delivery round **DR-003**, the SR-009 renamed package. This replaces the DR-001 report, which used the pre-rename names. DR-001's docs commit `061ea7ab3` was renamed by IR-004 (`e89085f3e`) and re-verified here.

## Scope

- Ticket: `agent-package-auto-refresh`. `task_size=Large`, `architectural_risk=High`, reviewed route.
  - Architecture review: ARCH-REV-003 and its SR-009 records.
  - Code review: CRR-007 (implementation, round 6, Pass 9.3/10) and CRR-008 (test code, Pass).
  - API/E2E: API-REV-003, Pass 96%.
- Trigger: CRR-008 pass from `code_reviewer` (2026-10-12).
- Bootstrap base reference: `origin/personal` @ `56530dfc6`.
- Integrated base reference used for docs sync: `origin/personal` @ `37e9721995ed4cbf750eb158292f24d31c384afb` (v1.5.2-beta.3). It was merged into the ticket branch as `6bf957f72`.
- Post-integration verification reference: `release-deployment-report.md` § Verification Checks; logs in `delivery-evidence/dr-003/`.

## Why Docs Were Updated

- Summary:
  - A new server subsystem, **agent package definitions**, loads the agent, team and org definitions from registered agent packages. It watches the package folders, keeps the last working version of a broken definition, and announces changed lists on `/ws/agent-package-definitions`.
  - The GraphQL contract changed:
    - added: `loadIssue`, `loadIssues`, `definitionProblems(kind)`, `reloadAgentPackageDefinitions`, and `AgentPackage.autoRefresh` with `WATCHING`, `FOLDER_MISSING` and `UNAVAILABLE`;
    - removed: `definitionAdmissionDiagnostics` and the three per-page refresh mutations.
  - Duplicated Team/Org IDs are unavailable to every reader (DSN-002).
  - Nested load issues show on the owning Team/Org card (SR-008).
  - Application-package agents and Teams are read on demand and are not agent package definitions (SR-009/N-7).
- Why this should live in long-lived project docs:
  - The ownership rules and public contracts are durable: the reloader is the only store writer; the readers are the only package listers; there are no fresh reads; reads return copies.
  - The user-visible states are durable too.

## Long-Lived Docs Reviewed

| Doc Path | Why Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_package_definitions.md` | New module doc, renamed by IR-004 from `definition_catalog.md` | Verified, no change | Every file path and identifier was checked against `src/` (store, reloader, `agent-package-definitions.ts`, `agent-package-layout.ts`, folder readers, WS route, `definition-problems.ts`, `agent-package-definitions.ts` mutation, feed composition; `FOLDER_MISSING`, `DEFINITION_SOURCE_UNAVAILABLE`, `applyPendingChanges`, `syncPackageFolders`, `reloadFoldersNow`, `listsAffectedBy`, `APPLICATION_PACKAGE_{AGENT,TEAM}_SKIPPED`, 1000 ms settle) |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | Verified | Row points to `agent_package_definitions.md` |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Topology, persistence | Verified | `/ws/agent-package-definitions`; no persisted state |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | `autoRefresh`, Reload Invariant, Update ordering | Verified | `FOLDER_MISSING`; reload before Update commit (code-checked in DR-001, unchanged by IR-004) |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Built-in bootstrap order; read boundary; N-7 | Verified | `reloadAgentPackageDefinitions()`; application-package agents read on demand and skipped when malformed |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Team folders, `loadIssues`, duplicates, application-package Teams | Verified | — |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Org folders, `loadIssues` | Verified | — |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | DSN-002 effect on `list_available_agents` | Verified | — |
| `autobyteus-web/docs/agent_management.md` | Live refresh, badge, notice, N-7 | **Updated** | Added the N-7 bullet: application-package agents and Teams get no badge and no live update, a malformed one is logged and left out, and a malformed application package is refused at import |
| `autobyteus-web/docs/agent_teams.md` | Team card badge, notice, Reload | Verified | Reload runs `reloadAgentPackageDefinitions` |
| `autobyteus-web/docs/agent_orgs.md` | Org card badge, notice, Reload | Verified | — |
| `autobyteus-web/docs/settings.md` | Package row states | Verified | Labels match `localization/messages/en/agentPackageDefinitions.ts` ("Auto-refreshing", "Folder not found", "Not auto-refreshing", "Package folder unavailable") |
| `TESTING.md` | Reviewer asked again to list the renamed E2E command | No change | See below |
| Repository-wide stale-name search | Design § Naming verification | Clean | `definition-catalog`, `definitionCatalog`, `DefinitionCatalog`, `catalogIssue`, `definitionDiagnostics`, `DefinitionUnitIssue`, `definitions_changed` (as a standalone frame), `ROOT_MISSING`, `DEFINITION_SOURCE_MISSING`, `refresh*DefinitionCatalog`, `/ws/definition`: no hits in long-lived `*.md` outside `tickets/`, `dist/`, `electron-dist/` and `resources/server` (build copies) |

### `TESTING.md` no-change rationale

`TESTING.md` § "When this file may be updated" (unchanged by the 72 base commits integrated in this round) says not to describe one suite, its cases or its command in `TESTING.md`. Those belong in the test file's header, and the "Gated runtime suites" layer row already says "The gate and command are in the test file". The header of `agent-package-definitions-live-refresh.e2e.test.ts` (lines 19–31) holds the exact renamed gated command the reviewer quoted. No test layer, harness or global rule changed. The reviewer's request is therefore satisfied where the current policy puts it.

Cosmetic follow-up for the test owner: the header still names DCF-E2E-001…008 and omits DCF-E2E-009 and DCF-E2E-010. The command is unaffected.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| Server and web docs from `061ea7ab3` (12 files) | Rename (IR-004, `e89085f3e`) | SR-009 names throughout; `definition_catalog.md` → `agent_package_definitions.md`; N-7 application-package behavior; single reload mutation | SR-009/DSN-005 clean cut |
| `autobyteus-web/docs/agent_management.md` | Delivery addition (DR-003) | N-7 bullet under "Load Issue Badge And Definition Problems Notice" | Reviewer behavior item; the web docs did not yet say that application-package definitions get no badge or live update |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source | Target Doc |
| --- | --- | --- | --- |
| One loaded set of agent package definitions | One store serves every reader; services are the only boundary; the reloader is the only writer; the readers are the only package listers | `design-spec.md` Ownership, Naming | `agent_package_definitions.md` |
| Last working version | Per-definition rules, load issue codes, duplicate rule, copies only | `design-spec.md` Reconcile Rules | `agent_package_definitions.md` |
| Change detection | Layout allow-list, settle window, read-your-writes, package folder states, identity re-arm | `design-spec.md` | `agent_package_definitions.md`, `agent_packages.md`, web `settings.md` |
| Announcements | `changedLists` table, frame contract, web routing | `design-spec.md` DS-005, Naming | `agent_package_definitions.md`, web `agent_management.md` |
| Rendered issue surfaces | Nested issues on the owning Team/Org card; unusable definitions in list notices | SR-008, DSN-004 | web `agent_teams.md`, `agent_orgs.md`, `agent_management.md` |
| Application-package definitions | Read on demand; not watched; malformed ones skipped and logged; no readiness reload | SR-009, N-7 | `agent_package_definitions.md`, `agent_definition.md`, `agent_team_definition.md`, web `agent_management.md` |
| Duplicated Team/Org IDs | Unavailable to every reader, `@` and `list_available_agents` included | DSN-002 | `agent_team_definition.md`, `agent_orgs.md`, `agent_communication.md` |

## Removed / Replaced Components Recorded

| Old Component / Concept | What Replaced It | Where Documented |
| --- | --- | --- |
| `CachedAgentDefinitionProvider`, `CachedAgentTeamDefinitionProvider`, `getFresh*` read path | `AgentPackageDefinitionStore` + `AgentPackageDefinitionReloader` behind the services | `agent_package_definitions.md` § Removed In This Design |
| GraphQL `definitionAdmissionDiagnostics` | `definitionProblems(kind)` | same |
| Three per-page refresh mutations | `reloadAgentPackageDefinitions` | same; web `agent_teams.md`, `agent_orgs.md` |
| Application-package agents/Teams held in the store, and the application readiness reload | On-demand reads | same; `agent_definition.md` |
| Pre-rename names from DR-001 (`definition_catalog.md`, `/ws/definition-catalog`, `catalogIssue(s)`, `definitionDiagnostics`, `ROOT_MISSING`, `DEFINITION_SOURCE_MISSING`) | SR-009 names | Design § Naming; all docs above |
| "Runtime And Cache Refresh Invariant" | "Reload Invariant" | `agent_packages.md` |

## No-Impact Decision

Not applicable: docs were updated. `TESTING.md` alone is unchanged, as recorded above.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: commit the docs addition, refresh the handoff summary and release notes, then hold for explicit user verification.
