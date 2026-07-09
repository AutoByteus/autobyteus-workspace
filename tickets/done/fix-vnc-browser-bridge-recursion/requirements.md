# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Validate whether the reported `gh auth login` browser-opening failure is a real defect in the workspace/server Docker image source and define the durable source-level requirements for the browser-opening bridge.

The reported failure is real: the current repository source for `autobyteus-server-ts/docker/open-vnc-browser-url.sh` unconditionally executes `runuser -u vncuser` and then invokes an unqualified `xdg-open` while preserving inherited browser-opening environment. If the opener is re-entered after the process has already switched to `vncuser`, it attempts `runuser` as a non-root user and fails with `runuser: may not be used by non-root users`.

## Investigation Findings

- Source still contains the pre-fix bridge logic in `autobyteus-server-ts/docker/open-vnc-browser-url.sh`; the durable repository source has not received the live-container patch.
- `autobyteus-server-ts/docker/Dockerfile.monorepo` injects the bridge scripts into `/usr/local/bin/`, overrides `/usr/local/bin/xdg-open` and `/usr/local/bin/exo-open`, and sets `BROWSER=/usr/local/bin/open-vnc-browser-url.sh` for the runtime image.
- `autobyteus-server-ts/docker/supervisor-autobyteus-server.conf` starts the server as `root` and also sets `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`.
- The current live container has already been patched in `/usr/local/bin/open-vnc-browser-url.sh`, but the source worktree still has the old script.
- A controlled probe using the old script reproduced the exact failure when the opener is invoked as `vncuser` directly.
- A controlled probe using the old script with `XDG_CURRENT_DESKTOP=X-Generic` and `BROWSER` pointing back to the old script reproduced recursive opener behavior and printed `runuser: may not be used by non-root users` before `xdg-open` failed.
- `browser-docker` does not contain the failing bridge scripts. It owns the VNC/XFCE/Chromium/DBus session and `vncuser` runtime setup; the bridge is added by the workspace/server Docker layer.
- The defect is not inherently zh-locale-specific. It can occur for any server image variant that has the same bridge script and inherited `BROWSER` setup. The server Docker build can select `BASE_IMAGE_TAG=zh`, but the root cause is independent of that tag. The all-in-one Dockerfile defaults to `CHROME_VNC_TAG=zh`, but the current all-in-one source does not itself copy these bridge scripts or set this `BROWSER` value.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, narrow invariant gap in the browser bridge boundary.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Source script unconditionally uses `runuser`; controlled vncuser invocation reproduces the exact error; forced generic `xdg-open` path demonstrates inherited `BROWSER` recursion; current live container already uses the proposed invariant-preserving patch successfully per user report and live file inspection.
- Requirement or scope impact: Durable fix should be limited to the bridge script and adjacent wrapper review; no browser-docker source change is required unless implementation discovers a contradictory dependency.

## Recommendations

- Apply the live-container patch logic durably to `autobyteus-server-ts/docker/open-vnc-browser-url.sh`.
- Keep `xdg-open-root-bridge.sh` and `exo-open-root-bridge.sh` as root-only entry bridges, but verify they do not need additional non-root behavior changes after `open-vnc-browser-url.sh` becomes re-entry-safe.
- Do not make a zh-specific fix; validate the invariant for both default/latest and zh-selected server image variants at the source behavior level.
- Prefer a targeted shell-script test or static validation that confirms the opener clears `BROWSER`, calls `/usr/bin/xdg-open`, and does not call `runuser` when already running as `vncuser`.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: A root-side CLI or server process opens an auth/device URL through `$BROWSER` and routes it into the VNC Chromium desktop session.
- UC-002: A browser-opening flow that has already switched to `vncuser` does not attempt to call `runuser` again.
- UC-003: A desktop opener implementation falls back to `$BROWSER` or otherwise evaluates browser env after the user switch without recursively re-entering the bridge.
- UC-004: Server image builds using default/latest or zh chrome-vnc base tags receive the same bridge invariant.

## Out of Scope

- Changing GitHub CLI behavior.
- Changing browser-docker base image code.
- Changing `docker/Dockerfile.allinone` unless implementation discovers that it separately injects or consumes the same bridge outside the inspected source.
- Adding locale-specific browser-opening behavior.
- Implementing a new browser selection subsystem.

## Functional Requirements

