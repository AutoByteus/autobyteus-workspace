# Design Spec

## Current-State Read

The earlier `tool-result-trace-simplification` change established one split raw lifecycle across native AutoByteus, Codex, and Claude:

- `tool_call` contains compound identity context, `tool_name`, and authoritative `tool_args`;
- `tool_result` contains `tool_call_id`, `tool_result`, and `tool_error` but deliberately omits both name and arguments.

The current owners are already correct:

- Native `MemoryManager` owns lifecycle matching and validates that a result has a persisted call. It already reads the matched call name for Working Context.
- Server `RuntimeToolTraceSequencer` owns normalized runtime tool lifecycle state. It already retains/hydrates the canonical call name and uses it for Working Context.
- `RawTraceItem` owns permissive physical serialization and already supports `tool_name` on any historical record.
- `RunMemoryWriter` is a thin server persistence facade and accepts discriminated trace inputs.
- `buildToolInteractions(...)` owns logical reconstruction and already reads result-side names for historical data.

The missing invariant is local to the two lifecycle owners: future result evidence discards the canonical name even though the matched lifecycle already has it, and a supplied terminal name is not checked against the canonical name. The target must preserve compound identity, call-only arguments, call-before-result ordering, duplicate suppression, provider argument-readiness behavior, and version-agnostic historical reads.

## Intended Change

Refine the strict split contract to:

- `tool_call`: `(turn_id, tool_call_id)`, canonical `tool_name`, authoritative `tool_args`;
- `tool_result`: `(turn_id, tool_call_id)`, verified canonical `tool_name`, `tool_result`, `tool_error`;
- `tool_args` remain forbidden on future results.

Both native and server result writers receive the canonical name from their already-matched call lifecycle. When a terminal observation supplies a non-empty name and a known lifecycle name already exists, the lifecycle owner compares them. A mismatch is rejected/skipped and diagnosed before result persistence or completion marking. A missing terminal name is allowed when the known call state supplies the canonical name. A terminal-first server event may construct the call and result from the same self-contained canonical name/arguments under the existing call-before-result rule.

## Supplemental Solution Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: Behavior Change
- Current design issue found: Yes
- Root cause classification: Missing Invariant
- Refactor needed now: No
- Evidence: Native `MemoryManager` and server `RuntimeToolTraceSequencer` already own correlation, canonical name state, write sequencing, deduplication, and reconstruction. Only their result serialization and terminal-name validation are incomplete.
- Design response: Tighten those existing owners and the server discriminated result DTO; do not introduce a new service, helper subsystem, or trace version.
- Refactor rationale: Existing owner boundaries, folder placement, and compound identity model remain healthy. The change is a small contract correction within them.
- Intentional deferrals and residual risk: Historical conflicting result-side names remain interpreted by the existing historical projection because there is no schema version and no migration. Future writes prevent new conflicts.

## Terminology

- **Canonical tool name**: the normalized non-empty name retained by the matched call lifecycle.
- **Observed terminal name**: an optional non-empty name present on a terminal event.
- **Verified result name**: the canonical call name after any supplied terminal name has been checked for equality.

## Design Reading Order

1. Existing JSONL data stays directly usable with no migration.
2. Native and server lifecycle owners verify/derive the result name.
3. Existing writers serialize the verified name.
4. Existing readers consume both older name-less results and new name-bearing results.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace the current name-less future-write contract; do not retain a flag or dual writer.
- No files or owners become obsolete. Remove type-level `toolName?: never` from the server result variant and replace it with required `toolName: string`.
- Do not add old/new schema branches. Historical sparse and superset rows remain readable through the existing generic optional-field parser.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Agent raw trace JSONL active/archive segments; existing results may be name-less or historical supersets with names/arguments.
- Relevant change: Future `tool_result` rows regain the existing optional physical field `tool_name`; no field is renamed or removed and arguments remain absent.
- Normal reader/writer behavior and evidence: `RawTraceItem.fromDict(...)` already treats `tool_name` as optional; `toDict()` already serializes it when present. Server normalizers and logical interaction builders already accept it.
- Required semantics and invariants under direct use: Old results remain correlated by compound identity; new results additionally carry verified descriptive identity.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: The name is already stored on calls and is small/non-secret relative to excluded arguments. Rewriting existing JSONL would add I/O and corruption risk without correctness benefit.
- Decision: `Directly Usable — No Migration`
- Decision rationale: Current version-agnostic readers already support both shapes. Future writers can begin emitting the field independently; backfill provides no required semantic benefit.
- Acceptance criteria or design constraints supported: `AC-001`–`AC-009`; no migration, schema version, startup gate, compatibility writer, or historical rewrite.

### Migration Plan

