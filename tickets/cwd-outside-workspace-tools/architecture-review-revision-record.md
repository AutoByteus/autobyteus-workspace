# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Initial complete solution-package review | `SR-001` | `N/A` | `Fail` | `ARCH-DI-001` |
| ARCH-REV-002 | Re-review after `ARCH-DI-001` correction | `SR-001`, `SR-002` | `Fail` | `Pass` | None (resolved `ARCH-DI-001`) |
| ARCH-REV-003 | Re-review after absolute-only cwd contract reset | `SR-001`, `SR-002`, `SR-003` | `Pass` | `Fail` | `ARCH-DI-002` |
| ARCH-REV-004 | Re-review after `ARCH-DI-002` resubmission | `SR-001`, `SR-002`, `SR-003` | `Fail` | `Fail` | `ARCH-DI-002` |
| ARCH-REV-005 | Re-review after `ARCH-DI-002` correction (`SR-004`) | `SR-001`, `SR-002`, `SR-003`, `SR-004` | `Fail` | `Pass` | None (resolved `ARCH-DI-002`) |
| ARCH-REV-006 | Re-review after durable documentation correction (`SR-005`) | `SR-001`, `SR-002`, `SR-003`, `SR-004`, `SR-005` | `Pass` | `Pass` | None (resolved `ARCH-DI-002`) |

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


### ARCH-REV-003 — Absolute-only cwd reset requires durable documentation inventory correction

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-review-report.md`
- Review round and trigger: Round 3; architecture re-review of the `SR-003` contract reset after implementation, code review, API/E2E, and delivery evidence for the superseded relative-cwd contract.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/solution-revision-record.md`; `SR-003`; `ARCH-DI-002`.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: `Pass` (`ARCH-REV-002`)
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: The approved absolute-only provided-`cwd` reset is coherent across requirements, intended behavior, resolver ownership, host-before-Windows-WSL ordering, no-spawn validation, lifecycle preservation, and exact field descriptions. The prior `ARCH-DI-001` accessibility-preflight finding remains resolved. The reset design is not implementation-ready because it omits an existing durable cross-contract documentation surface that still states the superseded workspace-relative terminal cwd behavior.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DI-001` | Resolved | Resolved / unchanged | `SR-002`; `MP-001` | Current `requirements.md`, `terminal-cwd-policy.md`, and `design-spec.md` retain resolver-owned host accessibility preflight, working-directory error mapping, host-before-WSL ordering, and no-spawn coverage. |

#### New Finding

- New or remaining finding IDs: `ARCH-DI-002`
- Material classification changes: None. `MP-001` remains `Reachable` and covered by the approved target design; the absolute-only reset does not introduce a new product policy, security posture, migration obligation, or lifecycle contract.
- Recommended recipient: `/solution_designer`
- Required correction: Add `autobyteus-ts/docs/tool_schema_and_configuration.md` to the reset design's durable documentation/file responsibility inventory and update sequence. Replace only its terminal `cwd` cross-reference with the absolute-only provided-value rule and unchanged omitted default; preserve generic file-tool, `edit_file`, and `base_dir` behavior. Add a documentation consistency check to the post-reset implementation/delivery evidence.
- Remaining risks or uncertainty: The previously completed implementation, code review, API/E2E, and delivery artifacts validate only the superseded relative-cwd contract and must be rerun after architecture approval and implementation. Windows host ACL/WSL behavior, package/built-artifact validation, and no-spawn evidence remain downstream work. The host accessibility preflight remains subject to TOCTOU and is not sandbox enforcement; sandbox/security remains a separate ticket.


### ARCH-REV-004 — Durable terminal cross-reference remains inconsistent after resubmission

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-review-report.md`
- Review round and trigger: Round 4; re-review after the solution-designer resubmission of `SR-003` for prior finding `ARCH-DI-002`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/solution-revision-record.md`; `SR-003`; `ARCH-DI-002`.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: `Fail` (`ARCH-REV-003`)
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: The resubmitted requirements and design continue to express the absolute-only provided-`cwd` contract and preserve the resolved accessibility-preflight, host-before-Windows-WSL, no-spawn, lifecycle, and scope decisions. However, the prior documentation-coherence finding was not corrected: the current `autobyteus-ts/docs/tool_schema_and_configuration.md` still says relative terminal cwd remains workspace-rooted, and the resubmitted `design-spec.md` still omits that affected durable documentation surface from its file mapping and change sequence.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DI-001` | Resolved | Resolved / unchanged | `SR-002`; `MP-001` | Current `requirements.md`, `terminal-cwd-policy.md`, and `design-spec.md` retain resolver-owned host accessibility preflight, working-directory error mapping, host-before-WSL ordering, and no-spawn coverage. |
| `ARCH-DI-002` | Open / blocking | Open / blocking | `SR-003`; `ARCH-REV-003` | The current source document still contains the relative-workspace statement; `design-spec.md` final file responsibility mapping and change sequence list `docs/terminal_tools.md` but not `docs/tool_schema_and_configuration.md`. |

#### New Finding

