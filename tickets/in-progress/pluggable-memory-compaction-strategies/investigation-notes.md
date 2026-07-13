# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated worktree refreshed to latest `origin/personal` on 2026-07-13.
- Current Status: Current-state and persisted-data investigation complete; the user approved architecture-review handoff on 2026-07-13. Architecture Review Round 1 returned ARCH-PMCS-001 through ARCH-PMCS-004; exact construction, pre-install validation, and shared projection ownership have been investigated for package reconciliation.
- Investigation Goal: Determine the real current working-context compaction spine, define a complete implementation/global-registration/global-resolution extension architecture around the context-to-context strategy boundary, classify epoch/persistence impact, and identify obsolete paths that should be removed.
- Scope Classification: `Medium`.
- Scope Classification Rationale: The target is a structural refactor across core memory/runtime composition plus bounded server snapshot/settings adaptation and focused tests. It adds core strategy identity, global registration, environment-backed operation-time resolution, and existing settings persistence, but not another compression algorithm, per-agent setting, dedicated discovery/frontend UI, or durable-memory schema.
- Scope Summary: One identified/named `WorkingContext -> WorkingContext` strategy interface; a global definition/factory registry; `AUTOBYTEUS_COMPACTION_STRATEGY`; operation-time global resolution; current structured-JSON algorithm registered behind it; no AgentConfig strategy field; `MemoryManager` as replacement owner; epoch/timestamp removal; dead compaction-path removal; unchanged current behavior.
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

