# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation baseline and later deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `handoff-architecture-design-complete.md` / initial | N/A | `Initial Baseline` | SR-004 (requirements SR-003); ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks and PMU-017 pass |

## Revision Entries

### IR-001 — Workspaces in the collapsed left strip (initial baseline)

- Triggering role, report path and round: Solution Designer, `tickets/in-progress/collapsed-left-panel-expand-keeps-run/handoff-architecture-design-complete.md`, initial (direct route, Medium/Low).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete per `design-spec.md` D-1..D-7. Classification confirmed Medium/Low.
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: the first implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001..REQ-010; AC-001..AC-012; BEH-001..BEH-005, BEH-007, BEH-008.
- Implementation delta:
  - D-1/D-2: the Chat highlight now applies only on New chat, and `isWorkspacesActive` is added in `useShellPrimaryNavigation`.
  - D-3: strip Workspaces button with divider and short-window spacing; activates via `activateStrip` and never navigates.
  - D-4: new `useRevealSelectedTreeRow`, plus `aria-current` on the Agent run row.
  - D-5: focused-member ancestry in the Team reveal, with the pending rule.
  - D-6: collapse moves focus to Workspaces.
  - D-7: `chatRouteRunId`, `isAgentOrgRunRoute`, and the refinement `isAgentOrgLaunchRoute` in `workspaceNavigationService.ts`; consumers switched over.
  - en/zh-CN strings; docs.
  - Probes: chat-draft-rows D11 plus its on-run Chat assertion; new PMU-017.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result:
  - Full web suite: 4005 passed. 3 tests in 4 files failed only because of an overlap with the server prebuild; they pass on rerun.
  - Focused specs pass.
  - PMU-017 passes (`implementation-evidence/pmu-017/`).
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E expected for Medium/Low).
- Remaining limitations or risks:
  - D11 was syntax-checked only.
  - Team-tab and first-send entry points are not in PMU-017.
  - The isolated-desktop journey and user verification are still pending.
