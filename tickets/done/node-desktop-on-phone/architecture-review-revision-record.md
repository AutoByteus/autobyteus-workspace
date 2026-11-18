# Architecture Review Revision Record — S3 (autobyteus-407)

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large/High) | SR-001 | N/A | Fail (Design Impact) | AR-S3-001 … AR-S3-008 |
| ARCH-REV-002 | Round 2 / SR-002 revision | SR-001, SR-002 | Fail | Pass | AR-S3-001…008 resolved; AR-S3-009, 010 new (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Baseline review of the S3 phone node-desktop design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/design-review-report.md`
- Review round and trigger: round 1; `Architecture Design Complete` from the Solution Designer (run `solution_designer_0a361701edf54cf7b4786456373995dd`)
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-design-complete.md`; N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` — `Design Impact`
- What changed in the review result or what baseline was established:
  - Basis confirmed. Phone credentials are long-lived device credentials, so the re-check closes only revoked or disabled streams.
  - The registry as the owner of admission and re-check, the extracted connection policy, zoom only in View only and MP-001 first all pass.
  - Blocking:
    - AR-S3-001: the deep import of `keysymdef` is blocked by noVNC's `exports` and by the project's contract test.
    - AR-S3-002: the keyboard bridge's handling of Android soft-keyboard input is unspecified.
    - AR-S3-003: Control + full screen has no way back to the controls.
    - AR-S3-004: the registry's interface cannot close the stream, and the admission order is unstated.
  - Low:
    - AR-S3-005: a 30 s interval vs the ≤ 30 s bound.
    - AR-S3-006: the registry would import the `api/` layer.
    - AR-S3-007: the availability owner is undecided.
    - AR-S3-008: the mobile `'vnc'` gate, doc line citations and stale test rows.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-S3-001 … AR-S3-008
- Material classification changes: none (`Large` / `High` confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: MP-001 (declared); a transient 4429 on a mode switch at the limit; `lastSeenAt` writes per tick; iOS not verified

### ARCH-REV-002 — Recheck of SR-002, Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer sent the SR-002 revision
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` and `requirements-doc.md` at SR-002; AR-S3-001 … 008
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: all eight findings are verified in the current spec. The REQ-S3-2/3 refinements stay within the direction and follow the baseline approval mode. New non-blocking findings:
  - AR-S3-009: Backspace is lost once the textarea has been reset to empty. Implementation resets to a sentinel instead.
  - AR-S3-010: three stale summary lines in the spec.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-S3-001 | Open (Medium) | Resolved | SR-002; Ownership Map `useVncSession`; file mapping `types/novnc.d.ts` | Mapping owned by `useVncSession`; public `sendKey`; no deep import |
| AR-S3-002 | Open (Medium) | Resolved (AR-S3-009 note) | SR-002; Keyboard bridge row; REQ-S3-2, DEC-S3-4 | Value diff on `input`, not `keydown`; attributes off; focus in the tap handler; composition growth handled |
| AR-S3-003 | Open (Medium) | Resolved | SR-002; DS-S3-4; REQ-S3-3, DEC-S3-5; `useMobileNavigation` `full=1` | Control handle outside the canvas; Back leaves full screen first |
| AR-S3-004 | Open (Medium) | Resolved | SR-002; DS-S3-2; Interface `admit(viewer, stream)` | The constructor opens no TCP (`node-desktop-stream.ts:55-57`); a refusal never calls `start()`; the end notification releases the entry |
| AR-S3-005 | Open (Low) | Resolved | SR-002; DS-S3-3 | 20 s non-overlapping cycles plus a 5 s timeout give ≤ 25 s (note: run each cycle's checks concurrently) |
| AR-S3-006 | Open (Low) | Resolved | SR-002; `remote-access/domain/remote-access-close-codes.ts` | Mapping moved; both callers import it |
| AR-S3-007 | Open (Low) | Resolved | SR-002; Ownership Map; `VncViewer.vue` row | One owner |
| AR-S3-008 | Open (Low) | Resolved | SR-002; removal plan; file mapping | Gate and spec row removed; doc lines corrected |

- New or remaining finding IDs: AR-S3-009, AR-S3-010 (non-blocking)
- Material classification changes: none (Large/High)
- Recommended recipient: implementation engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: MP-001 (declared); `lastSeenAt` writes; iOS not verified
