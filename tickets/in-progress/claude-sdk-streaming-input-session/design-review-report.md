# Design Review Report — claude-sdk-streaming-input-session

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/requirements-doc.md` (Approved, SR-006; unchanged)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/investigation-notes.md` (new section "Architecture Review Round 1 Evidence (SR-008)")
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-spec.md` (SR-011; round 4 reviewed the new section "Shared AgentRun Append Claim (SR-011)" and its file/test mapping; all other sections are unchanged since ARCH-REV-003)
- Supplemental Task Artifacts Reviewed: `solution-handoff.md`; `probe-evidence/` including the new `probeP.log` (cq/cam on the PATH 2.1.281 and bundled 2.1.280 CLIs), `probeP-prewait.log` and `probeQ.log`
- Relevant Solution Revision IDs: SR-006, SR-007, SR-008, SR-009, SR-010, SR-011 (requirements re-approved at SR-011 with DEC-007 = A: REQ-012, BEH-009, AC-014..016, SCN-008)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: revised `Architecture Design Complete` (SR-011) after implementation Design Impact IMP-DI-001 (the shared AgentRun append claim). Implementation checkpoint `26450e6b0`
- Prior Review Round Reviewed: 3 (ARCH-REV-003, `Pass`)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: round-1 code reads still apply (base `6f7b5e371` unchanged). Additionally checked `agent-run-interrupt-state.ts` (`observeTerminal` clears the interrupt reservation on any terminal of the turn), the new unfiltered probe captures, and SDK 0.3.280 `sdk.d.ts` `SDKControlInterruptRequest.cancel_queued`.

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High` (unchanged; rationale updated for `cancelQueued`)
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (requirements unchanged since SR-006; the scope guardrail and preserved boundary are as in round 1)
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`
- Remaining material ambiguity: None in the requirements.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-004 (REQ-001/006) | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 (REQ-004) | User/System | Pass | Pass | Pass (uuid-accounted settlement; probe P) | Confirmed | — |
| BEH-003 (REQ-005, AC-005) | User | Pass | Pass | Pass (per-uuid send state; see implementation constraint IC-1) | Confirmed | IC-1 |
| BEH-001 (REQ-002) | System | Pass | Pass | Pass (consumption requires tool_result then assistant, before `interruptRequested`) | Confirmed | — |
| BEH-008 (REQ-003) | System | Pass | Pass (probes E, J, O, Q) | Pass | Confirmed | — |
| BEH-006 (REQ-007) | System | Pass | Pass | Pass | Confirmed | — |
| REQ-008 | System | Pass | Pass | Pass (`failTurn`, exit path) | Confirmed | — |
| BEH-005 (REQ-011) | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 (REQ-006, AC-007) | System | Pass | Pass | Pass (UUID turn ids) | Confirmed | — |
| REQ-010 preserved: run history / memory | Preserved | Pass (recording scoped by `sender_id`) | Pass | Pass | Confirmed | Non-blocking dependency note below |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probe-evidence/*` (E–Q, G/H/I) | Pass | Pass | Pass. The unfiltered P/Q captures close the round-1 caveat | Pass | Pass (evidence only) | — |
| `solution-handoff.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Unchanged from round 1 | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue` | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor now | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | — | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SPINE-1 Input | AgentRun → CLI stdin | Pass | Pass (synchronous `registerInput`, then `failTurn` on later failure) | Pass | Pass | Pass | Pass | Pass |
| SPINE-2 Output/turns | CLI → canonical events | Pass | Pass (frame classification table; single settlement rule; I-1..I-3) | Pass | Pass | Pass | Pass | Pass |
| SPINE-3 Background notice | task frames → notice → memory → replay | Pass | Pass (consumption rule matches probes J/Q and excludes abort frames in F/O/P) | Pass | Pass | Pass | Pass | Pass |
| SPINE-4 Process lifecycle | open → close/exit → reopen | Pass | Pass (capability snapshot) | Pass | Pass | Pass | Pass | Pass |
| SPINE-5 Interrupt | AgentRun.interrupt → local cancel of unsent uuids / `interrupt({cancelQueued})` → settle | Pass | Pass (with IC-1 clarifying the branch precondition) | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSdkStreamingSession` | Pass | Pass | Pass | Pass | The undeclared `cancelQueued` option is confined to one adapter |
| `ClaudeSessionProcess` / `ClaudeTurnTracker` / `ClaudeBackgroundTaskRegistry` / `ClaudeSession` / backend | Pass | Pass | Pass | Pass | Unchanged from round 1 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Session layer → client | Pass | Pass | Pass | Pass | — |
| `agent-memory` accumulator → `agent-execution/domain/system-task-notification-senders.ts` | Pass | Pass | Pass | Pass | Resolved in SR-009: neutral constant module |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `openStreamingSession(options)` | Pass | Pass | Pass | Low | Pass |
| `interruptAndCancelQueued(): {stillQueued, cancelled}`; `capabilities` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSession.submitInput` / `interrupt(turnId)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AgentRun append / interrupt lifecycle | Pass | Pass | N/A | Pass | A too-early Stop settles `TURN_COMPLETED`; `AgentRunInterruptState.observeTerminal` resolves the interrupt on any terminal |
| Notice event, reconciler, projectors, image source | Pass | Pass | Pass | Pass | — |
| Memory trace | Pass | Pass (scoped) | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/claude/session`, `runtime-management/claude/client`, `agent-memory`, `run-history` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Image source classification | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Tracker `ACTIVE {written, answered, cancelled, cliTurnOpen, interruptRequested, hadErrorResult}` | Pass | Pass | Pass (one settlement rule) | N/A | Pass | — |
| Registry completion `{taskId, description, status, seenAt}` + consumed/pending/carry-over | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All mapped files | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All listed files, including new `agent-execution/domain/system-task-notification-senders.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-turn query, policy env, active-turn execution, `activeQueriesByRunId`, obsolete tests/docs | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Single-message mode, policy env, idle timer | No | Pass | Pass | — |
| Missing `interrupt_cancel_queued_v1` capability | No | Pass | Pass | The same settlement rule observes different CLI behavior. It is not a dual path, and both supported CLIs advertise the capability (probe P) |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| External-runtime raw traces (`system_task_notification`, Claude notices only) | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Six-step sequence with the live gated `cancelQueued` check in step 1 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Background build; interrupt with queued input (P `cq`); Stop too early (P-prewait); completion during final reply (Q) | Yes | Pass | Pass | Pass | — |
| Stop while a background completion is queued (J+O); Stop during first open | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

Resolved premises:
- P-001 through P-007 were resolved in ARCH-REV-002; see the revision record.
- P-008 (abort frames marking a completion consumed) is resolved. SR-009 consumption requires a `user` tool_result and then an `assistant` frame after the notification, both before `interruptRequested`. This matches probe J (10.4 → 24.4 → 26.9 s) and probe Q, where the in-flight reply does not consume. Probes F, O and P `cq` show the abort frames arrive after `interruptRequested`.
- P-009 (Stop before the input is sent) is resolved. Each uuid now has a send state (`unsent`/`sent`). Unsent uuids are cancelled locally with no SDK call in any process state, and `submitInput` rechecks the state immediately before `send()`.

### P-010 — Stop on a turn with a running CLI turn but no sent uuid of ours

- Related approved requirement: REQ-003 (a Claude-started turn "can be interrupted"), REQ-005 / AC-005
- Relevant behavior ID(s): BEH-008, BEH-003
- Initiating basis kind: `User` (Stop) during a `System` event (a provider-initiated turn)
- Independent trigger: a background task completes while the agent is idle (SCN-002), and the CLI starts its own turn (probes E, O, Q). The user presses Stop on that running turn. A narrower variant: AgentRun's `start_turn` races into that provider turn (`start_turn + ACTIVE`, allowed by tracker rule 1), which adds an `unsent` uuid, and Stop follows.
- Forward path:
  - SPINE-5's first branch is "Only unsent uuids … make no SDK call, and settle through the normal settlement rule (`cliTurnOpen` is false …)".
  - For a provider turn with an empty `written` set, the main SPINE-5 paragraph applies (call `interrupt({cancelQueued:true})`). The branch text leaves room to read "no sent uuids" as "no SDK call".
  - In the race variant, the first branch literally applies (the only uuid is unsent) even though `cliTurnOpen` is true. No SDK interrupt would be sent, and the provider's CLI turn would keep streaming until its natural `result`.
- Consequence if misread: Stop does not stop a running Claude-started turn, which violates REQ-003 and REQ-005.
- Reachability: `Reachable` (the provider-turn Stop is a supported normal scenario; the race variant is narrow)
- Review consequence: this is a wording-precision issue in a design whose intent is clear from the branch's own parenthetical assumption (`cliTurnOpen` is false). It is recorded as binding implementation constraint IC-1 and does not fail another round.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`: the upstream behavior basis is confirmed, all findings ARCH-F-001..008 are resolved, and no in-scope machinery depends on an unsupported premise. Implementation must honor IC-1.

