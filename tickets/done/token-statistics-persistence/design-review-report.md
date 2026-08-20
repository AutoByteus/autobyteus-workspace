# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/design-spec.md`
- Supplemental Task Artifacts Reviewed: None.
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Initial architecture review after explicit user approval of the design-ready bug-fix boundary on 2026-08-20.
- Prior Review Round Reviewed: None.
- Latest Authoritative Round: Round 1 / `ARCH-REV-001`.
- Current-State Evidence Basis: Canonical solution artifacts plus independent review of the relevant code at `1b2e9b94d1de3b7f38aa2803082e0166a469a978`: server persistence transformer/accumulator/fold and summary projection, GraphQL queries/resolvers, standalone and team stream projections, strict shared team DTOs, `TeamStreamingService` production dispatch, Token Usage Pinia store, workspace-scope composable, and focused test locations. The selected-run SQLite/GraphQL probes and 20/20 focused baseline tests are recorded in the investigation notes. The worktree is eight commits behind `origin/personal`; a targeted reviewer diff confirmed those commits do not change the reviewed token paths.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Restore and continuously converge the right-side Token tab to the server's cumulative current record for an exact standalone run or focused team member, without changing accounting, pricing, persistence, schema, or UI design.
- Relevant existing behavior and evidence confirmed: The awaited per-run fold persists before emitting `run_summary_after_event`; GraphQL reads the same record; current frontend run/member delta objects suppress hydration; team events currently traverse both the team-token effect and the child-agent projection; the team aggregate alone has an explicit source/readiness rule.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): `Yes`
- Approved change, preserved behavior, and outside scope understood: `Yes`; the review does not reopen the approved product boundary.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`; no blocking finding remains.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System/Contract | Pass | Pass | Pass | Confirmed | None; preserve the current-record writer/readers and no-migration outcome. |
| BEH-002 | User/System | Pass | Pass | Pass | Confirmed | None; DS-001/DS-002/DS-004 make standalone entries record-backed and generation-admitted. |
| BEH-003 | User/System | Pass | Pass | Pass | Confirmed | None; DS-001/DS-003/DS-004 preserve exact team/member identity and the persisted member snapshot. |
| BEH-004 | User/System | Pass | Pass | Pass | Confirmed | None; DS-003/DS-005 preserve backend aggregate ownership while closing the inclusive-response/delta race. |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | None; record-backed summaries remain display-ready and components remain presentational. |
| BEH-006 | System/Contract | Pass | Pass | Pass | Confirmed | None; single-run generation admission and team dirty-generation refresh cover the approved interleavings. |

## Supplemental Artifact Coherence Verdict

None. The investigation notes contain the canonical supplement inventory and explicitly state that no supplemental task artifacts apply.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements, investigation, and design all classify this as a bug fix. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` with contributing `Shared Structure Looseness` is supported by mixed-meaning run/member maps and raw-existence guards, contrasted with the team-total precedent. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design selects a bounded refactor now. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Record-only individual caches, store-owned admission/readiness, duplicate-cache removal, exact DTO mapping, and aggregate lifecycle replacement are all mapped to files and sequence. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end reopen/focus hydration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Standalone post-persist return/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Team-member post-persist return/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded individual-snapshot admission | Pass | Pass | N/A — the Pinia store is directly named as the governing owner. | Pass | Pass | Pass | Pass |
| DS-005 | Bounded team-aggregate convergence | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-001 spans the supported surface through exact subject selection, store readiness, network boundary, authoritative current-record store/SQLite, admission, and rendered outcome. DS-002/DS-003 expose the meaningful post-persistence return paths rather than replacing DS-001 with local transport fragments.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server token current-record subsystem | Pass | Pass | Pass | Pass | GraphQL and the persisted event snapshot expose the same cumulative meaning; frontend code does not reconstruct pricing. |
| Shared team stream summary contract | Pass | Pass | Pass | Pass | The proposed exact nested schema owns wire validation only. |
| Frontend Token Usage store | Pass | Pass | Pass | Pass | Identity-specific admission/readiness replaces raw map writes and raw-existence policy. |
| Workspace Token scope | Pass | Pass | Pass | Pass | It owns subject selection and fetch lifecycle, but delegates cache truth to the store. |
| Token Meter components | Pass | Pass | Pass | Pass | Rendering remains downstream of approved display state. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server persistence/current record | Pass | Pass | Pass | Pass | No frontend or presentation dependency. |
| Team adapter/projector and shared contract | Pass | Pass | Pass | Pass | Copy/validate the canonical payload; do not recompute it or reach into storage. |
| Frontend wire mapper | Pass | Pass | Pass | Pass | Converts DTO to frontend domain shape without cache access. |
| Token Usage store | Pass | Pass | Pass | Pass | Owns writes, identity, precedence, readiness, and aggregate generations. |
| Workspace scope and components | Pass | Pass | Pass | Pass | Scope calls store APIs; components cannot bypass into GraphQL, pricing, wire DTOs, or raw maps. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `run_summary_after_event` | Pass | Pass | Pass | Low | Pass |
| `mapTokenUsageRunSummaryDto` | Pass | Pass | Pass | Low | Pass |
| `upsertRecordBackedAgentRunSummary` | Pass | Pass | Pass | Low | Pass |
| `upsertRecordBackedTeamMemberSummary` | Pass | Pass | Pass | Low | Pass |
| `needsAgentRunSummaryHydration` | Pass | Pass | Pass | Low | Pass |
| `needsTeamMemberSummaryHydration` | Pass | Pass | Pass | Low | Pass |
| `fetchTeamRunSummary` generation-captured refresh | Pass | Pass | Pass | Low | Pass |

