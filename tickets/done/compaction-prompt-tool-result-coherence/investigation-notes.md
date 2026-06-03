# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements approved/refined by user; architecture review round 1 failed with design-impact findings AR-001/AR-002; revision prepared for resubmission.
- Investigation Goal: Identify the current memory compaction prompt builder and transcript renderer, determine why compactor prompt copy uses product/internal wording, and determine how tool call IDs/results are represented and can be correlated in compaction input.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The active defect is localized to compaction prompt/template rendering, but full coherence spans working-context prompt builder, legacy raw-block prompt builder, default built-in agent template, and tests/docs.
- Scope Summary: Improve compaction prompt naturalness and enforce explicit tool-call/result correlation in the compaction transcript without changing canonical storage.
- Primary Questions To Resolve: Where prompt copy is defined; where transcript is rendered; whether tool result IDs are stored/lost; whether flat or nested representation is the current architecture fit.

## Request Context

The user reports that the current memory compaction user message looks strange and too implementation/product-branded. In the provided screenshot, the compactor user message says: “Compact the settled working-context transcript below into durable AutoByteus memory.” It also uses `[WORKING_CONTEXT_TRANSCRIPT]` and starts transcript lines with wording like “Assistant reasoning: ...”. The user frames compacting as a natural human-like process: after working for a while, one summarizes/refreshes context. The user also questions why rendered tool call results lack the originating tool call ID even though tool calls have IDs, and asks whether tool results should include the original tool call ID or be placed directly with the tool call.

