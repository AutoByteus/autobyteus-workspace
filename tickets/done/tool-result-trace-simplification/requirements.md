# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — the provider-authoritative split-record requirement basis was explicitly approved by the user on 2026-07-11. It supersedes the terminal-only one-record basis approved on 2026-07-10.

## Goal / Problem Statement

Stop writing redundant invocation metadata on future raw `tool_result` records while preserving the existing intuitive raw vocabulary and the real lifecycle of each runtime.

Today native AutoByteus, Codex App Server, and Claude Agent SDK normally write an invocation row and a terminal row, but the terminal row repeats `tool_name` and `tool_args`. Large commands and patches are consequently stored twice. A real-corpus scan measured approximately 243.4 MB of exact repeated argument bytes, about 8.96% of the scanned raw data.

The revised target keeps the existing split event meanings:

```json
{
  "trace_type": "tool_call",
  "tool_call_id": "call_123",
  "tool_name": "run_bash",
  "tool_args": { "command": "..." }
}
```

```json
{
  "trace_type": "tool_result",
  "tool_call_id": "call_123",
  "tool_result": "...",
  "tool_error": null
}
```

The normal envelope fields (`id`, `ts`, `turn_id`, `seq`, `content`, and `source_event`) remain unchanged and are omitted from these shortened examples. New result rows contain no `tool_name` or `tool_args`.

Call persistence occurs when a runtime boundary first exposes authoritative invocation arguments, rather than forcing one timing policy on dissimilar providers:

- native AutoByteus persists the model-issued invocation before execution;
- Claude persists the observed `tool_use` input at start;
- Codex persists ordinary calls when their normalized start/approval arguments are available, but defers hosted `webSearch` calls whose start is only an empty-query/`other` placeholder until the terminal notification exposes the real action.

Working Context remains a separate protocol projection. Historical split rows remain unchanged and readable. No persisted name changes, call-update row, combined terminal call, or data migration are required.

## Investigation Findings

- Both production write paths currently duplicate call data:
  - native AutoByteus: `MemoryManager.ingestToolIntents(...)` writes `tool_call`, while `buildToolResultTraces(...)` repeats name and arguments on `tool_result`;
  - server runtimes: `RuntimeMemoryEventAccumulator` writes a call at approval/start and repeats its accumulated name and arguments on the terminal result.
- A read-only scan of `$HOME/.autobyteus/server-data/memory` found approximately 2.72 GB across 2,415 broadly matching raw-trace files and 1,955 run roots. Of 161,512 result records with arguments, 160,135 exactly repeated the matching call. Exact repeated argument bytes were approximately 243,442,533.
- The original scan found 1,377 non-identical argument pairs:
  - 1,376 Codex `search_web` calls had `{}` at start and query/action metadata at completion;
  - one native `edit_image` result reflected prepared execution arguments rather than the model-issued call arguments.
