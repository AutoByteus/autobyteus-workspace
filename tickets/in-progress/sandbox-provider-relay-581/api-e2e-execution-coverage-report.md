# API/E2E Execution Coverage Report: autobyteus-581

## Round

- Coverage investigation: `tickets/in-progress/sandbox-provider-relay-581/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, from `/code_reviewer` CRR-003 Pass (code `d624f09ce6`; ticket HEAD `5c6ef6ee86` holds only docs on top of it)
- Prior round reviewed: none
- Deviations from the investigation's plan:
  - The investigation reused IMP-14 for the server typecheck (API-R01). I reran it instead, because my new test files fall under it.
  - The live suite's case IDs were renumbered in the plan to match the suite's SBX-01..08.
  - Two failure diagnostics were added: API-E01 and API-E02.
  - API-L10 (AC-016) moved to the next round: its transcript step depends on F-2.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay/tickets/in-progress/sandbox-provider-relay-581/evidence/` (files starting `API-`; the commit that holds them is in the handoff message)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review). This round is a `Fail`, so it goes to failure-origin review.
- Proportional test-code review decision: `Required` once validation passes. The changed test code is listed under Durable Coverage.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `d624f09ce6` (HEAD `5c6ef6ee86`, docs only) + this round's uncommitted test files | macOS 26.5.2 arm64 | Node 22.23.1; repository suites; built server `dist` of this worktree | `env -i` clean environment for E2E; own temp HOME |
| ENV-2 | as ENV-1 | as ENV-1, Docker Desktop 29.0.1 (VM 16 GiB, 10 CPUs) | Built host node (`dist/app.js`, `startBuiltTestServer`) + sandbox image `autobyteus-server:581-api-e2e` (`5532578247f4`): `autobyteus/autobyteus-server:beta` with this commit's server package (`docker buildx … --target server-package --load` → `COPY --from`) | Test vault (anthropic, openai, grok, deepseek, gemini, glm, kimi keys; no Claude login token); own data root, DB, HOME; scripted AGY evaluator; Claude `api-key` mode with a throwaway `CLAUDE_CONFIG_DIR` |
| ENV-3 | as ENV-1 | as ENV-1 | Two built nodes (A relay with the vault, B keyless) + the Mac's CLIs: claude, codex-cli 0.172.0, grok 1.0.92, dsh | Own data roots, DBs, HOMEs (B: throwaway `CODEX_HOME`, `CLAUDE_CONFIG_DIR`) |
| ENV-4 | as ENV-1 | as ENV-2 | Built host + one plain peer; `nuxt dev` (browser mode) against the host; headless Chrome (playwright-core) at 1440×1000, en-US | — |
| ENV-5 | `5c6ef6ee86` (code `d624f09ce6`) fresh `git clone --no-local` | macOS arm64 | `pnpm install --frozen-lockfile`, then the release-desktop macOS ARM64 job's build and verify steps | No signing or notarization (runner secrets) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all | server typecheck (src + tests, with the new test files) | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-R01-server-typecheck.log` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)`, `[typecheck] PASS` | Replaces the reuse of IMP-14 |
| API-R02 | all | web typecheck | `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-R02-web-typecheck.log` | `test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `[typecheck] PASS` | — |
| API-R03 | all, REQ-016 | whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-R03-server-unit-suite.log` | `Test Files  1094 passed \| 5 skipped (1099)`, `Tests  9124 passed \| 9 skipped (9133)` | TESTING tool-unit rule |
| API-R04 | AC-001..007, QR-004 | whole server integration | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass | `API-R04-server-integration-suite.log` | `Test Files  93 passed \| 21 skipped (114)`, `Tests  534 passed \| 71 skipped (605)` | Includes API-R07 |
| API-R05 | AC-002, REQ-002, REQ-016 | whole server E2E | `env -i PATH HOME=<fresh temp> TMPDIR pnpm test:e2e` | ENV-1 | Pass | `API-R05-server-e2e-suite-excerpt.log`, `API-R05-server-e2e-suite-full.log.gz` | `Test Files  128 passed \| 176 skipped (304)`, `Tests  575 passed \| 829 skipped (1404)` | The new gated suite is skipped there |
| API-R06 | REQ-016 | gated exact tool lists | `env -i … RUN_CODEX_E2E=1 … codex-agent-tools-empty-list.e2e.test.ts`; `env -i … SEARCH_MEMORY_LIVE_E2E=agy ANTIGRAVITY_CLI_COMMAND=<fixture> … search-memory-default-tool-live.e2e.test.ts` | ENV-1 | Pass | `API-R06-gated-tool-list-suites.log` | `accepts enabled_tools: []`; `SM-agy-list … has search_memory once`; `Tests  3 passed (3)` | That log also holds `The sandbox start sweep did not finish: NodeIdentityNotMigratedError` from the in-process E2E host. A real start applies identity readiness before it composes sandboxes (`server-runtime.ts:183` before `:199`), and API-L06 proves the built-node restart |
| API-R07 | QR-004 | relayed body limit through the real gate, signing and handler | new case `QR-004 …` in `tests/integration/credential-proxy/provider-relay-peer.integration.test.ts`; `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch` | ENV-1 | Pass | `API-R04-server-integration-suite.log` (whole-suite run) | Exactly 32 MiB reaches the fake provider byte-identical with a 200 and one C5 line; 32 MiB + 1 gets `413 RELAY_BODY_TOO_LARGE`, no provider call, no C5 line | Mutation check: the relay route's `bodyLimit` set to `RELAYED_BODY_MAX_BYTES - 1` makes the case fail (`expected 502 to be 200`); restored |
| API-R08 | BEH-004, AC-015, REQ-009 | autobyteus-ts LLM, web node specs, Electron | Reused IMP-07, IMP-05, IMP-06 | — | Pass (reused) | (implementation handoff) | — | `git diff ce0e69d8d7 d624f09ce6 -- autobyteus-ts autobyteus-web test-support` is empty |
| API-R09 | build | Fresh-start desktop build | `/tmp/api581/fresh-start.sh`: `git clone --no-local` at `5c6ef6ee86`; `pnpm install --frozen-lockfile`; `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=… CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; the job's Prisma and terminal-runtime verify steps | ENV-5 | Pass | `API-R09-fresh-start-desktop-build.log`, `API-R09-fresh-start-desktop-build.sh` | `install exit 0`; `[typecheck] PASS`; `build exit 0` (`AutoByteus_personal_macos-arm64-1.5.15-beta.2.dmg`); `prisma verify exit 0`; `terminal verify (resources) exit 0`, `terminal verify (app) exit 0`; `[terminal-runtime] ok: node-pty spawn probe` | Build input changed: `autobyteus-web/generated/graphql.ts`. Signing and notarization: Not Tested (runner secrets) |
| API-R10 | AC-016 (contract review) | public skill vs. tool contracts | comparison of `SKILL.md` (`f85b30a`) with `sandbox-tool-contract.ts`, `sandbox-tool-manifest.ts`, `sandbox-settings.ts`, `sandbox-manager.ts` | ENV-1 | Pass, with doc notes | `API-R10-skill-vs-tool-contracts.log` | Refusal codes: only `SANDBOX_TOOL_FAILED` differs; names, parameters and limits match | Doc notes D-1, D-2 below; skill § 4's run-memory layout is contradicted by F-2 |
| API-L01 | AC-008, QR-001, AC-009, AC-001, AC-007, AC-006, AC-015 (role), AC-002 | live sandbox (SBX-01) | `env -i … RUN_SANDBOX_LIVE_E2E=1 SANDBOX_LIVE_E2E_IMAGE=autobyteus-server:581-api-e2e SANDBOX_LIVE_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/sandboxes/sandbox-live.e2e.test.ts --no-watch` | ENV-2 | **Fail** (intermittent, F-1) | `API-L-sandbox-live/run2/run2-vitest.log`; `run3/SBX-01.json`; `run4-sbx01-03/SBX-01.json` | Run 2: `SANDBOX_START_FAILED: The sandbox could not start: fetch failed`. Runs 3 and 4 pass, with `"readyMs": 18573` / `10079`, `"network": "internet 200 host 200"`, `"limits": "6442450944 4000000000 bridge"`, all four runtimes `"completed": true`, `{"anthropic/apiKey/200": 3, "openai/apiKey/200": 1, "xai/apiKey/200": 5}`, host peer role `sandbox`, `availability: {available: true}` | When the create succeeds, every check here passes. Host direct turns (native, Claude) complete; the one C5 line written meanwhile was the sandbox's late Grok call (`fromSandbox: true`) |
| API-L02 | AC-011 (scripted), AC-015 (delegation with file), AC-010, QR-003 | delegation into the sandbox, folders, transcript, leak scan (SBX-03) | as API-L01 with `-t "SBX-0[13]"` | ENV-2 | **Fail** (F-2) | `API-L-sandbox-live/run4-sbx01-03/SBX-03.json`, `SBX-03-run-memory-layout.json`, `run4-vitest.log` | Pass parts: `"content": "done"`, `"referenceContentMatches": true`, the workspace file, `"sharedReadOnly": "shared input\ntouch=1"`; leak scan `"bytes": 662343680, "hits": []`, processes `"count": 45, "hits": []`, workspace, run memory, C5 log, tool results: no hits for 11 vault secret IDs + the host owner credential. Fail part: `"tree": []`, `AssertionError: run memory: : expected 0 to be greater than 0` | AC-010 is proven by this case (the scan inside the container also covers the data volume that holds the misplaced memory) |
| API-L03 | AC-012, AC-011 (destroy) | caller rule; destroy (SBX-04) | as API-L01 | ENV-2 | Pass | `API-L-sandbox-live/run3/SBX-04.json` | `"otherRunCodes": ["SANDBOX_NOT_YOURS", "SANDBOX_NOT_YOURS"]`; after destroy `{"containers": [], "volumesLeft": [], "sandboxPeers": 0, "records": 0, "workspaceKept": true, "runMemoryKept": true}`, 3 anonymous volumes removed | — |
| API-L04 | AC-003 live | host unpairs a running sandbox (SBX-05) | as API-L01 | ENV-2 | Pass | `API-L-sandbox-live/run3/SBX-05.json` | `RELAY_PEER_NOT_ACCEPTED` in the run's ERROR frame, `"c5LinesAfterUnpair": 0`, destroy still `{"removed": true, "foldersKept": true}`, `"containersLeft": 0` | Run 2's failure was my assertion (it expected the turn not to complete; the native turn shows the error and then completes); fixed |
| API-L05 | AC-013 | expiry (SBX-06) | as API-L01 | ENV-2 | Pass (run 2); run 3 hit F-1 at create | `API-L-sandbox-live/run2/SBX-06.json` | `"removedAfterExpiryMs": 1097, "peersLeft": 0, "foldersKept": true` | — |
| API-L06 | AC-013, R-A | host SIGKILL with 2 sandboxes, one record lost, restart (SBX-07) | as API-L01 | ENV-2 | Pass (run 2); run 3 hit F-1 at create | `API-L-sandbox-live/run2/SBX-07.json` | `"aliveWhileDown": 2`; after start `containers 0, sandboxPeers 0, records 0, peersOfThoseNodes 0, foldersKept true` | Proves the label and orphan-peer sweep on a real built-node start |
| API-L07 | AC-014, R-B | 5 parallel creates; collaboration off; home folder (SBX-08) | as API-L01 | ENV-2 | **Fail** (F-1) | `API-L-sandbox-live/run2/SBX-08.json`, `run3/SBX-08.json` | `"calls": 5, "ready": 3, "refusals": ["SANDBOX_LIMIT_REACHED", "SANDBOX_START_FAILED"]` (both runs); `"remoteCollaborationOff": "SANDBOX_REMOTE_COLLABORATION_OFF"`, `"homeFolderShared": "SANDBOX_SHARED_FOLDER_INVALID"`, `"left": {"containers": 0, "records": 0, "sandboxPeers": 0}` | R-B holds: exactly one `SANDBOX_LIMIT_REACHED` among 5 concurrent calls, and the failed start left nothing. The 4th slot was lost to F-1 |
| API-L08 | QR-002 | relay latency (SBX-02) | as API-L01 | ENV-2 | Pass | `API-L-sandbox-live/run3/SBX-02.json` | `"directMedianMs": 476, "relayedMedianMs": 566, "addedMedianMs": 90` (≤ 1000) | native `claude-haiku-5-5`, 5 alternating turns each |
| API-L09 | AC-001, AC-002, AC-007, REQ-001, REQ-011, SCN-005, persisted `role` | owner-managed relayed node outside Docker | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node probes/api-e2e-owner-relayed-node.mjs --output-dir=evidence/API-L09` | ENV-3 | Pass | `API-L09/API-L09-owner-relayed-node.json`, `.log` | `bNativeProvidersConfiguredBeforeRelay: []`; B states all `SIGNED_IN` (Antigravity `SIGNED_OUT`); native, Claude, Codex, Grok, DeepSeek Harness `TURN_COMPLETED` with relayed `apiKey … -> 200` lines from B; `bValueScan: {files: 213, hits: {}}`; `c5SecretHits: []`; `roleKeyInAPeersJson: false` | Run 1 was my setup error: the probe set `CODEX_HOME` to a folder it never created, so Codex's app-server exited. Probe fixed; run 2 passes |
| API-L10 | AC-016, AC-011 planted link (REQ-015) | real-model evaluator with only the tools and the skill | `node probes/api-e2e-evaluator-skill-journey.mjs --image=… --output-dir=evidence/API-L10` | ENV-2 | Next Round | — | — | Its required "read the transcript" step cannot succeed until F-2 is fixed; run it after the fix |
| API-L11 | AC-015 rendered | Nodes page label | `node probes/api-e2e-nodes-page-sandbox-label.mjs --image=autobyteus-server:581-api-e2e --output-dir=evidence/API-L11` | ENV-4 | Pass | `API-L11/API-L11-nodes-page-sandbox-label.json`, `API-L11-nodes-page-sandbox-label.png`, `API-L11-nodes-page-after-destroy.png` | One `node-sandbox-label-*` chip, text `sandbox`, on `sbx_…` row; `plainPeerLabelled: false`; after destroy `labelsAfterDestroy: 0`; screenshot shows the amber "sandbox" chip beside `sbx_9d1a954714` | Console CORS errors: the window's direct status check on the sandbox's own port, whose allowed origins don't include the probe's dev origin. See residual risk R-3 |
| API-L12 | AC-005 live | Claude and Grok login tokens | `probes/sandbox-live-smoke.mjs --login-tokens --runtimes=claude_agent_sdk,grok_build` | — | Not Tested | — | — | Waiting for the user (DEC-118): Claude setup-token missing in the vault (`MISSING provider.anthropic.login-token`); the user's Grok login last renewed 07:19Z (expired) |
| API-E01 | AC-008, QR-001 | failure diagnostic F-1 | `node evidence/API-E01-setup-code-vs-http-race.mjs autobyteus-server:581-api-e2e 4` | ENV-2 | Fail (cause found) | `API-E01-setup-code-vs-http-race.log`, `.mjs` | `"httpGapAfterCodeMs":214,"httpErrorAfterCode":"UND_ERR_SOCKET"` (3 of 4 runs; gaps 66–220 ms) | — |
| API-E02 | AC-011, REQ-009 | failure diagnostic F-2 | `node evidence/API-E02-sandbox-run-memory-location.mjs autobyteus-server:581-api-e2e` (container started like a sandbox, one run created) | ENV-2 | Fail (cause found) | `API-E02-sandbox-run-memory-location.mjs`, `.log` | `server process AUTOBYTEUS_MEMORY_DIR=/home/autobyteus/run-memory`, `run_metadata.json under /home/autobyteus/run-memory: 0`, `under /home/autobyteus/data/memory: /home/autobyteus/data/memory/agents` | — |

