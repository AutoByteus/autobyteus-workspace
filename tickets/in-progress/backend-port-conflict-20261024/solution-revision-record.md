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


## SR-004 — Continuous native group lifetime after short-lived command exit
- Trigger: Implementation Engineer IR-001/IMP-DI-001 at2b414e6dc, after ARCH-REV-002 Pass of D2. Prior R1 Approved/D2 reviewed Pass; implementation not started.
- Current: R1 unchanged Approved, D3 Ready for review, Large/High retained. Findings affect BEH-003/004, REQ-003/004/005, AC-004/005, SCN-003/004; all other intent/constraints preserved.
- Concrete correction: gated persistent exclusive group anchor pins identity through quick shell exit, adoption, ended-agent retention and cleanup. POSIX uses Node anchor/IPC; WSL uses bash under setsid --wait with independent session/birth proof; both keep command RESULT separate from anchor exit. Scope owns bounded TERM/verify/KILL/release and empty-group retirement; no raw-PGID reclamation or faster-polling assumption.
- Evidence: accepted IMP-02 non-overlapping snapshots and actual executor adoption; E-019..021 and P-007/P-008 candidate tests demonstrate retained anchor/TERM behavior locally. Linux/WSL and packaged Electron execution not claimed. Reviewer/implementation artifacts left untouched.
- Approval impact: none; technical mechanism fulfills already-approved ordinary survivor scenario and safety, not new product lifetime. No additional user question, prerequisite or follow-up.
- Canonical design/investigation/handoff and design-case provenance updated. ARCH-REV-002 remains evidence of D2 review only. Next: configured Large/High independent review of D3, then specialist implementation if passed; no duplicate direct forwarding.


## SR-005 — Explicit terminal settlement when the anchor cannot emit RESULT
- Trigger: Architecture Reviewer question during D3 review, supported force/control-loss/spawn-failure paths, no finding ID yet.
- Prior: R1 Approved, D3/SR-004 under review. Current: R1 unchanged Approved, D3.1/SR-005 Ready; Large/High unchanged.
- Clarification: launcher owns exactly-once terminal completion/STARTED settlement; scope supplies pre-signal intent and bounded finishStop fallback without awaiting result; executor maps to unchanged TerminalResult, including current AbortSignal timedOut semantics and truthful host-stop/failure output. Late events cannot overwrite result; cleanup uncertainty remains independently reported.
- Affected BEH-003/004, REQ-003/004/005, AC-004/005. Source and P-008 evidence support the clarification; no new implementation/test claim or product decision. Design/investigation/handoff updated; reviewer/implementation artifacts unchanged.
- Review impact: re-review current D3.1 with this clarification; no implementation forwarding by Solution Designer.


## SR-006 — Codex conversation background lifecycle measured
- Trigger: user confirms Codex-origin server, asks how completion is known and explicitly requests experiments; implementation confirms no conversation-tool evidence/changes.
- Phase: evidence-only investigation. Prior R1 Approved/D3.1, ARCH-REV-003 Pass, native implementation underway. Current R1 unchanged Approved/D3.1 technical decisions unchanged; reported Codex path still requires integrated verification. Large/High classification unchanged, not a newly completed architecture package.
- P-009..011 use real Codex0.164.0 conversation tools plus deterministic local model SSE, not standalone command/exec or paid inference. Final6cases pass; failed early receipt/cleanup attempts retained. Start/completion events and experimental list/clean/terminate verified. Turn completion can precede command completion. Orderly production Codex client.close cleans measured yielded server; simple & and nohup & do not reproduce leak.
- Affected BEH-003/004, REQ-003/004/005, AC-004/005. Investigation and design factual basis updated; requirements problem wording clarifies accepted user origin, no intended behavior change or renewed approval required. Native anchor is not a Codex fix.
- Full context codex-background-investigation.md. No formal new design handoff; answer user and pending implementation evidence question. No original-incident fix, integrated acceptance, merge or Terminal claim. Full host/desktop Codex shutdown experiment remains next.
