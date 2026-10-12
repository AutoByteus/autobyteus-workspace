# Implementation Handoff — `agent-package-auto-refresh`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected (Large / High). ARCH-REV-002 **Pass** with implementation notes N-1 (mandatory) … N-4; ARCH-REV-003 **Pass** (SR-008) with N-5, N-6; ARCH-REV-004 **Pass** (SR-009 naming plus application-package accuracy change) with mandatory N-7. Route after implementation: source review (naming delta plus the application-package list change), then API/E2E rerun (path, frame, fields), test review, delivery (redo docs sync). Exact recipient from `get_handoff_rules`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/requirements-doc.md` (approved at SR-005; editorial SR-007, SR-008 DSN-004, SR-009 DSN-005)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/solution-revision-record.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/solution-handoff.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-spec.md` (SR-009; § Naming (SR-009, authoritative))
- Supplemental task artifacts: probes in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/probes/` (evidence only); implementation evidence in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-evidence/`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md` (ARCH-REV-004 Pass, SR-009 delta)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-report.md` and `code-review-revision-record.md` (CRR-006, Fail — Design Impact: naming, CR-005…CR-011), resolved by SR-009 / ARCH-REV-004. Earlier: CRR-003 (CR-004, resolved in IR-003), CRR-001 (CR-001…CR-003, resolved in IR-002).

## Current Implementation Summary

