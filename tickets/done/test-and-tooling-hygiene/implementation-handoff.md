# Implementation Handoff — test-and-tooling-hygiene (autobyteus-253)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (`Medium` / `Low`): no independent architecture review; `get_handoff_rules` → direct API/E2E validation without Code Reviewer
- Requirements doc: `tickets/in-progress/test-and-tooling-hygiene/requirements-doc.md` (SR-001, unchanged)
- Investigation notes: `tickets/in-progress/test-and-tooling-hygiene/investigation-notes.md`
- Solution revision record: `tickets/in-progress/test-and-tooling-hygiene/solution-revision-record.md` (SR-001, SR-002)
- Design spec: `tickets/in-progress/test-and-tooling-hygiene/design-spec.md` (SR-002: the catch-up also checks the watch)
- Supplemental task artifacts: `evidence/` (SD-* from the Solution Designer, IMP-* from this round), `follow-ups.md`
- Design review report / architecture review revision record: `N/A — not applicable` (independent architecture review not selected)
- Triggering rework report: N/A (initial round). One Design Impact was raised and resolved inside this round: SR-002 (see W-02 below)

All paths are relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene`, branch `codex/test-and-tooling-hygiene`, base `origin/personal` @ `8b34e8ae10`. Code is final at `af81b3d7d2`; documents and evidence are committed after it (the handoff message names the head commit).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Thirteen work items, one commit (or a short commit series for W-02) each, every message naming the test and the cause (TESTING.md Rule 9 baseline fixes). W-14 (FU-011 of 229) is `autobyteus-220`: nothing built.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md`, Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the only production behavior change stays inside the watcher/reloader owners (one sink method, one timer per package, one quiet pending set, a watch self-check that re-arms quietly); no contract, persistence, security or deployment change; `type-graphql` rc.4 changed no schema (server unit/integration and the update-notifications E2E pass). SR-002 widened the watcher's own self-check but kept ownership and the reloader unchanged. The escalation trigger fired once (loops showed misses) and was routed as `Design Impact`, resolved by SR-002; the loops then passed 40/40.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below, including Principle 15 added to the shared design principles during this round)
- New design impact or escalation trigger: `None` open

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (W-02, REQ-002/003, AC-002…004) | Quiet catch-up re-read after a watch arms and after folders are added/removed; SR-002: the catch-up first checks presence and that every allow-listed folder on disk is watched, re-arming quietly once per set of unwatched folders | `monitor/agent-package-folder-watcher.ts` (`PACKAGE_CATCH_UP_DELAY_MS`, `scheduleCatchUp`, `runCatchUp`, `repairCoverage`, `PackageFolderWatch.getWatched`); `monitor/agent-package-layout.ts` (`listWatchedLayoutDirectories`: directory names only); `services/agent-package-definition-reloader.ts` (`reconcilePackageFolder`, `pendingReconcile`, shared `addPackageTargets`; publish rule unchanged) | Done. Unit: watcher 12 new cases, reloader 5. Sleep-free integration and E2E 40/40 each under load (IMP-02d); probe 0/80 misses under load, 38/80 found only by the catch-up (IMP-02c) |
| BEH-002 (W-03, REQ-004, AC-005) | Second schema build keeps multi-`@Arg` resolvers | `type-graphql ^2.0.0-rc.4` (package.json + lock: type-graphql lines only) | New unit case red on rc.3 (symlink swap), green on rc.4; memoizing mock removed; update-notifications E2E 12/12 |
| BEH-003 W-01 (REQ-001, AC-001) | Guard list names the injectable default port | `tests/architecture/application-framework-boundaries.test.ts` | 20/20 pass |
| BEH-003 W-04 (REQ-005, AC-006) | Fixed distinct `foundAt` | `NotificationCenter.spec.ts` | 20/20 runs |
| BEH-003 W-05 (REQ-006, AC-007) | Preflight + `reloadModels(LMSTUDIO)` + visible skips; connection errors after preflight fail | `autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts` | Live 6 pass (seconds each) + 1 skip (LAN image URL unreachable); closed port 7 skipped with reason |
| BEH-003 W-06 (REQ-007, AC-008) | Harness builds the host package | `scripts/electron-e2e/electronE2ELaunchPreparation.mjs` (`hostElectronBuildScript`) + new node test | Node test 7/7; real macOS run built with `build:electron:mac`, launched, ready, rc 0 |
| BEH-003 W-07 (REQ-008, AC-009) | Real build commands | `autobyteus-web/docs/electron_packaging.md` | Every listed script exists in package.json; no `ts-node` |
| BEH-003 W-08 (REQ-009, AC-010) | Probe bound is an option; tests pass 30 s; bound still proven | `runtime-management/grok/grok-build-capability.ts` (`GrokBuildProbeOptions`), its unit test | 20/20 under load; hanging CLI ends in `GROK_CLI_UNSUPPORTED` with a 100 ms bound |
| BEH-003 W-09 (REQ-010, AC-011) | Real-process timeouts | `managedExtensionService.spec.ts` (`vi.setConfig({ testTimeout: 30_000 })`) | 5/5 under load; full `test:electron` green |
| BEH-003 W-10 (REQ-011, AC-012) | Dead tests gone | 36 files deleted; `vitest.config.ts` excludes; `scripts/check_repository_artifact_hygiene.py` `EXCLUDED_DEAD_TEST_DIRS` (also dead); `docs/modules/prompt_engineering.md` | Tracked-import check passes; live `prompt-engineering-removal.integration.test.ts` kept |
| BEH-003 W-11 (REQ-012, AC-013) | Type-only fixes | five named web specs | vue-tsc 6.0.2: no error in the five files; 49 tests pass |
| BEH-003 W-12 (REQ-013, AC-014) | Detach handlers before an intentional close | `FileExplorerStreamingService.disconnect()` + 2 new cases | New cases red without the fix, green with it |
| BEH-003 W-13 (REQ-014, AC-015) | Wait for the `failed` event | `native-compaction-terminal-drain.test.ts` | 10/10 under load |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Production: the watcher, layout and reloader of `autobyteus-server-ts/src/agent-package-definitions/`; `runtime-management/grok/grok-build-capability.ts`; `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts`; `autobyteus-web/scripts/electron-e2e/electronE2ELaunchPreparation.mjs`; `type-graphql` range and lock. Docs: `agent_package_definitions.md` (catch-up and watch check), `prompt_engineering.md`, `electron_packaging.md`.

