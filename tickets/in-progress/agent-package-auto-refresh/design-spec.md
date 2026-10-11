# Design Spec — `agent-package-auto-refresh`

## Solution And Approval Basis

- Current solution revision ID: `SR-008`. SR-007 revised SR-006 after ARCH-REV-001 (AR-001…AR-006). SR-008 resolves CR-004 (CRR-003 failure-origin review of API-REV-001 DESK-002, `Design Impact`): there was no web surface for nested last-good issues.
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` approved at `SR-005` (user, 2026-10-10: "I think this is reasonable approach."), DEC-001…DEC-006 as recommended, DEC-007 = (A), REQ-018/AC-016 recorded within that approval. SR-007 changes no approved behavior:
  - AR-004 is resolved by **extending** last good to nested definitions, matching the plain reading of REQ-007. It is not narrowed.
  - Requirements edits in SR-007 are editorial: two wording contradictions with REQ-011 are fixed, and DSN-001/DSN-002 are recorded as solution details.
- Behavior-defining supplements and their approval references: None.
- Design status: `Ready` (SR-008 — CR-004 surface decided; returns to implementation → source review → API/E2E)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md` (2026-10-10), `references/design-principles.md` (2026-10-10; unchanged at the 2026-10-11 skills update), root `DESIGN.md` (2026-10-10), `TESTING.md` (2026-10-11), `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` (2026-10-11), `autobyteus-server-ts/docs/modules/file_explorer.md` § Watcher Runtime Isolation (2026-10-11). `design-examples.md` not used.
- Review basis: `design-review-report.md` (ARCH-REV-001) and `architecture-review-revision-record.md`.
- Project design-principle conflicts or discrepancies: None. Scoped reading of the `file_explorer.md` in-process-chokidar rule: it applies to the workspace watcher path, not this definition watcher (see Key Tradeoffs).

## Current-State Read

- **Two read paths per subject.**
  - Shared agent and team definitions are read through exhaustive in-memory caches: `CachedAgentDefinitionProvider` and `CachedAgentTeamDefinitionProvider`. These are refreshed only by Reload, package actions and application readiness.
  - The fresh path (`getFreshAgentDefinitionById`, `getFreshDefinitionById`) reads disk. It was added in `9762a12df` as a stale-cache workaround.
  - Orgs have no cache. Nested definitions (team-local agents; org-owned agents and teams) are always exact disk reads.
- **Admission keeps its own inventory.**
  - `DefinitionAdmissionService.scan()/requireAvailable()` enumerates shared teams/orgs from disk through `DefinitionSourceRegistry.scan()` on every call. It validates member references and applies a duplicate-identity rule: an ID present in several packages becomes unavailable.
  - It backs the Teams/Orgs GraphQL lists, team run create/restore (`team-run-service.ts:101,155`) and org run create (`agent-org-run-service.ts:83`).
  - Its unavailability is exposed only by `definitionAdmissionDiagnostics`, which has no web consumer. (ARCH-REV-001 evidence.)
- **No change detection.** Web stores fetch once per session.
- **Fragile refresh.** One invalid `agent-config.json` bricks the whole agent cache until refresh (probe). Nested broken agents are skipped silently in the visible list, and they make their team unavailable through admission.
- **Composition.** `createHostDefinitionServices` (studio server and standalone application host) with `close()`. The studio server closes resources in `closeStudioProcessResources`.
- **Out-of-band writer.** `BuiltInAgentBootstrapper` writes agent files, resolves each with the fresh path, then refreshes the cache at the end.
- **GitHub Update** replaces the managed install dir by rename (`github-agent-package-installer.ts:131–135`).
- **Push precedent.** `/ws/projects` hub, route and web feed.
- **Nested definitions dominate.** The user's packages hold 45 shared agents, 67 team-local and 44 org-owned.
- **Constraints to respect:**
  - root precedence;
  - admission's reference/dependency validation and duplicate policy for teams/orgs;
  - in-app write paths;
  - package import/remove/update rollback;
  - remote-access websocket auth;
  - lazy construction after config.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - **New server subsystem (`definition-catalog`):** catalog with definition units, sync, three readers, monitor, path grammar, hub/route.
  - **Changed services:** three definition services; admission enumeration and diagnostics; the definition source registry narrowed; package service; built-in agent bootstrapper; GraphQL types for agents, teams, orgs, packages and diagnostics.
  - **Removed:** two cache providers, the fresh path (about 9 production callers, about 14 test files), the admission diagnostics query and dead registry options.
  - **Web:** the shared feed is extracted; definition feed; five stores; cards, lists and the Settings row; localization.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - **Ownership:** the catalog becomes the single inventory for shared and nested definitions, and admission enumerates from it.
  - **New contracts:** websocket feed, GraphQL issue/diagnostics/status.
  - **Concurrency:** settle/flush/serialized reconcile vs. in-app writes.
  - **Lifecycle:** watchers, root missing/replaced, initial population.
  - **Blast radius:** every definition reader, team/org launch and admission.
- Escalation trigger if implementation or validation discovers new impact (return a `Design Impact` to the Solution Designer):
  - a definition reader that cannot use the service boundary;
  - persisted catalog state;
  - Linux watch count beyond QR-002 (expected about 400–700 inotify watches);
  - any change to run-history or execution-tree data;
  - any change to admission's reference/dependency/duplicate policy beyond what is stated here;
  - application-owned definitions needing monitoring.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Commit history | `9762a12df` | The fresh path is a stale-cache workaround | Remove the fresh path | None |
| Probe | `probes/apar-cache-probe.test.ts` | One invalid JSON bricks the agent catalog; a missing `agent.md` reads as absent | Per-definition classified reconcile; presence = a definition file exists | None |
| Probe | `probes/apar-watch-probe.test.ts` | 163 dirs, 47 ms ready, 2–13 ms events; no skill or non-definition events; missing kind dir detected | In-process chokidar with a structural allow-list | Linux counts (chokidar also watches files: about 400–700 expected) |
| Probe | `probes/apar-watch-probe2.test.ts` | No fd growth on macOS; a missing parent of the watched path is not detected | Ancestor watch plus a runtime root-missing transition | `getWatched()` unreliable as evidence |
| Code (ARCH-REV-001) | `definition-admission-service.ts` `scan/decode/requireAvailable`; `definition-source-registry.ts`; `team-run-service.ts:101,155`; `agent-org-run-service.ts:83`; `api/graphql/types/{agent-team-definition,agent-org-definition}.ts` | Admission enumerates shared teams/orgs from disk and backs lists and launch; duplicate → unavailable | Admission enumerates catalog entries; the registry keeps only application-owned sources; the duplicate policy moves into the team/org readers (AR-002) | None |
| Code | `api/graphql/types/definition-admission.ts`; `tests/unit/api/graphql/types/definition-admission.test.ts`; web grep (no consumer) | The existing diagnostics query is unused by the web | Replace it with one `definitionDiagnostics(subject: DefinitionSubject!)` (AR-003) | None |
| Code | `definition-source-registry.ts` option `implementationPackageRoots` (passed only by tests) | Dead in production | Remove with the registry narrowing | None |
| Code | `github-agent-package-installer.ts:131–135` | Update swaps the dir by rename | Re-arm a root whose directory identity changed (AR-005) | Per-platform event shape (verified by test) |
| Code | `built-in-agent-bootstrapper.ts:78–121, 185–233` | Write → resolve (fresh) → refresh at the end | New order: write all → `refreshCache()` → resolve → defaults (AR-006) | None |
| Data | User packages (reviewer count) | Nested agents 111/156 | Definition units cover nested definitions (AR-004) | None |

