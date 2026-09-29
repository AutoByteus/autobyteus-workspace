# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline for Product Design request | N/A | N/A | Draft | BEH-001, BEH-003..006; REQ-001..007; DEC-001..008 | Product Design Requested |
| SR-002 | Requirements | Product Prototyper `Prototype Completed` (ticket `chat-interface-entry`, `personal@1579886`) | OPEN-001–005, DEC-008 | Draft | Ready for Approval | BEH-001, 003–014; REQ-001–020; AC-001–017; SCN-001–009; DEC-001–012 | Awaiting user approval |
| SR-003 | Requirements | User decisions in Solution Designer conversation 2026-09-28 + approval | DEC-005, DEC-008–DEC-014 | Ready for Approval | Approved (supplement revision pending) | BEH-003, BEH-012; REQ-005, 007, 013, 018, 019, 020; AC-004, 011, 016, 017; UC-010 removed | Product Design Requested (Result Correction, Chat box only) |
| SR-004 | Evidence | Product Prototyper `Prototype Completed` R2 (`origin/personal@8ac6cad`) | N/A | Approved (supplement revision pending) | Approved; ready for architecture | Supplement references; REQ-018 wording | R2 integrated; architecture design started |
| SR-005 | Design | Architecture investigation + design on approved SR-003/SR-004 basis | N/A | Requirements Approved; design N/A | Design Ready; Architecture Design Complete (Large/High) | All REQ/AC via behavior map | Routed to architecture review |
| SR-006 | Design | ARCH-REV-001 (Fail, Design Impact), `design-review-report.md` | AR-001–AR-005 + non-blocking notes | Design Ready (SR-005) | Design Ready; Architecture Design Complete (Large/High) | BEH-005, 007, 010, 011, 012; REQ-002, 007, 008, 011, 012, 013, 015, 016, 017; editorial REQ-010/013 traceability, SCN-002 | Returned to architecture review (ARCH-REV-002) |
| SR-007 | Design | ARCH-REV-002 (Fail, Design Impact) | AR-001 remainder (MP-006), AR-007 | Design Ready (SR-006) | Design Ready; Architecture Design Complete (Large/High) | BEH-010, BEH-005; REQ-011, REQ-002 | Returned to architecture review (ARCH-REV-003) |
| SR-008 | Design | Code Reviewer CRR-002 (API/E2E failure origin for API-REV-001) | CR-004, CR-003, CR-002 | Design Ready (SR-007), ARCH-REV-003 Pass | Design Ready; Architecture Design Complete (Large/High) | REQ-007, AC-002, REQ-003, REQ-011 (UXJ-007) | Routed to architecture review |
| SR-009 | Design | ARCH-REV-004 (Fail, Design Impact) | AR-008 (MP-008, MP-009) | Design Ready (SR-008) | Design Ready; Architecture Design Complete (Large/High) | REQ-007/AC-002, REQ-017/AC-014, REQ-004 | Returned to architecture review (ARCH-REV-005) |
| SR-010 | Design | Implementation Engineer IR-002 Design Impact on D-14 | CR-003 / RSK-007 (AF-30 premise disproved) | Design Ready (SR-009), ARCH-REV-005 Pass | Design Ready; Architecture Design Complete (Large/High) | REQ-003/AC-002, REQ-011/AC-009 | Routed to architecture review |
| SR-011 | Mixed | Delivery Engineer DR-002, user verification UVF-001 | UVF-001 | Approved (SR-003) | Approved (delta); design D-16 Ready | BEH-003; REQ-021 / AC-018 / DEC-015 | Routed to architecture review |
| SR-012 | Design | ARCH-REV-007 (Fail, Design Impact) | AR-009 (MP-015) | Design Ready (SR-011) | Design Ready; Architecture Design Complete (package Large/High; delta Small/Low) | REQ-021 / AC-018 | Returned to architecture review (ARCH-REV-008) |

## Revision Entries

### SR-001 — Draft baseline for Chat entry and easy runtime/model selection