The user authorized design/refactor kickoff on 2026-07-13 and required the written package to be presented before architecture-review handoff. During that review, the user made two corrections: this refactor itself must include a strategy registry and strategy name/identity; and selection is one global experimental/system choice, never an agent configuration. The existing environment-backed Server Settings path must govern it. After the corrections, the user explicitly approved sending the complete package for architecture review. No further user decision is required for the bounded Round 1 reconciliation because it does not change that approved direction.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` monorepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies`.
- Current Branch: `codex/pluggable-memory-compaction-strategies`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: initial fetch created the worktree from `2f2ddc0b`; later fast-forward refreshes advanced the dedicated branch through `1d3cbe3c` to current `fdb370d4` with no conflict. The latest upstream delta did not change investigated compaction/settings source.
- Task Branch: `codex/pluggable-memory-compaction-strategies`.
- Expected Base Branch: `origin/personal`.
- Expected Finalization Target: `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The earlier `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-compaction-file-backed-redesign` ticket is historical only. Do not import its unapproved three-file/generation architecture into this ticket. The user approved this ticket for architecture review on 2026-07-13; implementation remains unauthorized until architecture review passes.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related Requirement / Acceptance-Criteria IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/working-context-compaction-domain-contract.md` | Stable input/output, global-vs-agent selection, safe point, current partition, examples, invariant-enforcement split | Context-to-context outcome; one global selection; current `H/Q/P/R/T` is strategy-specific; no epoch; runtime versus strategy/test enforcement | REQ-PMCS-001–003, REQ-PMCS-006–007, REQ-PMCS-013, REQ-PMCS-019–020, REQ-PMCS-023; AC-PMCS-001–004, AC-PMCS-016–017, AC-PMCS-019–021 | Refined; user-approved for architecture review | Present with cumulative package. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/in-progress/pluggable-memory-compaction-strategies/working-context-compaction-strategy-contract.md` | Strategy API, identity/name, global registry/setting/resolver, exact construction, pre-install validation, shared projection, and ownership rules | One current production implementation; exact operation inputs; global registry/setting; no per-agent field or generic compact options/proposal DTO | REQ-PMCS-001, 004–005, 008, 010, 017–024; AC-PMCS-001, 005, 009, 013–022 | Refined; user-approved for architecture review | Present with cumulative package. |

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
| 2026-07-13 | Code | `autobyteus-web/components/settings/CompactionConfigCard.vue`; `ServerSettingsBasicsPanel.vue`; `useMediaDefaultModelsCard.ts` | Verify user settings location | Compaction already has a global Basics card and default media models use global settings; strategy belongs there in future, not agent creation | Dedicated UI remains future presentation scope |
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
| 2026-07-13 | Review | `tickets/in-progress/pluggable-memory-compaction-strategies/design-review-report.md`, Architecture Review Round 1 | Independently review the approved package before implementation | Central direction passed, but ARCH-PMCS-001–004 identified stale approval text, incomplete construction inputs, missing pre-install validation, and contradictory rebuilder ownership | Reconcile package and return through architecture review |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts:14-91`; `autobyteus-ts/src/agent/factory/agent-factory.ts:136-148`; `autobyteus-ts/src/memory/policies/compaction-policy.ts` | Verify exact current construction behavior for ARCH-PMCS-002 | Current summarizer receives runner, `parentAgentId: agentId`, and policy-derived `maxItemChars` (default 2000); the ID is sent on each child compaction task and the limit bounds each prompt line | Add `agentId` and `maxItemChars` to bounded construction context and map exactly |
| 2026-07-13 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts:70-107`; `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts:20-112` | Locate current runtime sources and retrieval limits for ARCH-PMCS-002 | LlmPhase has `AgentContext.agentId`, existing config runner, manager/store/policy, active input budget, and reporter; executor currently defaults/receives `maxEpisodic: 3`, `maxSemantic: 20` | Bind active inputs at LlmPhase; keep 3/20 as named current-strategy constants |
| 2026-07-13 | Code | `autobyteus-ts/src/llm/utils/messages.ts`; `autobyteus-ts/src/memory/working-context-snapshot.ts`; `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts`; provider renderers | Determine enforceable output checks for ARCH-PMCS-003 | Canonical roles and typed tool payloads permit structural/head/tool-protocol checks; current snapshot copies only the array and shares nested mutable objects; provider-specific render quality and semantic sufficiency cannot be proven generically | Add deep-copy `WorkingContext` plus pre-install output validator; keep quality/budget/provider specifics strategy/test-owned |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/memory-manager.ts:236-258`; all `buildMessages()` call sites | Check behavioral impact of making WorkingContext exposure detached | `ingestAssistantToolResponse` currently mutates provenance on the last `buildMessages()` element and relies on aliasing; other inspected callers serialize, repair-then-reset, or read only | Add copied `replaceMessage` operation and adapt this manager path; cover persistence |
| 2026-07-13 | Code | `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts`; `autobyteus-ts/src/memory/restore/working-context-recovery-projector.ts`; `autobyteus-ts/src/memory/compaction/working-context-snapshot-rebuilder.ts`; `compacted-memory-message-builder.ts` | Resolve ARCH-PMCS-004 ownership contradiction | Restore directly imports the same rebuilder used after current compaction. Shared behavior is bounded retrieval + compacted-memory user message + head/continuation context projection; raw-trace recovery remains restore-private | Allocate shared `memory/projection/CompactedMemoryContextProjector`; current strategy and restore consume it, generic executor/manager do not |
| 2026-07-13 | Command | Python cross-artifact ID/Markdown validation; stale-approval search; `git status`; `git rev-list --left-right --count origin/personal...HEAD`; outside-ticket status filter after Round 1 reconciliation | Validate cumulative revised package before architecture re-review | Five active solution artifacts; 24 unique requirements; 22 unique acceptance criteria; no undefined explicit IDs, odd fences, missing final newlines, trailing whitespace, stale approval markers, branch/base drift, or changes outside the ticket folder | No |

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
- Current behavior summary: the algorithm already achieves the desired external replacement effect, but its public/internal ownership shape is inverted. The refactor should move the whole existing algorithm behind one strategy method rather than redesign the algorithm.

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
9. Stable strategy `id` and user-facing `name` are distinct concerns: configuration/lookup uses `id`; future UI presents `name`.
10. Strategy selection is process-global, not agent-owned. `CompactionRuntimeSettingsResolver` plus a dedicated strategy resolver should read it per pending operation so already-created agents observe updates.
11. A global registry of strategy definitions/construction callbacks supports settings validation and future discovery without requiring an agent instance; construction receives bounded current runtime dependencies only after selection.
12. `AgentFactory` should only lose obsolete concrete `Compactor` wiring. It must gain no strategy ID/default/selection branch, and `AgentConfig` gains no strategy field.
13. The exact operation construction context is bounded to `agentId`, store, existing runner, active input budget, current `maxItemChars`, and diagnostics. Retrieval limits 3/20 are current-strategy constants, not universal compact options.
14. The framework must validate distinct context identity, unchanged leading system/head messages, canonical message/payload shape, and complete non-orphaned tool protocol before authoritative replacement. Semantic sufficiency, compression/budget quality, and provider-specific rendering remain strategy/test responsibilities.
15. Durable episodic/semantic prompt projection is one shared memory concern used by the current strategy and restore fallback; it must not be declared private to the strategy or leak into generic pending execution.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume: 415 per-agent `working_context_snapshot.json` files under `/Users/normy/.autobyteus/server-data/memory/agents`, totaling 82,625,679 bytes. All parsed files contained `schema_version`, `agent_id`, `epoch_id`, `last_compaction_ts`, and `messages`.
- Relevant code-model, serialization, semantic, or physical-store change: runtime class rename/tightening; stop serializing/reading unused epoch and last-compaction timestamp. Physical filename and message serialization remain unchanged.
- Normal readers and writers, including unknown/extra-field behavior: `WorkingContextSnapshotSerializer.validate` requires current schema version, string `agent_id`, and message array; it does not require epoch/timestamp and does not reject unknown keys. Normal writer replaces the JSON object atomically in `RunMemoryFileStore`; `WorkingContextSnapshotStore` currently uses direct write but the payload mapping remains compatible.
- Representative direct-read or compatibility evidence: all 212 schema-v4 files have the required keys/messages. Removing code that consumes the two extra numeric fields leaves message deserialization unaffected. Future writes can omit them while remaining valid v4 according to current validation.
- Required semantics and invariants preserved by direct use: `Yes` — ordered message roles/content/tool payload/metadata are unchanged; obsolete numeric keys have no runtime reader after refactor.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: rewriting 82.6 MB only to remove two ignored fields has no functional benefit and adds I/O/corruption exposure.
- Concrete benefit, cost, and risk of migration: no semantic benefit; avoid migration. Ordinary writes contract each active payload naturally.
- Existing migration framework or lifecycle constraints: not needed. Older non-v4 snapshots already follow existing validation/recovery behavior; this ticket does not add historical branches.

