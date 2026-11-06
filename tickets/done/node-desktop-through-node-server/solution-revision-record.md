# Solution Revision Record — S1 (autobyteus-405)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-405 (slice S1 of autobyteus-394) | N/A | N/A | Requirements Approved; Design Ready | REQ-001…008, 010, 011, 017, 020; AC-001…011, 013, 014, 020, 022; DEC-S1-1 | Large/High → architecture review |
| SR-002 | Design | Architecture review ARCH-REV-001 (Fail, Design Impact) | AR-001…AR-005 | Design Ready | Design Ready (revised) | AC-002, AC-003, AC-011, AC-013; REQ-005 | Revised; back to architecture review |
| SR-003 | Design | Architecture review ARCH-REV-002 (Pass) + non-blocking AR-006 | AR-006 | Design Ready (revised) | Design Ready; review passed | AC-011 | D-7 row for 1005 added; implementation informed |
| SR-004 | Design | Implementation Design Impact IMP-DI-001 (IR-001) | IMP-DI-001 | Design Ready; review passed | Design Ready (revised) | REQ-006, REQ-017; AC-006, AC-020 | D-5 row 6: View only forwards only a well-formed Caps; back to architecture review |

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

### SR-004 — View only clipboard negotiation (IMP-DI-001)

- Trigger: `/software_engineering_team/implementation_engineer`, IR-001, finding IMP-DI-001 (implementation commit `6407bfc15f`, evidence `4b8e3b8900`): dropping noVNC's extended-clipboard Caps reply in View only makes Xvnc push the clipboard as an unsolicited Provide, which noVNC 1.7.0 does not consume in View only → stream desync and the clipboard on the wire
- Decision: option A — in View only, forward only a well-formed extended Caps ClientCutText; drop every other ClientCutText. Option B (strip the ExtendedClipboard pseudo-encoding) rejected: it keeps the stream working but sends the clipboard text in clear to View only viewers (REQ-017)
- Canonical sections: design-spec.md D-5 table row 6 and the explanation under it; investigation-notes.md S1-07; `docs/design-cases.md` Case 16 (second instance of the same shape)
- Intended behavior changed: No (REQ-006/REQ-017 unchanged; the design now meets them)
- Side note accepted: a stream ended by a server shutdown logs no end line (process exits first); its upstream still closes. REQ-011 governs log content, not that a line exists; no change
- Classification: unchanged (Large/High)
- Route: revised package → `/software_engineering_team/architecture_reviewer` (security-relevant filter change, repeat review before dependent implementation)

### Review record — ARCH-REV-003 (informational)

- 2026-11-06: architecture review Pass for SR-003 and SR-004 (`design-review-report.md`, `architecture-review-revision-record.md`); D-5 row 6 sound, option B rejection confirmed; AR-006 resolved; AR-007 (non-blocking: a test per row 6 form) assigned by the reviewer to implementation. The reviewer's pass handoff to `/software_engineering_team/implementation_engineer` stands; not repeated.
