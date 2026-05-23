# Handoff Summary

## Ticket

- Ticket: `node-phone-setup-tab-revoked-cleanup`
- Archived ticket path: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Branch: `codex/node-phone-setup-tab-revoked-cleanup`
- Finalization target from bootstrap context: `origin/personal` (`fcf435ec1894de13fad54002cd70e62d59dd12b8`)

## Delivery Integration State

- Delivery fetch command: `git fetch origin personal`
- Latest tracked remote base checked: `origin/personal` at `fcf435ec1894de13fad54002cd70e62d59dd12b8` on 2026-05-22 after the latest API/E2E round-4 message and again before this rebuild handoff refresh.
- Ticket branch HEAD before/after fetch: `fcf435ec1894de13fad54002cd70e62d59dd12b8`
- Base advanced since reviewed/validated candidate: No (`git rev-list --left-right --count HEAD...origin/personal` returned `0 0`).
- Integration method: Already current; no merge/rebase was needed.
- Local checkpoint commit: Not needed because no base integration was performed and the reviewed candidate state was not at risk from a merge/rebase.
- Post-integration rerun: No new base commits were integrated, so no post-merge executable rerun was required.
- Delivery sanity check: `git diff --check` is run after this round-6 docs/handoff refresh and rebuild evidence update; see delivery report for result.

## Latest Authoritative Review / Validation

- Latest code review: round 6, pass, no blockers.
- Latest API/E2E validation: round 4, pass, no product failures and no blockers.
- No repository-resident durable validation was added or updated during API/E2E round 4, so no additional code-review pass is required before delivery.
- Existing durable Fastify REST E2E test remains present and passed the latest targeted rerun:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`

## Cumulative Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/design-review-report.md`
- Implementation handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/implementation-handoff.md`
- Latest code review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/review-report.md`
- Latest API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/api-e2e-validation-report.md`
- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/docs-sync-report.md`
- Delivery / release / deployment report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/delivery-release-deployment-report.md`

## What Is Ready For User Verification

- Backend active/revoked Phone Access API split:
  - active list excludes revoked devices;
  - local revoked/history route is separate;
  - revoked credentials still fail.
- Phone Access pairing URL hardening:
  - new desktop QR creation requires HTTPS;
  - `serverBaseUrl`, `mobileUrl`, QR text, and stored pairing/device surfaces normalize to the canonical server base;
  - QR/mobile URL appends `/mobile` for the user-facing shell.
- Settings -> Nodes UI separation:
  - Manage Nodes;
  - Phone Setup;
  - Docker Guide.
- Round-6 Phone Setup guide/content:
  - macOS install link only;
  - direct `/Applications/Tailscale.app/Contents/MacOS/Tailscale` Serve/status/reset command cards only;
  - no generic `tailscale ...` UI command cards;
  - no `/usr/local/bin/tailscale` wrapper guidance;
  - no `InstallTailscaleCLI.scpt` guidance;
  - copy buttons for all four direct macOS commands;
  - full MagicDNS hostname/FQDN guidance for HTTPS `/mobile` URLs;
  - IPv4/IPv6 and `:29695` HTTP interface addresses described as diagnostics, not preferred HTTPS Serve QR URLs.
- Round-6 Phone Access QR flow:
  - manual Tailscale Serve HTTPS URL field is primary;
  - entering `https://machine.tailnet.ts.net/mobile` creates a pairing POST with normalized `serverBaseUrl: https://machine.tailnet.ts.net`;
  - QR text uses `/mobile`;
  - HTTP-only candidates are not auto-selected, show HTTPS-required feedback when selected, keep Create QR disabled, and do not POST.
- Active/History UI split:
  - Active Paired Phones are actionable;
  - Revoked/History records are visible separately and non-actionable.

## Long-Lived Docs Synced

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/remote_access.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/settings.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/features/remote_access.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/docs/android_mobile_access.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-android/README.md`

Docs sync report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/docs-sync-report.md`

## Verification Evidence Already Collected Upstream

