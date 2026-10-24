# Solution Revision Record

## Revision Index
| ID | Phase | Trigger | Prior | Current | Affected IDs | Result |
|---|---|---|---|---|---|---|
| SR-001 | Requirements | Delegation, investigation P-001..004, user shutdown clarification/approval | Draft requirements, no design | R1 Approved, design not yet written | BEH-001..004, SCN-001..005, REQ-001..006, AC-001..006 | Approved basis for architecture |

## SR-001 — Root-cause cleanup plus safe external-conflict recovery
- Initial baseline; no prior approved package or review. Requirements-only round.
- Trigger: historical port-conflict task; user asks to reproduce shutdown behavior; P-003 demonstrates native detached child remains after real shutdown orchestrator and SIGTERM; user then confirms background processes must stop when application shuts down.
- Approval: user confirmation quoted in requirements-doc.md; Solution Designer approved bounded details within direction and informed user in commentary beginning “Understood. I’ll make application/backend shutdown stop …”. Exact basis R1, no behavior-defining supplements.
- DEC-001 resolved: application/backend lifetime, ordinary agent/idle lifetime preserved. Unknown historical Nuxt ancestry remains explicit.
- Canonical requirements replaced preliminary draft; investigation retains experiments, failures and limitations.
- Design/review/classification/routing: N/A until architecture completion; no implementation authorized by this record alone.
- Next: architecture investigation, proportionate design and classification; route using configured rules.


## SR-002 — Architecture Design Complete
- Phase: Design; trigger: approved R1/SR-001 and architecture evidence E-007..014/P-005.
- Prior: R1 Approved, no authoritative design. Current: R1 unchanged Approved; D1 Ready; task_size Large, architectural_risk High.
- Affected: BEH-001..004, SCN-001..005, REQ-001..006, AC-001..006. Canonical design-spec.md added; investigation extended with group-leader survivor, host/quit contracts, clone/ownership boundary, updater entry and diagnostic feasibility.
- Approval impact: none; no new product intent. Runtime-only command scope, bounded verified cleanup, awaited quit and structured diagnosis realize already-approved behavior. Normal agent/idle semantics and existing provider owners preserved.
- Review/routing: no prior independent review or implementation. Configured Large/High rule selects /software_engineering_team/architecture_reviewer; full context in solution-handoff.md.
- Remaining limits: historical Nuxt origin not proved; baseline reproductions not full-product validation; macOS-only runtime probes; no current fix/build/merge claim.


## SR-003 — Windows graceful entry and review-completeness corrections
- Phase: Design; trigger ARCH-REV-001, AR-001..003, reviewer commit f9617c7380a2cbe8aecd6d17aac07c9552ec0453.
- Prior: R1 Approved/D1 Ready, review Fail — Design Impact. Current: R1 unchanged Approved/D2 Ready for re-review, Large/High retained.
- AR-001: replace undefined Windows signal transition with captured-child Node IPC request into single backend shutdown owner; specify early control readiness, startup-cancellation barrier/ownership transfer, ack+exit confirmation and bounded force fallback. E-015/016, P-006 support decision; live Windows and actual Electron packaging not claimed.
- AR-002: inventory both ambient status declarations and ServerMonitor/ServerSettingsManager derived consumers, explicit no-change decisions plus updated store conflict summary/tests (E-017).
- AR-003: name dead native factory cache/accessor removal and reference evidence E-018; no fallback scope.
- Affected IDs: BEH-001..004, SCN-001..005, REQ-001..005, AC-001..005; REQ-006/AC-006 constraints preserved. Canonical design, investigation, handoff and project design case updated. Reviewer-owned reports untouched.
- Approval impact: none, technical completeness within R1. No new user product decision or narrowing supported Windows form. Review findings are proposed resolved by D2, not marked Pass by Solution Designer.
- No prerequisite/follow-up; same workspace/base/finalization. No implementation or validation claim. Reapply Large/High review route after persistence.
