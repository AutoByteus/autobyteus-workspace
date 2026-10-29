# API/E2E Execution Coverage Report — mcp-real-server-test-fixtures

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct route; test code only)
- Prior round reviewed: none
- Deviations from the plan: none in cases. API-08 had a side effect, removed after the run and recorded as observation O-1.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-real-server-test-fixtures/tickets/in-progress/mcp-real-server-test-fixtures/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Layout | Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-W | `8d7edc2827` (test code `baaee3a150`) | macOS 26 arm64, node v22.23.1, pnpm 10.28.2, uv 0.10.2 | the ticket worktree | `env -i PATH HOME=<resolved temp> TMPDIR`; launcher defaults for the `uv` environment and cache (under `$TMPDIR`, warm) |
| ENV-C | same commit | same | test-owned local clone `<L>/clone/autobyteus-workspace`: a regular checkout (`.git` directory, not a worktree), in a folder with no `autobyteus_mcps`; `pnpm install --frozen-lockfile --filter autobyteus-ts...` | fresh, offline, empty or hidden `uv` per case |
| ENV-L | same commit | same | worktree, in-process server | live Claude (host sign-in, real HOME) |

`<L>` = test-owned scratch folder `$TMPDIR/mcp189-api`, removed after the round.

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-009 | core unit; 181 matrix (AGY scripted) | Reused IMP-05, IMP-06 | — | Pass | (handoff) | `Tests  2047 passed`; `✓ agy (scripted CLI)…` | `baaee3a150` holds all test code; later commits add only TESTING.md and ticket files |
| API-R02 | AC-007, AC-008 | fixtures folder; TESTING.md commit | Reused handoff rows, rechecked | ENV-W | Pass | `API-10-safety-and-rechecks.txt` | `mcp-stdio-fixture-server.mjs mcp-test-server memory`; `docs(testing): add the core library MCP integration test layer` with ` TESTING.md \| 1 +` | — |
| API-01 | AC-001, AC-004, AC-005, QR-001 | the TESTING.md row command, run from the repository root | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` | ENV-W | Pass | `API-01-worktree-testing-md-command.log` | `python: used: python via uv`; `node: used`; `Tests  22 passed \| 1 skipped (23)`; `Duration  17.04s` | ignored and untracked set unchanged; no fixture processes left; the one skip is the ungated opt-in check |
| API-02 | AC-001, AC-005; main-checkout layout, first run | clone with fresh `uv` environment and cache (network) | same command in the clone with `UV_PROJECT_ENVIRONMENT`/`UV_CACHE_DIR` set to fresh dirs | ENV-C | Pass | `API-02-clone-first-run-fresh-uv.log` | `python: used: python via uv (<L>/uv-fresh/venv)`; `Tests  22 passed \| 1 skipped (23)`; `Duration  17.09s` | the clone's ignored set is unchanged; 27 MB environment and 27 MB cache, both outside the clone |
| API-03 | AC-001; offline from the cache | clone, `UV_OFFLINE=1`, same cache | same | ENV-C | Pass | `API-03-clone-offline-from-cache.log` | `python: used`; `Tests  22 passed \| 1 skipped (23)` | 17 s, no network |
| API-04 | AC-002 | clone, `uv` hidden | PATH with only node/pnpm links and system dirs | ENV-C | Pass | `API-04-clone-without-uv.log` | `python: skipped: uv unavailable (not on PATH)`; `Tests  11 passed \| 12 skipped (23)`; every Python suite title `(python — skipped: uv unavailable (not on PATH))` | — |
| API-05 | AC-003 | clone, preparation forced to fail | `UV_OFFLINE=1` with an empty cache and environment | ENV-C | Pass | `API-05-clone-forced-prep-failure.log` | `python: skipped: uv could not prepare the fixture: × Failed to download …  Network connectivity is disabled, but the`; `Tests  11 passed \| 12 skipped (23)` | reason cut mid-sentence (observation O-2) |
| API-06 | AC-006, AC-005, DEC-004 | opt-in check variants | five variants (file header) | ENV-W | Pass | `API-06-opt-in-variants.log` | `skipped: AUTOBYTEUS_MCPS_DIR is not set`; `skipped: server folder not found: …/no-such-server`; `pptx-mcp: 4 tools: create_ppt_from_images, replace_slide_with_image, append_images_as_slides, combine_images`; `yt-dlp-mcp: 2 tools: download_audio, download_video`; variant e `Failed to spawn: \`start-pptx-mcp\``; user repos `identical` | The ungated skip `RUN_REAL_MCP_SERVER_E2E=1 is not set` is in API-01/API-04. Variant e confirms deviation 1 independently: the requirement's `start-pptx-mcp` cannot start, and after a successful preparation that is a test failure, as DEC-002 intends. No temp copies or server processes left. |
| API-07 | REQ-005 call path | opt-in with `REAL_MCP_SERVER_CALL` on a test-owned restored `video-audio-mcp` | `… REAL_MCP_SERVER_CALL={"tool":"get_media_duration",…}` | ENV-W | Pass | `API-07-opt-in-call-path.log` | `video-audio-mcp: 32 tools: get_media_duration, …`; `called get_media_duration: isError=false` | source copy has no `.venv` afterwards |
| API-08 | AC-004 non-vacuity | product src mutated: stdio `env` dropped; HTTP request headers dropped | folder run; `git checkout` of both files | ENV-W | Pass (expected red) | `API-08-mutation-red.log` | `Tests  10 failed \| 12 passed \| 1 skipped (23)`; `× delivers the configured env and cwd…`; `× lists and calls tools with the token…`; `× fails to connect with a wrong token` | The close and hang cases also fail, because the pid-file path travels in the env. Side effect: O-1. |
| API-09 | AC-009 (live) | 181 matrix suite with the extended Node fixture, Claude | `RUN_CLAUDE_E2E=1 … mcp-runtime-tool-matrix.e2e.test.ts` | ENV-L | Pass | `API-09-matrix-claude-live.log` | `✓ claude: an agent calls all three tool kinds`; `"taskStatus":"DONE","stdioEnvDelivered":true,…,"httpToolCalls":["expected"]` | the extra fixture tools do not disturb a live agent |
| API-10 | AC-005, REQ-004, dummy values | repo state, user folders, scan | ignored-set diff start vs end; logs grep | ENV-W | Pass | `API-10-safety-and-rechecks.txt` | `identical`; every log `test-wrong-token=0` | — |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 all cases pass on Python (stdio and HTTP) with `uv` | Yes | API-01 (worktree), API-02 (fresh, non-worktree checkout), API-03 (offline from cache) | Proven |
| AC-002 without `uv`: Node runs; the log says so | Yes | API-04 | Proven |
| AC-003 preparation fails: Python skipped with the reason; Node runs | Yes | API-05 | Proven |
| AC-004 exit, hang, close, error, slow, auth cases assert their outcomes; hang well under 20 s; close proves the pid is gone | Yes | API-01…API-03 (5.2–5.7 s hang cases), API-08 (mutations go red); source reviewed (`waitForExit(pid)`, `HANG_BOUND_MS = 3_000`, `requests.every(auth === 'ok')`) | Proven |
| AC-005 repository clean; user folders unchanged | Yes | API-01, API-02, API-06, API-07, API-10 | Proven (O-1: only under a broken product env delivery) |
| AC-006 opt-in lists pptx-mcp from a temp copy; skips without the gate | Yes | API-06, API-07, API-01 (ungated skip) | Proven |
| AC-007 `cert.pem` gone, no reference | No | API-R02 | Proven |
| AC-008 one TESTING.md row in its own `docs(testing)` commit | No | API-R02 | Proven |
| AC-009 unit test and matrix suite green | Yes | API-R01, API-09 | Proven |
| QR-001 under about 60 s once cached | No | API-01, API-03 (17 s) | Proven |

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Support | Residual |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% (IMP rows) | 96% | every AC independently proven; two layouts | — |
| Changed-boundary execution directness | 90% | 97% | the tests themselves run in all real conditions (fresh, warm, offline, no `uv`, failed prep) | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | real Python and Node servers, real `uv`, real user-kind servers, live Claude | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | non-worktree clone; fresh vs cached `uv` | the user's literal main checkout was not switched (a clone gives the same layout) |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | mutation red; prep-failure skip; spawn failure counted as a failure | O-1 side effect under a product regression |
| User-surface / browser / desktop shell | N/A | N/A | test-only change | — |
| Durable regression coverage quality and relevance | 88% | 93% | mutation-proven, skip reasons visible | O-1 hardening; O-2 cosmetic |

