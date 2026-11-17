# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (REQ-005 wording clarified for AR-002; intended behavior unchanged, SR-001 approval applies)
- Package identifier: `server-docker-build-speed`
- Request / ticket: Project Task `autobyteus-520` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), FU-002 of the beta.9 release (autobyteus-519, `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.13-beta.9/tickets/done/release-v1.5.13-beta.9/follow-ups.md`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), relaying the founder's request of 2026-11-17
- Requirements owner: Solution Designer
- Date: 2026-11-17
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: SR-001 entry in `solution-revision-record.md` and the Solution Designer's message to the user of 2026-11-17 in this conversation
- Exact approved requirements baseline / solution revision: SR-001
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: the Server Docker Release now takes 39-60 minutes per release (beta.6-beta.8) and more than 100 minutes for beta.9. Every release waits for it, because the Desktop Release publishes the desktop updater files only after the six server package files are on the GitHub release. Measured causes: linux/arm64 is built under QEMU emulation (its builder stage takes 14-20 min against ~3 min natively), and the GitHub Actions layer cache costs 11-24 min to export while no release ever reuses it (0 cache hits in beta.7 and beta.8; the cache is per tag ref and over the 10 GB limit).
- Affected actors or systems: the founder and delivery engineers, Docker users, desktops and Docker nodes updating to a new version, other workflows' caches.
- Desired outcome: the Server Docker Release finishes in well under the founder's one-hour baseline, publishing exactly what it publishes today, with the same guarantee that each published server package is the published image's own.
- Observable definition of success: a build-only run of the new workflow shows the new total time and a before/after table of step timings against beta.8 and beta.9; the next release uses the new workflow and publishes the same tags and the same six files.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-002 | One job builds both architectures, arm64 emulated, then exports a layer cache that is never reused; run 39-60+ min | Each architecture builds natively and in parallel; no build time spent on a cache that is not reused; run ≤ 30 min | Same image content and Dockerfile; CLI install cache buster | Runtime table, investigation notes |
| BEH-002 | Contract | SCN-001, SCN-002, SCN-003 | Package taken out of the pushed tag's image per platform | Package taken out of the per-architecture image that the published tag points to for that platform, with that link checked before publishing | "The published package is the image's own" (autobyteus-305/412) | Workflow lines 287-358 |
| BEH-003 | Contract | SCN-001 | Desktop waits ≤ 60 min for the six files, then publishes `latest*.yml` | Unchanged; the six files arrive much earlier | All `latest*.yml` newer than the six files | release-desktop.yml 700-756 |
| BEH-004 | Contract | SCN-001, SCN-002 | Version tag, `:latest` for stable only, forward-only `:beta` decided after the build, zh manual with no `:beta` and no packages | Unchanged | RELEASE.md 498-502 | Workflow, tests |
| BEH-005 | Operational | SCN-002 | Manual dispatch with `release_tag` (and `publish_zh`) re-publishes a tag | Unchanged | Re-publish replaces the package files | Workflow inputs |
| BEH-006 | Operational | SCN-004 | A failed build reruns both architectures | Rerunning the failed jobs rebuilds only the failed architecture, then completes the publish | `gh run rerun <run-id> --failed` stays the recovery command | RELEASE.md 375-380 |
| BEH-007 | Operational | SCN-003 | No current supported behavior (every dispatch publishes) | A manual build-only mode builds and checks everything, publishing nothing | — | Workflow inputs |
| BEH-008 | Operational | SCN-001 | Package job waits ≤ 30 min for the GitHub release | Waits ≤ 60 min, so a fast server run still meets a release that only the Desktop Release creates (~30 min) when the Android release fails | Upload order: archive, description, signature | Release creation times |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Founder | Releases ship fast | Server run ≤ 30 min | No release without his word |
| Delivery engineer | Runs and recovers releases | Clear rerun of one failed architecture; same release checks | Never move or delete a published tag |
| Docker users / launcher | Pull `X.Y.Z`, `:beta`, `:latest` | Same tags, same multi-arch images | Tag rules unchanged |
| Docker nodes / desktops | Update to the new version | Same six signed files, before `latest*.yml` | Package is the image's own |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A tag push publishes the server image, its tags and the server packages | SCN-001 |
| UC-002 | A manual dispatch re-publishes a tag (default or zh variant) | SCN-002 |
| UC-003 | A manual build-only dispatch proves the build without publishing | SCN-003 |
| UC-004 | A delivery engineer reruns one failed architecture | SCN-004 |

