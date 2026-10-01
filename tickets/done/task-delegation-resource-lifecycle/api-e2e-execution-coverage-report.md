# API/E2E Execution Coverage Report

## Execution Round Meta

All ticket artifacts are in `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/`.

- Requirements Doc: `requirements-doc.md` (SR-007, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-007)
- Design Spec: `design-spec.md` (SR-007, "SR-007 Tolerant Tree Reading — No Migration" › "Evidence obligations")
- Supplemental Task Artifacts: `solution-handoff.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-005)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-004)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-005, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md` (round 2)
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md` (the "Round 3 → API-REV-002" section, events R3-1 … R3-18)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2 (ledger "Round 3"; an IR-003 run, the ledger's "Round 2", was superseded by SR-007 before it was reported and is historical only)
- Trigger: code_reviewer CRR-005 pass (SR-007, IR-004)
- Basis: `HEAD` `origin/personal@8f57d16d1` plus the uncommitted IR-004 diff. Upstream is now `8c474e37a`; Delivery integrates.
- Prior Round Reviewed: round 1 (API-REV-001, Fail / 90%, AE-001, basis `8bffda045`)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the durable test changes)
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`, updated for SR-007 ("Round 2 (API-REV-002) Basis")
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with these deviations:
  - **Writer not stopped** (design item 4 asks for a stopped writer). The user's live AutoByteus app hosts this agent session. Mitigations:
    - the copy was an APFS clone of `~/.autobyteus/server-data` plus a `sqlite3 .backup` of `production.db`;
    - no root changed during the copy (`r3/roots-changed-during-clone.txt` is empty);
    - every result was compared with the live app through read-only GraphQL only.
  - **Skip-version admission of `team-a`.** It was proven by direct ID (`getTeamRunResumeConfig`), not by listing, because the minimal released-shape fixture has no Team history index (listing needs one).
- Existing coverage decisions revised this round:
  - The shared e2e helper was updated because R-13 removed `schema_version`.
  - LIVE-002 now denies any extra approval request. After the rebase a child may call `get_handoff_rules`, which also waits for approval.
- Reroute required before or during execution: `No`
- Project testing guideline:
  - Guideline: `TESTING.md` at the worktree root. It arrived upstream after round 1; its layer-by-layer compliance table is in the investigation under "`TESTING.md` compliance (round 2)".
  - Guideline paths followed:
    - a worktree build in an isolated desktop instance (`build:electron:mac` plus `isolated-app start --from-worktree`), driven with browser-automation on the reported control port;
    - server, web and Electron main-process tests.
    - `isolated-app list` is empty afterwards.
  - Deviations:
    - **Rule 2 (read-only):** the user's running app answered read-only GraphQL queries as the comparison baseline. The installed-data copy that design item 4 requires was cloned from `~/.autobyteus/server-data`, which was never written.
    - **Real-provider wrapper:** the live suite ran through its `RUN_*` gates rather than the `pnpm test:e2e:real` wrapper.
