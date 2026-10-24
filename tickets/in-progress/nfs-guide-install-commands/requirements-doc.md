# Requirements — NFS guide installer commands

## Status, approval and request
- Package **nfs-guide-install-commands**; Task **autobyteus-254**, `project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3`.
- **R2 / SR-003 Approved**, 2026-10-24. Owner/approver: Solution Designer within the explicit user direction. Requested by `/project_task_manager`, run `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`.
- Latest user direction carried by PM: “remove the redundant links here ... dispatch to the same worker which earlier worked on this ticket.” PM narrows this to the two standalone links below installation cards, not links elsewhere.
- Approval reference: conversation message “The change is limited to those two links. I’ll keep the advanced-command documentation link, preserve every copied command, and make the review reminder point to the URL already shown in the command.” No Needs user decision; no Product-owned supplement.
- R1/SR-001 and SR-002 were delivered and closed on 2026-10-21. Their approval/implementation/results remain historical. R2 is only the reopened visual revision; it does not require reimplementing the original task or relabel its tests as current proof.
- Authorities read: solution-designer SKILL.md; requirements-engineering.md, finding-the-cause.md, ticket-scope.md, handoff.md; requirements/investigation/revision templates; root AGENTS.md, DESIGN.md, current TESTING.md/RELEASE.md; web AGENTS.md/ARCHITECTURE.md. Updated design authorities are listed in design-spec.md.

## Problem and desired outcome
The delivered guide has working installer cards and basic instructions, but the user finds the two standalone download/review links redundant. Remove exactly those two links, retaining useful commands, guidance and the separate advanced documentation link. Copying remains informational only.

## Relevant current, desired and preserved behavior
| ID | Kind / scenarios | Current → desired | Preserved |
|---|---|---|---|
| BEH-001 | User; SCN-001/004 | Published Mac/Linux installer cards → unchanged | v0.1.0 URL/hash/bytes, Copy, version notice and unavailable states |
| BEH-002 | User; SCN-002 | Create/connect guidance and seven installed-tool command cards → unchanged | All public commands, menu and advanced documentation link |
| BEH-003 | User; SCN-003 | Shared clipboard feedback/lifecycle → unchanged | Exact text only, no execution, accurate pending/success/failure/unmount handling |
| BEH-004 | Contract; SCN-001/002/004 | Host, safety and deferred qualification guidance → unchanged | No publication-as-field-proof or app/storage coupling |
| BEH-005 | User; SCN-005 | Two standalone installation links visible → both removed in all locales | No link removal elsewhere; review reminder remains coherent and safety-preserving |

## Scope Guardrail
- **Current change:** UC-001 find/copy installer and UC-003 readable localized copy-only guide, only as BEH-005 specifies. UC-002 use the basic command reference is preserved. The prior guide is already implemented.
- **Out of scope:** independent NFS repository/source/installer/runtime/release/field tests; live installs, mounts, exports, nodes or data; new application-node/UUID/launcher coupling; Docker guide changes; links elsewhere; dashboard; workspace/shared/agent skill edits; unrelated settings cleanup; application release/version/tag or mandatory user in-app check.
- **Non-goals:** redesign, new components, new dependency, automatic release discovery, command/pin refresh, removing descriptor validation, new platform support, replacing the review links elsewhere.
- **Preserved:** REQ-001–006 below, except standalone installer-link expectations superseded by REQ-007. Existing autobyteus-nfs-4 owns deferred field validation and is not a prerequisite.
- **Data:** Not affected. No application or external persisted-data reader/writer changes, no reset/loss permitted. Preserve canonical dirty checkout, PM boards, old detached receipt worktree and unrelated resources.
- **Prerequisites:** None. No unresolved material decision. Downstream blockers must trace to these requirements; unrelated defects follow ticket-scope.md, not silent scope expansion.

