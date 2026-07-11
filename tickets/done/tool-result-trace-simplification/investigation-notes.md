# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Requirement reset and provider-authoritative architecture investigation complete; redesign package in progress.
- Investigation Goal: Remove real result-side argument duplication without forcing Codex hosted-tool limitations onto native AutoByteus or Claude, while preserving crash evidence, compaction safety, historical reads, and the no-migration decision.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The physical result contraction is small, but the correct design crosses native and server lifecycle owners, provider-normalization boundaries, archive-aware correlation, Working Context compaction, crash/reconstruction, and several evidence projections.
- Scope Summary: Keep early calls where authoritative arguments exist, defer only calls whose provider boundary reports arguments unavailable, write minimal terminal results, correlate by compound identity, preserve historical result-side overlays for reads only, and perform no migration.
- Primary Questions Resolved:
  - Is name/argument duplication real and material? Yes.
  - Does native AutoByteus know model-issued arguments before execution? Yes.
  - Must native prepared/effective arguments redefine the persisted call? No; the user selected model-issued arguments as raw call semantics.
  - Does Claude know observed `tool_use` input at start? Yes.
  - Does Codex expose real `webSearch` action data at start? No.
  - Does Codex expose a separate raw search-result body later? No client-visible result-body event was present in complete captures or the installed schema; only final action/status metadata and the later assistant response are exposed.
  - Should Codex hosted search dictate terminal-only persistence for all providers? No.
  - Can missing arguments be distinguished from an explicit no-argument `{}` call? Yes, by preserving property presence at the normalized boundary.
  - Does native compaction need an in-flight barrier? Yes; current scheduling and Working Context grouping already supply most of it.
  - Is migration required for historical supersets? No.

## Request Context

A reported raw trace showed the same large command or patch on an early `tool_call` and its later `tool_result`. The user asked for verification against real `$HOME/.autobyteus` data, confirmed that a logical result should normally contain only identity and outcome, and rejected historical migration because existing JSON supersets remain directly readable.

The solution went through two superseded directions:

1. an early call plus `tool_call_update` design, rejected because the update was unnatural and unnecessary for most runtimes;
2. a terminal-only combined `tool_call` design, initially approved after direct Codex probing but later rejected because it over-generalized a hosted Codex limitation, discarded native crash evidence, and changed the intuitive call/result meanings.

