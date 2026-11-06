# Architecture Review Revision Record — S1 (autobyteus-405)

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large/High) | SR-001 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004, AR-005 |
| ARCH-REV-002 | Round 2 / SR-002 design revision | SR-001, SR-002 | Fail | Pass | AR-001…AR-005 resolved; AR-006 new (non-blocking) |
| ARCH-REV-003 | Round 3 / SR-004 D-5 row 6 revision (IMP-DI-001) | SR-003, SR-004 | Pass | Pass | AR-006 resolved; AR-007 new (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Baseline review of the S1 node-desktop design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/design-review-report.md`
- Review round and trigger: round 1; `Architecture Design Complete` from the Solution Designer (run `solution_designer_0a361701edf54cf7b4786456373995dd`)
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design-complete.md`; N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` — `Design Impact`
- What changed in the review result or what baseline was established: the behavior basis is confirmed. The routes, shared policy reuse (DEC-S1-1), Docker-node availability rule (D-3), the filter table checked against noVNC 1.7.0's encoders, the −316 removal (D-5), per-stream mode (D-4), launcher `v9` and the no-migration decision all pass. Two blocking design gaps: AR-001 (noVNC does not expose close codes, so the viewer states cannot be built as written) and AR-002 (extra target parameters are ignored instead of refused, against AC-003). Two small corrections: AR-003 (removal completeness) and AR-004 (the 8 MiB bound overshoots by one chunk). One non-blocking clarification: AR-005 (mode after reconnect).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002, AR-003, AR-004, AR-005 (AR-005 non-blocking)
- Material classification changes: none (`Large` / `High` confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: phone control streams before S3 (approved); in-node listeners until S2; a Control paste over 1 MiB closes the stream

### ARCH-REV-002 — Recheck of SR-002: AR-001 … AR-005 resolved, Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer sent the SR-002 design revision
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` at SR-002, `solution-revision-record.md` SR-002; AR-001 … AR-005
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Fail` (ARCH-REV-001, Design Impact)
- Current authoritative decision: `Pass`
- What changed in the review result: all five round 1 findings are verified as resolved in the current design spec. One new non-blocking detail, AR-006: the D-7 table has no row for close code 1005, which a server restart sends through `@fastify/websocket`'s default preClose `client.close()`. The unaffected round 1 verdicts stand.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-002; design-spec Ownership Map `useVncSession`, DS-001, DS-004 return path, D-7 table, file mapping `types/novnc.d.ts`; S1-06 | The composable creates the socket and registers its listener with `addEventListener` before `new RFB(container, socket, …)`. noVNC accepts a channel (`rfb.js:92-115,560-575`) and assigns `onclose` as a property later (`websock.js:284`), so the composable's listener runs first. There is one unit test per D-7 row. |
| AR-002 | Open (Medium) | Resolved | SR-002; Ownership Map WS route, Interface Boundary Mapping, Validation Plan Server E2E | The route accepts exactly one `mode` and at most one `access_token`. Anything else closes with 4400 `NODE_DESKTOP_INVALID_REQUEST`, in the order authorize → validate → resolve → stream. AC-003 cases are listed with no upstream connection. |
| AR-003 | Open (Low) | Resolved | SR-002; Removal Plan rows (a)–(d), file mapping | Lines verified (`ServerSettingsEndpointCards.vue:151,196,236,252`; `types/novnc.d.ts`; audit test `:43`; generated keys). Note: the always-true `field.format === 'url'` checks are simplified under the same row. |
| AR-004 | Open (Low) | Resolved | SR-002; D-6 | Pause at ≥ 8 MiB − 64 KiB; one Node TCP read is ≤ 64 KiB (`readableHighWaterMark` 65536). Frame-header bytes are a residual note. |
| AR-005 | Open (Low, non-blocking) | Resolved | SR-002; D-10, `NodeDesktopTile` row, Validation Plan web unit | Every reconnect opens in View only, consistent with REQ-005 |

- New or remaining finding IDs: AR-006 (non-blocking, for implementation)
- Material classification changes: none (Large/High)
- Recommended recipient: implementation engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: phone control streams before S3 (approved); in-node listeners until S2; a Control paste over 1 MiB closes the stream; frame-header bytes at the 8 MiB edge

### ARCH-REV-003 — Recheck of SR-004: View only ClientCutText forwards only a well-formed Caps message, Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/design-review-report.md`
- Review round and trigger: round 3. The Solution Designer sent SR-004, prompted by implementation Design Impact IMP-DI-001 (IR-001; evidence IMP-13, IMP-14).
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` D-5 row 6, `solution-revision-record.md` SR-004, `investigation-notes.md` S1-07; implementation `implementation-handoff.md` IMP-DI-001
- Relevant solution revision IDs: `SR-003`, `SR-004`
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - D-5 row 6 was rechecked against noVNC 1.7.0 (`rfb.js:2370-2475`, `:3235-3257`) and the measured evidence.
  - The well-formedness rule matches noVNC's Caps message exactly (abs(length) = 8).
  - A Caps message carries no input or clipboard content, so REQ-006 holds. The stream desync and the clipboard on the wire (AC-001, AC-020) are fixed.
  - Rejecting option B is sound.
  - New premise MP-003 is reachable, as measured.
  - New non-blocking AR-007 asks for validation cases naming each row 6 form.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-006 | Open (Low, non-blocking) | Resolved | SR-003; `design-spec.md` D-7 row 1005 | Row maps 1005 (preClose `client.close()`) to `disconnected` + Reconnect, satisfying AC-011 |

- New or remaining finding IDs: AR-007 (non-blocking, for implementation)
- Material classification changes: none (Large/High)
- Recommended recipient: implementation engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: REQ-017 is client-enforced for raw View only clients (as approved, not widened by SR-004); no end log line on server shutdown (accepted); the round 2 risks