- Direct Codex App Server probing captured every client-visible JSON-RPC frame for representative search/open-page/find-in-page activity. `item/started(webSearch)` carried `query:""` and `action:{type:"other"}`; `item/completed` carried the real action. The installed protocol schema exposes no raw search-result body on the web-search item. Codex consumes hosted search results internally and returns only lifecycle/action metadata plus the later assistant response to the App Server client.
- A follow-up probe retained capture for three seconds after `turn/completed`; it observed no late result event. The conclusion is limited to client-visible Codex App Server 0.144.0 behavior and does not claim visibility into provider-internal or encrypted data.
- Running the captured frames through the actual repository parser/converter proved that the current start extraction is faithful: the upstream start has no real query to extract. The boundary should represent those arguments as unavailable, not persist `{}` as an authoritative call.
- Native AutoByteus already receives the model-issued name and arguments before it can run a tool. Native preparation may transform execution inputs, but the user selected model-issued arguments as the meaning of raw `tool_call.tool_args`; transformed execution data must not be smuggled into the result row.
- Claude’s coordinator observes and retains complete `tool_use` input before emitting `TOOL_EXECUTION_STARTED`.
- Native model-context compaction is local and already defers execution when tool invocations are outstanding; its Working Context planner protects the trailing tool-protocol group until every expected result is present. Codex semantic context compaction is provider-owned. Local raw rotation remains an evidence-storage concern, not Codex model-context control.
- Provider raw rotation and historical archives can place a call and its result in different physical files. A result without repeated arguments therefore requires complete-corpus call context for reads, while active records alone must continue to control active compaction eligibility and pruning.
- Current readers tolerate JSON supersets. Historical result-side name/arguments remain useful only as compatibility evidence for genuinely late/effective historical pairs. Existing files need no transformation.

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| `tickets/done/tool-result-trace-simplification/tool-trace-contract.md` | Exact new-write, provider-readiness, crash, compaction, and historical-read contract | REQ-001–REQ-012 | AC-001–AC-013 | Revised for the 2026-07-11 user-approved direction | Clarifies but does not replace requirements or design |
| `tickets/done/tool-result-trace-simplification/codex-search-web-lifecycle-probe.md` | Direct provider/parser/schema evidence | REQ-004, REQ-006, REQ-010 | AC-003, AC-010, AC-011 | Complete evidence; provider-late and no-client-result conclusions accepted by user | Evidence supplement for requirements, investigation, and design |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup / Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now, bounded to strict call/result construction, provider argument-readiness normalization, lifecycle correlation, and affected read/compaction projections
- Evidence basis: The result DTO and raw envelope allow call metadata on terminal rows even though correlation identity already exists. The superseded terminal-only design then forced a Codex hosted-tool limitation onto native and Claude lifecycles, weakened native crash evidence, and broadened the meaning of `tool_call` unnecessarily.
- Requirement or scope impact: Preserve call/result subjects; make current result writers structurally unable to include name/arguments; let provider boundaries express whether arguments are available; keep lifecycle/read correlation compound-keyed and archive-aware.

## Recommendations

- Keep one semantic contract across runtimes: invocation metadata belongs to `tool_call`; terminal outcome belongs to `tool_result`.
- Permit different persistence timing only where the provider’s authoritative boundary genuinely differs. Uniform semantics do not require fabricated uniform mechanics.
- Persist native model-issued calls before preprocessing/execution and persist Claude calls when `tool_use` input is observed.
- At the Codex converter boundary, represent the placeholder web-search start as arguments unavailable. Let the shared accumulator defer that call and append it from terminal action data immediately before its minimal result.
- Use strict discriminated write inputs so a new result cannot carry `tool_name` or `tool_args` accidentally.
- Treat `(turn_id, tool_call_id)` as identity everywhere. Hydrate physical call/result lifecycle state from the complete corpus after recorder reconstruction without importing historical result-side argument overlays into current writes.
- Keep unresolved native tool batches as compaction barriers. Keep provider semantic compaction provider-owned; use complete-corpus correlation only to enrich active/raw read projections when physical rotation split a pair.
- Extend the existing logical interaction capability so all evidence renderers produce one activity for a split pair, including unchanged historical late-argument pairs.
- Leave historical files untouched and use the normal permissive reader. Add no migration or schema-version machinery.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- Native AutoByteus writes the model-issued call before execution and writes a minimal success, failure, denial, or controlled-interruption result later.
- Claude Agent SDK writes its complete observed call at start and a minimal terminal result later.
- Codex App Server writes calls at the first normalized event with authoritative arguments; hosted `webSearch` defers its call until terminal action data is visible.
- A result arriving after recorder reconstruction can correlate with a previously persisted call in active or archived raw storage without copying call metadata into the new result.
- Duplicate lifecycle events do not create duplicate calls or results.
- Working Context preserves provider-protocol call/result messages independently of the raw shape.
- Native compaction never summarizes or removes the middle of an unresolved multi-call protocol group.
- Run history, work-trace evidence, recovery, safety, recent-turn formatting, and applicable compaction paths resolve new minimal results and unchanged historical supersets into one logical interaction.
- Historical active, rotated, archived, and imported raw traces remain directly usable without transformation.