On 2026-07-11 the user approved the current basis: keep the existing call/result subjects, remove `tool_name` and `tool_args` from future raw result rows, persist calls at each provider’s first authoritative argument boundary, and treat Codex hosted web search as a special late-observation case. Uniform semantics are required; identical lifecycle timing is not.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification`.
- Current Branch: `codex/tool-result-trace-simplification`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-simplification`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` succeeded during bootstrap on 2026-07-10.
- Bootstrap Commit: `3effb76ab56d4d1bb876ad0623a8e5eb7093a584`.
- Expected Base Branch: `personal` / `origin/personal`.
- Expected Finalization Target: `personal`.
- Current Remote Drift: the ticket branch was nine commits behind `origin/personal` when redesign resumed; refresh/integration remains delivery-owned after validation.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work only in this dedicated ticket worktree. Treat `git show 3effb76a...:<path>` as the clean current-state evidence source while superseded source changes remain preserved.

### Preserved paused implementation provenance

Architecture review round 4 passed the now-superseded terminal-only design, and implementation began before the user reopened the requirement. `git status --short` now contains many modified native/server source and test files plus new files such as `memory/models/tool-call-identity.ts` and terminal-only tests. Earlier untracked `historical-tool-trace-read.ts` and `tool-trace-correlation.ts` also preserve the still older update-design attempt.

No source or test modification has been deleted or rewritten during redesign. On 2026-07-11 the implementation engineer received a successful AutoByteus team message explicitly suspending authorization and requiring all current modifications to remain untouched until the revised package passes architecture review.

These changes are implementation provenance, not approved target behavior. The redesign reads the bootstrap commit for current-state architecture and lists deliberate adaptation/removal work in the design spec.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related Requirement / Acceptance-Criteria IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/tool-trace-contract.md` | Exact persisted/read contract | Split call/minimal result, argument readiness, crash/compaction/reconstruction, historical grouping | REQ-001–REQ-012 / AC-001–AC-013 | Being revised to the approved 2026-07-11 basis | Architecture review |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/tool-result-trace-simplification/codex-search-web-lifecycle-probe.md` | Root-cause evidence | Full client-visible lifecycle capture, schema, actual parser/converter output, no result-body audit, corpus classification | REQ-004, REQ-006, REQ-010 / AC-003, AC-010, AC-011 | Complete evidence; design consequence being revised | Retain with cumulative package |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-10 and 2026-07-11 | Skill | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/SKILL.md` | Reload updated workflow at user request and again for redesign | Mandatory three-artifact package, deep current-state read, supplemental alignment, architecture iteration, and AutoByteus-only handoffs remain authoritative. | No |
| 2026-07-10 and 2026-07-11 | Design reference | `.../solution-designer/design-principles.md`; `.../references/design-examples.md` | Apply current canonical design rules | Uniform semantics may use specialized boundary adapters; authoritative-boundary rule forbids accumulator reparsing; shared structures must be tight; no migration for readable supersets. | Apply in spec |
| 2026-07-10 | Command | bootstrap git discovery plus `git fetch origin --prune` | Establish isolated task workspace/base | Dedicated worktree/branch created from `3effb76a...`. | Complete |
| 2026-07-11 | Command | `git status --short --branch`; `git show 3effb76a...:<path>` | Separate clean current state from paused terminal-only implementation | Source worktree contains broad superseded edits; bootstrap source remains available without discarding provenance. | Architecture/implementation handoff |
| 2026-07-10 | Data/Script | `/tmp/scan_raw_tool_trace_contract.py` against `$HOME/.autobyteus/server-data/memory` | Quantify real duplication and exceptions | ~2.72 GB; 161,644 results; 160,135 exact argument duplicates; 1,377 differences; ~243.4 MB/8.96% exact repeated argument bytes. | No |
| 2026-07-10 | Data/Script | `/tmp/find_cross_file_tool_pairs.py`; `/tmp/classify_tool_identity_duplicates.py`; `/tmp/raw_trace_size_stats.py` | Inspect physical segmentation and identity | 228 initial cross-file pairs; complete corpus already dedupes physical raw IDs with active winning; zero parse failures. | Two-scope read design |
| 2026-07-10 | Data/Script | `/tmp/tool_result_outcome_stats.py` | Inspect result serialization | Historical results may omit null outcome keys; `trace_type:"tool_result"` itself establishes terminality. | New result serializer must emit both keys |
| 2026-07-10 | Probe | `/tmp/codex-web-search-lifecycle-multiaction-probe.mjs`; `codex app-server --stdio` | Observe search/open/find lifecycle directly | Captured all 214 client-visible frames. Each start had empty query/`other`; terminal exposed the real action; no actionable intermediate or approval frame. | Complete |
| 2026-07-11 | Probe audit | full `/tmp/codex-web-search-lifecycle-multiaction-raw.jsonl`; recursive frame-key/method audit | Test whether the filtered evidence missed a result event | Full capture contains no web-search result/snippet/source/citation body; `rawResponseItem/completed(web_search_call)` carries action/status only. | Record scope limit |
| 2026-07-11 | Follow-up probe | `/tmp/codex-web-search-lifecycle-grace-raw.jsonl`; three-second grace after `turn/completed` | Exclude a late post-turn result notification | Captured 39 frames and no notification after `turn/completed`; no structured search-result body. | Complete |
| 2026-07-11 | Schema | `codex app-server generate-json-schema --out /tmp/codex-schema-inspect` | Verify client contract independently of one trace | `WebSearchThreadItem` has id/query/action; `WebSearchCallResponseItem` has id/status/action; neither defines a raw result body. | Complete |
| 2026-07-10 | Probe | `/tmp/codex-web-search-converter-parser-probe.ts` through repository source | Determine whether AutoByteus drops start data | Parser/converter correctly map placeholder start to `{}` and terminal to action arguments. No extraction loss; semantic absence should replace placeholder `{}` for persistence readiness. | Converter change |
| 2026-07-10 | Data/Script | `/tmp/classify_search_web_arg_differences.py` | Classify historical exceptions | Mutable re-scan: 603 search, 629 openPage, 143 findInPage; every difference remained empty-start/terminal-enriched. | Complete |
| 2026-07-10/11 | Code | bootstrap `autobyteus-ts/src/memory/raw-trace-ingestion.ts`; `memory-manager.ts`; `agent/loop/llm-phase.ts` | Trace native write and compaction timing | Native already writes call before execute and result later; only result construction duplicates metadata. Compaction requests after a tool-producing LLM response are deferred rather than executed immediately. | Preserve timing, contract result |
| 2026-07-10/11 | Code | bootstrap `tool-phase.ts`; `tool-invocation.ts`; `agent-events.ts` | Inspect model-issued versus prepared arguments | Preparation may replace execution input. This does not change the user-approved meaning of raw call arguments as model-issued intent. | Do not add effective-state persistence |
| 2026-07-11 | Code | bootstrap Working Context message-unit builder/window planner | Inspect two-call compaction behavior | One assistant call batch plus following matching results forms a `tool_protocol_group`; the trailing group is protected and complete only when all expected IDs are matched. | Make invariant explicit |
| 2026-07-10/11 | Code | bootstrap Codex item converter/parser and generated protocol schema | Locate provider-authoritative readiness owner | Codex converter owns interpretation of placeholder versus real web-search arguments. The accumulator must consume presence, not inspect native payload/tool name. | Boundary change |
| 2026-07-10/11 | Code | bootstrap Claude tool-use coordinator and converter | Verify Claude timing | `tool_use`/permission input is retained and emitted on `TOOL_EXECUTION_STARTED` before terminal completion. | Early call/minimal result |
| 2026-07-10/11 | Code | bootstrap `runtime-memory-event-accumulator.ts`; `runtime-memory-event-payload.ts` | Trace shared server lifecycle | Accumulator writes start call and repeats accumulated metadata on result; keys state only by call ID, fabricates anonymous IDs, ignores interruptions, and defaults missing args to `{}`. | Refactor owner-local state/policy |
| 2026-07-10/11 | Code | bootstrap `run-memory-writer.ts`; `memory-recording-models.ts`; recorder | Inspect facade/state reconstruction | Writer input is all-optional; recorder deletes accumulator state on detach; writer is the proper thin facade for complete-corpus lifecycle hydration without exposing its store. | Strict variants + physical index query |
| 2026-07-11 | Code | bootstrap provider compaction boundary recorder and `RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary` | Inspect Codex rotation | Rotation moves every active row before the boundary marker, so a start call can be archived before its later minimal result. | Complete-corpus context/active-only eligibility |
| 2026-07-11 | Code | bootstrap native interaction block/planner/digest | Inspect local raw compaction | Blocks currently require call/result matching inside active input and digest reads result-side name. Minimal result plus cross-file context requires explicit read enrichment without archive IDs entering pruning. | Design change |
| 2026-07-10/11 | Code | bootstrap `tool-interaction-builder.ts`, native safety/recovery, server historical replay/work trace | Locate read duplication | Core builder is split-oriented but keys only by call ID and does not overlay historical result args; server replay has another local merge. | One neutral lifecycle index + authoritative logical projection |
| 2026-07-10/11 | Code/data | `RawTraceItem`, server normalizer, Memory Sync/migration folders | Re-evaluate transition | JSON readers tolerate supersets; no schema/version discriminator or correctness need for rewrite. | No migration |
| 2026-07-11 | Data/Script | Read-only scan for `trace_type:"tool_call"` rows containing `tool_result` or `tool_error` | Determine whether the briefly authorized combined-call prototype created persisted data requiring support | Zero combined terminal calls found in the live corpus. | Clean-cut removal; no prototype compatibility branch |
| 2026-07-11 | User decision | Current conversation | Lock redesign basis | Native/Claude early calls, minimal results, Codex provider-specific late call, provider-owned compaction, different mechanics under one semantic contract. | Approved |
| 2026-07-11 | Team communication | AutoByteus `send_message_to` -> `implementation_engineer` | Suspend obsolete authorization | Delivery succeeded; engineer instructed to preserve all current changes and stop. | Revised review required |

