# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Task autobyteus-8; user clarifications 2026-10-29 | N/A | N/A | Requirements Approved (User); Design Ready | BEH-001..006; REQ-001..009 | Baseline requirements, design, classification Medium / Low |
| SR-002 | Requirements | Implementation engineer Requirement Gap 2026-10-29 (user changed the thinking UX after reviewing the rendered menu) | Requirement Gap (user change) | Approved | Approved (User); design Ready (SR-002) | BEH-001/002/004/006/007; REQ-004/005/009/010/011; AC-003..006, AC-010, AC-011; DEC-003..010 | Approved; design revised; Medium / Low |
| SR-003 | Design (+ user decision) | Code review failure-origin CRR-001 (API-REV-001) | CR-FO-001 | Requirements Approved; design Ready | Requirements Approved (DEC-011, AC-012 added); design Ready | REQ-011, SCN-005; AC-012; DEC-011 | Editable drafts drop undeclared keys; Medium / Low |
| SR-004 | Design | Implementation Design Impact DI-1/DI-2 on SR-003 | DI-1, DI-2 | Design Ready (SR-003) | Design Ready (SR-004) | REQ-011; AC-012 (extended); DEC-011 (owner placement) | Server validator omits undeclared keys; Medium / High → architecture review |
| SR-005 | Design | ARCH-REV-001 (Fail) | AR-001, AR-002 | Design Ready (SR-004) | Design Ready (SR-005) | REQ-011; AC-012, AC-013; DEC-011 | Canonical-only rule for all 10 validator callers; 2 callers changed; AC-013 added; stale text fixed; Medium / High → architecture re-review |

## Revision Entries

### SR-001 — Claude effort control on the AutoByteus runtime and gen-4 Claude removal

- Phase and classification: Initial Baseline.
- Trigger: Task `autobyteus-8` (Project Task Manager); user statements in the Solution Designer conversation 2026-10-29: effort for every model "whatever the model supports"; remove Claude models below 5; approval "go ahead … the requirement is quite clear".
- Triggering finding IDs: N/A.
- Prior status: N/A.
- Current status: requirements `Approved`; design `Ready`.
- IDs affected: BEH-001..006, REQ-001..009, AC-001..009, SCN-001..004, DEC-001..007.
- Scenario basis: SCN-001..003 supported normal/explicit-edge (Anthropic contract); SCN-004 operational.
- Why recorded: first coherent baseline used for approval and design.
- Canonical sections: all of requirements-doc.md, investigation-notes.md, design-spec.md created.
- Supplements: None.
- Product design evidence: N/A.
- Intended behavior changed: N/A (baseline).
- Approval: User, 2026-10-29, Solution Designer conversation; baseline = requirements-doc.md at SR-001.
- Supplement versions: N/A.
- Design/review basis invalidated: N/A.
- Classification: task_size `Medium`, architectural_risk `Low` (design-spec Task Size section).
- Applied handoff-rule outcome: see `handoff.md` Route section.
- Downstream impact: implementation per design-spec Change / Refactor Sequence.
- Remaining gaps: ASM-001/UNK-001 (live acceptance of unprobed models → AC-009); FU-001 recorded.
- Next action: route per handoff rules.

### SR-002 — One thinking list and no display setting (user change)

- Phase and classification: Requirement Gap (user change to intended behavior).
- Trigger: implementation engineer message 2026-10-29 (run implementation_engineer_bcee63bffa844240afb402bff066e728), carrying the user's words after reviewing the rendered menu (evidence/IMP-10-*): one list "Off · Low · Medium · High · Xhigh · Max"; remove thinking display, always omitted, never shown.
- Prior status: requirements Approved (SR-001); design Ready; implementation WIP commit 781823e77.
- Current status: requirements Ready for Approval; design Needs Revision.
- IDs affected: BEH-001, BEH-002, BEH-004, BEH-006, new BEH-007; REQ-004, REQ-005, REQ-009 revised; new REQ-010, REQ-011; AC-003..AC-006 revised; new AC-010, AC-011; new UC-004, SCN-005; DEC-003..006 revised, new DEC-008..010.
- Scenario changes: SCN-005 (resume a run whose config holds `thinking_display`) added from real user data (SRC-019).
- Canonical sections changed: requirements-doc.md (status, behavior, scope, requirements, ACs, scenarios, UI, data continuity, decisions, traceability, readiness); investigation-notes.md (SRC-019, SRC-020); follow-ups.md (FU-003).
- Intended behavior changed: Yes.
- Approval impact: SR-001 approval no longer covers the thinking presentation/display; renewed user approval required (DEC-010 needs explicit confirmation).
- Design impact: design-spec.md to be revised after approval (web returns to the existing merged list; display removed; adapter ignores undeclared config keys and does not send effort while off; SR-001 refusal and independent-effort web work dropped).
- Evidence added before approval: PRB-003 (live omitted-display round trip) and SRC-021, answering the user's question whether Anthropic requires the thinking to be sent back (it does; display does not change that).
- Approval: User, 2026-10-29: "If it only affects whether on the front end we display it or not, then I will not display it. It doesn't give us any help at all." Baseline: requirements-doc.md at SR-002.
- Design revised (design-spec.md SR-002): web returns to the existing one-list presentation; `thinking_display` removed; `AnthropicLLM` reads only owned config keys, never sends `display`, sends effort only while thinking is not off; SR-001 refusal and independent-effort web work dropped. Classification unchanged: Medium / Low.
- Applied handoff-rule outcome: Medium / Low → implementation engineer (handoff.md).
- Next action: implementation resumes from WIP 781823e77 per the SR-002 delta table.

