# Investigation Notes

## Investigation Meta

- Package identifier: `agent-package-auto-refresh`
- Request / ticket: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). User problem statement dated 2026-10-10: "Automatically pick up changes to imported agent packages (agents, agent teams, agent orgs, and their skills) without the user manually refreshing."
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh` on `codex/agent-package-auto-refresh`
- Resolved base remote / branch / revision: `origin/personal` @ `56530dfc6333e2308ad2ac1a943b5139cc85bf3d` (after `git fetch origin --prune` on 2026-10-10)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Dedicated worktree and branch created from refreshed `origin/personal`. The shared checkout (`personal`, behind origin by 6 commits, with unrelated unstaged changes) was not used for authoring.
- Bootstrap blocker: None
- Current solution revision ID: `SR-007`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-10). Architecture gate: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md` (2026-10-10/11).
- Investigation status: Requirements investigation complete (approved SR-005). Architecture investigation complete (SR-006); see "Architecture investigation after approval".

## Initial Request And Clarifications

- Original request: When the Agent Package Creator (or anyone) creates, updates or removes an agent, team or org in an imported package source (for example `autobyteus-agents` / `autobyteus-private-agents`), the user has to refresh manually in the app. Until then the server's in-memory definitions are stale: `list_available_agents` returns the old set, the `@` menu misses new or changed agents, and delegations may use old definitions. The user isn't sure how it works today.
- Requested work: investigate today's behavior; design automatic refresh (watch local folders with debounce, decide git/GitHub behavior, reload only what changed, push to the web without a page reload); keep it safe (invalid edits keep the last good version with a clear error; running runs keep working; low CPU and file-handle cost; keep a manual refresh if useful); cover agents, teams, orgs and bundled/standalone skills.
- Clarifications received: None yet. Open decisions are listed in the requirements doc.
- User-supplied facts and constraints: Done when a package file add/change/remove shows up automatically within a few seconds in `list_available_agents`, the `@` menu and the Agents/Teams/Orgs pages; invalid edits are reported without breaking working definitions; running runs are unaffected or handled as agreed; covered by tests; verified by the user in the desktop app.
- Initial ambiguity: Behavior for invalid edits during new runs, GitHub sources, running runs with changed or removed definitions, a missing package root, and whether the app-data (built-in) package is in scope.

## Product And Domain Understanding

