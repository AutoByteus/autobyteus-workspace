# Solution Revision Record — autobyteus-432

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-432 (user request 2026-11-08, dispatched by him) | N/A | N/A | Requirements Approved (within the direction, user informed); Design Ready | REQ-001…007; AC-001…007; DEC-001…006 | Medium/High → architecture review |
| SR-002 | Design (+ evidence correction) | Architecture review ARCH-REV-001 (Fail, Design Impact) | AR-432-001, AR-432-002 | Design Ready | Design Ready (revised) | REQ-001, REQ-002; AC-002 | Existing ShellBridge carries the request; reset rule; back to review |
| SR-003 | Design | Implementation Design Impact IMP-DI-001 (IR-001) | IMP-DI-001 | Design Ready; review passed | Design Ready (revised) | REQ-002, REQ-005; AC-005 | Control strip in full screen; off = phone's setting; dark cutout padding; back to review |

## Revision Entries

### SR-001 — Baseline

- Trigger: the user's request and screenshots (Task context `28.jpg`, `29.jpg`); dispatch comment
- Key finding: landscape alone still loses height to Android's bars (L-01) → immersive mode in full screen
- Decisions: landscape on full screen only; override the rotation lock in full screen like games; hide Android's bars; Fit/Fill without distortion; browser fallback; exit handle in both modes
- Classification: `task_size = Medium`, `architectural_risk = High` (new page↔app contract)
- Handoff: `Architecture Design Complete` → `/software_engineering_team/architecture_reviewer`

### SR-002 — Use the existing shell bridge; reset rule

- Trigger: ARCH-REV-001 (`design-review-report.md`): AR-432-001 (High) — investigation L-05/L-06 were false: the app already has `window.AutoByteusShell` (ShellBridge, autobyteus-417, main frame + node origin only); a second object would collide and break pairing. AR-432-002 (Low) — the named MainActivity methods did not exist; state the reset rule.
- Evidence corrected: L-05, L-06; added L-11 (bridge), L-12 (every MainActivity screen switch and host destroy).
- Design: message `{type:'desktopFullScreen', on}` on the existing bridge (Android `ShellBridgeMessages.read`, `Actions.onDesktopFullScreen`; web `shellBridge.ts desktopFullScreen`); no `@JavascriptInterface`, no new type file; reset rule D-2 in one MainActivity method (page start, every non-page screen incl. the in-page node list, host destroy); browser `requestFullscreen` rejection caught; bars re-applied on resume only if needed; AC-002 extended.
- Design case: `docs/design-cases.md` Case 18 (absence concluded from a search for one mechanism name; renumbered from 17 per AR-432-003).
- Intended behavior changed: No. Classification unchanged (Medium/High).
- Route: → `/software_engineering_team/architecture_reviewer`

### Review record — ARCH-REV-002 (Pass)

- 2026-11-08: architecture review Pass for SR-002; AR-432-001/002 resolved. Non-blocking AR-432-003 (duplicate "Case 17" heading) fixed by the Solution Designer: the new case is Case 18. The reviewer's pass handoff to `/software_engineering_team/implementation_engineer` stands; not repeated.

### SR-003 — Control full screen strip (IMP-DI-001)

- Trigger: `/software_engineering_team/implementation_engineer`, IR-001, IMP-DI-001 (commits `9372cdb96b`, `9d8552563e`, evidence `09b1246987`): as designed, Control full screen had only the exit handle, so AC-005 (Keyboard and Clipboard in full screen) was unreachable (evidence ac005.txt, IMP-06).
- Decision: option A — the Control full-screen strip carries Keyboard, Clipboard and Show controls (handle style, outside noVNC's canvas). Option B (no typing in full screen) rejected: AC-005 is approved behavior and typing is why Control exists on the phone.
- Accepted from implementation: "off" = `SCREEN_ORIENTATION_UNSPECIFIED` (the phone's own setting) instead of "remember the previous orientation"; "on" read from the window, so a recreated activity is consistent (AC-004 process death). REQ-002 wording aligned.
- Cutout: dark shell-root background while on (in scope, controller-owned); drawing under the cutout → follow-up FU-001 (non-urgent).
- Intended behavior changed: No (the design now meets AC-005; REQ-002/005 wording made exact within the direction). Classification unchanged (Medium/High).
- Route: → `/software_engineering_team/architecture_reviewer` (review before dependent implementation)

### Review record — ARCH-REV-003 (Pass)

- 2026-11-08: architecture review Pass for SR-003. Non-blocking AR-432-004/005 assigned to implementation by the reviewer. Validation Plan line corrected (off = UNSPECIFIED, root background restored). AR-432-003 was already resolved: `docs/design-cases.md` has Case 18 for this ticket, committed in implementation `9372cdb96b`. The reviewer's pass handoff to implementation stands; not repeated.
