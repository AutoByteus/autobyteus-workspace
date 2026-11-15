# API/E2E Execution Coverage Report — memory-sync-large-files (Project Task autobyteus-workspace-7)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2 of API-REV-002: the Solution Designer's ruling SR-005 / DEC-008 (`handoff-sr-005.md`) on round 1's AC-003 question; round 1 (API-REV-001) was triggered by code review CRR-002 (Pass, Large / High)
- Prior round reviewed: round 1 (API-REV-001): result `Fail` on AC-003 only (Requirement Gap), now ruled; OBS-1 promoted to a Local Fix
- Deviations from the investigation's plan, and why:
  - API-04 (typecheck, planned `Reused` IMP-03): confirmed by `git grep resetMemoryHubStagedFileStoreForTests` (no match at HEAD) and by API-02b/API-01 passing at HEAD; no rerun of the server typecheck was needed for a deleted unused export (the one change since IMP-03). The web typecheck (API-06c) ran in full.
  - API-07 grew from the planned "cold, warm, 30 MiB control, repeat" to 30 runs on three Node versions (22, 24, 26) and 2/4/8 GiB, after the first series showed the cold figure depends on the runtime.
  - Added API-02b (memory-sync unit + e2e on Node 22) and API-05b (the three failing unit files on Node 22), because the release workflow and the server image run Node 22 and this machine's default is Node 26.
  - API-08 and API-09/10/11 ran in several rounds because my own probe expectations were wrong or too weak (long path not listed; a raw socket client; 415 guessed for 400). Every round's directory is kept under `evidence/`; the final round is the one cited.
  - API-12: the documented build command stops at the web typecheck (a failure the base commit has too), so the step after it (`generate:electron`) ran separately. Packaging, signing and notarization were not run.
