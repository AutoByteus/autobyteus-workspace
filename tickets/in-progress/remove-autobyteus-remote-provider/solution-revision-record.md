# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from Project Task brief + user correction (2026-10-11) | N/A | N/A | Ready for Approval | BEH-001..BEH-010; REQ-001..REQ-010 | Presented to the user with DEC-001 and DEC-002 |
| SR-002 | Requirements | User approval 2026-10-11 ("approve" → "approve as recommended") | N/A | Ready for Approval | Approved | DEC-001 (a), DEC-002 (a); REQ-002, REQ-006, REQ-007 | Requirements approved |
| SR-003 | Design | Architecture design after approval | UNK-001, UNK-002, RSK-001, RSK-002 | Requirements Approved; design N/A | Design Ready; Large / High | All REQ/AC | Architecture Design Complete |
| SR-004 | Design | Code reviewer Design Impact CR-001 (CRR-003), 2026-10-12; the user asked to fold it into this ticket | CR-001 | Design Ready (SR-003); implementation reviewed | Design Ready; Large / High | REQ-002 (dead-code follow-through); no AC change | Architecture Design Complete (revised) |

## Revision Entries

### SR-001 — Initial requirements baseline for removing the remote AutoByteus provider

- Phase and classification: Requirements, `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Project Task `project_task_7fed5fe3-3ffc-45bd-8925-9873d0850546`; brief `follow-up-autobyteus-provider-removal.md`; user correction 2026-10-11 (remove `LLMRuntime.AUTOBYTEUS`, keep `RuntimeKind`)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not yet created
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001..BEH-010, REQ-001..REQ-010, AC-001..AC-008, SCN-001..SCN-006, DEC-001..DEC-005
- Scenario-basis or scenario-validity changes: N/A (baseline)
- Why this baseline or revision was recorded: first coherent baseline presented for approval
- Canonical requirements, investigation and design sections changed: all sections created
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact, exact approved requirements baseline and user-approval reference: pending
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: N/A
- Downstream and architecture-review impact: N/A
- Remaining gaps, assumptions or blocked decisions: DEC-001, DEC-002 (user); ASM-002; architecture unknowns UNK-001, UNK-002, RSK-001, RSK-002
- Next action: obtain explicit user approval and answers to DEC-001 and DEC-002

### SR-002 — Requirements approved

- Phase and classification: Requirements, `Refinement` (approval capture)
- Triggering user feedback: the user said "i think the requirement is clear right?". I replied that approval and the two decisions were still open and asked for "approve as recommended". The user replied "approve" (2026-10-11, Solution Designer conversation).
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Ready for Approval`
- Current authoritative requirements/design status: requirements `Approved`; design not yet created
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: DEC-001 → (a) include image/audio; DEC-002 → (a) no migration; REQ-002, REQ-006, REQ-007 wording finalized
- Scenario-basis or scenario-validity changes: None
- Why this revision was recorded: explicit approval
- Canonical requirements, investigation and design sections changed: requirements status, approval, decisions, readiness
- Supplemental artifacts added, changed or removed: None
- Product design evidence or product decisions incorporated: N/A
- Intended behavior changed: No (the recommended options were adopted as presented)
- Approval impact, exact approved requirements baseline and user-approval reference: Approved basis = SR-001 + DEC-001(a) + DEC-002(a); user "approve", 2026-10-11
- Behavior-defining supplement versions and approval references: None
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference: N/A
- Downstream and architecture-review impact: N/A
- Remaining gaps, assumptions or blocked decisions: architecture unknowns (resolved in SR-003)
- Next action: architecture design

### SR-003 — Architecture design complete

- Phase and classification: Design, `Initial Baseline` (design)
- Triggering user feedback, Product package, investigation evidence, or role/report/round: approved requirements (SR-002); architecture investigation 2026-10-11
- Triggering finding IDs: UNK-001, UNK-002, RSK-001, RSK-002 (all resolved in design)
- Prior authoritative requirements/design status: requirements Approved; design N/A
- Current authoritative requirements/design status: requirements Approved (unchanged); `design-spec.md` Ready
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: all mapped in the design behavior map
- Scenario-basis or scenario-validity changes: None
- Why this revision was recorded: design completed
- Canonical requirements, investigation and design sections changed: investigation "Architecture Investigation Findings"; new `design-spec.md`
- Supplemental artifacts added, changed or removed: None
- Product design evidence or product decisions incorporated: N/A
- Intended behavior changed: No
- Approval impact, exact approved requirements baseline and user-approval reference: unchanged (SR-002)
- Behavior-defining supplement versions and approval references: None
- Affected design/review basis invalidated or rebuilt: N/A (first design)
- Post-design task-size/risk classification and rationale changes: `task_size=Large`, `architectural_risk=High` (shared exported enum/GraphQL/secret-consumer contract removals; released backfill migration repointed to a frozen table; wide test blast radius)
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: see `handoff-architecture-design-complete.md`
- Downstream and architecture-review impact: independent architecture review expected per handoff rules
- Remaining gaps, assumptions or blocked decisions: ASM-002 (low); Follow-up: single-value `MultimediaRuntime`/media `runtime` field in the shared GraphQL row
- Next action: apply the handoff rules

