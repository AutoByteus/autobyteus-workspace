# Delivery / Release / Deployment Report

## Scope And Final Result

- Ticket: `custom-provider-model-context-metadata`.
- Current delivery revision: DR-012.
- User acceptance: received on 2026-08-10; the user reported the task done and requested finalization plus a new version.
- Repository finalization: Pass.
- Stable release: Pass — `v1.4.47` published.
- Rollout verification: Pass — all five tag-push workflows completed successfully.
- Post-finalization cleanup: safely deferred because the user-owned DR-010 Electron package is still running from the ticket worktree.

## Finalization Refresh And Verification

- Recorded target: `personal`, tracked as `origin/personal`.
- Finalization fetch retained `origin/personal@37660dd61347b630889a698769af5641566357bb` (`v1.4.46`).
- Accepted state divergence before final delivery edits: ahead 18 / behind 0; exact base remained the merge base and an ancestor.
- Material user-facing change after acceptance: none; renewed user verification was not required.
- Focused finalization rerun: Pass, 4 files / 12 tests for friendly Qwen labels, exact selectors, and shared launch/binding presentation.
- Repository artifact hygiene and staged whitespace checks: Pass.

## Repository Finalization

- Ticket archived to `tickets/done/custom-provider-model-context-metadata` before the final ticket commit.
- Final ticket commit: `6cbfc9fbc1c492eac86c2f2bf53470f2a0e49a21`.
- Ticket branch push: Pass; exact commit published to `origin/codex/custom-provider-model-context-metadata` before the target merge.
- `personal` target refresh: Pass; it was clean and equal to `origin/personal@37660dd61347b630889a698769af5641566357bb`.
- Target merge: `156f6a0e285fd981318a4c0b787a495e8546c6ce`, with parents exact base and exact final ticket commit.
- Post-merge focused rerun: Pass, 4 files / 12 tests.
- Target push: Pass. Later independent delivery-record advancement on `personal` is a descendant of the immutable release commit and does not alter this ticket's release.

## Stable v1.4.47 Release

- Documented method executed exactly once from clean `personal`:
  `pnpm release 1.4.47 --release-notes tickets/done/custom-provider-model-context-metadata/release-notes.md`.
- Release commit: `e373cfb6d3f42240ce85504165f487fccf0bc6b8`.
- Annotated tag object: `eecd7168410ef3d4ad2ed28406ee95566813a87f`, peeled to the release commit locally and remotely.
- Package versions: desktop `1.4.47`; messaging gateway `1.4.47`.
- Managed messaging manifest: `releaseTag=v1.4.47`, `artifactVersion=1.4.47`, server compatibility `0.1.1`.
- GitHub Release: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.47
- Release state: stable, non-draft, non-prerelease, 21 assets.
- Curated notes: ticket-local `release-notes.md`, synchronized into the tagged `.github/release-notes/release-notes.md`.
- No tag rewrite and no immediate/manual duplicate desktop dispatch occurred.

## Rollout Verification

All workflows were triggered by the exact `v1.4.47` tag commit and completed successfully:

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | `31392099917` | Pass — Windows x64, macOS ARM64/x64, Linux x64/ARM64, updater metadata, signing/notarization policy checks, and GitHub Release publication. |
| Server Docker Release | `31392099931` | Pass — default multi-arch server image published. |
| Android APK Release | `31392101378` | Pass — APK and checksum published to the GitHub Release. |
| Release Messaging Gateway | `31392101421` | Pass — archive, checksum, metadata, and manifest published. |
| iOS App Store Connect Release | `31392101713` | Pass — build/test, signed IPA archive/export, and App Store Connect/TestFlight upload for `1.4.47 (109)`. |

The iOS result does not claim App Store review approval or public App Store availability.

## Published Outputs

Selected release asset digests:

- macOS ARM64 DMG: `sha256:6ed7c67025324edba230fffb73adfb022b72f45b40bc5e4915c8a6a530183415`.
- macOS x64 DMG: `sha256:22b930a1ee65a1be10533a7fc1cfa5361ae1d1f491e8aea117ffd992e61238d5`.
- Windows x64 EXE: `sha256:c3b5e54fc5a0334c78f13b10545fd32bd6a3b05370ae63cdc4fb58831e45bc2f`.
- Linux x64 AppImage: `sha256:fe25d01a19803695d8372b4ee807649cc2dc2556843b054310135a2eadb0cecd`.
- Linux ARM64 AppImage: `sha256:fe9ecd2ef78ad79924eef6c2845633ddcc734e54cca18ce06c048f0935e5dd44`.
- Android APK: `sha256:fd1b5aa7f62402892e820a3994b5f5f4dd0594e297ea8dff749ce87f3a41a81a`.
- Messaging-gateway archive: `sha256:cb4a4e19e496c0092133742887eb013492214e9ebc3fd75b6964b9c3ebd7b762`.

Docker Hub `autobyteus/autobyteus-server:1.4.47` and `:latest` resolve to the same multi-arch digest `sha256:3ca9e5034bd7ff9ed17cd460c536b10316cf96fce3b9b3010221431a6fa2dee7`, with Linux AMD64 and ARM64 manifests.

Evidence:

- `probes/delivery/release-v1.4.47-verification.log`;
- `probes/delivery/release-v1.4.47-workflows.json`;
- `probes/delivery/release-v1.4.47-assets.json`.

## Docs Sync

- Result: Updated / Pass.
- Durable docs cover native Qwen endpoint/key configuration, exact catalog and routing metadata, friendly collision-safe presentation, readable custom-provider identities, intentional legacy reset/recreate behavior, and unavailable-selector repair.
- Curated release notes truthfully expose the upgrade and migration boundary.
- No later release-only source change invalidated those docs.

## Post-Finalization Cleanup

- Ancestry prerequisite: Pass; the ticket branch is contained by `origin/personal`.
- Cleanup audit: active DR-010 AutoByteus Electron processes and open packaged files remain under the ticket worktree.
- Safety decision: do not terminate the user's running app and do not remove its executable files.
- Retained temporarily: dedicated ticket worktree plus local and remote ticket branches.
- Cleanup evidence: `probes/delivery/post-finalization-cleanup.log`.
- Required next action: close the DR-010 app, then rerun the zero-reference audit and remove the now-ancestral task-owned worktree and branches.

## Rollback

The stable tag is immutable and must not be rewritten. If a release defect is later found, prepare a reviewed forward patch and new patch version. The prior `v1.4.46` release remains independently addressable.

## Bounded Residual Risk

- Real Alibaba availability, credentials, quota, region policy, TLS behavior, undocumented payload variation, and future vendor drift were not exercised.
- The ordinary recent-`RUNNING` delay, arbitrary interruption, approved unreachable old-secret orphan and stale-selector outcomes, POSIX-only permission semantics, and package-wide typecheck limitations remain bounded and documented.
- iOS upload success does not equal App Store review approval.
- Node 20 deprecation annotations from GitHub Actions were non-blocking; all workflows passed under the runner's Node 24 compatibility posture.

## Final Status

Pass — the user-accepted implementation is archived, merged, pushed, released as stable `v1.4.47`, and rollout-verified across desktop, Docker, Android, messaging gateway, and iOS. Only destructive cleanup of the still-running local DR-010 package is deferred for safety.
