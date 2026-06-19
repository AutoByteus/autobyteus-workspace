# Delivery GitHub Workflow Reroute

## Scope

- Ticket: `mcp-tool-exposure-docker`
- Workflow: `.github/workflows/release-desktop.yml` / `Desktop Release`
- Dispatch purpose: validation-only GitHub-side E2E for desktop release workflow after Linux ARM64 packaging and AppImage blockMap metadata changes.
- Dispatch guardrails honored: branch-only push, `publish_release=false`, no `release_tag`, no tag, no merge to target branch, no GitHub Release publication.
- Dispatch ref: `codex/mcp-tool-exposure-docker`
- Dispatch commit SHA: `ca0f5ecedff825fc1f098c828d091b0af49c1c74`
- Run ID: `27809155072`
- Run URL: <https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27809155072>

## Current Run Status Snapshot

```json
{"conclusion":"failure","createdAt":"2026-06-19T06:18:14Z","databaseId":27809155072,"event":"workflow_dispatch","headBranch":"codex/mcp-tool-exposure-docker","headSha":"ca0f5ecedff825fc1f098c828d091b0af49c1c74","name":"Desktop Release","status":"completed","updatedAt":"2026-06-19T06:34:01Z","url":"https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27809155072","workflowDatabaseId":238882760}
```

## Job Status Snapshot

- Resolve Release Metadata (`82295367741`): completed/success (started 2026-06-19T06:18:18Z, completed 2026-06-19T06:18:31Z)
- Build Linux ARM64 (`82295399168`): completed/success (started 2026-06-19T06:18:37Z, completed 2026-06-19T06:22:08Z)
- Build Linux x64 (`82295399169`): completed/failure (started 2026-06-19T06:18:33Z, completed 2026-06-19T06:22:06Z)
- Build macOS Intel x64 (`82295399176`): completed/success (started 2026-06-19T06:18:34Z, completed 2026-06-19T06:33:59Z)
- Build Windows x64 (`82295399178`): completed/failure (started 2026-06-19T06:18:34Z, completed 2026-06-19T06:21:38Z)
- Build macOS ARM64 (`82295399182`): completed/success (started 2026-06-19T06:18:34Z, completed 2026-06-19T06:32:07Z)
- Publish GitHub Release (`82297144324`): completed/skipped (started 2026-06-19T06:34:00Z, completed 2026-06-19T06:34:00Z)

## Result

- Delivery validation status: `Blocked`
- Classification: `Local Fix`
- Recommended recipient: `implementation_engineer`
- Reason: the real GitHub workflow surfaced an actionable Linux x64 release-contract mismatch in the changed packaging workflow. A separate Windows build failure appears to be hosted-runner/npm network instability, but it is in the release workflow path and should be evaluated/hardened during implementation rework or rerun after the Linux fix.

## Failed Log Artifact

