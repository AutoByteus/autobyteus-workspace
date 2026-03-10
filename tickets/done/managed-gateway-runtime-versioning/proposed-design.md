# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Chose release-synchronized gateway package versioning instead of introducing a second runtime identity model | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/managed-gateway-runtime-versioning/investigation-notes.md`
- Requirements: `tickets/in-progress/managed-gateway-runtime-versioning/requirements.md`
- Requirements Status: `Design-ready`

## Summary

The managed gateway updater already assumes that `artifactVersion` uniquely identifies runtime contents. Instead of rewriting installer and runtime state around a new identity model, the fix will make release automation guarantee that `artifactVersion` always advances with the workspace release version. The normal release helper will bump `autobyteus-message-gateway/package.json` alongside `autobyteus-web/package.json`, regenerate the bundled managed-gateway manifest from that synchronized metadata, and the managed gateway release workflow will reject any tag whose desktop version, gateway version, or bundled manifest drift from the tag.

## Goals

- Remove the human-memory failure mode that allowed managed gateway runtime updates to stay on an old installed version.
- Preserve the existing runtime installer/update contract centered on `artifactVersion`.
- Fail fast in automation before a bad release reaches users.
- Keep user-visible runtime version information aligned with actual update/install identity.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not add dual identity semantics such as “artifactVersion or releaseTag” fallback logic for the normal path.
- Gate rule: design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | `artifactVersion` remains canonical install/update identity, and it must change for each new managed runtime release | AC-001, AC-002, AC-003 | synchronized runtime version advances on release; updater installs newer versions and reuses same versions | UC-001, UC-002 |
| R-002 | Gateway runtime version synchronization must be automated | AC-001, AC-004 | release helper updates gateway package version without manual memory | UC-001, UC-003 |
| R-003 | Bundled manifest must be regenerated from synchronized metadata | AC-001, AC-004 | manifest artifact version and release tag stay in sync | UC-002, UC-003 |
| R-004 | UI/status API must expose synchronized runtime version values | AC-005 | active and installed versions match updater identity | UC-004 |
| R-005 | Integrity verification and rollback behavior remain intact | AC-006 | checksum verification and rollback remain green | UC-001, UC-002 |
| R-006 | CI must reject release drift | AC-004 | workflow fails before publication if versions drift | UC-003, UC-005 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Release helper owns local version/tag prep; release workflow owns tag validation/publication; server updater consumes manifest and installer identity | `scripts/desktop-release.sh`, `.github/workflows/release-messaging-gateway.yml`, `ManagedMessagingGatewayService.update()` | Whether an extra runtime-side drift error is worth adding |
| Current Naming Conventions | Managed gateway runtime identity is called `artifactVersion`; release lane identity is called `releaseTag` | `types.ts`, `release-manifest.mjs`, UI runtime card | Whether UI should keep both labels after synchronization |
| Impacted Modules / Responsibilities | Release helper updates desktop version only; workflow validates desktop version only; installer/update path reuse `artifactVersion` everywhere | `desktop-release.sh`, `release-messaging-gateway.yml`, `messaging-gateway-installer-service.ts`, `managed-messaging-gateway-service.ts` | None blocking design |
| Data / Persistence / External IO | Installed runtime path, active-version.txt, and archive cache names all derive from `artifactVersion`; manifest points to GitHub release assets | `MessagingGatewayInstallerService`, bundled `release-manifest.json` | Old installs will remain on disk until replaced |

## Current State (As-Is)

- `pnpm release` updates only `autobyteus-web/package.json`.
- The managed gateway manifest is regenerated to the new release tag, but `artifactVersion` stays whatever `autobyteus-message-gateway/package.json` already says.
- `updateManagedMessagingGateway` compares active installed version only to `descriptor.artifactVersion`.
- Installer directories and archive cache names are keyed by `artifactVersion`.
- Release workflow validates only the desktop package version against the tag.

## Target State (To-Be)

- `pnpm release X.Y.Z` updates both `autobyteus-web/package.json` and `autobyteus-message-gateway/package.json` to `X.Y.Z`.
- Manifest regeneration uses the synchronized gateway package version, so `artifactVersion` becomes `X.Y.Z` while `releaseTag` remains `vX.Y.Z`.
- Managed gateway updater continues to compare/install by `artifactVersion`, but that value now advances automatically with each published runtime release.
- Release workflow validates:
  - desktop package version matches tag version
  - gateway package version matches tag version
  - bundled managed gateway manifest matches the tag via the existing manifest check command
