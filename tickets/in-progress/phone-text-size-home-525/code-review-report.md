# Code Review Report — phone-text-size-home-525 (autobyteus-525)

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/phone-text-size-home-525/requirements-doc.md` (SR-001, Approved)
- Investigation Notes Reviewed As Context: not reread (the design spec's Current-State Read and evidence table were sufficient for this bounded question)
- Solution Revision Record Reviewed As Context: not reread (SR-001 only)
- Design Spec Reviewed As Context: `design-spec.md` (SR-001) — Task Size, Escalation trigger, Change Scope, Change/Refactor Sequence step 5, Key Tradeoffs
- Supplemental Task Artifacts Reviewed As Context: None exist
- Relevant Solution Revision IDs: SR-001
- Design Review Report Reviewed As Context: N/A (direct route)
- Architecture Review Revision Record Reviewed As Context: N/A
- Relevant Architecture Review Revision IDs: N/A
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (VNC Viewer recorded as not run, l.118, l.152)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001 (code `7c7f3d2e79`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E round 1 `Fail` on API-10
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md` (testing guideline: `TESTING.md`)
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001 (evidence commit `c7ed92c47d`)
- Delivery Revision Record Reviewed: N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: API-10 (AC-005; REQ-005 "VNC Viewer controls and clipboard", REQ-007)
- Exact Failing Commands / Execution Mode: `node evidence/api-e2e/scripts/vnc-bar.mjs <out> autobyteus-web/dist/public` (head phone bundle, production CSS/fonts, bar markup copied from the current source, icons as same-size boxes)
- Failure Evidence Paths: `evidence/api-e2e/vnc/API-10-vnc-bar.json`, `API-10-412-largest-control.png`, `API-10-360-largest-control.png`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review` (direct route; no prior source review)
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: None — Medium/Low still holds; the finding is a missing layout decision for one screen, not a contract, persistence or cross-subsystem change.

## Review Scope

- Changed implementation and behavior reviewed: how the ticket's rem scaling (DS-001, root = 16 px × step/17) reaches the VNC Viewer bar.
- Files / areas reviewed: `components/mobile/views/MobileNodeDesktop.vue` l.11–61, 181 (`barButtonClass`); `components/mobile/MobileScreenBar.vue` l.4–17; `localization/messages/en/mobileNodeDesktop.ts` (labels); the probe script `evidence/api-e2e/scripts/vnc-bar.mjs` (reconstruction fidelity); `git diff b0ffdffa95 7c7f3d2e79 --stat` (neither bar file touched).
- Explicit exclusions: the rest of the API/E2E suite (passed); the full-screen strip and the clipboard sheet (not reported failing); a general source audit.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-005 lists "VNC Viewer controls and clipboard" among the screens that scale; REQ-007/AC-005 require no cut-off without ellipsis, no overlap, no sideways overflow at Largest on 360 and 412 px; AC-006 requires Standard to render as today. DEC-003 decided proportional scaling of the whole layout.
- Design-spec behavior map verified against the implementation: DS-001 is implemented as designed — the bar is all rem (`h-12`, `w-12`, `h-9 px-3 text-sm`, `pl-1 pr-1`), so it scales by exactly the factor, as the design intended for every rem screen.
- Design review report and round confirmed: N/A (direct route)
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: how the bar should look at Large/Largest (see Classification); and whether fixing it may change Standard (AC-006 vs FU-002).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-002 | Confirmed | Root font size from `appFontSizeStore` phone source → rem layout of `MobileScreenBar` + `MobileNodeDesktop` `#actions`; measured root 17.88 / 19.76 px in the probe | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002 (VNC Viewer, Control) | BEH-002, REQ-005, REQ-007, AC-005 | User | The founder | Read and use VNC Viewer at his chosen size | Run ⋮ → VNC Viewer (REQ-003 keeps it), connected, switched to Control (autobyteus-407 feature) | Normal | Stored step → plugin 06 → root size → bar reflows; Control while connected shows Keyboard, Clipboard, Control, full screen (l.23–59) | Bar fits the width; title readable or ellipsized | Requirements REQ-005 list names this screen; source `v-if="mode === 'control' && isConnected"` | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The reconstruction is a faithful witness of the production bar | SCN-002 | — | Script copies the same classes, nesting (`header` → back, `h1`, `#actions`) and the en labels ("VNC Viewer", "Keyboard", "Clipboard", "Control"); icons are boxes of the same `h-6 w-6` / `h-5 w-5` inside the same `w-12` buttons, so they do not affect width; production CSS and fonts load from `dist/public` | `vnc-bar.mjs` l.22–40 vs `MobileNodeDesktop.vue` l.12–59, `MobileScreenBar.vue` l.4–17 | Promote (as evidence) | — | The measured widths stand for the real bar |
| C-02 | Control-mode bar overflows at Large (360) and Largest (360, 412) | SCN-002 | Founder chooses Large/Largest, opens VNC Viewer in Control | Fixed-width, `flex-shrink-0` actions scale × factor; only the title shrinks, to its padding (19.8 px, "V"); full-screen button ends at 403.5 / 442.8 px | `API-10-vnc-bar.json`; screenshots | Promote | This ticket (the ticket's scaling causes it on an REQ-005 screen; AC-005 fails without a fix) | Needs a fix — see C-03 for which kind |
| C-03 | No sizing-only fix can make the bar fit | SCN-002, design escalation trigger | — | At Standard the non-title content needs ≈ 348 px = 21.75 rem (364 px header at 360 with the title at its 16 px padding). At Largest the budget is 360 / 19.76 = 18.2 rem (412: 20.85 rem): the actions are ≈ 3.5 rem over at 360 **with no title text at all**. The sizing levers (button `px-3`→`px-2`, labels `text-sm`→`text-xs`, title padding) save ≈ 70 px of the ≈ 83 px needed at 360, still leave no title, and shrinking the 48 px back/full-screen targets works against the phone's 44 px tap-target practice. A fit needs fewer or different things on the bar: icons instead of labels, Keyboard/Clipboard moved to the status row below (l.62–74, which has a flexible `flex-1` text), an overflow menu, or a two-row bar | Arithmetic from the evidence JSON; classes at l.53, 181; `MobileScreenBar.vue` l.4–15 | Promote | This ticket — Design Impact (design's escalation trigger: "cannot be made clean at Largest without a layout redesign (not a sizing fix)") | Route to Solution Designer to choose the layout |
| C-04 | Standard at 360 px already 4 px over (363.7) | — | — | Same markup on the base; unchanged by `7c7f3d2e79` | Diff stat; JSON row 360/standard/control | Promote | Follow-up FU-002 (already recorded by API/E2E) — but see note under Classification: the C-03 fix will very likely resolve it and touches AC-006 | No action from this review beyond the note |
| C-05 | Implementation defect (code did something other than designed) | — | — | Implementation followed DS-001 and design step 5 ("fix sizing issues"); it recorded VNC as not run and why (no node desktop in the probe) | `implementation-handoff.md` l.118, 152 | Reject | — | Not an implementation defect |

