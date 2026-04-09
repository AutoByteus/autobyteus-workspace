# Requirements

## Status

- Current Status: `Refined`
- Previous Status: `Design-ready`

## Goal / Problem Statement

The current product supports registering additional local agent package roots by absolute filesystem path, but it does not support the simpler workflow the user wants:

- paste a public GitHub repository URL directly,
- let the product download and install that package into app-managed storage,
- make the package available without requiring the user to know Git or clone anything manually.

The current frontend terminology is also too implementation-specific. The settings surface currently exposes `Agent Package Roots`, which is really a low-level discovery/storage concept. Once the feature supports both:

- linked local package directories, and
- app-managed GitHub-imported packages,

the user-facing concept becomes `Agent Package` / `Agent Packages`, not just `roots`.

## Investigation Findings

- Current settings, GraphQL, and store contracts are path-only and use raw root paths as the primary identity.
- Current e2e tests explicitly reject URL-like input.
- Current discovery/runtime behavior already works well with any readable local package root that contains `agents/` and/or `agent-teams/`.
- The desktop/server app already has an app-managed `server-data` root suitable for storing imported packages safely.
- The codebase already contains a strong managed-download pattern: app-owned install roots, artifact cache, and persisted metadata registry/state.
- The current env-backed `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` value is sufficient for runtime root discovery, but not sufficient by itself for package provenance, managed-install lifecycle, or package-oriented UX metadata.

## Recommendations

- Move the product/API boundary from `Agent Package Roots` to `Agent Packages`.
- Preserve local-path package linking, but add first-class GitHub repository import for public repositories.
- Make GitHub import an app-managed install flow that ends in a normal local package root, so existing discovery/edit/runtime flows can reuse it.
- Keep the low-level runtime root concept internal where needed, but stop exposing it as the primary product concept.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - The change crosses package-management UX, GraphQL/API shape, package metadata persistence, managed install behavior, and downstream cache refresh.
  - The downstream discovery model itself can stay mostly intact because it already consumes local package roots.

## Naming Decision

- Canonical user-facing settings section: `Agent Packages`
- Canonical product/API concept for this management surface: `Agent Package`
- Canonical frontend route/query id: `agent-packages`
- Canonical GraphQL/API naming for the product boundary:
  - `agentPackages`
  - `importAgentPackage`
  - `removeAgentPackage`
- Internal low-level concept allowed to remain where technically needed:
  - `package root path`
  - `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`

## In-Scope Use Cases

- `UC-001`: User opens the settings package-management surface and sees `Agent Packages` terminology instead of `Agent Package Roots`.
- `UC-002`: User links an existing local agent package by absolute filesystem path.
- `UC-003`: User pastes a supported public GitHub repository URL and imports it directly.
- `UC-004`: The system downloads the GitHub package into app-managed storage instead of requiring a user-managed clone.
- `UC-005`: After import, the package participates in normal agent, team, and bundled-skill discovery.
- `UC-006`: The package-management surface lists packages with clear source-kind context such as built-in storage, local path, or GitHub.
- `UC-007`: User removes a linked local package and the link is removed without deleting the external filesystem contents.
- `UC-008`: User removes a managed GitHub-imported package and the app-managed installed files are removed together with the package registration.
- `UC-009`: User attempts to import the same GitHub repository twice and receives a defined duplicate result instead of ambiguous duplicated entries.
- `UC-010`: User provides malformed or unsupported input and receives a clear validation error.

## Out of Scope

- `OOS-001`: Private GitHub repository authentication.
- `OOS-002`: Arbitrary non-GitHub git hosting providers in this slice.
- `OOS-003`: Automatic update/refresh of already imported GitHub packages.
- `OOS-004`: Importing a package that lives only in a repository subdirectory instead of the repository root.
- `OOS-005`: A full redesign of all agent/team editing UX beyond the package-management surface and the contract changes required to support imported packages cleanly.

## Functional Requirements

- `REQ-001`: The product must continue to support linking an existing local agent package by absolute filesystem path.
- `REQ-002`: The product must support importing an agent package from a supported public GitHub repository URL.
- `REQ-003`: The product/API boundary for this settings surface must use `Agent Package` / `Agent Packages` terminology instead of `Agent Package Root` / `Agent Package Roots`.
- `REQ-004`: The frontend settings section id and route/query value for this surface must be `agent-packages`.
- `REQ-005`: The GraphQL/API boundary for this surface must move to package-oriented naming:
  - `agentPackages`
  - `importAgentPackage`
  - `removeAgentPackage`
