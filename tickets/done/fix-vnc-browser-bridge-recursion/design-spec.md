# Design Spec

## Current-State Read

The server Docker image owns a root-to-VNC browser-opening bridge. `autobyteus-server-ts/docker/Dockerfile.monorepo` copies three bridge scripts into the runtime image:

- `autobyteus-server-ts/docker/open-vnc-browser-url.sh` -> `/usr/local/bin/open-vnc-browser-url.sh`
- `autobyteus-server-ts/docker/xdg-open-root-bridge.sh` -> `/usr/local/bin/xdg-open`
- `autobyteus-server-ts/docker/exo-open-root-bridge.sh` -> `/usr/local/bin/exo-open`

The same Dockerfile sets `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`, and `autobyteus-server-ts/docker/supervisor-autobyteus-server.conf` runs the server as `root` with that `BROWSER` value. Browser desktop processes (`Xvnc`, XFCE, DBus, Chromium) run as `vncuser` in the `autobyteus/chrome-vnc` base session.

Current source behavior in `open-vnc-browser-url.sh` is unsafe: it unconditionally executes `runuser -u vncuser -- env ... xdg-open <url>`. That has two coupling problems inside the same boundary:

1. the script does not check whether the current process is already `vncuser`, so re-entry after the user switch attempts `runuser` as a non-root user;
2. the script preserves inherited `BROWSER` and calls unqualified `xdg-open`, so desktop-opener fallback can call the same bridge again after the user switch.

The target design must preserve the root-side bridge because CLI auth flows run from `root`, while the visible browser session belongs to `vncuser`. It must make the bridge terminal once execution has crossed into the `vncuser` desktop context.

## Intended Change

Replace the current unconditional privilege-switch opener with a uid-aware, recursion-safe opener in `autobyteus-server-ts/docker/open-vnc-browser-url.sh`:

- validate that a URL argument exists;
- resolve the `vncuser` uid dynamically;
- construct one canonical `vncuser` desktop opener command with the existing VNC session environment, `BROWSER=`, and `/usr/bin/xdg-open <url>`;
- if current uid is `vncuser`, execute the canonical opener command directly;
- if current uid is root, execute `runuser -u vncuser --` with the canonical opener command;
- if current uid is neither root nor `vncuser`, fail with an explicit diagnostic.

Keep `xdg-open-root-bridge.sh` and `exo-open-root-bridge.sh` as thin root-entry wrappers unless implementation finds a concrete regression. Their non-root pass-through behavior remains important because they should not become privilege-switching owners.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, a narrow invariant gap in an otherwise correct bridge boundary.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: Source unconditionally calls `runuser`; a controlled direct-`vncuser` probe reproduced `runuser: may not be used by non-root users`; a forced generic `xdg-open` probe showed inherited `BROWSER` recursion. The bridge scripts are injected by the server Docker layer, and browser-docker only owns the desktop session.
- Design response: Strengthen the existing bridge owner with uid and environment invariants; do not move ownership or create a new subsystem.
- Refactor rationale: The current file placement and public entry boundaries are healthy for this scope. `open-vnc-browser-url.sh` is already the correct owner for privilege transition and child opener environment; the defect is missing local enforcement.
- Intentional deferrals and residual risk, if any: Full interactive `gh auth login` validation may be performed downstream in API/E2E if environment permits. The in-scope source invariant can be validated with shell/static probes without depending on GitHub authentication state.

## Terminology

- `Browser bridge`: the server Docker layer scripts that let root-side processes open URLs in the VNC `vncuser` Chromium session.
- `Root entry wrapper`: `/usr/local/bin/xdg-open` or `/usr/local/bin/exo-open` as installed by the server Docker image; these are thin entry facades for root callers.
- `VNC desktop opener`: the command executed inside the `vncuser` session, using the base image's X/DBus runtime environment and `/usr/bin/xdg-open`.

## Design Reading Order

