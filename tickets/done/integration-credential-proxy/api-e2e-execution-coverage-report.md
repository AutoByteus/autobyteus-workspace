# API/E2E Execution Coverage Report — Credential proxy for integrations, step 1: GitHub (autobyteus-311)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`, and the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (it lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review CRR-001 pass (reviewed route)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-06 (Grok live) was first refused by xAI with `429 subscription:free-usage-exhausted` for `grok-4.7`, the account's only model (`grok models`). API-06b was added: the same cell with the recorded Grok CLI, where the probe runs with the Grok process's own environment. One live retry about 35 minutes later passed (API-06), so both are recorded.
  - The team cell (API-01) first failed because members start their runtime on their first message (see API-01 Notes). It now messages each member, as the team view does.
  - The desktop journey's Codex run was started through the instance's own GraphQL and WebSocket (the API the chat uses), not by typing in the chat. The run's settings (auto-execute off) and the server path are the same.
  - The suite file changed after the live cells ran: the scripted Grok cell, the `CODEX_HOME` real-path fix and the team cell's scan assertion. The live-cell loop body was not changed. The changed parts ran on the final file: API-01 final run, API-06b, API-06 retry and API-09.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy/tickets/in-progress/integration-credential-proxy/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. Durable coverage was added: one gated suite and two fixtures.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `2529eaaec1` (HEAD `b95bad702f`, `tickets/` only after it) + this round's uncommitted test files | macOS 26.5.2 arm64, Node 22.23.1, git 2.50.1 (Apple) | In-process studio server (`startStudioE2eRuntimeServer`) from source; `autobyteus-ts` rebuilt | <ul><li>`env -i PATH HOME=<resolved temp> TMPDIR` plus the gates.</li><li>Own temp data dir and application vault.</li><li>GitHub connected once with `test.github.token` from `~/.autobyteus-test/vault`.</li><li>Network to api.github.com and github.com.</li></ul> |
| ENV-2 | same | same | Live CLIs: `claude` 2.1.314 (haiku 4.5), `codex` 0.166.0 (`gpt-5.6-luna`, low effort), `agy` 1.4.11 (`gemini-3.8-flash-low`), `grok` 1.0.70 | <ul><li>As ENV-1, but with the real HOME/USER/LOGNAME for the signed-in CLIs.</li><li>A throwaway `CODEX_HOME` (empty `config.toml` + `auth.json` symlink).</li></ul> |
| ENV-3 | same | same | LM Studio `qwen/qwen3.6-35b-a3b` (native AutoByteus) | As ENV-1; the model was unloaded afterwards |
| ENV-4 | same | same | Full server e2e on the built server (`pnpm -C autobyteus-server-ts build`, `test:integration:prepare`) | `env -i PATH HOME=<resolved temp> TMPDIR` |
| ENV-5 | same | same | Isolated desktop instance, packaged build of this worktree (`isolated-app start --build`) | <ul><li>Owned data root.</li><li>Throwaway `CODEX_HOME`.</li><li>No test vault in the instance (its own vault).</li><li>Driven over CDP (attach only).</li></ul> |

## Cases