- Product area: Agent package and definition catalog (server `agent-packages`, `agent-definition`, `agent-team-definition`, `agent-org-definition`, `skills`) and the web catalog stores and pages.
- Affected actors or systems: Desktop user; agents that author packages (Agent Package Creator using file tools); running agents calling `list_available_agents` or delegating; web clients (Electron renderer, browser, mobile) bound to a node.
- Existing user or operational purpose: Package roots are folders of file-based definitions (`agents/<id>/agent.md` + `agent-config.json`, `agent-teams/<id>/team.md` + `team-config.json`, `agent-orgs/<id>/org.md` + `org-config.json`, with bundled skills under `skills/` folders). Imported roots are registered in `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`. Standalone skill folders are registered in `AUTOBYTEUS_SKILLS_PATHS`.
- Relevant terminology: *Default package* = the app-data dir (`<server-data>/agents`, `agent-teams`, `agent-orgs`, `skills`). *Local package* = a linked folder (`LOCAL_PATH`). *GitHub package* = a managed download in app data (`GITHUB_REPOSITORY`). *Catalog cache* = the server's in-memory agent and team definition maps.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-10 | Command | `git fetch origin --prune`; `git worktree add -b codex/agent-package-auto-refresh .../agent-package-auto-refresh origin/personal` | Bootstrap | Worktree at `56530dfc6`. | No |
| 2026-10-10 | Doc | `tickets/done/agent-definition-sync-button-analysis/requirements.md` | Earlier ticket named in the task | It covers **node-to-node sync** (export/import between nodes), which was decommissioned. It is not about catalog freshness. Its relevant fact: definitions are file-based and package-root-backed. | No |
| 2026-10-10 | Doc | `tickets/done/live-agent-definition-refresh-analysis/{handoff-summary,investigation-notes}.md` | Name suggests overlap | It ended up as stopped-run `llmConfig` editing. BEH-001 there: saving a definition changes the catalog and **does not mutate an existing active run**. | Preserve |
| 2026-10-10 | Doc | `tickets/done/skill-source-reload/requirements.md` | Prior skill reload decision | Added a manual "Reload" on the Skills page. **Automatic filesystem watching was explicitly out of scope** then. Reload "does not alter running agent sessions". | This ticket reverses the "no automatic watching" non-goal with the user's request. |
| 2026-10-10 | Doc | `tickets/done/agent-package-update-ux/requirements.md` (lines 40, 63, 106) | GitHub update policy | GitHub update installs only after an explicit **Update** click. "Automatic background package updates without explicit user consent" is a non-goal. | Preserve unless the user decides otherwise (DEC-002). |
| 2026-10-10 | Doc | `tickets/done/flat-agent-organization-model/requirements-doc.md` REQ-027, AC-022, SCN-011 | Existing contract for invalid definitions | An incompatible or invalid external definition (and dependent Orgs) is **unavailable for new runs with an actionable diagnostic**. It must not block startup, other definitions, or history/inspection of existing runs. | The "keep last good" request refines this for live edits (DEC-001). |
| 2026-10-10 | Code | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Import/registration and manual reload | Import (local/GitHub), remove, `reloadAgentPackage` (local only) and `updateAgentPackage` (GitHub) each call `refreshCatalogCaches()`. That refreshes **agent and team caches only**. Reload validates the root and skill-name conflicts first; a rejected reload keeps the previous registration. | Watcher-triggered refresh replaces the manual trigger. |
| 2026-10-10 | Code | `agent-definition/providers/cached-agent-definition-provider.ts`; `agent-team-definition/providers/cached-agent-team-definition-provider.ts` | Cache semantics | Full in-memory map, populated once and **exhaustive**: a cache miss means "does not exist". `refresh()` clears and repopulates the whole map. In-app create/update/delete update the map. Parent-owned (team-local / org-owned) IDs bypass the cache. | A new agent written on disk is "not found" for every cache reader until a refresh. |
| 2026-10-10 | Code | `agent-definition/providers/file-agent-definition-provider.ts` (`getReadAgentRoots`, `getAll`, `getAllVisible`) | Disk read semantics | Roots = app-data `agents/` + each `<packageRoot>/agents`. The first root wins for duplicate IDs. Parse errors are **skipped with a warning**, so an invalid agent disappears from the list. `getAllVisible` always reads disk. | A refresh during a half-written edit drops the agent today. |
| 2026-10-10 | Code | `agent-org-definition/services/agent-org-definition-service.ts`; `providers/file-agent-org-definition-provider.ts` | Org caching | **No cache.** Every org read goes to disk. Invalid orgs are skipped with a `DEFINITION_CONTRACT_INVALID` warning. | The server is already fresh for orgs; only the web store is stale. |
| 2026-10-10 | Code | `api/graphql/types/agent-definition.ts` (`agentDefinitions`, `refreshAgentDefinitionCatalog`); `agent-team-definition.ts` (`agentTeamDefinitions`, `refreshAgentTeamDefinitionCatalog`); `agent-org-definition.ts` (`agentOrgDefinitions`) | Web list queries | `agentDefinitions` uses `getVisibleAgentDefinitions()` and reads disk. `agentTeamDefinitions` uses the admission `scan()` and reads disk. Orgs read disk. The refresh mutations clear the server caches. | **The web list queries are already fresh on the server.** Web staleness is client-side. |
| 2026-10-10 | Code | `collaboration-definition-admission/services/definition-admission-service.ts`; `domain/definition-admission-result.ts` | Diagnostics model | Teams and orgs have `available`/`unavailable` admission results with `code`, `reason`, `definitionPath`, `ownerAction`. They are exposed by the GraphQL type `definition-admission.ts`, but no web consumer was found. | A diagnostics vocabulary exists to reuse for "invalid edit" errors. |
| 2026-10-10 | Code | `agent-collaboration/collaborators/collaborator-definition-catalog.ts`, `collaborator-candidate-policy.ts`; `agent-tools/agent-discovery/list-available-agents-*.ts` | `list_available_agents`, `@` candidates, delegation admission | All use **cached** `getAllAgentDefinitions()`/`getAllDefinitions()` and cached `getById`. | Stale until a refresh, as the user reports. |
| 2026-10-10 | Code | `agent-tools/agent-management/list-agent-definitions.ts`; `agent-team-management/list-agent-team-definitions.ts` | Agent-facing management tools | Use cached lists. | Same staleness. |
| 2026-10-10 | Code | Backend factories: `codex-thread-bootstrapper.ts:238`, `claude-session-bootstrapper.ts:66`, `agy-agent-run-backend-factory.ts:51,77`, `acp-agent-run-backend-factory.ts:139` (cached `getAgentDefinitionById`); `autobyteus-agent-run-backend-factory.ts:293` (fresh `getFreshAgentDefinitionById`); `agent-org-run-service.ts` (fresh); `team-definition-traversal-service.ts`, `flat-team-topology-planner.ts`, `member-team-context-builder.ts` (cached team) | Run start/restore paths | A run reads its definition when it is **created or restored** and builds the prompt, tools and skills from it. Codex/Claude/AGY/ACP read the cache; AutoByteus and Org runs read disk. If the definition is missing, they throw `Agent definition '<id>' was not found` / `*_AGENT_DEFINITION_MISSING`. | Readers are inconsistent: the same new agent can launch on AutoByteus but be "not found" on Codex until a refresh. |
| 2026-10-10 | Code | `run-history/services/agent-run-history-catalog-service.ts:517` | Run-history naming | Caches definition names per process; falls back to the ID when the definition is missing. | Not affected; history does not depend on catalog freshness. |
| 2026-10-10 | Code | `skills/services/skill-service.ts` (`loadCatalog`, `listSkills`, `reloadSkillCatalog`), `skill-catalog.ts`, `skill-discovery.ts` | Skill freshness and discovery depth | **No server cache.** Every call rescans. Discovery is shallow: `<source>/*/SKILL.md` plus nested `skills/` chains; bundled skills come from `agents/*/skills/*`, `agent-teams/*/{skills,agents/*/skills}/*` and org-owned folders. | The server is fresh for skills; the web store is stale; watch depth can be limited to discovery depth. |
| 2026-10-10 | Code | `skills/services/skill-source-service.ts` | GitHub skill sources | Check/update are explicit and serialized per repository. | Same explicit-update policy as GitHub packages. |
| 2026-10-10 | Code | `autobyteus-web/stores/agentDefinitionStore.ts` (`fetchAllAgentDefinitions` returns early when non-empty; `reloadAllAgentDefinitions`; `refreshAndReloadAllAgentDefinitions`), `agentTeamDefinitionStore.ts`, `agentOrgDefinitionStore.ts` (`fetchAll(force)`), `skillStore.ts` | Web caching | Stores fetch **once per session** and only refetch on Reload buttons, package actions or in-app edits. The Skills page fetches network-only on mount. | Requires a server-to-web change signal. |
| 2026-10-10 | Code | `autobyteus-web/components/agents/AgentList.vue:256`, `agentTeams/AgentTeamList.vue:185`, `agentOrgs/AgentOrgExperience.vue:461`, `skills/SkillsList.vue:206`, `settings/AgentPackagesManager.vue:208,241,253` | Manual refresh surfaces | Reload buttons on the Agents, Teams, Orgs and Skills pages; per-package Reload (local) and Check/Update (GitHub) in Settings. GitHub status check runs when the Agent Packages settings open. | Keep as a fallback (DEC-004). |
| 2026-10-10 | Code | `autobyteus-web/composables/runSettings/useMentionCandidates.ts`; `services/collaborators/collaboratorCandidatesService.ts` | `@` menu | Live run: asks the server on **every menu open** (network-only), and the server answers from the cache. New-chat draft: built from the web agent/team stores, fetched only if empty. | Live-run `@` is fixed by a fresh server cache; draft `@` needs the web stores pushed. |
| 2026-10-10 | Code | `autobyteus-server-ts/src/projects/changes/project-change-hub.ts`; `api/websocket/projects.ts`; `autobyteus-web/services/projects/projectChangeFeed.ts` | Existing push pattern | `/ws/projects` is a server-to-client broadcast feed. A `connected` greeting makes clients re-read loaded views (this covers reconnects). | Proven precedent for a definition change feed. |
| 2026-10-10 | Code | `autobyteus-server-ts/src/file-explorer/watcher/**` (chokidar 4.0.3, separate watcher runtime process, `awaitWriteFinish` 200 ms, ignore matcher); worktree `file-explorer-watcher-fd-usage` investigation notes | Existing watcher stack and file-handle lessons | The workspace watcher recursively watches roots and had file-descriptor exhaustion with many workspaces. chokidar 4 depends on Node `fs.watch` and documents EMFILE/ENOSPC. | The watch scope must be limited to definition-relevant folders and exclude `.git`/`node_modules`. |
| 2026-10-10 | Data | `~/.autobyteus/server-data/.env` | Real user configuration | `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=autobyteus-agents,autobyteus-private-agents`; `AUTOBYTEUS_SKILLS_PATHS` = 5 folders including `autobyteus_mcps`. | Sizing input. |
| 2026-10-10 | Command | `find <root> -type d/-type f` counts (see Runtime findings) | Sizing the watch cost | Definition subtrees are small (~470 dirs). The `autobyteus_mcps` skill source has **36,761 dirs / 285k files** (venvs, models). | A whole-root recursive watch is not acceptable; watch only what discovery reads. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | A file under an imported/default package root is added/changed/removed outside the app (Agent Package Creator file tools, editor, `git pull`) | Nothing observes the change. The agent/team caches keep the startup or last-refresh snapshot. | `list_available_agents`, live `@` candidates, collaborator delegation and Codex/Claude/AGY/ACP launches use the old set: new agents are "not found", removed ones are still offered, and changed ones are stale. AutoByteus launches and Org runs read disk. Web lists and Skills reads are fresh on the server. | Cache providers; collaborator catalog; backend factories | High (static trace) |
| BEH-002 | User | Reload button on the Agents/Teams page; Settings → package Reload | `refreshAgentDefinitionCatalog`/`refreshAgentTeamDefinitionCatalog`/`reloadAgentPackage` clears and repopulates the server caches, then the web refetches. | Caches become fresh. Orgs have no cache; the Orgs Reload only refetches the web list. | GraphQL resolvers; `AgentList.vue`; `AgentPackagesManager.vue` | High |
| BEH-003 | User | Web pages / draft `@` / run target switcher | Stores fetch once per app session and refetch only on explicit actions. | A change on disk is invisible in the web until Reload, even when the server is fresh. | Web stores | High |
| BEH-004 | System | Refresh while a definition file is invalid or half-written | The provider skips the definition with a warning. | The definition **disappears** from the catalog after a refresh, and no error is shown in the web. | `file-agent-definition-provider.ts` getAll; org provider; team admission | High |
| BEH-005 | Contract | Run creation/restore | Each agent run reads its definition when it is created or restored; skills are materialized then. | Active runs are not mutated by catalog changes. A restore after the definition is removed fails with "definition not found". | Backend factories; `live-agent-definition-refresh-analysis` BEH-001; `skill-source-reload` REQ-009 | High (static); restore failure UX not exercised |
| BEH-006 | User | GitHub package or skill source | Check status on Settings open or on click; install only on an explicit **Update**, which refreshes the server caches and web lists. | No background download. Managed install folders are not user-edited. | `agent-package-service.ts`; `agent-package-update-ux` | High |
| BEH-007 | User | Skills page; agent skill resolution at run start | The server rescans on every call. The web Skills page fetches on mount and on Reload. | The server is fresh; an open Skills page is stale. | `skill-service.ts`; `skillStore.ts` | High |
| BEH-008 | Contract | Invalid external definitions | Unavailable for new runs with a diagnostic; does not block other definitions, startup or history. | Diagnostics exist for teams/orgs (admission results); the web does not show them. | `flat-agent-organization-model` REQ-027 | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `CachedAgentDefinitionProvider` / `CachedAgentTeamDefinitionProvider` | Exhaustive in-memory maps; whole-map refresh | Stale readers are the core server defect | Per-root/per-definition reconcile with last-good retention; whether fresh and cached readers should converge |
| `AgentPackageService.refreshCatalogCaches` | Agent+team refresh after package mutations | Must stay correct and also notify the web | Single owner of "catalog changed" publication? |
| `AppConfig.getAdditionalAgentPackageRoots`, `getAdditionalSkillsDirs` | Root lists from `.env` settings | Watch set must follow package/skill-source add/remove at runtime | Watch lifecycle tied to registration changes |
| `skill-discovery.ts` | Shallow discovery depth | Watch depth can be bounded | Depth-limited per-source watch |
| `ProjectChangeHub` + `/ws/projects` + web `projectChangeFeed` | Broadcast feed with reconnect re-read | Precedent for pushing "definitions changed" | Reuse the pattern or a shared node event feed |
| `file-explorer/watcher/*` | Chokidar in a separate watcher process for workspaces | Precedent and fd lessons | Reuse the runtime vs. a lighter in-process watcher for the small definition scope |
| `definition-admission-result.ts` | Diagnostic vocabulary | Reuse for "invalid edit" errors | Extend to agents? |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `agent.md`, `agent-config.json`, `team.md`, `team-config.json`, `org.md`, `org-config.json`, `SKILL.md` (+ skill folders), under `<root>/{agents,agent-teams,agent-orgs}` and skill sources.
- Readers: file providers, admission service, skill discovery, package-root summary (counts).
- No writer change is required; the app's own create/update/delete paths stay.

