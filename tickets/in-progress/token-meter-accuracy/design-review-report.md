# Design Review Report — token-meter-accuracy

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/requirements-doc.md` (Approved, SR-003)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-spec.md`
- Supplemental Task Artifacts Reviewed: `probes/` (P1–P8 scripts and raw outputs, evidence only), `solution-handoff.md`, user screenshots `user-16-running-member-zero.png` and `user-17-latest-prompt-97.png`
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004, SR-005
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Solution Designer revised package SR-005 (shared contract schemas mapped), resolving ARCH-REV-002 / ARCH-F-003. Earlier: SR-004 (D-9, D-10) resolved ARCH-REV-001.
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Fail — ARCH-F-003)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `codex/token-meter-accuracy` @ `927796780`. Read: `token-usage-run-fold.ts`, `token-usage-run-record-state.ts`, `token-usage-run-accumulator.ts`, `claude-sdk-model-usage-reconciler.ts`, `claude-session.ts`, `claude-session-process.ts`, `claude-session-token-usage.ts`, `claude-sdk-result-usage-parser.ts`, `claude-sdk-streaming-session.ts`, `claude-sdk-client.ts` (query options, tool lists), `domain/claude-sdk-usage.ts`, `agy-stream-event-converter.ts`, `autobyteus-ts/src/agent/loop/llm-phase.ts`, `token-usage-current-schema-readiness.ts`, `startup/migrations.ts`, `prisma/migrations/*`, `token-usage-run-persistence-transformer.ts`, `token-usage-run-store.ts`, `autobyteus-web/stores/tokenUsageMeterStore.ts`, `docs/modules/token_usage.md` § Claude Agent SDK, `DESIGN.md`. Probe outputs P2, P3, P4 and P8 were re-read directly. Round 2 added `agent-run-event-dispatch-queue.ts` (per-run serialization), `token-usage/repositories/` (no record deletion), `autobyteus-team-stream-contracts/src/{token-usage-run-summary-dto,team-agent-message-dtos,team-stream-server-message}.ts`, `autobyteus-agent-presentation-contracts/src/{token-usage-presentation-dto,agent-presentation-message-dtos}.ts`, `autobyteus-web/services/agentStreaming/tokenUsageRunSummaryMapper.ts`, and `agent-collaboration-stream-handler.ts`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: about 35 files across 3 packages; shared observation-contract change; accounting semantics (live per-call plus turn-end remainder); schema addition plus data update; a Claude SDK option that changes the frame mix.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Each runtime's own per-call usage and context figures drive the meter (REQ-001). The Claude SDK latest prompt is the SDK's context reading (REQ-002). Claude SDK and Antigravity usage is recorded live per call (REQ-003, REQ-005, REQ-008). Claude SDK totals equal the selected model's `modelUsage` with no double counting (REQ-004, DEC-002 b). Codex uses `last.totalTokens` (REQ-006). The meter shows a threshold and marks genuine overflow (REQ-009, REQ-010). Pricing stays with the caching tasks (REQ-011).
- Relevant existing behavior and evidence confirmed: Yes. Code confirms usage is emitted only from `turnResult` (`claude-session.ts`) and the latest prompt is the `result.usage` sum (`claude-session-token-usage.ts`). It also confirms the fold increments `usage_report_count` and overwrites latest identity/context on every admitted observation, and suppresses non-advancing cumulative snapshots (`token-usage-run-fold.ts`, `token-usage-run-record-state.ts`). AGY maps only the cumulative `result` as `gross_includes_cache`. The probes confirm the SDK figures (P4: `getContextUsage` equals each call's prompt; P3: summariser calls appear only in `modelUsage` and emit no stream events; Agent/Task subagent tools are disallowed, so all streamed main-loop calls use the selected model).
- Scope guardrail confirmed: Yes (UC-001–UC-004; out of scope: pricing values/calculator, native caching, changing compaction, Codex cache write, analytics views, repricing; preserved: BEH-005, BEH-007, preserved column of BEH-002/BEH-004, and the lifetime-totals invariant).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`
- Remaining material ambiguity: None in the approved basis. Findings below are design gaps.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | ARCH-F-002 resolved by D-10 |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | ARCH-F-001 resolved by D-9 |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | ARCH-F-003 resolved by SR-005 |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | — |

The "Needs Correction" rows are target-path (design) corrections. The approved basis itself is confirmed.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/*.mjs`, `*.py`, `P*.jsonl` | Pass | Pass | Pass | Pass | Pass (evidence only) | — |
| User screenshots | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | design-spec § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | Shared Structure Looseness (fold infers call/reading/contribution from admission; confirmed in `applyTokenUsageContribution`) plus a local defect in each adapter | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "Yes, bounded" | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | D-4, removal plan, file mapping | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Claude per-call | Pass | Pass (D-10) | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Claude turn-end remainder | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Other runtimes | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Return/event to meter | Pass | Pass (D-9 store node; contract schemas on the path) | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Fold bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSdkStreamingSession` (`readContextUsage`) | Pass | Pass | Pass | Pass | Tracker reads through the handle only |
| `TokenUsageRunAccumulator` / store | Pass | Pass | Pass | Pass | Adapters never write records |
| Fold → reconciler / record-state | Pass | Pass | Pass | Pass | — |
| `ClaudeSession` frame intake → tracker vs turn tracker | Pass | Pass | Pass | Pass | Stream events never reach the turn tracker |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Adapters → domain payload | Pass | Pass | Pass | Pass | — |
| `ClaudeCallUsageTracker` → session handle / emitter | Pass | Pass | Pass | Pass | — |
| Frontend → summary fields | Pass | Pass | Pass | Pass | Formatting and marker position only |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `TokenUsageUpdatedPayload.reports_model_call` | Pass | Pass | N/A | Low | Pass |
| `context_compaction_threshold_tokens` (payload, summary, GraphQL, DTOs) | Pass | Pass | Pass | Low | Pass |
| `readContextUsage()` | Pass | Pass | Pass | Low | Pass |
| `claude_sdk_call` ingestion kind / idempotency key | Pass | Pass | Pass | Low | Pass |
| `TokenUsageRunSummaryPayload.revision` (Σ record revisions) as the live freshness key | Pass | Pass | Pass | Low | Pass (D-9; records are never deleted, so the roll-up sum only grows) |
| Shared contract schemas `tokenUsageRunSummaryDtoSchema`, `agentTokenUsageRunSummarySchema`, presentation `TOKEN_USAGE_UPDATED` payload (all `.strict()`) | Pass | Pass | Pass | Low | Pass (SR-005: fields mapped, strictness kept, tests listed) |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude cumulative state | Pass | Pass | N/A | Pass | Extends reconciler |
| Live delivery | Pass | Pass | N/A | Pass | Store (D-9) and shared contract packages (SR-005) extended |
| Per-call pairing | Pass | Pass | Pass | Pass | `claude-session.ts` is 538 lines; distinct per-message lifecycle |
| Pricing | Pass | Pass | N/A | Pass | See Residual Risks RR-1 |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/claude` | Pass | Pass | Pass | Pass | — |
| AGY / Codex / Grok / native adapters | Pass | Pass | Pass | Pass | — |
| `token-usage` | Pass | Pass | Pass | Pass | — |
| `autobyteus-web` meter | Pass | Pass | Pass | Pass | D-9 guards and team partial count mapped |
| `autobyteus-team-stream-contracts`, `autobyteus-agent-presentation-contracts` | Pass | Pass | Pass | Pass | Extended; `dist` rebuilt in step 2 because consumers import `dist/index.js` |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Context reading group | Pass | N/A | N/A | Pass | Kept flat in the established snake_case contract; justified |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageUpdatedPayload` | Pass | Pass | Pass | N/A | Pass | `claude_sdk_main_loop_usage` removed |
| `TokenUsageRunSummaryPayload.usage_report_count` / `revision` | Pass | Pass | Pass | N/A | Pass | Calls and freshness now have separate fields (D-9) |
| Reconciler state | Pass | Pass | Pass | N/A | Pass | Tolerant reader; missing `live` = empty is truthful |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `claude-call-usage-tracker.ts` (Add) | Pass | Pass | N/A | Pass | Awaited emission stated (D-10) |
| `claude-session.ts` | Pass | Pass | N/A | Pass | — |
| fold / record-state / analytics / accumulator | Pass | Pass | N/A | Pass | — |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Pass | Pass | N/A | Pass | Revision guards at l.288/304/389; `+1` only when `reports_model_call` |
| Contract schema files and tests (team-stream and agent-presentation packages) | Pass | Pass | N/A | Pass | Mapped in SR-005; the test files exist |
| Remaining mapped files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/claude/session/claude-call-usage-tracker.ts` | Pass | Pass | Low | Pass | — |
| `prisma/migrations/<ts>_token_meter_context_readings/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude `result.usage` latest prompt / model-window capacity | Pass | Pass | Pass | Pass | — |
| `ClaudeSdkMainLoopUsage` type/validator/field (also in `zeroTokenUsageContribution`, persistence transformer error branch, `isClaudeSdkResultIdentity`) | Pass | Pass | Pass | Pass | Implementation should sweep every reference |
| Reconciler main-loop restart delta and `selectedCacheSplit` | Pass | Pass | Pass | Pass | — |
| Aggregate Claude read-time percent branch | Pass | Pass | Pass | Pass | Dead after DEC-005 clear |
| AGY `result` usage mapping and flag | Pass | Pass | Pass | Pass | — |
| `token_usage.md` Claude section (series restart via main loop, read-time derivation) | Pass | Pass | Pass | Pass | Docs rewrite is in scope |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Claude latest prompt fallback | No | Pass | Pass | Fallback explicitly rejected |
| AGY result + per-step | No | Pass | Pass | — |
| Reconciler state decode | No | Pass | Pass | Tolerant generic reader, not a version branch |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `context_compaction_threshold_tokens` column | Directly Usable — No Migration (additive nullable) | Pass | Pass | N/A | Pass | Readiness list updated |
| Claude SDK latest-context columns | Migration Required (DEC-005 a, user-approved) | Pass (341 rows inspected; values unrecoverable) | Pass (one `UPDATE`) | Pass (Prisma migrate deploy at startup via `startup/migrations.ts`; `_prisma_migrations` ledger; fixture validation) | Pass | — |
| `claude_sdk_usage_state_json` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| `usage_report_count` meaning for Claude rows (per turn before, per call after) | Not stated | Pass (display-only counter) | Pass | N/A | Pass | Non-blocking; see RR-3 |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Contract → persistence → Claude → other adapters → frontend → docs → removal | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude 4-call turn, auto-compaction, Codex compaction, AGY step, reading rule | Yes | Pass | Pass | Pass | Good, numeric |
| Live summary freshness for a non-call observation | Yes | Pass | Pass | Pass | Revision 41 → 42 with 12 calls unchanged |
| Claude emission order | Yes | Pass | Pass | Pass | `await` vs `void` shape |

## Material Premise Validation (Only When Needed)

### `MP-01` — The final call observation of a Claude turn can reach the fold after the turn's `result` observation

- Related approved requirement or established contract: REQ-004 / AC-004 (no call counted twice)
- Relevant behavior ID(s): BEH-002
- Initiating basis kind: `System`
- Independent product-supported initiating trigger: a normal multi-call Claude SDK turn (SCN-002) whose last main-loop call completes. The SDK then emits the final `message_delta` immediately followed by `result`.
- Support evidence: P4 raw output: final `message_delta` at dt 7679, `result` at dt 7685, and the non-awaited `getContextUsage` answer at dt 7685. P4/P1 also show that awaiting `getContextUsage` inside the frame loop works (`CONTEXT_summary` at dt 7687), so an awaited design is viable.
- Forward production path: SDK frames → `ClaudeSessionProcess.runPump` (`await onFrame(frame)`, serialized) → `ClaudeSession.handleFrame` → [design] tracker, which awaits the context read and then emits `claude_sdk_call` → `emitRuntimeEvent` → pipeline → `TokenUsageRunAccumulator.recordObservation` (`serializeRun` preserves call order). If the tracker's emission is not awaited within `handleFrame`, the `result` frame is processed and `claude_sdk_result` is emitted first.
- Lifecycle preconditions and material consequence: the reconciler computes remainder = `modelUsage` delta − live sums. Those live sums lack the last call, so the remainder contains that call, and the late call observation then adds it again. The result is a double-counted call in every multi-call turn, plus over-subtraction (clamped) in the next turn's remainder.
- Reachability: `Reachable` if the emission is not ordered.
- Review consequence: ARCH-F-002 (round 1). Round 2: D-10 requires awaited emission and forbids fire-and-forget. Order is preserved by the awaited pump, `AgentRunEventDispatchQueue.enqueue` (per-run tail) and `serializeRun`. A P4-frame session test is specified. Resolved.

### `MP-02` — A non-call observation must update the live meter

- Related approved requirement: REQ-006 / AC-006 (Codex compaction update shows the post-compaction size), REQ-004 / AC-004 (totals include SDK compaction calls), REQ-008, and DESIGN.md Mandatory Rule 4 (preserve concurrent-update freshness)
- Relevant behavior ID(s): BEH-004, BEH-002, BEH-007
- Initiating basis kind: `System`
- Independent trigger: Codex auto-compaction (P6: update with `last.inputTokens` 0, `last.totalTokens` 68,630, no cumulative advance). Claude SDK auto-compaction (P3: summariser tokens only in `modelUsage`, so the remainder is non-zero).
- Support evidence: SCN-003 / SCN-004 (supported normal scenarios), P3, P6.
- Forward path: adapter → fold (design: reading-only or remainder observation saved, `usage_report_count` unchanged) → `run_summary_after_event` → web `applyTokenUsageUpdated` / `applyTeamTokenUsage` → `upsertRecordBackedAgentRunSummary` / `upsertRecordBackedTeamMemberSummary`, which reject when `summary.usageReportCount <= current.usageReportCount` (`tokenUsageMeterStore.ts:288, 304`). `applyPersistedEventToPartialTeamAggregate` adds `usageReportCount + 1` for every event (`:207`).
- Consequence: the Codex post-compaction reading and the Claude remainder totals are discarded by the live meter until the next model call or a re-hydration. On the last turn of a run, that may never come. The team live-partial aggregate counts non-call events as model calls, which contradicts D-4.
- Reachability: `Reachable`
- Review consequence: ARCH-F-001 (round 1). Round 2: D-9 resolves it.

### `MP-03` — Per-call Claude pricing for a non-first-party SDK provider (Bedrock/Vertex via the user's Claude settings)

- Related contract: the existing accumulator guard `isSupportedClaudeSdkPricingProvider(selectedRow.provider)`. The result path prices only `firstParty`/`ANTHROPIC` rows; the SDK reports `provider: "firstParty"` per `modelUsage` row (P1).
- Initiating basis kind: `User`/`Operational`. This would need the user to configure the Claude CLI for a cloud provider, which runtime `settingSources` (`user`, `project`, `local`) would inherit.
- Support evidence: the guard exists in code, but neither the approved requirements nor `token_usage.md` establishes non-first-party Claude SDK use as a supported AutoByteus scenario. No such run appears in the investigation.
- Forward path: design D-2 per-call observation → generic `resolvePolicy(payload)` (no provider check) → catalog price applied.
- Reachability: `Unclear`. Round 2: the Solution Designer states the product position that non-first-party Claude routes are not a supported configuration, so `Technically Possible but Unsupported`.
- Review consequence: non-blocking (RR-1). No machinery is required.

### `MP-04` — Live token summaries carrying new fields fail the strict shared contract schemas

- Related approved requirement: REQ-008 / AC-003 (running member shows usage live), REQ-010 / AC-008 (threshold shown), and D-9 itself (the `revision` field must reach the store)
- Relevant behavior ID(s): BEH-007, BEH-001
- Initiating basis kind: `System`
- Independent trigger: any model call on any runtime, in any run kind, after this change (SCN-002), which produces `run_summary_after_event` with `revision` and `context_compaction_threshold_tokens`, and a team/collaboration live event with `reports_model_call`.
- Support evidence: `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts` `tokenUsageRunSummaryDtoSchema` is `.strict()`. `autobyteus-web/services/agentStreaming/tokenUsageRunSummaryMapper.ts:28` parses every live and fetched run summary with it (standalone, team member and collaboration). `team-agent-message-dtos.ts:33-35` extends the presentation `TOKEN_USAGE_UPDATED` payload (`.strict()`) with that summary. `autobyteus-agent-presentation-contracts/src/token-usage-presentation-dto.ts` `agentTokenUsageRunSummarySchema` is `.strict()`, and `agent-presentation-message-dtos.ts:90` makes `TOKEN_USAGE_UPDATED` `z.object(token).strict()`. The server parses collaboration messages with `CollaborationStreamServerMessageSchema.parse` (`agent-collaboration-stream-handler.ts`).
- Forward path: fold → `run_summary_after_event` with new keys → team/collaboration projectors → contract schema `.parse` (unknown keys rejected) → web mapper `.parse`.
- Consequence: either the schemas reject the payload (the live meter stops updating for the run kinds REQ-008 targets) or the projectors drop the fields (no threshold, and the store has no `revision` to compare). Neither contract package appears in the design's allocation, file mapping or sequence. "Strict team/collaboration DTOs" in the design refers only to server-side projector files.
- Reachability: `Reachable`
- Review consequence: ARCH-F-003 (round 2). Round 3: resolved by SR-005.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Frontend live freshness key (web store) | Non-call observations are introduced by this design | ARCH-F-001 | Resolved (D-9) |
| Shared strict wire contracts for run summary / live token event | New fields must cross them | ARCH-F-003 | Resolved (SR-005) |

## Review Decision

`Pass`

## Findings

No open findings. ARCH-F-001, ARCH-F-002 and ARCH-F-003 are resolved; their history follows.

### ARCH-F-001 — Live summaries for non-call observations are dropped by the web store's `usageReportCount` freshness guard

- Round 2 status: **Resolved** by D-9 (SR-004). Verified against the design and code: record `revision` is incremented by `applyTokenUsageContribution` on every admitted save, the repositories have no delete path, the store guards and the team-partial count are mapped, and the example and tests are present.
- Type: `Design Impact`
- Severity: High (blocking in round 1)
- Protects: REQ-006 / AC-006, REQ-004 / AC-004 (visible totals), REQ-008 / AC-003, BEH-007; DESIGN.md Mandatory Rule 4 (concurrent-update freshness)
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Affected behavior: DS-004 return path to the Token Meter (standalone, team member, team aggregate)
- Evidence: `autobyteus-web/stores/tokenUsageMeterStore.ts`: lines 288 and 304 reject when `summary.usageReportCount <= current.usageReportCount`; line 389 rejects when `<`; line 207 adds `usageReportCount + 1` per persisted event in the team live-partial aggregate. `TokenUsageRunSummaryPayload` carries no revision. The design (D-4, D-6, D-3) makes `usage_report_count` strictly "model calls" and adds saved observations that do not increment it: the Codex compaction reading and the Claude turn-end remainder, whose `run_summary_after_event` therefore never reaches the meter. design-spec DS-004 states "Only a new field is added", and the file mapping lists the store for "threshold field" only.
- Material premise: MP-02 (Reachable)
- Required update: Specify a live-summary ordering/freshness key that is independent of the model-call count. The design should name the source (for example the run record's `revision`, which the fold increments for every saved change), add it to the run-summary payload, GraphQL and the strict team/collaboration DTOs, and use it in the store's upsert guards. Make the team live-partial aggregate add to `usageReportCount` only for model-call events: carry `reports_model_call` in the team details, or derive the count from the summary. Add the affected web/DTO files to the mapping and a concrete example: the Codex compaction update (68,630) and the Claude remainder appear live with an unchanged call count.
- Why proportionate: it is a small, existing-owner change (one summary field plus guard logic) that directly decides whether AC-006 and the remainder totals are visible. No new subsystem is needed.
- Recommended recipient: `/software_engineering_team/solution_designer`

### ARCH-F-002 — The emission order of Claude per-call observations relative to the turn's `result` is not specified

- Round 2 status: **Resolved** by D-10 (SR-004). Verified: awaited `onFrame` pump, per-run `AgentRunEventDispatchQueue` tail and `serializeRun`. Fire-and-forget emission is forbidden, and the P4 delayed-read test is specified.
- Type: `Design Impact`
- Severity: Medium (blocking in round 1)
- Protects: REQ-004 / AC-004 (no double counting); design risk R-002
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Affected behavior: BEH-002, DS-001 → DS-002 handover
- Evidence: the frame pump is serialized (`claude-session-process.ts` `await this.input.onFrame(frame)`). The accumulator preserves call order (`serializeRun`). P4 shows `result` arriving about 6 ms after the final `message_delta`, while the context read takes about 4 ms. The design gives the context read "a short timeout" and lists "blocking frame intake" as the risk, but never states that the tracker's observation is emitted before the next frame is processed. The remainder rule (delta − live sums) is correct only under that ordering.
- Material premise: MP-01 (Reachable when the ordering is not enforced)
- Required update: State the invariant explicitly: `ClaudeSession.handleFrame` awaits the tracker, which awaits `readContextUsage()` bounded by the ≤2 s timeout. Every `claude_sdk_call` observation is therefore emitted before any later frame, in particular before the turn's `result`, is handled. Note that emission order equals fold order. Add a unit test built from P4 frames with a delayed context read, where `result` follows the last `message_delta` immediately, asserting remainder 0 and totals equal to the `modelUsage` delta.
- Why proportionate: one sentence plus one test. It closes the design's own top accounting risk without new machinery.
- Recommended recipient: `/software_engineering_team/solution_designer`

### ARCH-F-003 — New run-summary and live-event fields are not mapped through the strict shared contract packages

- Round 3 status: **Resolved** by SR-005. Verified: `token-usage-run-summary-dto.ts`, `token-usage-presentation-dto.ts` and `agent-presentation-message-dtos.ts` `token` set are mapped with the new fields. Strict unknown-key rejection is kept. The test files exist (`tests/token-usage-run-summary-dto.test.mjs`, `tests/agent-presentation-contracts.test.mjs`). The new step 2 rebuilds `dist` before the server and web steps, which matters because both packages export `./dist/index.js`. The web mapper test is added. The collaboration adapter (`agentTokenUsageRunSummarySchema.parse`, l.170) is covered by the presentation schema change.
- Type: `Design Impact`
- Severity: Medium (blocking in round 2)
- Protects: REQ-008 / AC-003, REQ-010 / AC-008, BEH-007; D-9 (`revision` must reach the store)
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Affected behavior: DS-004 live path for every run kind, and fetched summaries (the web mapper parses both)
- Evidence: MP-04. `tokenUsageRunSummaryDtoSchema` (team-stream-contracts), `agentTokenUsageRunSummarySchema` and the presentation `TOKEN_USAGE_UPDATED` payload (agent-presentation-contracts) are all `.strict()` and are parsed on the server (collaboration stream) and in the web (`tokenUsageRunSummaryMapper.ts:28`). The design adds `revision` and `context_compaction_threshold_tokens` to the run summary and `reports_model_call` (plus threshold) to the live token event, but maps neither contract package. This gap also affected the threshold field in SR-003; round 1 did not catch it.
- Material premise: MP-04 (Reachable)
- Required update: add the contract files to the allocation, final file mapping and sequence:
  - `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts`: `revision`, `context_compaction_threshold_tokens`.
  - `autobyteus-agent-presentation-contracts/src/token-usage-presentation-dto.ts`: `agentTokenUsageRunSummarySchema` with the same fields.
  - `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts`: `token` payload `reports_model_call`, `context_compaction_threshold_tokens`.
  - Each package's existing schema tests, and the dist build where consumers use built output.

  Place them before the server DTO and web steps (sequence step 2/5). Add a contract-schema test asserting that a summary with the new fields parses and that the web mapper preserves `revision` and threshold.
- Why proportionate: field additions in existing owners plus one test. The live path for every run kind depends on these schemas.
- Recommended recipient: `/software_engineering_team/solution_designer`

## Classification

N/A — Pass. Earlier findings were `Design Impact` and are all resolved.

## Recommended Recipient

`/software_engineering_team/implementation_engineer`. `/software_engineering_team/solution_designer` receives an informational pass notification.

## Residual Risks

- RR-1 (non-blocking): per-call Claude pricing has no first-party-provider guard. The Solution Designer's position (SR-004) is that non-first-party Claude routes are an unsupported configuration. Accepted; no machinery.
- RR-2: AGY `step_index` uniqueness across a resumed conversation is a validation item (SR-004: if indices restart, the key adds the process generation).
- RR-3: historical Claude `usage_report_count` values count turns; new increments count calls. This is display-only. Mention it in the `token_usage.md` rewrite.
- RR-4: per-call identity is the API response `message.model`, while turn-end identity is `modelUsage`'s canonical model. They match for current main models (AF-09). A dated response id would split identity summaries and leave per-call cost `price_missing`. The design already acknowledges this as a tradeoff.
- RR-5: ASM-001 (SDK/CLI field stability at the pinned versions) remains open by design. The fixture tests cover it.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-01, MP-02 and MP-04 were Reachable and drove findings that are now resolved; MP-03 unsupported and non-blocking)
- Notes: The design is ready for implementation. The behavior basis is confirmed, the persisted-data decisions are proportionate, and no in-scope machinery depends on an unsupported premise. Implementation should honor D-9 (revision freshness), D-10 (awaited per-call emission) and the step-2 contract-package build order, and should validate RR-2 on a restored AGY run.
