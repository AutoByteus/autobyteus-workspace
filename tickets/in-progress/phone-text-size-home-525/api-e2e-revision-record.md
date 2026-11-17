# API/E2E Revision Record — phone-text-size-home-525 (autobyteus-525)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Fail / 82% |
| API-REV-002 | implementation engineer, `implementation-handoff.md` (IR-002), round 2 | SR-002 (DEC-008), CRR-001 (CR-001), IR-002 | Fail / 82% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: phone-wide Text size validated on the phone bundle, the Android app and against the base; VNC Viewer bar fails at Large/Largest

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001, code `7c7f3d2e79`), round 1
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: none; all implementation specs and MSP-60/66/67 kept as `Still Valid`; the scaling sweep (API-07) stays a ticket-owned probe
- Cases added, changed, removed, or rechecked: API-01…10 (API-01, API-04 reused IMP-01/03/04 and IMP-02; API-10 added during execution)
- Commands, environment, fixture, or broader-validation delta: held probe stack (`--hold`) with base/head bundle switching; own AVD `apie2e525_api35` with the branch APK; host Chrome phone through a proxy; `pnpm dev` desktop page; production CSS bar measurement

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution report (all), `follow-ups.md` (FU-002)
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 82%
- New or remaining failure IDs: API-10 (AC-005, REQ-005/007: VNC Viewer Control-mode bar overflows at Large on 360 px and at Largest on 360 and 412 px)
- Recommended owner: implementation engineer (`Local Fix`), after failure-origin review by the code reviewer; `Design Impact` if the bar needs a redesign
- Remaining risks, blocked evidence, or untested scope: VNC Viewer not seen on a live node desktop (no desktop in the probe stacks); the founder's own review before release

### API-REV-002 — Round 2: the VNC Viewer's Control-mode bar fits at every step, live and on the device

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-002, code `12ecf1bf29`), round 2
- Triggering finding or case IDs: API-10 (round 1 Fail); CRR-001 CR-001 (Design Impact) → SR-002 DEC-008
- Related revision IDs: SR-002, CRR-001, IR-002
- Why recorded: rerun after the fix
- Coverage decisions or durable test paths changed: none by API/E2E; the implementation added a `MobileNodeDesktop.spec.ts` case (row order), kept `Still Valid`
- Cases added, changed, removed, or rechecked: API-10 rechecked (Reused IMP-05 on the new markup); API-11 (new: the real VNC Viewer on a live node desktop, 16 layouts, Keyboard, Clipboard, zh-CN); API-12 (new: the Android app at Largest, 412 and 360 CSS px). API-01…09 still valid: `git diff --name-only 7c7f3d2e79 12ecf1bf29` changes only `MobileNodeDesktop.vue` and its spec, which none of them reaches; unit/typecheck for them rerun by IMP-06/IMP-07
- Commands, environment, fixture, or broader-validation delta: phone bundle rebuilt at `12ecf1bf29`; `node-525.mjs` (this worktree's server with `AUTOBYTEUS_STARTER_SOCKET`, viewers to 127.0.0.1:5900) + test-owned container `abtest525-desktop` (beta image's Xvnc, loopback only); `vnc-live.mjs`; AVD re-created; `android-vnc.mjs`

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-10 (round 1): Control-mode bar past the screen at Large (360) and Largest (360, 412) | Local Fix (preliminary) → CRR-001 Design Impact | DEC-008: Keyboard and Clipboard in the status row; full-screen right edge 355.1 at 360 Largest (browser and device), 407.1/407.3 at 412 Largest | API-10 (IMP-05), API-11, API-12 |
| FU-002: the same bar 4 px over at Standard on 360 px | Follow-up | folded into DEC-008 by the Solution Designer; API-11 `360 standard` control `fullRight 356` | API-11 |

- Canonical artifacts and sections updated: investigation (Meta, Round 2 Plan), report (Round, Routing, Environments ENV-7…9, Cases API-10…12, AC proof, scorecard, cleanup, result), progress log
- Prior result and confidence: Fail, 82%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: None
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: the founder's own view before release; no durable rendered VNC Viewer check (the package probe has no node desktop)
