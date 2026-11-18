# API/E2E Coverage Investigation — Credential proxy for integrations, step 1: GitHub (autobyteus-311)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (approved SR-002; DEC-011 decided by the user at SR-005)
- Investigation Notes: `investigation-notes.md` (M-1…M-5)
- Solution Revision Record: `solution-revision-record.md` (SR-001…SR-005)
- Design Spec (required on every route): `design-spec.md` (SR-005; Large / High)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001…FU-004); 244 `solution-validation.md` V1/V1b (read-only basis)
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass, AR-001…AR-008)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001, IMP-01…IMP-14)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass, Full Review)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review CRR-001 pass (reviewed route)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy`, branch `codex/integration-credential-proxy`, base `8760c83788`. Reviewed code `84602c9a38…2529eaaec1`. `git diff --name-only 2529eaaec1 b95bad702f` lists only `tickets/` files, so the code under validation is `2529eaaec1`.

## Current Requirement And Design Basis

- REQ-001 / AC-001: the user stores, tests, replaces and removes a GitHub token on a Settings card (DEC-001). The token is checked with GitHub `/user` first and is write-only. The card shows "Connected as @login" or "Not connected", and the user ticks the agents allowed (DEC-002; default none).
- REQ-002 / AC-002: each run of a ticked agent, team members included, in all five runtimes, gets these variables in its shell, never the token: `AUTOBYTEUS_GITHUB_API_URL`, the `GIT_CONFIG_*` insteadOf redirection and `GIT_TERMINAL_PROMPT=0`. A run of an unticked agent gets none of them. For Codex in `workspace-write` (auto-execute off), the run also gets `sandbox_workspace_write.network_access` (DEC-011).
- REQ-003/007/008 / AC-003: calls are forwarded to `api.github.com` with the token added by the server. Echoes are redacted to `[REDACTED]`, and each call gets one activity record.
- REQ-004 / AC-004: git with an unchanged `https://github.com/...` URL goes through the proxy with no prompt. Push is proven against a local `git http-backend` (DEC-009, read-only token).
- REQ-005 / AC-005: only the definition's hosts and paths are forwarded. The caller's own `Authorization` and `Cookie` are dropped.
- REQ-006 / REQ-010 / AC-006: these are refused with a coded 403 before any upstream call:
  - an unknown or revoked pass (run ended, activation failed);
  - a live pass whose agent is not ticked or was unticked;
  - no token.
- REQ-009 / AC-007: the token is in no shell env, command line, process listing, tool output, run trace, server log or run file.
- QR-001: the proxy is loopback-only, even with remote access on.
- QR-002: large bodies such as git packs stream rather than buffer.
- AC-008 (docs): `credential_proxy.md` holds the contract. This was reviewed in CRR-001 and is not re-proven by execution.
- Persisted data: `Not Affected`. The change adds new stores only: the vault entry `integration.github.token`, `integrations/connections.json` and `integrations/activity.jsonl`.

## Supported Scenarios And Real Usage

- Designer scenarios covered:
  - SCN-001 (connect on the card);
  - SCN-002 (a script uses the API);
  - SCN-003 (git through the proxy);
  - SCN-004 (misuse and refusals).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1: an agent run in each runtime is asked in chat to run a small script in its own shell. The runtime's own shell tool runs it: native `run_bash`, Claude Bash, the Codex shell, the Grok shell, and the AGY process's child shell. The script does what an integration skill would do: `curl "$AUTOBYTEUS_GITHUB_API_URL/repos/…/issues/1"` and `git ls-remote https://github.com/….git`. It also records `env` and `ps` from that same shell.
  - SCN-A2: the default Codex setting of a user who turned auto-execute off is the `workspace-write` sandbox, with approval on request (DEC-011). The run must reach the proxy without an approval prompt.
  - SCN-A3: the user unticks the agent on the card while its run is active. The run's next call is refused. Ticking again restores it, because the pass is still live.
  - SCN-A4: the user stops (terminates) the run. Its old address is refused `RUN_PASS_INVALID`.
  - SCN-A5: a team whose coordinator's agent is ticked and whose other member's agent is not. Only the ticked member's process gets the variables.
  - SCN-A6: the full desktop journey on a worktree build.
    - Connect with the real (test) token on the card.
    - Tick an agent and run it with Codex, auto-execute off, from the chat.
    - Turn remote access on and check the proxy port from a non-loopback address (QR-001).
    - Clone a multi-MB repository through a run's address while the embedded server's memory is sampled (QR-002).
    - Remove the token: the next call is `INTEGRATION_NOT_CONNECTED`.
  - SCN-A7: a token scan after real runs (AC-007). It covers:
    - the run data root (database, memory, traces), the activity and connections files;
    - the wire messages and the probe's own outputs;
    - `CODEX_HOME` session files, Claude's session transcripts for the test workspace, Grok's sessions;
    - server and test logs.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested):
  - CRS-103 (a token echo inside a non-text API body);
  - a same-user process copying a live pass from another run's shell (R-1, non-goal).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / DS-001 connect (GraphQL, vault, connections file, card) | Added | IMP-03, IMP-07, IMP-08, IMP-11, IMP-12 | Repository proof is strong. The connected state was rendered only with an intercepted status (IMP-12), so this is a packaged-app journey with a real connect (API-11) |