## Intended Change

Introduce one **definition catalog** that is the single in-memory inventory of definitions from registered package roots. It holds:
- **shared agents**;
- **team units**: a shared team with its team-local agents;
- **org units**: an org with its org-owned agents and org-owned teams, each with its local agents.

How it works:
- A **package definition monitor** (structural, in-process file watch) reports changes to a **sync**.
- The sync applies them after a short **settle window**. Any read first applies pending changes (REQ-018).
- Every definition, nested ones included, is reconciled independently with a **last-good** rule and a recorded **issue**.
- **Admission enumerates catalog entries** instead of disk. The registry remains only for application-owned team sources.
- The team/org readers own the duplicate-identity policy.
- Changes are published on **`/ws/definition-catalog`** with a **dependency-aware subject rule**, so dependent lists reload.
- One **diagnostics query per subject** replaces the old admission query.
- The cache providers and the fresh path are removed.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001–004, REQ-010, REQ-018; AC-001–003, AC-006, AC-015, AC-016 | File add/change/remove under a registered root | Not observed; caches stale; admission reads disk | Detected, settled, reconciled per definition (nested included); every reader, including admission, reads the catalog | DS-001, DS-002, DS-003 |
| BEH-002 | User | REQ-017; AC-013 | Reload, package Reload/Update | Clears and repopulates caches | Full reconcile, published | DS-004 |
| BEH-003 | User | REQ-005, REQ-006; AC-001, AC-003, AC-009, AC-010 | Catalog change; client (re)connect | Stores fetch once | Dependency-aware subject publication → loaded stores reload; `connected` → re-read | DS-002, DS-005 |
| BEH-004 | System | REQ-007–009; AC-004, AC-005 | Invalid or half-written files (shared or nested) | Dropped, catalog bricked, or team made unavailable | Last good kept plus issue at every level; first-seen invalid → issue only. Rendered surfaces: shared agent → its Agents-page card; nested node → its owning Team/Org card (unit-wide `catalogIssues`); unusable definitions → list notice (SR-008) | DS-002, DS-005 |
| BEH-005 | Contract | REQ-012; AC-008 | Run create/restore | Reads definition at start | Preserved; reads current (last good) | DS-003 |
| BEH-006 | User | REQ-013; AC-009 | GitHub Update | Explicit; rename swap | Preserved; Update's reconcile is published; the monitor re-arms the replaced root | DS-004, DS-001 |
| BEH-007 | User | REQ-011; AC-007 | Skill edits | Server fresh | **No change**: not watched, not published | DS-001 (allow-list) |
| BEH-008 | Contract | REQ-008, REQ-015, REQ-016; AC-005, AC-011, AC-012 | Invalid definitions; missing/replaced root; watch failure | Diagnostics unused; missing root drops teams/orgs | One diagnostics surface per subject; missing root keeps last good everywhere (admission included); truthful root status with runtime transitions | DS-001, DS-003, DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `probes/apar-cache-probe.test.ts` | Catalog-bricking defect | REQ-007, QR-004 | Per-definition reconcile; regression basis | Evidence |
| `probes/apar-watch-probe.test.ts`, `probes/apar-watch-probe2.test.ts` | Watch scope, latency, missing-path behavior | QR-001, QR-002, REQ-015 | Allow-list, in-process watch, ancestor watch and transitions | Evidence |
| `design-review-report.md` (ARCH-REV-001) | Review findings AR-001…AR-006 | REQ-002, REQ-005, REQ-007, REQ-009, REQ-015, REQ-016 | Revisions in this spec | Review artifact |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (feature plus defect fix plus refactor).
- Current design issue found: `Yes`.
- Structural triggers that fire, with evidence:
  - **Duplicated policy / state:** cached vs. fresh read paths. Two inventories of shared teams/orgs: the cache and the admission registry, with different duplicate rules. Two diagnostic surfaces.
  - **Authoritative boundary:** `getFresh*` bypasses the service cache.
  - **Legacy:** the fresh path compensates for stale caches.
  - **Missing invariant:** one bad file must not fail the catalog or remove a working definition, nested ones included.
- Root cause classification: `Boundary Or Ownership Issue` (no single owner of "current definitions"), plus `Missing Invariant` (per-definition failure isolation).
- Refactor needed now: `Yes`.
- Evidence: investigation source log; `9762a12df`; cache probe; ARCH-REV-001 P-001…P-004.
- Design response:
  - one catalog owner (units for nested definitions) behind the services;
  - one sync for change application;
  - admission enumerates the catalog;
  - one diagnostics surface;
  - remove the cache providers, the fresh path, the registry's shared enumeration and the old diagnostics query.
- Refactor rationale: a watcher on top of the existing paths would leave readers disagreeing (REQ-002) and would contradict DEC-001/DEC-005 for admission and nested definitions.
- Intentional deferrals and residual risk:
  - Application-owned definitions (application packages) are not monitored. They keep their full-reconcile trigger (readiness) and exact disk reads (out of scope).
  - The standalone application host gets the catalog without a monitor.
  - Templates stay disk reads.

## Terminology

- **Package root**: a registered definition root, either the app-data default root or an `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` entry (local or GitHub-managed).
- **Subject**: `agent`, `agent_team`, `agent_org`. GraphQL enum `DefinitionSubject` uses `AGENT | AGENT_TEAM | AGENT_ORG`.
- **Definition unit**: what the catalog reconciles as one item.
  - A shared agent.
  - A team unit: the team plus its `agents/<a>` team-local agents.
  - An org unit: the org plus its `agents/<a>` org-owned agents plus its `agent-teams/<t>` org-owned teams, each with their `agents/<a>`.
