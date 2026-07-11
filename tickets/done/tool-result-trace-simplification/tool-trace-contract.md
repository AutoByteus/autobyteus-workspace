# Persisted Tool Trace Contract

## Status

- Status: Refined supplemental solution artifact.
- Scope: Exact new-write, provider-readiness, lifecycle correlation, crash/reconstruction, compaction, and historical-read rules for raw tool traces.
- Related requirements: REQ-001–REQ-012.
- Related acceptance criteria: AC-001–AC-013.
- Authority: This contract clarifies the requirements and design spec; it does not replace either mandatory artifact.
- Approval: The provider-authoritative split-record direction was explicitly approved by the user on 2026-07-11 and supersedes the terminal-only combined-call contract.

## Existing Persisted Vocabulary

The task keeps the existing names:

- `trace_type:"tool_call"`
- `trace_type:"tool_result"`
- `tool_call_id`
- `tool_name`
- `tool_args`
- `tool_result`
- `tool_error`

It introduces no persisted:

- `tool_call_update`;
- `tool_activity`;
- status/outcome discriminator;
- schema version;
- start/completion timestamp field; or
- provider-specific trace type.

Working Context `ToolCallPayload` and `ToolResultPayload` keep their existing names and protocol responsibilities. They are not raw trace types.

## Correlation Identity

Logical identity is the compound value:

```ts
type ToolCallIdentity = {
  turnId: string;
  toolCallId: string;
};
```

All new writes require non-empty values. Duplicate suppression, lifecycle hydration, logical grouping, crash recovery, replay, and compaction context use this compound identity. A bare `tool_call_id` is never globally unique.

New native batches with a missing identity fail validation before any raw or Working Context mutation. Asynchronous server events with insufficient identity are skipped and logged. No anonymous persisted call ID is invented.

## New-Write Record Shapes

The examples below omit unchanged envelope fields: `id`, `ts`, `turn_id`, `seq`, `content`, and `source_event`.

### Call

```json
{
  "trace_type": "tool_call",
  "tool_call_id": "call_123",
  "tool_name": "run_bash",
  "tool_args": {
    "command": "printf 'hello'"
  }
}
```

Required tool-specific fields:

- non-empty `tool_call_id`;
- non-empty `tool_name`;
- explicit argument object, including `{}` when the authoritative invocation is genuinely argument-free.

A new call never carries `tool_result` or `tool_error`.

### Result

```json
{
  "trace_type": "tool_result",
  "tool_call_id": "call_123",
  "tool_result": "hello",
  "tool_error": null
}
```

Required tool-specific fields:

- non-empty `tool_call_id`;
- physically present `tool_result`;
- physically present `tool_error`.

Forbidden new result fields:

- `tool_name`;
- `tool_args`.

The result’s tool name and arguments are resolved from its compound-identity call. Historical result records may still contain those extra fields and remain readable.

## Argument Meaning And Availability

### Meaning

For new writes, `tool_call.tool_args` means the invocation arguments exposed by the authoritative runtime boundary:

- native AutoByteus: exactly the model-issued arguments;
- Claude: the observed SDK `tool_use` input;
- Codex ordinary tools: normalized approval/start arguments;
- Codex hosted web search: terminal query/action metadata, because the start has only a provider placeholder.

Native preprocessing/preparation may transform execution input. Those transformed values do not rewrite the persisted model-issued call and do not appear on `tool_result`. If execution-input auditing is ever required, it needs a separately approved explicit contract; result metadata is not its owner.

### Presence

The normalized server boundary must preserve this distinction:

| Normalized value | Meaning | Persistence action |
| --- | --- | --- |
| `arguments` property absent / `undefined` | Authoritative invocation arguments are not available yet | Retain identity/name in accumulator; write no raw call or Working Context call |
| `arguments:{}` | Authoritative invocation is known and has no arguments | Persist the call |
| `arguments:{...}` | Authoritative invocation arguments are known | Persist the call |

No persistence owner may collapse absent arguments to `{}`.

## Provider Boundary Matrix

| Runtime/path | First authoritative call boundary | Call timing | Result timing |
| --- | --- | --- | --- |
| Native AutoByteus | Parsed model tool invocation | Before preprocess/prepare/execute | Terminal result/denial/controlled interruption |
| Claude Agent SDK | Observed `tool_use` / permission input | At start | Terminal SDK result/error/denial/interruption |
| Codex command/file/MCP/dynamic tool with explicit args | Approval or `item/started` | At first explicit normalized argument object | Terminal item event |
| Codex hosted `webSearch` | `item/completed`, because start is empty-query/`other` | Immediately before terminal result | Same serialized terminal handling cycle, after call append |

The shared accumulator is provider-agnostic. Provider converters decide whether arguments are present; the accumulator applies the presence contract without branching on provider-native item types or `tool_name`.

## Lifecycle State Machine

For one compound identity:

| State/event | Raw action | Working Context action | Next state |
| --- | --- | --- | --- |
| Start/approval with arguments absent | None | None | Observed, call deferred |
| Start/approval with explicit argument object | Append one `tool_call` unless already written | Project assistant call once | Call written |
| Later start/approval with explicit args after deferred observation | Append one `tool_call` | Project assistant call once | Call written |
| Terminal with call already written | Append one minimal `tool_result` unless already written | Project protocol result once | Complete |
| Terminal with no call, but self-contained name/args | Append `tool_call`, then minimal `tool_result` | Project call, then result | Complete |
| Terminal with no call and insufficient name/args | Skip/log both; do not create orphan result | Do not fabricate call/result | Unrecordable terminal |
| Controlled interruption with written call | Append minimal error result | Project interrupted result | Complete |
| Controlled interruption for deferred call with no authoritative args | Skip raw tool pair; recovery boundary may fence protocol/run | Do not fabricate call | Abandoned/unknown |
| Duplicate call/result event | None | None | Existing state retained |
| Abrupt crash | No handler executes | See crash contract | Depends on durable rows |

Call-written and result-written are distinct physical facts. A terminal event’s arguments are used to construct a call only when no call has already been persisted. They never become result-side call metadata.

## Outcome Table

| Terminal condition | `tool_result` | `tool_error` |
| --- | --- | --- |
| Success with value | Existing runtime/provider result value | `null` |
| Success with null/undefined runtime value | `null` | `null` |
| Failure | Existing failure result when defined, otherwise `null` | Existing/non-empty normalized error |
| Denial | Preserve existing denial result semantics, or `null` | Non-empty denial reason/error |
| Controlled interruption | `null` | Non-empty interruption reason/error |

This task does not inspect or deduplicate inside the opaque `tool_result` value. For example, Codex’s normalized hosted-search completion object may retain small action metadata under its existing result semantics even though no raw search-engine result body was exposed.

## Serialization Rules

- `RawTraceItem` remains permissive enough to read historical supersets.
- Current construction is strict and trace-specific:
  - call input requires name/ID/argument object and cannot accept outcome fields;
  - result input requires ID plus both outcome properties and cannot accept name/arguments;
  - non-tool input cannot accept tool fields.
- A new `tool_result` always serializes `tool_result` and `tool_error` when their values are `null`.
- A call omits both outcome keys.
- Generic non-tool traces do not start serializing null tool fields.
- A result is terminal because `trace_type === "tool_result"`; null success does not require another discriminator.

## Working Context Contract

Raw trace and Working Context have different responsibilities:

| Concern | Raw trace | Working Context |
| --- | --- | --- |
| Invocation evidence | `tool_call` when authoritative args are available | Assistant tool-call message when the call is projected |
| Terminal evidence | Minimal `tool_result` | Separate tool-result message with provider-required name/ID/result/error |
| Native model-facing timing | Call before execution | Call before execution |
| Deferred Codex hosted search | Call at terminal availability | Call then result at terminal availability |
| Compaction | Evidence grouping/archives | Model-protocol grouping and local native compaction |

Working Context may retain tool name on `ToolResultPayload` because the provider protocol requires it. That does not authorize name/arguments on the raw result.

The raw call write and snapshot update are ordered but not a cross-file transaction. Existing protocol-safety recovery remains responsible for repairing the uncommon crash gap between raw and snapshot persistence.

## Native Compaction Contract

One assistant response containing one or more calls and all following matching results is one atomic `tool_protocol_group`.

Required invariant:

> A compaction request may be recorded while a native tool batch is unresolved, but compaction execution must not cross, summarize, remove, or split that incomplete group.

For calls `A` and `B`:

```text
assistant emits A+B
  -> calls A+B are persisted and Working Context group opens
  -> compaction may become pending
  -> result B arrives: raw result B; group still protected
  -> result A arrives or is controlled-interrupted: raw result A; group complete
  -> pending compaction may execute before the next LLM request
```

Tool execution itself does not need another LLM context dispatch, so deferring model-context compaction until the batch settles is safe. A hung invocation must be timed out/controlled-interrupted or otherwise fenced before another LLM request.

## Provider Compaction And Physical Rotation

Codex owns its semantic model-context compaction; AutoByteus does not summarize Codex’s provider-internal context. AutoByteus may still record a provider compaction boundary and rotate local raw evidence.

Physical rotation can archive a call before its result is appended. Therefore two scopes are mandatory for read/compaction projection:

1. **Active scope** — active records alone determine interaction-block membership, frontier/eligibility, and trace IDs eligible for pruning.
2. **Complete-corpus context scope** — active plus complete archive records supply call name/arguments for an active minimal result and historical late-argument read context.

Archive-only trace IDs must never enter an active pruning set. Complete-corpus context enriches meaning; it does not control active ownership.

## Physical Lifecycle Index And Reconstruction

A neutral physical lifecycle index groups ordered raw records by compound identity:

```ts
type ToolTraceLifecycleGroup = {
  identity: ToolCallIdentity;
  call: RawTraceItem | null;
  result: RawTraceItem | null;
};
```

