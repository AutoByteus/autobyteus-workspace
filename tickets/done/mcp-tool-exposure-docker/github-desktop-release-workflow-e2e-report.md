# GitHub Desktop Release Workflow E2E Report

## Scope

- Ticket: `mcp-tool-exposure-docker`
- Workflow: `.github/workflows/release-desktop.yml` / `Desktop Release`
- Validation type: delivery-owned GitHub-hosted workflow E2E rerun after Round 5 Local Fix.
- Dispatch command: `gh workflow run release-desktop.yml --ref codex/mcp-tool-exposure-docker -f publish_release=false -f release_tag=`
- Dispatch inputs recorded by delivery: `publish_release=false`; `release_tag=` blank/empty.
- Dispatch ref: `codex/mcp-tool-exposure-docker`
- Validated head SHA: `c45ed6fc31614a22f53a0e0d2773d3c6ba52bf53`
- Run ID: `27810921946`
- Run URL: <https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27810921946>
- Result: `Pass`

## Run Metadata

```json
{"conclusion":"success","createdAt":"2026-06-19T07:04:18Z","databaseId":27810921946,"event":"workflow_dispatch","headBranch":"codex/mcp-tool-exposure-docker","headSha":"c45ed6fc31614a22f53a0e0d2773d3c6ba52bf53","name":"Desktop Release","status":"completed","updatedAt":"2026-06-19T07:21:56Z","url":"https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27810921946","workflowDatabaseId":238882760}
```

## Job Statuses

| Job ID | Job | Status | Conclusion | Runner | Runner Group | Started | Completed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `82300833385` | Resolve Release Metadata | `completed` | `success` | GitHub Actions 1000002370 | GitHub Actions | 2026-06-19T07:04:21Z | 2026-06-19T07:04:32Z |
| `82300861385` | Build Windows x64 | `completed` | `success` | GitHub Actions 1000002373 | GitHub Actions | 2026-06-19T07:04:34Z | 2026-06-19T07:15:22Z |
| `82300861389` | Build Linux x64 | `completed` | `success` | GitHub Actions 1000002374 | GitHub Actions | 2026-06-19T07:04:35Z | 2026-06-19T07:08:34Z |
| `82300861395` | Build macOS ARM64 | `completed` | `success` | GitHub Actions 1000002372 | GitHub Actions | 2026-06-19T07:04:36Z | 2026-06-19T07:19:57Z |
| `82300861408` | Build macOS Intel x64 | `completed` | `success` | GitHub Actions 1000002371 | GitHub Actions | 2026-06-19T07:04:41Z | 2026-06-19T07:21:55Z |
| `82300861420` | Build Linux ARM64 | `completed` | `success` | GitHub Actions 1000002375 | GitHub Actions | 2026-06-19T07:04:37Z | 2026-06-19T07:07:52Z |
| `82303205979` | Publish GitHub Release | `completed` | `skipped` |  |  | 2026-06-19T07:21:56Z | 2026-06-19T07:21:55Z |

## Uploaded Artifacts

| Artifact | Size (bytes) | Expired | Created |
| --- | ---: | --- | --- |
| `macos-x64` | 882598614 | `False` | 2026-06-19T07:21:49Z |
| `macos-arm64` | 832748276 | `False` | 2026-06-19T07:19:53Z |
| `windows-x64` | 294917010 | `False` | 2026-06-19T07:15:03Z |
| `linux-x64` | 356386132 | `False` | 2026-06-19T07:08:20Z |
| `linux-arm64` | 346390922 | `False` | 2026-06-19T07:07:50Z |

## Linux x64 Evidence

- Job `Build Linux x64` ran on `ubuntu-22.04` and completed successfully.
- Build emitted `electron-dist/AutoByteus_personal_linux-x64-1.3.60.AppImage`.
- Fresh run logs contain zero `linux-x86_64` occurrences for the run artifacts/log package.
- `file` identified the AppImage as x86-64 ELF.
- `scripts/validate_linux_updater_metadata.py --metadata autobyteus-web/electron-dist/latest-linux.yml --arch-token linux-x64` passed and confirmed embedded `blockMapSize` metadata.
- Prisma x64 engine and Prisma client runtime engine checks passed.
- Packaged server startup validation passed after migrations and health probing.
- Upload artifact `linux-x64` completed and used path `autobyteus-web/electron-dist/*linux-x64*.AppImage` plus `latest-linux.yml`.
- Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861389-build-linux-x64.log`

Key log lines:

```text
building target=AppImage arch=x64 file=electron-dist/AutoByteus_personal_linux-x64-1.3.60.AppImage
Validated autobyteus-web/electron-dist/latest-linux.yml: linux-x64 AppImage metadata includes embedded blockMapSize
Prisma Linux x64 engine targets verified
Prisma client Linux x64 runtime engines verified
Packaged server startup validation passed
Artifact linux-x64 has been successfully uploaded
```

## Linux ARM64 Evidence

- Job `Build Linux ARM64` ran on `ubuntu-24.04-arm` and completed successfully.
- Build emitted `electron-dist/AutoByteus_personal_linux-arm64-1.3.60.AppImage` and `latest-linux-arm64.yml`.
- `file` identified the AppImage as ARM aarch64 ELF.
- ARM64 metadata validation passed with embedded `blockMapSize`.
- ARM64 Prisma engine checks and packaged startup/migration/health validation passed.
- Upload artifact `linux-arm64` completed.
- Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861420-build-linux-arm64.log`

## Windows x64 Evidence

- Job `Build Windows x64` ran on `windows-2022` and completed successfully.
- The prior `npm install` / `ECONNRESET` path did not recur in this run.
- Server preparation completed successfully, Windows build completed, and artifact `windows-x64` uploaded.
- Log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861385-build-windows-x64.log`

Key log lines:

```text
Installing portable runtime dependencies...
Server files prepared successfully!
Build completed:
Artifact windows-x64 has been successfully uploaded
```

## macOS Evidence

- `Build macOS ARM64` completed successfully and uploaded `macos-arm64`.
- `Build macOS Intel x64` completed successfully and uploaded `macos-x64`.
- macOS blockmap handling remains intact through existing workflow artifact paths and successful macOS jobs.
- Logs:
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861395-build-macos-arm64.log`
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861408-build-macos-intel-x64.log`

## Publish / Release Guardrail Evidence

- `Publish GitHub Release` job was `skipped`.
- No remote tag points at validated SHA `c45ed6fc31614a22f53a0e0d2773d3c6ba52bf53`.
- Recent release list still shows latest release `v1.3.60` from 2026-06-18, before this validation run.
- Release/tag publication check: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-release-publication-check.log`

## Saved Evidence Artifacts

- Run metadata JSON: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946.json`
- Jobs JSON/TSV:
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-jobs.json`
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-jobs.tsv`
- Artifact JSON/TSV:
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-artifacts.json`
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-artifacts.tsv`
- Failed-step log command output: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-failed.log` (no failed steps; header only)
- Job logs:
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300833385-resolve-release-metadata.log`
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861389-build-linux-x64.log`
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861420-build-linux-arm64.log`
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861385-build-windows-x64.log`
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861395-build-macos-arm64.log`
  - `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/tickets/done/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27810921946-job-82300861408-build-macos-intel-x64.log`

## Conclusion

The real GitHub-hosted `Desktop Release` validation-only workflow passed at `c45ed6fc31614a22f53a0e0d2773d3c6ba52bf53` with `publish_release=false` and blank `release_tag`. The Linux x64 artifact-name regression is resolved, Linux ARM64 remains green, Windows no longer fails in the prior npm network path, macOS remains green, and publish/release is skipped as intended.
