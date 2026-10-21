# Release Guide

How a verified change in this repository is finalized, released and rolled out.
Read it before merging a ticket into the target branch, tagging, publishing or
deploying. A generic delivery process covers the order of the steps. This file
holds what is specific to this repository, and for this repository it wins
where the two differ.

For what each release workflow builds, signs and validates, and for the
required secrets, see [Workflow Reference](#workflow-reference) at the end of
this file.

## Finalization Target

- Remote `origin`, branch `personal`. Ticket branches are `codex/<ticket-name>`.
- Merge the ticket branch with `--no-ff`, then push. Before every push to
  `personal`, fetch and check that `origin/personal` has not moved since you
  last integrated it.
- Do not finalize from the main checkout
  (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`). It is usually
  on `personal`, often behind `origin`, and holds other people's uncommitted
  work. Instead, in the ticket worktree:

  ```bash
  git fetch origin personal
  scripts/check_secrets.sh origin/personal..codex/<ticket-name>   # Secret Gate, before the first push
  git checkout -b finalize/<ticket-name> origin/personal
  git merge --no-ff codex/<ticket-name>
  scripts/check_secrets.sh                                        # again on the merged state
  git push origin HEAD:personal
  ```

- Never commit build output: `*/dist/`, `autobyteus-web/electron-dist/` and
  other packaged app files. CI builds every release from source.

## Secret Gate

This repository is public, so a pushed commit is already exposed. That
includes the ticket branch. Before the **first push** of a ticket branch, and
again on the merged state before pushing `personal`, scan the new commits for
API keys, tokens, passwords and private keys:

```bash
scripts/check_secrets.sh origin/personal..HEAD   # the default range; any range works
```

- **How it works:** gitleaks (`brew install gitleaks`) scans only the commits
  in the range, with `.gitleaks.toml`. That config is gitleaks' default rules,
  plus rules for `*_API_KEY` / `*_TOKEN` / `*_SECRET` assignments and
  passwords in URLs, plus allowlists for confirmed false positives. Output is
  redacted (commit, file, line, rule; never the value). Nothing is sent to any
  provider.
- **Exit codes:**
  - `0`: pass.
  - `1`: findings. **Finalization is blocked; push nothing.**
  - `2`: cannot run (gitleaks missing, or a range end that does not
    resolve). Treat it as blocked too.
- **On a finding:**
  - Remove the value from the unpushed commits (amend or rebase the ticket
    branch). A key that never left the machine needs no rotation.
  - A key that was ever pushed must also be revoked or rotated at its
    provider by the user. Removing it from git does not make it safe.
  - Report the commit, file and kind of key, never the value. Never test a
    key against its provider.
- **False positives:** confirm the value by shape and context, then add the
  narrowest entry to `.gitleaks.toml`, with the reason. Shape-based
  allowlists stay scoped to the `generic-api-key` rule.
- **Not covered:** images (screenshots are not OCR-scanned) and commits
  pushed without this guide. Keep keys out of screenshots, and write evidence
  with secret IDs, never values (`TESTING.md`).

## Release Decision

The user decides at verification. There are three options:

- **No release.** Finalize only. The change ships with the next release. This
  is the default when the user does not ask for one.
- **Beta** (`vX.Y.Z-beta.N`). The tag is published as a GitHub pre-release with
  generated notes. It is offered only to desktop installs with
  **Settings > Updates > Receive beta updates** on.
- **Stable** (`vX.Y.Z`). The tag becomes GitHub "Latest", with curated notes
  taken from the ticket's `release-notes.md`.

## Checks Before Tagging

Run these checks on the merged `personal` state. The release workflows run
the first two too, but by then the tag is already pushed.

```bash
python3 scripts/check_licensing.py
python3 scripts/check_repository_artifact_hygiene.py
scripts/check_secrets.sh <previous-release-tag>..HEAD   # Secret Gate over everything the release adds
```

The hygiene check rejects these tracked paths:

- paths longer than 200 characters;
- names Windows cannot check out: `< > : " | ? * \`, a trailing dot or space,
  or device names such as `CON` or `NUL`;
- raw `.xcresult` bundles and downloaded CI artifact zips.

Ticket evidence is the usual source. For example, a log named after a script
such as `web-audit:localization-literals.log` broke the `v1.5.2-beta.1`
Windows build at checkout. Name evidence files with `-` instead of `:`.

## Cutting The Release

The release script refuses to run unless the worktree is clean, including
untracked files, so delete the untracked `*/dist/` folders first. Run it on the
finalize branch with `--no-push`, then push the branch and the tag yourself:

```bash
# Beta: the next unused vX.Y.Z-beta.N after the highest stable tag
bash scripts/desktop-release.sh beta --branch finalize/<ticket-name> --no-push

# Stable: curated notes from the archived ticket
bash scripts/desktop-release.sh release X.Y.Z \
  --release-notes tickets/done/<ticket-name>/release-notes.md \
  --branch finalize/<ticket-name> --no-push

git fetch origin personal   # it must still be the merge you pushed
git push origin HEAD:personal
git push origin vX.Y.Z[-beta.N]
```

- The script bumps `autobyteus-web/package.json` to the tag version, commits
  `chore(release): …` and creates an annotated tag. For a stable release it
  also writes `.github/release-notes/release-notes.md`; the format is in
  `.github/release-notes/template.md`.
- `python3 scripts/release_versions.py next-beta` shows the beta version
  beforehand.
- Beta numbering:
  - By default the base is the next patch after the highest stable tag. After
    `X.Y.99` it moves to the next minor (`1.4.99` → `1.5.0-beta.1`).
  - `--base X.Y.Z` picks the base yourself.
  - `N` is the next unused beta number, up to 98.
- Version limits: the Android versionCode allows major ≤ 209, minor ≤ 999 and
  patch ≤ 99. Both commands refuse any other version before committing or
  tagging. `python3 scripts/release_versions.py android-version-code <version>`
  checks a version.
- Release notes are user-facing and functional. Leave internal IDs, review
  rounds and file paths out.
- Build-only validation, with no GitHub release published:
  `pnpm release:test --ref personal`.

## Watching The Rollout

Pushing a `v*` tag starts four independent workflows:

| Workflow | Publishes |
| --- | --- |
| Desktop Release | macOS ARM64 and x64 (`.dmg`, `.zip`, blockmaps), Linux x64 and ARM64 AppImages, the Windows `.exe`, and the `latest*.yml` updater metadata, on the GitHub release |
| Android APK Release | The signed APK and its `.sha256`, on the same GitHub release |
| iOS App Store Connect Release | A TestFlight upload |
| Server Docker Release | `autobyteus/autobyteus-server:X.Y.Z[-beta.N]`. A stable tag also moves `:latest`; the newest tag, stable or beta, moves `:beta` |

A release is done only when all four have succeeded:

```bash
gh run list --limit 4
gh run watch <run-id> --exit-status
gh release view vX.Y.Z[-beta.N] --json isPrerelease,assets --jq '{pre: .isPrerelease, assets: [.assets[].name]}'
```

Compare the assets with the table above: a complete release has 17. The
workflows publish independently, so a desktop failure still leaves the Android
APK, the TestFlight build and the Docker image published. That is a partial
release. Record it as one.

## Recovery

- **Never move or delete a published tag.** Other workflows have already
  published artifacts from it.
- **The tag's content is at fault** (a checkout-hostile path, a build break): a
  manual re-dispatch checks out the same tag and fails again. Fix the problem
  on `personal` and cut the next version (the next beta, or the next patch for
  a stable release). Leave the partial release in place and say so in the
  delivery report.
- **A transient failure** (runner, network, store): re-run only the failed jobs
  with `gh run rerun <run-id> --failed`, or republish an existing tag with
  `pnpm release:manual-dispatch vX.Y.Z --ref personal`. Do not dispatch manually
  right after a fresh tag push. The push has already started the workflows.

## Rollback

- Revert the merge on `personal` and cut a new release. Desktop updates never
  downgrade. Turning beta updates off waits for the next newer stable.
- `:beta` and `:latest` on Docker Hub only move forward. Docker users pin an
  earlier version tag to go back.
- A release with an app-data migration converts users' existing data, so it
  normally cannot be rolled back. Code moves forward with the data: do not add
  code to make older builds read converted data. The release notes say whether
  rolling back is possible. It is possible only when the older build is checked
  and happens to work with the converted data unchanged, for example when the
  migration only added data the older build ignores. Otherwise fix problems
  forward with a newer release instead of reverting. When a release cannot be
  rolled back, its release notes say so and tell users who need to go back to
  contact support instead of installing an older version. See
  `autobyteus-server-ts/docs/design/data_migration_guideline.md`, section 4,
  "Rolling back after a migration".
- Other changes need no rollback compatibility either. A release may rename or
  drop stored fields without keeping fields, dual writes or old-format writers
  for older builds.

## Deployment

This repository deploys no hosted service. A server rollout is the published
Docker image. Users upgrade with the public launcher
(`autobyteus-docker upgrade --all --tag latest|beta`, see
`autobyteus-server-ts/docker/README.md`) or with the desktop auto-updater.

## Workflow Reference

What the release workflows build, validate and need.

- Workflow files:
  - `.github/workflows/release-desktop.yml`
  - `.github/workflows/release-android.yml`
  - `.github/workflows/release-ios.yml`
  - `.github/workflows/release-server-docker.yml`
- Triggers:
  - push tag `v*` (for example: `v1.1.8`)
  - manual run via `workflow_dispatch`
- Artifacts:
  - macOS ARM64 DMG + blockmap
  - macOS Intel x64 DMG + blockmap
  - Linux x64 AppImage + `latest-linux.yml` metadata with embedded AppImage `blockMapSize`
  - Linux ARM64 AppImage + `latest-linux-arm64.yml` metadata with embedded AppImage `blockMapSize`
  - signed Android APK on the same GitHub Release
  - iOS simulator build/test workflow artifacts, plus signed `.ipa` upload to App Store Connect/TestFlight when iOS publish secrets are configured
  - Docker Hub server image for `linux/amd64,linux/arm64`
- Release notes:
  - Stable GitHub Releases use curated user-facing notes from `.github/release-notes/release-notes.md` when that file exists in the tagged revision.
  - The release helper prepares that file from the ticket `release-notes.md`.
  - Historical tags that predate the curated file fall back to GitHub generated notes during manual republish.
  - Pre-release tags (any tag containing `-`, such as `vX.Y.Z-beta.N`) always use GitHub generated notes in both the desktop and Android jobs.
- Release channels (stable and beta):
  - Any tag containing `-` is published as a GitHub **pre-release**, including a manual dispatch of such a tag. GitHub "Latest" therefore stays on the newest stable release.
  - Desktop installs are offered pre-releases only when **Settings > Updates > Receive beta updates** is on (off by default). Turning it off never downgrades; the install waits for the next newer stable.
  - See `autobyteus-web/docs/github-actions-tag-build.md` (Release Channels) and `autobyteus-web/docs/electron_packaging.md` (Update Channel).
- Version/tag sync is mandatory:
  - `autobyteus-web/package.json` version must match the release tag version (`vX.Y.Z`).
  - The release helper synchronizes that package version before tagging.
  - The desktop and Android release workflows enforce that check and fail on mismatch.
- Desktop Electron runtime baseline validation is mandatory:
  - `autobyteus-web/package.json` pins the reviewed Electron runtime exactly, and the root `pnpm-lock.yaml` is the canonical workspace lockfile.
  - Electron baseline changes must be validated with native-module rebuild evidence, focused Electron tests, and a desktop package smoke build because Chromium, Node.js, native-module ABI, packaging, and updater behavior change together.
- Repository artifact hygiene is mandatory:
  - `scripts/check_repository_artifact_hygiene.py` rejects tracked raw `.xcresult` bundles, generated ticket artifact drops, checkout-risk path lengths, and names Windows cannot check out (`< > : " | ? * \`, trailing dot or space, reserved device names).
  - `.github/workflows/release-desktop.yml` runs this guard in `prepare-release` before platform build jobs fan out, so checkout-hostile evidence cannot break the Windows release job again.
- Licensing consistency is mandatory: `python3 scripts/check_licensing.py` verifies the `LICENSE` texts, the `package.json` license fields and the `LICENSING.md` component list, and rejects stray permissive-license claims in AGPL components (see `LICENSING.md`); the desktop, server Docker, Android and iOS release workflows run it before building.
- Desktop macOS terminal runtime validation is mandatory:
  - `.github/workflows/release-desktop.yml` validates staged and final packaged `node-pty` helpers for both Darwin ARM64 and Intel x64, and validates Linux x64/ARM64 AppImage architecture, Prisma engines, updater metadata, and packaged server startup.
  - Matching-architecture runners also execute a real `node-pty` spawn probe so a non-executable packaged `spawn-helper` cannot silently ship.
- Desktop macOS signing policy validation is mandatory:
  - `.github/workflows/release-desktop.yml` runs `scripts/verify-macos-signing-policy.mjs` for both macOS ARM64 and Intel x64 before artifact upload.
  - The verifier requires Squirrel, ShipIt, frameworks, `.dylib` files, `.node` native modules, and bundled server native binaries to have no entitlement keys while the root app and Electron helper app executables retain role-specific entitlements.
  - If an installed macOS app already has a broken updater helper signature, users may need one manual fixed-DMG install before future auto-updates can apply from the corrected source app.
- Android APK release:
  - public Android publishing uses `.github/workflows/release-android.yml`
  - release tags and publish-enabled manual runs require signing secrets and build `AutoByteus_personal_android-X.Y.Z-release.apk`
  - manual workflow-dispatch build-only runs can upload a private `android-apk` workflow artifact without publishing a GitHub Release
  - debug APKs are allowed only as manual build-only workflow artifacts and must not be uploaded to GitHub Releases
- iOS App Store Connect/TestFlight release:
  - iOS automation uses `.github/workflows/release-ios.yml`
  - release tags and publish-enabled manual runs build/test first, then require complete iOS/App Store Connect secrets before signed archive/export/upload
  - manual workflow-dispatch build-only runs use `publish_app_store_connect=false` and upload private simulator build/test artifacts without requiring Apple distribution secrets
  - simulator build/test and App Store archive/upload jobs select Xcode 26 or newer through `IOS_XCODE_APP_PATH` (default `/Applications/Xcode_26.3.app`) and log the selected Xcode plus iPhoneOS SDK before invoking `xcodebuild`
  - publish requests with missing iOS secrets fail fast with exact missing `IOS_*` / `APP_STORE_CONNECT_*` names before keychain/profile/archive/upload
  - prerelease tags split metadata for App Store compatibility: `v1.2.7-rc1` builds with `MARKETING_VERSION=1.2.7`, uses numeric GitHub run number for `CURRENT_PROJECT_VERSION`, and keeps `1.2.7-rc1` only in artifact names/summaries
  - `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` drive generated Xcode target bundle IDs, simulator build/test/smoke, profile verification, archive/export mapping, and summaries
  - the workflow uploads to App Store Connect/TestFlight only; final public App Store review, listing, privacy, and release approval remain external
- Server Docker tags:
  - stable release tags publish `autobyteus/autobyteus-server:X.Y.Z` and `autobyteus/autobyteus-server:latest`
  - prerelease tags such as `v1.2.7-beta.1` publish `autobyteus/autobyteus-server:1.2.7-beta.1` and never move `:latest`
  - `autobyteus/autobyteus-server:beta` (default variant only) moves forward only: after the version image is pushed, it points at that image when the tag is the newest recognized release tag, stable or beta (`scripts/release_versions.py is-newest`); re-publishing an older tag leaves it unchanged
  - public launcher users follow the beta track with `autobyteus-docker upgrade --all --tag beta` and return with `--tag latest` only once a stable release at least as new as their beta exists (see `autobyteus-server-ts/docker/README.md`)
- Required GitHub repository secrets for Android APK publish:
  - `ANDROID_KEYSTORE_B64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- Required GitHub repository secrets for iOS App Store Connect/TestFlight publish:
  - `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`
  - `IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD`
  - `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64`
  - `IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64`
  - `IOS_DEVELOPMENT_TEAM`
  - `APP_STORE_CONNECT_KEY_ID`
  - `APP_STORE_CONNECT_ISSUER_ID`
  - `APP_STORE_CONNECT_API_KEY_P8_BASE64`
- Required GitHub repository secrets for Docker Hub publish:
  - `DOCKERHUB_USERNAME`
  - `DOCKERHUB_TOKEN`
- Optional GitHub repository variable:
  - `DOCKERHUB_IMAGE_NAME`
  - use this if the image repo should not be `autobyteus/autobyteus-server`
- Optional GitHub repository variables for iOS publish defaults:
  - `IOS_BUNDLE_ID`
  - `IOS_SHARE_EXTENSION_BUNDLE_ID`
  - `IOS_APP_SCHEME`
  - `IOS_ARTIFACT_PREFIX`
  - `IOS_XCODE_APP_PATH`
- No git submodules are required in this workspace.

### AutoByteus NFS assets

AutoByteus NFS source, installer and distribution are maintained in the independent
[AutoByteus NFS repository](https://github.com/AutoByteus/autobyteus-nfs).
Its NFS-owned tags/workflow are separate from desktop version/tag publication;
see its [release policy](https://github.com/AutoByteus/autobyteus-nfs/blob/main/packaging/RELEASE.md).
The application uses ordinary filesystem paths and APIs. It contains no NFS
launcher/descriptor protocol, paired service fixture pin, mount/UUID admission or
automatic Git trust injection. Operators provision storage and configure generic
directory mappings outside the application; an existing directory is not proof
that its mount is present.

The frontend [NFS Guide](autobyteus-web/docs/nfs_guide.md) is copy-only documentation
for the standalone tool and ordinary filesystem paths, not application NFS
management. Its static v0.1.0 descriptor supplies published Mac/Linux installer
commands, a pinned installer checksum and the public installed-tool reference.
The install commands end with `version` and do not configure storage. Invalid or
unavailable descriptor data still disables the affected installer surface.

Distribution availability is not filesystem/host qualification. Physical-host,
shared-filesystem, independent-client and user testing remains deferred under the
independent service's postpublication plan; it is not an application release gate.
NFS signing, publication and future release approval remain independently owned.
Desktop publication does not publish NFS artifacts or couple release versions.
