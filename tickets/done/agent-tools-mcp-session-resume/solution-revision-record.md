# Solution Revision Record

The latest requirements, investigation notes, design spec, and listed evidence supplements remain authoritative. This record is a concise round/rationale index only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer / initial package / round 1 | N/A | Initial Baseline | Ready for architecture review |
| SR-002 | Architecture reviewer / design-review-report.md / ARCH-REV-002 | ARCH-F-001 | Requirement Gap — User Approval Received | Revised package ready for architecture re-review |
| SR-003 | Architecture reviewer / design-review-report.md / ARCH-REV-003 | ARCH-F-002 | Requirement Gap — User Approval Received | Dedicated-listener revision ready for architecture re-review |
| SR-004 | Code reviewer / code-review-report.md / CRR-001 | CR-F-001, CR-F-002 | Design Impact + Required Cleanup | Manager-owned Team-stop finalization revision ready for architecture re-review |

## Revision Entries

### SR-001 — Stable Codex MCP binding baseline

- Triggering role, report path, and round: solution designer; initial solution package; architecture-review round 1.
- Triggering finding IDs: N/A.
- Prior authoritative result: N/A.
- Current authoritative result: approved requirements and an implementation-ready design for a protected persistent Codex Agent Tools MCP binding plus active-only live sessions.
- Why this baseline or revision entry is recorded: establishes the first complete solution handoff after exact product reproduction, direct Codex 0.150.1 causal probing, user discussion of process/session/restart tradeoffs, and explicit approval of the same-binding persistence direction.
- Resolution: preserve stable session ID/path and encrypted bearer for the immutable Codex run/thread; deactivate live registry state on stop; rebuild and reactivate the same binding on restore; keep cwd-shared Codex process reuse; protect the sidecar from sync/import and delete it with owner history.
- Approved behavior or requirement IDs affected: BEH-001–BEH-006; REQ-001–REQ-009; AC-001–AC-009.
- Canonical artifacts and sections updated:
  - requirements.md — approved behavior, guardrail, requirements, criteria, directly-usable/no-migration outcome;
  - investigation-notes.md — reproduction/root cause, current owners, stable/live split, persistence/vault/sync/deletion evidence;
  - design-spec.md — full spine-first ownership, state machine, interfaces, files, removal plan, sequence, and risks.
- Supplemental artifacts updated, added, or removed: retained both screenshots and both evidence reports; appended approved-direction clarification to codex-app-server-mcp-rebind-probe.md.
- Downstream and architecture-review impact: reviewer should determine whether the stable-binding/live-session decomposition, scoped authority boundary, prepare/confirm/abort transaction, secret-envelope reuse, protected sidecar, and active-only cleanup are ready for implementation.
- Next recipient or routing: /architecture_reviewer.
- Remaining gaps or risks: deliberate longer bearer lifetime; startup partial-failure compensation; async authority-close compensation; out-of-scope tool-topology refresh; exact turnless thread/delete availability to verify during implementation.

### SR-002 — Unified deterministic local run endpoint supersedes persistent binding

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/design-review-report.md`; architecture-review round 2 / `ARCH-REV-002`.
- Triggering finding IDs: `ARCH-F-001`.
- Prior authoritative result: `SR-001` specified an encrypted persistent Codex binding and passed round-1 architecture review; that direction was superseded by the user's later approval recorded in `ARCH-REV-002`.
- Current authoritative result: revised approved requirements and a new implementation-ready design for one deterministic, non-secret, run-scoped local Agent Tools endpoint, one active-only lifecycle for Codex and Claude, explicit loopback-only Agent Tools admission, no Agent Tools persistence, and an unchanged external MCP Gateway.
- Why this revision entry is recorded: the approved trust and lifecycle contract changed after the first pass. The authoritative package must remove the internal bearer/persistent-binding machinery rather than refine it.
- Resolution: derive `agtrun_<full SHA-256 base64url digest>` from canonical run ID; activate fresh live context under that same identity and delete it on stop; give both providers one `activateForRun`/`deactivateForRun` authority; omit Agent Tools descriptor headers and bearer validation; require actual loopback peer plus loopback Host and current loopback/absent Origin before route lookup; retain redacted inactive 404; leave `/mcp/gateway`, `McpGatewayAccessGate`, `AUTOBYTEUS_MCP_GATEWAY_TOKEN`, and gateway catalog/dispatch/execution unchanged.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-008`; `REQ-001`–`REQ-009`; `AC-001`–`AC-010`.
- Canonical artifacts and sections updated:
  - `requirements.md` — replaced the persistent-binding scope with approved deterministic tokenless behavior, loopback admission, active-only lifecycle, no-persistence decision, gateway preservation, and revised acceptance criteria;
  - `investigation-notes.md` — added ARCH-REV-002 authority, current source/WIP distinction, run-ID derivation evidence, listener/local-trust findings, gateway independence, active-only failure cleanup, and revised file/coverage inventory;
  - `design-spec.md` — replaced the Codex-specific binding/state-machine design with universal run-session activation, deterministic identity, local access gate, active registry, clean-cut WIP removal plan, independent gateway spine, concrete file ownership, and change sequence.