- Phase and classification: Requirements — Initial Baseline
- Triggering input: User request 2026-09-28 (chat entry above Agents, New chat, temp workspace default, easy runtime/model selection; explicit request to consult Product Prototyper first)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Draft`; design N/A
- IDs affected: BEH-001, BEH-003, BEH-004, BEH-005, BEH-006; REQ-001..REQ-007; AC-001..AC-005 (draft); SCN-001..SCN-004; DEC-001..DEC-008
- Scenario-basis changes: SCN-001..003 proposed Supported Normal; SCN-004 `Unclear`
- Why recorded: First coherent baseline used for the Product Design request
- Canonical sections changed: All (new)
- Supplemental artifacts added: `product-design-request-handoff.md`
- Prototype evidence incorporated: None yet
- Intended behavior changed: N/A (new baseline)
- Approval impact: Not approved; approval to be sought after Product consultation
- Behavior-defining supplement versions: None yet
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome / result file: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-request-handoff.md` (route recorded there)
- Downstream impact: None until approval
- Remaining gaps: DEC-001..DEC-008
- Next action: Product Prototyper engages the user on UI design; Solution Designer integrates the returned result and user decisions.

### SR-002 — Integrate approved Product UI/UX package; Ready for Approval

- Phase and classification: Requirements — Refinement
- Triggering input: Product Prototyper `Prototype Completed` message 2026-09-28 (run `product_prototyper_1be6b7192b8b40b2b1c1167143416482`); ticket `chat-interface-entry`; prototype `personal@1579886` (result `27f9b74`)
- Triggering finding IDs: OPEN-001–OPEN-005, DEC-008 (carried as DEC-009–DEC-012, DEC-005, DEC-008)
- Prior status: Requirements `Draft`
- Current status: Requirements `Ready for Approval`; design N/A
- IDs affected: BEH-001, 003–014 (BEH-007–014 new); REQ-001–020 (REQ-008–020 new or rewritten); AC-001–017; SCN-001–009; DEC-001–004, 006, 007 resolved; DEC-005, 008–012 open with recommendations
- Scenario-basis changes: SCN-004 (graduation) removed as out of scope (DEC-003); SCN-004–SCN-009 now skill tagging, addressing, team quick path, model change, tree management, attachments — Supported Normal per user decisions in Product sessions
- Why recorded: returned user-approved Product package defines intended UI behavior
- Canonical sections changed: requirements-doc all sections; investigation-notes Product Design Findings + follow-up evidence
- Supplemental artifacts added: Product `ui-ux-spec.md`, VIS-001–025 (SHA-256 verified 25/25), behavior matrix, change log (externally owned, linked)
- Prototype evidence incorporated: UXJ-001–011, UIS-001–012, TR-001–014
- Intended behavior changed: Yes (scope expanded by user decisions: unified message box in all run views, single-agent run view → chat view, skill tagging, `@` addressing, team quick path, auto-approve default)
- Approval impact: requirements approval pending; UI/UX supplement user-confirmed 2026-09-28 (PC-035)
- Behavior-defining supplement versions: `ui-ux-spec.md` at prototype `personal@1579886`
- Affected design/review basis: N/A (design not started)
- Post-design classification: N/A
- Applied handoff-rule outcome: None — routine approval hold in the user conversation
- Downstream impact: none until approval
- Remaining gaps: DEC-005, DEC-008, DEC-009, DEC-010, DEC-011, DEC-012
- Next action: user answers/accepts recommendations and approves; then architecture design

### SR-003 — User decisions and requirements approval; Chat-box supplement revision requested