- Implementation cycle: `Rework` (revised design SR-009 after the CRR-006 naming Design Impact)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-revision-record.md`
- Current implementation revision ID: `IR-004` (IR-001 baseline, IR-002 CRR-001 local fixes, IR-003 SR-008 nested load issue surface, IR-004 SR-009 naming and application-package definitions read on demand)
- Related solution revision IDs: `SR-005` (approval), `SR-007`, `SR-008`, `SR-009` (design)
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`, `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001` … `CRR-006`
- Related API/E2E revision IDs: `API-REV-001`, `API-REV-002`
- Related delivery revision IDs: `DR-001` (superseded), `DR-002` (on hold)
- Triggering finding IDs: `CR-005` … `CR-011` (this round; note N-7; optional R-2 applied); earlier `CR-001` … `CR-004`, `R-1`
- Branch / commits: `codex/agent-package-auto-refresh` (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh`), fast-forwarded to `origin/personal@359d2c0ef` before any change, then:
  - `9777af682`, `0cd763fd0`, `f7fcf9055` — IR-001 (server subsystem, smoke/harness fix, web)
  - `3cc17135f` — IR-002 (CRR-001 local fixes)
  - `bd4c63796` (+ `214836c83` docs) — IR-003 (SR-008)
  - `a28465175`, `6b3a10822`, `33d290187` — API/E2E test commits (not mine); `8187bac0f` merge of `origin/personal`; `061ea7ab3` delivery docs; ticket checkpoints by other roles
  - IR-004 commit — see `git log` (the commit after `061ea7ab3` whose subject starts `refactor: rename the definition catalog to agent package definitions`)

What exists now (names per `design-spec.md` § Naming (SR-009)):

- **Server `src/agent-package-definitions/`** — `domain/agent-package-definition-types.ts` (`AgentPackageDefinitionKind`, `AgentPackageDefinitionList`, `DefinitionLoadIssue(Code)`, `DefinitionLoadIssueEntry`, `DefinitionReadResult` / `KindDefinitionReadResult` with a `status` discriminator, `DefinitionFolderRef {kind, folderId}`, `DefinitionFolderLocation {packageRoot, folderDir, sourceClass}`, `DefinitionFolderReadResult {status, location, root, nested}`, `DefinitionFolderReader(s)`), `domain/definition-files.ts` (file helpers, fingerprint, `errorText`, the shared `kindFoldersUnreadableError`), `domain/registered-package-roots.ts`; `services/agent-package-definition-store.ts` (`AgentPackageDefinitionStore`: definition folders, the per-definition last-good rule, copy-returning reads, `folderOf`, `listFolderRoots`, `listNestedDefinitions`, `listLoadIssueEntries`, `listFolderLoadIssues`, `getFolderLoadIssues`); `services/agent-package-definition-reloader.ts` (`AgentPackageDefinitionReloader`, the only store writer: first load, pending changed folders, 1000 ms quiet / 3000 ms cap settle window, `applyPendingChanges()` flush-on-read with trailing re-check, serialized queue, coalesced `reloadAllPackages()`, `reloadFoldersNow(kind, ids)`, `markFolderChanged`, `markPackageFolderChanged`, `listsAffectedBy`, announcements, registration listener, per-package readability isolation); `services/agent-package-definitions.ts` (`AgentPackageDefinitions {store, reloader}`, `createAgentPackageDefinitions`, `getProcessAgentPackageDefinitions`, `resetProcessAgentPackageDefinitionsForTests`); `providers/` (`AgentFolderReader`, `AgentTeamFolderReader`, `AgentOrgFolderReader`, `definition-folder-presence.ts`); `monitor/` (`agent-package-layout.ts` allow-list; `AgentPackageFolderWatcher` with `WATCHING` / `FOLDER_MISSING` / `UNAVAILABLE`, dev+ino identity, parent-folder presence watch, ancestor watch while missing); `changes/` (zod frame contract + `AgentPackageDefinitionChangeHub`).
- **Definition reads** — classified per-definition reads live with their subjects (`agent-definition-node-reader.ts`, `agent-team-definition-node-reader.ts`, `agent-org-definition-node-reader.ts`, now returning `status: valid | invalid | absent`). The file providers reuse their builders for write results, application-package reads and startup migrations.
- **Services** — the three definition services read the store behind `reloader.applyPendingChanges()`; writes go through the file providers and then `reloadFoldersNow` on the owning definition folder (`store.folderOf`, N-3). Application-package agents and Teams are **not** in the store (SR-009): `getAllAgentDefinitions()` / Team `getAllDefinitions()` merge `FileAgentDefinitionProvider.listApplicationOwnedAgents()` / `FileAgentTeamDefinitionProvider.listApplicationOwnedTeams()` on demand, isolated per definition (N-7); exact application-package IDs stay file-provider reads. Load issue accessors: `listLoadIssues()` / agent `getLoadIssue(id)` (by kind, for the problems notice) and Team/Org `listFolderLoadIssues()` / `getFolderLoadIssues(id)` (per definition folder, for the cards, N-5). `reloadAgentPackageDefinitions()` = `reloader.reloadAllPackages()` on all three services.
- **Admission** — lists the store's Team folders, **org-owned Teams nested in Org folders (N-1)**, Org folders, and application-package Teams from the narrowed `DefinitionSourceRegistry`; validation unchanged. Duplicate identities arrive as reader load issues (`DEFINITION_IDENTITY_DUPLICATED`).
- **Composition** — `createBundleBackedDefinitionServices` builds one `AgentPackageDefinitions`; `createHostDefinitionServices` exposes `agentPackageDefinitions` (`{store, reloader}`) and closes it; `compositions/agent-package-definition-feed-composition.ts` (studio only) creates the hub and the folder watcher (`{hub, watcher}`), wires announcements and registration, binds the watcher process instance and arms `syncPackageFolders` before the startup admission scan; close order watcher → hub → definitions. `/ws/agent-package-definitions` registered with remote-access auth.
- **GraphQL** — `definitionProblems(kind: DefinitionKind!): [DefinitionProblem!]!` (field `kind`; replaced `definitionAdmissionDiagnostics`); `AgentDefinition.loadIssue: DefinitionLoadIssue`; `AgentTeamDefinition.loadIssues` / `AgentOrgDefinition.loadIssues: [DefinitionLoadIssueEntry!]!` (field `kind`; every load issue in the definition folder, own definition first then nested in path order, built by the one mapper `toGraphqlDefinitionLoadIssueEntries`, N-6); `AgentPackage.autoRefresh { state message }` (`WATCHING | FOLDER_MISSING | UNAVAILABLE`); one `reloadAgentPackageDefinitions: Boolean!` mutation (`api/graphql/types/agent-package-definitions.ts`) for the Agents, Teams and Orgs Reload buttons.
- **Packages** — `AgentPackageService` calls its `reloadAgentPackageDefinitions` dependency (one full reload; it re-syncs folder watching and announces) and reads package folder status from the process watcher. `AppConfig.getRegisteredAgentPackageRoots()` keeps package folders that are missing so Settings can report them.
- **Built-in bootstrap (AR-006)** — write every built-in agent's files → one `reloadAgentPackageDefinitions()` → resolve each → seed setting defaults.
- **Application readiness** — `ApplicationDefinitionRuntimeReadiness.prepare()` validates only; it no longer reloads (SR-009).
- **Web** — `services/nodeChangeFeed/nodeChangeFeed.ts` (shared socket lifecycle; `ProjectChangeFeed` extends it); `services/agentPackages/agentPackageDefinitionChangeFeed.ts` + `composables/agentPackages/useAgentPackageDefinitionChangeFeed.ts` retained from `app.vue`; endpoint `agentPackageDefinitionsWs`; `reloadIfLoaded()` on the agent, team, org and package stores via `utils/agentPackages/loadedListReloader.ts`; `stores/definitionProblemsStore.ts` (`problemsByKind`); `components/definitions/DefinitionLoadIssueBadge.vue` (list; status + count; per-entry name or folder, file, reason; unusable entries marked) on the Agent (one-item list), Team and Org cards (`loadIssues`, DSN-004), and `DefinitionProblemsNotice.vue` (prop `kind`) on the lists; the Settings package row shows the watch state; `graphql/mutations/agentPackageDefinitionMutations.ts` (`ReloadAgentPackageDefinitions`) used by the three Reload actions; localization namespace `agentPackageDefinitions.*` (en, zh-CN); regenerated `generated/graphql.ts`.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: IR-004 is a cross-cutting rename of a new subsystem and its public contracts (WebSocket path and frame, GraphQL types, fields, query and mutation) plus a change in where application-package definitions are read. No escalation trigger fired: no reader bypasses the service boundary, nothing is persisted, admission policy is unchanged, and the subsystem still imports no run-execution, collaboration, admission or GraphQL code.
- Selected route: `Code Review` (Large/High) — exact recipient from `get_handoff_rules`.
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Two scoped clarifications of the spec's verification search are recorded under Known Risks (IR-004 notes); they do not change ownership, contracts or behavior.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | External add/change/remove detected, settled and applied per definition folder; every reader (admission included) reads the same definitions; a read applies pending changes first (REQ-018) | `monitor/agent-package-folder-watcher.ts` → `findDefinitionFolderForPath` → `reloader.markFolderChanged` → settle / `applyPendingChanges()` → folder readers → `store.apply`; services and admission read through `applyPendingChanges()` | Implemented. Integration `package-auto-refresh.integration.test.ts` AC-001/002/003/006/015/016 pass. |
| BEH-002 | Reload buttons and package Reload/Update do a full reload and notify other clients | `reloadAgentPackageDefinitions` mutation → `reloadAgentPackageDefinitions()` → `reloader.reloadAllPackages()` → announce all four lists; `AgentPackageService` → `reloadAgentPackageDefinitions` | Implemented; verified on the dev stack (Agents page Reload → one frame with all four lists on a second client). |
| BEH-003 | Connected web clients reload affected lists; reconnect re-reads | Hub broadcast → `/ws/agent-package-definitions` (`agent_package_definitions_changed {changedLists}`) → `AgentPackageDefinitionChangeFeed` → `reloadAgentPackageDefinitionLists` → stores `reloadIfLoaded()`; `connected` → all lists | Implemented; verified live in the browser. |
| BEH-004 | Broken edit keeps last good + load issue at every level (nested included); first-seen invalid → unusable. Rendered: shared agent → Agents card; nested → owning Team/Org card (`loadIssues`); unusable → list notice | `store.applyDefinition` rule table; readers classify `valid` / `invalid` / `absent`; Org folders correlate owned folders through last-good members. Nested surface: `store.listFolderLoadIssues/getFolderLoadIssues` → Team/Org service `listFolderLoadIssues()/getFolderLoadIssues(id)` → `toGraphqlDefinitionLoadIssueEntries` → `loadIssues` → `AgentTeamCard` / `AgentOrgCatalogCard` → `DefinitionLoadIssueBadge` | Implemented; unit, integration (AC-004, DSN-003), GraphQL `definition-load-issues.test.ts`, card specs; Agents and Teams badges rendered live (IR-004). |
| BEH-005 | Runs read current definitions at create/restore; active runs untouched | Backend factories / org run service / team topology read `getAgentDefinitionById` / `getDefinitionById` | Fresh path removed; no run-state code changed. |
| BEH-006 | GitHub Update stays explicit; its result reaches other clients; the replaced folder is re-armed | Update → `reloadAgentPackageDefinitions` → `reloadAllPackages` → `watcher.syncPackageFolders` identity check → re-arm; presence watch also sees the swap | Implemented; macOS unit test and Linux probe. |
| BEH-007 | Skills not watched or announced | Layout allow-list excludes `skills/`, other files, `.git`, `_` templates, dot names | Unit (layout, watcher) and integration AC-007 pass. |
| BEH-008 | One definition problems surface per kind; a missing package folder keeps last good everywhere; truthful package folder status; watch failure → `UNAVAILABLE` + Reload works | `definition-problems.ts`; `store.markSourceUnavailable` (`DEFINITION_SOURCE_UNAVAILABLE`); watcher state machine; `AgentPackage.autoRefresh` | Implemented; integration AC-011/AC-012 (incl. injected `ENOSPC`) pass; Settings row rendered live (`Folder not found` → `Auto-refreshing`). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/agent-package-definitions/**`, `src/{agent-definition,agent-team-definition,agent-org-definition}/{providers,services}/*`, `src/collaboration-definition-admission/**`, `src/compositions/{host-definition-services,agent-package-definition-feed-composition,build-studio-server}.ts`, `src/application-platform/{definitions/create-bundle-backed-definition-services,runtime/application-definition-runtime-readiness}.ts`, `src/agent-packages/**`, `src/api/graphql/types/{definition-problems,agent-package-definitions,agent-definition,agent-team-definition,agent-org-definition,agent-packages}.ts`, `src/api/graphql/schema.ts`, `src/api/websocket/{agent-package-definitions,index}.ts`, `src/built-in-agents/built-in-agent-bootstrapper.ts`, `src/config/{app-config,config-value-parsers}.ts`; docs `docs/modules/agent_package_definitions.md` and the passages from `061ea7ab3`.
- Web: `autobyteus-web/services/{nodeChangeFeed,agentPackages}/**`, `composables/agentPackages/**`, `utils/agentPackages/**`, `types/agentPackageDefinitions.ts`, `services/projects/projectChangeFeed.ts`, `stores/{agentDefinitionStore,agentTeamDefinitionStore,agentOrgDefinitionStore,agentPackagesStore,definitionProblemsStore}.ts`, `components/definitions/**`, `components/agentOrgs/AgentOrgCatalogCard.vue`, card/list/Settings components, `graphql/**`, `localization/messages/*/agentPackageDefinitions.ts`, `app.vue`, `generated/graphql.ts`; docs `agent_management.md`, `agent_orgs.md`, `agent_teams.md`, `settings.md`.
- Tests: `tests/unit/agent-package-definitions/*` (store rules, reloader, folder readers, layout, watcher, unreadable package folder, application-package list isolation), `tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts` (14 journey cases), `tests/unit/api/graphql/types/{definition-problems,definition-load-issues,reload-agent-package-definitions}.test.ts`, `tests/helpers/agent-package-definitions-test-support.ts`, E2E `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts`; web `utils/agentPackages/__tests__`, `services/agentPackages/__tests__`, `components/definitions/__tests__`, `stores/__tests__/definitionProblemsStore.spec.ts`, package-row cases.

## Important Assumptions

- The app-data default package folder is `dirname(appConfig.getAgentsDir())` with the three kind folders taken from the config getters (identical to `appDataDir` in real configs).
- `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` entries are absolute; non-absolute entries are ignored with a warning as before.
- Application-package definitions are read on demand for list results (SR-009); they are not watched, so their list entries are as fresh as each list call.

## Known Risks

- **Implementation refinements beyond the spec text (no contract change):**
  1. *Parent-folder presence watch.* On macOS, renaming a package folder away emits **no** chokidar events and leaves the old watcher dead (verified). The watcher therefore watches each watched package folder's parent one level deep (Node `fs.watch`, filtered to the folder's own entry). Linux and macOS both transition in ≈ 25 ms.
  2. *Trailing re-check after a read-triggered flush.* chokidar drops a second `change` event for the same file within 5 ms, so a truncate-then-write can be reported once; definition folders applied early by a read are re-read once after the quiet window. Only read-triggered flushes arm it (R-1).
  3. *One store with kind-keyed definition folders*; definitions are indexed by `(kind, canonicalId)`.
  4. *Unreadable registered package folder (IR-002, CR-001).* A package folder whose kind folders cannot be listed is treated like a missing one for that reload: its definitions keep their last loaded version with `DEFINITION_SOURCE_UNAVAILABLE` (reason names the folder and the read error); other packages reload normally; the watcher reports `UNAVAILABLE`. Since IR-004 the reloader and the watcher share one readability rule (`kindFoldersUnreadableError`, R-2).
