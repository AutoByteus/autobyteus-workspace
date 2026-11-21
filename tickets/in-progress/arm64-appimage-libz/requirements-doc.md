# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `arm64-appimage-libz`
- Request / ticket: Project Task `autobyteus-28` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`): "URGENT: make the Linux arm64 AppImage start on a stock desktop without zlib's development package (it needs libz.so and fails), and have release verification catch it". Origin: FU-004 of `autobyteus-22` (`team-run-follows-definition`).
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`); the user's words in the Task comment: "work on the follow-up immediately".
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-11-21
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's conversation message of 2026-11-21 announcing the SR-001 approval (recorded in `solution-revision-record.md` SR-001).
- Exact approved requirements baseline / solution revision: this document at SR-001.
- Behavior-defining supplements and their approved versions: None.

## Problem And Desired Outcome

- Problem: every published Linux arm64 AppImage (297 assets, v1.3.61 through v1.5.14-beta.6) starts with an AppImage runtime (electron-builder `appimage-12.0.1` `runtime-arm64`) that declares `NEEDED libz.so`, the unversioned name only zlib's development package (`zlib1g-dev`) provides. On a stock system that has only `zlib1g` (`libz.so.1`), the dynamic loader stops before the AppImage does anything: `error while loading shared libraries: libz.so` (exit 127). The release verify step does not catch this, because it runs the AppImage on the runner, which has `libz.so`.
- Affected actors or systems: Linux arm64 desktop users of the released app; the Desktop Release workflow (`.github/workflows/release-desktop.yml`) and its verify step; the release engineer who relies on it.
- Desired outcome: the arm64 AppImage's runtime starts on a stock system without zlib's development package, and the release verification runs each Linux AppImage in a clean image without `libz.so`, so a runtime that needs it can no longer be released.
- Observable definition of success: on a clean Ubuntu 24.04 arm64 image with only `zlib1g`, the new arm64 AppImage starts the app, while the old one fails with the `libz.so` error; the verify step fails on the old build and passes on the new one.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Launching any published arm64 AppImage on a system without `libz.so` fails in the dynamic loader before the runtime runs: `libz.so: cannot open shared object file`, exit 127. Its runtime also needs `libfuse.so.2` (loaded at mount time), which stock Ubuntu 22.04+ does not install. | The arm64 AppImage's runtime has no shared-library dependency that a stock system lacks: it loads without `libz.so` and without `libfuse.so.2`, mounts or extracts the image and runs the app's `AppRun` launcher. | What happens from `AppRun` on: the native launcher, sandbox handling, protected installation, menu entry, update and restart flows, and the app itself. | `investigation-notes.md` OBS-001..OBS-004 |
| BEH-002 | Operational | SCN-002 | The arm64 and x64 verify steps run `scripts/desktop-package/verify-layout.mjs`, which runs the AppImage's `--appimage-extract` on the runner. The runner has `libz.so`, so a runtime that needs it passes. | The release verification also runs each Linux AppImage (arm64 and x64) in a clean stock image that lacks `libz.so`, asserts that `libz.so` is absent there, and fails the job when the AppImage cannot run there. | Existing verify checks (layout, ELF files, desktop entry, identity digest, trust anchor, architecture, updater metadata, Prisma engines, packaged server startup) keep running and keep their outcomes. | OBS-005, OBS-006 |
| BEH-003 | User | SCN-003 | The x64 AppImage runtime declares `libz.so.1` (all 297 published x64 assets); it is not affected by this defect. It needs `libfuse.so.2` to mount. | Unchanged: the x64 AppImage keeps its current runtime. | x64 runtime bytes and behavior. | OBS-002, DEC-002 |
| BEH-004 | Operational | SCN-004 | The Desktop Release builds and verifies macOS arm64/x64, Windows x64 and Linux x64/arm64, signs Linux AppImages after packaging, and publishes `latest*.yml` updater metadata. | The packaging toolchain change this fix needs keeps every other artifact, its name, its updater metadata and its release gates as they are. | All non-arm64-AppImage release outputs and gates. | OBS-007, DEC-001 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Linux arm64 desktop user | Download the AppImage and start AutoByteus | The app starts on a stock desktop without installing zlib's development package | No extra system packages beyond what a stock desktop has |
| Linux x64 desktop user | Keep using the app | Nothing changes | x64 runtime unchanged |
| Release engineer / Desktop Release workflow | Publish only startable AppImages | A runtime that cannot load on a stock system fails the release job before publishing | Gate must not depend on the runner's own packages |
| The user (product owner) | Decide on a new beta | Knows which releases are affected | A new beta is his decision, not part of this ticket |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A Linux arm64 user starts the released AppImage on a stock system that has `zlib1g` but not `zlib1g-dev` | SCN-001 |
| UC-002 | The Desktop Release verifies each Linux AppImage in a clean image without `libz.so` and fails when it cannot run there | SCN-002 |

