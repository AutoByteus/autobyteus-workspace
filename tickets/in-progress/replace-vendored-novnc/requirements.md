# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — approved by user on 2026-07-18.

## Goal / Problem Statement

Stop maintaining a checked-in noVNC source snapshot in the frontend. Use the official maintained noVNC npm package directly, remove the vendored implementation, and preserve the VNC connection, viewing, interaction, resize, and permission-aware clipboard behavior users can reach today.

Investigation proved that direct package integration is viable. The historical installation failure used/referred to unscoped `novnc`; the maintained project package is scoped as `@novnc/novnc` and exposes `RFB` from its package root.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | Opening the VNC workspace tool resolves configured hosts, creates one `RFB` connection per host from the checked-in noVNC snapshot, supplies the configured password, and reports connecting, connected, clean disconnect, or failure state. | The same user flow uses the official `@novnc/novnc` package rather than repository-owned third-party source. | Host parsing, auto-connect/manual reconnect, credentials, status text, remote display, error reporting, and disconnect lifecycle remain unchanged. | `REQ-001`, `REQ-003`, `REQ-004`; `AC-001`, `AC-004`, `AC-006`, `AC-007` |
| `BEH-002` | A connected session starts view-only, scales to its tile, can switch to interactive mode, can maximize with remote resize enabled, and restores the prior mode on exit. The initial remote-resize handshake temporarily leaves view-only mode. | The package-backed client preserves the same session policies and observable viewport/control behavior. | View-only default, interaction toggle, fullscreen/maximize, Escape exit, scaling fallback, resize retry/restore timing, and cleanup remain unchanged. | `REQ-003`, `REQ-004`; `AC-004`, `AC-006`, `AC-007` |
| `BEH-003` | The checked-in upstream snapshot includes permission-aware automatic clipboard synchronization while the session is interactive: focusing the VNC canvas can send the browser clipboard to the remote host, and remote clipboard messages can write to the browser clipboard when permitted. | Direct package use retains that reachable clipboard behavior rather than silently dropping it. | Permission denial or unsupported browser APIs continue to fall back safely without making clipboard synchronization a prerequisite for VNC connectivity. | `REQ-002`, `REQ-003`; `AC-002`, `AC-005`, `AC-008` |
| `BEH-004` | Build and test resolution depends on 57 checked-in noVNC/pako files under `autobyteus-web/lib/novnc/`; one production import and two test mocks point into that tree. Updates require manual source replacement and comparison. | Dependency and lockfile metadata own the upstream revision; all production/test resolution uses the official package root and the checked-in third-party tree no longer exists. | Nuxt/Vite static generation and existing VNC-focused tests continue to resolve and execute successfully. | `REQ-001`, `REQ-004`, `REQ-005`, `REQ-006`; `AC-001`, `AC-003`, `AC-004`, `AC-009`, `AC-010` |

## Investigation Findings

