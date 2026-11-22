# Docs Sync Report — arm64-appimage-libz (autobyteus-28)

## Scope

- Ticket: `arm64-appimage-libz`, Project Task `autobyteus-28` (URGENT). `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed` (ARCH-REV-002 → IR-002 → CRR-001 → API-REV-001 Pass 95% → CRR-002).
- Trigger: code reviewer's CRR-002 pass (API/E2E test-code review), 2026-11-22.
- Bootstrap base reference: `origin/personal` `9f6add773b`.
- Integrated base reference used for docs sync: `origin/personal` `81f6aa8be4`, merged into `codex/arm64-appimage-libz` as `fa87a5d289`.
- Post-integration verification reference: `evidence/delivery/DEL-01-ticket-units-merged.log`, `DEL-02-web-typecheck.log`, `DEL-03-server-typecheck.log` (see `release-deployment-report.md`).

## Why Docs Were Updated

- Summary: implementation already documented the arm64 static runtime, the prepared toolset folder and the clean-image release gate (`autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/github-actions-tag-build.md`, `RELEASE.md`), and the Solution Designer added design case 27. Delivery added the two items the review chain left for docs sync: the DEC-006 note on the extract-and-run leftover, and the new workflow test in the release guide.
- Why this should live in long-lived project docs: a user or support reader of the packaging doc must know that the no-FUSE fallback leaves 1.2 GB in `$TMPDIR` with the arm64 AppImage and what the cleaner alternative is (DEC-006). A release engineer reading RELEASE.md's validation list must find the local test that guards the clean-image step wiring.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design principles; rule 12 (build-step/gate changes) | No change | The change follows rule 12 (build-only release run 44956618584 and fresh-start build IMP-08); no principle or component description it holds changed |
| `docs/design-cases.md` | Design case 27 added by the Solution Designer (SR-002) | No change | Accurate against the final state (electron-builder 25 + prepared toolset; upgrade is FU-003) |
| `TESTING.md` | Testing guideline; the ticket adds a Desktop Release workflow-step test | Needs follow-up | Its layer table has no Desktop Release workflow-step row (also missing for three older tests): FU-005. The Fresh-start build and Rerun-by-impact rules were followed as written; no discrepancy recorded by the ticket's reports |
| `RELEASE.md` | Release guide; Linux validation bullet (implementation updated it) | Updated | Added the new test next to `verify-clean-image-runtime.mjs` (CRR-002 docs-sync item b). Build-only release run rule applied as written |
| `autobyteus-web/docs/electron_packaging.md` | Linux AppImage Runtime section (implementation added it); DEC-006 docs-sync item | Updated | Added the extract-and-run leftover note (CRR-002 docs-sync item a) |
| `autobyteus-web/docs/github-actions-tag-build.md` | CI build behavior bullet (implementation added it) | No change | Matches the workflow step and verifier at `fa87a5d289` |
| `autobyteus-web/docs/linux-managed-desktop.md` | User-facing Linux desktop doc named in SCN-001 | No change | Does not mention the AppImage runtime, FUSE or extract-and-run; the native `AppRun` launcher it describes is unchanged (BEH-001 preserved column) |
| Other `*.md` outside `tickets/` | `git grep -iE 'appimage-extract|APPIMAGE_EXTRACT|fusermount|libfuse'` | No change | Only `electron_packaging.md` mentions the fallback |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Behavior note | Under "Linux AppImage Runtime": without FUSE, the arm64 AppImage's `--appimage-extract-and-run` / `APPIMAGE_EXTRACT_AND_RUN=1` leaves `$TMPDIR/appimage_extracted_<md5>` (about 1.2 GB) after quit, reused per version; tmpfs uses memory; `--appimage-extract` + `squashfs-root/AppRun` leaves nothing; FUSE 3 systems never take this path; drop the note when the pinned runtime is fixed upstream (DEC-006, FU-004) | DEC-006 makes this docs note a condition of accepting the risk; AE-11 measured it |
| `RELEASE.md` | Validation list | Workflow Reference, Linux validation bullet: new sub-bullet naming `scripts/tests/test_desktop_release_clean_image_step.py` and what it proves (unconditional gate after the layout check and before upload, own-arch image without network, fails on a `libz.so`-needing runtime, on a clean image with `libz.so`, on a missing AppImage); the container run itself shows only on runners | Same pattern as `test_desktop_release_server_package_wait.py` (line 548); CRR-002 docs-sync item b |
| `tickets/in-progress/arm64-appimage-libz/follow-ups.md` | Follow-up | FU-005 (TESTING.md lacks a Desktop Release workflow-steps layer row) | Outside this ticket's scope (ticket-scope rule) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| arm64 static AppImage runtime via a prepared electron-builder 25 toolset folder | Why arm64 differs from x64, how the toolset folder is prepared and pinned, the build assertion, the upgrade path | `design-spec.md` SR-002, `implementation-handoff.md` | `autobyteus-web/docs/electron_packaging.md` (implementation) |
| Clean-image release gate | Each Linux AppImage runs `--appimage-extract AppRun` in a stock `ubuntu:24.04` container of its arch, after asserting no `libz.so` | `design-spec.md`, AE-02/AE-03 | `github-actions-tag-build.md`, `RELEASE.md` (implementation) |
| Extract-and-run leftover | One 1.2 GB copy per version in `$TMPDIR`; cleaner alternative | `requirements-doc.md` DEC-006, AE-11 | `electron_packaging.md` (delivery) |
| Major-upgrade-as-vehicle design lesson | Measure an upgrade alone before choosing it for a narrow fix | `implementation-design-impact-ir001.md` | `docs/design-cases.md` case 27 (Solution Designer) |
| Local wiring test for the gate | `test_desktop_release_clean_image_step.py` | AE-08, CRR-002 | `RELEASE.md` (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| arm64 AppImage runtime: electron-builder `appimage-12.0.1` legacy `runtime-arm64` (needs `libz.so`, `libfuse.so.2`) | Static AppImage type2 runtime (`appimage@1.0.3`, release 20251108), sha256-pinned, through a prepared toolset folder | `autobyteus-web/docs/electron_packaging.md` § Linux AppImage Runtime |
| Two separate Linux electron-builder calls in `build.ts` | One shared `buildLinuxAppImage` (`build/scripts/linuxAppImageBuild.ts`) | Same section |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not applicable: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, ticket archive, repository finalization (no release).
- Notes: TESTING.md gap recorded as FU-005, not edited (API/E2E-owned layer table; three of four affected tests predate this ticket).
