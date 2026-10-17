# API/E2E Revision Record — remove-nested-task-team

## Revision Index
| ID | Trigger / round | Related revisions | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-005 | `code_reviewer` CRR-008 Fail (Local Fix) TR-005, TR-006 | CRR-008 | Pass / 90% | Pass / 90% |
| API-REV-004 | `code_reviewer` CRR-007 Pass on the merge (`78ffa51225`, `270047a5d4`) / round 2 | CRR-007, IR-003, IR-004 | Pass / 93% | Pass / 90% |
| API-REV-003 | `code_reviewer` CRR-004 Fail (Local Fix) TR-003 remainder | CRR-004 | Pass / 93% | Pass / 93% |
| API-REV-002 | `code_reviewer` CRR-003 Fail (Local Fix) TR-001..TR-004 | CRR-003 | Pass / 93% | Pass / 93% |
| API-REV-001 | `code_reviewer` CRR-002 pass (commits `065430dd61`, `66c61595d2`, `4ec3dd9eb3`, `cbecdc076d`; base `db00ba16a9`) / round 1 | SR-006, ARCH-REV-002, IR-001/IR-002, CRR-001/CRR-002 | N/A | Pass / 93% |

## API-REV-001 — delegation forest, unreadable-tree containment, desktop branch vs base
- Investigation and ledger written before coverage edits and execution. No prior authoritative API/E2E result.
- Large/High, Reviewed input; successful route Code Review (proportional test-code review), as the durable test changes below are unreviewed.
- Durable changes:
  - new coverage, uncommitted, for test-code review:
  - added `autobyteus-server-ts/tests/e2e/projects/delegation-forest-restore.e2e.test.ts` (DF-1..3);
  - added `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` (UC-1, UC-2);
  - updated `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` (`reopenRoot`, `stopServer`, `attachRoot`);
  - baseline fixes (TESTING.md rule 9), committed one per commit and labelled "(baseline fix)":
    - `149bce0be9` recent-run-projection;
    - `ac3f6267ac` task-closure-root-visibility;
    - `623d34eabc` ad-hoc-task-delegation;
    - `3f54e8eaae` agent-org-task-team-disclosure probe;
    - `e6ba249a96` hierarchical-team-run-config rewritten flat.

    Diffs are also in `evidence/api-e2e/BASELINE-FIX-*.diff`.
  - Reported to owners, not changed:
    - `task-copy-idle-lifetime`: intermittent on branch and base; causes in the execution report;
    - `team-reload-member-freshness` E-005: the definitions feed's extra Team read.
- Repository: contracts, typecheck, server unit 5716, integration (only the 2 known `agent-status-websocket` base failures), web 4382 + guards + localization audit, scripted e2e 29 files in a clean env; the 17 base-identical failures resolved by the changes above.
- New e2e: DF-1..3 pass on branch and base (behaves as before); UC-1/UC-2 pass on the branch and fail on the base (negative control).
- Desktop (isolated instances, branch build vs base build, credentials imported with `pnpm secrets:import`): Team forest with Claude Agent SDK Haiku 5.5 and Org mounted-team copy with AutoByteus DeepSeek v4 flash; sidebar, status, Stop → restart → restore through the deepest level, Settings delegated copies, Token Meter, Task panel — identical on branch and base.
- Web probes: see execution report.

### Prior Failure Resolution
No prior authoritative failed API round. Authoring diagnostics (DF-3 Org reopen without restore, UC scan order, in-process restart harness artifact, hierarchical test seed assumptions, branch Electron build run concurrently with another build) were corrected before the final results; see the execution report.

### Canonical Current Artifacts
api-e2e-coverage-investigation.md; api-e2e-execution-coverage-report.md; api-e2e-test-case-ledger.md; this record; evidence/api-e2e/.

## API-REV-002 — CRR-003 local fixes
- TR-001: the UC header now states the prerequisite, `pnpm -C autobyteus-server-ts build` for the current worktree, because UC-2 starts dist/app.js.
- TR-002: the harness's `app` and `url` are `const` again.
- TR-003: the flat rewrite now uses flat names: file `team-run-config-graphql.e2e.test.ts`, `seedTeam`, TeamRun/TeamConfig operation names and targets, and `leadConfiguration`/`leadId`/`agentWorkspace`. Commit `2e70401f18`, labelled as a baseline fix.
- TR-004: DF-run1's DF-3 failure is now disclosed. It ran on the earlier harness, whose `reopenRoot` called no restore mutation: no `restoreAgent*Run` appears in the log. That was fixed at 11:00:56 and DF-run2 passed at 11:00:57. Reruns on the final harness: reviewer 6/6, mine 3/3 ×3. If DF-3 fails again on this harness, treat it as an Org restore finding.
- Renamed test, DF and UC: 12/12 (`CRR003-fixes-run.log`). TR-001 and TR-002 are in the uncommitted new-coverage files, still for review.

## API-REV-003 — CRR-004 TR-003 remainder
- My earlier check for retired names was case-sensitive (`[Hh]ierarch`), so it missed two uppercase error codes in team-run-config-graphql.e2e.test.ts. They are now `TEAM_RUN_CONFIG_E2E_AUTOBYTEUS_MODEL_MISSING` and `TEAM_RUN_CREATE_FAILED`, in commit `57d388a7fd`, labelled as a baseline fix.
- `grep -ni "hierarch\|research"` on the file now finds nothing, and no other file referred to those codes. The file passes 7/7 (`CRR004-team-run-config.log`).

## API-REV-004 — merged state
- **Suites:** all pass, except the 2 upstream content-cadence cases, whose product cause is known (`7af116e8de`).
- **This ticket's e2e** (DF, UC, task-closure-root-visibility) passes.
- **Team status:** live TS-001..004 pass, and the new TS-005..007 (task Team delegated by a task Team member, in Agent, Team and Org runs) pass.
- **Baseline fixes:** `99445daefc` (Org disclosure label) and `b34470dd10` (team activity fixture's view).
- **TESTING.md:** `dbf6b0a118` and `7b02d49bae`, "Rerun by impact", at the user's request.
- **Follow-ups:**
  - FU-3: AGY stop refused on a `ps` timeout under load;
  - FU-1: new idle-lifetime symptom;
  - FU-4: REQ-002 question on where an inner task Team is shown;
  - FU-2: unchanged.
- **Desktop:** not repeated on the merge, by agreement with the user; deferred to delivery's user check.

## API-REV-005 — CRR-008 local fixes
- **TR-005.** The ledger's TS-005..007 row and FU-4 now record the cases' history:
  - the original REQ-002 assertion ("the outer Team counts the inner one") and its three failures, "Timed out: inner Team hidden", with evidence;
  - the rewrite to the shown-agents rule while FU-4 is open;
  - the nested-2 TS-006 "tree rows overlap" failure, a probe selector defect (the row matched its own avatar), fixed by the outermost-match filter;
  - that TS-005..007 do not cover "agents its members delegated" until FU-4 is decided, and must assert it if that reading is chosen.
- **TR-006.** The dead `subscribed` fact is removed from the team activity fixture and its scenario wording, in commit `00d6782303` (labelled baseline fix). team-activity-presentation SR006-BR-001..004 pass (`round2/probes/crr008-team-activity-presentation/`).