## Findings

None blocking. All prior findings are resolved; see `architecture-review-revision-record.md` ARCH-REV-003 and ARCH-REV-004.

### Implementation constraints (binding on implementation and code review)

- **IC-1 (from P-010; REQ-003, REQ-005):** `ClaudeSession.interrupt` makes **no SDK call only when no uuid of the canonical turn has been sent AND `cliTurnOpen` is false**. In every other case, including a provider-initiated turn with an empty `written` set and the race of a provider turn plus an unsent start-turn uuid, it cancels the unsent uuids locally and then calls `interrupt({cancelQueued:true})`. Settlement follows the single uuid-accounted rule. Required tests: Stop on a provider-initiated turn (`TURN_INTERRUPTED`, SDK interrupt called), and Stop during the `start_turn + ACTIVE(provider)` race.
- **IC-2 (non-blocking hygiene; REQ-002):**
  - Situation: a completion that arrives after `interruptRequested` but survives `cancel_queued` because it was not yet queued at the interrupt instant can both be announced as "stopped before reporting it", becoming carry-over, and trigger a later provider-initiated turn.
  - What to do: when a provider-initiated turn opens, clear any carry-over entries for the completions it reports, or carry over only completions recorded before `interruptRequested`.
  - Effect: this avoids telling the agent twice.
