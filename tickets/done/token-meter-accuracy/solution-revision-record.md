# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline after investigation and probes P1–P8 | N/A | N/A | Ready for Approval | BEH-001–BEH-008; REQ-001–REQ-011; AC-001–AC-010; DEC-001–DEC-005 | Presented to the user for approval |
| SR-002 | Requirements | User approval 2026-10-09; decisions delegated to evidence | N/A | Ready for Approval | Approved | DEC-001–DEC-005; REQ-004 | Approved baseline |
| SR-003 | Mixed | Architecture investigation (AF-01–AF-15); design completed | AF-10 | Approved (SR-002) | Approved (DEC-002 revised under delegation); design Ready | DEC-002; REQ-004; all REQ mapped in design | Design complete; classification Large / High |
| SR-004 | Design | ARCH-REV-001 (Fail — Design Impact) | ARCH-F-001, ARCH-F-002; RR-1–RR-5 | design Ready (SR-003) | design Ready (round 2) | REQ-004, REQ-006, REQ-008; AC-003, AC-004, AC-006 | D-9 freshness key, D-10 awaited emission; requirements unchanged |
| SR-005 | Design | ARCH-REV-002 (Fail — Design Impact) | ARCH-F-003 | design Ready (SR-004) | design Ready (round 3) | REQ-008, REQ-010; AC-003, AC-008 | Strict shared contract schemas mapped; requirements unchanged |
| SR-006 | Evidence | PTM coordination note: gemini-native-cache-hit merged | AF-16 | design Ready, ARCH-REV-003 Pass | unchanged | BEH-003 | Integration note for delivery; no requirement or design change |
| SR-008 | Mixed | DR-002 delivery blocker: conflict with upstream compaction-prompt-cache-reuse | DR-002 | integrated, AC-010 verified | design Ready (D-11), re-review required | BEH-005; AC-011 (new) | Native compaction resets the reading to unknown via an explicit `context_reading_reset` fact |
| SR-009 | Requirements | User 2026-10-12: keep reading during compaction; then wait for AutoByteus-runtime removal | — | design Ready (D-11), IR-003/CRR-004 done | Blocked (User/External Prerequisite) | BEH-005; AC-011; D-11 | D-11 withdrawn by user intent; package paused until the native-runtime removal team finishes |
| SR-010 | Mixed | User 2026-10-12: pause was a mistake (the removal concerns the remote provider, not the native runtime) | — | Blocked (SR-009) | requirements Approved (BEH-005/AC-011 per user intent); design Ready (D-12), re-review required | BEH-005; AC-011; D-11→D-12 | Pause lifted; native compaction keeps the reading until the next real reading |
| SR-011 | Mixed | User 2026-10-12: add the "Compacted — updates on the next model call" note, in this ticket | — | design Ready (D-12), ARCH-REV-005 Pass | requirements Approved (REQ-012, AC-012 added); design Ready (D-13), re-review required | REQ-012; AC-012; D-13 | Frontend-only note from live compaction status + exact-run revision |
| SR-012 | Design | CRR-006 failure-origin (API-REV-002 F-API-002-01, DESK-004d) | F-API-002-01 | design Ready (D-13), IR-004 implemented | design Ready (D-13 corrected), re-review required | REQ-012; AC-012 | Note clears on a new model call (usageReportCount), not on any save; RR-7 premise corrected |
| SR-013 | Design | ARCH-REV-007 (Fail — consistency only) | ARCH-F-004 | design Ready (SR-012) | design Ready (wording aligned) | REQ-012; AC-012 | Four stale revision-based mark statements in design-spec aligned with SR-012 |
| SR-014 | Design | CRR-007 (Fail — Design Impact) | CR-F-002 | design Ready (SR-013), IR-005 implemented | design Ready (event-sourced mark), re-review required | REQ-012; AC-012 | Note clears only on a live `reports_model_call: true` event for the run; no baseline |
| SR-007 | Evidence | Code reviewer refactoring proposal (R-1–R-4), user-requested | — | integrated (DR-001), awaiting AC-010 | unchanged | none (behavior-neutral) | User chose follow-up: Project Task project_task_7257984e-19b4-452a-a65b-99316d879bc1 (TODO) |