### Out Of Scope

- Changing the x64 AppImage runtime, including its `libfuse.so.2` requirement on stock Ubuntu 22.04+ (follow-up FU-001; a support-matrix decision for the user).
- Republishing, patching or withdrawing already-published releases; cutting a new beta (the user's decision).
- macOS, Windows, Android, iOS and server-Docker packaging beyond keeping them unchanged (BEH-004).
- The native `AppRun` launcher, protected installation, AppArmor profile, update and restart logic.
- Bundling Electron's own desktop libraries (GTK, NSS) into the AppImage; a desktop has them.

### Non-Goals

- Starting the app on systems without any FUSE support through the mount path; `--appimage-extract-and-run` remains the documented fallback.
- Proving every Linux distribution; the reference stock system is Ubuntu 24.04 arm64.

### Preserved Behavior Boundary

- BEH-001 preserved column (everything from `AppRun` on), BEH-002 existing verify checks, BEH-003 (x64 unchanged), BEH-004 (all other release artifacts and gates).
- Release-record signing still covers the final AppImage bytes; updater metadata still matches the published file.

### Prerequisites

None. The fix lies in the desktop packaging this ticket owns (the AppImage build and the release verify step).

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status (written down / sent / delivered) |
| --- | --- | --- | --- | --- |
| N/A | | | | |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The Linux arm64 AppImage's runtime declares no dependency on a development-only (unversioned) shared-library name and loads on a stock system that has `zlib1g` but neither `zlib1g-dev` nor `libfuse2`. | BEH-001 | Critical (URGENT) | arm64 users cannot start any released build today | OBS-003/OBS-004: electron-builder's static runtime (toolset `1.0.3`, sha256-pinned) is `static-pie` with no `NEEDED` entries and printed its version (exit 0) inside a clean Ubuntu 24.04 arm64 base root, where the shipped runtime fails with exit 127 | Task direction; DEC-001 |
| REQ-002 | On such a stock arm64 system, the new AppImage starts the app: the runtime makes the image's files available (mount, or extract-and-run where FUSE is unavailable) and runs the app's `AppRun` launcher, which starts AutoByteus. | BEH-001 | Critical | Loading the runtime is necessary, not sufficient, for "users can start the app" | OBS-004 (runtime loads); the app start itself is proven in validation (AC-002) | Task "Done when" |
| REQ-003 | The release verification runs every Linux AppImage it verifies (arm64 and x64) inside a clean stock image of its architecture that lacks `libz.so`, first asserting that `libz.so` is absent there, and fails the job when the AppImage cannot run there. | BEH-002 | Critical | "so this can't come back"; the runner has `libz.so` | OBS-005: the clean-root probe fails on the shipped arm64 runtime and on a published 1.5.14-beta.6 arm64 AppImage, and passes on the static runtime | Task direction; DEC-003, DEC-004 |
| REQ-004 | The x64 AppImage keeps its current runtime and behavior. | BEH-003 | High | x64 is not affected; changing its FUSE requirement is a separate support decision | N/A | DEC-002 |
| REQ-005 | Every other Desktop Release output and gate stays as it is: artifact names, updater metadata (`latest*.yml`, embedded AppImage blockmap), signed release records over final bytes, and all existing verify steps on all five targets. | BEH-002, BEH-004 | High | The fix needs a packaging-toolchain change that reaches all targets | Proven by the build-only release run (AC-005) | DEC-001 |
| REQ-006 | The user is told which published releases ship the affected arm64 runtime and whether x64 is affected. | BEH-001, BEH-003 | High | The user decides on a new beta | OBS-002: all 297 arm64 assets (152 stable, 145 beta; v1.3.61 → v1.5.14-beta.6) affected; all 297 x64 assets need `libz.so.1` | Task direction |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | The new arm64 AppImage built from the ticket branch; a clean Ubuntu 24.04 arm64 base root (`zlib1g` only; `libz.so` and `libfuse.so.2` absent, asserted) | `readelf -d` of the AppImage shows no `NEEDED libz.so` (no unversioned `NEEDED` at all); running it there with `--appimage-version` and `--appimage-extract AppRun` exits 0 | The published 1.5.14-beta.6 arm64 AppImage, run the same way, fails with `libz.so: cannot open shared object file` (exit 127) | API/E2E: `probes/clean-root-runtime-probe.sh` (chroot of the official ubuntu-base tarball) on this arm64 host, new vs old image |
| AC-002 | REQ-002 | BEH-001 / SCN-001 | The new arm64 AppImage; a clean Ubuntu 24.04 arm64 environment with `zlib1g` only (asserted `libz.so` absent) plus the desktop libraries Electron needs and a display; a non-root user | The AppImage starts AutoByteus: through FUSE mount where available, otherwise `--appimage-extract-and-run`; the app process and its server reach ready | The old AppImage fails at the loader with the `libz.so` error in the same environment | API/E2E on this host or the clean root (no `/dev/fuse` here, so extract-and-run); FUSE-mount start on a real arm64 desktop per DEC-005 |
| AC-003 | REQ-003 | BEH-002 / SCN-002 | The verify step's clean-image check run on the published 1.5.14-beta.6 arm64 AppImage and on the new arm64 AppImage | It fails on the old build, naming the missing library, and passes on the new one; it fails before running the image if `libz.so` is present in the clean image | x64: passes on the current x64 AppImage | API/E2E locally (same check, clean root) for old and new; the build-only release run for the CI form |
| AC-004 | REQ-004 | BEH-003 / SCN-003 | The new x64 AppImage from the build-only run | Its runtime is byte-identical to the current `appimage-12.0.1` `runtime-x64` (same `NEEDED` set: `libdl.so.2`, `libpthread.so.0`, `libz.so.1`, `libc.so.6`) and it passes the clean-image check | | Build-only run artifact inspection |
| AC-005 | REQ-005 | BEH-002, BEH-004 / SCN-004 | `pnpm release:test --ref <ticket-branch>` (build-only Desktop Release) | All five desktop targets build and pass every existing verify step plus the new clean-image check; artifact names and `latest*.yml` shapes are unchanged | | Build-only release run (RELEASE.md, TESTING.md "A change to a build step or gate") plus the fresh-start arm64 build locally |
| AC-006 | REQ-006 | BEH-001, BEH-003 | Ticket result | The result to the user lists the affected releases and states that x64 is not affected | | Solution Designer's result; evidence `evidence/published-appimage-runtime-needed.tsv` |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Linux arm64 desktop user | Start AutoByteus from the downloaded AppImage | Running the AppImage (double-click or terminal) | Stock arm64 desktop: `zlib1g`, no `zlib1g-dev` | Runtime loads → mounts image → runs `AppRun` → app starts | App window opens | No FUSE: `--appimage-extract-and-run` | Supported Normal Scenario | Release assets for arm64 since v1.3.61; `autobyteus-web/docs/linux-managed-desktop.md` | REQ-001, REQ-002 / AC-001, AC-002 |
| SCN-002 | Operational | Desktop Release workflow | Release only startable AppImages | Tag push or `workflow_dispatch` (build-only or publish) | AppImage built on the runner | Build → verify (existing checks + clean-image run) → upload | Job passes only when the AppImage runs in a clean stock image | Job fails, naming the missing library | Supported Normal Scenario | `.github/workflows/release-desktop.yml`; RELEASE.md | REQ-003, REQ-005 / AC-003, AC-005 |
| SCN-003 | User | Linux x64 desktop user | Start AutoByteus | Running the x64 AppImage | As today | Unchanged | Unchanged | Unchanged | Supported Normal Scenario | 297 x64 assets need `libz.so.1` | REQ-004 / AC-004 |
| SCN-004 | Operational | Desktop Release workflow | Build and publish all desktop targets | As SCN-002 | — | Unchanged for every non-arm64-AppImage output | Unchanged | — | Supported Normal Scenario | RELEASE.md § Desktop Release | REQ-005 / AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- All Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003 / AC-003 | Reliability | The clean-image check does not depend on the runner's installed libraries and fails closed when its precondition (`libz.so` absent) does not hold | Both Linux jobs | AC-003 |
| QR-002 | REQ-001 / AC-001 | Security / Compatibility | The new runtime is the electron-builder toolset fetched with its published sha256 pinned by electron-builder; no hand-modified binary | arm64 | Design review; build log |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. App data, profile and installation paths are unchanged; the runtime only starts the image.
- Data or state that must be preserved: protected installations and their update records keep working (BEH-001 preserved column).
- Loss, reset, rebuild, or regeneration that is acceptable: N/A.
- Retention, privacy, compliance, volume, downtime, or operational constraints: N/A.
- Unknowns requiring downstream investigation: None.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| electron-builder AppImage toolsets | A runtime without shared-library dependencies for arm64 | `app-builder-lib@26.18.0` `out/toolsets/linux.js` (toolset `1.0.3` → `appimage-tools-runtime-20251108.tar.gz`, sha256 `84021a78…7665`); electron.build v26 AppImage docs | Toolsets exist only in electron-builder 26 (current lockfile: 25.1.8), so the fix needs that upgrade (DEC-001) |
| AppImage type2 runtime | Static runtime; mounts with the host's `fusermount3` (FUSE 3), or extract-and-run | `--appimage-help` output; strings (`No suitable fusermount binary found`) | Hosts with only FUSE 2 cannot mount (RSK-001) |
| GitHub `ubuntu-24.04-arm` / `ubuntu-22.04` runners | Run a clean stock container/root of their own architecture | RELEASE.md jobs | Mechanism chosen in design |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/clean-root-runtime-probe.sh` | Reproduction: run an image in a clean Ubuntu 24.04 arm64 base root | AC-001, AC-003 | Current | Evidence tool, not behavior-defining |
| `probes/probe-runtime-needed.sh` | Lists the zlib `NEEDED` entry of every published Linux AppImage | REQ-006 | Current | Evidence tool |
| `evidence/published-appimage-runtime-needed.tsv` | Per-release result of that probe | REQ-006 / AC-006 | Current | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Stock arm64 hosts able to run the app (OpenSSL 3: the arm64 build ships only the `linux-arm64-openssl-3.0.x` Prisma engine; Ubuntu 22.04+, Debian 12+) ship FUSE 3 (`fusermount3`) | The static runtime mounts only with FUSE 3 | Local host (Ubuntu 24.04) has `fuse3`; RSK-001 records the residual | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How should the arm64 AppImage stop needing `libz.so`: depend on `libz.so.1`, bundle zlib, or use a runtime without dependencies? | Decides the fix and its blast radius | (a) Bundling cannot work: the runtime is loaded before the image it would come from. (b) Patching the 2019 legacy runtime's `NEEDED` to `libz.so.1`: electron-builder 25 offers no runtime override (only poisoning its download cache), ships a hand-modified binary, and still needs `libfuse.so.2`, which stock Ubuntu 22.04+ lacks, so the app would still not start on a stock desktop. (c) electron-builder's static runtime (toolset `1.0.3`): no dependencies (OBS-003/004), checksum-pinned, maintained, the default from electron-builder 27; needs electron-builder 25 → 26. | (c): it is the only option that makes the app start on a stock desktop (no `libz.so`, no `libfuse2`) without a hand-patched binary. The electron-builder upgrade reaches all targets, so REQ-005/AC-005 guard them. | Solution Designer | Decided |
| DEC-002 | Should x64 also move to the static runtime? | x64 is not affected; changing its runtime changes its FUSE requirement (FUSE 2 → FUSE 3) | x64 needs `libz.so.1` (fine). Its Prisma engines include `debian-openssl-1.1.x`, evidence of older-distribution support where FUSE 3 may be absent | Keep x64 unchanged; record FU-001 (x64 needs `libfuse2` on stock Ubuntu 22.04+) for the user's support-matrix decision | Solution Designer | Decided |
| DEC-003 | Should the clean-image check cover x64 too? | Consistency; future x64 runtime changes | x64 passes today; cost is one step | Yes, both Linux jobs | Solution Designer | Decided |
| DEC-004 | Which clean image? | The gate must reflect a stock system and not the runner | Ubuntu 24.04 base (official `ubuntu-base` / `ubuntu:24.04`): `libz.so.1`, no `libz.so`, no `libfuse` (OBS-005) | Ubuntu 24.04 base of the job's architecture, pinned, with `libz.so` absence asserted; mechanism in design | Solution Designer | Decided |
| DEC-005 | Evidence for AC-002's FUSE-mount start on a real arm64 desktop | The local host has no `/dev/fuse` and no KVM | Other evidence: the static runtime loads in the clean root (OBS-004); the app starts with `--appimage-extract-and-run` there (same runtime and `AppRun`, minus the mount); the build-only run builds and verifies on the `ubuntu-24.04-arm` VM. Untested: the FUSE-3 mount itself on an arm64 desktop. | Use the other evidence and accept the untested mount: the type2 runtime is AppImage's official runtime and electron-builder's next default; today arm64 cannot start at all on a stock system, so a mount failure would be no worse than now, and extract-and-run remains a fallback. Low and bounded. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | clean-root probe |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-001 | DEC-005 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 | clean-root probe |
| REQ-004 | UC-002 | BEH-003 | AC-004 | SCN-003 | published TSV |
| REQ-005 | UC-002 | BEH-002, BEH-004 | AC-005 | SCN-004 | — |
| REQ-006 | UC-001 | BEH-001, BEH-003 | AC-006 | SCN-001, SCN-003 | published TSV |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-004.
- Product and system constraints architecture must preserve: native `AppRun` replaces electron-builder's launcher (afterPack); release records sign final bytes after packaging; `latest*.yml` and embedded blockmap; x64 runtime unchanged; per-arch native builds.
- Decisions intentionally deferred to architecture design: where the toolset selection lives (per-arch config), electron-builder 26 version, the clean-image check's mechanism (container vs root) and its owner script, docs to update.
- Technical facts architecture should verify: electron-builder 26 still runs `afterPack` before AppImage staging so the native `AppRun` wins; default compression for the static path (zstd) works with `--appimage-extract`; pnpm node_modules collection unchanged in app.asar; mac/win config compatibility.
- Known feasibility or integration risks: electron-builder major upgrade across all targets (RSK-002); FUSE-3-only mounting (RSK-001).

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

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