- Aggregate failed-step log: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27809155072-failed.log`

## Failure 1: Linux x64 AppImage Naming / Metadata Contract

Evidence:

- Job: `Build Linux x64` (`82295399169`)
- Runner image in log: `ubuntu-22.04`
- Build step succeeded and produced:
  - `electron-dist/AutoByteus_personal_linux-x86_64-1.3.60.AppImage`
- Verification step then ran:
  - `APPIMAGE="$(find autobyteus-web/electron-dist -maxdepth 1 -type f -name '*linux-x64*.AppImage' -print -quit)"`
  - `test -n "$APPIMAGE"`
  - `python3 scripts/validate_linux_updater_metadata.py --metadata autobyteus-web/electron-dist/latest-linux.yml --arch-token linux-x64`
- The job failed with exit code 1 before Prisma/server startup checks; the first failing assertion is the empty `APPIMAGE` match because the actual file contains `linux-x86_64`, not `linux-x64`.

Relevant log path:

- `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27809155072-job-82295399169.log`

Relevant log excerpt:

```text
building target=AppImage arch=x64 file=electron-dist/AutoByteus_personal_linux-x86_64-1.3.60.AppImage
Build completed: [ '/home/runner/work/autobyteus-workspace/autobyteus-workspace/autobyteus-web/electron-dist/AutoByteus_personal_linux-x86_64-1.3.60.AppImage' ]
Run APPIMAGE="$(find autobyteus-web/electron-dist -maxdepth 1 -type f -name '*linux-x64*.AppImage' -print -quit)"
test -n "$APPIMAGE"
Process completed with exit code 1.
```

Implementation guidance:

1. Keep the intended release contract as `linux-x64` and `linux-arm64` artifacts/metadata unless solution design changes it. API/E2E LF-002 expected architecture-named Linux AppImages and `latest-linux*.yml` metadata with embedded AppImage `blockMapSize`.
2. Update Linux x64 artifact naming so electron-builder outputs an AppImage and `latest-linux.yml` entries containing `linux-x64`, not electron-builder's AppImage macro expansion `linux-x86_64`.
   - Likely source: `autobyteus-web/build/scripts/build.ts` uses `linux.artifactName: ${artifactBaseName}_linux-${arch}-${version}.${ext}`. For x64 AppImage, electron-builder expands `${arch}` to `x86_64`.
   - Suggested fix: compute a Linux release arch token (`x64` or `arm64`) from `resolveLinuxTargetArch()` and pass a Linux-specific config override with `artifactName: ${artifactBaseName}_linux-${linuxReleaseArchToken}-${version}.${ext}` for both single-platform Linux builds and the `ALL` Linux leg.
   - Re-run `pnpm -C autobyteus-web transpile-build` if generated `build/dist/build.js` is tracked/required.
3. Keep/extend static workflow validation to assert Linux upload/publish paths and validator args remain `linux-x64` and `linux-arm64`, and no standalone Linux `*.AppImage.blockmap` contract is reintroduced.
4. Re-run the Desktop Release workflow dispatch after the fix with `publish_release=false` and no `release_tag`.

## Failure 2: Windows x64 npm Network Failure During Server Preparation

Evidence:

- Job: `Build Windows x64` (`82295399178`)
- Runner image in log: `windows-2022`
- Failure occurred in `Build Electron Windows x64`, inside `autobyteus-web/scripts/prepare-server.mjs` while installing portable runtime dependencies in `.server-packaging-stage`.
- The failing command was `npm.cmd install --no-audit --no-fund`.
- npm reported `ECONNRESET` / `network aborted`.
- This looks like hosted-runner/npm registry network instability rather than a deterministic code failure, but it blocks the real workflow run and may benefit from workflow/script retry hardening.

Relevant log path:

- `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/github-desktop-release-workflow-run-27809155072-job-82295399178.log`

Relevant log excerpt:

```text
Installing portable runtime dependencies...
npm error code ECONNRESET
npm error network aborted
npm error network This is a problem related to network connectivity.
Error: Command failed (1): npm.cmd install --no-audit --no-fund
Command failed (1): ...\node.exe ...\autobyteus-web\scripts\prepare-server.mjs
Process completed with exit code 1.
```

Implementation guidance:

1. Treat this as likely transient/environmental on first occurrence; rerun after Linux fix to see whether Windows passes.
2. Consider hardening `autobyteus-web/scripts/prepare-server.mjs` or the Windows workflow job with npm fetch retry configuration/retry wrapper for `npm install` and maybe `npm prune`, e.g. `npm_config_fetch_retries`, `npm_config_fetch_retry_mintimeout`, `npm_config_fetch_retry_maxtimeout`, or an explicit bounded retry helper around networked npm commands.
3. Do not conflate this with the Linux x64 deterministic naming bug; Linux x64 needs code/workflow contract correction regardless of Windows rerun outcome.

## Positive / Relevant Evidence From Same Run

- `Resolve Release Metadata` succeeded.
- `Build Linux ARM64` succeeded on the real GitHub ARM64 runner path, including:
  - build
  - ARM64 AppImage/updater metadata verification
  - ARM64 Prisma engine verification
  - packaged server startup verification
  - artifact upload
- This confirms the GitHub ARM64 runner is available for this repository/account and the ARM64 Linux path is viable.

## Guardrail Confirmation

- Branch pushed: `codex/mcp-tool-exposure-docker`
- No merge to `personal` or other target branch was performed.
- No release tag was created.
- `publish_release=false` was used.
- No GitHub Release was intentionally published by this validation dispatch.

## Next Step

Route to `implementation_engineer` for Local Fix rework, then through code review and API/E2E as required before delivery resumes.
