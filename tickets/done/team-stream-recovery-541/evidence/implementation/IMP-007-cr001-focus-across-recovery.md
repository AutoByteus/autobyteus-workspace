# IMP-007 — CR-001: the member the user moved to during a recovery stays focused (IR-002)

- Date: 2026-11-27. Finding: CRR-002 CR-001 (API/E2E F-1; CRR-001 C-2), a Local Fix in `teamRunOpenCoordinator`.
- Fix (`376b4bb9c0`), in `runTeamStreamRecovery`:
  - `beforeContextCommit` reads the replaced context's focused member;
  - after the synchronous `replaceFailedTeamStream`, `keepFocusAcrossRecovery` runs. If that member differs from the read's,
    is still in the new view, and the focus has not moved since, it loads the member
    (`ensureAuthoritativeTeamMemberProjection`), focuses it (`focusAgentForInspection`), and rebuilds the navigation
    projection (`refreshRunNavigationTopology('team-stream-recovery-focus')`);
  - a failed load leaves the read's member. The stream recovered all the same, and the recovery is not counted as
    failed.

  This covers every focus path. The commit itself stays synchronous.
- **The second change, and why.** The first fix carried the focus (the header showed mate). But SDD-16 still failed:
  the run tree's selected row showed lead. The tree reads the focus from the navigation projection
  (`runHistoryNavigationProjection.ts:200`), which `replaceTeamContext` rebuilt at the commit with the read's member. So
  the fix also rebuilds that projection after moving the focus.

## Specs (`services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts`)

- "keeps the member the user focused on the old context during the read: loaded, then focused": the old context's focus
  moves to run-b while the automatic attempt's read is held. After the commit, the replacement is focused on run-b; the
  member load came after the replacement; the projection was rebuilt.
- "loads nothing more when the focus did not move during the read".
- "keeps the read's member when the moved-to member cannot be loaded".
- On the previous coordinator (`9e508b3adf`), the first and third fail (2 of 20); on the fix all 20 pass.
- Adjacent: `services/runOpen/__tests__/`, the walks, `runHistoryStore.spec`, `runHistorySelectionActions.spec`,
  `HistoricalTeamLazyHydration.integration.spec` (the stale mock dropped, C-3), `agentTeamRunStore.spec`: all pass
  (135 + 56 tests).
- Web typecheck: PASS (production 0; test files at the baseline 85).

## Probe

`node autobyteus-web/tests/e2e/send-delivery-probe.mjs --cases SDD-16,SDD-17 --output-dir <tmp>` (the server built from
the branch; its own temp stack, removed; 0 browser errors):

| Case | Before the fix (API/E2E, 2 runs) | First fix (focus only) | Fix |
| --- | --- | --- | --- |
| SDD-16: an in-app execution link to mate while the recovery's read is held 2.5 s | **Fail**: after the commit, header and row are both lead | **Fail**: header mate, row lead | **Pass**: header mate, row mate (recovered 5.03 s after the gap, 0 failed attempts) |
| SDD-17: the user selects mate in the run tree during the held read (the joined reselect) | Pass | Pass | **Pass**: header mate, row mate |

Screenshot after the commit: `IMP-007-SDD-16-link-during-recovery.png` (probe data only).

## Residual

An inspection still in flight at the commit is not covered. That is one that started on the old context and is still
loading its member when the replacement lands. It then rejects ("Team context … changed before selection commit"),
because `inspectMountedTeamMember` checks the context identity; the user's earlier focus is kept. Its window is the
member load, after the click. It was not seen in SDD-16 (the link's load ended before the held read).