- **IC-3 (round 4; REQ-012 exactly-once, AC-016):** `codex-thread.ts` `appendInput` currently throws `CODEX_TURN_STEER_ID_MISMATCH` from two places:
  - the local pre-check before any RPC (`activeTurnId !== expectedTurnId`; definitely undelivered);
  - after a successful `turn/steer` whose returned turn id differs (the input may have been delivered).

  Only the pre-RPC path may map to `undeliveredRetryAsStart`. Give it a distinct code or flag, and keep the post-RPC mismatch and `CODEX_TURN_STEER_REJECTED` as visible failures. Add a Codex backend unit test for each path.
- **IC-4 (round 4; non-blocking):** `AgentRun.postUserMessage` returns `turnId: appendTurnId` at claim time. After an `undeliveredRetryAsStart` requeue that id is no longer the input's turn. No current caller consumes it (the websocket coordinator uses lifecycle observer facts; checked `agent-run-command-coordinator.ts` and the routers). Either leave the return as-is and document it as a claim-time hint, or return `null` for append claims. Do not add consumers that depend on it.

## Classification

N/A (Pass)

## Recommended Recipient

`/implementation_engineer` (primary). `/solution_designer` receives an informational notification.

## Residual Risks

- Append-mismatch race (Codex parity): the entry fails visibly and is not lost silently. Accepted.
- RSK-006: the undeclared `cancelQueued` option is isolated in one adapter, capability-checked, and covered by a live gated test on the PATH and bundled CLIs (sequence step 1).
- RSK-007: usage after a crash reopen or a zeroed error result. Verify against the SDK `modelUsage` contract in implementation and API/E2E (escalation trigger present).
- P-prewait: a Stop that reaches the SDK before our message is flushed settles `TURN_COMPLETED`. It is accounted correctly, the window is sub-millisecond on a warm process, and it is further narrowed by the send-state rule.
- A non-interrupt error result with further written input settles the canonical turn as `ERROR` after the remaining input is answered. It is visible and accounted.
- Process memory (~170 MB per live run) is accepted (DEC-002).