## Current Behavior / Current Flow

### Native AutoByteus write spine

```text
LLM tool invocation with id/name/arguments
  -> LlmPhase
  -> MemoryManager.ingestToolIntents
  -> buildToolIntentTraces
  -> append raw tool_call(name,args)
  -> append Working Context assistant tool-call message

ToolPhase preprocess/prepare/execute
  -> ToolResultEvent
  -> MemoryManager.ingestToolResults
  -> buildToolResultTraces
  -> append raw tool_result(name,args,result,error)
  -> append Working Context tool-result message
```

The call timing already matches the revised requirement. The defect is the loose result constructor. A result may reach memory through an individual processor and again in an ordered batch; active-row scanning currently supplies partial duplicate suppression.

### Native compaction and crash behavior

After the LLM returns tool invocations, `LlmPhase` may request compaction but executes it immediately only when no tool invocations exist. `WorkingContextMessageUnitBuilder` groups all calls in one assistant message with their following results, and the window planner protects the last tool group. This means a two-call batch is already a natural compaction barrier; the revised design must preserve and explicitly cover that invariant.

Because the call is written before execution, an abrupt crash normally leaves durable issued-call evidence. Existing protocol safety can fence a restored call lacking a committed result as interrupted/unknown and emits an operation-boundary recovery marker rather than assuming success or automatically retrying.