- Supplemental artifacts updated, added, or removed: revised the conclusion in `evidence/codex-app-server-mcp-rebind-probe.md`; retained the original and exact-reproduction evidence; added `evidence/external-mcp-gateway-settings.png`; included `design-review-report.md` and `architecture-review-revision-record.md` as the triggering review package; recorded that the final source audit is back to the clean HEAD baseline.
- Downstream and architecture-review impact: the prior implementation direction and its in-progress source/test machinery must not proceed. Architecture review must reassess all spines, interfaces, file responsibilities, removal scope, local access guarantees, and gateway preservation against `SR-002` before implementation resumes.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: trusted local processes can invoke an active endpoint; gate ordering and Host parsing require exact coverage; general loaded-thread tool-topology refresh remains out of scope; the clean source baseline must not regain any SR-001 binding/vault/sync machinery; external gateway regression must be demonstrated without changing its production boundary.

### SR-003 — One process-wide loopback listener resolves main-bind conflict

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/design-review-report.md`; architecture-review round 3 / `ARCH-REV-003`.
- Triggering finding IDs: `ARCH-F-002`; `ARCH-F-001` is verified resolved.
- Prior authoritative result: `SR-002` correctly established deterministic tokenless run identity, universal active-only lifecycle, loopback request admission, no persistence, and unchanged gateway behavior, but assumed the main listener could always supply a loopback-reachable descriptor. ARCH-REV-003 proved that supported specific non-loopback-only binds contradict that assumption.
- Current authoritative result: the user explicitly approved one application-wide Agent Tools listener bound to `127.0.0.1` on an OS-assigned port and shared by every run. The dedicated listener is the sole Agent Tools transport; Studio/standalone main listeners preserve their exact requested bind and no longer register Agent Tools.
- Why this revision entry is recorded: a valid operator `--host`/standalone configuration otherwise makes every correct loopback-gated Agent Tools call fail. The new transport boundary preserves both the existing launch contract and the tokenless local-trust contract without weakening admission or creating per-run resources.
- Resolution: extend `AgentToolsMcpHost` to own an `AgentToolsMcpLocalServer`; bind exactly once to `127.0.0.1:0`; publish a verified immutable process-lifetime base before run recovery; require scoped activator/local-base injection and remove global/default issuer bypasses; inject that base into session descriptors; remove Agent Tools registration from both main-server builders; keep peer+Host+Origin admission before all route work; preserve the generic `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL`, requested main bind, managed messaging, `/mcp/gateway`, and gateway token/access behavior; fail host startup closed and unwind both server/resource lifecycles if local transport is unavailable.
- Approved behavior or requirement IDs affected: adds `BEH-009`, `REQ-010`, `AC-011`, and `AC-012`; refines `BEH-001`, `BEH-002`, `BEH-004`, `BEH-005`, `BEH-007`; and retains `BEH-008`, `REQ-001`–`REQ-009`, `AC-001`–`AC-010`.
- Canonical artifacts and sections updated:
  - `requirements.md` — adds main-bind-independent Agent Tools transport, listener count/readiness/failure/shutdown behavior, preserved main/generic-base/gateway contracts, and explicit full-URL versus stable-route restart semantics;
  - `investigation-notes.md` — records ARCH-MP-007/current startup paths, Studio and standalone compositions, generic endpoint ownership, user approval, selected listener topology, lifecycle evidence, files, coverage, and residual risks;
  - `design-spec.md` — adds DS-007, AgentToolsMcpLocalServer lifecycle/state, host ownership, main/local ordering and compensation, route de-registration, endpoint injection, exact file mapping, alternatives, sequencing, and failure guidance.
- Supplemental artifacts updated, added, or removed: no new supplement was necessary; the five evidence artifacts remain current. The canonical review report and architecture revision history now supply ARCH-REV-003/ARCH-F-002 authority.
- Downstream and architecture-review impact: architecture review must verify the listener/base owner, one-process/one-listener invariant, no-main-route guarantee, Studio/standalone startup compensation, process-lifetime URL stability, generic endpoint/gateway preservation, and the unchanged SR-002 run/session design before implementation resumes.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: trusted local processes remain in the accepted trust boundary; exact Host/gate ordering needs coverage; assigned port changes across complete process restarts and therefore depends on provider-process teardown; transparent in-process rebind is prohibited; partial startup must not leak sockets/resources; generic main endpoint and external gateway behavior must remain unchanged; SR-001 machinery must remain absent.

### SR-004 — Authoritative published-run termination closes the Team-stop cleanup gap

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/code-review-report.md`; source-review round 1 / `CRR-001`.
- Triggering finding IDs: `CR-F-001` (blocking Design Impact) and `CR-F-002` (required local cleanup); material premise `CR-MP-001`.
- Prior authoritative result: `SR-003` passed as `ARCH-REV-004` and was implemented as uncommitted `IR-001`, but the reviewed DS-002 incorrectly assumed supported Team-member stop reached AgentRun resource cleanup.
- Current authoritative result: revised approved requirements and design make `AgentRunManager` the one published-run reversible prepare / committed finalization boundary used by direct, Team, and stop-all termination. `MixedAgentMemberHandle` delegates the exact run there and disposes only after managed accepted finish; exact-current activation removal and `AgentRunResourceManager.release` complete before Team success. Cancellation and rejected finish retain active state. Dormant partial-owner Agent Tools cleanup APIs are removed.
- Why this revision entry is recorded: CRR-001 independently traced the supported Team-row stop through `TeamRunService -> AgentTeamRunManager -> RootTeamRun/TeamRun -> MixedTeamManager -> MixedAgentMemberHandle -> AgentRun` and proved it bypassed `AgentRunManager`, `AgentRunActivationRegistry.removeIfCurrent`, and `AgentRunResourceManager.release`. The deterministic Agent Tools record therefore remained active after successful Team stop.
- Resolution: add a manager-owned exact-instance prepared termination wrapper around the existing AgentRun reversible contract; verify the exact published instance before preparation; delegate cancel without cleanup; permit retry after rejected finish; after accepted inactive finish, remove the exact current registration, release/assert resources, deactivate the exact run session, and only then return accepted; fail on not-found/identity mismatch/cleanup error without touching a replacement; reuse the wrapper for all published-run termination entrypoints; retain separate unpublished candidate-abort compensation; remove `deactivateForOwner(Partial<...>)`, scoped owner matchers/forwarders, registry owner-selector cleanup, and related dead helpers.
- Approved behavior or requirement IDs affected: refines `BEH-001`, `BEH-004`, `BEH-005`, `BEH-007`, `REQ-003`, `REQ-007`, `AC-004`, and `AC-007`; adds `AC-013`; preserves every other SR-003 behavior and scope boundary.
- Canonical artifacts and sections updated:
  - `requirements.md` — records IR-001 current behavior, committed Team-stop/cancel/reject outcomes, exact resource bound, AC-013, and CRR-001 review authority;
  - `investigation-notes.md` — records current uncommitted IR-001 state, exact supported stop path, source ownership evidence, selected manager boundary, CR-F-002 call search, files, coverage, and residual risks;
  - `design-spec.md` — corrects DS-002, adds DS-008, defines the manager/AgentRun/activation-registry/resource-manager ownership split, exact interface semantics, removal plan, file map, sequence, tests, and forbidden bypasses.
- Supplemental artifacts updated, added, or removed: no new evidence supplement was necessary. `code-review-report.md` and `code-review-revision-record.md` join the cumulative review package as reroute authority; the five evidence artifacts and prior design/implementation review history remain relevant.
- Downstream and architecture-review impact: architecture review must reassess the corrected Team-stop spine, exact-instance prepared API, cancellation/rejection/retry semantics, accepted cleanup ordering, direct/stop-all reuse, candidate-abort distinction, no-Team-Agent-Tools dependency, CR-F-002 removals, and focused coverage. After pass, implementation reworks IR-001 and updates its own handoff/revision record; full source review repeats before API/E2E.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: exact concurrent/retry behavior and resource-cleanup error propagation need implementation tests; accepted-but-inactive cleanup failure can be terminal and must never be converted to Team success; all passed SR-003 listener/provider/gateway/no-persistence behavior must remain unchanged; API/E2E remains blocked until reimplementation and source review pass.

