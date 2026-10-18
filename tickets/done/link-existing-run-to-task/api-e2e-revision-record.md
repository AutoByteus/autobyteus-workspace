# API/E2E Revision Record — `link-existing-run-to-task`

## API-REV-001 — Round 1 (trigger: CRR-002 Pass)
- **Commits validated:** `ef807beb6d`, `4b0986363c` (base `2f211340ee`).
- **Result:** Fail. F-001 (High, product): an adopted team's token-usage summary still names its old Team root, and the PM's Agent root fail-stops. F-002 (Medium): the sidebar keeps the adopted runs in their own groups. F-003 (Low): wording.
- **Durable coverage added (uncommitted):**
  - `tests/e2e/projects/hand-started-run-adoption.e2e.test.ts`: ADO-1..ADO-3 pass; ADO-4 fails, reproducing F-001;
  - `tests/e2e/helpers/collaboration-root-harness.ts`: `startRoot` workspace option, `release`.
- **Test-side issues resolved:**
  - TR-001: HOLD_TURN terminate hang, which predates this ticket (FU-1);
  - TR-002: ADO-4 at first did not exercise the defect;
  - TR-003: the terminal e2e failed on an unresolved temp `HOME`; TESTING.md updated.
- **Whole e2e:** 113 passed, 47 skipped; the only failures are ADO-4 (F-001) and TR-003.
- **Desktop:** isolated branch build, PM on Haiku 5.5 (Claude Agent SDK), workers on DeepSeek V4 Flash (AutoByteus); F-001 found there.
- **Rerun plan after the fix (by impact):**
  - Rerun:
    - ADO-1..ADO-4;
    - the e2e suites over token usage and collaboration roots (`tests/e2e/projects/`, `tests/e2e/runtime/token-usage*`, collaboration-prompt suites);
    - unit and integration if the fix touches shared token-usage or root code;
    - D-1 on a new build: adoption of a team and an agent run, the sidebar (F-002), DONE and reopen.
  - Still valid unless the fix touches their areas: web, guards, the rest of e2e.

## API-REV-002 — Round 2 (trigger: CRR-004 Pass, `f5001b65c6`)
- **Result:** Fail on F-002 only. F-001 and F-003 are verified fixed: ADO-4 passes with its control, and a real-app session with Haiku 5.5 and DeepSeek V4 Flash shows no rejection or fail-stop.
- **Reruns by impact:**
  - typecheck, unit (5883 tests) and integration (known defect only);
  - 48 e2e files over token usage and Task flows: 36 passed, 12 skipped, 0 failed;
  - D-1b.
  - Still valid: web, guards, the rest of e2e.
- **Real app:** adoption, work and reporting, board, DONE and reopen pass for an agent run and a team run.
- **F-002 characterized:** renderer run contexts (`agentContexts.runs`, `agentTeamContexts.teams`) keep a duplicate own-group row after adoption until the app restarts; a history read does not remove it.
- **Correction:** round 1's "after a full reload" withdrawn, since `location.reload()` is blocked by the app.
- **No test-code changes this round.**
- **Next round (after an F-002 fix in the renderer):**
  - rerun web (nuxt tests, guards);
  - rerun D-1 for the sidebar: adopt a run the user opened this session, check its own-group row leaves; DONE and reopen;
  - the server side stays valid unless touched.

## API-REV-003 — Round 3 (trigger: CRR-006 Pass, `fbc0f805bf`)
- **Result:** Pass. F-002 is fixed and verified on the real app:
  - rule 1 (PM open) is immediate;
  - rule 2 (PM not open) acts at the next history read, within about 5 s;
  - DONE and reopen keep each run only under the PM;
  - a run that merely fell out of the newest-6 window stays shown.
- **Reruns by impact:** web (632 files) and guards pass. The server side and ADO-1..4 are still valid from round 2, since no server source changed.
- **No test-code changes this round.** The durable changes for review are unchanged: the ADO file, the harness options, the TESTING.md temp-HOME rule.

## API-REV-004 — Round 4 (trigger: CRR-007 Fail, Local Fix)
- **TR-001:** the test file's header now lists ADO-4, and its Run line follows the resolved temp-HOME rule.
- **TR-002:** ADO-3 waits for the busy turn to start (its `CALL_TOOLS:` message recorded) instead of sleeping 2 s.
- **Rerun:** ADO-3 alone, Pass.
- **Result:** Pass. No product change; the verdict of round 3 stands.

