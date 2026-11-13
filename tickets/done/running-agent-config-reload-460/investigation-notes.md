# Investigation Notes

## Investigation Meta

- Package identifier: `running-agent-config-reload-460` (Project Task `autobyteus-460`)
- Request / ticket: autobyteus-460 — "A running agent does not load a skill that was added to (or removed from) its configuration: investigate per runtime whether it can be picked up without a new run, and what the agent and the user should see"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/running-agent-config-reload-460`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/running-agent-config-reload-460`, branch `codex/running-agent-config-reload-460`
- Resolved base remote / branch / revision: `origin` / `personal` / `7b8bcf932fca35e8937dd3158d6a05ebbca5e227` (fetched 2026-11-13)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from `origin/personal`; ticket folder `tickets/in-progress/running-agent-config-reload-460/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-13): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`; repository `AGENTS.md`, `TESTING.md` (Test vault, signed-in CLI and runtime CLI settings sections)
- Investigation status: Requirements-level investigation complete (all six runtimes read; Claude measured). Architecture investigation pending approval.

## Initial Request And Clarifications

- Original request: the Task (description and the 2026-11-13 comment). The user's words (PM's reading): "when the agent config changes (a skill added or removed in the skill section), an agent that is already running does not see or load the skill; I'm not sure whether the different runtimes support dynamic loading of the skill or not". Wish: "we should automatically reload it".
- Clarifications received: none yet.
- User-supplied facts and constraints: keep it simple; nothing exposed automatically (integration access follows the explicit skill rule of autobyteus-337); design first, the user approves the direction before the build.
- Initial ambiguity: whether "pick it up" is possible per runtime; why semantic memory appeared to reach a running run while skills did not.

## Product And Domain Understanding