- **Node**: one definition inside a unit: the root definition or a nested one, addressed by its canonical definition ID as produced by the existing ID helpers.
- **Issue**: `{ code, reason, definitionPath, packageRoot }`, where `code` ∈ `DEFINITION_CONTRACT_INVALID`, `DEFINITION_FAMILY_MISMATCH`, `DEFINITION_SOURCE_MISSING`, `DEFINITION_IDENTITY_DUPLICATED`.
- **Diagnostic** (web surface): an issue, or an admission unavailability (`DEFINITION_REFERENCE_UNRESOLVED`, `DEFINITION_DEPENDENCY_UNAVAILABLE`, plus the issue codes), with `usingLastGood` and `dependencyChain`.
- **Settle window**: 1000 ms quiet, capped at 3000 ms from the first pending change.
- **Present**: a definition folder counts as present when at least one of its subject's two definition files exists.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope:
  - `CachedAgentDefinitionProvider` and `CachedAgentTeamDefinitionProvider`;
  - `getFreshAgentDefinitionById`, `getFreshDefinitionById` and `freshProvider`;
  - admission decode's disk pre-read;
  - `DefinitionSourceRegistry` enumeration of shared team/org roots and its dead `implementationPackageRoots` option;
  - GraphQL `definitionAdmissionDiagnostics` and its `DefinitionAdmissionDiagnostic` type;
  - `AgentPackageService` refresh dependencies;
  - the duplicated web socket lifecycle in `projectChangeFeed.ts`;
  - disk exact reads for nested IDs of shared units (they become catalog reads).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.
  - Application-owned exact reads and enumeration stay on disk because they are a different, out-of-scope source (application bundles), not a fallback for catalog subjects.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`.
- Package files are only read.
- Settings and the registry are unchanged.
- Catalog entries, last-good copies, issues and watcher status live in memory and are rebuilt at startup (approved acceptable loss).
- Run history and execution trees are untouched.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-006, BEH-007, BEH-008 | OS file event, or a root disappearing/reappearing/replaced | Pending unit change or root change recorded in the sync; root status updated | `PackageDefinitionMonitor` | Exact detection; skills excluded; truthful status |
| DS-002 | Bounded Local | BEH-001, BEH-003, BEH-004 | Settle timer or `settle()` | Units reconciled; dependency-aware subjects published | `DefinitionCatalogSync` | Last good, coalescing, serialization, publication |
| DS-003 | Primary End-to-End | BEH-001, BEH-005, BEH-008 | `delegate_task` / `list_available_agents` / agent, team or org run create/restore / Teams-Orgs queries | Current definition used; copy spawned | Definition services and `DefinitionAdmissionService` → sync | Primary journey (SCN-012) and team/org launch on one inventory |
| DS-004 | Primary End-to-End | BEH-002, BEH-006, BEH-008 | Initial population, Reload, package import/remove/update, application readiness | Full reconcile; monitor roots re-synced/re-armed; published | `DefinitionCatalogSync` | Registration and fallback |
| DS-005 | Return-Event | BEH-003, BEH-004 | Published batch | Web lists, `@`, cards, notices, package rows updated | Hub → web feed | Live web |

## Primary Execution Spine(s)

- DS-001: `OS event → PackageDefinitionMonitor (allow-list, grammar, root-state machine) → DefinitionCatalogSync.noteUnitChange(subject, unitId) | noteRootChanged(root)`
- DS-003 (agents): `delegate_task / list_available_agents / agent run launch → collaborator catalog / backend factory → AgentDefinitionService → sync.settle() → catalog (shared agent or nested node) → definition copy`
- DS-003 (teams/orgs): `delegate_task(team) / TeamRunService.create|restore / AgentOrgRunService.create / Teams-Orgs GraphQL → DefinitionAdmissionService.scan|requireAvailable → services (catalog-backed) → sync.settle() → catalog units → admission validation over catalog definitions → available | unavailable diagnostic`
- DS-004: `Reload / AgentPackageService / readiness / first settle() → sync.reloadAll() → readers enumerate all units → catalogs reconcile → monitor.syncRoots() → hub publish`
- DS-005: `sync batch → subject expansion → DefinitionCatalogChangeHub.broadcast → /ws/definition-catalog → web feed → stores reloadIfLoaded`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The monitor watches only the definition structure of each registered root. Each event path is classified into a **unit**: `agents/<a>` → `(agent, a)`; anything in `agent-teams/<t>/…` → `(agent_team, t)`; anything in `agent-orgs/<o>/…` → `(agent_org, o)`. Root presence is a small state machine (see bounded spines): runtime disappearance, reappearance and in-place replacement are detected, and each transition calls `noteRootChanged`. | Monitor, grammar, sync | Monitor | Root identity, status |
| DS-002 | The sync keeps a pending set of units. On settle, or when any read calls `settle()`, it runs one serialized reconcile: each reader reads each pending unit (root plus nested nodes) into an outcome tree, and the catalog applies the node rule recursively. The changed subjects are expanded by the dependency rule (agent → agent, agent_team, agent_org; agent_team → agent_team, agent_org, agent, the last because team-local agents are on the Agents page; agent_org → agent_org) and published once per batch. | Sync, readers, catalogs | Sync | Fingerprints, issues, subject expansion |
| DS-003 | Services gate on `settle()`. Shared agent IDs, team-local agent IDs and org-owned agent/team IDs are all served from catalog nodes (last good honored). Application-owned IDs stay disk reads. Admission enumerates catalog team/org entries, issue-only ones included, plus application-owned team sources from the registry. It decodes each through the services, applies its existing reference/dependency validation and duplicate diagnostics (duplicates now come from the readers), and returns available/unavailable. Team and org launch, the lists and delegation therefore all see one inventory. | Services, admission, sync, catalogs | Services (boundary); admission (validation) | Registry (application-owned only) |
| DS-004 | **Initial population**: the sync starts unpopulated; the first `settle()` awaits one initial `reloadAll()` in both hosts, and concurrent first reads share it. `reloadAll` enumerates all registered roots, reconciles every unit, removes units from unregistered roots, keeps last good for units of registered-but-missing roots (`DEFINITION_SOURCE_MISSING`), then calls the registration listener (studio: `monitor.syncRoots()`, which starts new roots, stops removed ones, and re-arms failed or replaced ones) and publishes `agent`, `agent_team`, `agent_org`, `agent_package` when anything or any root status changed. | Sync, readers, catalogs, monitor | Sync | Package service registration/rollback |
| DS-005 | The hub broadcasts `{type:"definitions_changed", subjects}` and `connected`. The web feed is retained app-wide while a node is bound. Each store that has loaded data reloads (network-only, in-flight de-duplicated, previous list kept on error). `connected` re-reads all loaded catalog stores and diagnostics. | Hub, route, feed, stores | Hub / feed | Auth, backoff, rebind |

## Spine Actors / Main-Line Nodes

`PackageDefinitionMonitor`, `DefinitionCatalogSync`, `DefinitionCatalog` (×3), source readers (×3), definition services (×3), `DefinitionAdmissionService`, `DefinitionCatalogChangeHub`, web `definitionCatalogChangeFeed` and catalog stores.

## Ownership Map

| Node | Owns |
| --- | --- |
| `PackageDefinitionMonitor` | Per-root watch lifecycle and the root state machine (`WATCHING`, `ROOT_MISSING`, `UNAVAILABLE`); the structural allow-list; path → unit classification; root directory identity (device + inode of the root and kind dirs at arm time) for replacement detection; the ancestor presence watch. It never reads definitions. |
| `DefinitionCatalogSync` | Initial population; pending units; settle timer; serialized reconcile queue; `settle()`, `reloadAll()`, `reconcileNow()`; the subject-expansion rule; batch publication; the registration listener. It is the sole writer of catalogs. |
| `DefinitionCatalog<TUnit>` | Units for one subject; the recursive node reconcile rule (last good, issue, removal, missing root); snapshot reads returning **copies**; exact node lookup by canonical ID; issues; change detection by fingerprint. No I/O. |
| Source readers | Enumerating present units per registered root in precedence order; reading one unit into an outcome tree with fingerprints. Agent reader: precedence first-root-wins (unchanged agent policy). Team and org readers: the **duplicate-identity policy** (an ID present in more than one registered root becomes an issue-only `DEFINITION_IDENTITY_DUPLICATED` unit, matching admission's existing rule) and family-mismatch classification. Readers reuse the file-provider parsers and codecs. |
| Definition services | The public boundary. Reads gate on `settle()`. Exact IDs: shared, team-local and org-owned → catalog; application-owned → file provider. Writes go through file providers, then `reconcileNow`. Issue accessors. |
| `DefinitionAdmissionService` | Admission validation over catalog units (reference/dependency/handoff compilation) plus the application-owned team sources from the narrowed registry; available/unavailable results; diagnostics for teams/orgs. It no longer enumerates package roots. |
| `DefinitionSourceRegistry` (narrowed) | Application-owned (implementation) team sources only. |
| `DefinitionCatalogChangeHub` | Connections; `connected` greeting; broadcast. |
| Web feed / stores | Socket lifecycle (shared `NodeChangeFeed`); subject → store reload routing; diagnostics display. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `api/websocket/definition-catalog.ts` | Hub | Transport plus remote-access auth | Change detection or state |
| GraphQL refresh mutations / package Reload | `sync.reloadAll()` via services/package service | Manual fallback (REQ-017) | Sequencing |
| GraphQL `definitionDiagnostics(subject)` | Services (agents) / admission (teams, orgs) | One web diagnostics surface per subject | Its own validation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `agent-definition/providers/cached-agent-definition-provider.ts` (+ tests `.ts`/`.js`) | The catalog owns the in-memory set | `DefinitionCatalog` + sync | In This Change | — |
| `agent-team-definition/providers/cached-agent-team-definition-provider.ts` (+ tests `.ts`/`.js`) | Same | Same | In This Change | — |
| `getFreshAgentDefinitionById`, `getFreshDefinitionById`, `freshProvider` | One current read path | `getAgentDefinitionById` / `getDefinitionById` | In This Change | Callers: AutoByteus backend factory (also remove its duck-typed probe), org service, org run service, built-in agent bootstrapper, admission, two skill-improvement resolvers, tests |
| `AgentDefinitionService.refresh()` alias | Dead if no caller remains (verify) | `refreshCache()` | In This Change | — |
| Admission `decode` disk pre-read | Readers apply the same codecs | Catalog unit plus issue | In This Change | — |
| `DefinitionSourceRegistry` enumeration of `getAgentTeamsDir`/`getAgentOrgsDir`/additional package roots | The catalog is the inventory (AR-002) | Catalog team/org units | In This Change | The registry keeps `listImplementationOwnedTeamSources` only; its `appConfig` dependency is removed |
| `DefinitionSourceRegistry` option `implementationPackageRoots` | Dead: no production caller passes it (only tests) | — | In This Change | Update the tests that pass it |
| GraphQL `definitionAdmissionDiagnostics` + `DefinitionAdmissionDiagnostic` type (`api/graphql/types/definition-admission.ts`) and its test | Replaced by one surface (AR-003); no web consumer | `definitionDiagnostics(subject)` | In This Change | The startup `DEFINITION_ADMISSION_UNAVAILABLE` log lines stay (internal) |
| Disk exact reads of team-local / org-owned IDs belonging to registered package roots | Catalog nodes hold them with last good (AR-004) | Catalog node lookup | In This Change | Application-owned team-local IDs stay disk reads |
| `AgentPackageService` deps `refreshAgentDefinitions` / `refreshAgentTeams` | One full reconcile (orgs were missing) | `reloadDefinitionCatalog` | In This Change | — |
| Web `ProjectChangeFeed` socket lifecycle | Needed twice | `NodeChangeFeed<TMessage>` | In This Change | Public API unchanged |
| GraphQL `AgentTeamDefinition.catalogIssue` / `AgentOrgDefinition.catalogIssue` (root-only, implemented in `9777af682`/`f7fcf9055`) | Root-only issues hide nested nodes (CR-004) | `catalogIssues` (unit-wide list) | In This Change (SR-008) | Update the converters, web queries, stores and card tests; `AgentDefinition.catalogIssue` stays |

## Return Or Event Spine(s) (If Applicable)

DS-005. Frame contract (zod-validated writer, like projects):

```json
{ "type": "connected" }
{ "type": "definitions_changed", "subjects": ["agent", "agent_team", "agent_org", "agent_package"] }
```

**Subject expansion (AR-001)**: the sync computes `published = expand(changedSubjects)`.

| Changed subject | Published subjects |
| --- | --- |
| `agent` | `agent`, `agent_team`, `agent_org` (team/org availability depends on agents) |
| `agent_team` | `agent_team`, `agent_org` (orgs reference teams), and `agent` (team-local agents are listed on the Agents page) |
| `agent_org` | `agent_org` |
| root status / registration | adds `agent_package` |

## Bounded Local / Internal Spines (If Applicable)

- **`DefinitionCatalogSync`: population, settle and reconcile.**
  - `first settle() → reloadAll() (shared promise; not cached if it throws) → populated`
  - `noteUnitChange(subject, unitId) → pending.add → (re)arm timer (quiet 1000 ms, cap 3000 ms) → fire or settle() → take pending → enqueue reconcile → reader.readUnit(id) → catalog.apply(tree) → changed subjects → expand → hub.publish`
  - `noteRootChanged(root) → pending.addRoot(root) → reconcile all units of that root`
  - The queue is serialized. `settle()` awaits population, then the pending batch, then the queue tail. With nothing pending, it resolves immediately.
  - Per-unit read errors become issues and never fail a batch. An unexpected infrastructure error fails that batch, is logged, and leaves the units pending for the next settle.
- **`PackageDefinitionMonitor`: root state machine (AR-005).**

```
syncRoots(registered):
  new root      → root exists ? arm(root) [WATCHING, record identity] : watchAncestor(root) [ROOT_MISSING]
  removed root  → close watcher/ancestor watch; drop status
  existing root → identity changed (rename swap) or status UNAVAILABLE ? re-arm : keep
