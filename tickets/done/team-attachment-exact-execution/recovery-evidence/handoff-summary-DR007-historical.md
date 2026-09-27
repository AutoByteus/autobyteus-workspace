# Recovery Delivery — DR-005 fresh Electron test build

**Incident OPEN; awaiting fresh user verification. Not Delivery Completed.**
Package docker-image-http400-20260926; Medium / High / Reviewed. Current complete
cumulative manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/recovery-handoff.md`, plus current
api-e2e-test-review-report.md/code-review-revision-record.md (CRR-004), docs-sync-report.md,
release-deployment-report.md, delivery-revision-record.md and delivery-evidence/recovery/.

Both software/companion bases refreshed and unchanged. Source22/test7 fingerprints
match reviewed candidate. API-REV-003 Pass95.4%,296 tests and full installed-copy actual
Electron first/repeat startup proof retained; no live installation repair inferred.
Fresh local unsigned macOS arm64 build requested by user is ready; version1.4.87
label is shared with affected release, so exact worktree path/build record/checksum distinguish it.
No publication/installation/automatic live migration authorized. User verification,
both repository target integrations (personal/main) and any later release authorization
remain pending. Worktrees retained. See current delivery report for status/safeguards.

User clarified normal worktree Electron using production data on their own launch,
not an isolated-profile build. Standard artifact names/configuration retained. No
automatic launch, installation or live-data mutation by Delivery.

## Fresh normal Electron artifact — READY
App: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.87.dmg`
Build/checks: Pass; 22packaged recovery modules match, production default launch profile,
DMG integrity and packaged terminal-helper static checks Pass. No Delivery app launch.
Exact timestamps/SHA-256: delivery-evidence/recovery/build-manifest.json.
Quit old app and retain original backup before the user tests normal production data.
Fresh verification pending; old pre-incident acceptance does not satisfy this gate.

## User-authorized normal launch — DR-006 (2026-09-27T05:01:34.224678+00:00)
User explicitly requested “Start this app. Start it.” Opened the exact recovery
worktree AutoByteus.app using macOS `open`, without E2E/profile overrides. Process
331 confirmed running from that bundle. Normal production-data startup is now
user-authorized; no manual history/ledger edits performed. Previous no-launch
statements describe DR-005 only. Process launch is not yet proof of application
readiness or user verification. Incident remains OPEN; no release/finalization.

## DR-007 startup-delay observation
User asked why startup is slow. Read-only diagnosis confirms active attempt3 migration,
90→170committed records,73–91% CPU, then startup-gated current-history rebuild.
See delivery-evidence/recovery/live-startup-investigation.md. No hang or readiness
claim; live health still pending at05:03:08UTC. No source/manual live-data changes.
