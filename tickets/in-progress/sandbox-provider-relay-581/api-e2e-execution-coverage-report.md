# API/E2E Execution Coverage Report: autobyteus-581

## Round

- Coverage investigation (the plan, with the round-2 rerun plan by impact): `tickets/in-progress/sandbox-provider-relay-581/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, from `/code_reviewer` CRR-005 Pass of IR-004. Code `7296a698d6` fixes F-1 and F-2. HEAD at the start was `56faf1ad73`, holding only docs on top of the code.
- Prior round reviewed: round 1 (`API-REV-001`, Fail: F-1, F-2; code `d624f09ce6`).
- Deviations from the plan: none in round 2. API-E01 and API-E02 were round-1 diagnostics; the suite's own checks now cover their causes.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay/tickets/in-progress/sandbox-provider-relay-581/evidence/` (files starting `API-`; the commit is in the handoff message)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 1: code `d624f09ce6`; round 2: code `7296a698d6` | macOS 26.5.2 arm64 | Node 22.23.1; repository suites; this worktree's built `dist` | `env -i` clean environment for E2E |
| ENV-2 | round 2: code `7296a698d6` (host `dist` rebuilt from it) | as ENV-1, Docker Desktop 29.0.1 (VM 16 GiB, 10 CPUs) | Built host node + sandbox image `autobyteus-server:581-api-e2e-r2` (`9c9ccab82f1b`): `autobyteus/autobyteus-server:beta` with this commit's server package (`docker buildx … --target server-package --load`, then `COPY --from`). Round 1 used `autobyteus-server:581-api-e2e` (`5532578247f4`) from `d624f09ce6` | Test vault (anthropic, openai, grok, deepseek, gemini, glm, kimi keys; no Claude login token); own data root, DB, HOME; scripted AGY evaluator; Claude `api-key` mode with a throwaway `CLAUDE_CONFIG_DIR` |
| ENV-3 | `d624f09ce6` | as ENV-1 | Two built nodes (A relay with the vault, B keyless) + the Mac's CLIs: claude, codex-cli 0.172.0, grok 1.0.92, dsh | Own roots, DBs, HOMEs |
| ENV-4 | as ENV-2 | as ENV-2 | Built host + a plain peer; `nuxt dev` (browser mode); headless Chrome 1440×1000 en-US | — |
| ENV-5 | `5c6ef6ee86` (code `d624f09ce6`), fresh `git clone --no-local` | macOS arm64 | frozen install + the macOS ARM64 desktop job's build and verify steps | No signing or notarization |

## Cases

