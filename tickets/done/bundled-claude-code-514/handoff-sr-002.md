# Handoff — bundled-claude-code-514, SR-002

- Result: `Architecture Design Complete`; `task_size=Small`, `architectural_risk=Low` → direct implementation
- Package: `bundled-claude-code-514`; Project Task `autobyteus-514` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/bundled-claude-code-514`, branch `codex/bundled-claude-code-514`, base `origin/personal` @ `e16f0b0d55`; finalization target `origin/personal`. Ticket documents are not committed yet; commit them with the implementation.
- Ticket folder: `tickets/in-progress/bundled-claude-code-514/`

## Request and decision

The Task asked whether Claude runs should use the Claude Code bundled with the Agent SDK. Investigation (SR-001): the bundled copy inside the shipped macOS app cannot run (our packaging re-signs it with fewer entitlements: `SharedArrayBuffer is not defined`); subscription login still needs the installed `claude` (UD-006); the Settings card is built around the installed program; the version gap runs the other way; 208 MB of every desktop build is this unused binary. The founder chose **A+** (2026-11-17, in the Solution Designer's conversation): keep the installed program; stop packaging the SDK's platform binary packages in desktop builds and the Docker server package.

## What to build (design-spec.md is authoritative)

New `autobyteus-web/scripts/claude-agent-sdk-binary-packaging.mjs` (export `pruneClaudeAgentSdkBinaries(stageDir)` + CLI), modelled on `onnxruntime-web-packaging.mjs`, called from `prepare-server.sh`, `prepare-server.mjs` and `Dockerfile.monorepo`; unit test on pnpm and flat npm layouts.

## Verification expected

AC-001 (no platform package in any packaged output; SDK package kept: local macOS build, deploy stage, build-only release run `pnpm release:test --ref codex/bundled-claude-code-514`), AC-002 (packaged build runs a Claude turn and lists Claude models with the installed program, isolated instance), AC-003 (Settings card unchanged). Release only on the founder's word.

## Route record

- 2026-11-17: rule "Small or Medium and Low" → `/implementation_engineer`.