## Failures

### F-1: `create_sandbox` fails intermittently with `SANDBOX_START_FAILED: … fetch failed` (AC-008, QR-001)

- **Observed:**
  - 4 of about 15 live creates in this round failed this way: smoke probe 1 of 3; suite run 2: SBX-01 and one of SBX-08's five; suite run 3: SBX-06, SBX-07 and one of SBX-08's five.
  - The failed creates left nothing behind: the cleanup works.
- **Expected:** a sandbox is ready within 90 s (AC-008, QR-001); the result never depends on timing.
- **Cause (API-E01):**
  - `SandboxPairing.connect` (`src/sandboxes/sandbox-pairing.ts:49-66`) waits for a setup code from the local control socket, then makes exactly one `fetch` to `<published port>/rest/node-access/setup-exchanges`.
  - A fresh node hands out its setup code 66 to 220 ms before its published HTTP port answers.
  - A request in that gap fails at the socket (`UND_ERR_SOCKET`). `fetch` then throws `fetch failed`, which `SandboxManager.create` maps to `SANDBOX_START_FAILED`.
  - The setup code is not consumed by a request that never reached the server.
- **Preliminary classification:** `Local Fix`, implementation engineer. For example: keep trying the exchange (or wait for `/rest/health`) until the creation deadline, and fail only at the deadline.

