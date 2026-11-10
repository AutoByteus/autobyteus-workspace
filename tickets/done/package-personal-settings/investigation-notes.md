# Investigation Notes

## Investigation Meta

- Package identifier: `package-personal-settings`
- Request: Project Task autobyteus-95, "Personal settings vs. package files for agents, teams and orgs"; delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-24
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings`, branch `codex/package-personal-settings`
- Base: `origin/personal` `c78ffb15a2` (fetched 2026-10-24). Finalization target: `origin/personal`.
- Bootstrap: worktree created; ticket folder `tickets/in-progress/package-personal-settings/`. No blocker.
- Current solution revision: `SR-006`
- Authorities read (2026-10-24): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (read in this conversation); the updated `SKILL.md`.
- How established: `Read` (code/docs) unless marked `Measured`.

## Request

- The Task description: four items (avatar personal; personal runtime/model overrides; clean package writes, including FT-5/O-2; meaning of editing GitHub-installed packages). One coherent model of package content vs personal settings. The user decides the real product choices.
- Attachments:
  - `follow-up-task-request.md` (imported-team-defaults-edit, 2026-10-14);
  - `follow-up-ticket-requests.md` (FT-5/O-2: the first save of an older package drops `refType`, reorders `avatarUrl` in `org-config.json`, drops `team.md`'s trailing newline).
- The user's direction, 2026-10-24, which raises the priority:
  - updates of a GitHub agent package, by click or automatic, must not lose the user's personal changes;
  - he mostly ADDS tools or MCP choices in `agent-config.json` or the team config (for example, on his Docker machine he installs an MCP server and enables it on an agent);
  - everything else may be overwritten.
  - Compare (A) a personal overlay in the app and (B) a 3-way merge at update time.
  - Never lose data silently (a backup at minimum); any change to stored user data needs his approval.
- The Project Task Manager, 2026-10-24: stage the work so the tools-survive-updates case comes first; ask the user directly for product choices.

## Source Log And Findings

| ID | Source | Finding | How |
| --- | --- | --- | --- |
| F-01 | `autobyteus-server-ts/docs/modules/mcp_server_management.md:18-21` | An agent enables a registered MCP server's tools by listing the tool names in the same `agent-config.json` `toolNames` as local tools. The user's "enable an MCP server on an agent" is therefore an edit of `toolNames` inside the package folder | Read |
| F-02 | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/agent-config.json` | A real package agent config: `toolNames`, `skillNames`, `skillScope`, five empty processor lists, `avatarUrl` (an app-local `/rest/files/images/<uuid>.png`), `defaultLaunchConfig: null` | Read |
| F-03 | `autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts:54-79` | A save writes every field from the in-memory definition (`buildAgentConfigRecord`), including empty lists and `null`s, over the existing file (`mergeAgentConfigRecord` keeps unknown keys). This is the cause of item 3's noise | Read |
| F-04 | `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:105-184` | A package update moves the installed folder to `<staging>/previous-install`, renames the new archive's folder into place, and on commit deletes the staging folder, previous install included (`cleanup`, lines 148-166). The whole folder is replaced: an edited `agent-config.json` or team config is overwritten, and no backup survives | Read |
| F-05 | 209 design (no confirmation for a package's manual Update, the user's decision); `autobyteus-web/localization/messages/en/updateNotifications.ts:55, 73-74` | Manual package Update: no warning. Turning automatic updates on: a one-time confirmation "Local changes and files you added in a package are replaced without asking and cannot be restored." | Read |
| F-06 | F-04, F-05 | **Answer to the user's question:** today nothing detects or keeps personal edits. After every update, by click or automatic, added tools and MCP choices are gone, and the user has to re-add them | Read |
| F-07 | `autobyteus-server-ts/docs/modules/agent_team_definition.md:9-27, 138-170`; `src/agent-team-definition/providers/agent-team-definition-config.ts:115-153` | Team config: coordinator, members, handoffs, `avatarUrl`, `defaultLaunchConfig`. Member tools live in the member agents' `agent-config.json` | Read |
| F-08 | `tickets/done/imported-team-defaults-edit/solution-revision-record.md` (SR-001, SR-003) | An app-data personal launch-preference store (`AgentLaunchPreferenceStore`, keys `agent:` / `agent_team:` / `agent_org:`) was designed and reviewed, then withdrawn. On 2026-10-14 the user said tools, skills and the tested runtime/model belong in the package and the avatar is personal | Read |
| F-09 | `src/launch-preferences/default-launch-config.ts` | Only the normalizer of `defaultLaunchConfig` exists; no personal store | Read |
| F-10 | F-02 | A package's `avatarUrl` points to an image file in the app data of the machine that saved it; on other machines it shows nothing (the user's point in item 1) | Read |

## Requirement Implications

- The tools case needs either a personal place for tool additions that updates never touch (A), or a merge at update time that keeps them (B).
- Both need the previously installed revision's files to know what the user changed: (A) only once, to carry over edits made before this change; (B) at every update. `codeload` serves any revision by SHA without API quota (209/210 evidence).
- A backup of every overwritten file that differs from the installed revision is the minimum safety either way.