- Environment:
  - Tests ran under `/tmp/tdrl-api-e2e/senv.sh`, a sanitized `env -i`; the agent shell carries the user's live production env.
  - Standalone servers ran under `env -i HOME USER LOGNAME SHELL LANG PATH TMPDIR`. `USER` and `LOGNAME` are needed for Claude authentication.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Partly`. Events R3-4 … R3-14 were written in one batch after a context compression. Their values are taken from the retained evidence files and the verbatim console output, not from memory.
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: R3-18 (server regression)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- |
| R3-REPO-001 (focused suites, typecheck, build) | Pass | Console | — |
| R3-2 … R3-5 (installed-data copy, standalone) | Pass | `/private/tmp/tdrl-api-e2e/r3/standalone-*`, `new-delegation-standalone.log` | — |
| R3-6 (installed-data copy, desktop) | Pass | `r3/desktop-start.json`, console | — |
| R3-7, R3-8 (real-app UI) | Pass | `r3/shots/new-org-rows.png`, `old-org-rows.png`, `old-team-row.png` | — |
| R3-9 (OBS-002) | Observation, pre-existing | `r3/shots/old-team-first-open.png`, `nuxt-old-team.png` | Recommend a separate ticket |
| R3-10 (live LIVE-001…005) | Pass | `/tmp/tdrl-api-e2e/r3-live.log` | — |
| R3-11 … R3-13 (skip-version chain, both entrypoints) | Pass | `r3/skip-*` | — |
| R3-14 (PROBE-QR002) | Pass | `/tmp/tdrl-api-e2e/r3-probes.log` | — |
| R3-15 (PROBE-C11) | Observation | same | C-11 / OBS-001 residual |
| R3-16 (web regression) | Pass (baseline-equal) | `/tmp/tdrl-api-e2e/r3-web-unit.log` | — |
| R3-18 (server regression) | See "Additional Repository Coverage Execution" | `/tmp/tdrl-api-e2e/r3-repo-003-*.log` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements or design introduce, tolerate, or ambiguously describe backward compatibility in scope: `Yes, explicitly`. REQ-018 requires tolerant reading, and that tolerance is the approved persistence decision, not a legacy branch.
- Compatibility-only or legacy-retention behavior observed in the implementation: `No`. Old trees load with no version branch. Old children simply lack `delegatorAgentRunId`. Records files are never read: they stayed byte-identical, and old runs still load.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`. No migration ran on either entrypoint, and the ledger holds no delegator migration.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| R3-REPO-001 | AC-020, AC-021, design items 1–2, all unit-level ACs | Tolerant reader, exact writer, frozen released migrations | Typecheck, `dist` build, 21 focused files / 160 tests (including `team-run-current-package-schema`, `agent-org-run-execution-tree-tolerance`, `released-run-tree-skip-version-upgrade`) | Durable | Pass | Console |
| R3-10 LIVE-001/004 | AC-001–004, 007, 012, 015; QR-001, QR-003; REQ-017 (Team) | Spawn, idle shutdown and retained-handle wake per runtime; cross-root rejection | Live Team root, children on AutoByteus, Codex and Claude, grace 60 s | Live + Durable | Pass | Grace 60,002 / 60,018 / 60,409 ms; each restored child recalled its packet; cross-root `{accepted:false, code:"TARGET_AGENT_RUN_NOT_ACTIVE"}` |
| R3-10 LIVE-002 | AC-006, AC-015 per runtime | Pending approval counts as work | Live Team root, `write_file` gates | Live + Durable | Pass | Held 90,001 ms with no shutdown and with open work; after approval, shutdown at 60,005 / 60,026 / 60,270 ms |
| R3-10 LIVE-003 | AC-008, 009, 010; REQ-017 (Org) | Task Team shutdown as a whole; wake through its coordinator; nested delegator wake | Live Org root | Live + Durable | Pass | Lead 60,024 ms; planner 60,442 ms; Team restored; grandchild woke the planner |
| R3-10 LIVE-005 | AC-013, AC-014 per runtime | Root stop; reopen; restore of an earlier child | Live Team root | Live + Durable | Pass | All children offline on stop; each runtime restored with its conversation after reopen |
| R3-14 PROBE-QR002 | QR-002, REQ-006 | FIFO wake behind an in-flight real shutdown | In-process live server, held shutdown | Temporary + Durable (DUR-003) | Pass | Order offline 171 < input 174 < reply 421 ms; no early delivery during a further 3,002 ms hold |
| R3-2 … R3-6 | Design item 4; AC-018, AC-020, AC-021; REQ-014/015 | Startup and admission on real installed data; new writes | Standalone `node dist/app.js` and the packaged worktree desktop app, each on its own copy | Real data | Pass | See "Lifecycle / Upgrade / Restart / Persisted-Data Checks" |
| R3-11 … R3-13 | Design item 3 | Released migration chain through current startup | Both entrypoints on a released-shape fixture | Real process, fixture data | Pass | See the same section |
| R3-7, R3-8 | AC-017, R-14, REQ-017 | Members tree on Team and Org roots | Packaged worktree desktop app, browser-automation (attach-only) | Desktop UI | Pass | See "Broader Validation Decision And Execution" |
| R3-15 PROBE-C11 | C-11 / OBS-001 | Per-root FIFO latency during a wake | In-process live server, configured Claude bystander | Temporary | Observation | AutoByteus +5 ms, Codex +667 ms, Claude +2 ms |
| DUR-001 … DUR-005 (round 1) | AC-015, QR-002, AC-019, AC-002 | Unchanged from round 1 | Unit and hermetic e2e | Durable | Pass (inside R3-REPO-001 and R3-18) | — |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile`; `prepare:shared`; Prisma generate; `tsc --noEmit -p tsconfig.build.json`; `dist` build | Worktree / `autobyteus-server-ts`, sanitized | Build basis | Pass | `/tmp/tdrl-api-e2e/r3-install.log`, `r3-shared.log`, `r3-build.log` |
| 2 | `pnpm exec vitest run --no-watch` on 21 focused files | `autobyteus-server-ts`, sanitized | SR-007 unit and admission; lifecycle; my durable cases | Pass (160 tests) | Console |
| 3 | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=60000 CODEX_APP_SERVER_APPROVAL_POLICY=untrusted … vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Same | LIVE-001…005 | Pass (4 tests, 531 s) | `/tmp/tdrl-api-e2e/r3-live.log` |
| 4 | `RUN_R3_WAKE_PROBES=1 … vitest run tests/e2e/runtime/tmp-r3-wake-path.probe.e2e.test.ts` (temporary; deleted after the run) | Same | QR-002, C-11 | Pass (2 tests, 198 s) | `/tmp/tdrl-api-e2e/r3-probes.log` |
| 5 | `NUXT_TEST=true pnpm exec vitest run` | `autobyteus-web`, `env -i` | Web regression | 501 passed / 5 failed / 2 skipped files. The 5 failures are exactly the baseline set (IR-004: 500 / 5): `app-font-size-fixed-px-audit`, `workspace-history-draft-send`, `WorkspaceAgentRunsTreePanel.regressions`, `org-definition-navigation`, `StartupDelayLifecycle` | `/tmp/tdrl-api-e2e/r3-web-unit.log` |
| 7 | `pnpm -C autobyteus-web test:electron --run` (`TESTING.md` layer "Electron main-process tests"; run after the initial handoff) | `autobyteus-web`, `env -i` | Electron main, preload and server manager | Pass: 36 files / 187 tests (1 skipped) | `/tmp/tdrl-api-e2e/r3-electron-main.log` |
| 6 | `/tmp/tdrl-api-e2e/repo-003.sh`: `vitest run tests/unit tests/architecture`, then `tests/integration`, then `tests/e2e` (live suites skip without `RUN_*`) | `autobyteus-server-ts`, sanitized | Server regression | **Pass (0 regressions).** Every failing file is in the round-1 base lists (`/tmp/tdrl-api-e2e/failing-*.txt`, base `8bffda045`). **unit + architecture:** 541 passed / 27 failed files (3,793 / 76 tests), versus IR-004's 539 / 29; one base failure (`codex-app-server-client.test.ts`) is now fixed upstream. **integration:** 51 passed / 17 failed (267 / 46 tests), identical to the base set and IR-004. **e2e:** 54 passed / 11 failed / 27 skipped (188 / 41 tests), identical to the base set and IR-004. `task-delegation-api-surface` (3), `team-task-event-current-contract` (2) and `stopped-org-workspace-graphql` (1) pass | `/tmp/tdrl-api-e2e/r3-repo-003-*.log`, `r3-failing-{unit,integration,e2e}.txt` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | +16 | Every AC is directly proven: AC-020/021 by durable tests plus the real-data checks (version-less writes, old trees admitted unchanged), and AC-017 on both root kinds in the real app | AC-005 and AC-011 are proven in unit/integration tests only (unchanged since round 1, low risk) |
| Changed-boundary execution directness | 75% | 96% | +21 | Real runtimes, real timers, both real startup entrypoints, the real installed data, the real desktop app | QR-002 timing uses a hold seam (by design) |
| Cross-boundary integration realism and mock gap | 70% | 95% | +25 | No doubles in the live cases, the real-data checks or the UI | Codex and Claude from one machine and one account |
| Environment, configuration, identity, and fixture fidelity | 80% | 92% | +12 | The real install (557 Team, 29 Org, 8 tree-less, 662 records), the packaged app, a released-shape skip fixture | The writer was not stopped (no root changed during the copy). The skip-version fixture is minimal and hand-built from released shapes |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | +10 | Approval hold, cross-root rejection, stop and reopen, nested wake, a real shutdown/wake race, repeat startups | C-11 latency is observed, not bounded |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | +20 | The real packaged desktop app on real data: new Team/Org children show "Started by", old children show none, no "Task:" label anywhere | OBS-002 (pre-existing, reproduced on the release) limits browsing more than one old Team run per app session |
| Durable regression coverage quality and relevance | 85% | 94% | +9 | Live suite across three runtimes and both roots; round-1 durable cases; helper kept current; regression suites baseline-equal | The live suite is env-gated (runs only with `RUN_*`) |

- Overall post-repository confidence: 79%
- Overall final confidence: 94.7%
- Calculation method: simple average of the seven categories
- Confidence change produced by broader validation: +16
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No, by 0.3 points`.
  - The gap is environment fidelity (92%). The only material part of it is the stopped-writer condition of design item 4.
  - Closing it would mean stopping the user's running app, which hosts this session and is not owned by this validation. The mitigations already applied are an APFS clone, a `sqlite3 .backup`, and a verified-empty change set during the copy.
  - No further safe surface would raise the score materially. The result is therefore `Pass` with this gap disclosed rather than hidden.
