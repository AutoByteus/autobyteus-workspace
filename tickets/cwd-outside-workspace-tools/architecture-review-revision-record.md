# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Initial complete solution-package review | `SR-001` | `N/A` | `Fail` | `ARCH-DI-001` |
| ARCH-REV-002 | Re-review after `ARCH-DI-001` correction | `SR-001`, `SR-002` | `Fail` | `Pass` | None (resolved `ARCH-DI-001`) |

## Revision Entries

### ARCH-REV-001 — Initial architecture baseline: pre-spawn inaccessible-cwd handling is incomplete

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-review-report.md`
- Review round and trigger: Round 1; initial complete package submitted by `solution_designer` for implementation-readiness review.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/solution-revision-record.md`; `SR-001`; `ARCH-DI-001`.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: The initial architecture baseline confirms the approved behavior basis, supplemental policy, spine inventory, ownership boundaries, dependency direction, no-migration decision, and explicit sandbox deferral. The design is not implementation-ready because it does not define resolver-owned pre-spawn accessibility validation and existing working-directory error mapping for an existing but inaccessible directory, despite `REQ-005` / `AC-006`.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `ARCH-DI-001`
- Material classification changes: `MP-001` classified `Reachable`; no user-approved behavior was changed or reopened.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: No dependency-backed runtime evidence yet; Windows/WSL permission/error behavior needs downstream validation after the design correction. Sandbox/security remains a separate ticket.

### ARCH-REV-002 — Round 1 accessibility-preflight correction accepted

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-review-report.md`
- Review round and trigger: Round 2; re-review of `SR-002` after the `solution_designer` revised the package for `ARCH-DI-001` / `MP-001`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/solution-revision-record.md`; `SR-002`; prior finding `ARCH-DI-001`; material premise `MP-001`.
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Fail` (`ARCH-REV-001`)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The revised requirements, supplement, investigation notes, and design spec now make `resolveExecutionCwd` the sole owner of physical directory/type validation, host cwd accessibility preflight, working-directory error mapping, and fail-fast behavior before either process owner or target shell creation. They explicitly define no-spawn coverage for inaccessible absolute and workspace-relative cwd values through both tools. The host Windows path is checked before the existing Windows-to-WSL execution adapter; WSL remains outside the cwd authorization boundary.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- | --- |
| `ARCH-DI-001` | Open / blocking | Resolved | `SR-002`; `MP-001` | `design-spec.md` resolver-owned pre-spawn validation contract, Host / Windows-WSL Boundary, and No-Spawn Coverage sections; `requirements.md` `REQ-005` / `AC-006` / `AC-007`; `terminal-cwd-policy.md` accessibility invariants; revised `investigation-notes.md`. |

- New or remaining finding IDs: None.
- Material classification changes: `MP-001` remains `Reachable`; its consequence is now covered by the approved target design. No user-approved behavior or scope boundary changed.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: No dependency-backed runtime evidence yet; downstream work must validate POSIX permissions, Windows host ACL/WSL conversion behavior, no-spawn coverage, and built/package artifacts. TOCTOU and later WSL runtime failures remain documented residual risks.
