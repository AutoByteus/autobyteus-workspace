# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user clarified on 2026-05-30 that the desired single path is the current normal/desktop Docker behavior and that the earlier `mobile-safe` profile should be removed.

## Goal / Problem Statement

Remove the earlier-added `mobile-safe` public server Docker profile and keep one normal Docker launcher path. The public Docker launcher, packaged-app Docker Guide, docs, localization, and tests should no longer present or preserve an extra profile choice. The frontend Phone Setup copy should also become simpler and stop describing mobile-safe/Docker-specific setup as the recommended phone path.

Current code reality: `mobile-safe` is not a separate published Docker image. The release workflow publishes one server image (`autobyteus/autobyteus-server`, plus optional `zh` runtime tag). `mobile-safe` is a runtime profile in the public launcher scripts and Docker Guide that changes `docker run` flags and documentation.

## Investigation Findings

- Active `mobile-safe` support lives primarily in `scripts/public/docker/autobyteus-docker.sh`, `scripts/public/docker/autobyteus-docker.ps1`, the packaged app Docker Guide command catalog (`autobyteus-web/utils/dockerNodeLauncherCommands.ts`), localization/docs, and launcher contract tests.
- The default public launcher behavior is already the normal/desktop path: `autobyteus-docker new-container` uses the `standard` branch unless the user or Docker Guide passes `--profile mobile-safe`.
- The Docker Guide currently recommends `autobyteus-docker new-container --profile mobile-safe`, so packaged-app guidance conflicts with the user's actual normal-Docker usage.
- Current normal/standard Docker adds `SYS_ADMIN`, `seccomp=unconfined`, publishes ports without a `127.0.0.1` host bind, and creates automatic host bind mounts for `/home/autobyteus/workspace` and `/home/autobyteus/shared`.
- Current `mobile-safe` omits `SYS_ADMIN`, omits `seccomp=unconfined`, binds backend/VNC/noVNC/debug published ports to `127.0.0.1`, and does not create automatic shared host bind mounts.
- The server runtime does not appear to branch on `AUTOBYTEUS_NODE_PROFILE`; static search found `AUTOBYTEUS_NODE_PROFILE=mobile-safe/standard` only in launcher scripts/tests. The profile affects container launch shape and user guidance, not server API behavior.
- `mobile-safe` was introduced during Android pairing security hardening (`940f622a`, 2026-05-23) to move the recommended phone path from `Android -> embedded host desktop node -> host runtime` to `Android -> mobile-safe Docker node -> controlled container runtime` and reduce practical blast radius.
- The later `mobile-safe-container-401` work (`a7ec9a5f`, 2026-05-24) removed node-admin claim/local-management credential complexity but explicitly kept `mobile-safe` runtime hardening and `/mobile` Docker asset packaging.
- User now clarified that they never use mobile-safe, always use normal Docker, and want Docker management simplified by removing the extra profile.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior change.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure plus Duplicated Policy Or Coordination.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed.
- Evidence basis: The launcher carries two run-policy branches and profile state. UI/docs recommend mobile-safe while the user's actual flow uses normal Docker. Maintaining both duplicates policy across Bash, PowerShell, docs, UI command catalog, localization, and tests.
- Requirement or scope impact: Implement a clean-cut profile removal. Do not keep `--profile mobile-safe`, `mobile_safe`, or `mobile` compatibility aliases. Remove stale mobile-safe docs/copy/tests. Preserve Docker `/mobile` asset packaging because that is image functionality, not profile functionality.

## Recommendations

1. Remove the public launcher profile model entirely and make `autobyteus-docker new-container` / `reset` always use the current normal/standard run shape.
2. Remove user-facing `mobile-safe` terminology from active docs, Docker Guide copy, launcher output, and tests.
3. Bump the launcher config hash version so existing managed containers with old `PROFILE=` state are recreated with the single normal Docker launch shape on the next lifecycle action rather than preserving an obsolete profile.
4. Keep Phone Access behavior but simplify frontend text: describe pairing a phone to the current AutoByteus node via a trusted private HTTPS URL. Avoid mobile-safe/Docker-profile wording.
5. Keep the same-node Android-facing URL verification for remote-node QR creation, but make its labels/errors generic to any remote node rather than Docker/mobile-safe-specific.
6. Preserve Docker image `/mobile` asset packaging in all server image paths.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

The change is localized to launcher/profile policy plus docs/UI/tests, but it spans Bash, PowerShell, frontend command catalog/localization, README/docs, and launcher contract tests.

## In-Scope Use Cases

- U-001: A developer/operator starts a normal server Docker node with one command and no profile choice.
- U-002: Packaged-app Docker Guide users see one normal Docker command set and no mobile-safe recommendation.
- U-003: Phone Setup users see simpler trusted-private-HTTPS pairing guidance without mobile-safe Docker profile terminology.
- U-004: Existing server Docker image builds continue to serve `/mobile` from packaged mobile web assets.
- U-005: Existing managed Docker nodes created with old profile state are reconciled to the single normal launch policy on lifecycle recreation.

## Out of Scope

- Replacing the whole Android/Phone Access security model.
- Making the full backend safe for direct public internet exposure.
- Removing Docker `/mobile` image packaging.
- Publishing Docker images or releasing a version.
- Rewriting historical ticket artifacts under `tickets/done`.

