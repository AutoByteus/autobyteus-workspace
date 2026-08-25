# Solution Revision Record

The latest requirements, investigation notes, design spec, and supplements remain authoritative. This record is the round/rationale index only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User request plus code-reviewer bootstrap handoffs; initial solution round | N/A | `Initial Baseline` | `Ready for architecture review` |

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