- UI status continues to read `activeVersion` and `releaseTag`, but they are now aligned by release automation.

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: design and review both treat release automation and runtime install identity as one cross-boundary contract.
- SoC cause statement: release helper owns local version synchronization, workflow owns release-lane enforcement, runtime service owns install/update consumption, and UI owns presentation only.
- Layering result statement: release/build tooling remains outside server runtime logic; the server consumes prepared metadata rather than owning release synchronization policy.
- Decoupling rule statement: runtime install/update code stays decoupled from release-lane orchestration; it consumes manifest descriptors and installed-version state only.
- Module/file placement rule statement: version synchronization belongs in release helper/workflow files, not in managed runtime process code.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Modify` release automation and validation so gateway `artifactVersion` is synchronized to workspace release version; keep server installer/update semantics intact.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - `complexity`: lower than introducing a new runtime identity model
  - `testability`: release helper/workflow drift checks are easy to verify with command-level tests
  - `operability`: runtime status becomes reliable without changing install/update primitives
  - `evolution cost`: future runtime releases stay safe because one release version drives all artifacts
- Layering fitness assessment (are current layering and interactions still coherent under emergent-layering rules?): `Yes`
- Decoupling assessment (are boundaries low-coupled with clear one-way dependency directions?): `Yes`
- Module/file placement assessment (do file paths/folders match owning concerns for this scope?): `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Keep` structure, `Modify` behavior

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists | No | Version-sync policy is centralized in release helper/workflow, not repeated across runtime callers | Keep |
| Responsibility overload exists in one file/module | No | `desktop-release.sh` already owns release prep; workflow already owns publication validation | Keep |
| Proposed new layer owns concrete coordination policy (not pass-through only) | No | No new layer needed; existing tooling boundaries are correct | Remove layer |
| Current layering can remain unchanged without SoC/decoupling degradation | Yes | Release automation and runtime consumption are already separated cleanly | Keep |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Synchronize gateway package version to workspace release version and keep `artifactVersion` canonical | Minimal runtime churn; fixes installer/cache/update semantics together; easy CI enforcement | Requires release helper and workflow changes | Chosen | Best fit for existing installer/update design |
| B | Make `releaseTag` the canonical runtime identity throughout runtime install/update state | Removes redundancy between release tag and runtime version | Requires broader server/runtime migration of install paths, state files, and tests | Rejected | Higher risk and broader scope than needed |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `scripts/desktop-release.sh` | same | Synchronize gateway package version during normal release flow before manifest sync | release prep | add helper logic for second package version update |
| C-002 | Modify | `.github/workflows/release-messaging-gateway.yml` | same | Validate gateway version and bundled manifest against release tag | CI / release publication | fail fast before publishing runtime assets |
| C-003 | Modify | `autobyteus-message-gateway/package.json` | same | Gateway version becomes release-synchronized runtime identity | packaging metadata | changed by release helper at release time |
| C-004 | Modify | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json` generation path | same | Manifest artifact version must match synchronized gateway version | release metadata | existing generator reused |
| C-005 | Modify | release-related tests/docs | same | Cover synchronized versioning contract and release workflow expectations | verification / docs | exact file set depends on existing test fit |

## Module/File Placement And Ownership Check (Mandatory)

