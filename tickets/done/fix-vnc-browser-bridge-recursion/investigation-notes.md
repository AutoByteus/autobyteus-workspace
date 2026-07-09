# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements approved; design spec produced; ready for architecture review
- Investigation Goal: Validate whether the reported browser bridge recursion is real in repository source and define durable fix scope if confirmed.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: The defect is isolated to one Docker helper script, with adjacent root bridge wrappers to review for preserved behavior.
- Scope Summary: Root-side browser opening in the workspace/server Docker image should route URLs into the VNC `vncuser` session without re-entering the bridge after the privilege switch.
- Primary Questions To Resolve:
  - Does repository source match the reported recursive bridge shape? Answer: Yes.
  - Is the failing opener injected by `autobyteus-workspace/autobyteus-server-ts/docker` rather than `browser-docker`? Answer: Yes.
  - Is the issue zh-specific or generic to any image inheriting the same environment/script layout? Answer: Generic to the server bridge; not zh-specific.
  - What exact durable source requirements prevent recursion while preserving root-to-VNC browser opening? Answer: Skip `runuser` when already `vncuser`, only switch from root, clear `BROWSER`, and call `/usr/bin/xdg-open` directly.

## Request Context

The user reported `gh auth login` failure inside the current Docker container when GitHub CLI attempts device-auth browser opening. Reported output: `runuser: may not be used by non-root users`. User supplied live-runtime facts (`whoami=root`, `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`, `DISPLAY=:99`, VNC Chromium running as `vncuser`) and a live-container patch that clears `BROWSER`, calls `/usr/bin/xdg-open`, skips `runuser` when already `vncuser`, and only switches user from `root`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion`
- Task Artifact Folder: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion/.codex/tasks/fix-vnc-browser-bridge-recursion`
- Current Branch: `codex/fix-vnc-browser-bridge-recursion`
- Current Worktree / Working Directory: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-07-09 before worktree creation.
- Task Branch: `codex/fix-vnc-browser-bridge-recursion`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None. New worktree initially showed two modified symlink entries after checkout; `git update-index --refresh` cleared the false-positive status.
- Notes For Downstream Agents: Authoritative repository workspace for this task is the dedicated worktree path above, not `/home/autobyteus/workspace/autobyteus-workspace`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-09 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v` in `/home/autobyteus/workspace/autobyteus-workspace` | Bootstrap repository context | Initial checkout was `/home/autobyteus/workspace/autobyteus-workspace` on `personal...origin/personal`; remote `origin` is `https://github.com/AutoByteus/autobyteus-workspace.git`; untracked `.codex/` existed in shared checkout. | No |
| 2026-07-09 | Command | `git symbolic-ref refs/remotes/origin/HEAD` | Resolve base branch | Remote HEAD points to `refs/remotes/origin/personal`. | No |
| 2026-07-09 | Command | `git fetch --prune origin` | Refresh tracked remote refs before creating task worktree | Fetch succeeded. | No |
| 2026-07-09 | Setup | `git worktree add -b codex/fix-vnc-browser-bridge-recursion /home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion origin/personal` | Create dedicated task worktree/branch | Worktree created from commit `4f3ddc4d5dcaa4cf98195143a8abe04906259124`. | No |
| 2026-07-09 | Command | `git update-index --refresh -- autobyteus-web/docker-compose.yml tickets/done/android-mobile-pairing-qr-error/build-logs/electron-mac-build-latest.log` | Clear checkout false-positive modified symlink entries | Status became clean at that time; later status may show them again until refreshed. | No |
| 2026-07-09 | Code | `autobyteus-server-ts/docker/open-vnc-browser-url.sh` | Verify durable source script | Source unconditionally runs `exec runuser -u vncuser -- env ... xdg-open "${url}"`; it does not check current uid, does not clear `BROWSER`, and invokes unqualified `xdg-open`. | Yes, implement durable fix if approved. |
| 2026-07-09 | Code | `autobyteus-server-ts/docker/xdg-open-root-bridge.sh` | Inspect adjacent root bridge | For uid 0 it delegates to `/usr/local/bin/open-vnc-browser-url.sh`; for non-root it executes `/usr/bin/xdg-open`. | Preserve behavior; review after opener fix. |
| 2026-07-09 | Code | `autobyteus-server-ts/docker/exo-open-root-bridge.sh` | Inspect adjacent root bridge | For uid 0 it strips `--launch WebBrowser` then delegates to opener; for non-root it executes `/usr/bin/exo-open`. | Preserve behavior; review after opener fix. |
| 2026-07-09 | Code | `autobyteus-server-ts/docker/Dockerfile.monorepo` lines 36, 68-80 | Verify source injection point | Runtime image extends `autobyteus/chrome-vnc:${BASE_IMAGE_TAG}`, copies opener to `/usr/local/bin/open-vnc-browser-url.sh`, copies root wrappers to `/usr/local/bin/xdg-open` and `/usr/local/bin/exo-open`, chmods them, and sets `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`. | No |
| 2026-07-09 | Code | `autobyteus-server-ts/docker/supervisor-autobyteus-server.conf` line 12 | Verify server process environment | Server runs as `root` with `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`. | No |
| 2026-07-09 | Code | `docker/Dockerfile.allinone`; `docker/compose.personal-test.yml` | Check zh/all-in-one relevance | All-in-one runtime extends `autobyteus/chrome-vnc:${CHROME_VNC_TAG}` with default `CHROME_VNC_TAG=zh`, and compose also defaults to `zh`; current all-in-one source does not copy these bridge scripts or set this `BROWSER`. | No source change currently indicated for all-in-one. |
| 2026-07-09 | Code | `/home/autobyteus/workspace/browser-docker/Dockerfile`, `base.conf`, `entrypoint.sh` and grep for `open-vnc`, `BROWSER`, `runuser` | Determine whether browser-docker owns failing scripts | browser-docker sets up `vncuser`, Xvnc, XFCE, DBus, Chromium, and runtime dirs; no failing browser opener bridge scripts found. | No browser-docker change needed. |
| 2026-07-09 | Command | `whoami`, env print, live `/usr/local/bin/open-vnc-browser-url.sh`, live `/usr/local/bin/xdg-open`, `ps` | Compare live container with source | Live container runs as `root` with `BROWSER=/usr/local/bin/open-vnc-browser-url.sh` and `DISPLAY=:99`; Chromium/XFCE/DBus/Xvnc run as `vncuser`. Live opener is already patched with uid check, `BROWSER=`, and `/usr/bin/xdg-open`; source is still old. | No |
| 2026-07-09 | Probe | Created `/tmp/repro-old-open-vnc-browser-url.sh` from source logic; ran `runuser -u vncuser -- /tmp/repro-old-open-vnc-browser-url.sh 'https://example.invalid/direct-vncuser-fail'` | Confirm exact non-root failure if opener is re-entered after switching to `vncuser` | Exit status 1; output exactly `runuser: may not be used by non-root users`. | No |
| 2026-07-09 | Probe | `XDG_CURRENT_DESKTOP=X-Generic XDG_UTILS_DEBUG_LEVEL=3 BROWSER=/tmp/repro-old-open-vnc-browser-url.sh timeout 10 /tmp/repro-old-open-vnc-browser-url.sh 'https://example.invalid/force-generic-repro'` | Confirm inherited `BROWSER` recursion under a generic/fallback opener path | Exit status 3; debug selected `DE generic`; output included two `runuser: may not be used by non-root users` lines before `xdg-open: no method available...`. | No |
| 2026-07-09 | Probe | `BROWSER=/tmp/repro-old-open-vnc-browser-url.sh timeout 10 /tmp/repro-old-open-vnc-browser-url.sh 'https://example.invalid/autobyteus-vnc-bridge-repro'` | Check current XFCE-detected environment behavior | Exit status 0 with no output; this path likely used the XFCE/exo opener and did not hit `$BROWSER` fallback. | No; confirms the defect can be conditional by desktop detection but still real. |
| 2026-07-09 | Other | User approval in chat: "i think you can kick off the task now, since you reproduced it right?" followed by "sorry for the interruption please continue" | Record requirements approval for design input | User approved proceeding based on reproduction. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `gh auth login` or any root-side CLI/server process invokes `$BROWSER` for a URL. The image sets `$BROWSER` to `/usr/local/bin/open-vnc-browser-url.sh`.
- Current execution flow:
  1. Root process calls `/usr/local/bin/open-vnc-browser-url.sh <url>`.
  2. Source script unconditionally executes `runuser -u vncuser -- env DISPLAY=:99 XAUTHORITY=/home/vncuser/.Xauthority XDG_RUNTIME_DIR=/run/user/1000 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus xdg-open <url>`.
  3. The unqualified `xdg-open` can resolve through `/usr/local/bin/xdg-open` before `/usr/bin/xdg-open`; as non-root this wrapper passes to `/usr/bin/xdg-open`.
  4. If the desktop opener path consults inherited `BROWSER`, it invokes the opener again as `vncuser`.
  5. Source opener again attempts `runuser -u vncuser`, now as non-root, and fails with `runuser: may not be used by non-root users`.