All commands run from the worktree root. `<gates>` always includes `RUN_GITHUB_PROXY_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault AUTOBYTEUS_LIVE_STRICT=1`, and each log's header gives the exact command. `<suite>` stands for `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts --no-watch`. Per-cell summaries are in `API-01-08-runtime-shells/<cell>.json`, value-free, with the pass masked as `rp_<pass>`.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-003…AC-007 (repository), DS-001…DS-005 | unit, integration, built-server e2e, live GitHub, web specs, card probe | Reused: IMP-01…IMP-14 | — | Pass | see `implementation-handoff.md` Checks Run | — | Still holds: `git diff --name-only 2529eaaec1 b95bad702f` lists only `tickets/`. IMP-02/04/05/09/10 ran at `32f14bfd4d`; its only later code change is covered by IMP-03/07/08/11 at `2529eaaec1` |
| API-01 | AC-002 (ticked, unticked, team), AC-003, AC-004 (ls-remote), AC-006, DS-004 | AGY runtime process (scripted CLI `agy-shell-env-probe-cli.mjs`, which runs the probe as its child), real GitHub | `<gates> RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-shell-env-probe-cli.mjs <suite>`, temp HOME | ENV-1 | Pass | `API-01-agy-scripted-cells.log`, `API-01-agy-scripted-team-rerun.log`, `API-01-06b-scripted-final.log`; `API-01-08-runtime-shells/agy-scripted.json`, `agy-not-ticked.json`, `agy-team.json` | Final run `Tests  4 passed \| 6 skipped (10)`. `agy-scripted.json`: `"apiHttp": "200"`, `"issueNumber": 1`, `"lsRemoteHead": true`, `"error": "INTEGRATION_NOT_ALLOWED"` (under `unticked`), `"error": "RUN_PASS_INVALID"` (under `stopped`). `agy-not-ticked.json`: `"address": null`, `"gitConfig": []`. `agy-team.json`: `lead.address` set, `helper.address: null`, `afterStop` `RUN_PASS_INVALID` | The first team run failed (`result.json written: expected false to be true` after 90 s): a team member's runtime starts with its first message (Reproduced; with the message added it passes). That was a test defect, not a product one |
| API-02 | AC-002, AC-003, AC-004, AC-006, AC-007 | native AutoByteus, `run_bash` | `<gates> RUN_LMSTUDIO_E2E=1 <suite> -t native`, temp HOME | ENV-3 | Pass | `API-02-native-lmstudio.log`, `API-01-08-runtime-shells/native.json` | `Tests  1 passed`; `"apiHttp": "200"`, `"issueNumber": 1`, `"lsRemoteHead": true`, statuses `INTEGRATION_NOT_ALLOWED` / `200` / `RUN_PASS_INVALID`, `"onWire": false`, `"filesInDataDir": []` | Model unloaded afterwards (`No models are currently loaded.`) |
| API-03 | same | Claude Agent SDK, Bash tool | `<gates> RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 RUN_GROK_E2E=1 RUN_AGY_E2E=1 CODEX_HOME=<temp> <suite> -t "claude\|codex\|grok\|agy-live"`, real HOME | ENV-2 | Pass | `API-03-07-live-runtimes.log`, `API-01-08-runtime-shells/claude.json` | `✓ claude: …`; `"model": "claude-haiku-4-5-20251001"`, `"apiHttp": "200"`, `"issueNumber": 1`, `"approvalsRequested": 0` | — |
| API-04 | same + DEC-011 | Codex, auto-execute **off** (`workspace-write`, approval on request) | same invocation | ENV-2 | Pass | same log; `codex-workspace-write.json` | `"autoExecuteTools": false`, `"apiHttp": "200"`, `"gitStatus": 0`, `"approvalsRequested": 0`, `"psStatus": 126` | `ps` cannot run inside Codex's macOS sandbox (exit 126). So its process listing there is empty; `env` was recorded and holds no token |
| API-05 | same | Codex, auto-execute on (`danger-full-access`) | same invocation | ENV-2 | Pass | same log; `codex-full-access.json` | `"autoExecuteTools": true`, `"apiHttp": "200"`, `"psStatus": 0` | — |
| API-06 | same | Grok Build live | First in the same invocation; retried alone: `<gates> RUN_GROK_E2E=1 <suite> -t "grok: the agent"`, real HOME | ENV-2 | Pass (on retry) | `API-03-07-live-runtimes.log` (refusal), `API-06-grok-live-retry.log`, `grok.json` | The first run shows `ERROR:{"code":"ACP_PROMPT_FAILED","message":"Rate limited: API error (status 429 Too Many Requests): subscription:free-usage-exhausted: You've used all the included free usage for model grok-4.7 …`. The retry shows `Tests  1 passed`, `"model": "grok-4.7"`, `"apiHttp": "200"`, statuses as above | The refusal came from the provider's quota, before any tool call. `grok models` lists only `grok-4.7` (Reproduced). It was not a product failure |
| API-06b | same | Grok process env (recorded fake CLI behind a wrapper that runs the probe as its child) | `<gates> RUN_GROK_SCRIPTED_E2E=1 <suite> -t "recorded fake CLI"`; again in the final run | ENV-1 | Pass | `API-06b-grok-scripted.log`, `API-01-06b-scripted-final.log`, `grok-scripted.json` | `✓ grok (recorded fake CLI): …` | Added while Grok live was refused; kept as a no-cost regression cell |
| API-07 | same | Antigravity live (host login) | API-03's invocation | ENV-2 | Pass | `API-03-07-live-runtimes.log`, `agy-live.json` | `"model": "gemini-3.8-flash-low"`, `"apiHttp": "200"`, `"issueNumber": 1` | Added one conversation to the user's `agy` history (TESTING.md) |
| API-08 | AC-006, REQ-006, REQ-010, DS-004 | the runs above | Inside each cell: untick, then call with the run's address; tick again and call; terminate, then call. Activity records | ENV-1/2/3 | Pass | each `<cell>.json` (`statuses`, `activity`) | `"error": "INTEGRATION_NOT_ALLOWED"` under `unticked`, `"status": 200` under `reticked`, `"error": "RUN_PASS_INVALID"` under `stopped`; `activity` records with `"route": "api"`/`"git"`, `"status": 200`, and `"error": "INTEGRATION_NOT_ALLOWED"` | — |
| API-09 | AC-007, REQ-009 | Shell `env`/`ps` and outputs, wire messages, data dir, `CODEX_HOME`, the CLIs' own transcripts | In-suite scans (every cell). `CODEX_HOME` scan: `<gates> RUN_AGY_FAILURE_E2E=1 CODEX_HOME=<the live cells' temp home> <suite> -t "AGY process"`. Then `node token-scan.mjs <Claude project dir> <AGY conversation> <Grok sessions> <CODEX_HOME>` (temporary) | ENV-1/2 | Pass | `API-09-codex-home-scan.log`, `API-09-codex-home-scan/agy-scripted.json`, `API-09-cli-home-token-scan.txt` | `"filesInCodexHome": []` (`<temp CODEX_HOME>` 477 files); transcripts: `"filesWithToken": []` with `filesWithMarker` 1 (Claude), 5 (AGY), 4 (Codex), 3 (Grok retry) | The marker count shows the scanned transcripts hold the probe's output. The first live run's summaries say `not scanned (not a temp CODEX_HOME)`, because of a `/var` → `/private/var` path mismatch in the test. It was fixed with `realpathSync` and proven by this case |
| API-10 | regression | full server e2e on the built server | `pnpm -C autobyteus-server-ts build`; `test:integration:prepare`; `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` | ENV-4 | Pass for this ticket | `API-10-server-e2e-full.log`, `API-10-server-e2e-full.excerpt.log` | `Test Files  9 failed \| 109 passed \| 97 skipped (215)`, `Tests  1 failed \| 469 passed \| 475 skipped (945)`; `✓ tests/e2e/credential-proxy/github-integration-graphql.e2e.test.ts (3 tests)` | <ul><li>The 9 failures are outside the ticket, each with its cause.</li><li>8 files cannot load: `claude-live-agent-harness.ts:24:7: ERROR: Expected "as" but found "{"`. That is FU-002 (Reproduced; the file is unchanged on the branch).</li><li>`scoped-org-history-graphql` expects an undeclared `llmConfig` key to be refused. Base commit `47f44c3df6` (autobyteus-8) leaves such keys out (Read) → FU-005.</li></ul> |
| API-11 | AC-001, AC-002, AC-003, AC-004, AC-006, AC-007, QR-001, QR-002, DEC-011 | isolated desktop instance, packaged worktree build (1.5.11-beta.2) | `CODEX_HOME=<temp> pnpm --silent isolated-app start --build --data-root /private/tmp/s311/desktop-root`. Then `node journey.mjs 62750 62751 …`, which drives the card over CDP; a Codex run with auto-execute off; Phone Access on; LAN checks; a clone with RSS sampling; untick and re-tick; Remove; stop. `isolated-app stop`; then the token scan | ENV-5 | Pass | `API-11-desktop-journey.txt`, `API-11-desktop/API-11-0{1..5}-*.png`, `API-11-driver-source.txt`, `API-11-desktop-token-scan.txt` | <ul><li>`"status":"Connected as @ryan-zheng-teki"`, `"tokenFieldEmptyAfterSave":true`, `"message":"The token works: @ryan-zheng-teki."`.</li><li>`"endTypes":["TURN_COMPLETED"],"approvalsRequested":0`, `"apiHttp": "200"`.</li><li>`"proxyListen":["AutoByteu 52267 127.0.0.1:62799"]`, `"serverListen":["AutoByteu 52267 *:62751"]`, `"proxyFromLan":"ECONNREFUSED"`, `"serverFromLan":"connected"`, `"proxyWithNonLoopbackHost":{"status":403,"error":"NOT_LOOPBACK"}`.</li><li>`"repo":"expressjs/express"`, `"gitDirBytes":12181504`, `"rssKbPeakDelta":4736`.</li><li>`"afterRemove":{"status":403,"error":"INTEGRATION_NOT_CONNECTED"}`, `"afterStop":{"status":403,"error":"RUN_PASS_INVALID"}`.</li><li>Scan `"filesWithToken": []` (data root 133 files, instance log, `CODEX_HOME` 482).</li><li>Screenshots: 02 green "Connected as @ryan-zheng-teki" pill; 03 the agent ticked; 05 "Not connected".</li></ul> | <ul><li>Attempt 1 stopped at the first navigation: after a reload the renderer settled back on `#/chat`. This was a driver fix (retry the hash), and no card action had run.</li><li>`stop` reported `"forced": true`.</li><li>RSS sampled every 100 ms (26 samples). A fully buffered 12 MB pack would add at least 12 MB.</li></ul> |
| API-12 | REQ-009, QR-003 | ticket folder (documents and evidence) and the new test files | `node token-scan.mjs tickets/in-progress/integration-credential-proxy autobyteus-server-ts/tests/e2e/credential-proxy <fixtures>`; `grep -rlE 'rp_[A-Za-z0-9_-]{20,}' evidence/API-*` | ENV-1 | Pass | `API-12-ticket-token-scan.txt` | `"filesWithToken": []` for each target; `unmasked-pass-files: 0` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (store, test, Connected as @login, remove, invalid token, never returned) | Yes | API-11 (packaged card, real token), API-R01 (IMP-07, IMP-08 strict, IMP-11, IMP-12 incl. "GitHub rejected the token") | Proven | — |
| AC-002 (variables in all five runtimes; none for a not-allowed agent; env/ps/files hold no token) | Yes | API-01 (AGY scripted, unticked, team), API-02 (native), API-03 (Claude), API-04/05 (Codex, both sandbox modes), API-06 (Grok live) + API-06b, API-07 (AGY live), API-09, API-11 | Proven | — |
| AC-003 (curl and `gh api` get GitHub's answer; one activity record per call; echo redacted) | Yes | API-01…API-07 and API-11 (curl issue #1 through each runtime's shell; activity records); API-R01 (IMP-08 `gh api`; IMP-03 echo → `[REDACTED]`, incl. `Location`) | Proven | — |
| AC-004 (git clone with no prompt; push through the proxy) | Yes | API-01…API-07 (`git ls-remote` with the unchanged URL, `GIT_TERMINAL_PROMPT=0`), API-11 (12 MB clone), API-R01 (IMP-08 clone; IMP-03 push to a local `git http-backend` with GitHub's Basic format) | Proven (live push to GitHub not possible with the read-only token, DEC-009) | — |
| AC-005 (outside the definition refused; caller's Authorization replaced) | Yes | API-R01 (IMP-03) | Proven | — |
| AC-006 (unknown or revoked pass; not ticked or unticked; no token) | Yes | API-08 (untick, stop on real runs in every runtime), API-01 team stop, API-11 (untick in the card, Remove → `INTEGRATION_NOT_CONNECTED`, stop), API-R01 (IMP-03 unknown pass; IMP-04 failed activation) | Proven | — |
| AC-007 (token in no log, trace, output or file of the runs) | Yes | API-09, API-11 scan, API-12, plus every cell's in-suite scan | Proven | — |
| AC-008 (docs) | No | CRR-001 (doc review). Observed behavior matched `credential_proxy.md`: variables, codes, the `read-only` limit not exercised | Proven by review | — |
| QR-001 (loopback only, even with remote access on) | Yes | API-11 (Phone Access on: proxy bound to `127.0.0.1`, LAN connect refused, non-loopback `Host` → `NOT_LOOPBACK`) | Proven | — |
| QR-002 (large bodies stream) | No | API-11 (12 MB pack, peak RSS +4.6 MB) | Proven (Measured) | — |
| QR-003 (test vault, dummy values elsewhere) | Yes | API-12, API-09 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | API-01…API-12, API-R01 | Live push to GitHub (DEC-009) | A write-scoped test token |
| Changed-boundary execution directness | 88% | 96% | Each runtime's own shell ran the integration script (API-02…API-07), plus the packaged app (API-11) | — | — |
| Cross-boundary integration realism and mock gap | 88% | 95% | Real GitHub, real CLIs, real desktop build; scripted CLIs only as extra cells | Echo redaction proven only with a fake upstream (GitHub doesn't echo) | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 96% | Real test token in a test-owned vault; isolated `CODEX_HOME`; real HOME for signed-in CLIs; packaged embedded server environment | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 96% | Untick and re-tick, stop, Remove, team stop, non-loopback, unticked run, team member (API-01, API-08, API-11) | A server restart ending passes (R-5) not exercised; failed activation only at unit level (IMP-04) | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | API-11 (packaged card: connect, test, tick, remove; Phone Access) | The Codex run was started through the instance's API rather than typed in the chat | A chat-typed run |
| Durable regression coverage quality and relevance | 90% | 95% | New gated suite with a cell per runtime, no-model cells for AGY and Grok, team and unticked cells | Gated, so not in the default `test:e2e`; test files are not typechecked (FU-002) | — |

- Overall post-repository confidence: 89.3% (repository evidence alone: IMP checks plus the full e2e)
- Overall final confidence: **95.6%**
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - live push to GitHub (read-only token);
  - echo redaction only against a fake upstream;
  - the scripted CLIs stand for AGY/Grok only in their extra cells (both also ran live).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API`, `Lifecycle` (gated runtime suite with real CLIs and GitHub), `Project Desktop Validation` (isolated packaged instance)
- Confidence gap it addresses: before this round, no real agent shell in any runtime had used the variables. QR-001 and QR-002 were unproven, and the card's connected state had been rendered only with an intercepted status. The expected gain was direct proof of AC-002/AC-007 per runtime and of the packaged journey; it was obtained.
- Browser validation needed: the packaged app, not a browser. The card is web-equivalent, but the embedded server environment, Phone Access and the `CODEX_HOME` pass-through are desktop-shell concerns.

## Desktop Application Validation

- Approach executed: an isolated instance of a packaged worktree build, attached over CDP. The run was started through the instance's API (see Round deviations).
- Web-equivalent behavior: the card states and actions (API-11 screenshots 01–05).
- Shell-specific or lifecycle behavior:
  - the embedded server's proxy listener, with Phone Access on;
  - Codex under the instance's `CODEX_HOME`.
- Effect on any already-running desktop application: `None`. The run used its own data root and ports; the user's app, `~/.autobyteus` and port 4822 were not touched.
- Behavior not directly proven and its consequence: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | Added | API-01…API-09 | — |
| `autobyteus-server-ts/tests/fixtures/agy-shell-env-probe-cli.mjs` (executable) | Added | API-01 | — |
| `autobyteus-server-ts/tests/fixtures/github-proxy-shell-probe.sh` (executable) | Added | API-01…API-07, API-11 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (API-01) | `agy-failure-cli.mjs` behind `agy-shell-env-probe-cli.mjs` | No-model cells for the unticked run, the team and regression; real AGY also ran (API-07) | none (live also proven) |
| Grok CLI (API-06b) | recorded `fake-grok-cli.mjs` behind a wrapper | Live Grok was first refused by quota; kept as a no-cost cell | none (live passed on retry) |
| GitHub echo of the token | fake upstream in IMP-03 | GitHub does not echo a token | redaction proven only against the fake upstream |
| GitHub push | local `git http-backend` in IMP-03 | read-only test token (DEC-009) | Basic-format push not proven against GitHub |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Suite data dirs (`github-proxy-shells-e2e-*`), agents, runs, teams, GitHub connection | Yes | The suite's `afterAll` terminates runs, disconnects GitHub and removes the dir | none left in `$TMPDIR` |
| Throwaway `CODEX_HOME` ×2 | Yes | scanned, then `rm -rf` | removed |
| Isolated instance `iso-62750-f12f` and data root `/private/tmp/s311/desktop-root` | Yes | GitHub removed on the card; Phone Access back off; `isolated-app stop` (`forced: true`); data root scanned, then removed | `isolated-app list` shows no instance |
| QR-002 clone | Yes | removed by the driver | removed |
| LM Studio model | Yes | `lms unload qwen/qwen3.6-35b-a3b` | `No models are currently loaded.` |
| Driver and scan scripts (`/tmp/s311`) | Yes | sources kept in `API-11-driver-source.txt` and `API-09-cli-home-token-scan.txt`; folder removed | removed |
| CLI transcripts written by the live cells (`~/.claude/projects/…workspace-claude`, `~/.grok/sessions/…workspace-grok`, one `agy` conversation) | Created by the runs in the user's CLI homes | Scanned read-only; left in place (TESTING.md: live suites on host logins add to their history) | no token in them |
| Build outputs (`autobyteus-web/electron-dist`, SDK `dist/`, `applications/brief-studio/dist`) | Yes | left untracked; never staged | untracked |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (Large/High pass with durable test changes → proportional test-code review)
- Notes:
  - Follow-ups:
    - FU-002 extended with API-10 evidence (8 e2e files cannot load);
    - FU-005 added (stale Org history e2e expectation after autobyteus-8).
  - No temporary diagnostic was added to product or test code in this round.