- Confidence-limiting residual risks: the writer was not stopped during the copy; C-11 latency on Codex wakes; OBS-002 (pre-existing).

## Broader Validation Decision And Execution

- Decision and selected execution modes: `Required`. The modes were:
  - Live API across AutoByteus, Codex and Claude on Team and Org roots.
  - Lifecycle checks: stop, reopen, the shutdown/wake race, and repeat startups.
  - Real-data startup through both entrypoints.
  - The skip-version chain through both entrypoints.
  - The real desktop UI.
- Confidence gap addressed:
  - tolerant admission of real old trees with no rewrite;
  - version-less writes on real runtimes;
  - the released-migration chain on current code;
  - "Started by" semantics on real data, per R-14;
  - retained-handle wake per runtime.
- Startup, commands and readiness:
  - **Standalone:** `node dist/app.js --data-dir <copy>/server-data --port P --host 127.0.0.1`. Ready when GraphQL `__typename` answers: 10 s on the first startup and 11 s on the repeat.
  - **Desktop:**
    - `pnpm -C autobyteus-web build:electron:mac` produces the worktree `AutoByteus.app` (in `electron-dist`, gitignored).
    - Start with `pnpm isolated-app start --from-worktree --data-root /private/tmp/tdrl-api-e2e/r3/<root>`; the app is ready when `start` returns `ok` with a backend URL.
    - Repeat startup: `pnpm isolated-app restart <id>`. Stop: `pnpm isolated-app stop <id>`.
    - The installed release was started the same way with `--app /Applications/AutoByteus.app`.
  - **UI driving:** the browser-automation launcher, attach-only (`CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1`), with scripts `r3/ui-rows.js` and `open-old-team.js`. Screenshots are in `r3/shots/`.