- Evidence folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files/tickets/in-progress/memory-sync-large-files/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` — this round added, updated and removed no durable test code (see Durable Coverage Changed). Applies to the code reviewer's call if the result becomes `Pass`.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `077fa6853`, HEAD `bfcd82366` (documents only above the code) | macOS Darwin 25.6 (arm64) | Node v26.12.0 (the machine default), server `dist/app.js` built at HEAD by the e2e's own `tsc` + asset copy | `env -i PATH HOME=<temp> TMPDIR`, pnpm shim `/tmp/msync-bin/pnpm` (`npx pnpm@10.28.2`), test-owned data roots |
| ENV-2 | same | same | Node v22.23.3 (`/opt/homebrew/opt/node@22`): the release workflows' `node-version` and the server image's `node:22` | same |
| ENV-3 | same | same | Node v24.15.0 (npm package `node@24.15.0`): the Node of Electron 42.0; the app pins Electron 42.11.16, whose Node is a later 24.x, and runs its server through `ELECTRON_RUN_AS_NODE`. Not an Electron binary | AC-003 measurement only |
| ENV-4 | same (`git clone --no-local`; base `3d738de6e` for the comparison) | same | Node 22.23.3, pnpm 10.28.2, `pnpm install --frozen-lockfile` alone, no build output | `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace` |
| ENV-5 | same | same | Google Chrome (headless, playwright-core) on a Nuxt dev server bound to a real source node; viewport 1280x1000; locale en-US / zh-CN, timezone UTC | probe-owned hub + source + corrupting relay; `AUTOBYTEUS_ALLOWED_ORIGINS`, owner credential through `fixtures/probe-node-access.mjs` |

## Cases

All evidence paths are inside the evidence folder. A node's data root, HOME, ports and processes were test-owned in every case; no credential, token or invite was written to evidence.

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-002, 004, 006, 009, 011; AR-001..008 | server unit + architecture | `env -i … vitest run tests/unit/memory-sync tests/architecture/tracked-imports.test.ts tests/architecture/application-framework-boundaries.test.ts tests/architecture/web-generated-graphql-current.test.ts --no-watch` in `autobyteus-server-ts` | ENV-1 | Pass | `API-01-unit-and-architecture.log`, `API-01b-generated-graphql.log` | first run `Tests  1 failed \| 90 passed (91)`, the failure `spawnSync pnpm ENOENT` (pnpm not on PATH in `env -i`); `API-01b` (shim on PATH): `Tests  1 passed (1)` | The only failure was my environment, fixed by PATH; same code. |
| API-02 | AC-001, 002, 004, 005, 008, 009, 010; AR-001 | server E2E, two real server processes + counting proxy | `env -i … vitest run tests/e2e/memory-sync --no-watch` | ENV-1 | Pass | `API-02-e2e-memory-sync.log` | `Test Files  5 passed (5)`, `Tests  8 passed (8)` | The four `memory-sync-large-files` tests are in it (40 MiB + 20 MiB files, dedup, resume, per-file failure). |
| API-02b | same | same, on the release Node | `PATH=node@22… node node_modules/vitest/vitest.mjs run tests/unit/memory-sync tests/e2e/memory-sync --no-watch` | ENV-2 | Pass | `API-02b-memory-sync-node22.log` | `Test Files  19 passed (19)` | 14 unit + 5 e2e files; the e2e spawns its servers with `process.execPath`, so the servers ran on Node 22 too. |
| API-03 | regression of the edited `deferred` assertion (SM-10) | server E2E | `env -i … vitest run tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts --no-watch`, then with `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs` | ENV-1 | Pass | `API-03-agent-semantic-memory.log`, `API-03b-agent-semantic-memory-gated.log` | ungated `2 passed \| 7 skipped`; gated `Tests  9 passed (9)` | SM-10 (the edited line `const listed = scanned.files.map(...)`) is gated; only the gated run exercises it. |
| API-04 | all | server typecheck | `Reused` IMP-03 | — | Pass (reused) | `IMP-03-server-typecheck.log` (implementation) | `production errors: 0; test-file errors: 1180 in 364 files (baseline 1180 in 364 files)` | Still holds: the only change since IMP-03's commit `3a78c3eee` is the deletion of an export with no caller (`git grep` empty at HEAD) and IMP-06 `tsc -p tsconfig.build.json --noEmit` passed at `077fa6853`. |
| API-05 | regression | full server unit suite | `env -i … vitest run tests/unit tests/app-data-migrations tests/architecture tests/agent-work-journal --exclude "**/*.integration.test.ts" --no-watch --reporter=dot` (the `test:unit` script) | ENV-1 | Pass for this change; 3 failures outside it, caused by the Node version | `API-05-server-unit-full-excerpt.log`, `API-05b-failing-files-rerun.log` | `Test Files  3 failed \| 994 passed \| 5 skipped (1002)`, `Tests  3 failed \| 8486 passed`; rerun alone on Node 22: `Test Files  3 passed (3)`, `Tests  34 passed (34)` | Failures: `memory-search-store.test.ts` (`RangeError: Value is too large to be represented as a JavaScript number: 9007336693694464`, from `node:sqlite` in `MemorySearchStore.deleteChunks`), `memory-search.test.ts` (5013 ms timeout of one test), `grok-build-compaction.test.ts` (G09). None touches a file of this change (`git diff 3d738de6e HEAD` has no path in `src/memory-search`, `src/agent-execution`, their tests). Cause: the Node version: all three files pass on Node 22 (API-05b). The `memory-search-store` test also failed on Node 26 alone. Recorded in `TESTING.md` "Node version". Not repeated: a second full run of the suite on Node 22 (TESTING.md "one run per case"). |
| API-06 | AC-010 | web unit, guards, typecheck | (a) `vitest run components/settings/__tests__/MemorySyncCard.spec.ts components/settings/__tests__/NodeManager.spec.ts`; (b) `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`; (c) `pnpm -C autobyteus-web typecheck` | ENV-1 | (a) Pass, (b) Pass, (c) **Fail — not caused by this change** | `API-06a-web-specs.log`, `API-06b-web-guards.log`, `API-06c-web-typecheck.log` | (a) `Tests  17 passed (17)`; (b) `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `Passed with zero unresolved findings.`; (c) `production errors: 0; test-file errors: 94 in 41 files (baseline 93 in 40 files)` then `FAIL` | The one new file is `tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts(67,46)`: `Property 'workspaceSkills' is missing` (made required by autobyteus-460). The base commit gives the same result (API-12 section 2). No error in a file this ticket changed. Follow-up FU-003 (urgent: it stops the desktop release build). The implementation's "6 more test-file errors" came from not running `prepare:shared-types`; the full command shows 1. |
| API-07 | AC-003 (SR-005 wording), QR-002, REQ-002, REQ-004; R-AR-1 | two real servers, 2 / 4 / 8 GiB, RSS of both processes | `node probes-api-e2e/ac003-measure.mjs <worktree> <out.json> cold\|staged30-then-big <MiB>` with the Node of each env (runners `run-ac003*.sh`); 30 runs | ENV-1, ENV-2, ENV-3 | **Pass** under the SR-005 wording (round 1 recorded `Fail` against the SR-003 wording "below 200 MiB"; reused, not rerun: the code did not change) | `API-07-ac003-measurement.md` (table of every run), `API-07-node22-*.json`, `API-07-node24-*.json`, `API-07-node26-*.json`, `ac003-round1-250ms-sampling/` | Node 24 cold 2 GiB `355 -> 664.5 (309.5)` source, `356.5 -> 551.7 (195.2)` hub; Node 22 cold 2 GiB `268.4 -> 430.7 (162.3)` / `268.6 -> 350.4 (81.8)`; Node 24 warm 2 GiB `514.5 -> 668.6 (154.2)` / `459.2 -> 567.5 (108.3)`; every row `identical true`; cold 8 GiB Node 24 source peak 695-718, hub 555-568 | SR-005 / DEC-008: binds the first transfer of a fresh process on Node 22 and Node 24 with peak growth over idle below 400 MiB for 2 GiB and a file of at least 4 GiB. Node 22 max: source 171.8 (4 GiB), hub 103.8 (2 GiB). Node 24 max: source 362.9 (8 GiB), hub 270 (one 4 GiB run; the others 194-210). Node 26 is information only. Every run `identical true`. |
| API-08 | AC-010, REQ-007, UI states | browser (Chrome on Nuxt dev, real source node, 23 real failures) | `node probes-api-e2e/card-probe.mjs <worktree> <outputDir>`: hub + source + relay that flips the first byte of every staged piece; 23 files of 8.5 MiB (one with a 250-character path) fail verification; Chrome opens Nodes → Memory Sync in en and zh-CN | ENV-1, ENV-5 | **Fail (OBS-1)**: functional AC-010 Pass, row readability Fail (words split in every row); OBS-2 accepted (FU-005) | `API-08-card-browser/card-en-full.png`, `card-zh-CN-full.png`, `card-en-failures-block.png`, `card-zh-CN-failures-block.png`, `card-en-dom.txt`, `card-zh-CN-dom.txt`, `card-probe-result.json`, `graphql-state.json`; superseded round (long path not among the 20 listed): `API-08-card-browser-run1-longpath-not-listed/` | `title: 23 files could not be synced` / `23 个文件未能同步`; `rows: 20`; `more: and 3 more` / `另有 3 个`; `docOverflowX false`, `rowOverflows` all false; first row height 96 px (the 250-character path wraps) vs 32 px; `browserErrors: []`; GraphQL `fileFailureCount 23` with `listed 20`; amber `rgb(255, 251, 235)` box | OBS-1 (now a Local Fix) below; OBS-2 is FU-005. Reason text is the hub's own: `Uploaded file hash mismatch for agents/run-01/context_files/video-1.mp4.` (repeats the path). Last sync line stays `success`. |
| API-09 | REQ-005, AR-002 (run gate) | worker / run gate, real servers | `node probes-api-e2e/lifecycle-probe.mjs` case RS1: background loop (`intervalMs` 5000) uploading a 400 MiB file through a throttling relay; two Sync now calls after 4 pieces; a small file written after the background run's scan | ENV-1 | Pass | `API-09-10-11-lifecycle/lifecycle-probe-result.json`, `API-09-relay-events.json`, `lifecycle.out` lines | `both Sync now calls returned the same single queued run`; `exactly two commit requests in total`; `{"gets":1,"puts":50}`; `lastPieceAt` < `secondCommitAt`; imported identical; late file imported; `jobState success` | One manual run queued, runs never overlapped. |
| API-10 | REQ-003, REQ-005, REQ-006, AC-005, AC-009 | lifecycle, hub killed with SIGKILL | RS2a: kill the hub after 6 pieces of a 200 MiB file; Sync now twice while it is down; restart on the same port and data dir; Sync now. RS2b: kill the hub 600 ms into the commit request of a 1 GiB file after all 128 pieces; restart; Sync now | ENV-1 | Pass | `API-09-10-11-lifecycle/lifecycle-probe-result.json`, `API-10a-relay-events.json`, `API-10b-relay-events.json` | RS2a: `lastError: "fetch failed"`, `fileFailureCount 0`, `partialBytes 50331648`, `firstOffset 50331648`, `pieces 19`; RS2b: `puts1 128`, staged file `1073741824` bytes outside imports and manifest after restart, `puts2 0`, imported identical, staging empty | A run-level error, never a file problem; resume sends exactly the missing bytes; a complete staged file is committed without a piece. The kill did not land mid-write (partial was a multiple of 8 MiB), so a torn piece was not exercised (the stager's prefix hash is unit-tested). |
| API-11 | AC-006; node access gate; hub as the user's own node | live API, hub gate and limits | RS3 in the same probe: raw socket without a credential; the node's owner credential; a wrong token; the source token for its own and for another source id; pieces of 8 MiB + 1, at a wrong offset, as JSON; a malformed SHA-256 | ENV-1 | Pass | `API-09-10-11-lifecycle/lifecycle-probe-result.json`, `lifecycle.out` | no credential `401 NODE_CREDENTIAL_REQUIRED`; owner credential `403 NODE_ROUTE_NOT_PERMITTED`; wrong token `401 NODE_CREDENTIAL_INVALID`; own source `200 {"receivedBytes":0}`; other source id `403 … bound to a different Memory Sync source ID`; over limit `413`; wrong offset `409`; JSON piece `400 … must be sent as application/octet-stream`; bad sha `400` | OBS-3: the refused offset-mismatch piece leaves a zero-byte `<sha>.partial`. The hub kept serving its owner. |
| API-12 | build input `autobyteus-web/generated/graphql.ts` | fresh-start build | `git clone --no-local` of HEAD; `pnpm install --frozen-lockfile`; `pnpm build:electron:mac -- --arm64` (TESTING.md recipe); the same typecheck on a fresh clone of base `3d738de6e`; `pnpm generate:electron` on the feature clone | ENV-4 | Install Pass; build **stops at the typecheck, which fails identically on base**; `generate:electron` Pass; packaging `Not Tested` | `API-12-fresh-start-build.log` | section 1: `[audit:localization-literals] Passed with zero unresolved findings.`, then `production errors: 0; test-file errors: 94 in 41 files (baseline 93 in 40 files)`, `build exit=1`; section 2 (base): the same two lines; section 3: `exit=0`, `bundle contains card strings: 1 file(s) en; 1 file(s) zh-CN; fileFailureCount in 1 file(s)` | The change introduces no new fresh-start failure. Everything after the typecheck in the real job (`prepare-server`, packaging, signing, "Verify bundled Prisma", "Verify packaged terminal runtime") did not run; signing needs the runner's secrets. FU-003 must be fixed before the desktop build can pass. |

### AC-003 reading

- **Ruling (SR-005, DEC-008):** the first transfer of a fresh process is included, on Node 22 and the desktop's Node 24; AC-003/QR-002 now read: SHA-256 equal and peak RSS growth over idle of source and hub below 400 MiB, with a 2 GiB file and with a file of at least 4 GiB. Judged on the data below with no new execution (the code did not change): Node 22 max source 171.8 / hub 103.8; Node 24 max source 362.9 / hub 270; both below 400. Node 26 is information only. Reducing the first-use cost is FU-004. The bullets below are round 1's analysis, kept because they carry the evidence.

- **What holds:** transfer memory does not grow with the file (REQ-002). On Node 24 the cold peak at 2, 4 and 8 GiB is 665-677 / 665-683 / 695-718 MiB (source) and 552-565 / 550-565 / 555-568 MiB (hub); the warm growth of 4 GiB equals 2 GiB on every runtime. Imported SHA-256 equal in all 30 runs. Whole-run time for 8 GiB is 39 s (R-AR-1).
- **Warm (after the process has made one staged transfer):** below 200 MiB on every runtime: source 65-72 (Node 22), 154-167 (24), 166-174 (26); hub 18-36, 108-129, 106-147.
- **Cold (a fresh two-process run, the setup AC-003/QR-002 describe: "Local two-process run", "Measured once"):**
  - Node 22 (CI, Docker image): source 151-172, hub 81-104. Below 200.
  - Node 24 (the desktop app's server): source 309-323 (2 GiB), 341-363 (8 GiB): **above 200 MiB**; hub 193-210: **at the line** (2 GiB: 195.2, 207.8, 192.6; 4 GiB: 209.6, 194.1, and one outlier run at 270 / peak 624 that two further runs did not repeat).
  - Node 26 (this machine): source 272-304: above 200; hub 168-190.
- **Cause (from the evidence):** a 30 MiB staged control already adds 142-143 MiB to a Node 24 source (75-91 on Node 22); a 1 KiB inline-only first sync adds none. The overshoot is the first staged transfer of a process (first piece buffers, connection, hash streams, garbage not yet collected), larger on the newer V8s for the same code. Nothing in the figure scales with the file; the code reviewer's CRR-002 C-02 found no allocation in proportion to file size.
- **Why this is not mine to close as `Pass`:** QR-002 and AC-003 do not say cold or warm, or which Node. The natural reading of "a measured once run with two fresh processes" is cold, and on the desktop's runtime that is 55 % above the limit for the source. The design spec's escalation trigger says measured transfer memory above QR-002 returns to the Solution Designer. The warm reading would pass on every runtime. I do not choose between the readings; the requirement owner does.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02 (`syncs a 40 MiB attachment, two 20 MiB files…`), API-02b, API-07 (2-8 GiB through the same path), API-10 | Proven | — |
| AC-002 | Yes | API-01 (`memory-sync-batch-planner.test.ts`), API-02 (`Math.max(...request bytes) < 50 MiB`, PUT ≤ 8 MiB) | Proven | — |
| AC-003 (SR-005) | Yes | API-07 | **Proven**: SHA-256 equal in all 30 runs; peak growth over idle below 400 MiB on Node 22 (max source 171.8, hub 103.8) and Node 24 (max source 362.9 at 8 GiB, hub 270), with 2 GiB and with 4 GiB and 8 GiB files, first transfer of a fresh process included | — |
| AC-004 | Yes | API-02 (`keeps syncing the other files when the hub refuses one…`), API-01 (`memory-sync-file-failure-policy`, `memory-sync-run-outcomes`), API-08 (23 real failures recorded in one run, 24 changed files, 1 batch) | Proven | — |
| AC-005 | Yes | API-02 (`resumes an interrupted upload…`), API-10 (RS2a, RS2b) | Proven | — |
| AC-006 | Yes | API-01 (`memory-hub-response-parser.test.ts`), API-02, API-10 (hub unreachable: `jobState error`, `lastError "fetch failed"`, no file failure), API-11 (token and gate refusals) | Proven | — |
| AC-007 | No | review of `autobyteus-server-ts/docs/features/memory_sync.md` lines 245-251 ("Update every node together, and release order"; `DESIGN.md` rule 9) | Proven | — |
| AC-008 | Yes | API-02 (`memory-sync-api.e2e.test.ts`, inline operations) | Proven | — |
| AC-009 | Yes | API-01 (`memory-hub-staged-file-store.test.ts`, `memory-hub-staged-commit.test.ts`, `memory-hub-ingestion-sweep.test.ts`), API-02 (partial not in imports/manifest), API-10 (after a SIGKILL, partial and complete staged file stay out of `imports/` and the manifest) | Proven | The 24 h expiry is proven with the unit tests' clock, not waited out. |
| AC-010 | Yes | API-02 (GraphQL status + log line), API-06a (jsdom spec), API-08 (real browser, en + zh-CN) | **Not Proven** for the row's readability (REQ-007, SR-005 ruling): the count, list, "and N more", size, reason, next retry, localization and long-path wrapping are proven; words split mid-word in every row (OBS-1) until the Local Fix is re-validated | — |
| AC-011 | Yes | API-01 (`memory-file-change-planner.test.ts`), API-02 (second run sends no request) | Proven | — |
| AC-012 | No | review: `memory_sync.md` release-order section and `implementation-handoff.md` "RELEASE ORDER"; delivery notes are delivery's | Proven for docs and handoff; delivery notes pending | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 90% | API-01..03, 05, 06a, 07-12 | AC-010 readability not proven until the OBS-1 Local Fix is re-validated; AC-003 now proven under SR-005 | the OBS-1 fix and a rerun of API-08 |
| Changed-boundary execution directness | 90% | 95% | API-02, 07, 09, 10, 11: real built servers, real routes, real files | the Electron-embedded Node was approximated by the npm Node 24.15.0 | the same series inside a packaged app |
| Cross-boundary integration realism and mock gap | 85% | 93% | two real server processes, real HTTP; a relay only as fault injection; real browser against a real source node | loopback network only; no real remote hub or proxy (FU-002) | a second machine |
| Environment, configuration, identity, and fixture fidelity | 85% | 90% | API-02b on release Node 22; ENV-3 measured the desktop's Node; fresh-start clone | machine default Node 26 differs from the release; Chrome on Nuxt dev, not Electron; packaging not run | packaged build run (needs FU-003 fixed) |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | API-09 (overlap), 10 (two hub kills), 11 (gate and limits), 02 (corrupt piece, cut connection), 01 (sweep, expiry) | torn piece after a kill mid-write not hit; 24 h expiry by unit clock only | repeat the kill until a piece is torn |
| User-surface, browser, and desktop-shell confidence | 60% | 85% | API-08: en/zh-CN, 23 failures + "and 3 more", long path, no overflow, no console errors | Chrome headless, not the Electron shell (no shell code changed); OBS-1 word breaks seen in every row (a defect until fixed); no screenshot of the empty and single-failure states beyond jsdom | isolated desktop instance (rule 1) |
| Durable regression coverage quality and relevance | 90% | 92% | existing durable unit + e2e cover the criteria; no durable test removed | the rendered card, the background overlap and the hub kills exist only as temporary probes (`evidence/probes-api-e2e/`) | promote the lifecycle probe if the team wants it in CI |

- Overall post-repository confidence: 81% (simple average of the seven categories: 80, 90, 85, 85, 80, 60, 90)
- Overall final confidence: 91% (simple average: 90, 95, 93, 90, 95, 85, 92 = 640 / 7 = 91.4)
- Calculation method: simple average, as the skill allows; no project-specific method.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-010 readability, OBS-1)
- Any final applicable category below `90%`: `Yes` — user-surface, browser and desktop-shell, 85% (OBS-1)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: OBS-1 until fixed and re-validated; the packaged desktop build is unverified (FU-003 stops it at the typecheck for every branch); torn-piece-after-kill not hit.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed (nothing further pending)
- Execution mode: `Browser`, `Live API`, `Lifecycle`, `Worker or Distributed`, `Other` (measurement)
- Confidence gap or residual risk it addressed, and the expected gain: repository evidence was mocked or jsdom-only for the rendered card (60%), the background trigger, hub restart and the node gate; the independent AC-003 run. All executed: the user-surface score rose to 90%, lifecycle to 95%, and AC-003 got a decision-grade measurement.
- Browser validation needed, and why: yes; the card's wrapping, localization and the real GraphQL path were unproven by jsdom. Done (API-08).
- If `Not Required`: N/A.
- If `Blocked`: N/A.

## Desktop Application Validation

- Approach executed, and any deviation from the investigation's plan: web-equivalent browser probe (Chrome on a Nuxt dev server against a real source node). No isolated desktop instance (no shell code changed; a desktop build would stop at FU-003's typecheck).
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: API-08 (web-equivalent). Shell-specific: none changed, none proven.
- Effect on any already-running desktop application: `None`. No user data or `~/.autobyteus` was touched; all roots were temp directories.
- Behavior not directly proven and its confidence consequence: the card inside the Electron renderer and the server on Electron's embedded Node (approximated by Node 24.15.0). Consequence: user-surface and environment scores stay at 90%.

