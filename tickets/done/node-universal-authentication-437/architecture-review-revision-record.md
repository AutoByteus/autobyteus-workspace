# Architecture Review Revision Record — node-universal-authentication-437 (autobyteus-437)

The latest `design-review-report.md` is authoritative. This record keeps the baseline and, later, one entry per review round.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-004) | SR-001…SR-004 | N/A | Fail (Design Impact) | AR-001…AR-010 |
| ARCH-REV-002 | Round 2 / SR-005 answers ARCH-REV-001 | SR-005 | Fail | Fail (Design Impact) | AR-003 (residual), AR-004 (residual), AR-011 (new); AR-001, 002, 005–010 resolved |
| ARCH-REV-003 | Round 3 / SR-006 answers ARCH-REV-002 | SR-006 | Fail | Pass | AR-003, AR-004, AR-011 resolved |

## Revision Entries

### ARCH-REV-001 — Slice 1 "no key, no access": baseline review

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-universal-authentication-437/design-review-report.md`
- Review round and trigger: round 1. Solution Designer handoff `handoff-architecture-review.md` (task_size Large, architectural_risk High)
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` SR-004; no prior findings
- Relevant solution revision IDs: SR-001, SR-002, SR-003, SR-004
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (Design Impact)
- What was established:
  - The behavior basis is confirmed: requirements approved (SR-002); the design and contract approved by the user (SR-004).
  - The structure passes: one gate owner, the `node-access` area, the `ClientIdentity` union, a clean-cut removal plan, and persisted data directly usable.
  - Ten findings on target paths and client kinds the design does not trace.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (High): the launch credential's environment variable is inherited by agents.
  - AR-002 (High): no setup code once a node has an owner.
  - AR-003 (Medium-High): `/ws/*` is opt-in.
  - AR-004 (Medium): open WebSockets on revocation; contract §5 overstates it.
  - AR-005 (Medium): the MCP gateway token's creation, storage and display.
  - AR-006 (Medium): which address admission compares.
  - AR-007 (Medium): peer signature binding and body check owner.
  - AR-008 (Medium): existing Docker containers; non-container nodes reached over a LAN.
  - AR-009 (Medium): pairing address inputs.
  - AR-010 (Low): package corrections.
- Material classification changes: none. Large/High confirmed.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: P-002 is unmeasured (macOS weak-host behavior); AR-008(b) may become a Requirement Gap; nonce cache lost on restart; RSK-002/003; Electron version gap in PROBE-03.

### ARCH-REV-002 — Round 2: eight findings resolved, two narrowed, one consistency finding

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-universal-authentication-437/design-review-report.md`
- Review round and trigger: round 2. Solution Designer `handoff-architecture-review-round2.md` (SR-005, M-1…M-10; contract NA-15, NAS-31…38)
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` "Round 2 Mechanisms"; AR-001…AR-010
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: Fail (Design Impact)
- What changed: each mechanism was verified against the code (platform spawn stdio, ESM entry, `cidr`, launcher config hash, address resolver). Two residual gaps and one consistency finding remain.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | M-1, NA-15, NAS-31 | `windowsServerManager.ts:38` has IPC; macOS/Linux `['ignore','pipe','pipe']`; `package.json` `"type": "module"`; the intake is the first import of the `dist/app.js` entry |
| AR-002 | Open (High) | Resolved | M-2, DEC-015, NA-5/10, NAS-32/33 | Local control socket on demand, whatever the owner state; the launcher and CLI are its clients |
| AR-003 | Open | Partly resolved; residual open | M-3 | The hook decides `/ws/*`, but a route outside the wrapper still fails open (P-003) |
| AR-004 | Open | Partly resolved; residual open | M-4, NAS-37 | The registry covers wrapper sockets only. `/graphql` (`api/graphql/index.ts:12`) and run-observation (`remote.ts:43`) are not registered |
| AR-005 | Open | Resolved | M-5, NA-12 | Token service, owner routes, panel |
| AR-006 | Open | Resolved | M-6, NA-3 | Client address; subnets from `cidr`; Tailscale local-address condition; examples per rule |
| AR-007 | Open | Resolved | M-7, NA-9, NAS-36/38 | From/To signed; not before process start; body integrity in the gate's `preParsing`/`preValidation` |
| AR-008 | Open | Resolved | M-8, NAS-34/35 | `docker-runtime.sh:290-310` recreate; network-refused guidance within DEC-011/012 |
| AR-009 | Open | Resolved | M-9, NAS-19 | Invite carries candidates; resolver on both sides; `abpi_` between desktops; re-pairing updates the row |
| AR-010 | Open (Low) | Resolved | M-10 | 403 Host rule; `nodeUpdateClient` Modify; `LOCAL_DEV_ONLY` removed; `node-access/domain` is a leaf |

- New or remaining finding IDs:
  - AR-003 (residual, Medium): make the hook's default for unwrapped upgrades an HTTP refusal, or test that every WebSocket route is wrapped.
  - AR-004 (residual, Medium): register `/graphql` subscription and run-observation sockets.
  - AR-011 (new, Low): remove superseded text from the ownership map, the DS-004/005/007 narratives, the example, the interface row, the encapsulation map and contract NA-10.
- Material classification changes: none (Large/High).
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-002/003/005/006; Unix socket path length; same-user initial environment block (outside the model).

### ARCH-REV-003 — Round 3: residuals resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-universal-authentication-437/design-review-report.md`
- Review round and trigger: round 3. Solution Designer `handoff-architecture-review-round3.md` (SR-006)
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` M-3, M-4 and the edited sections; AR-003, AR-004, AR-011
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: Fail (ARCH-REV-002)
- Current authoritative decision: Pass
- What changed: focused re-check of the three open findings and the contract sections they touch. All other verdicts carry over from rounds 1–2.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-003 | Residual open | Resolved | M-3 (fail-closed bullet), contract §2 | Default HTTP refusal with no upgrade; close code only on `routeOptions.config.gatedWebSocket` routes; architecture test: every WebSocket route is wrapped or is `/graphql` or `/rest/remote/run-observations` |
| AR-004 | Residual open | Resolved | M-4, NA-11, NAS-37 | GraphQL sockets register in Mercurius `subscription.context(socket, request)` and leave in `onDisconnect` (`api/graphql/index.ts`); the run-observation route registers on open and removes on close (`api/rest/remote.ts:43`) |
| AR-011 | Open (Low) | Resolved | DS-004/005/007, ownership map, boundary map, interface table, example; contract NA-10, §2 | Each passage re-read; no superseded statement left except the one M-3 sentence (Residual Risks; the fail-closed bullet governs) |

- New or remaining finding IDs: none
- Material classification changes: none (Large/High)
- Recommended recipient: implementation engineer, then an informational notice to the Solution Designer
- Remaining risks or uncertainty: see the report's Residual Risks (RSK-001…006, socket path length, M-3 wording leftover)