- Seed data:
  - The installed-data copies described above.
  - New delegations created by `r3/new-delegation-probe.mjs` (Team; `PROBE_WAKE=1` adds shutdown and wake) and `r3/new-org-delegation-probe.mjs` (Org: direct Agent plus flat Team).
  - The skip-version fixture, built by a temporary seeder spec that was deleted after use.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Org root, new children (desktop app) | Rows for the task Agent and the task Team with "Started by <delegator>"; no "Task:" | "worker / Started by coordinator" (aria "worker, idle, Started by coordinator, /worker, …"); "squad / Started by coordinator"; the task Team's configured member "lead" has no starter (correct: it was not delegated); `Task:` absent | `r3/shots/new-org-rows.png` | Pass |
| Team root, new child | "Started by" shown | "Temporary task agent, worker, level 1, offline, Started by coordinator, /worker" | console | Pass |
| Org root, old children (`nested_classroom_test_team_c9e8…`) | No starter (R-14), no "Task:", standard status | "StudentStudyGroup"; "student one", "student two" (offline); no "Started by"; `Task:` absent | `r3/shots/old-org-rows.png` | Pass |
| Team root, old child (`article_writing_team_f87bc…`) | No starter; the old packet still renders | "Temporary task agent, article_reviewer, level 1, offline, /article_reviewer"; its projection summary "Task delegator address: /article_writer …" | `r3/shots/old-team-row.png` | Pass |
| Open a second old Team run in the same app session | Opens | "Couldn't load activity" (`DataCloneError`); see OBS-002. The installed release 1.4.91-beta.6 behaves identically | `r3/shots/old-team-first-open.png`, `nuxt-old-team.png` | Pre-existing (not this ticket) |

