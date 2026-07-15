# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete — requirements approved; design produced
- Investigation Goal: Validate the proposed restoration of canonical `tool_name` on native `tool_result` raw traces, including integrity, unmatched/missing-name behavior, downstream consumers, and historical data.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The persisted field change is small but crosses core ingestion/persistence plus replay, compaction, and server projection behavior.
- Scope Summary: Analyze a narrow correction to the completed tool-result trace simplification; do not restore result-side arguments.
- Primary Questions To Resolve: Is the name already available and authoritative at persistence? What mismatch policy is safe? Which consumers benefit? Can historical traces remain directly usable?

## Request Context

The user believes the earlier removal of both tool name and tool arguments from raw `tool_result` records went too far. They supplied a concrete proposal to retain result-side `tool_name` as verified denormalized identity while keeping `tool_args` call-only.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo/superrepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis/tickets/in-progress/tool-result-trace-tool-name-restoration-analysis`
- Current Branch: `codex/tool-result-trace-tool-name-restoration-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-result-trace-tool-name-restoration-analysis`
- Bootstrap Base Branch: `origin/personal` at `2f93caf4a8aea932c12a9c7c5942e4c69f9d88d6`
- Remote Refresh Result: `git fetch origin personal --prune` succeeded on 2026-07-15.
- Task Branch: `codex/tool-result-trace-tool-name-restoration-analysis`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This is currently an analysis/design task; implementation scope awaits user approval.

## Supplemental Solution Artifact Inventory

None currently.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-15 | Command | `rg -n --hidden -S "raw trace|raw_trace|tool name|tool arguments?|tool result" ...` | Locate affected subsystem and earlier work | Located core/server memory paths and completed tool-result trace simplification ticket | Yes |
| 2026-07-15 | Repo | `git log --all --grep='raw trace\\|tool result...'` and `git show c74ba2538` | Identify earlier change | Earlier work is `tickets/done/tool-result-trace-simplification`, merged by `c74ba2538` | Yes |
| 2026-07-15 | Other | User-supplied proposed current/target JSON and integrity rule | Capture concrete desired semantics | Proposed result includes canonical name but not args; mismatch must not be silently trusted | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Pending code inspection.
- Current execution flow: Expected runtime tool-result event -> core memory ingestion -> native trace builder -> persisted JSONL -> replay/compaction/server projection; exact owners pending validation.
- Ownership or boundary observations: The raw-trace ingestion/persistence boundary is likely the correct owner for correlation and canonical-name derivation.
- Current behavior summary: Per user evidence, call traces contain `tool_name` and arguments, while result traces currently contain only call id plus result/error.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Candidate root cause classification: Missing Invariant (tentative)
- Refactor posture evidence summary: Likely a narrow invariant/persistence correction if current owners already carry the necessary identity.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User-provided model inventory | Name exists in `RawTraceItem`, working-context payload, and `ToolResultEvent`, but is not copied by `buildNativeToolResultTrace()` | Current boundary may be dropping useful verified identity rather than lacking a model | Verify in source |
| Earlier ticket merge `c74ba2538` | Simplification affected both core and server replay/projection paths | Consumer assumptions must be audited before recommending a local field copy | Yes |

## Relevant Files / Components

To be populated through source inspection.

## Runtime / Probe Findings

None yet.

## External / Public Source Findings

Not applicable; this is an internal persisted-trace contract question.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation; focused tests may be run if needed.
- Required config, feature flags, env vars, or accounts: None known.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree created from refreshed `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

Pending.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: JSONL raw trace segments; representative shapes supplied by user, volume unknown.
- Relevant code-model, serialization, semantic, or physical-store change: Add `tool_name` back to new result records only.
- Normal readers and writers, including unknown/extra-field behavior: Pending.
- Representative direct-read or compatibility evidence: Pending.
- Required semantics and invariants preserved by direct use: Undetermined.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Tool name is already persisted on call records and is low-volume/non-secret relative to arguments/results.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No migration benefit identified; likely unnecessary if readers tolerate absence.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not investigated because migration is not presently indicated.

## Constraints / Dependencies / Compatibility Facts

- Keep arguments call-only.
- Do not fabricate names for unmatched results.
- Do not silently accept conflicting lifecycle names.

## Open Unknowns / Risks

- Provider-specific event name availability.
- Existing lifecycle mismatch handling and diagnostic channel.
- Downstream fallback/join behavior.
- Historical trace reader tolerance for missing names.

## Notes For Architecture Reviewer

Not ready for review; requirements basis is still Draft.

## Investigation Update — 2026-07-15

### Verified current native path

- `autobyteus-ts/src/memory/raw-trace-ingestion.ts:65-106` validates result identity but `buildNativeToolResultTrace(...)` writes call id/result/error without `toolName`.
- `autobyteus-ts/src/memory/memory-manager.ts:261-317` resolves the physical lifecycle group, rejects result-before-call and nameless calls, and already uses `call.toolName` for Working Context. It does not compare `registration.event.toolName` with the call name.
- `autobyteus-ts/src/memory/models/raw-trace-item.ts:9-103` already supports optional `toolName`, serializes it as `tool_name`, and reads both name-bearing and name-less records.

### Verified current server path

- `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts:40-49` explicitly declares `toolName?: never` on server `tool_result` trace input.
- `autobyteus-server-ts/src/agent-memory/services/runtime-tool-trace-sequencer.ts:75-108,173-200` has authoritative matched tool state and uses `tool.toolName` for the Working Context snapshot, but omits it from the raw result trace.
- `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts:47-78` serializes result id/outcome only.
- `RuntimeToolTraceSequencer` terminal tests explicitly cover a persisted call followed by a terminal event with no tool name, recorder reconstruction followed by a name-less terminal, and turn interruption with no terminal name. A strict “incoming name is always required” rule would break valid paths.

### Verified readers and persistence

- `autobyteus-ts/src/memory/tool-interaction-builder.ts:17-56` already consumes result-side names as historical read-only evidence.
- `autobyteus-server-ts/src/agent-memory/services/raw-trace-record-normalizer.ts` already projects `tool_name` when physically present.
- The completed earlier contract classified historical supersets and current sparse results as directly usable through permissive readers. Adding the existing optional field to future writes therefore needs no migration.

### Analysis conclusion

The user-provided proposal is directionally correct and should refine the earlier simplification rather than revert it. The proper split is:

- call: correlation identity + canonical name + authoritative arguments;
- result: correlation identity + verified canonical name + terminal outcome;
- no result-side arguments.

The name integrity rule must be conditional:

```text
matched call name = canonical source
incoming terminal name absent -> accept canonical call name
incoming terminal name equal -> accept canonical call name
incoming terminal name different -> reject/skip + diagnose
no matched/constructible call name -> reject/skip; never fabricate
```

This must apply to both native and shared server runtime writers to avoid divergent raw-trace semantics.

## Approval Record — 2026-07-15

The user approved the refined contract: simply restore the verified tool name on tool results, keep tool arguments excluded from results, and perform no data migration.
