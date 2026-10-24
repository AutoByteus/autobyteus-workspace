# API/E2E Coverage Investigation — test-and-tooling-hygiene (autobyteus-253)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/test-and-tooling-hygiene/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/test-and-tooling-hygiene/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/test-and-tooling-hygiene/solution-revision-record.md` (SR-001, SR-002)
- Design Spec (required on every route): `tickets/in-progress/test-and-tooling-hygiene/design-spec.md` (SR-002, Ready; classification `Medium` / `Low`)
- Supplemental Task Artifacts: `evidence/` (SD-* reproductions and probes; IMP-* implementation evidence), `follow-ups.md` (FU-001, FU-002)
- Design Review Report: `N/A — not applicable` (architecture review not selected, direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/test-and-tooling-hygiene/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/test-and-tooling-hygiene/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct `Medium` / `Low` route, no source review)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation engineer's handoff (IR-001), direct route, head `959b5cc048`, code final `af81b3d7d2`
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

All paths are relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene` (branch `codex/test-and-tooling-hygiene`).

## Current Requirement And Design Basis

Thirteen items (W-01…W-13; W-14 is `autobyteus-220`, nothing built). One product behavior change (BEH-001): the agent package folder watcher asks the reloader for a quiet re-read (`reconcilePackageFolder`) 300 ms after a watch arms and after any definition folder is added or removed; SR-002 adds a self-check to that catch-up (presence check, then compare the allow-listed directories on disk with chokidar's `getWatched()` and re-arm quietly once per set of unwatched folders). The reloader expands the reconcile like a package change but publishes only real changes. One shared-foundation change (BEH-002): `type-graphql` 2.0.0-rc.3 → rc.4 (lockfile), which TESTING.md "Rerun by impact" rule 4 says reruns everything, including the server E2E folder the implementation did not run. The rest (BEH-003) are test/tooling fixes whose acceptance criteria are each item's own check. AC-016 (clean clone of the finalized `origin/personal`) belongs to delivery.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (files written in quick succession under a registered package folder, and an import followed at once by writes), SCN-002 (a test process builds the schema twice), SCN-003 (engineers run the suites and harness commands).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-001a: a package registered through a path with a symlinked prefix (macOS `os.tmpdir()` gives `/var/...`, real path `/private/var/...`; a user may import `~/...` through a symlinked folder) — the coverage self-check must not see its own watch as "unwatched" and re-arm or warn on every catch-up. Trigger: the watcher armed on such a root, real chokidar.
  - SCN-001b: a realistic package layout (nested team-local agents, an Org folder, `skills/`, `_`-prefixed and hidden folders) — the self-check finds nothing to repair. Trigger: arming on that layout, real chokidar.
  - SCN-001c: chokidar really does not hold a definition folder that exists on disk (the state IMP-02a found after a lost `addDir`) — the catch-up re-arms once, quietly, and a later edit inside that folder is reported. Trigger: real chokidar whose first watch is made to miss the folder.
  - SCN-002a: the whole server E2E folder exercises every GraphQL resolver family on rc.4 (production builds once per process), and the schema the server builds is the same text on rc.3 and rc.4 (design escalation trigger "rc.4 changes any generated schema").
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 watcher catch-up + reloader quiet reconcile (W-02) | Added | design DS-001/DS-002, SR-002 addendum; IMP-02, IMP-02c, IMP-02d | Unit (fakes) reused; real-chokidar self-check probe added (SCN-001a…c); AC-004 loops rerun on the final watcher code |
| BEH-001 preserved: no frame for unchanged package, skills unwatched, FOLDER_MISSING/UNAVAILABLE | Preserved | requirements BEH-001 preserved column | Integration AC-006/AC-007/AC-011/AC-012, E2E DCF-E2E-002/003 (inside the loops and the E2E folder) |
| BEH-002 `type-graphql` rc.4 (W-03) | Changed (dependency) | DEC-004, IMP-03 | Whole server E2E folder; schema text diff rc.3 vs rc.4 probe; frozen-lockfile install in a clean clone |
| BEH-003 W-01 architecture allow-list | Changed (test) | DEC-001 | Reused IMP-S; negative mutation (temporary extra caller must fail the guard) |
| BEH-003 W-04…W-13 | Changed (tests, harness, docs, one service teardown) | OBS-T2…T10 | Reused IMP-* where the files are unchanged since; cheap static checks rerun |
| Removed: dead prompt-engineering tests, memoizing mock, watch-start sleeps, `shouldSkipOnConnectionError` | Removed | design Removal Plan | Verify removal (find/grep) and that the suites stay green without them |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | watcher, layout listing, reloader | watcher/reloader unit tests (fake watch), integration test with real chokidar | real chokidar `getWatched()` key form vs the listing (symlinked prefix); real repair path | Temporary real-chokidar probe (API-14) |
| API / transport / contract | Yes | GraphQL schema build (type-graphql rc.4); `/ws/agent-package-definitions` frames | update-notifications E2E, DCF E2E | every other resolver family under rc.4 | Whole server E2E folder (API-10); SDL diff (API-11) |
| Frontend component / state | Yes (service only) | `FileExplorerStreamingService.disconnect()` | spec with mock socket, red/green (IMP-14) | none material (no UI) | None |
| Browser integration / user journey | No | — | — | — | None |
| Authentication / session / permissions | No | — | — | — | None |
| Desktop renderer / web-equivalent UI | No | — | — | — | None |
| Desktop shell / Electron-specific integration | Yes (harness build step) | `electronE2ELaunchPreparation.mjs` build script | node tests; real macOS harness run IMP-08b | none (real run done on final code) | Reuse IMP-08b |
| Process / lifecycle | Yes | watcher timers, re-arm, close | unit tests with fake clock | — | — |
| Persisted-data transition | No | `Not Affected` (design) | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | OS FSEvents via chokidar; LM Studio | loops under load; LM Studio live/closed port | OS event loss is statistical | 40-run loops on final code (API-15) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene`
- Project type and runtime stack: pnpm monorepo; Node 22.23.1, pnpm 10.28.2; server TypeScript (Fastify, type-graphql, Prisma, vitest 4), web Nuxt/Electron; macOS arm64, 10 cores
- Project testing guideline path(s): `/TESTING.md` (root; no closer `TESTING*.md` under the changed packages)
- Conflicting, missing, or unclear project instructions: none. Note: the host is shared and already heavily loaded by other work (load average ~150 on 10 cores at start); timing-sensitive cases are run serialized, the AC-004 loops with the required 2 x ncpu extra load.
- Required environment variables or secrets available: `N/A` (no provider calls; LM Studio closed-port case needs none)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/TESTING.md` | Global testing guideline | Layers and commands; "Rerun by impact" rule 4 (lockfile change → rerun everything); clean env for E2E and `autobyteus-ts` integration (`env -i PATH HOME=<resolved temp> TMPDIR`); serialize builds; Rule 9 (cause before any classification); one local model at a time |
| `/AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/README.md#tests` | Package instructions | `test:integration:prepare` before integration and dist-using E2E; `vitest run <file> --no-watch` |
| `/package.json` | Root scripts | `test:e2e` = `pnpm --filter autobyteus-server-ts test --run tests/e2e` |
| `autobyteus-server-ts/vitest.config.ts` | Runner config | `pool: forks`, `fileParallelism: false`; setup isolation scrubs unit/integration env only |
| `autobyteus-server-ts/tests/setup/test-environment-isolation.ts` | Env isolation | E2E keeps inherited env (so run it with `env -i`) |
| design spec "Guidance For Implementation" | Loop recipe | `NC=$(sysctl -n hw.ncpu)`; `2*NC` x `yes >/dev/null`; `pkill yes` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build + SDK dists | worktree | `pnpm -C autobyteus-server-ts test:integration:prepare` | ~25 s | `Integration test prerequisites are present.` | build output is untracked |
| Test-owned servers (E2E) | `autobyteus-server-ts` | started by each E2E file | own temp data roots and ports | file passes | each file closes its server; temp HOME under `/tmp/api253` removed at end |
| Clean clone (AC-016 pre-check on the branch) | `/tmp/api253/clone` | `git clone` of the branch head, `pnpm install --frozen-lockfile`, `prebuild`, `nuxt prepare`, `test:integration:prepare` | heavy | install rc 0 | `rm -rf` the clone |
| `yes` load | — | `2*ncpu` x `yes >/dev/null &` | only during API-15 | `pgrep -c yes` | kill only the PIDs this run started |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Package folders for watcher probes | test-made temp folders (`mkdtemp`) | never the user's `~/.autobyteus` or real packages | removed by the probe |
| E2E data roots | each E2E file creates its own | clean env, temp HOME | removed by the files; temp HOME removed |