arm(root): chokidar on <root>/{agents,agent-teams,agent-orgs} with the allow-list; record dev+ino of <root>
on unlinkDir(<root>/<kind>) or unlinkDir(<root>) or watcher 'error':
  stat(root): missing → close watcher; watchAncestor(root); ROOT_MISSING; sync.noteRootChanged(root)
              present but identity changed → re-arm; sync.noteRootChanged(root)
              present, same identity, error → UNAVAILABLE(reason) (ENOSPC/EMFILE/…); keep last state
on ancestor event revealing <root>: close ancestor watch; arm(root); WATCHING; sync.noteRootChanged(root)
watchAncestor(root): nearest existing ancestor, depth 0, watching only the next path segment toward root
```

  - GitHub Update (rename swap) is covered twice: the swap's `unlinkDir`/identity change, and the `reloadAll()` that Update already calls, which triggers `syncRoots` (identity check → re-arm).
  - Each status change publishes `agent_package`.
- **Startup order (studio).** `createHostDefinitionServices` (sync unpopulated) → create the hub and monitor → `monitor.syncRoots(registeredRoots)` (watchers start; events queue as pending) → the existing startup `admission.scan()` performs the first `settle()` → initial `reloadAll()`. Starting the watcher first closes the startup gap (residual P-005). The standalone host has no monitor; its first read populates the same way.
- **Built-in agent bootstrap (AR-006).** Write/sync every built-in agent's files → `agentDefinitionService.refreshCache()` (full reconcile) → resolve each with `getAgentDefinitionById` → initialize setting defaults. This replaces the per-agent fresh resolve plus the trailing refresh.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Path grammar (`definition-structure-paths.ts`) | DS-001 | Monitor | `isWatchedDefinitionPath`, `classifyDefinitionUnit(root, path) → {subject, unitId} \| null` | One exact layout statement | Drift from the readers' layout |
| Root identity | DS-001 | Monitor | dev+ino snapshot per armed root | In-place replacement detection | Stale handles, false `WATCHING` |
| Fingerprint | DS-002 | Readers | SHA-256 of each node's two definition files; the unit fingerprint is the ordered combination | Publish only real changes; ignore in-app-write echoes | Reload storms |
| Issue construction | DS-002 | Readers | Read errors → issue codes plus reason plus path | REQ-009 | — |
| Subject expansion | DS-002, DS-005 | Sync | Dependency table above | AR-001 | Stale dependent lists |
| Diagnostics projection | DS-005 | GraphQL resolver | Agents: catalog issues; teams/orgs: admission unavailability (which carries catalog issues) plus `usingLastGood` issues on available units | One surface (AR-003) | Duplicate shapes |

## Ownership Boundaries

- Services are the only public definition boundary. Callers never touch catalogs, readers, the sync or file providers.
- The sync is the only catalog writer. The monitor only reports changes.
- Admission depends on the services, not on disk enumeration, for package-root subjects. The registry is limited to application-owned sources.
- `AgentPackageService` owns registration. It calls `reloadDefinitionCatalog` and reads the monitor's root status through a narrow port.
- The hub owns transport fan-out only.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Definition services | Sync, catalogs, readers, file providers | All readers/writers, including admission | Reading files or providers for a "fresher" copy; enumerating package roots outside the catalog | Add a subject-specific service method (e.g. `listTeamUnitsForAdmission()`) |
| `DefinitionAdmissionService` | Validation, compilation, registry (application-owned) | Team/org lists, team/org run create/restore, diagnostics resolver | Callers validating teams/orgs themselves | — |
| `DefinitionCatalogSync` | Pending set, timer, queue, catalogs | Services, monitor (`noteUnitChange`/`noteRootChanged`), composition | Mutating catalogs elsewhere | Add an explicit sync command |
| Hub | Connections | Sync, route | Others sending frames | — |

## Dependency Rules

- **Allowed:**
  - `monitor → sync`;
  - `sync → readers, catalogs`, publish callback → hub, registration listener → monitor (wired by composition);
  - `services → sync, file providers` (file providers only for application-owned exact reads and writes);
  - `readers → file providers / codecs / ID helpers`;
  - `admission → services, registry`;
  - `package service → reload port, root-status port`.
- **Forbidden:**
  - anything except the sync → catalogs;
  - anything → package-root enumeration except the readers;
  - per-caller fresh reads;
  - the monitor parsing definitions;
  - the hub importing definition modules;
  - the `definition-catalog` subsystem importing run-execution, collaboration, admission or GraphQL.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentDefinitionService.getAgentDefinitionById(id)` | Agent | Current definition copy (settled) | Shared ID; team-local or org-owned canonical ID → catalog node; application-owned canonical ID → disk | Existing parsers decide the subject |
