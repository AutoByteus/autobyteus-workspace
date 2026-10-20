# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code_reviewer CRR-001 Pass (IR-001, branch head `12a23e7b8a`).
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **AE-02 ran twice.**
    - The first run was aborted at about 3 minutes. The AE-05 probe was started at the same time, and its `globalSetup` reset the shared `tests/.tmp/autobyteus-server-test.db`.
    - The rerun is the authoritative baseline.
    - The rerun also picked up the AE-05 probe file, which was still in `tests/e2e`. Without a selector that probe fails as expected. It is excluded from the comparison; the AE-03 run did not include it.
  - **AE-08b added.** `test:e2e:real -- --scenarios=deepseek.llm` was run with the synthetic vault, at no cost (the provider returns 401). It shows the vault line and the F-08 empty-selection fix, and that a refused key is not counted as a pass.
  - **AE-01 used the built CLI.** The root script `pnpm test-vault` rebuilds the server, which would have overwritten `dist` during AE-02. The root script itself was run later (`status`).
  - **AE-11..AE-14 not run.** They need the user's standing test vault (Blocked; see the result below).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/evidence/` (files `AE-*`; the `IMP-*` files belong to the implementation handoff)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review), when the round passes
- Proportional test-code review decision: `Required` on `Pass`. No durable test code was changed in this round.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `12a23e7b8a` (code identical to `855842b8f1`; later commits are docs/ticket only) | macOS 26.5.2 arm64 | Node v22.23.1, pnpm 10.28.2; server and autobyteus-ts `dist` current (no source file newer than `dist`); `pnpm test:e2e:real*` rebuilt the server in AE-08 | Agent shell with 13 inherited real `*_API_KEY` variables. Every case removed them with `env -u` or `env -i` and used fake canary values, so no case could spend the user's keys. |
| ENV-2 | as ENV-1 | as ENV-1 | E2E runs: `env -i PATH HOME=<resolved temp> TMPDIR USER LOGNAME` + `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`DEEPSEEK_API_KEY`=env canaries (+ `AUTOBYTEUS_TEST_VAULT` for AE-03) | identical apart from the selector |
| ENV-3 | as ENV-1 | as ENV-1 | Packaged worktree build `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (1.5.7-beta.3) built by `isolated-app start --build`; browser-automation launcher in attach-only mode on the instance `controlPort` | Isolated instance with its own temp data root and ports. The user's installed AutoByteus (pids 67589/70908) was running and was never touched. |
| VAULTS | — | — | `v-full` (synthetic DeepSeek/OpenAI/Anthropic/LM Studio keys) and `v-nods` (synthetic Kimi only) under `/private/tmp/tv-apie2e/`, created by the real `test-vault setup` from `0600` files of fake values | removed with `test-vault remove` at the end |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AE-R01..AE-R13 | as IMP-01..IMP-13 (AC-001..004, 007 mech., 008, 009, 011, 013 mech., 015, 016, 017 nested; REQ-011, 012 unit) | as recorded | Reused: IMP-01 … IMP-13 | (implementation handoff) | Pass | (implementation handoff `IMP-*`) | (implementation handoff) | Ran on `855842b8f1`. `git diff --name-only 855842b8f1 12a23e7b8a` lists only docs/skills and ticket files, so the code they exercise is unchanged. Every file has a header and a look-for line. |
| AE-01 | AC-001, AC-003 | test-vault CLI (no TTY) | `AUTOBYTEUS_TEST_VAULT=<tmp>/v-full node autobyteus-server-ts/dist/secret-management/cli/test-vault-cli.js setup --source <0600 synthetic file> </dev/null`, then `status`; same for `v-nods`; root script `pnpm test-vault status`; cleanup `remove` | ENV-1 | Pass | `AE-01-synthetic-vault-setup.log` | `SETTING AUTOBYTEUS_TEST_VAULT=/private/tmp/tv-apie2e/v-full`, `CONFIGURED 4`, `STATE READY`, `drwx------`/`-rw-------`, the unknown line ignored (not in the summary), `REMOVED …test-vault.db` | Vault fixtures for later cases |
| AE-02 | AC-017 (baseline) | full server E2E (`tests/e2e`, 182 files) | `env -i … pnpm test:e2e` (no selector) | ENV-2 | Pass | `AE-02-full-e2e-baseline-excerpt.log` | `Test Files  1 failed \| 91 passed \| 91 skipped (183)`. The single failure is the AE-05 probe (`zz-ae-server-key-identity.probe.test.ts`), expected without a selector. | Rerun after an aborted first run (see Deviations) |
| AE-03 | AC-017, REQ-005, QR-005 | full server E2E with the selector exported | same as AE-02 + `AUTOBYTEUS_TEST_VAULT=/private/tmp/tv-apie2e/v-full`; per-file comparison script; vault SHA-256 before and after | ENV-2 | Pass | `AE-03-full-e2e-selector-exported-excerpt.log`, `AE-03-full-e2e-comparison.txt`, `AE-03-compare-script.py.txt` | `Test Files  91 passed \| 91 skipped (182)`; `files whose status or test counts differ: 0`; identical hashes before and after; the only `Secret vault: test vault` line is the selection suite's own temp vault, never `v-full` | Deterministic harnesses never applied the exported selector |
| AE-04 | AC-005 (key identity, env clause), AC-013 (mechanics, missing-key branch), REQ-006, REQ-014 | autobyteus-ts setup → default resolver → `LLMFactory.createLLM` / `new DeepSeekLLM` → HTTP | `env -u <13 real keys> ANTHROPIC/OPENAI/DEEPSEEK_API_KEY=<env canaries> AUTOBYTEUS_TEST_VAULT=<v-full> RUN_LIVE_PROVIDER_TESTS=1 pnpm -C autobyteus-ts exec vitest run <temp probe> tests/unit/test-setup-credential-isolation.test.ts`; `fetch` stubbed for `api.deepseek.com` only | ENV-1 | Pass | `AE-04-autobyteus-ts-key-identity-probe.log`, `AE-04-probe-source.ts.txt` | `createLLM bearer sha256 matches vault canary; differs from env canary`; `DeepSeekLLM bearer sha256 matches vault canary`; `missing capability provider.grok.api-key for GROK (test vault /private/tmp/tv-apie2e/v-full); add it with pnpm test-vault setup`; `2 passed` | Temporary probe, deleted from the tree after the run. Keys compared by SHA-256 only. |
| AE-05 | AC-007 (aliases ignored), REQ-006 | server test setup → `initializeLiveServerVault` → product `createLlmProviderApiKeyResolver` | `env -u <real keys> ANTHROPIC/OPENAI/DEEPSEEK_API_KEY=<env canaries> AUTOBYTEUS_TEST_VAULT=<v-full> pnpm -C autobyteus-server-ts exec vitest run <temp probe in tests/e2e> --no-watch` | ENV-1 | Pass | `AE-05-server-key-identity-probe.log`, `AE-05-probe-source.ts.txt` | `Secret vault: test vault /private/tmp/tv-apie2e/v-full (read-only)`; `DEEPSEEK`/`OPENAI`/`ANTHROPIC key sha256 matches vault canary; differs from env canary`; setup left no `*_API_KEY` and no selector in `process.env` | Temporary probe, moved out of the tree |
| AE-06 | AC-008, REQ-009 | autobyteus-ts `liveProviderTest` | `grok-llm.test.ts` with gate + `v-full` (no Grok key) + `GROK_API_KEY=<env canary>`; then with `AUTOBYTEUS_LIVE_STRICT=1`; then gate without selector | ENV-1 | Pass | `AE-06-autobyteus-ts-missing-and-strict.log` | run 1: `[live provider skip] missing capability provider.grok.api-key for GROK (test vault …)`, `Tests  2 skipped`, `exit=0`. Run 2: `Error: LIVE_PROVIDER_UNAVAILABLE: missing capability …`, `Tests  2 failed`, `exit=1`. Run 3: `no test vault selected for Grok: set AUTOBYTEUS_TEST_VAULT`. | The env alias was ignored as well |
| AE-07 | AC-008, REQ-009, AC-007 (env alias) | server `requireLiveCapability` in the collaborators suite | `env -i … DEEPSEEK_API_KEY=<env canary> AUTOBYTEUS_TEST_VAULT=<v-nods> RUN_DEEPSEEK_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts --no-watch`; then with strict | ENV-2 | Pass | `AE-07-server-missing-capability-and-strict.log` | `[live provider skip] missing capability provider.deepseek.api-key (test vault /private/tmp/tv-apie2e/v-nods); add it with pnpm test-vault setup`; run 1 `Tests  36 skipped` `exit=0`; run 2 `Tests  3 failed \| 33 skipped`, `LIVE_PROVIDER_UNAVAILABLE`, `exit=1` | |
| AE-08 | AC-006 (vault line, preflight), REQ-010, QR-005 | `run-live-e2e.mjs` + built server + harness | `env -u <real keys> <env canaries> AUTOBYTEUS_TEST_VAULT=<v-full> pnpm test:e2e:real:preflight`; then without the selector | ENV-1 | Pass | `AE-08-real-e2e-preflight.log` | `Vault: test vault /private/tmp/tv-apie2e/v-full` and `{"scenarioId":"deepseek.llm","health":"READY","configured":["provider.deepseek.api-key"],…}`. Without the selector: `Vault: run database (set AUTOBYTEUS_TEST_VAULT to use the test vault)` and `"missing":["provider.deepseek.api-key"]`. Both `exit=0`; hashes before and after identical. | No import anywhere; env canaries ignored |
| AE-08b | AC-006 (F-08 part), REQ-009 | runner single-scenario selection | `env -u <real keys> AUTOBYTEUS_TEST_VAULT=<v-full> pnpm test:e2e:real -- --scenarios=deepseek.llm` (synthetic key → provider 401) | ENV-1 | Pass (expected failure) | `AE-08b-real-e2e-single-scenario-fake-key.log` | `✓ preflights deepseek.llm without value output`; `× executes deepseek.llm …` `LIVE_E2E_PROVIDER_OPERATION_FAILED:deepseek.llm`; `↓ tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts (0 test)`; `exit=1` | The refusal is not counted as a pass. The compaction file no longer breaks a single-scenario run (F-08). Exit 0 with a real key remains for AE-13. |
| AE-09 | AC-010, REQ-012, REQ-016 (log line, unset), REQ-007, QR-005 | Electron `isolated-baseline` forwarding → embedded server → Settings UI | 1. `env -u <real keys> AUTOBYTEUS_TEST_VAULT=<v-full> pnpm --silent isolated-app start --build`. 2. Instance log. 3. GraphQL provider status. 4. Settings → API Keys → DeepSeek: type key, **Save Key**. 5. The same mutation over GraphQL. 6. `restart` with the selector. 7. `stop`. 8. Hashes. 9. `start --from-worktree` with the selector at a missing dir. 10. `start --from-worktree` without the selector (env canaries set), then `stop`. | ENV-3 | Pass | `AE-09-isolated-instance-journey.log`, `AE-09-settings-anthropic-configured.png`, `AE-09-settings-save-refused-toast.png` | `Secret vault: test vault /private/tmp/tv-apie2e/v-full (read-only)` (start and restart). Configured providers `ANTHROPIC, DEEPSEEK, LMSTUDIO, OPENAI`. UI toast `Failed to save API key for DeepSeek` + console `Failed to save API key: SECRET_VAULT_READ_ONLY`. GraphQL `{"message":"SECRET_VAULT_READ_ONLY"…}`. Identical hashes. Missing vault: `code: APP_EXITED_BEFORE_READY` with `TEST_VAULT_NOT_FOUND: no test vault in /private/tmp/tv-apie2e/no-vault-here; run pnpm test-vault setup`. No selector: `Secret vault: application database`, configured `[]`. | Screenshot: the DeepSeek panel stays `Configured` with the red toast. The UI toast is the existing generic save-failure message; the read-only code appears in the console and GraphQL error (Settings UI is deliberately unchanged by the design). |
| AE-10 | AC-011, QR-001 | all outputs of this round | `python3 -I canary_scan.py` over `evidence/AE-*`, full E2E logs, instance logs and JSON results | ENV-1 | Pass | `AE-10-canary-scan.log`, `AE-10-canary-scan-script.py.txt` | `files scanned: 39`; `real key value matches: 0`; `synthetic vault canary matches: 0`; `env canary matches: 0` | 12 real inherited values checked (names only listed) |
| AE-11 | AC-005, REQ-008 | autobyteus-ts live → DeepSeek | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1 pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/deepseek-llm.test.ts tests/unit/test-setup-credential-isolation.test.ts` | — | Not Tested | — | — | Blocked: no standing test vault (`~/.autobyteus-test/` absent). DEC-003 forbids the agent from choosing the key source. |
| AE-12 | AC-013 (live) | `LLMFactory.createLLM` → DeepSeek | AE-04 probe with `AE_PROBE_LIVE=1` (source in `AE-04-probe-source.ts.txt`) | — | Not Tested | — | — | Blocked, as AE-11 |
| AE-13 | AC-006 (exit 0, live), REQ-010 | runner → DeepSeek | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault pnpm test:e2e:real:preflight` and `… pnpm test:e2e:real -- --scenarios=deepseek.llm`; hash before/after | — | Not Tested | — | — | Blocked, as AE-11 |
| AE-14 | AC-007 (live) | collaborators suite → DeepSeek | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_DEEPSEEK_E2E=1 ANTHROPIC_API_KEY=<canary> OPENAI_API_KEY=<canary> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts --no-watch` | — | Not Tested | — | — | Blocked, as AE-11. AC-007 marks the live run as at the user's discretion (cost). |

## Acceptance-Criteria Proof

| AC ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-09, IMP-05, AE-01 | Proven | — |
| AC-002 | No | IMP-09 | Proven | — |
| AC-003 | Yes | IMP-09, AE-01 | Proven | — |
| AC-004 | Yes | IMP-04, IMP-09 | Proven | — |
| AC-005 | Yes | AE-04 (env clause and key identity, network stubbed); AE-11 pending | Not Proven | A real request through the vault key is unproven. Not user-only: the user provides the vault, then the agent runs AE-11. |
| AC-006 | Yes | AE-08 (vault line, preflight, no import, hash), AE-08b (F-08 compaction skip); AE-13 pending | Not Proven | Exit 0 with a passing scenario needs a real key (AE-13) |
| AC-007 | Yes | AE-05, AE-07 (aliases ignored, vault keys used), IMP-05; AE-14 pending | Proven for the automated part; live run Not Proven | The live run is at the user's discretion (AC-007 text) |
| AC-008 | Yes | AE-06, AE-07, AE-08b, IMP-08 | Proven | — |
| AC-009 | Yes | IMP-07, IMP-04 (module graph) | Proven | — |
| AC-010 | Yes | AE-09 | Proven | — |
| AC-011 | Yes | AE-10, IMP-13 | Proven (for all runs so far; recheck after live runs) | — |
| AC-012 | No | code review (doc grep) | Proven by review; not re-executed | — |
| AC-013 | Yes | AE-04 (`createLLM`/`new DeepSeekLLM` without resolver; missing-key error), IMP-08; AE-12 pending | Not Proven (live completion) | as AC-005 |
| AC-014 | No | code review | Proven by review | — |
| AC-015 | Yes | IMP-04; AE-09 step 10 (unset → application database) | Proven | — |
| AC-016 | Yes | IMP-05, AE-05, AE-09 | Proven | — |
| AC-017 | Yes | AE-02 + AE-03 (full scale, 182 files identical), IMP-05 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 75% | 13 of 17 ACs proven; AC-007 automated part proven | AC-005, AC-006 (exit 0), AC-013 have no real provider success | AE-11..AE-13 with the user's vault |
| Changed-boundary execution directness | 90% | 90% | Real CLI, built servers, runner, full E2E, packaged Electron, Settings UI (AE-01..AE-09) | The provider HTTP boundary was stubbed or refused with a fake key | Live cases |
| Cross-boundary integration realism and mock gap | 75% | 75% | Only `fetch` to `api.deepseek.com` stubbed (AE-04); everything else real | A real provider has not accepted a vault key | Live cases |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | Agent shell with inherited keys replaced by canaries; clean-env E2E; vaults made by the real setup | Not the user's default `~/.autobyteus-test/vault` or a real secrets file; macOS only | Live cases on the user's vault |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Missing vault (server + instance), missing key, strict mode both packages, restart, read-only save, hashes | Windows/Linux only via injected policy (accepted) | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | AE-09 packaged build, UI, restart, stop | The toast is generic; the code appears in console/GraphQL (UI unchanged by design) | — |
| Durable regression coverage quality and relevance | 90% | 90% | IR-001 durable tests reused (IMP-04/05/07/08/11); full E2E unchanged | Key identity with env aliases present is proven only by temporary probes | Optional durable nested-run test (not required by the design) |

- Overall post-repository confidence: 87%
- Overall final confidence: 87% (broader validation of the live part is blocked; the score repeats)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`. AC-005, AC-006 (exit 0) and AC-013 need a real provider call with the user's vault.
- Any final applicable category below `90%`: `Yes`. Requirement proof 75%; integration realism 75%.
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: no real-provider success with a test-vault key yet.

