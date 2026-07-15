# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — user approved on 2026-07-15.

## Goal / Problem Statement

Restore a verified canonical `tool_name` on every newly persisted native, Codex, and Claude `tool_result` raw-trace record while continuing to keep invocation arguments exclusively on `tool_call`. The change should make terminal evidence independently identifiable without weakening `(turn_id, tool_call_id)` correlation or trusting conflicting event metadata.

Target tool-specific shapes:

```json
{
  "trace_type": "tool_call",
  "tool_call_id": "call_123",
  "tool_name": "run_bash",
  "tool_args": {}
}
```

```json
{
  "trace_type": "tool_result",
  "tool_call_id": "call_123",
  "tool_name": "run_bash",
  "tool_result": {},
  "tool_error": null
}
```

## Investigation Findings

- The proposed correction is sound. `tool_call_id` is correlation identity; `tool_name` is compact descriptive identity. They solve different problems and are not redundant in the same way that repeating `tool_args` is.
- `RawTraceItem` already models, reads, and serializes `toolName`. Historical result records with `tool_name` are already accepted.
- Native `MemoryManager.ingestToolResults(...)` already resolves the matched persisted call and uses that call's name for Working Context, but `buildNativeToolResultTrace(...)` currently omits it from the raw result.
- Native ingestion currently verifies call existence and a usable call name but does not compare the incoming `ToolResultEvent.toolName` with that matched call name.
- The shared server path is not as close as the native builder alone suggests: `RuntimeMemoryToolResultTraceInput` explicitly forbids `toolName`, `RunMemoryWriter` omits it, and `RuntimeToolTraceSequencer` writes it only to the Working Context snapshot.
- Server terminal events are permitted to omit a name after a persisted call exists; controlled turn interruption also has no result-side name. Therefore the integrity rule must treat an absent incoming name differently from a conflicting incoming name.
- Current logical readers already accept historical result-side names. No storage migration, schema version, compatibility writer, or historical rewrite is needed.
- Current primary compaction is Working Context based and its `ToolResultPayload` already has `toolName`. Restoring raw result names still improves raw evidence, recovery resilience, result-only inspection/search, and projections operating on partial/corrupt corpora, but it does not eliminate the need for call correlation because arguments and the call anchor remain call-owned.

## Supplemental Solution Artifacts

None.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Both lifecycle owners already correlate result to persisted call state and already possess the canonical call name; current trace contracts deliberately discard it and do not validate a supplied terminal name against it.
- Requirement or scope impact: The corrected invariant belongs in both native and shared server write paths. A native-only patch would create divergent raw-trace semantics across runtimes.

## Recommendations

1. Restore `tool_name` on future `tool_result` rows across native AutoByteus and the shared Codex/Claude server recorder.
2. Keep `tool_args` forbidden on future `tool_result` rows.
3. Derive persisted result `tool_name` from the matched persisted call/runtime tool state, not directly from the terminal payload.
4. If a terminal event supplies a non-empty name, require it to equal the canonical matched call name after existing boundary normalization. If it differs, do not persist or mark the lifecycle complete; emit an explicit diagnostic.
5. If a terminal event omits its name but a matched call supplies the canonical name, accept it and persist the canonical call name. Absence is not a mismatch.
6. Continue rejecting/skipping unmatched results; do not fabricate a name or orphan result.
7. Keep `(turn_id, tool_call_id)` as lifecycle identity, dedupe key, and join key.
8. Preserve old result records without names as directly readable data; do not backfill them.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- Persist independently identifiable native, Codex, and Claude tool-result evidence.
- Validate a supplied terminal tool name against the matched call.
- Accept name-omitting terminal/interruption events when the canonical matched call name exists.
- Search, inspect, recover, replay, and project result-only evidence with a local descriptive name.
- Preserve call-only ownership of invocation arguments.

## Out of Scope

- Restoring `tool_args` on `tool_result` records.
- Changing compound `(turn_id, tool_call_id)` lifecycle identity.
- Removing complete-corpus call correlation; it remains necessary for arguments, call anchoring, ordering, and integrity.
- Backfilling or rewriting historical raw traces.
- Adding a schema-version discriminator, compatibility writer, or dual steady-state format.
- Redesigning provider-native tool event schemas.

## Functional Requirements

