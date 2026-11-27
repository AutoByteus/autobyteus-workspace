# Architecture Review Revision Record: autobyteus-581

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer handoff (Architecture Design Complete), 2026-11-26 | SR-002, SR-003 | N/A | Fail | AR-001 to AR-006 |
| ARCH-REV-002 | Round 2 / re-review handoff (SR-005), 2026-11-26 | SR-004, SR-005 | Fail | Fail | AR-001 to AR-006 resolved; AR-007 new |
| ARCH-REV-003 | Round 3 / handoff (SR-007), 2026-11-26 | SR-006, SR-007 | Fail | Pass | AR-007 obsolete (DEC-111 option B); N-3, N-4 non-blocking |

## Revision Entries

### ARCH-REV-001: initial review of the relay and sandbox design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay/tickets/in-progress/sandbox-provider-relay-581/design-review-report.md`
- Review round and trigger: round 1. The handoff `handoff-architecture-review.md` from `/solution_designer`, task_size Large, architectural_risk High.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-003; no prior findings.
- Relevant solution revision IDs: SR-002 (approved requirements), SR-003 (design).
- Prior authoritative decision: N/A
- Current authoritative decision: **Fail**
- Baseline established:
  - Base `9f803aa84d` matches `origin/personal`; there is no drift.
  - Code citations were checked. One was inaccurate: Codex keeps one app-server per working directory, not one per node.
  - Three material premises were recorded, all reachable:
    - MP-001: a sandbox agent starts host runs over the peer channel;
    - MP-002: native runs while login tokens are on;
    - MP-003: a provider 401 through the relay.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001: Requirement Gap. The sandbox's peer rights on the host; REQ-010 conflicts with UC-004.
  - AR-002: the existing `ProviderRelayAccess` and ACP relay field are missing; DeepSeek fails on a relayed node.
  - AR-003: the credential kind is keyed per relay rather than per runtime.
  - AR-004: the C4 reply does not separate gate refusals from provider statuses.
  - AR-005: the C3 type shape is missing, and the forwarder attaches one header only.
  - AR-006: routing cannot reach the Claude and Codex singletons; the Codex app-server is per working directory.
  - AR-002 to AR-006 are Design Impact.
- Material classification changes: none. Large/High is confirmed.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: R-A to R-F in the report; U-1 and U-2 are proven live per DEC-108.