### SR-004 — Remove the single-valued `MultimediaRuntime` (Design Impact CR-001)

- Phase and classification: Design, `Design Impact`
- Triggering report/round: code reviewer `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-003, finding CR-001 (supersedes the CRR-001 Pass). The user asked on 2026-10-12 to do it in this ticket ("if its small why not just do it in this ticket"), as quoted by the code reviewer.
- Triggering finding IDs: CR-001 (CAND-008, CON-002)
- Prior authoritative requirements/design status: requirements Approved (SR-002); design Ready (SR-003); ARCH-REV-001 Pass on SR-003
- Current authoritative requirements/design status: requirements Approved (unchanged); design Ready (SR-004)
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: REQ-002 follow-through (dead code); no REQ/AC/SCN wording change
- Scenario-basis or scenario-validity changes: None
- Why this revision was recorded: SR-003 deferred the single-valued `MultimediaRuntime` and the media `runtime` field as a Follow-up, on the premise that removing them would reshape the shared GraphQL `ModelDetail` contract. The reviewer's evidence, re-verified by me on the implemented branch (`git grep MultimediaRuntime`, `git grep runtime` in server media paths), shows:
  - `ModelDetail.runtime` stays for LLM rows;
  - `mapMedia` can emit `'api'`;
  - the web never reads media `runtime`;
  - the six `runtime === API && provider === GEMINI` checks are always true in their first half, all in touched files.

  Under Core Principle 7 this is dead code in touched files. A further dead consumer was found: by-runtime logging in `video-model-provider.ts`.
- Canonical requirements, investigation and design sections changed: design-spec Solution basis, Task Design Health (deferrals), Removal / Decommission Plan (item moved to In This Change; server `modelKind` kept as an explicit Follow-up per ARCH-REV-001 R-003), Shared Structure check, Key Tradeoffs, Change Sequence step 6
- Supplemental artifacts added, changed or removed: None
- Product design evidence or product decisions incorporated: N/A
- Intended behavior changed: No. The GraphQL shape and the observable media `runtime: 'api'` value are unchanged; no data change. No renewed approval needed.
- Approval impact, exact approved requirements baseline and user-approval reference: unchanged (SR-002). The user's 2026-10-12 request covers including this cleanup.
- Behavior-defining supplement versions and approval references: None
- Affected design/review basis invalidated or rebuilt: ARCH-REV-001 covered SR-003 and does not cover this delta; the CRR-001 Pass is superseded by CR-001
- Post-design task-size/risk classification and rationale changes: none; stays `Large` / `High` (the delta itself is small and low-risk)
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: see `handoff-design-revision-sr-004.md`
- Downstream and architecture-review impact: per the configured rule (Large/High), the revised package goes to architecture review before implementation
- Remaining gaps, assumptions or blocked decisions:
  - Follow-up: server dynamic-source `modelKind`.
  - Separate-ticket candidate OBS-001 (pre-existing, from API/E2E): a stopped native run whose saved model is no longer offered says "Choose another model", but `run-model-selection-service.ts:68` refuses any replacement because the unavailable current model has no verified context capacity. The user cannot resume such a run. This happens with any unavailable model (for example LM Studio), so it is not caused by this removal. It is recorded in requirements as a known limitation of SCN-004 for stopped native runs and raised with the user.
- Next action: apply the handoff rules

## Review Log

- 2026-10-11 — ARCH-REV-001 **Pass** on SR-003 (`design-review-report.md` in this folder). The reviewer forwarded the package to `/software_engineering_team/implementation_engineer`. Its non-blocking notes:
  - R-001: the readable-id migration's use of the current built-in provider names is output validation, so no freeze is needed.
  - R-002: the backfill migration was first released in v1.4.31, not v1.4.53. This is a factual correction; design-spec and investigation-notes are corrected.
  - R-003: the single-valued `modelKind` belongs with the `MultimediaRuntime` follow-up.

  No solution revision was required.
- 2026-10-12 — ARCH-REV-002 **Pass** on SR-004 (`design-review-report.md`). The reviewer forwarded the SR-004 delta to `/software_engineering_team/implementation_engineer`. Note status:
  - R-002 and R-003 resolved.
  - R-001 still open, optional.
  - New R-004 (non-blocking): track OBS-001 as a separate-ticket candidate. Already recorded in SR-004 and requirements "Out Of Scope"; a user decision on opening a ticket is pending.

  No solution revision required.
