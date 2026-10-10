# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/skill-sources-dialog-redesign/requirements-doc.md` (REQ-008, AC-007, QR-001, BEH-007, SCN-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (package context only)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (DS-005, BEH-007 row, escalation triggers, file plan)
- Supplemental Task Artifacts Reviewed As Context: product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/ui-ux-spec.md` (§Accessibility "Focus order, movement, and return", UXJ-006, TR-006, TR-012); `handoff-to-implementation.md`; `product-design-request.md`
- Relevant Solution Revision IDs: SR-002 (baseline), SR-003
- Design Review Report Reviewed As Context: `N/A — not applicable` (direct route)
- Architecture Review Revision Record Reviewed As Context: `N/A — not applicable` (direct route)
- Relevant Architecture Review Revision IDs: `N/A`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `tickets/in-progress/skill-sources-dialog-redesign/code-review-revision-record.md` (created this round)
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): N/A
- Trigger: API/E2E round 1 `Fail` (API-REV-001), finding F-001
- Prior Review Round Reviewed: None (no prior code review; direct route)
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md` (testing guideline: `TESTING.md`)
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: J-10 (keyboard focus trap / Esc after a confirmation is cancelled), J-13 (focus after keyboard-confirmed remove and after Enter-add)
- Exact Failing Commands / Execution Mode: from the worktree root, `node tickets/in-progress/skill-sources-dialog-redesign/api-e2e-evidence/skill-sources-dialog-journey.mjs <fresh-dir>` (real backend, GraphQL, store and filesystem; controlled GitHub; worktree Nuxt dev server; headless system Chrome; real keyboard input)
- Failure Evidence Paths: `api-e2e-evidence/dialog-journey/result.json`, `api-e2e-evidence/dialog-journey-observation-run/result.json`, `api-e2e-evidence/logs/dialog-journey.log`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route; no source review occurred)
- Classification evidence or correction required: None. The defect and fix stay inside one component that already owns focus (DS-005). The classification still holds.

## Review Scope

- Changed implementation and behavior reviewed: DS-005 focus lifecycle in `SkillSourcesModal.vue`. This covers the mount focus, the panel-scoped `@keydown` Tab/Esc handler, the `inert` binding during a confirmation, the `busy`-driven `disabled` bindings, and the confirmation open/close in `confirmAction` and `@cancel`.
- Files / areas reviewed: `autobyteus-web/components/skills/SkillSourcesModal.vue`; `autobyteus-web/components/common/ConfirmationModal.vue` (unchanged, shared; read for the teleport/focus behaviour); the `SkillSourcesModal.spec.ts` focus test (lines ~370–430); journey J-10/J-13 traces.
- Explicit exclusions: no full source audit or scorecard (failure-origin round); the baseline harness fix `812a75c0a` (test code, outside this failure); O-002 probe flake in the unchanged chat runtime picker.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-008 says Tab is trapped in the dialog and Esc closes it unless a confirmation is open. QR-001 says the dialog is keyboard-operable. UI spec §Accessibility says "Tab and Shift+Tab cycle inside the panel" and that the dialog is `inert` while a confirmation is open. The spec also says Enter in the input submits Add.
- Design-spec behavior map verified against the implementation: DS-005 ("mount → record opener → focus panel → keydown(Tab/Esc) → unmount → restore focus") is implemented as written. However, it only works while focus is inside the `<section>`. Three normal lifecycle transitions push focus out of the section to `<body>`:
  1. `:inert="confirmation ? true : undefined"` blurs the focused trash button when a confirmation opens.
  2. `ConfirmationModal` is teleported to `body`. When `confirmation = null` removes it, focus stays on `<body>`, and nothing restores it.
  3. `:disabled="busy"` disables the focused input, Add button or row action during an operation, so the browser drops focus to `<body>`.
  After that, `@keydown="handleKeydown"` on the section never runs, so neither the trap nor Esc works.
