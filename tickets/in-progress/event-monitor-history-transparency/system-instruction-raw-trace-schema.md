# System Instruction Raw-Trace Field Audit

## Status

`Approved minimal schema — SR-014 restores the approved first-capture lifecycle; fields unchanged`

## Purpose

Pin down the smallest truthful persisted record needed to restore system
instructions in Activity. This artifact separates fields required by current
raw-trace infrastructure from fields that are semantically necessary for this
feature. It deliberately rejects speculative provider, deduplication, and
display metadata.

## Evidence From The Current Repository

- `RawTraceItem` currently serializes seven required base fields: `id`, `ts`,
  `turn_id`, `seq`, `trace_type`, `content`, and `source_event`.
- `RuntimeMemoryTraceInput` is a discriminated union, but it has no
  system-instruction kind and requires `turnId` for every current variant.
- `ExternalRuntimeMemoryWriter` generates `id`, `ts`, and per-turn `seq` and
  writes the record to the run's raw-trace JSONL.
- `LocalMemoryRunViewProjectionProvider` already receives `runId` and
  `runtimeKind` from run metadata; those values are not obtained from each raw
  trace.
- Native configures its final processed prompt during agent bootstrap, before a
  turn. Claude supplies `systemPrompt` for an identified query turn. Codex
  supplies `baseInstructions` during `thread/start` or `thread/resume`, before
  a Codex turn exists.

The user-visible subject is the instruction version for the run, not a
turn-specific message. The provider-neutral representation should therefore be
run-scoped for all three runtimes. This avoids giving Native/Claude a different
shape merely because a real turn happens to exist there, and avoids a fake
Codex `turn_id`. The implementation must add a run-scoped raw-trace variant.

## Minimal Proposed Serialized Record

```ts
type SystemInstructionTraceRecord = {
  id: string;
  ts: number;
  trace_type: "system_instruction";
  content: string;
  source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED";
};
```

## Persistence Location And Lifecycle

The pre-ticket baseline did not persist this event. IR-001 added the proposed
row. SR-014 restores the approved first-capture lifecycle after rejecting an
unsupported storage-failure premise:

1. the runtime boundary samples a candidate `ts` immediately before invoking
   the handoff;
2. after the handoff succeeds, the trace recorder compares the latest active
   system record: direct string equality returns the existing record with
   `created:false`; otherwise the recorder allocates `id`, uses the sampled
   `ts`, and appends the five-field record as one JSONL line to the selected
   run's `<run-memory-dir>/raw_traces_active.jsonl`;
3. `created` reports whether step 2 appended a new instruction version;
4. Claude publishes a newly created version immediately because its listener
   already exists. Native/Codex stage only a newly created trace and publish it
   once after listener binding and before first backend input; and
5. normal raw-trace rotation may later move that same record into
   `<run-memory-dir>/raw_traces_NNNNNN.jsonl`, whose segment is catalogued by
   `<run-memory-dir>/raw_traces_manifest.json`.

The `AgentRunEvent`/WebSocket envelope is not a second durable event log. Raw
trace is the durable representation of the semantic fact. Activity reads only
the active selected trace window in this slice; no retained landmark or archive
lookup is added.

No `turn_id` or per-turn `seq` is stored. Ordering uses `ts`; if two instruction
versions have the same timestamp, the run-scoped reader preserves their raw-
trace append/segment order rather than pretending that lexical ID order is
causal. The current `RawTraceItem.fromDict`, normalized `MemoryTraceEvent`,
ordering, and replay types must be adjusted so a run-scoped variant does not
manufacture `"undefined"`, `""`, or `0` turn data.

The writer records the first observed supply of an instruction version.
Consecutive invocations whose content is equal under direct string comparison
do not append or publish the same large record again while the preceding
instruction version is still the latest system-instruction record in the active
raw trace. A changed value creates a new record; a later reversion after a
different value also creates a new record. Rotation that removes the latest
instruction record from the active file resets this folding boundary, so a
later supply can create a new active record without scanning archives. Equality
is direct string equality, so no `content_hash` is required. This is active-
trace consecutive version folding, not content deduplication across the whole
run.

CRR-001's proposed Native/Codex candidate-retry scenario is not an approved
lifecycle for this schema. Under the repository's normal stable-process,
writable-storage, and normal-filesystem assumptions, no independent supported
trigger was found that makes `recordRunStarted` fail while preserving the exact
unchanged prepared metadata required by that branch. The defensive fallback and
its mocked test cannot prove their own reachability. The schema therefore adds
no publication marker, rollback rule, retry registry, or `created:false` live
notification behavior.

## Required And Conditional Field Audit

| Field | Decision | Exact meaning / source | Why it exists |
| --- | --- | --- | --- |
| `id` | Required | Non-empty raw-trace record identity, unique within the run and allocated once for the captured version | Raw-trace identity, live Activity identity, and reload identity while the record remains in the active selected window; replaces any proposed `snapshot_id` |
| `ts` | Required | Finite positive Unix timestamp in seconds (fractional seconds allowed) for the first observed supply of this consecutive instruction version | Chronological placement and capture time |
| `trace_type` | Required constant | `system_instruction` | Allows replay/projection to select the semantic record without inspecting content or provider data |
| `content` | Required | Exact, non-recomposed AutoByteus-owned instruction text passed/configured at the runtime handoff named below | The user-visible detail and durable audit fact |
| `source_event` | Required constant | `SYSTEM_INSTRUCTIONS_SUPPLIED` | Follows the existing raw-trace provenance contract and distinguishes the lifecycle fact from the stored semantic kind |

`SYSTEM_INSTRUCTIONS_SUPPLIED` is deliberate wording. AutoByteus can prove that
it passed the text into its Native/Claude/Codex invocation. It cannot prove that
an external provider accepted, transmitted, merged, or internally applied the
text, so `APPLIED` and `DISPATCHED` would make stronger claims than the evidence.

