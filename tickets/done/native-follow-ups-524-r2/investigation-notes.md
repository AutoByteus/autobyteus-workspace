# Investigation Notes — autobyteus-524, round 2 (`native-follow-ups-524-r2`)

## Investigation Meta

- Package identifier: `native-follow-ups-524-r2` (round 2 of Task autobyteus-524; round 1 = `native-follow-ups-524`, finalized `c0869d58e9`)
- Request / ticket: Project Task `autobyteus-524`, round 2 as the founder set it on 2026-11-18 in the Solution Designer's conversation: "only do the two and three" = 515 **FU-006** (the runtimes E2E and the DeepSeek harness) and **FU-007** (a built server's stop takes over 10 s), FU-007 together with the same family (512 FU-006 = 496 FU-006; 517 FU-002 = 483 FU-002; also 526 = 448 FU-001/FU-009, 527 = 493 FU-003/FU-005, per the PM)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2`
- Repository mode: `Git`; branch `codex/native-follow-ups-524-r2`
- Resolved base: `origin/personal` at `0570c47fd9` (fetched 2026-11-18); finalization target `origin/personal`
- Bootstrap result: worktree created; `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`, server `tsc` + assets for the probes (no source change)
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md` (in this conversation, 2026-11-17/18)
- Investigation status: complete for FU-006 and FU-007

## Initial Request And Clarifications

- 2026-11-18, the founder in the Solution Designer's conversation: approval mode "every tool asks for approval ... make it simple"; no Claude approval change ("it's just task management"); "only do the two and three": FU-006 and FU-007. FU-004/FU-005: no change. FU-008 and round 1's follow-ups: not this round.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-18 | Code | `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts:22, 65-68, 172, 224` | FU-006 | The suite fakes codex/claude/agy/grok (e.g. `GROK_BUILD_COMMAND` → the fake, line 172) and expects exactly `[codex, claude, agy, grok, autobyteus]`; nothing controls the DeepSeek harness | — |
| 2026-11-18 | Code | `src/runtime-management/deepseek-harness/deepseek-harness-identity.ts:17` | FU-006 | `DEEPSEEK_HARNESS_COMMAND` when set, else `dsh` on PATH | The test can point it at a missing command |
| 2026-11-18 | Code | `tests/unit/runtime-management/deepseek-harness/deepseek-harness-runtime.test.ts` | FU-006 | The harness's availability has its own tests | Hiding it in the AAR suite loses no coverage |
| 2026-11-18 | Doc | delivery records: 515 FU-006, 448 FU-009, 493 FU-005 | Same item | All three report `+ "deepseek_harness"` with `~/.local/bin/dsh` installed | One fix closes all three dsh parts |
| 2026-11-18 | Code | `src/shutdown/server-process-shutdown.ts:57-89` | FU-007 | SIGTERM → wait for startup to settle → cleanup within `SERVER_SHUTDOWN_TIMEOUT_MS` (10 s), else "forcing exit", exit 1 → process-tree sweep → exit | — |
| 2026-11-18 | Code | `src/server-runtime.ts:199-240`, `src/compositions/build-studio-server.ts:109-170, 279-300, 446-452` | Cleanup steps | Cleanup = restart record → `app.close()` (pre-close hooks, HTTP close, studio `onClose`: application stop → `closeProcessResources` → `closeStudioProcessResources`, ~20 steps incl. `agentPackageDefinitionFeed.close()` and `platformNotices.close()`) | Timed in RF-002 |
| 2026-11-18 | Code | `src/agent-package-definitions/monitor/agent-package-folder-watcher.ts:44-53, 168-174, 422-439`; `src/compositions/agent-package-definition-feed-composition.ts:55-66` | The slow step | `close()` closes each package folder's chokidar watch and its parent-folder `fs.watch` (presence watch); chokidar 4 uses Node `fs.watch` | — |
| 2026-11-18 | Code | `src/skill-update-notices/skill-update-notices.ts:39-47`, `src/compositions/platform-notice-sources.ts:40`, `src/skill-update-notices/monitor/skill-folder-watcher.ts:3,23` | Same shape | The skill-folder watcher is also in-process chokidar, closed at shutdown through `platformNotices.close()` | Same fix |
| 2026-11-18 | Code | `src/file-explorer/watcher/runtime/watcher-runtime-process.ts` | Other watchers | The file-explorer watcher runs in its own process | Not on the server's main thread |
| 2026-11-18 | Code | `grep` of callers | Who closes the feed / skill notices | `agentPackageDefinitionFeed.close()` only from `closeStudioProcessResources` (`build-studio-server.ts:159`); `skillUpdateNotices.close()` only from `platformNotices.close()` (`platform-notice-sources.ts:40`), itself only from `closeStudioProcessResources` | **Wrong (corrected 2026-11-18, implementation DI-001):** both run inside `closeProcessResources`, whose callers are the shutdown handover close (`build-studio-server.ts:301-303`), Fastify's `onClose` (`:447-453`) and the startup-failure path (`:503-505`); 120 test files start in-process studio servers and close them while the process runs on. The check stopped one level up. Only `server-runtime.ts:214` (and the handover close) are process-exit paths |

