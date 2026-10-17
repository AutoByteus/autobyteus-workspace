# API/E2E Execution Coverage Report — `delegated-copy-own-run-memory`

## Execution Round Meta
**Round 1 / API-REV-001 / Pass / 93%.**
- Trigger: CRR-002 Pass (9.3/10).
- Commits under test: `8bbd081c8d`, `5a5359e707`, `6bcb206e4e`, `2f7f5b3f4b` (HEAD), base `origin/personal` `66429d6f31`. Not merged or pushed.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory`, branch `codex/delegated-copy-own-run-memory`.
- Authorities read:
  - requirements-doc (SR-005 basis, SR-009) and memory-layout-contract (governs);
  - design-spec, design-review-report, ARCH-REV-004;
  - implementation-handoff and implementation-revision-record (IR-002);
  - code-review-report and code-review-revision-record (CRR-002).
- Current validation artifacts: api-e2e-coverage-investigation.md, api-e2e-test-case-ledger.md, this report, api-e2e-revision-record.md.
- Evidence folder: `tickets/in-progress/delegated-copy-own-run-memory/evidence/api-e2e/`.

## Routing Classification
- Large / High; Reviewed input. Successful route: Code Review, for a proportional test-code review of the durable test changes below. They are uncommitted.

## Execution Basis
- Rules followed:
  - TESTING.md: clean env for e2e; rule 9, a cause for every failure; "Rerun by impact" (first round, so the whole relevant set ran);
  - serialized vitest runs per worktree;
  - isolated desktop instances on owned data roots;
  - credentials imported only through `pnpm secrets:import`.
- **Process note.** My first integration run (R3) is invalid. A TAU run I started at the same time had a vitest global setup that reset the shared test DB `tests/.tmp/autobyteus-server-test.db`, which corrupted it ("database disk image is malformed"). The DB was deleted (the setup rebuilds it) and integration rerun alone (R3c). Every later run was serialized.

## Acceptance-Criteria Proof
| AC | Proven by | Evidence | Result |
| --- | --- | --- | --- |
| AC-001 / AC-002 / AC-003 | Unit stores and placement tests (R2). Whole e2e: real roots delegating Agent and Team copies, where the own-file layout was exercised by the projects suites (R6/R6a/R6b). DJ-2: own files written for every migrated task agent | R2-unit.log, R6-e2e-all.log, desktop/after-files.json | Proven |
| AC-004 | DJ-4: a migrated copy of a **real released install** woke on a message and answered from its pre-upgrade conversation; its traces grew in its own folder. Plus `task-copy-idle-lifetime` and the scripted e2e (R6) for new copies | desktop/branch-05-reviewer-woken-token.png | Proven |
| AC-005 / G1 / G2 | TAU-1: restoring a migrated task agent as a user-started run is refused ("was not found"; team: "not an admitted current package"); the standalone context-file route answers 404. DJ-6/DJ-7: a detached copy is not restorable | TAU-run9.log | Proven |
| AC-006 / REQ-008 | DJ-3: sidebar, every run's task-agent list, file changes, history and Token Meter summary **identical** before and after the real upgrade; the copy opens with full conversation and Files. TAU-1: the moved context file is served through the hub link | desktop/before-views.json, after-views.json, TAU-run9.log | Proven |
| AC-007 | R6a: `task-reactivation-root-visibility` (DONE → reopen → reactivation; resumes the exact conversation id now stored in the worker's own file) | R6b-three-files.log | Proven (new copies) |
| AC-008 / AC-011 / QR-001 | TAU-1 (hand-built every-shape data, faithful ledger): every task agent at L1 with identical bytes. DJ-2 (real released install): migration SUCCEEDED "migrated 6", **15/15 task-agent files byte-identical**, only the 3 coordinating trees changed, coordinating logs unchanged | TAU-run9.log, desktop/before-files.json, after-files.json, migration log | Proven |
| AC-009 | Unit (implementer): interruption at every step, F-RERUN | R2-unit.log | Proven (unit) |
| AC-010 | TAU-2 (built server): a coordinating run's move fails ("5 task agent item(s) are not migrated yet; the next start continues."); the app works; the user changes a migrated copy's model; the next start completes with identical bytes and keeps the edit | TAU-run9.log | Proven |
| AC-012 | TAU-3 (built server) and DJ-6 (desktop): only the hub folder removed; the copies' files byte-identical; not listed or restored; the confirmation reads "Its task agents' memory is kept."; delete refused while active, as before | branch-08-delete-confirm.png, before/after-delete-files.json | Proven |
| AC-013 | TAU-1, DJ-5: the agent copy is listed under its definition (`DEFINITION`, `code-reviewer`) and its memory view opens; detached copies are not listed | branch-06-memory-view.png | Proven (label observation below) |
| AC-014 / AC-015 | Unit message-log tests (R2). DJ-2: coordinating logs byte-identical, each copy has its own log | R2-unit.log, desktop/after-files.json | Proven |
| AC-016 | The real-app journey DJ-0..DJ-7 (below) | desktop/ | Proven |
| AC-017 / AC-021 / AC-024 | Unit (implementer) | R2-unit.log | Proven (unit) |
| AC-018 | e2e memory-sync-api plus unit `memory-sync-task-agent-layout` | R6-e2e-all.log | Proven |
| AC-019 | Impact inventory reviewed. **Gap found:** two `projects` e2e tests still encoded the old layout (R6a, R6b), missed because the implementer's full e2e run had the scripted-runtime gate off (78 files skipped). Both updated here | R6b-three-files.log | Proven after the updates |
| AC-020 | Collaborators-v1 pending + ours end to end (`collaborators-to-delegated-runs-startup`, pass). The per-run predecessor gate (unit F-PENDING-FAILED). **The locator-v1 pending sub-case is not tested, by the user's decision** (see Residual) | R6-e2e-all.log | Partly proven; the sub-case is open |
| AC-023 | Typecheck clean; persistence suites green | R1, R2 | Proven |

## Changed Boundary And Evidence Matrix
| Case | Result | Command / evidence |
| --- | --- | --- |
| B0 build | Pass | install, prebuild, server build, nuxt prepare, integration prepare; B0*.log |
| R0 contracts | Pass 16/27/18 | R0-*.log |
| R1 typecheck | Pass | R1-typecheck.log |
| R2 server unit | Pass, 5775 | R2-unit.log |
| R3c integration (alone) | 392 pass. 2 `agent-status-websocket` (the product defect, Task 4577620f). 1 `package-auto-refresh` AC-012: a 5 s product bound missed at load average 186 from other processes; passes alone 14/14 twice | R3c, R3d logs |
| R5 web, guards | Pass, 4444 | R5-*.log |
| R6 whole server e2e (clean env, scripted AGY on) | 105 pass. 5 baseline failures fixed upstream by `ec934ca753` (labelled commits name each test-side cause). terminal-websocket-lifecycle in Task 0c7efc37. R6a/R6b stale tests updated. R6c load against the 5 s bound | R6-e2e-all.log, R6b-three-files.log |
| TAU-1..3 new built-server e2e | Pass 3/3 | TAU-run9.log |
| DJ-0..7 desktop upgrade | Pass | desktop/ |

## Broader Validation: the desktop upgrade journey (AC-016)
- **Source data:** made by the **released app** (branch base `66429d6f31`, built in its own worktree) through real use, on an owned data root:
  - Hub Assistant (Claude Agent SDK Haiku 5.5) delegated `/code_reviewer`, which wrote `review-notes.md`, and `/research_squad`, whose lead delegated `/build_crew`;
  - Forest Team (Haiku): its lead delegated `/research_squad`;
  - Studio Org (AutoByteus deepseek-v4-flash): its manager delegated the mounted team's copy, whose lead delegated `/build_crew`.
- **Before the upgrade:** the released layout confirmed on disk, 32 files, and a real ledger of 25 migrations without ours. Credentials came from `pnpm secrets:import`.
- **Upgrade:** the branch app started on the same data root.
  - The migration **SUCCEEDED: "Scanned 3; migrated 6; skipped 0; failed 0."**
  - 15/15 task-agent files byte-identical at their own folders, none left behind.
  - The hub tree's entries are pure links (address, run id, delegator, startedAt).
- **Views:** identical to the released app's (task-agent lists, file changes, history, Token Meter summary, sidebar).
- **Settings:** the delegated copies list is the same. The code reviewer's model was changed to claude-sonnet-5-5 and stored in `taskAgent.userLaunchSelection` of its own `run_metadata.json`, not in the hub tree.
- **Wake:** a message woke the migrated copy. It answered from its pre-upgrade conversation on claude-sonnet-5-5, writing to its own folder.
- **Memory page:** the copy is listed under its definition and its memory view opens.
- **Delete:** refused while the hub was active. After stopping the hub, the confirmation said "Its task agents' memory is kept."; only the hub's 5 files were removed, and the copies' 13 files stayed identical, unlisted and not restorable.
- **Second start:** the ledger is unchanged and 0 files changed.

## Confidence Scorecard
| Category | Score | Basis |
| --- | --- | --- |
| Requirement and AC proof | 90% | every AC proven, except the AC-020 locator-pending sub-case (user decision) |
| Changed-boundary directness | 95% | built server, real released install, real runtimes |
| Cross-boundary realism | 95% | released app → branch app on one data root, real ledger, real sessions |
| Environment / fixture fidelity | 95% | faithful ledger built from this build; data written by the released build; never user data |
| Failure / edge / lifecycle | 95% | a step fails and the next start recovers; interruption (unit); delete while active refused; second start |
| User / desktop | 95% | the full AC-016 journey on the real app |
| Durable regression quality | 90% | 1 new e2e file and 2 updated e2e files, pending test-code review |

Overall **about 93%**. The bounded gap is AC-020's locator-pending sub-case, which the user decided not to build (see Residual).

## Durable Coverage Changes (uncommitted, for test-code review)
| Path | Change | Result |
| --- | --- | --- |
| autobyteus-server-ts/tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts | Added: TAU-1..3 on a faithful upgrade (built server) | 3/3 |
| autobyteus-server-ts/tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts | Updated: the resumed conversation id is now in the worker's own `run_metadata.json` (REQ-004, §3.1) | 6/6 + 1 skipped |
| autobyteus-server-ts/tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts | Updated: the "pre-change record" simulation also strips `taskAgent.launchSource` in a task team's own tree (§3.2) | 3/3 |

No production code changed in this stage.

## Residual Risks, Observations And Follow-ups
1. **AC-020 sub-case not tested, by the user's decision (2026-10-17); since closed by DEC-017 (verified by composition, no test needed).** The case is `20260926_team_context_file_execution_locators_v1` still pending together with ours. Building it needs hand-built data in the exact shape of a release before 2026-09-26, valid for every later migration in the chain; that's about an hour, for a path only users skipping every release since late September meet. **Scope question for the Solution Designer:** how far back must upgrades be supported (REQ-017 "any supported earlier release")? Either narrow REQ-017 or add this as a follow-up test.
2. **Observation (low), Memory page label; now DEC-018 / CR-004 (show the definition's name), with the implementation engineer. TAU-1's listing is rerun after the CR-004 source review.** An agent task agent's group shows the definition **id** (`code-reviewer`), not its name ("Code Reviewer"). The label comes from the run's history index row (`agent-memory-explorer-service.ts:134-142`), which task agents never have (G1). AC-013 is met; suggested fix: resolve the name from the agent definition when there's no history row.
3. **AC-019 process gap.** The impact inventory missed 2 gated e2e tests because the scripted-runtime gate was off in the implementer's full run (78 files skipped). Both are updated here.
4. **Load-sensitive product time bounds.** package-auto-refresh AC-012 and agent-package-definitions-live-refresh DCF-E2E-007 miss their 5 s bounds when the machine is under heavy load from other processes, and pass alone. Not this ticket.
5. **Baseline failures fixed upstream** (`ec934ca753`); terminal-websocket-lifecycle in Task 0c7efc37; agent-status-websocket in Task 4577620f.

## Cleanup
- Both isolated instances (released and branch) stopped. Their data root, holding a test vault with the imported credentials, deleted. No instance of mine remains.
- A database copy briefly made into the evidence folder (it contained the encrypted vault) was deleted at once; no `.db` file is in the evidence.
- The released-base worktree `dcm-released-base` removed.
- Temporary HOMEs removed.
- Copied logs checked for key-like strings: none.
- Nothing touched the user's app or `~/.autobyteus`, except reading `.env` for the vault import.

## Latest Authoritative Result
**Pass, about 93%, Large/High, broader validation completed.** It goes to code review for a proportional test-code review. This is not Delivery Completed.

## Round 2 — CR-004 (DEC-018), API-REV-003, Pass, 94%
- **Rerun by impact from `2f7f5b3f4b`** (diff: `agent-memory-explorer-service.ts` and its unit test):
  - typecheck clean; server rebuilt;
  - `tests/unit/agent-memory`: 16 files, 112 tests;
  - Memory GraphQL e2e pass;
  - TAU file 3/3.
- **DEC-018 proven on the built server (TAU-1, updated):**
  - a group only task agents form shows the definition's name ("Code Reviewer");
  - with no definition, it shows the id (`helper`);
  - a search by the name finds the group.
- **DEC-017** closes the AC-020 locator-pending sub-case.
- **Durable change for review:** the TAU-1 Memory page assertions in `autobyteus-server-ts/tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` (uncommitted).

## Round 3 — merged state (CRR-009), API-REV-004, Pass, 94%
- **Rerun by impact** from `3e3a7b08cc`: a new startup migration (a shared foundation), so the full server set:
  - typecheck clean; unit 5842; integration 393 (plus the 2 known `agent-status-websocket` cases);
  - web 4473; guards pass;
  - whole e2e 112 files pass, including TAU 3/3 on a faithful ledger of the merged build, task-reactivation, delegated-launch-config-defaults and the collaborators F-PENDING path.
- **Still valid:** contracts (unchanged) and the desktop journey (merge without conflicts; our migration unchanged and still registered last).
- **e2e failures:** terminal-websocket-lifecycle (autobyteus-59). UC-2 of standalone-unreadable-tree-containment was a race in my test: it took the agent-tools MCP host's earlier "Server listening at" URL. Fixed as baseline fix `004a3a965b`, 3/3 in a row.
- **Durable change for review:** `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` (commit `004a3a965b`).