- Design review report and round confirmed: N/A (direct route).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None. The requirement is explicit.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| BEH-007 | Confirmed (requirement); implementation contradicts it after a confirmation closes or an operation ends | `SkillSourcesModal.vue` L3–5: keydown is bound to the panel only. L4: `inert` while confirming. L47/L54/L22: `disabled` while busy. L75 (`@cancel="confirmation = null"`) and L214–218 (`confirmAction` finally) never refocus. No document-level handling. | N/A |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FS-1 | BEH-007, REQ-008, AC-007, QR-001, TR-006 | User | Keyboard user | Considers removing a source, then cancels and keeps working in (or closes) the dialog | Skills → Sources → Tab to the trash → Enter → confirmation → Cancel | Normal | Trash Enter → `confirmation` set → panel `inert` (focus blurs to body) → Cancel → teleported confirmation removed → focus stays on `<body>` → panel keydown handler unreachable | Expected: focus inside the panel; Tab cycles; Esc closes. Observed: Tab reaches the sidebar "Chat" behind the modal; Esc does nothing | REQ-008 / UI spec §Accessibility; J-10 trace `focusAfterCancel=BODY`, `focusAfterCancelTab=Chat`, `escAfterCancelClosed=false` (3/3 runs) | Supported Normal Scenario | Use |
| FS-2 | BEH-007, REQ-008, QR-001, TR-006 | User | Keyboard user | Removes a source by keyboard, then continues | Same entry → Remove confirmed | Normal | `confirmAction` → `busy` → `refreshCatalog` → `confirmation = null`; the row may be gone and the confirmation is removed → `<body>` | Same as FS-1 | J-13 `b-keyboard-remove-confirmed.focusAfterOperation=BODY`, `afterTab=Chat` | Supported Normal Scenario | Use |
| FS-3 | BEH-007, REQ-008, UI spec "Enter in the input submits Add" | User | Keyboard user | Adds a source by typing a path and pressing Enter | Add input → Enter | Normal | `handleAdd` → `scanning` → `busy` → input `disabled` → focus to `<body>` → nothing refocuses after `scanning=false` | Focus outside the panel. Esc from `<body>` is not handled. Tab only lands in the panel by chance | J-13 `a-enter-add.focusAfterOperation=BODY` | Supported Normal Scenario | Use |
| FS-4 | Shared `ConfirmationModal` (unchanged) | User | Keyboard user | Operate the confirmation by keyboard | Confirmation open | Normal | Shared component does not focus itself or handle Esc (O-001) | Outside this package's approved behaviour. The design escalation trigger forbids changing `ConfirmationModal` here | O-001; design-spec §Escalation trigger | Supported Normal Scenario, but out of approved scope | Reject (for this package) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | Focus is not restored into the panel after the confirmation closes (cancel or confirm) | FS-1, FS-2 | User keyboard action through the exposed trash button | Lifecycle as in FS-1/FS-2. Focus escapes the `aria-modal` dialog to the app behind it, and Esc stops working | J-10/J-13 traces; source L4, L75, L214–218 | Promote | Bounded local fix in the focus owner (DS-005) |
| C-002 | Focus is lost when the focused control is disabled during an operation (Enter-add; also the keyboard-activated Check/Try again/row action while busy, same mechanism) | FS-3 | User presses Enter in the add input | Lifecycle as in FS-3 | J-13 trace; source L22, L47, L54, L184–197 | Promote | Same fix, in the same owner |
| C-003 | Trap/Esc work only while focus is inside the section (`@keydown` on the section) | FS-1–FS-3 | Root mechanism shared by C-001 and C-002 | — | Source L5 | Promote (as cause of CR-001, not a separate finding) | Fix can restore focus and/or handle keydown at document level while open. Tab must not be forced into the panel while it is `inert` |
| C-004 | `ConfirmationModal` lacks initial focus and Esc (O-001) | FS-4 | — | — | O-001 | Reject (out of approved scope) | Not a requirement of this package. Changing the shared component is a design escalation trigger. Leave it as an observation |
| C-005 | Probe WEB-CHAT-A flake (O-002) | — | — | Unchanged chat runtime picker; rerun passed 8/8 | O-002 | Reject | Not attributable to this change |

## Docs-Impact Verdict

- Docs impact: `No`. `docs/skills.md` describes the dialog at a level that does not change with this fix.

## Additional Material Premise Validation (When Required)

None.

## Findings

### CR-001 — Focus escapes the open dialog after a confirmation closes or an operation ends, so the Tab trap and Esc stop working (API/E2E F-001)