### F-2: a sandbox's run memory never reaches the host's `runMemoryFolder` (AC-011 transcript part, REQ-009, REQ-018 skill § 4)

- **Observed:** after the delegated run and four runtime turns in the sandbox, the host's `runMemoryFolder` is empty (`"tree": []`). Inside a sandbox-shaped container, a new run's memory goes to `/home/autobyteus/data/memory/agents` (an anonymous volume, removed at destroy).
- **Expected:**
  - C8 and `sandboxes.md`: "`/home/autobyteus/run-memory` its run memory".
  - Skill § 4: "Each run's memory: in `runMemoryFolder`, for an agent run under `agents/<runId>/` (its transcript `raw_traces_active.jsonl` …)".
- **Cause (API-E02):**
  - The image's starter always starts the server with `--data-dir` (`docker/starter/server-process.mjs:23`).
  - `AppConfig.setCustomAppDataDir` then sets `AUTOBYTEUS_MEMORY_DIR` to `<data-dir>/memory` unconditionally (`src/config/app-config.ts:466-468`).
  - That overrides the `AUTOBYTEUS_MEMORY_DIR=/home/autobyteus/run-memory` the sandbox manager gives the container (`sandbox-manager.ts:234`).
  - The server process still has the variable in its environment.
- **Consequence:**
  - An evaluator cannot read any transcript.
  - The transcripts are deleted with the container's volumes at destroy.
