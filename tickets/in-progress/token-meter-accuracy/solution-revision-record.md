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