## Runtime, Probe, Or Reproduction Findings

Desktop Mac, 10 cores, 2026-11-18, load averages 45–145 (other processes). Probe: `evidence/built-server-stop-probe.mjs` (515's API-05 probe: start the built server as the E2E harness does, idle 3 s, SIGTERM, time the stop).

| ID | Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- | --- |
| RF-001 | `node evidence/built-server-stop-probe.mjs <worktree> 6 3000` | Unchanged build, load ~46 | Stops 0.4–3.0 s, one round **> 15 s** (`TEST_SERVER_STOP_TIMEOUT`) | `Reproduced` | — | this table |
| RF-002 | Same, with temporary timing lines in the built `server-process-shutdown.js`, `server-runtime.js`, `build-studio-server.js` (every cleanup statement) | 6 + 12 rounds, load 50–57 | Startup settled before every SIGTERM (not the cause). **One step dominated: `agentPackageDefinitionFeed.close()` 2.6–13 s**; 5/12 rounds hit the 15 s probe bound inside that step, 2 exited 1 after the 10 s bound | `Measured` | The cause is the package watcher's close | `evidence/RF-002-stop-step-timings.jsonl` |
| RF-003 | Same, timing lines inside the built watcher's `close()` | 8 rounds, load ~145, one package folder | Queued operations done in ≤ 10 ms; **chokidar `close()` synchronous part 2.0–6.8 s**; presence `fs.watch.close()` up to 2.2 s. The main thread is blocked: closing a directory watch on macOS synchronizes with the file-event service, which is slow while `fseventsd` is busy | `Measured` | Any close of an OS watch on the main thread can block for seconds | `evidence/RF-003-watcher-close-timings.jsonl` (probe: `evidence/built-server-stop-probe-with-timings.mjs`, needs the temporary timing lines) |
| RF-004 | Temporary edit: the built watcher's final close skips the OS-watch closes | 10 rounds, load 100–125 | **Stops 48–166 ms, 10/10 exit 0** | `Reproduced` (fix shape) | Leaving OS watches to the process exit removes the delay | this table |

- Temporary diagnostics: timing lines and the RF-004 edit in this worktree's `autobyteus-server-ts/dist/` only (`shutdown/server-process-shutdown.js`, `server-runtime.js`, `compositions/build-studio-server.js`, `agent-package-definitions/monitor/agent-package-folder-watcher.js`); **removed** by restoring the saved originals (verified: no `__tm(` and no `if (!this.closed)` left in `dist/`). No source file changed.
- Reproduction for implementation: `node tickets/in-progress/native-follow-ups-524-r2/evidence/built-server-stop-probe.mjs <worktree> 10 3000` after building the server; under load (or while `fseventsd` is busy) stops take seconds today and must take well under 1 s after the change.

## Family items and what this round's fix closes

| Row | Item | Closed by this round? |
| --- | --- | --- |
| 515 FU-006, 448 FU-009 (first part), 493 FU-005 (dsh part) | `available-agent-runtimes` lists `deepseek_harness` when `dsh` is installed | **Yes** (FU-006 fix) |
| 515 FU-007, 448 FU-009 (second part), 493 FU-005 (9 built-server start/stop files) | A built server's stop exceeds 10 s on a loaded Mac | **Yes for the stop** (FU-007 fix); a start that is slow under load is not addressed |
| 512 FU-006 = 496 FU-006 | Built-server `afterAll` hooks (10 s) below the harness's 15 s stop allowance | **In practice** (stops ~0.1 s); the latent mismatch of the two numbers is left (founder: keep it simple) |
| 526 = 448 FU-001 | `agent-package-folder-watcher.test.ts` `afterEach` `close()` > 10 s | **No**: the test path uses the full close, which still blocks under load (RF-003 explains why) |
| 517 = 483 FU-002, 527 = 493 FU-003 | Tests waiting for FS events or a server start time out under load | **No**: event latency and arming, not close |

## Requirement Implications

- FU-006: the AAR suite must not depend on what is installed on the host.
- FU-007: the process exit releases OS file watches; closing them on the main thread at shutdown is unnecessary work that blocks for seconds. Remove it from the shutdown path; keep the full close for every other caller.

## Notes For Architecture Design

Shutdown-only variant on the two in-process watchers; the feed's and the skill notices' close (process-exit-only callers) use it.