## Revision Entries

### SR-001 — Use each runtime's own usage and context figures

- Phase and classification: Requirements, `Initial Baseline`
- Triggering user feedback / evidence: Project Task `project_task_cb40258d-0311-4675-bdd4-8ff49253b576`; user direction 2026-10-09 "use the statistics from the agent SDK itself … use their data as much as possible … do enough experiments"; probes P1–P8; production DB evidence.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started
- IDs affected: all listed in the index
- Scenario-basis changes: SCN-001–SCN-004 established
- Why recorded: first coherent baseline presented for approval
- Canonical sections changed: `requirements-doc.md` (all), `investigation-notes.md` (all)
- Supplemental artifacts: `probes/` (evidence only)
- Product design evidence: N/A
- Intended behavior changed: `Yes` (new baseline)
- Approval impact: pending explicit user approval and answers to DEC-001–DEC-005
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval held in conversation)
- Downstream impact: none yet
- Remaining gaps: DEC-001–DEC-005
- Next action: obtain user approval; then architecture design

### SR-002 — Approval with evidence-based decisions

- Phase and classification: Requirements, `Refinement`
- Triggering user feedback: user 2026-10-09 "I trust your decisions … decisions should be reflecting the truth … I will approve your reasonable decisions and then use the design principles to work on it now."
- Triggering finding IDs: N/A
- Prior status: requirements `Ready for Approval` (SR-001)
- Current status: requirements `Approved`; design in progress
- IDs affected: DEC-001–DEC-005 resolved to (a); REQ-004 wording ("across all models it reports", DEC-002)
- Scenario-basis changes: none
- Why recorded: explicit approval with delegated decisions
- Canonical sections changed: requirements Document Status, REQ-004, Open Decisions, Readiness Check
- Supplemental artifacts: none
- Intended behavior changed: `Yes` (decisions fixed)
- Approval impact: approved baseline = SR-002
- Affected design/review basis: N/A (design starts on this basis)
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A
- Next action: architecture design

### SR-003 — Architecture design; DEC-002 revised on evidence

- Phase and classification: Mixed (evidence + design), `Refinement`
- Triggering evidence: architecture investigation AF-01–AF-15 (investigation notes), especially AF-10 (auxiliary Haiku = 0.03 % of spend, unpriced in catalog, present in 290/314 runs).
- Triggering finding IDs: AF-10
- Prior status: requirements Approved (SR-002); design not started
- Current status: requirements Approved with DEC-002 = (b); `design-spec.md` Ready
- IDs affected: DEC-002, REQ-004 wording
- Scenario-basis changes: none
- Why recorded: DEC-002 (a) would have made the meter less truthful (290/314 runs partially unpriced for 0.03 % of spend). The user delegated these decisions to the evidence ("decisions should be reflecting the truth … I will approve your reasonable decisions"), so the revision is made under that delegation and reported to the user explicitly.
- Canonical sections changed: requirements Document Status, REQ-004, DEC-002; investigation Architecture Investigation Findings; new `design-spec.md`
- Supplemental artifacts: none added
- Intended behavior changed: `Yes` (DEC-002 only)
- Approval impact: covered by the user's explicit delegation; flagged to the user in the result
- Affected design/review basis: design built on SR-003
- Post-design classification: task_size Large; architectural_risk High (see design-spec)
- Applied handoff-rule outcome: see `solution-handoff.md`
- Next action: route per handoff rules

### SR-004 — Architecture review round 1 corrections

