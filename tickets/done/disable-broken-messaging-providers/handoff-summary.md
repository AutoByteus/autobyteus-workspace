# Handoff Summary: Disable Broken Messaging Providers

## Final User-Verified State

- Ticket: `disable-broken-messaging-providers`
- Branch: `codex/disable-broken-messaging-providers`
- Finalization target: `origin/personal` / `personal`
- Latest integrated base at verification/finalization: `c2317fa830af` (`v1.3.47`)
- Ticket implementation head before final delivery commit: `40fd4c149c69`
- User verification: received on 2026-06-06 after rebuilding the macOS Electron artifact from the rebased branch.

## What Changed

- Managed messaging status/metadata now excludes WhatsApp Business and WeCom App in the current distribution, alongside WeChat.
- Frontend capability derivation uses active providers (`supportedProviders - excludedProviders`) for normal provider cards.
- Settings -> Messaging remains visible.
- Discord Bot and Telegram Bot remain visible, selectable, and configurable.
- WhatsApp Business and WeCom App are absent from the normal setup provider cards.
- Gateway-level `Disable` remains whole-runtime lifecycle control, not provider-level disablement.
- Long-lived docs and release metadata were updated to match the default provider set.

## Integration / Verification

- Initial delivery refresh integrated newer `origin/personal`; after the user reported a newer `origin/personal`, the ticket branch was rebased onto `c2317fa830af` (`v1.3.47`).
- Final post-rebase local macOS Electron build passed.
- User manually verified the post-rebase build and requested finalization without a new release.

## Key Validation Evidence

- API/E2E validation report: `tickets/done/disable-broken-messaging-providers/api-e2e-validation-report.md`
- Browser UI evidence: `tickets/done/disable-broken-messaging-providers/validation-artifacts/browser-ui-evidence.json`
- Browser GraphQL stub log: `tickets/done/disable-broken-messaging-providers/validation-artifacts/browser-stub-graphql.log`
- Post-rebase Electron build log: `tickets/done/disable-broken-messaging-providers/validation-logs/delivery-electron-macos-build-post-rebase.log`
- Finalization checks: `tickets/done/disable-broken-messaging-providers/validation-logs/delivery-finalization-checks.log`

## User-Tested Local Build

- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/disable-broken-messaging-providers/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.47.dmg`
- SHA256: `1d13717d9f6b2f8f348949590344a50e854bde614d5449270eb957cb32799b39`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/disable-broken-messaging-providers/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.47.zip`
- SHA256: `34c14cc061ebe5b71e3884db2920ff85aaca0de7110d2d6c360a4d028a3d7760`
- Note: local build was unsigned/not notarized and used only for user verification.

## Checks Recorded

- API/E2E stage passed backend GraphQL e2e, frontend targeted tests, backend compile/unit checks, release manifest check, `git diff --check`, and browser UI probe.
- Delivery post-rebase Electron build passed with version `1.3.47`.
- Final delivery checks passed:
  - `git diff --check`
  - `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --check-release-manifest --release-tag v1.3.47`

## Release / Deployment

- New release requested: `No`
- Release/deployment action taken: `None`
- Reason: User explicitly verified the local build and requested finalization with no new version release.

## Finalization Status

- Ticket archived to: `tickets/done/disable-broken-messaging-providers/`
- Ticket branch commit: `36f0a4d80c3f` (`chore(ticket): finalize disable broken messaging providers`)
- Target branch merge/push: `Completed` — merge commit `0419726affcd` pushed to `origin/personal`.
