# Docs Sync Report — agent-package-auto-refresh

## Scope

- Ticket: `agent-package-auto-refresh`. `task_size=Large`, `architectural_risk=High`, reviewed route.
  - Architecture review: ARCH-REV-003.
  - Code review: CRR-004 (implementation) and CRR-005 (test code).
  - API/E2E: API-REV-002.
- Trigger: CRR-005 pass from `code_reviewer` (2026-10-11). Design step 6 assigns the docs to delivery.
- Bootstrap base reference: `origin/personal` @ `56530dfc6`; the last pre-delivery merge-base is `359d2c0ef`.
- Integrated base reference used for docs sync: `origin/personal` @ `beb6b3b494779eba207feac94a70cb050db7dcbc`. It was merged into the ticket branch as `8187bac0f`.
- Post-integration verification reference: `handoff-summary.md` § Validation Evidence; logs in `delivery-evidence/`.

## Why Docs Were Updated

- Summary:
  - The server now has a new subsystem, the definition catalog. It provides live package watching, last good per definition and a change feed.
  - The GraphQL contract changed:
    - added: `catalogIssue`, `catalogIssues`, `definitionDiagnostics`, `AgentPackage.autoRefresh`;
    - removed: `definitionAdmissionDiagnostics`.
  - Admission now enumerates catalog units, and duplicate Team/Org IDs are unavailable to every reader (DSN-002).
  - The web refreshes lists live and shows issue badges, list notices and the package-row watch state.
  - Several long-lived docs stated the opposite: "refresh caches", "does not watch files automatically", and that the Team cache delegates to persistence.
