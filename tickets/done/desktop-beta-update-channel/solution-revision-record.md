# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline | N/A | N/A | Ready for Approval | BEH-001..007; REQ-001..009 | Presented to user for approval |
| SR-002 | Requirements | User question on Docker `upgrade --all` | N/A | Ready for Approval | Ready for Approval | BEH-007, BEH-008; REQ-010, REQ-011; DEC-002, DEC-004 | Docker beta track added; superseded SR-001; **Approved 2026-09-27** |
| SR-003 | Design | Architecture design on approved SR-002 | N/A | Requirements Approved; design none | Design Ready | All (design); Out-of-Scope wording clarified for Android notes mode | Design complete; Medium / High |
| SR-004 | Design | ARCH-REV-001 (round 1, Fail — Design Impact) | ARCH-001, ARCH-002, ARCH-003, ARCH-004 | Design Ready (SR-003) | Design Ready | BEH-004, BEH-006, BEH-008; REQ-005, REQ-006, REQ-007, REQ-010; AC-006, AC-008, AC-009, AC-013, AC-014; QR-004 | All four findings resolved in design; requirements unchanged |
| SR-005 | Design | Code review CRR-003 failure-origin (API-F-001 → CR-002) | CR-002, API-F-001 | Design Ready (SR-004, ARCH-REV-002 Pass) | Design Ready | BEH-004, BEH-003; REQ-007, REQ-002; AC-008; QR-001 | Channel lock keyed on sticky `updateStaged`; requirements unchanged |

## Revision Entries

### SR-001 — Stable/Beta desktop update channel baseline

- Phase and classification: Requirements / Initial Baseline
- Triggering input: User conversation 2026-09-27 (release-frequency problem; Stable/Beta chosen; toggle in Settings → About → Updates accepted; Docker/Android/iOS scope deferred to designer)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started
- IDs affected: BEH-001..007, REQ-001..009, AC-001..012, SCN-001..006, DEC-001..003
- Scenario-basis changes: N/A (baseline)
- Why recorded: First coherent baseline for user approval
- Canonical sections changed: all (new) in `requirements-doc.md`, `investigation-notes.md`
- Supplemental artifacts: None
- Prototype evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: Pending explicit user approval
- Supplement approvals: N/A
- Design/review basis: N/A
- Post-design classification: N/A
- Handoff: None yet
- Downstream impact: None yet
- Remaining gaps: UNK-001, RSK-001 (architecture phase)
- Next action: Obtain user approval, then start architecture design

### SR-002 — Add Docker beta track

- Phase and classification: Requirements / Refinement
- Triggering input: User question 2026-09-27: whether Docker `latest` points to beta or stable after a release, and a wish that `autobyteus-docker upgrade --all` reach the newest build including betas
- Triggering finding IDs: N/A
- Prior status: SR-001 Ready for Approval (not approved)
- Current status: Requirements `Ready for Approval`; design not started
- IDs affected: BEH-007 (Docker removed from it), BEH-008 (new), REQ-010, REQ-011, AC-012 (narrowed), AC-013..017, SCN-006 (narrowed), SCN-007, SCN-008, QR-004, DEC-002 (narrowed), DEC-004, UC-006, UC-007
- Scenario-basis changes: Added Docker opt-in/stable scenarios
- Why recorded: The user extended scope to Docker
- Canonical sections changed: requirements-doc.md (status, problem, behavior, actors, scope, requirements, ACs, scenarios, quality, contracts, decisions, traceability); investigation-notes.md (source log, BEH-008 facts)
- Supplemental artifacts: None
- Intended behavior changed: Yes (scope extension, pre-approval)
- Approval impact: SR-001 was never approved. SR-002 was approved explicitly by the user on 2026-09-27 ("thanks i approve now"), with the Docker usage restated as `upgrade --all` → latest and `--tag beta` → beta
- Design/review basis: N/A
- Post-design classification: N/A
- Handoff: None
- Remaining gaps: UNK-001, RSK-001; Docker `beta` backward-move guard (design)
- Next action: Architecture design (SR-003)

