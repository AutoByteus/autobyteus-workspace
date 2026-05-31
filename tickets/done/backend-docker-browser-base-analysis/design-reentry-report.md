# Design Re-entry Report — CR-001 Public Launcher Source Size

## Trigger

Code review round 1 failed with `CR-001` (`Design Impact`) because the Chromium profile-volume implementation changed two public launcher source files that exceeded the Stage 8 hard limit:

- `scripts/public/docker/autobyteus-docker.sh`: `801` effective non-empty lines.
- `scripts/public/docker/autobyteus-docker.ps1`: `797` effective non-empty lines.

The functional Docker changes passed targeted review checks, but the workflow has no implementation-only exception for changed source implementation files above `500` effective non-empty lines.

## Revised Design Decision

The public launcher implementation must be split before the Chromium profile-volume change is reworked:

- keep `scripts/public/docker/autobyteus-docker.sh` and `.ps1` as stable thin public entry/load/install facades;
- add platform module directories:
  - `scripts/public/docker/autobyteus-docker.d/bash/`
  - `scripts/public/docker/autobyteus-docker.d/powershell/`
- place core helpers, Docker lifecycle/config/hash/run-args, and command dispatch into reviewable modules, each `<=500` effective non-empty lines;
- preserve public no-clone usage by making entries load adjacent installed modules or fetch/evaluate modules from the public raw source base for curl-pipe / `irm | iex` temporary mode;
- reject generated, compressed, encoded, or hidden monolithic payloads as a source-size workaround.

## Requirements Updated

- Added `REQ-009`: every changed public launcher source implementation file must be `<=500` effective non-empty lines.
- Added `REQ-010`: existing no-clone Bash curl-pipe, PowerShell `irm | iex`, and installed CLI usage must remain working from one public entry URL and local installed modules.
- Added `AC-008` and `AC-009` for line-count evidence and module distribution evidence.

## Design Spec Updated

The design spec now includes:

- `DS-005` for public launcher entry/module distribution;
- explicit ownership split between entry facades and platform launcher modules;
- decommission plan for monolithic launcher source responsibility;
- target folder/file mapping for Bash and PowerShell module directories;
- migration/refactor sequence requiring launcher split before reapplying the Chromium profile-volume behavior;
- implementation guidance forbidding hidden payloads and preserving user-facing commands.

## Next Required Route

Route the revised package to `architecture_reviewer`. If architecture passes, implementation should rework the launcher structure and then route back to `code_reviewer` before API/E2E begins.