The design removes the ambiguous generic `upsertSummary` seam and makes compound member identity mandatory. The shared private admission helper does not escape as an identity-erasing public API.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Durable cumulative source | Pass | Pass | N/A | Pass | Reuse SQLite current records and current fold. |
| Durable reopen/focus reads | Pass | Pass | N/A | Pass | Existing network-only, field-complete GraphQL queries remain authoritative. |
| Strict team transport | Pass | Pass | N/A | Pass | Extend the existing team contract instead of adding an unchecked parallel shape. |
| Frontend cache/readiness | Pass | Pass | N/A | Pass | Refactor the existing store owner. |
| Shared frontend summary conversion | Pass | Pass | Pass | Pass | One focused mapper removes duplicated standalone/team conversion. |
| Token-tab orchestration/presentation | Pass | Pass | N/A | Pass | Reuse the composable and components at their current boundaries. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server token usage | Pass | Pass | Pass | Pass | Continues to own persistence, pricing, and cumulative summary production. |
| Team streaming/contracts | Pass | Pass | Pass | Pass | Owns lossless strict transport of the member snapshot. |
| Web agent streaming | Pass | Pass | Pass | Pass | Owns wire conversion for both live routes. |
| Web Token Usage store | Pass | Pass | Pass | Pass | Governing frontend owner for all cache lifecycle rules. |
| Workspace Token scope | Pass | Pass | Pass | Pass | Owns exact subject selection and fetch orchestration only. |
| Token Meter components | Pass | Pass | Pass | Pass | Rendering-only allocation is preserved. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Full snake_case cumulative summary schema/type | Pass | Pass | Pass | Pass | A contract-owned schema is required by the strict team stream and can also validate the identical standalone payload without duplicating the field set. |
| Wire-to-camel summary mapping | Pass | Pass | Pass | Pass | One web streaming adapter serves both event routes. |
| Record-backed generation admission | Pass | Pass | Pass | Pass | A private store helper shares precedence while public methods preserve subject identity. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageRunSummaryDto` | Pass | Pass | Pass | Pass | Pass | Mirrors the canonical server payload, including nested unit-price states; it does not own business calculation. |
| Frontend `TokenUsageRunSummary` | Pass | Pass | Pass | Pass | Pass | Remains the camelCase display/domain form behind one boundary mapper. |
| Individual cache entry | Pass | Pass | Pass | N/A | Pass | One meaning only: record-backed cumulative summary. |
| Team aggregate entry | Pass | Pass | Pass | Pass | Pass | Value, lifecycle state, and generations are kept together under one owner. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts` | Pass | Pass | Pass | Pass | Exact reusable wire schema/type. |
| `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts` and `src/index.ts` | Pass | Pass | Pass | Pass | Compose/export the nested summary; do not duplicate its fields. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-event.ts` | Pass | Pass | Pass | Pass | Correlated team-event representation only. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-agent-event-adapter.ts` | Pass | Pass | Pass | Pass | Preserve/validate raw-to-domain summary data. |
| `autobyteus-server-ts/src/services/agent-streaming/team-agent-event-websocket-projector.ts` | Pass | Pass | Pass | Pass | Project domain event into the strict wire contract. |
| `autobyteus-web/services/agentStreaming/tokenUsageRunSummaryMapper.ts` | Pass | Pass | Pass | Pass | Exact reusable frontend boundary conversion. |
| `autobyteus-web/types/tokenUsageMeter.ts` | Pass | Pass | Pass | Pass | Domain/event typing only. |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Pass | Pass | Pass | Pass | Cohesive cache lifecycle owner despite being the largest edited file. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Pass | Pass | Pass | Pass | Fetch/loading/error orchestration with duplicate summary values removed. |
| Focused tests near each owner | Pass | Pass | N/A | Pass | Coverage responsibilities follow contract, projection, mapping, store, and surface boundaries. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-team-stream-contracts/src` and tracked `dist` | Pass | Pass | Low | Pass | Source owns the contract; dist is generated package output. |
| Server team domain/adapter paths | Pass | Pass | Low | Pass | Correlation and admission stay in the existing capability area. |
| Server team websocket projector | Pass | Pass | Low | Pass | Wire projection remains at the transport boundary. |
| `autobyteus-web/services/agentStreaming` | Pass | Pass | Low | Pass | Shared wire mapping belongs beside both stream adapters. |
| `autobyteus-web/stores` | Pass | Pass | Low | Pass | Existing cache owner is extended rather than fragmented. |
| `autobyteus-web/composables` / usage components | Pass | Pass | Low | Pass | Async UI scope and presentation remain separate. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Individual `applyToSummary` delta accumulation | Pass | Pass | Pass | Pass | Narrow team-provisional folding may remain under an aggregate-specific name. |
| Raw run/member existence hydration guards | Pass | Pass | Pass | Pass | Store-owned readiness methods replace them. |
| `memberSummaryByKey` | Pass | Pass | Pass | Pass | Store member entry is the only summary cache. |
| Generic `upsertSummary` | Pass | Pass | Pass | Pass | Explicit run/member admission methods replace it. |
| Loose `teamSummarySources` metadata | Pass | Pass | Pass | Pass | One aggregate entry owns value/state/generation. |
| Blind delta extension of record-backed aggregate | Pass | Pass | Pass | Pass | Dirty-generation backend refresh replaces it. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Delta-only individual summary path | No | Pass | Pass | Removed rather than kept as a mixed-version fallback. |
| Generic/old readiness APIs and team-source names | No | Pass | Pass | No aliases are retained. |
| Null/malformed post-persist summary handling | No | Pass | Pass | This is a current failure/fallback condition to GraphQL, not historical compatibility. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| SQLite `token_usage_run_records` current run records | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Direct SQLite and GraphQL evidence agrees; no database/schema/model change is proposed, and rewriting existing history would not address the frontend defect. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Contract -> server projection -> frontend mapping | Pass | Pass | Pass | Pass |
| Individual store/readiness refactor | Pass | Pass | Pass | Pass |
| Team aggregate lifecycle replacement | Pass | Pass | Pass | Pass |
| Focused validation and downstream handoff | Pass | Pass | Pass | Pass |

The sequence establishes the strict contract before its producers/consumers, then changes cache policy, removes obsolete seams, and adds owner-local regressions. No unsafe persisted-data transition is interleaved.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Individual snapshot precedence | Yes | Pass | Pass | Pass | Count 200 vs 199 makes live/GraphQL ordering concrete. |
| Missing snapshot and truthful readiness | Yes | Pass | Pass | Pass | The design explicitly avoids constructing a zero/null lifetime summary. |
| Exact team/member identity | Yes | Pass | Pass | Pass | Compound identity and mismatch rejection are explicit. |
| Inclusive team aggregate race | Yes | Pass | Pass | Pass | Dirty generation is contrasted with blindly extending an inclusive result. |

## Material Premise Validation (Only When Needed)

None. The design's lifecycle machinery is grounded directly in the approved UC-003/UC-004 and BEH-006 paths: the supported workspace Token tab can hydrate while a normally running standalone or team member produces post-persist token events. No finding or target mechanism depends on a separate hypothetical production, failure, or lifecycle premise.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

The behavior basis is confirmed, the design is actionable in the current codebase, the persisted-data decision is evidence-backed, and no blocking requirement, design, or evidence gap remains.

## Findings

None.

## Classification

N/A — passed without a blocking `Design Impact`, `Requirement Gap`, or `Unclear` finding.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- The strict cumulative-summary schema and frontend mapper are broad. Implementation/code review must compare every field against `TokenUsageRunSummaryPayload`, including all unit-price entries, nullable cost/status fields, runtime, prompt/context, and `usage_report_count`; the generation field should retain its server invariant as a non-negative safe integer rather than merely an arbitrary finite number.
- Team aggregate convergence must implement the designed state machine literally: one in-flight request per exact team, at most one coalesced dirty follow-up at a time, and readiness only for a response whose captured live generation remains stable. Continuous live activity may keep the row explicitly refresh-required, but must not create parallel fetches or falsely mark a stale result current.
- The full cumulative websocket snapshot modestly increases payload size. This is proportionate to AC-002/AC-006 and removes ambiguous client arithmetic, but transport fixtures should exercise representative fully populated summaries.
- Frontend dependencies are absent in the ticket worktree. This is an implementation setup risk; authoritative checks must run in the task worktree before implementation handoff.
- The branch is eight unrelated commits behind `origin/personal`; no reviewed token path changed. Normal integration remains a downstream delivery responsibility.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `ARCH-REV-001` approves `SR-001` for implementation. The pass depends on the canonical record-backed individual-cache invariant, exact live-summary transport/mapping, single-run `usageReportCount` admission, exact team/member identity, and generation-aware single-flight team aggregate refresh described in the design spec.
