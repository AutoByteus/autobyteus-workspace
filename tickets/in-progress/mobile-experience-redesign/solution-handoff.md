# Solution Handoff — mobile-experience-redesign (autobyteus-277)

- **Classification:** `Architecture Design Complete`.
  - `task_size = Large`; `architectural_risk = High`.
  - Rationale: shared desktop owners are extended or extracted, the phone's ownership of "what is open" moves to the shared target, and the phone's screen state moves into the route. See design-spec "Task Size And Architectural Risk".
- **Route:** `/software_engineering_team/architecture_reviewer`, by the handoff rule for Large or High.
- **Package:** `mobile-experience-redesign`. Project Task `autobyteus-277` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the user.
- **Solution revision:** `SR-004`: the design revised for `ARCH-REV-001` round 1. Requirements unchanged at SR-003.
- **Workspace:**
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign`, branch `codex/mobile-experience-redesign`.
  - Base `origin/personal` @ `e00581d485a128bddc428d4441400ed21dc14db7`; finalization target `origin/personal`.
  - Ticket documents are committed locally; the branch is not pushed.
- **Ticket folder:** `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/`.

## The Original Request

The user (2026-10-23, and 2026-11-06 in his words): "currently the mobile experience is really bad. for example, i can not see the task agent or agent team, many problems, ui experience also not good enough".

The Task's three points:
1. Delegated task agents and teams are invisible on the phone.
2. Navigation and layout are hard on a small screen.
3. Use remote collaboration from the phone.

Constraints:
- Android first; the web shell stays iOS-safe.
- The Android shell changes only if needed; no new permissions.
- Tailscale assumptions unchanged.
- No secrets in evidence.
- Verify on an Android device and an emulator; the user checks on his phone.
- Finalize on `personal`; no release unless he asks.

## Approval Basis

- **Requirements:** `Approved` at SR-003.
  - The user approved the Product UI/UX design on 2026-11-06: "okayyy. everything is good now. i approve".
  - After the approval he removed the optional "needs you" marker: "I suggest that don't like hallucinate and invent things up, remove those … Those are not possible in the application, I think."
  - DEC-004 and DEC-007 are in his words. DEC-003 = option A, as built and approved; option B is Task autobyteus-391.
- **Normative UI supplement (Product-owned):**
  - Spec: `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md`, with `visual-references/VIS-001…029`.
  - Branch `design/mobile-experience-redesign` @ `976457a418d6355296c8a366bf403c865ee0646c`.
  - Integration into the design repository's `personal` is pending, by the user's rule, until implementation is confirmed.
- **Design approval by the user:** not required. He approved the UI; the technical design is reviewed by architecture review.

## What The Design Does (Summary)

The phone shell is rebuilt to the approved design and reads the desktop's owners instead of its own parallel model:

| What the phone needs | Owner it reads |
| --- | --- |
| Run list and fold | `runListStore` |
| Delegated rows | collaboration, team and Org row sources, with one `useRunListDisclosure` instance |
| Opening a row | the shared open actions with a new `shell: 'mobile'` option |
| What is open, and the composer | `activeWorkspaceTarget` |

Screen state lives in `/mobile`'s route query, so the system Back key walks the screens.

Narrow shared changes:
- extract `useRunHistorySectionLoad` and `useTargetConversation`;
- move two task-row rules into `agentRunCollaborationStore`;
- make the local-run branch of `selectTreeRunFromHistory` honor `selectionMode`;
- add the disclosure Org default option;
- rebind the phone branch of `useEventMonitorFilePreview`.

The phone's model is removed: `mobileWorkStore`, `MobileWorkContext`, the catalog, Home, tabs, the Switch sheet, the member focus bar, Troubleshoot, combined Activity and team launch. No server, Android or iOS change.

## Evidence Highlights

- **Cause of the invisible delegated runs:** the phone's own flat list (E-01) and its own target selection (E-03, E-20). Established by reading the code; it matches the user's report.
- **Remote runs:** they reach the phone through the paired node (278, E-05). No new connection is needed.
- **R-001, measured read-only on the user's node:**
  - his complete history is 36,463 bytes (7 agent runs, 6 team runs);
  - the window makes no difference at his size.
  - The phone uses the complete window and polls only while the list is shown and the page is visible (E-25).
- **One phone pairs with several nodes today** (E-09). An in-page switch is autobyteus-391.

## Open Risks

- **R-001:** cellular data as the history grows.
- **R-002:** streams after the phone sleeps.
- **The unified read-only rule** in `useTargetConversation`: verify it per kind.
- **Desktop regressions** from the shared extractions.

## Documents (attached)

- this file;
- `requirements-doc.md`;
- `investigation-notes.md`;
- `solution-revision-record.md`;
- `design-spec.md`;
- `follow-ups.md`.

The Product spec is at the path above; the reviewer reads it in place.

## Round 2 (SR-004)

`design-spec.md` now opens with "Revision For ARCH-REV-001", which maps AR-001…AR-008 and the residual to the changed sections. The new evidence is E-28…E-32 in `investigation-notes.md`. Your report and revision record (`design-review-report.md`, `architecture-review-revision-record.md`) are committed unchanged with this package.

## Next Expected Action

Scoped re-review: DS-003, DS-004, the run-screen and pending-open spines, and AR-001…AR-008.

## Round 3 (SR-005)

- **Trigger:** API/E2E round 1 failed (API-REV-001). The code reviewer's failure-origin review CRR-003 classified the findings: Design Impact F-01, F-06, F-08; Requirement Gap F-07, F-09; Local Fix F-02…F-05.
- **The user's answers** (2026-11-06): questions 1 and 2, "I think it should follow how it is from the desktop"; question 3, "I trust you". DEC-009, DEC-010 and DEC-011 are all (a).
- **Requirements:** `Approved` at SR-005. New: REQ-002a, REQ-003a, REQ-011; AC-002a, AC-003a, AC-011.
- **Design:** `design-spec.md`, section "Revision For CRR-003 (SR-005)". Evidence: E-33…E-37. Follow-up: FU-007.
- **Next:**
  - a scoped architecture review of that section;
  - then implementation: the SR-005 design, plus CRR-003's local fixes F-03…F-05;
  - then source review, and API/E2E again, with the `TESTING.md` phone rule owned by API/E2E.
- **Note:** the CRR-003 report and record are still uncommitted from the code reviewer; this package commits them unchanged.