## Out of Scope

- Renaming `tool_call`, `tool_result`, `tool_call_id`, `tool_name`, `tool_args`, `tool_result`, or `tool_error`.
- Adding `tool_call_update`, `tool_activity`, `outcome`, `status`, schema-version, start/completion timestamp, or another persisted tool field/type.
- Combining future call and result into one terminal `tool_call`.
- Forcing all runtimes to delay calls until terminal completion.
- Persisting native prepared/effective arguments as though they were model-issued call arguments.
- Inspecting, deduplicating, or redefining the opaque value inside `tool_result`; provider-specific result payload semantics remain unchanged even if a provider’s normalized status object repeats small action metadata internally.
- Changing Codex or Claude provider-owned semantic context compaction.
- Automatically retrying an invocation after crash/reconstruction.
- Rewriting, deleting, or migrating historical raw-trace files, including reclaiming their approximately 243.4 MB of already-written duplicate argument bytes.
- Adding a Memory Sync protocol change, migration registry entry, startup gate, or version-specific reader branch.

## Functional Requirements

- `REQ-001`: Every new persisted invocation must use `trace_type:"tool_call"` with non-empty `tool_call_id` and `tool_name` plus an explicit `tool_args` object. Every normally observed terminal outcome must use a separate `trace_type:"tool_result"` correlated by the same `(turn_id, tool_call_id)`.
- `REQ-002`: A new raw `tool_result` must contain `tool_call_id`, `tool_result`, and `tool_error` as its only tool-specific fields. It must not serialize `tool_name` or `tool_args`. Both outcome keys must be physically present, including explicit `null`.
- `REQ-003`: Native AutoByteus `tool_args` must mean the arguments issued by the model. The call must be persisted before preprocessing, preparation, approval/execution, or result handling; later execution transformations must not rewrite the call or appear as result-side arguments.
- `REQ-004`: Server runtime call persistence must occur at the first normalized approval/start/terminal event that supplies a valid identity, non-empty name, and explicit authoritative argument object. Missing arguments mean “not yet available”; an explicit `{}` remains a valid no-argument invocation.
- `REQ-005`: Claude’s observed `tool_use` input and Codex calls with complete start/approval arguments must persist at that early boundary. Their terminal rows must be minimal results.
- `REQ-006`: Codex hosted `webSearch` placeholder starts must not persist an empty-argument call. When terminal query/action data arrives, the accumulator must append the completed call metadata first and then append the minimal terminal result, preserving source order without introducing a new trace type.
- `REQ-007`: Success, failure, denial, and controlled interruption must preserve existing result/error payload semantics. Controlled interruption writes `tool_result:null` and a non-empty error/reason when a persisted call is available; malformed or insufficient asynchronous events must be skipped/logged rather than assigned a fabricated identity or argument object.
- `REQ-008`: Logical identity and duplicate suppression must use `(turn_id, tool_call_id)`. Physical lifecycle state must distinguish call-written from result-written and must hydrate from the complete active-plus-archive corpus after reconstruction.
- `REQ-009`: After abrupt process loss, an early persisted call may remain unmatched and must not be retried automatically or treated as success. Working Context recovery may fence it as interrupted/unknown. A provider-deferred call that never reached authoritative arguments may leave no raw tool record.
- `REQ-010`: Native Working Context compaction must treat the assistant call batch plus every matching result as one protected protocol group and defer compaction execution across an unresolved batch. Provider-owned Codex compaction remains external; local active raw eligibility/pruning must stay active-only even when complete-corpus call context is used for projection.
- `REQ-011`: Readers must produce exactly one logical interaction from a call/result pair. New minimal results obtain name/arguments from their call. Historical result-side name/arguments may override historical call-side values only in the read projection when they contain the only late/effective evidence; writer decisions must never consume that overlay.
- `REQ-012`: Existing persisted data must remain unchanged and readable through normal version-agnostic readers. No migration, schema discriminator, compatibility writer, or historical rewrite may be added.