### Structural Surfaces

- Server: catalog caches, package service, skill service, GraphQL catalog queries, websocket routes.
- Web: agent/team/org/skill/package stores, Agents/Teams/Orgs/Skills pages, the `@` composables, Settings package manager.
- Existing support: project change feed pattern; chokidar dependency; admission diagnostics.

### Potential Structural Impacts To Investigate

- API or external-contract change: new server-to-client change feed (websocket) and possibly a diagnostics field/query for the web — **Present**.
- Persistence schema or invariant change: none expected (last-good is in memory) — **Absent**.
- Security or privacy boundary change: the new websocket must use the existing remote-access auth like `/ws/projects` — **Present (reuse)**.
- Concurrency or lifecycle change: watcher lifecycle across package add/remove, server start/stop; refresh coalescing vs. in-flight reads and in-app writes — **Present**.
- Deployment/ownership: watch cost on Linux (inotify limits) and Docker — **To verify in design**.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `find` counts excluding `.git`/`node_modules` | Size of the user's roots | `autobyteus-agents`: agents 38 dirs, agent-teams 253, agent-orgs 59 (max path depth ~14). `autobyteus-private-agents`: 56/55/9. Whole roots include docs/tickets (435 / 132 dirs). App-data agents: 13 dirs. Skill sources: `autobyteus-skills` 371 dirs / 2,045 files; `.codex/skills` 24; superrepo `skills` 2; **`autobyteus_mcps` 36,761 dirs / 285,301 files**. | Watch only definition subtrees and skill discovery depth; never whole roots or `.git`. | Command output in this session |
| Static trace (not executed) | New agent on disk, then Codex launch / `list_available_agents` | Cache miss → "not found" / absent | Confirms the user-reported staleness | Source log rows |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (2026-10-10) | No manual refresh after package edits; changes visible within a few seconds | Explicit | Core requirement | — |
| User | Invalid/half-written edits keep the last good version with a clear error | Explicit | REQ on last-good retention | Is the last good version also used for **new runs**? (DEC-001) |
| User | Running runs keep working; define changed/removed behavior consistent with existing continuity | Explicit | Preserve BEH-005 | Confirm (DEC-003) |
| User | Decide git/GitHub poll vs. explicit | Explicit question | DEC-002 | — |
| User | Low CPU/file-handle cost with many packages | Explicit | QR rows | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| chokidar | 4.0.3 (server dep) | Uses Node `fs.watch`; `depth`, `ignored`, `awaitWriteFinish` options; EMFILE/ENOSPC risk | package.json; fd-usage ticket notes | Platform differences (macOS FSEvents vs. Linux inotify) to verify in design |
| Node `fs.watch` | Node runtime | OS-backed; resource limits per OS | Node docs (cited in fd-usage notes) | — |