Persisted-data decision: `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- Keep one current structured-JSON compaction algorithm and existing compaction-agent runner behavior.
- Keep current tool safe-point ordering.
- Keep current episodic/semantic/raw-trace schemas and compacted-memory rendering.
- No generic constraints/result wrapper in the strategy API.
- Include stable strategy ID/name, a global registration/get/list registry, `AUTOBYTEUS_COMPACTION_STRATEGY`, operation-time core resolution, and existing ServerSettingsService/AppConfig persistence/validation now.
- Exclude per-agent/per-run selection, the future dedicated discovery endpoint/frontend selector, and a second production strategy.
- Clean-cut removal; do not retain aliases for `Compactor` or `WorkingContextSnapshot` solely for compatibility.
- The server run-memory writer is a compile-time consumer of the renamed runtime type and needs a bounded update.
- User approval for architecture review was completed on 2026-07-13; implementation still requires an architecture Pass.

## Open Unknowns / Risks

- Optional strategy-specific diagnostic details remain non-authoritative observability. The design resolves their boundary as the operation-scoped `WorkingContextCompactionDiagnostics` adapter supplied alongside construction; generic lifecycle identity/phase stays in `PendingCompactionExecutor`, and no diagnostics enter the strategy return. Exact optional log-field population may follow the current reporter adapter without changing a business API.
- Current durable-memory mutation/prune ordering predates this ticket and is not crash-consistent with outer context replacement. This structural refactor will encapsulate but not solve that broader durability issue.
- The worktree lacks installed test dependencies, so baseline executable evidence is deferred to implementation/API-E2E stages with project setup.

## Notes For Architecture Reviewer

The user approved this package for architecture review on 2026-07-13. Round 1 reconciliation preserves the approved behavior-preserving structural refactor: exact existing current-strategy inputs now cross bounded composition, framework-enforceable output invariants are checked before installation, and the rebuilder becomes a shared compacted-memory projector for current strategy plus restore. This is not a continuation of the old file-backed redesign and not a multi-strategy product feature.
