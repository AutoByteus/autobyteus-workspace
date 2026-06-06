# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Design spec produced; package ready for architecture review.
- Investigation Goal: Determine the current compactor agent instruction/output contract and design a cleaner human-continuation prompt plus a robust structured-result handoff, including whether the compactor should write JSON to a temp file for backend consumption.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: Approved scope touches source template, persisted built-in agent bootstrap behavior, task prompt builders, duplicate/fork frontend/API/backend removal, tests, and docs. File-based output is deferred.
- Scope Summary: Design changes for backend compactor prompt wording, registry-scoped internal built-in agent sync, and removal of agent fork/duplicate functionality.
- Primary Questions To Resolve:
  - Where is the active compactor agent definition and what exact instruction does it use?
  - Where does backend compaction invoke the compactor and parse its result?
  - Which definitions are AutoByteus internal built-ins eligible for overwrite/sync?
  - Where must Duplicate/Fork be removed across backend and frontend?

## Request Context

User dislikes the current backend compactor agent system prompt because it uses internal language and rigidly demands direct JSON output. User later clarified that the stale Electron prompt exposes a broader built-in/internal-agent update design issue: if platform-managed internal agents are copied once into app data, they can remain outdated forever as internal agents evolve. User then clarified that package-managed agents are folder-backed package content, often Git/GitHub-backed. User explicitly confirmed two requirement decisions: remove fork/duplicate functionality, and apply overwrite/sync only to platform-internal AutoByteus-provided agents/teams, not to user-owned packages from local folders or Git/GitHub. User further clarified that bundled application-owned teams/agents come from the application itself and should not be treated as AutoByteus internal provided agents for this sync scope. User also questioned whether the app's agent fork/duplicate functionality is needed at all, because observed users edit package source/Git branches rather than forking agents in the app, and internal product-provided agents normally are not user-edited in place. User's preferred mental model: the working agent is like a human who has reached brain/context bandwidth, summarizes important progress so they can empty working memory and continue after summarization. The compactor agent should perform that human-like summarization. User also believes LLMs work better when they can output natural reasoning/prose first and then final results, and proposed writing compaction results to a temp JSON file; that idea is recorded as a future separate design and is not part of this kickoff ticket.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/compactor-agent-human-summarization`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/compactor-agent-human-summarization/tickets/in-progress/compactor-agent-human-summarization`
- Current Branch: `codex/compactor-agent-human-summarization`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/compactor-agent-human-summarization`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-06
- Task Branch: `codex/compactor-agent-human-summarization`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: The user's original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` was on `personal`, behind `origin/personal`, with uncommitted `index.html` and `test.txt`; it was not reused.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-06 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap workspace discovery | Current checkout was root repo on `personal`, behind origin and dirty with `index.html` plus `test.txt`. | No |
| 2026-06-06 | Command | `git remote -v && git branch -vv && git remote show origin` | Resolve remote/base context | Remote `origin` uses `git@github.com-ryan:AutoByteus/autobyteus-workspace.git`; remote default/base is `personal`. | No |
| 2026-06-06 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task worktree creation | Fetch succeeded. | No |
| 2026-06-06 | Command | `git worktree add -b codex/compactor-agent-human-summarization /Users/normy/autobyteus_org/autobyteus-worktrees/compactor-agent-human-summarization origin/personal` | Create dedicated task worktree/branch | Worktree created from latest `origin/personal`, HEAD `c62a78d6 chore(ticket): clarify final delivery status`. | No |
| 2026-06-06 | Command | `rg -n "compactor|compaction|compact" autobyteus-ts autobyteus-server-ts autobyteus-web tickets -S` | Find current compaction implementation and prior ticket docs | Found current compaction status events, server compaction runner/collector/settings, memory compaction prompt/parser files, and prior agent-based/working-context compaction tickets. | No |
| 2026-06-06 | Code | `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | Inspect current source default compactor prompt | Source template already uses less internal wording: “Summarizes earlier interaction history...”, `[CONVERSATION_HISTORY_TO_SUMMARIZE]`, and no old `AutoByteus Memory Compactor`/`[SETTLED_BLOCKS]` wording. Still contains “Return JSON only” and “output contract” language. | Update if approved |
| 2026-06-06 | Data | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/agents/autobyteus-memory-compactor/agent.md` | Check likely active persisted/default compactor prompt in user's original checkout | File exists with older wording: “AutoByteus Memory Compactor”, “settled AutoByteus”, and `[SETTLED_BLOCKS]`. This explains why user can still see stale internal prompt despite source template cleanup. | Design safe stale default update |
| 2026-06-06 | Code | `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | Understand why runtime default prompt can be stale | Bootstrapper uses `seedFileIfMissing(...)`; it creates missing files only and never overwrites existing `agent.md` or `agent-config.json`. This preserves user edits but also preserves stale default prompts. | Design version/hash/known-template replacement policy |
| 2026-06-06 | Code | `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | Trace compactor invocation from memory subsystem | `AgentCompactionSummarizer` builds a task prompt, calls `runner.runCompactionTask(...)`, stores runner metadata, and parses `result.outputText` with `CompactionResponseParser`. | File handoff likely stays behind runner boundary |
| 2026-06-06 | Code | `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts` | Inspect cross-package runner contract | Runner result currently has `outputText: string` plus metadata; no result file path/structured result field. | Modify if file result metadata needed |
| 2026-06-06 | Code | `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | Inspect server adapter that creates compactor run | Creates a normal visible agent run with selected compactor definition, `autoExecuteTools: false`, `skillAccessMode: PRELOADED_ONLY`, app temp workspace, posts one user message, collects final assistant output, records activity, terminates run. | File output requires runner changes |
| 2026-06-06 | Code | `autobyteus-server-ts/src/agent-execution/compaction/compaction-run-output-collector.ts` | Inspect output collection behavior | Collector reads assistant complete/text segments, ignores reasoning segments, completes on idle/turn complete, and fails if a tool approval is requested. Error strings mention “final JSON.” | Must change for tool/file result handoff |
| 2026-06-06 | Code | `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | Inspect parser strictness | Parser accepts direct text, fenced JSON, and balanced JSON objects embedded in text. It requires facts-only arrays and ignores stale `tags`/`reference`. Prompt is stricter than parser. | Prompt can be relaxed even without file output |
| 2026-06-06 | Code | `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` and `compaction-task-prompt-builder.ts` | Inspect automated task prompt wording | Current task prompts are natural-ish but still include `[OUTPUT_CONTRACT]`, “Return JSON only”, and `[CONVERSATION_HISTORY_TO_SUMMARIZE]`; working-context builder preserves assistant notes/tool interactions without raw trace labels. | Update wording if approved |
| 2026-06-06 | Code | `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent-config.json` | Check built-in compactor tools/default launch | Built-in compactor has `toolNames: []`, `skillNames: []`, and `defaultLaunchConfig: null`. No file-writing tool is configured. | File handoff cannot be prompt-only |
| 2026-06-06 | Code | `autobyteus-ts/src/tools/file/write-file.ts` and `autobyteus-ts/src/tools/register-tools.ts` | Check generic file writing availability | AutoByteus has a generic `write_file` tool that writes absolute/workspace-relative paths, but it is only available if configured on the agent. | Not a stable compaction result boundary |
| 2026-06-06 | Code | `autobyteus-ts/src/agent/loop/tool-phase.ts` | Check effect of `autoExecuteTools: false` | If tools are not auto-executed, tool invocation waits for approval and emits approval request events. Current compaction collector fails on approval request. | File/tool submission needs dedicated auto-execution policy |
| 2026-06-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` and `configured-agent-tool-exposure.ts` | Check cross-runtime tool exposure | Codex dynamic tools are built through backend-specific registrations and gated by configured tool names. Generic AutoByteus `write_file` is not a uniform Codex/Claude compaction file handoff. | Use dedicated result-submission boundary if file output is required |
| 2026-06-06 | Doc | `autobyteus-ts/docs/agent_memory_design.md` and `agent_memory_design_nodejs.md` | Check durable docs for current compactor design | Docs describe final JSON-only assistant output and explicitly note existing user-edited compactor definitions may keep older wording until operator edits them. This matches stale prompt issue but not the new desired behavior. | Update docs if implementation proceeds |
| 2026-06-06 | Code | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` and `types.ts` | Inspect current package import/update model after user described package-source customization | Agent packages support local path and GitHub repository sources. GitHub packages are installed to managed paths and can be checked/updated by revision; local path packages are linked/reloaded. | Target design can make package source the customization authority. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts`, `agent-definition/services/agent-definition-service.ts`, `providers/file-agent-definition-provider.ts` | Audit current fork/duplicate implementation | Public GraphQL mutation is `duplicateAgentDefinition`; service only allows `shared` agents; provider copies source `agent.md` and `agent-config.json` into the default app-data agents dir under a new id. This is duplicate/copy, not a Git/package fork. | Candidate removal/retirement if product agrees. |
| 2026-06-06 | Code | `autobyteus-web/components/agents/AgentDetail.vue`, `AgentDuplicateButton.vue`, `stores/agentDefinitionStore.ts` | Find UI surface for fork/duplicate | Agent detail shows `Duplicate` for `SHARED` agents and routes duplicated result to edit view. Tests cover duplicate button and hiding duplicate for team-local agents. | UI/API/test removal needed if retiring fork/duplicate. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/agent-definition/providers/agent-definition-source-paths.ts` | Understand edit/delete source behavior | Shared-agent source lookup searches default app-data agents first, then additional package roots; writability, not package ownership, controls edit/delete eligibility. | Current design conflates package-managed shared agents and user-owned local shared agents unless source/origin is made explicit. |
| 2026-06-06 | Code/Data | `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts`; `/Users/normy/.autobyteus/server-data/agents` | Inventory current platform-internal built-in agents | Built-in registry currently contains exactly two built-in agents: `autobyteus-memory-compactor` (`Memory Compactor`) and `autobyteus-skill-evolver` (`Skill Self-Evolver`). Current app-data agents also include these plus apparent standalone local agents `codex`, `professor`, and `student`. | Sync must target built-in ids, not entire app-data `agents` directory. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/application-packages/services/built-in-application-package-materializer.ts`; `applications/*/agent-teams/*/team.md` | Check bundled application-owned teams/app-owned definitions | There is no separate built-in agent-team bootstrapper in `autobyteus-server-ts/src`; bundled application packages are materialized separately and currently include app-owned teams such as `brief-studio-team` and `socratic-math-team` under root `applications/`. User clarified these belong to the application itself and are not AutoByteus internal-provided agents for this scope. | Exclude bundled application-owned teams/agents from internal built-in agent sync scope. |
| 2026-06-06 | Data | `/Users/normy/.autobyteus/server-data/agent-packages/registry.json` | Check current user package registrations | Current app data has local path package registrations for `/Users/normy/autobyteus_org/autobyteus-private-agents` and `/Users/normy/autobyteus_org/autobyteus-agents`; these are user-registered local package sources and must not be overwritten by platform-internal sync. | Keep user package roots out of overwrite scope. |
| 2026-06-06 | Code | `autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs` | Inspect existing build-time smoke coverage for built-in agent materialization | Smoke script already asserts both built-in templates are copied into a temp agents dir and `daily-assistant` is absent. It currently expects first-run seed booleans and can be extended to assert overwrite/sync of stale files. | Update smoke and/or add unit tests during implementation. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/agent-definition/providers/agent-definition-persistence-provider.ts` and `cached-agent-definition-provider.ts` | Inspect duplicate method propagation | Duplicate is part of persistence provider contract and cached provider; removing duplicate requires contract cleanup, cache provider cleanup, service cleanup, and file provider cleanup. | Include in removal plan. |
| 2026-06-06 | Code | `autobyteus-web/graphql/mutations/agentDefinitionMutations.ts`, `stores/agentDefinitionStore.ts`, `components/agents/__tests__/AgentDetail.spec.ts`, `AgentDuplicateButton.spec.ts` | Inspect frontend duplicate removal surface | Duplicate mutation is imported by store, exposed as store method, rendered through `AgentDuplicateButton` in `AgentDetail`, and tested by dedicated button and navigation tests. | Remove component/test/store mutation, update AgentDetail tests. |
| 2026-06-06 | Code | `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts`, `compaction-task-prompt-builder.ts`, `compaction-response-parser.ts` | Refine compaction prompt/result scope | Prompt builders contain `[OUTPUT_CONTRACT]`, `Return JSON only`, and `output contract`; parser already tolerates embedded/fenced JSON. This ticket should adjust wording while preserving current parser/output channel. | Update prompt wording/tests; do not add file result path. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Parent AutoByteus run crosses compaction threshold; `PendingCompactionExecutor` plans over working-context messages and calls the configured `Compactor`/`WorkingContextCompactor`.
- Current execution flow:
  1. `PendingCompactionExecutor.executeIfRequired(...)` checks `memoryManager.compactionRequired`.
  2. `WorkingContextMessageWindowPlanner` selects compactable units and retained/protected suffix units.
  3. `WorkingContextCompactor.compactWorkingContext(...)` calls `summarizer.summarizeMessageUnits(...)`.
  4. `AgentCompactionSummarizer` builds a compaction task prompt and calls the injected `CompactionAgentRunner`.
  5. `ServerCompactionAgentRunner` creates a visible normal compactor run and posts the task prompt as one user message.
  6. `CompactionRunOutputCollector` collects final assistant text/segments until terminal/idle.
  7. `AgentCompactionSummarizer` parses collected text with `CompactionResponseParser`.
  8. Memory compaction normalizes/stores episodic and semantic items, archives raw traces, rebuilds working-context snapshot, and emits status metadata.
