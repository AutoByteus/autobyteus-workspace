# Handoff Summary — arm64-appimage-libz (autobyteus-28)

## What Changed

The Linux arm64 AppImage now starts on a stock desktop. Every published arm64 AppImage (v1.3.61 through v1.5.14-beta.6, 297 assets) has a runtime that declares `NEEDED libz.so`, a name that only `zlib1g-dev` provides. On a stock system it fails in the loader with exit 127. With this ticket:

- The arm64 AppImage uses the official static AppImage type2 runtime (electron-builder toolset `appimage@1.0.3`, release 20251108). It has no shared-library dependency and needs FUSE 3, not `libfuse2`. electron-builder stays at 25.1.8. The build prepares electron-builder 25's toolset folder with the static `runtime-arm64`, sha256-pinned, and asserts that the produced AppImage starts with it (`autobyteus-web/build/scripts/arm64AppImageRuntime.ts`, `linuxAppImageBuild.ts`).
- The Desktop Release workflow runs each Linux AppImage (x64 and arm64) in a stock `ubuntu:24.04` container of its own architecture, after first asserting that `libz.so` is absent. A runtime that needs `libz.so` fails the job (`scripts/desktop-package/verify-clean-image-runtime.mjs`, plus a new step in `.github/workflows/release-desktop.yml`).
- The x64 runtime is unchanged and byte-identical to the legacy `runtime-x64`. All other release outputs keep their names and updater-metadata shapes.
- New durable tests: `verify-clean-image-runtime.test.mjs`, `linuxAppImageBuild.spec.ts`, and `scripts/tests/test_desktop_release_clean_image_step.py`.

## Classification And Route

- `task_size` `Medium`, `architectural_risk` `High`. Route: `Reviewed`.
- Chain: SR-001 → SR-002 (after IR-001) → SR-003 (DEC-006), then ARCH-REV-002 Pass → IR-002 → CRR-001 Pass (9.5/10) → API-REV-001 Pass (95%) → CRR-002 Pass → delivery DR-001.

## Integration

- Bootstrap base: `origin/personal` `9f6add773b`. The latest base checked was `origin/personal` `81f6aa8be4`, which advanced by the chrome-vnc 1.4.2 Docker pins (autobyteus-598). Those commits touch only `autobyteus-server-ts/docker/` and that ticket's folder, with no overlap with this ticket.
- Checkpoint commit `dea66fe614` committed the architecture review report and its revision record, which were untracked. Then `git merge origin/personal` produced `fa87a5d289` with no conflicts.
- Rerun on the merged state, following TESTING.md "Rerun by impact": every API/E2E case stays valid, because none of them exercises the merged files. Ticket units: verifier `# pass 3`, workflow tests `Ran 17 … OK`, and `linuxAppImageBuild.spec.ts` `7 passed`. The web and server typechecks also ran (`evidence/delivery/DEL-01..03`).

## Verification

Verified from the evidence. The judgement and the files read are in `release-deployment-report.md` § Verification. No user check was needed.

## Accepted Unverified Risks

- DEC-005: the FUSE 3 mount start on a real arm64 desktop is untested. There is no `/dev/fuse` here; extract-and-run start was proven instead.
- DEC-006: `--appimage-extract-and-run` leaves `$TMPDIR/appimage_extracted_*` (1.2 GB) behind with the arm64 AppImage. This is documented in `electron_packaging.md`, and FU-004 tracks the upstream fix.

## Residual Risks

- RSK-003: the build depends on app-builder 25's toolset folder layout. The build assertion and the clean-image gate guard it.
- R-3: toolset `1.0.3` is labelled beta (the sha256 pin applies).
- R-5: on local cache reuse, only `runtime-arm64` is re-verified.
- R-6: other app-builder downloads land in the prepared cache during the arm64 build.
- No same-commit x64 electron-builder 25 baseline exists. The x64 packaging tree equals the published beta.6 tree.

## Docs

- Updated `autobyteus-web/docs/electron_packaging.md` (DEC-006 note) and `RELEASE.md` (the new test in the Linux validation list). Implementation had already updated `electron_packaging.md`, `github-actions-tag-build.md` and `RELEASE.md`, and the Solution Designer had added `docs/design-cases.md` case 27. Details are in `docs-sync-report.md`.

## Release

- No release. The user did not ask for one, the release guide's default is "No release", and the requirements doc says a new beta is the user's decision. The change ships with the next release. `release-notes.md` is ready for that release.

## Follow-ups (sent by the Solution Designer when the ticket leaves the team)

- FU-001 x64 static runtime (support-matrix decision); FU-002 split `build.ts`; FU-003 electron-builder 26/27 upgrade; FU-004 upstream extract-and-run cleanup; FU-005 TESTING.md Desktop Release workflow-steps row.