### Out Of Scope

- The Dockerfile's content and the image's content (system part, CLIs, server package layout).
- Building the server package apart from Docker (withdrawn by the founder).
- The Desktop, Android and iOS workflows (the Desktop's 60-minute wait stays).
- The beta.9 release in progress (run 44123354990) and any published tag.
- Deleting existing Actions cache entries (they age out).
- The local `build-multi-arch.sh` script.

### Non-Goals

- A layer cache. Measured reuse was zero; a registry cache stays a later option only if the build-only run misses the target.
- Bit-identical images across architectures for the CLI layer (each architecture installs the "latest" CLIs at its own build time, as today).

### Preserved Behavior Boundary

BEH-002, BEH-003, BEH-004, BEH-005; REQ-002, REQ-003, REQ-004; AC-002, AC-003, AC-004, AC-005. Cross-cutting: no secret is printed; nothing is published unless today's workflow would publish it.

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | A Server Docker Release run of the default variant, from start to the six package files ready (excluding time spent waiting for the GitHub release to exist), takes at most 30 minutes in a normal run. | BEH-001 | Must | Founder: "earlier ... one hour, now way more"; Desktop waits ≤ 60 min | Measured: amd64 builder ~3 min natively vs arm64 14-20 min emulated; cache export 11-24 min with 0 hits; package jobs ~4-5 min of checkout/cleanup overhead. Native arm64 build time is confirmed by the build-only run (U-001) | Task; DEC-006 |
| REQ-002 | Each published server package is the server package inside the image that the published version tag points to for that architecture, and the workflow checks this link before uploading. | BEH-002 | Must | autobyteus-305/412 guarantee | N/A | Task; DEC-002 |
| REQ-003 | The workflow publishes the same Docker tags under the same rules (version tag; `:latest` only for stable; forward-only `:beta` decided after both builds with freshly fetched tags; zh manual with `-zh` tags, no `:beta`, no packages) and the same six package files with the same names, description and signature format. | BEH-003, BEH-004 | Must | RELEASE.md contract | N/A | Task |
| REQ-004 | No tag is pushed unless both architectures built successfully; a published tag is never moved or deleted except the existing forward-only `:beta` and `:latest` rules. | BEH-004 | Must | Never move or delete a published tag; no half-architecture tag | N/A | Task |
| REQ-005 | A manual build-only mode builds both architectures exactly as a release does, assembles and checks the multi-arch manifest without pushing a tag, and takes out, describes and signs both server packages, publishing nothing: no tag, no `:beta`/`:latest` move, no GitHub release change. Its job and step timings are readable from the run (GitHub's run record, `gh run view <run-id> --json jobs`). It never waits for or blocks a release run. | BEH-007 | Must | Task: prove with a build-only run | N/A | Task; DEC-003, DEC-004 |
| REQ-006 | When one architecture fails, rerunning the run's failed jobs rebuilds only that architecture and then completes the publish using the other architecture's earlier result. | BEH-006 | Should | Task: RELEASE.md says how to rerun a failed architecture | N/A | Task |
| REQ-007 | The package job waits up to 60 minutes for the GitHub release to exist. | BEH-008 | Should | A faster server run must still meet a release the Desktop Release creates when Android fails | Measured: Android creates the release at 6-7 min, Desktop at ~30 min | DEC-005 |
| REQ-008 | RELEASE.md and the docker README say what changed, the build-only mode, and how to rerun a failed architecture. | BEH-006, BEH-007 | Must | Task Done-when | N/A | Task |
| REQ-009 | No secret appears in logs or summaries; secrets are used only where they are used today (Docker Hub login, package signing). | BEH-001 | Must | Task constraint | N/A | Task |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | BEH-001, SCN-003 | Build-only dispatch from the ticket branch before merge | Run succeeds; total ≤ 30 min; a table compares its job/step timings with beta.8 (44047761247) and beta.9 (44123354990) | Total > 30 min: `Design Impact` back to the Solution Designer with the timings | Real GitHub run, timings from `gh run view --json jobs` |
| AC-002 | REQ-002, REQ-005 | BEH-002, SCN-003 | Same build-only run | Each package job takes the package out of its architecture's pushed image (by digest), and `server-package.json` `arch` is `x64` for amd64 and `arm64` for arm64; the merge check shows an index with exactly those two digests for linux/amd64 and linux/arm64 | Mismatch fails the job | Build-only run log and summary; unit tests of the steps |
| AC-003 | REQ-002, REQ-003, REQ-004 | BEH-002, BEH-004, SCN-001 | Next release tag push (founder's word) | Tags as before; the version tag's index lists the two per-architecture digests that the package jobs extracted from; six files uploaded; all `latest*.yml` newer than them | — | Next release, PM verifies; delivery checks assets and Docker Hub tags |
| AC-004 | REQ-003 | BEH-004 | Workflow step tests | `:beta` moves only for the newest recognized tag, after both builds; zh publishes `-zh` tags with no `:beta` and no packages; stable also gets `:latest` | — | `scripts/tests/test_release_channel_workflow_steps.py`, `test_server_package_release.py` updated and passing |
| AC-005 | REQ-004 | BEH-004 | One architecture's build fails | No tag pushed, no `:beta` move, no package uploaded | — | Workflow structure (merge job needs both builds); test |
| AC-006 | REQ-005 | BEH-007, SCN-003 | Build-only dispatch | No Docker Hub tag created or moved; no GitHub release asset changed; concurrency group differs from any release's | — | Run summary; Docker Hub tag list and release assets unchanged; workflow test |
| AC-007 | REQ-006 | BEH-006, SCN-004 | One architecture failed | `gh run rerun <run-id> --failed` reruns only that architecture's build job and the jobs after it; the publish completes | — | Workflow structure and RELEASE.md; exercised when it first happens |
| AC-008 | REQ-007 | BEH-008 | GitHub release missing | Package job polls up to 60 min, then fails with an error naming the tag | — | `test_server_package_release.py` |
| AC-009 | REQ-008 | — | Docs sync | RELEASE.md and the docker README describe the per-architecture jobs, the build-only mode, the dropped cache and the rerun of a failed architecture | — | Review of the docs diff |
| AC-010 | REQ-009 | — | Any run | No secret value in logs (GitHub masking plus no `echo` of secrets) | — | Code review of the workflow; run logs |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Delivery engineer on the founder's word | Publish a release | Tag push `v*` | Tag on `personal` | Build both architectures -> publish tags -> move `:beta` if newest -> six package files on the release -> Desktop publishes `latest*.yml` | Release complete in ≤ 30 min for the server part | One architecture fails: nothing tagged; SCN-004 | Supported Normal Scenario | RELEASE.md | REQ-001..004, 007, 009; AC-003..005, 008 |
| SCN-002 | Operational | Delivery engineer | Re-publish a tag (default or zh) | `workflow_dispatch` with `release_tag` [+ `publish_zh`] | Tag exists | As SCN-001 for that variant | Same as today, faster | — | Supported Normal Scenario | RELEASE.md, docker README | REQ-003; AC-004 |
| SCN-003 | Operational | Engineer proving a workflow change | Measure and check without publishing | `workflow_dispatch` with build-only on a branch | Branch pushed | Build both architectures -> check the multi-arch manifest -> take out, describe and sign both packages -> summary | Nothing published; timings reported | Any failure fails the run | Supported Normal Scenario (Task asks for it) | Task autobyteus-520 | REQ-005; AC-001, 002, 006 |
| SCN-004 | Operational | Delivery engineer | Recover a failed architecture | `gh run rerun <run-id> --failed` | One architecture failed | Rerun that architecture -> merge -> packages | Publish completes | A second identical failure is ours (RELEASE.md triage) | Supported Explicit Edge Scenario (RELEASE.md recovery) | RELEASE.md 335-380 | REQ-006; AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A, CI workflow only.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-001 | Performance | ≤ 30 min from run start to six package files ready (excluding the wait for the release to exist); expected ~15 min | Default variant, GitHub-hosted runners | Build-only run timings |
| QR-002 | REQ-009, AC-010 | Security | No secret in logs | All runs | Review |
| QR-003 | REQ-004, AC-005 | Reliability | No partial (single-architecture) tag | All runs | Structure + test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (Docker Hub tags, GitHub release assets) — written exactly as today.
- Data or state that must be preserved: all published tags and assets.
- Loss, reset, rebuild, or regeneration that is acceptable: Actions cache entries `buildkit-blob-*` are no longer written and age out.
- Constraints: build-only runs leave untagged per-architecture manifests in the Docker Hub repository (DEC-004).
- Unknowns: None.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| GitHub `ubuntu-24.04-arm` runner | Native arm64 build | Used by Desktop Release | Free disk unmeasured (disk guard) |
| Docker Hub | Push by digest, multi-arch index | Docker docs | Proven by the build-only run (dry run) and the next release |
| Desktop Release wait | Six files within 60 min | release-desktop.yml | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A native arm64 runner builds the builder stage in a time comparable to amd64 (~3-5 min) | REQ-001 | Build-only run (API/E2E) | Open |
| ASM-002 | GitHub-hosted arm64 runners stay free for this public repository | No cost decision needed | Repository is `PUBLIC`; Desktop already uses them | Holds |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Keep a layer cache (GHA or registry)? | Cache export costs 11-24 min | GHA: 0 hits in beta.7/beta.8 (per-ref isolation, 10 GB limit). Registry `mode=max`: reusable across tags, but every layer after the source `COPY` changes every release and would be uploaded again; the reusable layers (pnpm install, apt-get) save ~1-2 min natively | Drop the cache. The measured benefit is ~1-2 min against an export cost of minutes and a moving `buildcache` tag. Revisit only if AC-001 misses the target | Solution Designer | Decided |
| DEC-002 | How to keep "the package is the image's own" with per-architecture builds? | Guarantee of autobyteus-305/412 | (a) extract from the tag per platform as today; (b) extract from the per-architecture digest after checking that the tag's index maps that platform to that digest | (b): the per-architecture manifest is the same object the tag points to, so the guarantee is identical, and the same extraction path works in build-only mode (no tag). The check makes the link explicit | Solution Designer | Decided |
| DEC-003 | What does build-only do? | Proof before a release | Build only / build + dry-run merge / full except publish | Everything except publishing: both builds pushed by digest (untagged), merge as a dry run, packages taken out, described and signed; no wait for and no upload to the GitHub release; no tag; own concurrency group. This exercises every step that can fail in a release except the tag push, `:beta` move and upload | Solution Designer | Decided |
| DEC-004 | May build-only push untagged images to Docker Hub? | The package jobs need the pushed images | Alternatives (local load, another registry) diverge from the release path or add credentials | Yes: untagged manifests are reachable only by digest, are not listed as tags, move nothing, and each release already pushes per-architecture manifests | Solution Designer | Decided |
| DEC-005 | Package job's wait for the GitHub release | Fast server run may arrive before the release exists | Android creates it at 6-7 min; Desktop at ~30 min; today's 30-min wait from ~15 min leaves little margin when Android fails | Raise to 60 min (matches the Desktop wait); polling costs nothing on a public repository | Solution Designer | Decided |
| DEC-006 | Time target | Done-when needs a measurable bar | Founder's baseline "about one hour"; estimate ~15 min | ≤ 30 min, half the founder's baseline and with margin for runner variance | Solution Designer | Decided |
| DEC-007 | Build architecture-independent parts once on `$BUILDPLATFORM`? | Optional lead in the Task | Builder stage has native modules (node-pty, onnxruntime, Prisma engines); native runners remove emulation anyway | No: no Dockerfile change, no native-module risk | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-003 | BEH-001 | AC-001 | SCN-001, SCN-003 | — |
| REQ-002 | UC-001, UC-003 | BEH-002 | AC-002, AC-003 | SCN-001, SCN-003 | — |
| REQ-003 | UC-001, UC-002 | BEH-003, BEH-004 | AC-003, AC-004 | SCN-001, SCN-002 | — |
| REQ-004 | UC-001 | BEH-004 | AC-005 | SCN-001 | — |
| REQ-005 | UC-003 | BEH-007 | AC-001, AC-002, AC-006 | SCN-003 | — |
| REQ-006 | UC-004 | BEH-006 | AC-007 | SCN-004 | — |
| REQ-007 | UC-001 | BEH-008 | AC-008 | SCN-001 | — |
| REQ-008 | UC-004 | BEH-006, BEH-007 | AC-009 | SCN-003, SCN-004 | — |
| REQ-009 | UC-001..UC-004 | BEH-001 | AC-010 | all | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-004.
- Constraints: keep tag rules, six files, signature format, package guarantee, zh behaviour, CLI cache buster, the `Move beta tag` decision after both builds; no Dockerfile change; no secret in logs.
- Deferred to design: job structure, digest hand-over, checkout depth/sparseness, disk cleanup, build-only input and concurrency, test updates.
- Technical facts to verify: native arm64 build time (validation), merged index shape (dry run).
- Risks: R-001 CLI version skew across architectures on a late rerun; R-002 beta move and upload exercised first at the next release.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction, user informed)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-001, no supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
