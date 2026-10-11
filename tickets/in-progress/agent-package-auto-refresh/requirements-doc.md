# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-007`
- Package identifier: `agent-package-auto-refresh`
- Request / ticket: Project Task from `/project_task_manager`; user problem statement 2026-10-10
- Requirements owner: Solution Designer
- Date: 2026-10-10
- Approval state and reference: **Approved** by the user on 2026-10-10 ("I think this is reasonable approach."), in reply to the six-point final plan summary (SR-004 conversation). DEC-001…DEC-006 are approved as recommended; DEC-007 was resolved earlier as (A) no change.
- Exact approved requirements baseline / solution revision: this document at SR-004 content plus the SR-005 status/decision recording (no content change)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: When package files change outside the app (Agent Package Creator file tools, an editor, `git pull`), the server's in-memory **agent and team** caches and every web catalog store keep the old snapshot until someone clicks Reload. Today this means:
  - `list_available_agents` and live-run `@` candidates are stale;
  - delegation and Codex/Claude/AGY/ACP launches report a new agent as "not found" or still offer a removed one;
  - the web Agents/Teams/Orgs pages and the new-chat `@` menu stay stale until Reload.
  - Orgs and skills are already fresh on the server; they are stale only in the web.
- Affected actors or systems: the desktop user; agents that author packages; running agents that discover and delegate; web clients bound to the node.
- Desired outcome: Adding, changing or removing a definition file under a watched package updates the server catalog and every connected web view automatically within a few seconds. Invalid edits never remove a working definition, and running runs are unaffected.
- Observable definition of success: The Agent Package Creator adds an agent in `autobyteus-agents`. Within 5 s, without any click, it appears in `list_available_agents`, the `@` menu and the Agents page in the desktop app.
- Primary user journey (user clarification, 2026-10-10, SR-002): The user asks the Project Task Manager to delegate to the Agent Package Creator. It creates, edits or deletes an agent, team or org. Afterwards the user asks the Project Task Manager to delegate a new task. That delegation (`list_available_agents`, then `delegate_task` spawning a fresh copy) MUST use the current definitions. A new agent or team is found, a deleted one is gone, and an edited team spawns with its current members, handoffs and instructions. Today the in-memory catalog serves the old version.
- Correction to a user assumption (evidence, SR-002): edits to existing files are **not** always picked up today. A delegated copy is built from the in-memory team definition (members, handoffs) and in-memory agent definitions. Codex, Claude, AGY and ACP runs read the agent's instructions, tools and skill list from the in-memory copy. Only AutoByteus-runtime agents, Org runs and skill file contents read disk. So edits are covered by this ticket too, not only creation and deletion.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001–003, SCN-005 | External file changes are not observed. The agent/team caches stay stale; orgs/skills are fresh on the server. | Watched sources are observed, and a debounced refresh updates the server catalog for exactly the affected root and definition kind. | In-app create/edit/delete keep updating the catalog immediately. | Notes BEH-001 |
| BEH-002 | User | SCN-010 | Reload buttons and package Reload/Update refresh the server and refetch web lists. | They remain as a fallback and also notify other open web clients. | Same buttons, same results. | Notes BEH-002 |
| BEH-003 | User | SCN-001–006, SCN-009 | Web stores fetch once per session. | Connected web clients receive a change signal and refresh affected lists without a page reload, and re-read after reconnecting. | Explicit Reload still works. | Notes BEH-003 |
| BEH-004 | System | SCN-004 | An invalid or half-written definition disappears from the catalog on the next refresh, with no visible error. | The last good version stays in the catalog, marked with a visible error naming the file and reason, until the file is fixed (clears automatically) or removed. | First-seen invalid definitions remain unavailable with a diagnostic (BEH-008). | Notes BEH-004 |
| BEH-005 | Contract | SCN-007 | Runs read their definition at create/restore. Active runs are not mutated. Restore of a removed definition fails with "not found". | Unchanged, but the definition read is now the current one, not a stale cache copy. | Active runs, their prompts, tools and materialized skills; history and inspection. | Notes BEH-005 |
| BEH-006 | User | SCN-008 | GitHub packages and skill sources install only on an explicit Update; status is checked on Settings open or on click. | Unchanged; open web clients now also see the result of an Update without Reload. | No background download or auto-update. | Notes BEH-006 |
| BEH-007 | User | SCN-006 | The server rescans skills on every call, and skill file contents are read from disk when a run starts. The web Skills page refreshes on mount or Reload. | **No change** (user decision SR-003): the server is already fresh for skills, and the Skills page keeps its manual Reload. Skill content and skill folders are not monitored. | Disabled-skill state; duplicate-name precedence; running sessions untouched; Skills page Reload. | Notes BEH-007; user 2026-10-10 |
| BEH-008 | Contract | SCN-004, SCN-011 | Invalid external definitions are unavailable for new runs with a diagnostic and do not block others. | Diagnostics become visible in the web for agents, teams and orgs. | Startup is never blocked; other definitions are unaffected. | `flat-agent-organization-model` REQ-027 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user | Author or iterate packages and use them right away | Changes appear without manual refresh; broken edits are explained | No surprise breakage of working agents |
| Authoring agent (Agent Package Creator) | Writes package files with file tools | Its new or changed definitions become usable by other agents and the user within seconds | Writes may be multi-file and non-atomic |
| Running agents | Discover (`list_available_agents`) and delegate | See the current catalog | Their own run keeps working |
| Web clients (desktop renderer, browser, mobile) | Show catalogs and `@` | Update live, including after reconnect | Remote-access auth applies |
| Node operator | Many packages and large skill folders | Low idle CPU; bounded file handles | Linux/Docker inotify limits |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent/team/org definition is added, changed or removed in a watched package root outside the app, and the catalog (including the next delegation) and web update automatically | SCN-001, SCN-002, SCN-003, SCN-005, SCN-012 |
| UC-002 | An invalid or half-written edit keeps the last good version and shows an error; fixing it clears the error | SCN-004 |
| UC-003 | (Withdrawn in SR-003) Skills need no monitoring: the server already rescans them, and the Skills page has Reload | SCN-006 |
| UC-004 | Running runs continue unaffected when their definition changes or is removed | SCN-007 |
| UC-005 | GitHub package/skill-source updates (explicit) and manual Reloads propagate to all open web clients | SCN-008, SCN-010 |
| UC-006 | A web client reconnects (server restart, sleep, network) and re-reads the catalogs | SCN-009 |
| UC-007 | Watching follows package and skill-source registration changes (import/remove) at runtime, and a missing root is handled safely | SCN-011 |

