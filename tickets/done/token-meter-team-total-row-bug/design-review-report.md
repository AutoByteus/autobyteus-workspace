# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/design-spec.md`
- Current Review Round: 1
- Trigger: Initial design review handoff from `solution_designer` for the Token tab `Team total` bug.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Requirements, investigation notes, design spec, and direct code inspection of `autobyteus-web/stores/tokenUsageMeterStore.ts`, `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts`, `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue`, frontend tests, and backend GraphQL/ledger aggregate files.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | No blocking findings | Pass | Yes | Design is actionable and correctly assigns the missing invariant to the frontend store boundary. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/design-spec.md`.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design identifies the task as a bug fix. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies the issue as Missing Invariant and Shared Structure Looseness, supported by `teamSummaries` being used for both provisional live values and ledger-backed aggregate values. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design calls for a small/local refactor in the store/composable boundary. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, provenance model, removal plan, dependency rules, and migration sequence all support the refactor. Backend `runId` identity looseness is explicitly deferred with a constraint not to depend on it. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary Token tab render path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Live token usage event return path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Ledger-backed aggregate hydration path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Store write/provenance local spine | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Presentational render local spine | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web Token Usage Store | Pass | Pass | Pass | Pass | Correct owner for team summary value cache, live merge, GraphQL hydration, and source/completeness invariant. |
| Web Token Usage Workspace Scope | Pass | Pass | Pass | Pass | Correct owner for active workspace hydration orchestration, provided it uses the store guard. |
| Web Token Usage Components | Pass | Pass | Pass | Pass | Correctly kept presentational. |
| Server Token Usage Ledger | Pass | Pass | Pass | Pass | Existing aggregate API is reused; no backend value aggregation change is needed for this bug. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team summary provenance/source state | Pass | N/A | Pass | Pass | Keeping the small type and metadata local to `tokenUsageMeterStore.ts` is appropriate. |
| Fetch-needed predicate | Pass | N/A | Pass | Pass | Store-owned method avoids duplicating freshness policy in the composable. |
| Unit-price normalization | Pass | N/A | Pass | Pass | Reuses existing store normalization helpers. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `teamSummaries[teamRunId]` with source/provenance metadata | Pass | Pass | Pass | N/A | The proposed provenance split corrects the current ambiguous meaning. |
| `TokenUsageRunSummary.runId` for team aggregate payloads | Pass | Pass | Pass | N/A | Design explicitly forbids using response `runId` as proof of team aggregate identity and keys by requested `teamRunId`. |
| `upsertSummary(summary)` write behavior | Pass | Pass | Pass | N/A | Design requires removal or explicit scoping of the member-summary-as-team-summary fallback. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `hydrateTeamTotalSummary()` raw existence guard | Pass | Pass | Pass | Pass | Replace with store-owned hydration/provenance guard. |
| `upsertSummary()` implicit team-map seeding from member summaries | Pass | Pass | Pass | Pass | This is correctly treated as part of the same aliasing smell. |
| Component-level aggregate derivation | Pass | Pass | Pass | Pass | Design explicitly rejects adding aggregation to `TeamTokenUsageSummary.vue`. |
| Backend `runId` identity looseness | Pass | Pass | Pass | Pass | Correctly recorded as follow-up, not part of this value-aggregation bug. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Pass | Pass | Pass | Pass | Owns cache, provenance, live merge, fetch writes, and write-rule tightening. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Pass | Pass | Pass | Pass | Owns active-team hydration orchestration and should delegate freshness policy to store API. |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Pass | Pass | N/A | Pass | Remains presentational. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Pass | Pass | N/A | Pass | Correct place for store invariant coverage. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Pass | Pass | N/A | Pass | Correct place for Token tab regression coverage. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Token tab presentation -> composable/store output | Pass | Pass | Pass | Pass | UI components must not calculate authoritative totals. |
| Workspace composable -> store public guard/actions | Pass | Pass | Pass | Pass | Fixes mixed-level dependency on raw value existence. |
| Store -> GraphQL aggregate query | Pass | Pass | Pass | Pass | Store remains the frontend boundary over transport. |
| Frontend -> backend ledger aggregate | Pass | Pass | Pass | Pass | Existing GraphQL boundary is reused. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `tokenUsageMeterStore` team summary cache boundary | Pass | Pass | Pass | Pass | New guard/API gives callers one authoritative decision point. |
| Server GraphQL team aggregate boundary | Pass | Pass | Pass | Pass | Frontend does not bypass ledger by summing member rows. |
| Token tab component boundary | Pass | Pass | Pass | Pass | Rendering stays below the source-selection boundary. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `getTeamSummary(teamRunId)` | Pass | Pass | Pass | Medium | Pass |
| `needsTeamRunSummaryHydration(teamRunId)` / `hasLedgerBackedTeamSummary(teamRunId)` | Pass | Pass | Pass | Low | Pass |
| `fetchTeamRunSummary(teamRunId)` | Pass | Pass | Pass | Low | Pass |
| `applyTokenUsageUpdated(payload)` | Pass | Pass | Pass | Low | Pass |
| `fetchTeamMemberSummary({ teamRunId, memberAgentRunId, memberRouteKey })` | Pass | Pass | Pass | Low | Pass |
| GraphQL `getTeamRunTokenUsageSummary(teamRunId)` | Pass | Pass | Pass | Low | Pass |
| Current `upsertSummary(summary)` | Pass | Fail in current state; corrected by design | Fail in current state; corrected by design | High current / Low target | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Pass | Pass | Low | Pass | Existing store boundary is the right owner. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Pass | Pass | Low | Pass | Existing composable boundary remains appropriate. |
| `autobyteus-web/components/workspace/usage` | Pass | Pass | Low | Pass | No source logic should move into components. |
| `autobyteus-server-ts/src/token-usage` | Pass | Pass | Low | Pass | Reused unchanged for aggregate values. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team aggregate fetch | Pass | Pass | N/A | Pass | Existing GraphQL/ledger path already provides correct aggregate. |
| Summary cache/provenance | Pass | Pass | N/A | Pass | Extending `tokenUsageMeterStore` is correct. |
| Active workspace hydration | Pass | Pass | N/A | Pass | Extending existing composable is correct. |
| Regression coverage | Pass | Pass | N/A | Pass | Store and panel tests are the right durable coverage level. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Raw summary-exists guard | No | Pass | Pass | Must be replaced, not preserved. |
| Member-summary-as-team-summary fallback | No | Pass | Pass | Must be removed or made explicit. |
| Component aggregate calculation workaround | No | Pass | Pass | Correctly rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Store provenance addition | Pass | Pass | Pass | Pass |
| Composable guard replacement | Pass | Pass | Pass | Pass |
| `upsertSummary()` tightening | Pass | Pass | Pass | Pass |
| Focused tests and local validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Hydration guard | Yes | Pass | Pass | Pass | Good and bad guard shapes are explicit. |
| Store provenance | Yes | Pass | Pass | Pass | Clear enough for implementation. |
| Component boundary | Yes | Pass | Pass | Pass | Reinforces no UI summing. |
| Team identity | Yes | Pass | Pass | Pass | Correctly avoids backend response `runId` ambiguity. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Backend team aggregate `runId` identity looseness | The GraphQL payload can carry a member run id for a team aggregate, which could confuse future callers. | No blocking action for this bug; implementation must key by requested `teamRunId` and not by response `runId`. Consider a follow-up schema-tightening task if this API is broadened. | Open residual risk, non-blocking. |
| Ledger fetch racing with very recent live event persistence | Persistence is asynchronous; a just-seen live event might not be included in an immediate ledger query. | Non-blocking for this design; implementation should preserve the design's guarantee that later live events continue to apply and should avoid using `ledger_backed` as a reason to ignore live deltas. | Residual implementation risk. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A. No blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Backend `TokenUsageRunSummaryGraphql.runId` for team aggregate summaries remains semantically loose; the approved design correctly avoids depending on it for this bug.
- Implementation must be careful not to let ledger-backed provenance suppress later live deltas, and should not derive aggregate identity from `summary.runId`.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation with the reviewed design. The store-owned provenance/freshness invariant is the right ownership boundary; no backend aggregate value change is needed.
