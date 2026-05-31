# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — functional Chromium profile-volume scope remains approved by the user on 2026-05-30. This revision incorporates the code-review Design Impact re-entry from 2026-05-30: public launcher source files changed by this task must be restructured so no changed source implementation file exceeds the Stage 8 `>500` effective non-empty-line hard limit while preserving the public no-clone install/curl-pipe contract.

## Goal / Problem Statement

Backend Docker containers are based on `autobyteus/chrome-vnc`, whose latest browser Docker release (`1.3.6`) expects downstream containers to persist Chromium profile state by mounting `/home/vncuser/.config/chromium`. Latest backend `origin/personal` still does not mount this path in public launcher, source helper compose, personal all-in-one compose, or direct-run docs.

The goal is to add a persistent Chromium profile volume to backend Docker container creation paths so browser cookies, local storage, preferences, and lock-recovery behavior survive normal container recreation/upgrade/reset.

A downstream code-review gate also exposed that the current public Bash and PowerShell launcher files are already oversized. Because this task must change those public launchers, the implementation must restructure their source distribution instead of adding another local patch to monolithic `>500`-line source files.

## Investigation Findings

- Backend task worktree was fast-forwarded to latest `origin/personal` at `2f545609568b7cb369e4b4b086fa9268cb7fd3e8` (`v1.3.34`).
- Browser Docker latest `origin/main` is `2bc0b4a`; substantive release `3951af5` publishes browser Docker `1.3.6`.
- Browser Docker `1.3.6`:
  - documents downstream `/home/vncuser/.config/chromium` persistence;
  - mounts that path in its own run/compose surfaces;
  - prepares ownership/permissions for the mounted profile directory;
  - clears stale Chromium profile lock artifacts during startup.
- Published browser images exist for both default and zh:
  - `autobyteus/chrome-vnc:latest` / `1.3.6` digest `sha256:dbd749ca4bcbdab7fefc48b2f2fa2741e24e5919b6078596ec59b41ab77f1daa`.
  - `autobyteus/chrome-vnc:zh` / `1.3.6-zh` digest `sha256:1e1e1fcd71775fdbf7c682b47a98bb78548f4d78db0dc50ffdd2fd2c9ec2f850`.
- Published server image `autobyteus/autobyteus-server:latest` / `1.3.34` digest `sha256:3481434ac9412641261f7f890cc6a25c61723bbcd1e980b5602c7c21749ed315` does not yet include browser Docker `1.3.6` lock cleanup.
- Latest backend `origin/personal` removed active `mobile-safe` profile support. Therefore no backend implementation is needed for `AUTOBYTEUS_NODE_PROFILE` or `--no-sandbox`.
- Code review round 1 failed with `CR-001` because the implementation changed:
  - `scripts/public/docker/autobyteus-docker.sh` at `801` effective non-empty lines;
  - `scripts/public/docker/autobyteus-docker.ps1` at `797` effective non-empty lines.
  The files were already oversized on `origin/personal`, but the Stage 8 gate applies to changed source implementation files and has no implementation-only exception.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / dependency-contract alignment with a required structural refactor of the public launcher implementation distribution.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant for Chromium profile persistence; File Placement Or Responsibility Drift for public launcher monoliths that must now be changed.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed for public launcher source distribution only; no broad backend runtime refactor.
- Evidence basis: Existing launcher/compose files mount app data, root home, and workspace volumes, but not the Chromium profile path required by browser Docker. Code review measured both changed launcher source files above the hard line-count gate.
- Requirement or scope impact: Add one volume mapping consistently across backend launch surfaces, update config hash/tests/docs, preserve no-clone public launcher usage, and split launcher source files/modules so every changed source implementation file is at or below `500` effective non-empty lines.

## Recommendations

Implement now:

