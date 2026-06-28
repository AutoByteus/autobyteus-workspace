# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/design-spec.md`
- Current Review Round: 1
- Trigger: User-approved solution design package handed off by `solution_designer` for architecture review on 2026-06-28.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the upstream artifacts, the Codex/Claude evidence summaries, and current task-worktree source files for Codex token mapping/queue/dispatch, shared token-usage projection, Claude token mapping, ledger persistence, and Token Meter UI. The task branch is currently behind `origin/personal` by 16 commits; reviewed diff against `origin/personal` for relevant areas showed only localization path drift, which the design already allows via “current localization files.”

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial handoff from `solution_designer` | N/A | No | Pass | Yes | Design is implementation-ready with residual risks called out below. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/design-spec.md` against the shared design principles, requirements, investigation notes, evidence summaries, and current code shape.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design identifies a bug fix plus targeted refactor and UX clarity improvement. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies Codex as `Local Implementation Defect` plus `Missing Invariant`, backed by current `pendingTurnTokenUsage` overwrite behavior and live total-vs-last probes. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Codex parser/queue and shared baseline support are in-scope; historical backfill and Claude source-authority switch are deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, removal plan, migration sequence, and test plan all reflect the Codex refactor; Claude remains direct-delta with diagnostics only. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First review round. | N/A |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Shared runtime accounting | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Codex correction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Direct-delta runtimes | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Return/event UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local reconciliation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex runtime adapter | Pass | Pass | Pass | Pass | Correct owner for Codex raw field mapping, latest prompt metadata, idempotency, and queueing. |
| Shared token usage projection | Pass | Pass | Pass | Pass | Correct owner for component basis, cumulative diffing, baseline, and flags. |
| Claude runtime adapter | Pass | Pass | Pass | Pass | Correctly keeps Claude as terminal-result `per_turn`; diagnostics stay provider-local. |
| AutoByteus native runtime | Pass | Pass | Pass | Pass | Guarded as direct `per_call`; no unnecessary change. |
| Token usage ledger/store | Pass | Pass | Pass | Pass | Reused for persistence/summaries; historical backfill remains out of scope. |
| Token Meter frontend | Pass | Pass | Pass | Pass | Presentation-only copy/tooltip changes; no provider math. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Cumulative source/provider-delta metadata keys and token field list | Pass | Pass | Pass | Pass | New provider-neutral helper under token-usage projections is justified; avoids Codex field leakage. |
| Component basis calculation for baseline/provider delta | Pass | Pass | Pass | Pass | Design correctly warns against duplicating gross/cache/standard math. |
| Runtime semantics contract | Pass | N/A | Pass | Pass | Expressed through canonical fields, not an empty strategy framework. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `reported_*` fields | Pass | Pass | Pass | N/A | Pass | Scope-dependent meaning is controlled by `usage_scope`; source snapshot is preserved before mutation. |
| `snapshot_series_key` | Pass | Pass | Pass | N/A | Pass | Explicitly only for cumulative counter series. |
| Provider-delta metadata | Pass | Pass | Pass | Pass | Pass | Canonical snake_case fields prevent raw Codex leakage. |
| `latest_prompt_tokens` | Pass | Pass | Pass | N/A | Pass | Design correctly sources Codex latest prompt from `last.inputTokens`, not cumulative total. |
| `raw_event_json` metadata envelope | Pass | Pass | Pass | N/A | Pass | Existing projection already stores owned cumulative metadata here; design limits shared reads to Autobyteus-owned keys. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `pendingTurnTokenUsage` as Codex accounting gate | Pass | Pass | Pass | Pass | Replaced by immutable/deduped usage-update queue. |
| `recordTurnTokenUsage` / turn-final naming | Pass | Pass | Pass | Pass | Rename away from misleading accounting semantics. |
| Codex `last` as whole-turn `per_turn` | Pass | Pass | Pass | Pass | Replaced by cumulative `total` source plus provider-delta metadata. |
| First-snapshot assume-origin behavior for Codex | Pass | Pass | Pass | Pass | Replaced by provider-delta baseline for Codex. |
| Frontend ambiguous “current prompt”/run-total copy | Pass | Pass | Pass | Pass | Replaced by latest-prompt/run-total labels and tooltips. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Pass | Pass | Pass | Pass | Codex parser only; no shared delta policy. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Pass | Pass | Pass | Pass | Thread owns provider event intake/queue, not pricing/delta math. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Pass | Pass | N/A | Pass | Routes notifications; design does not overload it. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | Pass | Pass | N/A | Pass | Dispatch bridge emits canonical events only. |
| `autobyteus-server-ts/src/token-usage/projections/cumulative-snapshot-reconciliation-metadata.ts` | Pass | Pass | Pass | Pass | Small owned helper, provider-neutral. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts` | Pass | Pass | Pass | Pass | Existing cumulative owner extended, not bypassed. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts` / domain helper | Pass | Pass | Pass | Pass | Existing component-basis owner remains authoritative. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Pass | Pass | N/A | Pass | Claude source diagnostics remain in Claude adapter. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` + localization | Pass | Pass | N/A | Pass | Presentation copy only. |
| `autobyteus-server-ts/tests/...` / frontend tests | Pass | Pass | N/A | Pass | Coverage ownership is appropriate. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime adapters | Pass | Pass | Pass | Pass | May import shared canonical types/helpers; must not compute run totals/costs. |
| Shared token projection | Pass | Pass | Pass | Pass | May use ledger latest snapshot; must not parse Codex protocol fields. |
| Frontend Token Meter | Pass | Pass | Pass | Pass | May consume server summaries; must not parse raw provider JSON. |
| Claude adapter | Pass | Pass | Pass | Pass | May compare `usage`/`modelUsage`; must not use Codex cumulative diffing. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime adapter parser | Pass | Pass | Pass | Pass | Raw provider shapes are interpreted before the shared event boundary. |
| Token usage projection pipeline | Pass | Pass | Pass | Pass | Component basis, snapshot diff, cost, and flags stay backend-owned. |
| Token usage ledger/store | Pass | Pass | Pass | Pass | Summaries are authoritative for UI/API. |
| Token Meter frontend | Pass | Pass | Pass | Pass | Design keeps it presentation-only. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `resolveCodexThreadTokenUsage` target shape | Pass | Pass | Pass | Low | Pass |
| `CodexThread.recordTokenUsageUpdate` target method | Pass | Pass | Pass | Low | Pass |
| `CodexThread.consumeReadyTokenUsageUpdates` target method | Pass | Pass | Pass | Low | Pass |
| `TokenUsageSnapshotDeltaNormalizer.normalizeAccountingDelta` | Pass | Pass | Pass | Low | Pass |
| `buildClaudeTokenUsageEvent` | Pass | Pass | Pass | Low | Pass |
| Token usage summary GraphQL/live API | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Pass | Pass | Low | Pass | Existing Codex thread adapter boundary. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/` | Pass | Pass | Low | Pass | Existing run-backend dispatch bridge. |
| `autobyteus-server-ts/src/token-usage/projections/` | Pass | Pass | Low | Pass | Shared projection helpers belong here. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/` | Pass | Pass | Low | Pass | Existing Claude SDK parser boundary. |
| `autobyteus-web/components/workspace/usage/` and localization files | Pass | Pass | Low | Pass | UI display/copy owner. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider raw extraction | Pass | Pass | N/A | Pass | Runtime adapters already own this. |
| Shared token shape | Pass | Pass | N/A | Pass | Existing `TOKEN_USAGE_UPDATED` contract is tightened, not replaced. |
| Cumulative snapshot diff | Pass | Pass | N/A | Pass | Existing normalizer is the right owner. |
| Component basis math | Pass | Pass | Pass | Pass | Reuse/extract pure helper if needed. |
| Token summary/UI | Pass | Pass | N/A | Pass | Existing ledger/store/UI path reused. |
| Runtime strategy selection | Pass | Pass | N/A | Pass | Avoids unjustified registry indirection. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Codex turn-id accounting map | No desired retention | Pass | Pass | Explicitly removed as accounting gate. |
| Codex `last` as `per_turn` | No desired retention | Pass | Pass | Replaced with cumulative snapshot semantics. |
| Frontend-only accounting fix | No desired retention | Pass | Pass | Explicitly rejected. |
| Claude direct `per_turn` behavior | N/A | Pass | Pass | Retained because it is current correct behavior, not legacy. |
| Historical ledger backfill | N/A | Pass | Pass | Explicitly out of scope; no compatibility wrapper introduced. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared metadata helper before normalizer changes | Pass | Pass | Pass | Pass |
| Snapshot normalizer baseline before Codex switches to cumulative snapshots | Pass | Pass | Pass | Pass |
| Codex parser and queue replacement | Pass | Pass | Pass | Pass |
| Claude diagnostics without source switch | Pass | Pass | Pass | Pass |
| Frontend label/tooltips | Pass | Pass | Pass | Pass |
| Durable coverage sequence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex first snapshot baseline | Yes | Pass | Pass | Pass | Example prevents historical overcount. |
| Codex later snapshot catch-up | Yes | Pass | Pass | Pass | Example explains why cumulative total wins over `last` after prior baseline. |
| Claude terminal SDK internal loop | Yes | Pass | Pass | Pass | Example prevents accidental Codex treatment. |
| AutoByteus native direct call | Yes | Pass | N/A | Pass | Sufficient guardrail. |
| Frontend latest prompt vs run totals | Yes | Pass | Pass | Pass | Copy examples make UI scope clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Historical Codex ledger backfill | Existing rows can remain undercounted. | None for this implementation; design explicitly scopes forward correctness only. | Accepted residual risk. |
| Claude `usage` vs `modelUsage` source authority | Production samples diverge, but live probes did not prove which source is authoritative. | Preserve both and add/keep diagnostics; do not switch source in this ticket. | Accepted residual risk / follow-up candidate. |
| Codex provider event id stability | Wrong idempotency key can double-count or drop updates. | Implement fallback key using run/thread plus cumulative token tuple as designed; test duplicate and advancement cases. | Implementation risk, not design blocker. |
| Task branch behind `origin/personal` | Implementation may see minor localization path drift. | Use current localization files when editing UI copy; delivery will refresh integrated state later. | Non-blocking. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A - no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- First Codex cumulative snapshot baseline must map provider-delta metadata through the same component-basis semantics as normal deltas; otherwise the design could still overcount or misbucket cache/read tokens.
- Idempotency must include enough cumulative-token identity to avoid dropping real same-turn advancements while still deduplicating exact replays.
- Claude source-authority remains intentionally unresolved; this ticket should only preserve/flag divergence unless requirements change.
- Localization files may have drifted on `origin/personal`; implementation should locate current copy owners before frontend edits.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Design satisfies the authoritative-boundary rule: runtime adapters interpret provider raw shapes, shared token-usage projection owns accounting deltas/component basis/quality flags, and frontend remains presentation-only. Proceed to implementation with the artifact package listed in the handoff.