| `getAllAgentDefinitions()` / `getVisibleAgentDefinitions()` | Agent | Shared (plus application-owned list) / plus team-local nodes of shared team units | — | Visible list from the catalog only |
| `AgentTeamDefinitionService.getDefinitionById / getAllDefinitions` | Team | Shared team units; org-owned team nodes; application-owned on disk | Shared, org-owned or application-owned ID | — |
| `AgentOrgDefinitionService.getDefinitionById / getAllDefinitions` | Org | Org units | Shared org ID | — |
| `*.listDefinitionIssues()` / `getDefinitionIssue(id)` | Per subject | Catalog issues (nested included) | Canonical IDs | Used by GraphQL and admission |
| `*.refreshCache()` | All | `sync.reloadAll()` | — | Manual/readiness/bootstrapper |
| `DefinitionAdmissionService.scan()` / `requireAvailable(kind, id)` | Team/org admission | Over catalog units plus application-owned team sources | `agent_team` / `agent_org` + ID | Duplicate results come from reader issues |
| `DefinitionCatalogSync.noteUnitChange(subject, unitId)` / `noteRootChanged(root)` / `settle()` / `reloadAll()` / `reconcileNow(subject, unitIds)` | Change application | — | — | — |
| `PackageDefinitionMonitor.syncRoots(roots)` / `getRootWatchStatus(root)` / `close()` | Watch lifecycle | — | Absolute roots | — |
| GraphQL `AgentDefinition.catalogIssue` | Agent | Issue on a last-good shared agent (an agent is one node) | — | Nullable `DefinitionCatalogIssue {code, reason, definitionPath, packageRoot}` |
| GraphQL `AgentTeamDefinition.catalogIssues`, `AgentOrgDefinition.catalogIssues` (SR-008; **replace** the root-only `catalogIssue` on these two types) | Team unit / org unit | **Every** issue in the unit: the root node plus each nested node (team-local agents; org-owned agents, org-owned teams and their local agents). Root first, then nested nodes in path order | — | Non-null list of `DefinitionUnitIssue {subject: DefinitionSubject!, definitionId, name (nullable; last-good name when known), code, reason, definitionPath, packageRoot, usingLastGood}`. Empty list when the unit is clean |
| GraphQL `definitionDiagnostics(subject: DefinitionSubject!)` | Per subject | **The** web diagnostics surface: definitions not usable (issue-only, admission-unavailable) plus last-good issues (`usingLastGood: true`) | Enum `AGENT \| AGENT_TEAM \| AGENT_ORG` | Replaces `definitionAdmissionDiagnostics`. Type `DefinitionDiagnostic {subject, definitionId, code, reason, definitionPath, packageRoot, usingLastGood, dependencyChain}` |
| GraphQL `AgentPackage.autoRefresh { state, message }` | Package root | Root watch status | — | `WATCHING \| ROOT_MISSING \| UNAVAILABLE` |
| WS `/ws/definition-catalog` | Catalog changes | Frames above | — | Remote-access auth |

## Interface Boundary Check

