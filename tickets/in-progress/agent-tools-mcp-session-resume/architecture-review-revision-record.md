# Architecture Review Revision Record

The latest `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/design-review-report.md` is authoritative. This file records the concise architecture-review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| `ARCH-REV-001` | Round 1 / initial approved solution package | `SR-001` | `N/A` | `Pass` | None |
| `ARCH-REV-002` | Round 2 / user-approved unified stable run-scoped endpoint | `SR-001` pending revision | `Pass` | `Fail` | `ARCH-F-001` |
| `ARCH-REV-003` | Round 3 / full re-review of corrected package | `SR-002` | `Fail` | `Fail` | `ARCH-F-001` resolved; `ARCH-F-002` new |
| `ARCH-REV-004` | Round 4 / dedicated-listener resolution re-review | `SR-003` | `Fail` | `Pass` | `ARCH-F-002` resolved; no new findings |
| `ARCH-REV-005` | Round 5 / `CRR-001` Team-stop ownership correction re-review | `SR-004` | `Pass` | `Pass` | `CR-F-001` design response verified; `CR-F-002` removal specified; no new architecture findings |

## Revision Entries

### ARCH-REV-001 — Stable binding architecture baseline passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/design-review-report.md`
- Review round and trigger: round 1; initial package ready for architecture review after user approval.
- Triggering role, report path, and finding IDs: `/solution_designer`; initial package with no prior design-review report; finding IDs `N/A`.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: established the initial architecture-review baseline. The approved behavior/current-state basis and all supplements were confirmed; the stable encrypted Codex binding versus active live-session split, scoped authority, prepare/confirm/abort transaction, purpose-bound vault reuse, active-only registry, protected sidecar, no-migration decision, process-pool preservation, and Claude separation pass structural review.

#### Prior Finding Resolution

`None`.

- New or remaining finding IDs: `None`
- Material classification changes: `None`. Material premise records `ARCH-MP-001` and `ARCH-MP-002` are reachable and proportionately handled; `ARCH-MP-003` is not reachable and drives no machinery; `ARCH-MP-004` is unclear/out of scope and drives no current decision.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: approved longer-lived encrypted bearer; best-effort deletion may leave a turnless provider thread; immutable JS secret strings; out-of-scope same-process tool-topology refresh; unsupported interruption/tampering residue.

### ARCH-REV-002 — User-approved simplification supersedes persistent binding design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/design-review-report.md`
- Review round and trigger: round 2; after the pass, the user approved one stable run-scoped local Agent Tools endpoint for Codex and Claude and asked whether the independent external MCP Gateway remains functional.
- Triggering role, report path, and finding IDs: user conversation; canonical design review report above; `ARCH-F-001`.
- Relevant solution revision IDs: `SR-001` pending a new `SR-*` revision.
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: the approved trust/lifecycle contract changed. The per-run bearer, encrypted sidecar, vault/store/sync/deletion machinery, and Codex-persistent/Claude-ephemeral split are no longer desired. Source review confirms `/mcp/gateway` is independent and can remain unchanged, while tokenless Agent Tools requires explicit loopback-only request admission.

#### Prior Finding Resolution

`None` — round 1 had no findings.

- New or remaining finding IDs: `ARCH-F-001`
- Material classification changes: round-1 machinery is superseded; `ARCH-MP-005` rejects gateway breakage as not reachable when route boundaries remain separate, and `ARCH-MP-006` confirms non-loopback reachability must be controlled.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: stable same-run client reactivation is intentional; deterministic key is not authentication; Agent Tools must enforce loopback-only requests; external gateway access policy stays separate.

### ARCH-REV-003 — Simplified design exposes an unresolved non-loopback-bind contract

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/design-review-report.md`
- Review round and trigger: round 3; `/solution_designer` submitted `SR-002` as the resolution of `ARCH-F-001` for full re-review.
- Triggering role, report path, and finding IDs: `/solution_designer`; canonical design review report above; prior `ARCH-F-001`, new `ARCH-F-002`.
- Relevant solution revision IDs: `SR-002` superseding `SR-001`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: `SR-002` correctly replaces the persistent Codex binding with a deterministic non-secret run identity, a universal active-only lifecycle, headerless provider descriptors, loopback-only request admission, no persisted Agent Tools state, and an unchanged external gateway. Full current-source review then found a distinct operational gap: a supported specific non-loopback `--host` value is preserved in the internal runtime URL, so colocated provider requests do not satisfy the proposed loopback peer/Host gate.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-F-001` | Blocking / Requirement Gap | Resolved | `ARCH-REV-002`, `SR-002` | Requirements now contain approved `BEH-007`/`BEH-008`; design uses one full-digest run key, one provider-independent activation boundary, no bearer/persistence, an explicit local gate, prohibited SR-001 inventory, and preserved gateway behavior. Clean source baseline is verified. |

- New or remaining finding IDs: `ARCH-F-002`
- Material classification changes: `ARCH-MP-005` remains not reachable when gateway boundaries stay separate; `ARCH-MP-006` remains reachable and justifies the local gate; new `ARCH-MP-007` is reachable from the supported operator `--host <specific-non-loopback-address>` path and exposes an unapproved behavior choice.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: whether Agent Tools is supported for a specific non-loopback-only bind; accepted trusted-local-process access; exact Host/gate ordering; provider headerless execution verification; out-of-scope tool-topology refresh; gateway preservation; keeping SR-001 machinery absent.

