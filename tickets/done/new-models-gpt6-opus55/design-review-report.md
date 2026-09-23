# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/requirements-doc.md` (Approved SR-014 context correction; Approved SR-011 monetary, SR-009 selected-only and SR-002 original bases).
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/investigation-notes.md` (I-01–I-45).
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/solution-revision-record.md`.
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-spec.md` (current DS-018/SR-014 context correction over SR-012 monetary design; SR-010 identity/checkpoint and SR-008 readiness retained).
- Supplemental Task Artifacts Reviewed: None behavior-defining. I-45 Claude/Codex Electron screenshots (visually inspected), read-only isolated DB facts, sanitized I-41–I-44 test/logs, prior specialist reports and WIP code are evidence/context only; none is behavior-defining. I-44 failed guard remains a disclosed probe limitation, not a command-safety pass.
- Relevant Solution Revision IDs: Approved SR-014, DS-018; Approved SR-011/SR-012 monetary basis; SR-013 evidence; SR-010 retained identity/checkpoint basis. Prior architecture result: ARCH-REV-008.
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: ARCH-REV-009.
- Current Review Round: 9.
- Trigger: User-approved live Claude SDK known-context Token Meter defect correction, SR-014/DS-018, after ARCH-REV-008.
- Prior Review Round Reviewed: ARCH-REV-008 Pass on SR-012/SR-013/Approved SR-011; it did not cover SR-014.
- Latest Authoritative Round: 9.
- Current-State Evidence Basis: I-45 Electron screenshots and read-only isolated DB values; Claude result builder, payload parser/fold, run-summary latest-record projection, existing GraphQL/stream fields, Vue known-capacity gate and Codex control; I-37–I-44/ARCH-REV-008 retained monetary basis.

## Routing Classification Review

- Task size: Large.
- Architectural risk: High.
- Classification rationale reviewed: SR-014 alone is Small/Low and touches two existing owners, but the cumulative still-in-delivery SR-012/013 SDK result→money/quality→GraphQL/UI package remains Large/High; this is the configured review gate, not a claim that percentage derivation itself is high risk.
- Independent Architecture Review required by the classification: Yes.
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: Confirmed.
- Approved requirements / intended behavior understood: SCN-010/BEH-010/REQ-011/AC-015 require the existing meter to show latest Claude SDK prompt against a positive SDK-selected context capacity and a derived percentage, including old rows with valid prompt/capacity and null percent. Invalid/zero capacity remains unavailable; no model-name 1M guess. BEH-007–009/SR-011 selected tokens, configured money, historical snapshots and Codex behavior remain unchanged.
- Relevant existing behavior and evidence confirmed: Supported user selects Opus, runs Claude SDK, opens Token Meter. Real selected Opus results contained Haiku+Opus and cumulative per-model counts; exact `opus[1m]→claude-opus-5-5[1m]` SDK metadata was observed. I-41 live result had selected Opus 2 input/63 output/9617 read/7140 create and matching main-loop counts with 0/7140 5m/1h split. I-42 showed the same equality against selected per-model **deltas** on create→resume; I-43 showed equality on a tool-bearing result alongside separate Haiku, but its two assistant-frame output counts did not sum to terminal output. Installed SDK type says assistant usage is non-final. SDK main-loop and per-model scopes still differ in general. Current price provider resolves exact catalog model/observed-time policy; calculator prices component buckets and snapshots. I-45 read-only isolated DB shows Claude prompt=22,135, capacity=1,000,000, percent null; the Claude event omits percent, payload/fold retain null and Vue requires it. Codex control stores 10,836/258,400/≈4.1935 and renders normally. New monetary WIP remains outside this bounded correction and is not conformance evidence.
- Scope guardrail confirmed: Context display/derivation only; no token-category wording, cache arithmetic, selected identity, money, rate/catalog, schema or frontend production contract change. Do not invent a 1M capacity from model name. Codex and historical money remain preserved.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking Design Impact finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: Yes; no blocker found.
- Remaining material ambiguity, if any: None. The observed SDK result provided valid contextWindow; missing/zero/unsafe values retain the approved unavailable state. No inference about exact prompt text or why its cache-written prefix is large is needed.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001–006 | Original direct/Codex/SDK-upgrade paths | Pass | Pass | Pass | Confirmed | Preserve prior reviewed basis/regressions. |
| BEH-007 | Selected identity and configured estimate | Pass | Pass | Pass | Confirmed | Canonical selected rate identity, observation-time snapshot, API-equivalent not-bill copy. |
| BEH-008 | Selected-only cumulative tokens and split/approximation | Pass | Pass | Pass | Confirmed | DS-017 full path, all-dimension gate, marked 1h fallback, no SDK USD or Haiku price. |
| BEH-009 | Historical continuity | Pass | Pass | Pass | Confirmed | Old rows read as recorded; nullable checkpoint/readiness retained. |
| BEH-010 | Claude SDK known-context display | Pass | Pass | Pass | Confirmed | DS-018 derives producer percent and same-record old-null read projection; no rewrite or price change. |

## Supplemental Artifact Coherence Verdict

None behavior-defining. I-45 screenshot paths are indexed as observed UI evidence, not a new design supplement. Earlier I-41–I-44 probes retain their limited monetary/test applicability. Approval and applicability of screenshots/probes remain clear. No Product UI/UX supplement was requested; SR-014 reuses the existing known-capacity UI layout and copy.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Current posture present | Pass | SR-014 DS-018 design-health/transition plus retained SR-012 assessment. | None |
| Root cause evidence-backed | Pass | I-45 proves valid prompt/capacity persist with null percent; Claude event omits field while Vue correctly requires it. Codex producer already supplies percent. | None |
| Refactor decision explicit | Pass | Restore existing configured policy/calculator after trusted selected delta, not a second dollar calculator. | None |
| Decision reflected concretely | Pass | DS-017, owner/file map, removal of SDK-dollar authority, ordered tests. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001–009 | Original paths, unchanged | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-017 | Retained selected monetary path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-018 | User message→selected terminal contextWindow/prompt→event/fold→latest-record summary→GraphQL/stream→meter | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-015 | App startup→migration/readiness→checkpoint SQL use→meter | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010–016 | Bounded SDK identity/checkpoint segments | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-018 is the new context-display primary spine and reaches the exposed user outcome. DS-017 remains the prior reviewed monetary spine, not an alternate context owner.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK client/session/result adapter | Pass | Pass | Pass | Pass | Selected terminal raw contextWindow and latest full prompt are numeric-only; new percent is derived at event boundary. |
| Selected reconciler/run fold | Pass | Pass | Pass | Pass | Owns delta, split gate, assumption flag and dedupe. |
| Price provider/calculator | Pass | Pass | Pass | Pass | Sole configured-dollar/rate-snapshot owner. |
| SQL/projection/Token Meter | Pass | Pass | Pass | Pass | Latest-record projection repairs old null percent without mutating rows; existing UI contract stays. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK result→selected fold | Pass | Pass | Pass | Pass | Selected raw contextWindow only; no first-key, Haiku or model-name default. |
| Selected fold→configured price owner | Pass | Pass | Pass | Pass | Exact selected canonical ID only; no raw suffix, SDK cost or Haiku monetary shortcut. |
| Fold→run/team/UI | Pass | Pass | Pass | Pass | No private source cost/other-model detail projected. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Selected SDK contextWindow and latest prompt event fields | Pass | Pass | Pass | Low | Pass |
| Same-record run-summary percent projection | Pass | Pass | Pass | Low | Pass |
| Selected-match/delta and split attribution | Pass | Pass | Pass | Low | Pass |
| Configured policy resolution/calculation | Pass | Pass | Pass | Low | Pass |
| Durable quality flag and run-summary boolean | Pass | Pass | Pass | Low | Pass |
| Nullable checkpoint state/readiness | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Configured rate lookup/calculation | Pass | Pass | N/A | Pass | Retained unchanged; percent repair does not enter price owner. |
| SDK selected token accounting | Pass | Pass | Pass | Pass | Narrow existing reconciler and event type; no second ledger. |
| Quality/UI/readiness | Pass | Pass | N/A | Pass | Existing context summary/GraphQL/stream/Vue fields reused; no new schema or UI code. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude SDK adapter | Pass | Pass | Pass | Pass | Extract selected positive safe contextWindow and compute safe percent; monetary result handling retained. |
| Usage event/transactional fold | Pass | Pass | Pass | Pass | Persist existing context fields; selected token/cost fold unchanged. |
| Token pricing | Pass | Pass | Pass | Pass | Unchanged; no context-derived price effect. |
| Persistence/analytics/GraphQL/web | Pass | Pass | Pass | Pass | Same-record read projection supplies old null percentage; existing display branch now receives complete data. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Context percent formula | Pass | Pass | Pass | Pass | Tiny pure shared function optional only if it reduces duplication without new owner. |
| Existing pricing policy/calculator | Pass | Pass | Pass | Pass | Reused, not duplicated in SDK reconciler. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Latest prompt / selected contextWindow / percent | Pass | Pass | Pass | Pass | Pass | Same observation semantics and safe positive denominator; null old percent derived from same stored record only. |
| Configured price snapshot/assumption quality | Pass | Pass | Pass | Pass | Pass | SDK USD never masquerades as configured cost; assumed 1h is marked. |
| Private checkpoint/public summary | Pass | Pass | Pass | Pass | Pass | Historical SDK-dollar WIP not silently reinterpreted. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `claude-session-token-usage.ts` | Pass | Pass | Pass | Pass | Selected raw window and safe prompt/percent for new events. |
| `token-usage-run-aggregate.ts` | Pass | Pass | Pass | Pass | Old null-percentage read derivation from latest same record. |
| Accumulator/reconciler/fold | Pass | Pass | Pass | Pass | Selected delta, gate, policy handoff, dedupe. |
| Price provider/calculator/Anthropic row | Pass | Pass | Pass | Pass | One configured policy, no new row. |
| GraphQL/stream/Vue | Pass | Pass | Pass | Pass | Existing percent/capacity contract consumed unchanged; regression tests only. |
| SQL codec/startup readiness | Pass | Pass | Pass | Pass | Prior nullable transition retained; no new column. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude session event builder | Pass | Pass | Low | Pass | Existing runtime boundary. |
| Run-summary projection | Pass | Pass | Low | Pass | Existing read owner. |
| Token-usage fold/pricing/startup | Pass | Pass | Low | Pass | Separate selection and price owners. |
| API/web generated contracts and meter | Pass | Pass | Low | Pass | No production contract/UI change; existing fields render once complete. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Missing Claude context percentage | Pass | Pass | Pass | Pass | New producer field and same-record old-null read derivation replace unavailable display on known-capacity rows. |
| SDK cost backsolving/whole-total equality | Pass | Pass | Pass | Pass | No rate inference or reconciliation target. |
| First-key/alias/raw `[1m]` catalog pricing | Pass | Pass | Pass | Pass | Exact selected match and canonical price ID. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| New Claude context events | No | Pass | Pass | Producer writes derived percent; no parallel UI calculation. |
| Existing historical context rows | No | Pass | Pass | Version-agnostic same-record read projection; no stored rewrite or compatibility branch. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Historical context row with valid prompt/capacity and null percentage | Directly Usable — No Migration | Pass | Pass | N/A | Pass | I-45 actual row and current reader show stored source fields; same-latest-record read projection derives percent without rewrite. |
| Historical run/price snapshots | Directly Usable — No Migration | Pass | Pass | N/A | Pass | No monetary rewrite/backfill; old amounts/source retained. |
| SDK checkpoint SQL column | Migration Required, retained additive nullable | Pass | Pass | Pass | Pass | SR-008 migration, fixed RUN_COLUMNS, both startup gates, no admission on failure and restart validation retained. |
| Local/test WIP SDK-dollar JSON | Discard or Rebuild | Pass | Pass | N/A | Pass | Not a released contract; recreate disposable WIP/test state. If non-disposable deployed data is later found, reclassify before rollout; never reinterpret SDK dollars as configured cost. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| New-event context percent→old-row read projection | Pass | Pass | Pass | Pass |
| Configured calculator→summary/UI | Pass | Pass | Pass | Pass |
| SQL/readiness/old-row continuity | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| I-45 known context defect | Yes | Pass | Pass | Pass | 22,135/1,000,000→2.2135%; Codex control; null/zero/unsafe and latest-record cases specified. |
| Mismatched main-loop and fallback | Yes | Pass | Pass | Pass | Selected tokens unchanged; marked configured 1h assumption, no top-level token substitution. |
| Missing canonical/rate, zero write, SDK-dollar disagreement | Yes | Pass | Pass | Pass | Missing/partial, no assumption for zero, dollar source ignored. |

## Material Premise Validation (Only When Needed)

### MP-005 — Main-loop cache split may match a selected result's per-turn delta
- Related approved requirement or established contract: REQ-009/AC-013; SDK result contracts and Approved SR-011.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: User.
- Independent product-supported initiating trigger or applicable governing contract: User selects Opus in an existing Claude SDK agent run and completes a turn.
- Support evidence: I-41 single, I-42 create→resume, I-43 tool-bearing sanitized real selected-Opus turns; SDK terminal/top-level/per-model types. I-44 limits command-gating claims only.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: model selector/run → Claude session active query → terminal result with selected Opus per-model row and main-loop split → sanitized event → selected delta fold → all-dimension gate → configured calculator → meter.
- Lifecycle preconditions and material consequence at the claimed point: In I-41–I-43 all four terminal main-loop counts matched the selected delta and 5m+1h equaled aggregate write, including a resumed cumulative delta and a tool-bearing result. Other result shapes may not; exact split is admitted only at the equality gate, otherwise the approved marked fallback is used.
- Reachability: Reachable.
- Review consequence / proportionate response: The gate uses observed split without claiming universal equality; fallback is bounded by user delegation and visibility.

### MP-006 — Streamed assistant-frame usage is not final terminal usage
- Related approved requirement or established contract: REQ-009/AC-013; installed SDK `SDKAssistantMessage` and terminal `SDKResultSuccess` contract.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: User.
- Independent product-supported initiating trigger or applicable governing contract: User runs a Claude SDK agent turn that invokes a supported tool.
- Support evidence: Existing Claude SDK tool integration and REQ-007/AC-010 preserve tool turns; I-43 observed tool-use/text assistant frames plus terminal result. Installed SDK declaration says assistant usage is non-final and terminal result carries total usage. I-44 shows the probe's `canUseTool` callback was shadowed; it is **not** evidence of command-level gating.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: user tool-capable run → Claude session active query → assistant tool-use/user tool-result/assistant text frames → terminal result → result-only numeric parser → selected raw delta/reconciliation → configured price → meter.
- Lifecycle preconditions and material consequence at the claimed point: Assistant outputs 16+39 did not equal terminal output 113; summing frames would undercount. Assistant `model` was canonical whereas result key was raw suffixed; joining those directly would miss selected usage.
- Reachability: Reachable for tool-bearing return shape; command-level callback safety in that probe remains unverified and is not used to justify the design.
- Review consequence / proportionate response: SR-012 explicitly excludes assistant-frame usage and preserves SDK selected-value→resolved-raw result-key matching.

### MP-004 — Selected model may change before supported run resume
- Related approved requirement or established contract: REQ-009/AC-013; existing stopped-run Settings model-edit contract.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: User.
- Independent product-supported initiating trigger or applicable governing contract: User changes stopped-run model in Settings and resumes.
- Support evidence: `standalone-agent-run-lifecycle-service.ts` commits saved model for resume; Claude bootstrapper reads it.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Settings edit → saved model → activation/resume → selected SDK turn → cumulative per-model result → checkpoint fold → meter.
- Lifecycle preconditions and material consequence at the claimed point: Prior raw cumulative values may be present. Per-raw checkpoint prevents importing hidden prior usage when selection changes.
- Reachability: Reachable.
- Review consequence / proportionate response: Retained all-source private checkpoints remain justified.

### MP-003 — Updated checkpoint writer requires deployed SQL column
- Related approved requirement or established contract: REQ-009/AC-013, REQ-010/AC-014; startup current-schema gate.
- Relevant behavior ID(s): BEH-008/009.
- Initiating basis kind: Operational.
- Independent product-supported initiating trigger or applicable governing contract: Operator starts updated app with existing SQL data.
- Support evidence: Server/standalone migration before physical column assertion and run-store readiness.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: startup → migration → Prisma/assertion → SDK event/fold → SQL checkpoint writer → meter.
- Lifecycle preconditions and material consequence at the claimed point: Missing column blocks admission; corrected restart reruns gate; old rows read null without rewrite.
- Reachability: Reachable.
- Review consequence / proportionate response: ARCH-F-004 remains resolved; transition retained.

## Unresolved Approved-Behavior Or Current-State Gaps

None. I-45 establishes the user-facing defect and stored-data shape; no additional scope or new UI journey is inferred.

## Review Decision

**Pass.** SR-014/DS-018 is a bounded, actionable repair of the approved known-context display, with a same-record historical read and no migration, price/token or Codex behavior change.

## Findings

None. ARCH-F-001–004 remain resolved; ARCH-REV-008 remains the prior monetary authority and does not preapprove SR-014.

## Classification

N/A — no open architecture finding.

## Recommended Recipient

/implementation_engineer for cumulative reviewed package; /solution_designer informational after primary handoff. Source, API/E2E and delivery gates for the cumulative SR-014/SR-011 package remain required.

## Residual Risks

The current packaged Electron build remains defective until source/API-E2E/rebuild and user verification. Future SDK results can omit contextWindow; keep truthful unavailable state, never infer 1M from Opus name. Prior monetary residuals (active-turn identity, firstParty mapping, strict cache split gate/visible fallback) remain implementation gates, not SR-014 percentage changes.

## Latest Authoritative Result

- Review Decision: Pass.
- Material-Premise Gate: Pass — I-45 gives an independent user-triggered Electron journey and actual same-record stored prompt/capacity/null-percent state; no speculative lifecycle machinery.
- Notes: ARCH-REV-009 reviews DS-018/SR-014 on Approved SR-014; cumulative Large/High unchanged although the delta is Small/Low. ARCH-REV-008 remains prior monetary basis.
