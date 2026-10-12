# Solution Revision Record

Package: fix-legacy-docker-workspace-builds

## Revision Index
| Revision | Phase | Trigger / findings | Prior status | Current status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Delegated task; historical BAS-001 / UD-002 | N/A | R1 Approved | BEH-001..004, REQ-001..004, AC-001..006, SCN-001..004, DEC-001..003 | Coherent initial repair baseline; approved within direction, user informed |

| SR-002 | Design | R1 approval, E/A evidence | R1 Approved / no design | D1 Ready before interruption | REQ-001..004, AC-001..006 | Held repair design, Medium/Low; never handed off |
| SR-003 | Evidence | User usage/relevance question | R1 Approved / D1 Ready | Scope hold / D1 Blocked | DEC-001,004; SCN-001,002 | Usage evidence, direct user choice required |
| SR-004 | Evidence | User asks error attribution and monorepo sufficiency | Scope hold | Scope hold | DEC-004 | Monorepo covers local source builds as well as pipeline; recommend legacy retirement |

## SR-001 — Repair the two documented legacy Docker build/start flows
- Phase/classification: Requirements / Initial Baseline.
- Trigger: Project Task b2b611bb-9a5d-49da-b1dc-fc1c8f80d42a; prior API/E2E BAS-001 and AGPL UD-002.
- Prior requirements/design: N/A; design not yet created.
- Current requirements: R1 Approved. Design: N/A.
- IDs affected: BEH-001..004, REQ-001..004, AC-001..006, SCN-001..004, UC-001..003, DEC-001..003.
- Scenario basis: Documented personal Docker main+optional backend-node stack; maintainer check explicitly requested. Provider removal does not remove remote backend-node purpose.
- Why recorded: Initial intended/preserved behavior and cheap regression boundary are coherent before architecture.
- Canonical changes: requirements-doc.md complete R1; investigation-notes.md factual source/bootstrap basis.
- Supplements: Prior attached report, tracked validation-only Dockerfile/log, historical AGPL report; evidence only, no Product/behavior supplement.
- Intended behavior changed: Initial repair baseline; no new application behavior.
- Approval basis/impact: Solution Designer approved R1 / SR-001 within request direction; 2026-10-12 user notice beginning “I’ve approved the repair requirements within the requested scope”. Exact REQ-001..004/AC-001..006/DEC-001..003; no normative supplements or Needs user decisions.
- Design/review/classification: N/A before design completion.
- Handoff: N/A; no forward-ready claim before approval/design.
- Remaining gaps: Actual repaired builds/startup belong to implementation/API-E2E; Docker downloads external execution risk.
- Next action: Complete architecture reading gate and design against approved R1.

## SR-002 — Completed Repair Design D1 (Before User Scope Check)
- Phase/classification: Design / Refinement. Trigger: approved R1, E-001..006 and A-001..006; BAS-001/UD-002.
- Prior status: R1 Approved, no design. Result at completion: R1 Approved/D1 Ready; no handoff occurred before user interruption.
- IDs: BEH-001..004, REQ-001..004, AC-001..006; approved intent unchanged.
- Changes: canonical investigation architecture evidence and design-spec.md D1. Existing pnpm graph build, explicit three-boundary payload copies, dependency-aware source guard and owned real-image smoke.
- Approval: unchanged R1/SR-001 exact recorded notice; no behavior supplement.
- Classification at completion: Medium/Low; bounded staging/test correction within existing deployment contracts; no app/schema/security/ownership change. Review artifacts: N/A — rules not consulted because interrupted before forward handoff.
- Next action originally: persist handoff/route; overtaken by SR-003. No implementation or reviewer notified.

## SR-003 — User-Requested Usage Investigation And Scope Hold
- Phase/classification: Evidence / Unclear scope direction, resolved factual usage but user choice remains. Trigger: user's 2026-10-12 interrupted-turn request to first establish what personal Compose/allinone/remote are used for.
- Prior status: R1 Approved/D1 Ready, no handoff. Current: requirements Ready for Approval (scope recheck)/design Blocked for forward work; prior repair documents remain historical/proposed basis, not removal approval.
- Findings: U-001 developer harness versus published launcher distinction; U-002 current local containers use only monorepo :beta; U-003 historical automatic sync/gateway no longer present.
- IDs affected: DEC-001 reopened, DEC-004 Needs user; SCN-001/002 product relevance questioned, technical support still exists in docs/scripts.
- Canonical changes: requirements/design scope-hold appendices, investigation usage evidence; new owned usage-investigation.md supplement.
- Intended behavior changed: No deletion or changed product outcome approved. Approval impact: direct user decision now required before deciding retention/retirement; R1 repair option is held, not silently expanded.
- Supplements: usage-investigation.md factual/user decision brief; evidence does not prove global non-use.
- Routing/review: no implementation handoff; routine user scope/approval conversation is held here, not delegated to Project Task Manager.
- Remaining gap: Does the user still want the source-built personal web-in-Docker testing harness?
- Next action: explain roles/current use and ask user retain/repair versus retire.

## SR-004 — Monorepo Sufficiency / Actual Error Evaluation
- Phase/classification: Evidence / Refinement; user requested suggestions, no removal approval yet.
- Trigger: User notes monorepo is used by pipeline/already sufficient and questions need for separate remote backend/source builds.
- Prior/current: Requirements scope hold and D1 repair design Blocked remain; DEC-004 Needs user.
- Findings: U-004 actual baseline error attribution; U-005 monorepo local-source helper chain; U-006 multiple remote nodes need no separate recipe.
- Canonical changes: investigation evidence, usage brief SR-004, requirements decision recommendation/readiness consistency. Intended behavior unchanged/unapproved retirement only.
- Approval basis: no new approval; do not infer consent to deletion from uncertainty or evaluation request.
- Design/review/routing: D1 not forwarded; proposed consolidation requires replacement requirements/design after direct user confirmation. No rule handoff while user approval conversation remains open.
- Next action: Explain precise error, distinguish source build from old harness, recommend monorepo-only server packaging and ask explicit permission to retire the legacy stack safely.
