# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated worktree refreshed to latest `origin/personal` on 2026-07-13.
- Current Status: Current-state, persisted-data, server-catalog, Compaction-card, effective-selection, and real desktop node-window lifecycle investigation complete. Code Review Round 7 superseded the prior source pass with CR-PMCS-009: the earlier architecture package invented a same-window desktop rebinding journey and unnecessary Compaction-specific save fencing. The package now preserves the server-effective selected-ID read but returns writes to the existing simple per-key setting path; implementation remains on hold pending a fresh architecture Pass.
- Investigation Goal: Determine the real working-context compaction spine, define a complete implementation/registration/global-resolution/frontend-selection extension architecture around the context-to-context strategy boundary, classify epoch/config persistence impact, identify obsolete paths, and allocate the current built-in Memory Compactor to the correct strategy-owned boundary.
- Scope Classification: `Large`.
- Scope Classification Rationale: The target is a structural refactor across core memory/runtime composition, bounded server snapshot/settings/catalog/built-in-runner adaptation, frontend settings/catalog/localization behavior, and focused tests. It adds no second compression algorithm, per-agent selection, generic strategy form schema, or durable-memory schema.
- Scope Summary: One identified/named `WorkingContext -> WorkingContext` strategy interface; a global definition/factory registry; `AUTOBYTEUS_COMPACTION_STRATEGY`; operation-time global resolution; registry-backed server catalog and frontend selector; current structured-JSON algorithm registered behind it with fixed built-in Memory Compactor; no AgentConfig strategy field; `MemoryManager` as replacement owner; epoch/timestamp and dead compaction-path removal; arbitrary compactor-agent selection removal.
- Primary Questions Resolved:
  1. What represents and owns the current working context?
  2. Where does current prefix/suffix planning live, and why does that block future strategies?
  3. What is the smallest truthful strategy API?
  4. Is epoch currently behaviorally meaningful?
  5. Which current compaction path is production-authoritative, and which is dead/test-only?
  6. Can existing snapshot files remain directly usable after metadata contraction?
  7. What registration, identity, and selection boundary is required now so a future strategy does not trigger another architecture refactor?
  8. Is strategy selection per-agent or process-global, and which existing settings path should own it?
  9. Which existing current-strategy inputs must cross operation-time construction to preserve behavior exactly?
  10. Which universal output invariants can the framework enforce before installation, and which remain strategy/test responsibilities?
  11. Who owns durable episodic/semantic-to-context projection when both current compaction and restore consume it?
  12. How does the bound-server frontend discover strategy names without duplicating registry data?
  13. Is the current compactor-agent selector a valid universal setting, or an unsafe leak of one strategy's private worker?
  14. What loading/error/unknown-ID/same-node-save/accessibility states must the Compaction card handle?
  15. Does the desktop Compaction window ever switch nodes during a save, or does each node own a separate window?

## Request Context

The user reset the earlier file-backed redesign into a new ticket because the prior design had become too complex and had not started from the stable business input/output.

The user established this domain direction:

```text
current working context
    -> compaction
next working context
    -> MemoryManager replaces current context
```

Different future strategies may implement that transformation differently. The current ticket must only refactor the already-shipped structured-JSON approach into that shape. The user explicitly rejected generic `constraints`, replacement-proposal, port/host, and universal episodic/semantic output contracts. The user also directed removal of the unused epoch.

The user authorized design/refactor kickoff on 2026-07-13 and required the written package to be presented before architecture-review handoff. During that review, the user made two corrections: this refactor itself must include a strategy registry and strategy name/identity; and selection is one global experimental/system choice, never an agent configuration. The existing environment-backed Server Settings path must govern it.

On 2026-07-14 the user reopened the product surface after inspecting the current Compaction card. The user approved this further refinement:

```text
registry-backed Compaction strategy selector
    + existing trigger ratio/context override/detailed logs
    - unrestricted Compactor agent selector
```

`Structured JSON` shall always use the built-in Memory Compactor internally. The user asked for the requirements, investigation, design, contracts, and UI specification to be updated, and retained the earlier instruction to review the completed written package before another architecture handoff.

