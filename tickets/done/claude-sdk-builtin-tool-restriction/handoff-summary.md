# Handoff Summary — claude-sdk-builtin-tool-restriction

## Status

- Stage: Delivery finalization. **The user verified it on 2026-09-24** using the local macOS `personal` Electron build ("its working. lets finalize, no need to release"). The ticket is archived to `tickets/done/`. Finalization target: `origin/personal`. Release: not required, by user decision.
- User-verification build: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` and `AutoByteus_personal_macos-arm64-1.4.77.dmg`, built with `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm build:electron:mac` (exit 0; log at `delivery-logs/electron-build-mac-personal.log`). I confirmed the packaged server `claude-sdk-client.js` contains both tool-policy constants.
- Classification (carried, unchanged): `task_size=Small`, `architectural_risk=Low`. Route: direct low-risk route (Solution Design → Implementation → API/E2E → Delivery).
- Architecture review, code review and test-code review artifacts: `N/A — not applicable` (direct route).
- Revision chain: SR-002 / IR-001 / API-REV-001 / DR-001 / DR-002.

## What Changed

Claude Agent SDK turns in AutoByteus now expose only an explicit set of Claude Code built-in tools. Claude's native subagent and multi-agent tools are neither visible nor callable. AutoByteus' own `delegate_task` / `send_message_to` / Team tools are the multi-agent mechanism.

- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`: `buildQueryOptions` now emits:
  - `tools: ["Bash","Read","Edit","Write","Glob","Grep","NotebookEdit","WebFetch","WebSearch","Skill"]`
  - `disallowedTools: ["AskUserQuestion","Agent","Task","Workflow","SendMessage","ListAgents"]`

  Both are module-local constants. Model discovery options, MCP servers, `allowedTools`, permissions, skills and session/resume handling are unchanged.
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`: exact `tools`/`disallowedTools` assertions, plus model-discovery guard tests.
- `autobyteus-server-ts/docs/modules/agent_execution.md`: the policy paragraph was rewritten and the superseded guidance was removed. Delivery added the CLI-update re-verify trigger and the legacy-session resume note.
- Ticket artifacts and credential-free probe evidence under `tickets/…/claude-sdk-builtin-tool-restriction/`.

## Integration State

- Ticket branch: `codex/claude-sdk-builtin-tool-restriction` @ `12261026b`, plus uncommitted delivery docs edit and ticket artifacts.
- Base: `origin/personal` @ `9267d11c8`, re-fetched at delivery start. There were no new commits, so the branch is already current (no merge needed).
- Post-integration check: `claude-sdk-client.test.ts` 18/18 pass on the delivery state.

## Validation Evidence (API/E2E, confidence 95%)

- Unit: 18/18 for `claude-sdk-client.test.ts`. The Claude/runtime unit suites are 145/147; the 2 failures already exist on base (`claude-session` interrupt/resume timing, and a Codex env test). The `tsc` build passes.
- Real in-process Studio server E2E (GraphQL + WebSocket team run → ClaudeSession → real Claude Code CLI → local fake Anthropic API). It ran with the PATH CLI 2.1.281 and with the bundled CLI 2.1.280, and probe4 ran on SDK 0.3.281:
  - The model sees exactly the 10 built-ins plus the AutoByteus MCP tools. No agent listing appears, even with a project `.claude/agents` file present.
  - Forced `Agent`/`Task`/`Workflow`/`SendMessage`/`ListAgents`/`AskUserQuestion` calls → "No such tool available". They surface as normal `TOOL_EXECUTION_FAILED`, and there was no subagent traffic.
  - `Read`, the configured skill and AutoByteus `send_message_to` all work. The message was delivered to the peer member.
  - The same policy applies on the receiving member's turn and on resume, including sessions created with the old options.
  - Model discovery works and sends no tool-bearing requests.

## Residual Risks / Observations (for the user)

- **RR-1**: sessions created before this change keep Claude's old agent-type listing in their transcript history, and it is replayed on resume. The tool list is still restricted and native calls still fail. This is consistent with the approved `Not Affected` persisted-data decision. Changing it would need a separate ticket.
- **RR-2**: production resolves `claude` from an env override or `PATH` before the SDK-bundled CLI, so a tool rename (R-001) can arrive through a CLI update. The docs now say to re-verify on SDK bumps **and** CLI updates.
- **OBS-1** (existed before, out of scope): the gated live suite `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` sends `refType`, which the schema no longer has. It would fail when `RUN_CLAUDE_E2E=1`. This is a candidate for a separate ticket.
- **OBS-2** (nit): in `claude-sdk-client.test.ts`, `const RESERVED_SESSION_ID ="…"` is missing a space.
- **R-001** (accepted): future Claude Code renames of a listed built-in would silently drop it. Re-run `probe-evidence/probe3.mjs` / `probe4.mjs` on upgrades.
- **ASM-001** (accepted): the static Bash/Glob/Grep/Skill description text still mentions "Agent tool"/"subagent".

## How To Verify Locally (suggested)

1. Start the server from this worktree and run a Claude-runtime agent or team.
2. Ask the agent to list its tools. You should see no `Agent`/`Task`/`Workflow`/`SendMessage`/`ListAgents`/`AskUserQuestion`. The AutoByteus team tools (`send_message_to`, `delegate_task`, …) should still be there.
3. In a team run, confirm that inter-member messaging still works through AutoByteus `send_message_to`.

## Release / Deployment

- Finalization is a merge into `personal` with no release. The user explicitly declined a release ("no need to release").

## Artifacts

- Docs sync report: `docs-sync-report.md`
- Release/deployment report: `release-deployment-report.md`
- Delivery revision record: `delivery-revision-record.md`
- Upstream: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `solution-handoff.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, `probe-evidence/`