## Functional Requirements

- REQ-001: The Bash public launcher must remove `mobile-safe`/profile support and expose one normal Docker run shape for `new-container`, `reset`, `upgrade --all`, and `workspace apply` lifecycle paths.
- REQ-002: The PowerShell public launcher must match the Bash launcher behavior and remove profile support.
- REQ-003: The launchers must no longer accept `--profile`, `mobile-safe`, `mobile_safe`, `mobile`, `standard`, `default`, or `compat` as user-facing profile mechanisms.
- REQ-004: The launchers must remove profile labels, profile state fields, `AUTOBYTEUS_NODE_PROFILE`, and profile-specific output from newly created/recreated containers.
- REQ-005: The launchers must preserve the current normal Docker behavior: privileged browser/container flags, unqualified host port publishing, named volumes, automatic host-visible node workspace bind mount, and shared host folder bind mount.
- REQ-006: The launcher config hash version must change so old profile-managed containers are detected as stale and recreated with the single normal Docker policy during lifecycle actions.
- REQ-007: The Docker Guide command catalog and component tests must use `autobyteus-docker new-container` without `--profile mobile-safe`.
- REQ-008: English and Chinese localization must remove mobile-safe-specific Docker Guide copy and replace it with normal Docker node copy.
- REQ-009: Phone Setup localization and validation text must remove mobile-safe/Docker-profile-specific wording and describe a generic trusted private HTTPS URL for the current node.
- REQ-010: Active docs/README files must remove mobile-safe recommendations and explain that normal Docker is the single supported public launcher path.
- REQ-011: The implementation must preserve Docker image `/mobile` asset packaging in `autobyteus-server-ts/docker/Dockerfile.monorepo`, `docker/Dockerfile.remote-server`, and `docker/Dockerfile.allinone`.
- REQ-012: Tests must prove profile support is gone, the normal Docker run shape remains, Docker Guide commands are simplified, and Phone Setup copy/remote-node messages no longer mention mobile-safe.

## Acceptance Criteria

- AC-001: Active non-ticket source/docs contain no `mobile-safe`, `mobile_safe`, `MOBILE_SAFE`, or `AUTOBYTEUS_NODE_PROFILE` references.
- AC-002: `scripts/public/docker/autobyteus-docker.sh` and `.ps1` no longer document or parse `--profile`; passing `--profile` is rejected as an unknown option.
- AC-003: Bash and PowerShell launcher run args always include the normal Docker run shape: `SYS_ADMIN`, `seccomp=unconfined`, unqualified published ports, node workspace bind mount, shared workspace bind mount, and existing named volumes.
- AC-004: Launcher config hash version changes and no new state files contain `PROFILE=`.
- AC-005: Docker Guide rendered/tested command list contains `autobyteus-docker new-container` and does not contain `--profile mobile-safe`.
- AC-006: Phone Setup UI/localization no longer tells users to create or prefer a mobile-safe Docker node; remote-node QR verification copy is generic.
- AC-007: Active docs describe one normal Docker launcher path and no longer recommend mobile-safe as the Android/Phone Access setup.
- AC-008: Docker image build definitions still copy `autobyteus-web/dist-mobile/public` into `autobyteus-server-ts/mobile-web`.

## Constraints / Dependencies

- No backward-compatibility profile aliases: removed profile names should fail instead of mapping to normal Docker.
- Do not remove `/mobile` image packaging.
- Maintain Bash/PowerShell parity.
- Keep trusted-private-network warnings for Phone Access and remote nodes; removing mobile-safe does not make the full backend public-internet-safe.
- Historical ticket artifacts under `tickets/done` may retain old terms as audit history; active-source scans should exclude ticket history.

## Assumptions

- "Normal Docker" means the current `standard` public launcher branch.
- Users who previously created mobile-safe containers can recreate/reset/upgrade through the launcher to get the single normal Docker launch shape.
- Phone Access still exists; only mobile-safe-specific setup/profile guidance is being removed.

## Risks / Open Questions

- Risk: Removing mobile-safe intentionally removes the previously documented Android isolation posture. This is accepted based on the user's clarification that mobile-safe is unused and normal Docker is the real workflow.
- Risk: Existing mobile-safe containers may remain running until the user runs launcher lifecycle actions. Docs/launcher output should make reset/upgrade the simple route to normalize managed nodes.
- Open question for implementation detail: whether to include a terse explicit error for `--profile` such as "Docker profiles were removed; use autobyteus-docker new-container" or let generic unknown-option handling surface it.

## Requirement-To-Use-Case Coverage

- U-001: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006
- U-002: REQ-007, REQ-008, REQ-012
- U-003: REQ-009, REQ-012
- U-004: REQ-011
- U-005: REQ-006, REQ-010

## Acceptance-Criteria-To-Scenario Intent

- AC-001 covers stale active reference removal.
- AC-002 covers CLI surface removal.
- AC-003 covers retained normal Docker behavior.
- AC-004 covers old profile state reconciliation.
- AC-005 covers packaged-app Docker Guide simplification.
- AC-006 covers Phone Setup simplification.
- AC-007 covers durable docs alignment.
- AC-008 covers preservation of mobile web image packaging.

## Approval Status

Approved for design by user clarification on 2026-05-30: remove mobile-safe, keep normal Docker, simplify Docker management and Phone Setup descriptions.
