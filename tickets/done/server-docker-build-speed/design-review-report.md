# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/requirements-doc.md` (Approved, SR-001)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed: None (none exist)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: `Revised Architecture Design Complete` (SR-003) from `/solution_designer`, 2026-11-17, in response to ARCH-REV-001
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail: AR-001, AR-002)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree at `origin/personal` 1fdca761aa. Opened: `.github/workflows/release-server-docker.yml` (all 400 lines), `autobyteus-server-ts/docker/Dockerfile.monorepo` 45-69, `scripts/server-package/check-system-level.mjs` 13-36, `scripts/server-package/describe-server-package.mjs` 1-139 (version checks), `scripts/check_licensing.py` 97-107, 251-261, `scripts/release_versions.py` 200-216, `.github/workflows/release-desktop.yml` 459-462, `scripts/tests/test_server_package_release.py` 425-440, 487, `scripts/tests/test_release_channel_workflow_steps.py` 325-372, `scripts/tests/test_docker_build_context_sources.py` 124-125, `scripts/tests/test_server_docker_cli_latest_defaults.py` 94-105, `DESIGN.md` rules 1-10.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: one workflow restructured, four tests, two docs (Medium); it changes the deployment pipeline that publishes public Docker tags and signed packages, the mechanism behind the autobyteus-305/412 guarantee, job concurrency, and adds a registry-pushing mode (High).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Make the Server Docker Release ≤ 30 min (REQ-001) by native per-architecture builds and dropping the never-hit layer cache, while keeping the tags, the six files, the package guarantee and the `:beta` rule (REQ-002..004), adding a build-only mode (REQ-005), per-architecture rerun (REQ-006) and a 60-min release wait (REQ-007).
- Relevant existing behavior and evidence confirmed: Yes. Workflow lines 132-285 (one QEMU job, GHA cache, two variant build steps differing only in `if` and cache scope, `Move beta tag` after the build), 290-400 (package matrix, full checkout, unconditional cleanup, extraction from `IMAGE:TAG --platform`, 30-min wait, upload order).
- Scope guardrail confirmed: Yes (UC-001..004; Dockerfile, Desktop/Android/iOS workflows, beta.9 run, cache deletion and local scripts out of scope; preserved BEH-002..005).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`
- Remaining material ambiguity: None.
- Statements about existing code the design relies on, opened at their cited lines:
  - `check_licensing.py` uses `git ls-files` and `git rev-parse --show-toplevel` only (97-107, 251-261): works at depth 1. Confirmed.
  - `check-system-level.mjs` reads only files in `autobyteus-server-ts/docker` (17, 32-36), no git history: works at depth 1. Confirmed (the design relies on this implicitly for the depth-1 build checkout).
  - `release_versions.py read_tags` runs `git tag -l` (208-216). Confirmed.
  - Package scripts need only `scripts/server-package/` and the public key under `autobyteus-server-ts/docker` (describe/sign import only `node:` modules). Confirmed; the sparse checkout is sufficient.
  - The image's `server-package.json` version comes from `autobyteus-web/package.json` (Dockerfile 64-67) and `describe ... description` refuses a different `--version` (describe 115-118). So "build-only uses the package's own version" passes the same check. Confirmed.
  - `ubuntu-24.04-arm` in `release-desktop.yml:462`. Confirmed.
  - Tests pin `needs: [prepare-release, build-and-push]` (test_server_package_release.py:436), "within 30 minutes" (487), two `file:`/`context:` (test_docker_build_context_sources.py:124-125). Confirmed.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass (index check inspects `version_tag` from `prepare-release`; AR-001 resolved) | Confirmed | — |
| BEH-005 | Operational | Pass | Pass | Pass (zh re-publish inspects `IMAGE:<v>-zh`; zh test case planned) | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass (`fail-fast: false`, artifacts per run with `overwrite: true`, merge needs both legs) | Confirmed | — |
| BEH-007 | Operational | Pass | Pass | Pass (timings are GitHub's run record, read with `gh run view --json jobs`; AR-002 resolved) | Confirmed | — |
| BEH-008 | Operational | Pass | Pass | Pass | Confirmed | — |

The behavior basis is confirmed. SR-003 rewords REQ-005 ("Its job and step timings are readable from the run (GitHub's run record, `gh run view <run-id> --json jobs`)" instead of "It reports its step timings"). The intent stays the same: timings are available for the before/after comparison that AC-001 already reads the same way. So this is a clarification within the SR-001 approval, not a behavior change.

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | design-spec "Task Design Health Assessment" (Performance) | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; causes are emulation, a 0-hit cache export (664 s / 1433 s), oversized setup, all measured in the Runtime table | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "No beyond the job split the change itself is" | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, target job layout, merge of the duplicate build step | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary (release) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary (rerun) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Primary (build-only) | Pass | Pass | N/A | Pass | Pass (the run ends after the package jobs; timings are owned by GitHub's run record and read by validation) | Pass | Pass |
| DS-004 | Bounded local (`Move beta tag`) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `prepare-release` outputs (mode, tag list, `version_tag`, variant) | Pass | Pass | Pass | Pass | `version_tag` is written by the same code as the first line of `tags`; rebuilding a tag name is named as a forbidden bypass (AR-001 resolved) |
| `publish-image` index check and outputs `amd64_digest`/`arm64_digest` | Pass | Pass | Pass | Pass | Package jobs read the checked digests through `needs` (S-1 adopted); the dry-run index is checked before any tag push (S-2 adopted). Change Sequence step 3 still says "digest download" for the package job: stale text, superseded by the target layout and the Boundary Encapsulation Map (see Residual Risks) |
| `publish-server-package` (sole `contents: write`) | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Job graph (`needs`) | Pass | Pass | Pass | Pass | `publish-image` needs both legs (REQ-004); packages need `publish-image`; publishing steps gated on `build_only != 'true'` from `prepare-release` only |

Principle 16: `Pass` (YAML jobs; collaborators reach jobs only through `needs` outputs and run artifacts; no process-wide binding).

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `build_only` input / `prepare-release` output | Pass | Pass | Pass (refuses `release_tag`) | Low | Pass |
| Artifact `server-image-digest-<arch>` (read only by `publish-image`) | Pass | Pass | Pass | Low | Pass |
| `prepare-release` output `version_tag` | Pass | Pass | Pass (`IMAGE:<v>` or `IMAGE:<v>-zh`; empty in build-only) | Low | Pass |
| `publish-image` outputs `amd64_digest`, `arm64_digest` | Pass | Pass | Pass (`sha256:...`, selected by `matrix.arch`) | Low | Pass |
| Concurrency group expression | Pass | Pass | Pass (`server-docker-build-only-<run_id>` vs `server-docker-release-<tag or ref>`) | Low | Pass |

Empty indirection check: `N/A` (no interface, composite action or reusable workflow added; the decision to keep the disk guard inline is sound).

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| arm64 runner | Pass | Pass | N/A | Pass | Desktop's `ubuntu-24.04-arm` |
| Multi-arch assembly | Pass | Pass | N/A | Pass | `imagetools create`, already used for `:beta` |
| `:beta` decision | Pass | Pass | N/A | Pass | `Move beta tag` run block byte-identical |
| Package scripts | Pass | Pass | N/A | Pass | unchanged |
| Cross-job digests | Pass | Pass | Pass | Pass | build -> merge by artifact (Docker's multi-runner pattern); merge -> packages by job outputs |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Release workflows | Pass | Pass | Pass | Pass | one file |
| Workflow tests | Pass | Pass | Pass | Pass | default/zh stable/beta `version_tag` cases and a zh index-check case planned (step 4) |
| Release docs | Pass | Pass | Pass | Pass | — |

Kinds and entry forms traced: tag push (default), dispatch re-publish default, dispatch re-publish zh, build-only default, build-only zh, rerun. All traced, and all pass in SR-003.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Default/zh build steps | Pass | N/A | Pass | Pass | merged into one step |
| Disk guard (two jobs) | Pass | Pass (inline) | Pass | Pass | — |
| Index check for both modes | Pass | Pass (one step) | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

N/A (no shared types or schemas change; asset and tag formats unchanged).

Derived consumers of a changed structure listed with a decision for each: `Pass` (Desktop wait, Docker users/launcher, tests).

Vocabulary (Principle 15): `Pass` ("build-only run" keeps its RELEASE.md meaning; "image digest", "merge job" used consistently).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-server-docker.yml` | Pass | Pass | N/A | Pass | — |
| `scripts/tests/*` (four files) | Pass | Pass | N/A | Pass | — |
| `RELEASE.md`, docker README | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing files only | Pass | Pass | Low | Pass | no new folders |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| QEMU, GHA cache, zh build step, `build-and-push` job, `fetch-depth: 0`, unconditional cleanup, full package checkout, extraction by tag | Pass | Pass | Pass | Pass | No dead code found in the touched workflow beyond these |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| QEMU fallback, GHA cache scope | No | Pass | Pass | both rejected in the rejection log |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Docker Hub tags, release assets, Actions cache | `Not Affected` | Pass | Pass | N/A | Pass | Names and formats unchanged; cache entries disposable |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Workflow, tests, docs, build-only validation | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tag only after both builds | Yes | Pass | Pass | Pass | — |
| Package source by digest | Yes | Pass | Pass | Pass | — |
| Build-only concurrency | Yes | Pass | Pass | Pass | — |
| Target job layout | Yes | Pass | N/A | Pass | — |
| Which tag the check inspects | Yes | Pass | Pass | Pass | added in SR-003 |