- `REQ-006`: The product/API boundary must identify removable packages by package identity, not by raw filesystem path.
- `REQ-007`: A GitHub import must install the package into app-managed storage under the server app-data area rather than flattening files directly into the default `agents/` and `agent-teams/` folders.
- `REQ-008`: A GitHub-installed package must ultimately materialize as a normal readable local package root so existing agent/team/skill discovery can reuse it.
- `REQ-009`: Linked local packages must remain registration-only references; removing them must not delete the external source directory.
- `REQ-010`: Managed GitHub-installed packages must have managed removal semantics; removing them must delete the app-managed installed package directory in addition to unregistering it.
- `REQ-011`: The product must persist enough package metadata to distinguish:
  - built-in/default package storage,
  - linked local packages,
  - managed GitHub-imported packages.
- `REQ-012`: Package metadata must be sufficient to support package listing, duplicate detection, remove behavior, and clean source-kind presentation without using raw path as the primary user-facing identity.
- `REQ-013`: The import boundary must explicitly distinguish local-path input from GitHub-repository input, even if the frontend uses one simplified input field and auto-detects the source type before calling the API.
- `REQ-014`: Supported GitHub import input must be limited to public `github.com` repository-identifying URLs for this slice.
- `REQ-015`: The system must normalize accepted GitHub URLs into one canonical repository identity before duplicate detection.
- `REQ-016`: Duplicate import of the same normalized GitHub repository must be rejected with a clear, non-destructive error rather than silently creating a second package or silently overwriting an existing managed install.
- `REQ-017`: The GitHub import flow must resolve repository metadata needed to retrieve the package contents without depending on a user-installed `git` executable.
- `REQ-018`: The GitHub import flow must validate the installed/extracted repository root as a valid agent package before registering it.
- `REQ-019`: A valid package root for this flow must contain at least one of:
  - `agents/`
  - `agent-teams/`
- `REQ-020`: After successful import, package registration/removal must refresh the relevant agent/team discovery caches.
- `REQ-021`: The package-management list must expose package summary counts at least equivalent to the current root summary:
  - shared agents,
  - team-local agents,
  - teams.
- `REQ-022`: The package-management list must expose source-kind context so the user can tell whether a package entry is built-in, local-path-linked, or GitHub-managed.
- `REQ-023`: The default app-managed package storage entry must be visible as non-removable.
- `REQ-024`: The design must preserve current runtime discovery support for existing additional package roots that are already persisted via `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`.
- `REQ-025`: Managed GitHub-installed packages must live under a dedicated package-management subtree rooted at:
  - `<appDataDir>/agent-packages/github/<owner>__<repo>/`
  - where `<owner>__<repo>` is derived from the normalized GitHub repository identity and must remain stable enough to support remove and duplicate-detection semantics.

## Acceptance Criteria

- `AC-001`: The settings navigation, page heading, helper text, and action labels use `Agent Packages`-style wording instead of `Agent Package Roots`.
- `AC-002`: The settings route/query id for this surface is `agent-packages`.
- `AC-003`: Given a valid absolute local package path, the system links and lists the package successfully.
- `AC-004`: Given a supported public GitHub repository URL, the system imports the package without requiring the user to run git manually.
- `AC-005`: Given a successful GitHub import, the package is installed under app-managed storage rather than copied into the default top-level `agents/` or `agent-teams/` directories.
- `AC-006`: Given a successful GitHub import, the imported agents and/or teams become discoverable through the existing runtime discovery flows.
- `AC-007`: Given a linked local package, removing it unregisters the package but leaves the external filesystem contents in place.
- `AC-008`: Given a managed GitHub-imported package, removing it unregisters the package and deletes the app-managed installed package directory.
- `AC-009`: Given a malformed path or unsupported URL, the system returns a clear validation error instead of misclassifying the input.
- `AC-010`: Given the same normalized GitHub repository is imported twice, the second import is rejected with a clear duplicate message.
- `AC-011`: Given an accepted GitHub repository URL whose repository root is not a valid agent package, the import fails before registration with a package-shape validation error.
- `AC-012`: The package-management list shows source-kind context and package summary counts for each listed package entry.
- `AC-013`: The default app-managed package storage entry is visible and cannot be removed.
- `AC-014`: Existing additional package roots already configured through `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` continue to participate in runtime discovery after this slice.
- `AC-015`: Given a successful GitHub import of `owner/repo`, the installed package root lives under:
  - `<appDataDir>/agent-packages/github/<owner>__<repo>/`
  - rather than directly under `<appDataDir>` or inside the default top-level `agents/` or `agent-teams/` folders.

