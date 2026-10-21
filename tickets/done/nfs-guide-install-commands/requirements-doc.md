# Requirements — NFS guide installer commands

## Document status and approval
- Status: **Approved**, baseline **R1 / SR-001**; 2026-10-21.
- Package: `nfs-guide-install-commands`; Task **autobyteus-254**, `project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3`.
- Requested by: `/project_task_manager`, run `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`.
- Requirements owner / approver: **Solution Designer within the direction (user informed)**. Approval reference: conversation message beginning “The disabled buttons come from an unset release link in the app; NFS v0.1.0 is already published”, explaining checksum-checked installation, quick-start, commands, copy-only behavior and deferred field testing. No outstanding Needs user decision.
- Direction: PM's user-approved bounded application UI task; user's additional “add some basic guidelines there just like docker guide, like all the avaialble commands”. This baseline includes that clarification, not a separate scope request.
- Behavior-defining supplements: none. Screenshots are existing-state/style references, not a separate approved Product design.
- Authorities read: updated solution-designer SKILL.md, requirements-engineering.md, finding-the-cause.md, ticket-scope.md, handoff.md; requirements/investigation/revision templates; applicable root AGENTS.md, DESIGN.md, TESTING.md, RELEASE.md and web AGENTS.md. Evidence resides in investigation-notes.md.

## Problem and desired outcome
The NFS tab still announces unavailable commands despite a public standalone v0.1.0. Users need accurate installation and basic usage instructions in the app, as conveniently copyable as Docker's guide. Success is a readable, truthful Mac/Linux guide whose Copy buttons place the displayed command in the clipboard, without acting on storage or installing anything.

## Relevant current / desired / preserved behavior
| ID | Kind / scenarios | Current | Desired | Preserved / evidence |
|---|---|---|---|---|
| BEH-001 | User; SCN-001 | Both install commands absent; release descriptor is null | Published version and host-specific installation instructions available | Explicit user copy only; INV-01/02 |
| BEH-002 | User; SCN-002 | Create/connect explanatory prose, no direct usage command reference | Concise ordered quick-start and all six documented public commands plus interactive entry | Standalone service; ordinary filesystem application boundary; INV-03 |
| BEH-003 | User; SCN-003/004 | Guarded clipboard, success/error feedback and unavailable fallback | Extend those outcomes to every displayed command | No execution, no privileged action or background release/host probing; INV-04 |
| BEH-004 | Contract; SCN-001/002/004 | Old copy conflates release availability with qualification | Distinguish downloadable targets/intended hosts from deferred field validation | Trust, outage, unsupported-platform and app independence warnings; INV-02/03 |

## Actors and scope guardrail
Actor: app user/operator who reads the guide and separately chooses what to run on a host. Engineering must verify guide behavior, not perform installation on the user's behalf.

| Use case | Authorized scope | Scenarios |
|---|---|---|
| UC-001 | Find/copy correct installer for published Mac/Linux targets | SCN-001/004 |
| UC-002 | Understand create vs connect and find installed-tool commands | SCN-002 |
| UC-003 | Copy with clear success/failure and accessible responsive presentation | SCN-001/002/003 |

**Out of scope:** NFS repository/source/installer/runtime/release changes; field/physical/shared-filesystem testing (existing autobyteus-nfs-4); live installation or mounts/exports/data/nodes; app-node/UUID/admission/Git-trust/launcher coupling; dashboard; workspace/agent skill edits; application release/version/tag; unrelated settings/runtime cleanup. Docker guide behavior and commands remain unchanged.

**Non-goals:** automatic latest-release discovery; exhaustive advanced flags or internal service operations; a new guide framework; claiming install/runtime qualification on all published architectures.

**Preserved boundary:** BEH-003/004, REQ-003/004/005. No persisted application data is read or changed by the guide. Generic directory binding and app filesystem APIs stay independent.

**Prerequisites:** None. Actual public installer/checksums were fetched read-only; field testing is not a prerequisite for this informational guide.

**Review authority:** blocking corrections must cite these REQ/AC/BEH IDs. New product/runtime/security-policy/migration behavior is a Requirement Gap requiring Solution Designer resolution/approval, not an implicit reviewer extension. Out-of-scope suggestions do not expand this ticket.

