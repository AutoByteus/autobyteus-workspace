# Handoff Summary — runtime-lifecycle-review

## Ticket

- Package: `runtime-lifecycle-review` (Settings → Agent Runtimes). It continues and replaces the predecessor `runtime-lifecycle-usability`.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed (architecture review ARCH-REV-003, code review CRR-002, API/E2E API-REV-001 at 95.3%, test-code review CRR-003).
- Revisions: requirements approved by the user at SR-007/SR-010, current SR-012. IR-002, CRR-003, API-REV-001, DR-001.

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

## Verification

- Judged from the evidence: see `release-deployment-report.md` → Verification.

## Release

- See `release-deployment-report.md` → Release Decision.

## Residual Risks And Follow-ups

- Vendor behavior that only the real vendors and the user's accounts can show: `codex login` / `grok login --oauth` opening the browser when started without a terminal, real signed-in output (Grok), and package-manager updaters (Homebrew) refusing `update`. In that last case the vendor's message is shown, a non-goal.
- Grok and Antigravity Application launch readiness stays `unsupported` (unchanged, documented).
- Follow-ups FU-001…FU-007 are in `follow-ups.md`; none blocks. FU-005 is the architecture-suite failure already on the base. The Solution Designer sends them.
