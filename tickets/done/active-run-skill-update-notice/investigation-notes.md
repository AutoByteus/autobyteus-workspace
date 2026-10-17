# Investigation Notes

## Investigation Meta

- Package identifier: `active-run-skill-update-notice`
- Request / ticket: Project Task `project_task_0e330de1-0508-4424-8a6a-01e92f529312` from `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-13. Follow-up to `agent-package-auto-refresh` (merged `b57d85ad9`; the Task's "b46e41a7" is not a commit in this repository and is taken to mean that prior Task).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice`
- Repository mode: `Git`
- Task worktree / branch: same path, `codex/active-run-skill-update-notice`
- Resolved base: `origin/personal` @ `6473e269471cf5ad62abb4f70de63c47f48df485` (after `git fetch origin --prune`, 2026-10-13); contains `b57d85ad9`
- Finalization target: `origin` / `personal`
- Bootstrap result: Dedicated worktree created; the shared checkout was not used for authoring.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements gate): `references/requirements-engineering.md` (re-read 2026-10-13, updated version); `SKILL.md` re-read 2026-10-13 (updated approval rule: approve within direction).
- Investigation status: Requirements-level complete; architecture-level pending.

## Initial Request And Clarifications

- Original request: When a skill used by an active agent run changes (the Agent Package Creator's PR is merged and the local checkout updates), the platform should send that run a short notification that the skill was updated, so the agent re-reads it. Today the user tells each agent manually.
- Clarification (user via `/project_task_manager`, 2026-10-13): "It's okay when one agent is in the middle of a task… we can also just send the agent message… we already send the agent message from other agents directly now." Deliver the notice the way the platform already delivers messages from other agents to a running agent, mid-turn included. Reuse that path; do not build a new delivery mechanism. Still apply: one notice per run per change, marked as a system/platform notice, all runtimes.
- Task considerations: which runs (active, delegated copies, team/org members; idle or shut-down-but-resumable runs when they next wake); every runtime; batching; presentation as a system notice; what counts as a change (skill folder files, references, templates; ignore noise).
- Done when: editing or merging a used skill causes each affected run (supported runtimes) to receive one short notice naming the skill (and files), and the agent re-reads it. Verified with real runs and tests. Released; the user checks it in the app.

## Product And Domain Understanding

- Product area:
  - skills (`autobyteus-server-ts/src/skills`);
  - run execution and skill exposure per runtime (`agent-execution/backends/*`);
  - inter-agent message delivery (`agent-communication`, `agent-collaboration`);
  - conversation presentation (web segments).
- Actors:
  - the user (approves skill PRs);
  - the Agent Package Creator (edits skills);
  - running agents (Project Task Manager, delegated copies, team/org members, standalone runs).
- Terminology:
  - **Configured skills**: an agent's skills, resolved at run start from `agent-config.json` `skillNames`, or every installed skill for scope `ALL_INSTALLED`.
  - **Skill folder**: the folder holding `SKILL.md` plus its scripts and references.

## Source Log

| Date | Source Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-13 | Command | `git fetch origin --prune`; `git worktree add -b codex/active-run-skill-update-notice … origin/personal` | Bootstrap | Base `6473e2694` contains `b57d85ad9` | No |
| 2026-10-13 | Doc | `tickets/done/configured-skill-on-demand-loading/requirements*.md` | How native runs load skills | Native AutoByteus puts only skill name, description and absolute `SKILL.md` path in the system prompt; the agent reads the file on demand with `read_file`/`run_bash`, so a later read returns current content (BEH-003 there). Codex/Claude use runtime-specific exposure. | Staleness = the text already read into the conversation |
| 2026-10-13 | Code | `agent-execution/backends/shared/workspace-skill-materializer.ts`, `workspace-skill-links.ts`; `codex/`, `claude/`, `grok/` `*-workspace-skill-materializer.ts` | How Codex/Claude/Grok expose skills | Whole skill folders are **symlinked** into the run's workspace (`<workspace>/<runtime skills root>/<name>` → source). A registry tracks link holders per runtime profile. File content seen through the link is always current. | The notice can name the path the run reads |
| 2026-10-13 | Code | `skills/services/skill-service.ts` `resolveConfiguredSkillBindingsForAgent` / `resolveConfiguredSkillsForAgent`; callers in `claude-session-bootstrapper.ts:73`, `codex-thread-bootstrapper.ts:245`, `autobyteus-agent-run-backend-factory.ts:412`, `agy-agent-run-backend-factory.ts:53`, `acp-agent-run-backend-factory.ts:141` | When skills are bound to a run | Every runtime resolves configured skills **at run start/restore**. No central record of which skills an active run uses exists; only the Codex/Claude/Grok materializer registries know link holders. | A run → skills record is needed (design) |
| 2026-10-13 | Code | `agent-execution/backends/` (`acp`, `antigravity`, `autobyteus`, `claude`, `codex`, `grok`) | Runtime list | Six runtimes | "All runtimes" means all six |
| 2026-10-13 | Code | `agent-communication/services/send-message-to-dispatcher.ts`, `global-agent-run-message-router.ts`, `global-agent-run-message-runtime-builders.ts` | Existing inter-agent delivery | Exact-run delivery: inside a collaboration root → `root.deliverExactAgentMessage` (restores a shut-down delegated child first); otherwise `agentRunManager.getActiveRun(id).postUserMessage(AgentInputUserMessage(content, SenderType.AGENT, …metadata))` plus `publishEvent(INTER_AGENT_MESSAGE)` for the web. Visible text: "You received a message from sender name: … message: …". | Reuse this path (user direction) |
| 2026-10-13 | Code | `agent-execution/domain/agent-run.ts` `postUserMessage` (lines 166–200) | Mid-turn behavior | Input admission dispatches `append_to_active_turn` when a turn is active; otherwise it starts a turn. | Mid-turn delivery is native to the path |
| 2026-10-13 | Code | `autobyteus-ts/src/agent/sender-type.ts` (`USER`, `AGENT`, `SYSTEM`, `TOOL`); `agent-collaboration/execution/task/task-execution-input.ts:45`; `agent-collaboration/execution/events/task-system-input-presentation.ts`; web `components/conversation/segments/SystemTaskNotificationSegment.vue`, `services/agentStreaming/handlers/systemTaskNotificationHandler.ts` | System-notice precedent | Delegated task work is posted as `SenderType.SYSTEM` with notification metadata and rendered in the web as a distinct "system task notification" segment (role `note`). | Same pattern for skill notices |
| 2026-10-13 | Code | `agent-execution/services/agent-run-manager.ts` `getActiveRun`, `listActiveRuns`; `AgentRun.getStatusSnapshot()` | Enumerating and classifying runs | Active runs are listable; status distinguishes running from idle | — |
| 2026-10-13 | Prior ticket | `agent-package-auto-refresh` REQ-011 / SR-003 | Earlier skill decision | Skills were deliberately **not watched** there, because the server reads skill files fresh at run start. This ticket adds watching for a different purpose: notifying runs that already read a skill. | Scope only skills used by runs; reuse that ticket's watching stack |
| 2026-10-13 | Data | User's skill sources (earlier sizing): `autobyteus_mcps` has 36,761 dirs | Watch cost | Skill folders can contain heavy content (venvs, node_modules) | Watch only used skill folders, with ignore rules |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | A skill folder used by an active run changes (edit, merge, checkout) | Nothing observes it. The run's conversation keeps the earlier read of `SKILL.md`. | The agent follows old text until the user tells it to re-read | Task; skill sources are not watched | High |
| BEH-002 | Contract | Run start/restore | Skills are resolved and exposed (prompt paths or workspace symlinks); later file reads are current | New runs and fresh reads get the new skill | Source log | High |
| BEH-003 | Contract | Agent-to-agent message to a run | Existing exact-run delivery; mid-turn append or new turn; the web shows an inter-agent message | Message reaches any runtime | Source log | High |
| BEH-004 | Contract | Platform system input to a run (delegated task work) | `SenderType.SYSTEM` + notification metadata; rendered as a system task notification segment | Clearly not a user message | Source log | High |

## Relevant Codebase And Technical Facts

| Component | Behavior | Requirement Implication | Design Question |
| --- | --- | --- | --- |
| Skill resolution at bootstrap (6 runtimes) | Per-run skill set known only transiently | Need the run → used skills mapping | Record at bootstrap vs. re-resolve from the definition at change time |
| Workspace skill materializer | Symlinks; holder registry | Content current; notice should name the path the run reads | Which path per runtime |
| Exact-run delivery path | Mid-turn capable; root path restores shut-down children | Reuse for busy runs | How to deliver to idle/shut-down runs at next wake without starting a turn |
| Agent package monitor (`src/agent-package-definitions/`) | Structural allow-list watcher, settle window, change hub | Reuse its watching approach for skill folders | Separate watch set (skill folders), different ignore needs |

## Structural And Payload Surface Inventory

- Payload: skill folders (`SKILL.md`, references, scripts, templates).
- Structural:
  - skill change detection (new);
  - run → used-skills tracking (new);
  - notice delivery via the existing message path;
  - web presentation (existing system-notice segment pattern);
  - possibly a per-run "skill versions seen" record for next-wake delivery.
- Potential impacts:
  - **Persistence:** possibly an additive per-run record. Present / to decide.
  - **Concurrency:** batching and settle. Present.
  - **API/contract:** a new system-notice metadata kind and web segment. Present.
  - **Security:** none new (paths are the run's own skills).

## Persisted Data And State Facts

- Possibly affected: run metadata, if a per-run "skill versions seen" record is persisted for next-wake delivery across app restarts. Additive only; no existing data needs transforming. Decision in design.

## Product Design Request Context

- Not requested. Presentation follows the existing system task notification segment pattern.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| None | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| U-001 | Unknown | Exact mid-turn behavior of each runtime's append (Codex steer, Claude streaming input, AGY, ACP, Grok) | Existing path; validate per runtime in API/E2E |
| U-002 | Unknown | Which path to show the agent for re-reading (source vs. workspace link) per runtime | Design |
| R-001 | Risk | Agents with skill scope `ALL_INSTALLED` would be notified about every skill change | Bounded by batching; the notice wording says "if you rely on it" |
| R-002 | Risk | Heavy skill folders (venvs, node_modules) | Ignore rules; watch only used skill folders |

## Architecture Investigation Findings

Authorities read for design (2026-10-13):
- `references/architecture-design.md` (updated 2026-10-12, re-read);
- `references/design-principles.md` (unchanged since read 2026-10-10 in this conversation);
- root `DESIGN.md` (unchanged since base `56530dfc6`, verified by `git diff`);
- `TESTING.md` (rewritten in this base; read 2026-10-13).

| Source | Observation | Design implication |
| --- | --- | --- |
| `agent-execution/services/agent-run-manager.ts:122–160` `beginActivation(request)` with `AgentRunActivationRequest` kinds `new` / `restore` / `platform_restore`; `constructRun` builds every `AgentRun` with `commandObservers`; `agent-run-activation-operation.ts` publishes through `AgentRunActivationRegistry.publish` | **Every** AgentRun (standalone, team/org members via `configured-agent-activation-planner.ts`, delegated copies) is constructed and published through this one manager. New vs restore is explicit. | One place to start tracking a run's skills (new: record current; restore: load what it saw) and to give the run an input-preface port |
| `agent-execution/domain/agent-run.ts` `postUserMessage` (166+), `reserveUserMessage`, `publishEvent` | All inputs end in these two admission methods. The run can publish its own `AgentRunEvent`. | The notice for idle/restored runs is admitted right before the next input inside the run; presentation is published by the run |
| Input producers: `configured-agent-execution-handle.ts:137` (member `postMessage` + `member_input` presentation), `reserveInput` (teammates), `standalone-root-message-delivery.ts:98`, `global-agent-run-message-router.ts:195`, `agent-run-command-coordinator.ts:135` (user), `application-execution-scope.ts:141`, `inter-agent-message-router.ts:11`, skill-improver session | Many callers; root-level presentation is per caller | Prefacing must live in `AgentRun`, not in callers |
| `agent-execution/domain/agent-run-event.ts:29` `SYSTEM_TASK_NOTIFICATION`; `collaboration-agent-presentation-adapter.ts:360–366` maps an AgentRun `SYSTEM_TASK_NOTIFICATION` event (no `sender_run_id`) to presentation `{sender:{kind:"system"}, content}` | Publishing that run event shows a system notice in every root's stream | Reuse the event; no new event type |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts:94–101` | The native core emits a system-notification stream event for any SYSTEM input unless metadata `suppress_system_task_notification` is set | Notice messages set the suppression flag; the server publishes the event uniformly for all six runtimes (as the task-delegation notice does) |
| `agent-memory/services/runtime-memory-event-accumulator.ts:237–252` | `system_task_notification` raw traces are recorded only for sender `CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID` | Add the skill-notice sender ID so notices replay in reopened history |
| `run-history/services/root-run-package-current-validator.ts:240–250`; real memory dir `~/.autobyteus/server-data/memory/agents/<id>/` (`run_metadata.json`, `raw_traces_active.jsonl`) | Validators check required and retired names only; extra files are tolerated. `AgentRunConfig.memoryDir` is nullable (helper runs). | Store the per-run record as `<memoryDir>/seen_skill_versions.json`, deleted with the run. No schema change. In memory only when `memoryDir` is null. |
| `file-explorer/traversal-ignore-strategy/*` (`DefaultIgnoreStrategy`, `.git`, `.gitignore`) | Code-workspace ignore policy | Skill folders are code-like (scripts, venvs), so these rules fit here (unlike definition folders) |
| `src/agent-package-definitions/` (`AgentPackageFolderWatcher`, `AgentPackageDefinitionReloader` settle 1000/3000 ms) | In-process chokidar, settle and cap pattern | Same pattern and constants for skill folders |
| `grep skillScope` over the user's packages | 1 agent uses `ALL_INSTALLED`; 156 agent configs | ALL_INSTALLED runs watch all installed skills; rare; measure the watch count |
| `skills/services/skill-source-service.ts` `afterPublication` | GitHub skill sources publish new generation folders | A generation change shows up as a different skill folder for the same name; compare by name and file digests |


## Requirement Implications

- Files are already current for every runtime. The fix is purely a **notice into the conversation** telling the agent which skill changed and where to re-read it.
- Busy runs: the existing message path appends mid-turn (user direction). Idle and shut-down runs: hold the notice until their next work starts, so no extra turn is triggered (Task direction).