1. Follow the primary root-to-VNC URL-opening spine.
2. Understand the bridge owner and the thin wrapper facades.
3. Apply the local uid/environment invariants in `open-vnc-browser-url.sh`.
4. Validate that adjacent wrappers preserve root-entry and non-root pass-through behavior.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: cleanly replace the old unconditional `runuser` flow inside `open-vnc-browser-url.sh`.
- The design does not keep a dual path for the old unsafe behavior. The old behavior is decommissioned as a branch shape, not as a separate file removal.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Root-side CLI/server process requests URL open through `$BROWSER` | URL opens in existing VNC Chromium session | `open-vnc-browser-url.sh` | This is the reported `gh auth login` browser-auth path. |
| DS-002 | Primary End-to-End | Root caller invokes `/usr/local/bin/xdg-open` or `/usr/local/bin/exo-open` | URL opens through the same VNC desktop bridge | root entry wrapper plus `open-vnc-browser-url.sh` | Preserves general root-side opener compatibility. |
| DS-003 | Bounded Local | `open-vnc-browser-url.sh` receives URL | Script execs system opener as `vncuser` or fails clearly | `open-vnc-browser-url.sh` | This is where the missing invariant is enforced. |

## Primary Execution Spine(s)

- DS-001: `Root CLI/server process -> $BROWSER -> open-vnc-browser-url.sh -> vncuser desktop opener env -> /usr/bin/xdg-open -> VNC Chromium session`
- DS-002: `Root xdg-open/exo-open call -> root entry wrapper -> open-vnc-browser-url.sh -> vncuser desktop opener env -> /usr/bin/xdg-open -> VNC Chromium session`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A root-side auth command asks to open a URL through `$BROWSER`; the browser bridge crosses into `vncuser` exactly once, clears recursive browser selection, and hands the URL to the system opener in the VNC desktop session. | root process, `$BROWSER`, browser bridge, VNC desktop opener, Chromium session | `open-vnc-browser-url.sh` | VNC display/Xauthority/runtime/DBus env; uid detection; browser env sanitization |
| DS-002 | A root-side generic opener call reaches a thin wrapper, which delegates to the same authoritative browser bridge rather than owning the privilege transition itself. | root opener call, root wrapper, browser bridge, VNC desktop opener, Chromium session | `open-vnc-browser-url.sh` with wrapper facade | Root-only delegation; non-root pass-through |
| DS-003 | The opener validates input, prepares one canonical desktop command, branches by current uid, and either executes directly as `vncuser`, switches from root, or fails for unsupported users. | input validation, canonical command, uid branch, exec/fail | `open-vnc-browser-url.sh` | Error diagnostics; dynamic `vncuser` uid lookup |

## Spine Actors / Main-Line Nodes

- Root CLI/server process: initiates URL opening, commonly through `$BROWSER`.
- Root entry wrapper: optional facade when callers use `/usr/local/bin/xdg-open` or `/usr/local/bin/exo-open` as root.
- Browser bridge (`open-vnc-browser-url.sh`): authoritative privilege and environment boundary.
- VNC desktop opener env: the explicit X/DBus/runtime environment for `vncuser`.
- System opener (`/usr/bin/xdg-open`): base OS opener, bypassing the root bridge path.
- VNC Chromium session: final browser surface.

## Ownership Map

- Root CLI/server process owns the need to open a URL but not VNC session routing.
- Root entry wrappers own only root-call detection and delegation to the browser bridge. They are thin facades, not governing owners.
- `open-vnc-browser-url.sh` owns argument validation, uid transition policy, VNC desktop environment assembly, recursion prevention, and unsupported-user diagnostics.
- Browser-docker owns the running `vncuser` desktop session, but not this server-layer bridge script.
- `/usr/bin/xdg-open` owns desktop-specific browser dispatch once safely inside `vncuser` context.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `/usr/local/bin/xdg-open` from `xdg-open-root-bridge.sh` | `open-vnc-browser-url.sh` | Lets root-side generic `xdg-open` calls reach the VNC browser bridge. | VNC env assembly, recursive browser sanitization, privilege policy beyond root delegation. |
| `/usr/local/bin/exo-open` from `exo-open-root-bridge.sh` | `open-vnc-browser-url.sh` | Lets root-side XFCE-style browser calls reach the same bridge and normalizes `--launch WebBrowser`. | VNC env assembly, recursive browser sanitization, repeated privilege switching. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Unconditional `runuser -u vncuser -- ... xdg-open` branch in `open-vnc-browser-url.sh` | It fails when the bridge is re-entered as `vncuser`. | Uid-aware branch in `open-vnc-browser-url.sh`. | In This Change | Clean-cut behavior replacement. |
| Inherited `BROWSER` inside the vncuser desktop opener command | It can point back to the bridge and recurse. | `BROWSER=` in the canonical desktop opener command. | In This Change | Empty assignment is intentional environment sanitization. |
| Unqualified `xdg-open` inside the bridge after user switch | It can route through `/usr/local/bin/xdg-open` instead of the system opener. | Explicit `/usr/bin/xdg-open`. | In This Change | Keeps root wrapper out of post-switch path. |