### Codex/Claude server write spine

```text
provider lifecycle payload
  -> provider converter/coordinator
  -> normalized AgentRunEvent
  -> AgentRunMemoryRecorder serialized queue
  -> RuntimeMemoryEventAccumulator
  -> RunMemoryWriter
  -> RunMemoryFileStore JSONL + Working Context snapshot
```

Claude emits complete observed input on start. Most Codex tool families also expose useful start/approval arguments. Codex hosted `webSearch` instead emits an empty placeholder and supplies real action data only at terminal completion.

The current accumulator always normalizes missing args to `{}`, writes a call at start, and repeats its accumulated name/arguments on the result. If a terminal arrives without a call, it synthesizes an early call immediately before the result. State is keyed by invocation ID alone; anonymous IDs may be invented; `TOOL_EXECUTION_INTERRUPTED` is ignored.

### Provider compaction / physical rotation

Codex owns semantic model-context compaction. AutoByteus merely records provider boundary events and rotates local raw evidence before eligible boundaries. `rotateActiveRawTracesBeforeBoundary(...)` moves every row before the marker, so an early call can enter an archive while its terminal result is later appended to active storage. This does not affect Codex inference but matters to raw evidence projection.

### Current read/projection spine

```text
active + archived raw JSONL
  -> RawTraceItem / MemoryTraceEvent
  -> several local call/result correlators
  -> ToolInteraction or HistoricalReplayToolEvent
  -> recovery / safety / compaction / run history / work-trace output
```

Server replay already displays one activity and overlays result-side metadata. Core `buildToolInteractions` exists but keys only by call ID and does not preserve historical terminal arguments. Native compaction digests read tool name directly from result rows. New minimal results therefore require a shared physical lifecycle correlation and a single logical read projection.

## Root-Cause Probe Findings

### Direct Codex lifecycle

`codex-cli 0.144.0` was launched as a raw stdio App Server. The original multi-action probe captured all 214 client-visible frames. Its three web-search activities were:

| Action | `item/started` | `item/completed` | Intermediate/approval data |
| --- | --- | --- | --- |
| Search | `query:""`, `action.type:"other"` | query + `search` + queries | None |
| Open page | `query:""`, `action.type:"other"` | URL + `openPage` | None |
| Find in page | `query:""`, `action.type:"other"` | query + URL/pattern + `findInPage` | None |