- `autobyteus-web/lib/novnc/` contains 57 tracked files (~712 KiB).
- The current tree is byte-for-byte identical to upstream noVNC commit `f5a4eedcea749f82b7cab05cb78a4eb8a92b2c32`; there are no AutoByteus-specific noVNC source changes to preserve.
- AutoByteus history says the vendoring began after `yarn install novnc` could not be imported. The maintained official package is instead `@novnc/novnc`; unscoped `novnc` is a different, stale package.
- Current official package metadata exposes `RFB` as the package-root default export, so no internal/deep import is needed.
- Latest stable `@novnc/novnc@1.7.0` does not contain the current snapshot's permission-aware automatic clipboard implementation. Current published upstream-master build `1.7.0-g7c36fab` does contain it and also incorporates later upstream fixes.
- A disposable project probe using exact `@novnc/novnc@1.7.0-g7c36fab` passed 27 targeted tests and a full production `nuxt generate` build.
- Upstream ships no TypeScript declarations for the root export; the available DefinitelyTyped package still targets obsolete deep module names. A narrow application-owned declaration of the used public `RFB` contract is required, but no noVNC source fork is required.
- The current constructor call passes several viewport/display properties that both the checked-in and upstream constructors ignore. Effective viewport policy already comes from `applyViewportStrategy()` after construction. The replacement should remove the ignored constructor keys without turning them into a behavior change.
- Detailed evidence: [upstream-novnc-evaluation.md](./upstream-novnc-evaluation.md).

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/upstream-novnc-evaluation.md` | Investigation evidence: snapshot provenance, upstream package/version comparison, compatibility probes, and version recommendation | `REQ-001`–`REQ-006` | `AC-001`–`AC-010` | Complete / approval N/A | Supports the direct-package feasibility, exact-version constraint, clipboard-preservation requirement, and type-boundary requirement. Intended behavior is fully stated in this requirements doc. |

## Design Health Assessment (Mandatory)

- Change posture: Cleanup / Refactor
- Initial design issue signal: Yes
- Root cause classification: Legacy Or Compatibility Pressure
- Refactor posture: Likely Needed
- Evidence basis: Third-party source is owned as an unexplained checked-in snapshot even though the official scoped ESM package now works in the current Nuxt/Vite toolchain. The snapshot has no local delta, so repository ownership adds maintenance without product value.
- Requirement or scope impact: Cleanly replace source ownership with package ownership, preserve supported VNC behavior, and remove the obsolete tree rather than retaining a fallback path.

## Recommendations

1. Use the official `@novnc/novnc` package and its package-root default export.
2. Pin exact upstream package build `1.7.0-g7c36fab` for this change. It preserves the current snapshot's automatic clipboard behavior; stable `1.7.0` does not. Move to a later stable version only after it contains or intentionally replaces that behavior and validation passes.
3. Delete `autobyteus-web/lib/novnc/` entirely; do not keep a vendored fallback, patch, wrapper fork, or deep import.
4. Keep `useVncSession.ts` as the application-owned session-policy boundary and limit the constructor to supported connection options. Continue to apply view-only/viewport/resize policy through public `RFB` properties immediately after construction.
5. Add a small local TypeScript declaration for only the public package-root contract AutoByteus uses. Do not copy upstream implementation types or expose internal noVNC modules.
6. Update durable test mocks to the package-root module and validate targeted session behavior, package resolution, and production static generation.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. The behavior owner is localized, but the change replaces a bundled third-party implementation, changes dependency/lockfile resolution, removes 57 files, requires a type boundary, and must protect current browser/Electron VNC behavior.

## In-Scope Use Cases

- `UC-001`: A user opens the VNC workspace tool with one or more configured hosts and connects/disconnects normally.
- `UC-002`: A user views a remote desktop, switches between view-only and interactive mode, and enters/exits maximized fullscreen-fit mode.
- `UC-003`: An interactive session synchronizes clipboard text when browser clipboard APIs and permissions allow it, and remains usable when they do not.
- `UC-004`: A developer installs, tests, builds, and updates noVNC through normal package/lockfile workflows without editing or refreshing a repository-owned noVNC source tree.

## Out of Scope

- Redesigning the VNC viewer UI, toolbar, host configuration, password configuration, or user-facing text.
- Changing VNC/WebSocket endpoints, server behavior, authentication protocols, or the backend/container noVNC service.
- Adding new VNC controls, clipboard UI, file transfer, audio, power controls, or protocol extensions.
- Fixing existing unrelated project-wide TypeScript errors; the baseline currently contains 242 errors.
- Automatically following an npm dist-tag or unpinned development build. Reproducibility requires an exact package version in the manifest and lockfile.
- Release, deployment, or repository finalization unless separately requested.

## Functional Requirements

- `REQ-001` — The frontend must depend on the official scoped package `@novnc/novnc`, resolve `RFB` through the package-root public export, and record the resolved package integrity in `pnpm-lock.yaml`.
- `REQ-002` — The selected upstream package revision must preserve the current permission-aware automatic clipboard path. For the currently available packages, this requires exact `@novnc/novnc@1.7.0-g7c36fab`; stable `1.7.0` is not an equivalent replacement for this behavior.
- `REQ-003` — Package replacement must not change supported VNC session outcomes: connection/authentication, display, status/error transitions, view-only default, interaction toggle, scaling, fullscreen remote resize, retry/restore behavior, or clean disconnect/cleanup.
- `REQ-004` — `useVncSession.ts` must remain the application-owned integration boundary. It must construct `RFB` using supported connection options and apply session policy through public `RFB` properties rather than relying on ignored constructor keys or noVNC internals.
- `REQ-005` — All production imports and durable test mocks must reference `@novnc/novnc`; `autobyteus-web/lib/novnc/` and every active reference to it must be removed in the same change.
- `REQ-006` — The TypeScript boundary must describe only the public `RFB` surface used by AutoByteus at the package root. It must not introduce a source fork, internal deep-import dependency, compatibility wrapper, or duplicated noVNC implementation.

## Acceptance Criteria

- `AC-001` — `autobyteus-web/package.json` declares exact `@novnc/novnc@1.7.0-g7c36fab`, and `pnpm-lock.yaml` resolves that exact official package with registry integrity metadata.
- `AC-002` — The resolved package contains upstream commit `7c36fabe599e053c5a81e98e091ac636f6c1e174` behavior, including the permission-aware async clipboard implementation present in the current checked-in snapshot.
- `AC-003` — `autobyteus-web/lib/novnc/` is absent, and repository search finds no active production or test import/reference to `~/lib/novnc`, `lib/novnc/core/rfb`, or an unscoped `novnc` dependency.
- `AC-004` — A configured VNC host can still create one session with the configured password/shared-session behavior and reach the existing connecting -> connected -> disconnected/error states without an import, constructor, or runtime setup failure.
- `AC-005` — In interactive mode with supported browser clipboard APIs and granted/prompt permissions, focusing the remote canvas can still send local clipboard text to the VNC server, and incoming server clipboard text can still reach the browser clipboard; denial/unsupported APIs do not prevent VNC connection or interaction.
- `AC-006` — View-only, scaling, clipping, and remote-resize policies are still applied immediately after `RFB` construction and after relevant state changes; initial resize handshake and retry/restore timing remain as currently covered.
- `AC-007` — Existing connect/disconnect, credentials-required, security-failure, desktop-name, maximize/restore, interaction-toggle, and cleanup event handling does not move into package internals or a new parallel owner.
- `AC-008` — No stable-1.7-only substitution is accepted unless requirements are explicitly revised to approve the automatic clipboard behavior change or an application-owned replacement is separately designed and approved.
- `AC-009` — The relevant Vitest suites pass after mocks use `@novnc/novnc`; at minimum this includes `composables/__tests__/useVncSession.spec.ts`, `components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts`, and `utils/__tests__/vncHosts.spec.ts`, plus any coverage added by the API/E2E stage.
- `AC-010` — A production Nuxt static build/generation resolves and bundles the package successfully. Type validation introduces no noVNC-specific error beyond the recorded 242-error project baseline, and the implementation reports rather than conceals unrelated baseline failures.

## Constraints / Dependencies

- Official upstream package/repository: `@novnc/novnc` / <https://github.com/novnc/noVNC>.
- Exact selected package: `1.7.0-g7c36fab`, upstream commit `7c36fabe599e053c5a81e98e091ac636f6c1e174`.
- Package license: MPL-2.0; existing application license/documentation handling must continue to include required dependency license material through normal package/bundle processes.
- Current toolchain: pnpm workspace, Nuxt 3.21.1, Vite 7.3.1, TypeScript, Vitest, browser/static web and Electron-renderer use.
- The official package is ESM and exports only its root `RFB` entry; no deep-import contract should be assumed.
- Full-project `nuxi typecheck` is currently red with 242 unrelated/baseline errors; validation must compare noVNC-specific deltas rather than claiming a green global typecheck.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: No persisted application data or schema is changed.
- Required outcome: Not Affected
- Existing data to preserve, discard/rebuild, transform, or quarantine: N/A
- Unacceptable data loss or corruption: N/A
- Relevant availability, maintenance-window, or rollout constraints: Normal frontend dependency/build rollout only.
- Related requirement and acceptance-criteria IDs: `REQ-001`–`REQ-006`; `AC-001`–`AC-010`.

## Assumptions

- “NoVNSE” in the request refers to the noVNC project.
- Preserving supported observable behavior is preferred over choosing the stable dist-tag when the stable package omits behavior in the current checked-in upstream snapshot.
- Exact upstream development-build pinning is acceptable as an interim reproducible dependency until an equivalent stable release is available; user approval of this requirements basis confirms that tradeoff.
- No unobserved local noVNC source modifications exist; full-tree comparison confirms none in the current repository state.

## Risks / Open Questions

- Exact `1.7.0-g7c36fab` is a published upstream development build rather than the stable tag. Pinning bounds reproducibility, and downstream live/browser validation must cover VNC connection and clipboard behavior before delivery.
- The repository has limited durable VNC integration coverage and no supplied live VNC environment in this stage. API/E2E must discover the realistic local/container setup and classify any unavailable external dependency explicitly.
- Upstream package types lag package exports. The local declaration must remain narrow so future package upgrades require review only when AutoByteus's used public surface changes.
- No requirement question remains open if the user approves the exact-version/clipboard-preservation tradeoff above.

## Requirement-To-Use-Case Coverage

| Requirement ID | `UC-001` | `UC-002` | `UC-003` | `UC-004` |
| --- | --- | --- | --- | --- |
| `REQ-001` | X | X | X | X |
| `REQ-002` |  |  | X | X |
| `REQ-003` | X | X | X |  |
| `REQ-004` | X | X | X | X |
| `REQ-005` |  |  |  | X |
| `REQ-006` | X | X | X | X |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Dependency installation/lock resolution inspection confirms exact official package identity and integrity. |
| `AC-002` | Package content/version evidence confirms the selected upstream commit and clipboard implementation. |
| `AC-003` | Structural repository scan confirms complete vendored-tree and local-import removal. |
| `AC-004` | Realistic VNC session connects/authenticates and reports existing state transitions. |
| `AC-005` | Browser/live scenario covers interactive local-to-remote and remote-to-local clipboard behavior, plus denied/unsupported permission fallback when feasible. |
| `AC-006` | Unit and rendered/live scenarios cover default tile fit, maximize remote resize, and restore policy. |
| `AC-007` | Source review and event-path coverage confirm `useVncSession` remains the single session-policy owner. |
| `AC-008` | Dependency/content check prevents an accidental stable package downgrade that removes clipboard behavior. |
| `AC-009` | Targeted durable regression suites pass using the public package import. |
| `AC-010` | Production static build passes; typecheck delta is compared against the recorded baseline without misreporting unrelated failures. |

## Approval Status

Approved by the user on 2026-07-18. The user explicitly accepted that the package integration had already been proven and asked to proceed on that basis. Approval locks:

1. direct official package replacement and complete vendored-tree deletion;
2. exact interim pin `@novnc/novnc@1.7.0-g7c36fab` rather than stable `1.7.0`, to preserve current automatic clipboard behavior;
3. no intended VNC UI or session behavior change;
4. a narrow local public-API type declaration is acceptable and is not a source fork.