Not applicable.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Native model-issued call | Native name-bearing raw result + Working Context result | `MemoryManager` | Verifies matched-call identity/name and persists terminal evidence |
| DS-002 | Primary End-to-End | Codex/Claude normalized lifecycle event | Server name-bearing raw result + Working Context result | `RuntimeToolTraceSequencer` | Preserves one shared trace contract across server runtimes |
| DS-003 | Return-Event | Stored call lifecycle | Accepted/rejected terminal observation | Native/server lifecycle owner | Prevents conflicting name attribution |
| DS-004 | Bounded Local | Ordered raw JSONL rows | Logical tool interaction | Core memory read subsystem | Keeps old and new rows directly readable |

## Primary Execution Spine(s)

- Native: `ToolResultEvent -> MemoryManager -> matched ToolTraceLifecycleGroup -> buildNativeToolResultTrace -> RawTrace store / Working Context`
- Server: `Provider converter -> AgentRunEvent -> RuntimeMemoryEventAccumulator -> RuntimeToolTraceSequencer -> RunMemoryWriter -> RawTrace store / Working Context`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Native ingestion matches compound identity, verifies any supplied name, and passes the call's canonical name to result construction. | Result event, lifecycle group, result trace | `MemoryManager` | Serialization and tests |
| DS-002 | Server sequencing resolves or constructs the call state, validates a supplied terminal name against known state, and passes canonical state name to both raw and snapshot writes. | Runtime event, tool state, write operation | `RuntimeToolTraceSequencer` | Provider normalization and writer DTO |
| DS-003 | A conflicting supplied name stops terminal persistence; absence uses known call state. | Known name, observed name, terminal outcome | Corresponding lifecycle owner | Safe diagnostics |
| DS-004 | Readers parse optional result names; new equal names are harmless duplicates while historical result-side overrides remain readable. | Physical rows, lifecycle group, interaction | Core logical read owner | Historical supersets |

## Spine Actors / Main-Line Nodes

- `MemoryManager`
- `RuntimeToolTraceSequencer`
- `RunMemoryWriter`
- `RawTraceItem` / physical store
- `buildToolInteractions(...)`

## Ownership Map

- `MemoryManager`: native batch validation, compound lifecycle matching, terminal-name integrity, raw/Working Context sequencing.
- `RuntimeToolTraceSequencer`: server lifecycle state, canonical name retention, provider-independent terminal integrity, call-before-result ordering, dedupe.
- `RunMemoryWriter`: trace-specific physical construction only; it must not resolve or compare names.
- `RawTraceItem`: optional physical field serialization/deserialization; it must not enforce lifecycle policy.
- Logical read subsystem: reconstruct full interactions and retain historical overlay behavior; it must not feed historical result names into new writer decisions.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RuntimeMemoryEventAccumulator.recordToolResult` | `RuntimeToolTraceSequencer` | Dispatch normalized runtime events | Name comparison or persistence shape |
| `RunMemoryWriter.write` | `RuntimeToolTraceSequencer` for lifecycle policy | Serialize already-decided writes | Correlation, canonical-name selection, mismatch policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Name-less future `tool_result` contract | It discards useful verified descriptive identity | Required canonical `toolName` in native/server result construction | In This Change | Historical name-less rows remain readable data, not a retained writer path |
| Server `toolName?: never` result restriction | It enforces the superseded contract | `toolName: string` on `RuntimeMemoryToolResultTraceInput` | In This Change | `toolArgs?: never` remains |
| Docs/tests asserting name absence | They encode the superseded requirement | New verified-name assertions | In This Change | Preserve argument-absence assertions |

## Return Or Event Spine(s) (If Applicable)

`Terminal event -> resolve compound lifecycle -> compare observed non-empty name if present -> reject/diagnose mismatch OR derive canonical call name -> append name-bearing result -> mark result written`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MemoryManager` native result batch.
  - `Normalize identities -> match all calls -> validate names -> prepare traces -> atomic store append -> update lifecycle/snapshot`.
  - All validation, including name conflicts, occurs before the batch store mutation.
- Parent owner: `RuntimeToolTraceSequencer`.
  - `Resolve identity -> load/create tool state -> validate observed name -> ensure call ready/written -> persist result -> mark complete`.
  - Mismatch returns before raw/snapshot mutation and before `resultRawTraceId` assignment.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Provider name normalization | DS-002 | Sequencer | Convert wire names to canonical app names before memory | Keeps memory provider-agnostic | Sequencer would branch on provider/tool family |