## Desktop Application Validation

- Validation approach: the real packaged worktree desktop app (Electron, embedded server) through `pnpm isolated-app`, each instance on its own disposable data root.
  - It is a real startup entrypoint for design items 3 and 4.
  - It is also the real UI surface for AC-017 / R-14.
- Effect on any already-running desktop application: `None`. The user's AutoByteus app and profile were not stopped, restarted or modified. They received only read-only GraphQL queries: `listCollaborationRootHistory` and member projections, used for comparison.
- Behavior not directly proven: none that the change touches. The shell, preload and IPC are unchanged.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node 22.
- Worktree `AutoByteus.app` 1.4.91-beta.7 (packaged from this worktree); installed release 1.4.91-beta.6 for comparison.
- Codex CLI (app-server) with `gpt-5.4-mini`; Claude Code (Agent SDK) with `haiku`; AutoByteus native on LM Studio.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- **Approved persisted-data decision:** `Directly Usable — No Migration` (SR-007, DEC-008). Task-records files are `Not Affected`: never read and never written.
- **Representative existing data:** the user's real install. Census before startup: 557 Team trees (released v2 shape), 29 Org trees (v1), 8 tree-less roots, 9 task-bearing roots, 662 records files. Hashes were taken of 1,324 files (662 trees plus 662 records).
- **Design item 4, standalone (R3-2 … R3-5):**
  - No migration ran.
  - **All 1,324 tree and records files were byte-identical after startup.**
  - Admission: 204 Team plus 25 Org roots are listed, exactly the same set as the live app. None of the 8 tree-less roots is listed.
  - Old children: the public tree has no `schema_version`, and each old child has `delegator_agent_run_id: null`.
  - 33/33 old child conversation projections are identical to the live app.
  - New Team delegation:
    - the event carries the delegator;
    - the persisted tree has no `schemaVersion`;
    - the child has `delegatorAgentRunId` and no `settledAt`;
    - no records file was written.
  - The new child **shut down after grace, and a later message woke it; it recalled its packet 3,276 ms after the wake**.
  - Repeat startup: the ledger was unchanged and all historic files stayed unchanged.
- **Design item 4, desktop (R3-6):**
  - All 1,324 files were unchanged at startup, and no migration ran.
  - Listing: 204 plus 25 roots, the same set as the live app.
  - A new Team delegation and a new Org delegation (a direct Agent and a flat Team) both wrote version-less trees with `delegatorAgentRunId` and no `settledAt`, and no records file.
- **Design item 3, skip-version chain (R3-11 … R3-13):**
  - The fixture ledger held the 18 released rows before `20260901`.
  - Both entrypoints ran exactly the 4 pending released migrations, one attempt each:
    - `20260901` SUCCEEDED_WITH_WARNINGS;
    - `20260905` SUCCEEDED;
    - `20260924` SUCCEEDED;
    - `20260926` SUCCEEDED_WITH_WARNINGS.
  - The 18 earlier rows were untouched, and no delegator migration exists.
  - Released outputs:
    - `20260901` converted `org-a` from a Team-shaped package into an `agent_orgs` Org package (members `/director`, `/team`; the records file was renamed as released);
    - `20260905` set the Org summary to "Plan the release";
    - `20260926` rewrote the `team-a` context-file locator to the released `/rest/team-runs/…/context-files/…` form.
  - **The `team-a` tree stayed byte-identical.** It still has `schemaVersion: 2`, and its child still has `settledAt`. Tolerant reading needs no rewrite.
  - Admission:
    - `team-a` loads by direct ID, and its old child has no delegator;
    - `no-tree` is not admitted ("Team run execution tree not found");
    - `org-a` is listed.
  - The desktop memory hash set equals the standalone one.
  - A repeat startup on each entrypoint ran nothing: ledger and memory were unchanged.