| Interface | Responsibility Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Service `get…ById` | Yes | Yes (canonical ID helpers) | Low | — |
| `definitionDiagnostics(subject)` | Yes | Yes (enum) | Low | — |
| `noteUnitChange(subject, unitId)` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Monitor | `PackageDefinitionMonitor` | Yes | Low | — |
| Sync | `DefinitionCatalogSync` | Yes | Low | — |
| Store | `DefinitionCatalog` | Yes | Low | — |
| Unit | `DefinitionUnit` (shared agent / team unit / org unit) | Yes | Low | — |
| Readers | `AgentDefinitionSourceReader` (etc.) | Yes | Low | — |
| Hub | `DefinitionCatalogChangeHub` | Yes | Low | — |
| Diagnostics | `DefinitionDiagnostic` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| File watching | chokidar; file-explorer runtime | Reuse chokidar only | Per-workspace runtime protocol and workspace ignore policy do not fit; about 300 dirs in process is proportionate |
| Parsing / codecs / IDs | File providers, parsers, `team-local-definition-id`, `agent-org-owned-definition-id`, org-owned source index | Reuse | Single parsing and identity authority |
| Admission validation | `DefinitionAdmissionService`, `assertValidFlatTeamDefinition`, `AgentOrgDefinitionResolver`, `CollaborationHandoffCompiler` | Reuse; change enumeration only | Keeps the established reference/dependency policy |
| Duplicate-identity policy | Admission (unavailable) | Move into the team/org readers, same semantics | Single inventory owner |
| Diagnostics vocabulary | `definition-admission-result.ts` codes | Reuse; add `DEFINITION_SOURCE_MISSING`, `DEFINITION_IDENTITY_DUPLICATED` | Consistent wording |
| Push | Projects hub/feed | Same pattern; extract `NodeChangeFeed` | Proven reconnect |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `src/definition-catalog/` | Catalog, units, sync, readers, grammar, monitor, hub/messages | DS-001, DS-002, DS-004, DS-005 | Create New |
| Definition subsystems | Service boundary, file providers (parsing, writes, application-owned reads) | DS-003 | Modify |
| `collaboration-definition-admission` | Validation over catalog units; registry narrowed to application-owned | DS-003 | Modify |
| `agent-packages` | Registration → reload; `autoRefresh` | DS-004 | Modify |
| `built-in-agents` | Bootstrap order | DS-004 | Modify |
| `compositions`, `api/websocket`, `api/graphql/types` | Wiring, route, fields/queries | DS-004, DS-005 | Modify |
| Web | Shared feed, definition feed, stores, UI | DS-005 | Create / Modify |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `src/definition-catalog/domain/definition-catalog-types.ts` | Catalog | `DefinitionSubject`, `DefinitionCatalogIssue` (+ codes), `NodeReadOutcome<T>` (`valid {definition, fingerprint}` / `invalid {issue}` / `absent`), `UnitReadOutcome` (root node outcome plus child outcomes keyed by canonical ID), `DefinitionUnitRef {subject, unitId, packageRoot, unitDir}` |
| `src/definition-catalog/services/definition-catalog.ts` | `DefinitionCatalog` | Units map; recursive node rule; copy-returning reads; node lookup by canonical ID; issues |
| `src/definition-catalog/services/definition-catalog-sync.ts` | Sync | Population, pending, timer (injectable constants), queue, `settle`/`reloadAll`/`reconcileNow`, subject expansion, publish callback, registration listener |
| `src/definition-catalog/providers/agent-definition-source-reader.ts` | Reader | Shared agent enumeration (first root wins) plus application-owned list sources; read → node outcome |
| `src/definition-catalog/providers/agent-team-definition-source-reader.ts` | Reader | Team units (team plus local agents); duplicate-identity rule; family mismatch |
| `src/definition-catalog/providers/agent-org-definition-source-reader.ts` | Reader | Org units (org plus owned agents plus owned teams with local agents, via the existing org-owned source index); duplicate rule; family mismatch |
| `src/definition-catalog/monitor/definition-structure-paths.ts` | Grammar | Allow-list plus unit classification |
| `src/definition-catalog/monitor/package-definition-monitor.ts` | Monitor | Watchers, root state machine, identity, ancestor watch, status, `syncRoots`, `close` |
| `src/definition-catalog/changes/definition-catalog-change-messages.ts`, `definition-catalog-change-hub.ts` | Hub | Contract plus broadcast |
| `src/api/websocket/definition-catalog.ts` (+ `index.ts` registration) | Route | `/ws/definition-catalog` with remote-access auth |
| `src/agent-definition/providers/file-agent-definition-provider.ts` | File provider | Classified node reads used by readers (shared, team-local, org-owned paths); writes; application-owned exact reads. Shared enumeration and visible listing move to the reader/service |
| `src/agent-team-definition/providers/file-agent-team-definition-provider.ts`, `src/agent-org-definition/providers/file-agent-org-definition-provider.ts` | File providers | Classified node reads; writes; application-owned exact reads |
| `src/agent-definition/services/agent-definition-service.ts`, `agent-team-definition/services/agent-team-definition-service.ts`, `agent-org-definition/services/agent-org-definition-service.ts` | Services | Catalog-backed reads (`settle()` gate, copies), writes → `reconcileNow`, issue accessors, fresh path removed |
| `src/collaboration-definition-admission/services/definition-admission-service.ts` | Admission | `scan()` = catalog team/org units (via services) plus registry application-owned teams; decode via services/issues; validation unchanged; duplicate results from reader issues |
| `src/collaboration-definition-admission/providers/definition-source-registry.ts` | Registry | Application-owned team sources only (`appConfig` and `implementationPackageRoots` removed) |
| `src/application-platform/definitions/create-bundle-backed-definition-services.ts`, `src/compositions/host-definition-services.ts` | Composition | Readers → catalogs → sync → services → admission; expose the sync |
| `src/compositions/build-studio-server.ts` | Composition | Hub plus monitor (`syncRoots` before the first scan), publish and registration wiring, close order monitor → hub → definitions |
| `src/built-in-agents/built-in-agent-bootstrapper.ts` | Bootstrap | Write all → `refreshCache()` → resolve → defaults |
| `src/agent-packages/services/agent-package-service.ts`, `agent-package-mappers.ts`, `api/graphql/types/agent-packages.ts` | Packages | `reloadDefinitionCatalog`; `autoRefresh` |
| `src/api/graphql/types/agent-definition.ts`, `agent-team-definition.ts`, `agent-org-definition.ts` (+ converters) | GraphQL | `catalogIssue`; refresh mutations → `refreshCache()` |
| `src/api/graphql/types/definition-diagnostics.ts` (replaces `definition-admission.ts`) | GraphQL | `DefinitionSubject` enum, `DefinitionDiagnostic` type, `definitionDiagnostics(subject)` |
| Fresh-path callers (Removal Plan) | Various | Switch to the service reads |
| Web `services/nodeChangeFeed/nodeChangeFeed.ts`; `services/projects/projectChangeFeed.ts` | Web | Extracted lifecycle; projects unchanged behavior |
| Web `services/definitionCatalog/definitionCatalogChangeFeed.ts`, `composables/definitionCatalog/useDefinitionCatalogChangeFeed.ts`, `utils/nodeEndpoints.ts` | Web | Feed, app-layout retention, endpoint `definitionCatalogWs` |
| Web stores `agentDefinitionStore.ts`, `agentTeamDefinitionStore.ts`, `agentOrgDefinitionStore.ts`, `agentPackagesStore.ts` (+ a small `definitionDiagnosticsStore.ts` or per-store diagnostics) | Web | `reloadIfLoaded()`; `catalogIssue`; `definitionDiagnostics(subject)` |
| Web `components/definitions/DefinitionCatalogIssueBadge.vue` | UI | SR-008: accepts a list of issues (the agent card passes its single issue as a one-item list). Summary shows the count. Status text: "Using last working version" when all entries have `usingLastGood`; "Some members couldn't be loaded" when any entry is not usable; the existing source-missing text when the root issue is `DEFINITION_SOURCE_MISSING`. The expanded body lists each entry: the name or definition folder, the file, and the reason |
| Web `components/agents/AgentCard.vue`, `agentTeams/AgentTeamCard.vue` (uses `teamDef.catalogIssues`), `agentOrgs/AgentOrgCatalogCard.vue` (uses `org.catalogIssues`), `AgentList.vue`, `AgentTeamList.vue`, `settings/AgentPackagesManager.vue`, `definitions/DefinitionDiagnosticsNotice.vue` (unchanged role: unusable definitions only) | UI | Issue badge on the affected card. Nested definitions surface on their **owning** team/org card, because team-local agents are intentionally not listed on the Agents page (`AgentList.vue` filter, existing behavior). List notice for unusable definitions; package row auto-refresh state |
| Web GraphQL documents, `generated/graphql.ts`, `localization/messages/{en,zh-CN}/*` | Web | Contract and strings |