| File/Module | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Release helper | `scripts/desktop-release.sh` | same | release orchestration | Yes | Keep | correct owner for synchronized version bump logic |
| Gateway release workflow | `.github/workflows/release-messaging-gateway.yml` | same | CI release enforcement | Yes | Keep | correct owner for drift validation |
| Gateway manifest generator | `autobyteus-message-gateway/scripts/release-manifest.mjs` | same | packaging metadata generation | Yes | Keep | no relocation needed |
| Server installer/update code | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/*` | same | runtime consumption | Yes | Keep | should consume synchronized metadata, not own release policy |
| Messaging UI runtime card | `autobyteus-web/components/settings/messaging/ManagedGatewayRuntimeCard.vue` | same | user-facing status presentation | Yes | Keep | may need only expectation/label alignment |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Release helper | prepare versioned release commit locally | desktop version bump, gateway version bump, curated notes sync, manifest sync | runtime install/update decisions | source of truth before tag creation |
| Release workflow | validate and publish release artifacts | tag-to-version checks, manifest drift check, asset publication | local version bump logic | blocks bad releases from publishing |
| Manifest generator | derive bundled descriptor metadata | release tag, server version, artifact version, URLs | release policy branching | pure metadata generation |
| Runtime installer/update service | consume descriptor to install or activate runtime | versioned install dirs, cache, checksums, rollback | release-tag synchronization policy | remains centered on `artifactVersion` |
| UI status layer | present runtime identity to user | active version, release tag, installed versions | release/build orchestration | values should become aligned after fix |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Support both release-tag identity and artifact-version identity in normal runtime updates | Could have papered over drift without touching release flow | Rejected | synchronize gateway package version so one identity remains canonical |
| Keep manual gateway version bump and only add docs | Lowest implementation effort | Rejected | automate synchronization and enforce via CI |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `scripts/desktop-release.sh` | Modify | Release helper | synchronize both package versions before tagging | shell CLI `release` path | input version, release notes -> updated package manifests + tag prep | git, node, build-runtime-package script |
| `.github/workflows/release-messaging-gateway.yml` | Modify | CI release enforcement | validate release tag against both package versions and bundled manifest | GitHub Actions workflow | tag/ref -> pass/fail + published assets | checkout, pnpm, node, build-runtime-package script |
| `autobyteus-message-gateway/scripts/release-manifest.mjs` | Keep or minor modify | Packaging metadata | build expected manifest from synchronized metadata | `buildReleaseManifest`, `checkDefaultReleaseManifest` | package metadata + tag -> manifest | package.json reads |
| Runtime tests | Modify | Verification | assert update semantics with synchronized artifact versions | vitest suites / command checks | fixture manifests / release commands -> pass/fail | server runtime, release scripts |
| Docs / README | Modify | Documentation | keep release instructions aligned with synchronized gateway versioning | markdown docs | user guidance | release helper behavior |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: no new orchestration is added to the UI; presentation remains in the runtime card/store boundary.
- Non-UI scope: runtime installer/update services remain focused on consuming versioned descriptors rather than release-lane policy.
- Integration/infrastructure scope: release helper and GitHub workflow own the automation contract for synchronized versions.
- Layering note: layering remains clean because release-time coordination stays in tooling boundaries rather than leaking into runtime code.
- Decoupling check: runtime code depends only on synchronized manifest data; tooling depends on package metadata and manifest generation.
- Module/file placement check: all touched files remain in their existing, correct owning areas.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | `desktop-release.sh` | unchanged | already clearly owns desktop/workspace release orchestration | add gateway version sync helpers inside file |
| API | `artifactVersion` | unchanged | still the canonical runtime identity consumed by installer/update logic | value meaning changes only because release automation keeps it synchronized |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `artifactVersion` | runtime install/update identity | Yes | `N/A` | `C-001` through `C-004` |
| `releaseTag` | workspace release publication identity | Yes | `N/A` | `C-002`, `C-004` |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Runtime update service | Medium | push release-version synchronization down into runtime code | Keep current structure | release synchronization belongs to tooling, not runtime services |
| Release workflow | Low | create a separate validator script layer | Keep current structure | the workflow already owns release validation and can call existing scripts directly |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Add runtime-side “if release tag changed, maybe redownload anyway” without fixing release flow | High | synchronize gateway version in release automation and enforce drift in CI | Reject shortcut | would leave cache/install identity mismatch unresolved |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `desktop-release.sh` | package manifests, manifest build script | tagged release commit | Medium | keep helper functions local; no runtime imports |
| `release-messaging-gateway.yml` | repo files at tag ref | GitHub Release assets | Low | use existing script command boundaries |
| runtime installer/update code | bundled manifest descriptor | messaging UI / GraphQL status | Low | no new dependency directions introduced |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `Release helper/workflow -> package metadata + manifest generator`; `Runtime service -> manifest descriptor + installer state`; `UI -> GraphQL/runtime status`.
- Temporary boundary violations and cleanup deadline: none expected.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Manual release expectation that engineers remember gateway version bump | replace with automated sync in release helper and CI enforcement | no docs or workflow should keep manual-step language | release helper tests / README update |

## Error Handling And Edge Cases

- Release helper should stop if either package version is already unexpectedly mismatched with the requested release version after synchronization attempts.
- CI should surface clear errors when gateway version or manifest drift from the tag.
- Runtime update behavior for unchanged `artifactVersion` remains unchanged.
- Existing installed `0.1.0` runtime can remain until a synchronized newer runtime version is installed; no migration shim is needed.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `R-001`, `R-002` | User updates runtime and receives latest compatible version | Yes | N/A | Yes | `Section 1`, `Section 2` |
| `UC-002` | `R-001`, `R-003`, `R-005` | Fresh enable installs synchronized runtime identity | Yes | N/A | Yes | `Section 1` |
| `UC-003` | `R-002`, `R-003`, `R-006` | Release engineer cuts synchronized release | Yes | N/A | Yes | `Section 3` |
| `UC-004` | `R-004` | UI presents synchronized runtime identity | Yes | N/A | N/A | `Section 4` |
| `UC-005` | `R-006` | CI blocks drift before publication | Yes | N/A | Yes | `Section 3` |

## Performance / Security Considerations

- No meaningful runtime performance regression is expected because runtime install/update logic remains version-based.
- Security posture improves because checksum verification stays intact while CI blocks stale manifest/version drift before publication.

## Migration / Rollout (If Needed)

- No explicit data migration is required.
- After the first synchronized release, new installs will land under the new release-aligned runtime version directory.
- Older runtime directories can remain until manually cleaned or superseded.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| `C-001` | `T-001` | command-level release helper verification | Planned |
| `C-002` | `T-002` | workflow validation / command check | Planned |
| `C-003` | `T-001` | release helper sync verification | Planned |
| `C-004` | `T-001`, `T-002` | manifest sync/check command | Planned |
| `C-005` | `T-003`, `T-004` | vitest + release command checks | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-10 | Investigation | N/A | Existing runtime identity relied on manual release memory | Yes | Selected synchronized gateway package versioning | Open |

## Open Questions

- Whether to add a runtime-side explicit drift error as additional defense-in-depth after automation and CI are fixed.