- Phase and classification: Requirements — Refinement + Approval
- Triggering input: User answers in the Solution Designer conversation 2026-09-28
- Triggering finding IDs: DEC-005, DEC-008, DEC-009, DEC-010, DEC-011, DEC-012, DEC-013, DEC-014
- Prior status: Ready for Approval (SR-002)
- Current status: Requirements `Approved`; behavior-defining UI supplement partially superseded, revision requested from Product
- IDs affected: BEH-003, BEH-012; REQ-005, REQ-007, REQ-013, REQ-018, REQ-019, REQ-020; AC-004, AC-011, AC-016, AC-017; UC-010 removed
- Decisions: DEC-005 land on Chat at app start; DEC-008 old `codex/general-chat-entry` worktree + local branch deleted (executed, was `11865cf85`); DEC-009 schema-driven thinking; DEC-010 Daily Assistant internal in Built-in package, visible/configurable; DEC-011 no Recent list, New chat starts with last-used runtime+model (device-local); DEC-012 skill instruction wording accepted (placement decided in architecture); DEC-013 team/org run views unchanged; DEC-014 Chat box reuses existing Context Files area, adds Chat-only features; single ticket
- Scenario-basis changes: UXJ-010 / SCN-009 narrowed to Chat
- Why recorded: user approval of the intended behavior; scope reduced toward fewer changes to existing views
- Canonical sections changed: requirements-doc status, behavior, scope, REQ, AC, decisions, traceability, readiness; investigation-notes RSK-002
- Supplemental artifacts: Product revision request `product-design-revision-request-handoff.md`
- Intended behavior changed: Yes (relative to SR-002: Recent list removed, attachment area reused, run views unchanged, landing on Chat)
- Approval impact, exact approved requirements baseline and reference: `SR-003`, user approval 2026-09-28 ("Yes, I think that's more consistent design … chat just adds features to it")
- Behavior-defining supplement versions: `ui-ux-spec.md` @ prototype `personal@1579886` except superseded items; revised Chat-box version pending user confirmation
- Affected design/review basis: N/A (design not started)
- Post-design classification: N/A
- Applied handoff-rule outcome: `/product_team/product_prototyper` (Product Design Requested, Result Correction) — see handoff file
- Downstream impact: architecture design waits for revised supplement
- Remaining gaps: revised Chat-box visuals + user confirmation
- Next action: Product revises Chat box visuals/spec; Solution Designer integrates, then architecture design

### SR-004 — Integrate user-confirmed R2 Chat-box supplement

- Phase and classification: Evidence — Refinement (supplement integration; no intended-behavior change)
- Triggering input: Product Prototyper `Prototype Completed` R2 message 2026-09-28 (run `product_prototyper_1be6b7192b8b40b2b1c1167143416482`)
- Triggering finding IDs: N/A
- Prior status: Requirements Approved; supplement revision pending
- Current status: Requirements Approved; supplement R2 user-confirmed; ready for architecture design
- IDs affected: REQ-018 (supplement reference); UI section; supplement references
- Scenario-basis changes: none
- Why recorded: R2 realizes DEC-009, DEC-011, DEC-013, DEC-014 and DEC-005 in the supplement
- Canonical sections changed: requirements-doc status + UI section + REQ-018 + readiness; investigation-notes Product Design Findings
- Supplemental artifacts: `ui-ux-spec.md` R2; VIS-001–025 (VIS-020 removed); 24/24 SHA-256 verified by Solution Designer; prototype `origin/personal@8ac6cad`
- Prototype evidence incorporated: R2 Chat box = existing message box + Context Files area; footer left workspace/approval, right model/thinking/mic/send; no Recent; thinking rule; team/org views reverted to baseline; `/` → `/chat`
- Intended behavior changed: No (R2 user change "send in footer row" is a visual placement within the approved Chat box behavior; confirmed by the user in R2)
- Approval impact: SR-003 approval stands; R2 supplement has its own user confirmation
- Behavior-defining supplement versions: R2 at `origin/personal@8ac6cad`
- Affected design/review basis: design starts on this basis
- Post-design classification: see design-spec.md
- Applied handoff-rule outcome: pending design completion
- Remaining gaps: none for requirements
- Next action: architecture design

### SR-005 — Architecture design complete