### SR-003 — Stopped-run edit with keys the model no longer declares (CR-FO-001)

- Phase and classification: Design Impact, plus a user decision on the fix (data migration vs. draft alignment).
- Trigger: code reviewer failure-origin review CRR-001 (run code_reviewer_f508c1c78d90441bb3752d9aec202e29), confirming API/E2E API-REV-001: stopped agent/team runs with stored `thinking_display` fail Save with VALIDATION_FAILED (API-04, API-06); Org edit uses the same path.
- Root cause: SR-002 design premise "edit surfaces drop stale keys" was false for stopped-run edit cards (`preserve-invalid-draft`), SRC-022.
- Options presented to the user: (A) registered data migration removing `thinking_display` from saved runs (user's proposal); (B) editable drafts leave out undeclared keys. Recommendation B (guideline §3: removing an obsolete field needs no migration; covers future removed settings; no history rewrite).
- User decision 2026-10-29: "I like option B better" (DEC-011).
- Intended behavior changed: No for REQ-011 (saved runs keep working, now including edit); AC-012 makes the edit leg explicit; documented product rule refined (undeclared keys are not editable, savable or sent).
- Canonical sections changed: requirements-doc.md (revision ID, AC-012, DEC-011), investigation-notes.md (SRC-022), design-spec.md (SR-003 Delta, file mapping, escalation trigger).
- Classification: Medium / Low (unchanged).
- Applied handoff-rule outcome: Medium / Low → implementation engineer.
- Downstream impact: implementation fix; then code review and API/E2E rerun API-04, API-06 and the Org edit path; other validated cases stay valid unless autobyteus-ts or the catalog change.
- Next action: implementation.

### SR-004 — DEC-011 owned by the server validator (DI-1, DI-2)

- Classification: Design Impact (implementation engineer, run implementation_engineer_bcee63bffa844240afb402bff066e728, no code changed).
- Findings: DI-1 stopped-run edit surface is `ExistingRunConfigEditor`/`RunSettingsCard`, not `ModelConfigSection` (SR-003 premise SRC-022 wrong); DI-2 Org workspace-only edit revalidates untouched stored configs, unreachable by a client filter. Additional evidence: Org launch validates saved configs; saves persist the validator's canonical config (SRC-023).
- Design change: `validateModelConfigSchema` omits undeclared top-level keys from the canonical config (null schema → null) instead of rejecting; no client change; SR-003 client filter dropped.
- Requirements: DEC-011 owner placement recorded (Solution Designer, within the user's option-B choice; user-visible outcome unchanged); AC-012 extended with the Org workspace-only edit. No renewed approval needed (intended behavior unchanged); user informed.
- Classification: Medium / High (documented shared validation contract change) → architecture review.
- Next action: architecture review of the cumulative package.

### SR-005 — Canonical selection only (ARCH-REV-001 AR-001, AR-002)

- Classification: Design Impact from architecture review ARCH-REV-001 (run architecture_reviewer_0f802f5dd6a44f8d836ec39b1abeef6b).
- AR-001: full inventory of the 10 validator callers (design-spec SR-005); rule "callers store or launch only `validation.selection`"; Org launch and launch-usability changed to use the canonical selection; non-validated resume/launch paths recorded as pre-existing (FU-004); AC-013 added for the launch-preference/collaborator and Org launch legs.
- AR-002: stale SR-002/SR-003 text in design-spec (derived consumers, spine actors, persisted data, reuse row, escalation trigger, change sequence) and AC-012 verification intent corrected; validator input → canonical output examples added.
- Intended behavior changed: No (AC-013 makes REQ-011's launch-config leg explicit).
- Classification: Medium / High → architecture re-review limited to AR-001/AR-002.
