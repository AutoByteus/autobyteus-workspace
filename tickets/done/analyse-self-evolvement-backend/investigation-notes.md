# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Source investigation complete; user-facing analysis prepared
- Investigation Goal: Analyze backend self-evolvement/self-improvement design and implementation.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Cross-cutting backend capability likely spans routes/services/runtime/ticket artifacts but no code change is requested.
- Scope Summary: Trace self-evolvement backend trigger, orchestration, persistence, artifacts, and safety boundaries.
- Primary Questions To Resolve:
  - What backend route/API or service triggers self-evolvement?
  - What runtime/agent/team machinery executes it?
  - What files/artifacts are produced or updated?
  - What safeguards and ownership boundaries are in place?

## Request Context
User asked: "could you analyse how self improve works? i meant the self-evolvement from backend are designed and implemented"

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend
- Current Branch: codex/analyse-self-evolvement-backend
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: \ succeeded on 2026-06-17
- Task Branch: codex/analyse-self-evolvement-backend
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None
- Notes For Downstream Agents: Analysis-only request; no downstream handoff planned unless a change request emerges.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-17 | Command | \/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend
/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend
## codex/analyse-self-evolvement-backend...origin/personal
?? tickets/analyse-self-evolvement-backend/
origin	git@github.com-ryan:AutoByteus/autobyteus-workspace.git (fetch)
origin	git@github.com-ryan:AutoByteus/autobyteus-workspace.git (push)
origin/personal | Bootstrap repository context | Repository root is /Users/normy/autobyteus_org/autobyteus-workspace-superrepo; current branch personal; remote default origin/personal | No |
| 2026-06-17 | Command | \ | Refresh tracked remote before dedicated worktree | Succeeded | No |
| 2026-06-17 | Command | \ | Create dedicated analysis worktree from latest base | Succeeded | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: GraphQL `SelfEvolutionResolver` capability/eligibility/start queries and mutations; frontend composer CTA calls the start mutations.
- Current execution flow: Capability gate -> run/member metadata snapshot -> live target check -> skill target resolver -> evidence builder -> visible single-agent evolver run -> optional grant-scoped `send_message_to` outcome -> persisted record.
- Ownership or boundary observations: `SelfEvolutionService` is the authoritative orchestration owner; GraphQL is a thin API boundary; run/team launch services own snapshot creation; agent communication owns exact-run final message delivery.
- Current behavior summary: Manual-only skill self-evolution is implemented, disabled by default, and scoped to writable configured skill roots.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Analysis
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found for analysis-only request.
- Refactor posture evidence summary: No refactor needed for current analysis; implementation already has a dedicated subsystem and clear service boundary.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | Dedicated orchestration owner validates gate/snapshot/live target, resolves context/skills/evidence, launches helper, and records result. | Boundary is explicit and coherent for MVP. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/**` | Manual skill self-evolution subsystem | Owns capability, config, eligibility, target resolution, evidence, helper launch, records. | Proper primary subsystem boundary. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for source-level analysis so far.
- Required config, feature flags, env vars, or accounts: Pending.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs
See `backend-self-evolution-analysis.md` for the synthesized analysis. Key finding: self-evolution is manual-only and skill-first. It launches a visible helper agent to improve configured writable skill packages from anonymized run evidence; it does not train models or modify definitions/source code. `SelfEvolutionRunStore` persists minimal provenance and direct-message outcome under `memory/self_evolution`.

## Constraints / Dependencies / Compatibility Facts
- Global feature gate defaults disabled.
- `manual_only` + `single_agent` are the only executable strategies.
- `scheduled`, `signal_based`, and `agent_team` are catalog placeholders.
- Current configured skill roots are resolved at evolution time; exact historical skill binding snapshots are deferred.
- Direct edits are not service-audited in MVP; Git/manual inspection is expected for rollback.
- Active runtime skill reload is not implemented; next-run correctness is the baseline.

## Open Unknowns / Risks
- Service-side diff/policy audit is not implemented.
- Exact historical skill root snapshots are deferred.
- Team-member active reload/notification is next-run-only.
- No runtime verification was executed for this analysis turn; conclusions are source/doc/test-artifact based.

## Notes For Architect Reviewer
No architecture handoff planned unless the user asks for implementation changes.

## Raw trace field application usage check — 2026-06-19

Clarification: this check classifies whether raw trace fields are useful to the application overall, not only to self-evolution evidence building.

### `source_event`

Observed application uses:
- Stored/read by `RawTraceItem` as `source_event` in JSONL (`autobyteus-ts/src/memory/models/raw-trace-item.ts`).
- Propagated by server memory read APIs as `MemoryTraceEvent.sourceEvent` and GraphQL `sourceEvent` (`autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`, `autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts`).
- Runtime memory accumulation uses it to record the event surface that produced user/assistant/reasoning/tool traces (`runtime-memory-event-accumulator.ts`).
- `MemoryManager.getOperationBoundaryNoteContent()` uses `sourceEvent === 'AgentTurnInterruptedEvent'` together with the operation-boundary trace type to recover interruption boundary notes (`autobyteus-ts/src/memory/memory-manager.ts`).
- Archive segment manifest stores boundary `source_event` as segment metadata (`raw-trace-archive-manager.ts`, `raw-trace-archive-manifest.ts`).

Classification: not dead. Useful as provenance/debug/API metadata, plus one concrete behavior path for interrupted-turn operation boundaries. It is not central to normal replay projection in the same way as `trace_type`, `turn_id`, `seq`, `content`, or `tool_call_id`.

### `correlation_id`

Observed application uses:
- Stored/read by `RawTraceItem` as optional `correlation_id` in JSONL.
- Provider compaction boundary recorder writes `correlationId = boundary.boundary_key`.
- `RunMemoryFileStore.findActiveRawTraceByCorrelationId()` searches active raw trace records by correlation id and optional trace type.
- `RunMemoryWriter.getProviderCompactionBoundaryState()` uses that lookup to identify existing active provider-compaction boundary markers and avoid duplicate/incorrect boundary handling.
- `memory-manager-tool-protocol-safety.ts` uses synthetic recovery correlation ids to prevent duplicate tool-protocol recovery markers for the same tool call.

Classification: not dead. Useful internal idempotency/correlation field. It is not user-facing and is not part of normal memory view projection, but removing it without replacement would break/re-risk provider compaction boundary idempotency and synthetic recovery deduplication.

### Field design conclusion

The current raw trace schema mixes three categories:
1. Core replay/projection fields: `id`, `ts`, `turn_id`, `seq`, `trace_type`, `content`, `media`, `tool_name`, `tool_call_id`, `tool_args`, `tool_result`, `tool_error`.
2. Operational metadata: `source_event`, `correlation_id`.
3. Type-specific payloads encoded loosely through generic fields, especially provider-compaction boundary data in `tool_result` plus `correlation_id`.

Recommendation: keep `source_event` and `correlation_id` for now. If redesigning the schema, make them explicit optional metadata fields and add typed payloads for special trace types rather than deleting them.

## Self-evolution evidence strategy refinement — transformed corpus, not raw trace direct-read

User clarified that direct raw-trace reading by the self-evolver is undesirable for two separate reasons:
1. Raw trace rows contain many internal application fields and noisy implementation details that are not useful to the improvement task.
2. Each rotated raw trace segment exists because compaction/context pressure happened; therefore a full raw segment can itself be too large for one self-evolver context window, and the complete run corpus is much larger.

Design implication: the backend should build a transformed self-evolution evidence corpus from the complete raw trace corpus. The helper agent should not read backend raw trace files directly and should not receive all transformed content in one user message. Instead, it should receive an evidence manifest/index plus compact high-level summaries, then read bounded transformed evidence files as needed.

Recommended layered artifacts:
- Segment-level transformed evidence files: one per raw trace segment/active segment, stripped of internal metadata and rewritten into self-evolver-readable chronology.
- Segment summaries: bounded summaries of each segment/chapter.
- Run-level synthesis: cross-segment progression, repeated failure modes, user feedback, tool/code-edit patterns, unresolved risks.
- Detail slices: optional smaller turn/range files for deep inspection when the coach needs examples.
- Coach continuity notes: previous self-improvement attempts, decisions, outcomes, and remaining hypotheses.

This preserves full-run visibility without exposing raw internal schema or overloading a single prompt/context.

## Companion self-evolver trigger model refinement — 2026-06-22

User clarified the preferred direction: self-improve / self-evolve should be treated as a companion subsystem rather than a one-time isolated worker. If the companion self-evolver agent or agent team is live, each user click of the Self Improve / Self Evolve button should deliver a new request message to that live companion, rather than creating a completely memoryless one-shot worker for every click.

Refined model:
- The target agent continues to produce raw trace history during its work.
- The backend maintains or refreshes transformed self-evolution evidence files derived from the complete raw trace corpus.
- On each user-triggered self-improve click, the backend sends a small trigger message to the live self-evolver companion agent/team.
- The trigger message should identify the target, request instance, evidence root/manifest path, allowed edit scope, and relevant state paths.
- The trigger message should not inline the whole transformed evidence content.
- The companion agent/team should use its file-reading ability to inspect the transformed evidence files as needed.

Important design distinction:
- Raw trace files remain backend-internal application records.
- Transformed evidence files are the readable contract between backend trace history and the self-evolver.
- The self-evolver consumes evidence paths, not raw JSONL and not a huge prompt payload.

System prompt guidance:
- Keep the self-evolver system prompt stable and simple: define role, boundaries, allowed actions, and expectation to inspect provided evidence paths.
- Dynamic run/request data belongs in each click-triggered message, not in the system prompt.

Agent-team variant:
- If self-evolution becomes an agent team, the backend should send the click-trigger message to the team root/coordinator rather than directly messaging every team member. The team owns its internal investigation/edit/review coordination.

Current design direction captured from discussion:
```
User clicks Self Improve
  -> backend refreshes transformed evidence from complete raw trace corpus
  -> backend sends small trigger message to live companion self-evolver/team
  -> self-evolver reads evidence manifest/files as needed
  -> self-evolver produces or applies improvement within allowed scope
  -> self-evolution history/state is persisted for future clicks
```

Lifecycle decision after later discussion:
- Prefer live companion/evolver reuse. If the recorded evolver run/team is inactive, resume it when supported; otherwise create a replacement evolver run/team with continuity using `evolver_session.json`, prior evolver ids, and the current work trace manifest path. This recovery is still triggered by a user Self Improve click, not autonomously.

## Incremental companion reading model — 2026-06-22

User refined the live companion model: on the first self-improve click, the self-evolver companion may need to inspect all transformed work history available so far. On later clicks, because the companion agent/team is live and has already performed earlier improvement work, it should not need to rediscover the whole history. It should be able to focus on the newly added work traces since the previous self-improve request, while still retaining access to the older transformed history if needed.

Naming discussion:
- User suggested `work traces` or `work progress files` may be more natural than `evidence` because the transformed files represent the target agent's working progress, not just proof material.
- Design terminology can use `self-evolution work traces` or `coach-readable work traces`; `evidence` remains useful as an internal architectural term for decision-support material, but user-facing/product naming should likely avoid making it sound legalistic or over-complex.

Design implication:
- The transformed corpus should have a manifest/checkpoint shape so the backend can tell the live companion what is new on each click.
- The companion should receive a small trigger message containing the transformed work-trace root/manifest and a changed/new file list or since-cursor, not inline transformed content.
- Backend should persist enough self-evolution request state to recover if the live companion restarts or loses context. The agent's own memory is useful but should not be the only source of truth for which work traces were already offered/processed.

Candidate click flow:
```
First Self Improve click
  -> backend transforms complete raw trace corpus into coach-readable work traces snapshot/version N
  -> trigger message says this is the first request and points to the complete manifest
  -> companion reads all relevant work traces and records improvement outcome

Later Self Improve click
  -> backend refreshes transformed work traces snapshot/version N+1
  -> backend computes or records files/ranges added since last processed request/version
  -> trigger message points to manifest plus new/changed work-trace files
  -> companion reads new material first, referring back to older files only if needed
```

Open design detail:
- Active raw trace content is mutable until rotated. Transformed active work trace may need a snapshot file per self-improve request, or the manifest must include content hashes/generation timestamps so the companion reads a stable version.

## Work trace generation strategy option: live conversion — 2026-06-22

User proposed a simpler/flexible option: as raw traces are written, the system also converts them into self-evolution work traces continuously or near-continuously. The self-evolver companion then reads the work trace files and is responsible for reasoning about what it already saw, what is new, and what to improve.

Key user intent:
- The backend should prepare good, readable data.
- The self-evolver agent/team should own its own reasoning and memory/continuity as much as possible.
- Work traces should preserve timestamps and ordering information so the companion can reason over chronological rows itself.
- The live/current raw trace corresponds to a live/current work trace file that is continually updated.
- Rotated raw trace files correspond to numbered work trace files.
- Avoid over-engineering explicit indexes and derived views unless they are necessary.

Potential shape:
```
raw_traces_000001.jsonl  -> work_trace_000001.md
raw_traces_000002.jsonl  -> work_trace_000002.md
raw_traces.jsonl         -> work_trace_active.md   # updated while run continues
```

Work trace row structure should be readable but preserve chronology, likely including:
- timestamp
- sequence/turn reference where useful
- role/event kind in self-evolver-readable terms
- meaningful content/action/outcome

Design tradeoff to evaluate:
- Pros: simple mental model, maximum flexibility for the companion, less backend state machinery, easier to inspect/debug.
- Cons: live active file can change while being read; companion may need robust behavior to avoid missing newly appended rows or re-reading old rows; backend may still need minimal generation/version metadata for recovery and reproducibility.

Current principle emerging:
- System responsibility: produce clean, complete, ordered, readable work trace files from raw traces.
- Companion responsibility: inspect those files, reason over timestamps/order, remember prior improvement work, decide what new material matters, and perform/propose improvements.

## Work trace visible fields simplification — 2026-06-22

User challenged whether raw `turn_id` / `seq` style fields are needed in self-evolution work traces. Current refinement: for the self-evolver companion, backend-oriented turn and sequence identifiers likely add little semantic value. The companion primarily needs readable chronological content and enough timing/order context to reason about what happened and what is new.

Preferred visible work trace shape:
- timestamp/time marker
- speaker/kind in natural terms, e.g. `user`, `assistant`, `tool/action`, `result/error` only when meaningful
- cleaned meaningful content/action/outcome

Avoid visible raw/backend identifiers by default:
- raw `turn_id`
- raw `seq`
- `source_event`
- `correlation_id`
- other internal replay/protocol fields

Design nuance:
- The backend may still keep raw trace ids, turn ids, seq values, offsets, or hashes internally for deterministic conversion, ordering, dedupe, and recovery.
- If the companion needs a cursor, prefer a simple work-trace-native marker such as append order or `entry #123`, not raw backend `turn_id`/`seq` names.
- If timestamps alone are used visibly, the work trace file must preserve append order because timestamps can collide or be too coarse for strict ordering.

Emerging principle:
- Work traces are not a lossless raw trace projection. They are a readable coaching artifact. Internal ordering fields should remain internal unless they directly help the coach reason.

## Current self-evolution readable message format inspection — 2026-06-22

Inspected current implementation:
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-evidence-builder.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-work-history-projector.ts`
- `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts`
- `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts`
- tests in `autobyteus-server-ts/tests/self-evolution/self-evolution-work-history-projector.test.ts`

Current flow:
```
raw traces / run history source
  -> run projection (`conversation`, `activities`, `summary`, `lastActivityAt`)
  -> SelfEvolutionWorkHistoryProjector.render(...)
  -> `anonymizedWorkHistory` string
  -> inlined into the self-evolver user message by `SingleAgentEvolverStrategy.buildTaskMessage`
```

Current rendered format:
```
[WORK_HISTORY_TO_LEARN_FROM]
Worker goal:
- Target worker role: ...
- Work summary: ...
- Configured skill packages available to the worker: ...

Important interaction history:
- User: ...
- Worker: ...
- Tool <name>: ...

Tool and validation outcomes:
- Tool <name> <status>: ...

Feedback and improvement signals:
- ...
```

Current properties:
- It is already quite readable and removes many raw trace internals.
- It redacts paths, tokens/secrets, emails, UUIDs, and run/tool IDs.
- It does not include timestamps in the rendered output, although projection entries already carry optional `ts` fields.
- It is currently a bounded digest, not full history: `MAX_CONVERSATION_ITEMS = 14`, `MAX_ACTIVITY_ITEMS = 12`, `MAX_SIGNAL_ITEMS = 8`, `MAX_TEXT_LENGTH = 700`.
- It separates conversation and tool/activity outcomes into different sections, rather than producing one unified chronological work trace.
- It is inlined into the self-evolver prompt/message, not written as companion-readable work trace files.

Design implication:
- The current `SelfEvolutionWorkHistoryProjector` is a good starting point for the work trace file format.
- For the new model, extract/reuse its cleaning/redaction and readable rendering behavior, but change the output target from one prompt digest to durable work trace files.
- Likely needed changes: include timestamps, remove hard recent-item limits for per-file generation, optionally switch from grouped digest to chronological entries, and write files instead of inlining the whole rendered content into the self-evolver message.

## Work trace format refinement: simple chronological dialogue — 2026-06-22

User refined the desired self-evolution work trace format away from the current grouped digest. Preferred format is a simplified chronological transcript from the agent perspective:
- user message
- worker/assistant response or action
- user message
- worker/assistant response or action

Tool calls/results should not appear as raw separate protocol records. If shown, tool result should be merged back with its originating tool call/action into one readable worker/action entry. The goal is a converted form of what the target agent experienced/did, with unnecessary raw trace fields removed.

Design direction:
- Create a new work-trace file renderer rather than reusing the current grouped self-evolution prompt digest as-is.
- Reuse current cleaning/redaction logic where appropriate.
- Preserve simple chronology and natural roles.
- Hide raw backend fields and protocol mechanics.

Candidate shape:
```
### 2026-06-22 10:42:11 — User
<cleaned user content>

### 2026-06-22 10:42:45 — Worker
<cleaned assistant content>

### 2026-06-22 10:43:02 — Worker action: run_bash
Command/purpose: <cleaned meaningful args or description>
Result: <cleaned concise result or error>
```

Potential simplification:
- If tool/action details are too noisy, include them only when they materially explain the worker's behavior, validation, file edits, or failures.
- Otherwise the main work trace can remain mostly `User` / `Worker` messages.

## Work trace format and access tools refinement — 2026-06-22

User proposed the simplest visible work trace structure:
```
user:
<message>

worker:
<message/action; if worker called tools, include the tool call/result here>

user:
<message>
```

Refinement:
- Use simple `user:` / `worker:` blocks as the primary format.
- Tool calls/results should be nested inside the relevant `worker:` block, not represented as independent raw trace records.
- Add timestamp at the front of each block if needed for chronology/incremental reading, but avoid backend-specific ids.

Candidate visible shape:
```
[2026-06-22 10:42:11] user:
...

[2026-06-22 10:42:45] worker:
...

Tool use:
- run_bash: <cleaned intent/input>
  result: <cleaned concise output/error>
```

User also raised an alternative/complementary idea: provide basic tools for the self-evolver companion to access work traces, instead of relying only on raw filesystem path reading. Design implication: a minimal purpose-built work-trace access surface could let the companion list/read/search work trace files while keeping raw traces hidden and preserving backend control.

Potential minimal tools if this direction is chosen:
- `list_self_evolution_work_traces(target/run/request)`
- `read_self_evolution_work_trace(path or trace_id)`
- optionally `search_self_evolution_work_traces(query)` or `read_new_work_trace_entries(since marker)`

Design caution:
- Do not over-tool initially. If file paths plus existing file-read capability are sufficient, keep that simple. Purpose-built tools become more attractive if we need sandboxing, stable ids, incremental reads, access control, or agent-team compatibility.

## Work trace semantic preservation principle — 2026-06-22

User clarified an important invariant: converted self-evolution work traces should not lose information that matters to the self-evolver. The conversion should remove only information unnecessary for the agent/team to reason, not summarize away the actual work.

Principle:
- Raw traces are complete application/internal records.
- Self-evolution work traces should be complete coaching records.
- The conversion should be semantically lossless for self-evolution, but not raw-structure-lossless.

Keep in work traces when meaningful:
- user messages
- worker/assistant messages
- tool name
- tool arguments/input, because wrong arguments are often the actual failure pattern
- tool result/output summary
- tool error
- retries/corrections/recoveries
- timestamps or lightweight time markers
- file paths, commands, queries, payloads, or API arguments when they explain behavior or mistakes, subject to redaction/privacy rules

Remove/hide by default:
- raw JSON envelopes
- `source_event`
- `correlation_id`
- `tool_call_id`
- `turn_id`
- `seq`
- provider/internal event ids
- backend replay/protocol fields that do not help the coach reason

Updated format direction:
```
[time] user:
<cleaned user message>

[time] worker:
<cleaned worker message>

tool: <tool name>
arguments:
  <cleaned meaningful arguments>
result:
  <cleaned result or error>
```

Key design rule:
- Work traces should remove application-internal noise, not compress away the worker's actual behavior.

## Activated self-evolution subsystem and automatic work-trace updates — 2026-06-23

User refined the future design model: the first Self Improve / Self Evolve click should activate or attach the self-evolution subsystem for the target agent/run. After activation, the subsystem continuously or near-continuously maintains self-evolution work traces from newly written raw traces. Later self-improve clicks send trigger messages to the live companion self-evolver/team, rather than rebuilding a duplicated work-trace corpus from scratch.

Design direction:
```
Before first click
  -> raw traces are written as normal
  -> work traces may not exist yet

First Self Improve click
  -> activate self-evolution subsystem for target
  -> backfill existing raw trace corpus into work traces
  -> start/attach raw-trace-to-work-trace updater
  -> send trigger message to companion with work-trace path/manifest

After activation
  -> new raw traces continue to be written
  -> work-trace updater converts new raw trace entries into friendly work trace blocks
  -> active work trace remains current or near-current

Later Self Improve clicks
  -> ensure work traces are caught up
  -> send another trigger message to same companion/team
  -> companion reads current/new work traces and reasons
```

Preferred update mechanism:
- Do not make the self-evolver read raw traces directly.
- Add a backend-owned raw-trace-to-work-trace updater under the self-evolution subsystem.
- The updater should consume raw trace append/rotation information from the same memory/run-history boundary that owns raw trace persistence, rather than duplicating raw file parsing policy in the companion.
- The updater should keep a small conversion checkpoint/cursor per target so it can append only new converted blocks after backfill.

Possible implementation shapes to evaluate:
1. Event-driven append hook:
   - Raw trace writer emits/forwards an internal append event after a raw trace item is persisted.
   - Self-evolution work-trace updater receives the event only for activated targets.
   - It converts the new item or matched tool-call/tool-result pair and appends to the active work trace.
   - Best for near-live freshness, but requires careful boundary placement so raw memory writer does not depend directly on self-evolution internals.

2. Dirty-marker plus catch-up worker:
   - Raw trace writer or run-history owner marks activated target work traces dirty when new raw traces exist.
   - A self-evolution updater periodically or on next trigger reads from the last checkpoint to current raw trace position and appends converted blocks.
   - Simpler and safer; avoids blocking the target agent on conversion.

3. On-trigger catch-up after activation:
   - After first click/backfill, later clicks call `ensureWorkTracesCurrent(target)` before messaging the companion.
   - New traces are not necessarily converted immediately, but are guaranteed current when the companion is triggered.
   - Simplest reliable stepping stone; may still satisfy product behavior if “automatic” means subsystem-owned after activation, not strictly synchronous per raw trace write.

Current design preference:
- Use dirty-marker / catch-up semantics rather than synchronous conversion on every raw trace append.
- Treat raw trace persistence as authoritative; self-evolution work traces are a derived projection.
- The conversion owner should be idempotent: given a target and checkpoint, it can resume and append missing work trace blocks without duplicating already converted content.

Work trace writing model:
- Backfill converts existing rotated raw trace files and active raw trace into friendly work trace files.
- After activation, the updater appends new entries to the active work trace file.
- When raw traces rotate, the work-trace updater finalizes or mirrors the corresponding active work trace into a numbered work trace and starts/continues a new active file.
- Work trace blocks use simple visible structure: timestamp + `user:` / `worker:`; worker blocks include meaningful tool name, arguments, result/error nested inside the worker block.

Open boundary question:
- The exact integration point should respect the authoritative memory/run-history boundary. Avoid making raw trace writer import self-evolution services directly if that creates a reverse dependency. Prefer an event/dirty notification boundary or a projection/catch-up service owned by self-evolution that reads through existing run-history/memory APIs.

## Formal design-pass investigation refresh — 2026-06-23

### Worktree/base verification
- Command: `git fetch origin personal` then compare/reset task branch.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend`.
- Branch: `codex/analyse-self-evolvement-backend`.
- Latest verified base: `origin/personal = 167584a056b8a81b066e10a435fb81d7e75f7b4b`.
- Branch state after reset: `HEAD = origin/personal`, ahead/behind `0/0`.
- Untracked ticket artifacts remain under `tickets/analyse-self-evolvement-backend/`.

### Required design guidance read
- Re-read `solution-designer/SKILL.md` and `design-principles.md` for the formal design pass.
- Read `references/design-examples.md` completely. Most relevant examples: event-driven agent runtime with thin facade/internal worker loop, team run orchestration, and bad-practice examples covering fragmented coordinator chains, hidden local loops, ad hoc support creation, and mistaking a thin facade for the governing owner.
- Read `requirements-doc-template.md`, `investigation-notes-template.md`, and `design-spec-template.md`.

### Current code findings refreshed on latest base
- `SelfEvolutionService.startFromEvolutionRequest()` currently controls the one-shot self-evolution use case: record creation, target/context resolution, live-target check, skill target resolution, evidence building, evolver strategy launch, and record finalization. Source: `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` lines 96-147.
- `SelfEvolutionEvidenceBuilder.build()` loads a run projection and renders a `SelfEvolutionEvidencePackage` containing an `anonymizedWorkHistory` string. Source: `autobyteus-server-ts/src/self-evolution/services/self-evolution-evidence-builder.ts` lines 17-37.
- `SelfEvolutionWorkHistoryProjector.render()` currently creates a bounded prompt digest with sections `[WORK_HISTORY_TO_LEARN_FROM]`, `Worker goal`, `Important interaction history`, `Tool and validation outcomes`, and `Feedback and improvement signals`. It slices recent conversation/activity/signal items and truncates cleaned text to `MAX_TEXT_LENGTH = 700`. Source: `self-evolution-work-history-projector.ts` lines 5-64, 151-164.
- `SingleAgentEvolverStrategy.run()` currently creates a new helper agent run, posts one large task message with inlined evidence, waits for completion, then terminates the helper run in `finally`. Source: `single-agent-evolver-strategy.ts` lines 57-129 and prompt construction lines 132-154.
- Current self-evolution run persistence is under memory `self_evolution/evolution_runs/<evolutionRunId>/record.json` plus `self_evolution/index.json`. Source: `self-evolution-run-store.ts` lines 11-20 and 46-66.
- Raw trace records are appended through `RunMemoryFileStore.appendRawTrace()` and are stored in `raw_traces.jsonl`. Source: `autobyteus-ts/src/memory/store/run-memory-file-store.ts` lines 124-134.
- Complete raw trace corpus reading already merges archive segments and active traces, dedupes by `id`, and sorts by `ts`, `turn_id`, `seq`, `id`. Source: `run-memory-file-store.ts` lines 185-201.
- Raw trace archive segments are stored as `raw_traces_000001.jsonl`, etc., with manifest `raw_traces_manifest.json`. Source: `raw-trace-archive-manifest.ts` lines 1-7 and `raw-trace-archive-manager.ts` lines 122-150.
- `LocalMemoryRunViewProjectionProvider` already reads raw trace corpus with `includeArchive: true` and converts to historical replay events. Source: `local-memory-run-view-projection-provider.ts` lines 39-49.
- `buildHistoricalReplayEvents()` already merges matching `tool_call` + `tool_result` records into one tool event by `toolCallId`, preserving `toolArgs`, `toolResult`, `toolError`, status, context text, media, and timestamp. Source: `raw-trace-to-historical-replay-events.ts` lines 164-185 and 222-248.
- Projection-to-conversation currently exposes tool events separately as `tool_call` conversation entries with `toolArgs`, `toolResult`, and `toolError`. Source: `historical-replay-events-to-conversation.ts` lines 32-46.
- Projection-to-activities preserves tool `arguments`, `result`, and `error`. Source: `historical-replay-events-to-activities.ts` lines 10-24.

### Current-state design pressure
The current one-shot implementation is healthy for an MVP prompt digest, but it does not fit the companion subsystem model. The pressure is not a local bug; it is a boundary/ownership and data-shape issue:
- Evidence construction is shaped as an inline prompt string, not a durable readable work-trace projection.
- The helper strategy owns helper-run lifecycle as a single-use worker and terminates the run, preventing live companion semantics.
- The current projector is grouped/recent-limited and omits timestamps, while the desired work trace is simple chronological `user:` / `worker:` blocks with tool arguments/results nested in worker blocks.
- Raw trace segment details live correctly behind memory/run-history code; self-evolution should consume that through an owned backend boundary instead of prompting an agent to parse raw trace files.

### Design constraints carried forward
- Keep raw trace storage authoritative and unchanged.
- Introduce self-evolution work traces as a derived projection, not a replacement raw trace format.
- Use `work trace` as the self-evolver-facing/product term; reserve `evidence` only for internal decision-support language if needed.
- Preserve meaningful tool arguments/results; wrong arguments are a key learning signal.
- Hide backend-only fields in visible work trace files.
- Prefer on-trigger catch-up and/or activated-target polling over synchronous heavy conversion inside the raw trace writer.

## Work trace `ensureCurrent()` overwrite/snapshot policy refinement — 2026-06-23

User challenged whether incremental append/checkpoint conversion is worth the complexity, especially because compaction can rotate/rewrite active raw trace state. Updated design preference: `ensureCurrent()` should not use fragile per-row append checkpoints as its correctness basis. Raw traces remain authoritative; work traces are derived projection artifacts.

Refined conclusion after later layout discussion:
- Numbered raw trace files are stable after creation, so their corresponding numbered work trace files can be converted once and reused.
- Active `raw_traces.jsonl` is mutable and may be rewritten during compaction/rotation, so its corresponding active work trace should be regenerated by `ensureCurrent()`.
- `ensureCurrent()` should write/update a flat manifest only after the relevant work trace files are written.
- The manifest gives the companion an ordered complete view, while the physical files remain flat and parallel to raw trace files.

This keeps the simple correctness model without nested snapshot/generation directories and without raw-writer coupling.

## Work trace generation refinement: immutable numbered conversions + regenerated active file — 2026-06-23

User clarified the important source-stability distinction:
- Numbered raw trace files such as `raw_traces_000001.jsonl` are effectively immutable once created.
- Active `raw_traces.jsonl` continues to append/change and may be rewritten during compaction/rotation.

Updated design refinement:
- Keep work trace layout flat and parallel to raw trace layout.
- Convert immutable numbered raw trace files once into corresponding numbered work trace files, keyed by source index/fingerprint.
- Regenerate the active raw trace into `work_trace_active.md` whenever `ensureCurrent()` runs and the active source changed.
- Update `work_traces_manifest.json` after files are written.

Example:
```
raw_traces_000001.jsonl -> work_trace_000001.md   # convert once/reuse
raw_traces_000002.jsonl -> work_trace_000002.md   # convert once/reuse after compaction creates it
raw_traces.jsonl        -> work_trace_active.md   # regenerate when active changes
work_traces_manifest.json                         # ordered complete view
```

This hybrid design avoids fragile incremental append checkpoints while also avoiding unnecessary re-rendering of immutable numbered sources. It handles compaction cleanly: once active raw traces rotate into a numbered raw trace file, the next `ensureCurrent()` converts that new numbered source once and regenerates the new active work trace.

## Work trace file layout correction: mirror raw trace flat structure — 2026-06-23

User corrected the proposed nested work trace layout. Current raw trace storage does not put numbered archived raw trace files under an archive folder in the current layout; numbered raw trace files and the active raw trace file live in the same run/member directory:
```
raw_traces_000001.jsonl
raw_traces_000002.jsonl
raw_traces.jsonl
raw_traces_manifest.json
```

Updated work trace layout principle:
- Keep self-evolution work trace files flat and structurally parallel to raw trace files.
- Do not introduce nested `archived/`, `active_snapshots/`, or `generations/` directories unless a later requirement explicitly needs that complexity.
- Work trace file names should correspond naturally to source raw trace file names.

Preferred simple layout under the self-evolution target work trace root:
```
work_trace_000001.md          # derived from raw_traces_000001.jsonl; stable/reused
work_trace_000002.md          # derived from raw_traces_000002.jsonl; stable/reused
work_trace_active.md          # derived from current raw_traces.jsonl; regenerated on ensureCurrent
work_traces_manifest.json     # ordered list, source fingerprints, current generation/version
```

If a stable per-click active snapshot is needed to avoid mutation while the companion reads, keep it flat too:
```
work_trace_active_000007.md
work_traces_manifest.json
```
But the default should remain as simple as possible: flat files corresponding to raw trace files.

## Detailed companion activation/reuse data flow clarification — 2026-06-23

User asked how `SelfEvolutionCompanionSessionService -> live self-evolver agent run / future team root` works when the self-evolver does not exist initially. Clarified design:
- `SelfEvolutionCompanionSessionService` owns activation/reuse.
- It should use a strategy/adapter selected by `effectiveConfig.evolverStrategy`.
- Current executable path maps to `single_agent`; future path maps to `agent_team`.
- On first click, no evolver session state exists, so the single-agent adapter resolves the self-evolver agent settings and creates a companion agent run through `AgentRunService.createAgentRun`, then stores the companion run id in target-scoped evolver session state.
- On later clicks, the service loads target-scoped evolver session state, verifies the companion run is active, and reuses it.
- If the stored companion/evolver is inactive, the lifecycle policy should resume it when supported; otherwise mark the old runtime unavailable and create a replacement, passing previous session state/work-trace paths into the new trigger so continuity can recover.
- Future agent-team support should create/reuse a self-evolver team through a team-run boundary and post the trigger to the team root/coordinator only.

## Self-evolution launch/run configuration simplification analysis — 2026-06-23

User questioned whether per-agent-run / per-team-run `selfEvolution` launch overrides and stored `selfEvolutionEffective` snapshots are redundant in the companion model. Current implementation stores `selfEvolutionEffective` in agent run metadata and team/member metadata at launch time, then self-evolution eligibility/start uses that snapshot.

Current value of the snapshot model:
- Supports launch-time overrides for enabled/trigger strategy/evolver strategy/evolver agent definition.
- Preserves audit/reproducibility of what self-evolution config the run had at launch.
- Makes sense for future scheduled/signal-based trigger strategies that need per-run enablement policy.

Problem in the refined user-triggered companion model:
- Self-improve remains explicitly user-click triggered, not autonomous.
- If the global self-evolution capability is enabled, user expectation is that any eligible active target can be self-improved when clicked.
- Per-run stored `selfEvolutionEffective` adds friction and duplicate configuration: a run launched before enablement or with a missing snapshot may appear ineligible even though the user wants to click now.
- Companion strategy/settings can be resolved at click time from global self-evolution settings, then persisted into the self-evolution request/run record for audit.

Recommended refinement:
- Remove self-evolution launch/run configuration as the eligibility authority for manual self-improve.
- Compute manual-click eligibility dynamically at click time from:
  1. global self-evolution capability enabled,
  2. target run/member is active and addressable,
  3. target agent has writable configured skill roots,
  4. selected current evolver strategy is implemented/available,
  5. companion can be created/reused.
- Store the effective self-evolution settings used by the request in `SelfEvolutionRunRecord`, not in the target run metadata as a precondition.
- Keep global/default self-evolution settings for evolver strategy and evolver agent/team definition if needed, but do not require per-target launch-time snapshots for manual clicking.

Design impact:
- `SelfEvolutionTargetContext.effectiveConfig` should come from current self-evolution settings at request time, not from target run metadata.
- GraphQL run creation inputs probably should remove or deprecate `selfEvolution` overrides for this redesigned scope.
- Agent/team run metadata should not need `selfEvolutionEffective` for manual self-improve eligibility.
- If future autonomous scheduled/signal triggers are reintroduced, they should get a separate explicit policy owner rather than reusing manual-click eligibility snapshots.

## Per-run self-evolution config removal decision — 2026-06-23

User confirmed the design should remove separate per-run/per-team-run self-evolution launch configuration from the manual self-improve model. This is not only a UX simplification; it also simplifies agent run config/metadata and team run/member metadata.

Target design decision:
- Manual Self Improve is controlled by current global self-evolution capability/settings plus current target state.
- Agent run creation, team run creation, and team member config should not accept `selfEvolution` launch overrides for the manual companion model.
- Agent run metadata, team run metadata, and team member metadata should not persist `selfEvolutionEffective` as a manual self-improve eligibility prerequisite.
- Self-evolution request records should still persist the effective settings actually used by the request for audit/provenance.

Code areas impacted by this simplification:
- `agent-execution/services/agent-run-provisioning-service.ts` currently resolves/stores `selfEvolutionEffective` during run launch.
- `agent-execution/domain/agent-run-config.ts` currently carries `selfEvolution`.
- `run-history/store/agent-run-metadata-types.ts` / metadata store currently carry `selfEvolutionEffective`.
- `agent-team-execution/services/team-run-service.ts` currently resolves team/member self-evolution overrides/effective configs.
- `agent-team-execution/domain/team-run-config.ts` currently carries self-evolution config/effective fields.
- `run-history/store/team-run-metadata-types.ts` and schema currently carry `selfEvolutionEffective` fields.
- GraphQL create-run inputs currently expose `selfEvolution` on agent run, team run, and team member config inputs.
- `SelfEvolutionTargetContextResolver` currently reads `effectiveConfig` from run/member metadata; target design should instead resolve current settings at click time via a self-evolution settings/config owner.

Design consequence:
- `SelfEvolutionEligibilityEvaluator` should no longer reject manual Self Improve because a run lacks a launch-time snapshot.
- `ManualTriggerStrategy` or its replacement should create request records from current click-time settings.
- Strategy selection (`single_agent` now, `agent_team` later) remains configurable globally/currently, but no longer as target-run launch metadata.

## App-data migration need for self-evolution metadata removal — 2026-06-23

User asked whether the design's "migration sequence" means a real app-data migration script is needed. Investigation found an existing app-data migration framework under `autobyteus-server-ts/src/app-data-migrations`, registered in `app-data-migration-registry.ts`, with required-on-startup migrations such as `TeamRunMetadataMemberTreeMigration` and `RawTraceRotationLayoutMigration`. These migrations scan persisted memory metadata files, write backups, atomically rewrite changed files, and report migrated/skipped/failed item counts.

Current persisted self-evolution fields to remove:
- Standalone agent run metadata: `run_metadata.json` can contain `selfEvolutionEffective`; current `AgentRunMetadataStore.normalizeMetadata()` preserves it.
- Team run metadata: recursive agent member metadata can contain `selfEvolutionEffective`; current `team-run-metadata-schema.ts` parses/normalizes it for agent members.

Conclusion:
- Yes, removing run/team launch-time self-evolution config should include a real app-data migration.
- Even if future parsers could ignore unknown fields, clean-cut removal requires existing persisted metadata to be rewritten without stale `selfEvolutionEffective` fields.
- The migration should be required-on-startup, idempotent, and registered in `AppDataMigrationRegistry`.

Proposed migration:
- File: `autobyteus-server-ts/src/app-data-migrations/migrations/remove-self-evolution-run-metadata-migration.ts`.
- Migration id: e.g. `20260623_remove_self_evolution_run_metadata` (exact date/id to be finalized at implementation time).
- Scope:
  1. scan standalone agent run metadata files via `AgentRunMetadataStore`/memory layout,
  2. remove top-level `selfEvolutionEffective` from `run_metadata.json`,
  3. scan team run metadata files via `TeamRunMetadataStore`,
  4. recursively remove `selfEvolutionEffective` from every agent member in `memberTree`,
  5. leave self-evolution request records under `memory/self_evolution/evolution_runs` intact because those are audit records of actual self-evolution requests.
- Behavior:
  - SKIPPED if no obsolete fields exist,
  - MIGRATED if fields were removed and file rewritten,
  - FAILED on unreadable/invalid metadata that cannot be safely rewritten,
  - create backups before rewriting changed metadata files,
  - use atomic temp-file + rename write pattern.

Design terminology clarification:
- The design's "Migration / Refactor Sequence" includes code refactor steps and real app-data migration work. For the self-evolution metadata removal specifically, a real app-data migration is required.

## Design impact: remove redundant target-key directory from work trace layout — 2026-06-23

API/E2E Round 3 observed implementation storing work traces under `<memoryDir>/self_evolution/targets/<targetKey>/work_traces/` and session state under `<memoryDir>/self_evolution/targets/<targetKey>/companion.json`. The target key looked like `agent_run_<run-id>_<hash>`, repeating the run id already present in `memory/agents/<runId>/`. Later user feedback also rejected `companion.json` as a persisted filename; the corrected design uses `evolver_session.json`.

Assessment:
- The user's concern is valid. Once the implementation chose `context.memoryDir` as the root, the path is already target-scoped.
- The earlier `targets/<targetKey>` shape came from a possible global `memory/self_evolution/targets/<key>` layout. It no longer fits the target-memory-scoped layout.
- The hash in `safeKey` was useful for path-safe uniqueness in a global target registry, but it is unnecessary as a path component under a target-specific memory directory.

Corrected target layout:
```
<memoryDir>/self_evolution/evolver_session.json
<memoryDir>/self_evolution/work_traces/work_traces_manifest.json
<memoryDir>/self_evolution/work_traces/work_trace_000001.md
<memoryDir>/self_evolution/work_traces/work_trace_active.md
```

Design impact:
- Update work trace store and evolver session store path methods.
- Remove `targetKey.safeKey` from path construction.
- Prefer removing `targetKey` from persisted manifest/state/package if it is only a path identity; keep the structured `target` object for audit.
- Update tests and API/E2E expected paths.

## Evolver session state naming and recovery refinement — 2026-06-24

User reviewed the target-scoped storage layout and agreed with the simplified structure:

```txt
<memoryDir>/self_evolution/evolver_session.json
<memoryDir>/self_evolution/work_traces/work_traces_manifest.json
<memoryDir>/self_evolution/work_traces/work_trace_000001.md
<memoryDir>/self_evolution/work_traces/work_trace_active.md
```

Naming refinement:
- `companion.json` is rejected as a storage filename because it sounds like the companion itself rather than backend state.
- The preferred filename is `evolver_session.json` because the file stores backend session/checkpoint state for the self-evolver attached to this target.
- The conceptual product language can still describe a companion coach, but the persisted state file should use implementation-precise naming.

Usage clarification:
- `evolver_session.json` is backend-owned session state. It is not raw trace content, not transformed work trace content, and not the self-evolver's whole memory.
- On each user-triggered Self Improve click, the backend reads this file to decide whether this target already has an attached self-evolver run/team.
- If no session exists, the backend creates the first evolver run/team, writes the session file, then posts the trigger message with the work trace manifest path.
- If the recorded evolver run/team is active, the backend reuses it and sends the next trigger message to that same session.
- If the recorded evolver run/team is inactive but resumable, the backend should resume/reactivate it and then send the trigger.
- If the recorded evolver run/team cannot be resumed, the backend should recover the self-evolution session by creating a replacement evolver run/team, preserving prior evolver ids in session state, and sending a continuity trigger that points to the same current work trace manifest and explains that it is continuing a prior self-evolution session.
- Recovery remains user-triggered. The backend should not autonomously restart a stopped evolver just because it stopped; restore/resume/replacement happens when the user clicks Self Improve again and eligibility still passes.

Design consequence:
- The previous open lifecycle question is now resolved for this design: prefer live-session reuse; on inactive session, resume if supported; otherwise create a replacement with continuity. Fail clearly only when the target is no longer eligible, session state is corrupt/untrusted, editable skill roots are unavailable, or global self-evolution is disabled.
- Requirements and design spec should explicitly show both standalone-agent and team-member storage examples, the `evolver_session.json` filename, and the click-time restore/replacement flow.