- Phase and classification: Design — Initial design
- Triggering input: approved requirements SR-003 + R2 supplement (SR-004)
- Triggering finding IDs: N/A
- Prior status: Requirements Approved; design not started
- Current status: `design-spec.md` Ready; `Architecture Design Complete`; task_size `Large`, architectural_risk `High`
- IDs affected: all BEH/REQ/AC mapped in the design behavior map; spines DS-001–DS-009; decisions D-01–D-12
- Scenario-basis changes: none
- Why recorded: completed technical design
- Canonical sections changed: investigation-notes Architecture Investigation Findings (AF-01–AF-22), Notes; new design-spec.md
- Supplemental artifacts: none new
- Intended behavior changed: No. Design-derived realization to note for the user: the agent editor shows a "Use all installed skills" option so the built-in Daily Assistant remains configurable (REQ-007/DEC-010). Skill instruction is composed in the app from one codec (no server protocol change), which is a placement choice the user left to architecture.
- Approval impact: none (SR-003 approval + R2 supplement confirmation stand)
- Behavior-defining supplement versions: R2 @ `origin/personal@8ac6cad`
- Affected design/review basis: new design; independent architecture review required
- Post-design classification: Large / High — shared GraphQL + agent-config contract (`skillScope`), routing move of all standalone runs to `/chat`, composer-target and tool-shell extractions, built-in bootstrap policy, skill resolution across four runtimes
- Applied handoff-rule outcome: `/software_engineering_team/architecture_reviewer` — see `architecture-review-handoff.md`
- Downstream impact: implementation waits for architecture review Pass
- Remaining gaps: RSK-001, RSK-003–RSK-005 (engineering risks)
- Next action: architecture review

### SR-006 — Design revision for ARCH-REV-001

- Phase and classification: Design — Design Impact (plus editorial requirements cleanup)
- Triggering input: Architecture Reviewer ARCH-REV-001, `design-review-report.md` (run `architecture_reviewer_56679ab1e8eb439aabd9474b7ab12fcd`)
- Triggering finding IDs: AR-001 (High), AR-003 (High), AR-004 (Medium), AR-002 (Low), AR-005 (Low); MP-001–MP-005; non-blocking notes
- Prior status: design Ready (SR-005), review Fail
- Current status: design Ready (SR-006); `Architecture Design Complete`; Large / High (unchanged)
- IDs affected: design D-02, D-03, D-04, D-08, D-09, D-11, new D-13; requirements editorial (success definition, SCN-002, data-continuity wording, REQ-010/REQ-013 traceability)
- Scenario-basis changes: none
- Why recorded: close the review findings within the already-chosen owners
- Canonical sections changed:
  - design-spec.md: Intended Change, Ownership, Removal Plan, Off-Spine, Boundaries, Dependency Rules, Interfaces, File Mapping, Examples, Sequence, Risks, the new "ARCH-REV-001 Resolution" section, and Guidance
  - investigation-notes.md: AF-23–AF-27, the supplement inventory, and the revision header
  - requirements-doc.md: editorial only
- Supplemental artifacts: `design-review-report.md` and `architecture-review-revision-record.md` (reviewer-owned, linked)
- Intended behavior changed: No. The requirements edits are editorial alignment with already-approved DEC-011/DEC-013/DEC-014.
- Approval impact: none. SR-003 approval and the R2 confirmation stand.
- Behavior-defining supplement versions: R2 @ `origin/personal@8ac6cad`
- Affected design/review basis: ARCH-REV-001 basis superseded by SR-006; re-review required
- Post-design classification: Large / High, unchanged
- Applied handoff-rule outcome: `/software_engineering_team/architecture_reviewer` — see `architecture-review-handoff.md` (SR-006 section)
- Downstream impact: implementation still waits for an architecture review Pass
- Remaining gaps: engineering risks RSK-001 and RSK-003–RSK-006
- Next action: ARCH-REV-002

### SR-007 — Design revision for ARCH-REV-002

