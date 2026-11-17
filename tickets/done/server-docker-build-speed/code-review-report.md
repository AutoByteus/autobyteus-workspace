# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-003 wording of SR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited by design; Runtime table)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: None (none exist)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation ready for source review from `/implementation_engineer`, 2026-11-17; code commit `1b113a8313`, diff `git diff 1fdca761aa 1b113a8313`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes` (High risk)
- Classification evidence or correction required: None. The delta is what the design scoped: one workflow, four workflow-step test files, RELEASE.md and the docker README; Dockerfile, other workflows and `scripts/server-package/*.mjs` untouched. It changes the pipeline that publishes public tags and signed packages, job concurrency and adds a registry-pushing mode, so `High` holds.

## Review Scope

- Changed implementation and behavior reviewed: the whole new `.github/workflows/release-server-docker.yml` (629 lines, read in full) against the base version (read in full); RELEASE.md and docker README diffs; the four test-file diffs proportionately.
- Files / areas reviewed: `.github/workflows/release-server-docker.yml`, `RELEASE.md`, `autobyteus-server-ts/docker/README.md`, `scripts/tests/test_release_channel_workflow_steps.py`, `scripts/tests/test_server_package_release.py`, `scripts/tests/test_server_docker_cli_latest_defaults.py`, `scripts/tests/test_docker_build_context_sources.py`; `scripts/server-package/describe-server-package.mjs` 115-132 (description `archive.sha256`/`archive.size` shape read by the build-only summary).
- Explicit exclusions: the real GitHub runs (build-only, release, rerun), which belong to API/E2E and the next release. The recorded checks IMP-01..03 ran on `1b113a8313`, the reviewed commit; none was rerun (no code changed after them, results clear).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Server Docker run ≤ 30 min by native per-architecture builds and no layer cache (REQ-001), the same tags, files and package guarantee (REQ-002..004), a build-only mode (REQ-005), rerun of one architecture (REQ-006), 60-min release wait (REQ-007), docs (REQ-008), no secret in logs (REQ-009).
- Design-spec behavior map verified against the implementation: Yes, every BEH row traced in the workflow (table below).
- Design review report and round confirmed: ARCH-REV-002 Pass; its stale step-3 wording ("digest download") is correctly not followed.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `build` matrix 183-302: `runs-on: ${{ matrix.runner }}` (ubuntu-latest / ubuntu-24.04-arm), `platforms: ${{ matrix.platform }}`, no `cache-from/to`, no QEMU, depth-1 checkout, disk guard 242-257 | — |
| BEH-002 | Confirmed | `publish-image` 341-377: dry-run index checked, then (publish) tags pushed and `inspect --raw "$VERSION_TAG"` checked, outputs written only after the checks; package job 516-526 extracts from `IMAGE@needs.publish-image.outputs[<arch>_digest]`; arch refusal 541-545 | — |
| BEH-003 | Confirmed | Asset base name, describe/sign calls, upload order and `--clobber` unchanged (552-563, 589-602) | — |
| BEH-004 | Confirmed | `tags` built as before (140-147); only `publish-image` pushes (369) and it needs both legs (309); `Move beta tag` run block byte-identical to base, `if` adds `build_only != 'true'` (428-458) | — |
| BEH-005 | Confirmed | Same inputs; zh `version_tag` = `IMAGE:<v>-zh` (127), the inspected tag (370); package jobs skipped by `build_variant` (467) | — |
| BEH-006 | Confirmed | `fail-fast: false` (188), per-arch artifact with `overwrite: true` (295-302), `publish-image` downloads by pattern (315-320); RELEASE.md Recovery entry | — |
| BEH-007 | Confirmed | `build_only` input/output (26-30, 70-81), own concurrency group (37), dry-run only (358-362), `Move beta tag`/wait/upload gated (418, 429, 569, 590), build-only package summary (611-628) | — |
| BEH-008 | Confirmed | `seq 1 120` × 30 s, "within 60 minutes" (577-583) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001..004, 008 | Operational | Delivery engineer | Publish a release | Tag push `v*` | Normal | prepare-release -> build ‖ -> publish-image -> publish-server-package ‖ | Tags, `:beta`, six files | RELEASE.md, requirements | Supported Normal Scenario | Use |
| SCN-002 | BEH-005 | Operational | Delivery engineer | Re-publish a tag (default/zh) | `workflow_dispatch` + `release_tag` [+ `publish_zh`] | Normal | as SCN-001 for the variant | Same as today | RELEASE.md, docker README | Supported Normal Scenario | Use |
| SCN-003 | BEH-007, BEH-002 | Operational | Engineer | Prove the build without publishing | `workflow_dispatch` + `build_only=true` | Normal | same jobs, publishing gated off | Nothing published; timings in run record | Task autobyteus-520 | Supported Normal Scenario | Use |
| SCN-004 | BEH-006 | Operational | Delivery engineer | Recover a failed architecture | `gh run rerun <id> --failed` | Explicit Edge | failed leg -> publish-image -> packages | Publish completes | RELEASE.md Recovery | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C1 | Workflow grows to 572 non-empty lines (> 500) | Engineering contract: source-size rule; design spec "Final File Responsibility Mapping" (one workflow file) | — | The file owns one concern: this workflow's job graph. Jobs, `needs`, outputs and `if`s can only live in the workflow file; moving them out means a reusable workflow or composite action, which the design rejected as an empty layer (Rulings hold). The only extractable block is the ~45-line index check, which would not bring it under 500 and would break the repo's `extract_step` test convention for workflow steps | base 358 / now 572 non-empty; `release-desktop.yml` 677, `release-ios.yml` 602 | Reject | — | Not a source-implementation module with a second concern; no problem the split would solve. Recorded in the size audit |
| CR-C2 | Build-only builds the branch by name (`GITHUB_REF_NAME`); a push during the run could give legs or the package job's script checkout a different commit | SCN-003 | Engineer pushes to the ticket branch while its own proof run is running | The proof would mix commits; the engineer reruns after their push anyway | Design spec interface table ("release_ref defaults to the dispatch ref"); handoff Known Risks | Reject | — | Requires the actor to contradict their own goal (proving a fixed commit) by pushing mid-run. Non-blocking suggestion S-1 below |
| CR-C3 | `download-artifact@v4` in a `--failed` rerun attempt must see the successful leg's artifact from attempt 1 | SCN-004 | One leg fails | publish-image of attempt 2 reads both files | `overwrite: true` exists because attempt-1 artifacts persist in the run (v4 409 conflict otherwise); design Guidance | Reject (as a finding) | — | Platform behavior the design relies on; first exercised with AC-007. Residual risk |
| CR-C4 | Index check parses `imagetools create --dry-run` stdout | SCN-003, BEH-002 | Every run | Wrong shape fails the run before any tag push (safe failure) | buildx prints the index JSON with `--dry-run`; design risk U-001 | Reject (as a finding) | — | Fails closed; proven by the build-only run (AC-002). Residual risk |
| CR-C5 | Digest artifact holds a file named after the arch, not `digest` | Design interface table vs Guidance (`merge-multiple: true`) | — | Two `digest` files would overwrite each other on merge | Handoff deviation; workflow 289-299, 341-342 | Reject | — | Deviation reason holds; same artifact names, reader and content |
| CR-C6 | Disk guard step duplicated in two jobs | Design "Reusable Owned Structures Check" | — | Two inline copies; test `DiskGuardStepTest.test_both_jobs_have_the_same_step` keeps them equal | 242-257, 499-514 | Reject | — | Design decision (composite action would be an empty layer); drift guarded by a test |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Performance / No Design Issue Found; implementation removes emulation, cache and oversized setup only | — |
| Matches approved supplemental artifacts | Pass | None exist | — |
| Data-flow spine clarity and preservation | Pass | Job graph follows DS-001..004 exactly: prepare-release -> build ‖ -> publish-image -> publish-server-package ‖; Move beta tag inside publish-image | — |
| Ownership boundary preservation | Pass | Only prepare-release decides mode/tags/version_tag (no later job reads `github.event.inputs` or rebuilds a tag name); only publish-image tags; only the package job has `contents: write` | — |
| Off-spine concern clarity | Pass | Disk guard, licensing/system-level checks, summaries attach to their jobs | — |
| Existing capability reuse | Pass | `ubuntu-24.04-arm`, `imagetools`, `release_versions.py`, package scripts reused unchanged | — |
| Reusable owned structures | Pass | One `check_index` function used for dry-run and pushed index; one build step for both variants | — |
| Shared-structure tightness | Pass | No shared types; outputs are singular (`build_only`, `version_tag`, `<arch>_digest`) | — |
| Repeated coordination ownership | Pass | Publish gating reads one switch, `needs.prepare-release.outputs.build_only` | — |
| Empty indirection check | Pass | No composite action, reusable workflow or wrapper added | — |
| Separation of concerns / file responsibility | Pass | One workflow file, four jobs each with one concern (CR-C1) | — |
| Ownership-driven dependency check | Pass | `needs` edges as designed; package job reads the checked outputs, not the artifact (test asserts no `download-artifact` there) | — |
| Visible dependencies (Principle 16) | Pass | Values reach jobs only through `needs` outputs and run artifacts; missing digest file fails `cat` under `set -e`; `if-no-files-found: error` | — |
| Authoritative Boundary Rule | Pass | Package job depends on publish-image's checked outputs only, not on the build artifacts (the forbidden bypass in the design's Boundary Encapsulation Map) | — |
| File placement | Pass | Existing files only | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | `build_only` refuses `release_tag` (75-79); `version_tag` written from the same variable as the first line of `tags` (127, 142) | — |
| Naming / one vocabulary | Pass | `build`, `publish-image`, `build_only`, "build-only run" match the design terminology and RELEASE.md | — |
| No unjustified duplication | Pass — deviation recorded, reason holds | Disk guard twice (design decision, CR-C6) | — |
| Patch-on-patch complexity control | Pass | Initial implementation; zh build step merged, summaries moved to `env:` (removes inline `${{ }}` in `run:`) | — |
| Dead code removed in touched files | Pass | QEMU, GHA cache, zh build step, `build-and-push`, unconditional cleanup, extraction by tag removed; old concurrency fallback `|| github.run_id` dropped (`ref_name` is always set) | — |
| Test scenarios clear and requirement-aligned | Pass | Metadata per event/variant/build-only; index check pass/fail for both modes and zh; package arch refusal, build-only version, 60-min wait; mutation check IMP-03 shows the key assertions bite | — |
| Test fixtures/helpers coherent | Pass | Reuses `extract_step`, `run_bash`, `substitute_expressions`; new `read_multiline_outputs` | — |
| No stale / compatibility-only tests | Pass | Old `needs: [prepare-release, build-and-push]`, 30-min and two-build-step assertions replaced | — |
| API/E2E readiness | Pass | Build-only dispatch command documented; downstream hints list what the run log must show (dry-run index line, disk-guard GB on arm64, skipped publish steps) | — |

