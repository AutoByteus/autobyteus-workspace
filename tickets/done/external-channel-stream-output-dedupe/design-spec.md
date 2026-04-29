# Design Spec

## Current-State Read

The scoped defect is in the server-side external-channel run-output text path, after inbound Telegram routing succeeds and before gateway callback publication.

Current path:

`Telegram inbound update -> ChannelIngressService -> ChannelRunOutputDeliveryRuntime.attachAcceptedDispatch -> Team/Agent run event subscription -> channel-output-event-parser -> ChannelRunOutputEventCollector -> ChannelRunOutputDeliveryService.markReplyFinalized -> ChannelRunOutputPublisher -> ReplyCallbackService/gateway callback outbox -> Telegram`

Runtime evidence from the user's v1.2.84 test proves transport success and pre-transport text corruption:

- New Telegram update `update:109349219` was accepted and associated with team run `team_classroomsimulation_8661ebcb`, member run `professor_69034547d1331e56`, turn `019dc955-4428-76f3-84bd-23de6c912885`.
- `run-output-deliveries.json` recorded status `PUBLISHED` and `gateway-callback-outbox.json` recorded status `SENT`.
- The saved `replyTextFinal` was already duplicated: `Sent the the student student a a hard hard cyclic cyclic inequality inequality problem problem to to solve solve..`.
- Later records for the same live run repeated the same class of defect, e.g. `Yes,, I I’m’m here here..`, `I sent sent feedback feedback:: ...`, and `Glad you you liked liked it it!!`.

The current collector uses `mergeAssistantText(current, incoming)` from `channel-output-event-parser.ts`. That function handles exact duplicates and cumulative snapshots (`incoming.startsWith(current)`) but has no suffix/prefix overlap handling. A stream shaped like:

- `Sent the`
- ` the student`
- ` student a`
- ` a hard`

is assembled as `Sent the the student student a a hard` instead of `Sent the student a hard`.

The current parser also collapses all parsed text into a single `text` field, losing whether it came from a stream fragment, snapshot, or final segment. That ambiguity makes the collector rely on a generic merge instead of owning a clear text-assembly invariant.

## Intended Change

Make external-channel run-output text assembly deterministic and overlap-safe.

The fix must:

1. Keep gateway and Telegram transport unchanged.
2. Keep open-session route and callback publication unchanged.
3. Tighten the server external-channel parser/collector boundary so the collector knows whether incoming text is a stream fragment or final/snapshot text.
4. Assemble stream fragments with a single owned overlap-safe algorithm.
5. Prefer final text snapshots over stream fragments when available.
6. Add unit/runtime coverage that reproduces the duplicated-word symptom and verifies clean output.

## Terminology

- `Subsystem / capability area`: server external-channel runtime delivery.
- `Parsed output event`: the parser-owned normalized event shape consumed by the collector.
- `Stream fragment`: text produced by a `SEGMENT_CONTENT` event; may be a true delta, a cumulative snapshot, or a suffix/prefix-overlapping fragment depending on runtime backend.
- `Final text snapshot`: authoritative text from a `SEGMENT_END`/completed item when available.
- `Reply finalization`: persisting `replyTextFinal` on a run-output delivery record before publishing the gateway callback.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> reusable owned structures -> final file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Gateway stale inbox states (`COMPLETED_ROUTED`) are explicitly out of scope for this ticket.
- Do not add compatibility parsing, schema fallbacks, runtime-data migration, or gateway inbox cleanup in this change.
- The in-scope replacement is clean-cut: the external-channel collector must stop using an ambiguous append-only merge for all text shapes.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Accepted external-channel inbound dispatch | Gateway callback outbox receives final reply text | `ChannelRunOutputDeliveryRuntime` | Shows the business path where Telegram delivery works but text is finalized incorrectly. |
| DS-002 | Bounded Local | Parsed run event text | `ChannelRunOutputCollectedFinal.replyText` | `ChannelRunOutputEventCollector` | This is the exact local assembly loop that must own no-duplicate text. |
| DS-003 | Return-Event | Team/agent runtime stream event | External-channel reply publication | `ChannelRunOutputDeliveryRuntime` plus collector/parser off-spine concerns | Shows why this is server event handling, not gateway transport. |

## Primary Execution Spine(s)