## Supplemental Artifacts

| Artifact | Kind | Status | Relationship |
| --- | --- | --- | --- |
| `personal-settings-file-contract.md` | Behavior-defining supplement | Approved by the user (Q1–Q5), 2026-11-09; wording "base value" at SR-006 | Storage, shape, reading/writing rules, effective values, update capture and backup |
| `evidence/validate-personal-settings-file.mjs` and `evidence/personal-settings-file-validation-run*.log` | Validation evidence | All pass (22 checks), last on base `a85bf4f38d` | Validates the contract on real package data |

## Product Design Request Context

- Not requested yet. The changes visible to the user (which edits are personal, the notes at the editor, the update confirmation text) may need a Product design step once the model is chosen.

## Architecture Investigation Findings

Recorded 2026-11-09 on base `a85bf4f38d` (the branch rebased; the contract re-verified, `evidence/personal-settings-file-validation-run-rebased.log`). Server paths are relative to `autobyteus-server-ts/`.

| ID | Source | Finding | How | Design implication |
| --- | --- | --- | --- | --- |
| AF-01 | `src/agent-definition/services/agent-definition-service.ts:228-273` | Every agent read (`getAgentDefinitionById`, `getAllAgentDefinitions`, `getVisibleAgentDefinitions`, `getAgentDefinitionsWithTeamLocal`) passes through one projection, `stripMandatoryProcessors`. Package and team-local agents come from the package definitions store; application-owned ones from `fileStore` | Read | Apply personal settings next to that projection, for store-backed agents |
| AF-02 | grep of `packageDefinitions.store` outside `src/agent-package-definitions/` | Only the agent, Team and Org definition services read the store (6, 9 and 6 call sites) | Read | The three services are the complete read boundary |
| AF-03 | grep of `agent-config.json` / `team-config.json` / `org-config.json` outside providers | Only path helpers (`config/app-config.ts:372-400`), a family check (`definition-admission-service.ts:154`) and an application package validator; none reads the four settings | Read | No reader outside the services |
| AF-04 | `src/agent-package-definitions/services/agent-package-definition-store.ts:34-42`; `domain/agent-package-definition-types.ts:66-82`; `domain/registered-package-roots.ts:14-40` | Each store entry has `location.sourceClass`: `server_data` (the app's own folder: the user's agents and the built-ins) or `registered_package` | Read | The scope rule: `registered_package`, or a built-in ID in `server_data` |
| AF-05 | `src/built-in-agents/built-in-agent-bootstrapper.ts:95-133`; `built-in-agent-registry.ts:1-3, 15-24`; `application-platform/runtime/application-platform-lifecycle.ts:57` | At every server start the built-in agents' `agent.md` and `agent-config.json` are copied over the existing files and `skills/` is mirrored. IDs `autobyteus-daily-assistant`, `autobyteus-model-router`. The registry imports nothing | Read | Built-ins in scope (DEC-009); importing the IDs creates no cycle |
| AF-06 | `agent-definition-service.ts:300-366`; `agent-team-definition-service.ts:116-121, 281`; `agent-org-definition-service.ts:124` | Updates patch the stored (package) definition and write it to the files; the agent form sends all fields (`autobyteus-web/components/agents/AgentDefinitionForm.vue:463-472`) | Read | Split an update: the four settings → the personal settings file; other fields → files only when one actually differs (otherwise no file write) |
| AF-07 | `src/agent-definition/services/agent-definition-change-signal.ts`; `compositions/agent-package-definition-feed-composition.ts:36-39`; `tool-list-updates/tool-list-updates.ts:27` | A reload is announced once: the hub (web lists) and `AgentDefinitionChangeSignal` (running agents take their definitions' tools, autobyteus-324) | Read | A personal setting change is announced through the same publish function |
| AF-08 | `domain/agent-package-definition-types.ts:98-113`; `agent-package-definition-reloader.ts:380` | Folder readers read definition folders from a list of package roots | Read | The installed revision can be read as a temporary root with the same ID rules |
| AF-09 | `src/agent-packages/services/github-agent-package-updates.ts:84-170`; `installers/github-agent-package-installer.ts:105-184, 191-233` | Update: metadata → stage the archive (old folder moved to staging, deleted on commit). The installer has private download/extract helpers (codeload by revision) | Read | Capture and backup run in the update before staging; the installer gains a public "download a revision" method |
| AF-10 | `src/launch-preferences/default-launch-config.ts:1-40` | The stored type allows partial values; the app uses a default only when both runtime and model are named | Read | Personal `defaultLaunchConfig` names both (contract) |
| AF-11 | `GLOSSARY.md` (Nodes, Agent Definitions) | "Node", "built-in agent" and "internal agent" are defined; "personal" is unused in code except the branch name | Read | Add "personal setting" to the glossary |