### SR-003 — Architecture design

- Phase and classification: Mixed (Design + Evidence-only clarification)
- Triggering input: Approved SR-002
- Triggering finding IDs: N/A
- Prior status: Requirements Approved (SR-002); design not started
- Current status: Requirements Approved (SR-002 basis unchanged); design `Ready`
- IDs affected: all BEH/REQ/AC mapped in design-spec.md; UNK-001 resolved (source evidence); RSK-001 accepted
- Scenario-basis changes: None
- Why recorded: Design completed
- Canonical sections changed: design-spec.md (new); investigation-notes.md (Architecture Investigation Findings, UNK-001/RSK-001 status); requirements-doc.md Out Of Scope (Android bullet clarified: release-notes-mode alignment needed to realize REQ-006)
- Supplemental artifacts: None
- Intended behavior changed: No. The Android notes-mode touch implements the already-approved "betas use generated notes" (REQ-006, BEH-006); the user is informed of this clarification with the design result
- Approval impact: SR-002 approval continues to apply
- Design/review basis: new
- Post-design classification: task_size=Medium; architectural_risk=High (release deployment behavior for all users, new IPC contract, new local persistence)
- Handoff: see handoff-solution-designer.md
- Remaining gaps: The first real beta CI run must confirm UNK-001 in practice
- Next action: Route per handoff rules

### SR-004 — Resolve architecture review ARCH-REV-001

- Phase and classification: Design / Design Impact
- Triggering input: `/architecture_reviewer` ARCH-REV-001 round 1, Fail (`design-review-report.md`, `architecture-review-revision-record.md`)
- Triggering finding IDs: ARCH-001 (blocking), ARCH-002 (blocking), ARCH-003, ARCH-004
- Prior status: Requirements Approved (SR-002); design Ready (SR-003), review Fail
- Current status: Requirements Approved (SR-002, unchanged); design Ready (SR-004)
- IDs affected: BEH-004/DS-003 (ARCH-001, ARCH-004); BEH-006/BEH-008/DS-004/DS-005 (ARCH-002, ARCH-003); REQ-005, REQ-006, REQ-007, REQ-010; AC-006, AC-008, AC-009, AC-013, AC-014; QR-004
- Scenario-basis changes: None
- Why recorded: Review findings resolved
- Canonical sections changed in design-spec.md: Terminology (canonical release-tag grammar); DS-003/DS-005 chains, narratives and inventory owner; Interface Boundary Mapping (set-channel result, `next-beta`/`is-newest` grammar and outputs); Shared Structure check; Final File Responsibility Mapping (types, store, About, Docker workflow, tests fixture, i18n); Examples (real inventory, concurrent betas, `downloaded` switch); Key Tradeoffs; Risks (failed newer build); Guidance; architecture evidence rows. investigation-notes.md: tag inventory, Docker job structure, install-on-quit evidence
- Resolutions:
  - ARCH-001: `downloaded` joins the busy guard (UI disabled with hint; command refused). REQ-007 promise kept, so no Requirement Gap
  - ARCH-002: strict grammar `vX.Y.Z` / `vX.Y.Z-beta.N` (no leading zeros, N ≥ 1); other tags ignored; out-of-grammar candidate → `false`; real inventory fixture
  - ARCH-003: option (a). `:beta` is moved in a final post-push step after `git fetch --tags` + `is-newest`, via `imagetools create`. Residual (failed newer build) accepted and documented
  - ARCH-004: `set-channel` returns `{accepted, persisted, state}`; the store shows the save-failed toast on `persisted:false`; no new state error fields
- Supplemental artifacts: None
- Intended behavior changed: No
- Approval impact: SR-002 approval continues to apply
- Design/review basis: ARCH-REV-001 applies to SR-003; re-review required for SR-004
- Post-design classification: unchanged (Medium / High)
- Handoff: handoff-solution-designer.md (updated for SR-004)
- Remaining gaps: the first real beta CI run confirms UNK-001 in practice
- Next action: Architecture re-review