1. Public Bash launcher: restructure from one monolithic source file into a thin entry/loader plus Bash modules, then add `${volume_prefix}-chromium-profile:/home/vncuser/.config/chromium` in the Docker run-argument owner module.
2. Public PowerShell launcher: restructure equivalently into a thin entry/loader plus PowerShell modules, then add the same `<node>-chromium-profile` volume.
3. Launcher distribution: keep existing no-clone usage commands working. A single public entry URL may fetch/load platform modules automatically for curl-pipe/`irm | iex`; installed CLI must store entry plus modules locally so normal installed use does not need a repository checkout.
4. Launcher config hash: include `chromium_profile_volume=<node>-chromium-profile` and `chromium_profile_target=/home/vncuser/.config/chromium`, and bump hash version from `v5` to `v6` so existing managed containers are recreated once.
5. Launcher storage output: list the Chromium profile named volume as private browser profile state.
6. Source helper compose: add `autobyteus-server-chromium-profile:/home/vncuser/.config/chromium` plus top-level volume.
7. Personal all-in-one compose: add `main-allinone-chromium-profile:/home/vncuser/.config/chromium` plus top-level volume.
8. Docs/tests: update direct-run examples, persistence docs, launcher parity tests, module-loader tests where practical, and a source-size guard for public launcher source files.
9. Release note for downstream: after code merge, rebuild/publish `autobyteus/autobyteus-server` against browser Docker `1.3.6` so the server image also includes stale-lock cleanup.

## Scope Classification (`Small`/`Medium`/`Large`)

Large — the product behavior is one Docker invariant, but the code-review re-entry requires public Bash/PowerShell launcher structural decomposition in addition to compose, docs, tests, and release rebuild guidance.

## In-Scope Use Cases

- UC-001: A public-launcher managed Docker node preserves Chromium profile state across `upgrade --all`, `workspace apply --all`, reset/recreate, and image-change recreation.
- UC-002: A source-helper server Docker compose instance persists Chromium profile state across container recreation.
- UC-003: A personal all-in-one Docker compose instance persists Chromium profile state across container recreation.
- UC-004: Documentation and storage output clearly identify the Chromium profile volume.
- UC-005: Existing managed containers are recreated once by config-hash change to attach the new volume.
- UC-006: Public Bash and PowerShell launchers preserve no-clone install and temporary execution usage while their changed implementation source files stay within the Stage 8 size gate.

## Out of Scope

- Reintroducing or changing the removed `mobile-safe` launcher profile.
- Implementing browser Docker's Chromium process command or lock-cleanup logic in backend repository files.
- Migrating Chromium profile data that only exists inside old container writable layers.
- Publishing Docker images during implementation; release/rebuild should be handled later by delivery/release workflow.
- Changing backend application runtime behavior unrelated to Docker launch volume wiring.
- Checking in generated/compressed/encoded monolithic launcher payloads merely to bypass source-size review.

## Functional Requirements

- REQ-001: Public Bash launcher must mount a Docker-managed named volume at `/home/vncuser/.config/chromium` for every managed server container.
- REQ-002: Public PowerShell launcher must mount the same named Chromium profile volume with behavior equivalent to Bash.
- REQ-003: Launcher config hash must include the Chromium profile volume identity and target path, and bump from `v5` to `v6` so old managed containers are recreated once.
- REQ-004: Launcher `storage` output must list the Chromium profile volume and describe it as private Chromium browser profile state.
- REQ-005: Source-helper server compose must mount a named Chromium profile volume at `/home/vncuser/.config/chromium`.
- REQ-006: Personal all-in-one compose must mount a named Chromium profile volume at `/home/vncuser/.config/chromium`.
- REQ-007: Long-lived docs and direct Docker examples must show the Chromium profile volume.
- REQ-008: Implementation must not add backend-owned Chromium startup wrappers, `AUTOBYTEUS_NODE_PROFILE`, or `mobile-safe` compatibility paths.
- REQ-009: Every public launcher source implementation file changed by this task must have `<=500` effective non-empty lines. The solution must use a maintainable source split/module structure, not hidden encoded payloads or a reviewer exception.
- REQ-010: Existing public launcher usage must remain no-clone: documented Bash curl-pipe install/temporary commands and PowerShell `irm | iex` install/temporary commands must still work from one public entry URL, and installed CLIs must run from local installed files/modules without requiring the repository checkout.

## Acceptance Criteria