## Material Premise Validation (Only When Needed)

None. The ARCH-REV-001 findings sat on approved scenarios (SCN-002 zh re-publish; SCN-003 build-only).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, AR-001 and AR-002 are resolved in the current design spec, and no in-scope machinery depends on an unsupported premise.

## Findings

None open. AR-001 and AR-002 are `Resolved` (ARCH-REV-002 prior-finding table in `architecture-review-revision-record.md`).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- Stale text, non-blocking: design-spec Change Sequence step 3 still lists "digest download" for `publish-server-package`. The target layout ("no artifact download here"), the Boundary Encapsulation Map (downloading the artifact is a forbidden bypass) and step 4's tests are authoritative: the package job reads `needs.publish-image.outputs[format('{0}_digest', matrix.arch)]` and downloads no artifact. The Risks bullet's "timing table" means the validation's before/after table from `gh run view`, not a workflow job.
- U-001 native arm64 build time and the `imagetools create --dry-run` output shape: validated only by the build-only run (AC-001/AC-002).
- R-001 CLI skew after a late leg rerun; R-002 `Move beta tag` and upload first exercised at the next release: accepted upstream.
- When a package job alone is rerun, it relies on GitHub keeping `publish-image`'s outputs from the earlier attempt for the jobs that depend on it. This is standard rerun behavior; it is exercised when it first happens (AC-007).
- "Re-run all jobs" re-pushes the version tag with new digests, as any re-publish does today (BEH-005). Change Sequence step 7 makes RELEASE.md name `--failed`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: ARCH-REV-002 on SR-003. AR-001 and AR-002 resolved; S-1 and S-2 adopted. Classification `Medium`/`High` confirmed. Implementation should follow the target layout over the stale step-3 wording.
