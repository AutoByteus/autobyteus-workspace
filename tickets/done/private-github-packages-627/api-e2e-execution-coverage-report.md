# API/E2E Execution Coverage Report — private-github-packages-627 (autobyteus-627)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`; revision record `api-e2e-revision-record.md`, `API-REV-002`; progress log `api-e2e-test-progress.md`
- **Round 2** (direct, Small/Low): SR-003, the Update checks card text (AC-008), IR-002 `12651e48f7`, from the implementation engineer without code review. Text only, no code path. Case API-11. Round 1's cases stand: nothing they exercise changed (delivery's base merge `6d2a3e88bf` is delivery's integration refresh, with its own merged-state evidence).
- Round 1; trigger: the code reviewer's CRR-001 Pass (code `30fcc50ec7`). The live cases ran first, because the GitHub test token expires 2026-11-25.
- Deviations from the plan:
  - The token's one private repository holds no package (API-00), so real GitHub proves the transport, the token-save path, the refusals and the validation reached. A private package's install, update and revocation run against the emulated GitHub on the built server (BS-E1).
  - The browser probe's emulation fixture served only the current commit. The update path also reads the installed commit's archive, so the fixture now serves every published commit, as GitHub does; the probe was rerun.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/private-github-packages-627/tickets/in-progress/private-github-packages-627/evidence/API/`

## Routing Classification

- Task size and architectural risk: as carried (Large/High route: code review selected); test-code review: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Runtime / Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `30fcc50ec7`; tests at `35a2f84fbf` | macOS 26 (Darwin 25.5.0), arm64 | Node 22.23.1; this worktree's `autobyteus-server-ts/dist` (built by `pnpm test-vault status`, which builds first) | test vault `~/.autobyteus-test/vault` (`test.github.token`, read through the vault helper, never printed); built servers on test-owned data roots (`startBuiltStudio`) |
| ENV-2 | as ENV-1 | Docker Desktop 29.0.1, image `autobyteus/autobyteus-server:beta` (arm64) | this worktree's server package (`docker buildx … --target server-package --platform linux/arm64`), mounted read-only | a test-owned container on 127.0.0.1, fresh anonymous volumes, removed with `docker rm -f -v`; the user's node containers untouched |

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | GitHub, read-only | temporary vitest probe (deleted after use): the token's private repositories by shape, anonymised | ENV-1 | Done (diagnostic) | `API-00-private-shape-probe.log` | `"agentPackage":false,"rootSkill":false,"dirs":0,"files":1` | Why no real private package can be imported; nothing written to GitHub |
| API-01 | AC-001, AC-004, AC-005 (transport) | the GitHub client ↔ real GitHub | `AUTOBYTEUS_TEST_VAULT=… AUTOBYTEUS_LIVE_STRICT=1 RUN_GITHUB_PRIVATE_REPOSITORY_E2E=1 … vitest run tests/e2e/integrations/github-private-repository-live.e2e.test.ts` | ENV-1 | Pass | `API-01-live-client.log`, `API-02-04-full-run.log` | `Tests  1 passed (1)`; token pattern matches 0 | First case of the round |
| API-02 | AC-001, AC-002, AC-005, AC-007 | the built server ↔ real GitHub (BS-L1, new) | as API-01, file `github-private-repository-built-server.e2e.test.ts` | ENV-1 | Pass | `API-02-built-server-live.log`, `API-02-04-full-run.log` | `Tests  1 passed (1)`, then the full run `Tests  3 passed (3)` | Run 1: the data root lacked its `.env` (test setup). Run 2: the `token=` scan matched a downloaded public package's own script (`serve.mjs`: `__stop?token=`); narrowed to the node's own records (the token-value scan covers every file) |
| API-03 | AC-006 (AC-001, AC-002, AC-005 on the node) | a test-owned Docker node ↔ real GitHub (BS-D1, new) | build the server package; `… RUN_GITHUB_PRIVATE_REPOSITORY_DOCKER_E2E=1 GITHUB_PRIVATE_DOCKER_SERVER_PACKAGE=<folder> … vitest run tests/e2e/integrations/github-private-repository-docker-node.e2e.test.ts` | ENV-2 | Pass | `API-03-docker-node.log` | `Tests  1 passed (1)`; the container's GitHub client sha256 equals this worktree's; `0 left` | Connected through the node's setup code; data folder streamed out in memory and scanned |
| API-04 | AC-003, AC-004, AC-005, AC-007 | the built server's scheduler ↔ emulated GitHub (+ real public GitHub) (BS-E1, new) | `RUN_GITHUB_PRIVATE_REPOSITORY_E2E=1 … vitest run …built-server.e2e.test.ts -t BS-E1` | ENV-1 | Pass | `API-04-built-server-emulated.log`, `API-02-04-full-run.log` | run 3 `Tests  1 passed`; the full run `3 passed` | Run 1: the automatic-updates field name (test query). Run 2: the emulation served only the current commit (see Round) |
| API-05 | all | whole ungated server E2E | `env -i PATH HOME=<fresh temp> TMPDIR pnpm test:e2e` | ENV-1 | Pass | `API-05-e2e.log`, `API-05-e2e-full.log.gz` | `Test Files  128 passed \| 172 skipped (300)`; `Tests  574 passed`; `EXIT 0` | The handoff ran only the affected files (IMP-06) |
| API-06 | AC-002 (UI), AC-005 | browser, both screens, en + zh-CN | `pnpm -C autobyteus-web test:e2e:github-connection-line <fresh dir>` | ENV-1 | Pass | `API-06-probe.log`, `API-06-probe/` | `{"result":"Pass", … all five WEB-627 cases "Pass"}`; custody `leaks: []` | Rerun because its fixture changed |
| API-07 | — | GraphQL in the iOS demo | `autobyteus-ios/scripts/prepare-demo-web.sh --build`; then `dist-mobile-demo` removed | ENV-1 | Pass | `API-07-ios-demo-build.log` | `Demo web content copied … EXIT 0` | `DemoWeb` is ignored; worktree clean |
| API-08 | — | build inputs (`autobyteus-web/package.json`) | fresh clone of `35a2f84fbf`, `pnpm install --frozen-lockfile`, both typechecks | ENV-1 | Pass | `API-08-fresh-start.log` | `install exit 0`; server `972 … (baseline 972 …)` PASS; web `86 … (baseline 86 …)` PASS | — |
| API-09 | AC-005 | the branch's commits | `scripts/check_secrets.sh origin/personal..HEAD` | ENV-1 | Pass | `API-09-secret-gate.log` | `secret gate: PASS (no secrets found)` over 9 commits | — |
| API-10 | — | tracked imports; server typecheck after the new tests | checker; `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-10-imports-typecheck.log` | `Tracked-import check passed`; `972 in 299 files (baseline 972 in 299 files)` | — |
| API-11 (round 2) | AC-008 | web: the Update checks card's text, en + zh-CN; docs | the texts parsed from AC-008's row and compared with both catalogues; a repository search for the old text; `NUXT_TEST=true pnpm exec vitest run components/settings`; `guard:localization-boundary`, `audit:localization-literals`; both typechecks | ENV-1 | Pass | `API-11-sr003-text.log` | `en exact match with AC-008: True`, `zh-CN … True`; `UpdateChecksCard.spec.ts (8 tests)`; `Tests  399 passed (399)`; both guards `Passed`; typechecks at baseline (web 86, server 972) | The old wording remains only in `AboutSettingsManager.autoCheck.description`, the desktop app's own version check, which uses no node token; the handoff leaves it. No browser run: a text-only change; the spec renders the real component with the real catalogue |
| Reused | AC-002 … AC-005, AC-007 | unit, integration, web unit, guards, typechecks | IMP-04 (whole unit 9035), IMP-12 (whole integration 523), IMP-07/IMP-11 (typechecks), IMP-08 (web 6121), IMP-09 (guards, demo coverage) | — | Pass | (handoff) | — | No `src` change since `30fcc50ec7` |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result | Note |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02, API-03, API-04, API-06 | Proven | Against real GitHub, the built server's private import is refused with the same package validation as a public repository of the same shape. So the access rule, the codeload download with the header, the extraction and the validation all ran on the built node and the Docker node. A private package's install runs on the built server against the emulated GitHub, whose answers follow GitHub's measured ones (AR-001, IMP-01/02). GitHub's answers do not depend on what the repository holds |
| AC-002 | Yes | API-02 (not connected text; invalid token refused, nothing saved), API-04 and API-06 (after the token is saved the import completes; the UI offers to connect in place) | Proven | — |
| AC-003 | Yes | API-04 (the node's own scheduled pass installs the new commit, automatic updates on), API-01 (ls-refs with the token, live) | Proven | The package's last check was moved back two days in the stopped node's own registry, so the 15-minute interval did not hold the pass |
| AC-004 | Yes | API-01 (no access, rejected: live), API-04 (not connected after Disconnect, rejected after a revocation: the package stays) | Proven | — |
| AC-005 | Yes | API-02, API-03, API-04 (answers, output, every file of the node), API-06 (custody), API-09 (branch) | Proven | Downloaded repository content is excluded from the `token=` scan only (the token-value scan covers it) |
| AC-006 | Yes | API-03 | Proven | — |
| AC-008 (round 2) | Yes | API-11 | Proven | en asserted by the card spec; zh-CN exact at its source; `docs/settings.md` says the same |
| AC-007 | Yes | API-02 (public package with a valid token saved), API-04 (with a revoked token saved), API-05 and the reused suites (no token) | Proven | — |

## Observations For Review

None.

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | API-01 … API-06 | — |
| Changed-boundary execution directness | 80% | 96% | built server and Docker node against real GitHub | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | real GitHub for every GitHub interaction; emulation only for a package-shaped private repository | the content of the real private repository is not package-shaped (GitHub's answers do not depend on it) |
| Environment, configuration, identity, fixture fidelity | 85% | 95% | test vault, test-owned roots and container | — |
| Failure, edge-case, lifecycle, recovery | 80% | 95% | invalid, revoked, disconnected; scheduled pass; restart | — |
| User-surface / browser | 90% | 95% | API-06 | — |
| Durable regression coverage | 85% | 95% | BS-L1, BS-E1, BS-D1 added | the live cases need a renewed token after 2026-11-25 |

- Overall final confidence: 95%. Every critical criterion is directly proven; no category is below 90%.
- Confidence-limiting residual risks: codeload's header support is undocumented (the design's risk; BS-L1/BS-D1 and the live client test catch a change while a token is valid); the live cases skip, or fail under `AUTOBYTEUS_LIVE_STRICT=1`, until `test.github.token` is renewed.

## Broader Validation Decision (Mandatory)

- Decision: `Required` — executed: built server and Docker node against real GitHub, the scheduled pass on a built server, and the browser probe.

## Persisted-Data Transition Checks

- `Not Affected` (design). Nothing new is persisted beyond the vault entry; no migration observed.

## Compatibility / Legacy Scope Check

- No compatibility behavior introduced, observed or covered.

## Durable Coverage Changed In The Codebase

| Path | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/integrations/github-private-repository-built-server.e2e.test.ts` | Added (BS-L1 live, BS-E1 emulated) | API-02, API-04 |
| `autobyteus-server-ts/tests/e2e/integrations/github-private-repository-docker-node.e2e.test.ts` | Added (BS-D1, gated) | API-03 |
| `autobyteus-web/tests/e2e/fixtures/github-private-upstream.mjs` | Updated (serves every published commit) | API-04, API-06 |

- Paths attached for test-code review: `Yes` (commit `35a2f84fbf`). No removals.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| GitHub for a private package | the probe's preload on the built server (BS-E1) | no package-shaped private repository is readable, and nothing is written to GitHub | GitHub's answers are emulated from its measured ones |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| API-00 probe file | Yes | deleted after use | worktree clean |
| Built-server data roots | Yes | removed by the tests (one failed run's root removed by hand) | removed |
| Docker container and its anonymous volumes | Yes | `docker rm -f -v` | 0 left |
| Server package build folder, fresh clone | Yes | under `/tmp`, clone removed | removed |
| `autobyteus-web/dist-mobile-demo` | Yes | removed (TESTING.md) | removed |

## Latest Authoritative Result

- Result: `Pass`.
- Criteria not proven, user-only or accepted as unverified risk: `None`.
- Evidence decisions requested: `None`.
- Round 2 result: **Pass** (API-REV-002, 95%). Route: direct Small/Low, test-code review `Not Required — direct low-risk route` (no durable test changed by API/E2E; the implementation's spec edit asserts the approved text). Next recipient from `get_handoff_rules`: `/delivery_engineer`.
- Round 1 next recipient: `/code_reviewer` (test-code review).