- New or remaining finding IDs: `ARCH-DI-002` (reused; same unresolved design-impact issue)
- Material classification changes: None. `MP-001` remains `Reachable` and covered by the approved target design; no new product policy, security posture, migration obligation, or lifecycle contract is introduced.
- Recommended recipient: `/solution_designer`
- Required correction: Add `autobyteus-ts/docs/tool_schema_and_configuration.md` to the reset design's durable documentation/file responsibility inventory and update sequence. Correct its terminal `cwd` cross-reference to say that provided terminal cwd values must be absolute, external accessible directories are supported, and omitted cwd retains its documented default; preserve generic file-tool, `edit_file`, and `base_dir` behavior. Add a documentation consistency check to post-reset implementation/delivery evidence.
- Remaining risks or uncertainty: The previously completed implementation, code review, API/E2E, and delivery artifacts validate only the superseded relative-cwd contract and must be rerun after architecture approval and implementation. Windows host ACL/WSL behavior, package/built-artifact validation, and no-spawn evidence remain downstream work. Host accessibility preflight remains subject to TOCTOU and is not sandbox enforcement; sandbox/security remains a separate ticket.


### ARCH-REV-005 — Durable terminal cross-reference correction accepted

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-review-report.md`
- Review round and trigger: Round 5; re-review of `SR-004` after the prior `ARCH-DI-002` design-impact finding.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/solution-revision-record.md`; `SR-004`; `ARCH-DI-002`.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Prior authoritative decision: `Fail` (`ARCH-REV-004`)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: `SR-004` resolves `ARCH-DI-002`. The corrected design explicitly includes `autobyteus-ts/docs/tool_schema_and_configuration.md` in the BEH-006/REQ-009/AC-009 basis, off-spine ownership inventory, draft/final/target file mappings, supplemental invariant, and change sequence. It limits the implementation edit to that file's terminal cwd cross-reference, preserves generic file-tool `path`/`base_dir`/`edit_file` behavior, and requires a docs consistency check against both documentation surfaces and serialized schemas.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DI-001` | Resolved | Resolved / unchanged | `SR-002`; `MP-001` | Current `requirements.md`, `terminal-cwd-policy.md`, and `design-spec.md` retain resolver-owned host accessibility preflight, working-directory error mapping, host-before-WSL ordering, and no-spawn coverage. |
| `ARCH-DI-002` | Open / blocking | Resolved | `SR-004`; `ARCH-REV-004` | `design-spec.md` now maps the long-lived cross-reference in behavior, subsystem allocation, draft/final/target file responsibility inventories, and change sequence; `terminal-cwd-policy.md` requires both documentation surfaces to agree with serialized schemas while preserving generic file-tool behavior. |

- New or remaining finding IDs: None.
- Material classification changes: `ARCH-DI-002` is resolved as a `Design Impact`; no user-approved behavior, security posture, migration obligation, or lifecycle contract changed. `MP-001` remains `Reachable` and covered by the approved target design.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Prior implementation/code/API-E2E/delivery evidence remains superseded and must not be reused as approval for `SR-003`; downstream work must implement the absolute-only behavior, update both docs, prove serialized-schema/docs consistency and generic file-tool non-change, validate Windows host/WSL behavior and built/package artifacts, and rerun code review/API-E2E/delivery. Host accessibility remains subject to TOCTOU and is not sandbox enforcement; sandbox/security remains a separate ticket.


### ARCH-REV-006 — Durable documentation correction verified

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-review-report.md`
- Review round and trigger: Round 6; re-review of `SR-005` after the prior `ARCH-DI-002` design-impact correction.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/solution-revision-record.md`; `SR-005`; `ARCH-DI-002`.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`, `SR-005`
- Prior authoritative decision: `Pass` (`ARCH-REV-005`)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The durable source documentation correction is now present. `autobyteus-ts/docs/tool_schema_and_configuration.md` changes only its terminal cwd cross-reference to absolute-only provided values and unchanged omitted defaults; its generic file-tool `path`/`base_dir`/`edit_file` contract is unchanged. `autobyteus-ts/docs/terminal_tools.md` is aligned and uses absolute-path examples. The design continues to require post-reset consistency verification against both docs and serialized schemas.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-DI-001` | Resolved | Resolved / unchanged | `SR-002`; `MP-001` | Current `requirements.md`, `terminal-cwd-policy.md`, and `design-spec.md` retain resolver-owned host accessibility preflight, working-directory error mapping, host-before-WSL ordering, and no-spawn coverage. |
| `ARCH-DI-002` | Resolved | Resolved / unchanged | `SR-004`, `SR-005`; `ARCH-REV-005` | `design-spec.md` maps the long-lived cross-reference in all required responsibility/sequence sections; the durable source docs now agree with the absolute-only contract; the bounded source diff preserves generic file-tool behavior. |

- New or remaining finding IDs: None.
- Material classification changes: None. No user-approved behavior, security posture, migration obligation, or lifecycle contract changed. `MP-001` remains `Reachable` and covered by the approved target design.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Runtime resolver, serialized schemas, tests, code review, API/E2E, and delivery evidence remain superseded and must be rerun after implementation. The required docs consistency check must compare both docs with serialized schemas and verify generic file-tool non-change. Windows host/WSL behavior and built/package artifacts remain downstream validation. Host accessibility remains subject to TOCTOU and is not sandbox enforcement; sandbox/security remains a separate ticket.