## Revision Index (from API-REV-005; earlier entries above use the previous format)

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-005 | implementation_engineer, `implementation-handoff.md` IR-005, round 5 | SR-018, IR-005, CRR-009 (record only) | API-REV-004: Pass (adoption, later withdrawn) | Pass / 95% |
| API-REV-006 | implementation_engineer, IR-006 (DR-004 Local Fix), round 6 | SR-018, IR-006, DR-004 | API-REV-005: Pass / 95% | Pass / 95% |

### API-REV-005 — Withdraw adoption validated (SR-018)

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md` (IR-005), round 5.
- Triggering finding or case IDs: N/A (removal requested by the user).
- Related revision IDs: SR-018, IR-005; CRR-009 (an independent source review, Pass, record only).
- Why recorded: the first validation of the withdrawal. The adoption plan of API-REV-001..004 is superseded.
- Coverage decisions or durable test paths changed:
  - added `tests/e2e/projects/hand-started-run-refusal.e2e.test.ts` (WDR-1);
  - the ADO file is removed (by the implementation);
  - baseline fix `43aa0bcb36` updates three stale e2e tests from earlier tickets.
- Cases added, changed, removed, or rechecked:
  - WDR-R01..R10 reused (IMP-01..IMP-10, same commit);
  - WDR-1 and WDR-2 added;
  - WDR-3..WDR-5 desktop journeys added.
- Commands, environment, fixture, or broader-validation delta: the whole server e2e with the gate on (clean env, resolved `HOME`); an isolated branch build with real models (Haiku 5.5, DeepSeek V4 Flash); a temporary base worktree to classify failures.

#### Prior Failure Resolution

None. The adoption rounds ended at Pass; FU-1/FU-2 (AGY terminate during a held turn) stays with the Project Task Manager.

- Canonical artifacts and sections updated: the coverage investigation (rewritten for SR-018), the execution report (rewritten for SR-018), `api-e2e-test-progress.md` (new), this entry. `api-e2e-validation-ledger.md` is the adoption rounds' ledger, kept as the record; the report's Cases table replaces it.
- Prior result and confidence: API-REV-004 Pass.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: None in scope. Three stale tests from earlier tickets were fixed (baseline fix).
- Recommended owner: delivery.
- Remaining risks, blocked evidence, or untested scope:
  - kept fix 2 on legacy mixed-root data is unit-proven only (IMP-08);
  - RM-004 and RM-005 belong to delivery.

### API-REV-006 — Re-validation after merging project-task-semantic-search (DR-004 Local Fix)

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md` IR-006, round 6. Delivery DR-004 had found the new `origin/personal` (semantic search) conflicting with the withdrawal.
- Triggering finding or case IDs: DR-004 (integration conflict in `project-service.ts` / `project-task-service.ts`).
- Related revision IDs: SR-018, IR-006, DR-004.
- Why recorded: the merge `a130f4a86f` changed shared foundations (`package.json`, lockfile, GraphQL schema), so TESTING.md rule 4 makes every case Rerun.
- Coverage decisions or durable test paths changed: none this round.
- Cases added, changed, removed, or rechecked:
  - WDR-R11..R15 reused (IMP-11..IMP-15, same commit);
  - WDR-2 rerun (whole e2e: 119 passed, 49 skipped, 0 failed);
  - WDR-3, WDR-4, WDR-5 rerun on a new build;
  - WDR-6 added (deleting a DONE Task with a copy, a never-assigned Task, and the Project on the real app).
- Commands, environment, fixture, or broader-validation delta: a new isolated build of `d95425d711`; otherwise as round 5.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| DR-004 integration conflict (adoption hooks in semantic search's delete paths) | Local Fix (implementation) | resolved in IR-006 by keeping the search cleanup and dropping the adoption hooks | WDR-6, WDR-R14, WDR-2 |

- Canonical artifacts and sections updated: the investigation's "Round 6 Plan"; the report's "Round 6" section and Latest Authoritative Result; the progress log; this entry.
- Prior result and confidence: Pass, 95%.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: None.
- Recommended owner: delivery.
- Remaining risks, blocked evidence, or untested scope:
  - kept fix 2 on legacy mixed-root data is unit-proven only;
  - RM-004 and RM-005 belong to delivery.
- Process note: WDR-6's first attempt failed on my own shell quoting (no product effect). It was redone with a small Python driver, and both attempts are kept.