`rawResponseItem/completed(web_search_call)` contained terminal action/status only. A second one-search probe kept capturing for three seconds after `turn/completed`; no late frame appeared.

### No client-visible search-result body

The complete 214-frame and 39-frame captures were audited, not only the filtered lifecycle extracts. No structured result/snippet/source/citation body appeared on the web-search items. The generated installed schema independently confirms:

- `WebSearchThreadItem`: id, query, action;
- `WebSearchCallResponseItem`: id, status, action.

Codex can and must have search data internally, but the App Server client observes only action/lifecycle metadata and the later assistant answer. Encrypted/provider-internal data is outside the observable contract. AutoByteus’s current normalized `tool_result` for search is derived completion metadata, not a raw search-engine response.

### Actual local extraction

The captured frames were passed through current repository source:

- `CodexItemEventPayloadParser.resolveWebSearchArguments(...)` returned `{}` for placeholder starts and complete arguments at terminal;
- `CodexThreadEventConverter` emitted `TOOL_EXECUTION_STARTED(arguments:{})` and terminal success with arguments/result metadata.

There is no query extraction defect. The design correction is semantic presence: the Codex converter should omit `arguments` for a non-authoritative placeholder start so the generic accumulator can defer persistence. It must still emit explicit `{}` for a truly known no-argument tool.

### Historical classification

The original 1,376 differing `search_web` pairs all had the same empty-call/enriched-terminal and start/success source-event class. A later mutable-corpus scan found 1,375: 603 search, 629 open page, and 143 find in page. The one-record delta reflects corpus mutation, not a different class.

See `codex-search-web-lifecycle-probe.md` for payload excerpts, commands, hashes, schema evidence, and inference limits.

## Full Corpus Findings

Read-only scan root: `$HOME/.autobyteus/server-data/memory`.

| Metric | Observation |
| --- | ---: |
| Approximate raw bytes | 2,718,106,174 (~2.72 GB) |
| Primary raw files / broader matching files | 2,413 / 2,415 |
| Run roots | 1,955 |
| Parse errors | 0 |
| Tool calls | 161,857 |
| Logical results | 161,644 |
| Results with matching compound-identity call | 161,644 |
| Results with tool name | 161,644; all matched call name |
| Results with arguments | 161,512 |
| Exact argument duplicates | 160,135 |
| Differing argument records | 1,377 |
| Exact duplicated argument bytes | 243,442,533 (~8.9609%) |
| Initial cross-file pairs | 228 |

Largest exact duplicate contributors:

| Tool | Records | Approximate duplicate bytes |
| --- | ---: | ---: |
| `run_bash` | 134,942 | 198,034,096 |
| `edit_file` | 9,863 | 19,284,637 |
| `send_message_to` | 4,342 | 17,996,274 |
| `run_script` | 4,679 | 3,442,017 |
| `write_file` | 365 | 3,026,888 |

No real command, patch, secret, or private message content was copied into ticket artifacts.

## Design Health Assessment Evidence

- Change posture: Behavior change / cleanup / refactor.
- Root cause classification: Boundary Or Ownership Issue plus Shared Structure Looseness.
- Refactor posture: Required now, but smaller and more semantically aligned than the superseded terminal-only refactor.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Native lifecycle | Complete model-issued call exists before execution. | Preserve early persistence; contract only the result shape. | Design |
| Claude coordinator | Complete input exists at start. | Same early-call/minimal-result mechanics fit. | Design |
| Codex probe | Hosted web-search start is non-authoritative; terminal has action. | Provider adapter expresses absence; accumulator defers only that call. | Design |
| Codex result/schema audit | No client-visible raw search body. | Do not treat hosted search like client-executed RPC output or use it to drive local semantic compaction. | Document |
| Loose server DTO / raw result builder | Result accepts call fields. | Strict call/result variants make duplication structurally impossible. | Design |
| Provider rotation | Calls/results can cross files. | Separate complete-corpus context from active pruning scope. | Design |
| Existing logical builders | Multiple local merge policies and call-ID-only keys. | Add neutral physical lifecycle index; centralize read-effective overlay. | Design |
| Crash/reconstruction | Recorder state is ephemeral, but early calls are durable. | Hydrate call-written/result-written state from complete corpus; never use read overlay for writes. | Design |
| Historical permissive reads | Supersets already parse. | Direct use; no migration/version branch. | No migration |