`Accepted Telegram dispatch -> ChannelRunOutputDeliveryRuntime link -> Team/Agent run event -> ChannelOutputEventParser -> ChannelRunOutputEventCollector -> ChannelRunOutputDeliveryService.replyTextFinal -> ChannelRunOutputPublisher -> ReplyCallbackService/gateway callback outbox`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | After an inbound Telegram message is accepted, the runtime observes the target agent/team turn. When eligible output events arrive, the runtime parses and collects text, finalizes one reply record, and publishes one callback. | Accepted dispatch, run-output runtime, delivery record, callback publisher | `ChannelRunOutputDeliveryRuntime` | Binding resolution, eligibility policy, delivery persistence, callback publishing. |
| DS-002 | For each observed turn, parsed text fragments are accumulated into one clean reply. Stream fragments are overlap-safe; final snapshots replace accumulated stream text. | Parsed event, pending turn, collected final reply | `ChannelRunOutputEventCollector` | Text parser metadata, overlap-aware text assembler. |
| DS-003 | Team/agent stream events flow back from runtime to the external channel after the user has opened the route. The callback transport should carry the already-clean reply text. | Team/agent event, parsed event, finalized reply, callback outbox | Runtime plus collector | Gateway callback target resolution and outbox idempotency. |

## Spine Actors / Main-Line Nodes

- `ChannelIngressService`: accepts inbound external messages and calls `attachAcceptedDispatch` after dispatch.
- `ChannelRunOutputDeliveryRuntime`: attaches runtime links, checks eligibility, owns delivery record progression, and publishes finalized replies.
- `ChannelOutputEventParser`: normalizes runtime events into a stable external-channel parsed event contract.
- `ChannelRunOutputEventCollector`: owns per-turn text assembly and final reply selection.
- `ChannelRunOutputDeliveryService`: persists `replyTextFinal` and delivery status.
- `ChannelRunOutputPublisher` / `ReplyCallbackService`: enqueues/sends callback payloads; not responsible for fixing text.

## Ownership Map

| Node | Owns |
| --- | --- |
| `ChannelRunOutputDeliveryRuntime` | Link lifecycle, event subscription, eligibility invocation, observe/finalize/publish sequencing. |
| `ChannelOutputEventParser` | Event shape recognition, turn id extraction, text-source classification, low-level field normalization. |
| `ChannelRunOutputEventCollector` | Pending-turn state, stream/final text assembly invariant, final reply selection at turn completion. |
| Text assembler helper | Pure string assembly policy for delta/snapshot/overlap-safe fragment application. |
| `ChannelRunOutputDeliveryService` | Delivery key, persisted record lifecycle/status, persisted final text field. |
| `ReplyCallbackService` and gateway callback outbox | Callback idempotency, dispatch target resolution, callback payload enqueue/send. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `parseDirectChannelOutputEvent` / `parseTeamChannelOutputEvent` | `ChannelOutputEventParser` parsing concern | Runtime calls these as entry functions for direct/team event normalization. | Final reply assembly or callback publishing. |
| `ChannelRunOutputPublisher.publishRecord` | `ReplyCallbackService` and delivery service | Converts a finalized delivery record into callback publication. | Text dedupe, stream merging, or final reply recovery policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Ambiguous `mergeAssistantText` usage as the one-size-fits-all stream/final merge | It cannot distinguish true deltas, snapshots, overlaps, and final text; it causes duplicated output for overlap fragments. | Collector-owned text assembly plus parser text-source metadata. | In This Change | The function may be removed or replaced with a renamed pure helper that explicitly documents overlap-safe stream assembly. |
| Any idea of gateway-side text cleanup | Gateway only transports callback payloads and should not rewrite content. | Server external-channel collector/parser. | In This Change | No gateway code changes. |

## Return Or Event Spine(s) (If Applicable)

`Team/Agent runtime event -> runtime subscription listener -> parseDirect/parseTeam output event -> eligibility policy -> observe turn -> collector.processEvent -> delivery finalization -> callback outbox`