## Persisted Data And State Facts

- Affected stored subject: None. Package files are read only; settings (`AUTOBYTEUS_AGENT_PACKAGE_ROOTS`, `AUTOBYTEUS_SKILLS_PATHS`) and the package registry are unchanged.
- Last-good copies: proposed to be in memory only; they are lost on restart (DEC-001).
- Remaining evidence gap: None for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.
- The UI need is small (an error indicator on definition cards/package rows). It is specified as behavior in the requirements; no Product handoff is planned unless the user asks.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/apar-cache-probe.test.ts` | Solution Designer | Reproduces the catalog-bricking defect | Agent cache provider | REQ-007, QR-004 | Evidence | N/A (evidence) |
| `probes/apar-watch-probe.test.ts`, `probes/apar-watch-probe2.test.ts` | Solution Designer | Watch scope, latency, fd and missing-path behavior | chokidar 4.0.3, macOS | QR-001, QR-002, REQ-015 | Evidence | N/A (evidence) |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Exact web UX when restoring a stopped run whose definition was removed | Continuity requirement preserves it; not exercised | Design/API-E2E to confirm the existing error is surfaced | Open (non-blocking) |
| R-001 | Risk | OS watch limits (Linux inotify, EMFILE) with large skill sources | Could break watching or the server | Bounded scope plus graceful degradation to manual refresh | Mitigated by requirements |
| R-002 | Risk | Bulk changes (`git checkout`, `git pull`) cause event storms or transient "missing" states | Could flap definitions | Debounce/coalescing plus last-good retention | Mitigated by requirements |
| R-003 | Risk | Mixed fresh/cached readers give inconsistent answers | A user sees an agent in the list that a launch then calls "not found" | Design must make all catalog readers agree | Design |
| A-001 | Assumption | Package and skill-source folders are on a local filesystem that delivers change notifications | Network/odd filesystems may not | Manual refresh stays as the fallback | Accepted |

## Skill Name Change Findings (2026-10-10, user question)

- The skill identity is the `name:` line in `SKILL.md` front matter, not the folder name (`skills/loader.ts` `parseFrontmatter`).
- Agents refer to skills by that name in `agent-config.json` `skillNames`. Resolution happens **at each run start** against a fresh disk scan (`SkillService.loadCatalog` → `ConfiguredAgentSkillResolver.resolveForAgent`). Application-owned agents look in their own bundle first and also require the same name.
- There is no server skill cache (grep: no cache in `skills/`; callers are the run bootstrappers and skill-improvement).
- If `SKILL.md` `name` changes from `foo` to `bar` while an agent still lists `foo`, the next run of that agent logs `Skill 'foo' ... could not be resolved` and runs **without** that skill (an "unresolved binding"). The Skills page shows `bar`. Nothing in the web tells the user the agent lost a skill.
- If the new name collides with another skill, the existing precedence keeps one copy and the Skills page banner reports the duplicate.
- Standalone skill packages (local folders in `AUTOBYTEUS_SKILLS_PATHS`, for example `autobyteus-skills`) behave the same way: they are read fresh on every call. GitHub skill sources change only through an explicit Update and are read fresh afterwards.
- Implication: a skill rename is a **broken-reference** risk, not a stale-memory problem. A file monitor neither causes nor fixes it. The visible fix would be a "configured skill not found" warning on the agent (DEC-007).

## Architecture Investigation Findings

Pending requirements approval. Pre-approval fact recorded for SR-003 (2026-10-10, user asked to check it):

- `autobyteus-server-ts/src/file-explorer/traversal-ignore-strategy/`:
  - `WorkspaceIgnoreMatcher(root, strategies)` has `shouldIgnore(path, isDir)` and `shouldIgnoreForWatch(path, stats)`, and lazily caches nested `.gitignore` files by mtime/size.
  - `createWorkspaceIgnoreStrategies(root)` = `SpecificFolderIgnoreStrategy([".git"])` + `GitIgnoreStrategy(root)`, plus the built-in `DefaultIgnoreStrategy`: Python caches, venv/.venv/env, node_modules, build/dist/lib/target, logs, and others.
- `file-explorer/watcher/runtime/*`: `ChokidarWatcherRuntime` runs chokidar 4 in a **child process per workspace root** (`WatcherRuntimeProcessRegistry`), with `ignoreInitial`, `awaitWriteFinish {200 ms, 50 ms}` and `ignored: matcher.shouldIgnoreForWatch`. It emits raw add/addDir/unlink/unlinkDir/change events.
- Design question: reuse the ignore matcher (likely) and decide whether to reuse the child-process runtime or a lighter in-process watcher for a few small definition subtrees.

### Architecture investigation after approval (2026-10-11)

Authorities read for this phase: `references/architecture-design.md`, `references/design-principles.md` (shared, 2026-10-10 version), root `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` (watcher runtime isolation).

| Date | Source / Command / Probe | Observation | Design implication |
| --- | --- | --- | --- |
| 2026-10-11 | `git log -S getFreshAgentDefinitionById` → commit `9762a12df` "fix(runtime): refresh agent definition instructions per run" | The disk-fresh read path (`getFreshAgentDefinitionById`, `getFreshDefinitionById`, `freshProvider`) was added as a workaround for the stale cache. | With a monitored catalog it is redundant. Remove it (clean cut) so every shared-definition reader uses one path. |
| 2026-10-11 | Probe `probes/apar-cache-probe.test.ts` (real `FileAgentDefinitionProvider` + `CachedAgentDefinitionProvider`, temp roots) | One agent with invalid `agent-config.json` JSON makes `getAll()` **and** `getById("good")` throw `SyntaxError`. After the file is fixed, every read **still throws** until `refresh()` (the rejected `populatePromise` is kept). A folder without `agent.md` is silently absent. | **Current defect**: one half-written file bricks the whole agent catalog. Reconcile must classify per definition (valid / invalid / absent by folder presence) and never let one entry fail the catalog. |
| 2026-10-11 | Code: `file-agent-definition-provider.ts` `readAgentFromPaths` (ENOENT → null, `AgentMdParseError` rethrown, other errors rethrown); `store-utils.ts` `readJsonFile` (ENOENT → fallback, `SyntaxError` thrown); `file-agent-team-definition-provider.ts` `readDefinition` (ENOENT → null) and `getAll` (skips parse/syntax errors) | "Missing file" and "absent definition" are conflated; a missing `agent-config.json` yields defaults. | Readers decide presence by folder existence; a present folder with an unreadable or missing required file is `invalid`. |
| 2026-10-11 | Code: `collaboration-definition-admission/services/definition-admission-service.ts` `decode` | Reads `team-config.json`/`org-config.json` from disk for strict-shape validation, then `getFreshDefinitionById` / org `getDefinitionById`. Classifies `DEFINITION_FAMILY_MISMATCH` when the sibling family file exists. | Decode must obtain shared definitions from the catalog (last good + issue), or it would contradict DEC-001. The family-mismatch rule belongs to the team/org source reader classification. |
| 2026-10-11 | Code: `compositions/host-definition-services.ts`, `application-platform/definitions/create-bundle-backed-definition-services.ts`, `compositions/build-studio-server.ts` (`closeStudioProcessResources`), `standalone-application-host/start-standalone-application-host.ts` | Definition services are composed per process with `close()`. The studio server (desktop/web) and the standalone application host both create them; only the studio server serves package management and the web. | The monitor is a studio-server process resource. The standalone host keeps the catalog without monitoring (out of scope). |
| 2026-10-11 | Code: `application-platform/runtime/application-definition-runtime-readiness.ts` `prepare()` | Calls `refreshCache()` on agent and team services so application-owned definitions appear after application package changes. | The catalog keeps application-owned list entries refreshed by full reconcile (unchanged trigger). Exact-ID reads of application-owned, team-local and org-owned IDs stay disk reads (subject split, as today for team-local/org-owned). |
| 2026-10-11 | Probe `probes/apar-watch-probe.test.ts` (chokidar 4.0.3 in-process, macOS, a copy of `autobyteus-agents` `agents/agent-teams/agent-orgs`, allow-listed definition files, `skills`/`.git`/`node_modules` ignored) | Ready in **47 ms**; **163 watched dirs** / 405 entries; 0 skills dirs. Create agent folder plus 2 files: events at **13 ms**. Edit: **2 ms**. Delete folder: `unlinkDir` + `unlink` events. Skill content and non-definition file edits: **no events**. A missing kind folder (`<root>/missing-kind`) created later **is detected**; removed and recreated **is detected**. | An in-process chokidar watch of the definition structure is cheap and timely. A structural allow-list gives exactly the needed events. |
| 2026-10-11 | Probe `probes/apar-watch-probe2.test.ts` | Process fd count 23 → 23 → 23 (before / ready / closed) on macOS (FSEvents-backed directory watches use no per-directory fds). A watched path whose **parent** is missing (`missing-root/pkg2/agents`) is **not** detected when created later. `getWatched()` returned 0 in this mixed run, while events for existing paths still fired. | A missing package root needs the nearest existing ancestor watched (depth 0) until the root reappears. Do not rely on `getWatched()` alone as test evidence; assert on events and the monitor's own registry. |
| 2026-10-11 | Doc: `autobyteus-server-ts/docs/modules/file_explorer.md` § Watcher Runtime Isolation | The workspace watcher runs chokidar in a child process because closing a large workspace watcher blocked the backend event loop. The rule against in-process chokidar is scoped to "this replaced path" (workspaces). | For a few hundred definition folders, close is fast. In-process is proportionate; record the rationale and a cost bound (QR-002) in the design. |
| 2026-10-11 | Code: `file-explorer/traversal-ignore-strategy/*` (`DefaultIgnoreStrategy` list) | Workspace ignore rules include generic names such as `build/`, `lib/`, `env/`, `var/`, `dist/`, `target/` and honor `.gitignore`. | They suit code workspaces, not definition structure. They could hide a valid definition folder named `build`/`lib`/`env` or one matched by a package `.gitignore`, while still watching docs and skill content. The design uses a structural allow-list instead (QR-002 "where suitable"). |
| 2026-10-11 | Code: `projects/changes/project-change-hub.ts`, `api/websocket/projects.ts`, web `services/projects/projectChangeFeed.ts`, `utils/nodeEndpoints.ts` | Hub plus authorized websocket plus retained client feed with backoff, node rebinding, and `connected`-triggered re-read. | Reuse the same shape for a definition-catalog change feed. |
| 2026-10-11 | ARCH-REV-001 evidence, verified | `team-run-service.ts:101,155`, `agent-org-run-service.ts:83` and the Teams/Orgs GraphQL lists use `DefinitionAdmissionService.scan/requireAvailable`, which enumerates via `DefinitionSourceRegistry.scan()` (`readdir` per call; duplicate ID → unavailable). `github-agent-package-installer.ts:131–135` swaps the install dir by rename. Nested agents: 111 of 156 in the user's packages. | Admission must enumerate the catalog (AR-002); nested last good via units (AR-004); root identity re-arm (AR-005). |
| 2026-10-11 | Code grep | `definitionAdmissionDiagnostics`: only its resolver and `tests/unit/api/graphql/types/definition-admission.test.ts`, no web consumer. `DefinitionSourceRegistry` option `implementationPackageRoots`: passed only by tests (`definition-admission-service.test.ts`, `optional-avatar-placement.test.ts`, `file-application-bundle-provider.test.ts`), never in production. | Replace with one diagnostics query (AR-003); the option is dead. |
| 2026-10-11 | Code: `built-in-agent-bootstrapper.ts:78–121,185–233` | Per agent: write → resolve via the fresh path → set default; `refreshDefinitionCache()` runs once at the end. | New order: write all → `refreshCache()` → resolve → defaults (AR-006). |
| 2026-10-11 | Code: org layout `agent-org-owned-definition-source-index.ts`; team-local `team-local-agent-discovery.ts` | Org folders hold `agents/<id>` and `agent-teams/<id>[/agents/<id>]`; team folders hold `agents/<id>`. | Allow-list grammar (see design). |

## Requirement Implications

- The core server defect is limited to the **agent and team caches**. Orgs and skills are already fresh on the server. Every web catalog store is stale because nothing pushes changes.
- "Reload only what changed" is naturally scoped by package root and definition kind. The data is small (hundreds of files), so the expensive part is watching, not reading.
- The last-good requirement changes today's skip-on-parse-error behavior for live edits only. Diagnostics for teams/orgs already exist and can be extended.
- GitHub packages and sources are managed copies changed only by explicit Update, which already refreshes the server. They only need the web push.

## Notes For Architecture Design

- Map SCN-001…SCN-011 from the requirements doc.
- Verify: the platform watch strategy and cost; reuse of the watcher runtime vs. in-process; how watch roots follow package/skill-source registration changes; coalescing with in-app writes; making every agent/team reader agree (cached vs. fresh); the diagnostics surface for agents; the change-feed contract and reconnect re-read.
