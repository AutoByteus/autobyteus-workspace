# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-004 (Pass) | N/A | `Initial Baseline` | `SR-004`, `ARCH-REV-004` | Ready for Code Review |

## Revision Entries

### IR-001 — Live tool list updates, steps 1–7

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `tickets/in-progress/live-tool-list-updates/design-review-report.md`, ARCH-REV-004 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: branch `codex/live-tool-list-updates` on base `origin/personal` @ `9f7c9c10a6`:
  - `f733da620e` step 1 (Agent Tools endpoint);
  - `e4746ade4e` step 2 (change signal);
  - `119bf31636` the Solution Designer's `Agent.replaceTools` clarification (design-spec, one row);
  - `a9cc802d99` steps 3–6 (run side, Claude/AGY, native, Codex/Grok, web) — one commit, because the backend contract change ties the five backends together;
  - `5cc31e6eca` step 7 docs;
  - the ticket artifacts and evidence commit that follows.
- Related solution revision IDs: `SR-004` (plus the step-5 clarification).
- Related architecture-review revision IDs: `ARCH-REV-004`.
- Related code-review revision IDs: `N/A`. Related API/E2E revision IDs: `N/A`. Related delivery revision IDs: `N/A`.
- Why recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-004; REQ-001…REQ-010; AC-001…AC-008.
- Implementation delta: see `implementation-handoff.md` "Current Implementation Summary".
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas".
- Implementation-time corrections found by tests (all fixed before handoff):
  - `ToolListUpdateService.runPublished` registered its tracking entry after starting tracking; for a new run tracking ran to its "released meanwhile" check synchronously and dropped the run. The entry now exists before tracking starts (found by the integration test).
  - `resolveTurnToolNames` fell back to the configured tools when the instance map was empty, so removing every native tool would have restored the original list. The fallback now applies only before instances are prepared.
  - `AgentToolsMcpSessionStreams` used `JSON.stringify`, which the agent-tool result boundary architecture rule forbids outside its allow-list: the frame is a literal and the closing reply has no body.
- Local validation and result: see `implementation-handoff.md` "Local Implementation Checks Run".