- Ownership or boundary observations: `open-vnc-browser-url.sh` is the authoritative bridge from root-side processes to the VNC desktop browser. It owns the privilege transition and the child opener environment. The current source misses the invariant that this bridge must be terminal once running as `vncuser`.
- Current behavior summary: The bug is real in source and already fixed only in the live container. It is conditional in practice because some `/usr/bin/xdg-open` desktop-detected paths open successfully without consulting `$BROWSER`, but the source remains unsafe for generic/fallback paths and direct `vncuser` re-entry.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture evidence summary: No broad refactor needed. The file placement and boundary are correct: the server Docker layer owns a root-to-VNC bridge because it sets the root process `$BROWSER` and wraps root `xdg-open`/`exo-open`. The missing invariant is local to `open-vnc-browser-url.sh`.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `open-vnc-browser-url.sh` source | Unconditional `runuser -u vncuser` and unqualified `xdg-open`. | Missing invariant in the right owner, not misplaced responsibility. | Implement script fix. |
| `Dockerfile.monorepo` source | Copies opener and root wrappers; sets `BROWSER`. | Server Docker layer owns bridge injection. | No browser-docker change. |
| `supervisor-autobyteus-server.conf` | Server runs as root with `BROWSER` bridge. | Root-to-VNC bridge remains required. | Preserve root behavior. |
| Controlled direct-vncuser probe | Old source logic fails with exact `runuser` error when executed as `vncuser`. | Confirms the reported error is real if bridge re-enters after user switch. | Add uid guard. |
| Controlled generic opener probe | Old source logic recurses through inherited `BROWSER` and prints the `runuser` error. | Confirms inherited browser env is part of the failure chain. | Clear `BROWSER`; use `/usr/bin/xdg-open`. |
| Live container inspection | Live script already patched; source still old. | User's live fix is ephemeral and must be applied to source for rebuilt images. | Apply durable source fix if approved. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/open-vnc-browser-url.sh` | Root-to-VNC browser opening bridge | Old source has unconditional `runuser`, inherited `BROWSER`, and unqualified `xdg-open`. | Correct durable fix owner. |
| `autobyteus-server-ts/docker/xdg-open-root-bridge.sh` | Root-side `/usr/local/bin/xdg-open` bridge | Root delegates to opener; non-root executes `/usr/bin/xdg-open`. | Preserve as root entry facade; avoid recursion in opener. |
| `autobyteus-server-ts/docker/exo-open-root-bridge.sh` | Root-side `/usr/local/bin/exo-open` bridge | Root normalizes `--launch WebBrowser` then delegates to opener; non-root executes `/usr/bin/exo-open`. | Preserve as root entry facade; no current evidence of required change. |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Server Docker runtime image packaging | Injects opener/wrappers and sets `BROWSER`. | Server Docker layer owns source fix. |
| `autobyteus-server-ts/docker/supervisor-autobyteus-server.conf` | Server process supervisor config | Runs server as root and sets `BROWSER` bridge. | Confirms root-side browser auth flows need bridge. |
| `docker/Dockerfile.allinone` | Personal all-in-one image packaging | Defaults `CHROME_VNC_TAG=zh`, but does not copy opener/wrappers or set `BROWSER`. | zh default is not the root cause; all-in-one has no current source involvement in this bridge. |
| `docker/compose.personal-test.yml` | Personal compose build config | Defaults `AUTOBYTEUS_CHROME_VNC_TAG` to `zh` for all-in-one. | zh may affect base image selection, not bridge script logic. |
| `/home/autobyteus/workspace/browser-docker/*` | Browser base image | Owns Xvnc, XFCE, DBus, Chromium, `vncuser` setup; no bridge scripts found. | Do not patch browser-docker for this defect. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-09 | Reported Repro | User ran `gh auth login`, selected browser login, then pressed Enter to open URL. | Reported failure: `runuser: may not be used by non-root users`. | User hit a real bridge re-entry failure. |
| 2026-07-09 | Reported Probe | User patched live `/usr/local/bin/open-vnc-browser-url.sh` and ran `/usr/local/bin/open-vnc-browser-url.sh 'https://github.com/login/device'`. | Reported success: `Opening in existing browser session.` | Live mitigation works; durable source still needs update. |
| 2026-07-09 | Live Inspection | `whoami`, env, live script cat, `ps` | `whoami=root`; `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`; `DISPLAY=:99`; VNC/XFCE/DBus/Chromium run as `vncuser`; live opener is patched. | Runtime facts match user report; live container no longer represents source behavior. |
| 2026-07-09 | Probe | `runuser -u vncuser -- /tmp/repro-old-open-vnc-browser-url.sh 'https://example.invalid/direct-vncuser-fail'` | Exit 1; `runuser: may not be used by non-root users`. | Source script is unsafe if called after privilege switch. |
| 2026-07-09 | Probe | `XDG_CURRENT_DESKTOP=X-Generic XDG_UTILS_DEBUG_LEVEL=3 BROWSER=/tmp/repro-old-open-vnc-browser-url.sh timeout 10 /tmp/repro-old-open-vnc-browser-url.sh 'https://example.invalid/force-generic-repro'` | Exit 3; selected generic opener path; emitted repeated `runuser` error. | Inherited `BROWSER` recursion is real. |
| 2026-07-09 | Probe | `BROWSER=/tmp/repro-old-open-vnc-browser-url.sh timeout 10 /tmp/repro-old-open-vnc-browser-url.sh 'https://example.invalid/autobyteus-vnc-bridge-repro'` | Exit 0 with current XFCE-detected path. | Some desktop-detected paths avoid the bug, explaining why it can be conditional. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted. Investigation used local source and live-container probes.
- Version / tag / commit / freshness: Repository worktree is based on `origin/personal` at `4f3ddc4d5dcaa4cf98195143a8abe04906259124`.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Full interactive reproduction requires a built/running container with VNC desktop and CLI auth. Controlled source-level reproduction used temporary old-script copies in `/tmp`.
- Required config, feature flags, env vars, or accounts: `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`, VNC session display/env for `vncuser`, root-side process invoking URL opener. Forced generic probe used `XDG_CURRENT_DESKTOP=X-Generic`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation; temporary `/tmp/repro-old-open-vnc-browser-url.sh` script for source-equivalent probes.
- Cleanup notes for temporary investigation-only setup: `/tmp/repro-old-open-vnc-browser-url.sh` and `/tmp/repro-old-*.out` can be removed; they are outside the repository and not required downstream.