- **IR-003 notes (SR-008):** an org-owned Team has no card of its own; the exact `agentTeamDefinition(id)` read of it returns only its own load issue. The store keeps nested definitions in reader (path) order after a re-read. The badge's source-unavailable text keys off the first entry (the folder's own definition whenever it has an issue).
- **IR-004 notes (SR-009):**
  - *Verification search exceptions.* Outside `tickets/`, the spec's search list still matches: (a) the pre-existing collaborator-admission port `CollaboratorDefinitionCatalog` / `agent-collaboration/collaborators/collaborator-definition-catalog.ts` (base `359d2c0ef`; the collaborator candidate port, a different concept, not in the rename map; 29 references in 17 files); (b) the pre-existing web helper type `TeamLocalDefinitionSubject` (`utils/teamLocalDefinitionId.ts`, base); (c) the new frame name `agent_package_definitions_changed`, which contains `definitions_changed` by construction, plus one web test asserting the old frame is rejected; (d) historical July electron build logs under `test-results/`. I treated (a) and (b) as out of scope; renaming them is a small follow-up if the owner wants the search fully empty.
  - *Malformed application-package agent.* Under IR-001…IR-003 a malformed application-package agent was a load issue shown in the Agents problems notice. Now (N-7) it is logged (`APPLICATION_PACKAGE_AGENT_SKIPPED:<id>`) and skipped; the list is never failed. `md-centric-provider.integration.test.ts` was updated to this behavior.
  - *On-demand reads.* `list_available_agents`, `@`, the GraphQL Agents list and the application execution resource resolver now read application-package agent and Team files on each list call (exact-ID reads already did). These are a few small files per application.
  - *Discriminator rename.* Inside the subsystem and its three node readers, `kind: valid|invalid|absent|read` became `status`, so `kind` only means the definition kind.
  - *Clean cut.* Old clients of `/ws/definition-catalog`, `definitions_changed`, `catalogIssue(s)`, `definitionDiagnostics` or the three refresh mutations stop working; server and web ship together (verified: the old route does not connect; the old mutation is rejected by the schema).