- Ownership or boundary observations:
  - Memory compaction correctly owns planning, schema parsing, normalization, persistence, archive/prune, and snapshot rebuild.
  - Server compaction runner owns visible run creation and text output collection.
  - Editable compactor `agent.md` owns stable behavior/manual-test guidance only.
  - Existing built-in bootstrap owns seeding but not safe updating of stale default files.
- Current behavior summary: Prompt source has improved, but stale persisted default prompts can remain. Output contract is direct assistant text, even though parser can tolerate surrounding text. A true file handoff requires new tool/result-submission ownership.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift / Legacy Or Compatibility Pressure
- Refactor posture evidence summary: The user-visible stale prompt is caused by bootstrap preservation of existing files, not only source prompt text. File handoff would cross prompt, runner, tool exposure, collector, and parser boundaries, so a local prompt edit is insufficient.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Current prompt exposes internal implementation language and rigid JSON-only output. | Product prompt quality and result-boundary issue. | Refine prompt and result contract. |
| Source template | Current source is partially cleaned, but still direct JSON-output oriented. | Prompt cleanup can be incremental. | Rewrite around human-resume model. |
| Runtime data file in original checkout | Existing seeded compactor prompt is older/internal. | Source-template edits do not update existing installs. | Add safe default-template update policy. |
| Server runner / collector | Result is assistant text and tool approval causes failure. | Temp file output cannot be achieved by prompt alone. | Add owned submission boundary if approved. |
| Tool exposure code | Generic file writing is not uniformly available across runtimes. | Do not use generic `write_file` as compaction result protocol. | Design dedicated result submission. |
| Agent duplicate code | `Duplicate` creates an unmanaged shared-agent copy in the default app-data agents dir, not a package/Git fork. | Keeping duplicate as the customization story conflicts with package-source authority and managed-agent syncing. | Decide whether to remove completely or keep only for standalone local agents. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | Source default compactor instructions | Partially cleaned from older internal wording; still “Return JSON only” and task-contract oriented. | Update wording to human-resume model. |
| `autobyteus-server-ts/agents/autobyteus-memory-compactor/agent.md` in original checkout | Likely active app-data default agent | Contains older internal wording. | Need safe updater/migration for built-in default. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | Seeds built-in agent files/settings | Writes only missing files. | Add known-default update/version policy if approved. |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | Builds automated working-context compactor task | Natural transcript label but still output contract/JSON direct wording. | Update task labels and result delivery instructions. |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | Legacy/raw block task prompt builder | Same JSON/direct-output contract, retained for compatibility/tests. | Keep aligned or restrict to legacy tests. |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | Parses compactor structured result | Already tolerant of embedded/fenced JSON. | Can continue parsing result file content. |
| `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts` | Cross-package runner interface | Returns `outputText` only. | File handoff can either keep outputText as read file content or add metadata/result source fields. |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | Server adapter for visible compactor runs | Creates run with no auto tools and collects final text. | Needs result-submission/file handling if approved. |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-run-output-collector.ts` | Normalizes visible run output | Fails on tool approval and expects final assistant output. | Needs replacement/extension for submit-result events. |
| `autobyteus-ts/src/tools/file/write-file.ts` | Generic file system tool | Not configured for default compactor and not uniform across runtimes. | Should not be the compaction result protocol. |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Agent package import/reload/update | Supports linked local path packages and managed GitHub repository packages. | Package source can be the user customization authority. |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | Reads/updates/deletes/duplicates agent definitions across roots | Shared lookup searches default app-data agents first, then package roots; duplicate copies to app-data default root. | Need explicit managed/source ownership; duplicate is a legacy copy feature, not true package fork. |
| `autobyteus-web/components/agents/AgentDuplicateButton.vue` | Agent-detail duplicate UI | Calls `duplicateAgentDefinition` with generated “Copy” name. | Remove/retire if product direction removes forks. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-06 | Probe | Candidate path check for `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/agents/autobyteus-memory-compactor/agent.md` | Found stale runtime default prompt with older internal wording. | Must address existing app-data definitions, not just template. |
| 2026-06-06 | Probe | `if [ -f autobyteus-server-ts/agents/autobyteus-memory-compactor/agent.md ]; then ...` in task worktree | No task-worktree app-data compactor file exists. | Source template is current in isolated worktree; user's running checkout/app-data may differ. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for current analysis.
- Required config, feature flags, env vars, or accounts: None for current analysis.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **Current source prompt has already been partially corrected, but the user's observed prompt can be stale.** The source `agent.md` in `origin/personal` avoids older `[SETTLED_BLOCKS]` and `AutoByteus Memory Compactor` wording. The original checkout's app-data `agents/autobyteus-memory-compactor/agent.md` still contains that older wording because built-in bootstrap preserves existing files.
2. **Prompt rigidity is stronger than parser rigidity.** The parser can extract JSON from fenced or mixed text, but prompts and collector failures still instruct/assume JSON-only final text.
3. **File output is architecturally possible but not by prompt alone.** The default compactor has no file tool, auto-execution is disabled, and collector fails on approval requests.
4. **Generic file tools are the wrong boundary.** A generic `write_file` path would be runtime-dependent and exposes broader filesystem semantics than compaction needs. A dedicated `submit_compaction_result` capability can validate and write the JSON result atomically under backend ownership.

## Constraints / Dependencies / Compatibility Facts

- Memory compaction schema remains facts-only semantic entries with arrays: `critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, `important_artifacts`.
- `autobyteus-ts` must remain server-agnostic. Result-file storage/runner logic belongs in `autobyteus-server-ts` or behind `CompactionAgentRunner`.
- Existing built-in agent files are intentionally user-editable and not overwritten today, which conflicts with package/product-managed source authority.
- Current app-data `agents` root conflates product-seeded built-ins (`autobyteus-memory-compactor`, `autobyteus-skill-evolver`) with standalone user-created shared agents (`codex`, `professor`, `student` in the inspected app data); target design must sync by platform-owned identity/source, not by overwriting the whole directory.
- The current duplicate/fork surface is named `Duplicate` and creates unmanaged local copies in app data; it does not operate on Git package sources.
- Visible compactor runs are intentional and should remain inspectable in history.
- Compaction failure must block/stop unsafe parent dispatch before the next LLM request.