## Important Assumptions

- `chokidar.getWatched()` keys are the watched directories as given (absolute, not realpath'd), the same form `listWatchedLayoutDirectories` builds from the registered root; a real-chokidar check on a package with nested Team/Org agent folders, skills, `_`-prefixed and hidden folders made no repair (temporary probe, not committed).
- Symlinked definition folders are not listed (a symlink `Dirent` is not a directory), so they never trigger a repair.

## Known Risks

- RISK-001 (accepted, design): a write that coincides with watch churn caused by another component, with no definition event of its own and after the last catch-up, is not caught; Reload covers it.
- RISK-002: `type-graphql` rc.4 is a prerelease (`next` dist-tag).
- A folder that can never be watched is re-armed once per set and then logged as `AGENT_PACKAGE_FOLDER_UNWATCHED` on each later catch-up (catch-ups only follow arming or folder add/remove, so this is bounded by real events).

## Deviations From The Design (each small; recorded for the reviewer)

1. `discoverGrokBuildModels` also takes `{ timeoutMs }` (the design's interface table named the probe and assert functions); its test spawns the same probe and needed the same bound. Production callers pass nothing.
2. SR-002 said the repaired watch's catch-up reconciles. The catch-up now sends the quiet re-read first and then repairs, so the store does not wait one more delay: with the repair deferring the re-read, AC-016 failed once in 40 (read at 600 ms, re-read at ~700 ms under load). Still quiet; still one repair per set.
3. The directory listing lives in `agent-package-layout.ts` (the layout owner) rather than in the watcher; it lists names only.
4. `catchUpDelayMs` and the Grok `timeoutMs` are options that only tests override — the design's chosen test seams, not dead code.
5. `scripts/check_repository_artifact_hygiene.py` lost its `EXCLUDED_DEAD_TEST_DIRS` skip (dead once the 36 files are gone); not in the design's file map.
6. LM Studio suite: vision models are chosen by the native `capabilities.vision` flag (the old `vl`-in-name rule found none of the installed models), the default text model is `qwen/qwen3.6-35b-a3b` (TESTING.md), and the sample image path was corrected to `autobyteus-ts/tests/assets/sample_image.png` (it pointed at a folder that does not exist, so that case silently returned).
7. AC-016 in the integration test now reads at 600 ms instead of 200 ms (a test bug: it read before the 300 ms catch-up).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix (watcher) + Cleanup (the rest)
- Reviewed root-cause classification: Missing Invariant (BEH-001); Local Implementation Defect (the rest)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`, after SR-002 (the invariant "definitions match disk" also needs "the watch covers disk")
- If challenged, routed as `Design Impact`: `Yes` — resolved as SR-002 (Solution Designer, 2026-10-24)
- Evidence / notes: IMP-02a shows the lost `addDir` leaving `agents/scout` unwatched; IMP-02c/IMP-02d show the result after SR-002

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (memoizing mock, watch-start sleeps, `shouldSkipOnConnectionError`, dead tests and their two exclusion lists removed)
- Dead code in the touched files and modules removed: `Yes` (incl. three unused imports in the LM Studio test, `EXCLUDED_DEAD_TEST_DIRS`)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`PackageFolderWatch.getWatched` is required, every fake implements it; no optional sink method)
- Canonical shared design guidance reapplied: `Yes` — including Principle 15 (One Vocabulary), added during this round: no project glossary found (DESIGN.md names none). Words used: **catch-up** (the watcher's self-check and request, design Terminology), **reconcile** (`reconcilePackageFolder`: the reloader's quiet re-read so the store matches disk — the sense the existing reloader tests already use), **coverage repair** (the quiet re-arm, internal to the watcher). No word gains a second meaning.
- Changed source files within size guardrails: `Yes` (watcher 440 lines, reloader 400, layout 144; no file over 500, no >220-line delta in a source file)
- Notes: the watcher still never reads definition files (it lists directory names to compare with its own watch set, as SR-002 allows)

## Persisted Data Transition Check

- Approved decision: `Not Affected` (design-spec). Implementation follows it: `Yes`.

## Environment Or Dependency Notes

- `pnpm -C autobyteus-server-ts prebuild` was needed once in this worktree (the shared SDK `dist/` folders were missing; untracked build output).
- The host was heavily loaded by other work during the loops (load average 100–300 on 10 cores); the loops add 2 x ncpu `yes` on top, as AC-004 asks. One integration run stalled (276 s) during a Spotlight/mdworker storm; it is kept in IMP-02b.
- LM Studio: the run loaded `qwen/qwen3.6-35b-a3b` with `lms load` and unloaded it afterwards (`lms ps`: none loaded). The user's AutoByteus and `~/.autobyteus` were not touched.

## Checks Run

Evidence folder: `tickets/in-progress/test-and-tooling-hygiene/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture/application-framework-boundaries.test.ts --no-watch` | 68eb520da9 (and in IMP-S) | macOS, Node 22 | architecture guard | AC-001 | Pass | IMP-S | `Tests  20 passed` (in the unit run) |
| IMP-02 | watcher/reloader unit tests `vitest run tests/unit/agent-package-definitions` | af81b3d7d2 | macOS | watcher, layout, reloader | AC-002, AC-003 | Pass | IMP-S | `Tests  93 passed (93)` for the folder |
| IMP-02r | red reproduction: sleeps removed, fix stashed, integration file x6 | f14a84e2b8 minus src | macOS | integration file | AC-004 | 4 of 6 failed (expected red) | IMP-02b (narrative) | — |
| IMP-02a | DCF-E2E-002 x30 under load with temporary timing logs | f14a84e2b8+7bce694c91 | macOS + 20 `yes` | watcher | AC-004 | 4 FAIL → Design Impact | IMP-02a | no `agents/scout` event in any failing run |
| IMP-02b | integration x40, E2E x40 under load (first version) | f14a84e2b8 / 7bce694c91 | macOS + 20 `yes` | watcher, reloader | AC-004 | 38/40, 35/40 | IMP-02b | `RESULT integ pass=38 fail=2`, `RESULT e2e pass=35 fail=5` |
| IMP-02c | post-fix probe, N=80, DELAY=0, under load | af81b3d7d2 | macOS + 20 `yes` | watcher | AC-004 | Pass | IMP-02c | `"teamMiss":0 … "editMiss":0`, `"viaCatchUp":38` |
| IMP-02d | integration x40, E2E x40 under load (after SR-002) | 1c73699156 | macOS + 20 `yes` | watcher, reloader | AC-004 | Pass | IMP-02d | `RESULT integ pass=40 fail=0 of 40`, `RESULT e2e pass=40 fail=0 of 40` |
| IMP-03 | `vitest run tests/unit/api/graphql/update-notifications-schema.test.ts` on rc.3 (symlink swap) and rc.4; `env -i … vitest run tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` | 146c5b6b34 | macOS, clean env for E2E | type-graphql, GraphQL harness | AC-005 | rc.3 red (2 failed), rc.4 green; E2E 12/12 | IMP-S (unit) | `expected "clear" to be called once with arguments` on rc.3 |
| IMP-04 | NotificationCenter spec x20 | 9945e38647 | macOS | spec | AC-006 | 20/20 | IMP-L | `pass=20/20` |
| IMP-05 | LM Studio suite live and against a closed port | b421d37faa (af81b3d7d2 only removed unused imports) | macOS, LM Studio 0.4.26, clean env | LM Studio suite | AC-007 | Pass | IMP-05 | `Tests  6 passed \| 1 skipped (7)`; closed port `7 skipped` with the reason |
| IMP-08a | `node --test autobyteus-web/scripts/electron-e2e/__tests__/*.node-test.mjs` | af81b3d7d2 | macOS | harness prep | AC-008 | Pass | IMP-S | `# pass 15`, `# fail 0` |
| IMP-08b | `pnpm -C autobyteus-web test:e2e:electron --adapter direct` | af81b3d7d2 | macOS arm64 | harness + full mac package build | AC-008 | Pass | IMP-08b | `build:electron:mac`, `electron-e2e-ready`, `harness rc=0` |
| IMP-09 | doc commands vs package.json (script) | b8d1c569ac | — | doc | AC-009 | Pass | — (6 of 6 listed scripts exist; no `ts-node`) | — |
| IMP-10 | Grok capability test x20 under load | c04cd7d92e tree | macOS + 20 `yes` | Grok probe | AC-010 | 20/20 | IMP-L | `RESULT grok pass=20 fail=0` |
| IMP-11 | managedExtensionService spec x5 under load | same | macOS + 20 `yes` | spec | AC-011 | 5/5 | IMP-L | `RESULT ext pass=5 fail=0` |
| IMP-12 | `find`/`grep` for prompt-engineering; tracked-import hygiene check | 087cdc9f0e | macOS | tests, config, script | AC-012 | Pass | — | `Tracked-import check passed` |
| IMP-13 | `npx vue-tsc --noEmit` (6.0.2) filtered to the five files; their specs | 588c78cba1 | macOS | five specs | AC-013 | Pass | — | no line for the five files; `Tests  49 passed` |
| IMP-14 | FileExplorerStreamingService spec with and without the fix | 065d34f85c | macOS | service | AC-014 | 2 new cases red without, all 20 green with | IMP-S (nuxt) | — |
| IMP-15 | drain test x10 under load | c04cd7d92e tree | macOS + 20 `yes` | test | AC-015 | 10/10 | IMP-L | `RESULT drain pass=10 fail=0` |
| IMP-S | server typecheck, test:unit, test:integration; web test:nuxt, test:electron, guards; harness node tests | af81b3d7d2 | macOS, Node 22, no artificial load | everything | REQ-001…014 | Pass | IMP-S | `Tests  6736 passed \| 7 skipped`; `Tests  421 passed \| 69 skipped`; `Tests  4858 passed \| 5 skipped`; `Tests  237 passed \| 1 skipped` |

- Not run, and why: the broad server E2E folder (`pnpm test:e2e`) — only the two E2E files this ticket touches were run (owned by API/E2E; the `type-graphql` bump is a shared foundation change, so TESTING.md rule 4 asks for it); `autobyteus-ts` unit tests (no `autobyteus-ts` source changed; only its LM Studio integration test); AC-016 (clean clone of the finalized `origin/personal`) is delivery's.

## Frontend Rendered-Result Check

`Not Applicable` — no rendered UI changed. The web changes are a service's socket teardown (unit-tested), test files and a harness script.

## Downstream Coverage Hints / Suggested Scenarios

- Rerun the broad server E2E folder after the `type-graphql` bump (shared foundation).
- If you rerun AC-004, use the same loop recipe as IMP-02d; expect the host's own load to slow runs (20–40 s each).
- A user-level check of BEH-001 in an isolated instance: import a local package and, within a second, have files written for a new agent, a Team using it, then an edit of the agent; all should appear without Reload and without an `agent_packages` frame for the quiet re-read.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E validation of the direct-route package, including the broad server E2E folder named above.
- AC-016 belongs to delivery (clean clone of the finalized `origin/personal`).