- Why this should live in long-lived project docs:
  - The catalog's ownership rules are durable architecture: the only writer, the only enumerator, no fresh reads, copies only.
  - Its user-visible contracts are durable too: settle window, root states, subject expansion, badge semantics.
  - Future work on definitions, packages or collaboration must follow these rules.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/definition_catalog.md` | New subsystem had no doc | Updated (new) | Canonical home for the design |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | Updated | Index row added |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Runtime topology, persistence | Updated | WS feed, catalog note |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | "Runtime And Cache Refresh Invariant" was stale; no auto-refresh state | Updated | — |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Built-in bootstrap order changed (AR-006); read boundary | Updated | — |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | "Public Team cache" was stale; `catalogIssues`, duplicates | Updated | New subsection "Catalog Inventory And Issues" |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | "Team cache delegates Org-owned exact IDs to persistence" was stale | Updated | Org units, `catalogIssues` |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `list_available_agents` discovery (DSN-002 effect) | Updated | — |
| `autobyteus-web/docs/agent_management.md` | Design step 6; store and package refresh | Updated | New "Live Catalog Refresh" section |
| `autobyteus-web/docs/agent_teams.md` | Design step 6; "does not watch files automatically" was stale | Updated | — |
| `autobyteus-web/docs/agent_orgs.md` | Design step 6; Org card, notice, Reload mutation | Updated | — |
| `autobyteus-web/docs/settings.md` | Design step 6; package-row auto-refresh had no doc | Updated | New "Settings: Agent Packages Auto-Refresh" section |
| `TESTING.md` | Reviewer asked to add the new E2E command | No change | See the no-impact rationale below |
| `autobyteus-server-ts/docs/modules/skills.md` | Skills are explicitly not watched | No change | Already says skills are read at runtime; no skill cache |
| `autobyteus-server-ts/docs/modules/README.md` "Cached providers…" pattern line | Possibly stale | No change | Still true for MCP server config (`mcp-server-management/providers/cached-provider.ts`) |
| `autobyteus-web/docs/chat.md` (`@` mentions) | Mentions read the same stores | No change | It covers mention behavior, not catalog freshness; freshness is in `agent_management.md` |

### `TESTING.md` no-change rationale

`TESTING.md` was rewritten on the base by `361804e45`, which arrived in this integration. Its "When this file may be updated" section forbids describing one suite's command there and says to put it in the test file header. The rule for gated runtime suites is already stated: "The gate and command are in the test file". The header of `definition-catalog-live-refresh.e2e.test.ts` already holds the exact gated command. So the reviewer's request is met by the file header, as the current policy requires. No global testing rule changed.

The test-file header still says "DCF-E2E-001…006 run ungated. DCF-E2E-007/008…". DCF-E2E-009 (org-owned, SR-008) is not named there. This is cosmetic: the command is unchanged, and all 9 cases ran under it. Recorded as a follow-up for the test owner; it is not edited in delivery.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/definition_catalog.md` | New module doc | Units, last-good rules, path grammar, settle (1000/3000 ms), read-your-writes, root states, population and startup order, admission, subject expansion, WS frames, GraphQL surface, lifecycle, ownership rules, removed components, Linux watch notes | Durable design knowledge from `design-spec.md` (SR-008), checked against the code |
| `autobyteus-server-ts/docs/modules/README.md` | Index | Added Definition Catalog row | Discoverability |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Topology, persistence | `/ws/definition-catalog` route; catalog note under Persistence | Architecture overview accuracy |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | Contract and invariant | Scope includes orgs and auto-refresh; source-kind table notes watching; `autoRefresh` states table; "Catalog Reconcile Invariant" replaces "Runtime And Cache Refresh Invariant"; Update rollback wording; ownership note | REQ-013/015/016/017, DSN-001 |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Lifecycle and boundary | Built-in bootstrap order (write all → `refreshCache()` → resolve → defaults); service is the only read boundary, no cached/fresh paths, `catalogIssue` | AR-006; removal of the fresh path |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Contract | Team units, last good for team-local agents, `catalogIssues`, `DEFINITION_IDENTITY_DUPLICATED`, admission over the catalog, `definitionDiagnostics(AGENT_TEAM)` | DSN-002/003/004 |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Contract | Org units replace the "Team cache delegates to persistence" text; `catalogIssues`; duplicates; diagnostics | AR-004, SR-008 |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Behavior | Discovery reads the live catalog; duplicated Team/Org IDs are not listed | DSN-002 effect (reviewer item) |
| `autobyteus-web/docs/agent_management.md` | UI and store behavior | `reloadIfLoaded`; Live Catalog Refresh (feed, subject → store table, `connected` re-read); agent card badge and list notice; package refresh wording (Reload is the fallback) | REQ-005/006/009 |
| `autobyteus-web/docs/agent_teams.md` | UI behavior | Live Teams refresh; Team card badge over team-local agents; list notice incl. duplicates; Reload is now the fallback (stale "does not watch files" removed) | SR-008/DSN-004 |
| `autobyteus-web/docs/agent_orgs.md` | UI behavior | `AgentOrgCatalogCard` badge over org-owned nested definitions; notice; live refresh; Reload runs `refreshAgentOrgDefinitionCatalog` | SR-008/DSN-004 |
| `autobyteus-web/docs/settings.md` | UI behavior | Package row states "Auto-refreshing", "Folder not found", "Not auto-refreshing — reason" (incl. unreadable folders, watch limits); GitHub rows watched; `agent_package` reload; skills not watched | REQ-015/016 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Single inventory | One catalog serves every reader; services are the only boundary; sync is the only writer; readers are the only enumerators | `design-spec.md` Ownership Map, Dependency Rules | `definition_catalog.md` |
| Last good | Per-node rule table, issue codes, duplicate rule, copies only | `design-spec.md` Reconcile Rules | `definition_catalog.md` |
| Change detection | Allow-list grammar, settle window, read-your-writes, root state machine, identity re-arm | `design-spec.md` Path Grammar, Bounded Local Spines | `definition_catalog.md`, `agent_packages.md` |
| Publication | Subject expansion table, frame contract, web routing | `design-spec.md` DS-005 | `definition_catalog.md`, web `agent_management.md` |
| Rendered issue surfaces | Nested issues show on the owning Team/Org card; unusable definitions show in list notices | SR-008, DSN-004 | web `agent_teams.md`, `agent_orgs.md`, `agent_management.md` |
| Duplicate team/org IDs | Unavailable to every reader, including `list_available_agents` and `@` | DSN-002 | `agent_team_definition.md`, `agent_orgs.md`, `agent_communication.md` |
| Operational | Linux inotify count, `UNAVAILABLE` fallback to Reload | `design-spec.md` Key Tradeoffs, Risks | `definition_catalog.md`, web `settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `CachedAgentDefinitionProvider`, `CachedAgentTeamDefinitionProvider` | `DefinitionCatalog` + `DefinitionCatalogSync` | `definition_catalog.md` § Removed In This Design |
| `getFreshAgentDefinitionById` / `getFreshDefinitionById` | Service reads that settle first | `definition_catalog.md`, `agent_definition.md` |
| Admission disk enumeration of shared team/org roots; registry `implementationPackageRoots` | Catalog units; registry limited to application-owned team sources | `definition_catalog.md` § Admission |
| GraphQL `definitionAdmissionDiagnostics` | `definitionDiagnostics(subject)` | `definition_catalog.md` § GraphQL Surface |
| Root-only `catalogIssue` on Team/Org (intermediate, never released) | `catalogIssues` | `definition_catalog.md`, `agent_team_definition.md`, `agent_orgs.md` |
| "Runtime And Cache Refresh Invariant" | "Catalog Reconcile Invariant" | `agent_packages.md` |
| Duplicated web socket lifecycle in `projectChangeFeed.ts` | `NodeChangeFeed` | web `agent_management.md` § Live Catalog Refresh |

## No-Impact Decision

Not applicable. Docs were updated. `TESTING.md` alone is unchanged, for the reason recorded above.

## Delivery Continuation

- Result: `Pass`
- Docs commit: `061ea7ab3`, on top of the integrated merge `8187bac0f`.
- Next delivery action: handoff summary and release notes, then hold for explicit user verification.
- Notes: The docs describe the integrated, validated state. The upstream artifacts were used as supporting context, and each documented behavior was checked against the source:
  - settle constants;
  - root states and their labels;
  - the Update ordering;
  - the `autoRefresh` null case;
  - the feed's subject routing.
