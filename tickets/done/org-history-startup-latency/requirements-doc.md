# Requirements — ORG-HISTORY-LATENCY-20260917-001

## Status / authority

Approved baseline SR-001, approval captured SR-002; reopened evidence/design recovery SR-004 on 2026-09-18; owner Solution Designer. User explicitly approved the proposed scope: “Yeah, I completely agree. I think the response should, the each history family should display as soon as the response is ready. Just because now you see like it's showing agent and team history immediately, right? After it's received. You should at that point also show agent org history.” The user subsequently reported that the finalized implementation still shows AgentOrg history extremely slowly on a real cold app start and explicitly asked to reopen the same ticket and reproduce it. Intended behavior remains unchanged: each family is independently available without unrelated work, with reconnection/selection/errors/data preserved and no migration/storage redesign. No behavior-defining supplements. Current reopened workspace/base/target are in bootstrap-handoff.md.

## Problem and desired outcome

On normal cold startup, Org history appears noticeably later than Team history (>10 seconds user-reported). The first implementation removed a real frontend publication barrier, but the residual real-profile delay remains because the first AgentOrg history read repeats a complete Team+AgentOrg package-readiness scan already completed before the server listens. Show each valid history family as soon as its own response can be served and accepted, without repeating established readiness or waiting for unrelated histories, avatar enrichment or active-run hydration. Preserve strict admission, actual history and normal reconnect behavior.

## Actors and supported scenarios

| ID | Actor/event, goal and product sequence | Validity/evidence | Alternates | Mapping |
|---|---|---|---|---|
| SCN-001 | User opens app with existing Agent/Team/Org history; sidebar loads; available rows appear; user expands/selects history normally. | Supported Normal Scenario; user screenshots/report and mounted sidebar source E-001. | Slow unrelated catalog or live-run reconnect must not withhold accepted history. | BEH-001; REQ-001/003; AC-001/003 |
| SCN-002 | Existing automatic quiet refresh or focused Org refresh updates sidebar while user works. | Supported Normal Scenario; existing timers/actions and generation tests E-002. | One family fails or older response completes after newer focused refresh. | BEH-002; REQ-002/003; AC-002/003 |

Stakeholders: app user needs prompt trustworthy navigation; implementation/validation must preserve identity, selection and lifecycle semantics.

## Current, desired and preserved behavior

| ID | Kind | Current | Desired | Preserved |
|---|---|---|---|---|
| BEH-001 | System/user | The frontend now publishes accepted families independently, but the cold first AgentOrg read rebuilds already-established shared package readiness, so its response can remain unavailable long after Team history. | Independent family availability without repeated readiness validation or unrelated post-processing wait. | Existing labels, grouping, ordering, root/member IDs, expansion, selection, strict package admission and normal history opening. |
| BEH-002 | System | Successful slices retained on family failure; Org newer-request protection; normal reconciliation and polling. | Keep these protections while publishing independently. | No clearing accepted history on failure, no stale Org overwrite, truthful statuses and existing reconnect ownership. |

## Scope guardrail

- UC-001: normal startup sidebar history availability (SCN-001).
- UC-002: same loader's quiet/focused refresh, slow/failure/overlap preservation (SCN-002).
- Out of scope: migration/data repair, history schema/index redesign, definition import/resolution, model/provider/runtime redesign, unrelated performance optimization, release or Electron packaging. Removing a duplicate in-process readiness rebuild is in scope; weakening, bypassing or redesigning strict readiness is not.
- Non-goals: force all rows to appear simultaneously, fixed delay/timeout, bypass validation, eager activation of stopped runs, copying personal nested-Team architecture.
- Preserve BEH-001/002. No data loss/reset accepted; user app/profile left untouched for investigation.
- Review authority: blocking corrections must trace to approved REQ/AC/BEH. New product policies or adjacent reliability/performance work are Requirement Gaps requiring user approval, not automatic design obligations.

## Requirements

