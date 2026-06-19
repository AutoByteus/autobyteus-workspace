# Latest-Base Electron Rebuild Evidence — Round 3

Date: 2026-06-18

## Trigger

User requested rebasing/integrating the ticket branch onto the latest `origin/personal` and rebuilding Electron for testing.

## Integration State

- Latest tracked remote base after fetch: `origin/personal` at `39449cfb`
- New base commits integrated:
  - `c2baa8ff feat(web): promote nodes to home navigation`
  - `39449cfb docs(ticket): record home nodes menu finalization`
- Integration method: merge `origin/personal` into `codex/codex-provider-compaction-boundary-capture`
- Merge commit: `cdd018b0`
- Merge result: completed without conflicts
- Merge-base after integration: `39449cfb`
- Branch push: not run
- Finalization merge/push: not run

## Verification And Build

- `git diff --check` — passed after merge.
- `cd autobyteus-web && NO_TIMESTAMP=1 APPLE_TEAM_ID= CSC_IDENTITY_AUTO_DISCOVERY=false DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac` — passed.

## Local Test Artifacts

- App bundle: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.59.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.59.zip`

## Notes

- Build flavor/version: `enterprise` / `1.3.59`.
- Code signing: local ad-hoc/no-notarization build (`APPLE_TEAM_ID` empty, `CSC_IDENTITY_AUTO_DISCOVERY=false`).
- Generated Electron artifacts remain ignored by git.
- Repository finalization remains held pending explicit user verification.
