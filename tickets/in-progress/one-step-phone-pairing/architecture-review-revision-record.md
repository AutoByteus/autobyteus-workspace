# Architecture Review Revision Record — one-step-phone-pairing (autobyteus-395)

The latest [design-review-report.md](design-review-report.md) remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large / High), 2026-11-07 | SR-011, SR-012, SR-012a | N/A | Fail | AR-001…AR-009 |
| ARCH-REV-002 | Round 2 / revised package SR-013 (head 101608a9de), 2026-11-07 | SR-013 | Fail | Fail | AR-001…AR-009 resolved; AR-010 new |

## Revision Entries

### ARCH-REV-001 — Initial review: sound structure; bridge exposure, untraced paths and two classifier rules to fix

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing/tickets/in-progress/one-step-phone-pairing/design-review-report.md`
- Review round and trigger: round 1; Architecture Design Complete from the Solution Designer (run `solution_designer_03f4f2aaf88941a0a3030151229dc1fa`), `task_size = Large`, `architectural_risk = High`
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md`; N/A
- Relevant solution revision IDs: `SR-011`, `SR-012`, `SR-012a`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`)
- Baseline established: the behavior basis is confirmed against code. These parts are sound: the spine and ownership (facts owner, pure way policy, single code owner), persisted data (`Directly Usable` / `Not Affected`), the removals, and the classification. To fix: the shell bridge can be reached from sandboxed previews (AR-001); remote-node and company-address ways are not traced (AR-002); the Tailscale signal differs from DEC-003 (AR-003); the local address choice depends on interface order (AR-004); the discard route logs the pairing code (AR-005); the Android entry forms and failed exchange are not traced (AR-006); the Serve port rule (AR-007); rationale and ownership details (AR-008); requirements wording (AR-009, non-blocking).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High), AR-002, AR-003, AR-004, AR-006 (Medium), AR-005, AR-007, AR-008 (Low), AR-009 (Low, non-blocking)
- Material classification changes: none; Large / High confirmed
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: Linux detection read only (U-001/U-004/U-005); U-003 packaged-build confirmation; U-006 Serve port acceptance; one Solution Designer decision on a shared pairing link (AR-006)

### ARCH-REV-002 — Round 2: all round-1 findings resolved; one contract gap for container nodes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing/tickets/in-progress/one-step-phone-pairing/design-review-report.md`
- Review round and trigger: round 2; revised package SR-013 from the Solution Designer, head `101608a9de`
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` ("Round 2"); AR-001…AR-009
- Relevant solution revision IDs: `SR-013`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail` (`Design Impact`, AR-010 only)
- What changed: behavior basis re-confirmed; every changed spine re-drawn (DS-001 way table, DS-003 discard by `sessionId`, DS-004 entry forms and save on `paired`, DS-006 web-message bridge, DS-008 classifier). New: premise P-004 and finding AR-010; non-blocking notes N-1…N-6.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-013 | design-spec Interface Boundary Mapping, Key Tradeoffs: `addWebMessageListener`, allowed origin = open entry's origin, main frame only; `MainActivity.kt:196-216` creates a WebView per entry, so registration per origin fits |
| AR-002 | Open (Medium) | Resolved (residual contract gap split out as AR-010) | SR-013 | "Way composition per node kind" table; `configuredBaseUrl` keeps container values; typed company address checked, DEC-022 |
| AR-003 | Open (Medium) | Resolved | SR-013 | Classifier rule 2 = `.ts.net` or `tailscale*`; unconfirmed `100.64/10` → local network, asked; DEC-003 note |
| AR-004 | Open (Medium) | Resolved | SR-013 | Rule 4 default-route first via `default-route.ts`; `vnic`, `lxcbr`, `lxdbr`, `incusbr`, `vmenet` excluded |
| AR-005 | Open (Low) | Resolved | SR-013 | `DELETE /pairing-sessions/:sessionId` (`pss_…`), no code in a path |
| AR-006 | Open (Medium) | Resolved | SR-013 | "Android entry forms" table; DEC-023; saved on `paired`; failed-exchange surface and code→reason table; `NodeReachability`. Implementation note N-1 (prune at line 156) |
| AR-007 | Open (Low) | Resolved | SR-013 | 8443…8542 by position, distinct, ≤ 65535; stability recommendation N-5 |
| AR-008 | Open (Low) | Resolved | SR-013 | Store picks QR name (computer name → registry fallback); rejection log honest; `dns.Resolver` timeout 1000, tries 1 |
| AR-009 | Open (Low, non-blocking) | Resolved | SR-013 | requirements-doc REQ-008, AC-001/002/005, DEC-001/003/006, supplements row, E-01…E-27, DEC-024 |

- New or remaining finding IDs: AR-010 (Low, blocking); notes N-1…N-6 (non-blocking)
- Material classification changes: none; Large / High
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: U-001/U-004/U-005 Linux read only; U-003 packaged build; U-006 Serve ports; phones with a WebView lacking `WEB_MESSAGE_LISTENER`
