# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed`, branch `codex/server-docker-build-speed`, base `origin/personal` 1fdca761aa.
Implementation commit: `1b113a8313` (workflow, tests, docs). Ticket documents and evidence are committed after it on the same branch.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High) and passed (ARCH-REV-002); `get_handoff_rules` returns `/code_reviewer` for Large-or-High implementation.
- Requirements doc: `requirements-doc.md` (Approved, SR-003 wording of SR-001)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-003, Ready)
- Supplemental task artifacts: None
- Design review report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

`.github/workflows/release-server-docker.yml` now has four jobs, as the design spec's target layout says:

1. `prepare-release`: new input `build_only` and outputs `build_only`, `version_tag`. Build-only refuses `release_tag` ("A build-only run publishes nothing; omit release_tag."), sets `release_ref` to the input or `GITHUB_REF_NAME`, and leaves `release_tag`, `normalized_tag`, `version_tag`, `tags` empty. `version_tag` is written by the same variable as the first line of `tags` (`IMAGE:<v>` or `IMAGE:<v>-zh`). The plan summary says "Build only: nothing is published." The concurrency group is `server-docker-build-only-<run_id>` for build-only, `server-docker-release-<release_tag or ref_name>` otherwise.
2. `build` (matrix `include`: amd64 on `ubuntu-latest`, arm64 on `ubuntu-24.04-arm`, `fail-fast: false`): depth-1 checkout, licensing check, Node, `Check system level` (unchanged), `Free runner disk space when low`, Buildx, login, one `Build and push the image` step (`platforms: ${{ matrix.platform }}`, same build args, `provenance`/`sbom` false, `outputs: type=image,name=<image>,push-by-digest=true,name-canonical=true,push=true`, no cache), then the digest written to `$RUNNER_TEMP/digests/<arch>` and uploaded as artifact `server-image-digest-<arch>` (`overwrite: true`, `retention-days: 7`). QEMU, the GHA cache and the zh build step are gone.
3. `publish-image` (`needs: [prepare-release, build]`, outputs `amd64_digest`, `arm64_digest`): downloads `server-image-digest-*` with `merge-multiple: true`, Buildx, login, then `Create and check the multi-arch image`: one `check_index` function (jq lists `os/architecture digest` from `.manifests`, sorted, must equal exactly `linux/amd64 <amd64>` and `linux/arm64 <arm64>`); `imagetools create --dry-run -t <version_tag, or IMAGE:build-only>` checked first in both modes; in publish mode `imagetools create -t <each line of tags>`, `imagetools inspect --raw "$VERSION_TAG"` checked again; only then the two digests go to `GITHUB_OUTPUT`. `Publish summary` lists the checked digests and, when publishing, the tags. `Checkout tags for the beta decision` (default ref, `fetch-depth: 0`, `filter: tree:0`, `sparse-checkout: scripts`) and `Move beta tag` (run block byte-identical) run only for the default variant and not in build-only.
4. `publish-server-package` (`needs: [prepare-release, publish-image]`, matrix `include` with `arch` and `package_arch` `x64`/`arm64`): sparse checkout (`scripts/server-package`, `autobyteus-server-ts/docker`, `filter: blob:none`, depth 1), Node, the same disk guard, extraction from `IMAGE_NAME@DIGEST` with `DIGEST: ${{ needs.publish-image.outputs[format('{0}_digest', matrix.arch)] }}` (no artifact download), arch check, version = `normalized_tag` or in build-only the package's own `version`, archive/describe/sign unchanged. Wait (120 x 30 s, "within 60 minutes") and upload run only when `build_only != 'true'`; a build-only run ends with `Summarize the build-only server package` (three file names, archive SHA-256 and size from the signed description).

