# Ubuntu AppImage Sandbox Startup — Requirements Document

## Document Status

- **Status:** Approved — conditional AppImage fallback behavior.
- **Current solution revision:** SR-005 (post-review design/evidence correction); approved behavior baseline SR-001, approval captured in SR-002, evidence correction SR-003. No intended-behavior change in SR-004 or SR-005.
- **Package identifier:** `ubuntu-appimage-sandbox-startup`.
- **Request:** Diagnose and then consider removing the need for a manual `--no-sandbox` flag in the Linux AppImage.
- **Requirements owner:** Solution Designer.
- **Date:** 2026-09-24.
- **Approval state/reference:** Explicit user approval in the 2026-09-24 conversation: “i agree for systems user have to use --no sandbox, we provide the default no sandbox, for system like earlier ubuntu they dont even requrie, then user can start normally”. This approves the conditional fallback represented by SR-001; no requirement text was changed for approval.
- **Exact approved baseline:** This `requirements-doc.md` SR-001 behavior baseline, approved without content changes in SR-002 on 2026-09-24.
- **Behavior-defining supplements:** N/A.

## Problem And Desired Outcome

On Ubuntu 26.04 the released v1.4.78 AppImage aborts before application startup unless the user knows to pass `--no-sandbox`. That is unacceptable for ordinary users. The approved outcome is a normal, no-flags AppImage launch on both sandbox-capable and sandbox-restricted Linux hosts, preserving Chromium's process sandbox where it works and accepting an automatic no-sandbox fallback only where it does not. This is the user-approved conditional compromise, **not** an unconditional disablement across all Linux hosts.

## Relevant Current And Desired Behavior

| ID | Kind / scenarios | Evidence-backed current behavior | Proposed desired behavior | Intentionally preserved behavior |
| --- | --- | --- | --- | --- |
| BEH-001 | User; SCN-001 | On this Ubuntu 26.04 host, no-flag AppImage launch exits 133 before AutoByteus starts. | Normal launch succeeds without users knowing a special flag; when host policy blocks Chromium sandboxing, launch uses an automatic no-sandbox fallback. | No host-wide security-setting changes; existing data and application behavior unchanged. |
| BEH-002 | User/security; SCN-002 | On reported Ubuntu 20/22, direct no-flag AppImage launch works; however the embedded `.desktop` entry in v1.4.78 already passes `--no-sandbox`, so desktop-integrated launch is unsandboxed even there. The prior claim that all normal launches were sandboxed was unsupported and is corrected by SR-003. | Both direct and desktop-integrated normal launches use Chromium sandboxing when available. | Avoid globally disabling sandboxing for every Linux user. |
| BEH-003 | Operational/CLI; SCN-003 | The AppImage wrapper forwards user arguments; `ELECTRON_RUN_AS_NODE=1` invokes Node mode, which rejects Chromium-only flags. | GUI fallback must not break Node-mode or other existing entrypoints. | Explicit caller arguments and supported launch modes. |
| BEH-004 | System; SCN-004 | Released AppImage and `latest-linux*.yml` metadata support updater and release workflow. | New AppImage remains updateable and releaseable through the supported Linux process. | Existing updater behavior and artifact naming/metadata. |

## Stakeholders And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| Ordinary Linux user | Double-click/run the AppImage | App starts without a terminal flag | No knowledge of sandbox internals required |
| Security-conscious user | Retain isolation where possible | Chromium sandbox stays enabled on capable hosts | Any fallback is bounded and documented |
| Release operator | Publish and update Linux app | Working x64/arm64 artifacts and updater metadata | No silent release regression |

## Scope Guardrail

### In Scope

- UC-001: Normal AppImage launch on a host where Chromium sandboxing works.
- UC-002: Normal AppImage launch on a host where OS policy blocks Chromium sandboxing, including the reproduced Ubuntu 26.04 case.
- UC-003: Existing CLI/Node-mode and explicit launch arguments continue to work.
- UC-004: AppImage packaging, updater, and release compatibility are preserved.

### Out Of Scope

- Adding `.deb`, Snap, Flatpak, or other distribution formats in this change.
- Modifying the user's Ubuntu AppArmor/sysctl configuration.
- A blanket `--no-sandbox` policy on all Linux installations; this is an alternative only if the user explicitly prefers it over conditional fallback.
- Reworking unrelated browser or renderer security features, or changing app data.

### Non-Goals

- Guaranteeing full Chromium sandboxing on a host where policy prohibits it without installation/privileged configuration.
- Requiring users to invoke a special command, install a profile manually, or know the meaning of `--no-sandbox`.

### Preserved Behavior Boundary And Review Authority

Preserve BEH-002 through BEH-004 and AC-002 through AC-006. A downstream proposal to remove the sandbox unconditionally, add a new installer, or modify host security policy is a requirement change requiring explicit user approval. Review findings must trace to approved IDs rather than expanding this scope by implication.

## Requirements