## Acceptance Criteria

- `AC-001`: In native AutoByteus, a model-issued `run_bash` or `edit_file` call is durably present before execution. Its later raw result contains the ID and outcome keys but no name or arguments, including when command/patch text is large.
- `AC-002`: A Claude `tool_use` start with complete input writes one call; success/failure/denial writes one minimal result; repeated terminal input is not copied into raw result metadata.
- `AC-003`: A direct Codex `search_web` lifecycle writes no placeholder `{}` call at start. At terminal it writes one call containing the real search/open-page/find-in-page action followed by one minimal result; the probe continues to demonstrate that no separate client-visible search-result body was omitted.
- `AC-004`: Serialized new result rows have `tool_result` and `tool_error` physically present and have no `tool_name` or `tool_args`. Generic non-tool records do not gain these null fields.
- `AC-005`: A successful tool whose runtime result is `null` writes `"tool_result":null` and `"tool_error":null`; readers classify the pair as successful because the result row is terminal.
- `AC-006`: Failure, denial, and controlled interruption each write one minimal result with the existing error/outcome meaning. Duplicate individual-plus-batch or replayed terminal events do not write another result.
- `AC-007`: For two calls emitted in one native assistant response, compaction may be requested but does not execute across the group after only one result; it becomes eligible only after both calls have terminal protocol results or controlled interruption repair.
- `AC-008`: A crash after an early native/Claude/Codex call but before result leaves that call visible and unmatched without automatic retry. A crash before terminal availability for deferred Codex web search may leave no raw tool row. Recovery never invents success.
- `AC-009`: Equal call IDs in different turns remain distinct. Reconstructing the server accumulator from a corpus with an archived call and active/no result allows one later minimal result and suppresses a repeated result.
- `AC-010`: When provider raw rotation splits a pair, run history/work-trace/recovery and any result digest obtain call context from the complete corpus, while active compaction eligibility and pruning contain only active raw IDs.
- `AC-011`: Historical exact-duplicate and late/effective-argument fixtures still project one interaction. Historical Codex `{}` call plus enriched result retains the terminal query in the read projection, while new writer tests prove result-side args are impossible.
- `AC-012`: No historical raw file is rewritten, no migration is registered or run, and no Memory Sync/schema-version branch is added.
- `AC-013`: Focused and broader executable coverage passes across `autobyteus-ts` and `autobyteus-server-ts`, including strict serialization, native/Claude/ordinary-Codex/deferred-web-search paths, null success, failure/denial/interruption, crash/reconstruction, cross-file correlation, compaction barriers, historical supersets, and one-activity rendering.

## Constraints / Dependencies

