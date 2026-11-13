# API/E2E Execution Coverage Report — autobyteus-460

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-001 of `c7685b20c6`
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-04 and API-05 first ran with the shell's inherited `AUTOBYTEUS_*` variables (only the three package roots
    unset). Writes stayed in the temp root (`setCustomAppDataDir` sets the memory folder; the capsules were found
    there), but TESTING.md asks for a clean environment, so both reran under `env -i`. The clean runs are the
    recorded cases; the first runs' logs are kept in `evidence/api-e2e/inherited-env-first-runs/` (both passed).
  - API-08 needed `pnpm -C autobyteus-web exec nuxt prepare` first (TESTING.md install step), and runs through
    `test:nuxt`.
  - Added API-09: the server typecheck with the two changed test files (test-file baseline).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/running-agent-config-reload-460/tickets/in-progress/running-agent-config-reload-460/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (one test file added, one updated)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `c7685b20c6` | macOS (darwin 25.5), Node 22.23.1, pnpm 10.28.2 | Server unit/integration/typecheck from source | Load 12 (unit), 50 (integration start) |
| ENV-2 | `c7685b20c6` + this round's test changes | same | In-process Studio server per suite, temp app-data root; scripted AGY CLI (`agy-failure-cli.mjs` / `agy-shell-env-probe-cli.mjs`) | `env -i PATH HOME=<temp> TMPDIR LANG`; API-05 also `AUTOBYTEUS_TEST_VAULT`, `RUN_GITHUB_PROXY_E2E=1` (real GitHub through the proxy, test token) |
| ENV-3 | `c7685b20c6` + this round's test changes | same | In-process Studio server, temp app-data root; real CLIs: `claude` 2.1.323 (haiku), `codex` 0.169.0 (gpt-6.1-terra, medium), `grok` 1.0.77 (grok-4.7, low), `dsh` 0.2.2-rc.1 (deepseek-v4-flash, low; npm install in `/tmp/ab460-ext`, Node 25.2.1), native AutoByteus (gpt-5.5) | `env -i PATH HOME=<real> USER LOGNAME TMPDIR LANG`; temp `CODEX_HOME`/`GROK_HOME` with auth symlinks; vault keys for OpenAI and DeepSeek |
| ENV-4 | `c7685b20c6` | same | `autobyteus-web` vitest (`test:nuxt`) | after `nuxt prepare` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-011, AR-001, AR-002, QR-001, QR-002 | Repository focused suites, mutation check | Reused: IMP-01, IMP-03, IMP-05, IMP-10, IMP-11, IMP-12 | (implementation handoff) | Pass | (implementation handoff rows) | (implementation handoff rows) | IMP-12 ran on `c7685b20c6`; the others on `07d5d69b30`, and `git diff --name-only 07d5d69b30 c7685b20c6` touches only `claude-session-bootstrapper.ts`, its test, `agent_execution.md` and `docs/design-cases.md`, which those suites do not exercise (IMP-12 reran the Claude suites). API-02/03 also rerun them whole |
| API-02 | all (regression) | Server unit suite, whole | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-02-unit-suite-excerpt.log`, `API-02-unit-suite.full.log` | `Test Files  987 passed \| 5 skipped (992)`, `Tests  8441 passed \| 9 skipped (8450)`, `EXIT 0` | The first whole green run after IMP-02's fixes. The `APP_DATA_STARTUP_GATE_FAILED` line in the log is a test's expected output (the run exits 0) |
| API-03 | all (regression) | Server integration suite, whole | `pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass | `API-03-integration-suite-excerpt.log`, `API-03-integration-suite.full.log` | `Tests  536 passed \| 69 skipped (605)`, `EXIT 0` | IMP-04's eight load time-outs did not recur (load 50 at start) |
| API-09 | — | Server typecheck (src + tests, with this round's test files) | `pnpm -C autobyteus-server-ts typecheck` | ENV-2 | Pass | `API-09-typecheck.log` | `production errors: 0; test-file errors: 1180 in 364 files (baseline 1180 in 364 files)`, `[typecheck] PASS` | The two changed test files add no errors |
| API-04 | BEH-003/004 preserved, DS-003 run-start links | Real server + scripted AGY: notices on AGY, Team, Org, delegated copy, restore; AGY linked skills; package-private skills; GitHub skill sources | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-skill-update-notice-transport.e2e.test.ts tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts --no-watch`; then the roots file alone | ENV-2 | Pass | `API-04-existing-scripted-e2e-excerpt.log`, `API-04-existing-scripted-e2e.full.log`, `API-04-roots-rerun-alone.full.log` | Run 1: `Tests  1 failed \| 49 passed (50)` (SUN-E2E-001: `AgyDiscoveryError: Antigravity model discovery timed out`); run 2: `Tests  3 passed (3)` | Cause of the run-1 failure (Rule 9): the test failed after 4.65 s, inside AGY discovery's 3 s `agy --help` bound (`antigravity-cli-capability.ts`, `SHORT_PROBE_TIMEOUT_MS = 3_000`), while five E2E files started their servers in parallel workers; the scripted CLI answers `models` in 0.05 s idle. Discovery code is unchanged by this ticket; the file passes alone. Harness contention, not a product failure |
| API-05a | AC-012 (AGY), AC-001, AC-003, AC-008, REQ-006; RU-01, RU-03 | Real server, real capsule, package folder feed; scripted AGY reads `.agents/skills` as AGY does | `env -i … AUTOBYTEUS_TEST_VAULT=… RUN_AGY_FAILURE_E2E=1 RUN_GITHUB_PROXY_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-shell-env-probe-cli.mjs AGY_SKILL_DEFINITION_E2E_EVIDENCE_DIR=<evidence>/API-05 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-skill-definition-changes-transport.e2e.test.ts --reporter=verbose --no-watch` | ENV-2 | Pass | `API-05-agy-skill-definition-changes-excerpt.log`, `API-05/API-05a-agy-capsule.json` | `✓ … API-05a (AC-012, AC-001, AC-003, AC-008)`; receipt `"manifest": ["anchor-skill", "codeword-probe"]` after the add and after resume; resume notice `Your skill package \`extra-skill\` is now available` + `Your skill package \`codeword-probe\` is no longer available.`; `"extraSkillLinkedAfterResume": false` | Steps: add on the agents page → capsule link + manifest entry before the next input, idle run not woken (no AGY launch); `ECHO_INPUT` shows one notice with the absolute `SKILL.md` path; `READ_SKILLS` lists the skill with its codeword. Removal by editing `agents/<id>/agent-config.json` on disk (package feed) → one "no longer available" notice; link kept (DEC-007). Stop, save while stopped, message → one notice for both, mid-run link and manifest entry kept. A skill added while stopped is not linked at AGY resume (FU-002, as designed); its notice gives the path. A skill added after resume is linked into the restored capsule |
| API-05b | AC-009 | Real server: Team member and delegated copy of the same agent (scripted AGY) | Same command | ENV-2 | Pass | `API-05/API-05b-agy-team-and-copy.json` | `✓ … API-05b (AC-009)`; `next.worker` and `next.copy` each hold one `Your skill package \`team-probe\` is now available`; `next.plain` holds none | Each run got its own capsule link and manifest `["team-probe"]` (two different capsules); the member of another agent got no link and no notice; delivered once |
| API-05c | AC-006, AC-007, REQ-005, QR-002; RU-04 | Real credential proxy, real pass registry, real GitHub (test repository), scripted AGY whose process runs the shell probe | Same command (gate `RUN_GITHUB_PROXY_E2E=1`, `test.github.token` from the vault) | ENV-2 | Pass | `API-05/API-05c-agy-github.json` | `Its GitHub access starts when this run is restarted (stop the run, then send a message).`; `atStart.address: null`; after restart `apiHttp: "200"`, `issueNumber: 1`; `refused: {status: 403, error: "INTEGRATION_NOT_ALLOWED"}`; `allowedAgain: {status: 200}` and the added-back notice without the restart sentence; `afterStop: RUN_PASS_INVALID` | Nothing was granted to the running process (no variables until the restart); the pass is masked (`rp_<pass>`); the token is in no probe output and not on the wire |
| API-06 | AC-001, AC-002, AC-003, AC-008, AC-011, AC-012 (Codex, Grok, DeepSeek), REQ-006; RU-02 | Real server, real runtimes and models | `env -i PATH HOME=<real> USER LOGNAME TMPDIR LANG AUTOBYTEUS_TEST_VAULT=… RUN_LIVE_SKILL_DEFINITION_E2E=1 LIVE_SKILL_DEFINITION_RUNTIMES=claude_agent_sdk,autobyteus,codex_app_server,grok_build,deepseek_harness DEEPSEEK_HARNESS_COMMAND=/tmp/ab460-dsh-bin/dsh LIVE_SKILL_DEFINITION_EVIDENCE_DIR=<evidence>/live pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts --reporter=verbose --no-watch` | ENV-3 | Pass | `API-06-07-live-excerpt.log`, `API-06-07-live.full.log`, `live/live-skill-definition-<runtime>.json` (claude_agent_sdk, autobyteus, codex_app_server, grok_build, deepseek_harness) | `Tests  6 passed (6)`; per runtime JSON: `linkAfterAdd` = `<workspace>/.claude|.codex|.grok|.dsh/skills/codeword-probe`, step "2 skill added" reply = `QUOKKA-…` codeword, step "4 resumed after stop" reply = `WOMBAT-…` codeword, `linksReleasedAtStop: true` | Per runtime: link in the runtime's folder before the next input; one "now available" notice; the agent answered the codeword (Claude `Read`, Codex `cat`, Grok `read_file`, native `read_file`, DeepSeek its own `skill` tool through `<workspace>/.dsh/skills/codeword-probe`); removal notice, link kept; save while idle, stop (links released), message → one notice with both changes, re-linked at preparation, new codeword answered; links released at terminate. Claude step 2b: `Skill` → `Launching skill: codeword-probe` |
| API-07 | AR-003, R-001; RU-05 | Real Claude CLI, `autoExecuteTools: false`, zero-skills start | Same command (the Claude case without auto-execute) | ENV-3 | Pass | `live/live-skill-definition-claude-approval.json` | `"approvals": []`, `"skillApprovalAsked": false`; call `Skill` → `Launching skill: codeword-probe`; reply `SKILLED-NUMBAT-2886` | Observation: the CLI asked no approval for the first `Skill` call after the mid-run add (the design expected one could be asked, AR-003). The risk did not show; the skill loaded |
| API-08 | AC-001 (web card) | Web component | `pnpm -C autobyteus-web exec nuxt prepare`; `pnpm -C autobyteus-web test:nuxt --run components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` | ENV-4 | Pass | `API-08-web-card-spec.log` | `Tests  9 passed (9)` | The card is labelled "Skill updated" from the unchanged sender and header; the body is rendered as notice text |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (idle add → one notice, message unchanged; busy now) | Yes | API-06 (five runtimes), API-05a, API-01 (IMP-05 busy case), API-08 | Proven | — |
| AC-002 (agent follows the added skill without restart) | Yes | API-06 (native, Claude, Codex, Grok, DeepSeek: codeword answered) | Proven | — |
| AC-003 (removal notice; later edits silent) | Yes | API-06, API-05a, API-01 (IMP-05 later-edit case) | Proven | — |
| AC-004 (no-op save / add then remove: nothing) | No | API-01 (IMP-05), API-03 | Proven | — |
| AC-005 (added skill's file changes noticed) | No | API-01 (IMP-05), API-03 | Proven | — |
| AC-006 (GitHub added: restart sentence, no grant; after restart access) | Yes | API-05c | Proven | — |
| AC-007 (GitHub removed: next call refused, agent told) | Yes | API-05c | Proven | — |
| AC-008 (stopped run: one notice for added and removed) | Yes | API-06 (stop between save and message, five runtimes), API-05a (save while stopped, AGY) | Proven | — |
| AC-009 (team member and delegated copy each hear it) | Yes | API-05b, API-01 (IMP-05) | Proven | — |
| AC-010 (tools notice this input, skills next) | No | API-01 (IMP-05), API-03 | Proven | — |
| AC-011 (Claude link before notice, `Skill` lists it, released at end) | Yes | API-06 (Claude), API-07 | Proven | — |
| AC-012 (Codex, Grok, DeepSeek links; AGY capsule kept after stop and resume; released at end) | Yes | API-06 (Codex, Grok, DeepSeek), API-05a (AGY) | Proven | — |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 97% | API-01…03 then API-05, API-06, API-07 | AC-004/005/010 are unit/integration only, as their verification intent says | — |
| Changed-boundary execution directness | 75% | 96% | API-06 drives every changed backend's `applyDefinitionSkills` and release on its real CLI; API-05 the AGY capsule and real proxy | AGY's own CLI was scripted | A live `agy` run (host login) |
| Cross-boundary integration realism and mock gap | 75% | 95% | Real server, signal, package feed, runtimes, models, proxy, GitHub | AGY scripted (reads the capsule as AGY does); the AR-001 release race is proven by repository tests only (its timing is contrived live) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Clean `env -i`; host logins; temp CLI homes; vault keys | `dsh` from a temp npm install on Node 25 | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | Stop/resume on five runtimes and AGY; release at stop and terminate; refusal and pass invalidation; AR-002/AR-001 unit races and IMP-11 mutation | No live forced setup failure (unit-proven, REQ-008 "logged, notice still sent") | — |
| User-surface, browser, and desktop-shell confidence | 90% | 92% | API-08 (card label from header/sender) | No browser render of the new body text; the component and its text rendering are unchanged | A browser probe of a run with the notice |
| Durable regression coverage quality and relevance | 85% | 96% | New scripted AGY suite (no model cost, runs in CI-like conditions); live suite now covers five runtimes and both stop orders | Live suite is gated and costs credits | — |

- Overall post-repository confidence: 82%
- Overall final confidence: 95% (95.1)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: AGY CLI scripted (a real `agy` would use the user's host login and history); the web body text was not rendered in a browser.

## Broader Validation Decision

- Decision: `Required` (executed)
- Execution mode: `Live API` and `Lifecycle` (real runtimes and models; real proxy and GitHub)
- Confidence gap it addresses: Codex, Grok, DeepSeek and AGY had never run the mid-run add live (U-001), AC-006 had never run end to end, AC-008/AC-009 were fakes only. Gain: 82% → 95%.
- Browser validation needed: no. The card's label path is unchanged (sender and header); API-08 covers it; the new text is plain notice content.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration` (`seen_skill_versions.json`)
- Representative existing data used: records the product wrote itself before each stop (API-06 five runtimes, API-05a AGY)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-06 step 4, API-05a step 3; API-01 (IMP-05 restored-run case)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

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
| `autobyteus-server-ts/tests/e2e/runtime/agy-skill-definition-changes-transport.e2e.test.ts` | Added | API-05a, API-05b, API-05c | — |
| `autobyteus-server-ts/tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` | Updated (Codex, Grok, DeepSeek; stop between save and message; Claude without auto-execute) | API-06, API-07 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI (`agy`) | Scripted CLI `agy-failure-cli.mjs` (`linked_skills`) through `agy-shell-env-probe-cli.mjs` | No `antigravity-oauth-token` file: a live `agy` run uses the user's host login and writes into their `agy` history (TESTING.md); AC-012 for AGY is a server-side capsule fact the scripted CLI reads as AGY does; AC-002 is required on native and Claude and was proven on five runtimes | Whether a real AGY model follows a skill linked into its capsule mid-run (U-001, not required); the notice gives the path either way |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temp app-data roots, workspaces, CLI homes | Yes | Removed by each suite's `afterAll` | Done (suites passed their cleanup) |
| Runs, Teams | Yes | Terminated by the suites | Done |
| GitHub connection in the temp vault | Yes | `disconnectIntegration` in `afterAll`; temp root removed | Done |
| `dsh` install `/tmp/ab460-ext`, wrapper `/tmp/ab460-dsh-bin` | Yes | Removed after the round | Done |
| `autobyteus-web/.nuxt` (from `nuxt prepare`) | Yes | Left: the untracked, standard prepared output of the web package | Kept |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: the code reviewer (proportional test-code review of the two test files)
- Notes:
  - Observed (not required): Claude's own `Skill` tool, and DeepSeek's own `skill` tool, load a skill linked mid-run;
    Codex, Grok and native read `SKILL.md` by its path from the notice.
  - AR-003: without auto-execute, Claude asked no approval for its first `Skill` call after the mid-run add.
  - A skill added while an AGY run is stopped is not linked at its resume (FU-002, by design); its notice gives the path.