## Return Or Event Spine(s) (If Applicable)

Not applicable. The opener execs into the selected process; there is no meaningful application-level return/event flow beyond process exit status.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `open-vnc-browser-url.sh`
- Chain: `Validate URL argument -> Resolve vncuser uid -> Build sanitized desktop opener command -> Branch by current uid -> Exec directly / runuser from root / explicit failure`
- Why it matters: This local spine is the entire invariant fix. It prevents both repeated privilege switching and inherited browser recursion.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| VNC desktop env constants | DS-001, DS-002, DS-003 | `open-vnc-browser-url.sh` | Provide `DISPLAY`, `XAUTHORITY`, `XDG_RUNTIME_DIR`, and `DBUS_SESSION_BUS_ADDRESS`. | Connects root-side URL opens to the existing browser-docker desktop session. | Spreading these values into wrappers would duplicate policy. |
| Browser env sanitization | DS-001, DS-003 | `open-vnc-browser-url.sh` | Set `BROWSER=` before system opener dispatch. | Prevents fallback recursion through the same bridge. | If wrappers own it, `$BROWSER` direct invocation remains unsafe. |
| Unsupported-user diagnostic | DS-003 | `open-vnc-browser-url.sh` | Fail clearly for neither-root-nor-vncuser contexts. | Avoids hidden partial behavior for unsupported callers. | Silent pass-through would obscure privilege boundary errors. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Root-to-VNC browser opening | Server Docker bridge scripts under `autobyteus-server-ts/docker/` | Extend | The bridge already exists and is copied by the server Dockerfile. | N/A |
| VNC desktop session | browser-docker base image | Reuse | The base already owns Xvnc/XFCE/DBus/Chromium as `vncuser`. | N/A |
| Generic root opener support | Existing root wrapper scripts | Reuse | Wrappers are thin and correctly delegate root calls. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Docker browser bridge | Root-to-VNC opener policy, uid branch, sanitized child opener env | DS-001, DS-002, DS-003 | `open-vnc-browser-url.sh` | Extend | Single-file local fix. |
| Browser base runtime | Running desktop/browser session and user runtime dirs | DS-001, DS-002 | browser-docker base | Reuse | No source edits needed there. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/docker/open-vnc-browser-url.sh` | Server Docker browser bridge | Authoritative browser bridge | Validate URL, switch/root-detect uid, set VNC env, clear `BROWSER`, call `/usr/bin/xdg-open`. | One shell entrypoint owns the privilege/environment boundary. | No |
| `autobyteus-server-ts/docker/xdg-open-root-bridge.sh` | Server Docker browser bridge | Thin root facade | Delegate root `xdg-open` calls to opener; non-root pass-through to `/usr/bin/xdg-open`. | Wrapper is intentionally minimal. | No |
| `autobyteus-server-ts/docker/exo-open-root-bridge.sh` | Server Docker browser bridge | Thin root facade | Normalize root XFCE `--launch WebBrowser` call then delegate; non-root pass-through. | Wrapper is intentionally minimal. | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| VNC desktop env assignment | N/A | Server Docker browser bridge | Not repeated after target design; keep inside opener. | N/A | N/A | A generic helper file for one script. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | Low | No shared data structure introduced. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/docker/open-vnc-browser-url.sh` | Server Docker browser bridge | Authoritative root-to-VNC browser bridge | Implement uid-aware, recursion-safe URL opening into the VNC desktop browser. | This is the only place that should own both privilege switching and opener env sanitization. | No |
| `autobyteus-server-ts/docker/xdg-open-root-bridge.sh` | Server Docker browser bridge | Thin root entry facade | Preserve root delegation to opener and non-root pass-through to `/usr/bin/xdg-open`. | Keeps generic root `xdg-open` compatibility without duplicating policy. | No |
| `autobyteus-server-ts/docker/exo-open-root-bridge.sh` | Server Docker browser bridge | Thin root entry facade | Preserve root delegation, `--launch WebBrowser` normalization, and non-root pass-through to `/usr/bin/exo-open`. | Keeps XFCE-style root opener compatibility without duplicating policy. | No |

