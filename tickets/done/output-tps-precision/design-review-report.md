# Design Review Report — output-tps-precision (D3.2 / SR-006)

## Round 3 Summary (authoritative; the sections below it carry the round-2 baseline, which still holds except where round 3 states otherwise)

- Reviewed: D3.2 (SR-006), a design-only change limited to the Codex adapter. It resolves code review CR-F01 (CRR-002, from API/E2E API-L04).
- Current Architecture Review Revision ID: `ARCH-REV-003`. Round 3. Prior: ARCH-REV-002 (D3.1 Pass).
- Requirements: R3. The intent is unchanged. The AC-004 and DEC-002 Codex wording now matches REQ-003 ("request → end of the call") and SCN-002 ("tool time never included"). I accept the Solution Designer's classification that this aligns wording without changing behavior, so no renewed approval is needed.
- Classification: Large / High (unchanged; confirmed).
- Decision: **Pass**, with the binding implementation constraint **IC-2** below. IC-1 from round 2 still applies.

### Round 3 basis — live wire verified independently

I re-parsed `evidence/api-e2e/live/codex/codex-wire.jsonl` and `evidence/api-e2e/live/codex-repeat/codex-wire.jsonl` (codex-cli 0.162.1) with my own script. Times are ms after the turn's `turn/started`.

| Event | Sample 1, tool turn | Sample 2, tool turn |
| --- | --- | --- |
| `item/completed userMessage` (first request boundary) | 1,788 | 1,651 |
| first output `item/started reasoning` (freeze) | 2,623 | 2,547 |
| tool-ending call: `rawResponse/completed` (`usage.outputTokens`) | 3,669 (112) | 3,168 (115) |
| `item/started commandExecution` | 3,980 | 3,367 |
| `item/completed commandExecution` | 6,867 | 6,252 |
| that call's `thread/tokenUsage/updated` (`last.outputTokens`) | 6,870 (112) | 6,255 (115) |
| next call: first output `item/started reasoning` | 7,861 | 7,406 |
| next call: `rawResponse/completed` → usage | 9,248 → 9,251 (173) | 8,511 → 8,514 (158) |

- `rawResponse/completed` appears exactly once per model call, including in the single-call turn (5,445 → usage 5,450, 210 tokens). Its `usage.outputTokens` equals the paired `last.outputTokens` in all five calls.
- It is distinct from `rawResponseItem/completed`, which also echoes input messages and tool calls/outputs. Implementation must key on the exact method name.
- D3.2 traced on sample 1: call A = 112 / (3,669 − 1,788 = 1,881 ms) = 59.5 tok/s; call B = 173 / (9,248 − 6,867 = 2,381 ms) = 72.7 tok/s. Both exclude the 2.9 s tool, and both match API/E2E's "real" values.

### Round 3 verdicts (Codex section)

| Check | Result | Evidence / note |
| --- | --- | --- |
| Call end = `rawResponse/completed` | Pass | Wire above; the server already enables `experimentalRawEvents` |
| Pairing rule (pending reading → next model-call usage in the same turn, only if output tokens match; mismatch, or a missing end → null; reading-only updates leave it pending; turn start/end clear it) | Pass | A wrong order can only lose a reading, never misattribute one. Counts and accounting still come from the usage update. The pending value is per turn and holds one item |
| Request boundaries (`turn/started`, previous call end, any `item/completed`, approval replies) | Pass | Usage-arrival time is no longer a boundary. Approval replies are server-side sends, so their time is known |
| Ownership / boundaries / dependencies | Pass | Still inside the Codex adapter (`codex-model-call-timing.ts` + notification handler); the shared tracker and acceptance check are unchanged |
| Other runtimes unaffected | Pass | Per the API/E2E live evidence and code review CR-F01 (Claude `message_delta`, native final chunk, AGY DONE and Grok `response_completed` all precede tools) |
| Persisted data | Pass (Not Affected) | No change |

### P-004 — Codex auto-compaction between calls (summariser call)

- Basis: System. Codex auto-compaction (P6, token-meter-accuracy).
- Path: a compaction may emit its own `rawResponse/completed`. Its usage update has `last` 0/0, so `reports_model_call` is false and the pending reading is left untouched. The next real call's `rawResponse/completed` replaces it. The compaction end also opens the next call's boundary, which correctly keeps compaction time out.
- Reachability: Reachable. Consequence: no wrong reading.
- Review consequence: none; R-3's P6 test still applies.

### IC-2 — Retire the C-001 freeze-on-tool-item refinement for Codex (binding)