- Raw traces are append-oriented JSONL with active and complete rotated segments; in-place call mutation is not the normal persistence contract.
- `RawTraceItem` and `RunMemoryFileStore` are shared physical mechanisms used by native and server paths.
- Native AutoByteus uses `MemoryManager`; Codex and Claude share `AgentRunMemoryRecorder -> RuntimeMemoryEventAccumulator -> RunMemoryWriter`.
- Provider converters/coordinators are authoritative for deciding whether normalized arguments exist. The accumulator must not parse provider-native payloads or contain a tool-name-specific Codex branch.
- Working Context is a separate protocol projection with assistant tool-call and tool-result messages. It may retain additional name information required by the model protocol even though raw result rows do not.
- Historical result rows may contain duplicated name/arguments, late/effective arguments, sparse outcome keys, and cross-file pairs. They remain supported as normal readable supersets.
- The implementation worktree currently contains paused source/test modifications for the superseded terminal-only design. They are provenance to preserve, not evidence that the revised design is implemented.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: `raw_traces_active.jsonl` and complete `raw_traces_<index>.jsonl` files under local agent/team/import memory roots.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all existing files and bytes. Transform, discard, rebuild, and quarantine nothing.
- New data outcome: Future calls retain the existing call row; future results omit redundant call metadata and contain only identity plus outcome fields.
- Unacceptable data loss or corruption: Dropping model-issued native/Claude call arguments, persisting Codex placeholder arguments as authoritative, orphaning a result when a complete call could be written, confusing call IDs across turns, losing historical late arguments in reads, or letting archive-only IDs influence active pruning.
- Relevant availability, maintenance-window, or rollout constraints: None. Upgraded writers independently begin the contracted shape; older/imported supersets remain readable.
- Related requirement and acceptance-criteria IDs: REQ-001–REQ-012; AC-001–AC-013.

## Assumptions

- `origin/personal` is the intended integration base and `personal` the finalization target.
- Native and Claude start boundaries continue to expose explicit argument objects before execution in their normal paths.
- Codex converter code can distinguish unknown hosted-web-search start arguments by property absence while preserving `{}` as a valid explicit no-argument call.
- Existing provider-specific `tool_result` values remain opaque and unchanged by this task.
- Historical extra fields remain harmless because readers are permissive and semantic projections select the values they need.

## Risks / Open Questions

- No product requirement remains open after the user’s 2026-07-11 confirmation.
- Implementation risk: collapsing missing arguments to `{}` at the normalized event boundary would recreate the Codex placeholder defect. Presence must remain explicit.
- Implementation risk: provider rotation can split new call/result pairs, so active-only grouping without complete-corpus context would render minimal results incompletely.
- Implementation risk: a generic all-optional server write DTO could silently reintroduce result-side name/arguments; discriminated variants are mandatory.
- Implementation risk: source changes already present in the worktree implement the superseded terminal-only design and require deliberate rollback/adaptation only after the revised design passes review.
- Accepted residual risk: a deferred hosted-provider call may leave no raw row after hard loss; an early persisted call can remain permanently outcome-unknown. Neither may be automatically retried.
- Accepted historical condition: existing duplicate bytes and result-side metadata remain indefinitely unless a separate maintenance task is approved.

## Requirement-To-Use-Case Coverage

- Native early call/minimal result: REQ-001–REQ-003, REQ-007–REQ-010, REQ-012.
- Claude early call/minimal result: REQ-001, REQ-002, REQ-004, REQ-005, REQ-007–REQ-010, REQ-012.
- Codex ordinary/deferred calls: REQ-001, REQ-002, REQ-004–REQ-010, REQ-012.
- Logical reads/replay/recovery/compaction: REQ-008–REQ-012.
- Historical data and rollout: REQ-011, REQ-012.

## Acceptance-Criteria-To-Scenario Intent

- AC-001–AC-003 cover provider-authoritative call timing and minimal results across all runtime families.
- AC-004–AC-006 cover strict serialization and terminal outcome semantics.
- AC-007–AC-010 cover compaction, crash, reconstruction, identity, and cross-file behavior.
- AC-011 covers current and historical logical projection plus the direct Codex regression.
- AC-012 locks the no-migration/no-version-branch decision.
- AC-013 delegates final durable coverage selection and broader execution to the downstream API/E2E stage.

## Approval Status

Approved. On 2026-07-11 the user explicitly concluded that native AutoByteus already possesses model-issued arguments before execution and therefore must not duplicate them on `tool_result`. The user also confirmed that Codex hosted web search is a provider-specific observation/compaction case and that different runtime mechanics are appropriate when they preserve one semantic contract. This approval supersedes the prior terminal-only, one-completed-call decision. The earlier rejection of new persisted names, `tool_call_update`, and historical migration remains in force.