- Overall final confidence: 95.2% (average of the six applicable categories). No category below 90%. Every critical AC directly proven.
- Broader validation decision: `Required`, executed in the CLI on a second checkout layout, with cache-state variants, user-kind servers and a live runtime cell. Browser: not applicable.

## Observations (not failures; follow-up candidates)

- **O-1 (low): the repository is protected only while the product delivers env.**
  - The launcher hands `UV_PROJECT_ENVIRONMENT` to the Python server through the stdio config's `env`.
  - If the product's env delivery regresses, the tests correctly fail (API-08). But `uv run` then falls back to `<fixture>/.venv` inside the repository (33 MB, self-ignored by uv).
  - Hardening option: put the variable in the command itself, e.g. `/usr/bin/env UV_PROJECT_ENVIRONMENT=<dir> uv run …`, so the location doesn't depend on the product under test. The artifact from this round was removed.
- **O-2 (cosmetic):** the forced-preparation skip reason is cut mid-sentence (`… Network connectivity is disabled, but the`), because uv wraps its cause line. Joining the wrapped lines would give the full text.
- **O-3 (doc wording):** REQ-005 names `start-pptx-mcp`. API-06 variant e confirms it cannot start (virtual project), so the implemented default `uv run --frozen python app/main.py` is right. The requirement wording should follow, as the handoff says.
- **O-4 (pre-existing, outside scope):** other `autobyteus-ts` unit tests leave ignored folders in the package root (`mcp-config-*`, `tmp-edit-file-*`). They were present before this round and are not from these tests.

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| Scratch `<L>` (clone, fresh/empty `uv` dirs, no-uv bin, restored `video-audio-mcp`, logs) | removed | done |
| API-08 src edits | `git checkout` | `autobyteus-ts/src` clean |
| API-08 side effect `autobyteus-ts/tests/fixtures/mcp-test-server/.venv` | removed | worktree ignored set identical to the start |
| Launcher default `uv` environment and cache under `$TMPDIR` | left (intended, outside the repository; reused by later runs) | — |
| Claude session in the user's CLI history | left (real HOME needed for the sign-in) | one short session |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven / user-only: `None`
- Next recipient: Delivery Engineer
- Durable coverage changed by API/E2E: none. The ticket's own tests were validated; test-code review is not required on the direct route.