- Phase and classification: Design — Design Impact
- Triggering input: Architecture Reviewer ARCH-REV-002, `design-review-report.md`
- Triggering finding IDs: AR-001 remainder (MP-006, High), AR-007 (Low)
- Prior status: design Ready (SR-006), review Fail
- Current status: design Ready (SR-007); `Architecture Design Complete`; Large / High (unchanged)
- IDs affected: D-04 (launch order), D-08 (footer mode keyed on run identity); REQ-011 / AC-009, REQ-002 / AC-002 protection
- Scenario-basis changes: none
- Canonical sections changed:
  - design-spec.md: D-04, D-08, Ownership Boundaries, Boundary Map, the `chatRunModelControls` row, Examples, Guidance, and the new "ARCH-REV-002 Resolution" section
  - investigation-notes.md: AF-28
- Intended behavior changed: No
- Approval impact: none
- Behavior-defining supplement versions: R2 @ `origin/personal@8ac6cad`
- Affected design/review basis: ARCH-REV-002 basis superseded; re-review required
- Post-design classification: Large / High, unchanged
- Applied handoff-rule outcome: `/software_engineering_team/architecture_reviewer` — see `architecture-review-handoff.md` (SR-007 section)
- Remaining gaps: engineering risks RSK-001 and RSK-003–RSK-006
- Next action: ARCH-REV-003

#### Review outcome for SR-007 (informational)

- 2026-09-28: Architecture Reviewer ARCH-REV-003 — **Pass**, with no open findings. Basis: SR-003, SR-004 and SR-007. Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`.
- The reviewer handed the cumulative package to `/software_engineering_team/implementation_engineer`, and delivery was confirmed. Solution Designer did not duplicate that handoff.

### SR-008 — Design revision for the API/E2E failure-origin review CRR-002

- Phase and classification: Design — Design Impact (CR-004) + Unclear resolved as a Missing Invariant (CR-003) + sequencing of the Local Fix (CR-002)
- Triggering input: Code Reviewer CRR-002 round 2 (run `code_reviewer_ee824e288f4b487ba385d3ae690145ac`), `code-review-report.md` "API/E2E Failure-Origin Review (Round 2)"; API/E2E API-REV-001
- Triggering finding IDs: CR-004/F-03, CR-003/F-02, CR-002/F-01
- Prior status: design Ready (SR-007), ARCH-REV-003 Pass; implementation IR-001 committed (`b7336203a`…`717603e61`)
- Current status: design Ready (SR-008); `Architecture Design Complete`; Large / High (unchanged)
- IDs affected: new D-14 and D-15; File Mapping; Risks (RSK-003 status, RSK-007)
- Evidence: AF-29–AF-31
- Intended behavior changed: No.
  - D-15 is a precedence rule that realizes REQ-007 ("all installed skills") in a workspace that has its own skill of the same name. It follows the local-overrides-global convention the runtimes already apply when they discover workspace skills natively.
  - It is surfaced to the user as a technical decision the user may veto.
  - D-14 restores a lifecycle invariant for REQ-003/AC-002.
- Approval impact: none. SR-003 approval and the R2 confirmation stand.
- Affected design/review basis: ARCH-REV-003 covered SR-007; D-14/D-15 are new design, so re-review is required before implementation continues
- Post-design classification: Large / High, unchanged
- Applied handoff-rule outcome: `/software_engineering_team/architecture_reviewer` — see `architecture-review-handoff.md` (SR-008 section)
- Downstream impact: after review, implementation (D-14, D-15, CR-002 together), then source review, then API/E2E rerun
- Remaining gaps: D-14's close-stack evidence is required during implementation (RSK-007)
- Next action: architecture review of SR-008

### SR-009 — Complete D-15 for live-run holders and ACP/Grok (ARCH-REV-004)

- Phase and classification: Design — Design Impact
- Triggering input: Architecture Reviewer ARCH-REV-004, `design-review-report.md`. D-14, the core rule of D-15, and the CR-002 sequencing were accepted.
- Triggering finding IDs: AR-008 (MP-008 cross-run different-source holders; MP-009 ACP/Grok omission)
- Prior status: design Ready (SR-008), review Fail
- Current status: design Ready (SR-009); `Architecture Design Complete`; Large / High (unchanged)
- IDs affected: D-15 (Rule 1 user-owned; Rule 2 weak/strong holders with direction A skip and direction B atomic yield; ACP/Grok scope); File Mapping; Examples; Guidance (validation V-A to V-E); CRR-002 Resolution table
- Evidence: AF-32
- Intended behavior changed: No. This is a technical precedence and concurrency rule within REQ-007 that preserves REQ-017 configured launches. It is surfaced to the user.
- Approval impact: none
- Applied handoff-rule outcome: `/software_engineering_team/architecture_reviewer` — see `architecture-review-handoff.md` (SR-009 section)
- Next action: ARCH-REV-005; then implementation (D-14, D-15, CR-002), source review, and the API/E2E rerun

#### Review outcome for SR-009 (informational)

- 2026-09-29: Architecture Reviewer ARCH-REV-005 — **Pass**. Basis: SR-009, with approved SR-003/SR-004. AR-008 is resolved. Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`.
- The reviewer handed the package to `/software_engineering_team/implementation_engineer` with binding constraints:
  - **IC-1:** release after a re-point is by registry-entry counts.
  - **IC-2:** on Windows, the re-point uses a registry-serialized unlink + symlink.
  - Solution Designer did not duplicate the handoff.