- Severity: High for REQ-008 and AC-007. A keyboard user reaches background UI behind an `aria-modal` dialog, and Esc no longer closes it.
- Scenario basis: FS-1, FS-2, FS-3 (Supported Normal). Candidates C-001, C-002 and C-003 are promoted.
- Source evidence: `autobyteus-web/components/skills/SkillSourcesModal.vue`
  - L3–5: `@keydown="handleKeydown"` is bound to the panel `<section>` only. Focus on `<body>` bypasses both the trap and Esc.
  - L4: `inert` while confirming blurs the focused trash button.
  - L72–75 / L214–218: when the confirmation closes, through `@cancel="confirmation = null"` or `confirmAction`'s `finally`, nothing returns focus to the panel. `ConfirmationModal` is teleported to `body`, and after a confirmed remove the originating row may no longer exist.
  - L22, L47, L54: `:disabled="busy"` drops focus from the focused control during add/check/update/remove, and `handleAdd` (L184–197) and `check` (L198–202) do not restore it.
- Runtime evidence: J-10 and J-13 in `api-e2e-evidence/dialog-journey/result.json` failed in 3/3 runs.
- Durable coverage gap: `SkillSourcesModal.spec.ts` "moves focus into the dialog, traps Tab, and returns focus to the opener" only covers open and close.
- Required action (implementation_engineer), bounded to `SkillSourcesModal.vue` and its spec:
  1. After a confirmation closes (cancel or confirm) and after an operation ends, put focus back inside the panel. Use the originating control if it is still connected and enabled; otherwise use the add input or the panel. Wait for `busy` to clear and the DOM to update.
  2. Make Esc and the Tab cycle work even when focus has fallen out of the panel while the dialog is open. For example, use a document-level keydown listener registered on mount and removed on unmount, which brings a stray Tab back into the panel. It must stay inactive while a confirmation is open: the panel is `inert` then, and Esc must remain ignored (AC-007).
  3. Add durable component assertions. After Cancel, after a confirmed remove, and after Enter-add, `document.activeElement` must be inside the panel. Esc must close the dialog afterwards, and must still be ignored while the confirmation is open.
- Constraints: do not change `ConfirmationModal`, the stores or the design. If the fix appears to need any of these, return a Design Impact to the Solution Designer, as the design-spec escalation trigger requires. `useAccessibleDrawer` is drawer-specific (layer stack, z-index), so it is a reference pattern, not a required reuse.

## Classification

- `Local Fix`. Origin: an implementation defect, an incomplete realisation of DS-005 against REQ-008. The design reference `6810fc8` has the same code, so the defect originated upstream of the port. The design spec states the behaviour (focus trapped, Esc closes unless confirming), and the fix stays inside the focus owner it names. No requirement or design change is needed.
- Earlier review gap: N/A. The direct route had no source review. The defect was detectable from source (panel-scoped keydown combined with `inert`, teleport and `disabled`). The implementation self-check's component test did not cover focus after these transitions.
- Not an invalid/stale test or an environment issue. The journey enters through the real Sources button with real keyboard input. Its assertions match REQ-008 and the UI spec, it reproduces 3/3, and the source explains the mechanism.

## Recommended Recipient

- `implementation_engineer`, then API/E2E round 2 (J-10/J-13 first, then the full journey, web tests, probe and D-01). The route is direct (Medium / Low), so implementation source review is not required by the classification.

## Residual Risks

- O-001 (shared `ConfirmationModal` has no initial focus and no Esc) remains a pre-existing, out-of-scope accessibility gap. While a confirmation is open, a keyboard user starts from `<body>` and must Tab into it. Candidate for a separate ticket.

## Latest Authoritative Result

- Review Decision: `Fail` (API/E2E failure confirmed as an implementation defect)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (FS-1–FS-3 supported normal; FS-4 rejected as out of scope)
- Material-Premise Gate: `Pass` (none required)
- Score Summary: N/A (failure-origin round)
- Failure Origin: implementation defect in `SkillSourcesModal.vue` focus lifecycle (CR-001 = API/E2E F-001)
- Recommended Recipient: `implementation_engineer` (`Local Fix`)
- Notes: Baseline harness fix `812a75c0a` is not implicated. Test-code review for it is `Not Required` on this direct low-risk route, per the API/E2E policy.