- AC-001: Bash launcher tests assert `autobyteus-server-0-chromium-profile:/home/vncuser/.config/chromium` appears in `docker run` args.
- AC-002: Bash launcher `storage` test asserts `<node>-chromium-profile -> /home/vncuser/.config/chromium` appears.
- AC-003: Bash/PowerShell parity test asserts both launchers include config hash `v6` and the Chromium profile path/volume naming contract across entry files plus modules.
- AC-004: `workspace apply --all` / stale-config recreation tests assert recreated containers include the Chromium profile volume.
- AC-005: Compose config validation proves `autobyteus-server-ts/docker/docker-compose.yml` and `docker/compose.personal-test.yml` are syntactically valid with the new volume.
- AC-006: Docs show direct-run `-v ...:/home/vncuser/.config/chromium` and persistence sections list the Chromium profile volume.
- AC-007: Static scan excluding historical `tickets/**` confirms no active `AUTOBYTEUS_NODE_PROFILE`, profile label, or `mobile-safe` launcher path is introduced.
- AC-008: Source-size check records `rg -n "\\S" <changed-public-launcher-source-file> | wc -l <= 500` for every changed Bash/PowerShell launcher entry/module source file.
- AC-009: Launcher tests or implementation evidence confirm local-checkout execution loads local modules, install writes entry plus modules, and curl-pipe/`irm | iex` temporary execution can resolve modules from the public source base.

## Constraints / Dependencies

- Backend branch base is latest `origin/personal` at `2f545609`.
- Browser Docker base contract source is latest `browser_docker origin/main` at `2bc0b4a` / release `1.3.6`.
- Browser Docker owns Chromium startup, profile directory permissions, and stale-lock cleanup.
- Backend launchers own downstream volume identity and managed-container recreation policy.
- Public launcher Bash and PowerShell contracts must remain equivalent.
- Stage 8 source-file hard limit is binding for changed source implementation files; the implementation must proactively measure it before code review.

## Assumptions

- A Docker-managed named volume is preferred over a host bind mount for Chromium profile privacy and portability.
- The profile volume should be per managed node/compose project, not shared globally across nodes.
- Automatic migration of profile data from existing container writable layers is not required.
- “Standalone public launcher” means no repository checkout/manual dependency setup for users; it does not require the implementation source to remain one monolithic checked-in file.

## Risks / Open Questions

- Existing users who already signed into Chromium inside a container without the profile volume may need to sign in again after the new volume is attached.
- Published server image must be rebuilt after code changes to inherit browser Docker `1.3.6` lock cleanup; code-only launcher changes do not update existing remote image layers.
- PowerShell runtime validation may be limited on macOS if `pwsh` is unavailable; static parity and parser checks remain required.
- Multi-file launcher distribution adds a new module-resolution failure mode; implementation must fail fast with actionable messages and install local modules for normal installed use.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-005, UC-006
- REQ-002 -> UC-001, UC-005, UC-006
- REQ-003 -> UC-005
- REQ-004 -> UC-004
- REQ-005 -> UC-002
- REQ-006 -> UC-003
- REQ-007 -> UC-004
- REQ-008 -> UC-001 through UC-006 boundary safety
- REQ-009 -> UC-006
- REQ-010 -> UC-006

## Acceptance-Criteria-To-Scenario Intent

- AC-001/AC-002 verify public Bash launcher behavior and user-visible storage output.
- AC-003 verifies Bash/PowerShell parity and recreation hash change after launcher decomposition.
- AC-004 verifies existing managed nodes get the new mount during normal launcher reconciliation.
- AC-005 verifies compose launch surfaces.
- AC-006 verifies operator documentation.
- AC-007 verifies no removed profile policy is reintroduced.
- AC-008 verifies the code-review hard gate is satisfied before re-review.
- AC-009 verifies the new launcher distribution still behaves as a no-clone public launcher.

## Approval Status

Functional scope approved by user on 2026-05-30: “Okay, I think now the backend is just mostly about the chromium profile volume, right? So, yeah, let's now kick off the task and start to work on it.”

Structural refinement added after code-review Design Impact on 2026-05-30; it preserves user-visible behavior while satisfying mandatory team review gates.