- Protects: REQ-003, SCN-002, AC-004.
- Evidence: the current implementation (accepted as C-001 in CRR-001; `implementation-handoff.md` § Important Assumptions 1) freezes the request boundary on **any non-input `item/started`, including `commandExecution`**. That was right only while the call ended at the post-tool usage update. Under D3.2 the call ends first, and the tool's `item/started` then falls inside the **next** call's pre-output window.
- Traced consequence if kept: in sample 1, `commandExecution` `item/started` (3,980) would freeze call B's boundary at call A's end (3,669). The tool's `item/completed` (6,867) could then no longer move it, so call B = 173 / (9,248 − 3,669 = 5,579 ms) ≈ 31 tok/s instead of 72.7. Tool time would return in the call after the tool, which is the CR-F01 defect moved one call later.
- Required in reimplementation: the Codex output markers that freeze are exactly those in the D3.2 row, reasoning/agentMessage `item/started` and their deltas. Tool item types (`commandExecution` and other tool items) never freeze, and their `item/completed` is a boundary.
- The original C-001 motivation no longer applies. A tool-only call's tool items arrive after its `rawResponse/completed`. If a CLI ever emitted them before the call end (P5-style), the result is a sub-250 ms window and therefore null, never an inflated or deflated reading.
- Required tests: a unit replay of sample 1 asserting 59.5 and 72.7 tok/s (± rounding), and API/E2E's API-L04 rerun asserting the call after the tool as well as the tool-ending call.
- Why proportionate: the D3.2 row text already states the right set, so no design revision is needed. This only makes explicit that the implemented refinement is superseded.

### Round 3 recommendations

- R-5: in `solution-handoff.md`/DS-003, the Solution Designer may optionally restate IC-2 in the Codex row for the record. This is non-blocking because the row already lists only reasoning/agentMessage.
- Carried over: R-2 (e2e probe/fixture) and R-4 (native threshold pin), if not already done in implementation. R-3 now also covers the IC-2 replay.

### Round 3 review-gap note

ARCH-REV-002 accepted the "usage update = call end" Codex premise and kept its timing semantics as residual risk RSK-002 for live validation. That premise could not be established from source or the recorded fixtures (P5 tools completed in about 1 ms). The validation route caught it as intended.

---