- **DSN-002 visible effect (for delivery docs):** a Team or Org ID present in more than one registered package is no longer offered by `list_available_agents` / `@`. Its team-local agents are not listed either.
- **Behavior notes worth a reviewer's eye:** a present agent folder without `agent.md` (but with `agent-config.json`) is a load issue (`agent.md is missing.`); the agents list, Teams list and exact reads see disk writes when the watcher (or a Reload) reports them, within the settle window in the studio server.
- **macOS watch start-up latency:** directory watches start a few hundred ms after chokidar's `ready`; every (re-)arm also requests a full reload of the package folder.
- **Pre-existing failures observed (not caused by this change, confirmed on a base worktree):** integration `agent-status-websocket` (2); E2E `agent-team-definitions-graphql` (5), `agent-packages-graphql` (3: live GitHub access), `agent-package-private-skills` (2).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement (feature + defect fix + refactor); SR-009 naming refactor
- Reviewed root-cause classification: Boundary Or Ownership Issue + Missing Invariant
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one owner of agent package definitions (the store behind the services); one change applier (the reloader); admission on the store; one definition problems query; one reload mutation; application-package definitions read where they live.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no aliases for old routes, frames, fields, mutations, types, files or localization keys)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — IR-001 removals (cache providers, persistence wrappers, fresh path, `getAll*` provider enumeration, admission pre-read, registry options, `definitionAdmissionDiagnostics`, `AgentPackageService` refresh deps, the projects feed's own socket lifecycle) plus IR-004: the three refresh mutations and their web documents, the readers' application-owned lookups, `DefinitionFolderReader.listApplicationOwnedUnitIds`, `DefinitionFolderLocation.fromRegisteredRoot`, the reloader's application-owned enumeration, the readiness reload, `AgentPackageService.refreshCatalogCaches`, the Team/Org `getDefinitionIssue`, the duplicated readability helpers in the reloader and the watcher.
- Dead code found elsewhere, listed as follow-up: 83 stale compiled `tests/**/*.test.js` files remain tracked in `autobyteus-server-ts`.
- Shared structures remain tight: `Yes` (`DefinitionLoadIssue` core vs. `DefinitionProblem` web projection vs. `DefinitionLoadIssueEntry` card entry).
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — largest subsystem files: reloader 372, watcher 351, store 287 lines (all under 500).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes` — package files are only read; settings/registry unchanged; definitions, load issues and watch status are in memory.
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- No new dependency (chokidar 4.0.3 was already a server dependency).
- After the web renames, `pnpm -C autobyteus-web exec nuxt prepare` regenerates `.nuxt` (it still listed the old component and store names until then).
- `generated/graphql.ts` was regenerated from the current server schema (printed through `buildGraphqlSchema()`).

## Local Implementation Checks Run

IR-004 (SR-009) — server typecheck clean; server unit 673 files / 5308 tests pass; server integration 72 files pass (only the 2 documented `agent-status-websocket` cases fail); server E2E `agent-package-definitions-live-refresh` (7 pass, 2 environment-gated skips) and `agent-definitions-graphql` (7 pass); web `test:nuxt` 606 files / 4195 tests pass; N-7 test verified to fail without the isolation; repository-wide search results and exceptions in `implementation-revision-record.md` IR-004.

IR-003 (SR-008) — server typecheck clean; server unit 674 files / 5319 tests; server integration 72 files (2 documented failures); web 600 files / 4157 tests.

IR-002 and IR-001 — see `implementation-revision-record.md`. Linux evidence (QR-002 / AC-012): `implementation-evidence/apar-linux-monitor-probe.mjs` in `node:22-bookworm`: rename-away → missing state 26 ms, restore → `WATCHING` ≈ 25 ms; rename-swap re-armed; **603 inotify watches** for copies of the user's two packages, 0 after close (the probe ran on IR-001 names; behavior is unchanged by the rename).

## Frontend Rendered-Result Check (When Applicable)

- **IR-004 (SR-009):** dev stack (`pnpm dev`, repo-local `.autobyteus/development` data); temporary package `/tmp/apar/sr009-pkg` imported through GraphQL, then removed and deleted. Wire: `/ws/agent-package-definitions` greets `{"type":"connected"}`; `/ws/definition-catalog` does not connect; `refreshAgentDefinitionCatalog` is rejected by the schema; `reloadAgentPackageDefinitions` returns true. Rendered, with a window marker kept (no page reload): a new agent appeared on the open Agents page; a broken `agent-config.json` showed "Using last working version (1)" with file and reason; the Agents page **Reload** produced one `agent_package_definitions_changed` frame with `changedLists` `agents, agent_teams, agent_orgs, agent_packages` on a second client; the Teams page showed a broken team-local agent on the owning Team card; Settings showed "Folder not found — Its definitions keep their last loaded version until the folder returns." when the package folder was renamed away and "Auto-refreshing" after it returned. Not rendered: zh-CN in the browser, the Orgs page (component specs cover the Org card), an application-package list (no application packages in the dev data; unit and integration tests cover it).
- **IR-003 (SR-008):** Teams page nested badge states ("Some members couldn't be loaded (2)", "Using last working version (1)", cleared).
- **IR-001:** Agents/Teams/Settings live updates, badge, notice, AR-001 (Team appears after its agents), package row states.
- Approved UI/UX references: requirements § UI, Interaction, And Experience Requirements (lists update in place, error indicator with file and reason, package row error / "not auto-refreshing").
- Visual or interaction issues found and corrected this round: none (SR-009 changes no visible text; badge test IDs are now `definition-load-issue*`).

## Downstream Coverage Hints / Suggested Scenarios

- SR-009 rerun: the durable E2E already follows the new path (`/ws/agent-package-definitions`), frame (`agent_package_definitions_changed {changedLists}`), fields (`loadIssue`, `loadIssues {kind …}`, `definitionProblems(kind:)`), `FOLDER_MISSING` and the single `reloadAgentPackageDefinitions` mutation (updated in this commit; API/E2E owns the rerun and the evidence).
- N-7 on the real product: an application package with one malformed agent (or Team) beside valid ones — the Agents/Teams lists, `list_available_agents` and `@` still list the valid ones.
- SR-008: DESK-002 nested and org-owned cases.
- Desktop isolated instance (TESTING Rule 1): the approved SCN-012 journey (Agent Package Creator adds an agent and a team; both appear in `@` and on the Teams page without a refresh; a broken nested agent keeps its Team usable with a badge).
- AC-008 run continuity, AC-009 (two windows, GitHub Update), AC-010 (reconnect), AC-014 (idle CPU, watch counts).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E rerun on the renamed contract (path, frame, fields, mutation) including remote-access auth on `/ws/agent-package-definitions` (QR-006), plus the N-7 application-package case on the real product.
- Proportional test review of the updated durable E2E and the new tests.
- Delivery redoes docs sync (the `061ea7ab3` docs were renamed here; `tickets/` delivery artifacts such as `release-notes.md` and `docs-sync-report.md` still use the old names and are delivery's to redo).
- Decision on the pre-existing E2E failures listed in Known Risks (owners outside this ticket).