Docs: `RELEASE.md` (release table row, 60-minute wait, Server Docker build-only command beside `pnpm release:test`, Recovery entry "One Server Docker architecture failed" with `--failed` and the warning against "Re-run all jobs", combined-case text, `:beta` after both architectures); `autobyteus-server-ts/docker/README.md` "GitHub Release Automation" (native per-architecture build, no cache, index checks, rerun of one architecture, package from the checked digest with arch check, 60-minute wait, build-only run).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change is what the design scoped (one workflow, four test files, two docs; Dockerfile untouched); it still changes the pipeline that publishes public tags and signed packages, job concurrency and adds a registry-pushing mode.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High risk route)
- New design impact or escalation trigger: `None`. The escalation triggers (build-only time, dry-run/push-by-digest/artifact behaviour) can only fire on the GitHub build-only run.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Native parallel builds, no cache | `build` matrix (`runs-on: ${{ matrix.runner }}`), one build step with `platforms: ${{ matrix.platform }}`, no `cache-from/to`, no QEMU; disk guard; depth-1 checkout | Implemented; timing only provable by the build-only run (AC-001, U-001) |
| BEH-002 | Package from the per-arch digest the tag's index lists, checked before upload | `publish-image` `Create and check the multi-arch image` (dry-run check, push, `version_tag` check, outputs) -> `publish-server-package` `Extract the built-in server package` (`IMAGE_NAME@DIGEST` from `needs.publish-image.outputs`) -> arch check in `Archive, describe and sign` | Implemented; unit-tested with fake docker (IMP-01) |
| BEH-003 | Six files for the Desktop wait | Asset names, description and signature unchanged; upload order unchanged | Preserved |
| BEH-004 | Same tags; `:beta` after both builds | `prepare-release` writes the same `tags`; only `publish-image` (needs both legs) pushes; `Move beta tag` run block byte-identical, `if` adds `build_only != 'true'` | Preserved; tested (metadata cases, Move beta tag tests) |
| BEH-005 | Re-publish (default, zh) | Same inputs; zh: `version_tag` `IMAGE:<v>-zh`, index check inspects it; package jobs skipped by `build_variant` | Preserved; zh index-check case tested |
| BEH-006 | Rerun only the failed leg | `fail-fast: false`; artifact per arch with `overwrite: true`; `publish-image` downloads by pattern | Implemented; first exercised when a leg fails (AC-007) |
| BEH-007 | Build-only mode | `build_only` input/output; own concurrency group; dry-run only; no beta, wait or upload; build-only package summary | Implemented; tested in steps; proof run is API/E2E's |
| BEH-008 | 60-min wait | `seq 1 120`, "within 60 minutes" | Implemented; tested |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The Dockerfile, the Desktop/Android/iOS workflows, `scripts/server-package/*.mjs`, `release_versions.py` and the local build scripts are untouched.

## Key Files Or Areas

- `.github/workflows/release-server-docker.yml`
- `scripts/tests/test_release_channel_workflow_steps.py`: new `DockerPublishMetadataStepTest` (version tag = first tag for default stable/beta and zh stable/beta; build-only outputs for default and zh; refusal of `release_tag`; dispatch still needs `release_tag`; concurrency text) and `read_multiline_outputs`; `Move beta tag` `if` and its job/checkout.
- `scripts/tests/test_server_package_release.py`: `PackageJobTest` updated (needs `publish-image`, matrix include, extraction by checked digest and no artifact download, sparse paths, arch refusal, build-only version and summary with no `gh` call, wait/upload/summary `if`s, 120 polls and the 60-minute message); new `BuildJobTest`, `DiskGuardStepTest`, `PublishImageStepTest` (build-only dry-run only; publish pushes all tags then inspects `version_tag`; zh inspects `-zh`; swapped/missing/other/extra digest fails before any non-dry-run call in both modes; wrong pushed index fails; outputs only after the checks).
- `scripts/tests/test_server_docker_cli_latest_defaults.py`, `scripts/tests/test_docker_build_context_sources.py`: one build step.
- `RELEASE.md`, `autobyteus-server-ts/docker/README.md`.

## Important Assumptions

- `docker buildx imagetools create --dry-run` prints the index JSON on stdout, and that JSON has `.manifests[].platform.{os,architecture}` (the shape `imagetools inspect --raw` prints). The check ignores `platform.variant`, so an arm64 entry with `variant: v8` still matches. Proven only by the build-only run (U-001).
- `docker/build-push-action@v6` output `digest` is the single-platform manifest digest with `provenance: false`, `sbom: false` (design Guidance).
- `actions/checkout@v4` `filter` and `sparse-checkout` inputs behave as documented; `git show ${GITHUB_SHA}:scripts/release_versions.py` in a `tree:0` clone fetches the tree and blob on demand.

## Known Risks