## Source File Size And Structure Audit

| Source File | Non-Empty Lines Before (base) | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-server-docker.yml` | 358 | 572 | Over 500 after this change; judged not a finding (CR-C1): declarative CI job graph that can only live in its workflow file, one concern, design kept it one file, and the repo's release workflows are 602/677 | +307/-79: the two new jobs, build-only branches, index check and comments; each addition belongs to the job it sits in | Pass | Pass | No finding | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No QEMU fallback, no cache option kept |
| No legacy old-behavior retention | Pass | Test asserts retired strings are absent |
| Dead code removed (Principle 7) | Pass | See removal list above |
| Persisted-data decision followed | Pass | `Not Affected`; tag and asset names/formats unchanged |
| No dual reads/writes or old-shape fallback | Pass | — |
| Transition mechanics | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change.
- Why: REQ-008 / AC-009. RELEASE.md adds the Server Docker build-only command beside `pnpm release:test`, the per-architecture release row, the 60-minute wait, the "One Server Docker architecture failed" recovery with `--failed` and the warning against "Re-run all jobs", and `:beta` after both architectures. The docker README describes native per-architecture builds, no cache, both index checks, the arch refusal, the 60-minute wait and the build-only run. Both match the workflow.
- Files: `RELEASE.md`, `autobyteus-server-ts/docker/README.md`.

## Additional Material Premise Validation

None new or reclassified. The architecture review recorded none.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10` (simple average)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | Job graph is the designed spine; header comments state each job's role | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One owner each for plan, tags, release writes; package job reads only the checked digests | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | `build_only` refuses `release_tag`; `version_tag` one source; `<arch>_digest` outputs explicit | Build-only `release_ref` is a branch name, not the dispatched SHA (S-1, non-blocking) | Optionally pin to `GITHUB_SHA` |
| 4 | Separation of Concerns and File Placement | 9.3 | Four coherent jobs in the one workflow file | File is long (572 non-empty), in line with the other release workflows | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | One index-check function, one build step | Disk guard copied twice (designed, test-guarded) | — |
| 6 | Naming Quality and Local Readability | 9.5 | Step names and messages say what happens and what was not published | — | — |
| 7 | API/E2E Readiness | 9.5 | Build-only mode, command and log lines to check are ready | Dry-run output shape unproven until the run (U-001) | Proven by API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Tags only after both legs; check before any push; publish steps gated; tag/asset contracts preserved; 73 step tests + mutations | GitHub-only behaviors (dry-run JSON, artifacts across attempts, native arm64) not provable locally | Build-only run; AC-003/AC-007 at release |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.7 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.6 | All design removals done; stale tests updated | — | — |

