# API/E2E Execution Coverage Report — Integrations page (autobyteus-337)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`, and the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (it lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review CRR-001 pass (reviewed route)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **Manage sources → Update (SCN-A7):** the real GitHub source was up to date (`UP_TO_DATE`, installed = latest revision `8887475`), so the row showed "Up to date" without the Update chip. The approved spec shows the chip only with "Update available" (UXJ-005). Update itself could not run without a new upstream revision; its path is covered with a stub GitHub (IMP-04). See Not Tested.
  - **Driver restarts in API-05:** the desktop driver needed fixes, each before any product action in its step, so it was resumed rather than restarted. Every attempt is in `API-04-05-desktop-journey.txt`:
    - a selector error;
    - the expected Update chip;
    - two waits for the Skills page.
  - **The removal cell (API-02):** its first run passed with a vacuous `connections.json` assertion (it read a top-level key). The assertion was fixed to `integrations.github.login`, and the cell was rerun alone.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page/tickets/in-progress/integrations-page/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`; Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (cells added to the runtime-shells suite)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `9e8264614e` (HEAD `22f17adf30`, `tickets/` only after it) + this round's uncommitted test cells | macOS 26.5.2 arm64, Node 22.23.1, git 2.50.1 | In-process studio server from source | <ul><li>`env -i PATH HOME=<resolved temp> TMPDIR` plus gates.</li><li>Own data dir and application vault.</li><li>A local `github` integration folder imported with `importIntegrations`; connected with `test.github.token`.</li><li>Real GitHub.</li></ul> |
| ENV-2 | same | same | Live CLIs: `claude` (haiku 4.5), `codex` (`gpt-5.6-luna`, low effort), `grok` (`grok-4.7`), `agy` (`gemini-3.8-flash-low`); LM Studio `qwen/qwen3.6-35b-a3b` | Real HOME/USER/LOGNAME for the signed-in CLIs (temp HOME for native); throwaway `CODEX_HOME` |
| ENV-3 | same | same | Full server e2e on the built server (ts and server rebuilt, `test:integration:prepare`) | clean env |
| ENV-4 | installed release 1.5.11-beta.9, then this branch's packaged build | same | `isolated-app start --data-root /private/tmp/s337/root` (installed app), then `isolated-app start --build` on the same root | <ul><li>Owned data root, its own vault (no test vault in the instances).</li><li>Throwaway `CODEX_HOME` for the worktree instance.</li><li>Driven over CDP (attach only).</li></ul> |

## Cases

`<gates>` = `RUN_GITHUB_PROXY_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault AUTOBYTEUS_LIVE_STRICT=1`. `<suite>` = `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts --no-watch`. Each log's header has the exact command. Per-cell summaries are in `API-01-02-runtime-shells/<cell>.json`, value-free, with passes masked.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001…AC-008 (repository) | unit, integration, built-server e2e, live GitHub, scripted runtimes, web, rendered probe | Reused: IMP-01…IMP-14 | — | Pass | `implementation-handoff.md` Checks Run | — | Still holds: `git diff --name-only 9e8264614e 22f17adf30` lists only `tickets/` |
| API-01 | AC-004, AC-007, REQ-005 | live LLM shells in every runtime | Native: `<gates> RUN_LMSTUDIO_E2E=1 <suite> -t native` (temp HOME). Then `<gates> RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 RUN_GROK_E2E=1 RUN_AGY_E2E=1 CODEX_HOME=<temp> <suite> -t "claude\|codex\|grok:\|agy-live"`. Then the temporary transcript scan | ENV-2 | Pass | `API-01-native-lmstudio.log`, `API-01-live-runtimes.log`, `API-01-02-runtime-shells/{native,claude,codex-workspace-write,codex-full-access,grok,agy-live}.json`, `API-01-cli-home-token-scan.txt` | <ul><li>`Tests  1 passed` (native) and `Tests  5 passed \| 8 skipped (13)`.</li><li>Each JSON: `"apiHttp": "200"`, `"issueNumber": 1`; `"error": "INTEGRATION_NOT_ALLOWED"` under `skillRemoved`, `"status": 200` under `skillAdded`, `"error": "RUN_PASS_INVALID"` under `stopped`; `"approvalsRequested": 0`; `"filesInCodexHome": []`.</li><li>Transcripts: `"filesWithToken": []` with markers 1 (Claude), 3 (Grok), 5 (AGY), 3 (`CODEX_HOME`).</li></ul> | LM Studio model unloaded afterwards |
| API-02 | AC-004, REQ-005, REQ-006, DEC-002, DEC-015 | AGY and Grok scripted runs (no model), real proxy and GitHub | `<gates> RUN_AGY_FAILURE_E2E=1 RUN_GROK_SCRIPTED_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-shell-env-probe-cli.mjs <suite>`; the removal cell again alone after its assertion fix (`-t "Skills page"`) | ENV-1 | Pass | `API-02-scripted-cells.log`, `API-02-source-removal-cell-rerun.log`; `API-01-02-runtime-shells/{agy-scripted,agy-without-skill,agy-team,agy-all-installed,agy-team-local,grok-scripted,agy-source-removed-on-skills-page}.json` | <ul><li>`Tests  7 passed \| 6 skipped (13)`.</li><li>`agy-all-installed.json`: `skillDisabled` `"error": "INTEGRATION_NOT_ALLOWED"`, `skillEnabledAgain` `"status": 200`.</li><li>`agy-team-local.json`: probe `"apiHttp": "200"`, `afterStop` `"error": "RUN_PASS_INVALID"`.</li><li>`agy-source-removed-on-skills-page.json`: `"before": {"status": 200…`, `"afterRemoval": {"status": 403, "error": "INTEGRATION_NOT_ALLOWED"}`, `"cards": []`, `"login": null`; the re-import shows `NEEDS_TOKEN`.</li></ul> | Three cells added: all-installed + disable/enable, a team-local member, Skills-page removal. The first four AGY cells and Grok are IMP-09's, run again here on the same file |
| API-03 | regression | full server e2e | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts build`; `test:integration:prepare`; `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` | ENV-3 | Pass for this ticket | `API-03-server-e2e-full.log`, `API-03-server-e2e-full.excerpt.log` | `Test Files  9 failed \| 112 passed \| 102 skipped (223)`; `✓ tests/e2e/credential-proxy/integrations-graphql.e2e.test.ts (5 tests)` | The 9 failures are those of autobyteus-311 API-10 (FU-004): 8 files cannot load (`claude-live-agent-harness.ts:24:7`), plus Org history after `47f44c3df6`. The branch doesn't touch them (Read) |
| API-04 | AC-005, persisted data (DEC-005), SCN-A1 | installed release → this build on one data root | <ol><li>Installed 1.5.11-beta.9 isolated: the old card connects with the token; agent `github-helper` ticked; stop.</li><li>The worktree build on the same root: Basics has no card; menu; empty page; import by link; the next write.</li></ol> | ENV-4 | Pass | `API-04-05-desktop-journey.txt` (Phase 1, Phase 2 attempt 2), screenshots `API-04-05-desktop/API-04-01…04` | <ul><li>Phase 1: `"agentDefinitionIds":["github-helper"]` in `connectionsJson`.</li><li>Phase 2: `"githubCardCount":0`; `"menu":[{"t":"Nodes","y":292},{"t":"Integrations","y":332}]`; `"toolbarCount":0`; `connectionsJsonBeforeAnyWrite` still holds `agentDefinitionIds`.</li><li>After the link import: `"state":"CONNECTED","login":"ryan-zheng-teki"` at once.</li><li>`connectionsJsonAfterWrite`: `{"login":"ryan-zheng-teki","connectedAt":…}` without `agentDefinitionIds`.</li></ul> | The ticked agent has no access until its skill is added (DEC-005). That is shown by `"before":{"skillNames":[]…}` in API-05 F and the API-02 no-skill cell |
| API-05 | AC-001…AC-004, AC-006…AC-008, SCN-001, SCN-003, SCN-A4, SCN-A6, SCN-A7 | packaged worktree build, continuing API-04 | <ul><li>Import dialog (link): hint, notice.</li><li>Dialog: source, tools, Test.</li><li>A rejected token, then Replace.</li><li>Manage sources (GitHub row).</li><li>Agent edit: add `github-integration`.</li><li>A real Codex agent runs the integration's scripts (check-access, `issues.sh list`, `issues.sh comment` on #1).</li><li>Skills → Sources → Remove the GitHub source while the run is active; second agent turn.</li><li>A folder integration with `https:`, `http:`, `javascript:`, `data:` in `token.help`; folder Remove.</li><li>Stop the run.</li><li>Stop the instance; token scan.</li></ul> | ENV-4 | Pass | `API-04-05-desktop-journey.txt` (attempts 2, 3, 5 and the addendum), `API-04-05-desktop/API-05-01…10*.png`, `API-04-05-driver-sources.txt`, `API-04-05-desktop-token-scan.txt` | <ul><li>`"notice":"Imported GitHub from AutoByteus/autobyteus-integrations."`; tools `curl`, `jq`, `git` found.</li><li>`"testMessage":"The token works: @ryan-zheng-teki."`; `"rejected":{"message":"GitHub rejected the token.","state":"CONNECTED"}`.</li><li>`"status":"Up to date","updateChipShown":false`.</li><li>`"after":{"skillNames":["github-integration"]…}`.</li><li>Activity `api GET /user 200`, `api GET /repos/ryan-zheng-teki/autobyteus-mcp-test/issues 200`, `api POST /repos/ryan-zheng-teki/autobyteus-mcp-test/issues/1/comments 201`; the agent's reply has the comment URL `…/issues/1#issuecomment-6555589417`.</li><li>Removal: `"rowGone":true`, `"beforeCall":{"status":200…}`, `"afterCall":{"status":403,"error":"INTEGRATION_NOT_ALLOWED"}`, `"cards":[]`, `"login":null`. The agent's next turn got "Your skill package `github-integration` is no longer available" and `issues.sh: No such file or directory`.</li><li>`token.help`: `"anchors":[{"href":"https://github.com/settings/tokens"…}]`, `"anyJavascriptHref":0`; folder Remove: `integrationSources` `[]`, files kept.</li><li>`"afterStop":{"status":403,"error":"RUN_PASS_INVALID"}`.</li><li>Scan: `"filesWithToken": []` (data root 143 files, both instance logs, `CODEX_HOME` 482).</li></ul> | <ul><li>The real agent posts one comment on issue #1 (TESTING.md).</li><li>The Codex run was started with the instance's own API, the one the chat uses.</li><li>The stop of each instance reported `"forced":true`.</li></ul> |
| API-06 | AC-007, QR-001 | ticket folder and the changed test file | `node token-scan.mjs tickets/in-progress/integrations-page autobyteus-server-ts/tests/e2e/credential-proxy`; unmasked-pass grep | ENV-1 | Pass | `API-06-ticket-token-scan.txt` | `"filesWithToken": []` for both; `unmasked-pass-files: 0` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (empty state; cards after import) | Yes | API-04 (empty page, no toolbar; card after the import), API-05, API-R01 (IMP-11/12) | Proven | — |
| AC-002 (import link and folder; refusals) | Yes | API-05 (link and folder imports through the dialog, notices), API-R01 (IMP-04/07/12: every refusal code) | Proven | — |
| AC-003 (Connect, Test, Remove; rejected token; never returned) | Yes | API-05 (Test, a rejected token keeps the stored one, Replace), API-04 (Connected as @login), API-R01 (IMP-07/08), API-01/02 (connect in every suite run) | Proven | — |
| AC-004 (skill grants access; without it none; removing it refuses the next call) | Yes | API-01 (every runtime, live), API-02 (no skill, team, team-local, all-installed, disable), API-05 (the agent edit form, a real agent) | Proven | — |
| AC-005 (no GitHub card; no tick API) | Yes | API-04 (`"githubCardCount":0` after upgrade; ticks dropped), API-R01 (IMP-07 removed API) | Proven | — |
| AC-006 (tool presence) | No | API-05 (curl, jq, git found), API-R01 (IMP-12 missing tool) | Proven | — |
| AC-007 (no token anywhere) | Yes | API-01 (transcripts), API-02 (in-suite), API-05 scan, API-06 | Proven | — |
| AC-008 (the teammate's way, live) | Yes | API-05 (link import on the page, connect, skill added on the agent page, a real agent runs `issues.sh list` and `comment` through the proxy, activity records, scan) | Proven | — |
| AC-009 (README) | No | Doc review; the branch `codex/integrations-page-readme` @ `696758f` is unpushed; delivery finalizes it | Not executed (doc) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 96% | API-01…API-06, API-R01 | DEC-016 not on a real revision | A writable integrations repository with two revisions |
| Changed-boundary execution directness | 85% | 96% | Real agents in every runtime; the packaged page and agent form; a real upgrade | — | — |
| Cross-boundary integration realism and mock gap | 88% | 95% | Real GitHub import and scripts, real CLIs, the installed release's own data | The Update path only with a stub GitHub | as above |
| Environment, configuration, identity, and fixture fidelity | 92% | 96% | Test token in test-owned vaults; isolated `CODEX_HOME`; the installed release on an owned root | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Rejected token, disable/enable, skill removed and added, Skills-page removal while running, stop, upgrade, link safety | DEC-016 on a real revision; an application bundle copy at runtime (repository test only) | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | API-04/05 in the packaged app (page, menu, dialogs, Skills label, agent form) | The agent run was started through the API, not typed in the chat | — |
| Durable regression coverage quality and relevance | 92% | 95% | Three real-run cells added to the gated suite; the existing suites | Gated (not in default `test:e2e`) | — |

- Overall post-repository confidence: 88.6%
- Overall final confidence: **95.4%**
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - DEC-016 (an update dropping an integration) is proven only with a stub GitHub;
  - an application bundle copy granting nothing is proven by a repository test only.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` and `Lifecycle` (gated runtime suite), `Project Desktop Validation` (installed release and packaged build)
- Gap addressed:
  - live runtimes had not run;
  - a real agent through the UI (AC-008);
  - the packaged page;
  - the real upgrade data;
  - Skills-page removal with a running agent;
  - rendered `token.help` link safety.

  All were closed.
- Browser validation: the packaged app was used instead, because the embedded server's runtimes and the installed release's data are shell and lifecycle concerns.

## Desktop Application Validation

- Approach: two isolated instances on one owned data root, the installed release 1.5.11-beta.9 and then this branch's packaged build, attached over CDP.
- Web-equivalent behavior: the page, dialogs, Skills label and agent form (API-05).
- Shell and lifecycle behavior: the upgrade (API-04); the embedded server's Codex runs with `CODEX_HOME`.
- Effect on the user's running app: `None`. The installed binary ran only as an isolated instance with its own data root and ports; the user's `~/.autobyteus` and port 4822 were not touched.
- Not directly proven: clicking a `token.help` link (it would open the user's browser). The DOM shows the only anchor is the `https:` one.

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration`.
- Representative existing data: the file and vault entry written by the installed release itself (API-04 phase 1).
- Transition followed without a migration: `Yes`. The file was read as is ("Connected as @login" right after import), and `agentDefinitionIds` was gone after the next write.
- Version-specific branch or fallback observed: `No`.

## Compatibility / Legacy Scope Check

- Compatibility in scope: `No`. Compatibility-only behavior: `No`. Coverage for compatibility only: `No`.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | Updated: three cells added (all installed skills + disable/enable; a team-local member written as a team folder; Skills-page source removal while a run is active, last); a team-local fixture in `beforeAll`; the header | API-02 |

- Paths attached for proportional test-code review: `Yes`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| AGY and Grok in API-02 | scripted CLIs that run the probe with the process env | no-model cells | none: live in API-01 |
| GitHub update with a dropped integration | stub GitHub in IMP-04 | no writable repository with two revisions | DEC-016 on real GitHub not run |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Suite data dirs, runs, agents, teams | Yes | the suite's `afterAll` | none left in `$TMPDIR` |
| Isolated instances `iso-61887-b09e` (installed release) and `iso-62256-190c` (worktree build), data root `/private/tmp/s337/root` | Yes | `isolated-app stop` (both `forced: true`); data root scanned, then removed | `isolated-app list` empty |
| Throwaway `CODEX_HOME` ×2 | Yes | scanned, removed | removed |
| LM Studio model | Yes | unloaded | none loaded |
| Driver and scan scripts (`/tmp/s337`) | Yes | sources kept in `API-04-05-driver-sources.txt`, `API-01-cli-home-token-scan.txt` | removed |
| A comment on issue #1 of `ryan-zheng-teki/autobyteus-mcp-test` (`#issuecomment-6555589417`) | Created by the AC-008 agent | left (the test repository is meant for it, TESTING.md) | — |
| CLI session histories (Claude, Grok, AGY) from the live cells | in the user's CLI homes | scanned read-only; left (TESTING.md) | no token |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven: none critical. AC-009 is a doc review for delivery.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (Large/High pass with a durable test change)
- Notes:
  - FU-004 added (the 9 pre-existing e2e failures, the same as autobyteus-311's FU-002/FU-005).
  - No temporary diagnostic touched product or test code.