- R-001: Root-side browser-opening calls to `/usr/local/bin/open-vnc-browser-url.sh <url>` must continue to route URLs into the VNC `vncuser` desktop/browser session using display, Xauthority, runtime-dir, and DBus session values compatible with the existing Chromium/XFCE setup.
- R-002: `/usr/local/bin/open-vnc-browser-url.sh` must detect when it is already running as `vncuser` and must not call `runuser` in that case.
- R-003: `/usr/local/bin/open-vnc-browser-url.sh` must only use `runuser -u vncuser` when the current effective uid is `0`.
- R-004: `/usr/local/bin/open-vnc-browser-url.sh` must clear `BROWSER` before invoking the desktop opener under `vncuser`, so fallback browser selection cannot re-enter the bridge.
- R-005: `/usr/local/bin/open-vnc-browser-url.sh` must invoke the system desktop opener as `/usr/bin/xdg-open` rather than the `/usr/local/bin/xdg-open` root bridge.
- R-006: If invoked by an unsupported uid that is neither `root` nor `vncuser`, `/usr/local/bin/open-vnc-browser-url.sh` must fail with an explicit diagnostic instead of attempting privilege switching.
- R-007: `/usr/local/bin/xdg-open` and `/usr/local/bin/exo-open` root bridge wrappers must preserve their existing root-entry behavior and non-root pass-through behavior unless implementation evidence shows a required adjustment.
- R-008: The durable fix must be generic across server image base variants, including default/latest and `zh` chrome-vnc tags.

## Acceptance Criteria

- AC-001: Source inspection shows `autobyteus-server-ts/docker/open-vnc-browser-url.sh` no longer contains an unconditional top-level `exec runuser -u vncuser -- ... xdg-open` path.
- AC-002: Source inspection shows the opener builds or invokes its `vncuser` desktop command with `BROWSER=` and `/usr/bin/xdg-open`.
- AC-003: Running the source-equivalent opener as `vncuser` does not emit `runuser: may not be used by non-root users`.
- AC-004: Running the source-equivalent opener from `root` with `BROWSER` pointing to the opener and an `xdg-open` fallback path that checks `$BROWSER` does not recursively re-enter the bridge or emit the `runuser` non-root error.
- AC-005: Root entry through `/usr/local/bin/xdg-open <url>` still delegates to `/usr/local/bin/open-vnc-browser-url.sh <url>`.
- AC-006: Non-root entry through `/usr/local/bin/xdg-open <url>` and `/usr/local/bin/exo-open ...` still passes through to the system opener rather than forcing another root bridge call.
- AC-007: No source change is required in `/home/autobyteus/workspace/browser-docker` to fix this defect; source evidence continues to show the bridge is injected by the workspace/server Docker layer.

## Constraints / Dependencies

- VNC session details remain fixed to the existing image contract: `DISPLAY=:99`, `XAUTHORITY=/home/vncuser/.Xauthority`, `XDG_RUNTIME_DIR=/run/user/1000`, and `DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus`.
- The server process and default shell context run as `root`; Chromium, XFCE, Xvnc, and DBus run as `vncuser`.
- The existing root bridge wrappers at `/usr/local/bin/xdg-open` and `/usr/local/bin/exo-open` intentionally exist so root-side commands can open the VNC desktop browser.
- Full interactive validation may require a running VNC browser session; source-level and controlled shell probes can validate the critical recursion invariant.

## Assumptions

- The live-container patched script supplied by the user is semantically acceptable as the target behavior.
- The expected base/finalization branch is `origin/personal` / `personal` unless directed otherwise.
- `vncuser` remains uid 1000 in the target image, but the script should resolve the uid dynamically where practical.

## Risks / Open Questions

- `xdg-open` behavior varies by detected desktop environment; some paths may not trigger the bug, which makes the defect conditional. The source invariant should still prevent the failure in fallback/generic paths.
- A build-level smoke test might need stubbing to avoid opening real browser tabs while still exercising recursion prevention.
- If downstream images outside the inspected server Dockerfile also copy these scripts manually, they must receive the source script update through normal image rebuilds.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| R-001 | UC-001, UC-004 |
| R-002 | UC-002, UC-003 |
| R-003 | UC-001, UC-002 |
| R-004 | UC-003 |
| R-005 | UC-003 |
| R-006 | UC-002 |
| R-007 | UC-001, UC-002 |
| R-008 | UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Prevent the exact unconditional non-root `runuser` failure shape. |
| AC-002 | Prevent inherited-browser and root-bridge recursion after the privilege switch. |
| AC-003 | Verify already-`vncuser` execution is safe. |
| AC-004 | Verify generic/fallback opener behavior cannot recurse through `$BROWSER`. |
| AC-005 | Preserve root-side user experience for CLI/browser auth flows. |
| AC-006 | Preserve non-root pass-through behavior of adjacent wrappers. |
| AC-007 | Keep ownership of the fix in the server Docker layer, not browser-docker. |

## Approval Status

Approved by user on 2026-07-09 after source-level reproduction and live-container/source comparison. User explicitly authorized kicking off the task after reproduction.