## Exact Capture Source Per Runtime

| Existing run runtime | Exact content to record | Existing code point | Source label derived by projection |
| --- | --- | --- | --- |
| `autobyteus` | `currentSystemPrompt` after `appendConfiguredSkillsCatalog`, as passed to `llmInstance.configureSystemPrompt(currentSystemPrompt)` | `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts` | `AutoByteus-supplied · Native configured system prompt` |
| `claude_agent_sdk` | `this.runContext.runtimeContext.carpenterSystemPrompt` as passed in the `systemPrompt` argument to `startQueryTurn` | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | `AutoByteus-supplied · Claude SDK systemPrompt` |
| `codex_app_server` | `config.baseInstructions` as passed to `thread/start` or `thread/resume` | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | `AutoByteus-supplied · Codex baseInstructions` |

The runtime comes from existing run metadata. The source label is a projection
mapping from that runtime. There is one supported instruction source per runtime
in this slice, so an `instruction_boundary` field would duplicate known data.
If a future runtime genuinely supplies two separately displayable instruction
channels, that future requirement must introduce a typed distinction then.

For Native, this scope is intentionally the final AutoByteus-constructed prompt
configured on the LLM abstraction. It is not described as the complete provider
request prompt. The repository proves that there is no single later
provider-neutral serialization boundary: Anthropic joins all system-role
working-context messages, while Gemini uses `llmInstance.systemMessage` and
omits system-role working-context messages from rendered history. Capturing a
later provider request would therefore be a different, provider-level request
transparency feature.

## Rejected Persisted Fields

| Candidate | Decision | Reason |
| --- | --- | --- |
| `run_id` | Reject | The raw-trace file is owned by a run and projection input already supplies `runId` |
| `runtime_kind` | Reject | Existing run metadata is authoritative and already supplied to the projection |
| `instruction_boundary` | Reject | One-to-one with `runtimeKind` for the three approved capture sources; useful as an investigation concept, redundant as stored data |
| `snapshot_id` | Reject | Existing raw-trace `id` already identifies the recorded version |
| `activity_id` | Reject as a stored field | Activity reuses raw-trace `id`; the live event transports that value as `trace_id` |
| `version_number` | Reject | Ordered trace records already identify each value transition; no independent product behavior consumes a counter |
| `fidelity` | Reject | Truth is expressed by runtime-derived source copy; no independent state is represented |
| `content_hash` | Reject | No approved integrity or content-deduplication behavior requires it |
| `character_count` | Reject | Derived from `content` for presentation |
| `provider`, provider session/thread/request IDs | Reject | Not required to identify, order, reload, or explain the captured instruction in this slice |
| `correlation_id` | Reject | No second record or lifecycle pair requires correlation in the approved slice |
| `publication_status`, `published_at`, delivery marker | Reject | No approved durable delivery-state subject exists; live publication follows a successful newly created capture and raw trace remains the only durable fact |
| `turn_id`, per-turn `seq` | Reject | The instruction version is a run-scoped Activity landmark, and Codex has no turn at the actual supply point |
| `tool_*`, `tool_result`, `media` | Reject | Semantically unrelated and must not be overloaded |
| `schema_version` | Reject for this record | Existing raw traces have no per-record schema-version convention; adding one only here has no demonstrated compatibility benefit |
| generic `metadata` | Reject | Would weaken the discriminated typed contract and allow unreviewed provider fields |
| redaction/status fields | Reject for current scope | Exact content is required. Add a narrowly named field only if a concrete redaction policy is separately approved |

## Canonical Event Versus Persisted Record

The provider-neutral runtime fact and the stored trace are related but not the
same schema:

```ts
type SystemInstructionsSuppliedEvent = {
  eventType: "SYSTEM_INSTRUCTIONS_SUPPLIED";
  runId: string;
  payload: {
    trace_id: string;
    content: string;
    ts: number;
  };
  statusHint: null;
};
```

- `runId` belongs to the existing event envelope and selects the raw-trace file;
  it is not duplicated inside the stored record.
- `payload.trace_id` is the same value as persisted `id`; it lets the live and
  reloaded Activity entry use one identity and is not a second stored field.
- The capture/persistence owner allocates `id` once and folds only consecutive
  instruction values equal under direct string comparison, without trimming,
  normalization, or canonicalization.
- The live event is published after the raw-trace append succeeds; it does not
  represent an instruction version that has not been durably recorded.
- `created:false` identifies equal active-version folding: no new row and no
  new live semantic event are produced.
- Native/Codex hold one newly created trace only until listener-safe publication;
  this transient state is not persisted or reused as recovery state.
- Transport to the browser may project a summary and load `content` through run
  history; the Activity UI must not receive provider-native payload shapes.
- This event payload must be implemented as a typed discriminated variant or
  validated constructor/parser despite the current general
  `AgentRunEvent.payload: Record<string, unknown>` envelope.

## Compatibility And Retention Constraints

- Old records remain valid and need no migration.
- Readers must ignore the new trace kind unless they explicitly project it.
- Readers must preserve raw append/segment order for equal-timestamp system-
  instruction versions; record IDs are identity, not a claim of causal order.
- The system-instruction trace must not enter LLM working-context reconstruction
  or conversation rendering.
- Activity projects the record only while it remains in the active raw-trace
  file and normal recent selection. Trimming or archive rotation may remove the
  entry from Activity.
- No pinning, retained lookup, archive scan, placeholder, or historical
  reconstruction is added. Absence from the active projection produces no row.
- No rollback, durable publication marker, or retry-specific state is added.
  One exact raw row remains authoritative for each newly captured version.