## Persisted Data Transition Coverage Basis (When Applicable)

Not applicable: the design decision is `Not Affected` (definitions are only read; the store is in memory), and the handoff confirms it.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-package-definitions/agent-package-folder-watcher.test.ts` (12 new catch-up cases) | Catch-up timing, debounce, guards, coverage repair once per set, presence first | AC-002, SR-002 | Still Valid | read: assertions match AC-002 and the SR-002 bound | Reuse IMP-02 (ran at `af81b3d7d2`) |
| `tests/unit/agent-package-definitions/agent-package-definition-reloader.test.ts` (5 reconcile cases) | Quiet reconcile lists unmarked folders; unchanged package announces nothing; missing package keeps definitions | AC-003 | Still Valid | read | Reuse IMP-02 |
| `tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts` | Real chokidar + reloader journeys; AC-001 sleep removed; AC-016 read at 600 ms | AC-004, preserved AC-006/007/011/012 | Still Valid | read: AC-007 sleeps 2 s after ready (covers post-arm catch-up producing no frame) | Rerun x40 under load (API-15) |
| `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` | Real server/wire: import then immediate writes listed within 5 s; feed frames schema-strict | AC-004 | Still Valid | read: DCF-E2E-002 post-import sleep removed | Rerun x40 under load (API-15) and inside API-10 |
| `tests/unit/api/graphql/update-notifications-schema.test.ts` (second build case) | Second `buildGraphqlSchema()` keeps `kind`, `sourceId` | AC-005 | Still Valid | red on rc.3 (IMP-03) | Reuse IMP-03 / IMP-S |
| `tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` | Memoizing mock removed | AC-005 | Still Valid | — | Inside API-10 |
| Whole `autobyteus-server-ts/tests/e2e` (192 files) | Real HTTP/GraphQL/WS boundaries | QR-003, TESTING.md rule 4 | Still Valid (not run by implementation) | — | Run (API-10) |
| `tests/architecture/application-framework-boundaries.test.ts` | Exact `getInstance()` caller list | AC-001 | Still Valid | — | Reuse IMP-S; add negative mutation (API-12) |
| `autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts` | Preflight + visible skips | AC-007 | Still Valid | read | Reuse IMP-05 live; rerun closed port on head (API-19) |
| `autobyteus-web/scripts/electron-e2e/__tests__/electronE2ELaunchPreparation.node-test.mjs` | Host build mapping | AC-008 | Still Valid | — | Reuse IMP-S/IMP-08a, IMP-08b |
| `grok-build-capability.test.ts`, `managedExtensionService.spec.ts`, `native-compaction-terminal-drain.test.ts`, `NotificationCenter.spec.ts` | Deterministic under load | AC-010, AC-011, AC-015, AC-006 | Still Valid | `git diff --name-only c04cd7d92e af81b3d7d2` does not touch them | Reuse IMP-10/11/15/04 |
| `FileExplorerStreamingService.spec.ts` (2 new cases) | No error log; old late close leaves the new connection | AC-014 | Still Valid | red without fix (IMP-14) | Reuse IMP-14 / IMP-S |
| 36 dead `prompt-engineering` test files | Tested deleted code | AC-012 | Stale / Remove (done by implementation) | design Removal Plan; `src/prompt-engineering` absent | Verify removal (API-17) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-003, AC-005, AC-012…AC-014; REQ-001…014 suites | server typecheck/unit/integration, web nuxt/electron/guards, harness node tests | Reused | IMP-S (and IMP-01, IMP-02, IMP-08a, IMP-13, IMP-14 within it) | Ran on `af81b3d7d2`; `git diff --name-only af81b3d7d2 959b5cc048` touches only ticket docs/evidence |
| API-02 | AC-005 | type-graphql rc.3 red / rc.4 green | Reused | IMP-03 | Ran on `146c5b6b34`; the unit test file and lock unchanged since (checked) |
| API-03 | AC-006, AC-010, AC-011, AC-015 | four load-sensitive specs | Reused | IMP-04, IMP-10, IMP-11, IMP-15 | Their files and the code they drive unchanged between `c04cd7d92e`/`9945e38647` and `af81b3d7d2` |
| API-04 | AC-007 (live) | LM Studio live | Reused | IMP-05 | `af81b3d7d2` only removed unused imports from the test; avoids a second local-model run (TESTING.md) |
| API-05 | AC-008 (real macOS) | packaged harness | Reused | IMP-08b | Ran on `af81b3d7d2` |
| API-10 | AC-005, QR-003, TESTING.md rule 4 | every server E2E file on rc.4 | Existing Test | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm test:e2e` after `test:integration:prepare` | The gap the implementation named |
| API-10b | AC-005, QR-003, TESTING.md rule 4 | the 38 server E2E files gated only by the scripted AGY CLI (no provider, no cost) | Existing Test | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run <38 files> --no-watch` | Added after API-10: 93 files were skipped by gates; these 38 drive Team/Task/delegation GraphQL and streams on rc.4 for free (TESTING.md "Runtimes without a model"). The other gated files need paid or live providers (out of scope) |
| API-13 | AC-004 (SCN-001 Creator journey), REQ-002 | live-refresh E2E with its two AGY-gated cases (DCF-E2E-007: the Creator writes an agent and a Team, the next `list_available_agents`/`delegate_task` uses them; DCF-E2E-008) | Existing Test | same file as API-15's E2E with `RUN_AGY_FAILURE_E2E=1` + the scripted CLI, 5 consecutive runs | Added after API-10: the file's two strongest real-use cases are gated and were skipped in API-10 and in IMP-02d |
| API-11 | QR-003, design escalation trigger | GraphQL schema text | Temporary Probe | print SDL of `buildGraphqlSchema()` twice on rc.4 and once on rc.3 (temporary symlink swap, restored), diff | One-off library-comparison; the durable regression is the second-build unit case |
| API-12 | AC-001 (failure half) | architecture guard | Temporary Probe | add a temporary `AgentDefinitionService.getInstance()` call to a file not on the list, run the guard (expect fail), revert, run again (expect pass) | Mutation check; committing a failing fixture is not wanted |
| API-14 | AC-002/AC-003 at the real chokidar boundary; SR-002 (SCN-001a…c) | `AgentPackageFolderWatcher` with real chokidar | Temporary Probe | vitest probe in `tests/tmp-probe/` (not committed; copy kept in `evidence/probes/`): (a) realistic layout via a symlinked-prefix root → one arm, no repair, no warning; (b) first chokidar watch made to miss `agents/scout` → one reconcile, one quiet repair (second arm), no `markPackageFolderChanged`, then an edit in `scout` is reported | Durable unit tests use a fake watch; a real-chokidar fault injection is diagnostic, design keeps the regression in unit + loops |
| API-15 | AC-004, QR-001 | integration file + DCF E2E file under 2 x ncpu load | Existing Test (loop) | 40 consecutive runs each, recipe of IMP-02d, on head | IMP-02d ran on `1c73699156`; the watcher changed after (refactor in `af81b3d7d2`) and AC-004 is critical |
| API-16 | AC-009 | doc vs package.json | Existing check | extract every `pnpm … build:electron*` from "Build Commands" and check each in `autobyteus-web/package.json`; grep `ts-node` | Cheap |
| API-17 | AC-012 | files, config, doc | Existing check | `find … prompt-engineering`, `grep vitest.config.ts`, doc names checked against `src`; base `vitest.config.ts` exclusions covered all deleted `.ts` files (so collected count is unchanged) | Cheap |
| API-18 | AC-013 | five web specs | Existing check | `npx vue-tsc --noEmit` in `autobyteus-web`, filter to the five files; diff of the five files is type-only | Cheap enough; independent |
| API-19 | AC-007 (unreachable half) | LM Studio suite | Existing Test | `env -i PATH HOME=<temp> TMPDIR LMSTUDIO_HOSTS=http://127.0.0.1:9 pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/lmstudio-llm.test.ts` | Final test file; no model needed |
| API-21 | AC-016 pre-check on the branch, QR-003 | clean clone (not a worktree) of the branch head | Existing suites | clone, `pnpm install --frozen-lockfile`, prepare, then server typecheck, `test:unit`, `test:integration`, web `test:nuxt`, `test:electron`, guards | Shows the result does not lean on the worktree's untracked build outputs; delivery repeats it on the finalized `origin/personal` |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None. The design places the durable regression in the watcher/reloader unit tests and the sleep-free integration and E2E cases, which the implementation added. My probes are diagnostics (kept under `evidence/probes/`, not committed as tests).

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None by API/E2E. The 36 dead test files were removed by the implementation per the design's Removal Plan (obsolete assertion: they tested `src/prompt-engineering/**` and `src/agent-tools/prompt-engineering/**`, deleted in `fd063bdc00`; no replacement needed; the live `prompt-engineering-removal.integration.test.ts` stays). API-17 verifies.

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron (packaged harness only).
- Testing guideline used: TESTING.md "Packaged Electron harness" row; README "Packaged Electron API/E2E testing".
- Web-equivalent behavior: none changed.
- Shell-specific or lifecycle behavior: the harness build step (W-06).
- Chosen validation approach: reuse IMP-08b (real `pnpm -C autobyteus-web test:e2e:electron --adapter direct` on macOS at `af81b3d7d2`) plus the node tests; no isolated desktop instance is needed because no shell behavior beyond the build step changed and BEH-001 is server-side, proven at the real server/wire boundary by the E2E file.
- How the run avoids disturbing an already-running desktop application: no desktop app is started by this round.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order: `test:integration:prepare` → API-10 (no extra load) → API-11/12/14/16/17/18/19 (light, serialized) → API-15 (with `yes` load) → API-21 (clean clone).
- Environment choices: clean env for E2E and `autobyteus-ts` integration; temp HOME resolved with `pwd -P`.
- Evidence to capture: summaries and failure excerpts of each suite; probe JSON results; loop RESULT lines.
- Owned processes and temporary state to clean up: `yes` PIDs started for API-15; `/tmp/api253` (temp HOMEs, clone); `tests/tmp-probe/`; any temporary edit of API-12; rc.3 symlink swap of API-11 restored.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-016 on the finalized `origin/personal` | The finalized branch does not exist until delivery merges | Merge with the moved `origin/personal` | No | Delivery (API-21 pre-checks the branch) |
| Linux / Windows behavior of the catch-up | macOS host only | Low (ASM-001: inotify has no such gap; unit tests platform-neutral) | No | None |
| Gated server E2E files that need paid or live providers (Codex, Claude, Grok, LM Studio, DeepSeek, real AGY, token/compaction live suites) | Requirements Out Of Scope ("Re-running paid or live suites beyond the one LM Studio suite") | rc.4 resolver mapping on those paths is covered by the same resolvers in API-10/API-10b and by the schema text comparison (API-11) | No | None |

## Ambiguities Or Reroute Triggers

None at planning time. `delegated-launch-config-defaults.e2e.test.ts` (inside API-10b) is known to fail 2 of 3 on the base (FU-002, cause recorded in `tickets/done/task-comments/follow-ups.md` FU-003); its failure is checked against that cause, not counted against this ticket.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the implementation's own check results are reused where the code they exercise is unchanged; everything that the lockfile change or the final watcher refactor could affect is rerun. Updated during execution: API-10b and API-13 added (gated files); the failures found in API-10b were each traced to a cause outside this ticket (FU-002, FU-003, FU-004 in `follow-ups.md`), so no reroute.