| Raw serialization | DS-001, DS-002 | Lifecycle owners | Serialize required result name and outcome | Stable JSONL contract | Writer could invent lifecycle policy |
| Historical read overlay | DS-004 | Logical read owner | Preserve older effective result-side evidence | No migration | Historical rules could leak into future writes |
| Diagnostics | DS-003 | Lifecycle owners | Report safe identity/name mismatch | Makes rejection observable | Persistence could be polluted with fabricated result evidence |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Native verification | Core `MemoryManager` lifecycle ingestion | Extend | Already owns matched call validation | N/A |
| Server verification | `RuntimeToolTraceSequencer` | Extend | Already owns canonical state and terminal sequencing | N/A |
| Serialization | `RawTraceItem` and `RunMemoryWriter` | Extend | Already support/construct trace fields | N/A |
| Historical reads | Core logical interaction builder | Reuse | Already reads optional result names | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Core memory ingestion | Native name verification/persistence | DS-001, DS-003 | `MemoryManager` | Extend | No new subsystem |
| Server agent memory | Runtime name verification/result DTO/write | DS-002, DS-003 | `RuntimeToolTraceSequencer` | Extend | Shared by Codex/Claude |
| Core memory reads | Old/new logical projection | DS-004 | Read subsystem | Reuse | Comment/docs may need clarification |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/memory-manager.ts` | Core memory | Native lifecycle owner | Match/verify canonical name before mutation | Existing native policy owner | `ToolCallIdentity`/lifecycle group |
| `autobyteus-ts/src/memory/raw-trace-ingestion.ts` | Core memory | Trace constructor | Accept verified canonical name and assign it | Existing raw constructor | `RawTraceItem` |
| `autobyteus-server-ts/src/agent-memory/services/runtime-tool-trace-sequencer.ts` | Server memory | Server lifecycle owner | Conditional terminal-name verification and canonical write | Existing sequencer | Runtime tool state |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | Server memory | Write contract | Require name, forbid args on result | Existing discriminated DTO | N/A |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Server memory | Thin persistence facade | Copy verified input name into `RawTraceItem` | Existing writer | `RawTraceItemOptions` |

## Reusable Owned Structures Check

No new shared structure is warranted. Native and server owners operate on different event/state types; extracting a generic name verifier would add indirection without owning policy. Both should implement the same small invariant locally with focused tests.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `RuntimeMemoryToolResultTraceInput` | Yes | Yes—args remain forbidden | Low | Make canonical `toolName` required |
| `RawTraceItem` | Yes | N/A—physical superset model | Low | No shape change needed |
| `ToolCallIdentity` | Yes | Yes | Low | Continue as sole correlation identity |

## Final File Responsibility Mapping

Same as draft mapping; no extraction is justified. Test and durable documentation files are updated alongside their owned production paths.

## Ownership Boundaries

Lifecycle owners determine whether a result is valid and which name is canonical. Writers only serialize that decision. Readers may interpret historical data but cannot authorize future writes. Provider converters normalize wire names but cannot decide raw lifecycle correlation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemoryManager.ingestToolResults` | lifecycle groups, native trace constructor, store/snapshot mutation | Native agent loop | Direct result trace append without call/name verification | Extend ingestion API |
| `RuntimeToolTraceSequencer.recordTerminal` | tool state, call/result sequencing, writer operations | Runtime accumulator | Accumulator/writer comparing or inventing names independently | Extend sequencer behavior |

## Dependency Rules

- Native trace construction receives a canonical name only after `MemoryManager` has matched and validated the call.
- Server writer input receives a canonical name only from `RuntimeToolTraceSequencer` state.
- `RunMemoryWriter` must not inspect prior traces to resolve names; reconstruction remains sequencer initialization through its existing facade.
- Readers must not feed historical result-side name overrides into lifecycle state or writer decisions.
- Provider-specific name branches in core/server memory are forbidden.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MemoryManager.ingestToolResults` | Native terminal batch | Atomic validation/persistence | `(turnId, toolInvocationId)` | Adds name equality check |
| `buildNativeToolResultTrace` | Verified native result record | Physical construction | Registration + canonical tool name | Must not select canonical source itself |
| `RuntimeToolTraceSequencer.recordTerminal` | Server terminal observation | Correlate, verify, sequence | Compound identity resolved from event/state | Missing observed name allowed if state known |
| `RunMemoryWriter.write` | Server write operation | Physical append/snapshot update | Strict discriminated trace input | Result name required |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Native result ingestion | Yes | Yes | Low | None beyond name invariant |
| Server terminal sequencing | Yes | Yes | Low | Compare known/observed name before merge/write |
| Writer result DTO | Yes | Yes | Low | Require `toolName`, continue forbidding args |

## Main Domain Subject Naming Check

| Node / Subject | Name | Self-Descriptive? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Native result constructor | `buildNativeToolResultTrace` | Yes | Low | Name canonical parameter explicitly |
| Server lifecycle owner | `RuntimeToolTraceSequencer` | Yes | Low | None |
| Server result input | `RuntimeMemoryToolResultTraceInput` | Yes | Low | Refine fields only |

## Applied Patterns (If Any)

- Existing lifecycle state machine inside `RuntimeToolTraceSequencer` remains the server bounded-local pattern.
- Existing thin writer facade remains persistence boundary. No new pattern is introduced.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/memory-manager.ts` | File | Native lifecycle | Verify result name against call | Current owner | Provider branches |
| `autobyteus-ts/src/memory/raw-trace-ingestion.ts` | File | Raw construction | Serialize passed canonical name | Current constructor | Correlation lookup |
| `autobyteus-server-ts/src/agent-memory/services/runtime-tool-trace-sequencer.ts` | File | Server lifecycle | Verify/derive/persist name | Current owner | Provider-specific names |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | File | Server write contract | Require result name; forbid result args | Current DTO owner | Optional kitchen-sink fields |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | File | Persistence facade | Copy result name | Current writer | Lifecycle validation |
| Existing focused unit/integration/E2E tests | Files | Corresponding owners | Assert shape and mismatch/missing-name paths | Existing coverage locations | Redundant broad fixtures |
| Existing memory/run-history/work-trace docs | Files | Durable documentation | Replace “minimal means no name” statements | Contract changed | Migration guidance |