- **Version-specific runtime branch, dual read/write, or compatibility fallback observed:** `No`.
- **Residual untested persisted-data risk:**
  - The copy was taken with the writer running. No root changed during the copy, so the effect is negligible.
  - The skip fixture is minimal. The released-migration outputs are also covered by the implementation's `released-run-tree-skip-version-upgrade` suite.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Updated in round 2 (LIVE-002 denies extra approval requests from gate children after the planned approval). Round 1 was a full rewrite. IR-004 changed its tree assertions to `not.toHaveProperty("schemaVersion")` | LIVE-001…005: AC-001–010, 012–015, QR-001/003, REQ-017, AC-021 | 4/4 Pass | Gated by `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`; grace 60 s |
| `autobyteus-server-ts/tests/e2e/helpers/team-run-metadata-helpers.ts` | Updated in round 2 (the `schema_version` guard is removed; the tree is recognized by shape) | Test support; R-13 | Used by the live suites | Without this fix, 9 live e2e files silently resolve no members |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/task-delegation-api-surface.e2e.test.ts` | Added in round 1 | AC-019, AC-002 | Pass | Hermetic |
| `autobyteus-server-ts/tests/unit/agent-collaboration/root-task-execution-lifecycle.test.ts` | Updated in round 1 | QR-002 | Pass | |
| `autobyteus-server-ts/tests/unit/agent-team-execution/flat-team-execution-manager-routing.test.ts` | Updated in round 1 | AC-015 (Team) | Pass | |
| `autobyteus-server-ts/tests/unit/agent-org-execution/agent-org-task-idle-shutdown.test.ts` and `helpers/task-publication-handles.ts` | Updated in round 1 | AC-015 (Org) | Pass | |
| `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | Updated in round 1 | AC-019 | Pass | |

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `mixed-task-delegation.e2e.test.ts` › three old scenarios (round 1) | Submit and review tools, task events, `task_id` results | REQ-001–003 | LIVE-001…005 (round 1; unchanged) |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes`. Round 2 updated two paths; the round-1 paths are unchanged and still pass.
- Paths added or updated: the seven rows in "Tests Implemented Or Updated".
- Paths removed: none as files.
- Added or updated paths attached for proportional test-code review: `Yes`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/tmp/tdrl-api-e2e/r3-live.log`, `r3-probes.log`, `r3-web-unit.log`, `r3-repo-003-*.log` | Run logs | Temporary | Evidence |
| `/private/tmp/tdrl-api-e2e/r3/` (`census-before.json`, `trees-records-before.sha256`, `standalone-*`, `skip-*`, `new-*-probe.mjs`, `ui-rows.js`, `open-old-team.js`, `compare-projections.mjs`, `shots/*.png`) | Real-data, skip-chain and UI evidence and scripts | Temporary | The data copies are deleted |
| `/tmp/tdrl-api-e2e/senv.sh` | Sanitized env wrapper | Temporary | Recommended for anyone rerunning server tests from an agent shell |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `tests/e2e/runtime/tmp-r3-wake-path.probe.e2e.test.ts` | Hold a real shutdown open (QR-002); measure bystander latency (C-11) | Pass (2 tests) | Deleted |
| `tests/unit/app-data-migrations/tmp-r3-skip-version-seed.probe.test.ts` | Build the released-shape skip-version fixture | Fixture built | Deleted |
| Standalone servers and 4 isolated desktop instances (`iso-63389-29c8`, `iso-64049-331b`, `iso-64143-b2ee`, `iso-64292-60ec`) | Real entrypoints | See above | Stopped (the desktop instances via `pnpm isolated-app stop`) |
| Packaged worktree app in `autobyteus-web/electron-dist` and the rebuilt server `dist` | Real entrypoints on current code | Built from the current source | Retained (gitignored build output) |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Shutdown timing in PROBE-QR002 | `vi.spyOn(TaskAgentExecutionRegistry.prototype, "tryShutDownIfQuiet")` delays the real shutdown | A real race window is milliseconds wide | The seam only delays; the real shutdown and restore run |
| None in the live cases, the real-data checks or the UI | — | — | — |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R3-REPO-001, R3-2 … R3-8, R3-10 … R3-14, R3-16, R3-18 | See the evidence matrix |
| Observation | R3-15 (C-11 / OBS-001), R3-9 (OBS-002) | Not failures of this ticket; see the notes |
| Fail | none | — |