- Product area: agent runs (standalone, team members, delegated copies) and their agent definition (skills, tools, instructions, semantic memory, integrations).
- Affected actors or systems: the user editing an agent on the agents page (or in its package folder); running agents of that definition; six runtimes (AutoByteus native, Claude Agent SDK, Codex app-server, Antigravity CLI (AGY), Grok Build (ACP), DeepSeek harness (ACP)).
- Existing user or operational purpose: long-lived runs (the Project Task Manager run has existed since 2026-10-08) whose configuration the user keeps improving.
- Relevant terminology: *activation* = a run is prepared from its definition (new run, or restore after stop / app restart / idle shutdown); *restore* keeps the conversation; *tracked run* = a run the notice subsystems follow; *seen record* = what the agent was last told (`seen_skill_versions.json`, `seen_tool_names.json`).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-13 | Code | `autobyteus-server-ts/src/skill-update-notices/**` | PM's reading | The run is bound to the definition read once when tracked (`skill-update-notices.ts` `resolveUsedSkills`; `RunSkillTracker` doc). Only skill CONTENT changes are noticed. Name-set changes are handled only at restore (a skill seen but no longer resolving → "no longer available"; a skill used now but never seen → recorded as seen, no notice). | Design extends this |
| 2026-11-13 | Code + Doc | `src/tool-list-updates/**`, `docs/modules/tool_list_updates.md` (autobyteus-324) | "user remembers tools being picked up" | Tools ARE live: `AgentDefinitionChangeSignal` → each tracked run's definition re-read → `AgentRun.applyDefinitionTools` per runtime (AutoByteus/Claude/AGY at once; Codex/Grok at next turn start by reopen) → "Tools updated" notice from the seen record diff. | Pattern to reuse |
| 2026-11-13 | Code | `agent-execution/backends/shared/workspace-skill-materializer.ts`, `claude/…`, `codex/…`, `grok/…`, `deepseek-harness/…` materializers | How skills reach CLI runtimes | Claude/Codex/Grok/DeepSeek symlink configured skill folders into the run's workspace (`.claude/skills`, `.codex/skills`, `.grok/skills`, `.dsh/skills`) at activation only; a process-wide registry shares a link between runs of the same workspace. | — |
| 2026-11-13 | Code | `autobyteus-ts/src/agent/system-prompt/append-configured-skills-catalog.ts`, `bootstrap-steps/system-prompt-processing-step.ts`, `loop/llm-phase.ts:182` | Native skill list | Native lists skills (name, description, absolute `SKILL.md` path) in the system prompt, built at bootstrap; the prompt is read from state at every LLM call. | — |
| 2026-11-13 | Code | `antigravity/capsule/agy-run-capsule.ts` | AGY skills | AGY links skills into a per-run capsule `.agents/skills` at creation; `restoreAgyRunCapsule` reuses the creation-era capsule (agent.md identity hash-checked, skills only pruned), so even a restore does not add skills or apply new instructions. | FU-002 |
| 2026-11-13 | Code | `credential-proxy/integration-access-rule.ts`, `run-pass-registry.ts`, `integration-run-access.ts`; backend callers of `environmentForRun` | Integration access | Grants + shell variables are computed when the runtime session is prepared (Codex bootstrap; Claude per CLI process generation; ACP per launch incl. reopen; native custom data at creation; AGY at spawn). Removal is enforced on every proxied call (`allowsCall` re-reads the definition). Adding mid-run gives no variables to the running shell. | — |
| 2026-11-13 | Code | GitHub skill `scripts/lib.sh` `gh_require_access` | Agent experience without access | Without `AUTOBYTEUS_GITHUB_API_URL` the skill stops with "No GitHub access in this run … then start a new run." | FU-003 wording |
| 2026-11-13 | Code | `claude/backend/claude-session-bootstrapper.ts:95-107`, `codex/backend/codex-thread-bootstrapper.ts:237-300`, `acp/backend/acp-agent-run-backend-factory.ts:151-163`, `autobyteus/autobyteus-agent-run-backend-factory.ts:283` | What activation reads | Every runtime reads the definition at activation (new and restore): instructions, skills, semantic memory folder, integration variables. AGY restore is the exception (above). | — |
| 2026-11-13 | Data | `~/.autobyteus/server-data/memory/agents/project_task_manager_7c8dce0c4a8b44f88e776a83809dee03/` (`run_metadata.json`, `seen_skill_versions.json`), `~/.autobyteus/server-data/memory/semantic/`, `<superrepo>/.claude/skills/` (`ls -la`) | PM evidence (semantic memory "reached" the run) | PM run: Claude runtime, started 2026-10-08. `run_metadata.json`, `seen_skill_versions.json` (skills: project-task-management, github-integration), the `github-integration` and `project-task-management` links and the semantic memory folder all date 2026-11-12 14:52: a restore. Reflection was attached 2026-11-13 08:28 (`autobyteus-agents` 27641fc), after it: no link, not in the list. | — |
| 2026-11-13 | Command | `/tmp/probe460` probe (evidence/claude-skill-hot-reload-probe*) | Can the Claude CLI pick up a new skill folder mid-session? | Measured: yes at the next turn; an unlinked folder leaves the CLI list but the model still names it. | — |
| 2026-11-13 | Web | code.claude.com/docs/en/skills; claudeissues #31559; Codex app-server `skills/list` / `skills/changed` | Runtime support | Claude Code documents skill hot-reload (bundled CLI 2.1.280 > 2.1.152). Codex app-server re-scans on `skills/list forceReload` and has a `skills/changed` notification; whether a live thread re-lists is not documented. | Codex not probed |
| 2026-11-13 | User | Task comment (PM, later on 2026-11-13) | PM saw its skills folder change mid-run | Explained by the shared workspace folder: other Claude runs in `<superrepo>` add and release links (process-wide registry, holders); the CLI lists the folder live (probe). Reflection still absent (not attached to a running run's setup; this ticket). | FU-001 evidence |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User adds a skill to an agent (agents page or package folder) while a run of it is active | Definition saved → change signal → tools pass only; skill tracker keeps the activation definition | Running run: skill not listed, not linked, agent not told; content notices only for skills it already had. Applied at the next activation (restore or new run) | Code; PM data (Nov 12 restore brought github-integration; reflection absent) | High |
| BEH-002 | User | User removes a skill while a run is active | Same | Running run keeps it (listed, linked, content notices continue); agent not told. At restore: "no longer available" notice | Code (`RunSkillTracker.loadRun`) | High |
| BEH-003 | User | User changes an agent's tools while a run is active | autobyteus-324 | Live on all runtimes; "Tools updated" card and agent notice | Code + module doc | High |
| BEH-004 | System | A used skill's files change on disk | autobyteus skill update notices | "Skill updated" notice listing changed files; busy now, idle with next input | Module doc | High |
| BEH-005 | User | User adds an integration skill (GitHub) while a run is active | Grants and shell variables prepared only at activation | No access until the next activation; the skill's own check says "No GitHub access in this run … start a new run" | Code; GitHub skill lib.sh; PM incident 2026-11-10 | High |
| BEH-006 | User | User removes an integration skill while a run is active | `IntegrationAccessRule.allowsCall` per proxied call | Access refused from the next call (live) | Code | High |
| BEH-007 | User | User edits instructions / turns semantic memory on while a run is active | Read at activation only | Not applied until the next activation (AGY: not even then) | Code; PM data (semantic folder created at the Nov 12 restore) | High |
| BEH-008 | User | User stops a run and sends it a message | Restore re-reads the definition | New configuration applied, conversation kept (all runtimes except AGY, which keeps its creation-era capsule) | Code; PM data | High (AGY: High from code) |

## Relevant Codebase And Technical Facts

Per-runtime summary (what is loaded at activation, and what can change while running):

| Runtime | Skill list given to the model | Skill files | Can a changed list reach the live session? | Instructions | Integration variables |
| --- | --- | --- | --- | --- | --- |
| AutoByteus native | System prompt "Skill Catalog" (name, description, absolute SKILL.md path), built at bootstrap; read per LLM call from state | Read in place by absolute path | Yes by a notice (agent reads SKILL.md by path). The prompt state could also be replaced (it is read per call) | System prompt at bootstrap | Closure in custom data at creation |
| Claude Agent SDK | Claude CLI discovers `<workspace>/.claude/skills` (links made at activation) | Link → catalog folder | Yes by a notice (Read by path). Native: **Measured** the CLI lists a folder linked mid-session at the next turn; it forgets an unlinked one only in its own list | `systemPrompt` per CLI process generation from the activation context | Per CLI process generation (env of the process) |
| Codex app-server | Codex discovers `.codex/skills` (or its own copy) at thread start | Link | Yes by a notice (shell read by path; sandbox reads anywhere). Native re-listing in a live thread: Unknown (not probed) | `baseInstructions` in thread config at activation; reopen keeps it | Thread config at activation; reopen keeps "as prepared" |
| Grok Build (ACP) | Grok discovers `.grok/skills` | Link | Yes by a notice. Native: Unknown | At launch | Re-read at every launch incl. reopen |
| DeepSeek harness (ACP) | `.dsh/skills` | Link | Yes by a notice. Native: Unknown | At launch | Same as Grok |
| Antigravity (AGY) | Per-run capsule `.agents/skills`, made at creation | Link | Yes by a notice. Native: Unknown; restore does not re-link (FU-002) | Capsule agent.md frozen at creation (restore too) | At process spawn |

Other facts:

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `agent-definition/services/agent-definition-change-signal.ts` | One signal for every definition change (package reload, in-app save, application packages) | The trigger exists | Subscribe the skill tracker to it, as `createToolListUpdates` does |
| `RunSkillTracker` / `SkillUpdateNoticeService` | Seen record per run; watch set; busy/idle delivery; restore diff | Skill-list notice belongs here (same owner, same seen record) | Make the run's skill source re-read the current definition on the signal; add "now available" blocks |
| `AgentRunPlatformNotices` | One notice per input: tools, then skills, then background | Preserved | — |
| `RunPassRegistry.issue` | Keeps the pass value, replaces grants | Live grants would be possible, variables not | Not used live (DEC-004) |
| Shared workspace skill links | All Claude runs of one workspace see every link in `.claude/skills` (this designer's own skill list shows other agents' skills, e.g. github-integration, opportunity-scouting) | Pre-existing; text only, integration access still gated by grants | FU-001 |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `<memoryDir>/seen_skill_versions.json` (names → snapshots) already records the skill names the run was told about.
- Notice text (`skill-update-notice-builder.ts`), web card "Skill updated" (`SystemTaskNotificationSegment`, sender `system.skill_update_notifier`).
- Evidence paths: `autobyteus-server-ts/docs/modules/skill_update_notices.md`.

### Structural Surfaces

- `AgentDefinitionChangeSignal`; `skill-update-notices` subsystem composition (`compositions/platform-notice-sources.ts`); `IntegrationAccessRule` / `RunPassRegistry` (read-only use for the integration sentence).
- Existing structural surfaces that can support the approved behavior: all of the above; no runtime backend change needed for the recommended option.

### Potential Structural Impacts To Investigate

- API or external-contract change: none expected (notice text only).
- Persistence schema or invariant change: none expected (seen record already keyed by name).
- Security or privacy boundary change: none (no access granted mid-run).
- Concurrency or lifecycle change: tracker re-resolution on the signal vs watcher settles and in-flight notices (design).
- Confirmed absent: runtime backend changes for Option A.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Claude SDK 0.3.280 streaming session, haiku, real signed-in CLI | Link a skill folder mid-session; unlink one | New folder listed at the next turn (init `skills` and model answer); unlinked one dropped from the CLI list but still named by the model | Measured | Claude native pickup is possible (Option B); removal needs a notice on every runtime | `evidence/claude-skill-hot-reload-probe.mjs`, `evidence/claude-skill-hot-reload-probe-output.txt` |
| File timestamps of the PM run | Why semantic memory "reached" the run | Semantic folder, run metadata, seen record and skill links all created 2026-11-12 14:52 (a restore) | Measured (timestamps) | Nothing in the definition except tools reaches a live run; everything arrives at activation | `ls -la` of the paths in the Source Log |

- Temporary diagnostics: None in the worktree. Probe fixtures in `/tmp/probe460` (outside the repository).
- Reproduction for implementation to start from: the current behavior is shown by the existing tracker unit tests' premise (definition read once); a failing test is for implementation to write.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via PM, 2026-11-10 and 2026-11-13) | A skill added to the running PM (GitHub, reflection) should be picked up and the agent told | Two incidents | Live skill-list notice | Which option (DEC-001) |
| User standing preference | Keep it simple | Strong | Prefer the notice over per-runtime plumbing | — |
| autobyteus-337 | Integration access only through the explicit skill rule | Contract | No mid-run grant without the rule; honest message instead | DEC-004 |
| autobyteus-461 (in progress, worktree `delegated-copies-outlive-delegator-461`) | Stopping the PM stops its delegated copies | Related | A restart is costly for the PM today: a reason to make the skill path live rather than restart-based | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Claude Code CLI (bundled by `@anthropic-ai/claude-agent-sdk` 0.3.280) | 2.1.280; docs code.claude.com/docs/en/skills | Skill hot-reload of `.claude/skills` | Probe | Behavior may change between CLI versions |
| Codex app-server | `skills/list {cwds, forceReload}`, `skills/changed` | Re-scan on request | Web (README mirrors) | Live thread re-listing not documented, not probed |
| Grok, dsh, agy CLIs | — | Folder discovery at launch | Code | Live re-listing not probed |

## Persisted Data And State Facts

- Affected stored subject: `<memoryDir>/seen_skill_versions.json` (existing; additive meaning: added names become seen when told).
- Current readers and writers: `RunSkillTracker` only.
- Required semantics: "no record" = has seen its current skills (no retroactive notice), as today.
- Acceptable loss: none needed; no migration.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The card reuses the existing system-notice presentation.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/claude-skill-hot-reload-probe.mjs` | Solution Designer | Reproducible Claude CLI hot-reload probe | DEC-001 option B evidence | DEC-001 | Current | Evidence only |
| `evidence/claude-skill-hot-reload-probe-output.txt` | Solution Designer | Probe output | Same | DEC-001 | Current | Evidence only |
| `follow-ups.md` | Solution Designer | Follow-ups found | Outside scope | — | Current | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Whether Codex, Grok, dsh and agy re-list skill folders in a live session | Only matters for option B | Not needed for option A; probe if B is chosen | Open |
| R-001 | Risk | An agent reading SKILL.md by absolute path outside its workspace may need tool approval on runs without auto-execute | The skill is still usable after one approval; the existing content notice already relies on this | Accept | Accepted |
| R-002 | Risk | Native context compaction may summarize a notice away | The agent could forget a skill added mid-run until restore | Design: for native, also update the system prompt catalog (cheap) or accept | Open (design) |
| A-001 | Assumption | Every runtime can read a file by absolute path | Option A's usability claim | Code: native read_file, Claude Read, Codex/Grok/dsh/AGY shell/read tools; existing content notices depend on it | Holds |

## Architecture Investigation Findings

Read 2026-11-13 after approval (authorities: `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, root `DESIGN.md`):

