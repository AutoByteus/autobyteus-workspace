# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (revises SR-002 for ARCH-REV-001: AR-001, AR-002, suggestions S-1, S-2 adopted)
- Approved requirements baseline / revision, who approved, and approval reference: SR-001 of `requirements-doc.md`, approved by the Solution Designer within the Task's direction, user informed in this conversation on 2026-11-17
- Behavior-defining supplements and their approval references: None
- User approval of the design, when the direction requires it: `Not required` (the Task asks for no design approval; a release still needs the founder's word)
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/investigation-notes.md`
- Authorities read (2026-11-17): `references/architecture-design.md`, `references/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/DESIGN.md` (rules 1, 4, 5, 6, 12 apply), `references/project-documents.md`; `RELEASE.md` (Build-only release run, Recovery, Server Docker sections); `TESTING.md` Fresh-start build
- Project design-principle conflicts or discrepancies: none. Note: DESIGN.md rule 12 and RELEASE.md "Build-only release run" name `pnpm release:test --ref <branch>`, which dispatches only the Desktop Release; it does not build the server image. This design adds the Server Docker build-only mode and documents its command beside it (REQ-008).

## Current-State Read

`.github/workflows/release-server-docker.yml` (400 lines) has three jobs:

1. `prepare-release` (lines 38-130): resolves `release_tag`, `release_ref`, `image_name`, `normalized_tag`, `is_prerelease`, `variant_label`, `build_variant`, `tags`; a dispatch must give `release_tag` (lines 73-76).
2. `build-and-push` (lines 132-285) on `ubuntu-latest`: checkout `release_ref` with `fetch-depth: 0` (137-141); licensing check (143-144); `Check system level` gives `base_image_digest` (153-177); unconditional disk cleanup (179-190); QEMU (192-193); Buildx; Docker Hub login; two nearly identical build steps, default and zh, each `platforms: linux/amd64,linux/arm64`, `cache-from/to: type=gha,mode=max` with a per-variant scope (204-236); `Publish summary` (238-250); `Move beta tag` (252-285) after the build, fetching tags and loading `release_versions.py` from `GITHUB_SHA`.
3. `publish-server-package` (287-400), matrix `platform: [linux/amd64, linux/arm64]`, `needs: [prepare-release, build-and-push]`, default variant only, `contents: write`: full checkout (302-305), unconditional disk cleanup (312-322), `docker create --platform $PLATFORM IMAGE:TAG` + `docker cp` (324-333), archive/describe/sign (335-358), wait up to 30 min for the release (362-377), upload archive, description, signature (382-400).

Measured (investigation notes, Runtime table): the arm64 builder under QEMU is the critical path (beta.8: ~14 min of RUN steps; beta.7: ~20 min), the GHA cache export adds 11-24 min with 0 cache hits, and each package job spends ~4-5 min on checkout and disk cleanup. The ownership is healthy; the cost comes from where work runs (emulation), work that brings nothing (cache export), and oversized setup (checkout, cleanup).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: one workflow file restructured (jobs split and merged), four existing Python workflow tests updated plus new step tests, two documents (RELEASE.md, docker README). No app code, no Dockerfile change.
- Architectural risk: `High`
- Risk rationale: it changes the release/deployment pipeline that publishes public Docker tags and signed server packages: job concurrency (parallel per-architecture jobs, merge by digest), the mechanism behind the published-package guarantee (autobyteus-305/412), a new manual mode with registry pushes, and the order with the Desktop Release (wait time). Mistakes surface only on GitHub runners and at a release.
- Escalation trigger: the build-only run exceeds 30 min (AC-001) or shows a manifest/package mismatch (AC-002); `imagetools create --dry-run`, push-by-digest or artifact reuse on rerun behaves differently from this design; any need to touch the Dockerfile or the Desktop workflow.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| BuildKit log parse beta.8/beta.7 | investigation notes, Runtime table | arm64 RUN steps 4-8x slower under QEMU; cache export 664 s / 1433 s; 0 CACHED | Native per-architecture jobs; no layer cache | Native arm64 time (U-001) |
| Actions cache API | investigation notes | 87 entries under `refs/tags/v1.5.13-beta.8`; 10.2 GB | No GHA cache | — |
| `df -h /` in beta.8 build log | investigation notes | 79 GB free before cleanup | Cleanup only when free disk is low | arm64 runner's free disk |
| beta.8 package job checkout | investigation notes | 2 min 24 s for a depth-1 full checkout | Sparse, blob-filtered checkout | — |
| `release-desktop.yml:462` | `runs-on: ubuntu-24.04-arm` | Native arm64 runner already in use | Same label | — |
| `scripts/release_versions.py:208-216` | `read_tags` runs `git tag -l` | Needs local tags | Treeless full-history checkout keeps `Move beta tag` unchanged | — |
| `scripts/tests/*` | test_server_package_release.py:433-489, test_release_channel_workflow_steps.py:329-370, test_server_docker_cli_latest_defaults.py:94-105, test_docker_build_context_sources.py:123-125 | Pin `needs`, matrix, extraction call, 30-min message, `if` of Move beta tag, count of cache busters (2) and of `file:`/`context:` (2) | Tests updated with the structure | — |
| Release creation times | investigation notes | Android 6-7 min, Desktop ~30 min | 60-min package wait | — |

## Intended Change

Build each architecture natively on its own runner in parallel, push each by digest, merge both into the multi-arch tags in one small job that also moves `:beta`, and take each server package out of the per-architecture image whose digest the tag's index lists. Drop the never-hit GHA layer cache and the QEMU setup, lighten the checkouts and the disk cleanup, raise the package job's release wait to 60 min, and add a build-only dispatch mode that runs all of it without publishing.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Areas: `.github/workflows/release-server-docker.yml`; the workflow step tests in `scripts/tests/`; `RELEASE.md` (Server Docker rows/sections, Build-only release run, Recovery); `autobyteus-server-ts/docker/README.md` "GitHub Release Automation".
- Derived consumers: the Desktop Release's "Wait for the server packages" reads the six asset names (unchanged); Docker users and the launcher read the tags (unchanged); `test_*` files read the workflow text (updated). No other reader.
- Deliberately left alone: `Dockerfile.monorepo` (no `$BUILDPLATFORM` split; native modules stay built per architecture), `release-desktop.yml` (its 60-min wait suffices), `release-android.yml`, `release-ios.yml`, `scripts/desktop-release.sh` (`release:test` stays the Desktop build-only run), `build-multi-arch.sh`/`build.sh` (local builds), `scripts/server-package/*.mjs` (unchanged contracts C3), the existing Actions cache entries (age out), the beta.9 run.
- Follow-ups: None found during design.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-009; AC-001, AC-010 | Tag push `v*` | One emulated two-arch build + cache export | Native parallel builds, no cache | DS-001 |
| BEH-002 | Contract | REQ-002; AC-002, AC-003 | autobyteus-305/412 | Extract from `IMAGE:TAG --platform` | Extract from `IMAGE@<arch digest>` after the merge job checked that the tag's index lists that digest for that platform | DS-001, DS-003 |
| BEH-003 | Contract | REQ-003; AC-003 | autobyteus-412 | Desktop waits for six files | Preserved | DS-001 |
| BEH-004 | Contract | REQ-003, REQ-004; AC-004, AC-005 | RELEASE.md tag rules | Tags + forward-only `:beta` after the build | Preserved; tags created only after both builds succeed | DS-001 |
| BEH-005 | Operational | REQ-003; AC-004 | Dispatch with `release_tag` [+ `publish_zh`] | Re-publish | Preserved through the same jobs | DS-001 |
| BEH-006 | Operational | REQ-006, REQ-008; AC-007, AC-009 | `gh run rerun <run-id> --failed` | Rebuilds both | Reruns only the failed architecture's job, then merge and packages | DS-002 |
| BEH-007 | Operational | REQ-005; AC-001, AC-002, AC-006 | Dispatch with `build_only=true` | No current supported behavior | New build-only mode | DS-003 |
| BEH-008 | Operational | REQ-007; AC-008 | GitHub release missing | 30-min wait | 60-min wait | DS-001 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance`
- Current design issue found: `No` (ownership and contracts are sound; the cost is in where and how much work runs)
- Structural triggers:
  - Several kinds or forms (Principle 1) fires: one workflow serves tag push, re-publish (default, zh) and now build-only; each form is traced in the Spine Inventory and the Interface table; the zh form builds both architectures and publishes no packages.
  - Repeated coordination / duplicated steps (Principle 13): the default and zh build steps differ only in `if` and cache scope (lines 204-236). Without the cache they are identical, so they become one step (the variant reaches the build only through `base_image_digest`).
  - Legacy cleanup (Principle 8): QEMU setup and the GHA cache are removed, not kept as options.
  - Empty indirection: no composite action or reusable workflow is added for the disk guard or the digest hand-over; two short copies of the disk guard step stay inline (as the cleanup is today) because a composite action for one `df` test would be an empty layer.
  - Persisted-data transition, hidden dependency, backward dependency, vocabulary drift: ruled out (no app code or stored data).
- Deliberate deviations: None.
- Root cause classification: `No Design Issue Found` (performance: emulation, a cache that is never hit, oversized setup)
- Refactor needed now: `No` beyond the job split the change itself is.
- Evidence: investigation notes Runtime table.
- Design response: per-architecture build jobs, one merge job, lighter package jobs, build-only mode.
- Intentional deferrals and residual risk: registry cache deferred (DEC-001); `Move beta tag` and upload first exercised at the next release (R-002).

## Terminology

- **Architecture build job**: the matrix job `build` that builds and pushes one architecture's image by digest.
- **Image digest**: the digest of one architecture's image manifest as pushed; handed from the architecture build job to the merge job and the package job.
- **Merge job**: `publish-image`, which creates the multi-arch tags from the two image digests (or checks them in a dry run) and moves `:beta`.
- **Build-only run**: a `workflow_dispatch` with `build_only=true` that publishes nothing. Same words as the Desktop's build-only release run (RELEASE.md); no project glossary word changes (`GLOSSARY.md` has no release terms).

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope: QEMU setup; `type=gha` cache; the duplicate zh build step; the single two-architecture `build-and-push` job; `fetch-depth: 0` on the build checkout; unconditional disk cleanup; extraction by tag.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. Published tags and assets keep their names and formats; GHA cache entries are disposable and expire on their own.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..005, 008 | Tag push or publishing dispatch | Six package files on the GitHub release (then Desktop publishes `latest*.yml`) | The workflow's job graph (`needs`) | The release path whose time the founder sees |
| DS-002 | Primary End-to-End | BEH-006 | `gh run rerun <run-id> --failed` | Same end as DS-001 | Job graph + run artifacts | Recovery of one architecture |
| DS-003 | Primary End-to-End | BEH-007, BEH-002 | Build-only dispatch | Summary with timings, signed packages checked, nothing published | Job graph with `build_only` | Proof before merge |
| DS-004 | Bounded Local | BEH-004 | Merge job after tags exist | `:beta` moved or left | `Move beta tag` step | Forward-only rule must still decide after both builds |

## Primary Execution Spine(s)

DS-001 (release):
`Tag push -> prepare-release (metadata, tags, version_tag) -> build[amd64 on ubuntu-latest] ‖ build[arm64 on ubuntu-24.04-arm] (check, build, push by digest, digest artifact) -> publish-image (imagetools create --dry-run from both digests -> check index -> imagetools create tags -> inspect version_tag -> check index -> outputs amd64_digest/arm64_digest -> summary -> Move beta tag) -> publish-server-package[amd64] ‖ [arm64] (extract from IMAGE@needs.publish-image.outputs.<arch>_digest -> check arch -> archive/describe/sign -> wait ≤ 60 min for release -> upload) -> Desktop "Wait for the server packages" -> latest*.yml`

DS-003 (build-only):
`Dispatch build_only=true -> prepare-release (no tags; own concurrency group) -> build[amd64] ‖ build[arm64] (push by digest, untagged) -> publish-image (imagetools create --dry-run -> check index -> outputs the checked digests; no tag, no :beta) -> publish-server-package[amd64] ‖ [arm64] (extract from IMAGE@checked digest -> check arch -> archive/describe/sign with the package's own version; no wait, no upload; summary lists the files) -> run ends; its job and step timings are the ones GitHub records for every run, read with gh run view <run-id> --json jobs (AR-002 option a)`

DS-002 (rerun): `gh run rerun --failed -> failed build[arch] only (other leg's digest artifact kept in the run) -> publish-image -> publish-server-package[both]`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Metadata is resolved once, including the list of tags and the version tag. Each architecture builds natively at the same time and pushes its image untagged; its digest goes into a run artifact. Only when both succeed does the merge job check a dry-run index of exactly those two digests, push the tags `prepare-release` listed (version tag, plus `:latest`/`latest-zh` for stable), inspect the pushed version tag and check it again, then output the two checked digests and decide `:beta` with freshly fetched tags. The package jobs take each package out of the checked digest for their platform (read through `needs`), sign it and upload it once the release exists | release metadata, image digests, multi-arch index, server package | job graph | disk guard, licensing and system-level checks, summaries |
| DS-002 | GitHub reruns the failed leg and the jobs after it; the successful leg is not rerun and its digest artifact stays in the run, so the merge uses one new and one earlier digest | image digests | job graph | artifact `overwrite: true` |
| DS-003 | The same jobs with publishing switched off: digests are pushed untagged, the merge stops after the dry-run check and outputs the checked digests, packages are extracted, checked and signed but not uploaded. The timings are GitHub's own job and step timings of the run (no job writes a timing table) | as DS-001 | job graph | separate concurrency group |
| DS-004 | Unchanged script: fetch tags, load the helper from `GITHUB_SHA`, move `:beta` only for the newest recognized tag | tags | `Move beta tag` step | — |

## Spine Actors / Main-Line Nodes

`prepare-release`, `build` (matrix), `publish-image`, `publish-server-package` (matrix).

## Ownership Map

- `prepare-release`: owns the run mode (`build_only`), the release identity (tag, ref, image, variant), the tag list (`tags`) and the version tag (`version_tag`: `IMAGE:<normalized_tag>` or `IMAGE:<normalized_tag>-zh`, the first line of `tags`; empty in build-only). Only it decides what will be published; no later job rebuilds a tag name (AR-001).
- `build` (one leg per architecture): owns building and pushing that architecture's image from the release ref with the variant's pinned base digest, and recording its digest. It never tags.
- `publish-image`: owns the multi-arch index. It checks a dry-run index first (both modes), then in publish mode pushes `tags` and checks the pushed `version_tag` again. It outputs the two digests it checked (`amd64_digest`, `arm64_digest`), and owns the publish summary and the `:beta` decision.
- `publish-server-package` (one leg per architecture): owns taking the package out of the digest `publish-image` checked for its architecture (`needs.publish-image.outputs`), the arch check, archiving, describing, signing, its file summary and (when publishing) waiting and uploading. It alone has `contents: write`.
- Build-only timings: owned by GitHub's run record (job and step start/end times), read with `gh run view <run-id> --json jobs` by validation (AC-001). No job writes a timing table, and no `actions: read` permission is added.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `Set up QEMU` step | Each leg builds natively | `runs-on: ${{ matrix.runner }}` | — |
| `cache-from`/`cache-to: type=gha` (both steps) | 0 hits measured, 11-24 min export | No layer cache (DEC-001) | Revisit only on AC-001 miss |
| Separate `Build and push zh multi-arch image` step | Identical to the default step once the cache scope is gone | One `Build and push the image` step | Variant enters via `base_image_digest` |
| Job `build-and-push` | Split | `build` matrix + `publish-image` | — |
| `fetch-depth: 0` in the build checkout | History only served `Move beta tag`, which moves to `publish-image` | `fetch-depth: 1` | Licensing check uses `git ls-files` (works at depth 1) |
| Unconditional `Free runner disk space` (both jobs) | 79 GB free measured; one 2.4 GB image per job | `Free runner disk space when low` (cleanup only below 30 GB free) | Covers an unmeasured arm64 runner |
| Full checkout in the package job | It needs two paths | Sparse checkout (`scripts/server-package`, `autobyteus-server-ts/docker`), `filter: blob:none`, depth 1 | — |
| Extraction by `IMAGE:TAG` | No tag exists in build-only; digest is the same object | Extraction by `IMAGE@<digest>` after the index check | DEC-002 |

## Return Or Event Spine(s) (If Applicable)

N/A (the Desktop wait polls the release; unchanged).

## Bounded Local / Internal Spines (If Applicable)

DS-004, parent `publish-image`: `checkout (treeless, full history) -> git fetch --tags --force -> release_versions.py is-newest -> imagetools create :beta | leave` — kept byte-identical so its tests and the "later tag wins" rule hold.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Licensing check, `Check system level` | DS-001..003 | `build` | Gates before building; system level gives the base digest | Existing release gates | — |
| Disk guard | DS-001..003 | `build`, `publish-server-package` | Clean only when free disk < 30 GB | Unmeasured arm64 runner disk | Unconditional cleanup costs 1-3 min |
| Digest artifacts `server-image-digest-<arch>` | DS-001..003 | `build` -> `publish-image` | Hand each leg's digest to the merge job, also across rerun attempts | Matrix job outputs cannot carry one value per leg reliably; artifacts stay in the run across attempts | — |
| Checked digests `publish-image` outputs `amd64_digest`, `arm64_digest` | DS-001..003 | `publish-image` -> `publish-server-package` | The package jobs extract only from what the merge job checked (S-1) | Guarantee holds by construction | — |
| Summaries | all | each job | Publish plan; published tags or build-only notice with the checked digests; package file names, SHA-256 and size | Operator view | — |
| Run timings | DS-003 | validation | GitHub's own job and step times of the run (`gh run view <run-id> --json jobs`) | AC-001 before/after table | a job reading its own run's timings needs to be last and needs `actions: read` |

## Ownership Boundaries

Only `prepare-release` decides the publish plan; the other jobs read its outputs (`build_only`, `tags`, `build_variant`, ...) and never recompute them. Only `publish-image` creates tags. Only `publish-server-package` writes to the GitHub release.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `prepare-release` outputs | mode, tag list, version tag, variant | all later jobs | a later job reading `github.event.inputs.*` to decide publishing, or rebuilding a tag name from `image_name`/`normalized_tag` (AR-001) | add an output |
| `publish-image` index check and its outputs `amd64_digest`/`arm64_digest` | which digest is the tag's image per platform | `publish-server-package` | package job extracting from the tag, or downloading the digest artifact itself instead of reading the checked outputs | — |

## Dependency Rules

- `build` needs `prepare-release`; `publish-image` needs `prepare-release` and `build` (both legs: a failed leg blocks tagging, REQ-004); `publish-server-package` needs `prepare-release` and `publish-image`.
- Publishing steps (`imagetools create` without `--dry-run`, `Move beta tag`, `Wait for the GitHub release`, upload) run only when `needs.prepare-release.outputs.build_only != 'true'`.
- Collaborators reach each job through `needs` outputs and run artifacts only. No process-wide binding: `None` (Principle 16 N/A for YAML; inputs are explicit).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `workflow_dispatch` inputs: `release_tag`, `release_ref`, `image_name`, `publish_zh` (unchanged), `build_only` (new boolean, default `false`) | run mode | publish a tag, or build only | `build_only=true` refuses a `release_tag` (error: build-only publishes nothing; omit release_tag); `release_ref` defaults to the dispatch ref | `publish_zh` with `build_only` builds the zh variant |
| `prepare-release` output `build_only` (`true`/`false`) | run mode | the one switch later jobs read | string | `tags`, `version_tag`, `release_tag`, `normalized_tag` empty in build-only |
| `prepare-release` output `version_tag` (new) | the version tag of this variant | the tag the index check inspects after the push | `IMAGE:<normalized_tag>` (default) or `IMAGE:<normalized_tag>-zh` (zh); written by the same code that writes the first line of `tags` | AR-001 |
| Artifact `server-image-digest-<arch>` (`amd64`, `arm64`) | one architecture's image digest | file `digest` with `sha256:...`, read only by `publish-image` | per arch | `overwrite: true` |
| `publish-image` outputs `amd64_digest`, `arm64_digest` (new) | the checked per-architecture digests | the package jobs' extraction source | `sha256:...` | S-1; package job selects with `needs.publish-image.outputs[format('{0}_digest', matrix.arch)]` |
| Concurrency group | run serialization | releases of one tag serialize; build-only never queues behind a release | `server-docker-release-<release_tag or ref_name>`; build-only: `server-docker-build-only-<run_id>` | protects beta.9-like runs |

Nothing added only forwards.

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `build_only` input/output | Yes | Yes | Low | refuse `release_tag` with it |
| digest artifacts | Yes | Yes (arch in the name) | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Architecture build job | `build`, "Build Server Image (linux/amd64)" | Yes | Yes | Low | — |
| Merge job | `publish-image`, "Publish Server Image" | Yes | Yes | Low | — |
| Package job | `publish-server-package` (unchanged id) | Yes | Yes; in build-only it also runs but publishes nothing, which its summary states | Low | — |
| Mode | `build_only` | Yes | Same word as RELEASE.md's "build-only release run" | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| arm64 runner | `ubuntu-24.04-arm` (Desktop) | Reuse | proven | — |
| Multi-arch assembly | `docker buildx imagetools create` (already used for `:beta`) | Reuse | same tool | — |
| Tag decision | `release_versions.py is-newest` | Reuse unchanged | — | — |
| Package scripts | `scripts/server-package/*.mjs` | Reuse unchanged | C3 contract frozen | — |
| Cross-job values | `actions/upload-artifact@v4` / `download-artifact@v4` | Create New (in this workflow) | Docker's documented multi-runner pattern | Matrix outputs cannot hold one value per leg |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Release workflows (`.github/workflows/`) | the job graph | DS-001..004 | — | Extend | one file |
| Workflow tests (`scripts/tests/`) | step behaviour with fakes | — | — | Extend | — |
| Release docs | operator instructions | — | — | Extend | RELEASE.md, docker README |

## Draft File Responsibility Mapping

See Final mapping (no extraction needed).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Disk guard step in two jobs | none (inline) | workflow | 5 lines; a composite action would be an empty layer | Yes | Yes | a generic "setup" action |
| Index check (dry-run JSON vs pushed tag) | one step script, input = index JSON | `publish-image` | the same check for both modes | Yes | Yes | two checks |

## Shared Structure / Data Model Tightness Check

N/A (no shared types).

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-server-docker.yml` | Release workflows | job graph | Server Docker release and build-only run | one workflow | — |
| `scripts/tests/test_release_channel_workflow_steps.py` | Workflow tests | — | metadata resolution (incl. build-only), `Move beta tag` | existing | `extract_step` |
| `scripts/tests/test_server_package_release.py` | Workflow tests | — | package job, index check | existing | `extract_step` |
| `scripts/tests/test_server_docker_cli_latest_defaults.py` | Workflow tests | — | one cache-busted build step | existing | — |
| `scripts/tests/test_docker_build_context_sources.py` | Workflow tests | — | one `file:`/`context:` pair | existing | — |
| `RELEASE.md`, `autobyteus-server-ts/docker/README.md` | Release docs | — | what runs, build-only, rerun | existing | — |

## Applied Patterns (If Any)

Fan-out / fan-in by digest (Docker "distribute build across multiple runners").

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-server-docker.yml` | File | job graph | as below | existing | secrets in `run` output; QEMU; GHA cache |

Target job layout (implementation guidance, not literal YAML):

```yaml
on.workflow_dispatch.inputs:
  build_only: { type: boolean, default: false, description: "Build and check both architectures and packages; publish nothing" }
concurrency:
  group: ${{ github.event.inputs.build_only == 'true' && format('server-docker-build-only-{0}', github.run_id) || format('server-docker-release-{0}', github.event.inputs.release_tag || github.ref_name) }}

prepare-release:     # + outputs build_only and version_tag (= first line of tags: IMAGE:<normalized_tag>[-zh]); build-only: release_tag refused, release_ref = input or GITHUB_REF_NAME, tags/version_tag/normalized_tag empty, summary says "Build only: nothing is published"
build:               # name: Build Server Image (${{ matrix.platform }})
  strategy: { fail-fast: false, matrix: { include: [ {platform: linux/amd64, arch: amd64, runner: ubuntu-latest}, {platform: linux/arm64, arch: arm64, runner: ubuntu-24.04-arm} ] } }
  runs-on: ${{ matrix.runner }}
  steps: checkout(release_ref, depth 1) -> licensing -> node -> Check system level (unchanged) -> Free runner disk space when low
         -> buildx -> login -> Build and push the image:
              platforms: ${{ matrix.platform }}; build-args unchanged (BASE_IMAGE_DIGEST, CLI_INSTALL_CACHE_BUSTER=${{ github.run_id }})
              outputs: type=image,name=<image_name>,push-by-digest=true,name-canonical=true,push=true; provenance/sbom false; no cache
         -> write steps.build.outputs.digest to $RUNNER_TEMP/digest -> upload-artifact server-image-digest-${{ matrix.arch }} (overwrite: true)
publish-image:       # name: Publish Server Image; needs [prepare-release, build]
  outputs: amd64_digest, arm64_digest   # the digests the step below checked (S-1)
  steps: download digests -> buildx -> login
         -> Create and check the multi-arch image (one run block with one check function, used twice in publish mode):
              both modes: imagetools create --dry-run -t <first tag, or IMAGE:build-only in build-only> IMAGE@amd64 IMAGE@arm64 > dry-run index; check it   # fails before any tag is pushed (S-2)
              publish:    imagetools create -t <each line of needs.prepare-release.outputs.tags> IMAGE@amd64 IMAGE@arm64
                          imagetools inspect --raw "$VERSION_TAG" (needs.prepare-release.outputs.version_tag) > pushed index; check it   # never rebuilt from normalized_tag (AR-001)
              check:      the index lists exactly linux/amd64 -> amd64 digest and linux/arm64 -> arm64 digest, else fail
              then write amd64_digest / arm64_digest to GITHUB_OUTPUT
         -> Publish summary (publish: tags; build-only: "nothing published" and the checked digests)
         -> checkout (default ref, fetch-depth 0, filter tree:0, sparse scripts) + Move beta tag (unchanged run block)
              if: build_variant == '' && build_only != 'true'
publish-server-package:  # needs [prepare-release, publish-image]; if build_variant == ''; matrix include {platform, arch, package_arch: x64|arm64}
  steps: sparse checkout(release_ref: scripts/server-package, autobyteus-server-ts/docker; blob:none; depth 1) -> node -> Free runner disk space when low
         -> Extract the built-in server package: DIGEST = needs.publish-image.outputs[format('{0}_digest', matrix.arch)];
              docker create --platform $PLATFORM --name server-package-source "$IMAGE_NAME@$DIGEST"; docker cp; docker rm   # no artifact download here
         -> Archive, describe and sign: refuse when server-package.json arch != package_arch; VERSION = normalized_tag, or in build-only the package's own version
         -> Wait for the GitHub release (publish only; 120 x 30 s = 60 min; message "within 60 minutes")
         -> Upload (publish only; unchanged order)
         -> build-only: summary lists the three files with archive SHA-256 and size; nothing uploaded
```

No job writes a timing table: the build-only proof reads GitHub's own job and step timings with `gh run view <run-id> --json jobs` (AR-002, option a). The workflow keeps `permissions: contents: read` with `contents: write` on the package job only.

## Folder Boundary Check

N/A (no new folders).

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Tag only after both builds | `publish-image` needs both legs, then `imagetools create -t 1.5.14 IMAGE@a IMAGE@b` | each leg pushing `IMAGE:1.5.14` for its platform | the second push overwrites the first, and a failed leg leaves a single-architecture tag |
| Package source | `docker create IMAGE@sha256:<arm64 digest>` after the index check | `docker create IMAGE:1.5.14 --platform linux/arm64` in build-only (no tag) or extracting from an unchecked digest | one extraction path for both modes, explicit link to the tag |
| Build-only concurrency | `server-docker-build-only-<run_id>` | `server-docker-release-v1.5.13-beta.9` | a build-only run with a tag-named group would queue behind or ahead of that release |
| Which tag the check inspects | `imagetools inspect --raw "${VERSION_TAG}"` with `VERSION_TAG: ${{ needs.prepare-release.outputs.version_tag }}`: for a zh re-publish of v1.5.12 it is `IMAGE:1.5.12-zh` | `imagetools inspect --raw "${IMAGE_NAME}:${NORMALIZED_TAG}"` | the rebuilt name is the default variant's tag, so every zh re-publish would fail after pushing (AR-001) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep QEMU single-job build as a fallback input | "in case the arm runner is unavailable" | Rejected | arm runner is GitHub-hosted and already used; a runner outage is a platform failure handled by rerun |
| Keep GHA cache scope | "might help later" | Rejected | 0 hits measured; registry cache only on AC-001 miss |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Workflow: add `build_only` input, concurrency expression, `prepare-release` mode handling.
2. Replace `build-and-push` with the `build` matrix (one build step, push by digest, digest artifact) and `publish-image` (create/dry-run, index check, summary, `Move beta tag` with its own treeless checkout).
3. Rework `publish-server-package`: needs, matrix include, sparse checkout, disk guard, checked digest from `needs.publish-image.outputs` (no artifact download), extraction by digest, arch check, build-only version, 60-min wait, publish-only wait/upload, build-only summary.
4. Update and extend tests: metadata (build-only outputs, refusal of `release_tag` with build-only, `version_tag` equal to the first line of `tags` for default stable, default beta, zh stable and zh beta, concurrency text), package job (needs `publish-image`, extraction call by the digest from `needs.publish-image.outputs`, arch mismatch refusal, build-only version, wait 60 min message, wait/upload skipped by `if`), index check step with fake docker JSON (match passes; swapped or missing digest fails before any non-dry-run `imagetools create`; in publish mode the inspected tag is `version_tag`, with a zh case where it is `IMAGE:<version>-zh`; outputs `amd64_digest`/`arm64_digest` written only after the checks pass), `Move beta tag` `if` string, cache buster count 1, `file:`/`context:` count 1. Run `python3 -m unittest` for the four files.
5. Docs: RELEASE.md (release table text where it says the build; "Build-only release run": add the server command `gh workflow run release-server-docker.yml --ref <branch> -f build_only=true` for changes to `release-server-docker.yml` or `autobyteus-server-ts/docker/**`; Recovery: rerun a failed architecture with `gh run rerun <run-id> --failed`, which reruns only that architecture's build job and then `Publish Server Image` and the package jobs; nothing is tagged until both architectures succeed; the 30-minute wait text becomes 60), docker README "GitHub Release Automation".
6. Validation (API/E2E): push the branch, dispatch the build-only run, record the before/after table from `gh run view <run-id> --json jobs` (beta.8 44047761247, beta.9 44123354990 once finished, new run), check Docker Hub tags and the beta.9 release assets are unchanged by it.
7. RELEASE.md Recovery also says: use `gh run rerun <run-id> --failed`, not "Re-run all jobs", which rebuilds both architectures and re-pushes the version tag with new digests.

## Key Tradeoffs

- No layer cache: simpler and faster on measured data; gives up ~1-2 min of potential reuse.
- Package jobs still pull a 2.4 GB image instead of taking the package from the build leg's own output: keeps the guarantee ("from the published image") at ~1 min cost.
- Build-only pushes untagged images to the public repository (DEC-004) rather than diverging from the release path.

## Risks

- R-001 CLI version skew between architectures after a late leg rerun (accepted).
- R-002 `Move beta tag` checkout change and the upload path are first exercised at the next release (PM verifies; step script unchanged and unit-tested).
- `imagetools create --dry-run` output shape: the index check must parse what the tool prints; validated by the build-only run.
- arm64 runner queueing: GitHub-hosted arm64 capacity; a long queue shows as job wait time in the timing table.

## Guidance For Implementation

- Reproduction to start from: `None` (CI timing); the build-only run is the proof.
- Keep `Move beta tag`'s run block byte-identical; change only its `if` and give its job a checkout that has full history.
- Keep every secret only in `env:`/`with:` as today; never echo digests of secrets; digests and image names are not secret.
- The `docker/build-push-action@v6` output `digest` is the image manifest digest when `provenance: false` (no attestation index); keep `provenance: false` and `sbom: false`.
- Actions rule: `gh run rerun --failed` reruns failed jobs and their dependents; the successful leg's artifact must still be found by `download-artifact` (use the run's artifacts by name, `pattern: server-image-digest-*`, `merge-multiple: true`).