## Reconcile Rules (`DefinitionCatalog.apply`, applied to every node of a unit)

| Read outcome for node | Previous node | Result | Published? |
| --- | --- | --- | --- |
| `valid` | any | Set definition plus fingerprint; clear issue | If new, fingerprint differs, or the issue cleared |
| `invalid` (present) | has definition | Keep definition (last good); set issue | If the issue is new or changed |
| `invalid` | none | Issue-only node (`get` → null; listed in diagnostics) | If the issue is new or changed |
| `absent` (unit or nested folder gone; root registered and present) | any | Remove the node (and its children) | If it existed |
| Unit's root registered but missing | has definition | Keep the whole unit; set `DEFINITION_SOURCE_MISSING` on the root node | If the issue is new |
| Root unregistered (full reconcile) | any | Remove the unit | Yes |
| Team/org ID present in more than one registered root | any | Issue-only unit `DEFINITION_IDENTITY_DUPLICATED` listing the paths (admission's existing rule; last good does not apply because this is a contract conflict, not a broken edit) | If changed |

- **Precedence:**
  - Agents: the first registered root where the ID is present wins, then application-owned list sources for unseen IDs (current agent policy).
  - Teams/orgs: a unique presence is required (duplicate rule above).
- **Nested invalid parent:** a broken `team.md` keeps the team's last good definition while its local agents are reconciled independently. A nested folder's removal removes only that node.

## Path Grammar (allow-list; per root)

```
agents/<a>/                         dir      → unit (agent, a)
agents/<a>/{agent.md,agent-config.json}      → unit (agent, a)
agent-teams/<t>/                    dir      → unit (agent_team, t)
agent-teams/<t>/{team.md,team-config.json}   → unit (agent_team, t)
agent-teams/<t>/agents/[<a>/[agent files]]   → unit (agent_team, t)        (team-local node)
agent-orgs/<o>/                     dir      → unit (agent_org, o)
agent-orgs/<o>/{org.md,org-config.json}      → unit (agent_org, o)
agent-orgs/<o>/agents/[<a>/[agent files]]    → unit (agent_org, o)          (org-owned agent node)
agent-orgs/<o>/agent-teams/[<t>/[team files | agents/[<a>/[agent files]]]] → unit (agent_org, o)
everything else (skills/, docs, scripts, .git, node_modules, other files, "_"-prefixed names) → not watched
```

The monitor arms `<root>/agents`, `<root>/agent-teams` and `<root>/agent-orgs`. A missing kind dir under a present root is detected (probe). A missing or removed root is handled by the root state machine.

## Applied Patterns (If Any)

- **Store** (`DefinitionCatalog`) served by the sync.
- **Strategy:** three readers behind `DefinitionSourceReader<TUnit>`.
- **Debounced worker loop** (sync).
- **State machine** (monitor root lifecycle).
- **Hub/broadcast.**

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/definition-catalog/domain/` | Folder | Catalog | Types | I/O |
| `autobyteus-server-ts/src/definition-catalog/services/` | Folder | Catalog, sync | State, rules, sequencing | chokidar, GraphQL, admission |
| `autobyteus-server-ts/src/definition-catalog/providers/` | Folder | Readers | Enumerate/read units | Catalog mutation |
| `autobyteus-server-ts/src/definition-catalog/monitor/` | Folder | Monitor, grammar | Watching, classification, root state | Parsing |
| `autobyteus-server-ts/src/definition-catalog/changes/` | Folder | Hub | Broadcast contract | Business logic |
| `autobyteus-web/services/nodeChangeFeed/` | Folder | Shared feed | Socket lifecycle | Store logic |
| `autobyteus-web/services/definitionCatalog/` | Folder | Definition feed | Routing | Socket lifecycle |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `src/definition-catalog/*` | Mixed justified | Yes | Low | Mirrors existing subsystem layouts |
| `services/nodeChangeFeed` | Off-spine transport | Yes | Low | Two consumers |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Delegation read | collaborator catalog → `agentService.getAgentDefinitionById(id)` → `settle()` → catalog copy | Collaboration calling file providers, or keeping `getFresh…` | One authority |
| Team created before its agents (AR-001) | Team files settle → `agent_team` changed → publish `agent_team, agent_org, agent` → Teams list: unavailable (diagnostic "member X unresolved"). Agent files settle → `agent` changed → publish `agent, agent_team, agent_org` → Teams store reloads → team now available | Publishing only `agent`, so the Teams page never shows the team | Dependent lists |
| Nested last good (AR-004, surface per SR-008/CR-004) | `agent-teams/t/agents/a/agent-config.json` broken → unit `(agent_team, t)` reconciled → node `t/a` keeps last good plus issue → `requireAvailable(team t)` succeeds → publish `agent_team, agent_org, agent` → the Teams page card for `t` shows the badge ("Using last working version (1)"), and expanding it shows `a`, `…/agents/a/agent-config.json` and the reason. For an org-owned agent/team, the badge is on the owning org's card on the Orgs page | Team `t` becomes unavailable; `a` silently disappears; or the issue exists only in the API, with no rendered surface (the CR-004 defect: SR-007 wrongly assumed an Agents-page card for team-local agents) | DEC-001, REQ-009 |
| Missing root (AR-002/005) | Root renamed away → `unlinkDir(<root>/agents)` → stat: missing → ancestor watch, `ROOT_MISSING`, `noteRootChanged` → units kept with `DEFINITION_SOURCE_MISSING` → admission (catalog) keeps teams/orgs listed and launchable; the package row shows "Folder not found". Renamed back → ancestor event → arm → `WATCHING` → reconcile → issues cleared | Admission `readdir` returning nothing, so teams vanish while `list_available_agents` still lists them | One inventory |
| GitHub Update (AR-005) | Rename swap → `unlinkDir`/identity change → re-arm; Update's own `reloadAll()` → `syncRoots` identity check → re-arm (idempotent) | Watches left on the moved backup with `WATCHING` shown | Truthful status |
| In-app save | `service.update → fileProvider.update → sync.reconcileNow` → return a copy | Mutating the catalog's stored object | Last-good integrity |
| Half-written create | `mkdir agents/x` (absent, no issue) → files written → settle → valid | Flashing an error for an empty folder | Presence rule |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `getFresh…` for some paths | They read disk today | Rejected | Removed |
| Keep the cache providers beside the catalog | Smaller diff | Rejected | Replaced |
| Keep admission's disk enumeration for shared teams/orgs | Existing behavior | Rejected | Catalog inventory; duplicate rule moved into the readers |
| Keep `definitionAdmissionDiagnostics` beside the new query | Existing API | Rejected | One `definitionDiagnostics(subject)` |
| Keep nested exact disk reads | "As today" | Rejected | Catalog nodes |
| Duplicate the projects socket lifecycle | Faster | Rejected | `NodeChangeFeed` |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Catalog core.** Types, units, `DefinitionCatalog` (recursive rules), readers (classified node reads, unit enumeration, duplicates, family mismatch, fingerprints), sync (population, settle, queue, expansion). Unit tests: the rules tables, precedence, duplicates, nested last good, settle/flush/serialization, subject expansion, the bricking regression.
2. **Services and admission onto the catalog.**
   - Remove the cache providers and the fresh path; migrate callers.
   - Nested exact IDs → catalog nodes.
   - Admission: enumerate the catalog plus the narrowed registry; decode via services.
   - Bootstrapper order; `refreshCache → reloadAll`; in-app writes → `reconcileNow`; composition.
   - Run the full server unit and integration baseline and typecheck.
3. **Monitor.** Grammar, the root state machine and identity, studio wiring (arm before the first scan), registration listener, package `reloadDefinitionCatalog` plus `autoRefresh`. Integration tests with real temp roots: AC-001–006, AC-011, AC-012 ("watching → renamed away → restored → events resume", and "rename swap → re-armed"), AC-015, AC-016, plus a team-before-agents journey for AR-001.
4. **Push and GraphQL.** Hub, route, publication with expansion; `catalogIssue`, `definitionDiagnostics`, `autoRefresh`; remove `definitionAdmissionDiagnostics`.
5. **Web.** `NodeChangeFeed` extraction (projects parity tests); definition feed plus retention; stores `reloadIfLoaded`; badges, notices, package row; localization; generated types.
6. **Cleanup.** Dead-code sweep in touched files. Docs go to delivery (agent definitions/packages modules, web `agent_management.md`, `agent_teams.md`, `agent_orgs.md`, `settings.md`).

## Key Tradeoffs

- **In-process chokidar.** About 300 dirs (163 measured for the largest package). On macOS it is fd-neutral; on Linux expect about 400–700 inotify watches. Close is fast. The child-process runtime's rationale (blocking close of large workspace watchers) does not apply, and reusing it would need a protocol change plus one process per root. Escalate if Linux measurements break QR-002.
- **Structural allow-list instead of workspace ignore rules.** It is exact for the definition layout and cannot hide legitimately named folders. This satisfies QR-002 "where suitable".
- **Definition units for nested definitions.** Reconciling a team or org as one unit costs a few extra small file reads per change and gives last good at every level with one fingerprint per node. The alternative, a separate catalog for nested IDs, would duplicate the parent-child ownership already encoded in the ID helpers.
- **Duplicate policy for teams/orgs moves into the readers unchanged.** Agents keep first-root-wins. The two subjects differ today, and REQ-002 is about readers agreeing, not about changing policies.
- **Watch every registered root uniformly (DSN-001).** No polling or download. Update's swap is handled by identity re-arm.
- **Flush-on-read.** A read inside a burst may reconcile a partial state. Last good protects existing nodes, and a brand-new node may be briefly absent. A long burst can split into a few publications, bounded by the read rate (AC-006 test asserts a bound, not exactly one).
- **Publish by subject with dependency expansion.** Small frames; the web refetches through GraphQL.

## Risks

- Linux/Docker watch limits → `UNAVAILABLE` status plus manual Reload (REQ-016).
- Events lost on sleep or on exotic filesystems → Reload; any full reconcile is authoritative.
- **Catalog object identity:** the catalog must return copies. `stripMandatoryProcessors` and `updateAgentDefinition` mutate objects today, so they must operate on copies; a failed write must leave last good untouched.
- Test churn: about 14 files for the fresh/cache APIs, plus admission and registry tests (the `implementationPackageRoots` users) and the diagnostics GraphQL test.
- Reconciling a large org unit reads all its nested files (tens of small files): negligible.

## SR-008 Verification Additions (CR-004)

- **Source review** must trace each nested kind to a rendered surface:
  - team-local agent → Team card;
  - org-owned agent → Org card;
  - org-owned team and its local agent → Org card.
- **Web component tests:** the badge with one-item and multi-item lists; mixed `usingLastGood` text; the Team and Org cards render nested issues.
- **Server:** a GraphQL test that `catalogIssues` contains root plus nested nodes, in order, and is empty when clean.
- **API/E2E:** re-run DESK-002 nested and add the org-owned case. Expect the badge to appear within 5 s of breaking and to clear after the fix.

## Guidance For Implementation

- Make the settle constants injectable (a long quiet window for AC-016 determinism, short for speed).
- Never `clear()` a catalog. Reconcile per unit; swap nodes; return copies.
- `settle()` awaits population, then the pending batch, then the queue. Infrastructure errors leave units pending; they never brick reads.
- Arm the monitor before the first scan. Startup must not wait for watcher readiness.
- Close order: monitor → hub → definition services.
- Assert through service reads, admission results, published frames and the monitor's own status, not through chokidar `getWatched()`.
- On Linux runs, record the measured watch count (QR-002 evidence).
- Web `reloadIfLoaded` keeps the previous list while reloading and on error.
- Follow `TESTING.md`:
  - **Server:** unit plus integration baseline plus typecheck.
  - **Web:** `test:nuxt` plus a browser dev-path probe for live list updates.
  - **Desktop:** an isolated desktop instance for the user journey (the Agent Package Creator adds an agent and a team, and both appear in `@` and on the Teams page without a refresh; a broken nested agent keeps its team usable, with a badge).
