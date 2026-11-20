# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517/tickets/in-progress/grok-self-started-turns-517/requirements-doc.md` (Approved by the User 2026-11-20; AC-006 added in SR-003 to verify preserved behavior)
- Upstream Investigation Notes: `.../grok-self-started-turns-517/investigation-notes.md`
- Upstream Solution Revision Record: `.../grok-self-started-turns-517/solution-revision-record.md` (SR-005)
- Reviewed Design Spec: `.../grok-self-started-turns-517/design-spec.md` (SR-005, `Ready`; Intended Change 0 and sequence step 0 revised)
- Supplemental Task Artifacts Reviewed: evidence `evidence/grok-acp-probe.jsonl`, `evidence/grok-acp-probe2.jsonl` (+ scripts), `evidence/IMP-01-sdk-delivery-order.log`, `evidence/imp-diag/`; `implementation-revision-record.md` (IR-001); `Supplements: None`
- Relevant Solution Revision IDs: `SR-001`..`SR-005`
- Architecture Review Revision Record: `.../grok-self-started-turns-517/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: `5`
- Trigger: Solution Designer: SR-005 resolves ARCH-REV-004 AR-007 (SR-004 introduced Intended Change 0 after implementation Design Impact IR-001)
- Prior Review Round Reviewed: `4` (ARCH-REV-004, Fail, AR-007)
- Latest Authoritative Round: `5`
- Current-State Evidence Basis: worktree `codex/grok-self-started-turns-517` @ `ca4317a386`. Rounds 1-2 reads stand. Added in round 5: SDK `jsonrpc.js:733-737, 851-864` (`handleProtocolNotification`: only `$/cancel_request`, aborting an incoming request's signal); `$/cancel_request` absent from every probe, test and source in the worktree. Added in round 4: `acp-client-connection.ts` (whole, 283 lines); ACP SDK 1.5.0 `dist/jsonrpc.js:735-790` (`receiveMessage` resolves responses synchronously via `handleResponse` :826-840; notifications go through `processIncomingMessage`, which awaits handlers and **catches a handler error and logs it** :776-789), `dist/acp.js:636, 680` (`session/update` parsed with `validate.zSessionNotification`), `:980-1100` (`extNotification` receives every notification outside `legacyAgentNotificationMethods`, `_`-prefixed or not), `dist/acp.d.ts:1394` (`Client.sessionUpdate` is required), `package.json` exports (only `.`, `experimental/*`; `zod.gen` not exported); `deepseek-harness-session-profile.ts:51` (`interpretExtNotification: () => []`). Added in round 3: `agent-execution/events/dispatch-processed-agent-run-events.ts:24-49` (a published batch is processed, observed and handed to `onCanonicalEventsDispatched` inside one `dispatchQueue` task); `agent-run.ts:97, 105, 448-455` (every drain path claims inside a later `dispatchQueue` task).

## Routing Classification Review

- Task size: `Medium`; Architectural risk: `High`. SR-003 adds a hand-over inside the shared session, which confirms `High`.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. IR-001 is measured (`evidence/IMP-01-sdk-delivery-order.log`), and I confirmed its cause in the SDK: `handleResponse` resolves synchronously, and notifications are dispatched through awaited handler chains without serialization (`jsonrpc.js:735-790, 826-840`). The SR-003 hand-over is therefore unreachable over the real connection unless delivery is fixed. Intended Change 0 is the right owner and shape.
- Approved requirements / intended behavior understood: REQ-001..REQ-005 unchanged. AC-006 (scripted: a held message survives the hand-over) verifies the preserved input queueing (BEH-002 Preserved, REQ-003, REQ-005). It adds no intended behavior, so it does not reopen approval.
- Relevant existing behavior and evidence confirmed:
  - Probe 1 (provider prompt while idle) and probe 2 A/B frame orders, verified in round 2.
  - An `emit` call becomes one `publish` batch (`acp-agent-run-backend.ts:115-124`). AgentRun observes the whole batch, `TURN_*` included, in one `dispatchQueue` task (`dispatch-processed-agent-run-events.ts:29-49`; `agent-run-input-lifecycle.ts:15-31`). Its input drain claims only in a later queue task (`agent-run.ts:357, 448-455`), so a batch `[TURN_COMPLETED(input), TURN_STARTED(provider), notice]` leaves AgentRun with an identified active turn before any claim. With `activeTurnAppend: "unsupported"` (`acp-agent-run-backend.ts:73`) it claims nothing (`agent-run-input-admission-state.ts:174-185`).
- Scope guardrail confirmed: In-scope UC-001, UC-002; out of scope unchanged; preserved: input turns, existing input queueing, DeepSeek and other runtimes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on: checked, all accurate. Current-State Read (`:151-166, 316-323, 204, 210-221, 266`; `acp-agent-run-backend.ts:100-107, 136`; `agent-run.ts:357, 366-380, 448-455`; `agent-run-input-admission-state.ts:226-237`; Claude cites). The investigation-notes row is corrected (AR-006).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System/User | Pass | Pass (probe 1; probe 2 A) | Pass (DS-001 while idle; DS-003 hand-over) | Confirmed | — |
| BEH-002 (+ preserved input queueing) | User | Pass | Pass (MP-002) | Pass (DS-002: one-batch hand-over keeps the run busy; drain after the provider turn ends) | Confirmed | — |
| BEH-003 | User | Pass | Pass (probe 2 B) | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design-spec l.63-68 | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` | — |
| Refactor decision is explicit | Pass | `No` | — |
| Refactor decision is supported by the concrete design sections | Pass | Triggers recorded with responses: several kinds, reuse, vocabulary (`provider`, GLOSSARY.md), behavior by absence, split sequence (one-batch hand-over) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary: provider turn while idle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| (bounded local) connection inbound stage: read frame → classify → route notification / pass response or request on | Local (SR-004/005) | Pass | Pass — minimal checks → drop+log; per-frame try/catch → log+continue; transform never throws | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Return/event: held message, stop | Pass | Pass (frames 211 → 212 → 215 traced to the drain after the provider turn) | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local: hand-over inside the session | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AcpClientConnection` (SR-004) | Pass | Pass — the SDK keeps request/response; the connection owns notification routing | Pass | Pass | Removes the SDK's notification dispatch from the path; buffering for opening sessions unchanged |
| `AcpAgentRunBackend` | Pass | Pass | Pass | Pass | Comment change only |
| `AcpAgentSession` | Pass | Pass | Pass | Pass | Sole owner of origins, pending provider prompt, hand-over |
| Grok profile | Pass | Pass | Pass | Pass | Pure |
| Converter | Pass | Pass | Pass | Pass | |
| AgentRun | Pass | Pass | Pass | Pass | Unchanged; relies on its existing batch semantics |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Connection → sessions (`AcpSessionFrameHandler`); connection → SDK for requests/responses | Pass | Pass | Pass | Pass | No new dependency |
| Session → profile (effects) → domain sender ids | Pass | Pass | Pass | Pass | |
| Memory accumulator → domain sender ids | Pass | Pass | Pass | Pass | |

Composition / hidden dependencies (Principle 16): `Pass`.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AcpSessionEffect` `prompt_running { promptId, notice: { content, senderId } \| null }` / `prompt_completed { promptId, stopReason }` | Pass | Pass | Pass | Low | Pass |
| `AcpSessionUpdateConverter.notice(content, senderId)` | Pass | Pass | Pass (`turn_id`) | Low | Pass |

Empty indirection check: `Pass` (no port/adapter/wrapper).

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Signals → effects; notice; streaming | Pass | Pass | N/A | Pass | |
| Input holding across the hand-over | Pass | Pass | N/A | Pass | AgentRun batch semantics reused, no AgentRun change |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| ACP session | Pass | Pass | Pass | Pass | |
| Grok backend (`backends/grok/`) | Pass | Pass | Pass | Pass | |
| Domain sender ids / memory / GLOSSARY.md | Pass | Pass | Pass | Pass | |

Kinds and forms: origins `input` and `provider`; provider turn opened while idle or by hand-over; ended by `prompt_completed`, cancel, idle, close/fail; DeepSeek (no effects) unchanged — all traced.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Turn-opening step (both origins, both provider paths) | Pass | N/A | Pass | Pass | |
| Notice sender ids | Pass | Pass | Pass | Pass | |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AcpSessionEffect` new kinds | Pass | Pass | Pass | N/A | Pass | |
| `SYSTEM_TASK_NOTIFICATION` payload | Pass | Pass | Pass | N/A | Pass | |

Derived consumers (Principle 11): `Pass`. Implementation note: handle the new kinds before `applyEffects`' `!isInTurn()` filter and its final usage `else` (`acp-agent-session.ts:266, 272-275`).

One vocabulary (Principle 15): `Pass` — `prompt_running`/`prompt_completed` (Grok's signals), origin `provider` (Claude's existing word), GLOSSARY.md "Provider-started turn", sender `system.grok_provider_turn`; used consistently in every section.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/acp/acp-client-connection.ts` (inbound stage) | Pass | Pass | N/A | Pass | SR-005: containment, minimal validation, `Client.sessionUpdate`/`extNotification` kept as commented no-ops (required by the SDK type / unreachable by construction), every non-`session/update` notification to `routeExt` as today |
| `backends/acp/acp-agent-session-profile.ts` | Pass | Pass | N/A | Pass | |
| `backends/grok/grok-build-session-profile.ts`, `backends/grok/grok-build-prompt-signals.ts` | Pass | Pass | N/A | Pass | Update the comment `:69` and profile doc `:27-32` |
| `backends/acp/session/acp-agent-session.ts` | Pass | Pass | N/A | Pass | |
| `backends/acp/events/acp-session-update-converter.ts` | Pass | Pass | N/A | Pass | |
| `backends/acp/backend/acp-agent-run-backend.ts` | Pass | Pass | N/A | Pass | Comment only |
| `domain/system-task-notification-senders.ts`, `runtime-memory-event-accumulator.ts`, `GLOSSARY.md` | Pass | Pass | N/A | Pass | |
| `tests/e2e/helpers/grok-fake-cli.ts` | Pass | Pass | N/A | Pass | Orders a-c |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/grok/grok-build-prompt-signals.ts` | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Touched files | Pass | N/A | Pass | Pass | Nothing obsolete; SR-002 item 5 dropped |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Two origins; profiles with/without prompt signals | No | Pass | Pass | Real product paths, not old/new pairs |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Run memory raw traces | Not Affected | Pass | Pass | N/A | Pass | |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 0-6 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Idle start, own prompt, end, cancel | Yes | Pass | Pass | Pass | |
| Hand-over with a held message | Yes | Pass | Pass (both failure orders named) | Pass | |

## Material Premise Validation (Only When Needed)

### `MP-001` — A background command ends while an input turn runs

- Reachability: `Reachable`; Grok's response established (probe 2 A). Drives the pending-prompt rule. Resolved.

### `MP-002` — A message held during an input turn whose end Grok follows with its queued prompt

- Reachability: `Reachable` (round 2). SR-003 handles it with the one-batch hand-over. Verified: AgentRun observes the whole batch before any claim (`dispatch-processed-agent-run-events.ts:29-49`, `agent-run.ts:448-455`). The session is never `ready` while a `session/prompt` is outstanding. AC-006 covers it.

### `MP-003` — A stop pressed in the gap between the input prompt's `turn_completed` and its response (frames 211-215, same millisecond in probe 2)

- Initiating basis: user stop, landing in the few milliseconds between those frames
- Path: `cancel(inputTurnId)` → `session/cancel`. Grok would cancel its running queued prompt; that prompt's `prompt_completed(cancelled)` arrives before the response; the design drops the pending prompt; the response ends the input turn.
- Reachability: technically possible, artificial timing (`Technically Possible but Unsupported/Contrived`). Consequence acceptable either way: the user asked to stop.
- Review consequence: none.

### `MP-004` — A `session/update` the SDK's schema would reject, or a session handler that throws, reaching the new inbound stage

- Related contract: REQ-005 (every runtime behaves as before). Established contract: malformed agent traffic never fails a run. The SDK catches and logs a notification handler's error (`jsonrpc.js:776-789`), and the session catches profile errors with the comment "Unknown or malformed extension traffic never fails a run" (`acp-agent-session.ts:216-217`).
- Initiating basis kind: `Contract`. Today the SDK parses `session/update` with `zSessionNotification` and contains handler errors. The design moves that dispatch into the connection.
- Forward path under SR-004:
  - The SDK's `zSessionNotification` is not in the package exports (`package.json` exports `.` and `experimental/*` only; `acp.d.ts` exports types, method constants and `RequestError`). So the design's fallback applies: minimal checks (object params, string `sessionId`, an `update` object).
  - An update that passes those checks but that the schema rejects reaches the converter. For example, an `agent_message_chunk` without `content` makes `update.content.type` (`acp-session-update-converter.ts:94-96`) throw inside `onSessionUpdate`, which has no catch (`acp-agent-session.ts:202-208`).
  - The throw runs inside the stage's stream `transform`, which errors the stream that the SDK reads. The connection closes (`sdk.closed` → `ACP_TRANSPORT_CLOSED`, `acp-client-connection.ts:119-122`), and every session on it fails.
- Consequence: a frame that today is dropped and logged becomes a run-terminal failure of the agent connection.
- Reachability: the contract applies (the design itself claims "keeps today's acceptance"), so this is `Reachable` as a contract regression, not as a product workflow.
- Review consequence: AR-007. Proportionate: contain errors per frame and state the validation basis. No new machinery.

### `MP-005` — An agent sends the protocol notification `$/cancel_request`, which the stage would now route away from the SDK

- Basis: Intended Change 0 routes every notification except `session/update` to `routeExt` and passes none to the SDK. The SDK handles exactly one protocol notification itself, `$/cancel_request`, which aborts the signal of an incoming request such as a pending permission request (`jsonrpc.js:733-737, 851-864`). With no `sessionId` it would be dropped in `routeExt` (`acp-client-connection.ts:211-215`).
- Initiating basis: none found. `$/cancel_request` appears in no Grok or DeepSeek probe, test or source in the worktree. AutoByteus never reads an incoming request's abort signal: `routePermission` resolves through the session, and session cancel answers pending permissions `cancelled`.
- Reachability: `Not Reachable` on current evidence, so no finding. Suggestion (non-blocking): pass `$/`-prefixed protocol notifications on to the SDK unchanged. They carry no session traffic, so their order does not matter, and the SDK's protocol handling stays intact.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None. AR-007 is resolved in SR-005 (see `architecture-review-revision-record.md` ARCH-REV-005).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (primary pass rule); Solution Designer informational.

## Residual Risks

- `$/cancel_request` (MP-005): not reachable on current evidence; suggestion to pass `$/` protocol notifications to the SDK.
- SR-004 ordering guarantee is one-directional, and that is enough (now stated in Intended Change 0). A notification that **precedes** a response on the wire is delivered before the SDK can read the response, because the stage handles frames in sequence. A notification that **follows** a response may reach the session before the response's promise continuation runs, which is microtask order. This matters only if provider content follows the response within the same read. Probe 2 shows a 1.2 s gap (frames 215 → 217), and the RSK-003 escalation trigger covers it. 
- RSK-004 (SDK upgrade changes notification shapes or dispatch): covered by the connection's unit tests and the ACP suites, as the design states.
- RSK-003: provider content arriving before the input prompt's response would land in the input turn. Not observed (response t=60.0, content t=61.2); it is the design's escalation trigger.
- RSK-001: a client prompt dispatched from an idle run at the instant Grok starts its queued prompt. The first `prompt_running` would then be Grok's prompt, and both prompts' content would stay in the one input turn. No phantom turn and no lost message. Narrow timing; accepted.
- UNK-001 (other Grok wakes); AC-005 live check waived without credits.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-004 resolved by SR-005's containment and validation; MP-005 `Not Reachable`)
- Notes: SR-005 adds error containment, minimal validation, the two SDK-handler decisions and the one-direction ordering statement to the wire-order inbound stage in `AcpClientConnection`. The session rules (items 1-7) are unchanged since the ARCH-REV-003 pass. AR-001..AR-007 are resolved.