### ARCH-REV-002: re-review of SR-005 (one relay owner, kind per runtime, sandbox peer rule)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay/tickets/in-progress/sandbox-provider-relay-581/design-review-report.md`
- Review round and trigger: round 2. `handoff-architecture-review-round2.md` from `/solution_designer`, SR-005, Large / High.
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` SR-005 (its response table); AR-001 to AR-006 and R-A to R-F.
- Relevant solution revision IDs: SR-004 (revision after ARCH-REV-001; DEC-110), SR-005 (DEC-111, DEC-112, DEC-113; requirements approved).
- Prior authoritative decision: Fail
- Current authoritative decision: **Fail**
- What changed:
  - Base drift: 20 commits, web-only (autobyteus-652); no source touched by this design changed.
  - Every round-1 finding was verified against the current design and code.
  - New reads: the peer store and directory, the message and member receivers, `storedLinkCheck`, and the request shapes. They found one new gap in the C11 gateway rule (AR-007).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Requirement Gap) | Resolved; the gateway part's detail moves to AR-007 | DEC-111, REQ-017, AC-015; design C11, DS-007 | Gate rule: a sandbox peer is allowed the relay, messages, received-files, peer-run-members and availability; `delegated-runs`, `run-messages` and `available-agents` are refused. Walked in § Data Contract Validation |
| AR-002 | Open | Resolved | design § ProviderRelayAccess Consumers, DS-001 | One owner (`ProviderRelayAccess`, extended); ACP profile `relay: {relayId, use}`; DeepSeek checks the C1 listing when relayed; application, standalone and native kinds traced; citations true (`acp-session-launcher.ts:108-111`, `build-studio-server.ts:249/299/356`) |
| AR-003 | Open | Resolved | C1 (three variables), C4 rule | Kind per runtime; native is always `apiKey`; only `loginToken` with C2 off is refused; mixed example walked |
| AR-004 | Open | Resolved (note N-1) | C4 reply marking, timeouts | `x-autobyteus-relay-reply`; unmarked 401/403/503 mapped; no total timeout. N-1: other unmarked statuses need a row |
| AR-005 | Open | Resolved | C3 type; forwarder `credentialHeaders`/`dropHeaders` | Per-kind route, pass header, source and attached headers; openai drops the caller's `chatgpt-account-id`; observation per relay |
| AR-006 | Open | Resolved | Dependency Rules | Singletons read `isRelayed` as read-only configuration and take passes from the slot, set before listening; they throw when relayed without one. Codex runs one app-server per working directory |
| R-A to R-F | Residual | Addressed (R-C moot under DEC-110) | Response table | Checked in the design text |

- New or remaining finding IDs:
  - AR-007 (Design Impact, Medium, blocking): C11's gateway rule recomputes the link fact that `storedLinkCheck` and `PeerRunMembersReceiver` already own, adds an "open Task" condition that REQ-017 does not have, and cannot apply to received-files, which carry no target (MP-004).
  - Non-blocking notes: N-1, N-2. Residual risks: R-G (the shared-folder credential list), R-H (role written after pairing), R-I (any paired peer may use the relay), R-J.
- Material classification changes: none (Large / High).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: U-1 and U-2 are proven live per DEC-108.

### ARCH-REV-003: round 3 (SR-007): DEC-111 revised to option B, DEC-114

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay/tickets/in-progress/sandbox-provider-relay-581/design-review-report.md`
- Review round and trigger: round 3. `handoff-architecture-review-round3.md` from `/solution_designer`, SR-007, Large / High.
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` SR-007; AR-007; N-1, N-2; R-G, R-H, R-I.
- Relevant solution revision IDs: SR-006 (AR-007 answered with the existing link checks plus a files rule), SR-007 (the user's option B and DEC-114).
- Prior authoritative decision: Fail
- Current authoritative decision: **Pass**
- What changed:
  - The user revised DEC-111 to option B: a sandbox is a normal paired peer. C11 is now a lifecycle mark only, written by the pairing exchange from the invite.
  - DEC-114: any paired peer may use the relay.
  - The base drift is unchanged: web-only.
  - New read: `peer-pairing-service.ts`. The invites live in memory, and the exchange saves the peer, which fits R-H.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-007 | Open (blocking) | Obsolete | DEC-111 revised (option B), REQ-017 rewritten, SR-007 | The C11 route, message and files rules and DS-007 are removed. Answers with files use the existing peer routes and link checks |
| N-1 | Note | Resolved | C4 | The row for other unmarked statuses → `RELAY_PEER_FAILED` |
| N-2 | Note | Resolved | Interface table | `routeForNativeProvider(provider)`; `routeFor` never takes `autobyteus` |
| R-G | Residual | Resolved | C7 | The refusal list now includes `~/.aws`, `~/.gnupg`, `~/.docker`, `~/.kube`, `~/.netrc` and `~/Library` |
| R-H | Residual | Resolved | C11, `peer-pairing-service.ts` | The invite holds the role in memory, and the exchange saves it atomically |
| R-I | Residual | Decided by the user (DEC-114) | REQ-002 unchanged | Any paired peer may use the relay; accepted |

- New or remaining finding IDs: none blocking. Two non-blocking notes go into implementation:
  - N-3: stale option-A text. REQ-018's "the host's other runs" must not reach the skill; there are also design-spec leftovers.
  - N-4: the role must travel through `PeerNode`, the peer list API and the web Nodes page for AC-015's label.
- Material classification changes: none (Large / High).
- Recommended recipient: Implementation Engineer; the Solution Designer is notified.
- Remaining risks or uncertainty:
  - accepted by the user: DEC-110, DEC-111 (B), DEC-114; FU-581-05 and FU-581-06;
  - proven live per DEC-108: U-1 and U-2.