Reference image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_769fcc62/solution_designer_5327851c3447deef/context_files/ctx_2af07c0b952c__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-tool-result-coherence`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-tool-result-coherence/tickets/done/compaction-prompt-tool-result-coherence`
- Current Branch: `codex/compaction-prompt-tool-result-coherence`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-tool-result-coherence`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-03; `origin/personal` advanced from `462151c5` to `2e78e6b7`.
- Task Branch: `codex/compaction-prompt-tool-result-coherence`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Work is isolated in the task worktree; requirements are user-approved/refined with amendment to remove or translate all unhelpful internal jargon from LLM-facing prompt/user-message/compacted-memory copy.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-03 | Setup | `git fetch origin --prune` | Refresh tracked remote before creating a dedicated task branch. | Fetch succeeded; `origin/personal` updated to `2e78e6b7`. | No |
| 2026-06-03 | Setup | `git worktree add -b codex/compaction-prompt-tool-result-coherence /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-tool-result-coherence origin/personal` | Create dedicated task worktree/branch. | Worktree created from `origin/personal`, HEAD `2e78e6b7`. | No |
| 2026-06-03 | Other | User-provided screenshot path `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_769fcc62/solution_designer_5327851c3447deef/context_files/ctx_2af07c0b952c__image.png` | Capture observed compactor prompt wording. | Screenshot shows compactor user message with “AutoByteus memory”, `[WORKING_CONTEXT_TRANSCRIPT]`, and “Assistant reasoning”. | Compare with code-generated prompt. |
| 2026-06-03 | Command | `rg -n "AutoByteus memory|WORKING_CONTEXT_TRANSCRIPT|Memory Compactor|compaction|tool_call_id" ...` | Locate prompt strings and tool-result identity paths. | Found active prompt builder, legacy prompt builder, built-in template, serializer, and tests. | No |
| 2026-06-03 | Code | `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` lines 16-25, 36-50, 80-84 | Verify screenshot prompt and transcript renderer. | The builder emits the screenshot wording, renders tool call IDs, but omits `ToolResultPayload.toolCallId` from result lines. | Change prompt copy and result renderer. |
| 2026-06-03 | Code | `autobyteus-ts/src/memory/compaction/working-context-message-unit-builder.ts` lines 60-96 | Check whether compaction has a call/result grouping owner. | Tool protocol unit groups assistant tool-call message plus following result messages with expected/matched tool call IDs. | Reuse this grouping; no storage rewrite needed. |
| 2026-06-03 | Code | `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` lines 127-156 | Determine whether tool result IDs persist in snapshots. | `tool_call_id` is serialized and deserialized into `ToolResultPayload`. | No storage/schema change needed for normal path. |
| 2026-06-03 | Code | `autobyteus-ts/src/memory/memory-manager.ts` lines 237-257 and 310-340 | Trace ingestion of tool calls/results into working context. | Tool intent messages carry call IDs; tool result messages are created with `event.toolInvocationId` and provenance `toolCallIds`. | Renderer should expose existing identity. |
| 2026-06-03 | Code | `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` lines 25-53 | Check legacy raw-block compaction prompt. | Legacy builder also says “AutoByteus memory” and omits tool call IDs from raw tool call/result rendering. | Align if implementation touches compaction prompt copy. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` lines 1-55 | Check compactor system prompt/template. | Template contains AutoByteus-specific wording in description and opening instruction but owns stable JSON-only/category behavior. | Naturalize wording while preserving behavior. |
| 2026-06-03 | Code | `autobyteus-ts/tests/unit/memory/working-context-compaction-prompt-builder.test.ts` lines 30-41 | Check current test coverage. | Existing test covers tool-call ID preservation but not tool-result ID preservation or prompt naturalness. | Add tests. |
| 2026-06-03 | Code | `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` lines 10-36 | Check template test constraints. | Test asserts category/preservation behavior, not AutoByteus wording. | Update test to assert natural wording if template changes. |
| 2026-06-03 | Doc | `autobyteus-ts/docs/agent_memory_design_nodejs.md` lines 47-51 and 92-100 | Verify storage-vs-derived-view decision. | Docs define `ToolInteraction` as a paired derived view using `tool_call_id`, while underlying snapshot remains event-based. | Keep storage separate; derive compaction view. |
| 2026-06-03 | Data | `/Users/normy/.autobyteus/server-data/.../working_context_snapshot.json` parsed with Python | Verify a live snapshot stores tool result call IDs. | Schema 4 snapshot had many `tool` messages whose `tool_payload.tool_call_id` matched preceding assistant `tool_calls` IDs. | Confirms the observed display issue is rendering, not storage. |
| 2026-06-03 | Other | User follow-up approval in chat | Confirm requirements and wording direction. | User agreed to grouped tool-call/result rendering in the compaction prompt and keeping storage unchanged; user questioned `settled`, confirming it should not appear in LLM-facing copy if it does not add clarity. | Use `earlier conversation history` style wording. |
| 2026-06-03 | Other | User follow-up refinement in chat | Clarify vocabulary standard. | User broadened the requirement: all LLM-facing internal jargon that does not help the model should be updated/refined/removed in the prompt/user message and in constructed memory content. | Add compacted-memory message builder and LLM-facing vocabulary audit to scope. |
| 2026-06-03 | Code | `autobyteus-ts/src/memory/compaction/compacted-memory-message-builder.ts` lines 19-20 | Check constructed compacted-memory message shown to future LLM calls. | The message currently says “You are continuing an ongoing task after compacting earlier working memory,” which is LLM-facing internal process wording. | Replace with natural resume/context wording and add tests. |
| 2026-06-03 | Review | `tickets/done/compaction-prompt-tool-result-coherence/design-review-report.md` | Architecture review of revised package. | Failed with AR-001: prompt guardrail itself used disallowed internal jargon; AR-002: post-compaction rebuild/resume-context path must be first-class in the spine. | Revise requirements/design and resend. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `PendingCompactionExecutor.executeIfRequired(...)` asks `WorkingContextMessageWindowPlanner` to select compactable `WorkingContextMessageUnit`s, calls `MemoryManager.compactor.compactWorkingContext(plan)`, retrieves a `MemoryBundle`, delegates rebuilt context construction to `WorkingContextSnapshotRebuilder`, and resets the working-context snapshot.
- Current execution flow: `PendingCompactionExecutor` -> `WorkingContextCompactor.compactWorkingContext(...)` -> `AgentCompactionSummarizer.summarizeMessageUnits(...)` -> `WorkingContextCompactionPromptBuilder.buildTaskPrompt(...)` -> visible compactor-agent run receives the generated user prompt -> `CompactionResponseParser` parses JSON result -> `MemoryStore.add(...)` persists compacted memory -> `Retriever.retrieve(...)` reads a `MemoryBundle` -> `WorkingContextSnapshotRebuilder.rebuild(...)` calls `CompactedMemoryMessageBuilder.build(...)` -> `MemoryManager.resetWorkingContextSnapshot(...)`.
- Ownership or boundary observations:
  - `MemoryManager` owns ingestion/persistence of canonical working-context messages and raw traces.
  - `WorkingContextMessageUnitBuilder` owns conversion from message list into compaction units and already groups tool protocol messages.
  - `WorkingContextCompactionPromptBuilder` owns LLM-facing prompt copy and transcript rendering.
  - The built-in compactor `agent.md` owns stable compactor behavior/category guidance for the visible compactor agent.
  - `WorkingContextSnapshotRebuilder` owns rebuilt snapshot shape after compaction and delegates compacted-memory message wording to `CompactedMemoryMessageBuilder`.
