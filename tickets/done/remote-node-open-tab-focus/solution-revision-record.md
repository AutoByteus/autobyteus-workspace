# Solution Revision Record

The latest requirements, investigation notes, design spec, and any listed supplements remain authoritative. This record indexes completed solution rounds without duplicating them.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer initial baseline / 2026-08-30 | N/A | Initial Baseline | Approved requirements and implementation-ready design established; pending architecture review |

## Revision Entries

### SR-001 — Embedded-only `open_tab` Browser projection baseline

- Triggering role, report path, and round: Solution designer initial investigation/design round; no triggering report
- Triggering finding IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: User-approved requirements basis and initial design package ready for architecture review
- Why this baseline or revision entry is recorded: Establish the first authoritative solution for the remote/Docker `open_tab` right-panel focus bug.
- Resolution: Retain backend `TOOL_EXECUTION_SUCCEEDED` and generic lifecycle/activity projection. Gate the existing frontend browser-success handler's Electron focus and Browser selection on the current window being embedded and the local Browser shell being available. Preserve embedded-node focus behavior; remote/Docker results remain node-owned and do not mutate local right-panel selection.
- Approved behavior or requirement IDs affected: BEH-001, BEH-002; R-001 through R-004; AC-001 through AC-004
- Canonical artifacts and sections updated:
  - `requirements.md` — approved behavior, scope, requirements, acceptance criteria, and approval status
  - `investigation-notes.md` — current/desired paths, root cause, owner map, exact sources, and approval evidence
  - `design-spec.md` — initial implementation-ready design
- Supplemental artifacts updated, added, or removed: None
- Downstream and architecture-review impact: Architecture reviewer should verify the local missing-invariant classification, preservation of backend lifecycle truth, use of authoritative window binding, and no-refactor/file-scope decision.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: Realistic embedded plus Docker execution evidence belongs to downstream coverage investigation; `browserShellStore.focusSession` error absorption remains outside approved scope.
