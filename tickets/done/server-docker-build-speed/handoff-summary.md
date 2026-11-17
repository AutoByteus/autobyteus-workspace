# Handoff Summary

## Summary Meta

- Ticket: `server-docker-build-speed` (Project Task `autobyteus-520`, delegated by `/project_task_manager`; it is FU-002 of the beta.9 release, autobyteus-519)
- Date: `2026-11-17`
- Classification: `task_size: Medium`, `architectural_risk: High`; route: reviewed (architecture review `ARCH-REV-002` Pass; implementation `IR-001`; source review `CRR-001` Pass; API/E2E `API-REV-001` Pass, final confidence 95%; test-code review `CRR-002` `Not Applicable`: API/E2E changed no durable test).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`)
- Branch: `codex/server-docker-build-speed`, base `origin/personal` @ `1fdca761aa` at bootstrap and at delivery (it had not advanced, so no base merge). Product code is final at `1b113a8313`; everything after it is ticket documents, evidence, and delivery's docs sync.

## Delivery Summary

- Delivered scope:
  - The Server Docker Release (`.github/workflows/release-server-docker.yml`) now builds each architecture natively on its own runner (`linux/amd64` on `ubuntu-latest`, `linux/arm64` on `ubuntu-24.04-arm`) at the same time, with no layer cache, and pushes each image untagged, by digest. No QEMU emulation and no GitHub Actions cache export remain.
  - A new `Publish Server Image` job runs when both have built. It checks that the multi-arch index of those two digests lists exactly `linux/amd64` and `linux/arm64`, pushes the same tags as before, and checks the pushed version tag's index again. Only then does it hand the two digests on.
  - Each server package is taken out of the per-architecture image whose digest the checked index lists, and the job refuses a package whose `arch` differs. The same six files, names, description format and signature, and the `latest*.yml` order of the Desktop Release, are unchanged. `:beta` still moves forward only, after both builds.
  - A manual build-only run (`gh workflow run release-server-docker.yml --ref <branch> -f build_only=true`) builds both architectures, checks the index and takes out, describes and signs both packages, and publishes nothing. It has its own concurrency group and refuses `release_tag`.
  - `gh run rerun <run-id> --failed` rebuilds only the failed architecture, then completes the publish. The package job's wait for the GitHub release is 60 minutes (it was 30), so a faster server run still meets a release that only the Desktop Release creates.
- Result in numbers (build-only run on GitHub, `evidence/API-06-timing-table.md`): 9m52s in total against 39m00s for beta.8 and a beta.9 build step that ran 1h54m36s and was cancelled. The native arm64 build and push takes 4m14s (amd64 4m25s); the package jobs take 1m23s (beta.8: 7m09s). The target was at most 30 minutes.
- Docs synced (`docs-sync-report.md`): `RELEASE.md` and `autobyteus-server-ts/docker/README.md` (implementation, confirmed by delivery); `DESIGN.md` rule 12 and `TESTING.md` (Fresh-start build; new Test layers row for the workflow-step tests) by delivery.
- Durable coverage: the four workflow-step test files changed in `1b113a8313` (73 tests: `scripts/tests/test_server_package_release.py`, `test_release_channel_workflow_steps.py`, `test_server_docker_cli_latest_defaults.py`, `test_docker_build_context_sources.py`). API/E2E added no test code.

## Verification Summary

- Verified from evidence by delivery. A user check is not needed to finalize: every critical acceptance criterion is directly proven except the publish-only part of AC-003, which no check can prove without publishing; the requirements doc plans it for the next release (R-002) and the release is the founder's decision.
- Final confidence 95% (target 95% met; every applicable category 95%-96%). Critical evidence files were opened (`release-deployment-report.md`, Verification).
- Key evidence:
  - `evidence/API-02-run-44148955212-excerpt.log`, `API-06-timing-table.md`: run wall time `9m52s`; the arm64 leg on `ubuntu-24.04-arm`; zero `exporting to GitHub Actions Cache`, `type=gha` and `qemu` lines (beta.8: 2, 3, 14).
  - Same log: the dry-run index lists `linux/amd64 sha256:037c1bc1…` and `linux/arm64 sha256:77fcdb83…`; the package jobs' `DIGEST:` lines are those digests; `PACKAGE_ARCH: x64` / `arm64`; the signatures verify. `evidence/API-09-registry-digest-check.log` confirms each digest in Docker Hub as a single-platform manifest of its architecture.
  - `evidence/API-04-nothing-published.log`: no Docker Hub tag created or moved by the build-only runs (the one new tag is the beta.9 release run's), `beta`/`latest` unchanged, release assets identical, `Move beta tag`, the wait and the upload skipped.
  - `evidence/API-10-rerun-failed-leg.log`: a forced arm64 failure; attempt 1 skipped the publish jobs; `gh run rerun --failed` restarted only arm64 and the publish completed with the earlier amd64 digest.
  - `evidence/API-05-secret-scan.log`: every secret input is `***`; no key material or token pattern in the full logs.
  - `evidence/IMP-01`, `IMP-02`, `IMP-03`: 73 step tests pass, actionlint exits 0, five mutations of the workflow each fail the tests.
- Integrated-state check: the branch was already current with `origin/personal` (`1fdca761aa`), so there was no integration to re-check. Secret Gate, licensing and artifact-hygiene checks pass.

## Residual Risks For The User

- Not proven before a release: the publish-only part of AC-003 (R-002), the steps that publish: pushing the tags with `imagetools create`, the check of the pushed version tag's index, `Move beta tag` with its new `tree:0` sparse checkout, and the upload. They ran as their real `run:` blocks against fakes (IMP-01); the steps they share with the build-only run ran for real. The first release on this workflow exercises them. The recovery is the documented one (RELEASE.md, Recovery): rerun the failed job; a tag is never moved or deleted. The next release's delivery should check the tags, the version tag's index against the package digests, the six files and that every `latest*.yml` is newer than them (`requirements-doc.md` AC-003).
- Run 44123354990 (beta.9) was running the old workflow when this ticket was validated. A manual dispatch on `personal` after this merge would use the new workflow for the first time in publish mode.
- R-001: the "latest" CLIs are installed at each architecture's own build time, so the two architectures can differ if one leg is rerun much later. Accepted in the design.
- Build-only runs leave untagged per-architecture manifests in Docker Hub (eight so far), reachable only by digest; accepted in the design (DEC-004).
- The 60-minute wait for a missing GitHub release and the arch refusal were proven with fakes, not on a real timeout.

## Follow-ups

- `follow-ups.md`: FU-001 (the depth-1 build checkout is about 1.5 min slower per leg than the full fetch; tuning, no criterion affected) and FU-002 (pin a build-only run's `release_ref` to `GITHUB_SHA`; optional). Neither is urgent. The Solution Designer sends them when the ticket leaves the team.

## Release

- No release: the founder has not asked for one, and RELEASE.md's default is no release. A release is available and would be the first run of the new workflow in publish mode (AC-003). `release-notes.md` is not written: no release was requested, and the change has no user-facing behavior and no action for users (a beta's notes are generated by GitHub; a stable release's curated notes come from the release's own ticket).
