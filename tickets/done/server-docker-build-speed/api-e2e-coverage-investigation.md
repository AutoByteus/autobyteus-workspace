# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision go in the execution coverage report (`api-e2e-execution-coverage-report.md`).

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-003 wording of SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: None
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001, code commit `1b113a8313`)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass, no findings; optional S-1)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review Pass (CRR-001 on IR-001) from `/code_reviewer`, 2026-11-17
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: Round 1

All paths are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/`.

## Current Requirement And Design Basis

The Server Docker Release (`.github/workflows/release-server-docker.yml`) now builds each architecture natively on its own runner (`build` matrix: amd64 on `ubuntu-latest`, arm64 on `ubuntu-24.04-arm`), pushes each untagged by digest, and `publish-image` checks a dry-run index of exactly those two digests before any tag push. In publish mode it then pushes the tags, checks the pushed version tag's index, and moves `:beta`. The package jobs extract each server package from the digest `publish-image` checked, refuse an arch mismatch, then archive, describe and sign it. They wait up to 60 minutes for the release and upload only when publishing. A new `build_only` dispatch runs all of this but publishes nothing.

What must be proven, and where:

- REQ-001 / AC-001: total ≤ 30 min, plus a before/after timing table against beta.8 (44047761247) and beta.9 (44123354990). This needs a real GitHub run.
- REQ-002 / AC-002: the dry-run index lists exactly the two pushed digests. Each package job extracts from its arch's checked digest and passes the arch check (`x64`, `arm64`). This needs a real run; the dry-run JSON shape is U-001.
- REQ-005 / AC-006: build-only publishes nothing (no Docker Hub tag created or moved, no release asset changed) and uses its own concurrency group. This needs a real run plus before/after snapshots.
- REQ-003/004/007 / AC-004, AC-005, AC-008: step behavior with fakes (IMP-01) and workflow structure (`publish-image` needs both legs).
- REQ-009 / AC-010: no secret in the real run logs.
- REQ-008 / AC-009: the docs. Code review covered them; this run checks that the documented build-only command works as written.
- AC-003 (next release), AC-007 (first failed leg), R-002 (`Move beta tag` with its new treeless checkout, the upload): not reachable without a release or a real failure (see Not Tested).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-003 (build-only dispatch, default variant), the main proof. SCN-001 and SCN-002 are covered through the parts a build-only run shares with them (native builds, dry-run index check, extraction by checked digest, signing) and through the step tests. SCN-004: workflow structure and step tests only.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-003-zh: build-only dispatch with `publish_zh=true`. The design documents it ("`publish_zh` with `build_only` builds the zh variant"). It is the only way to prove, before a zh re-publish (SCN-002), that the zh variant's base image (`baseImages.zh`) builds natively on `ubuntu-24.04-arm` through the merged single build step. Trigger: `gh workflow run release-server-docker.yml --ref <branch> -f build_only=true -f publish_zh=true`.
  - Build-only run alongside a release run in progress: the beta.9 release run 44123354990 (attempt 2) is still running. The design's own-concurrency-group requirement (AC-006, "never waits for or blocks a release run") is exercised for real.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): None recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 native parallel builds, no cache | Changed | design DS-001, workflow `build` | Real GitHub run timings (API-02, API-06) |
| BEH-002 package from checked digest | Changed | DEC-002, `publish-image` `check_index`, package job extraction | Local dry-run probe (API-01), real run logs and summaries (API-03), step tests (IMP-01) |
| BEH-003 six files for the Desktop wait | Preserved | asset names unchanged | Step tests (IMP-01); build-only summary file names (API-03) |
| BEH-004 tag rules, `:beta` after both builds | Preserved | `tags`, `Move beta tag` byte-identical | Step tests (IMP-01); structure |
| BEH-005 re-publish default/zh | Preserved | same inputs | Step tests (IMP-01); zh build-only run (API-08) |
| BEH-006 rerun one leg | Changed | `fail-fast: false`, artifacts | Structure only; exercised at first failure (Not Tested) |
| BEH-007 build-only mode | Added | REQ-005 | Real build-only runs (API-02..05, API-08) |
| BEH-008 60-min wait | Changed | REQ-007 | Step tests (IMP-01, IMP-03 mutation) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes | Docker Hub registry (push by digest, `imagetools create --dry-run`), GitHub release assets | Step tests with fake `docker`/`gh` | Real `--dry-run` stdout shape; real push-by-digest output digest | Local probe against Docker Hub (dry run), real GitHub run |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | Yes | Docker Hub login in `build` and `publish-image`; `contents: write` only on package job; signing key | actionlint, code review | Secrets masked in real logs | Real run log scan |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | GitHub Actions job graph: matrix legs, `needs`, outputs, artifacts, `if` gating, concurrency | Step tests, structure asserts | Real runner labels, artifact hand-over, `needs` outputs indexing, step skipping | Real GitHub build-only run |
| Persisted-data transition | No | `Not Affected` (tags/assets same names and formats) | — | — | — |
| Worker / queue / distributed coordination | Yes | Two runners in parallel, fan-in by digest | — | Real parallelism and timing | Real GitHub run |
| External integration | Yes | `ubuntu-24.04-arm` runner, Docker Hub | — | Native arm64 build time (U-001), arm64 free disk | Real GitHub run |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed`, branch `codex/server-docker-build-speed`, commit under test `31dfe3dad0` (code `1b113a8313` plus ticket docs only).
- Project type and runtime stack: GitHub Actions workflow (YAML + bash), Docker Buildx, Python `unittest` workflow-step tests, Node scripts for server packages.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/TESTING.md` ("Fresh-start build", "Rerun by impact", "Rules", "Evidence and cleanup"). No closer `TESTING*.md` under `.github/` or `scripts/`.
- Conflicting, missing, or unclear project instructions: TESTING.md's Test layers table has no row for the workflow-step tests (`scripts/tests/test_server_package_release.py` etc.). They run with `python3 -m unittest`, like the launcher tests. Not a conflict; the implementation handoff recorded the command.
- Changed build-input paths: `.github/workflows/release-server-docker.yml`, `scripts/tests/*.py` (match `.github/workflows/**`, `scripts/**`). Fresh-start build: the build this workflow runs is the Docker image build on GitHub runners. The real build-only run (API-02) is a true fresh start (a fresh runner, a depth-1 clone of the commit, the job's own steps), and it is TESTING.md's "change to a build step or gate" proof. No pnpm/desktop build input changed (the `scripts/tests/*.py` files are not imported by any build). A local fresh-clone pnpm build would not exercise this change, so none is run.
- Required environment variables or secrets available: `Yes` for the GitHub run (repository secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `SERVER_PACKAGE_SIGNING_KEY`, used by the workflow on GitHub). Locally none is needed: the probe uses anonymous public pulls and `--dry-run`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Fresh-start build | build-input paths; build-step changes need the build-only release run on the ticket branch before merge | The Server Docker build-only run is the proof |
| `TESTING.md` § Rerun by impact | reuse a passed check when the code it exercises did not change | IMP-01..03 ran on `1b113a8313`; `git diff --name-only 1b113a8313 31dfe3dad0` touches only `tickets/` |
| `RELEASE.md` § Build-only release run (lines 167-195) | documented command | `gh workflow run release-server-docker.yml --ref <ticket-branch> -f build_only=true` |
| `DESIGN.md` rule 12 | release build starts from install alone | Satisfied by the runner's fresh checkout |
| `design-spec.md` Change Sequence step 6 | validation steps | push the branch, dispatch, before/after table from `gh run view --json jobs`, check Docker Hub tags and beta.9 assets unchanged |
| `AGENTS.md` | test vault for provider keys | not needed (no model provider) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| GitHub Actions build-only run (default) | worktree | `git push -u origin codex/server-docker-build-speed`; `gh workflow run release-server-docker.yml --ref codex/server-docker-build-speed -f build_only=true` | GitHub-hosted `ubuntu-latest`, `ubuntu-24.04-arm` | `gh run view <id> --json status` | Run ends on its own; nothing to stop |
| GitHub Actions build-only run (zh) | worktree | same, plus `-f publish_zh=true` | as above | as above | as above |
| Local Docker Buildx (probe) | `/tmp/api520` | Docker Desktop already running (not started by this run) | buildx v0.29.1 | `docker version` | Nothing pushed (`--dry-run`); probe folder removed at the end |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Published per-architecture digests for the probe | `imagetools inspect --raw autobyteus/autobyteus-server:1.5.13-beta.8` | Read-only; `--dry-run` pushes nothing | None needed |
| Docker Hub tag list and beta.9 asset list before/after | Docker Hub v2 tags API (anonymous), `gh release view v1.5.13-beta.9 --json assets` | Read-only | Snapshots kept as evidence |
| Untagged per-arch manifests pushed by the build-only runs | Created by the workflow (DEC-004) | Accepted by DEC-004: untagged, reachable only by digest | Left in Docker Hub as DEC-004 says; digests recorded |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_server_package_release.py` (`PackageJobTest`, `BuildJobTest`, `DiskGuardStepTest`, `PublishImageStepTest`) | Package job needs/matrix/extraction by checked digest, arch refusal, build-only version and summary, 60-min wait, publish-only `if`s; index check pass/fail in both modes and zh | AC-002, AC-004, AC-005, AC-006, AC-008 | Still Valid | IMP-01, IMP-03 mutation check; read against the workflow | Reuse (IMP-01) |
| `scripts/tests/test_release_channel_workflow_steps.py` (`DockerPublishMetadataStepTest`, Move beta tag tests) | Metadata per event/variant/build-only, `release_tag` refusal, `version_tag`, concurrency text, Move beta `if` | AC-004, AC-006 | Still Valid | IMP-01 | Reuse |
| `scripts/tests/test_server_docker_cli_latest_defaults.py` | One cache-busted build step | BEH-001 | Still Valid | IMP-01 | Reuse |
| `scripts/tests/test_docker_build_context_sources.py` | One `file:`/`context:` pair | BEH-001 | Still Valid | IMP-01 | Reuse |

No test asserts timings, real registry behavior or runner labels against a live system. Those cannot be durable repository tests; the build-only run is the documented proof (RELEASE.md).

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| IMP-01 | AC-002, AC-004, AC-005, AC-006, AC-008 | Workflow step scripts with fakes | Reused | IMP-01 | Ran on `1b113a8313`; since then only `tickets/` changed |
| IMP-02 | AC-010 (structure) | Whole workflow lint | Reused | IMP-02 | Same commit reasoning |
| IMP-03 | AC-002, AC-005, AC-008 | Test strength (mutations) | Reused | IMP-03 | Same commit reasoning |
| API-01 | AC-002, U-001 | Docker Hub registry via local Buildx | Temporary Probe | `docker buildx imagetools create --dry-run -t autobyteus/autobyteus-server:build-only IMAGE@<beta.8 amd64> IMAGE@<beta.8 arm64>` plus the step's `check_index` copied verbatim; then a swapped case | Proves the dry-run stdout shape the check parses before the real run; a probe against a live registry is not a durable repository test |
| API-02 | AC-001, REQ-001, REQ-005, U-001, ASM-001 | Real GitHub Actions run (default variant) | Journey | Push branch; `gh workflow run release-server-docker.yml --ref codex/server-docker-build-speed -f build_only=true`; `gh run view <id> --json jobs` | The only surface that proves timing, native arm64 runner, job graph and artifact hand-over |
| API-03 | AC-002, REQ-002 | Same run: `publish-image` and package job logs and summaries | Journey | `gh run view <id> --log --job <id>`; job summaries | Index check on real pushed digests; extraction and arch check; files with SHA-256 and size |
| API-04 | AC-006, REQ-005 | Same run + Docker Hub + GitHub release | Journey | Step conclusions (`Move beta tag`, `Wait`, `Upload` skipped); Docker Hub tag list and beta.9 assets before/after; concurrency group and overlap with the beta.9 run | Proves nothing published and no queueing |
| API-05 | AC-010, REQ-009 | Same runs' full logs | Journey | Download full logs; scan for secret-related lines and masked values | Real-log proof |
| API-06 | AC-001 | Timing table | Journey | `gh run view --json jobs` for 44047761247, 44123354990 and the new run; step timings | Before/after table |
| API-07 | Disk guard (design risk) | Same run, both build legs and package jobs | Journey | Log line `Free disk on /: N GB` per job | Unmeasured arm64 runner disk |
| API-08 | SCN-002 (zh), REQ-003 | Real GitHub Actions run (zh variant) | Journey | `gh workflow run release-server-docker.yml --ref codex/server-docker-build-speed -f build_only=true -f publish_zh=true` | zh base image built natively on arm64 through the single build step; package jobs skipped for zh |
| API-09 | AC-002 (independent) | Docker Hub registry | Temporary Probe | `imagetools inspect --raw IMAGE@<digest>` for both pushed digests from API-02: config `architecture`/`os` per digest | Independent check that each checked digest really is its architecture's image |
| API-10 | AC-007, REQ-006, SCN-004 | Real GitHub Actions run + `gh run rerun --failed` | Temporary Probe | Throwaway branch `codex/api520-rerun-probe` = `31dfe3dad0` plus one step that fails the arm64 leg when `github.run_attempt == 1`; dispatch build-only there; when attempt 1 ends, `gh run rerun <id> --failed`; check that attempt 2 reruns only the arm64 leg, that Publish Server Image downloads the amd64 digest from attempt 1, and that both package jobs complete; then delete the branch | Added in round 1 after the first runs: a forced failure is the only way to exercise the documented recovery before a real leg fails. The probe step cannot be durable (it would break the workflow), so it lives on a throwaway branch that is never merged |

- Test progress log needed: `Yes` (several cases, two long remote runs)

## Durable Coverage To Add

None. The step behavior is covered by the updated tests (IMP-01). What remains (timings, registry shape, runner behavior) can only be proven by a live run, and RELEASE.md documents that run as the proof.

## Durable Coverage To Update

None (the implementation already updated the four test files; reviewed in CRR-001).

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: snapshot Docker Hub tags and beta.9 assets → push branch → dispatch the default build-only run → dispatch the zh build-only run → local dry-run probe while they run → collect jobs, logs, summaries → snapshot again → registry inspect of the pushed digests.
- Environment choices that materially affect the run: GitHub-hosted runners as the workflow declares; repository secrets; the beta.9 release run is running at the same time (realistic, and it proves the separate concurrency group).
- Health / readiness checks: `gh run view --json status`.
- Seed data / fixtures: none.
- Test identities: the user's `gh` login (`ryan-zheng-teki`) dispatches; the workflow uses its repository secrets.
- Requirement-linked journeys: SCN-003 default, SCN-003-zh.
- Evidence to capture: jobs JSON, `publish-image` and package job logs, step conclusions, before/after snapshots, timing table, secret scan.
- Owned processes and temporary state to clean up: `/tmp/api520` probe folder; the API-10 throwaway branch `codex/api520-rerun-probe` (remote and local) and its worktree `/tmp/api520/probe-wt`; the ticket branch on the remote stays (delivery needs it); the untagged manifests stay (DEC-004).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-003: tag push publishes tags, version tag index = package digests, six files, `latest*.yml` newer | Needs a real release (the founder's word); publishing a tag for a test is not allowed | Medium: first publish path, `imagetools create` without dry-run, pushed index check | No (next release; PM/delivery verifies) | Delivery checks at the next release |
| R-002: `Move beta tag` with the new `tree:0` checkout, upload path | Gated off in build-only; needs a release | Low-medium: step script byte-identical and unit-tested | No | Next release |
| AC-007 with a failure inside the real build step (rather than the probe step), and with publishing on (tags and upload after the rerun) | API-10 forces the failure at a probe step early in the leg, in build-only mode; a real failure and a publishing rerun need a release | Low: rerun semantics do not depend on which step failed; the publishing steps are AC-003's | No | First failed leg at a release |
| AC-008 real 60-min wait | Unit-tested; a real wait needs a release missing for an hour | Low | No | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| None so far. AC-001 total > 30 min would be `Design Impact` (requirements doc). | — | — | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the real build-only runs were started right after the "before" snapshots (18:32 and 18:33 UTC), because they take the longest; this plan was written while they ran.
