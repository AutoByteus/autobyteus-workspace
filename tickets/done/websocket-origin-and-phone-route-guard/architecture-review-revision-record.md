# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-002) | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / revised design SR-003 | SR-001, SR-003 | Fail | Pass | AR-001, AR-002, AR-003 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: core design sound; MCP gateway origin gate, refusal logging, peer refusal code

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard/tickets/in-progress/websocket-origin-and-phone-route-guard/design-review-report.md`
- Review round and trigger: round 1; Solution Designer's Architecture Design Complete, 2026-11-06
- Triggering role, report path, and finding IDs: Solution Designer, `handoff.md`; N/A
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` — `Design Impact`
- What changed or what baseline was established:
  - Baseline established. Behavior basis confirmed; classification Medium/High confirmed.
  - Fastify gate and route-pattern probes rerun, with matching results. `@fastify/cors` delegator `Vary` behavior verified.
  - Three design gaps found.

#### Prior Finding Resolution

None

- New or remaining finding IDs:
  - AR-001 (Medium): the `/mcp/gateway` origin hook and its contract test are missing from the design.
  - AR-002 (Medium): no reason log for refusals replied from `authorizeHttpRequest` (REQ-005/AC-006).
  - AR-003 (Low): the peer WS phone query credential gets `REMOTE_ACCESS_AUTH_INVALID`, not the phone-route reason.
- Material classification changes: None
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: residual risks listed in the report (cors delegator form, refusal log volume); RSK-001…RSK-003 unchanged.

### ARCH-REV-002 — Re-review of SR-003: all findings resolved, Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard/tickets/in-progress/websocket-origin-and-phone-route-guard/design-review-report.md`
- Review round and trigger: round 2; Solution Designer's revised design SR-003 answering ARCH-REV-001, 2026-11-06
- Triggering role, report path, and finding IDs: Solution Designer, `handoff.md` / `solution-revision-record.md` (SR-003); AR-001, AR-002, AR-003
- Relevant solution revision IDs: SR-001 (requirements, unchanged), SR-003
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Behavior basis reconfirmed; BEH-002 and BEH-003 rows now `Confirmed`.
  - DS-001 and DS-002 redrawn in call order:
    - DS-001: gateway hook (`/mcp/gateway` only) → CORS → origin gate → `authorizeHttpRequest` or `/ws/*` deferral.
    - DS-002: handler → adapter → `authorizeWebSocket` → phone route check → credential validation. `/graphql` and the peer WS refusals are logged by the gate.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | SR-003 | The design spec now covers the gateway hook at the cited lines, which match the code: Current-State Read (line 24), DS-001 hook and registration order (line 151), Ownership Boundaries (line 202), Boundary map (line 209), reuse row (line 254), plugin mapping "registered after `registerMcpGatewayRoutes`" (line 286), contract test must stay green (line 306), sequence step 4 (line 338), guidance (line 358). |
| AR-002 | Open (Medium) | Resolved | SR-003 | One local `refuse(...)` in the plugin logs code and redacted URL for every refusal reply (lines 158, 172, 197, 286). DS-002 assigns the HTTP-reply refusals to the gate and the `/ws/*` closes to the adapter, so each refusal is logged once (line 159). The e2e test asserts lines for origin, `/ws/terminal`, `/graphql` and peer WS refusals, with no `mra_` or `access_token` value (line 307). |
| AR-003 | Open (Low) | Resolved | SR-003 | The `REMOTE_PEER` branch refuses a mobile query credential with 403 `PHONE_ACCESS_ROUTE_REFUSED`. The peer HTTP bearer keeps `REMOTE_ACCESS_AUTH_INVALID` as a preserved contract (line 287). A test case is added to `route-policy.test.ts` (line 305) and the e2e test (line 307). |

- New or remaining finding IDs: None
- Material classification changes: None (Medium / High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: RSK-001…RSK-003 unchanged; refusal log volume (low); executable validation for ASM-001/ASM-002.