- Phase and classification: Design, `Design Impact`
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`, `architecture-review-revision-record.md`), result Fail — Design Impact.
- Finding IDs: ARCH-F-001 (High), ARCH-F-002 (Medium); residual RR-1–RR-5
- Prior status: requirements Approved (SR-003); design Ready (SR-003)
- Current status: requirements Approved (unchanged); design Ready (round 2)
- IDs affected: REQ-004, REQ-006, REQ-008; AC-003, AC-004, AC-006 (protected, not changed)
- Scenario-basis changes: none
- Why recorded: ARCH-F-001 verified at `autobyteus-web/stores/tokenUsageMeterStore.ts` l.207/288/304/389. ARCH-F-002 verified against `claude-session-process.ts:89-91` (awaited frame pump), `agent-run-event-dispatch-queue.ts` (per-run serial dispatch) and `token-usage-run-accumulator.ts` (`serializeRun`).
- Canonical sections changed: design-spec Intended Change (D-9, D-10), Ownership Map, Off-Spine Concerns, Return/Event spine with example, Bounded Local spine, Interface Boundary Mapping, Final File Responsibility Mapping (store, aggregate, session), Concrete Examples, Risks (RR positions), Change Sequence.
- Supplemental artifacts: none
- Intended behavior changed: `No`
- Approval impact: none (technical design only; requirements approval SR-003 stands)
- Affected design/review basis: round-1 review basis superseded; round 2 required
- Post-design classification: unchanged (Large / High)
- Applied handoff-rule outcome: Architecture Design Complete, Large/High → `/software_engineering_team/architecture_reviewer` (round 2)
- Next action: architecture review round 2

### SR-005 — Architecture review round 2 correction

- Phase and classification: Design, `Design Impact`
- Trigger: ARCH-REV-002 (`design-review-report.md`); ARCH-F-001/ARCH-F-002 confirmed resolved, RR-1 position accepted.
- Finding IDs: ARCH-F-003 (Medium)
- Prior status: design Ready (SR-004)
- Current status: design Ready (round 3); requirements Approved (unchanged)
- IDs affected: REQ-008, REQ-010; AC-003, AC-008 (protected)
- Why recorded: verified that `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts` (`.strict()`, l.90), `autobyteus-agent-presentation-contracts/src/token-usage-presentation-dto.ts` (`.strict()`, l.62) and `agent-presentation-message-dtos.ts` (`token` l.33-57, `TOKEN_USAGE_UPDATED` strict, l.90) would reject or drop `revision`, `context_compaction_threshold_tokens` and `reports_model_call`. Consumers import the packages' `dist`.
- Canonical sections changed: design-spec Subsystem Allocation, Final File Responsibility Mapping (5 contract rows, web mapper test), Return/Event spine, Change Sequence (contracts first, dist rebuild), Risks.
- Intended behavior changed: `No`
- Approval impact: none
- Post-design classification: unchanged (Large / High)
- Applied handoff-rule outcome: Architecture Design Complete, Large/High → `/software_engineering_team/architecture_reviewer` (round 3)
- Next action: architecture review round 3

### SR-006 — Upstream Gemini/AGY merge (evidence only)

- Phase and classification: Evidence, `Evidence-only clarification`
- Trigger: Project Task Manager message 2026-10-09 (gemini-native-cache-hit merged as 3913a75d6 + 033a6d780; verification `/Users/normy/.autobyteus/reports/gemini-native-cache-hit-terminal-verification.md`). Also recorded: ARCH-REV-003 Pass (informational).
- Finding IDs: AF-16
- Prior/current status: requirements Approved; design Ready; reviewed Pass; implementation committed (`9e8e5bf26`, `a5d8d2d31`, `aa9d949e1`); route at Code Review
- IDs affected: BEH-003 / REQ-005 (unchanged intent)
- Why recorded: the upstream AGY result-semantic fix overlaps D-5. D-5 supersedes it, and integrating requires one conflict resolution plus one test adaptation.
- Canonical sections changed: investigation notes AF-16
- Intended behavior changed: `No`
- Approval impact: none
- Design/review impact: none (design unchanged); delivery integration note
- Applied handoff-rule outcome: no rule matches an evidence-only note; result returned to the Project Task Manager
- Next action: delivery integrates with current `origin/personal` per AF-16

### SR-007 — Post-review refactoring proposal (scoping pending)

- Phase and classification: Evidence, `Evidence-only clarification` (no requirement or design change yet)
- Trigger: `/software_engineering_team/code_reviewer` proposal at user request: `code-review-refactoring-proposal.md` (R-1 dead partial-stream text path; R-2 one owned token-usage details type and wire mapper; R-3 extract the team live-partial merge from `tokenUsageMeterStore.ts`; R-4 fold result exposes `contributes`).
- Verification (HEAD `f3245cdb0`): `claude-session.ts:398` returns for `stream_event` before the turn tracker, so `claude-text-segment-projector.ts:135/167` partial path is unreachable; `tokenPayload` is duplicated in `team-agent-event-websocket-projector.ts:17` and `agent-presentation-message-projector.ts:4`; the store is 536 physical lines.
- Design note: R-1 was an intentional deferral in this design (Task Design Health Assessment); with the reviewer's reachability proof, removal is justified.
- Status: package integrated (DR-001), awaiting user verification AC-010. All items are behavior-neutral.
- Recommendation to the user: Option A — separate follow-up ticket (expected Medium / Low) after AC-010, so the validated package does not restart review and E2E. A possible Claude SDK cost-source follow-up (user question 2026-10-11) can be scoped alongside it.
- User decision (2026-10-11): "create a follow up ticket for this". Created Project Task `project_task_7257984e-19b4-452a-a65b-99316d879bc1` (TODO, starts after AC-010 and finalization; proposal and code review report attached). The SDK cost-source idea is excluded and needs its own user decision.
- Approval impact: none for this package; scope unchanged.
- Next action: this package continues with user verification (AC-010) via delivery.

### SR-008 — Native compaction resets the context reading (DR-002)

- Phase and classification: Mixed (requirements clarification + design), `Design Impact`
- Trigger: delivery DR-002 (`release-deployment-report.md` § Finalization Re-Integration; `delivery-revision-record.md`). Re-integration with `origin/personal` @ beb6b3b49 (merge 168900db7) fails the upstream test `token-usage-compaction-ingestion.test.ts` (cec24ca48, compaction-prompt-cache-reuse).
- Finding IDs: DR-002
- Evidence: `autobyteus-ts/src/agent/loop/llm-phase-summary-port.ts:165-177` reports each summary attempt as `autobyteus_compaction` with a null prompt and percent, before the compaction is applied, using the agent's own model. Upstream REQ-007 (user-approved) requires compaction tokens and cost in the totals. Clearing the reading was upstream's design and test intent, not a requirement. Meter: `TokenUsageMeterPanel.vue` hides the context card when the prompt is null (existing unknown state).
- Decision (truth rule delegated by the user): adopt (b). After a successful compaction a stale pre-compaction reading is false, may persist through an idle period, and reproduces the "high % without compaction" confusion this ticket fixes. Unknown is truthful.
- Prior status: requirements Approved; design Ready (ARCH-REV-003 Pass); AC-010 verified by the user 2026-10-11
- Current status: requirements Approved with the BEH-005 clarification and new AC-011; design Ready with D-11; architecture re-review required
- Intended behavior changed: `Yes`, narrowly (native, after a compaction call only). This adopts behavior already established by the merged upstream design and is within the user's delegation ("decisions should be reflecting the truth"). It is reported to the user, and AC-011 asks for a user check of a native compaction.
- Canonical sections changed: requirements BEH-005, AC-010 status, AC-011; design-spec status, D-11, Final File Responsibility Mapping (+3 rows)
- Post-design classification: unchanged (Large / High). The delta itself is small (one field, one fold rule, converter mapping, test adaptation).
- Applied handoff-rule outcome: revised architecture package, Large/High → `/software_engineering_team/architecture_reviewer`
- Next action: architecture re-review → implementation → code review → affected-scope validation → delivery resumes finalization and the beta release

### SR-009 — D-11 withdrawn; paused for native-runtime removal

- Phase and classification: Requirements, `Requirement Gap` → `Blocked` (User/External Prerequisite)
- Trigger (user, 2026-10-12): "during compaction, the context rate stay here. just do not change, after finishing compaction it shows the latest … if show unknown, they get confused." Then: "there is a team working on removal of autobyteus runtime now. lets wait until that team to finish."
- Intended behavior: the D-11 reset is withdrawn. During compaction the reading stays unchanged and changes only when a new reading arrives (original D-4 rule). Compaction calls still count as model calls, with tokens and cost. The open native detail (old value kept after a final-answer compaction until the next call, versus a local estimate) is moot if the native runtime is removed.
- State at pause: D-11 implemented (IR-003, 5b48c2b47; handoff 1d93c9002) and code-reviewed (CRR-004, ab1265c7f). HOLD sent and acknowledged by `/software_engineering_team/implementation_engineer`; HOLD sent to `/software_engineering_team/api_e2e_engineer` (affected-scope validation). Delivery holds finalization on the unpushed integration (168900db7, 15bdb2d62). The user verified AC-010 on 2026-10-11.
- Blocker: completion of the AutoByteus (native) runtime removal by another team. It removes or changes BEH-005, AC-011, the native converter, `llm-phase.ts` usage emission, the native threshold (REQ-010 native part), the `autobyteus_compaction` ingestion and the upstream compaction test.
- Next action when unblocked: re-base on the then-current origin/personal, then re-scope:
  - drop the native-only items (BEH-005 native parts, AC-011, D-11; REQ-010 native threshold);
  - revert 5b48c2b47 if it is still present;
  - re-check the merge;
  - revise SR-010 and route per the handoff rules.
- Approval impact: the pending native question is not asked further. The remaining requirements are unchanged.

### SR-010 — Pause lifted; native compaction keeps the reading (D-12)

- Phase and classification: Mixed (requirements + design), `Requirement Gap` resolved
- Trigger (user, 2026-10-12): "i made a mistake. its not removing autobyteus runtime. its about the remote provider." SR-009's blocker does not exist, and the native runtime stays.
- Intended behavior (user, 2026-10-12): "during compaction, the context rate stay here. just do not change, after finishing compaction it shows the latest … first show context rate then compaction activity … then the context rate become smaller, this is natural transition."
- Open detail resolved (option 1 of the question put to the user; under the truth delegation and REQ-001): after a compaction following the final answer, the previous value stays until the agent's next call reports the real new size. No local estimate. Reported to the user.
- Prior status: Blocked (SR-009); D-11 implemented (IR-003, 5b48c2b47) and reviewed (CRR-004), with holds active
- Current status: requirements Approved (BEH-005 and AC-011 rewritten to the user's stated behavior); design Ready with D-12 (D-11 withdrawn)
- Canonical sections changed: requirements BEH-005, AC-011, revision ID; design-spec status, D-11 withdrawn, D-12, file mapping (3 rows)
- Design delta: revert IR-003, adapt the upstream compaction test to "reading kept", update docs. No new mechanism.
- Post-design classification: unchanged (Large / High)
- Applied handoff-rule outcome: revised architecture package, Large/High → `/software_engineering_team/architecture_reviewer`. Holders notified that the pause is lifted.
- Next action: architecture re-review → implementation (revert) → code review → affected-scope validation → delivery finalization and beta (after the AC-011 user check)

### SR-011 — "Compacted — updates on the next model call" note (D-13)

- Phase and classification: Mixed (requirements + design), `Refinement` (user-requested addition)
- Trigger (user, 2026-10-12): "add it please i think you made great sense" and "do it in this ticket. because i feel it belongs to this ticket", answering the proposal of a truthful note after a compaction until the next real reading.
- Approval: explicit user approval of the behavior (REQ-012 / AC-012, text "Compacted — updates on the next model call").
- Evidence: `autobyteus-web/types/agent/AgentRunState.ts` (`compactionStatus`, no timestamp); `services/agentStreaming/handlers/agentStatusHandler.ts:92-115` (`handleCompactionStatus`); `types/activity/compactionPhase.ts` (`completed`/`failed`/`stopped`); `types/tokenUsageMeter.ts:130-132` (`revision`, `latestRuntimeKind`); probe P6 (Codex reading arrives with or before completion).
- Design: D-13, frontend-only, using exact-run revision marks. No server, storage or contract change.
- Prior status: requirements Approved (SR-010); design Ready (D-12), ARCH-REV-005 Pass; implementation of the D-12 revert in progress
- Current status: requirements Approved (+REQ-012, AC-012); design Ready (D-12 + D-13); re-review required
- Post-design classification: unchanged (Large / High)
- Applied handoff-rule outcome: revised architecture package, Large/High → `/software_engineering_team/architecture_reviewer`. The implementation engineer is informed that D-13 will follow D-12.
- Next action: architecture re-review → implementation (D-12 revert + D-13) → code review → validation → AC-011/AC-012 user check → delivery and beta

### SR-012 — D-13 clearing rule corrected (CRR-006)

- Phase and classification: Design, `Design Impact`
- Trigger: code reviewer failure-origin review CRR-006 for API-REV-002 F-API-002-01 (DESK-004d). After a manual Claude `/compact`, the note never appears: the turn-end `claude_sdk_result` remainder (summariser tokens, no reading, no call) is saved about 8 ms after COMPACTION_STATUS "compacted", and D-13's "any newer revision clears" rule removed the mark.
- Root cause (design): D-13's trigger premise ("the first observation after a completed compaction is the next agent call") and RR-7's "rare" premise do not hold for the supported manual `/compact` scenario (P3: summariser usage appears only in `modelUsage`).
- Correction: the mark stores the exact-run `usageReportCount` and clears only when it advances (a model call since the compaction). D-9 freshness is unchanged. The residual narrows to a Claude call whose context read timed out.
- Prior status: design Ready (SR-011, ARCH-REV-006 Pass); IR-004 implemented; API/E2E Fail on DESK-004d only
- Current status: requirements Approved (AC-012 wording clarified: manual `/compact`; saves without a call do not clear); design Ready (D-13 corrected)
- Intended behavior changed: `No` (the approved REQ-012 behavior is unchanged; the design now realizes it)
- Post-design classification: unchanged (Large / High)
- Applied handoff-rule outcome: revised architecture package, Large/High → `/software_engineering_team/architecture_reviewer`
- Next action: re-review → implementation (mark field change) → code review → API/E2E rerun of DESK-004d and the AC-012 cases → user checks → delivery

### SR-013 — ARCH-F-004 wording alignment

- Phase and classification: Design, `Design Impact` (consistency only)
- Trigger: ARCH-REV-007 ARCH-F-004 (Low, blocking). The SR-012 rule was confirmed sound, but four statements in design-spec.md still described the superseded revision-based mark.
- Changes: D-13 opening (model-call count; `revision` stays freshness only); panel bullet (host's exact-run model-call count, not the roll-up count); meter file row (marks hold `usageReportCount`, cleared only when it advances); test row (`completed` marks; a save without a call does not clear; the next counted call clears; failed and stopped never mark; no note for Codex or Antigravity; roll-up uses the host's exact-run count).
- Intended behavior changed: `No`
- Post-design classification: unchanged (Large / High)
- Applied handoff-rule outcome: → `/software_engineering_team/architecture_reviewer`

### SR-014 — Event-sourced compaction mark (CRR-007, CR-F-002)

- Phase and classification: Design, `Design Impact`
- Trigger: code review CRR-007 (round 6) CR-F-002. Supported Normal Scenario: the user reopens an existing Claude SDK standalone run and runs `/compact` first. Standalone hydration fetches only the roll-up (`useTokenUsageWorkspaceScope.hydrateIdentity` l.107-133), so `markCompactionCompleted` records a `null` baseline and the remainder's first exact summary clears the note. The same happens for a resume-opened process.
- Verified: live entry points are `applyTokenUsageUpdated` (`tokenUsageHandler.ts:9`) and `applyTeamTokenUsage` (`TeamStreamingService.ts:394`); `tokenUsageCompactionMarks.ts` baseline logic.
- Decision: option (a). Per-run boolean mark, cleared only by a live event for that run with `reports_model_call: true`, in both entry points. Fetched summaries and non-call events never clear. Rejected: (b) extra host fetch, which costs a query per open and races the remainder; (c) prompt-value comparison, which is weaker.
- Intended behavior changed: `No` (REQ-012 / AC-012 unchanged)
- Canonical sections changed: design-spec status, D-13 opening/Owner/Panel/Trigger residual, meter file row, test row
- Post-design classification: unchanged (Large / High)
- Applied handoff-rule outcome: → `/software_engineering_team/architecture_reviewer`
- Next action: re-review → implementation (marks file + two clear points + spec change) → code review → API/E2E rerun (DESK-004d, reopened-standalone `/compact`, AC-012) → user checks → delivery