## Findings From Code / Docs / Data / Logs

- Durable source is not fixed even though the live container is fixed.
- The failure is not a GitHub CLI defect; GitHub CLI only triggers the browser opener through the configured environment.
- The root-cause defect is a missing bridge invariant: once execution is in the `vncuser` desktop context, the bridge must not re-enter privilege switching and must not preserve a `$BROWSER` value that points back to itself.
- The failure is generic to the server Docker bridge and not tied to Chinese locale/input support.

## Constraints / Dependencies / Compatibility Facts

- The bridge must preserve the root-side CLI auth use case because the server/container shell normally runs as root while the desktop session runs as `vncuser`.
- `DISPLAY=:99`, `/home/vncuser/.Xauthority`, `/run/user/1000`, and the DBus bus path are established by browser-docker and used by the server bridge.
- Existing root bridge wrappers are thin facades; the central invariant belongs in `open-vnc-browser-url.sh`.
- No backward-compatibility dual path is needed; the old unconditional `runuser` behavior should be replaced cleanly.

## Open Unknowns / Risks

- Exact `xdg-open` branch varies by desktop detection and installed default handlers; tests should validate the invariant rather than depend on one desktop branch.
- A smoke test should avoid opening real browser tabs if possible; implementation can use a focused shell/static test or controlled stubs where feasible.
- Other downstream images outside the inspected files might depend on copied versions of the old script until rebuilt.

## Notes For Architect Reviewer

User approved proceeding beyond analysis. The expected design is a narrow local bug fix in `autobyteus-server-ts/docker/open-vnc-browser-url.sh` with adjacent wrapper behavior preserved. Root cause is `Missing Invariant`, not a broader boundary/file-placement issue. Required upstream artifacts:

- Requirements: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion/.codex/tasks/fix-vnc-browser-bridge-recursion/requirements.md`
- Investigation notes: `/home/autobyteus/workspace/autobyteus-workspace-fix-vnc-browser-bridge-recursion/.codex/tasks/fix-vnc-browser-bridge-recursion/investigation-notes.md`
