# Handoff Summary: workspace-tree-vs-chooser (autobyteus-385)

- Status: verified from the evidence, proven from a clean clone, archived and finalized on `personal`. **No release:** AC-007 says "release only on the user's word".
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route.
  - ARCH-REV-004: Pass.
  - Source review CRR-002: Pass, 9.4/10 (CR-001 fixed).
  - API/E2E API-REV-001: Pass, 93%.
  - Test review CRR-003: Pass.
- Requirements: SR-004, approved by the user through the Product design.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser`, branch `codex/workspace-tree-vs-chooser`.

## What Changed

- The left panel's run section has three views from a "View" menu: Workspaces (the default), Runs and Projects. The choice survives a reload.
  - A folder or Project is listed only while it has a listed run. A draft alone does not count. The first sent message lists it, and archiving its last run unlists it.
  - Folder rows have no Remove. The section has no add form and no New Project link.
- Removing a folder happens in the chat's workspace chooser. It leaves the chooser and every view, the chip falls back to Temp, and files and run history stay on disk. While a run is active there, it is refused with "Stop active runs before removing this workspace."
- The server computes `lastActivityAt` per root. The run-history read has windows: the phone uses 5, the desktop `null`.
- Org runs stored without a root folder now show only in the Runs view; the "No workspace" bucket is gone.

## Integration

- The branch already contains `origin/personal` @ `3ef5e33eec`, and `personal` had not moved, so no merge was needed.

## Clean-Clone Proof (AC-007)

- Setup: a clone of `6ec6e2d603` with no build output; frozen install; workspace and Brief Studio builds; server `prebuild`; `nuxt prepare`.
- Each check ran on its own and recorded its own exit code (`evidence/DEL-*-clean-clone.log`):

  | Check | Result |
  | --- | --- |
  | DEL-01 server typecheck | production 0; test files 1184/366, at baseline |
  | DEL-02 server unit | 7,900 passed |
  | DEL-03 server integration | 506 passed, 0 failed |
  | DEL-04 autobyteus-ts | 2,104 passed |
  | DEL-05 web typecheck | production 0; test files 99/43, at baseline |
  | DEL-06a/b/c web guards | each Passed |
  | DEL-07 web suite | 5,156 passed, 2 skipped |
  | DEL-08 Electron main | 407 passed |
  | DEL-09 `test:e2e:workspace-views-chooser` | WVC-001…004, 4/4 Pass |
  | DEL-10 `test:e2e:projects-left-navigation` | PLN-01…10 Pass |

## Verification From Evidence

- AC-002 and AC-005: WVC-002, read directly. The screenshots `WVC-002-removed-chip-temp.png` and `WVC-002-remove-refused.png` show the removal toast "…removed. Files, memories, and run history were not deleted.", the chip on Temp, and the refusal toast.
- AC-009 and AC-011: WVC-003 (Runs → Workspaces → Runs, windows null/6/null, "Show older" counts every run), PLN-01 and PLN-10.
- AC-012: WVC-001 (Team-only and Org-only folders listed, a draft not listed, the first message lists, archiving unlists) and PLN-01, PLN-02 and PLN-08.
- AC-010, AC-013 and AC-014: IMP-20 (VIS-001, VIS-014…016) and PLN-01.
- The 250 ms read budget (design risk): API-02. The poll read with window `null` is p50 143 / p95 151 ms, and with window 6 p95 149 ms. The base had p95 58 ms. Seed: 40 agent, 200 team and 10 org runs; load average about 70.
- AC-007: the clean clone above.
- Not tested: API-09, the real-AGY restart probe; it needs the host login, and its subject is unchanged.
- No user check is needed.

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

- FU-001: the uncalled `createAgentRun`; FU-005 notes that the probes use it.
- FU-002: cancel autobyteus-378 after this delivery.
- FU-003: rename `WorkspaceAgentRunsTreePanel`.
- FU-004: the Projects view picks up another client's first run only on its re-read events.

## Release

- Decision: no release. AC-007: "release only on the user's word". The change will be in the next beta he asks for.