- Run-held link lists, released at run end by reading the live list:
  - Claude `runtimeContext.materializedConfiguredSkills` (`claude-session-cleanup.ts:31`; bootstrap `claude-session-bootstrapper.ts:80-95`, factory guard `claude-agent-run-backend-factory.ts:26-55`);
  - Codex `runtimeContext.materializedConfiguredSkills` (`codex-thread-manager.ts:133`);
  - ACP `owner.skills` (`acp-agent-run-backend-factory.ts:96, 151-160`).
  So a descriptor pushed mid-run is released with the run.
- `WorkspaceSkillMaterializer.materializeConfiguredWorkspaceSkills` reports a hold through `onAcquired` before acquisition completes (`startAcquisition`). It rolls back receipts when `assertAccepting` throws, and release is idempotent (`releasedHolders`). **Correction (ARCH-REV-001 AR-001):** this is safe for a mid-run caller only when its `assertAccepting` reads a fact set before the held list is released. A backend's `isActive()` is not such a fact on Claude (`claude-session-manager.ts:129-140`, cleanup stages in parallel `claude-session-cleanup.ts:25-38`) or Codex (`codex-agent-run-backend.ts:111-113`, `threads.delete` after cleanup `codex-thread-manager.ts:142`); it is on ACP (`acp-agent-run-backend.ts:268-272`). AGY's `active` is also cleared by an interrupt (`agy-agent-run-backend.ts:121`), but AGY links live in its per-run capsule, which is kept for resume, so no release ordering is needed there. Design SR-003 makes `RunWorkspaceSkills` own a `closed` fact and the release order. Claude auto-execute approves any tool (`claude-session-tool-use-coordinator.ts:248-251`). `ProviderPreparationGuard.ownSkill` is used only by Claude and Codex preparation (`claude-agent-run-backend-factory.ts:31`, `codex-agent-run-backend-factory.ts:38`).
- Request planning: Claude and ACP use `expose-resolved` for every resolved binding. Codex plans with `skills/list` (`codex-thread-bootstrapper.ts:89-120, 383-437`).
- AGY: links in the capsule plus `manifest.json` (written once with `wx`); restore validates the manifest skills (`agy-run-capsule.ts:33-118`). The backend is constructed in `agy-agent-run-backend-factory.ts:121`.
- `AgentDefinitionChangeSignal.subscribe` (`agent-definition-change-signal.ts`); notice sources are composed after the credential proxy host (`build-studio-server.ts:311, 331`); standalone host has no proxy (`start-standalone-application-host.ts:244-247`).
- `diffSkillVersion` with no seen version and a current snapshot returns "updated" with all files "added" (`skill-version-diff.ts:10-16`). A new `added` kind is needed.
- Integration names: `IntegrationCatalog.describe(id) → { name, skillName }` (`integration-catalog.ts:152-155`). The pass registry has no per-run grant read yet (`run-pass-registry.ts`).

## Requirement Implications

- Nothing in the agent definition except tools reaches a live run; every part arrives at the next activation (AGY: only at a new run). The semantic memory observation is explained by the 2026-11-12 restore.
- A skill is a folder with a `SKILL.md`; every runtime can follow it by path. So "tell the agent, with the path" makes an added skill usable on all six runtimes without runtime-specific work; a removed skill can only be withdrawn by telling the agent (Claude probe), except integration access, which is enforced already.
- Integration variables cannot be put into a running process's shell; access added mid-run waits for the next activation unless per-runtime reopen plumbing is built.

## Notes For Architecture Design

- Reuse the tool list update pattern: `AgentDefinitionChangeSignal` → re-read each tracked run's definition by ID → diff against the seen record → one notice through the existing busy/idle paths.
- The skill tracker already owns the seen record and the restore diff; the change is to stop binding the run to its activation-time definition.
- Verify: whether `ALL_INSTALLED` resolution and application bundles stay correct when re-resolved; ordering with in-flight content notices; the integration sentence's source (`IntegrationAccessRule` + run pass grants).