## Relevant Files / Components

| Path / Component | Bootstrap Responsibility | Finding | Revised Target Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models/raw-trace-item.ts` | Shared raw envelope | Omits null outcomes and permits call metadata on any trace. | Preserve permissive reads; serialize both outcome keys for result type; strict builders govern current writes. |
| `autobyteus-ts/src/memory/raw-trace-ingestion.ts` | Native call/result construction | Call path is correct; result repeats name/args. | Keep call builder; replace result input with identity+outcome only. |
| `autobyteus-ts/src/memory/memory-manager.ts` | Native persistence/Working Context owner | Scans active results for dedupe. | Validate compound identity, use complete lifecycle index, keep early call and minimal result sequencing. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Native LLM/compaction scheduling | Defers compaction execution when tool invocations exist. | Preserve; add coverage, not a new owner. |
| Working Context unit builder/planner | Protocol grouping | Protects trailing tool batch until all results. | Make invariant explicit and test two-call case. |
| `autobyteus-ts/src/memory/tool-interaction-builder.ts` | Core logical projection | Call-ID-only; incomplete historical overlay. | Consume compound physical lifecycle groups and own read-effective precedence. |
| Core safety/recovery/compaction files | Feature projections | Active-only facts and result-side tool names. | Consume lifecycle/interaction context while keeping active ID authority. |
| Codex item converter/parser | Provider normalization | Emits placeholder `{}` as if authoritative. | Omit arguments on placeholder start; terminal remains explicit. |
| Claude coordinator/converter | Provider normalization | Emits observed input early. | No lifecycle redesign; regression coverage only. |
| `runtime-memory-event-accumulator.ts` | Shared server lifecycle owner | Loose call-ID state, anonymous fallback, duplicate result metadata, no interruption. | Compound state; defer absent args; minimal result; no fabricated ID; interruption policy. |
| `memory-recording-models.ts` | Server write DTOs | One all-optional trace shape. | Discriminated call/result/non-tool variants; result cannot carry name/args. |
| `run-memory-writer.ts` | Thin store/snapshot facade | Generic append and no lifecycle query. | Strict append mapping; expose neutral complete-corpus lifecycle index; no provider/lifecycle policy. |
| `agent-run-memory-recorder.ts` | Serialized event/composition owner | Fresh accumulator loses state. | Construct with physical lifecycle groups through writer facade. |
| `RunMemoryFileStore` | Physical active/archive authority | Already supplies active and complete deduped corpus. | Reuse; no duplicate archive scanner. |
| server normalizer/replay/work trace | Read/projection owners | Server-local call/result merge. | Preserve property absence; use shared compound logical projection. |
| Memory Sync/migration code | Data transition infrastructure | No need. | Unchanged. |

## Reproduction / Environment Setup

- Required services/mocks: installed Codex App Server and existing local raw-trace corpus only.
- Probe config: isolated temporary cwd, ephemeral thread, `approvalPolicy:"never"`, experimental raw events, no mutating tool request.
- Source execution: parser/converter probe imported repository source through installed `vite-node`.
- Full raw captures: `/tmp/codex-web-search-lifecycle-multiaction-raw.jsonl` (214 frames) and `/tmp/codex-web-search-lifecycle-grace-raw.jsonl` (39 frames). They are not ticket attachments because they include unrelated provider/developer frames and encrypted reasoning.
- Selected evidence and hashes: recorded in `codex-search-web-lifecycle-probe.md`.
- Corpus access: read-only.

## Persisted Data Transition Evidence

- Current stored subject/location/volume: unversioned JSON objects in active and complete archive JSONL; approximately 2.72 GB inspected.
- Relevant change: future `tool_result` rows stop carrying name/arguments; calls remain separate and authoritative for invocation metadata.
- Normal readers/writers: `RawTraceItem.fromDict`, server normalizer, complete-corpus store, logical interaction builder, replay/work-trace projections.
- Representative direct-read evidence: every scanned result parsed; every logical result matched a compound-identity call. Extra result metadata is tolerated.
- Required semantics preserved by direct use: historical result-side arguments remain available to the read projection; new minimal results obtain context from calls.
- Physical/privacy/disposal constraints: no privacy deletion or canonical-byte requirement exists. Historical evidence should not be rewritten for cleanliness.
- Migration cost without correctness benefit: multi-gigabyte I/O, interruption/corruption/recovery/manifests/import coordination.
- Decision: `Directly Usable — No Migration`.

## No-Migration Decision Rationale

1. Historical data is a readable superset of the contracted new result shape.
2. The normal reader can group by ordinary trace type and compound identity without a schema version.
3. Historical terminal-side arguments remain semantically useful and are preserved in read-only overlay logic.
4. New writers can stop duplication independently.
5. Rewriting existing bytes adds operational risk without correctness benefit.
6. The user explicitly reconfirmed no migration.

No migration registration, startup gate, backup/quarantine workflow, raw-file rewrite, Memory Sync change, or dual-schema business path is added.

## Constraints / Dependencies / Compatibility Facts

- `tool_result` remains terminal by trace type even when its outcome values are null.
- New results physically include both outcome keys; generic non-tool traces do not.
- Provider converters decide argument presence. The accumulator consumes normalized fields and must not reparse provider envelopes or branch on `search_web`.
- Working Context remains a separate call/result protocol projection and may require tool name on its result payload even when raw result omits it.
- Correlation identity is `(turn_id, tool_call_id)`.
- Writer-safe reconstruction uses physical call/result presence only. It must never consume historical terminal-side effective arguments.
- Read-effective historical overlay remains inside the logical interaction owner.
- Active compaction eligibility/pruning is derived only from active records. A complete-corpus call-context index may enrich names/arguments/digests but contributes no archive IDs to the active removal set.
- Existing historical result rows remain terminal and readable whether or not they physically contain null outcome keys.

## Open Unknowns / Risks

- Product/requirements unknowns: None.
- Implementation risk: provider argument absence can be lost if a converter or extractor defaults missing to `{}`.
- Implementation risk: terminal handling after recorder reconstruction must correlate with a persisted archived call without importing historical result overlays.
- Implementation risk: a raw write followed by a Working Context snapshot write is not a cross-file transaction; existing protocol safety must repair the uncommon crash gap.
- Implementation risk: adapting the paused terminal-only implementation requires deleting combined-call semantics and effective-state callbacks rather than layering another branch over them.
- Accepted residual risk: deferred hosted calls may disappear on hard loss; early calls may remain outcome-unknown. Neither is safe to retry automatically.
- Accepted historical condition: old result rows retain duplicate storage and may supply late/effective read metadata.

## Notes For Architecture Reviewer

- Round-4 `Pass` is superseded by a user-approved requirement reset; implementation authorization was explicitly suspended.
- The revised design restores intuitive split call/result semantics and removes only redundant result metadata.
- Recheck the original design-impact concerns rather than carrying forward terminal-only resolutions:
  - writer reconstruction must use physical call/result state, not historical read-effective overlay;
  - active compaction needs complete-corpus context but active-only eligibility/pruning;
  - accumulator state is compound-keyed and hydrated after detach/reconstruction;
  - missing IDs are rejected (native) or skipped/logged (asynchronous server), never synthesized.
- Codex provider specificity belongs at its converter boundary through argument presence. The shared accumulator must remain provider-agnostic.
- Native and Claude do not need pending argument aggregation or terminal-only writes. Their early call durability is a feature to preserve.
- Historical migration remains unjustified.