### Out Of Scope

- Background download, polling or auto-update of GitHub packages or GitHub skill sources (unless DEC-002 changes this).
- Application packages/bundles (`application-packages`) and their application-owned agents/teams.
- Changing an **active** run's prompt, tools or materialized skills when its definition changes (hot-swap).
- Node-to-node sync (decommissioned).
- Persisting last-good copies across server restarts.
- Monitoring skills (skill content, skill folders, skill source folders) and pushing Skills page updates (SR-003); the Skills page keeps its manual Reload.
- Warning about agents whose configured skill names no longer resolve (DEC-007): the existing tolerant behavior (log and continue) is intentional and preserved.
- MCP server configuration, workspaces and file-explorer watching.

### Non-Goals

- Per-keystroke live preview of definitions while editing in the app's own forms.
- Notifications or toasts announcing each catalog change (lists simply update).
- Watching network filesystems where the OS gives no change notifications (manual Reload covers them).

### Preserved Behavior Boundary

- BEH-002, BEH-005, BEH-006, BEH-008 preserved columns.
- Existing precedence: app-data root first, then imported roots in configured order; skill duplicate-name precedence and disabled-skill flags.
- Package import, remove, reload and update validation and rollback semantics, including the skill-name conflict checks.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The server MUST detect file additions, changes and removals affecting agent, team and org definitions under every registered package root (imported local packages and, per DEC-005, the app-data default package) without user action. | BEH-001 | Critical | Core request | User |
| REQ-002 | After a burst of changes settles, the server MUST refresh its catalog so that **every** agent/team/org reader agrees with disk: `list_available_agents`, `@` candidates, collaborator delegation, agent-management tools, run launch/restore on every runtime, and the GraphQL catalog queries. | BEH-001 | Critical | Fixes stale and inconsistent readers | User; R-003 |
| REQ-003 | Refresh MUST be scoped: only the affected package root and definition kind are re-read, and unaffected definitions stay available throughout. The catalog MUST never be observed empty or partially populated during a refresh. | BEH-001 | High | "Reload only what changed"; no flapping | User |
| REQ-004 | Change bursts (multi-file writes, `git pull`/`checkout`) MUST be coalesced so that one burst produces one refresh per affected root and kind, not one per file. | BEH-001 | High | Debounce request; R-002 | User |
| REQ-005 | Connected web clients MUST receive a change notification and refresh the affected views without a page reload: Agents, Teams and Orgs pages; Settings → Agent Packages list (the Skills page is excluded, REQ-011); new-chat `@` and run-target lists. Live-run `@` MUST show current candidates the next time it is opened. | BEH-003 | Critical | Core request | User |
| REQ-006 | On (re)connect, a web client MUST re-read the catalogs it has loaded, so changes missed while disconnected appear. | BEH-003 | High | Server restart/sleep | Pattern: `/ws/projects` |
| REQ-007 | If a previously valid definition becomes invalid or unreadable (parse error, missing required file, half-written JSON) while its folder still exists, the server MUST keep the last good version in the catalog (per DEC-001) and attach an error with the file path and reason. When the file becomes valid again, the new version replaces it and the error clears automatically. | BEH-004 | Critical | Safety request | User; DEC-001 |
| REQ-008 | A definition that is invalid when first seen (no last good version in this server session) MUST be unavailable for new runs with a visible diagnostic, and MUST NOT affect other definitions. | BEH-004, BEH-008 | High | Existing contract | REQ-027 (flat-agent-organization-model) |
| REQ-009 | Definition errors (REQ-007/REQ-008) MUST be visible in the web on the affected card or row (Agents/Teams/Orgs pages, Settings package row), naming the file and the reason. Logs alone are not enough. | BEH-004, BEH-008 | High | "Show a clear error" | User |
| REQ-010 | A definition whose folder is removed MUST be removed from the catalog. | BEH-001 | Critical | Removal case | User |
| REQ-011 | Skills MUST NOT be monitored. Skill content edits (`SKILL.md` body, scripts, references) and skill folder add/remove, in skill source folders or in bundled package `skills/` folders, MUST NOT trigger a definition reload or a web notification. The existing server rescan and the Skills page Reload remain the mechanism. | BEH-007 | High | User decision; avoids watching skill content | User 2026-10-10 (SR-003) |
| REQ-012 | Running runs MUST NOT be stopped, restarted or mutated by a catalog change. A changed definition takes effect for runs or members started or restored after the change. A removed definition keeps active runs working; restoring such a run after it stops keeps today's "definition not found" error (DEC-003). | BEH-005 | Critical | Continuity | User; existing contract |
| REQ-013 | GitHub packages and GitHub skill sources MUST keep explicit Check/Update (DEC-002); no background download. A successful Update MUST also notify connected web clients. | BEH-006 | High | Consent policy | `agent-package-update-ux` |
| REQ-014 | Watching MUST start and stop with registration: importing a local package starts watching its definition folders; removing it stops watching and releases its handles; server shutdown releases all. | BEH-001 | High | Resource hygiene | QR-002 |
| REQ-015 | If a registered root is missing or unreadable, the server MUST NOT crash, MUST report an error on that package/source in Settings, and MUST handle its definitions per DEC-005. Watching resumes automatically when the root reappears. | BEH-001, BEH-008 | Medium | Robustness | DEC-005 |
| REQ-016 | If watching cannot be set up or fails (for example, an OS watch limit), the server MUST keep running, log the cause, show the affected source as "not auto-refreshing" in Settings, and manual Reload MUST still work. | BEH-002 | High | Safety and fallback | User |
| REQ-017 | Manual Reload buttons (Agents/Teams/Orgs/Skills pages, package Reload) MUST remain and MUST also notify other connected clients (DEC-004). | BEH-002 | Medium | Fallback | User |
| REQ-018 | A catalog lookup (`list_available_agents`, `delegate_task` catalog resolution, `@` candidates, run launch/restore, GraphQL catalog queries) that happens while a detected change is still waiting for its settle window MUST first apply that pending change and then answer. A lookup MUST never return a definition older than one the monitor has already detected. | BEH-001 | Critical | Removes the race between "creator finished" and the next delegation | Approved plan item 2 (SR-005) |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-005 | SCN-001 | A local package is imported; the web Agents page and a live run are open. A new `agents/<id>/{agent.md,agent-config.json}` is written outside the app. | Within 5 s: the agent appears on the Agents page, in new-chat `@`, in live-run `@` on next open, and in `list_available_agents`. It launches successfully on AutoByteus and Codex runtimes. | — | Server integration test (real temp folders and watcher); web store/feed tests; desktop user verification |
| AC-002 | REQ-002, REQ-003 | SCN-002 | An existing agent's description/instructions are edited on disk. | Within 5 s, every reader returns the new content. A run started afterwards uses the new instructions. Other agents are never missing during the refresh. | — | Integration test with concurrent reads during refresh |
| AC-003 | REQ-010, REQ-005 | SCN-003 | An agent/team/org folder is deleted. | Within 5 s, it is gone from all lists, `@` and `list_available_agents`. Delegating to it gives the existing "not found/unavailable" error. | — | Integration test |
| AC-004 | REQ-007, REQ-009 | SCN-004 | A valid agent's `agent-config.json` is overwritten with broken JSON (or `agent.md` loses required front matter). | The agent stays listed and usable per DEC-001, with an error on its card naming the file and reason. Fixing the file replaces it and clears the error within 5 s. | — | Integration and web component tests |
| AC-005 | REQ-008, REQ-009 | SCN-004 | A new, invalid agent/team/org is added. | It is not available for new runs; a diagnostic is visible; other definitions are unaffected. | — | Integration test |
| AC-006 | REQ-004 | SCN-005 | 50 definition files are changed in one burst (simulating `git pull`). | One coalesced refresh per affected root and kind (not 50), completed within 5 s after the burst ends; the web receives a bounded number of notifications (not one per file). | — | Integration test counting refreshes and notifications |
| AC-007 | REQ-011, QR-002 | SCN-006 | Files inside an agent's bundled `skills/<name>/` folder and inside a skill source folder are edited, added and removed. | No agent/team/org reload and no web notification occur. Skill source folders are not watched. Run starts still use the current skill files, and the Skills page shows the change after Reload (unchanged behavior). | — | Integration test asserting no reload/notification; watcher registry inspection |
| AC-008 | REQ-012 | SCN-007 | A run is active; its agent definition is edited, then removed. | The active run keeps working with its original definition (no restart, no error). After the edit, a new run uses the new definition. After removal and stop, restoring that run shows the existing "definition not found" error. | — | Integration test; desktop verification |
| AC-009 | REQ-013 | SCN-008 | A GitHub package shows "update available"; the user clicks Update in one window while another window has the Agents page open. | The second window's lists update without Reload. No download happens without the click. | — | Store/feed test; existing update tests |
| AC-010 | REQ-006 | SCN-009 | A web client is disconnected; files change; the client reconnects. | After reconnect, the loaded lists show the current state. | — | Web feed test |
| AC-011 | REQ-014 | SCN-011 | A local package is imported, then removed, at runtime. | Watching starts after import; after removal, no events from that root and its handles are released. | — | Integration test inspecting watcher registry |
| AC-012 | REQ-015, REQ-016 | SCN-011 | A registered root is renamed away; separately, watcher setup is forced to fail. | The server keeps running; Settings shows the package/source error or "not auto-refreshing"; manual Reload still works; restoring the root resumes watching. | — | Integration test with injected watcher failure |
| AC-013 | REQ-017 | SCN-010 | The user clicks Reload on the Agents page. | The server refreshes, and other connected clients update too. | — | Store test |
| AC-015 | REQ-002, REQ-010, REQ-012 | SCN-012 | The Project Task Manager delegates to the Agent Package Creator, which (a) creates a new agent and a new team, (b) edits an existing team's members/handoffs and an agent's instructions, and (c) deletes an agent, all on disk with file tools. No Reload is clicked. Within 5 s the user asks the Project Task Manager to delegate again. | (a) `list_available_agents` lists the new agent and team, and `delegate_task` to each spawns a working copy. (b) A newly spawned copy of the edited team has the current members and handoffs, and its agents (on any runtime, including Codex) use the current instructions. (c) The deleted agent is not listed, and `delegate_task` to it returns the existing not-found result. | Copies spawned **before** the change keep running with their original snapshot (REQ-012). | Server integration test through the real delegation path with real temp package folders and the watcher; desktop user verification with the Project Task Manager and Agent Package Creator |
| AC-016 | REQ-018 | SCN-012 | A new agent's files are written, and `list_available_agents` / `delegate_task` to it is called **immediately** (inside the settle window, before the refresh would normally run). | The lookup includes the new agent, and the delegation succeeds. | If the files are invalid at that moment, REQ-007/REQ-008 apply. | Integration test with a long settle window to make the race deterministic |
| AC-014 | QR-001, QR-002 | SCN-001 | The user's real configuration (2 imported packages; 5 skill sources including `autobyteus_mcps`, 36k dirs). | Idle CPU stays near zero (no periodic local scans). The number of watched directories stays proportional to definition folders (hundreds, not tens of thousands). Skill source folders, `skills/` subfolders, `.git` and `node_modules` are not watched (REQ-011, QR-002). The measured watch count is recorded (on Linux, chokidar also watches files: about 400–700 expected). | — | Probe/measurement recorded by API/E2E; desktop check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System | Agent Package Creator or the user | Create a new agent/team/org and use it at once | File tools/editor write into a watched package | Package imported; app open | Files written → settle → catalog refresh → web notified | Visible and usable within 5 s | Invalid → SCN-004 | Supported Normal Scenario | User request | REQ-001–006; AC-001 |
| SCN-002 | User/System | Same | Iterate on an existing definition | Edit files | Definition exists | Edit → refresh | New version everywhere; new runs use it | — | Supported Normal Scenario | User request | REQ-002, REQ-003; AC-002 |
| SCN-003 | User/System | Same | Retire a definition | Delete folder | Definition exists | Delete → refresh | Gone everywhere | Active runs → SCN-007 | Supported Normal Scenario | User request | REQ-010; AC-003 |
| SCN-004 | User/System | Same | Survive a broken or half-written edit | Partial write or bad content | Valid definition exists, or a new invalid one | Write → refresh → error | Last good kept plus error; fix clears it | First-seen invalid → unavailable plus diagnostic | Supported Normal Scenario | User request; REQ-027 | REQ-007–009; AC-004, AC-005 |
| SCN-005 | Operational | User | Update a local package repo with git | `git pull`/`checkout` in the package folder | Package imported | Many changes → one coalesced refresh | Consistent final state; no flapping | Transient invalid states → last good | Supported Normal Scenario | User's packages are git repos | REQ-004; AC-006 |
| SCN-006 | User/System | Same | Edit skills | Skill source folder or bundled `skills/` | Source registered | Write → nothing is monitored → the server reads current skills on demand; the user clicks Reload on the Skills page if viewing it | Unchanged from today | — | Supported Normal Scenario (no-change boundary) | User 2026-10-10 | REQ-011; AC-007 |
| SCN-007 | Contract | Run continuity | Definition changes during a run | Any of SCN-002/003 | Run active | Change → catalog refresh | Active run unaffected; next start/restore uses current | Removed → restore shows "not found" | Supported Normal Scenario | BEH-005 | REQ-012; AC-008 |
| SCN-008 | User | User | Update a GitHub package | Settings → Update | Update available | Click → install → refresh → notify | All clients updated | Failure → existing rollback | Supported Normal Scenario | `agent-package-update-ux` | REQ-013; AC-009 |
| SCN-009 | System | Web client | Recover after disconnect | Reconnect | Lists loaded | Reconnect → re-read | Current state | — | Supported Normal Scenario | `/ws/projects` precedent | REQ-006; AC-010 |
| SCN-010 | User | User | Force a refresh | Reload buttons | Any | Click → refresh → notify | Same as today, plus other clients | — | Supported Normal Scenario | Existing UI | REQ-017; AC-013 |
| SCN-012 | User/System | User via the Project Task Manager; the Agent Package Creator | Change packages through one delegated task, then delegate the next task against the result | Project Task Manager `delegate_task` → Agent Package Creator writes files → user asks for a new delegation → `list_available_agents` / `delegate_task` | Packages imported; the Project Task Manager run is active | Create/edit/delete files → settle → catalog refresh → next delegation resolves against the current catalog | The new delegation uses current definitions (new found, deleted gone, edited current) | Invalid edit → SCN-004; copies already running → SCN-007 | Supported Normal Scenario (primary) | User clarification 2026-10-10 | REQ-001, REQ-002, REQ-010, REQ-012; AC-015 |
| SCN-011 | Operational | User/OS | Registration changes, missing root, watch failure | Import/remove; folder moved; OS limit | Any | Watch set follows; errors reported | Server stable; fallback works | Root restored → resumes | Supported Explicit Edge Scenario (operational robustness requested by the user) | User "be safe" | REQ-014–016; AC-011, AC-012 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (minimal, specified here; no Product Design requested)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, design repository, UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative details: lists update in place, without a page reload or flicker to empty. An error indicator appears on the affected agent/team/org card, with the file path and reason available (for example, a tooltip or expandable text). Settings → Agent Packages rows show a package error or "not auto-refreshing". Skill Sources are not monitored (REQ-011), so they show no auto-refresh status. Existing Reload buttons remain. English and Chinese localization follow the existing catalogs.
- Explicitly illustrative / permitted variation: exact indicator styling and wording, following existing card/badge patterns.
- Explicitly unresolved product decisions: none beyond DEC-001…DEC-006.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-014 | Performance | No periodic polling of local folders; near-zero idle CPU from watching | All local sources | Measurement |
| QR-002 | REQ-014, AC-014 | Operability | Monitor only definition structure: definition folders being added or removed under `agents/`, `agent-teams/` and `agent-orgs/` (including nested team-local and org-owned definition folders), and changes to definition files (`agent.md`, `agent-config.json`, `team.md`, `team-config.json`, `org.md`, `org-config.json`). Never monitor `skills/` subtrees, skill source folders, `.git`, `.gitignore`d paths or dependency/build folders (`node_modules`, venvs and similar). Reuse the server's existing watcher ignore rules where suitable. Release handles on remove/shutdown. | User's real config ≈ a few hundred watched folders | Watcher registry inspection |
| QR-003 | REQ-002–005, AC-001–007 | Performance | Change visible in server readers and connected web views ≤ 5 s after the last write of a burst | Local filesystem | Timed integration tests |
| QR-004 | REQ-003 | Reliability | Readers never observe an empty or partial catalog during a refresh | Concurrent reads | Integration test |
| QR-005 | REQ-016 | Reliability | A watcher failure never crashes the server or blocks startup | All platforms | Fault-injection test |
| QR-006 | REQ-005 | Security | The change feed uses the same remote-access authorization as existing websockets | Remote clients | Test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: package files, registry, settings, run history, run metadata.
- Loss acceptable: in-memory last-good copies and diagnostics are rebuilt from disk on restart (a definition still invalid at startup becomes "unavailable with diagnostic").
- Constraints: none.
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| OS file-change notifications (via Node/chokidar) | Deliver change events for local folders | Node/chokidar docs | Network filesystems/limits → REQ-016 fallback |
| `flat-agent-organization-model` REQ-027 | Invalid external definitions unavailable for new runs with diagnostic | Approved earlier | Refined for live edits by REQ-007 |
| `agent-package-update-ux` | No GitHub update without explicit consent | Approved earlier | DEC-002 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Package and skill sources are local filesystems with change notifications | Watching depends on it | REQ-016 fallback; design verifies per platform | Open |
| ASM-002 | A 5 s visibility target satisfies "within a few seconds" | Measurable AC | User confirms with approval | Confirmed (DEC-006 approved) |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | When a working definition becomes invalid, is the kept last good version also **used for new runs and delegation**, or only shown? | Determines what launches while a file is broken | **(A, recommended)** Keep it fully usable (lists, `@`, new runs, delegation) and marked with the error until fixed; kept in memory only, so after a server restart a still-broken definition is unavailable with a diagnostic. (B) Keep it visible with the error, but block new runs until fixed. | User | Approved as recommended 2026-10-10 (SR-005) |
| DEC-002 | GitHub packages/skill sources: poll or explicit? | Consent and rate limits | **(A, recommended)** Explicit Check/Update as today (status check on opening Settings); no polling. Managed copies only change through Update, which now pushes to the web. (B) Additionally run a periodic status-only check (for example every 6 h) that only shows "update available". | User | Approved as recommended 2026-10-10 (SR-005) |
| DEC-003 | Running runs whose definition changes or is removed | Continuity | **(Recommended)** Active runs are never touched. Changes apply to runs or team members started or restored later. A removed definition: active runs continue; restoring after stop shows the existing "definition not found" error. This matches what happens today after a restart. | User | Approved as recommended 2026-10-10 (SR-005) |
| DEC-004 | Keep manual Reload buttons? | Fallback | **(Recommended)** Keep all existing Reload buttons as a fallback. | User | Approved as recommended 2026-10-10 (SR-005) |
| DEC-005 | Which roots are watched, and what happens when a root folder disappears? | Scope and safety | **(Recommended)** Watch the definition folders of imported local packages and of the app-data default package. Skill source folders are **not** watched (SR-003). GitHub-managed copies are refreshed only by Update. If a root folder disappears (moved, unmounted), keep its last good definitions, show a package error in Settings, and resume when it returns; removing the package in Settings removes its definitions. | User | Approved as recommended 2026-10-10 (SR-005) |
| DEC-007 | Should an agent that lists a skill name no longer found (for example, after a `SKILL.md` `name` change) show a visible warning? | The agent runs without that skill (log only). The monitor does not affect this. | **Decided: (A) no change.** The user confirmed tolerance is by design: a missing skill is logged, the run continues, and the LLM simply cannot read the skill. No warning UI. | User | Resolved 2026-10-10 (SR-004) |
| DEC-006 | Is the 5 s target right? | AC timing | **(Recommended)** About a 1 s settle window plus refresh, with ≤ 5 s as the acceptance bound. | User | Approved as recommended 2026-10-10 (SR-005) |
| DSN-001 | Do GitHub-managed package folders get watched? | Uniform watching vs. source-kind branching | **Decided (Solution Designer, 2026-10-11): yes, every registered root is watched uniformly.** No polling or download is added. A GitHub-managed folder changes only during an explicit Update, so watching it only makes the post-Update state converge through the same path. Consistent with DEC-005/REQ-013 intent. | Solution Designer | Decided (solution detail; no change to approved behavior) |
| DSN-002 | Duplicate team/org identity across packages: which policy do all readers follow? | REQ-002 (readers agree). Today admission (lists, team/org launch) marks a duplicated ID unavailable, while the cache (delegation, `list_available_agents`) used first-root-wins. | **Decided (Solution Designer, 2026-10-11, ARCH-REV-001 AR-002):** keep the established admission rule (flat-agent-organization-model REQ-027 lineage) for every reader. A team/org ID present in more than one registered package is unavailable everywhere, with a `DEFINITION_IDENTITY_DUPLICATED` diagnostic listing the paths. Agents keep first-root-wins, as today. Effect: delegation stops offering a duplicated team that launch already rejected. This is a consistency fix, not new product policy. | Solution Designer | Decided (solution detail) |
| DSN-003 | Do nested definitions (team-local agents, org-owned agents/teams) get last good? | ARCH-REV-001 AR-004; REQ-007 plain reading; 111/156 of the user's agents are nested | **Decided (Solution Designer): yes.** REQ-007/REQ-009 apply to every definition under a registered root, nested ones included. Implemented by reconciling a team or org together with its nested definitions as one unit. No requirement narrowing. | Solution Designer | Decided (solution detail; matches the approved requirement) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | — |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-002, AC-015 | SCN-001, SCN-002, SCN-012 | — |
| REQ-003 | UC-001 | BEH-001 | AC-002 | SCN-002 | — |
| REQ-004 | UC-001 | BEH-001 | AC-006 | SCN-005 | — |
| REQ-005 | UC-001 | BEH-003 | AC-001, AC-003 | SCN-001–005 | — |
| REQ-006 | UC-006 | BEH-003 | AC-010 | SCN-009 | — |
| REQ-007 | UC-002 | BEH-004 | AC-004 | SCN-004 | DEC-001 |
| REQ-008 | UC-002 | BEH-004, BEH-008 | AC-005 | SCN-004 | — |
| REQ-009 | UC-002 | BEH-004, BEH-008 | AC-004, AC-005 | SCN-004 | — |
| REQ-010 | UC-001 | BEH-001 | AC-003, AC-015 | SCN-003, SCN-012 | — |
| REQ-011 | UC-003 | BEH-007 | AC-007 | SCN-006 | User decision SR-003 |
| REQ-012 | UC-004 | BEH-005 | AC-008, AC-015 | SCN-007, SCN-012 | DEC-003 |
| REQ-013 | UC-005 | BEH-006 | AC-009 | SCN-008 | DEC-002 |
| REQ-014 | UC-007 | BEH-001 | AC-011 | SCN-011 | — |
| REQ-015 | UC-007 | BEH-001, BEH-008 | AC-012 | SCN-011 | DEC-005 |
| REQ-016 | UC-007 | BEH-002 | AC-012 | SCN-011 | — |
| REQ-017 | UC-005 | BEH-002 | AC-013 | SCN-010 | DEC-004 |
| REQ-018 | UC-001 | BEH-001 | AC-016 | SCN-012 | Approved plan item 2 |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001…SCN-012 (after approval); SCN-012 is the primary journey.
- Product and system constraints to preserve: precedence rules; in-app write paths; package import/reload/update validation and rollback; GitHub consent; run continuity; remote-access auth.
- Decisions intentionally deferred to architecture design: watcher technology and process placement; watch-set computation; debounce/coalescing mechanics; how cached and fresh readers converge; the last-good store; the diagnostics API for agents; the change-feed contract and web store integration.
- Technical facts to verify: chokidar/`fs.watch` behavior and cost on macOS, Linux and Docker; whether to reuse the file-explorer watcher runtime; team/org dependency effects of agent changes; the skill-catalog notification path.
- Known feasibility or integration risks: R-001…R-003 in the investigation notes.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-10, SR-005)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