## Round 4 Review — Shared AgentRun Append Claim (SR-011)

- Basis: REQ-012, BEH-009, AC-014..016 and SCN-008, approved by the user at SR-011 (DEC-007 = A; quote in requirements-doc Document Status). The Codex scope exception is now approved, so the Codex behavior change is in scope and is not a Requirement Gap.
- Defect confirmed: in the current code (`agent-run-input-admission-state.ts` `claimNext`), `entries.find(state !== "terminal")` returns the forwarded entry that started the turn, and `state !== "queued"` then returns null. An append is therefore never claimed while the starting input is unfinished. The root cause is `Missing Invariant` in the shared owner. The fix belongs in that owner, and the design puts it there.
- Claim walk: sound. Each check was walked against the code:
  - It skips only `forwarded` entries associated with the active IDENTIFIED turn.
  - It stops at any `reserved`/`committed`/`claimed` entry, or a `forwarded` entry into another or unknown turn. This preserves FIFO order and reservation ordering.
  - An entry with a null `associatedTurnId` stops the walk, which is the conservative choice. `observeTurnStarted` normally fills that id in.
  - The guards for an active claim, a pending turn start and an interrupt reservation are unchanged.
  - Unsupported and ANONYMOUS cases return null as today, so native AutoByteus is unaffected.
- `undeliveredRetryAsStart` plus `notInto`: proportionate. The trigger is Reachable: the backend has settled T while `TURN_COMPLETED(T)` is still in flight to AgentRun. This is the documented residual race from rounds 1–3, and it is now resolved without failing the input.
  - Claude's mismatch is rejected synchronously before any send (tracker rule 1), so non-delivery is certain.
  - The `notInto` guard prevents a busy retry against T. The entry becomes claimable after T's terminal, or into a different later turn such as a Claude provider-initiated turn.
  - Ambiguous rejections still fail visibly.
  - Requeue emits no observer facts: the claim emitted none, and `forwarded`/`turn_associated` fire only on real forwarding.
- Invariants: FIFO, exactly-once (appended entries finish at T's terminal; the Claude tracker keeps T open until every written uuid is answered or cancelled), interrupt reservation, termination quiescence (`prepareTerminationOnce` → `quiesce` → drain → `waitForQuiescence`; appended entries resolve at T's terminal, sooner than before) and root-shutdown fencing all hold.
- Tests and E2E: the mapping covers the IMP-DI-001 repro, ordering, reservation/interrupt/pending-start blocking, unsupported runtimes, requeue without a loop, ambiguous-rejection failure, termination, backend mappings, and gated live Codex steer (AC-014).
- Constraints added: IC-3 (Codex mismatch code split) and IC-4 (claim-time `turnId` return).
- Verdicts for the new section:
  - Spine: `Pass`
  - Ownership: `Pass` (a single owner, `AgentRunInputAdmissionState`)
  - Interface: `Pass` (optional result flag, with its validity stated)
  - Legacy: `Pass` (the documented rule is narrowed explicitly, with no dual path)
  - Persisted data: `Not Affected`
  - Change safety: `Pass`

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-001..P-009 are resolved. P-010 is covered by IC-1. The round-4 end-of-turn append race is Reachable and handled by `undeliveredRetryAsStart` with `notInto`.
- Notes (round 4): the SR-011 shared append-claim section passes, with IC-3 and IC-4 added. The design is ready for implementation to resume from `26450e6b0`. The strongest risk controls are the live gated `cancelQueued` check (step 1), the tracker and registry frame-sequence tests from unfiltered captures (step 2), and IC-1.