## Findings

None.

Non-blocking suggestion (not a finding, no action required):
- S-1: In build-only, `RELEASE_REF="${INPUT_RELEASE_REF:-${GITHUB_SHA}}"` would pin both legs and the package job's script checkout to the dispatched commit instead of the branch head at each job's start (CR-C2). The current design choice (`GITHUB_REF_NAME`) is acceptable for a proof run on a ticket branch.

## Follow-ups

- Follow-ups this review added: None

## Classification

N/A (Pass).

## Recommended Recipient

API/E2E Engineer (primary pass rule); informational notice to the Implementation Engineer.

## Residual Risks

- U-001: native arm64 build time and the `imagetools create --dry-run` output shape (`.manifests[].platform.{os,architecture}`, `.digest`) are proven only by the build-only run (AC-001, AC-002). The check fails closed, before any tag push.
- AC-007: a `--failed` rerun attempt finding the other leg's attempt-1 digest artifact, and a rerun package job reading `publish-image`'s attempt-1 outputs, are standard Actions behaviors first exercised when a leg fails.
- R-001, R-002 accepted upstream: CLI skew after a late leg rerun; `Move beta tag` with its new treeless checkout (`filter: tree:0`, `git show ${GITHUB_SHA}:…` fetching on demand) and the upload first exercised at the next release.
- Build-only runs leave untagged per-architecture manifests in Docker Hub (DEC-004).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer` (primary), `/implementation_engineer` (informational)
- Notes: CRR-001 on IR-001 (`1b113a8313`). No findings; one optional suggestion (S-1). The digest-file naming deviation's reason holds.