- Non-blocking recommendation R-1 (MP-012), recorded as a deferred design candidate:
  - The idea: in Direction A, the weak request joins the existing entry as a weak co-holder instead of skipping, so the link survives the strong holder's release.
  - Residual risk while deferred: if the configured holder ends first, a live Daily Assistant chat loses that one same-named skill link until its next run.
  - Revisit if API/E2E or the user raises it.

### SR-010 — D-14 revised: activation-pending marker (IR-002 evidence)

- Phase and classification: Design — Design Impact (evidence correction)
- Triggering input: Implementation Engineer IR-002 (run `implementation_engineer_a590e11b3b474f6483962c929f601ae8`); commits `da1033860` (code) and `46f28bb9f` (evidence). D-15 and CR-002 are implemented and validated.
- Triggering finding IDs: CR-003 / F-02, RSK-007. The AF-30 premise was disproved (AF-33).
- Prior status: design Ready (SR-009), ARCH-REV-005 Pass
- Current status: design Ready (SR-010); `Architecture Design Complete`; Large / High (unchanged)
- IDs affected: D-14 (replaced), File Mapping (`runHistoryLoadActions`, `agentRunStore`, `AgentStreamingService`), CRR-002 Resolution row, RSK-007; investigation AF-30 (corrected) and AF-33
- Decision: an `agentRunStore` activation-pending marker.
  - Set: before connecting, for first sends (after promotion) and for Offline/Error resumes.
  - Cleared: by an active snapshot, a handled failure/cancel, a rejected SEND_MESSAGE ack, or terminate/close.
  - Reconcile skips marked runs. The SR-008 `submissionPending` guard is removed.
  - Options (a) and (c) were rejected, with the reasons recorded in D-14.
- Intended behavior changed: No
- Approval impact: none
- Applied handoff-rule outcome: `/software_engineering_team/architecture_reviewer` — see `architecture-review-handoff.md` (SR-010 section)
- Next action: architecture review of the D-14 revision; then implementation IR-003 (D-14 only), source review, and the API/E2E rerun

#### Review outcome for SR-010 (informational)

