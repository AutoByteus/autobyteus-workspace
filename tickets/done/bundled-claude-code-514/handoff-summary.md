# Handoff Summary

## Summary Meta

- Ticket: `bundled-claude-code-514` (Project Task `autobyteus-514`, delegated by `/project_task_manager`)
- Date: `2026-11-17`
- Classification: `task_size: Small`, `architectural_risk: Low`; route: direct low-risk (design SR-002, option A+, chosen by the user; implementation IR-001; API/E2E `API-REV-001` Pass, final confidence 95.9%; independent architecture review, code review and test-code review `Not Applicable`).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`)
- Branch: `codex/bundled-claude-code-514`, base `origin/personal` @ `e16f0b0d55` at bootstrap; integrated with `origin/personal` @ `2b73308ce5` (merge `5eedccb85c`, no conflict) before delivery edits. Product code is final at `365fde4e5b` (API/E2E added only reports and evidence).

## Delivery Summary

- Delivered scope:
  - Desktop builds (macOS arm64 and x64, Windows, Linux x64 and ARM64) and the Docker server package no longer contain the Claude Agent SDK's platform binary packages (`@anthropic-ai/claude-agent-sdk-<platform>`, about 200-240 MB each). The SDK package itself stays; a build whose SDK package is missing fails.
  - One owner does it: `autobyteus-web/scripts/claude-agent-sdk-binary-packaging.mjs`, called by `prepare-server.sh` (macOS, Linux), `prepare-server.mjs` (Windows flat npm tree) and `Dockerfile.monorepo` (server package). A 7-test unit spec covers the pnpm and flat layouts and the missing-SDK failure.
  - No runtime behavior changed. Claude runs, model discovery, availability and the Agent Runtimes row keep using the installed `claude`; the SDK is always given its path, so it never loads its own copy (the copy that shipped in the macOS app was re-signed and crashed on every command but `--version`).
  - Size removed per target: macOS arm64 217 MB, macOS x64 217 MB, Windows x64 237 MB, Linux x64 234 MB, Linux ARM64 233 MB, Docker server package 233 MB. Release artifacts shrank, for example macOS arm64 975 to 788 MB and Windows 347 to 273 MB.
  - Option B and C (switch to the bundled program) were weighed and not chosen (`requirements-doc.md`, DEC-001).
- Docs synced (`docs-sync-report.md`): `autobyteus-server-ts/docs/modules/agent_execution.md` (delivery); `autobyteus-web/docs/electron_packaging.md` (implementation, confirmed). `DESIGN.md`, `TESTING.md` and `RELEASE.md` need no change.
- Durable coverage: the packaging spec `autobyteus-web/scripts/__tests__/claudeAgentSdkBinaryPackaging.spec.ts`. API/E2E added no test code; its artifact listings are one-off evidence.

## Verification Summary

- Verified from evidence by delivery; no user check is needed. AC-001, AC-002 and AC-003 (all critical) are directly proven, and the critical evidence files were opened (`release-deployment-report.md`, Verification).
- Final confidence 95.9% (target 95% met), no category below 95%.
- Key evidence:
  - `evidence/API-01-docker-server-package-listing.log`: `Removed 233 MB of Claude Agent SDK platform binaries`, `claude-agent-sdk-<platform> paths: 0`, SDK 0.3.280 present, package 531M.
  - `evidence/API-02-release-artifacts-listing.log`: macOS x64, Linux x64, Linux ARM64 and Windows x64 artifacts of the build-only release run each have 0 platform paths and keep the SDK; a positive control on the installed pre-change app finds the platform package.
  - `evidence/IMP-08-release-test.log`: build-only release run 44105389247 on the ticket branch, all five build jobs `success` (publish skipped), per-job removed sizes.
  - `evidence/IMP-06-isolated-instance.log` and `IMP-06-settings-agent-runtimes.png`: packaged macOS build, Claude enabled, 13 models, reply `PACKAGED-514-OK` from the installed `claude` 2.1.325, Settings row unchanged.
  - `evidence/API-03-docker-node.log` against `API-03-docker-node-baseline.log`: a test-owned Docker node with the pruned package reports the same Claude row as the image's own package (installed 2.1.319, update available 2.1.326, signed out).
- Integrated-state check: both typechecks PASS and the packaging spec PASS after the base merge. The merge brought only web UI files, docs and tests (autobyteus-458), no build input, so the build-only release run and the artifact listings stay valid.
- Secret Gate and artifact hygiene: recorded in `release-deployment-report.md`.

## Residual Risks For The User

- A Claude turn on Windows and Linux desktops and inside Docker was not run (no such desktop host; the Docker node's `claude` is signed out). It uses the same SDK call path as the proven macOS turn, and only files were removed.
- The Docker `linux/amd64` server package was not built locally (arm64 was); the server-docker release workflow builds both.
- A future SDK that looked up its binary even when a path is passed would fail with its own explicit "Native CLI binary ... not found" error rather than silently.
- A computer or Docker node without Claude Code installed shows Claude as not available, as before (the decision for option A+).
- Signing and notarization ran on the release runners in the build-only run (macOS signing policy completed); nothing was published.

## Follow-ups

- None. No role found one; there is no `follow-ups.md` for this ticket.

## Release

- No release: the founder has not asked for one, and RELEASE.md's default is no release. A release is available. `release-notes.md` holds user-facing notes for the next stable release.