## Constraints / Dependencies

- Current additional package roots are stored in `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` as a comma-separated path list.
- Current agent/team/skill discovery already depends on the existence of local readable package roots.
- Current add/remove GraphQL mutations are path-based and must be replaced or redesigned.
- Existing users or automation may already rely on `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`.
- The server package currently does not ship a first-class archive extraction or git dependency.
- The managed GitHub install leaf path should encode repository identity without introducing a second nested owner directory level.

## Assumptions

- `ASM-001`: Public GitHub repository import is sufficient for the initial slice.
- `ASM-002`: The repository root itself contains the agent package root in this slice.
- `ASM-003`: Users benefit more from a simple package-oriented UI than from exposing raw root details as the primary list label.
- `ASM-004`: Preserving current runtime discovery support for already configured additional roots is required even if the product/API boundary is renamed to packages.

## Risks / Open Questions

- `Q-001`: Which equivalent GitHub URL variants should be normalized in v1 beyond the repository homepage URL?
  - Why it matters:
    - Users may paste `.git`, `tree/...`, or `blob/...` URLs copied from the browser.
- `Q-002`: Should the package list show raw root paths as secondary technical detail, or hide them entirely from the default view?
  - Why it matters:
    - Raw paths are still useful for debugging, but the user explicitly dislikes path-first presentation.
- `Q-003`: What future refresh/update UX should exist for managed GitHub-installed packages?
  - Why it matters:
    - The current duplicate-rejection policy avoids destructive overwrite, but it implies refresh is a later explicit workflow.
- `Q-004`: What slugging rule should be used if a normalized GitHub owner or repo contains filesystem-hostile characters?
  - Why it matters:
    - The subtree shape is now fixed to `<owner>__<repo>`, so the implementation must define a safe normalization policy without changing package identity semantics.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-002` |
| `REQ-002` | `UC-003`, `UC-004` |
| `REQ-003` | `UC-001` |
| `REQ-004` | `UC-001` |
| `REQ-005` | `UC-001`, `UC-006` |
| `REQ-006` | `UC-007`, `UC-008` |
| `REQ-007` | `UC-004` |
| `REQ-008` | `UC-005` |
| `REQ-009` | `UC-007` |
| `REQ-010` | `UC-008` |
| `REQ-011` | `UC-006`, `UC-007`, `UC-008` |
| `REQ-012` | `UC-006`, `UC-009` |
| `REQ-013` | `UC-002`, `UC-003`, `UC-010` |
| `REQ-014` | `UC-003`, `UC-010` |
| `REQ-015` | `UC-009` |
| `REQ-016` | `UC-009` |
| `REQ-017` | `UC-003`, `UC-004` |
| `REQ-018` | `UC-003`, `UC-010` |
| `REQ-019` | `UC-004`, `UC-010` |
| `REQ-020` | `UC-005`, `UC-007`, `UC-008` |
| `REQ-021` | `UC-006` |
| `REQ-022` | `UC-006` |
| `REQ-023` | `UC-006` |
| `REQ-024` | `UC-005`, `UC-006` |
| `REQ-025` | `UC-004`, `UC-008`, `UC-009` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Verify user-facing naming cleanup |
| `AC-002` | Verify route/query rename |
| `AC-003` | Verify local-path linking still works |
| `AC-004` | Verify direct GitHub import succeeds |
| `AC-005` | Verify managed install location semantics |
| `AC-006` | Verify imported package discovery works end-to-end |
| `AC-007` | Verify local-package removal is unregister-only |
| `AC-008` | Verify GitHub-managed package removal deletes the managed install |
| `AC-009` | Verify invalid-input validation |
| `AC-010` | Verify duplicate GitHub import policy |
| `AC-011` | Verify extracted package-shape validation |
| `AC-012` | Verify package list metadata and counts |
| `AC-013` | Verify built-in storage is visible and non-removable |
| `AC-014` | Verify current additional-root runtime compatibility remains intact |
| `AC-015` | Verify the managed GitHub install subtree path convention |

## Approval Status

- Status: `Approved for implementation and validation`
- Workflow note:
  - The user later authorized continuation through Stage 10 using the re-entry rule, and implementation/validation now use these refined requirements as the authoritative baseline.
