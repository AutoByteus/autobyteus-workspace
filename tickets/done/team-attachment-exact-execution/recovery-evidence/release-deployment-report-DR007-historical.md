# Delivery / Release / Deployment Report — DR-005 (normal test build ready)

**Recovery incident OPEN. Not Delivery Completed.** Package docker-image-http400-20260926;
Medium / High / Reviewed; R2/D2 / SR-005 / ARCH-REV-002 / IR-002 / CRR-003/004 /
API-REV-003. DR-004 is historical; preserved in recovery-evidence/.

## Scope/authorization
Fresh normal local Electron build for user testing only, per subsequent direct user clarification. Direct user message verified in
API thread01a0def0-27cd-7b23-bc09-6749275134d9, message01a0e131-0f7e-74d0-b2cb-902f2ed7c062:
“ask delivery engineer to build the new Electron, so I can test myself.” No release,
installed-data mutation, acceptance or incident closure inferred.

## Integrated base
Both remote refreshes completed before Delivery edits. Software HEAD/origin/personal
=a35060c58d923311de496e75aa3ea0209708d8b3; companion HEAD/origin/main
=1b1a75ee57271745424030e9289a699523ff34a6, both0/0 divergence. Already current;
no checkpoint/integration/rerun needed. Source fingerprint22 and API test fingerprint7
checks pass. Both branches remain uncommitted; ticket done→in-progress move preserved.

## Current evidence
API-REV-003 candidate Pass95.4%:296 tests (186server,9process,68frontend,33Electron),
actual packaged candidate first/repeat startup on unfiltered installed-data copy;
all8missing-tree roots retained,363changed traces/763locator values,1,204blob hashes
preserved. Live14,404hashes unchanged and FAILED attempt2 ledger unchanged. API owns
that evidence, not a new Delivery execution. CRR-004 proportional test review Pass;
CRR-003 source unchanged. Previous API-REV-002 incident remains history; installed/user
resolution is outstanding. No loading redesign or defect waiver.

## Fresh build
Standard local build: `pnpm -C autobyteus-web build:electron:mac`; explicit personal
flavor, signing credential variables empty and CSC identity discovery false. Build
implementation uses publish:never. Version remains1.4.87, unsigned/local only; normal artifact
keeps the repository filename; DR005 build manifest, path, timestamp and SHA-256 identify it. Log:
delivery-evidence/recovery/fresh-electron-build.log. Build result **Pass**, completed 2026-09-27.
User clarification in this Delivery chat: build the **normal Electron from the worktree**
so it uses production data when the user launches it. No isolated-profile wrapper or
special packaged configuration. Normal default production profile verified in source;
production server data is /Users/normy/.autobyteus/server-data. Delivery will not launch
it or automatically mutate that data. Fresh packaging/embedded-byte checks, plus upstream
API packaged execution evidence, support this user test; no extra isolated smoke is claimed.

## Documentation
Docs-sync-report.md Pass, canonical recovery guide updated without changing intended
behavior. Cumulative chain via recovery-handoff.md and current CRR-004 report/record.
Product visual supplements N/A — not applicable.

## Verification/finalization/release gates
User verification for recovery: Pending. Repository finalization: Pending, blocked on
verification and later authorization. Software target personal AND companion target
main both required; neither merged/pushed. Ticket remains in-progress. Version bump,
tag/publication/CI release, installed deployment: Not authorized/not performed.
Worktree cleanup: Not required yet; both needed for ongoing recovery. Generated build
outputs excluded from authored work. Shared main-checkout incident edits untouched.

## Data safeguards and next action
User test against existing data requires stopping old writers and preserving a
consistent backup first. Do not delete roots/reset ledger/restore originals over
newer writes. Independent admitted package availability, not universal migration
success, governs startup. Provide test artifact/identity, then request explicit
user verification. First actual-copy startup was195140ms and repeat36491ms in API
validation; these are observations, not timing guarantees.

## Handoff
Normal user-verification hold, no code/design reroute finding. AgentTeam rule/message
tools unavailable after inventory search; no successful lookup or terminal handoff
claimed. No Delivery Completed message while acceptance/finalization gates remain.

## Completed fresh build and artifact checks
Normal packaged app: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`.
DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.87.dmg`.
ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.87.zip`.
Version1.4.87, macOS arm64, unsigned/not notarized. Build exit0. Both packaged
artifact timestamps are newer than this Delivery build start. DMG SHA-256:
`2a9f0b831d28730642ea22faaceccb2bf967350e8851163917164bd0113d1cd0`.
Fresh server build modules22/22 match packaged modules and reviewed source fingerprints;
seven reviewed API test fingerprints match. Packaged launch-profile module matches
fresh compiled worktree module, production default. DMG hdiutil verify Pass; terminal
helper architecture/permissions check Pass (static, no spawn). Initial verifier
invocation used invalid --app option and exited before checking; corrected supported
--server-root/--platform/--arch invocation passed. Both logs retained truthfully.
No fresh app startup test by Delivery: user requested personal production-data test,
and prior packaged actual-copy execution remains API-REV-003 evidence. No silent
re-use of API build: normal build reran and these new artifacts are fingerprinted.

## Current result and user test
Build-ready / **Blocked — awaiting explicit user verification**, incident OPEN.
User should quit the old application, keep a consistent original backup, then launch
the app above normally. It uses `/Users/normy/.autobyteus/server-data`; no isolated
profile is supplied. Normal startup can run migration against that data. No app
launch, manual data edits, public release, version/tag update or repo finalization by
Delivery in this round. Ask whether startup, usable history/new work and repeat
startup now work. Both worktrees remain required and uncommitted.

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
