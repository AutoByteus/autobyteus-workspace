# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (round 2: `## Round 2 Delta`)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2. code_reviewer CRR-003 Pass on the cumulative package (IR-001 + IR-002 SR-009/SR-010 + IR-003 CR-001), head `a525ca02ac`. This lifts the 2026-10-20 hold.
- Prior round reviewed: round 1 (API-REV-001, `Blocked`, 87%; report and evidence in commit `17d0d5c0b5`).
- Deviations from the investigation's plan, and why:
  - **AE-06 run 3 was rerun.** The first attempt exited 127 because of an argument-order bug in my wrapper (`env` read `-u` after an assignment as a command). The bad attempt and the rerun are both in the log.
  - **AE-10 excludes the scanner's own source** (`AE-10-canary-scan-script.py.txt`). It lists the fake values it searches for by design.
  - **AE-11..AE-14 not run.** The user's standing test vault still does not exist (checked 2026-10-20, 06:4x).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/evidence/`. `AE-*` files are this round's (each round-2 log is headed `ROUND 2`; round-1 contents are in `17d0d5c0b5`). `IMP-*` files belong to the implementation handoff.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review), when the round passes
- Proportional test-code review decision: `Required` on `Pass`. No durable test code was changed in this round either.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `a525ca02ac` (code = `469de3d47e`; later commits are ticket docs only) | macOS 26.5.2 arm64 | Node v22.23.1, pnpm 10.28.2. `pnpm -C autobyteus-ts build && pnpm -C autobyteus-server-ts build` run at the start of the round (`[verify:runtime-deps] OK`) | Agent shell with 13 inherited real `*_API_KEY` variables. Every case except AE-17 removed them (`env -u`/`env -i`) and used fake canaries. AE-17 keeps them on purpose: AC-009's precondition is inherited production keys, and its gate is unset. |
| ENV-2 | as ENV-1 | as ENV-1 | E2E runs: `env -i PATH HOME=<resolved temp> TMPDIR USER LOGNAME` + `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`DEEPSEEK_API_KEY`=env canaries (+ `AUTOBYTEUS_TEST_VAULT` for AE-03) | identical apart from the selector |
| ENV-3 | as ENV-1 | as ENV-1 | **Fresh** packaged worktree build (`app.asar` built 2026-10-20 06:30 by `isolated-app start --build`); browser-automation attach-only | The user's installed AutoByteus, and someone else's instance `iso-63043-338f` (installed app), were running and never touched |
| ENV-4 | as ENV-1 | as ENV-1 | Plain `node` script in `/private/tmp/tv-r2/plain/` whose `node_modules/autobyteus-ts` links to the worktree package, so it resolves the package `exports` to `dist`. No Vitest, no test setup, no test-support import. | `tsx` is not installed in the workspace; AC-013 allows `node` |
| VAULTS | — | — | `v-full` (synthetic DeepSeek/OpenAI/Anthropic/LM Studio) and `v-nods` (synthetic Kimi only) under `/private/tmp/tv-r2/`, created by the real `test-vault setup` | removed with `test-vault remove` at the end |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AE-R14..AE-R27 (+IMP-10, IMP-11) | as IMP-14..IMP-27: AC-001..004, 008, 009, 011, 013 (mechanics), 016, 017 (nested), **018** (IMP-15/18/19); REQ-012 unit (IMP-11) | as recorded | Reused: IMP-14 … IMP-27 (IMP-17/IMP-22 superseded by IMP-26/IMP-27), IMP-10, IMP-11 | (handoff) | Pass | (handoff `IMP-*`) | (handoff) | They ran on `9498de5f8b`/`469de3d47e`. Only ticket files changed after `469de3d47e`. IMP-19 is the AC-018 negative control. |
| AE-01 | AC-001, AC-003 | test-vault CLI (no TTY) | built CLI `setup --source <0600 synthetic file>` and `status` for `v-full`/`v-nods`; root script `pnpm test-vault status`; `remove` at cleanup | ENV-1 | Pass | `AE-01-synthetic-vault-setup.log` (section `ROUND 2`) | `CONFIGURED 4`, `SETTING AUTOBYTEUS_TEST_VAULT=/private/tmp/tv-r2/v-full`, `STATE READY`, `drwx------`/`-rw-------`, root script `exit=0`, `REMOVED …` | Setup runs on the moved autobyteus-ts modules |
| AE-15 (new) | AC-013 (plain-script form, mechanics), REQ-014, REQ-004 on this path, REQ-006 | plain `node` script → autobyteus-ts `dist` → environment default → vault → HTTP | `env -u <real keys> <env canaries> AUTOBYTEUS_TEST_VAULT=<v-full> node probe.mjs stub` (fetch stubbed for `api.deepseek.com`). Then: variable unset; selector `~/.autobyteus/ae15-forbidden-probe`; selector at a missing dir. | ENV-4 | Pass | `AE-15-plain-node-script-probe.log`, `AE-15-probe-source.mjs.txt` | run 1: `sqlite modules loaded before any key lookup: []`, `bearer sha256 == vault canary: true`, `bearer sha256 == env canary: false`, `grok error: missing_api_key: missing capability provider.grok.api-key for GROK (test vault …); add it with pnpm test-vault setup`. Run 2: `missing_api_key: API key not provided for DEEPSEEK`, sqlite never loaded. Run 3: `TEST_VAULT_LOCATION_FORBIDDEN: … is inside the user's AutoByteus app data (key for DEEPSEEK)`, `exists after run: no`. Run 4: `TEST_VAULT_NOT_FOUND: … run pnpm test-vault setup (key for DEEPSEEK)`. | The real SCN-008 trigger. Env credential variables are visible to a plain script (no test setup strips them), and they are ignored. |
| AE-04 | AC-005 (key identity, env clause), AC-013 (Vitest form), REQ-006 | autobyteus-ts Vitest setup → environment default → `createLLM`/`new DeepSeekLLM` | Same temporary probe as round 1 (`AE-04-probe-source.ts.txt`) + `tests/unit/test-setup-credential-isolation.test.ts`, with `RUN_LIVE_PROVIDER_TESTS=1`. Extra control: the probe without the gate. | ENV-1 | Pass | `AE-04-autobyteus-ts-key-identity-probe.log` (section `ROUND 2`) | With the gate: `createLLM bearer sha256 matches vault canary; differs from env canary`, `Tests  5 passed \| 1 skipped`. Without the gate: `AUTOBYTEUS_TEST_VAULT visible=false`, `MissingApiKeyError: API key not provided for DEEPSEEK` (the expected control failure, 3 ×). | No installer any more; the setup keeps the selector only with the gate |
| AE-17 (new) | AC-009, REQ-011 | autobyteus-ts default suite | `pnpm -C autobyteus-ts test` with `RUN_LIVE_PROVIDER_TESTS` unset, without and then with `AUTOBYTEUS_TEST_VAULT=<v-full>` exported, in the agent shell with 13 inherited keys; per-file comparison | ENV-1 | Pass | `AE-17-autobyteus-ts-default-with-without-selector.txt` | both `Test Files  392 passed \| 21 skipped (413)`; `files whose status or test counts differ: 0`; vault hash unchanged | |
| AE-06 | AC-008, REQ-009 | autobyteus-ts `liveProviderTest` | `grok-llm.test.ts` with gate + `GROK_API_KEY=<env canary>`: (1) `v-full` (no Grok key); (2) + strict; (3) no selector; (4) selector at a missing dir | ENV-1 | Pass | `AE-06-autobyteus-ts-missing-and-strict.log` (section `ROUND 2`) | (1) `[live provider skip] missing capability provider.grok.api-key …`, `Tests  2 skipped`, `exit=0`. (2) `LIVE_PROVIDER_UNAVAILABLE`, `Tests  2 failed`, `exit=1`. (3) `no test vault selected for Grok`, `exit=0`. (4) `SecretVaultError: TEST_VAULT_NOT_FOUND … (key for GROK)`, `Tests  2 failed`, `exit=1`. | (4) is the revised rule: vault failures are failures, not skips |
| AE-02 | AC-017 (baseline) | full server E2E (183 files) | `env -i … pnpm test:e2e` | ENV-2 | Pass | `AE-02-full-e2e-baseline-excerpt.log` | `Test Files  92 passed \| 91 skipped (183)`, `# exit=0` | 183 files: `environment-key-source.e2e.test.ts` is new |
| AE-03 | AC-017, REQ-005, QR-005 | full server E2E, selector exported | as AE-02 + `AUTOBYTEUS_TEST_VAULT=<v-full>`; comparison; hashes | ENV-2 | Pass | `AE-03-full-e2e-selector-exported-excerpt.log`, `AE-03-full-e2e-comparison.txt`, `AE-03-compare-script.py.txt` | `files whose status or test counts differ: 0`; hashes identical; the only `Secret vault: test vault` line is the selection suite's own temp vault | |
| AE-05 | AC-007 (aliases ignored), **AC-018** (live-suite path), REQ-006 | server setup → `initializeLiveServerVault` → product resolvers; autobyteus-ts environment default inside the server process | temporary probe (`AE-05-probe-source.ts.txt`) with env canaries and `AUTOBYTEUS_TEST_VAULT=<v-full>` | ENV-1 | Pass | `AE-05-server-key-identity-probe.log` (section `ROUND 2`) | `DEEPSEEK`/`OPENAI`/`ANTHROPIC key sha256 matches vault canary; differs from env canary`; `resolver-less lookup: missing_api_key …` with the selector put back into `process.env`; `server resolver still reads the selected vault`; `Tests  3 passed` | |
| AE-07 | AC-008 (server), AC-007 (env alias) | `requireLiveCapability` in the collaborators suite | `env -i … DEEPSEEK_API_KEY=<canary> AUTOBYTEUS_TEST_VAULT=<v-nods> RUN_DEEPSEEK_E2E=1 … agent-initiated-collaborators.e2e.test.ts`; then strict | ENV-2 | Pass | `AE-07-server-missing-capability-and-strict.log` (section `ROUND 2`) | `missing capability provider.deepseek.api-key (test vault /private/tmp/tv-r2/v-nods) …`; `Tests  36 skipped` `exit=0`; strict `Tests  3 failed \| 33 skipped` `exit=1` | |
| AE-08 | AC-006 (vault line, preflight, no import), REQ-010, QR-005 | runner + built server + harness | `pnpm test:e2e:real:preflight` with `<v-full>`, then without the selector | ENV-1 | Pass | `AE-08-real-e2e-preflight.log` | `Vault: test vault /private/tmp/tv-r2/v-full` + `"deepseek.llm" … "configured":["provider.deepseek.api-key"]`; without: `Vault: run database (set AUTOBYTEUS_TEST_VAULT …)` + `"missing":["provider.deepseek.api-key"]`; both `exit=0`; hashes identical | |
| AE-08b | AC-006 (F-08 part), REQ-009 | runner single-scenario | `pnpm test:e2e:real -- --scenarios=deepseek.llm` with `<v-full>` (synthetic key → 401) | ENV-1 | Pass (expected failure) | `AE-08b-real-e2e-single-scenario-fake-key.log` | `× executes deepseek.llm …`, `LIVE_E2E_PROVIDER_OPERATION_FAILED:deepseek.llm`, `↓ … real-e2e-compaction-quality.e2e.test.ts (0 test)`, `exit=1` | Exit 0 with a real key remains for AE-13 |
| AE-09 | AC-010, AC-018 (user side), REQ-012, REQ-016, REQ-007, QR-005 | Electron forwarding → embedded server → Settings UI | Fresh `isolated-app start --build` with `<v-full>`; log; GraphQL; Settings → DeepSeek → Save Key; GraphQL save; `restart`; `stop`; hashes; missing-vault start; no-selector start | ENV-3 | Pass | `AE-09-isolated-instance-journey.log`, `AE-09-settings-deepseek-configured.png`, `AE-09-settings-save-refused-toast.png` | `Secret vault: test vault /private/tmp/tv-r2/v-full (read-only)` (×2). Configured `['ANTHROPIC', 'DEEPSEEK', 'LMSTUDIO', 'OPENAI']`. Toast `Failed to save API key for DeepSeek` + console `SECRET_VAULT_READ_ONLY`. GraphQL `{"message":"SECRET_VAULT_READ_ONLY"…}`. Hashes identical. Missing vault: `APP_EXITED_BEFORE_READY` + `TEST_VAULT_NOT_FOUND: … run pnpm test-vault setup`. No selector: `Secret vault: application database`, configured `[]`. | AC-018 from the user's side: the embedded server (which disables the env default) still serves the vault through its own resolvers |
| AE-10 | AC-011, QR-001 | all round-2 outputs | `python3 -I canary_scan.py` over 43 files incl. full E2E/suite logs and instance logs | ENV-1 | Pass | `AE-10-canary-scan.log`, `AE-10-canary-scan-script.py.txt` | `real key value matches: 0`; `synthetic vault canary matches: 0`; `env canary matches: 0` | Scanner source excluded (lists the fake values by design) |
| AE-11 | AC-005, REQ-008 | autobyteus-ts live → DeepSeek | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1 pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/deepseek-llm.test.ts tests/unit/test-setup-credential-isolation.test.ts` | — | Not Tested | — | — | Blocked: no standing test vault (`~/.autobyteus-test/vault` absent on 2026-10-20). DEC-003. |
| AE-12 | AC-013 (live, plain script) | plain `node` → DeepSeek | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node probe.mjs live` (source `AE-15-probe-source.mjs.txt`; one real completion) | — | Not Tested | — | — | Blocked, as AE-11 |
| AE-13 | AC-006 (exit 0, live) | runner → DeepSeek | `… pnpm test:e2e:real:preflight`; `… pnpm test:e2e:real -- --scenarios=deepseek.llm`; hash before/after | — | Not Tested | — | — | Blocked, as AE-11 |
| AE-14 | AC-007 (live, optional) | collaborators suite → DeepSeek | `… RUN_DEEPSEEK_E2E=1 ANTHROPIC_API_KEY=<canary> OPENAI_API_KEY=<canary> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts --no-watch` | — | Not Tested | — | — | Blocked; at the user's discretion (cost) |