- U-001: native arm64 build time and the dry-run output shape, proven only by the build-only run (AC-001, AC-002).
- R-001 (CLI skew after a late leg rerun) and R-002 (`Move beta tag` checkout and the upload first exercised at the next release): accepted upstream.
- Build-only with no `release_ref` builds the branch by name (`GITHUB_REF_NAME`, as the design says): if the branch moves while the run starts, the two legs could check out different commits. Low for a proof run on a ticket branch; recorded for review, not changed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Performance`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed` beyond the job split
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the duplicate zh build step became one step; the disk guard stays as two inline copies, and a test (`DiskGuardStepTest.test_both_jobs_have_the_same_step`) keeps them identical.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (QEMU, GHA cache, `build-and-push`, zh build step, `fetch-depth: 0` build checkout, unconditional cleanup, extraction by tag all removed; a test asserts the retired strings are absent)
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case:
  - Digest artifact file name: the design's interface table names the file `digest`, while its Guidance says download with `merge-multiple: true`. Two artifacts each holding `digest` would collide when merged, so each artifact holds one file named after its architecture (`amd64`, `arm64`) with the `sha256:...` value. Same artifact names, same reader, same content.
  - Summaries of `prepare-release` and `publish-image` read their values from `env:` instead of inline `${{ }}` in `run:` (no change in what they print, apart from the build-only branches).
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`, with a note. The workflow grows from 358 to 572 non-empty lines (+307/-79). It is CI configuration; the design keeps it one file and rejected a composite action or reusable workflow as an empty layer; the other release workflows are 602 (iOS) and 677 (Desktop) lines. The growth is the two new jobs, the build-only branches and comments. No source implementation file changed.
- Notes: design-spec Change Sequence step 3's "digest download" is stale (architecture review residual risk); the package job reads `needs.publish-image.outputs` and a test asserts no `download-artifact` in that job.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: tag names and asset names/formats unchanged (metadata and package tests)
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- New actions used: `actions/upload-artifact@v4`, `actions/download-artifact@v4`. Existing: `actions/checkout@v4` (now with `filter`, `sparse-checkout`), `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `docker/build-push-action@v6`.
- Secrets: only `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` (login, in both `build` and `publish-image`) and `SERVER_PACKAGE_SIGNING_KEY` (sign step), all through `with:`/`env:`; nothing echoes them (AC-010). `publish-image` needs the login for the pushes; it adds no new secret.
- Permissions: workflow `contents: read`; `contents: write` only on `publish-server-package`; no `actions: read` added.
- `jq` is used in `publish-image` (preinstalled on GitHub's Ubuntu runners; the tests use the host `jq`).

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `python3 -m unittest -v scripts/tests/test_server_package_release.py scripts/tests/test_release_channel_workflow_steps.py scripts/tests/test_server_docker_cli_latest_defaults.py scripts/tests/test_docker_build_context_sources.py` | 1b113a8313 | macOS 26.5.2, Python 3.9.6, Node v22.23.1, bash 3.2.57, jq 1.7.1 | All `run:` blocks of the new/changed steps (metadata, disk guard, index check, extraction, archive/sign, wait, upload, build-only summary, Move beta tag) with fake docker/gh/df; job structure assertions | BEH-001..008; AC-002, AC-004, AC-005, AC-006, AC-008 | Pass | `evidence/IMP-01-workflow-step-tests.log` | `Ran 73 tests` and `OK` |
| IMP-02 | `actionlint .github/workflows/release-server-docker.yml` (includes shellcheck of every `run:` block) | 1b113a8313 | macOS 26.5.2, actionlint 1.7.11 | Whole workflow: expressions, `needs` outputs, matrix keys, shell | AC-010 (no unsafe inline expansion), structure | Pass | `evidence/IMP-02-actionlint.log` | `actionlint exit code: 0` |
| IMP-03 | Five single-line mutations of the workflow, each followed by `python3 -m unittest scripts/tests/test_server_package_release.py`, then the file restored | 1b113a8313 | as IMP-01 | Proves the new tests fail when the dry-run check, the `version_tag` inspect, the arch refusal, the 60-min wait or `publish-image`'s `needs` on `build` is broken | AC-002, AC-005, AC-008, BEH-004 | Pass | `evidence/IMP-03-mutation-check.log` | five lines `=> FAILED`, then `workflow restored: yes` |

- Not run, and why:
  - The build-only run on GitHub (`gh workflow run release-server-docker.yml --ref codex/server-docker-build-speed -f build_only=true`) and the before/after timing table (AC-001, AC-002, AC-006): API/E2E's (design Change Sequence step 6); needs the branch pushed and real runners. It is also TESTING.md's "change to a build step" proof.
  - TESTING.md Fresh-start build: the paths match (`.github/workflows/**`, `scripts/**`), but the build this workflow runs is the Docker image build on GitHub runners; the Dockerfile is unchanged; the build-only run is that proof.
  - Tag push publish path, `Move beta tag` after the new checkout and the upload (AC-003, R-002): first exercised at the next release.
  - Rerun of one failed leg (AC-007): exercised when it first happens.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: CI workflow and documentation only; no rendered frontend.

## Downstream Coverage Hints / Suggested Scenarios

- Build-only run from `codex/server-docker-build-speed` (push the branch first). Check: run total ≤ 30 min (AC-001); both `Build Server Image` legs on the expected runners; the `Create and check the multi-arch image` log shows "The dry-run index lists linux/amd64 ... and linux/arm64 ..." (this is where U-001's dry-run output shape is proven); package jobs pass the arch check and the summary shows `autobyteus-server-<version>-linux-x64` and `-linux-arm64` with SHA-256 and size (AC-002); `Move beta tag`, `Wait for the GitHub release`, `Upload ...` are skipped; the concurrency group differs (AC-006).
- Before/after table from `gh run view <run-id> --json jobs` against beta.8 44047761247 and beta.9 44123354990.
- After the run: Docker Hub tag list and the beta.9 release assets unchanged (AC-006).
- The disk guard log line "Free disk on /: N GB" on `ubuntu-24.04-arm` gives the unmeasured arm64 free disk.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001, AC-002, AC-006 by the real build-only run; AC-003 and AC-007 at the next release / first failed leg (PM verifies); AC-009 docs review; AC-010 run log review.
