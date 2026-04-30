# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Current-state architecture investigation complete; code review blocked on artifact-chain mismatch after schema simplification; requirements/design now explicitly keep minimal facts-only compactor output in scope and need architecture re-review before implementation resumes. Current target also uses visible normal compactor runs through existing top-level agent-run APIs, avoids Codex/Claude/backend-framework internal changes, seeds a default normal compactor agent, requires Codex-compactor API/E2E validation, and clarifies two-layer compactor prompt ownership.
- Investigation Goal: Understand `autobyteus-ts` compaction flow and design a refactor where compaction is executed through a configurable compactor agent instead of direct configured-model invocation.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The desired capability crosses `autobyteus-ts` memory/agent runtime boundaries, `autobyteus-server-ts` runtime-kind/agent-definition execution, and `autobyteus-web` server settings UX.
- Scope Summary: Agent-based compaction design for `autobyteus-ts`, with a server-owned cross-runtime compactor-agent runner, a seeded default normal compactor agent, a global compactor-agent selector in Server Settings -> Basics -> Compaction, and visible normal compactor runs created by existing run services.
- Primary Questions Resolved:
  - Where is compaction triggered and executed today? Resolved: post-response budget check in `LLMUserMessageReadyEventHandler`, pre-dispatch execution through `LLMRequestAssembler -> PendingCompactionExecutor -> Compactor -> LLMCompactionSummarizer`.
  - Which owner currently chooses the model/provider for compaction? Resolved: `CompactionRuntimeSettingsResolver` reads `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`; `LLMCompactionSummarizer` otherwise falls back to the active run model.
  - Which existing boundary can execute runtime-kind-specific agents? Resolved: `autobyteus-server-ts` owns `AgentRunService`, `AgentRunManager`, `AgentRunBackend`, and runtime kind factories for AutoByteus/Codex/Claude.
  - What configuration identity should select the compactor agent? Resolved recommendation after user feedback: a global server setting, proposed `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, edited in `CompactionConfigCard.vue`; the selected agent definition's normal `defaultLaunchConfig` supplies runtime/model/config.
  - How can `autobyteus-ts` invoke a server-owned agent without reverse dependency? Resolved: `autobyteus-ts` defines only a `CompactionAgentRunner` interface; server implements that interface and injects the implementation into native agent construction. `autobyteus-ts` calls the injected object and never imports server files.
  - Should compactor runs be hidden/internal? Revised answer after implementation design-impact feedback: no. Treat the compactor as just another normal agent run created through existing top-level run APIs, visible in frontend/history for inspection.
  - Should implementation modify Codex/Claude/backend bootstrap/thread/session internals for compaction? Revised answer: no. Compaction must not invade mature backend internals; use existing normal run APIs and event streams.
  - Should a default compactor agent be provided? Resolved: yes. Seed a normal shared visible/editable `autobyteus-memory-compactor` into the app-data agents home and set `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` only when blank.
  - Should default runtime/model be Codex or LM Studio/Qwen? Resolved: no environment-specific default. The seeded agent should not assume runtime/model availability; users or E2E setup configure default launch preferences.
  - What old model-direct behavior must be removed? Proposed: `LLMCompactionSummarizer` production wiring, `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`, and active-model fallback behavior.
  - Is AutoByteus-parent + Codex-compactor E2E required? Resolved: yes for API/E2E validation; if environment is unavailable, record an explicit blocker rather than claim pass.
  - Should compactor behavior/schema live in `agent.md` or each per-task user message? Resolved: two-layer split. Strengthen default `agent.md` for stable behavior/manual testing; keep exact current JSON schema in every automated task envelope as memory-owned parser contract.
  - Should compactor semantic entries include free-form `tags`? Resolved: no for this ticket. Categories are enough; current tag output has no required consumer and makes weak models produce more structure than necessary.
  - Should compactor semantic entries include optional model-generated `reference`? Resolved: no for this ticket. A reference is a source pointer such as a turn/file/artifact/tool-result note, but asking the LLM to produce it adds optional structure; if needed later, design deterministic/controlled source pointers separately.

## Request Context

User reports that `autobyteus-ts` supports compaction but compaction currently uses the configured model. User wants a more flexible architecture where compaction uses a configurable compactor agent with independently configurable instructions, runtime, and model/provider selection, including runtimes such as Codex or other supported agent runtimes. User clarified that the frontend should use the existing Server Settings -> Basics compaction area to select the compactor agent id, while agent instructions/runtime/model should continue to be configured on the normal agent editing page.

During implementation, the user challenged the reviewed hidden/internal-run design. The user clarified that compaction is just another agent use case, should use the mature existing `AgentRunService`/`AgentRunManager`/frontend run-history framework, and should not force changes into Codex or Claude internals. The user also stated that visible frontend history is desirable because it lets users inspect whether compaction quality is good or bad.

Later implementation feedback clarified prompt ownership: the default compactor should be independently understandable and manually testable as a normal agent. Users should be able to paste arbitrary conversation/history content into the compactor run and observe compaction behavior from `agent.md`, while automated compaction still needs a parser-compatible current schema envelope. The user then challenged the `tags` field as strange and emphasized the schema should be as simple as possible because weaker LLMs struggle with highly structured output. The user also questioned optional `reference`; the resulting design removes both nonessential fields from the compactor-facing contract.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction`
- Current Branch: `codex/agent-based-compaction`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-04-28; fetched tag `v1.2.85` and pruned deleted remote branch `origin/codex/messaging-gateway-queue-upgrade-reset`.
- Task Branch: `codex/agent-based-compaction` created from `origin/personal` at commit `c570c57d`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: User's original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is branch `personal` behind `origin/personal` with untracked `docs/future-features/`; authoritative work is in the dedicated task worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-28 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD || true && ls -la` | Bootstrap repository and branch context | Root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; branch `personal` behind `origin/personal`; remote default `origin/personal`; untracked `docs/future-features/`. | No |
| 2026-04-28 | Command | `git fetch origin --prune && git worktree list && git branch --list 'codex/agent-based-compaction' && git branch -r --list 'origin/personal'` | Refresh tracked remote and check for existing task branch/worktree | Fetch succeeded; no existing `codex/agent-based-compaction` branch was listed; many unrelated worktrees exist. | No |
| 2026-04-28 | Command | `git worktree add -b codex/agent-based-compaction /Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction origin/personal` | Create mandatory dedicated task worktree/branch | Worktree created at latest `origin/personal` commit `c570c57d` with branch tracking `origin/personal`. | No |
| 2026-04-28 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design guidance | Design must be spine-led, ownership-led, clean-cut, and must reject legacy dual-path fallbacks. The same principle also argues against unnecessary framework invasion when existing owners already fit. | Applied in design spec |
| 2026-04-28 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/templates/{requirements-doc-template.md,investigation-notes-template.md,design-spec-template.md}` | Required artifact structures | Requirements, investigation notes, and design spec created/updated from team workflow. | No |
| 2026-04-28 | Command | `rg -n "compact|compaction|Compaction|context.*compress|summary" autobyteus-ts/src autobyteus-ts/tests autobyteus-ts/docs ... -S` | Locate compaction implementation and docs | Found active compaction code in `autobyteus-ts/src/memory/compaction`, request assembly in `src/agent/llm-request-assembler.ts`, status events, docs, and tests. | No |
| 2026-04-28 | Code | `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | Inspect pre-dispatch compaction owner | Executes when `memoryManager.compactionRequired`, plans raw traces, emits status, calls `memoryManager.compactor.compact(plan)`, rebuilds snapshot, clears request, wraps failures in `CompactionPreparationError`. It logs `compaction_model_identifier`, but does not own the actual model call. | Modify design target only |
| 2026-04-28 | Code | `autobyteus-ts/src/memory/compaction/compactor.ts` | Inspect persistence-side compaction owner | Calls `Summarizer.summarize(plan.eligibleBlocks)`, normalizes result, writes episodic/semantic items, prunes raw traces by trace id. This is a good boundary to preserve. | Modify summarizer injection only |
| 2026-04-28 | Code | `autobyteus-ts/src/memory/compaction/llm-compaction-summarizer.ts` | Inspect direct model compaction | Directly resolves settings, chooses `settings.compactionModelIdentifier ?? fallbackModelIdentifierProvider()`, creates an LLM with `LLMFactory.createLLM`, sends built-in prompt, parses response, and cleans up. This is the primary old behavior to decommission. | Remove/decommission in target |
| 2026-04-28 | Code | `autobyteus-ts/src/agent/factory/agent-factory.ts`, `autobyteus-ts/src/agent/context/agent-config.ts` | Inspect native runtime composition | Default runtime wires `LLMCompactionSummarizer`; `AgentConfig` has no runner injection seam. | Add server-injected runner seam without server dependency |
| 2026-04-28 | Code | `autobyteus-ts/src/memory/compaction/compaction-prompt-builder.ts`, `compaction-response-parser.ts`, `compaction-result.ts`, `compaction-result-normalizer.ts` | Inspect output contract | Current prompt requires JSON with `episodic_summary`, `critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, and `important_artifacts`; parser and normalizer are reusable. | Preserve output schema; split output contract from agent instructions |
| 2026-04-28 | Code | `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts` | Inspect server runtime kinds | Server runtime kinds are `autobyteus`, `claude_agent_sdk`, `codex_app_server`. | Keep runtime-kind execution server-owned |
| 2026-04-28 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Inspect top-level run service | `AgentRunService.createAgentRun(...)` validates inputs, prepares run id/memory dir, calls `AgentRunManager.createAgentRun`, writes metadata, and records visible history. This is the right target after user feedback. | Use for compactor runs |
| 2026-04-28 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`, `domain/agent-run.ts`, `backends/agent-run-backend.ts` | Inspect normal run execution owner | Manager creates backends by runtime kind; `AgentRun` exposes `subscribeToEvents`, `postUserMessage`, `terminate`. Normal path is sufficient for compactor execution and output collection. | Reuse; avoid internal-task changes |
| 2026-04-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/*`, `backends/claude/*` | Inspect external runtime backends | Codex/Claude already expose normal event and message APIs through backend interface. User specifically objected to modifying these internals for compaction. | Avoid backend bootstrap/thread/session changes |
| 2026-04-28 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts` | Inspect current predefined server settings | Registers `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO`, `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`, `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE`, and `AUTOBYTEUS_COMPACTION_DEBUG_LOGS`. Target should replace model identifier setting with `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`. | Yes, settings update |
| 2026-04-28 | Code | `autobyteus-server-ts/src/agent-definition/domain/models.ts`, `providers/agent-definition-config.ts`, `services/agent-definition-service.ts`, `launch-preferences/default-launch-config.ts` | Inspect agent-definition and launch preference shape | Agent definitions have instructions/tools/processors/skills and `defaultLaunchConfig` with `runtimeKind`, `llmModelIdentifier`, `llmConfig`. | Reuse selected compactor definition/defaults |
| 2026-04-28 | Code | `autobyteus-server-ts/src/config/app-config.ts`, `agent-definition/providers/file-agent-definition-provider.ts`, `agent-definition/providers/agent-definition-source-paths.ts` | Inspect normal app-data/shared agent storage | `getAgentsDir()` resolves the app-data agents home; shared agent definitions are stored as `agents/<id>/agent.md` and `agent-config.json`, listed normally, and editable when writable. | Seed default compactor here |
| 2026-04-28 | Code | `autobyteus-server-ts/src/startup/cache-preloader.ts`, `server-runtime.ts`, `startup/background-runner.ts` | Inspect startup/cache timing | Agent-definition cache preloading runs during background startup. Default compactor seeding should run before cache preloading/normal run use, or refresh the cache after seeding. | Add startup bootstrapper sequencing |
| 2026-04-28 | Code | `autobyteus-web/components/settings/ServerSettingsManager.vue` lines 250-272 | Locate Server Basics compaction area | The basic server settings panel renders `<CompactionConfigCard />` directly after search settings. This is the UX location requested by the user. | Use this location |
| 2026-04-28 | Code | `autobyteus-web/components/settings/CompactionConfigCard.vue` lines 27-155 | Inspect current compaction card | The card exposes a compaction model `<select>` tied to `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`, plus trigger ratio, context override, and debug logs. It fetches provider models and offers “Use active run model”. Target should replace this with an agent-definition selector. | Yes, UI update |
| 2026-04-28 | Code | `autobyteus-web/components/agents/AgentDefinitionForm.vue`, `components/launch-config/DefinitionLaunchPreferencesSection.vue`, `stores/agentDefinitionStore.ts`, `graphql/queries/agentDefinitionQueries.ts` | Verify existing agent editing/listing | Agent definition editing already includes launch preferences; agent list query includes `id`, `name`, and `defaultLaunchConfig`. | Reuse |
| 2026-04-28 | Other | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/implementation-design-impact-note.md` plus user clarification | Re-evaluate hidden/internal run design | Implementation attempted internal task changes across AgentRunManager and Codex/Claude bootstrap/thread paths; user objected and prefers visible normal agent runs. | Design rework required |
| 2026-04-28 | Command | `git status --short`, `git diff --stat`, `rg -n "internalTask|InternalAgentTask|hidden|toolsEnabled" ...` | Inspect partial implementation impact | Partial changes include `internalTask` in generic run config/manager, new `internal-tasks` folder, Codex/Claude/CodexThread modifications, and tool suppression branches. These conflict with revised design. | Implementation should revert/avoid these changes |
| 2026-04-28 | Doc | `tickets/done/llm-runtime-real-compaction/{requirements.md,proposed-design.md,design-review-report.md}` | Understand prior compaction design | Prior scope intentionally excluded a public compaction agent and implemented direct internal LLM summarizer. New user request is a direct architectural reversal of that earlier out-of-scope point. | Use as current-state context |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent.md` | Inspect implemented default compactor prompt | Current default prompt has useful high-level rules but is still concise and points users to the per-task output contract. User feedback asks for a stronger self-contained prompt for manual testing. | Strengthen default `agent.md` |
| 2026-04-30 | Code | `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | Inspect implemented automated task prompt | Current builder includes several behavior lines plus exact JSON contract and `[SETTLED_BLOCKS]`. Exact contract is needed for parser compatibility, but behavior prose can be trimmed once default `agent.md` owns stable behavior. | Keep exact schema in task; reduce duplicate prose |
| 2026-04-30 | Doc | `tickets/in-progress/agent-based-compaction/implementation-design-impact-note-prompt-ownership.md` | Review implementation design-impact prompt ownership note | Implementation recommends strengthened default `agent.md` plus exact schema in each user message, avoiding schema-only-in-editable-agent risk. | Adopt two-layer split |
| 2026-04-30 | Command | `rg -n "tags" autobyteus-ts/src/memory autobyteus-ts/tests autobyteus-server-ts/src autobyteus-web -S`; read `semantic-item.ts`, `compactor.ts`, `compaction-response-parser.ts`, `compaction-snapshot-builder.ts` | Inspect compactor-generated tag usage | Tags are parsed from compaction output and stored on `SemanticItem`, but the current compaction snapshot renders by category and does not use tags. Categories already classify entries. | Remove tags from compactor-facing schema |
| 2026-04-30 | Code | `autobyteus-ts/src/memory/compaction-snapshot-builder.ts`, `semantic-item.ts`, `compaction-response-parser.ts` | Inspect compactor-generated reference usage | `reference` is an optional source pointer rendered as `(ref: ...)` when present. It can help traceability, but it is model-generated and optional; no core compaction behavior requires it. | Remove reference from compactor-facing schema for first implementation |
| 2026-04-30 | Other | code reviewer message plus `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/review-report.md` | Review code-review block | Code review is blocked because tagless schema requirements were added without completed architecture review/implementation alignment. | Reconcile scope, keep minimal schema in-scope, route back to architecture review |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `LLMUserMessageReadyEventHandler` receives `LLMUserMessageReadyEvent` for the next LLM leg.
- Current execution flow:
  1. Handler resolves `memoryManager`, `llmInstance`, active turn, renderer, and compaction reporter.
  2. Handler constructs `PendingCompactionExecutor(memoryManager, { reporter, runtimeSettingsResolver, fallbackCompactionModelIdentifier: llmInstance.model.modelIdentifier })`.
  3. `LLMRequestAssembler.prepareRequest(...)` invokes `pendingCompactionExecutor.executeIfRequired(...)` before appending the current user message.
  4. `PendingCompactionExecutor` checks `memoryManager.compactionRequired && memoryManager.compactor`, resolves runtime settings/model identity for logs, builds a `CompactionPlan`, emits status, calls `memoryManager.compactor.compact(plan)`, rebuilds the working context snapshot, clears the pending flag, and emits completed status.
  5. `Compactor.compact(plan)` calls its `Summarizer`, normalizes the result, writes episodic/semantic memory, prunes raw traces by trace ID, and returns counts.
  6. In default production wiring, the summarizer is `LLMCompactionSummarizer`, which directly creates an LLM through `LLMFactory.createLLM(...)` and sends a built-in prompt.
  7. After the active LLM response completes, the handler resolves token budget and sets `memoryManager.requestCompaction()` when threshold is crossed.
- Current normal run framework:
  - `AgentRunService.createAgentRun(...)` creates run id/memory dir, calls `AgentRunManager`, writes metadata, and records history.
  - `AgentRun` already supports `subscribeToEvents`, `postUserMessage`, and `terminate` across backend runtime kinds.
  - This is sufficient for compactor execution without adding hidden/internal semantics to backend internals.
- Boundary observations:
  - Good boundaries to preserve: `PendingCompactionExecutor`, `Compactor`, parser/normalizer/snapshot builder, `AgentRunService` normal run lifecycle.
  - Boundary problem to fix: `LLMCompactionSummarizer` direct model adapter inside memory compaction.
  - Boundary problem to avoid: modifying Codex/Claude/thread/bootstrap internals for a compactor run, which should be just another normal agent run.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | LLM pre-dispatch and post-response trigger | Creates pending executor and marks compaction required after usage threshold. Uses active model fallback and suppresses compaction if no compactor. | Keep trigger owner, remove model fallback, add missing-config failure path/status identity. |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | Pre-dispatch request assembly | Calls `PendingCompactionExecutor` before appending current user message. | Keep thin facade; must not learn runtime/model/agent internals. |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | Pending compaction sequencing | Plans blocks, emits lifecycle, calls compactor, resets snapshot. | Add compactor agent/run identity reporting; keep as execution-cycle owner. |
| `autobyteus-ts/src/memory/compaction/compactor.ts` | Persistence-side compaction commit | Depends on abstract `Summarizer`; this seam is suitable for agent-based implementation. | Replace summarizer implementation, not compactor responsibilities. |
| `autobyteus-ts/src/memory/compaction/llm-compaction-summarizer.ts` | Direct LLM summarizer | Creates LLM directly and falls back to active model. | Decommission from production; replace with `AgentCompactionSummarizer`. |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | Structured response parsing | Robust JSON extraction and typed schema validation already exists. | Reuse unchanged. |
| `autobyteus-ts/src/agent/context/agent-config.ts` | Native agent config | No compaction-agent runner field in base; partial implementation may add one. | Add a core compaction runner seam without server dependency. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server settings registry | Current compaction settings include model identifier. | Replace with `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` while keeping ratio/context/debug settings. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Top-level run lifecycle plus metadata/history | Existing normal run owner. | Use for visible compactor runs. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Cross-runtime backend manager | Existing normal backend manager. | Reuse as-is; do not add compaction/internal-task flags. |
| `autobyteus-server-ts/src/agent-execution/backends/{codex,claude}` | Runtime-specific execution | Mature backend internals should remain unaware of compaction. | Do not add compaction-specific tool/hide/session/thread changes. |
| `autobyteus-server-ts/src/agent-definition/domain/models.ts` | Agent definition domain | Has instructions/default launch config. | Selected compactor is a normal agent definition. |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | Current compaction settings UI | Exposes direct model selection and active-model fallback copy. | Replace direct model selection with compactor-agent selector. |
| `autobyteus-web` run history/frontend | Existing visible run inspection surface | User wants compactor runs visible to inspect compaction quality. | Use normal run history rather than hidden internals. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-28 | Static trace | Read source files listed in Source Log | No live provider execution needed for design; current compaction path, normal run service path, and UI seams are clear from source. | Design can proceed without live provider credentials. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: Not applicable.
- Why it matters: This is an internal architecture refactor using local code reality.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design investigation.
- Required config, feature flags, env vars, or accounts: None for design investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The prior compaction implementation is production-ready mechanically but intentionally model-direct. Prior design explicitly stated “no separate public compaction agent is used”; this task reverses that architectural decision.
2. `Compactor` already depends on `Summarizer`, making the refactor naturally located at the summarizer implementation and runtime wiring layer rather than at planner/store/snapshot layers.
3. Cross-runtime agent choice cannot live solely inside `autobyteus-ts` because Codex/Claude runtime implementations are server-owned.
4. The correct separation remains: `autobyteus-ts` defines and consumes a generic compaction-agent runner; `autobyteus-server-ts` implements a runner that can execute the selected agent definition through runtime-kind backends.
5. The execution mechanism should now reuse existing visible normal run APIs, not hidden/internal task APIs.
6. The current model override UI/settings is not semantically strong enough for the requested architecture and should not remain as a compatibility path.
7. The current Server Settings -> Basics location already contains `CompactionConfigCard`, so selecting the compactor agent there is both natural and low-friction.
8. The current agent edit page already supports instructions and launch preferences, so compactor runtime/model should be configured on the compactor agent itself rather than duplicated in server settings.
9. Partial implementation changes that add internal-task semantics to Codex/Claude/AgentRunManager conflict with the revised design and should be reverted or avoided.
10. A system-provided compactor agent should be a normal shared agent definition seeded into app-data, not a hidden/internal run type and not application-owned read-only content, because users need to configure runtime/model and inspect/edit behavior.
11. Default launch config must not assume Codex, LM Studio, Qwen, or any model; availability is environment-specific.
12. Stable compactor behavior should be visible in the compactor agent's `agent.md` so the default compactor is independently testable as a normal agent.
13. The exact output schema should remain memory-owned and included in automated task messages because parser/normalizer/persistence consume that shape and selected compactor definitions are editable/custom/stale.
14. Compactor-generated tags should be removed from the schema: they are free-form, increase output burden for weaker models, and are not required by current rendering/retrieval behavior.
15. Compactor-generated references should also be removed from the schema for this ticket: they can help traceability, but optional source-pointer generation adds model burden and is not essential to preserve durable memory facts.
16. Code review correctly blocked because schema-simplification requirements must be either fully reviewed/implemented or explicitly deferred. The chosen resolution is to keep the minimal facts-only schema in scope and send the updated artifact chain back through architecture review.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatible direct model fallback should remain for replaced compaction behavior.
- `autobyteus-ts` must remain lower-level than `autobyteus-server-ts`; do not introduce reverse imports.
- Existing memory output categories should remain stable to contain implementation risk; free-form tags and optional model-generated references are removed from the compactor-facing schema.
- Editable `agent.md` instructions are not a safe sole owner for parser compatibility; automated tasks must carry the exact current contract.
- Visible compactor runs need cleanup/termination after one compaction attempt.
- Cross-runtime compaction will depend on server runtime availability for the selected runtime kind.
- Server settings can carry the selected compactor agent id, but runtime/model/config should come from the selected agent's existing `defaultLaunchConfig`.
- Compaction should not add backend-specific internal-task/hidden-run/tool-suppression behavior to mature Codex/Claude/AgentRunManager code.

## Open Unknowns / Risks

- Default compactor agent is now decided in-scope: seed a normal shared `autobyteus-memory-compactor` and select it when the compactor setting is blank.
- Whether future UI should add per-primary-agent or per-run compactor overrides; recommendation is future extension after the global setting.
- External runtimes may emit final answer text differently; output collection must normalize AutoByteus assistant-complete events and Codex/Claude text segment events from normal run streams.
- Strict JSON compliance may be weaker in Codex/Claude than direct API calls; parser failures should remain explicit compaction failures rather than triggering repair loops in the first implementation.
- API/E2E must cover AutoByteus parent plus Codex compactor with real configured runtimes where available; otherwise the validation report must record the missing environment as a blocker.
- If a compactor agent requests tools and no approval path is available for the automated compaction attempt, compaction should fail clearly while leaving the visible run for inspection.
- If default `agent.md` repeats a human-readable output shape for manual testing, future schema changes may make old user-edited prompts stale; automated task envelopes mitigate production compatibility, and future template migrations must still avoid silent overwrites.
- If future retrieval needs tags/facets/source pointers, it should be designed with a controlled vocabulary or deterministic source mapping and consumer path rather than reintroducing arbitrary model-generated optional fields.

## Notes For Architect Reviewer

This design was revised after implementation feedback and direct user clarification. The key change is replacing hidden/internal child-run semantics with visible normal compactor runs through existing `AgentRunService`/`AgentRunManager` APIs. The runner boundary and clean removal of direct-model compaction remain, but implementation should revert/avoid internal-task fields, Codex/Claude bootstrap/thread changes, and backend-specific tool suppression. The user explicitly prefers using the existing mature run framework and visible frontend/history inspection.

A second design-impact clarification adds a system-provided default compactor agent definition. This is a normal shared visible/editable definition seeded into the app-data agents home and selected only when `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is blank; it is not a hidden/internal run. The seeded definition must not assume Codex, LM Studio, Qwen, or any specific model. Real AutoByteus-parent plus Codex-compactor validation is required in API/E2E, with explicit blocker reporting if the required local runtimes are unavailable.

A third design-impact clarification resolves compactor prompt ownership. The selected compactor's `agent.md` owns stable behavior and must make the default compactor manually testable, but the memory package still owns the exact parser-required JSON output contract and includes it in each automated per-task user message. The task prompt should become a short envelope plus current schema plus settled blocks, not a long duplicate behavior manual.

A fourth clarification removes free-form `tags` and optional model-generated `reference` from the compactor-facing schema. Tags are optional labels with no current consumer, and references are optional source pointers that are useful but not core. The design now keeps semantic entries to facts only within the existing typed category arrays. This scope remains in-ticket and must pass architecture review before implementation/API-E2E resume.