# Round-2 Baseline (D3.1 / SR-005) — still valid except where Round 3 states otherwise

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/requirements-doc.md` (R3, user-approved 2026-10-14; unchanged by SR-005)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-spec.md` (D3.1)
- Supplemental Task Artifacts Reviewed: Task screenshots and the user's card screenshot (evidence only; paths in the requirements doc)
- Relevant Solution Revision IDs: SR-005 (D3.1). SR-004 (D3) was reviewed in ARCH-REV-001 and superseded before handoff. SR-002 and SR-003 were put on hold with no review result.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-005 design-only refinement (adapters report `output_throughput` with their own method; the central code keeps only `acceptModelCallThroughput` and the constants)
- Prior Review Round Reviewed: Round 1 (ARCH-REV-001, D3, Pass, no findings; not handed off because SR-005 arrived first)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/output-tps-precision` at base `origin/personal@1ea74caa2d` (source unmodified). Round-1 code evidence remains valid and was not repeated: the single builder call site in `token-usage-event-enrichment-transformer.ts`; spreads through delta/cost/fold/failure paths; the per-run dispatch queue; strict DTOs and enumerating projectors; web intakes; per-runtime signals in `llm-phase.ts`, `claude-call-usage-tracker.ts`, `codex-thread-token-usage.ts`, `agy-stream-event-converter.ts`, `acp-agent-session.ts`; probe P6. New this round: the AGY fixture `duration_seconds` values (fractional, e.g. 2.673724) and the server's `autobyteus-ts: workspace:*` dependency.

## Routing Classification Review

- Task size: Large
- Architectural risk: High
- Classification rationale reviewed: metric authority moves to the runtimes and the run's event; an optional field on two shared strict stream contracts; about 22 files in four packages. SR-005 does not change the surfaces.
- Independent Architecture Review required by the classification: Yes
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: Confirmed
- Approved requirements / intended behavior understood: per-model-call TPS measured by each runtime, carried on the call's usage event, newest value shown for the exact selected run; real-time only; no server state, persistence or reload (R3). SR-005 changes no REQ/AC/BEH/DEC. DEC-002's per-runtime methods are what the adapters implement.
- Relevant existing behavior and evidence confirmed: as in round 1.
- Scope guardrail confirmed: In-scope UC-001–004; Out of Scope; Preserved Behavior Boundary; Review Authority (all unchanged and consistent with R3).
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable: Yes (none raised)
- Remaining material ambiguity: None

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (DS-001) | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass (DS-002/003/004); see IC-1 | Confirmed | — |
| BEH-003 | System | Pass | Pass (P-002/P-003) | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Task screenshots (×2) | Pass | Pass | Pass | Pass | Pass (evidence only) | — |
| User card screenshot | Pass | Pass | Pass | Pass | Pass (evidence only) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior Change; triggers listed and ruled out | — |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary Or Ownership Issue (browser infers a metric only adapters can time; Claude emission lag confirmed) | — |
| Refactor decision is explicit | Pass | Yes | — |
| Refactor decision is supported by concrete design sections | Pass | DS-003 rows, acceptance check, removal plan, web intake | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary E2E (display) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Return-Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local (per adapter: measure and choose the method) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local (acceptance) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

Method choice in the adapters is sound ownership, not duplicated policy. DEC-002 is a per-runtime table, and each runtime has at most two candidate methods derived from signals only it observes: Claude generation only; Codex and ACP end-to-end only; native generation or end-to-end; AGY generation or provider duration. The shared part, the minimum sample and validity, stays central. Removing D3's generic priority list and the five-field measurement removes a structure no single runtime fully used.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `acceptModelCallThroughput` + constants | Pass | Pass | Pass | Pass | Adapters read the constants only for their own window choice; filtering stays central |
| `ModelCallRequestBoundary` | Pass | Pass | Pass | Pass | Codex + ACP |
| Web `getRunTps(runId)` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server adapters → `agent-execution/domain/model-call-throughput` (type, constants), shared tracker | Pass | Pass | Pass | Pass | backends → domain is the normal direction |
| autobyteus-ts LlmPhase (own type and threshold copy) | Pass | Pass | Pass | Pass | autobyteus-ts must not import the server; see R-4 |
| Payload builder → acceptance check | Pass | Pass | Pass | Pass | — |
| Accounting ↛ TPS; web ↛ method/threshold | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `output_throughput` (adapter → event → DTO → web) | Pass | Pass | Pass (usage event identity) | Low | Pass (see IC-1 for the integer-ms contract) |
| `acceptModelCallThroughput(value)` (+ model-call flag) | Pass | Pass | Pass | Low | Pass — step 1 now covers the model-call condition (round-1 R-1 resolved) |
| Web `getRunTps(runId)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-call carrier | Pass | Pass | N/A | Pass | — |
| Request-boundary rule | Pass | Pass | Pass | Pass | — |
| Acceptance check file | Pass | Pass | Pass | Pass | Smaller than D3's rule |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts agent loop | Pass | Pass | Pass | Pass | Payload spread by the server native converter |
| Server runtime backends | Pass | Pass | Pass | Pass | — |
| Server agent-execution domain | Pass | Pass | Pass | Pass | — |
| Contract packages | Pass | Pass | Pass | Pass | — |
| Web token meter | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Request-boundary freeze | Pass | Pass | Pass | Pass | — |
| `ModelCallThroughput` type + constants | Pass | Pass | Pass | Pass | Native keeps a copy across the package boundary (R-4) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `output_throughput` | Pass | Pass | Pass (one structure from adapter to UI; no raw timestamps cross) | N/A | Pass | `duration_ms` must be integer ms (IC-1) |
| Web `TokenUsageTps` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/domain/model-call-throughput.ts` | Pass | Pass | Pass | Pass | — |
| `agent-execution/domain/agent-run-token-usage.ts` | Pass | Pass | N/A | Pass | — |
| Five adapter files + shared tracker | Pass | Pass | N/A | Pass | Each owns its method choice |
| Contracts, projectors, web adapters | Pass | Pass | N/A | Pass | — |
| Web store/helper/scope/card/locales | Pass | Pass | N/A | Pass | Plus the e2e probe/fixture (R-2) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/domain/model-call-throughput.ts` | Pass | Pass | Low | Pass | — |
| `backends/shared/model-call-request-boundary.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Pairing estimator and its states/reasons/keys/tests/docs | Pass | Pass | Pass | Pass | — |
| D3's five-field measurement and priority list | Pass | Pass | Pass | Pass | Never implemented; nothing to remove in code |
| e2e probe/fixture reading `getRunThroughput` | — | Pass | Pass (update, not remove) | Pass | R-2 |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| TPS method | No | Pass | Pass | — |
| Web types | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Token usage run records / analytics | Not Affected | Pass (fold writes named fields; the folded record is saved, not the payload) | Pass | N/A | Pass | Round-trip test required by design |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Acceptance check → tracker → adapters (each with its own method tests) → contracts/projections → web → docs → validation | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude end time, hidden reasoning, tiny call, reload, persistence failure | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

Carried from round 1. The evidence is unchanged and still applies to D3.1.

### P-001 — Codex compaction usage updates could produce a bogus per-call TPS

- Related approved requirement or established contract: REQ-002, REQ-003, REQ-004
- Relevant behavior ID(s): BEH-002, BEH-003
- Initiating basis kind: System
- Independent trigger: Codex auto-compaction (supported scenario in token-meter-accuracy; probe P6)
- Support evidence: the P6 compaction update has `last` = `{ inputTokens: 0, outputTokens: 0, totalTokens: 68630 }` and no cumulative advance
- Forward path: `resolveCodexThreadTokenUsage` → `reports_model_call` false → the adapter completes no call and reports no TPS
- Consequence: none
- Reachability: Reachable trigger; the claimed consequence does not occur
- Review consequence: no finding; test per R-3

### P-002 — A server-suppressed duplicate (same idempotency key, new `usage_event_id`) replaces the newest TPS with an older call's value

- Related approved requirement or established contract: REQ-004
- Relevant behavior ID(s): BEH-003
- Initiating basis kind: System
- Independent trigger: none identified. `usage_event_id` is a fresh UUID per emission. No adapter re-emits an earlier call after a newer one: ACP drops `session/load` replays; Claude sees only live frames; Codex repeats are covered by P-001; no stream snapshot replays usage events; the Org `retainedAgentEvents` buffer delivers pre-construction events once.
- Reachability: Not Reachable on current evidence
- Review consequence: none. Recording TPS after the seen-key check, without the summary-advance gate, is correct.

### P-003 — An older event of a run arrives after a newer one through a second route

- Related approved requirement or established contract: REQ-004
- Relevant behavior ID(s): BEH-003
- Initiating basis kind: System
- Independent trigger: none (ordered per-run dispatch; the Team route handles one message sequentially)
- Reachability: Not Reachable on current evidence
- Review consequence: none

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None blocking.

### Implementation constraint (part of this Pass; no design revision needed)

- **IC-1 — `duration_ms` is integer milliseconds at the adapter boundary.** DS-004 step 2 rejects any `duration_ms` that is not a safe non-negative integer. AGY's provider duration is `duration_seconds × 1000`, which is fractional (fixture: 2.673724 s → 2673.724). Taken literally, every AGY end-to-end reading would be dropped (REQ-001/003, AC-004), and the 4-token fixture calls fall below the minimum sample, so they would not catch it. The AGY adapter must round to integer ms (`Math.round`). All other adapters already produce integer `Date.now()` differences. Keep the acceptance check integer-only. Add an AGY unit case with a fractional `duration_seconds` and ≥ 20 output tokens.

### Non-blocking recommendations

- **R-2 — Durable browser probe.** `autobyteus-web/tests/e2e/token-meter-tps-probe.mjs` and `tests/e2e/fixtures/token-meter-tps.page.vue` read `meter.getRunThroughput(...)` and pairing states. Update them to `getRunTps` and reuse them for the AC-007 screenshots.
- **R-3 — Codex adapter tests.** Include the P6 compaction frame (expect no TPS, and the request boundary not reset), and an identical snapshot repeated within milliseconds (expect null).
- **R-4 — Native threshold copy.** autobyteus-ts keeps its own copy of the window threshold. The server depends on `autobyteus-ts: workspace:*`, so add one server-side test asserting the native copy equals `MIN_TPS_DURATION_MS`, so the two cannot drift silently.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (per handoff rules), with an informational pass notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- RSK-002: Codex event semantics; ships end-to-end.
- RSK-005: AGY output vs thinking count.
- AGY `text_delta` delivery cadence is unproven on a long output. Bursts would shorten the generation window. The ≥ 250 ms window fallback to provider duration and live validation mitigate this.
- Grok's first-call setup time; native hidden reasoning without a reported count (documented limitations).

## Latest Authoritative Result

- Review Decision: Pass
- Material-Premise Gate: Pass (P-001: the trigger occurs but yields no reading; P-002 and P-003 are not reachable; no machinery depends on any of them)
- Notes: Round-1 R-1 is resolved by D3.1. IC-1 is a binding implementation constraint. R-2 to R-4 are recommendations.
