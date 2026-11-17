# API/E2E Revision Record — phone-text-size-home-525 (autobyteus-525)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Fail / 82% |

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