| BEH-002 / DS-002 variables per runtime | Added | IMP-04 (unit, process/env seams); IMP-05 (Codex merge, real app-server, no model turn) | No real agent shell in any runtime has used the variables yet, so API-02…API-07 |
| BEH-003 / DS-003 / DS-005 forwarding, redaction, activity | Added | IMP-03 (fake upstream, real git), IMP-08 (real GitHub, variables from run access, no runtime) | Reused; also exercised by every runtime cell |
| BEH-004 refusals | Added | IMP-03 (each code) | Reused; untick and stop exercised on real runs (API-08) |
| DS-004 release revocation | Added | IMP-04 | Exercised on real runs (API-08) |
| Loopback listener (QR-001) | Added | IMP-03 (`NOT_LOOPBACK` via `Host`) | A real interface with remote access on (API-11) |
| Git streaming (QR-002) | Added | Design / code reading only | Measured (API-11) |
| Codex sandbox network (DEC-011) | Added | IMP-05 (S1 blocked / S2 reachable, no model) | A live Codex turn in `workspace-write` (API-04, API-11) |
| Existing runs without access; provider keys; MCP secrets | Preserved | IMP-02, IMP-09 | Full server e2e (API-12) and the no-access cell (API-01) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `src/credential-proxy/*` | IMP-03, IMP-04 | — | Reuse |
| API / transport / contract | Yes | GraphQL; the proxy HTTP route | IMP-07 (built server), IMP-03 | — | Reuse |
| Frontend component / state | Yes | `GitHubIntegrationCard`, store | IMP-11 specs, IMP-12 (Nuxt dev, intercepted connected state) | A real connected state in the packaged renderer | Isolated desktop instance |
| Browser integration / user journey | Yes | the Settings card journey | IMP-12 | the packaged journey | Isolated desktop instance |
| Authentication / session / permissions | Yes | run pass; token injection; agent ticks | IMP-03, IMP-08 | ticks and passes on real runs | Gated runtime suite |
| Desktop renderer / web-equivalent UI | Yes | the card | IMP-12 | — | Isolated instance |
| Desktop shell / Electron-specific integration | Indirect (embedded server env baseline; `CODEX_HOME` pass-through) | none | none | The embedded server's runtime CLIs under the shell's environment | Isolated instance |
| Process / lifecycle | Yes | five runtime processes' env; release revocation; startup order | IMP-04 (seams), IMP-05 | real runtime shells; stop | Gated runtime suite; isolated instance |
| Persisted-data transition | No (new stores only) | — | core test (tolerant read) | — | — |
| Worker / queue / distributed coordination | Indirect (team members) | member run preparation | IMP-04 premise 2 (read) | a real team run | Gated runtime suite (AGY scripted) |
| External integration | Yes | GitHub API and git | IMP-08 (strict live) | through real runtime shells; a large repository | Gated runtime suite; isolated instance |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy`
- Project type and runtime stack: pnpm monorepo. It contains the Node 22 Fastify/GraphQL server (`autobyteus-server-ts`), the Nuxt/Electron desktop app (`autobyteus-web`) and the core library (`autobyteus-ts`). The runtime CLIs are `codex` 0.166.0, `claude` 2.1.314, `grok` 1.0.70 and `agy` 1.4.11, plus LM Studio. Also present: git 2.50.1 (Apple) and `gh`.
- Project testing guideline paths: `TESTING.md` (root). There is no closer `TESTING*.md` under `autobyteus-server-ts` or `autobyteus-web`.
- Conflicting, missing, or unclear project instructions:
  - TESTING.md says a server started with `AUTOBYTEUS_TEST_VAULT` reads the test vault read-only, and Settings saves then fail. So the desktop journey starts its instance **without** the test vault. The driver reads `test.github.token` from the test vault and types it once into the card of that test-owned instance, which keeps its own vault. This follows the TESTING.md rule for test-only secrets ("send once to a server with its own vault").
  - The isolated instance's embedded server gets only a system-baseline environment; of the CLI homes, only `CODEX_HOME` passes. So the desktop journey uses Codex.
- Required environment variables or secrets available: `Yes`
  - `test.github.token` is CONFIGURED in `~/.autobyteus-test/vault` (`pnpm test-vault status`). It expires 2026-11-25.
  - Signed-in `claude`, `codex` and `grok`; LM Studio with `qwen/qwen3.6-35b-a3b`; `agy` (host login).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing guideline | <ul><li>Test layers and Rules 1–9.</li><li>Clean env `env -i PATH HOME=<resolved temp> TMPDIR`. Signed-in CLIs need the real HOME, USER and LOGNAME.</li><li>Test vault and `test.github.token`.</li><li>One heavy run at a time; one local-model run at a time; unload LM Studio models afterwards.</li><li>Throwaway `CODEX_HOME` with an `auth.json` symlink.</li><li>Isolated instance: `--data-root`, `--server-port`; only `CODEX_HOME` passes.</li><li>"Rerun by impact".</li></ul> |
| `docs/isolated-app-instances.md` | Isolated desktop instances | `pnpm --silent isolated-app start --build`, `restart`, `stop`; `controlPort` for CDP attach |
| `autobyteus-server-ts/docs/modules/credential_proxy.md` | Contract and design of the subsystem | variables, refusal codes, activity fields, "Not supported", tests list |
| `tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts`, `work-journal-live-runtimes.e2e.test.ts` | Existing per-runtime live suite patterns | in-process `startStudioE2eRuntimeServer`, `createAgentRun` + `/ws/agent/<runId>`, `pickModel`, runtime gates, application vault initialisation |
| `tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts` | Existing live proxy check | `readLiveTestSecret(context, "test.github.token")`; token-scan helper pattern |
| `tests/fixtures/agy-failure-cli.mjs` | Scripted AGY CLI | `ANTIGRAVITY_CLI_COMMAND` is read at module load (`COMMAND`), so it is set on the command line |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process studio server (gated suite) | `autobyteus-server-ts` | `vitest run tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | own temp data dir and application vault; proxy on `127.0.0.1:0` | `startStudioE2eRuntimeServer` returns | `afterAll` terminates runs, disconnects GitHub, closes the app, removes the data dir |
| Throwaway `CODEX_HOME` | temp | `config.toml` (empty) + `auth.json` symlink | user's `~/.codex` untouched | `codex --version` | `rm -rf` after the token scan |
| LM Studio model | — | JIT load by the run | one local-model run at a time | catalog lists it | `lms unload qwen/qwen3.6-35b-a3b` |
| Isolated desktop instance | repo root | `CODEX_HOME=<throwaway> pnpm --silent isolated-app start --build --data-root <owned dir>` | packaged build of this worktree | `start` JSON ports | `isolated-app stop <id>`; owned data root removed after the scan |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| GitHub token | test vault `test.github.token`, read with `readLiveTestSecret` (suite) or `openVerifiedTestVault` (desktop driver) | Sent once to a test-owned server with its own vault. Never printed; scans report booleans and paths only | `disconnectGitHubIntegration` / card Remove; data dirs removed |
| Test repository | `ryan-zheng-teki/autobyteus-mcp-test` (DEC-009) | read only | — |
| Large public repository (QR-002) | chosen by size through the proxy's own `/repos/{owner}/{repo}` (`size`) | read only; one clone | clone dir removed |
| Agents, teams, runs | GraphQL on the test-owned server | dummy names | removed with the data dir |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (new stores only).
- References: design-spec § Persisted Data; handoff § Persisted Data Transition Check.
- Representative existing data: a data root without `integrations/` (every fresh suite and instance). The reader treats it as not connected, which IMP-03 already covers for a missing or malformed file.
- Evidence planned: no migration path to prove. Every run starts from no `integrations/` folder and reaches the connected state through the API (API-01, API-11).
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/credential-proxy/credential-proxy-core.test.ts` | definitions, path checks, passes, run access, store | REQ-005/006, DS-002 | Still Valid | IMP-03 | Reuse |
| `tests/integration/credential-proxy/*` (host, connection service, git smart-HTTP) | refusals, auth formats, redaction, redirects, activity, revocation, no log lines; real clone and push | AC-001, AC-003…AC-006 | Still Valid | IMP-03 | Reuse |
| Backend delivery tests (native, Claude, Codex, AGY, ACP), `agent-run-manager.test.ts` | variables applied per runtime; revoke at both release points | AC-002, DS-004 | Still Valid (seam-level) | IMP-04 | Reuse; real shells added by API-01…API-07 |
| `tests/e2e/credential-proxy/github-integration-graphql.e2e.test.ts` | GraphQL on a built server | AC-001 | Still Valid | IMP-07 | Reuse |
| `tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts` | connect against real GitHub on a built server; curl, `gh api`, ls-remote and clone with run-access variables | AC-001, AC-003, AC-004, AC-007 | Still Valid | IMP-08 | Reuse |
| `autobyteus-web/components/settings/__tests__/GitHubIntegrationCard.spec.ts`; `tests/e2e/github-integration-card-probe.mjs` | card states and actions | AC-001 | Still Valid | IMP-11, IMP-12 | Reuse |
| Other server e2e (every suite starts the composition that now owns the proxy host) | unchanged behavior | Preserved behavior | Still Valid | not run by implementation | Rerun as API-12 |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-003…AC-007 (repository), DS-001…DS-005 | unit, integration, built-server e2e, live GitHub, web specs and probe | Reused | IMP-01…IMP-14 | Code unchanged since `2529eaaec1` (only `tickets/` after it); each check ran on `2529eaaec1` or on `32f14bfd4d`, whose only later code change is covered by IMP-03/07/08/11 |
| API-01 | AC-002 (unticked run, team), AC-006, DS-004 | in-process studio server; AGY runtime process (scripted CLI that runs the probe in a child shell); GitHub live | Durable | new suite, AGY cells: ticked agent; unticked agent; a team with a ticked and an unticked member | No test runs a real runtime process with the variables. AGY's delivery is its process env, which a scripted CLI proves without model cost |
| API-02 | AC-002, AC-003, AC-004, AC-007 | native AutoByteus runtime, `run_bash`, LM Studio | Durable | same suite, `RUN_LMSTUDIO_E2E=1` cell | a real native agent shell |
| API-03 | same | Claude Agent SDK, Bash tool | Durable | `RUN_CLAUDE_E2E=1` cell | a real Claude shell |
| API-04 | same + DEC-011 | Codex, auto-execute **off** (`workspace-write`, approval on request) | Durable | `RUN_CODEX_E2E=1` cell `codex-workspace-write` | the user's sandbox setting; the reviewer's required case |
| API-05 | same | Codex, auto-execute on (`danger-full-access`) | Durable | `RUN_CODEX_E2E=1` cell `codex-full-access` | the default setting |
| API-06 | same | Grok Build (ACP) | Durable | `RUN_GROK_E2E=1` cell | a real Grok shell |
| API-06b (added during execution) | same | Grok process env (recorded fake CLI behind a probe wrapper) | Durable | `RUN_GROK_SCRIPTED_E2E=1` cell | Added when xAI refused the live turn with a 429 quota error. It is kept as a no-cost regression cell for Grok's launcher env |
| API-07 | same | Antigravity live (host login) | Durable | `RUN_AGY_E2E=1` cell | a real AGY model shell; adds to the user's `agy` history (TESTING.md) |
| API-08 | AC-006, REQ-006, REQ-010, DS-004 | the same runs | Durable (inside each cell) | after the probe: untick → the run's address gives `403 INTEGRATION_NOT_ALLOWED`; re-tick → 200; terminate → `403 RUN_PASS_INVALID`; activity records each | SCN-A3/A4 on real runs |
| API-09 | AC-007, REQ-009 | the probe's `env`/`ps` captures, wire messages, data dir, activity and connections files, `CODEX_HOME`, Claude transcripts of the workspace, Grok sessions, the test log | Durable (in suite) + Temporary Probe (scan of CLI homes and logs outside the data dir) | in-suite booleans; a scan script after the run, paths only | AC-007 on real runs |
| API-10 | regression | full server e2e | Existing Test | builds; `pnpm test:e2e` (clean env) | the composition, the release path and five backends changed; not run by implementation |
| API-11 | AC-001, AC-002, AC-006, AC-007, QR-001, QR-002, DEC-011 | isolated desktop instance (packaged worktree build) | Journey | <ul><li>Card: connect with the real token, Test, tick.</li><li>A Codex run with auto-execute off, driven from the chat, runs the probe.</li><li>Remote access on: LAN-address check of the proxy port.</li><li>Large clone through the run's address with RSS sampling.</li><li>Remove: `INTEGRATION_NOT_CONNECTED`.</li><li>Scan the data root, logs and `CODEX_HOME`.</li></ul> | the user's real journey; QR-001/QR-002 |
| API-12 | REQ-009, QR-003 | evidence and ticket folder | Temporary Probe | scan every evidence and ticket file for the token (paths only) | the evidence itself must be token-free |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01…API-09 | `autobyteus-server-ts/tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | The design's change sequence calls for "per-runtime e2e: each runtime's shell sees the variables and no token". The implementation proved delivery at the seams (IMP-04). A gated suite that runs a real shell in each runtime keeps that boundary from regressing when a runtime CLI or backend changes |
| API-01 | `autobyteus-server-ts/tests/fixtures/agy-shell-env-probe-cli.mjs` | A scripted AGY CLI that runs the probe in a child shell with its own environment, then continues as `agy-failure-cli.mjs`. The existing fixture records argv and cwd only |
| API-01…API-07 | `autobyteus-server-ts/tests/fixtures/github-proxy-shell-probe.sh` | The integration-skill-like script every runtime's shell runs. It writes its results into the run's workspace, so no model has to report values |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron with an embedded server (`autobyteus-web`). Packaged build of this worktree via `isolated-app start --build`.
- Testing guideline used: `TESTING.md` (Rules 1–5, isolated instances), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: the GitHub card (connect, Test, tick, Remove).
- Shell-specific or lifecycle behavior:
  - the embedded server's environment baseline with `CODEX_HOME`;
  - the proxy listening in the embedded server;
  - remote access turning the main server non-loopback.
- Chosen approach and why: a packaged instance driven over CDP (attach only). It is the only surface that runs the embedded server with the shell's environment and remote-access setting.
- How the run avoids disturbing the running desktop app:
  - an owned `--data-root` and its own ports;
  - the user's app, `~/.autobyteus` and port 4822 are not touched;
  - `CODEX_HOME` is throwaway.

## Live Environment And Fixture Plan

- Startup order:
  1. Builds: `autobyteus-ts`, then `autobyteus-server-ts`.
  2. The gated suite, in a clean env with the real HOME/USER/LOGNAME for the signed-in CLIs, and a throwaway `CODEX_HOME`.
  3. The full e2e.
  4. The isolated instance.
- Environment choices that materially affect the run:
  - Codex `workspace-write` comes from auto-execute off.
  - LM Studio `qwen/qwen3.6-35b-a3b`.
  - Claude `haiku`; Codex `gpt-5.4-mini` with low reasoning effort; Grok's default listed model.
- Health / readiness checks: the GraphQL `githubIntegration` status shows `connected: true` before runs start.
- Test identities: the GitHub test token's account (login shown, not secret).
- Journeys: SCN-A1…A7.
- Evidence: value-free JSON summaries per runtime cell, activity records, refusal bodies, screenshots of the card, `lsof` and LAN connect results, RSS samples, scan results.
- Owned processes and state to clean up:
  - runs;
  - the in-process server;
  - the isolated instance;
  - temp data dirs, `CODEX_HOME`, clones;
  - the LM Studio model.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Live `git push` to GitHub | read-only test token (DEC-009); push proven against a local `git http-backend` with GitHub's Basic format (IMP-03) | Low: same route, same auth format, measured clone on real GitHub | No | None |
| Windows and Linux desktop | not available / not in scope of the change (no platform code) | Low | No | None |
| `gh`'s own commands | not supported by design (DEC-004) | — | No | — |

## Ambiguities Or Reroute Triggers

None at planning.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: one gated suite, two fixtures)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: AC-008 (docs) was reviewed in CRR-001. API/E2E does not re-prove it by execution, but it reads the contract against observed behavior during the runs.