### Prior failure AE-001: resolved

On an Org root, delegated rows now show "Started by <delegator>" for children that carry a delegator. None shows a "Task:" label. Children without a delegator show no starter, per R-14. It was first fixed in CR-003 (IR-003) and re-verified on the SR-007 basis in the real desktop app (R3-7, R3-8).

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Live e2e runs, definitions, temp app data and workspaces | Owned (test) | `afterEach` / `afterAll` | Done |
| Temporary probe and seeder specs | Owned | Deleted | Done |
| Standalone servers | Owned | Killed by their own PIDs | Done |
| Isolated desktop instances (4) | Owned | `pnpm isolated-app stop <id>` | Done |
| Data copies `desktop-root`, `standalone-root`, `release-root`, `fresh-root` (8.5 GB each), `skip-seed`, `skip-standalone`, `skip-desktop` | Owned | Deleted; evidence files kept | Done |
| The user's AutoByteus app, profile, runtime processes and other worktrees | Not owned | Untouched (read-only GraphQL only) | — |

## Preliminary Classification

- None (Pass).

## Recommended Recipient

`/code_reviewer`, for proportional test-code review of the durable test changes (per `get_handoff_rules`).

## Evidence / Notes

- **OBS-001 / C-11 (latency; residual; not a correctness issue).**
  - Every exact delivery and operator post queues on the per-root FIFO (`withLiveLease` → `acquireLiveLease`). A message to an unrelated configured member therefore waits behind a wake's restore.
  - Measured bystander delay during a wake: AutoByteus +5 ms, Codex **+667 ms**, Claude +2 ms. In the superseded IR-003 round, Codex was +134 ms, so the delay follows Codex thread-resume time.
  - No loss or reordering was seen beyond FIFO. A slow provider restore stalls messaging in that one root for its duration.
- **OBS-002 (pre-existing upstream defect; not this ticket; recommend a separate ticket).**
  - Symptom: in the desktop app, opening a second old Team run in an already-loaded workspace fails. It shows "Couldn't load activity" or "Couldn't load task activity", with `DataCloneError: Failed to execute 'structuredClone' on 'Window'` logged as "Failed to open team" or "Failed to open team member run".
  - Cause: a Vue reactive workspace-metadata proxy (`workspaceId`, `workspaceRootPath`, `displayName`, `kind`) is passed to `structuredClone` at `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts:55`.
  - Scope: the installed release 1.4.91-beta.6 reproduces it identically. The ticket leaves that line unchanged, and those files have no commits since beta.6.
  - Effect: after one old run is opened, other old runs fail to load until the app restarts.
- **Stale durable tests, pre-existing and out of scope:** `hierarchical-team-run-config-graphql.e2e.test.ts` and `team-run-v1-production-upgrade.e2e.test.ts` already fail at base and need an owner.
- **Agent-shell hazard:** the agent shell inherits the user's live AutoByteus production env (`DATABASE_URL`, `AUTOBYTEUS_MEMORY_DIR`, …). Run server tests only through a sanitized env.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 94.7%
- Default `95%` confidence target met: `No, by 0.3 points`. The only material gap is the stopped-writer condition, which cannot be closed without stopping the user's running app; see the scorecard.
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` (executed)
- Critical acceptance criteria lacking direct proof: none
- Next recipient from `get_handoff_rules`: `/code_reviewer` (proportional test-code review)
- Notes:
  - All five SR-007 evidence obligations (design items 1–5) and the CRR-005 checklist passed on the IR-004 basis.
  - AE-001 is resolved.
  - Residual observations: C-11/OBS-001 latency and OBS-002 (pre-existing).
  - The writer was not stopped during the copy; no root changed during it.