- Current behavior summary: The source data already has tool-call IDs for results, but the active compaction prompt renderer omits those IDs. The odd “AutoByteus memory / working-context transcript” wording is hardcoded in the prompt builder and default template rather than forced by parser output.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Local Implementation Defect
- Refactor posture evidence summary: The correct owner exists. `WorkingContextCompactionPromptBuilder` already renders tool call IDs and has access to `ToolResultPayload.toolCallId`; it just does not include that field in result lines. Storage and grouping owners already preserve identity, so no structural storage refactor is needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `working-context-compaction-prompt-builder.ts` | Prompt copy and result rendering are hardcoded in one file. | Localized behavior cleanup is sufficient for active path. | Modify builder and tests. |
| `working-context-message-unit-builder.ts` | Tool protocol groups already record expected and matched IDs. | If grouping is desired, existing unit model can support it. | Do not create redundant storage model. |
| `working-context-snapshot-serializer.ts` + `memory-manager.ts` | Tool result `tool_call_id` is preserved through ingestion and snapshot serialization. | The bug is not a storage loss. | Avoid storage migration. |
| `agent_memory_design_nodejs.md` | ToolInteraction is a derived paired view; snapshot remains event-based. | User’s instinct about grouping is valid for presentation, not for canonical storage. | Use derived compaction rendering. |
| `memory-compactor/agent.md` | Default system prompt contains product-specific wording. | Naturalness issue spans both task prompt and seeded agent template. | Update template while preserving output contract. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | Active compactor task prompt and transcript renderer for working-context units | Emits the strange prompt copy; renders calls with IDs but results without IDs | Primary file to change |
| `autobyteus-ts/src/memory/compaction/working-context-message-unit-builder.ts` | Groups working-context messages into compaction units | Already creates `tool_protocol_group` with call/result ID metadata | Reuse; do not replace |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | Snapshot persistence schema | Serializes/deserializes `tool_call_id` for results | No schema change needed |
| `autobyteus-ts/src/memory/memory-manager.ts` | Memory ingestion and working-context append boundary | Creates `ToolResultPayload` with `event.toolInvocationId` | No ingestion change needed for normal path |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | Legacy raw-trace block prompt builder | Similar product wording and missing tool-call ID on results | Align if prompt cleanup includes legacy path |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | Default visible compactor agent system prompt/template | Product-branded description/opening; stable JSON guidance | Naturalize copy, preserve contract guidance |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-prompt-builder.test.ts` | Active prompt builder unit coverage | Currently covers tool-call IDs only | Add result ID/natural-copy coverage |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` | Built-in template invariants | Does not lock AutoByteus wording | Update for new copy if desired |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-03 | Probe | Python parsed `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_769fcc62/solution_designer_5327851c3447deef/working_context_snapshot.json` | Snapshot schema `4` with 48 messages; many tool result messages contained `tool_payload.tool_call_id` matching preceding assistant tool call IDs. | Confirms rendered compaction prompt drops identity that storage already has. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No running services required for code investigation.
- Required config, feature flags, env vars, or accounts: None for static investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Git fetch/worktree setup commands above.
- Cleanup notes for temporary investigation-only setup: Dedicated worktree remains at `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-tool-result-coherence`.

## Findings From Code / Docs / Data / Logs

The most important finding is that the user’s tool-result ID concern is correct at the prompt-rendering layer but not at the storage layer. The current storage/message model already has the identity (`ToolResultPayload.toolCallId`, serialized as `tool_call_id`), and the compaction unit builder already groups tool call/result sequences. The active prompt builder simply renders result lines without the ID. Therefore the minimal safe fix is prompt rendering and tests, not a storage schema change.

The later user refinement adds a second finding: the LLM-facing vocabulary problem is broader than the opening prompt. `CompactedMemoryMessageBuilder` also constructs text later sent to the working agent, and it currently contains “after compacting earlier working memory.” That is useful as an internal code concept, but not the best LLM-facing framing. It should become natural resume-context language. Architecture review round 1 added that this rebuilt resume-context path must be represented as first-class execution/return flow, not only as a bounded local text-builder concern.

For the “put the tool result into the tool call itself” question: the repository’s design intentionally keeps canonical tool calls and tool results as separate records/messages and defines tool interaction as a derived view. This is appropriate because provider APIs usually model assistant tool calls and tool-result messages separately, tool execution is asynchronous and may fail or complete partially, and append-only traces/snapshots can preserve lifecycle events without rewriting prior call records. Grouping belongs in derived renderers such as compaction prompts or human inspectors.

## Constraints / Dependencies / Compatibility Facts

- The compactor JSON output contract must stay parser-compatible.
- Existing compactor agent files may be preserved by bootstrap if user-edited; updating the built-in template may not update existing installed files without a migration.
- Avoid adding a second prompt renderer that competes with `WorkingContextCompactionPromptBuilder`; strengthen the existing owner.
- LLM-facing copy audit must include `CompactedMemoryMessageBuilder`, because it constructs the memory/context message consumed after compaction.
- No backward-compatibility dual behavior is needed for the in-scope prompt rendering.

## Open Unknowns / Risks

- Final copy for bracket section labels should avoid `settled`; recommended label is `[CONVERSATION_HISTORY_TO_SUMMARIZE]`.
- Final copy for compacted-memory resume message should avoid “compacting earlier working memory”; recommended opening: “You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.”
- Final prompt guardrail should avoid naming internal concepts. Recommended guardrail: “Focus on useful conversation facts; omit bookkeeping identifiers and low-level event details.”
- Existing user-edited compactor definitions may retain old wording until manually updated or regenerated.
- If implementation chooses nested/grouped transcript rendering, edge cases around out-of-order or unmatched results need explicit tests.

## Notes For Architect Reviewer

If approved, recommended architecture posture is local cleanup/no storage refactor: keep canonical message storage separate, use existing unit grouping, and improve `WorkingContextCompactionPromptBuilder` plus the default compactor template/tests. Legacy raw-block prompt builder may be updated as an aligned cleanup.