| ID | Requirement | Behavior/scenario | Priority/source |
|---|---|---|---|
| REQ-001 | Each valid available history family becomes visible without waiting for unrelated family queries, a duplicate rebuild of package readiness already established before server availability, definition/avatar enrichment or live-context hydration. Do not hide ready Org history behind Team/Agent work. | BEH-001, SCN-001 | Must; user request, E-002/003 and reopened E-007–010 |
| REQ-002 | Preserve accepted rows and family-specific failure handling; preserve latest-initiated Org refresh ownership across full/focused requests. Pending/failed work must not be presented as a successful empty history. | BEH-002, SCN-002 | Must; existing contract E-002 |
| REQ-003 | Preserve normal history labels/grouping/identity/selection, activity truth and active-stream reconciliation. Earlier rendering must not start stopped runs, send messages or alter persisted histories. | BEH-001/002, SCN-001/002 | Must; existing behavior/data continuity |

## Acceptance criteria

| ID | Linked authority | Trigger and observable result | Verification intent |
|---|---|---|---|
| AC-001 | REQ-001; BEH-001; SCN-001 | With shared package readiness already established, the first AgentOrg history catalog initialization reuses that generation rather than starting a second rebuild. With an accepted Org response and avatar/hydration pending, Org rows render before release. Either family may still complete independently; no arbitrary sleep or extra refresh is needed. | Durable owner regression proving `awaitReady` reuse and lazy initialization when no generation exists; retain frontend publication regressions; actual cold-start browser/server validation on a representative package population must record request completion and first visible rows, distinguishing backend response time from publication delay. |
| AC-002 | REQ-002; BEH-002; SCN-002 | A family query failure preserves its prior accepted rows and reports its error while other family succeeds. Older full/focused Org responses cannot overwrite a newer accepted result or error ownership. Empty successful results remain distinguishable from pending/failure. | Existing and extended failure/deferred concurrency regressions; focused actual UI failure/recovery observation. |
| AC-003 | REQ-003; BEH-001/002; SCN-001/002 | Earlier rows retain expected names/counts/order/IDs; expand/select and inspect history normally; initial and quiet refresh retain existing selection. Existing active Agent/Team reconciliation still completes; stopped runs remain stopped, no inference merely from listing. Authored/history content remains intact. | Rendered navigation plus bounded lifecycle owner checks; isolated browser history inspection and mutation/process observations, no claim of exhaustive provider certification. |

## UI and quality

Existing sidebar only; no visual redesign or Product Design request. Prototype/UI specification: N/A. Preserve current accessible navigation and family errors. QR-001 maps REQ-001/AC-001: measurable event ordering (accepted response to row publication independent of pending unrelated work), not an unsupported universal millisecond SLA. Record realistic before/after timings during validation; no claim that screenshots measure ten seconds.

## Data continuity and dependencies

Persisted schema/data changes not requested. Zero acceptable history/conversation/attachment/configuration loss; no repair, reset or migration authority. Current server APIs and strict tree parsing remain contracts. Backend query can read full trees; index-only operation is not an approved assumption. User-reported dataset volume and exact cold-start phase timing unknown; do not read secret profile contents to populate public fixtures.

## Evidence / assumptions / open decisions

Investigation E-001–010 and bounded probes are supporting facts, not acceptance. The original frontend publication mechanism was real and fixed, but it did not explain the residual cold-start report. Reopened evidence now measures the duplicate backend readiness rebuild at 26.657 seconds on the real package population, while a warm browser against the same embedded backend shows AgentOrg only 35.4 ms after Team. No material intended-behavior ambiguity remains. Validation must exercise the cold first-read boundary rather than repeat only a warm/small-fixture browser scenario. Any remaining independent backend cost after removing the duplicate scan must be reported rather than silently redesigning history storage.

## Traceability and architecture inputs

REQ-001 → UC-001/SCN-001/BEH-001/AC-001; REQ-002 → UC-002/SCN-002/BEH-002/AC-002; REQ-003 → both use cases/scenarios/behaviors/AC-003.

Architecture must establish publication ownership, settlement/error boundaries and preservation of existing async reconciliation/generation semantics. Technical realization and completed size/risk classification are in design-spec.md; requirements remain the behavior authority.

## Readiness

Current evidence, intended/preserved outcomes, scope, testable IDs, supported scenarios, data continuity and unknowns: ready. Prototype: N/A. Requirements ready: Yes. User approval received: Yes, SR-002 quote above; the user's explicit reopen/reproduce request confirms the unchanged intended outcome. Renewed approval: not required because SR-004 changes technical cause/design only and does not change BEH/SCN/REQ/AC intent. Approved basis ready for revised design: Yes; no outstanding requirement decision.