The group contains physical rows, not an effective argument decision. It does not copy result-side arguments into call state.

Writer/lifecycle owners use it only for:

- call-written detection;
- result-written detection;
- call-side name/arguments after recorder reconstruction;
- duplicate suppression.

Read projection may separately apply historical result-side overlay. That overlay is forbidden as an input to a new write.

`RunMemoryWriter` exposes the complete-corpus lifecycle index through its facade. `AgentRunMemoryRecorder` constructs the accumulator from it. The recorder never accesses `RunMemoryFileStore` directly, and `RunMemoryWriter` never decides provider lifecycle policy.

## Crash And Recovery Contract

### Early-written call

If native, Claude, or an ordinary Codex call is persisted and the process crashes before result:

- the raw call remains as issued evidence;
- no raw result exists;
- external side effects may be absent, partial, or complete;
- restart must not automatically retry or claim success;
- Working Context recovery may insert an interrupted/unknown protocol result and an operation-boundary marker;
- the raw tool interaction may remain pending unless a real or explicitly controlled terminal event is observed.

### Deferred call

If a hosted-provider start had no authoritative args and the process crashes before terminal availability:

- no raw call or result may exist;
- accumulator-only observation is lost;
- no call may be reconstructed from placeholder `{}` or guessed arguments.

### Terminal write gap

For a deferred terminal, the call is appended before the result. A crash between those appends leaves an honest unmatched call, which follows the early-written recovery rules. A result must never be written first.

### Reconstruction

After recorder reconstruction:

- complete-corpus physical groups hydrate call-written/result-written state;
- a later terminal for an existing call may append one minimal result even when terminal args are absent;
- a terminal for an already completed identity is ignored;
- historical result-side argument overlay is not used to manufacture a new call;
- malformed events are skipped/logged rather than assigned an anonymous identity.

## Logical Read Contract

The authoritative logical projection consumes physical lifecycle groups and emits one `ToolInteraction` per compound identity.

Read precedence:

1. call row supplies identity, invocation-order anchor, name, and arguments;
2. historical result row may replace name/arguments when those fields are physically present and contain the only later/effective historical evidence;
3. result row supplies outcome and terminal timestamp/provenance;
4. no result means `pending`;
5. non-null error means `error`;
6. otherwise any `tool_result` row means `success`, including explicit-null result;
7. emit once in first-call/first-seen order.

### New pair

```text
tool_call(name=run_bash,args={command:"..."})
tool_result(result="...",error=null)
  -> one interaction(name=run_bash,args={command:"..."},status=success)
```

### Historical exact duplicate

```text
tool_call(args={command:"..."})
tool_result(args={command:"..."},result="...")
  -> one interaction; duplicate historical args are not rendered twice
```

### Historical late arguments

```text
tool_call(name=search_web,args={})
tool_result(name=search_web,args={query:"cats",action_type:"search"},result=...)
  -> one interaction with historical read-effective query/action
```

The historical overlay is a read compatibility rule, not a current writer rule.

## Chronology

- Early calls keep invocation/approval observation time and sequence.
- Results keep terminal observation time and sequence.
- Deferred calls use the terminal observation time and are appended immediately before their result.
- Parallel early calls appear in issuance order; their results may appear in completion order.
- Logical renderers anchor one activity at the call and incorporate terminal status/time without rendering a second activity.

## Historical Superset And No-Migration Policy

Decision: `Directly Usable — No Migration`.

Historical rows may contain:

- result-side `tool_name` and `tool_args`;
- empty call arguments plus terminal-enriched arguments;
- prepared/effective native result arguments;
- missing null outcome keys;
- call/result records in different active/archive files.

They remain readable through the ordinary field/trace semantics above. No historical file is rewritten, no schema version is introduced, no Memory Sync change is added, and no bulk cleanup reclaims existing duplicate bytes.

## Invalid New-Write States

The following are implementation defects:

- a new result contains `tool_name` or `tool_args`;
- a new call contains outcome fields;
- a placeholder Codex web-search start is persisted as `tool_args:{}`;
- missing normalized arguments are defaulted to `{}`;
- a result is appended before its deferred call;
- a result is appended without a matching persisted call when the terminal cannot construct one;
- a writer uses historical result-side arguments to construct/update a call;
- identity is keyed by call ID without turn ID;
- an anonymous persisted call ID is synthesized;
- archive-only IDs enter active compaction pruning;
- native prepared/effective args are copied into result metadata;
- new and historical rows are selected by schema-version branching;
- a migration rewrites readable historical supersets.

## Approval Record

On 2026-07-11 the user explicitly confirmed:

- native AutoByteus has its tool arguments before execution;
- those arguments do not belong on the raw result;
- Codex hosted web search is a special provider-owned lifecycle/compaction case;
- different provider mechanics are correct when they preserve one semantic contract;
- existing names should remain intuitive;
- no `tool_call_update`, combined terminal call, or historical migration is wanted.