#### SR-004 review outcome (recorded 2026-09-27)

- `/architecture_reviewer` ARCH-REV-002: **Pass** on SR-004 (SR-002 requirements basis). ARCH-001..004 are verified resolved.
- New non-blocking note ARCH-005, sent by the reviewer directly to implementation: run `release_versions.py` in the Docker step from `$GITHUB_SHA` rather than the `release_ref` checkout, so manual re-publishes of pre-change tags don't fail.
- The reviewer delivered the implementation handoff to `/implementation_engineer`. No duplicate forwarding by Solution Designer.
- Report: `design-review-report.md`; record: `architecture-review-revision-record.md` (same folder).

### SR-005 — Sticky staged-update lock (CR-002 / API-F-001)

- Phase and classification: Design / Design Impact
- Triggering input: `/code_reviewer` CRR-003 failure-origin review of `/api_e2e_engineer` API-REV-001 finding API-F-001 (`code-review-report.md` § "API/E2E Failure-Origin Review — API-F-001"; evidence `api-e2e-evidence/harness-results/E2E-07b-downloaded-then-check-then-opt-out.json`, `api-e2e-evidence/br02-browser-downloaded-lock-bypass.json`)
- Triggering finding IDs: CR-002, API-F-001
- Prior status: Requirements Approved (SR-002); design Ready (SR-004; ARCH-REV-002 Pass)
- Current status: Requirements Approved (SR-002, unchanged); design Ready (SR-005)
- IDs affected: BEH-004, BEH-003, DS-003; REQ-007, REQ-002; AC-008; QR-001
- Scenario-basis changes: None to requirements. SCN-005-STAGED and SCN-005-STAGED-ERR (code-review scenario IDs) are covered by SCN-005
- Why recorded: The SR-004 status-only lock is bypassable because `downloaded` is not sticky. A manual or failed check changes the status while the update stays staged for install on quit
- Decision: option (a), a sticky per-process `AppUpdateState.updateStaged` (set on `update-downloaded`, never cleared in-process) plus a shared `isAppUpdateChannelLocked(state)` rule used by main and renderer. The status-only `APP_UPDATE_CHANNEL_LOCKED_STATUSES` is removed. Rejected: (b) blocking manual checks in `downloaded` and (c) toggling `autoInstallOnAppQuit`, because both change preserved behavior (and (c) may not stop Squirrel)
- Canonical sections changed in design-spec.md: approval basis; evidence rows; DS-003 chain and narrative; Interface Boundary Mapping (set-channel refusal); Shared Structure check; Final File Responsibility (shared types, About); Removal plan; Examples; Key Tradeoffs; Guidance step 1; validation note. investigation-notes.md: CR-002 evidence row
- Supplemental artifacts: None
- Intended behavior changed: No. It restores the approved REQ-007/AC-008 outcome; preserved Check and install-on-quit behavior are untouched
- Approval impact: SR-002 approval continues to apply
- Design/review basis: ARCH-REV-002 applied to SR-004; SR-005 changes a reviewed contract (set-channel refusal, UI lock), so architecture re-review applies. Downstream: implementation (with regression spec), source re-review, API/E2E rerun of E2E-07/07b/BR-02, proportional test-code review
- Post-design classification: unchanged (Medium / High)
- Handoff: handoff-solution-designer.md (updated for SR-005)
- Remaining gaps: the first real beta CI run (CI-01) remains with delivery
- Next action: Route per handoff rules

#### SR-005 review outcome (recorded 2026-09-27)

- `/architecture_reviewer` ARCH-REV-003: **Pass** on SR-005 (SR-002 requirements basis). CR-002 / API-F-001 is resolved at the design level. ARCH-001 is recorded as reopened downstream and re-resolved.
- Accepted residual P-007: after a failed replacement download, the switch stays locked until restart. This errs on the safe side.
- The reviewer delivered the implementation handoff to `/implementation_engineer`. No duplicate forwarding by Solution Designer.
- Report: `design-review-report.md`; record: `architecture-review-revision-record.md` (same folder).