| ID | Requirement | Related behavior | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | The Linux AppImage must start its GUI normally without a user-supplied sandbox flag on supported hosts where Chromium sandbox setup is blocked by OS policy. | BEH-001 | Must | User problem and local reproduction |
| REQ-002 | The Linux AppImage must retain Chromium process sandboxing on hosts where it is usable; automatic no-sandbox fallback may occur only when necessary for launch. | BEH-001, BEH-002 | Must | User's explicit conditional-fallback approval (2026-09-24; SR-002) |
| REQ-003 | Fallback must not alter host-wide security settings and must be documented and diagnosable. | BEH-001 | Must | Security boundary from diagnosis |
| REQ-004 | Existing explicit arguments and supported Node-mode/CLI invocation must not be broken by GUI-only fallback behavior. | BEH-003 | Must | Local `ELECTRON_RUN_AS_NODE` probe |
| REQ-005 | AppImage artifact generation, x64/arm64 release validation, and updater metadata must remain functional. | BEH-004 | Must | Existing release and updater contracts |

## Acceptance Criteria

| ID | Related REQ / scenario | Trigger | Observable expected outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001; SCN-001 | Launch released AppImage with no arguments on default Ubuntu 26.04 (and representative 24.04) | AutoByteus GUI and embedded server start; no sandbox-related abort or manual flag. | Packaged runtime test on restricted hosts |
| AC-002 | REQ-002; SCN-002 | Launch AppImage with no arguments on a host allowing Chromium namespace sandbox | GUI starts and Chromium process sandbox remains enabled. | Packaged runtime/security-state test on capable host |
| AC-003 | REQ-002, REQ-003; SCN-001 | Host cannot initialize Chromium sandbox | Only that GUI launch uses the no-sandbox fallback; a clear log or diagnostic states it occurred, without blocking the user. | Packaged launch and log inspection |
| AC-004 | REQ-003; SCN-001 | Install/run/quit AppImage | No AppArmor profile or sysctl settings are written or changed on the host. | Host-policy before/after comparison |
| AC-005 | REQ-004; SCN-003 | Invoke supported Node/CLI mode or explicit arguments | No GUI-only Chromium flag is injected into Node mode; arguments are preserved. | Packaged-mode tests |
| AC-006 | REQ-005; SCN-004 | Build/publish x64 and arm64 AppImages; exercise update path | Artifacts, `latest-linux*.yml`, and updater behavior remain valid. | CI artifact checks plus update smoke test |

## Relevant Scenarios

| ID | Classification | Actor / trigger | Product-level sequence | Expected outcome | Alternate/error behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Supported Normal Scenario | User opens AppImage on Ubuntu 24.04+/26.04 with default restricted user namespaces | OS launches package; app starts without special flag | Working GUI and embedded server; bounded fallback is recorded | A non-sandbox startup failure remains a surfaced error, not blindly masked | Local Ubuntu 26.04 reproduction; Ubuntu policy docs |
| SCN-002 | Supported Normal Scenario | User opens AppImage on sandbox-capable Linux (e.g., reported Ubuntu 20/22) | OS launches package normally | Working GUI with Chromium sandbox intact | N/A | User report; older OS matrix, not local reproduction |
| SCN-003 | Supported Explicit Edge Scenario | Tooling invokes package in Node/CLI mode | Caller supplies supported mode/arguments | No incompatible GUI-only flag; caller gets expected behavior | Unknown bad args remain caller errors | Local `ELECTRON_RUN_AS_NODE` probe |
| SCN-004 | Supported Operational Scenario | Release/updater publishes or downloads AppImage | Existing Linux artifact/metadata lifecycle runs | Upgrade behavior and artifact naming remain valid | Release gate fails on bad artifact | Repository build/release workflow |

## UI / Quality / Data

- UI/UX prototype: N/A — no new screen is required. A nonblocking diagnostic log is sufficient for the approved fallback; no popup is required.
- QR-001 (security; REQ-002/AC-002): retain Chromium sandbox where supported.
- QR-002 (operability; REQ-001/AC-001): no manual flag or host-admin step for an ordinary AppImage launch.
- Persisted/external data affected: No. User data and existing updater state must remain intact; no data migration is proposed.

## External Contracts And Dependencies

- Ubuntu AppArmor restrictions since 24.04; see `investigation-notes.md`.
- Electron's `--no-sandbox` disables Chromium sandboxing across processes; see `investigation-notes.md`.
- AppImage FUSE/runtime and electron-builder packaging/updater; current repo uses electron-builder 25.1.8 and AppImage-only Linux release assets.

## Open Decisions

| ID | Question | Why it matters | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Approve conditional fallback as specified, rather than disabling sandbox for all AppImage users? | Defines the security boundary and implementation/testing scope. | User | Approved in 2026-09-24 conversation (SR-002) |
| DEC-002 | Should a separate installed Ubuntu package with a scoped AppArmor profile be considered later? | Could preserve sandbox on restricted hosts but expands distribution and release scope. | User | Out of scope for this baseline |

## Traceability And Readiness

- REQ-001 → UC-002, BEH-001, AC-001, SCN-001.
- REQ-002 → UC-001/UC-002, BEH-001/BEH-002, AC-002/AC-003, SCN-001/SCN-002.
- REQ-003 → UC-002, BEH-001, AC-003/AC-004, SCN-001.
- REQ-004 → UC-003, BEH-003, AC-005, SCN-003.
- REQ-005 → UC-004, BEH-004, AC-006, SCN-004.
- Content ready for user approval: Yes; approved in SR-002 without behavior changes.
- User approval received: Yes, for conditional fallback (SR-002). Revised design is complete at SR-005 and awaits renewed independent architecture review before implementation handoff.