The return path is important because the user-visible Telegram response is emitted even when the user did not send a new message at that exact moment. This ticket only fixes the content assembled on that return path.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ChannelRunOutputEventCollector`
- Chain: `SEGMENT_CONTENT fragment -> apply stream-fragment text assembly -> pending assistant text -> SEGMENT_END final snapshot -> pending final text -> TURN_COMPLETED -> collected final reply`
- Why it matters: the duplicate-word bug lives in this local state machine; no transport layer can safely repair it later.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Text-source classification | DS-002, DS-003 | Parser/collector boundary | Identify whether parsed text is stream fragment or final/snapshot text. | Prevents ambiguous append behavior. | Collector guesses from raw payload internals and violates parser boundary. |
| Pure text assembly helper | DS-002 | `ChannelRunOutputEventCollector` | Apply exact duplicate, cumulative snapshot, and suffix/prefix overlap rules deterministically. | Keeps string policy unit-testable without runtime setup. | Runtime orchestration becomes a string-manipulation blob. |
| Delivery persistence | DS-001 | Runtime | Persist finalized reply and status. | Existing durable delivery model remains correct. | Persistence starts owning text cleanup. |
| Gateway callback outbox | DS-001 | Publisher/callback service | Deliver already-finalized payload idempotently. | Existing transport semantics remain correct. | Gateway would rewrite product content. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Parse direct/team runtime events for external channel | `src/external-channel/runtime/channel-output-event-parser.ts` | Extend | Existing parser already owns event normalization. | N/A |
| Assemble per-turn run-output reply text | `src/external-channel/runtime/channel-run-output-event-collector.ts` | Extend | Existing collector already owns pending turn state and final reply selection. | N/A |
| Pure overlap-safe string policy | External-channel runtime text assembly | Create New or extract from parser into collector-adjacent helper | Current merge helper is in the parser but used as collector policy; moving/extracting clarifies ownership. | Existing parser file should not own accumulation policy. |
| Transport delivery | Gateway callback runtime/outbox | Reuse unchanged | Transport succeeds and should remain content-agnostic. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `external-channel/runtime` | Runtime event parsing, eligibility, output collection, publication sequencing | DS-001, DS-002, DS-003 | `ChannelRunOutputDeliveryRuntime`, collector/parser | Extend | All source changes should stay here except tests. |
| `external-channel/services` | Delivery record persistence and recovery | DS-001 | Runtime | Reuse unchanged | Do not use recovery as the primary fix. |
| Messaging gateway runtime | Telegram transport | DS-001 | Callback service target | Reuse unchanged | Explicitly out of scope. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `channel-output-event-parser.ts` | external-channel/runtime | Parser | Parse event text and classify text source. | It already owns direct/team event normalization. | Parsed output event type. |
| `channel-run-output-event-collector.ts` | external-channel/runtime | Collector | Manage pending turns and choose final reply. | It already owns per-delivery pending state. | Text assembler helper. |
| `channel-output-text-assembler.ts` (new) or a clearly named collector-adjacent pure function | external-channel/runtime | Collector support | Pure string assembly for stream fragments and final snapshots. | Prevents parser from owning string accumulation policy and gives direct unit coverage. | N/A |
| `channel-output-event-parser.test.ts` | tests | Parser tests | Source classification and final text parsing. | Existing parser test location. | N/A |
| `channel-run-output-event-collector.test.ts` (new) or runtime test extension | tests | Collector tests | Overlap-safe assembly, final snapshot precedence. | Directly tests the bug owner. | N/A |
| `channel-run-output-delivery-runtime.test.ts` | tests | Runtime integration unit | Confirm published callback text is clean for overlapping fragments. | Existing open-output runtime test coverage. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Stream/final text assembly rules | `src/external-channel/runtime/channel-output-text-assembler.ts` | external-channel/runtime | Parser and collector should not each invent string merge behavior. | Yes | Yes | A generic natural-language sanitizer or gateway content rewriter. |
| Parsed event text source | Existing `ParsedChannelOutputEvent` type | external-channel/runtime | Collector needs source semantics without peeking into raw payload. | Yes | Yes | A kitchen-sink runtime event model. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ParsedChannelOutputEvent.text` | Yes, parsed text payload only | Yes | Medium today because source is ambiguous | Add `textKind` / `textSource` so `text` does not imply one merge rule. |
| `ParsedChannelOutputEvent.textKind` | Yes, how collector should treat text | Yes | Low | Values should be narrow, e.g. `STREAM_FRAGMENT`, `FINAL_TEXT`. |
| Text assembler helper input | Yes, current plus incoming string | Yes | Low | Keep as pure functions, not a broad event object. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts` | external-channel/runtime | Parser | Return parsed event text plus source kind; parse final text from text segment end/completed item when available. | Existing parser boundary; no final assembly. | `ParsedChannelOutputEvent`. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-event-collector.ts` | external-channel/runtime | Collector | Apply parsed events to pending turn state; stream fragments go through overlap-safe assembly; final text snapshots replace accumulated final text. | Existing pending-turn owner. | Text assembler helper. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-text-assembler.ts` | external-channel/runtime | Collector support | Pure functions: `appendOutputTextFragment`, `chooseFinalOutputText` (names can vary). | Keeps string policy isolated and testable. | None. |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-event-collector.test.ts` | tests | Collector tests | Reproduce overlapping fragment duplication and final-snapshot precedence. | Directly guards the bug. | N/A |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-output-event-parser.test.ts` | tests | Parser tests | Verify parsed text source classification. | Existing parser coverage. | N/A |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts` | tests | Runtime unit | Verify published callback reply is clean from overlapping coordinator stream fragments. | Confirms end-to-end server-side behavior before gateway. | N/A |