Code Review Round 7 later conveyed the user's explicit rejection of the Compaction-specific `bindingRevision`/captured-client save machinery. The reviewer then audited the production desktop lifecycle and confirmed the mismatch: Electron opens or focuses one separate window per node, window bootstrap binds that node once, and the Compaction surface has no normal desktop operation that rebinds the same window while saving. The required correction is therefore simplification, not another concurrency patch.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` monorepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies`.
- Current Branch: `codex/pluggable-memory-compaction-strategies`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: initial fetch created the worktree from `2f2ddc0b`; later fast-forward refreshes advanced the dedicated branch through `1d3cbe3c` to base `fdb370d4`. The worktree currently points at superseded candidate checkpoint `df7ade6e`; its source is investigation evidence only pending the revised architecture gate.
- Task Branch: `codex/pluggable-memory-compaction-strategies`.
- Expected Base Branch: `origin/personal`.
- Expected Finalization Target: `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The earlier `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-compaction-file-backed-redesign` ticket is historical only. Do not import its three-file/generation architecture. The candidate implementation/review/delivery evidence at `df7ade6e` was superseded when the user reopened frontend/current-worker ownership. The user has now approved the revised package; implementation remains unauthorized until it receives a fresh architecture Pass.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related Requirement / Acceptance-Criteria IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/working-context-compaction-domain-contract.md` | Stable input/output, global-vs-agent selection, safe point, current partition, examples, invariant-enforcement split | Context-to-context outcome; one global selection; current `H/Q/P/R/T` is strategy-specific; no epoch; runtime versus strategy/test enforcement | REQ-PMCS-001–003, REQ-PMCS-006–007, REQ-PMCS-013, REQ-PMCS-019–020, REQ-PMCS-023, REQ-PMCS-025–030; AC-PMCS-001–004, AC-PMCS-016–017, AC-PMCS-019–029 | User-approved; CR-PMCS-009 reconciled | Include in cumulative architecture package. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/working-context-compaction-strategy-contract.md` | Strategy API, identity/name, global registry/setting/resolver/catalog, effective selected-ID read, exact construction, fixed built-in current worker, pre-install validation, shared projection, and ownership rules | One current production implementation; exact operation inputs; global registry/setting/UI catalog; server-owned runtime-effective selection; no per-agent field, arbitrary worker choice, generic compact options/proposal DTO, or Compaction-specific save session | REQ-PMCS-001, 004–005, 008, 010, 017–030; AC-PMCS-001, 005, 009, 013–029 | User-approved; CR-PMCS-009 reconciled | Include in cumulative architecture package. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/compaction-strategy-settings-ui-ux-spec.md` | Registry-backed strategy-first Compaction card, effective/default selection, simple per-key same-node save/error behavior, universal controls, accessibility, and generic agent-selector removal | User-visible selection, fixed/private current-worker boundary, and the real one-window/one-node desktop journey | REQ-PMCS-017, 019–021, 025–030; AC-PMCS-013, 015–017, 023–029 | User-approved; CR-PMCS-009 reconciled | Include in cumulative architecture package. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-13 | Command | `git fetch origin personal && git merge --ff-only origin/personal` in the dedicated worktree | Ensure design reads latest tracked base | Fast-forwarded from `2f2ddc0b` to `1d3cbe3c`; ticket artifacts remained isolated/untracked | No |
| 2026-07-13 | Command | `git merge --ff-only origin/personal`; `git diff --name-only 1d3cbe3c..fdb370d4 -- <relevant source paths>` | Refresh again after user-driven global-settings redesign | Fast-forwarded to `fdb370d4`; only unrelated messaging manifest/settings test files changed in inspected source scopes | No |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/working-context-snapshot.ts:8-83` | Inspect current context value | Mutable message collection plus `epochId` and `lastCompactionTs`; `reset()` increments epoch, append methods do not | No |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/memory-manager.ts:50-75, 440-476` | Establish live-context owner and compactor coupling | `MemoryManager` owns snapshot/persistence but also stores concrete `Compactor`; `resetWorkingContextSnapshot` mutates then persists | No |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts:25-158` | Trace current orchestration | Executor owns window planning, current-strategy budget input, compactor call, retrieval, rebuild, reset, request clear, status | No |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/compaction/working-context-message-window-planner.ts` | Determine current partition ownership | Builds current `head/compactable/retained/protected` plan and uses model input budget for current recent suffix | No |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/compaction/working-context-compactor.ts` | Determine what the named compactor actually returns | Accepts a prebuilt `MessageCompactionPlan`; writes one episodic item + semantic items; prunes traces; returns counts/result, not a working context | No |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/compaction/working-context-snapshot-rebuilder.ts` and `compacted-memory-message-builder.ts` | Trace final context construction | Executor-owned rebuilder creates `[system][compacted-memory USER][retained messages]` from retrieved episodic/semantic bundle | No |
| 2026-07-13 | Code | `autobyteus-ts/src/agent/factory/agent-factory.ts:117-153` | Locate current construction | Factory constructs concrete `Compactor` and injects it into `MemoryManager` | No |
| 2026-07-13 | Code | `autobyteus-ts/src/agent/context/agent-config.ts:38-100, 105-136` | Distinguish current execution dependency from product selection | `AgentConfig` already carries/copies the compaction-agent runner; adding strategy ID would make a global algorithm experiment part of every agent definition/run and is unnecessary | Preserve without strategy ID |
| 2026-07-13 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts:58-107` | Locate runtime budget/reporter/executor construction | LLM phase computes current input budget and constructs `PendingCompactionExecutor` per run; current strategy budget is passed through executor options | No |
| 2026-07-13 | Code | `autobyteus-ts/src/agent/input-processor/processor-registry.ts`; `autobyteus-ts/src/agent/streaming/parser/strategies/registry.ts`; shared `design-principles.md` registry guidance | Check repository and team registry conventions | Registries are indexed registration/lookup/enumeration infrastructure; orchestration, defaults, construction dependencies, and fallback belong to an owning composition/lifecycle boundary | Apply to compaction registry |
| 2026-07-13 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts:60-180, 300-408`; `src/config/app-config.ts:453-500` | Trace global settings persistence/live update | Predefined settings normalize through ServerSettingsService; `AppConfig.set` updates config data, `process.env`, and `.env`. Compaction already has several global keys | Reuse for strategy key |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/compaction/compaction-runtime-settings.ts`; `autobyteus-server-ts/src/config/stream-parser-setting.ts`; `autobyteus-ts/src/utils/tool-call-format.ts` | Find analogous core env-resolution pattern | Core constants/resolver read `process.env`; server setting normalization reuses core allowed values; updates apply without AgentConfig fields | Mirror for global compaction strategy |
| 2026-07-13 | Code | `autobyteus-web/components/settings/CompactionConfigCard.vue`; `ServerSettingsBasicsPanel.vue`; `useMediaDefaultModelsCard.ts` | Verify user settings location | Compaction already has a global Basics card and default media models use global settings; strategy belongs there, not agent creation | The original deferral was superseded by the user's 2026-07-14 UI decision |
| 2026-07-13 | Code/Test | `llm-phase.ts:254-295`; `agent-turn-runner.ts:53-120`; `tool-result-continuation-builder.ts:43-47`; `llm-request-assembler.ts:52-72`; `tests/integration/agent/memory-compaction-runtime-e2e.test.ts:214-295` | Verify tool/compaction ordering | Tool calls defer immediate compaction; tool executes; terminal result is ingested; pending compaction executes before continuation render | No |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts:4-85` | Inspect epoch persistence and reader strictness | Writer emits `epoch_id`/`last_compaction_ts`; validator does not require either and does not reject extra keys | No |
| 2026-07-13 | Command | `rg -n "epochId|epoch_id" autobyteus-ts/src autobyteus-server-ts/src autobyteus-ts/tests autobyteus-server-ts/tests` | Find epoch consumers | Only snapshot field/reset, serializer, persistence call, and tests; no stale-work/recovery/business reader | No |
| 2026-07-13 | Command | `rg -n "new Compactor|compactWorkingContext|\.compact\(|CompactionWindowPlanner|CompactionPlan" ...` | Distinguish production and legacy paths | Production calls only `compactWorkingContext`; `Compactor.compact(CompactionPlan)` and block planner family are test/export-only | No |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/compaction/compactor.ts`; `compaction-window-planner.ts`; `compaction-plan.ts`; `interaction-block-builder.ts`; `tool-result-digest-builder.ts`; `compaction-snapshot-builder.ts` | Classify legacy compaction branch | A parallel block/raw-trace compaction family remains despite no production caller; inheritance duplicates store/write behavior | Remove cleanly in design |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/store/run-memory-file-store.ts:288-308`; `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Find cross-package working-context type consumers | Snapshot state serializer/store and server run-memory writer import the runtime `WorkingContextSnapshot` class; rename needs bounded source/test updates | No |
| 2026-07-13 | Data/Command | Python key/size inventory over `/Users/normy/.autobyteus/server-data/memory/agents/*/working_context_snapshot.json` | Classify persisted-data transition | 415 parseable files, 82,625,679 bytes; all have messages/epoch/timestamp; schema versions: v4=212, v3=200, v2=2, v1=1 | No |
| 2026-07-13 | Test/Setup | `npx vitest run tests/unit/memory/... tests/integration/agent/...` in `autobyteus-ts` | Attempt focused baseline execution | Could not start because the worktree lacks installed workspace `vitest`; `npx` could not resolve `vitest/config`. No repository files changed | Downstream implementation/API-E2E must use project setup |
| 2026-07-13 | Code | Direct provider render/request paths and `docs/llm_module_design_nodejs.md` | Verify next-request context authority | Direct adapters receive full rendered context per call; AutoByteus RPA has remote-session cache behavior, but this refactor does not change provider adapter semantics | Record residual boundary only |
| 2026-07-13 | User design clarification | Strategy registry/name follow-up during final package review | Resolve whether the seam may defer registration/selection architecture | User required the refactor to leave the system ready for another strategy now; interface-only dependency injection was insufficient | Requirements/design revised |
| 2026-07-13 | User design clarification | Global-vs-agent selection follow-up during final package review | Correct selection ownership | User rejected `AgentConfig.memoryCompactionStrategyId`; one global environment/server setting must govern all compactions and AgentConfig/AgentFactory must not own selection | Requirements/design revised |
| 2026-07-13 | Command | Python artifact validation over all ticket Markdown plus `git status`, branch/base comparison, and outside-ticket path check after global-settings redesign | Validate corrected package consistency before returning it to the user | 21 unique requirements and 17 unique acceptance criteria; no undefined explicit IDs, trailing whitespace, missing final newlines, tracked changes outside the ticket, or branch/base drift at `fdb370d4` | No |
| 2026-07-13 | Review | `tickets/done/pluggable-memory-compaction-strategies/design-review-report.md`, Architecture Review Round 1 | Independently review the approved package before implementation | Central direction passed, but ARCH-PMCS-001–004 identified stale approval text, incomplete construction inputs, missing pre-install validation, and contradictory rebuilder ownership | Reconcile package and return through architecture review |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts:14-91`; `autobyteus-ts/src/agent/factory/agent-factory.ts:136-148`; `autobyteus-ts/src/memory/policies/compaction-policy.ts` | Verify exact current construction behavior for ARCH-PMCS-002 | Current summarizer receives runner, `parentAgentId: agentId`, and policy-derived `maxItemChars` (default 2000); the ID is sent on each child compaction task and the limit bounds each prompt line | Add `agentId` and `maxItemChars` to bounded construction context and map exactly |
| 2026-07-13 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts:70-107`; `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts:20-112` | Locate current runtime sources and retrieval limits for ARCH-PMCS-002 | LlmPhase has `AgentContext.agentId`, existing config runner, manager/store/policy, active input budget, and reporter; executor currently defaults/receives `maxEpisodic: 3`, `maxSemantic: 20` | Bind active inputs at LlmPhase; keep 3/20 as named current-strategy constants |
| 2026-07-13 | Code | `autobyteus-ts/src/llm/utils/messages.ts`; `autobyteus-ts/src/memory/working-context-snapshot.ts`; `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts`; provider renderers | Determine enforceable output checks for ARCH-PMCS-003 | Canonical roles and typed tool payloads permit structural/head/tool-protocol checks; current snapshot copies only the array and shares nested mutable objects; provider-specific render quality and semantic sufficiency cannot be proven generically | Add deep-copy `WorkingContext` plus pre-install output validator; keep quality/budget/provider specifics strategy/test-owned |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/memory-manager.ts:236-258`; all `buildMessages()` call sites | Check behavioral impact of making WorkingContext exposure detached | `ingestAssistantToolResponse` currently mutates provenance on the last `buildMessages()` element and relies on aliasing; other inspected callers serialize, repair-then-reset, or read only | Add copied `replaceMessage` operation and adapt this manager path; cover persistence |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts`; `autobyteus-ts/src/memory/restore/working-context-recovery-projector.ts`; `autobyteus-ts/src/memory/compaction/working-context-snapshot-rebuilder.ts`; `compacted-memory-message-builder.ts` | Resolve ARCH-PMCS-004 ownership contradiction | Restore directly imports the same rebuilder used after current compaction. Shared behavior is bounded retrieval + compacted-memory user message + head/continuation context projection; raw-trace recovery remains restore-private | Allocate shared `memory/projection/CompactedMemoryContextProjector`; current strategy and restore consume it, generic executor/manager do not |
| 2026-07-13 | Command | Python cross-artifact ID/Markdown validation; stale-approval search; `git status`; `git rev-list --left-right --count origin/personal...HEAD`; outside-ticket status filter after Round 1 reconciliation | Validate cumulative revised package before architecture re-review | Five active solution artifacts; 24 unique requirements; 22 unique acceptance criteria; no undefined explicit IDs, odd fences, missing final newlines, trailing whitespace, stale approval markers, branch/base drift, or changes outside the ticket folder | No |
| 2026-07-14 | User + screenshot | Current Compaction card screenshot at `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8036095773ee4344816b85d32bc19e63/solution_designer_194427ab42e3425e8639a545006c220c/context_files/ctx_8a843ccf3c55__image.png` and follow-up discussion | Determine intended user-facing ownership | User approved strategy-first selection, preserved ratio/context/log controls, removal of unrestricted compactor-agent selection, and fixed built-in Memory Compactor ownership | Reconcile complete package; no handoff yet |
| 2026-07-14 | User package approval | Completed revised requirements, investigation, design, domain contract, strategy contract, and UI/UX supplement | Confirm whether the reconciled package may enter architecture review | User explicitly approved and authorized review | Hand off cumulative package to `architecture_reviewer` |
| 2026-07-14 | Code/Test | `autobyteus-web/components/settings/CompactionConfigCard.vue`; `components/settings/__tests__/CompactionConfigCard.spec.ts`; English/Chinese settings messages | Trace current card and option authority | Card has no strategy field, fetches all agent definitions, and saves `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`; tests explicitly admit unrelated agent definitions. Save control lacks an accessible text label and card has no catalog error/unknown-strategy state | Replace agent dependency with registry catalog and UI states |
| 2026-07-14 | Code | `autobyteus-server-ts/src/api/graphql/types/server-settings.ts`; `autobyteus-web/graphql/queries/server_settings_queries.ts`; `stores/serverSettings.ts` | Determine whether strategy names are discoverable | Existing settings query returns key/value/description/editability only. No strategy catalog exists; settings store is bound-node aware | Add a subject-specific registry-backed query and binding-aware catalog state |
| 2026-07-14 | Code | `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-registry.ts`; `default-working-context-compaction-strategy-registry.ts`; server strategy-setting normalizer | Find existing identity authority | Registry already owns deterministic `{id,name}` list and server validation already consumes it. The catalog can map the same list without constructing a strategy or duplicating metadata | Reuse registry as catalog authority |
| 2026-07-14 | Code | `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md`, `agent-config.json`, `built-in-agent-registry.ts`, `built-in-agent-bootstrapper.ts` | Determine whether one built-in worker is sufficient | Built-in Memory Compactor owns exact JSON instructions, has no tools/skills/default launch config, and is bootstrapped as a normal definition. Bootstrap currently sets the configurable agent ID only when blank | Keep definition sync; remove setting default/choice |
| 2026-07-14 | Code | `agent-execution/compaction/compaction-agent-settings-resolver.ts`; `server-compaction-agent-runner.ts` | Trace arbitrary-agent behavior and launch fallback | Resolver loads any selected definition, uses its explicit runtime/model or parent fallback, and runner executes it as a normal no-tools agent. Arbitrary system instructions can conflict with structured JSON expectations | Resolve the fixed built-in ID while preserving parent runtime/model fallback |
| 2026-07-14 | Code/Data | `server-settings-service.ts` predefined/custom setting behavior and `ServerSettingsManager.vue` Advanced table | Classify old persisted agent-selection key | Removing predefined metadata/runtime reads leaves an old `.env` key inert; generic Advanced settings may expose it as a deletable custom extra. No migration or compatibility branch is required for correctness | Record direct-use/ignored-extra decision |
| 2026-07-14 | Command | `git status --short`; `git branch --show-current`; `git rev-parse HEAD`; `git log -3 --oneline --decorate` | Preserve exact reset state | Dedicated branch is `codex/pluggable-memory-compaction-strategies`, HEAD `df7ade6e`, base `origin/personal` `fdb370d4`; delivery-owned doc/log changes remain. Prior gates are superseded | Modify only solution artifacts; preserve unrelated state |
| 2026-07-14 | Review | `design-review-report.md`, Architecture Review Round 3 | Re-review the user-approved frontend/fixed-worker package | ARCH-PMCS-001–004 remain resolved; ARCH-PMCS-005/006 identify missing effective-selection read authority and multi-key save fencing | Reconcile and return through architecture review |
| 2026-07-14 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts:215-274`; core `working-context-compaction-strategy-setting.ts`; frontend `GET_SERVER_SETTINGS` | Trace absent/blank selected-strategy reads | Generic settings omit absent/blank predefined values; core normalizer alone owns the `structured-json` default; catalog entries have no/default selection field by design | Add a subject-specific server effective-ID read using the core normalizer; keep catalog tight |
| 2026-07-14 | Code | `autobyteus-web/stores/serverSettings.ts:updateServerSetting`; `utils/apolloClient.ts`; `stores/windowNodeContextStore.ts` | Trace the hypothetical multi-key rebind concern raised by Architecture Round 3 | Each update resolves the current bound client separately; this initially motivated a proposed patch action before the real desktop lifecycle was audited | Superseded by CR-PMCS-009; do not implement for the Compaction desktop save path |
| 2026-07-14 | Review | `tickets/done/pluggable-memory-compaction-strategies/code-review-report.md`, Source Review Round 7 | Re-audit the implemented UI save path after the user rejected revision-fenced Compaction saves | CR-PMCS-009 classifies the same-window rebind requirement as a Requirement Gap with Design Impact; the backend strategy architecture remains sound, while the Compaction-specific save session must be removed | Reconcile requirements/design/supplements and return through architecture review |
| 2026-07-14 | Code | `autobyteus-web/electron/main.ts:147-166,271-274`; `electron/preload.ts:44-47`; `components/settings/NodeManager.vue:282-285` | Verify the real desktop node-navigation journey | `openNodeWindow(nodeId)` focuses an existing window for that node or creates a separate one; Node Manager invokes that operation rather than rebinding the current settings window | Make separate-window one-node behavior authoritative |
| 2026-07-14 | Code | `autobyteus-web/plugins/20.windowNodeBootstrap.client.ts:12-37`; `stores/windowNodeContextStore.ts:66-87`; repository-wide `rg -n 'bindNodeContext\('` excluding tests | Determine whether the Compaction desktop window can change bindings during save | Desktop bootstrap calls `initializeFromWindowContext(...)` once. The only production `bindNodeContext(...)` caller outside its definition is `mobileNodeSessionStore.ts:87-91` for the distinct mobile session flow | Remove Compaction rebind states; leave generic/mobile safeguards outside scope |
| 2026-07-14 | Code | Base `CompactionConfigCard.vue` save loop and `ServerSettingsStore.updateServerSetting(...)`; current candidate patch action | Compare the existing simple settings flow with the over-designed implementation | Existing card sequentially awaited the existing per-key action; the candidate added `settingsBindingRevision`, `expectedBindingRevision`, a patch result DTO, confirmed/unconfirmed bookkeeping, and previous-node UI solely for the unsupported journey | Reuse the simple action; retain only truthful same-node failure behavior |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `LlmPhase` evaluates observed input-token usage and calls `MemoryManager.requestCompaction(...)`.
- Current execution flow:

```text
LlmPhase threshold evaluation
    -> MemoryManager pending request
    -> LLMRequestAssembler or post-response safe point
    -> PendingCompactionExecutor
    -> WorkingContextMessageWindowPlanner
    -> MemoryManager.compactor (Compactor)
    -> WorkingContextCompactor.compactWorkingContext(plan)
    -> structured JSON summarizer
    -> episodic/semantic store + raw-trace prune
    -> executor-owned Retriever
    -> executor-owned WorkingContextSnapshotRebuilder (also directly consumed by restore fallback)
    -> MemoryManager.resetWorkingContextSnapshot(messages)
    -> clear request / emit completed
    -> next LLM request renders manager messages
```

- Ownership observations:
  - `MemoryManager` correctly owns the live messages and persistence but incorrectly also owns a concrete compaction implementation.
  - `PendingCompactionExecutor` mixes generic pending-request lifecycle with the current algorithm's prefix/suffix/retrieval/rebuild details.
  - `WorkingContextCompactor` has a misleading boundary: it compacts a plan into durable memory side effects, not a working context into another working context.
  - `Compactor extends WorkingContextCompactor` solely to retain a separate obsolete plan API.
  - The Compaction card treats an internal structured-strategy worker as a universal setting and bypasses the strategy registry entirely.
  - The server settings GraphQL boundary cannot present strategy names, while the core registry already owns the exact `id`/`name` catalog.
- Current behavior summary: the algorithm already achieves the desired external replacement effect, but its public/internal ownership shape is inverted. The refactor should move the whole existing algorithm behind one strategy method rather than redesign the algorithm.

- Current settings/UI flow:

```text
CompactionConfigCard mounts
    -> fetch all visible AgentDefinitions
    -> render every definition in Compactor agent selector
    -> save AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID
       + trigger ratio + context override + logs
    -> CompactionAgentSettingsResolver loads whichever definition ID was selected
    -> ServerCompactionAgentRunner invokes that definition
```

This is not a sound extension boundary. The strategy itself is absent from the card, arbitrary agents are treated as JSON-compatible workers, and a future non-agent or multi-agent strategy would inherit an irrelevant universal field.

### Current tool-call / compaction ordering

```text
LLM emits tool call
    -> call is ingested
    -> compaction request is recorded
    -> immediate compaction is skipped
    -> tool batch executes
    -> terminal result is ingested
    -> request assembler verifies/repairs protocol safety
    -> pending compaction executes
    -> next request renders replacement
```

This is the current safe point to preserve. It means strategy input normally contains complete tool interactions, not a live unresolved tool call.

### Current strategy behavior

```text
complete working-context messages
    -> executor selects current prefix/suffix
    -> compactor asks one agent for structured JSON
    -> framework stores one episodic item + categorized semantic facts
    -> framework retrieves latest/salient memory
    -> builder renders compacted-memory USER message
    -> executor appends retained suffix and resets manager snapshot
```

The target changes where this behavior is owned, not what it produces. Exact current construction also includes parent agent identity, policy-derived prompt item length, and 3/20 retrieval limits; these must not disappear during the ownership move.

The current built-in worker path is:

```text
autobyteus-memory-compactor definition
    -> exact structured-JSON system instructions
    -> blank default launch config
    -> parent runtime/model fallback
```

The target preserves this path and removes only the ability to substitute an arbitrary definition.

## Design Health Assessment Evidence

- Change posture: `Refactor` + `Cleanup`.
- Candidate root cause classification: `Boundary Or Ownership Issue`, `File Placement Or Responsibility Drift`, `Legacy Or Compatibility Pressure`.
- Refactor posture evidence summary: a future algorithm cannot replace current selection/rebuild behavior through one boundary because the executor performs those steps before and after the current compactor. Adding conditionals to the executor would hard-code strategy branches. The dead block/raw-trace API also keeps two meanings of “compactor.”

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `pending-compaction-executor.ts` | Imports planner, rebuilder, retriever behavior | Generic lifecycle caller bypasses the desired strategy boundary | Move current algorithm details behind concrete strategy |
| `memory-manager.ts` | Stores concrete `Compactor` | State owner also owns algorithm implementation | Remove property; inject strategy through runtime/executor |
| `working-context-compactor.ts` | Returns execution outcome, not context | Name/API do not match domain transformation | Replace with explicit strategy contract/current implementation |
| `working-context-snapshot.ts` | Epoch/timestamp have no behavioral reader | Shared domain value contains redundant metadata | Remove and tighten subject |
| `compactor.ts` + block planner family | Production-unreferenced path persists via exports/tests | Legacy path would force compatibility or ambiguous ownership | Remove in this change |
| `CompactionConfigCard.vue` + its test | All visible agents become compactor options; strategy registry is absent | Product surface exposes a concrete strategy internal and cannot scale to different strategy mechanisms | Replace with registry-backed strategy selector and universal controls |
| Server settings GraphQL + strategy registry | Settings carry selected ID; registry carries names; no catalog joins them | Missing explicit catalog boundary | Add read-only registry metadata query |
| `CompactionAgentSettingsResolver` | Reads arbitrary agent-definition ID setting | Current strategy does not own its required worker | Resolve fixed built-in identity; remove setting selection |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/working-context-snapshot.ts` | Runtime ordered messages + epoch/timestamp | Runtime subject and persisted-snapshot metadata are conflated | Rename/tighten to messages-only `WorkingContext` |
| `autobyteus-ts/src/memory/memory-manager.ts` | Context, raw traces, compaction request, concrete compactor, persistence | Correct live-context owner, incorrect algorithm dependency | Add detached get/complete replace; remove compactor dependency |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | Pending lifecycle plus current algorithm orchestration | Too much current-strategy knowledge | Reduce to invoke/replace/request lifecycle |
| `autobyteus-ts/src/memory/compaction/working-context-message-window-planner.ts` | Current prefix/suffix/tool-unit planning | Useful current-strategy internal | Preserve behind concrete strategy |
| `autobyteus-ts/src/memory/compaction/working-context-compactor.ts` | Current memory update/store/prune | Misnamed partial transformation | Replace by current strategy implementation |
| `autobyteus-ts/src/memory/compaction/compactor.ts` | Inheritance wrapper + legacy raw-trace plan API | Two compaction meanings | Remove |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | Structured JSON agent call | Current-strategy internal; old block method is legacy | Tighten to message-unit use |
| `autobyteus-ts/src/memory/compaction/working-context-snapshot-rebuilder.ts` | Current message reconstruction also imported by restore fallback | Shared durable-memory projection is currently misplaced in compaction-private folder | Replace with shared `memory/projection/compacted-memory-context-projector.ts`; current strategy and restore consume it |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Memory/compactor composition | Creates concrete compactor inside manager | Remove obsolete Compactor wiring; add no selection/default branch |
| `autobyteus-ts/src/agent/context/agent-config.ts` | Per-agent runtime inputs | Carries existing compaction-agent runner, not strategy choice | Preserve API/copy shape; no strategy ID |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Trigger budget and executor composition | Already has active runner/store/input budget/reporter context | Supply construction dependencies to global resolver boundary; keep trigger policy |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | Structured compaction task | Requires `parentAgentId` and `maxItemChars` in addition to runner | Map construction `agentId`/`maxItemChars` exactly; no compact options |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Snapshot restore plus durable-memory/raw-trace fallback | Directly imports compaction rebuilder and uses configurable 3/20 defaults | Consume shared compacted-memory projector; retain restore-owned raw-trace projector/options |
| `autobyteus-ts/src/memory/compaction/compaction-runtime-settings.ts` | Process-global compaction env reads | Already resolves ratio/token/log settings per operation | Add global strategy ID read/default input |
| `autobyteus-server-ts/src/services/server-settings-service.ts` / `src/config/app-config.ts` | Global user settings/live+persistent environment | Existing set path updates `process.env` and `.env` | Register/validate strategy key; no parallel store |
| `autobyteus-server-ts/src/api/graphql/types/server-settings.ts` | Generic settings query/mutation plus search config | No registry-backed compaction strategy catalog | Add subject-specific GraphQL type/resolver rather than overloading setting values |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts` | Resolves user-selected agent definition and launch fallback | Arbitrary selection violates current strategy assumptions | Replace/tighten to fixed built-in Memory Compactor launch resolution |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` / bootstrapper | Sync built-ins and initialize setting defaults | Current Memory Compactor default exists only for free selection | Keep sync; remove compactor setting default |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | Global compactor agent/ratio/context/log editor | Fetches all agents; no strategy catalog or robust error states | Strategy-first registry-backed UI; remove agent store dependency |
| `autobyteus-web/stores/serverSettings.ts` + new strategy catalog state | Bound-node settings cache | Settings owner is valid; catalog is a distinct subject | Keep settings writes; add narrow binding-aware catalog owner |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | Compaction-card copy | Describes selecting a compactor agent | Replace with strategy/global behavior labels and error/retry copy |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | Persisted snapshot mapping | Tolerates extra keys; writes unused metadata | Stop writing/reading epoch/timestamp |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Snapshot state read/write | Uses runtime class | Bounded type rename; physical filename unchanged |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Server event-to-memory snapshot writer | Imports runtime class directly | Bounded import/type/property adaptation only |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-13 | Test setup probe | Focused `npx vitest run` command recorded in Source Log | Test runner unavailable because workspace dependencies are not installed/resolvable in this worktree | No behavioral test conclusion; downstream setup required |
| 2026-07-13 | Source reference probe | Symbol-by-symbol `rg` across source/tests | Legacy `compact(CompactionPlan)` family has no production caller | Safe candidate for clean-cut removal, subject to build/export verification |
| 2026-07-13 | Data inventory | Python JSON key/schema inventory, contents not printed | Current v4 stored superset is representative and sizable | Direct use is preferable to rewrite/migration |

## External / Public Source Findings

No external source is normative. The design is derived from current repository behavior and the user-approved domain model.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for source investigation; focused implementation tests use existing in-memory stores and compaction runner doubles.
- Required config, feature flags, env vars, or accounts: production current strategy requires the existing compaction agent runner; deterministic tests do not.
- External repos, samples, or artifacts cloned/downloaded: none.
- Setup commands that materially affected investigation: git fetch/fast-forward; attempted `npx vitest` noted above.
- Cleanup notes: no temporary repository files, data writes, probes, or processes remain.

## Findings From Code / Docs / Data / Logs

1. The requested strategy seam requires both the context-to-context execution interface and a global registration registry now because future implementation, enumeration, and ID-based selection must not trigger another architecture refactor.
2. The clean boundary belongs above prefix/suffix planning, not around the JSON summarizer alone.
3. The same context type should cross the boundary in both directions.
4. The runtime context type should not include unused compaction-generation metadata.
5. `MemoryManager` should own context replacement but not the strategy.
6. Pending execution remains a useful lifecycle owner when stripped of algorithm details.
7. Current structured JSON, episodic/semantic storage, and prompt projection can remain unchanged behind the strategy.
8. Legacy block/raw-trace compaction types are removable rather than supportable as a second hidden strategy.
9. Stable strategy `id` and user-facing `name` are distinct concerns: configuration/lookup uses `id`; the current Compaction card presents `name`.
10. Strategy selection is process-global, not agent-owned. `CompactionRuntimeSettingsResolver` plus a dedicated strategy resolver should read it per pending operation so already-created agents observe updates.
11. A global registry of strategy definitions/construction callbacks supports settings validation and current UI discovery without requiring an agent instance; construction receives bounded current runtime dependencies only after selection.
12. `AgentFactory` should only lose obsolete concrete `Compactor` wiring. It must gain no strategy ID/default/selection branch, and `AgentConfig` gains no strategy field.
13. The exact operation construction context is bounded to `agentId`, store, existing runner, active input budget, current `maxItemChars`, and diagnostics. Retrieval limits 3/20 are current-strategy constants, not universal compact options.
14. The framework must validate distinct context identity, unchanged leading system/head messages, canonical message/payload shape, and complete non-orphaned tool protocol before authoritative replacement. Semantic sufficiency, compression/budget quality, and provider-specific rendering remain strategy/test responsibilities.
15. Durable episodic/semantic prompt projection is one shared memory concern used by the current strategy and restore fallback; it must not be declared private to the strategy or leak into generic pending execution.
16. Strategy enumeration is no longer future-only product work. The existing global Compaction card is the correct surface and needs a read-only registry-backed `{id,name}` catalog for the bound server.
17. The current agent selector is not the strategy selector. It exposes a private dependency of `Structured JSON`, lists unrelated agents, and cannot represent future no-agent or multi-agent approaches.
18. The clean target fixes the current worker identity to `autobyteus-memory-compactor`, preserves parent runtime/model fallback, and removes the setting/UI/bootstrap default that made arbitrary substitution possible.
19. The registry metadata must remain tight. Predicting `configurationKind` or a generic frontend schema now would couple unrelated future strategies and recreate the complexity the user rejected.
20. Catalog and selected setting are separate authoritative subjects. The frontend may coordinate them for the server bound to the opened node window, but cannot duplicate the strategy list or silently default an unknown ID.
21. Persisted configuration and runtime-effective selection are distinct. The server effective-selection read must use the core normalizer: absent/blank returns `structured-json`; explicit valid or unknown values remain explicit. The frontend uses that value as its clean baseline and never persists a default merely by loading.
22. The normal desktop journey does not rebind a Compaction settings window: each node is opened/focused in its own Electron window and bootstrap initializes that window's context once. The earlier write-fencing premise was unsupported.
23. The existing setting mutation remains non-transactional and is the proportionate authority. The card can await it sequentially for changed values, stop at the first same-node failure, keep the error and remaining dirty fields visible, and avoid whole-card success without a patch-result DTO or binding-session state machine.
24. Generic/mobile `bindingRevision` behavior may protect other flows. CR-PMCS-009 authorizes removal only of Compaction-specific save/session/rebind machinery; unrelated safeguards require their own usage audit and stay unchanged.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume: 415 per-agent `working_context_snapshot.json` files under `/Users/normy/.autobyteus/server-data/memory/agents`, totaling 82,625,679 bytes. All parsed files contained `schema_version`, `agent_id`, `epoch_id`, `last_compaction_ts`, and `messages`.
- Relevant code-model, serialization, semantic, or physical-store change: runtime class rename/tightening; stop serializing/reading unused epoch and last-compaction timestamp. Physical filename and message serialization remain unchanged.
- Normal readers and writers, including unknown/extra-field behavior: `WorkingContextSnapshotSerializer.validate` requires current schema version, string `agent_id`, and message array; it does not require epoch/timestamp and does not reject unknown keys. Normal writer replaces the JSON object atomically in `RunMemoryFileStore`; `WorkingContextSnapshotStore` currently uses direct write but the payload mapping remains compatible.
- Representative direct-read or compatibility evidence: all 212 schema-v4 files have the required keys/messages. Removing code that consumes the two extra numeric fields leaves message deserialization unaffected. Future writes can omit them while remaining valid v4 according to current validation.
- Required semantics and invariants preserved by direct use: `Yes` — ordered message roles/content/tool payload/metadata are unchanged; obsolete numeric keys have no runtime reader after refactor.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: rewriting 82.6 MB only to remove two ignored fields has no functional benefit and adds I/O/corruption exposure.
- Concrete benefit, cost, and risk of migration: no semantic benefit; avoid migration. Ordinary writes contract each active payload naturally.
- Existing migration framework or lifecycle constraints: not needed. Older non-v4 snapshots already follow existing validation/recovery behavior; this ticket does not add historical branches.

Configuration transition evidence:

- Stored subject: optional `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID=<id>` entry in the server `.env`/process environment.
- Target reader/writer behavior: no normal compaction source reads or writes this key; the built-in worker identity is code-owned by server compaction composition. `ServerSettingsService` no longer registers it as predefined.
- Existing-data semantics: the old value is no longer meaningful. Ignoring it does not lose memory or change the selected compaction strategy; it removes an unsafe customization.
- Normal generic settings behavior: because arbitrary `.env` entries are visible as custom settings, an old value may remain visible/deletable in Advanced settings. It is inert and is not a dual runtime path.
- Decision: `Directly Usable — No Migration` as an ignored configuration extra. Do not add startup deletion, version branching, or fallback to the old value.

Persisted-data decision: `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- Keep one current structured-JSON compaction algorithm and existing normal compaction-agent run behavior, but bind it only to the built-in Memory Compactor.
- Keep current tool safe-point ordering.
- Keep current episodic/semantic/raw-trace schemas and compacted-memory rendering.
- No generic constraints/result wrapper in the strategy API.
- Include stable strategy ID/name, a global registration/get/list registry, `AUTOBYTEUS_COMPACTION_STRATEGY`, operation-time core resolution, existing ServerSettingsService/AppConfig persistence/validation, a registry-backed server catalog, a server-owned effective selected-ID read using the same core normalizer, and the current Compaction-card selector now.
- Reuse `ServerSettingsStore.updateServerSetting`, `ServerSettingsService`, and `AppConfig` for Compaction writes. Sequence only changed valid fields, stop on the first same-node failure, and add no Compaction-specific binding revision, captured-client session, or patch-result API.
- Treat the desktop one-node-per-window lifecycle as authoritative. Do not redesign or remove generic/mobile node-binding safeguards in this ticket.
- Exclude per-agent/per-run selection, arbitrary compactor-agent selection, generic dynamic strategy forms, and a second production strategy.
- Clean-cut removal; do not retain aliases for `Compactor` or `WorkingContextSnapshot` solely for compatibility.
- The server run-memory writer is a compile-time consumer of the renamed runtime type and needs a bounded update.
- User approval for the revised behavior direction and completed written package was completed on 2026-07-14; architecture re-review is authorized.

## Open Unknowns / Risks

- Optional strategy-specific diagnostic details remain non-authoritative observability. The design resolves their boundary as the operation-scoped `WorkingContextCompactionDiagnostics` adapter supplied alongside construction; generic lifecycle identity/phase stays in `PendingCompactionExecutor`, and no diagnostics enter the strategy return. Exact optional log-field population may follow the current reporter adapter without changing a business API.
- Current durable-memory mutation/prune ordering predates this ticket and is not crash-consistent with outer context replacement. This structural refactor will encapsulate but not solve that broader durability issue.
- The worktree lacks installed test dependencies, so baseline executable evidence is deferred to implementation/API-E2E stages with project setup.
- The first production catalog contains one strategy. This is intentionally preparatory: it proves the extension path without shipping a second algorithm.
- The effective-selection read is a separate scalar setting projection; catalog entries stay `{id,name}` and never acquire default/selected state.
- Multiple generic server-setting mutations are not transactional. A later same-node failure can follow an earlier successful write; the UI must keep the error and failed/unsent dirty fields visible and avoid whole-card success without implying an atomic batch or rollback.

## Notes For Architecture Reviewer

CR-PMCS-009 reconciliation is complete. Re-review all three mandatory artifacts plus the domain contract, strategy contract, and UI/UX specification, focusing on the replacement of the unsupported ARCH-PMCS-006 desktop rebind premise with the actual separate-window lifecycle and existing per-key setting authority. ARCH-PMCS-005 and the backend strategy architecture remain unchanged. Earlier implementation/API-E2E/delivery results remain superseded; implementation must not resume without a fresh architecture Pass.