- **Preliminary classification:** `Local Fix`, implementation engineer. For example: mount `runMemoryFolder` where the sandbox's server keeps its memory, or make the setting the sandbox passes take effect.
- **Failure-origin review:** please confirm, or route as `Design Impact` if the C8 contract itself needs to change.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L01 (runs 3, 4), API-L09, API-R04 | Proven (native, Claude, Codex, Grok in a sandbox; plus DeepSeek Harness on an owner-managed relayed node; relayed `apiKey` 200 lines; B holds no key) | — |
| AC-002 | Yes | API-R03, API-R04, API-R05, API-L01 (host direct turns) | Proven | — |
| AC-003 | Yes | API-R04 (two-node test: unpaired, wrong secret), API-L04 (live unpair) | Proven | — |
| AC-004 | Yes | API-R04 (`with the switch off … gets the API key`) | Proven | — |
| AC-005 | Yes | API-R04 (automated request shapes and refusals) | Not Proven (live part) | Live Claude and Grok login-token turns need the user's Claude setup-token in the test vault and a fresh Grok login (DEC-118). I checked the vault (`MISSING provider.anthropic.login-token`) and the Grok renewal time (07:19Z, about 9 h earlier); DEC-102 forbids renewing. Waiting for the Solution Designer's message, else delivery takes it to the user |
| AC-006 | Yes | API-R04, API-L01, API-L02, API-L09 | Proven (exact keys `at,durationMs,method,path,peerNodeId,relayCredentialKind,relayId,status`; no secret in the log) | — |
| AC-007 | Yes | API-L01, API-L09, API-R03, API-R05 | Proven (relayed runtimes `SIGNED_IN`, Antigravity `SIGNED_OUT`; Claude api-key mode with the vault on the host) | — |
| AC-008 | Yes | API-L01, API-E01 | **Not Proven: Fail (F-1)** | — |
| AC-009 | Yes | API-L01 | Proven (`internet 200 host 200`; host `available: true` as a peer) | — |
| AC-010 | Yes | API-L02 | Proven (0 hits: 662 MB of sandbox files incl. volumes, 45 processes' environments and command lines, mapped folders, container env, C5 log, tool results) | — |
| AC-011 | Yes | API-L02, API-L03, (API-L10 next round) | **Not Proven: Fail (F-2)**. The delegation, the answer with its file, the folders and destroy leaving nothing are proven; the transcript and the planted link are not | — |
| AC-012 | Yes | API-L03, API-R03 | Proven | — |
| AC-013 | Yes | API-L05, API-L06, API-R03 | Proven (expiry 1.1 s after `expiresAt`; crash restart with a lost record removes both) | — |
| AC-014 | Yes | API-L07 (limit, collaboration off, home folder), API-R03 (Docker stopped, unsupported platform) | Proven for the refusals. API-L07's own result is Fail because of F-1 | Docker-stopped and platform refusals are unit-proven only: stopping the user's Docker Desktop is not allowed |
| AC-015 | Yes | API-L01 (role), API-L02 (answer with a file), API-L11 (rendered label), API-L06 (sweep unpairs orphaned sandbox peers) | Proven | — |
| AC-016 | Yes | API-R10 (contract review) | Not Proven (the live run is next round, after F-2) | — |
| QR-001 | — | API-L01 | Not Proven (F-1); when the create succeeds, ready in 10.1 to 18.6 s, well under 90 s | — |
| QR-002 | — | API-L08 | Proven (+90 ms median) | — |
| QR-003 | — | API-L02, API-R04 | Proven | — |
| QR-004 | — | API-R07 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 50% | All repository suites; live AC-001..004, 006, 007, 009, 010, 012, 013, 015 | AC-008 and AC-011 fail; AC-005 live and AC-016 not run | Fix F-1/F-2, rerun the suite, API-L10, API-L12 |
| Changed-boundary execution directness | 75% | 90% | Real Docker, real pairing, real providers, real gate | — | — |
| Cross-boundary integration realism and mock gap | 70% | 90% | Two built nodes; sandbox over Docker networking; real CLIs | Login-token providers | API-L12 |
| Environment, configuration, identity, and fixture fidelity | 75% | 85% | The image runs this commit's package; own roots; vault | The image is beta + package, not a release image; F-2 shows the image's `--data-dir` start path matters | Rerun on the fixed package |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 85% | Unpair, crash restart, expiry, parallel limit, refusals | F-1 makes create timing-dependent | After the fix, repeat creates (e.g. the SBX-08 five) |
| User-surface, browser, and desktop-shell confidence | N/A then 60% | 90% | API-L11 rendered label; IMP-06 Electron env | Desktop window's direct check of a sandbox's address (R-3) | — |
| Durable regression coverage quality and relevance | 80% | 90% | New gated suite SBX-01..08; QR-004 integration case with a mutation check | The suite needs Docker and a locally built image | — |

- Overall post-repository confidence: 74% (simple average of the 6 applicable categories)
- Overall final confidence: 83% (simple average of 7)
- Calculation method: simple average; it does not hide the failing AC-008 and AC-011
- Every critical acceptance criterion directly proven, apart from user-only or accepted-risk parts: `No` (AC-008, AC-011, AC-016)
- Any final applicable category below `90%`: `Yes`: requirement proof (50%), environment fidelity (85%), failure/lifecycle (85%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1, F-2; AC-005 live waits for the user; AC-016 live waits for the F-2 fix

## Broader Validation Decision (Mandatory)

- Decision: `Required` (and executed)
- Execution mode: `Live API`, `Worker or Distributed` (host and sandbox nodes over Docker), `Lifecycle`, `Browser`
- Gap it addresses: real Docker lifecycle, cross-node relay with real providers, the leak scan, and the rendered label. Repository tests use a fake Docker and in-process nodes.
- Browser validation: needed only for AC-015's label; done (API-L11).
- `Blocked`: only AC-005 live (DEC-118); the rest ran.

## Desktop Application Validation

- Approach: the label is web-equivalent and was proven in a browser against a built node (API-L11). The shell part, the release version reaching the embedded server, is reused from IMP-06.
- An isolated desktop instance cannot create sandboxes: its embedded server has no `AUTOBYTEUS_SANDBOX_IMAGE`, and no published image matches a worktree build.
- Effect on the running desktop application: None.
- Not directly proven: the desktop window's own status check of a sandbox peer's published address (R-3).

## Persisted-Data Transition Checks

- Approved decision: new files Not Affected; `peers.json` `role` Directly Usable — No Migration.
- Representative existing data: a peer row without `role` (unit test, in API-R03); a live normal peer beside a sandbox peer (API-L09, API-L11).
- Approved transition followed without an unnecessary migration: `Yes` (`roleKeyInAPeersJson: false` for a normal peer; `role: null` in GraphQL).
- Cases: API-R03, API-L09, API-L11.
- Version-specific runtime branch or compatibility fallback observed: `No`.
- Residual risk: none.

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only behavior observed: `No`
- Durable coverage only for compatibility: `No`
- Reroute: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/credential-proxy/provider-relay-peer.integration.test.ts` (case `QR-004 …`, header line) | Updated | API-R07 | — |
| `autobyteus-server-ts/tests/e2e/sandboxes/sandbox-live.e2e.test.ts` (new; gated `RUN_SANDBOX_LIVE_E2E=1`, `SANDBOX_LIVE_E2E_IMAGE`, the test vault) | Added | API-L01..L08 | — |

- Ticket probes (not repository suites): `probes/api-e2e-owner-relayed-node.mjs`, `probes/api-e2e-nodes-page-sandbox-label.mjs`, `probes/api-e2e-evaluator-skill-journey.mjs`.
- Added or updated paths attached for test-code review: not this round (`Fail`); they go with the passing round.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Evaluator agent (live suite) | Scripted AGY CLI (`agy-failure-cli.mjs`, `CALL_TOOL:`) calling the real tools over the real Agent Tools MCP | Deterministic tool calls | A model's own tool use is API-L10 (next round) |
| Release image | `autobyteus/autobyteus-server:beta` + this commit's server package | No release image exists for unreleased code (TESTING.md, Sandbox nodes) | Image-level differences from a real release are not covered |
| Fake provider (API-R07, API-R04) | in-process HTTP server | Body-limit and refusal paths without spending | Provider acceptance is covered live in API-L01/L09 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Sandbox containers and volumes | Yes | `destroy_sandbox`; the suite's failsafe by host label. Run 1 left 4 containers before I fixed the failsafe; removed with `docker rm -f -v` by my host's label | `docker ps -a --filter label=autobyteus.sandbox` empty |
| Built host/relay nodes, runtime roots, DBs under `tests/.tmp`, `db/` | Yes | `stop()`, `removeOwnedTestRuntime` | removed |
| Temp HOMEs, fixtures, skill copies | Yes | `rm -rf` in each probe/suite | removed |
| `nuxt dev`, headless Chrome (API-L11) | Yes | killed by the probe (`frontendExited: true`) | done |
| Diagnostic containers (API-E01, API-E02) | Yes | `docker rm -f -v` in the scripts | none left |
| Image `autobyteus-server:581-api-e2e`, `api581-server-package:d624f09ce6`; `/tmp/api581` | Yes | kept for the next round (rebuilt after the fix); removed at the end of validation | kept |
| Fresh-start clone `/tmp/api581/fresh` | Yes | removed after API-R09 | removed |

## Preliminary Classification (On `Fail`)

- F-1: `Local Fix`, implementation engineer (`SandboxPairing.connect`).
- F-2: `Local Fix`, implementation engineer (the sandbox's run-memory mount or setting versus the image's `--data-dir` start). Failure-origin review may judge it `Design Impact` if C8 must change.

## Doc Notes (no source change needed)

- D-1: the skill and `sandboxes.md` list refusal codes but not `SANDBOX_TOOL_FAILED`, the code a tool returns for an unexpected error (`sandbox-tool-manifest.ts:28`).
- D-2: the skill's result example shows `"teams": []`. The platform's tool result rule leaves out empty fields, so `teams` (and `sharedFolders` when none) are absent from real results.
- Both are for delivery's doc sync, or for the skill fix that F-2 needs anyway.

## Residual Risks

- R-1: AC-005 live (Claude, Grok login tokens) waits for the user (DEC-118).
- R-2: AC-016 and the planted-link check (REQ-015) run after F-2's fix (API-L10).
- R-3: the Nodes page in a browser logged CORS refusals from the window's direct status check of the sandbox's published address (its allowed origins don't include the dev origin). The row, label and agent count rendered. Whether the desktop window's origin is accepted by a sandbox node was not checked.
- R-4: the in-process E2E host logs a sweep warning (`NodeIdentityNotMigratedError`) because it does not apply identity readiness. Not a product path (API-L06 proves the built-node start).

## Latest Authoritative Result

- Result: **`Fail`**
- Criteria not proven:
  - AC-008, QR-001: F-1.
  - AC-011: F-2.
  - AC-016: next round, after F-2.
  - AC-005 live: Not Tested, waiting for the user (DEC-118).
- Evidence decisions requested: AC-005 live, sent 2026-11-26, decided **DEC-118** (arrange the environment; the user provides the logins).
- Preliminary classification and recommended owner: F-1 and F-2 `Local Fix`, implementation engineer; failure-origin review by the code reviewer.
- Next recipient from `get_handoff_rules`: `/code_reviewer` (failure-origin review)
- Notes:
  - Next round:
    - Rerun after the fix: API-L01..L08 (whole suite), API-E01/E02 as regression checks of the causes, API-L10, API-L11, API-R03, API-R04, API-R01, API-R02 (by impact).
    - Run API-L12 when the user is ready.
  - The new suite's SBX-03 transcript checks are `expect.soft`, so the leak scan still runs. A missing transcript still fails the case.
