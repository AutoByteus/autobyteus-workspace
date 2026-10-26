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


## SR-007 — Approved in-ticket Codex background visibility
- Trigger: Code Reviewer relays user transparency request; Solution Designer proposed separate read-only follow-up; user explicitly says “do it in this current ticket thanks” on2026-10-26. Original scope request is accepted, not silently deferred or expanded to process controls.
- Prior: R1 Approved/D3.1, ARCH-REV-003 Pass, implementation IR-003, CRR-002 Pass5fd30310e; API/E2E incomplete. Current: **R2 Approved / D4 Ready for independent review**, task_size Large, architectural_risk High.
- Intended-behavior delta: UC-003, BEH-005/006, SCN-006..008, REQ-007..009, AC-007..010. Selected live-run read-only background visibility, truthful running/terminal/unknown/unavailable, safe descriptions and reload/switch freshness. Preserve REQ-001..006, existing Claude/AGY display, exact-turn admission, idle/individual-agent lifetimes and shutdown ownership. No stop buttons, raw argument/output disclosure, new OS inventory or persistent history.
- Approval: user's exact scope decision in background-visibility-scope-approval.md; Solution Designer approved bounded details within that direction, informed user in commentary beginning “Understood—I’ll include read-only Codex background-task visibility in this ticket”. No Needs user decision remains. FU-002 incorporated; no separate Task/delegation.
- Evidence: E-024 traces post-turn gate and existing background-event→idle coupling; P-012 actual Codex conversation probes (2 passed) show list membership before turn completion. SR-006/P-011 remains actual provider terminal/completion evidence. These are dependency probes, not new product acceptance.
- Technical response DS-005: AgentRun-owned read-only inspection capability, exact active-run typed GraphQL query, CodexThread-owned identity/turn/completion observations and bounded paginated inspection; selected-panel composable reuses existing rows, keeps event-stream providers untouched. No new Codex BACKGROUND_TASK_UPDATED event, quiescence change or transcript-gate relaxation.
- Canonical requirements/design/investigation/handoff revised; intake/follow-up historical recommendation marked superseded. Specialist reports/source untouched. No production implementation by Solution Designer.
- Validation checkpoint: API/E2E c88a6224c preserves scoped actual Codex quit and native restart/quit passes, remaining incomplete and user-paused. Prior passes remain valid only for their covered source/scope. D4 handoff does not resume paused executable validation or claim new acceptance.
- Review impact: cumulative Large/High because runtime observation, shared backend/query contracts, async selection and privacy boundaries accompany existing high-risk shutdown change, not artifact volume. Apply configured Architecture Design Complete rule after persistence; independent review before dependent implementation. R2 must be covered by subsequent source review/independent validation before Delivery. FU-001 retained for eventual upstream reporting. No merge/release/install/Terminal claim.


## SR-008 — Observational lookup and retained-stream presentation corrections
- Trigger: Architecture Reviewer ongoing D4 source review found getActiveRun prunes/releases inactive entries, and live-query-only capability selection hides existing inactive Claude/AGY rows on first entry. No new verdict or numbered finding claimed.
- Prior R2 Approved/D4 under review; current R2 unchanged Approved/D4.1 Ready for continued review, Large/High. REQ-009/BEH-006/AC-010 and SCN-008 affected; no renewed product approval needed.
- E-025 corrects E-024 factual lookup claim. New observational manager→registry peekPublishedRun with exact-map/instance checks and pure isActive reads; preserve all existing lifecycle/pruning callers. No fake read through getActiveRun/hasActiveRun/listActiveRuns or retired-inclusive predicate.
- E-026 preserves actual event-derived rows on initial panel entry/reselection despite unavailable runtime, with explicit recorded/last-known labeling. Empty store never proves Codex empty; successful snapshot/event-stream result selects one authority, no merge or provider guessing.
- Canonical design, investigation, handoff and project Case5 updated; added future regression obligations for inactive/replaced instances and retained first-entry rows. No production edits or tests; user testing pause preserved. Continue same independent review via configured Large/High route, no duplicate implementation forwarding.


### SR-008 downstream checkpoint — ARCH-REV-004
Architecture Reviewer passed R2/D4.1 at8c4e42d72 and already sent the primary implementation handoff. Recorded informationally; no duplicate forwarding. Implementation Engineer subsequently asks about permitted executable checks under the user pause. User clarification is pending in validation-pause-clarification.md; all executable checks stay paused meanwhile. Approval of feature scope is not treated as an implicit revocation. No architecture or requirements revision.


### SR-008 downstream checkpoint — user resumes testing
API/E2E relays exact user instruction “i asked you to pause or? i think we could continue now?”, persisted8fd57560d. Read its progress/report and IR-004 incomplete handoff7bd0bbea4. Pause clarification is resolved: implementation may complete generation/checks/build/rendered inspection, then use normal Large/High source-review→independent API/E2E route. API/E2E readiness remains pending, not paused; no stale build/current acceptance inference or review bypass. Updated validation-pause-clarification.md and canonical workflow banners; no intended-behavior/design change, new SR architecture round or duplicate review forwarding. Specialist-owned reports/source unchanged.