## Requirements
| ID | Intended outcome | BEH / use case | Priority / basis |
|---|---|---|---|
| REQ-001 | Show a normal v0.1.0 installer command for macOS and Ubuntu Linux, ARM64/x64, referencing the real published asset. Verify the installer checksum before invoking it and retain its own archive/manifest checks. Installation invocation ends with `version`, not implicit storage setup. Explain host terminal, review-before-running and no Go/Homebrew requirement. | 001/004; UC-001 | Must; task, actual installer, DEC-001/002 |
| REQ-002 | Add ordered basic guidance: install on participating hosts; create once on storage host; connect other hosts using printed connection JSON; select resulting ordinary directory separately. Offer copyable no-argument entry and `create`, `connect`, `status`, `reconnect`, `detach`, `version`, with concise accurate descriptions and no invented commands. Use a path usable without changing PATH. Warn that host commands other than version may request administrator approval; drain users before detach; status/reconnect may wait for storage. | 002/004; UC-002 | Must; latest user clarification, published CLI |
| REQ-003 | Copy writes exactly the displayed command and never executes, fetches, installs, elevates, probes or configures a host. Show success only after clipboard resolution; rejected/unavailable clipboard offers manual selection. Preserve pending-copy guard and unmount/timer cleanup. | 003; UC-003 | Must; task and existing behavior |
| REQ-004 | Show intended floors macOS 26+/APFS hosting and Ubuntu 24.04/ext4 hosting, ARM64/x64 distribution targets, explicit deferred physical/independent-client/user tests. Keep unencrypted trusted-private-network, outage/no-offline-fallback, no Windows/Mac Docker hosting, separate generic container setup and app filesystem-only statements. No “fully qualified” implication. | 004; UC-001/002 | Must; public release and scope |
| REQ-005 | Preserve meaningful missing/invalid/unsupported release states: no invented install command/link; unsupported host instructions remain explicit. No app OS detection is needed to browse both host guides. Preserve Docker guide. | 001/003/004; UC-001/003 | Must; existing fallback / task |
| REQ-006 | Reuse the guide's existing visual vocabulary with numbered installation/usage sections and readable command cards. Localize English and Simplified Chinese. Keyboard-operable, uniquely labeled Copy buttons, polite status, code selectable and locally scrollable at narrow widths. | 001/002/003; UC-001/002/003 | Must; task's Docker reference and web conventions |

## Relevant scenarios and journeys
| ID | Actor/trigger and sequence | Expected / alternate outcome | Validity / independent basis | REQ / AC |
|---|---|---|---|---|
| SCN-001 | User opens Nodes → NFS Guide; reads target/version/review guidance; copies a platform installer | Exact supported command in clipboard; no install, network or host action from copying | Supported Normal Scenario; PM screenshots/task, actual public release | 001/003/004/006; AC-001/003/005 |
| SCN-002 | User reads next steps and copies interactive/create/connect/maintenance command for later host-terminal use | Correct published command/path, role and safety context; no action performed by app | Supported Normal Scenario; direct user request and v0.1.0 README/CLI | 002/003/004/006; AC-002/003/005 |
| SCN-003 | User clicks Copy but clipboard permission/API rejects; or leaves tab while request/timer is pending | No false success; manual selection guidance; no stale update after unmount | Supported Explicit Edge Scenario; existing clipboard promise/error lifecycle | 003/006; AC-003 |
| SCN-004 | Guide is provided unavailable/partial/invalid release data, or user reads Windows/Mac Docker limits | No misleading install/link; accurate remaining available targets and limitations | Supported Explicit Edge Scenario; existing safe-URL/null/partial guards and task requirement | 004/005; AC-004/005 |
| SCN-X01 | App executes install, probes mount identity, advertises internal `service`/`internal-*` as normal commands | Not implemented or tested as an accepted user workflow | Technically Possible but Unsupported/Contrived; not public operator guide or approved app responsibility | Excluded |