## Requirements (stable IDs)
| ID | Intended outcome / current revision disposition | Links |
|---|---|---|
| REQ-001 | Preserve both published Mac/Linux ARM64/x64 install command strings exactly, including pinned v0.1.0 installer/checksum, fail-closed chain and trailing `version`. Preserve host-terminal, review-before-running and tooling guidance. | BEH-001/004; UC-001; SCN-001 |
| REQ-002 | Preserve ordered create-once/connect-other-hosts instructions and no-args menu plus create/connect/status/reconnect/detach/version command cards with `~/.local/bin/autobyteus-nfs`; preserve role/admin/drain/wait caveats and advanced-doc link. | BEH-002/004; UC-002; SCN-002 |
| REQ-003 | Every Copy writes exactly displayed text, never executes, fetches, installs, elevates or probes. Preserve pending guard, promise-accurate success/error/manual selection, timer and unmount cleanup. | BEH-003; UC-003; SCN-001–003 |
| REQ-004 | Preserve intended hosts and deferred physical/shared-filesystem/independent-client/user testing notice; trusted-private-network, outage, unsupported host and ordinary filesystem independence guidance. | BEH-004; UC-001/002; SCN-001/002/004 |
| REQ-005 | Preserve null/invalid/partial descriptor behavior and unsupported instructions. Both host guides remain browsable; no background OS/mount checks. Docker unchanged. No standalone install links in any descriptor state (REQ-007). | BEH-001/003/004; SCN-004 |
| REQ-006 | Preserve current layout vocabulary, selectable locally scrollable code, responsive cards, accessible uniquely labeled keyboard Copy buttons, polite feedback and English/Simplified Chinese coverage. Remove obsolete link-label strings, not unrelated catalog keys. | BEH-001–005; UC-003; SCN-001–005 |
| REQ-007 | Remove only “View release downloads” and “Review the pinned installer script” standalone anchors below install cards, including their localized equivalents. Do not replace them with alternate buttons/links. Clarify that the installer to review is the URL already in the command; retain the review-before-running warning. No blank reserved link area. | BEH-005; UC-001/003; SCN-005 |

## Relevant scenarios and journeys
| ID | Actor/trigger → outcome and alternates | Validity / independent basis |
|---|---|---|
| SCN-001 | User opens Nodes → NFS Guide and copies a Mac/Linux install command → exact unchanged text, no execution | Supported Normal Scenario; delivered guide and original user request |
| SCN-002 | User reads create/connect and copies an installed-tool command → correct unchanged command, advanced documentation still accessible | Supported Normal Scenario; original basic-guidelines request |
| SCN-003 | User Copy is pending/denied or component unmounts → truthful feedback/manual selection, no stale timers | Supported Explicit Edge Scenario; preserved supported browser-clipboard contract |
| SCN-004 | Valid/partial/null/invalid release data → correct version/card availability, no invalid command and no standalone install links; reference still prerequisite | Supported Explicit Edge Scenario; preserved existing unavailable behavior |
| SCN-005 | User reads install section in English or Chinese on desktop/narrow view → cards flow directly to remaining guidance with neither requested standalone link | Supported Normal Scenario; explicit Oct24 request and two screenshots |
| SCN-X01 | App installs/probes/mounts or requalifies NFS on behalf of reader | Unsupported/contrived for this task; outside approved copy-only responsibility |

## Acceptance criteria
All five original AC IDs remain preserved; AC-006 is the new delta. Validation follows current TESTING.md by impact, not wholesale rerunning historical campaigns.
| ID | Requirement / scenario | Observable outcome and verification intent |
|---|---|---|
| AC-001 | REQ-001; SCN-001 | Same exact two install strings/URL/digest/`version`; existing checksum failure cannot invoke installer. Visible valid release notice and correct instructions. Assert fixed expected bytes/current helper unchanged; no live script execution. |
| AC-002 | REQ-002; SCN-002 | Seven installed-tool command cards unchanged and advanced README link retained with safe external-link attributes; role/safety guidance preserved. Component/DOM checks. |
| AC-003 | REQ-003/006; SCN-001–003 | Nine Copy buttons keep exact-text and pending/success/error/unmount semantics. Focused existing lifecycle tests and actual rendered Copy checks. |
| AC-004 | REQ-005; SCN-004 | Null/invalid data disables relevant install Copy/version notice; partial data preserves remaining available platform and version notice. Neither standalone install link appears in any state. Docker unchanged. |
| AC-005 | REQ-004/006; SCN-001/002/004 | Host/deferred/safety prose truthful in both locales; responsive/selectable/accessibility behavior preserved. Browser proof at desktop/narrow; no field qualification claim. |
| AC-006 | REQ-007/006; BEH-005; SCN-005 | Both requested links/labels absent from rendered install section in en/zh-CN, no reserved gap; separate advanced-doc link remains. Review reminder refers to displayed installer URL, not a removed control. Focused DOM assertions plus rendered inspection. |

## Decisions and readiness
- DEC-001/003/004 preserved from R1: fixed public release, documented public operator commands, distribution distinct from field proof. No new release lookup needed to remove UI links; command contract is frozen in this delta.
- DEC-002 updated by explicit Oct24 request: preserve exact checksum-checked install-only commands and review reminder, remove the two standalone anchors. Historical mandatory link wording no longer governs.
- DEC-005 (Solution Designer, decided within direction): keep the separate advanced-doc link and refer to the command's existing URL in the review reminder. This respects the user's “only two” boundary without losing review guidance or inventing another control.
- User-facing taste is explicitly settled by the supplied screenshots/direction. Product UI/UX deliverable: N/A. No behavior-defining supplement, no new follow-up.
- Readiness: scope, supported scenarios, preserved behavior, ACs, no-data-impact and review/removal intent are explicit. R2 Approved as recorded above; proceed to proportionate design and classification. Current revision implementation/validation not yet performed.