- `R-001`: Every newly persisted native or server-runtime `tool_result` must contain the non-empty canonical `tool_name` from its matched call lifecycle.
- `R-002`: `(turn_id, tool_call_id)` must remain the authoritative lifecycle correlation and duplicate-suppression identity.
- `R-003`: Newly persisted `tool_result` records must not contain `tool_args`; invocation arguments remain owned by `tool_call`.
- `R-004`: Before result persistence, a non-empty incoming terminal-event tool name must equal the canonical matched call name after existing normalization.
- `R-005`: A conflicting incoming name must cause the terminal observation to be rejected/skipped and explicitly diagnosed without persisting the result or completing the lifecycle.
- `R-006`: An absent incoming terminal-event name must be accepted when a matched call has a canonical name; the persisted result uses that call name.
- `R-007`: A result without a matched persisted/constructible call and canonical name must remain unrecordable; no orphan result or fabricated name may be written.
- `R-008`: Readers must continue to support historical results both with and without result-side names through normal version-agnostic parsing.
- `R-009`: Logical readers may use a result-local name for partial evidence, but full interaction reconstruction must continue to correlate the call for arguments, anchor, ordering, and lifecycle integrity.

## Acceptance Criteria

- `AC-001`: A matched native `run_bash` call/result persists the result with `tool_name:"run_bash"`, physically present result/error keys, and no `tool_args`.
- `AC-002`: Matched Codex and Claude call/result lifecycles persist the same result shape as native, including deferred call-then-result and controlled interruption paths.
- `AC-003`: A terminal event whose non-empty name differs from its matched call produces no result write, does not mark the lifecycle complete, and emits a diagnostic containing safe identity/context.
- `AC-004`: A terminal success/denial/failure/interruption that omits a name still persists the matched call's canonical name when the call is known.
- `AC-005`: An unmatched result is rejected/skipped under the existing native/server policy and never receives a fabricated name.
- `AC-006`: Duplicate suppression and reconstruction continue to distinguish equal call IDs in different turns by compound identity.
- `AC-007`: A result-only raw trace inspection or partial projection can display the persisted tool name without inferring it from an adjacent row.
- `AC-008`: Existing historical results without `tool_name` and historical supersets with `tool_name`/`tool_args` remain readable without migration or version branching.
- `AC-009`: Focused serialization, native ingestion, server sequencing/writer, reconstruction, interruption, mismatch, and historical-reader coverage passes.

## Constraints / Dependencies

- The shared raw-trace contract must remain consistent across native and server runtime families.
- Provider converters remain responsible for canonicalizing provider wire names before memory ingestion.
- A name comparison is conditional on incoming name presence because existing reconstructed terminal and turn-interruption paths legitimately omit it.
- The persisted name is descriptive denormalization, not a second lifecycle identity.
- Diagnostics must not include tool arguments or results unless existing safe logging policy explicitly permits them.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Agent raw-trace JSONL active and archive segments.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): Directly Usable — No Migration
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all existing rows unchanged. Older name-less results and earlier name/argument supersets remain ordinary readable records.
- Unacceptable data loss or corruption: Loss of results/errors/call identities, false tool-name attribution, or historical rewrite.
- Relevant availability, maintenance-window, or rollout constraints: None; upgraded writers begin producing the refined shape.
- Related requirement and acceptance-criteria IDs: `R-001`–`R-009`, `AC-001`–`AC-009`.

## Assumptions

- Existing provider boundary normalization makes a supplied terminal name directly comparable to the stored call name.
- User intent is to correct the shared raw trace contract, not only the native builder.
- Result-side names are small and non-sensitive relative to already persisted call-side names; arguments remain the storage/privacy-heavy field intentionally excluded from results.

## Risks / Open Questions

- Exact diagnostic mechanism for asynchronous server mismatch should align with existing skip-and-log behavior; a new persisted diagnostic trace is not recommended without a separate requirement.
- Historical logical projection currently lets any result-side name override call-side name. That remains necessary for historical late/effective evidence; the new write invariant prevents future conflicts rather than adding schema-version-dependent read logic.
- Partial evidence becomes more understandable, but a result row alone still cannot prove call arguments or full lifecycle validity.

## Requirement-To-Use-Case Coverage

- Shared future-write shape: `R-001`–`R-003`.
- Integrity and malformed lifecycle handling: `R-004`–`R-007`.
- Partial inspection/read behavior: `R-001`, `R-008`, `R-009`.
- Historical data continuity: `R-008`.

## Acceptance-Criteria-To-Scenario Intent

- `AC-001`–`AC-002`: native and shared server future-write scenarios.
- `AC-003`–`AC-005`: conflict, missing-name, and unmatched-result scenarios.
- `AC-006`: compound identity/reconstruction regression scenario.
- `AC-007`: result-only evidence scenario.
- `AC-008`: persisted-data compatibility scenario.
- `AC-009`: downstream executable-coverage intent.

## Approval Status

Approved by the user on 2026-07-15: restore canonical `tool_name` on result rows, keep result-side arguments removed, and perform no data migration.