## Folder Boundary Check

Existing folders already reflect core memory, server memory services/domain/store, and projection concerns. No folder or module changes are justified for this narrow invariant correction.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Result write | `{tool_call_id, tool_name, tool_result, tool_error}` | Restoring `tool_args` on result | Keeps useful identity without large duplication |
| Canonical source | `persist matchedCall.toolName` after optional equality check | `persist event.toolName` blindly | Prevents false attribution |
| Missing name | Known call `run_bash` + name-less interruption -> result `run_bash` | Reject every name-less terminal | Existing valid lifecycle paths omit names |
| Conflict | Call `run_bash` + terminal `read_file` -> skip/diagnose | Choose either name and persist | Correlation may be malformed |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Feature flag for result names | Staged rollout | Rejected | All upgraded writers emit the refined shape |
| Schema version / old-new reader branch | Old results lack name | Rejected | Existing optional-field reader handles both |
| Historical backfill | Uniform physical rows | Rejected | Preserve old data unchanged; no semantic need |
| Dual name-less/name-bearing writer | Mixed deployments | Rejected | One future-write contract; readers remain version-agnostic |

## Derived Layering (If Useful)

`Provider/native event boundary -> lifecycle owner/invariant -> thin writer/serializer -> physical store -> logical read projection`.

## Change / Refactor Sequence

1. Tighten native ingestion to compare a supplied non-empty event name with the matched call name before any batch mutation.
2. Pass the canonical matched-call name into `buildNativeToolResultTrace` and serialize it.
3. Make server result trace input require `toolName` while continuing to forbid `toolArgs`.
4. In `RuntimeToolTraceSequencer`, compare a supplied terminal name against known state before merging/writing; skip/log conflicts and leave lifecycle incomplete.
5. Pass canonical state name into server result trace input and have `RunMemoryWriter` copy it to `RawTraceItem`.
6. Update focused tests for native/server success, null success, error, denial, interruption, reconstructed name-less terminal, mismatch, serialization, duplicate suppression, and historical reads.
7. Update durable docs that currently define results as name-less/minimal. “Minimal result” should now mean no arguments, not no name.
8. Run source checks and downstream API/E2E coverage through the normal team flow. No migration step exists.

## Key Tradeoffs

- Adds a small duplicated string to gain independently understandable terminal evidence.
- Retains correlation joins for arguments and full lifecycle semantics; the name is resilience/observability denormalization, not a replacement identity.
- Conditional validation accommodates legitimate name-less terminal events while rejecting explicit conflicts.

## Risks

- Comparing unnormalized provider wire names could reject valid events; existing provider converters must remain the normalization boundary.
- Marking a conflict complete before returning would suppress a later valid terminal; completion state must change only after successful write.
- Existing comments/tests/docs call a name-less result “minimal”; all authoritative guidance must be aligned.
- Historical result names may conflict with calls; current historical overlay remains intentionally untouched without schema branching.

## Guidance For Implementation

- Keep the patch narrow; do not restore arguments or create a shared helper merely for string comparison.
- Validate before mutation in native batch ingestion.
- On the server, validate before `mergeToolObservation`, result write, or `resultRawTraceId` assignment when a known name exists.
- Use the canonical call/state name for persistence even when the observed name matches.
- Treat blank/absent terminal names as absent when a known canonical state exists; never fabricate a name without a call/constructible lifecycle.
- Log mismatches with turn ID, call ID, expected name, and observed name only; do not log arguments or result payloads.
- Preserve `toolArgs?: never` on server result inputs and assertions that result rows omit `tool_args`.
- Do not add migration, backfill, schema version, feature flag, or compatibility writer.
