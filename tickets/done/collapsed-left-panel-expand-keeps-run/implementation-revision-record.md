# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation baseline and later deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `handoff-architecture-design-complete.md` / initial | N/A | `Initial Baseline` | SR-004 (requirements SR-003); ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks and PMU-017 pass |
| IR-002 | Code Reviewer / `code-review-report.md` / CRR-001 (failure-origin review of API-REV-001 FAIL-001) | CR-001 | `Local Fix` | SR-004; ARCH-REV N/A; CRR-001; API-REV-001; DR N/A | Reveal gated on run shown; affected specs, PMU-017 and PMU-018 incl. G pass |
| IR-003 | Solution Designer / `handoff-reopened-sr-006.md` / reopened package | N/A | `Re-verification / re-integration` (no code change) | SR-006 (SR-003/SR-004 unchanged); CRR-001; API-REV-002; DR-001..DR-003 (prior) | Recovered IR-002 verified unchanged; merged origin/personal d28c56d5d; full suite and PMU-018/019 pass |

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

### IR-002 — Reveal acts only while a run is shown (CR-001)

- Triggering role, report path and round: Code Reviewer, `tickets/in-progress/collapsed-left-panel-expand-keeps-run/code-review-report.md`, CRR-001 (failure-origin review of API-REV-001 FAIL-001: PMU-018 step G, DSK-001 run-4).
- Triggering finding IDs: CR-001 (C-001)
- Classification: `Local Fix`
- Prior authoritative result: IR-001. `useRevealSelectedTreeRow` scrolled to and focused any `aria-current`/`aria-selected` row. On a no-run page such as New chat after a Team run, the stale selection's row was scrolled to and focused, which breaks REQ-006 and REQ-009.
- Current authoritative result: the reveal acts only while `runShown` is true. Otherwise there is no scroll and no focus, and focus stays on the Workspaces section.
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this revision is recorded: an implementation defect found by API/E2E and classified Local Fix.
- Approved behavior or requirement IDs affected: REQ-006, REQ-009, AC-009, SCN-006 (fixed); REQ-003, AC-001..AC-005 (preserved).
- Implementation delta:
  - `useRevealSelectedTreeRow(container, runShown)`: early return when no run is shown; `watch(runShown)` reschedules inside the window.
  - `WorkspaceAgentRunsTreePanel.vue`: new `runShown` prop (default `false`), passed to the composable.
  - `AppLeftPanel.vue`: `:run-shown="isWorkspacesActive"` from `useShellPrimaryNavigation`.
  - `docs/workspace_layout.md`: reveal paragraph notes the gate.
  - Bounded deviation from D-4: a signature change plus one prop. No predicate duplicated; selection and highlight semantics and `selectionStore` untouched.
- Changed files or areas:
  - `autobyteus-web/components/workspace/history/useRevealSelectedTreeRow.ts`
  - `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `autobyteus-web/components/AppLeftPanel.vue`
  - `autobyteus-web/docs/workspace_layout.md`
  - tests: `useRevealSelectedTreeRow.spec.ts` (+2 cases), `AppLeftPanel_v2.spec.ts` (+1 case; mock declares the prop)
- Local validation and result:
  - Affected specs: 36 files / 366 tests passed.
  - PMU-017 + PMU-018 (incl. G and the late-load steps B/C/E) pass. Evidence in `implementation-evidence/ir-002/`.
- Next recipient or routing: direct API/E2E (Medium/Low unchanged), for the full PMU-018 and DSK-001.
- Remaining limitations or risks:
  - DSK-001 (packaged desktop) was not rerun by implementation.
  - `/agents` and `/projects` activation after a run is covered by the same gate in unit tests only.

### IR-003 — Reopened package: verify the recovered IR-002 and re-integrate (SR-006)

- Triggering role, report path and round: Solution Designer, `tickets/in-progress/collapsed-left-panel-expand-keeps-run/handoff-reopened-sr-006.md`. Cancelled 2026-10-09; reopened 2026-10-10; branch recovered at `900443b11`.
- Triggering finding IDs: N/A
- Classification: re-verification and re-integration. There are no findings and no code change.
- Prior authoritative result: IR-002 (`d0bf3db82`), validated by API-REV-002 (Pass). Delivery DR-003 was awaiting user verification when the package was cancelled.
- Current authoritative result:
  - The IR-002 implementation is byte-identical on the recovered branch and matches SR-003/SR-004 and the restored Product spec.
  - It is re-integrated with `origin/personal` `d28c56d5d` as merge `0604a9586`, with no conflicts.
- Related solution revision IDs: `SR-006` (SR-003 / SR-004 unchanged)
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-002`
- Related delivery revision IDs: `DR-001..DR-003` (prior)
- Why this revision is recorded: the package was reopened on a base that had moved 19 commits.
- Approved behavior or requirement IDs affected: none changed. All of REQ-001..REQ-010 were re-checked.
- Implementation delta: none in source. Merge only.
- Changed files or areas: merge commit only; `implementation-evidence/ir-003/`; this record and the handoff.
- Local validation and result:
  - Full web suite: 4062 passed, 5 skipped.
  - PMU-015, PMU-016, PMU-018 and PMU-019 pass.
  - PMU-017 (another ticket's case) is flaky on both branch and base: a pre-existing race at its 390 px overflow step. Evidence in `implementation-evidence/ir-003/`.
- Next recipient or routing: per `get_handoff_rules` (Medium/Low → direct API/E2E).
- Remaining limitations or risks:
  - DSK-001 and the user's desktop verification are still owned downstream.
  - The PMU-017 race needs an API/E2E classification or probe fix.