## Acceptance-Criteria Proof

| AC ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-24, IMP-05, AE-01 | Proven | — |
| AC-002 | No | IMP-09, IMP-24 | Proven | — |
| AC-003 | Yes | IMP-24, AE-01 | Proven | — |
| AC-004 | Yes | IMP-15/17 (per-OS policy), IMP-24, AE-15 run 3 (on the autobyteus-ts path) | Proven | — |
| AC-005 | Yes | AE-04 (env clause, key identity; network stubbed); AE-11 pending | Not Proven | A real request with the vault key. Not user-only: the user provides the vault, then the agent runs AE-11. |
| AC-006 | Yes | AE-08, AE-08b; AE-13 pending | Not Proven | exit 0 for a passing scenario needs a real key |
| AC-007 | Yes | AE-05, AE-07, IMP-20; AE-14 pending | Automated part Proven; live run Not Proven | live run at the user's discretion |
| AC-008 | Yes | AE-06, AE-07, AE-08b, IMP-27 | Proven | — |
| AC-009 | Yes | AE-17, IMP-26, IMP-17 (graph) | Proven | — |
| AC-010 | Yes | AE-09 | Proven | — |
| AC-011 | Yes | AE-10, IMP-25 | Proven (recheck after live runs) | — |
| AC-012 | No | code review (doc grep) | Proven by review | — |
| AC-013 | Yes | AE-15 (plain node), AE-04 (Vitest), IMP-23, IMP-18; AE-12 pending | Not Proven (live completion) | as AC-005 |
| AC-014 | No | code review | Proven by review | — |
| AC-015 | Yes | IMP-15; AE-09 step 10 | Proven | — |
| AC-016 | Yes | IMP-20, AE-05, AE-09 | Proven | — |
| AC-017 | Yes | AE-02 + AE-03 (183 files identical), IMP-20 | Proven | — |
| AC-018 | Yes | IMP-15, IMP-18, IMP-19 (negative control), AE-05 (live-suite path), AE-09 (user side) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 75% | 15 of 18 ACs proven (incl. AC-009 revised, AC-018 new); AC-007 automated part | AC-005, AC-006 (exit 0), AC-013 have no real provider success | AE-11..AE-13 with the user's vault |
| Changed-boundary execution directness | 90% | 90% | Plain script on `dist` (AE-15), Vitest (AE-04), full suites both packages, runner, packaged Electron + UI | Provider HTTP stubbed/refused | Live cases |
| Cross-boundary integration realism and mock gap | 75% | 75% | Only `fetch` to `api.deepseek.com` stubbed | No real provider has accepted a vault key | Live cases |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | Agent shell (canaries; real keys for AC-009), clean-env E2E, vaults from the real setup, plain script resolving the package like a user | Not the default location with the user's real file; macOS only | Live cases on the user's vault |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Missing/forbidden vault on the script path, missing key, vault failure ≠ skip, strict on both packages, restart, read-only save, hashes, AC-018 control | Windows/Linux injected only (accepted) | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | AE-09 on a fresh build | The toast is generic (UI unchanged by design) | — |
| Durable regression coverage quality and relevance | 90% | 90% | IR-001/IR-002 durable tests (resolution order, graph, `readSecretEntry`, environment-key-source E2E with negative control) | Key identity with env aliases present is proven only by temporary probes | — |