Round 2 rows give the latest result. "Still valid" rows keep their round-1 result; the reason is in the investigation's rerun plan.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all | server typecheck (with the new test files) | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 (r2) | Pass | `API-R01-R03b-round2-typecheck-and-unit.log` (round 1: `API-R01-server-typecheck.log`) | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)` | Rerun in round 2 |
| API-R02 | all | web typecheck | `pnpm -C autobyteus-web typecheck` | ENV-1 (r1) | Pass | `API-R02-web-typecheck.log` | `(baseline 86 in 36 files)`, `[typecheck] PASS` | Still valid: no web cross-package test imports `src/sandboxes` |
| API-R03 | all, REQ-016 | whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 (r1) | Pass | `API-R03-server-unit-suite.log` | `Tests  9124 passed \| 9 skipped (9133)` | Round 1 |
| API-R03b | F-1, F-2 fix | `tests/unit/sandboxes`, `tests/architecture` | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/sandboxes tests/architecture --no-watch` | ENV-1 (r2) | Pass | `API-R01-R03b-round2-typecheck-and-unit.log` | `Test Files  15 passed (15)`, `Tests  83 passed (83)` | Covers the changed unit tests (incl. the new `sandbox-pairing.test.ts`) |
| API-R04 | AC-001..007, QR-004 | whole server integration | `pnpm -C autobyteus-server-ts test:integration:prepare && … test:integration` | ENV-1 (r1) | Pass | `API-R04-server-integration-suite.log` | `Tests  534 passed \| 71 skipped (605)` | Still valid: no integration test exercises `src/sandboxes` |
| API-R05 | AC-002, REQ-002, REQ-016 | whole server E2E | `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` | ENV-1 (r1) | Pass | `API-R05-server-e2e-suite-excerpt.log`, `…-full.log.gz` | `Tests  575 passed \| 829 skipped (1404)` | Still valid: no ungated E2E creates a sandbox; the start sweep is unchanged |
| API-R06 | REQ-016 | gated exact tool lists | `RUN_CODEX_E2E=1 … codex-agent-tools-empty-list`; `SEARCH_MEMORY_LIVE_E2E=agy … search-memory-default-tool-live` | ENV-1 (r1) | Pass | `API-R06-gated-tool-list-suites.log` | `accepts enabled_tools: []`; `Tests  3 passed (3)` | Still valid |
| API-R07 | QR-004 | relayed body limit, real gate | new case `QR-004 …` in `provider-relay-peer.integration.test.ts` | ENV-1 (r1) | Pass | `API-R04-server-integration-suite.log` | 32 MiB passes byte-identical (200, one C5 line); +1 byte gets `413 RELAY_BODY_TOO_LARGE`, no provider call | Mutation (route `bodyLimit` −1) fails it with `expected 502 to be 200` |
| API-R08 | BEH-004, AC-015, REQ-009 | autobyteus-ts LLM, web node specs, Electron | Reused IMP-07, IMP-05, IMP-06 | — | Pass (reused) | (implementation handoff) | — | Those packages are unchanged since those checks |
| API-R09 | build | Fresh-start desktop build | `evidence/API-R09-fresh-start-desktop-build.sh` (fresh clone; `pnpm install --frozen-lockfile`; `pnpm build:electron:mac -- --arm64` with the job's env; Prisma and terminal-runtime verify + spawn probe) | ENV-5 | Pass | `API-R09-fresh-start-desktop-build.log` | `install exit 0`; `[typecheck] PASS`; `build exit 0`; `prisma verify exit 0`; `[terminal-runtime] ok: node-pty spawn probe` | Still valid (no build input in the round-2 delta). Signing and notarization: Not Tested (runner secrets) |
| API-R10 | AC-016 (contract review) | skill vs. tool contracts | comparison of `SKILL.md` (`f85b30a`) with the tool contract and manifest | ENV-1 | Pass, with doc notes D-1, D-2 | `API-R10-skill-vs-tool-contracts.log` | Only `SANDBOX_TOOL_FAILED` differs; round 2: the § 4 run-memory layout holds | — |
| API-L01 | AC-008, QR-001, AC-009, AC-001, AC-007, AC-006, AC-015 (role), AC-002 | SBX-01 | `env -i PATH HOME USER LOGNAME TMPDIR AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_SANDBOX_LIVE_E2E=1 SANDBOX_LIVE_E2E_IMAGE=autobyteus-server:581-api-e2e-r2 SANDBOX_LIVE_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/sandboxes/sandbox-live.e2e.test.ts --no-watch` | ENV-2 | Pass (runs 5, 6) | `API-L-sandbox-live/run5-round2/SBX-01.json`, `run6-round2/SBX-01.json`, `run{5,6}-vitest.log` | `"readyMs": 8067` / `10483`; `"network": "internet 200 host 200"`; all four runtimes `true`; `{"anthropic/apiKey/200": 3, "openai/apiKey/200": 1, "xai/apiKey/200": 5}` (run 6: xai 6); `"limits": "6442450944 4000000000 bridge"` | Round 1: Fail (F-1) |
| API-L02 | AC-011 (scripted), AC-015 (delegation with file), AC-010, QR-003 | SBX-03 | as API-L01 | ENV-2 | Pass (runs 5, 6) | `run5-round2/SBX-03.json`, `SBX-03-run-memory-layout.json`; same in `run6-round2/` | 6 transcripts at `agents/<runId>/raw_traces_active.jsonl`, the delegated run's containing its token; layout `agents, episodic, run_history_index.json, semantic, semantic-global, team_run_history_index.json`; leak scan all `[]` / `{}` over `"bytes": 662446080` and 46 processes | Round 1: Fail (F-2) |
| API-L03 | AC-012, AC-011 (destroy) | SBX-04 | as API-L01 | ENV-2 | Pass (runs 3, 5, 6) | `run5-round2/SBX-04.json` | `SANDBOX_NOT_YOURS` ×2; after destroy `{"containers": [], "volumesLeft": [], "sandboxPeers": 0, "records": 0, "workspaceKept": true, "runMemoryKept": true, "transcriptsKept": true}` | `transcriptsKept` added in round 2 |
| API-L04 | AC-003 live | SBX-05 | as API-L01 | ENV-2 | Pass (runs 3, 5, 6) | `run5-round2/SBX-05.json` | `RELAY_PEER_NOT_ACCEPTED` in the run's ERROR frame; `"c5LinesAfterUnpair": 0` | — |
| API-L05 | AC-013 | SBX-06 expiry | as API-L01 | ENV-2 | Pass (runs 2, 5, 6) | `run5-round2/SBX-06.json` | `"removedAfterExpiryMs": 528, "peersLeft": 0, "foldersKept": true` (run 6: 544) | — |
| API-L06 | AC-013, R-A | SBX-07 crash restart with a lost record | as API-L01 | ENV-2 | Pass (runs 2, 5, 6) | `run5-round2/SBX-07.json` | `"aliveWhileDown": 2`; after start `containers 0, sandboxPeers 0, records 0, peersOfThoseNodes 0, foldersKept true` | — |
| API-L07 | AC-014, R-B | SBX-08 | as API-L01 | ENV-2 | Pass (runs 5, 6) | `run5-round2/SBX-08.json`, `run6-round2/SBX-08.json` | `{"calls": 5, "ready": 4, "refusals": ["SANDBOX_LIMIT_REACHED"], "containers": 4, "records": 4, "creators": 4}`; `SANDBOX_REMOTE_COLLABORATION_OFF`; `SANDBOX_SHARED_FOLDER_INVALID`; `left: {containers 0, records 0, sandboxPeers 0}` | Round 1: Fail (F-1) |
| API-L08 | QR-002 | SBX-02 latency | as API-L01 | ENV-2 | Pass (runs 3, 5, 6) | `run5-round2/SBX-02.json`, `run6-round2/SBX-02.json` | `"addedMedianMs": 16` / `68` (run 3: 90) | native `claude-haiku-5-5`, 5 alternating turns |
| API-L09 | AC-001, AC-002, AC-007, REQ-001, REQ-011, SCN-005, persisted `role` | owner-managed relayed node outside Docker | `AUTOBYTEUS_TEST_VAULT=… node probes/api-e2e-owner-relayed-node.mjs --output-dir=evidence/API-L09` | ENV-3 | Pass | `API-L09/API-L09-owner-relayed-node.json`, `.log` | All five runtimes `TURN_COMPLETED` with relayed `apiKey … -> 200` from B; `bNativeProvidersConfiguredBeforeRelay: []`; `bValueScan … hits: {}`; `roleKeyInAPeersJson: false` | Still valid (no sandbox code) |
| API-L10 | AC-016, AC-011 planted link (REQ-015) | Claude evaluator with only the 3 tools and the skill, asked by the user to evaluate a package | `AUTOBYTEUS_TEST_VAULT=… node probes/api-e2e-evaluator-skill-journey.mjs --image=autobyteus-server:581-api-e2e-r2 --output-dir=evidence/API-L10` | ENV-2 | Pass | `API-L10/API-L10-evaluator-skill-journey.json`, `API-L10-evaluator-frames.json`, `.log`, `API-L10-console.log` | `"toolSequence": ["Skill","create_sandbox","delegate_task","Bash","Bash","Bash","Bash","destroy_sandbox"]`; `delegate_task` with `"node":"sbx_81bc12b448"`; reads `workspace/sea-poem.txt` and `run-memory/agents/*/raw_traces_active.jsonl`; `"canaryInFrames": false`, `"canaryInHostFiles": []`; final answer: "`RESULTS.md`, a symlink to `host-private/private-notes.txt` … I did not open it" | The planted link was created inside the sandbox (docker exec) right after creation. The probe's idle wait did not trigger, so it ran to its 25 min deadline; the sandbox was destroyed at 30.7 s |
| API-L11 | AC-015 rendered | Nodes page label | `node probes/api-e2e-nodes-page-sandbox-label.mjs --image=autobyteus-server:581-api-e2e-r2 --output-dir=evidence/API-L11-round2` | ENV-4 | Pass | `API-L11-round2/API-L11-nodes-page-sandbox-label.json`, `.png`, `API-L11-nodes-page-after-destroy.png` (round 1: `API-L11/`) | One chip `sandbox` on the `sbx_…` row; `plainPeerLabelled: false`; `labelsAfterDestroy: 0` | Console CORS lines are the probe's dev origin (see R-3, closed) |
| API-L12 | AC-005 live | Claude and Grok login tokens | `probes/sandbox-live-smoke.mjs --login-tokens --runtimes=claude_agent_sdk,grok_build` | — | Not Tested | — | — | DEC-118: waits for the user's Claude setup-token in the test vault and a fresh Grok login |
| API-E01, API-E02 | F-1, F-2 causes | round-1 diagnostics | see round 1 | ENV-2 (r1) | Fail in round 1 (causes found); superseded | `API-E01-*`, `API-E02-*` | — | Round 2 proves the fixes through API-L01/L07 (18 creates, 0 `SANDBOX_START_FAILED`) and API-L02/L03 (transcripts on the host, kept after destroy) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L01, API-L09, API-R04 | Proven | — |
| AC-002 | Yes | API-R03, API-R04, API-R05, API-L01 (host direct turns), API-L09 | Proven | — |
| AC-003 | Yes | API-R04, API-L04 | Proven | — |
| AC-004 | Yes | API-R04 | Proven | — |
| AC-005 | Yes | API-R04 (automated request shapes, refusals) | Automated part Proven; **live part: Only The User Can Check (DEC-118), Not Tested** | Tried: the test vault has no `provider.anthropic.login-token`. The user's Grok login last renewed 07:19Z and has expired; DEC-102 forbids renewing it. DEC-118: the user adds the setup-token and uses Grok, then API/E2E runs API-L12 (about 10 min). If the user is not ready by delivery, delivery takes it to the user |
| AC-006 | Yes | API-R04, API-L01, API-L02, API-L09 | Proven | — |
| AC-007 | Yes | API-L01, API-L09, API-R03, API-R05 | Proven | — |
| AC-008 | Yes | API-L01, API-L07 (round 2) | Proven: 18 of 18 creates in runs 5 and 6, ready in 8.1 to 10.5 s | — |
| AC-009 | Yes | API-L01 | Proven | — |
| AC-010 | Yes | API-L02 | Proven: 0 hits in rounds 1 and 2 | — |
| AC-011 | Yes | API-L02, API-L03, API-L10 | Proven: delegation, answer with file, results and transcripts read from the folders, planted link not followed, nothing left after destroy | — |
| AC-012 | Yes | API-L03, API-R03 | Proven | — |
| AC-013 | Yes | API-L05, API-L06, API-R03 | Proven | — |
| AC-014 | Yes | API-L07, API-R03 | Proven. Docker-stopped and unsupported-platform refusals are unit-only, because stopping the user's Docker Desktop is not allowed | — |
| AC-015 | Yes | API-L01, API-L02, API-L06, API-L11 | Proven | — |
| AC-016 | Yes | API-L10, API-R10 | Proven | — |
| QR-001 | — | API-L01 | Proven (8.1 to 18.6 s across runs ≤ 90 s) | — |
| QR-002 | — | API-L08 | Proven (+16 / +68 / +90 ms median) | — |
| QR-003 | — | API-L02, API-R04 | Proven | — |
| QR-004 | — | API-R07 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 95% | Every critical AC proven live or automated; AC-005's live part is user-only (DEC-118) | AC-005 live | API-L12 when the user is ready |
| Changed-boundary execution directness | 75% | 95% | Real Docker, real pairing over Docker networking, real gate and signing, real providers, real CLIs | — | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | Built host and sandbox nodes; an owner-managed relayed node; a real-model evaluator following the skill | The scripted evaluator in the durable suite (its tools are real) | — |
| Environment, configuration, identity, and fixture fidelity | 75% | 95% | The image runs this commit's package on the beta image (TESTING.md's method); own roots; the test vault | A published release image cannot exist for unreleased code; the release-tag rule is unit-proven | — |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | Unpair refusal, crash restart with a lost record, expiry, parallel limit, refusals, 18 creates without the round-1 race | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | 95% | API-L11 rendered label (twice); IMP-06; the packaged renderer's `file://` origin is accepted by every node (`remote_access.md` § Allowed Origins) | — | — |
| Durable regression coverage quality and relevance | 80% | 95% | Gated suite SBX-01..08 (green twice); QR-004 integration case with a mutation check | The suite needs Docker Desktop and a locally built image | — |

- Overall post-repository confidence: 74% (round 1)
- Overall final confidence: **95%** (simple average of 7)
- Calculation method: simple average; no category below 95%
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` (AC-005 live is user-only, DEC-118)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: AC-005 live (user-only)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API`, `Worker or Distributed`, `Lifecycle`, `Browser`
- Gap closed: real Docker lifecycle, cross-node relay with real providers, the leak scan, the rendered label, and a real model evaluating through the skill.
- Browser validation: for AC-015's label only; done.
- `Blocked`: none. AC-005 live is user-only under DEC-118.

## Desktop Application Validation

- The label is web-equivalent and proven in a browser against a built node (API-L11). The shell part (the release version in the embedded server env) is reused from IMP-06.
- An isolated desktop instance cannot create sandboxes (no `AUTOBYTEUS_SANDBOX_IMAGE`, no published image for a worktree build).
- The packaged renderer reaches any node, sandboxes included, because `Origin: file://` is accepted by rule.
- Effect on the running desktop application: None.

## Persisted-Data Transition Checks

- Approved: new files Not Affected; `peers.json` `role` Directly Usable — No Migration.
- Representative existing data: a peer row without `role` (API-R03 unit), and a live normal peer beside a sandbox peer (API-L09, API-L11).
- Approved transition followed without an unnecessary migration: `Yes`.
- Compatibility fallback observed: `No`.
- Residual risk: none.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`.
- Compatibility-only behavior: `No`.
- Coverage only for compatibility: `No`.
- F-2's fix removed the ineffective `AUTOBYTEUS_MEMORY_DIR` instead of adding a second path.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/credential-proxy/provider-relay-peer.integration.test.ts` (case `QR-004 …`, header line) | Updated | API-R07 | — |
| `autobyteus-server-ts/tests/e2e/sandboxes/sandbox-live.e2e.test.ts` (new; gated `RUN_SANDBOX_LIVE_E2E=1`, `SANDBOX_LIVE_E2E_IMAGE`, the test vault; round 2 adds `transcriptsKept` to SBX-04) | Added | API-L01..L08 | — |

- Ticket probes, temporary and not repository suites: `probes/api-e2e-owner-relayed-node.mjs`, `probes/api-e2e-nodes-page-sandbox-label.mjs`, `probes/api-e2e-evaluator-skill-journey.mjs`.
- Added or updated paths attached for proportional test-code review: `Yes`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Evaluator in the durable suite | Scripted AGY CLI calling the real tools over the real Agent Tools MCP; results read from `AGY_FAKE_TOOL_LOG` | Deterministic tool calls | A model's own use is proven by API-L10 |
| Release image | beta image + this commit's server package | Unreleased code has no release image | Covered by TESTING.md's method |
| Fake provider (API-R07, API-R04) | in-process HTTP server | Body-limit and refusal paths without spending | Real providers are proven by API-L01, L09, L10 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Sandbox containers and volumes | Yes | `destroy_sandbox`; the suite's failsafe by host label | `docker ps -a --filter label=autobyteus.sandbox` empty after every run |
| Built nodes, runtime roots under `tests/.tmp`, DBs under `db/` | Yes | `stop()`, `removeOwnedTestRuntime` | removed |
| Temp HOMEs, fixtures, skill copies, `nuxt dev`, Chrome | Yes | removed or killed by each probe | done |
| Fresh-start clone | Yes | removed | done |
| Images `autobyteus-server:581-api-e2e`, `…-r2`, `api581-server-package:*`; `/tmp/api581` | Yes | `docker rmi`, `rm -rf` at the end of this round (`…-r2` kept for API-L12) | see the revision record |

## Doc Notes (no source change needed)

- D-1: `SANDBOX_TOOL_FAILED` (the code for an unexpected tool error) is in neither the skill nor `sandboxes.md`.
- D-2: the skill's result example shows `"teams": []`. Real results leave out empty fields (the platform tool result rule), so `teams`, and `sharedFolders` when there are none, are absent.
- Design spec C8: the run-memory mount is now `<data>/memory` (deviation 11, IR-004).

## Residual Risks

- R-1: AC-005 live (Claude, Grok login tokens) is user-only until the user provides the logins (DEC-118).
- R-2 (closed): AC-016 and the planted link were proven by API-L10.
- R-3 (closed): the CORS lines in API-L11 come from the probe's dev origin. The packaged renderer's `file://` origin is accepted by every node.
- R-4: the in-process E2E host logs a sweep warning (`NodeIdentityNotMigratedError`) because it does not apply identity readiness. A real start applies it before composing sandboxes (`server-runtime.ts:183` before `:199`), and API-L06 proves the built-node start.
- The sandbox host's `runMemoryFolder` now also holds the sandbox node's `semantic/`, `semantic-global/`, `episodic/` and run-history indexes, not only `agents/`. The leak scan covered them (0 hits).

## Latest Authoritative Result

- Result: **`Pass`**
- Criteria only the user can check: AC-005 live part (DEC-118); run API-L12 when the user is ready, else delivery takes it to the user.
- Evidence decisions requested: AC-005 live, 2026-11-26, decided as **DEC-118**.
- Next recipient from `get_handoff_rules`: `/code_reviewer` (proportional test-code review; Large / High)
- Notes: F-1 and F-2 from round 1 are resolved (see the revision record's Prior Failure Resolution).