## Ownership Boundaries

The authoritative boundary for crossing from root to the VNC browser session is `open-vnc-browser-url.sh`. Upstream callers may invoke `$BROWSER` or root wrapper commands, but only `open-vnc-browser-url.sh` should assemble the VNC desktop env, decide whether to call `runuser`, and sanitize recursive browser selection.

The root wrappers are public convenience entrypoints but not governing owners. Browser-docker remains the owner of the desktop session; the server Docker bridge consumes that session contract through fixed env values.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `open-vnc-browser-url.sh` | `runuser` transition, VNC env assignment, `BROWSER=` sanitization, `/usr/bin/xdg-open` dispatch | `$BROWSER` callers; root `xdg-open`/`exo-open` wrappers | Root wrappers reimplementing VNC env or calling `runuser` themselves; post-switch call to `/usr/local/bin/xdg-open` | Add the required behavior to `open-vnc-browser-url.sh`, not to wrappers. |

## Dependency Rules

Allowed:

- Root-side `$BROWSER` may point to `/usr/local/bin/open-vnc-browser-url.sh`.
- Root `/usr/local/bin/xdg-open` and `/usr/local/bin/exo-open` wrappers may delegate to `/usr/local/bin/open-vnc-browser-url.sh`.
- `open-vnc-browser-url.sh` may call `runuser -u vncuser -- ...` only when current uid is `0`.
- `open-vnc-browser-url.sh` may call `/usr/bin/xdg-open` inside the sanitized `vncuser` desktop opener command.
- Non-root wrappers may pass through to `/usr/bin/xdg-open` or `/usr/bin/exo-open`.

Forbidden:

- `open-vnc-browser-url.sh` must not call `runuser` when current uid is already `vncuser`.
- The post-switch opener path must not preserve `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`.
- The post-switch opener path must not call unqualified `xdg-open` or `/usr/local/bin/xdg-open`.
- Root wrappers must not duplicate VNC env/privilege policy.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `open-vnc-browser-url.sh <url>` | URL opening into VNC browser | Bridge root or already-`vncuser` caller into VNC desktop opener. | One positional URL argument. | Fails if missing URL or unsupported uid. |
| `xdg-open-root-bridge.sh <args...>` installed as `/usr/local/bin/xdg-open` | Root generic opener entry | Delegate root calls to bridge; pass non-root to system opener. | Existing `xdg-open` args. | No expanded API. |
| `exo-open-root-bridge.sh [--launch WebBrowser] <args...>` installed as `/usr/local/bin/exo-open` | Root XFCE opener entry | Normalize root browser launch and delegate; pass non-root to system opener. | Existing `exo-open` browser args. | No expanded API. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `open-vnc-browser-url.sh <url>` | Yes | Yes | Low | Keep single URL argument. |
| `/usr/local/bin/xdg-open` wrapper | Yes | Inherits xdg-open args | Low | Keep thin wrapper. |
| `/usr/local/bin/exo-open` wrapper | Yes | Inherits exo-open args | Low | Keep thin wrapper. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Browser bridge | `open-vnc-browser-url.sh` | Yes | Low | Keep. |
| Root xdg-open wrapper | `xdg-open-root-bridge.sh` | Yes | Low | Keep. |
| Root exo-open wrapper | `exo-open-root-bridge.sh` | Yes | Low | Keep. |

## Applied Patterns (If Any)

