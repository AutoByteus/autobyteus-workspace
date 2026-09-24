# Handoff Summary — claude-sdk-background-task-lifecycle

## Status

- Stage: **Delivery, awaiting explicit user verification.** Nothing has been pushed, merged or released.
- Classification (carried, unchanged): `task_size=Small`, `architectural_risk=Low`. Route: direct low-risk route (Solution Design → Implementation → API/E2E → Delivery).
- Architecture review, code review and test-code review artifacts: `N/A — not applicable` (direct route).
- Revision chain: SR-004 / IR-001 / API-REV-001 / DR-001.
- Finalization target: `origin/personal`. Release: to be confirmed by the user. The previous ticket was finalized without a release.

## What Changed

Claude-runtime agents can no longer start Bash commands that silently die at turn end. Each Claude turn runs one SDK `query({prompt: string})` and closes it on `result`, so the Claude CLI exits and kills every CLI-owned background task. That covered both explicit `run_in_background` calls and foreground commands the CLI auto-backgrounded after their timeout. This was why the Electron builds were killed while the agent kept promising to report back.

Temporary fix, at the `ClaudeSdkClient` boundary: every turn query's CLI env now forces:
- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`: Bash has no `run_in_background` and no auto-backgrounding, so a long command runs in the foreground inside the turn and either completes or ends with a visible timeout error.
- `BASH_MAX_TIMEOUT_MS=1800000`: a single command may run up to 30 minutes when the model requests that timeout. The default stays 2 minutes.

Files:
- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`: frozen `CLAUDE_CLI_RUNTIME_POLICY_ENV`, merged last into the turn-query `env`. Model discovery and context-capacity probes are unchanged.
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`: policy env override tests and a discovery exclusion guard.
- `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client-runtime-policy.integration.test.ts` (live, `RUN_CLAUDE_E2E=1`): checks the real CLI's advertised Bash tool contract on both CLIs.
- `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-bash-policy.e2e.test.ts` (live, `RUN_CLAUDE_E2E=1`): a "run it in the background" request completes in the foreground within the same turn.
- `autobyteus-server-ts/tests/helpers/claude-cli-executable-candidates.ts`: the shared PATH/bundled CLI matrix helper.
- `autobyteus-server-ts/docs/modules/agent_execution.md`: runtime policy paragraph.

The follow-up ticket (confirmed by the user) will migrate the Claude backend to SDK streaming input mode and remove this policy.

## Integration State

- Ticket branch: `codex/claude-sdk-background-task-lifecycle`, local only (not pushed):
  - `b041e34df`: the fix (IR-001)
  - `777853690`: delivery checkpoint with API/E2E tests and artifacts
  - `9bf6a3264`: merge of `origin/personal`
  - plus the uncommitted delivery artifacts
- Base: `origin/personal` advanced from `9267d11c8` to `73f1c5fef` (4 commits, the `claude-sdk-builtin-tool-restriction` finalization). It was merged into the ticket branch.
- Conflicts: 2 files (`claude-sdk-client.ts` and its unit test). Both were purely additive and resolved by keeping both sides. Turn queries now carry the base's `tools` list and this ticket's policy `env`, and the discovery guard asserts both exclusions. `agent_execution.md` auto-merged coherently.
- Post-integration checks, all on the integrated state:
  - Unit, Claude client and backend suites: 131/132. The 1 failure is the known pre-existing `claude-session.test.ts` interrupt/resume test, which also fails on the base.
  - `tsc -p tsconfig.build.json --noEmit`: pass.
  - **Live** `RUN_CLAUDE_E2E=1`: integration 2/2 and E2E 2/2, on both the PATH CLI and the SDK-bundled CLI (`delivery-logs/post-integration-live-claude-policy.log`).

## Validation Evidence (API/E2E, confidence 95%)

- AC-001/005/006 (real CLI tool contract): Bash has no `run_in_background` and no tool offers it; the max is advertised as 1800000 ms (30 min) with a 120000 ms default; conflicting caller env values are overridden.
- AC-002 (live, websocket → AgentRun → Claude backend → real CLI): `sleep 20; echo done > marker` requested "in the background" ran in the foreground, the marker existed at TURN_COMPLETED, the result was reported in the same turn, and there was no `[killed]`.
- AC-003: exceeding the timeout gives a visible `TOOL_EXECUTION_FAILED` ("Command timed out"), with no auto-backgrounding.
- Control: with the fix reverted, the new tests fail and the original bug reproduces (`run_in_background:true` → `[killed]`).
- Regression: discovery, turn, resume, MCP and interrupt/resume pass.

## Residual Risks (for the user)

- **RSK-A (accepted, documented)**: an `env` block in the Claude `settings.json` overrides the policy inside the CLI. The machine's `~/.claude/settings.json` has none.
- **RSK-B (mitigated by the integrated base)**: the other CLI-process-scoped tools (Monitor, ScheduleWakeup, Cron*, Workflow, PushNotification) are not in the base's explicit enabled `tools` list, so turn queries no longer expose them.
- **RSK-C (accepted, ASM-002)**: the per-call default timeout stays 2 min, so the model must request a longer `timeout` for long commands. Otherwise the command fails visibly; it no longer fails silently.
- A long command keeps the turn RUNNING for up to 30 min, and interrupt behavior is unchanged.
- Pre-existing, unrelated failures: the `claude-session.test.ts` interrupt/resume test, and 3 mocked-SDK tests in `claude-agent-websocket-interrupt-resume.e2e.test.ts`.

## How To Verify Locally (suggested)

Verification build: a local, unsigned macOS personal Electron build of the integrated branch (`9bf6a3264`), made with the README's local macOS build command:
- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm build:electron:mac`, run in the foreground, exit 0. Log: `delivery-logs/electron-build-mac-personal.log`.
- App: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.77.dmg`
- Confirmed that the packaged `Resources/server/dist/runtime-management/claude/client/claude-sdk-client.js` contains `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1"`, `BASH_MAX_TIMEOUT_MS: "1800000"` and the base's `CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS`.
- An earlier background attempt of this build was interrupted during DMG creation when the session ended. This foreground build replaced it.

1. Run a Claude-runtime agent and ask it to run a long command "in the background", for example `sleep 60; echo done > /tmp/bg-check`. It should run in the foreground, finish within the same turn and report the result, with no "I'll notify you when it's done".
2. Optionally, repeat the original scenario: have the agent run the Electron build. It should run to completion in the foreground (it needs to request a timeout long enough for the build).

## Release / Deployment

- To be decided by the user at verification time (release or finalize-only merge into `personal`).

## Artifacts

- Docs sync report: `docs-sync-report.md`
- Release/deployment report: `release-deployment-report.md`
- Delivery revision record: `delivery-revision-record.md`
- Upstream: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `solution-handoff.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, `api-e2e-evidence/`, `probe-evidence/`, `delivery-logs/`