## Findings

### CR-001 — VNC Viewer's Control-mode bar does not fit at Large/Largest, and no sizing fix can make it fit (`Design Impact`)

- Protects: REQ-005 (VNC Viewer controls scale), REQ-007 / AC-005 (no cut-off, nothing past the screen edge at Largest on 360 and 412 px).
- Evidence: C-01…C-03. 412 px Largest: header 443 px, full-screen button right edge 442.8 px, title 19.8 px wide showing "V" without an ellipsis (`h1 … truncate` has no room for even the ellipsis). 360 px Large: 403.5; 360 px Largest: 442.8. View-only fits everywhere.
- Origin: the design's proportional layout scaling (DEC-003, Key Tradeoffs: "cost: narrower usable width at Largest") meets a bar whose fixed actions already fill a 360 px screen at Standard. The design assumed every screen would be cleaned by sizing fixes (step 5); this one needs a layout decision, which is exactly the design's own escalation trigger.
- Not an earlier review gap: the route was direct (no source review). The implementation handoff disclosed that VNC Viewer was not rendered.
- Required response (design owner): choose how the Control-mode bar fits at the larger steps — e.g. icon buttons with labels as `aria-label`, Keyboard/Clipboard moved to the status row, an overflow, or a second row — and say whether the change applies at every step (then the Standard bar changes, which conflicts with AC-006 "every phone screen renders as today" unless the requirement is amended, and FU-002 is resolved with it) or only at the larger steps (keeps AC-006; a step-dependent layout). Then hand the revised design to implementation; API/E2E reruns API-10 afterwards, ideally also on a live node desktop.

## Follow-ups

- Follow-ups this review added: None. FU-002 (API/E2E) stays as recorded; the Solution Designer may fold it into this ticket if the chosen layout changes the Standard bar.

## Classification

- `Design Impact` (CR-001). Not a `Local Fix`: the bounded sizing fix the design anticipated cannot make the bar fit (C-03). The AC-006 interaction may also need a requirement decision, which the Solution Designer owns.

## Recommended Recipient

- Solution Designer (`/solution_designer`) — rule: "When review identifies a Design Impact, Requirement Gap, or Unclear issue that requires upstream requirements or design revision."

## Residual Risks

- The measurement is a faithful reconstruction, not the live component; a live node desktop check remains open (API/E2E residual).
- zh-CN labels have other widths; the chosen layout should be checked in both languages.
- Other screens passed API-07's 15-screen sweep; this review did not widen to them.

## Latest Authoritative Result

- Review Decision: `Fail` (failure origin confirmed)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: N/A (failure-origin round; no scorecard)
- Failure Origin: Design Impact — design's sizing-only assumption does not hold for the VNC Viewer Control-mode bar (CR-001)
- Recommended Recipient: `/solution_designer`
- Notes: task size Medium / risk Low preserved. Delivery note from API/E2E: `autobyteus-web/docs/remote_access.md:26` still names `usePhoneTextSize`.