- 2026-09-29: Architecture Reviewer ARCH-REV-006 — **Pass**. Basis: SR-010, with approved SR-003/SR-004. The D-14 activation-pending marker is accepted. Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`.
- The reviewer handed the package to `/software_engineering_team/implementation_engineer`. Solution Designer did not duplicate the handoff.
- Deferred non-blocking items (separate-ticket candidates unless downstream evidence escalates them):
  - **R-2:** the workspace branch of `fetchRunHistoryTree` lacks the org branch's request-generation guard. Out-of-order snapshots can cause a transient, self-healing Offline flicker after a send. No message is lost. Pre-existing.
  - **MP-014:** the marker can outlive a very short activation, until terminate or close. Residual and accepted.
- Also deferred earlier: R-1 (ARCH-REV-005, weak co-holder instead of skip).

### SR-011 — Requirement Gap from user verification: Chat model labels (in progress)

- Phase and classification: Requirements — Requirement Gap
- Triggering input: Delivery Engineer DR-002 (run `delivery_engineer_15de3e05868b476d9013e7a631a6ef83`), `user-verification-finding-001.md`
  - The user tested the local build and found the Chat model menu "not as intuitive" as the launch form (e.g. a bare `opus`).
- Evidence (verified by Solution Designer 2026-09-29):
  - `useChatModelCatalog.ts` labels rows with `modelIdentifier` (L66–L68), and its search haystack (L99) omits `canonicalName`.
  - The shared policy in `utils/modelSelectionLabel.ts` / `modelSelectionOptions.ts` is used by the launch form.
  - The Claude SDK catalog has `opus` → `claude-opus-5-5` "Opus 5.5", recommended.
  - No model is missing.
- Prior status: requirements Approved (SR-003), design SR-010 (ARCH-REV-006 Pass), delivery at user verification (blocked)
- Current status: requirements delta `Ready for Approval`; design affected area Needs Revision (Chat model menu labeling only)
- IDs affected: BEH-003; proposed REQ-021, AC-018, DEC-015
- Intended behavior changed: Yes (new labeling requirement). User approval is required before the design revision.
- Next action: user decision on DEC-015, then design revision + routing

#### SR-011 completion

- User approval: 2026-09-29, "approve" for DEC-015 as recommended (shared label policy; single line with a tooltip; extended search). The user confirmed "lets go" after a before/after explanation.
- Design: D-16 was added to `design-spec.md`, together with a File Mapping row and an "SR-011 Resolution" section.
- Delta classification: Small / Low. The cumulative package stays Large / High.
- Applied handoff-rule outcome: `/software_engineering_team/architecture_reviewer`, per the Large/High package rule. See `architecture-review-handoff.md` (SR-011 section).
- Next: architecture review → implementation (D-16, plus IR-003 D-14 if still open) → source review → API/E2E → delivery refresh and a rebuild for user re-verification.

### SR-012 — D-16 completed for the persisted-run path (ARCH-REV-007)

- Phase and classification: Design — Design Impact
- Triggering input: ARCH-REV-007 AR-009 (MP-015)
  - `chatRunModelControls.ts` L92–L125 builds the fixed list and label from `ExistingRunModelChoice` with `name: choice.llmModelIdentifier`.
  - `ChatModelMenu.vue` L289–L294 has an inline search.
  - `ExistingRunModelChoice` lacks `providerType`.
- Evidence checked by Solution Designer: `components/launch-config/RuntimeModelConfigFields.vue` L212–L240 already maps a choice to a shared label input (`choiceLabel`) for the gear editor.
- Decision:
  - `useChatModelCatalog.toChatModelOption` is the single Chat option builder. Its label input is the catalog record first (full fields, loaded for persisted runs by CR-002), else the shared `existingRunChoiceLabelInput` (moved from `RuntimeModelConfigFields`).
  - One search predicate, `matchesModelQuery` / `filterOptions`.
  - A generic `compareRecommendedFirstBy` export.
  - Validation V-L1 to V-L5.
- Intended behavior changed: No (realizes the approved REQ-021)
- Approval impact: none
- Applied handoff-rule outcome: `/software_engineering_team/architecture_reviewer` (the package is Large/High) — see `architecture-review-handoff.md` (SR-012 section)

#### Review outcome for SR-012 (informational)

- 2026-09-29: Architecture Reviewer ARCH-REV-008 — **Pass**. Basis: SR-012, with approved SR-003/SR-004/SR-011. AR-009 is resolved. Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md`.
- The reviewer handed the package to `/software_engineering_team/implementation_engineer`. Solution Designer did not duplicate the handoff.
- Accepted non-blocking residual: while a persisted run's catalog is still loading, its rows use the fallback mapping and may relabel once the catalog arrives.