## Acceptance criteria
| ID | Links | Observable expected result / failure outcome | Verification intent |
|---|---|---|---|
| AC-001 | REQ-001; BEH-001; SCN-001 | Both current platform commands visible/copyable with exact v0.1.0 URL/hash and `version` invocation; checksum failure cannot reach invocation in the command chain. No missing-release text on current valid data. Instructions state where to run/review and install-only outcome. | Pure command tests with fixed independent expectations; shell syntax/control check with stubbed tools only; UI rendering/clipboard |
| AC-002 | REQ-002; BEH-002; SCN-002 | No-args plus all six documented public commands available, using `~/.local/bin/autobyteus-nfs`; create/connect role order and approval/drain/wait caveats correct. No `start`, `stop`, `update`, `install` CLI inventions or internal-service commands. | Contract comparison, component tests and rendered walkthrough |
| AC-003 | REQ-003/006; BEH-003; SCN-001/002/003 | Each Copy gives exact displayed text only; feedback is promise-accurate, concurrent pending click blocked, failure/manual fallback and unmount cleanup covered. | Focused clipboard component tests + real rendered clipboard probe; no live install |
| AC-004 | REQ-005; BEH-001/003/004; SCN-004 | Null/invalid descriptor disables install actions and removes unusable links; partial targets don't advertise unavailable platform commands; non-install reference clearly presupposes installed tool. Docker output unchanged. | Negative/partial utility/component cases; adjacent Docker guide regression |
| AC-005 | REQ-004/006; BEH-004; SCN-001/002/004 | Target/version/field-deferred/host/privacy/outage text truthful in both locales; accessible names/status and readable responsive layout; no document-wide horizontal overflow at narrow viewport. | Locale checks and browser rendering at desktop + narrow width; preserve app independence |

## UI / quality / continuity
UI applicable. Existing Docker and NFS screenshots guide style, not a new Product-owned deliverable. Product designer request/repository/spec/approval: **N/A**, none requested or needed for this local extension. Required visual outcomes are REQ-006/AC-005; spacing/copy may be refined within that direction.

Quality: QR-001 security/safety = REQ-001/003/004, AC-001/003/005; QR-002 accessibility/localization = REQ-006, AC-003/005; QR-003 compatibility/fallback = REQ-005, AC-004. No performance benchmark or new platform promise.

Persisted/external data affected: **No**. Preserve all application/NFS/user data, canonical dirty checkout and PM boards. Acceptable loss/reset: none. Commands only change a host if a user independently executes them outside the app; the guide must explain that boundary.

## Contracts, assumptions and decisions
External contracts: public v0.1.0 installer, checksum manifest and six-command CLI at source `238bdc183e8affac99ffdee9be9cb333b0eb126f`; browser clipboard API. Detailed sources/limitations in investigation notes. Publication is established, not inferred from compiled artifacts. Manual future release refresh is acceptable; no automatic “latest” service required. No unresolved material assumptions.

| ID | Question / evidence and reasoning | Decision / owner / status |
|---|---|---|
| DEC-001 | Latest lookup vs known release? App has static descriptive data; real immutable v0.1.0 exists. Network discovery creates unrelated runtime/error behavior. | Pin verified public v0.1.0; manual data refresh later. Solution Designer / Decided |
| DEC-002 | Pipe installer into setup vs install-only? Published installer forwards arguments; `version` returns before host checks/elevation. Script checksum is publicly verifiable; release docs recommend reviewing first. | Copy install-only command with pinned script integrity check, review/source link guidance; separate interactive configuration. No auto-consent flags. Solution Designer / Decided |
| DEC-003 | What does “all available commands” mean? README lists six public commands plus no-args menu; parser additionally contains daemon/internal commands not documented for ordinary use. | Include every public operator command and entry menu, link upstream docs for flags, not internals. Solution Designer / Decided |
| DEC-004 | Publication vs qualification? Release and receipt explicitly defer field tests. | Show downloadable targets/intended host limits, not “field-qualified”; separate disclaimer. Solution Designer / Decided |

## Supplements / readiness
Evidence inventory in investigation-notes.md: retrieved release metadata/script/checksums and actual module probe. These establish facts, not independent behavior approvals. No Product supplement or new follow-up. Current availability contradiction is in scope; old NFS field custody unchanged. Readiness gate passed: scenarios, boundaries, decisions, ACs and data preservation explicit; no Needs user decision or prerequisite. Next: complete architecture design, then classify and route.