### ARCH-REV-004 — Process-wide loopback listener design passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/design-review-report.md`
- Review round and trigger: round 4; `/solution_designer` submitted `SR-003` after the user approved one application-wide loopback-only Agent Tools listener as the resolution of `ARCH-F-002`.
- Triggering role, report path, and finding IDs: `/solution_designer`; canonical design review report above; prior `ARCH-F-002`; `ARCH-F-001` remains resolved.
- Relevant solution revision IDs: `SR-003` superseding `SR-002` and `SR-001`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: the specific-non-loopback main-bind conflict is resolved without weakening request admission. One `AgentToolsMcpHost`-owned Fastify listener binds `127.0.0.1:0` per application-server process and serves every run; both main listeners omit Agent Tools and preserve their requested binds; a required private ready-base reader feeds every scoped session service; startup/shutdown compensation preserves cached-provider URL lifetime; the generic main internal base, managed messaging, and external gateway remain unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-F-002` | Blocking / Requirement Gap | Resolved | `ARCH-REV-003`, `SR-003` | Approved `BEH-009`, `REQ-010`, `AC-011`, and `AC-012` define one shared loopback listener, exact main-bind preservation, no main-route registration, verified immutable process base, required endpoint injection, fail-closed startup, provider-before-listener shutdown, and no independent rebind. The design maps these through `DS-007`, explicit owners/interfaces/files, compensation, and coverage. |

- New or remaining finding IDs: `None`
- Material classification changes: `ARCH-MP-007` remains reachable but now has an approved complete target response. New `ARCH-MP-008` confirms that a cached provider client surviving a completed supported host shutdown is not reachable when the explicit shutdown contract holds, so port persistence or local-listener rebind machinery is not justified.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: accepted trusted-local-process access; exact Host/gate ordering; headerless provider execution evidence; assigned-port change only across complete host restart; partial-startup/socket cleanup; no-main-route and generic-base/gateway preservation; out-of-scope tool-topology refresh; keeping SR-001 machinery absent.

### ARCH-REV-005 — Manager-owned published-run finalization design passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/design-review-report.md`
- Review round and trigger: round 5; `/solution_designer` submitted `SR-004` after `CRR-001` returned the uncommitted `IR-001` implementation for a supported Team-stop cleanup bypass and dormant partial-owner cleanup APIs.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/code-review-report.md`; `CR-F-001`, `CR-F-002`; material premise `CR-MP-001`.
- Relevant solution revision IDs: `SR-004` correcting `SR-003`; `SR-002` and `SR-001` remain superseded history.
- Prior authoritative decision: `Pass` (`ARCH-REV-004`), followed by downstream source-review `Fail` (`CRR-001`).
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: the design now traces the real Team-row stop through `MixedAgentMemberHandle` and makes `AgentRunManager` the single published-run reversible prepare / committed finalization boundary. It preserves `AgentRun` quiescence/runtime ownership, requires accepted inactivity plus exact-current removal/resource cleanup before success, shares the finalizer with direct and stop-all paths, prevents replacement-run cleanup, and removes unused partial-owner Agent Tools deactivation surfaces. The approved deterministic identity, shared loopback listener, provider convergence, no-persistence outcome, main-base behavior, and external gateway remain unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `CR-F-001` | Blocking downstream `Design Impact` | Resolved in the solution/design; implementation rework and code re-review remain required | `CRR-001`, `SR-004`, `ARCH-REV-005` | Corrected `BEH-001`/`BEH-004`/`BEH-005`/`BEH-007`, `REQ-003`/`REQ-007`, `AC-013`, `DS-002`, and `DS-008` define the exact Team/direct/stop-all path, cancellation/rejection preservation, exact-current removal, cleanup assertion, and failure propagation. `ARCH-MP-009` independently revalidates the supported trigger and consequence. |
| `CR-F-002` | Required downstream cleanup | Resolved in the solution/design; source removal and code re-review remain required | `CRR-001`, `SR-004`, `ARCH-REV-005` | Removal/decommission, interface, file, sequence, and coverage sections require deletion of `deactivateForOwner`, `deactivateSessionsForOwner`, partial-owner matchers/forwarders, and obsolete coverage while retaining exact run/session cleanup. |

- New or remaining finding IDs: `None` at architecture review. `CR-F-001` and `CR-F-002` remain implementation/code-review obligations until the source is reworked and re-reviewed.
- Material classification changes: new `ARCH-MP-009` confirms the Team-stop bypass is reachable from the supported Team-row termination action and that the manager-owned correction is within the already-approved active-only lifecycle rather than a new product policy. Prior `ARCH-MP-005` through `ARCH-MP-008` remain valid.
- Recommended recipient: `/implementation_engineer`.
- Remaining risks or uncertainty: exact wrapper retry/coalescing and terminal cleanup-failure caching require focused implementation tests; cleanup failure after removal must never become Team success or touch a replacement; every published-run caller must converge on the manager boundary; all prior provider/listener/gateway execution risks remain pending downstream evidence.