Round-6 / API-E2E round-4 evidence:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-browser-guide-and-phone-access-validation-summary.json`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-browser-guide-direct-commands.png`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-browser-phone-access-manual-url.png`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-browser-phone-access-manual-qr.png`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-browser-http-candidate-warning.png`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-mock-backend-observed.json`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-no-tailscale-detector-static-audit.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-web-targeted-nuxt-tests.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-server-remote-access-targeted-tests.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-web-guards-server-noemit-and-diff.log`

Earlier evidence remains relevant for original non-round-6 scenarios and is preserved under `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence`.

## Current Local Electron Build For User Testing

The macOS Electron app was rebuilt again after reading the Electron README instructions (`autobyteus-web/README.md` documents `pnpm build:electron:mac` and `electron-dist` output).

Command run from the ticket worktree:

```bash
pnpm -C autobyteus-web build:electron:mac
```

Build result: Passed.

Primary local test artifacts:

- DMG: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.26.dmg` (379,642,102 bytes)
- ZIP: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.26.zip` (377,081,677 bytes)
- App bundle: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG blockmap: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.26.dmg.blockmap` (394,055 bytes)
- ZIP blockmap: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.26.zip.blockmap` (387,490 bytes)
- Build log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-electron-rebuild-mac-20260522-193742.log`
- SHA-256 hashes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/evidence/round6-electron-rebuild-mac-20260522-193742-shasums.txt`

SHA-256 values:

```text
4c5ac47bafd4d3e7c4462111d9c76c79eed9ebe02d9aa67be0edaed8f628cd2c  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.26.dmg
ec50944cb9eddd271319cce7e5ac515f0c7cb9254852cc66ae6826b47fb3dc13  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.26.zip
840ae7a0292cec0455098478b28e2ff665a12c8ab75581ef4de59a8a8bdd72b4  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.26.dmg.blockmap
fb0c982ebb5b26092abef6ce3bc07d444e20e6c982d3359794ee080d33ec4e05  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.26.zip.blockmap
```

Build note: `APPLE_SIGNING_IDENTITY` was not set, so the local macOS build is unsigned and intended for local verification only, not distribution.

## Residual Notes / User Verification Focus

- Physical Android camera QR scan over Tailscale Serve HTTPS was intentionally not run. Latest round-6 validation focus was guide/manual URL behavior and backend URL guarantees.
- API/E2E round 4 did not execute Tailscale Serve/status/reset commands, inspect local Tailscale state, run `status --json`, or mutate Tailscale Serve configuration because the latest product boundary is manual/user-controlled Tailscale setup.
- Ignored local artifacts currently visible in the worktree are dependency/build/validation byproducts, including `node_modules/`, `autobyteus-web/electron-dist/`, `autobyteus-web/resources/`, `autobyteus-web/dist*`, `autobyteus-web/.nuxt/`, `autobyteus-server-ts/dist/`, and `autobyteus-ts/dist/`.

Suggested user verification:

1. Launch the current rebuilt app bundle or DMG.
2. Open Settings -> Nodes and confirm tabs are Manage Nodes, Phone Setup, and Docker Guide.
3. Confirm Manage Nodes no longer contains Phone Access controls.
4. Open Phone Setup and confirm the guide shows only the direct macOS command cards plus install link; confirm no generic `tailscale ...`, wrapper, or `InstallTailscaleCLI.scpt` guidance appears.
5. Confirm copy buttons work for the four direct macOS commands.
6. In Phone Access, paste `https://machine.tailnet.ts.net/mobile`; confirm QR creation works and QR text uses `/mobile`.
7. Select an HTTP diagnostic candidate; confirm HTTPS-required feedback appears and Create QR remains disabled.
8. With active + revoked paired-device data, confirm Active shows only active phones and Revoked/History shows retained revoked rows without revoke actions.

## User Verification Received

- Verification received from user on 2026-05-22: "i have tested it. It works. the tailscale. now finalize the ticket, and release a new version".
- Ticket archival completed: `tickets/done/node-phone-setup-tab-revoked-cleanup/`.

## Finalization And Release Completed

- Ticket branch commit: `37ddd9a900159351184b4cfc65aeb791854bd112` (`feat(remote-access): harden phone setup pairing flow`).
- Ticket branch push: completed to `origin/codex/node-phone-setup-tab-revoked-cleanup`.
- Finalization target: `origin/personal`.
- Target merge: fast-forwarded `personal` to `37ddd9a900159351184b4cfc65aeb791854bd112` and pushed.
- Release helper command: `pnpm release 1.3.27 -- --release-notes tickets/done/node-phone-setup-tab-revoked-cleanup/release-notes.md`.
- Release commit: `8b8dda587e1f00e318aab60eec3c3c237bdde1e0` (`chore(release): bump workspace release version to 1.3.27`).
- Release tag: `v1.3.27` targeting `8b8dda587e1f00e318aab60eec3c3c237bdde1e0`.
- GitHub Release: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.3.27
- Release workflows completed successfully:
  - Desktop Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/26309397148
  - Android APK Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/26309397155
  - Release Messaging Gateway: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/26309397150
  - Server Docker Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/26309397147
- Cleanup completed: dedicated ticket worktree removed, local ticket branch deleted, remote ticket branch deleted, and worktrees pruned.

## Final Artifact Paths

- Handoff summary: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/handoff-summary.md`
- Delivery / release / deployment report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/delivery-release-deployment-report.md`
- Release notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/release-notes.md`
