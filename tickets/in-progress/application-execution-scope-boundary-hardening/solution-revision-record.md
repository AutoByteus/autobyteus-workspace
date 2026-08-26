# Solution Revision Record

The latest requirements, investigation notes, design spec, and supplements remain authoritative. This record is the round/rationale index only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User request plus code-reviewer bootstrap handoffs; initial solution round | N/A | `Initial Baseline` | `Ready for architecture review` |
| SR-002 | Architecture reviewer / ARCH-REV-001 / round 1 | AR-001, AR-002 | `Design Impact` | `Ready for architecture re-review` |
| SR-003 | Architecture reviewer / ARCH-REV-002 / round 2 | AR-001 | `Design Impact` | `Ready for architecture re-review` |

## Revision Entries

### SR-001 — Application execution ownership boundary baseline

- Triggering role, report path, and round: user-requested future architecture-health ticket; code-reviewer bootstrap messages grounded in current `origin/personal`; initial round.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: `Ready for architecture review`.
- Why this baseline is recorded: establish a design-first, behavior-neutral clean boundary for the current graph-local application execution family and explicitly evaluate the adjacent Agent addressing/runtimeKind simplification.
- Resolution: one concrete `ApplicationExecutionScope` per existing `ApplicationPlatformRuntime` lifetime privately owns graph-local Agent/Team execution, scoped MCP sessions, activation/resources, memory, publication/projection/relay, streaming source, admission, construction unwind, and ordered close; callers receive only narrow semantic capabilities. General execution and outer platform ownership remain separate. The public address concern is deferred to a clean separate ticket.
- Approved behavior or requirement IDs affected: BEH-001–BEH-004; REQ-001–REQ-010; AC-001–AC-011.
- Canonical artifacts and sections updated: `requirements.md` (`Design-ready`), `investigation-notes.md` (`Design-ready`), `design-spec.md` (complete initial design).
- Supplemental artifacts updated, added, or removed: added `application-execution-scope-ownership-and-spine-map.md`; added `adjacent-application-agent-addressing-evaluation.md`.
- Downstream and architecture-review impact: implementation remains blocked until architecture review passes. Review must validate exact owner/capability boundaries, DS-001–DS-009, construction/unwind and shutdown, explicit process injection, removal inventory, and adjacent-scope exclusion.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: exact TypeScript type imports may expose a construction cycle during implementation and must be resolved without widening contracts; latest-base refresh may add named process dependencies; dependency installation is absent in the worktree, so no test execution is claimed at design stage.

### SR-002 — Exact scope contract and closed transition inventory

- Triggering role, report path, and round: `/architecture_reviewer`; `design-review-report.md`; ARCH-REV-001 / round 1.
- Triggering finding IDs: AR-001, AR-002.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: `Ready for architecture re-review`.
- Why this revision is recorded: the accepted owner/lifetime/spine direction lacked normative implementation-level inputs/capability signatures and a closed source/test/architecture-rule transition.
- Resolution: defined the exact 12-required-field platform build input, byte-preserved scope identity derivation, exact 8-field scope input, seven capability signatures, concrete scope surface, admission/quiesce/close/abort semantics, every current consumer-to-method mapping, all shared process getter dispositions, and exact 12-field sibling-only orchestration assembly. Closed all production Add/Modify/Rename/Remove paths, every forced durable-test edit/rename, 22 migrated plus three newly required AFB nested-construction obligations (25 total), new scope/platform omission fixtures and occurrence rules, and the focused/realistic verification matrix.
- Approved behavior or requirement IDs affected: BEH-001–BEH-004; REQ-001–REQ-010; AC-001–AC-011. No requirement or product outcome changed.
- Canonical artifacts and sections updated: `requirements.md` supplement inventory; `investigation-notes.md` source/supplement/risk record; `design-spec.md` supplement authority, interface, file, and AFB mappings; `application-execution-scope-ownership-and-spine-map.md` exactness links.
- Supplemental artifacts updated, added, or removed: added `application-execution-scope-contracts.md`; added `application-execution-scope-transition-inventory.md`; adjacent address evaluation unchanged.
- Downstream and architecture-review impact: implementation remains blocked pending re-review; reviewer can now validate exact types, consumers, construction/import rules, removals, and proof without implementation discretion.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: implementation must resolve any type-only dependency cycle without a generic bag or optional field; the worktree still lacks installed dependencies, so no test execution is claimed; latest-base refresh must add any new shared owner as a named required input and update AFB fixtures.


### SR-003 — Contain live runs behind immutable commands and projections

- Triggering role, report path, and round: `/architecture_reviewer`; `design-review-report.md`; ARCH-REV-002 / round 2.
- Triggering finding IDs: AR-001 (remaining branch); AR-002 remained resolved.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: `Ready for architecture re-review`.
- Why this revision is recorded: SR-002 froze capability wrappers but still returned live `AgentRun`/`RootTeamRun` aggregates. Normal Team launch read a tree snapshot and normal Agent/Team input posted messages outside the scope, contradicting private mutable-kernel ownership.
- Resolution: removed live run aggregates from all outward capability signatures. Agent creation now returns a frozen `{runId}`; Team creation returns a newly allocated, deeply frozen `{teamRunId,members:[{memberAddress,agentRunId}]}` configured-member projection; Agent/Team input uses restore-aware scope commands returning only frozen `ACCEPTED`, `REJECTED(message)`, or `NOT_AVAILABLE` dispositions. The scope privately owns run resolution/posting and Team snapshot traversal; binding launch retains display-name/public binding projection and the orchestration host retains authorization, target selection, and exact current errors. Added exact production/test transition rows and AFB type/import/call guards against live aggregate escape.
- Approved behavior or requirement IDs affected: BEH-003; REQ-002, REQ-003, REQ-007, REQ-010; AC-003, AC-005, AC-010. No product, wire, storage, migration, multiplicity, or lifecycle behavior changed.
- Canonical artifacts and sections updated: `requirements.md` BEH-003/investigation findings/REQ-003/AC-003/AC-005/risk authority; `investigation-notes.md` source trace and AR disposition; `design-spec.md` DS-003, boundaries, interfaces, files, guards, sequencing, risks.
- Supplemental artifacts updated, added, or removed: updated `application-execution-scope-contracts.md`, `application-execution-scope-ownership-and-spine-map.md`, and `application-execution-scope-transition-inventory.md`; adjacent address evaluation unchanged.
- Downstream and architecture-review impact: implementation remains blocked pending re-review. The reviewer can now verify that application orchestration cannot receive live runs and that every supported launch/input operation is explicit in the command/result boundary.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: implementation must preserve recursive configured-member ordering, accepted/rejected/not-available mapping, thrown-error propagation, and exact public error strings. The worktree lacks installed dependencies, so no test execution is claimed; latest-base refresh remains required downstream.
