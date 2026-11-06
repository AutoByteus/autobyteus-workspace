# Solution Revision Record — S1 (autobyteus-405)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-405 (slice S1 of autobyteus-394) | N/A | N/A | Requirements Approved; Design Ready | REQ-001…008, 010, 011, 017, 020; AC-001…011, 013, 014, 020, 022; DEC-S1-1 | Large/High → architecture review |
| SR-002 | Design | Architecture review ARCH-REV-001 (Fail, Design Impact) | AR-001…AR-005 | Design Ready | Design Ready (revised) | AC-002, AC-003, AC-011, AC-013; REQ-005 | Revised; back to architecture review |
| SR-003 | Design | Architecture review ARCH-REV-002 (Pass) + non-blocking AR-006 | AR-006 | Design Ready (revised) | Design Ready; review passed | AC-011 | D-7 row for 1005 added; implementation informed |

## Revision Entries

### SR-001 — Baseline: node desktop through the node's own server

- Phase and classification: Mixed, `Initial Baseline`
- Trigger: Project Task autobyteus-405; parent autobyteus-394 at SR-004 (approved by the user 2026-11-06); S0 delivered (merge `dc8bee36b6`)
- Evidence: this folder's investigation-notes.md S1-01…S1-04; parent investigation notes AF-01…AF-17 and runtime findings
- Status: requirements `Approved` (user, parent SR-004; DEC-S1-1 within the direction); design `Ready`
- Intended behavior changed: N/A (baseline; parent IDs kept)
- Classification: `task_size = Large`, `architectural_risk = High`
- Handoff: `Architecture Design Complete` → `/software_engineering_team/architecture_reviewer`
- Overlaps: autobyteus-403 (Origin) and autobyteus-404 (phone deny) act on the shared WebSocket policy the new route uses (DEC-S1-1)
- Design case: `docs/design-cases.md` Case 16 added (filter table first framed only one form of PointerEvent; fixed by removing −316 from SetEncodings; S1-05). Parent design table corrected the same way.
- Next action: architecture review

### SR-002 — Design revision for ARCH-REV-001

- Phase and classification: Design, `Design Impact`
- Trigger: `/software_engineering_team/architecture_reviewer`, design-review-report.md / architecture-review-revision-record.md (ARCH-REV-001), findings AR-001…AR-005; classification Large/High confirmed; no Requirement Gap
- Changes in design-spec.md:
  - AR-001: `useVncSession` creates the WebSocket, registers its own `close` listener before handing the socket to noVNC as its channel, and maps code + reason with `nodeDesktopClient.viewerStateForClose` (D-7 table; unit test per row); DS-001 and the DS-004 return path to the UI; `types/novnc.d.ts` in the mapping. Evidence S1-06.
  - AR-002: the WS route accepts exactly one `mode` and at most one `access_token`; any other, missing or repeated parameter → 4400 `NODE_DESKTOP_INVALID_REQUEST` before any upstream connection; order authorize → validate → resolve → stream; E2E cases listed.
  - AR-003: removals added — `hostPort` format code, novnc credentials typings, font-size audit path, generated `VncHostTile.*` keys.
  - AR-004: pause at `bufferedAmount ≥ 8 MiB − 64 KiB` (Node TCP chunks ≤ 64 KiB), bound ≤ 8 MiB holds.
  - AR-005: D-10 — every reconnect (visibility or Reconnect) opens in View only.
  - Citation drifts fixed (`useVncSession.ts:228-237`; S1-01…S1-06).
- Intended behavior changed: No (D-10 is the reading of approved REQ-005; requirements unchanged)
- Classification: unchanged (Large/High)
- Handoff: revised package → `/software_engineering_team/architecture_reviewer` for the AR-001…AR-005 recheck

### SR-003 — Review passed; AR-006 settled

- Trigger: ARCH-REV-002 (Pass; AR-001…AR-005 resolved), report `design-review-report.md`; non-blocking AR-006 (no D-7 row for 1005, sent by a server restart through preClose `client.close()`)
- Change: D-7 row `1005 → disconnected + Reconnect` (server restart, AC-011)
- Intended behavior changed: No. Classification unchanged (Large/High)
- Route: the reviewer's pass handoff to `/software_engineering_team/implementation_engineer` stands (not repeated); implementation told of the AR-006 row