## Ownership Boundaries

- `ChannelRunOutputDeliveryRuntime` must not manipulate text beyond calling parser/collector and persisting the final returned reply.
- `ChannelOutputEventParser` must not accumulate across events; it only extracts fields and classifies the parsed text source.
- `ChannelRunOutputEventCollector` is the authoritative owner of per-turn text assembly.
- Gateway callback services must treat `replyText` as opaque content.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ChannelRunOutputEventCollector.processEvent` | Pending turn map, stream/final text assembly | `ChannelRunOutputDeliveryRuntime` | Runtime directly appending strings or cleaning duplicates before publish. | Add parsed text/source fields or collector methods. |
| `parseDirectChannelOutputEvent` / `parseTeamChannelOutputEvent` | Payload shape extraction and text source classification | `ChannelRunOutputDeliveryRuntime` | Runtime or collector reading raw backend payload fields. | Extend `ParsedChannelOutputEvent`. |
| `ReplyCallbackService.publishRunOutputReply` | Callback target/outbox mechanics | Publisher/runtime | Gateway/service rewriting reply text. | Fix collector/parser upstream. |

## Dependency Rules

Allowed:

- Runtime depends on parser, eligibility policy, collector, delivery service, publisher.
- Collector depends on parsed event type and text assembler helper.
- Parser depends on runtime event domain types only.
- Tests may construct parsed events directly for collector coverage.

Forbidden:

- Gateway code depending on server collector internals.
- Runtime manually deduplicating text after collector output.
- Parser keeping pending state across events.
- Collector reaching into raw backend-specific payload internals instead of parsed event fields.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ParsedChannelOutputEvent` | Normalized runtime output event | Event type, run/team/member ids, turn id, parsed text, text source kind | Explicit `agentRunId`, optional `teamRunId`, optional member ids, `turnId` | Add narrow `textKind` rather than a generic payload leak. |
| `ChannelRunOutputEventCollector.processEvent({ deliveryKey, event })` | Pending turn output collection | Apply one parsed event and maybe return final reply | `deliveryKey` + parsed event `turnId` | Keep caller contract unchanged if possible; only parsed event type expands. |
| `appendOutputTextFragment(current, incoming)` | Pure stream assembly | Merge true deltas, cumulative snapshots, and suffix/prefix overlaps | Strings only | Unit-test thoroughly. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ParsedChannelOutputEvent` | Yes after adding source kind | Yes | Low | Keep source kind narrow. |
| `ChannelRunOutputEventCollector.processEvent` | Yes | Yes | Low | Do not add transport concerns. |
| `ReplyCallbackService.publishRunOutputReply` | Yes | Yes | Low | Leave unchanged. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Output event parser | `ChannelOutputEventParser` | Yes | Low | Keep. |
| Output event collector | `ChannelRunOutputEventCollector` | Yes | Low | Keep. |
| Text assembler helper | `channel-output-text-assembler` | Yes | Low | Name by concrete concern, not helper/support. |

## Applied Patterns (If Any)

- Bounded local state machine inside `ChannelRunOutputEventCollector`: pending turn receives segment content/end/completion events and produces one final reply.
- Pure function extraction for text assembly: deterministic, unit-testable policy around one collector-owned concern.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts` | File | Parser | Normalize direct/team runtime output events and classify text source. | Existing runtime parser boundary. | Pending turn state, gateway callbacks. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-event-collector.ts` | File | Collector | Pending turn collection and final reply selection. | Existing collector boundary. | Raw backend payload parsing, gateway outbox. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-text-assembler.ts` | File | Text assembly policy | Overlap-safe stream fragment and final snapshot selection helpers. | Adjacent to collector under runtime scope. | Transport-specific formatting, grammar/natural-language cleanup. |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-event-collector.test.ts` | File | Test | Collector-owned bug reproduction and prevention. | Unit test near runtime tests. | Live Telegram/gateway setup. |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts` | File | Test | Server-side publish behavior from overlapping fragments. | Existing runtime tests. | Gateway inbox compatibility coverage. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/external-channel/runtime` | Main-Line Domain-Control plus runtime-owned off-spine parser/collector | Yes | Low | Current flat runtime folder is acceptable for this small scoped fix. |
| `tests/unit/external-channel/runtime` | Test mirror | Yes | Low | Existing test organization. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Overlap-safe stream assembly | Current `Sent the` + incoming ` the student` => `Sent the student` | Append blindly => `Sent the the student` | This exactly matches the user's visible bug class. |
| Final text precedence | Stream fragments assemble noisy text, `SEGMENT_END` supplies `Sent the student a hard problem.`; final reply uses final text | Merge final text onto noisy stream or ignore final text | Final snapshots are more authoritative than stream fragments. |
| Gateway boundary | Gateway sends `replyText` unchanged | Gateway regex-deletes repeated words | Gateway must stay content-agnostic and not corrupt legitimate text. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Parse legacy gateway inbox statuses while doing this fix | Earlier runtime cleanup exposed stale `COMPLETED_ROUTED` records | Rejected | Out of scope per user; no gateway code changes. |
| Regex post-process duplicated words in gateway callback payload | It could hide the observed symptom | Rejected | Fix parser/collector assembly before persistence. |
| Keep old ambiguous `mergeAssistantText` behavior and add special case after finalization | It is minimal code churn | Rejected | Replace/rename with explicit stream/final text assembly semantics and tests. |

## Derived Layering (If Useful)

Layering is simple and ownership-led:

- Runtime orchestration: `ChannelRunOutputDeliveryRuntime`
- Runtime event normalization: `ChannelOutputEventParser`
- Runtime local state/assembly: `ChannelRunOutputEventCollector` + text assembler helper
- Persistence/publication: delivery service + publisher + callback service
- Transport: gateway, unchanged

## Migration / Refactor Sequence

1. Add/adjust tests that fail on current behavior:
   - overlapping stream fragments reproduce duplicated words;
   - cumulative snapshots still collapse to latest snapshot;
   - true deltas still append normally;
   - final text snapshot supersedes accumulated stream text;
   - runtime publishes clean reply text for an overlapping coordinator stream.
2. Extend `ParsedChannelOutputEvent` with a narrow text source/kind and, if useful, segment id.
3. Update parser logic:
   - `SEGMENT_CONTENT` text events become stream fragments;
   - `SEGMENT_END` text/completed item events become final text only when text exists;
   - do not treat final segment text as another stream delta.
4. Extract/replace `mergeAssistantText` with explicit overlap-safe stream assembly under collector ownership.
5. Update `ChannelRunOutputEventCollector` to use stream assembly for content and final selection for segment end.
6. Run targeted unit tests.
7. Confirm no gateway files changed.

## Key Tradeoffs

- Overlap-safe stream assembly is more robust than append-only merging and does not require live Telegram setup.
- Final snapshot precedence is cleaner than trying to infer all possible stream chunk semantics from runtime backends.
- The fix remains scoped to external-channel output delivery; broader Codex streaming UI behavior can be addressed separately only if evidence shows the same issue outside external channels.

## Risks

- Without raw event IDs, exact duplicate fragments and intentional repeated text can be hard to distinguish. Tests should focus on preserving normal deltas and snapshots while removing observed overlap duplicates.
- If a backend emits only stream fragments and no final text, the overlap-safe assembler must remain conservative enough not to rewrite legitimate content aggressively.
- If parser changes broaden `SEGMENT_END` text recognition, ensure non-text tool/file segments are not included in external replies.

## Guidance For Implementation

- Keep all source changes inside `autobyteus-server-ts/src/external-channel/runtime` unless tests reveal parser support needs a small domain type adjustment.
- Prefer a pure helper with tests over inline string logic in the runtime.
- Do not touch messaging-gateway code, inbox status schemas, gateway runtime data, binding cleanup, or release packaging in this task.
- Include the exact observed symptom in a test fixture string or chunk sequence so regression is obvious.
- Recommended test command after implementation: `pnpm vitest run tests/unit/external-channel/runtime/channel-output-event-parser.test.ts tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts` plus the new collector test file if added.