## Open Unknowns / Risks

- File handoff is deferred to a separate ticket; this ticket must avoid partial/dual result-channel work and preserve existing final assistant-text JSON parsing.
- The built-in/internal-agent update mechanism must distinguish product/package-managed updateable content from standalone user-owned local agents; otherwise automatic updates risk destroying unrelated local agents, while no updates leaves internal agents stale.
- If future platform-internal teams are introduced, they should get an explicit built-in team registry/materializer rather than being mixed into user package roots.
- Duplicate/fork removal is confirmed by the user. Implementation must remove UI/API/backend duplicate surfaces while leaving any existing duplicate-created local agents as ordinary standalone local agents.
- How to migrate existing unmanaged duplicate copies, if any; likely leave them as standalone local agents and stop creating new ones.
- If natural visible reasoning is encouraged, compactor run histories may become noisier; the authoritative result must remain the submitted JSON file, not visible prose.

## Notes For Architect Reviewer

If design proceeds, key review focus should be the output boundary:
- Do not use generic `write_file` as a result channel in this ticket.
- Keep one authoritative result source in target state.
- Add source-owned sync/update for platform-internal built-in compactor/evolver prompts while not overwriting unrelated standalone user-owned local agents, user-registered packages, or bundled application-owned teams/agents.
- Preserve memory compaction ownership of schema, normalization, persistence, archive, and snapshot rebuild.