## Broader Validation Decision (Mandatory)

- Decision: `Blocked` (live part). The desktop and full-E2E parts were `Required` and ran (AE-03, AE-09).
- Execution mode: Live API (autobyteus-ts live file, runner scenario, one probe; optionally the collaborators suite)
- Confidence gap it addresses and expected gain: direct proof of AC-005/006/013 (and AC-007 live). Expected to raise categories 1 and 3 to ≥95% and overall to ≥95%.
- Browser validation needed, and why or why not: done in AE-09 (Settings journey on the packaged build). Nothing further is needed.
- If `Blocked`:
  - Missing dependency: the user's standing test vault (`pnpm test-vault setup --source <owner-private secrets file the user chooses>`, holding at least the DeepSeek key).
  - Tried: synthetic vaults through the same setup path; fake keys; network stub; refusal path. These prove everything except a real provider accepting a vault key.
  - Not done: creating a vault from the shell's environment keys or from `~/.autobyteus/server-data/.env`. That is forbidden by DEC-003, REQ-004 and REQ-006.

## Desktop Application Validation (When Applicable)

- Approach executed: as planned (AE-09). A `--build` packaged worktree build was started through `isolated-app`, and the Settings UI was driven via browser-automation in attach-only mode.
- Cases proving web-equivalent behavior: AE-09 steps 3–5. Cases proving shell-specific or lifecycle behavior: AE-09 steps 1, 2, 6, 7, 9, 10.
- Effect on any already-running desktop application: `None` (installed app pids 67589/70908 still running, untouched).
- Behavior not directly proven: none in scope.

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: production `Not Affected`; test vault read-only for consumers.
- Representative existing data used: vaults made by the real `test-vault setup`.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving it: AE-03, AE-08 and AE-09 hashes are unchanged, with no sidecar files after full E2E, the runner and the instance (including save attempts).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`. A missing vault stops the server; there is no fallback (AE-09 step 9).
- Residual untested persisted-data risk: none beyond P-002 (observed in IMP-10).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. Env aliases are ignored on both packages (AE-04..AE-08); no env→key path remains.
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
| DeepSeek HTTP API (AE-04 only) | `vi.stubGlobal('fetch')` for `https://api.deepseek.com` | No real vault key is available; real env keys must not be spent | No real completion (AE-11/12 pending) |
| Provider keys | Synthetic vaults with fake values (AE-01..AE-09) | DEC-003 | Real acceptance unproven |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/llm/zz-ae-key-identity.probe.test.ts` | Yes | deleted from the tree; source kept as `AE-04-probe-source.ts.txt` | Done |
| `autobyteus-server-ts/tests/e2e/zz-ae-server-key-identity.probe.test.ts` | Yes | moved out and deleted; source kept as `AE-05-probe-source.ts.txt` | Done |
| Vaults `v-full`, `v-nods`, synthetic source files, temp homes, full logs, `/private/tmp/tv-apie2e/` | Yes | `test-vault remove` (logged in AE-01) + `rm -rf` | Done |
| Isolated instances `iso-51425-01d8`, `iso-51590-63d7`; the failed missing-vault start | Yes | `isolated-app stop` (data roots removed, ports released); the failed start removed its own root and record | Done; `isolated-app list` shows 0 instances |
| `autobyteus-web/electron-dist/` packaged build, rebuilt server `dist` | Yes (build outputs) | left in place (untracked build outputs, reused by AE-12/13 resume) | Untracked; `git status` shows no tracked changes |
| First AE-02 run (aborted) | Yes | process tree terminated; no leftover processes | Done |

## Latest Authoritative Result

- Result: `Blocked`. **On hold since 2026-10-20:** code_reviewer reported a user-requested revision (autobyteus-ts reads `AUTOBYTEUS_TEST_VAULT` at its own key-source connection point). The package returns through implementation and code review. No real-key runs on `12a23e7b8a`. On return, recheck AE-04, AE-06, AE-11, AE-12 and AC-005/AC-009/AC-013 against the revised package. The other cases are reused only where the diff leaves their code unchanged.
- Criteria not proven:
  - AC-005 (live run).
  - AC-006 (exit 0 and hash around a passing scenario).
  - AC-013 (live completion).
  - AC-007 live run (optional, at the user's discretion).
  - None of these is a user-only check. The user only provides the missing vault.
- Preliminary classification and recommended owner: N/A (no failure found)
- Next recipient: the user (Blocked → request), per the api-e2e-engineer skill. No team handoff.
- How work resumes:
  1. The user runs `pnpm test-vault setup --source <absolute path to an owner-private secrets file with at least DEEPSEEK_API_KEY=…>`, then confirms with `pnpm test-vault status` (default location `~/.autobyteus-test/vault`).
  2. The agent then runs AE-11..AE-13, and AE-14 if the user approves its cost.
  3. The agent reruns AE-10 over the new outputs, updates this report as API-REV-002, and hands off for proportional test-code review on `Pass`.
