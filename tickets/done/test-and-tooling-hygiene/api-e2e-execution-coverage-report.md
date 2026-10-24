# API/E2E Execution Coverage Report — test-and-tooling-hygiene (autobyteus-253)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/test-and-tooling-hygiene/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (direct `Medium` / `Low` route), head `959b5cc048`, code final `af81b3d7d2`
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: two cases added after API-10 showed that 93 E2E files are gated: API-10b (the 38 files gated only by the free scripted AGY CLI) and API-13 (the live-refresh file's two AGY-gated Creator-journey cases). API-18 needed a 16 GB heap (untracked packaged-build output inside the web tsconfig scope, see its row). API-11's rc.3 half ran after API-10b so the `node_modules` swap could not disturb a running suite.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene/tickets/in-progress/test-and-tooling-hygiene/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `959b5cc048` (code `af81b3d7d2`), worktree | macOS arm64, 10 cores; shared host, load average 5–150 from other work | Node v22.23.1, pnpm 10.28.2; server `dist` and SDK dists rebuilt at head (`test:integration:prepare`, rc 0); `type-graphql` 2.0.0-rc.4 | test-owned temp folders only; no artificial load |
| ENV-2 | same as ENV-1 | same | same | clean environment for E2E and `autobyteus-ts` integration: `env -i PATH HOME=<resolved temp under /tmp/api253> TMPDIR` (+ `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs` where stated; + `LMSTUDIO_HOSTS=http://127.0.0.1:9` for API-19) |
| ENV-3 | same as ENV-1 | same | same | ENV-1/ENV-2 plus 20 × `yes >/dev/null` (2 × ncpu), started and killed by `/tmp/api253/scripts/api15.sh` |
| ENV-4 | `959b5cc048`, clean `git clone` of the branch (not a worktree) at `/tmp/api253/clone` | same | `pnpm install --frozen-lockfile`, then the documented prepare steps | no untracked build output from the worktree |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-003, AC-005, AC-012…AC-014; REQ-001…014 suites | server typecheck/unit/integration, web nuxt/electron/guards, harness node tests | Reused: IMP-S (with IMP-01, IMP-02, IMP-08a, IMP-13, IMP-14) | — | Pass | (implementation handoff) `IMP-S-full-suites.txt` | (handoff row) | Ran on `af81b3d7d2`; `git diff --name-only af81b3d7d2 959b5cc048` lists only ticket documents/evidence |
| API-02 | AC-005 | type-graphql rc.3 red / rc.4 green | Reused: IMP-03 | — | Pass | (handoff) | (handoff row) | `git diff --name-only 146c5b6b34 af81b3d7d2` is empty for the unit test, `src/api`, the lockfile and `package.json` |
| API-03 | AC-006, AC-010, AC-011, AC-015 | four load-sensitive specs | Reused: IMP-04, IMP-10, IMP-11, IMP-15 | — | Pass | (handoff) `IMP-L-loops-other-items.txt` | (handoff rows) | `git diff --name-only c04cd7d92e af81b3d7d2` touches only the watcher, its unit test, its doc and the LM Studio test; NotificationCenter unchanged since `9945e38647` |
| API-04 | AC-007 (reachable half) | LM Studio live | Reused: IMP-05 | — | Pass | (handoff) `IMP-05-lmstudio-runs.txt` | (handoff row) | `af81b3d7d2` only removed unused imports from the test; a second local-model run is avoided (TESTING.md); the unreachable half is rerun as API-19 |
| API-05 | AC-008 (real macOS) | packaged Electron harness | Reused: IMP-08b | — | Pass | (handoff) `IMP-08b-macos-harness-run.txt` | (handoff row) | Ran on `af81b3d7d2` |
| API-10 | AC-005, QR-003, TESTING.md rule 4 | every server E2E file (192) on rc.4 | `pnpm -C autobyteus-server-ts test:integration:prepare`; then from the repo root `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm test:e2e` | ENV-2 | Pass | `API-10-server-e2e-folder.txt` | `Test Files  99 passed \| 93 skipped (192)`, `Tests  430 passed \| 455 skipped (885)`, `rc=0`; failed files: none | The 93 skipped files are gated (`RUN_*`); includes `update-notifications-live` (12 tests, memoizing mock removed) and the live-refresh file |
| API-10b | AC-005, QR-003, TESTING.md rule 4 | the 38 E2E files gated only by the scripted AGY CLI (Team/Org/Task/delegation GraphQL and streams) | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/tests/fixtures/agy-failure-cli.mjs" pnpm -C autobyteus-server-ts exec vitest run <38 files> --no-watch`; each failure then rerun alone and its cause shown | ENV-2 | Pass (in scope) | `API-10b-agy-scripted-e2e.txt` | `Test Files  3 failed \| 35 passed (38)`, `Tests  4 failed \| 174 passed`; the cause section for each failure | The 4 failed cases are outside this ticket, each with its cause found (Rule 9): 2 × `delegated-launch-config-defaults` = FU-002 (same assertions as its record); SUN-E2E-003 = FU-003 (stub misses the git head read of `95a608c456`; passes with the stub added temporarily); multi-image E-002/E-004 = FU-004 (owner-scoped file-change reads of `5d6127cee4`). None touches code this branch changes |
| API-11 | QR-003, design escalation trigger "rc.4 changes any generated schema" | GraphQL schema text | temporary probe `printSchema(buildGraphqlSchema())` twice, on rc.4, then with the `node_modules/type-graphql` symlink pointed at rc.3 for one run and restored | ENV-1 | Pass | `API-11-schema-sdl-rc3-vs-rc4.txt`, `probes/API-11-schema-sdl-probe.test.ts` | four files `81d67097f67b0064  2894 lines`; three `IDENTICAL` diffs | The rc.3 defect shifts argument values at run time, not the text; that half is API-02 and API-10/10b |
| API-12 | AC-001 (failure half) | architecture guard | temporary `src/agent-memory/tmp-api253-guard-probe.ts` calling `AgentDefinitionService.getInstance()`; `vitest run tests/architecture/application-framework-boundaries.test.ts -t 'guards the exact SR-011'`; file removed; same command | ENV-1 | Pass | `API-12-guard-mutation.txt` | step 1 `rc=1`, `+   "autobyteus-server-ts/src/agent-memory/tmp-api253-guard-probe.ts",`; step 2 `rc=0`, `Tests  1 passed`; `0 changed paths` | — |
| API-13 | AC-004 (SCN-001 Creator journey), REQ-002, REQ-003 | live-refresh E2E incl. AGY-gated DCF-E2E-007/008 at the real server/wire boundary | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` × 5, + 1 kept verbose run | ENV-2 | Pass | `API-13-live-refresh-with-agy.txt` | `RESULT dcf-agy pass=5 fail=0 of 5`; run 6 `Tests  10 passed (10)` incl. `DCF-E2E-007`; `frames total 53 invalid []` | DCF-E2E-007: the Creator writes an agent and a Team; the next `list_available_agents` lists them (`teamListedAfterWriteMs` 441) and `delegate_task` launches them with current instructions |
| API-14 | AC-002/AC-003 at the real chokidar boundary; SR-002 (SCN-001a…c) | `AgentPackageFolderWatcher` + real chokidar + `listWatchedLayoutDirectories` | temporary probe `tests/tmp-probe/api253-watcher-coverage.test.ts` × 3 (A symlinked-prefix root with a realistic layout; A2 real path; B first watch misses `agents/scout`; C `scout` never watchable) | ENV-1 | Pass | `API-14-watcher-coverage-real-chokidar.txt`, `probes/API-14-watcher-coverage-probe.test.ts` | each run `Tests  5 passed (5)`; A/A2 `"arms": 1`, `"listedButNotWatched": []`, `"warns": []`; B `firstWatchHasScout false`, `secondWatchHasScout true`, `"arms": 2`, `"packageChanged": 0`, `eventsAfterEdit ['agent:scout']`; C one `AGENT_PACKAGE_FOLDER_UNWATCHED`, `scoutEditReported False` | C is B's negative control: without the repair the edit is lost. First probe version was not discriminating (FSEvents replays pre-arm writes to a new stream); fixed before the counted runs |
| API-15 | AC-004, QR-001 | integration file + live-refresh E2E file, sleep-free, under 2 × ncpu load, final watcher | 20 × `yes >/dev/null`; 40 consecutive `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts --no-watch`; then 40 consecutive `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-15-ac004-loops-under-load.txt` | `RESULT integ pass=40 fail=0 of 40`, `RESULT e2e pass=40 fail=0 of 40`, `yes left from this run: 0`; per-run load avg 30–316 | IMP-02d ran on `1c73699156`; `af81b3d7d2` refactored the watcher's timer guard, so rerun on final code. Each integration run includes AC-001/AC-015(a) (5 s bound), AC-016 (read at 600 ms, no frame), AC-006 burst (≤ 3 frames) and AC-007 (no frame within 2 s after arming, i.e. the post-arm catch-up of an unchanged package announces nothing) |
| API-16 | AC-009 | doc vs `package.json` | extract every `pnpm -C autobyteus-web <script>` from "Build Commands", look each up; `grep -c ts-node` | ENV-1 | Pass | `API-16-doc-commands.txt` | six `script … =>` lines, none `MISSING`; `ts-node occurrences in doc: 0` | The doc's description of each script (guards, prepare-server, generate, transpile, build.js flag) matches the script text |
| API-17 | AC-012 | tests, config, doc | `find … -path '*prompt-engineering*'`, `grep` `vitest.config.ts`, base exclusions vs deleted files, doc `src/` names checked | ENV-1 | Pass | `API-17-dead-tests.txt` | only `prompt-engineering-removal.integration.test.ts` left; 36 deleted (19 `.ts`, 17 `.js`); `deleted .ts files not matched by a base exclusion: (end)` | The deleted `.ts` files were all excluded on the base and `.js` files are not collected, so the collected unit count is unchanged; the doc names `src/prompt-engineering` only to say it no longer exists |
| API-18 | AC-013 | five web specs | `NODE_OPTIONS=--max-old-space-size=16384 npx vue-tsc --noEmit` in `autobyteus-web`, filtered; the five specs; diff of their assertions | ENV-1 | Pass | `API-18-vue-tsc-five-specs.txt` | `errors in the five named files (expect none): (end, count=0)`; `Tests  49 passed (49)` | Default and 8 GB heaps ran out of memory: 7716 of 8170 errors come from the git-ignored packaged build output (`resources/server`, `electron-dist/mac-arm64`) of IMP-08b inside the web tsconfig scope; FU-001 already covers the web type-check scope |
| API-19 | AC-007 (unreachable half) | LM Studio suite | `env -i PATH HOME=<temp> TMPDIR LMSTUDIO_HOSTS=http://127.0.0.1:9 pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/lmstudio-llm.test.ts --reporter=verbose` | ENV-2 | Pass | `API-19-lmstudio-closed-port.txt` | `Tests  7 skipped (7)`, each `[LM Studio is not reachable at http://127.0.0.1:9 (fetch failed); start it or set LMSTUDIO_HOSTS]` | Final test file |
| API-21 | AC-016 pre-check on the branch, QR-003 | clean clone, frozen lockfile, the suites AC-016 names | `git clone --branch codex/test-and-tooling-hygiene`; `pnpm install --frozen-lockfile`; `prebuild`; `nuxt prepare`; `test:integration:prepare`; server `typecheck`, `test:unit`, `test:integration`; web `test:nuxt --run`, `test:electron --run`, three guards; `node --test autobyteus-web/scripts/electron-e2e/__tests__/*.node-test.mjs` | ENV-4 | Pass | `API-21-clean-clone-suites.txt` | install `rc=0`, only `type-graphql@2.0.0-rc.4`; `typecheck rc=0`; `Tests  6736 passed \| 7 skipped`; `Tests  421 passed \| 69 skipped`; `Tests  4858 passed \| 5 skipped`; `Tests  237 passed \| 1 skipped`; guards `rc=0`; `# pass 15` | Same counts as IMP-S in the worktree. My first node-test step passed a directory (`Cannot find module …/__tests__`), a command-form error of mine, rerun with the glob. Delivery still owns AC-016 on the finalized `origin/personal` |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (pass half), API-12 (fail half) | Proven | — |
| AC-002 | Yes | API-01 (IMP-02 watcher unit cases), API-14 (real chokidar: one request per arm, quiet repair, bound) | Proven | — |
| AC-003 | Yes | API-01 (IMP-02 reloader unit cases); API-15/API-10 integration AC-006/AC-007 (real reloader: unchanged package after the post-arm catch-up publishes nothing) | Proven | — |
| AC-004 | Yes | API-15 (40 + 40 under load, final watcher), API-13 (Creator journey with real tools), API-10 | Proven | — |
| AC-005 | Yes | API-02 (rc.3 red / rc.4 green), API-10 (`update-notifications-live` 12/12 without the mock, whole folder), API-10b, API-11 | Proven | — |
| AC-006 | No | API-03 (IMP-04) | Proven | — |
| AC-007 | No | API-04 (IMP-05 live), API-19 (closed port) | Proven | — |
| AC-008 | No | API-01 (node tests), API-05 (real macOS run) | Proven | — |
| AC-009 | No | API-16 | Proven | — |
| AC-010 | No | API-03 (IMP-10) | Proven | — |
| AC-011 | No | API-03 (IMP-11), API-01 (full `test:electron`) | Proven | — |
| AC-012 | No | API-17, API-01 | Proven | — |
| AC-013 | No | API-18, API-01 | Proven | — |
| AC-014 | No | API-01 (IMP-14 red without the fix, green with it) | Proven | — |
| AC-015 | No | API-03 (IMP-15) | Proven | — |
| AC-016 | Yes | API-21 (pre-check on a clean clone of the branch) | Not Proven (delivery's: pre-checked on the branch, API-21 Pass) | Not a user-only part: it needs the finalized `origin/personal`, which exists only after delivery merges; delivery owns it |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 95% | every AC except AC-016 directly proven: API-01…05 (reused on unchanged code), API-10…19, API-21 | AC-016 needs the finalized `origin/personal` (delivery) | delivery's clean-clone run after merge |
| Changed-boundary execution directness | 95% | 95% | real chokidar + real reloader + real server/wire (API-13, API-14, API-15); every resolver family on rc.4 (API-10, API-10b); real guard mutation (API-12) | OS event loss is forced in API-14 B/C, statistical in API-15 | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | test-owned real servers over HTTP/GraphQL/WS; scripted AGY CLI only where a model would answer (API-10b, API-13) | paid/live provider suites not run (out of scope) | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | clean env for E2E; symlinked-prefix root (API-14 A); clean clone with frozen lockfile (API-21) | macOS only (ASM-001) | a Linux run (inotify has no such gap) |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | never-watchable folder bound (API-14 C), guard fail half (API-12), closed port (API-19), FOLDER_MISSING/UNAVAILABLE cases inside API-15/API-10 | RISK-001 (accepted: loss by another component's watch churn) | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | real macOS packaged harness (API-05); no rendered UI changed | Linux/Windows build scripts proven by mapping only | — |
| Durable regression coverage quality and relevance | 95% | 95% | sleep-free integration/E2E cases hold 40/40 under load (API-15); unit cases red/green (IMP-02/03/14); assertions unchanged in meaning (API-18 diff) | probes stay diagnostics by design | — |

- Overall post-repository confidence: 95%
- Overall final confidence: 95% (broader validation beyond the cases above not run; see the decision below)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` for AC-001…AC-005; AC-016 is delivery's criterion (needs the finalized branch), pre-checked on the branch by API-21
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: RISK-001 (accepted in design); RISK-002 (`type-graphql` rc.4 is a prerelease; schema text identical to rc.3, API-11); merge with the moved `origin/personal` (delivery)

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` beyond what ran
- Execution mode: `Live API` (test-owned real servers over HTTP/GraphQL/WebSocket in API-10, API-10b, API-13) and `Lifecycle` (API-14, API-15); no browser or desktop journey
- Confidence gap or residual risk it addresses, and the expected gain: the gaps after the implementation's checks were the shared-foundation rerun (closed by API-10/10b/11), the final watcher code under load (API-15), the real-chokidar repair path and its path-form assumption (API-14), and the clean-clone dependency on worktree build output (API-21)
- Browser validation needed, and why or why not: no. No rendered UI changed; the only web runtime change is `FileExplorerStreamingService.disconnect()`, unit-proven red/green with a socket fake that reproduces the real CONNECTING close sequence; BEH-001 is server-side and proven at the real server/wire boundary
- If `Not Required`: the cases that already exercise the real changed boundary: API-13 and API-15 (real server, real chokidar, real reloader, GraphQL and the `/ws/agent-package-definitions` feed), API-14 (real chokidar `getWatched()`), API-10/10b (every resolver family on rc.4), API-05 (real packaged harness)
- A user-level isolated desktop check of BEH-001 (handoff hint) was not run: the Electron shell adds nothing to the watcher path, the embedded server is the same server the E2E starts, and the Creator journey already runs through the real tools (API-13)

## Desktop Application Validation (When Applicable)

- Approach executed: reuse of IMP-08b (real `pnpm -C autobyteus-web test:e2e:electron --adapter direct` on macOS at `af81b3d7d2`) and the harness node tests; no deviation
- Cases proving shell-specific behavior: API-05, API-01 (node tests)
- Effect on any already-running desktop application: `None` (no desktop app started this round)
- Behavior not directly proven: Linux/Windows host build scripts are proven by the node test mapping only (macOS host)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (memoizing mock, watch-start sleeps, `shouldSkipOnConnectionError`, dead tests and both exclusion lists are gone: API-17 and the diff)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A (the implementation's removals are verified in API-17)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI (API-10b, API-13) | `tests/fixtures/agy-failure-cli.mjs` (TESTING.md "Runtimes without a model") | no provider calls needed to drive delegation, Tasks and streams | model inference not exercised (not changed by this ticket) |
| GitHub HTTP (inside E2E files) | each file's `fetch` stub | test-owned repositories | none for this ticket |
| OS event loss (API-14 B/C) | chokidar `ignored` made to skip `agents/scout` on the first (B) or every (C) watch | the OS loss is statistical; API-15 covers the real loss under load | B/C prove the repair given an unwatched folder, not how often the OS drops events |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/tmp-probe/` (API-11, API-14 probes) | Yes | copies kept in `evidence/probes/`; folder deleted | deleted after copying (`diff -q` equal) |
| `src/agent-memory/tmp-api253-guard-probe.ts` (API-12) | Yes | deleted after step 1 | `git status --short src`: 0 paths |
| Temporary edits of `agy-skill-update-notice-roots.e2e.test.ts` and `agy-native-image-multi-artifact-preview.e2e.test.ts` (API-10b cause runs) | Yes | restored from backups | `git status --short` clean for both |
| `autobyteus-server-ts/node_modules/type-graphql` symlink pointed at rc.3 (API-11) | Yes | restored | `readlink` → `type-graphql@2.0.0-rc.4…` |
| 20 × `yes` (API-15) | Yes | killed by the loop script (PIDs recorded) | `yes left from this run: 0`; `pgrep -x yes`: 0 |
| `/tmp/api253` (temp HOMEs, logs, clean clone) | Yes | removed after the evidence was copied | `/tmp/api253`: No such file or directory |
| Test-owned servers, data roots, temp package folders | Yes (created by the suites and probes) | closed/removed by the suites (E2E evidence JSON: `"baseRemoved": true, "serverClosed": true, "errors": []`) | done |
| Server `dist` and SDK dists rebuilt in the worktree | Yes | untracked build output, left in place (needed by later roles' runs) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): AC-016 is not proven here because it is defined on the finalized `origin/personal`; it is delivery's (pre-check API-21 passed on a clean clone of the branch). No part needs the user.
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: delivery engineer (direct low-risk route; test-code review `Not Required — direct low-risk route`)
- Notes: the four failing gated AGY E2E cases found in API-10b are outside this ticket, each with its cause shown: FU-002 (already recorded), FU-003 and FU-004 (added to `follow-ups.md`). No durable test was changed by API/E2E. Delivery hints: rerun the server E2E folder after integrating the moved `origin/personal` only if the merge touches the lockfile or shared foundations (TESTING.md rule 4); the worktree keeps the git-ignored packaged build output of IMP-08b (`autobyteus-web/resources/server`, `electron-dist/`), which inflates a whole-project `vue-tsc` run.
