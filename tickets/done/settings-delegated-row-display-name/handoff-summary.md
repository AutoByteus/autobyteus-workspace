# Handoff Summary: settings-delegated-row-display-name (autobyteus-208)

- Status: verified from the evidence, archived and finalized on `personal`. No release. The final repository state is in `release-deployment-report.md`.
- Classification: `task_size=Small`, `architectural_risk=Low`, route Direct Low-Risk. Architecture review, code review and test-code review: `N/A — not applicable`.
- Revisions: SR-001 / IR-001 / API-REV-001 / DR-001.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-delegated-row-display-name`, branch `fix/settings-delegated-row-display-name`.

## What Changed

- Problem: Run Settings named a catalog copy by its raw address basename (`scribe_5083`), while the sidebar and the conversation showed the display name (`scribe 5083`).
- Fix (`5af1a03e11`): the Team naming rule is one exported function, `teamMemberName` in `teamExecutionTreeSelectors.ts`. The sidebar rows, the context factory and the Settings Team rows all use it. Org and Agent Settings rows use `memberDisplayName`. `nameAt` was removed from `delegatedLaunchRows.ts`. The DCR-001 probe header in `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` now describes the check the case makes.
- Tests: new cases in `autobyteus-web/utils/runSettings/__tests__/delegatedLaunchRows.spec.ts`, which compare against `projectNavigationRows` (the sidebar's own function) and fail on base.
- Docs: `autobyteus-web/docs/settings.md` (implementation) and `autobyteus-web/docs/agent_teams.md` (delivery).

## Integration

- Method: merge. `origin/personal` @ `20dc05ab1c` (incl. autobyteus-290, -253, -265, -232) merged into the ticket branch as `32637c224e`, with no conflicts. The base and the ticket both edited `autobyteus-web/docs/settings.md`, in different sections, and both edits are present. Near the changed code, the base changed only a comment in `stores/runHistoryTeamExecutionRows.ts`. `pnpm install --frozen-lockfile` was run.
- Post-integration checks on `32637c224e`:
  - DEL-01: IMP-02's command (`utils/runSettings services/teamExecution services/collaborators components/run-settings … components/workspace/config`) → 24 files / 140 tests passed, including `delegatedLaunchRows.spec.ts`.
  - DEL-02: `guard:web-boundary` passed.
  - DEL-03: typecheck filtered to the changed files → no errors.
- The browser probe was not rerun. The base changed nothing the row names depend on, and the unit spec compares the rows with the sidebar's own function on the integrated state.

## Verification From Evidence

- AC-001/AC-002: proven. IMP-01 passes 5/5; IMP-00 fails on base; DEL-01 passes on the integrated state. API-05 shows Team-root, Org-root and Agent-root rows on the real stack.
- AC-003: proven by IMP-02 and DEL-01.
- AC-004: proven. The header diff says "the Team context of each copy … holds its own model and the slot's its edit, all named "worker"", in place of the removed "+" claim. API-04 checked it against the case's steps.
- AC-005: proven. API-05 shows `Summary: 7 Pass, 0 Fail`, `browserErrors: []`, and comparison totals `MATCH 42, MATCH-BY-ADDRESS 19, NO-SIDEBAR-ROW 2`, with no `MISMATCH`. Examples: `scribe ca32` (SC) and `worker` match in Settings and the sidebar, and conversation titles such as `writer 0ba6 - 8DB9` agree. The screenshot of the Team run shows "scribe ca32" and "worker" the same in Run Settings and the sidebar. API-06 (base) finds 14 mismatches, such as `settings=['scribe_a7ea']` vs `sidebar=['scribe a7ea']`, so the comparison detects the defect.
- API/E2E final confidence: 95%, all categories ≥ 95%. No user check is needed: AC-005's "look in the app" is assigned to API/E2E's browser probe and was done there.

## Notes

- The 2 `NO-SIDEBAR-ROW` rows are the Org run's Team copy `/pair`. The observer does not read Org Team-group sidebar rows, and the name is identical under both rules.
- Follow-ups: none.

## Release

- Decision: no release, the RELEASE.md default (the Task asks for "merged"). A beta or stable release is available on request.
