# Delivery / Release / Deployment Report — delegated-copy-own-run-memory

## Scope

Finalization only. No release.

## Project Release Guide

- `RELEASE.md` as of `cba5563a5d`. Deviations: none.

## Integration

- DR-001: merged `origin/personal` `2d076088dd` in `1dd3cedadf`, cleanly.
  - The full rerun (TESTING.md rule 4: the merge brought in a migration) failed 5 e2e files: `evidence/delivery/`.
  - Blocked, Local Fix.
- IR-004 `217430a404` and baseline fix `004a3a965b` (tests only) resolved it. CRR-009, CRR-010 and API-REV-004 passed on the merged state.
- DR-002: `origin/personal` moved to `cba5563a5d` (another ticket's records only). Merged in `67b1d82d39` with 0 non-ticket files, so no rerun was needed.

## Verification

- Sufficient from evidence. No user check needed. See handoff-summary.md.

## Release Decision

- No release (RELEASE.md default; no request). The release notes are ready for the next release and state that the startup upgrade is one-way.

## Persisted Data

- One-way migration `20261017_task_agent_own_run_v1`. Downgrade is unsupported (DEC-006). Nothing is deleted.
- Recovery: a failed step leaves trees byte-identical and retries on the next start (AC-010).

## Rollback

- Revert the merge on `personal`. Data already migrated stays in the new layout, which older builds can't read. A rollback of a released build therefore needs a forward fix, not a downgrade.

## Repository Finalization

- Merge `--no-ff` commit `9b5cf4025d` pushed to `origin/personal` (unchanged at `cba5563a5d` before). Status: Completed. Details are in delivery-revision-record.md, DR-002.

---

# DR-003 — Beta v1.5.6-beta.1

- Decision: **Beta**, by the user on 2026-10-17: "can we release a new beta so i could install the latest beta".
- Content: `origin/personal` `f911d94e52` plus release commit `fe6c696e9e`. Since stable v1.5.5 the only product change is this ticket (task agents as their own runs, one-way startup migration `20261017_task_agent_own_run_v1`).
- Checks before tagging (clean release worktree at `f911d94e52`):
  - `check_licensing.py` pass;
  - `check_repository_artifact_hygiene.py` pass;
  - `release_versions.py next-beta` → `1.5.6-beta.1`; Android versionCode `10050601`;
  - NFS gate test 5/5 OK;
  - no `v1.5.6*` tag existed.
- Cut: `desktop-release.sh beta --branch finalize/release-v1.5.6-beta.1 --no-push` → `fe6c696e9e`, annotated tag `v1.5.6-beta.1`. `personal` was unchanged right before the push. Pushed `HEAD:personal` (`f911d94e52..fe6c696e9e`), then the tag, at 2026-10-17T20:35Z.

## Rollout

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 39067387892 | success (7/7 jobs) |
| Android APK Release | 39067387887 | success |
| iOS App Store Connect Release | 39067387862 | success, including "Archive And Upload To App Store Connect" |
| Server Docker Release | 39067387854 | success |
| AutoByteus NFS Release | 39067387857 | failure **by design**: `prepare` refuses publication without a qualified `candidate_run_id`; all later jobs skipped; nothing published |

- GitHub pre-release `v1.5.6-beta.1`: not a draft, published 2026-10-17T20:39:49Z, **17 assets** (APK and `.sha256`, both AppImages, macOS ARM64/x64 dmg/zip with blockmaps, Windows exe, four `latest*.yml`, all `version: 1.5.6-beta.1`).
- Docker Hub: `:1.5.6-beta.1` = `:beta` = `sha256:cb718e2a7892…` (amd64, arm64). `:latest` is unchanged at v1.5.5 (`sha256:1bdcb7c765c1…`).
- Result: **Completed** (4/4 release workflows; NFS is not part of releases until qualified).

## Release Notes

- The curated notes (`beta-v1.5.6-beta.1-release-notes.md`, from this ticket's release-notes.md) replaced the generated body after all workflows finished, with the generated "Full Changelog" line kept. They include the one-way upgrade warning (downgrade unsupported). The tag (`fe6c696e9e`), the 17 assets and the pre-release flag are unchanged.

## Deviations From RELEASE.md

- Curated notes on a pre-release (same as v1.5.5-beta.1). Here they carry a data-safety warning that generated notes would not.
- The fifth workflow (AutoByteus NFS) is not listed in RELEASE.md. The guide-fix proposals from the v1.5.5-beta.1 report are still open.

## Rollback

- Desktop never downgrades. Migrated data cannot be read by older builds, so a problem needs a forward fix (the next beta).
- Docker users must not pin back to `1.5.5` after running this beta on the same data.