- Adapter/bridge pattern: `open-vnc-browser-url.sh` adapts root-side URL-opening requests into the `vncuser` desktop session contract.
- Thin facade pattern: root `xdg-open`/`exo-open` wrappers expose familiar command names while delegating governing behavior to the bridge.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/docker/` | Folder | Server Docker packaging | Runtime Docker scripts and image configuration. | The bridge is injected by `Dockerfile.monorepo` and serves root-side server image behavior. | browser-docker base runtime implementation. |
| `autobyteus-server-ts/docker/open-vnc-browser-url.sh` | File | Browser bridge | Recursion-safe root-to-VNC URL opening. | Existing source owner and Docker copy source. | Root wrapper duplication or generic browser selection subsystem. |
| `autobyteus-server-ts/docker/xdg-open-root-bridge.sh` | File | Thin root facade | Root `xdg-open` delegation, non-root system pass-through. | Existing source owner and Docker copy source. | VNC env assembly or uid transition logic. |
| `autobyteus-server-ts/docker/exo-open-root-bridge.sh` | File | Thin root facade | Root `exo-open` delegation, non-root system pass-through. | Existing source owner and Docker copy source. | VNC env assembly or uid transition logic. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/docker/` | Mixed Justified | Yes | Low | Existing Docker packaging folder holds image scripts; adding no new folder is clearer for a one-file shell invariant fix. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Post-switch opener dispatch | `env ... BROWSER= /usr/bin/xdg-open "$url"` | `env ... xdg-open "$url"` with inherited `BROWSER` | The good shape avoids both `$BROWSER` recursion and `/usr/local/bin/xdg-open` bridge recursion. |
| Uid branch | `if current uid == vncuser: exec opener; elif current uid == 0: runuser ...; else fail` | Always `runuser -u vncuser` | The good shape prevents `runuser` from being invoked by non-root `vncuser`. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep unconditional `runuser` and only clear `BROWSER` | Minimal edit | Rejected | Still fails for direct already-`vncuser` invocation; use uid-aware branch. |
| Keep unqualified `xdg-open` and rely on PATH/wrapper non-root pass-through | Avoid absolute path | Rejected | It still traverses root bridge naming and can preserve recursion risk; call `/usr/bin/xdg-open`. |
| Add a second compatibility wrapper for old behavior | Preserve old flow | Rejected | Old flow is the bug; cleanly replace it. |

## Derived Layering (If Useful)

Layering is simple and ownership-led:

`Root caller facade -> Browser bridge owner -> Base OS desktop opener -> Browser-docker desktop session`

No new layer is introduced.

## Migration / Refactor Sequence

1. Modify `autobyteus-server-ts/docker/open-vnc-browser-url.sh` to implement the uid-aware sanitized opener logic.
2. Review `xdg-open-root-bridge.sh` and `exo-open-root-bridge.sh` to confirm no change is needed for root delegation/non-root pass-through.
3. Run shell/static validation against the script behavior:
   - source inspection or focused test confirms no unconditional `runuser` branch;
   - already-`vncuser` invocation does not emit the non-root `runuser` error;
   - root invocation with recursive `BROWSER` setup does not re-enter the bridge;
   - wrappers still delegate/pass through as designed.
4. If environment permits, perform a container smoke check that `/usr/local/bin/open-vnc-browser-url.sh 'https://github.com/login/device'` opens an existing browser session.

## Key Tradeoffs

- Using `/usr/bin/xdg-open` directly is less flexible than PATH lookup, but it is the correct tradeoff because the server image intentionally shadows `xdg-open` in `/usr/local/bin` for root callers.
- Clearing `BROWSER` may make `/usr/bin/xdg-open` use desktop defaults instead of caller-provided browser preference inside the `vncuser` context. This is intentional: caller-provided `BROWSER` points to the bridge and is unsafe after crossing the boundary.
- Dynamic `vncuser` uid lookup is slightly more code than assuming uid 1000, but it avoids hard-coding the uid in the branch condition while retaining existing VNC env paths.

## Risks

- Desktop opener behavior varies by environment; tests should validate invariants rather than only one observed opener branch.
- Unsupported downstream image copies outside this repository will remain old until rebuilt from updated source.
- Full `gh auth login` testing may require account interaction; downstream API/E2E should use non-secret smoke checks where possible.

## Guidance For Implementation

Use the live-container patched script as the semantic target, but apply it cleanly to the repository source. Ensure quoting and array usage remain shell-safe with `set -euo pipefail`.

Expected target shape:

```bash
vnc_uid="$(id -u vncuser 2>/dev/null || true)"

open_as_vncuser=(env \
  DISPLAY=:99 \
  XAUTHORITY=/home/vncuser/.Xauthority \
  XDG_RUNTIME_DIR=/run/user/1000 \
  DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus \
  BROWSER= \
  /usr/bin/xdg-open "${url}")

if [[ -n "${vnc_uid}" && "$(id -u)" -eq "${vnc_uid}" ]]; then
  exec "${open_as_vncuser[@]}"
fi

if [[ "$(id -u)" -eq 0 ]]; then
  exec runuser -u vncuser -- "${open_as_vncuser[@]}"
fi
```

Then add the unsupported-user diagnostic branch. Do not add compatibility wrappers or change browser-docker.