- Overall post-repository confidence: 87%
- Overall final confidence: 87% (the live part is blocked; the score repeats)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`. AC-005, AC-006 (exit 0) and AC-013 need a real provider call with the user's vault.
- Any final applicable category below `90%`: `Yes`. Requirement proof 75%; integration realism 75%.
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: no real-provider success with a test-vault key yet.

## Broader Validation Decision (Mandatory)

- Decision: `Blocked` (live part). The desktop, full-E2E and plain-script parts were `Required` and ran: AE-03, AE-09, AE-15, AE-17.
- Execution mode: Live API
- Confidence gap it addresses and expected gain: direct proof of AC-005/006/013 (and AC-007 live). Expected to raise categories 1 and 3 to ≥95% and overall to ≥95%.
- Browser validation needed: done in AE-09.
- If `Blocked`:
  - Missing dependency: the user's standing test vault, holding at least the DeepSeek key (`pnpm test-vault setup --source <owner-private file the user chooses>`).
  - Tried: synthetic vaults through the real setup; fake keys; network stub; refusal paths.
  - Not done: building a vault from environment keys or `~/.autobyteus/server-data/.env`. That is forbidden by DEC-003, REQ-004 and REQ-006.

## Desktop Application Validation (When Applicable)

- Approach executed: as planned, on a fresh `--build` of `a525ca02ac`.
- Web-equivalent behavior: AE-09 steps 3–5. Shell-specific and lifecycle behavior: steps 1, 2, 6, 7, 9, 10.
- Effect on any already-running desktop application: `None`. The user's AutoByteus (restarted at 05:26, before this round) and the foreign instance `iso-63043-338f` were not touched.
- Behavior not directly proven: none in scope.

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: production `Not Affected`; test vault read-only for consumers.
- Representative existing data used: vaults made by the real `test-vault setup`.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving it: hashes are unchanged and no sidecars appear after AE-03, AE-08, AE-09 and AE-17.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`. A missing vault stops the server (AE-09) and fails autobyteus-ts lookups (AE-15, AE-06); there is no fallback.
- Residual untested persisted-data risk: none beyond P-002 (IMP-10).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. Env aliases are ignored on every path, including plain scripts (AE-15).
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| None | — | — | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| DeepSeek HTTP API (AE-04, AE-15) | `fetch` stub for `https://api.deepseek.com` only | No real vault key; real env keys must not be spent | No real completion (AE-11/12 pending) |
| Provider keys | Synthetic vaults with fake values | DEC-003 | Real acceptance unproven |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| AE-04 Vitest probe in `autobyteus-ts/tests/integration/llm/` | Yes | deleted after the run; source in evidence | Done |
| AE-05 probe in `autobyteus-server-ts/tests/e2e/` | Yes | moved out right after its run (not present during AE-02/AE-03); source in evidence | Done |
| AE-15 plain script and its `node_modules` link (`/private/tmp/tv-r2/plain`) | Yes | removed with the temp root; source in evidence | Done |
| Vaults `v-full`, `v-nods`, synthetic source files, temp homes, full logs (`/private/tmp/tv-r2`) | Yes | `test-vault remove` (logged in AE-01) + `rm -rf` | Done |
| Isolated instances `iso-63433-65b4`, `iso-64008-1d5e`; the failed missing-vault start | Yes | `isolated-app stop` (data roots removed, ports released); the failed start removed its own root and record | Done; none of mine listed |
| Rebuilt `autobyteus-ts`/server `dist`, `autobyteus-web/electron-dist/` | Yes (build outputs) | left in place, untracked; reusable for the live cases | `git status`: no tracked changes |

## Latest Authoritative Result

- Result: `Blocked`
- Criteria not proven:
  - AC-005 (live run).
  - AC-006 (exit 0 and hash around a passing scenario).
  - AC-013 (live completion from a plain script).
  - AC-007 live run (optional).
  - None of these is a user-only check. The user only provides the missing vault.
- Preliminary classification and recommended owner: N/A (no failure found)
- Next recipient: the user (Blocked → request), per the skill. No team handoff.
- How work resumes:
  1. The user runs `pnpm test-vault setup --source <absolute path to an owner-private secrets file with at least DEEPSEEK_API_KEY=…>` and checks it with `pnpm test-vault status`.
  2. The agent runs AE-11, AE-12 (plain `node` script, live), AE-13, and AE-14 if the user approves its cost.
  3. The agent reruns AE-10 over the new outputs, records API-REV-003, and on `Pass` hands off for proportional test-code review.
