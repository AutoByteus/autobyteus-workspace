# Solution Revision Record — Stopped AgentOrg History Archive/Delete

## Revision Index

| Revision ID | Phase | Trigger / Round | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial user request, current-source investigation and user approval | N/A | Approved | BEH-001–005; REQ-001–009; AC-001–005; SCN-001–004 | Complete approved Team-parity requirements baseline. |
| SR-002 | Design | Architecture investigation and implementation-ready solution design | Approved requirements | Architecture Design Complete | BEH-001–005; REQ-001–009; AC-001–005; DS-001–004 | Medium / High design completes the AgentOrg lifecycle, persistence, API and web path without migration. |

## Revision Entries

### SR-001 — Stopped AgentOrg archive/delete parity baseline

- Phase and classification: `Initial Baseline`.
- Trigger: User reported missing Archive/Delete actions for stopped AgentOrg history, supplied current/comparator screenshots, and requested a ticket from `origin/personal`.
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: N/A.
- Current authoritative requirements/design status: Requirements `Approved`; design completed later in `SR-002`.
- IDs affected: `BEH-001`–`BEH-005`, `REQ-001`–`REQ-009`, `AC-001`–`AC-005`, `SCN-001`–`SCN-004`, `DEC-001`.
- Scenario changes: Established Archive and confirmed Delete as normal scenarios; stale active/conflicting root and cross-root preservation as explicit edge/contract scenarios.
- Why recorded: The gap is end-to-end, not UI-only. AgentOrg has archive fields/filtering and an unused internal delete method, but lacks a supported archive command plus GraphQL/client/store/UI wiring for both operations.
- Canonical artifacts changed: Created complete `requirements-doc.md`, `investigation-notes.md`, and this record; design pending approval.
- Supplements: Added the two user screenshots and historical `DS-025` as read-only references.
- Intended behavior changed: `Yes` — adds supported stopped AgentOrg Archive/Delete.
- Approval impact: Approved by the user on 2026-09-21 with “basically, this functionality is similar to agent team, please now work on it”, covering the bounded `SR-001` scope: non-destructive archive, confirmed exact permanent deletion, stopped-only eligibility, selected-route/context cleanup and no archived-list/unarchive scope.
- Design/review basis: N/A; new design not started.
- Post-design classification: N/A; provisional Medium/High because the change spans destructive backend lifecycle/persistence/API and frontend state/UI.
- Handoff outcome: N/A; approval preceded architecture design.
- Remaining gap: None.
- Next action: Completed in `SR-002`.

### SR-002 — AgentOrg lifecycle-safe archive/delete design

- Phase and classification: `Architecture Design Complete`.
- Trigger: Explicit user approval of `SR-001` and request to proceed.
- Triggering finding IDs: `RISK-001`–`RISK-003` from the canonical investigation.
- Prior authoritative requirements/design status: Requirements Approved; design not started.
- Current authoritative requirements/design status: Requirements `SR-001 Approved`; design `SR-002 Ready`.
- IDs affected: All approved `BEH-001`–`BEH-005`, `REQ-001`–`REQ-009`, `AC-001`–`AC-005`, `SCN-001`–`SCN-004`; design spines `DS-001`–`DS-004`.
- Scenario changes: None. Architecture maps the approved Archive, confirmed Delete, stale-active rejection and preservation scenarios to concrete owners.
- Why recorded: The user-visible parity requires an end-to-end command path and the existing unused AgentOrg delete body cannot be safely exposed because its active check is outside the manager transition lane.
- Canonical artifacts changed: Updated approval state/evidence in `requirements-doc.md`; extended `investigation-notes.md`; created complete `design-spec.md`; updated this record.
- Supplements: Same two user screenshots and historical `DS-025`; no new behavior-defining supplement.
- Intended behavior changed: `No` — design realizes the approved `SR-001` intent.
- Approval impact: No renewed approval required.
- Design/review basis: Add an exact-root inactive-history manager boundary; keep AgentOrg catalog as tree/index/package mutation owner; expose subject-explicit service/GraphQL commands; extend existing web history policy with discriminated confirmation and exact post-success cleanup.
- Post-design classification: `task_size=Medium`, `architectural_risk=High`. Several established components change, and persistence/concurrency/destructive-data boundaries are material, but no new subsystem, schema or migration is introduced.
- Handoff outcome: Current rules selected the sole matching High-risk Architecture Design Complete route to `/software_engineering_team/architecture_reviewer`.
- Remaining gap: Independent architecture review is expected if selected by the current High-risk rule; implementation has not started.
- Next action: Independent architecture review of the full approved design package.