## Persisted-Data Transition Checks

- Approved persisted-data decision: source state `Directly Usable — No Migration`; hub staging and manifest `Not Affected`
- Representative existing data used: a source state without `fileFailures` read as `{}` (`memory-sync-file-failures-state.test.ts`, API-01); in API-09/10 the source state written by earlier runs of the same build was read by later runs
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-01
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: state files written by an older release were not used (none is required: additive field)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`

| Path / Test | Change | Case IDs | For A Removal: Obsolete Assertion, Upstream Evidence, And Replacement Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None | — | — | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: `Not Applicable`
- Project document changed: `TESTING.md` (a "Node version" rule under Environments), committed on its own as `docs(testing): …` (Project Documents).

## Observations

- **OBS-1 — a defect of this ticket, Local Fix (ruled by the Solution Designer in SR-005; API-08):** the failure rows carry `break-all` on the whole `<li>` (`MemorySyncCard.vue:143`), so ordinary words break mid-word in every row: `next atte / mpt`, `next att / empt`, `下次尝 / 试` (`API-08-card-browser/card-en-full.png`, `card-zh-CN-failures-block.png`). The path wraps correctly and nothing overflows. Fix: `break-words` on the row and `break-all` on the path `<span>` only. Re-validate with API-08 (en and zh-CN, long path, no split words).
- **OBS-2 (accepted, follow-up FU-005):** the reason is the hub's raw text and repeats the path already in the row.
- **OBS-3 (accepted, no action):** `MemoryHubStagedFileStore.appendPiece` opens `<sha>.partial` before it compares the offset, so a refused offset-mismatch piece leaves a zero-byte partial (swept after 24 h; the real source never sends one).
- **Hub error text:** a hub that goes away shows the owner `error · fetch failed` (REQ-006 keeps today's messages; unchanged).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Network between source and hub | loopback HTTP, a probe-owned relay for cutting, delaying and corrupting pieces and for killing the hub | a real flaky network is not reproducible | latency and proxy behavior (FU-002) not exercised |
| Electron-embedded Node | npm `node@24.15.0` binary | no Electron binary is installed in the worktree; the user's installed app must not be run (TESTING.md rule 2) | the packaged app's memory may differ slightly |
| Desktop renderer | headless Google Chrome on a Nuxt dev server | the isolated desktop instance needs a full worktree desktop build, which stops at FU-003 and adds only the unchanged shell | shell-specific rendering not proven |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| AC-003, card and lifecycle probes (`evidence/probes-api-e2e/`) | Yes | scripts kept as evidence; each removes its temp root and stops its servers (receipt in each result json: `cleanup.removedRoot`/`rootRemoved`, `serversStopped`) | Done; last check: no `ac003-*`, `card-probe-*`, `lifecycle-*` directory left in `$TMPDIR`, no server of mine running |
| Nuxt dev server and Chrome of API-08 | Yes | process group SIGTERM, then SIGKILL; `browser.close()` | `frontendStopped: true` |
| Fresh clones `/tmp/apie2e-fresh/{clone,base}`, `/tmp/apie2e-node24`, `/tmp/apie2e-scripts` | Yes | removed after the evidence was copied | Done |
| Server processes of the worktree `context-file-large-video-upload` seen on this machine | No | left alone | One broad `pkill -f "dist/app.js --host 127.0.0.1"` I ran at 14:40 to stop my own aborted series could also have matched another agent's server at that moment; `pgrep` right after showed no such process, so nothing is known to have been stopped. Noted in case that worktree saw a server exit around 14:40. |

## Preliminary Classification (On `Fail`)

- `Local Fix`: OBS-1, a bounded implementation correction in `autobyteus-web/components/settings/MemorySyncCard.vue` (`break-words` on the row, `break-all` on the path span). Recommended owner: `implementation_engineer`. The AC-003 question is closed by SR-005 and is no longer a failure.

## Latest Authoritative Result

- Result: `Fail`, on the card row's readability (AC-010 / REQ-007, case API-08, OBS-1) only; every other criterion and case is `Pass` or proven, AC-003 included (SR-005)
- Criteria not proven, or parts only the user can check (IDs): AC-010 readability (until the Local Fix is re-validated); none for the user
- Preliminary classification and recommended owner (on `Fail`): `Local Fix` → implementation engineer, through the code reviewer's failure-origin review
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review of the failing case)
- Notes: after the fix I rerun API-08 (and the card spec, API-06a) on the new commit, then the result is `Pass` and the code reviewer's test-code review is `Not Applicable` unless the fix adds a durable test. Follow-ups: FU-003 (urgent, base typecheck), FU-004 (first-use cost), FU-005 (plain-words reason); the Solution Designer sends them. RELEASE ORDER: before or with `autobyteus-workspace-6`; the fresh-start build is delivery's.
