# Handoff Summary — runtime-lifecycle-review

## Ticket

- Package: `runtime-lifecycle-review` (Settings → Agent Runtimes). It continues and replaces the predecessor `runtime-lifecycle-usability`.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed (architecture review ARCH-REV-003, code review CRR-002, API/E2E API-REV-001 at 95.3%, test-code review CRR-003).
- Revisions: requirements approved by the user at SR-007/SR-010, current SR-012. IR-002, CRR-003, API-REV-001, API-REV-002 (real accounts, 97.1%), DR-001.

## What Changed

- **Server** (`autobyteus-server-ts/src/runtime-management/agent-runtimes/`): `AgentRuntimeStatusService` with one strategy per runtime (Codex, Claude, Antigravity, Grok). It covers installed version, independent update checks against each vendor's source, the vendor's own `update` command, and Sign in through `codex login` / `grok login --oauth` with Cancel and a 10-minute time-out. GraphQL: `agentRuntimes`, `checkAgentRuntimes`, `updateAgentRuntime`, `startAgentRuntimeSignIn`, `cancelAgentRuntimeSignIn`.
- **Sign-in owner:** `AgentRuntimeSignInReader` now serves the page and Application launch readiness. The readiness adapter lost its own command runner. Its rules and texts are unchanged, except the Claude time-out text: 10 s, "Command timed out after 10000ms.".
- **Running-agent rule:** Update is refused while a runtime has running agents. The count includes Application agents, through `hostManagement.activeAgentRuns`.
- **Web:** Settings → Agent Runtimes (after API Keys) in en and zh-CN. The layout switches between table and stacked rows by the list's width (about 58 rem). Remote windows are status only.
- **Tests:** server unit tests; two GraphQL e2e suites with scripted CLIs; a browser probe (`pnpm -C autobyteus-web test:e2e:agent-runtimes-settings`).
- **Docs:** `autobyteus-web/docs/settings.md` (new section) and `autobyteus-server-ts/docs/modules/agent_runtimes.md` (new). `codex_integration.md` and `grok_build_runtime.md` were corrected, and the module index updated.

## Integration

- `origin/personal` had moved from `aac5da3112` to `5de6a698b9` (23 commits: `mcp-sdk-v2-migration`, `mcp-test-launcher-and-test-residue`, beta `v1.5.8-beta.1`). The only file both sides changed is `autobyteus-web/package.json` (version vs. probe script).
- Integration method: `git merge origin/personal` → `1da2cc3c22`, no conflicts. `pnpm install --frozen-lockfile` was rerun for the MCP SDK change.
- Post-integration checks on `62aad6624d`, all Pass (`evidence/delivery/`):
  - DEL-01: `prepare:shared` + server `typecheck` (`TSC EXIT 0`)
  - DEL-02: focused server unit tests, 40 files / 305 tests
  - DEL-03: `test:integration:prepare` + GraphQL e2e 12/12 + running-agents e2e 4/4 (AR-11 secret scan: 0 hits)
  - DEL-04: web guards + Settings specs, 60 files / 303 tests
  - DEL-05: the browser probe on the merged state: 10/10 cases, no browser errors, table from a 1252 px window, 0 secret hits

- Second refresh before finalizing: `origin/personal` had moved to `66d834b0ac` (`autobyteus-ts-dependency-hygiene`: autobyteus-ts lockfile/workflow/`hono` removal, root lockfile). Merged as `6f0c4eaea9`, no conflicts. DEL-06 passed: typecheck, 143 focused unit tests, both e2e suites (12/12, 4/4), web specs 35/35.

## Verification

- Judged from the evidence: sufficient. Every critical acceptance criterion is proven directly (table in `release-deployment-report.md`). Final confidence is 97.1%.
- Round 1 (API-REV-001) had left the real-account parts open. At the user's direction ("api e2e should use my real account", with no custom vendor homes), API/E2E ran API-REV-002 in an isolated desktop instance of this branch. It used his real HOME, login-shell PATH, installed runtimes and accounts:
  - real states of all four runtimes matched each CLI's own report; Grok's signed-in `grok models` reads Signed in;
  - a real Claude update 2.1.302 → 2.1.304 from the page;
  - real sign-out detected, then Codex and Grok signed in from the page: the vendor page opened in his browser and the rows reached Signed in;
  - 0 secret hits in 103 files.
- No separate user check: the user did the browser step inside the API/E2E run, and nothing else needs him.

## Release

- Decision: `Beta`, decided by the user on 2026-10-20 in the Delivery Engineer conversation ("lets release a new beta by teh way"). Beta `v1.5.8-beta.2`:
  - release commit `7f41314aa8`;
  - all four workflows succeeded (iOS after re-running a runner-capacity failure);
  - GitHub pre-release with 17/17 assets;
  - Docker `:1.5.8-beta.2` and `:beta` published, `:latest` stays on 1.5.7.

## Final State

- `origin/personal`: merge `a808c45b77`, release commit `7f41314aa8`, delivery record on top.
- The ticket worktree and local branches are removed; `origin/codex/runtime-lifecycle-design-review` is kept.

## Residual Risks And Follow-ups

- Real browser sign-in, real signed-in output and a real update are now proven on the user's Mac (API-REV-002). Still not exercised for real:
  - package-manager installs (Homebrew/WinGet) whose `update` refuses; the vendor's message is shown, a non-goal;
  - a window on a real remote/Docker node; the renderer gate is proven by ARP-08 against a non-embedded node binding, and the Electron window-context code is unchanged.
- Grok and Antigravity Application launch readiness stays `unsupported` (unchanged, documented).
- Follow-ups FU-001…FU-007 are in `follow-ups.md`; none blocks. FU-005 is the architecture-suite failure already on the base. The Solution Designer sends them.
