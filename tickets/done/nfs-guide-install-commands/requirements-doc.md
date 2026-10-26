# Requirements — NFS Guide concise footer (R3)

## Document status and approval
- Package **nfs-guide-install-commands**; Task **autobyteus-254** / `project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3`; Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- **R3 / SR-005 Approved**, 2026-10-26. Owner/approver: Solution Designer within the explicit user direction. Requested by `/project_task_manager`, run `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`.
- Saved Task read in full at intake and again before approval. Latest Oct26 comment governs: “the cli line can be removed”, “also so so much information at the bottom”; learn from Docker Guide, preserve commands/Copy and essential safety.
- Approval reference: conversation message starting “The footer is currently 164 words. I’ll replace it with one short folder-use tip and a compact warning…”. Exact baseline R3/SR-005, no behavior-defining supplement or Needs user decision.
- R1/SR-001–002 and R2/SR-003–004 were delivered; their results remain historical. R3 supersedes ONLY earlier advanced-link/long-footer preservation expectations. No claim historical tests prove this revision.
- Authorities read: solution-designer SKILL, requirements-engineering, finding-the-cause, ticket-scope and handoff references; requirements/investigation/revision templates; fresh worktree root AGENTS/DESIGN/TESTING/RELEASE, GLOSSARY; web AGENTS/ARCHITECTURE.

## Problem and desired outcome
An everyday setup page ends with a redundant CLI documentation link and a 164-word footer containing repeated usage prose and internal validation narrative. Users should find/copy commands and understand essential precautions without reading a release-engineering report. Remove the advanced line and replace the footer with brief practical guidance comparable in density to the Docker Guide. This is an application UI change, not an independent NFS product change.

## Relevant current, desired and preserved behavior
| ID | Kind / scenarios | Evidence-backed current → desired | Preserved |
|---|---|---|---|
| BEH-001 | User; SCN-001/004 | Two published installer cards → unchanged | Exact pinned command strings, release notice, host/tooling/review guidance, unavailable states |
| BEH-002 | User; SCN-002/006 | Seven installed-tool cards plus advanced README line → cards retained, line removed | Order, command bytes, role/admin/drain/wait instructions |
| BEH-003 | User; SCN-003 | Clipboard lifecycle → unchanged | Copy text only, pending/success/error/manual selection/timer/unmount |
| BEH-004 | Contract; SCN-001/002/004/006 | Long footer explains ordinary paths, Docker, trust, outage, limits and tests → concise usage/safety on page; details remain in docs | No expanded support, field-pass implication, mount detection or app/storage coupling |
| BEH-005 | User; SCN-005 | Two R2 installation links already absent → stay absent | Review via URL in command, no empty reserved link area |
| BEH-006 | User; SCN-006 | Oversized end-of-guide section → one short folder tip and compact safety note, no standalone advanced link or trailing caveat paragraphs | English/Chinese and narrow/desktop readability; no repeated wall of text |
Evidence: INV-11–15 in investigation-notes.md; current screenshots and exact source citations.

## Actors / Scope Guardrail
Actor: user opening Nodes → NFS Guide to install/use the independent tool through their own host terminal. Engineering owns accurate concise copy, not execution or host verification.
- UC-001 find/copy installer (SCN-001/004), UC-002 use command reference (SCN-002), UC-003 read a localized copy-only guide (SCN-001–006).
- **R3 change:** BEH-002/004/006 presentation only: advanced link and footer at the end of the guide. Keep all command cards and the top/role instructions.
- **Out of scope:** NFS repository/binary/installer/runtime/security policy/field campaign; live installs, mounts, exports, nodes, data; new app-node/UUID/launcher coupling; Docker Guide changes; links outside this guide component; skills; release/version/tag/deploy/installed-app upgrade or mandatory repeat user check.
- **Non-goals:** redesign, new components/dependencies, automatic release lookup, refreshing v0.1.0 pins or adding newer dashboard commands, new platform support, hiding the long text behind an accordion or recreating it elsewhere on the page.
- **Preserved:** REQ-001/003/005/007, remaining REQ-002/004/006 outcomes. Existing autobyteus-nfs-4 owns field validation, separate and not a prerequisite. Existing release pin is deliberately preserved by the explicit current request.
- **Prerequisites:** None. No material unresolved decision. Canonical dirty checkout, PM boards and previous detached receipt worktrees remain untouched.
- **Review authority:** a blocking finding must cite approved REQ/AC/preserved behavior. New scope, security/compatibility or product policy returns as Requirement Gap; adjacent concerns follow ticket-scope.md, not silent expansion. Reviewer comments do not amend requirements.

## Requirements and traceability (stable IDs)
| ID | Intended outcome / R3 disposition | Use case / behavior / scenarios / AC |
|---|---|---|
| REQ-001 | Preserve both exact macOS/Linux installer commands, v0.1.0 URL/digest, fail-closed chain/trailing version, host prerequisites and review-before-running guidance. | UC-001; BEH-001/004; SCN-001; AC-001 |
| REQ-002 | Preserve ordered create/connect instructions, no-args menu and create/connect/status/reconnect/detach/version cards. Remove the advanced documentation line, not the commands. | UC-002; BEH-002; SCN-002/006; AC-002/007 |
| REQ-003 | Copy writes exactly displayed text and never executes/fetches/installs/elevates/probes. Preserve all supported clipboard lifecycle outcomes. | UC-003; BEH-003; SCN-001–003; AC-003 |
| REQ-004 | Preserve truthful support/security/qualification facts. Page keeps brief ordinary-folder usage, trusted-private-network/unencrypted/no-public-internet restriction and practical outage consequence. Detailed platform, trust, checksum and deferred-testing limits stay in documentation/records rather than repeated footer paragraphs. | UC-001/002/003; BEH-004/006; SCN-001/002/004/006; AC-005/007 |
| REQ-005 | Preserve valid/partial/null/invalid availability and version behavior, unsupported states and both host guides. No background OS/mount checks. Docker unchanged. | UC-001/003; BEH-001/003/004; SCN-004; AC-004 |
| REQ-006 | Preserve localized, accessible keyboard Copy/feedback and selectable locally scrollable commands; concise desktop/narrow layout, no empty removed-link area or page overflow. Remove only newly obsolete NFS prose keys. | UC-003; BEH-001–006; SCN-001–006; AC-003/005–007 |
| REQ-007 | R2 standalone download/review links remain absent; review guidance points to URL in the command. | UC-001/003; BEH-005; SCN-005; AC-006 |
| REQ-008 | Remove advanced CLI line entirely. Replace oversized footer with one unboxed short usage sentence and one compact safety note (short heading plus at most two short body paragraphs). No trailing platform/testing/checksum narrative, new links, or hidden full disclaimer. English footer at most 60 words total; equivalent concise Chinese. | UC-003; BEH-006; SCN-006; AC-007 |

## Relevant scenarios and journeys
| ID | Trigger, steps, expected and alternate outcome | Validity / independent basis |
|---|---|---|
| SCN-001 | Open Nodes → NFS Guide, select macOS/Linux Copy → unchanged displayed text copied only. | Supported Normal Scenario; existing UI and original request |
| SCN-002 | Read roles/reference, copy installed-tool command → unchanged text and practical role guidance; advanced link is no longer on page. | Supported Normal Scenario; original basic-guidelines request plus R3 |
| SCN-003 | Clipboard promise waits/fails or guide unmounts → accurate feedback/manual selection, no duplicate request or stale timer. | Supported Explicit Edge Scenario; existing browser clipboard contract preserved |
| SCN-004 | Valid/partial/null/invalid descriptor → correct availability/version; no invalid command enabled. | Supported Explicit Edge Scenario; existing availability contract |
| SCN-005 | Read installer section in either locale → no R2 standalone links, coherent review reminder. | Supported Normal Scenario; Oct24 request preserved |
| SCN-006 | Read end of guide in en/zh-CN at desktop/narrow widths → no advanced link or long footer; brief folder tip plus trust/outage guidance; all command cards remain usable. | Supported Normal Scenario; Oct26 exact direction and screenshots |
| SCN-X01 | App executes installer, checks mounts or qualifies storage for reader | Unsupported for this copy-only task; no such product action authorized |

## Acceptance criteria
| ID | Requirement / scenario | Observable result / verification intent |
|---|---|---|
| AC-001 | REQ-001; SCN-001 | Same exact two install strings/URL/digest/version; checksum/download refusal not altered. Compare current helper/expected bytes; never execute real installer. |
| AC-002 | REQ-002; SCN-002 | Seven installed-tool cards/commands/order and role/admin/drain guidance unchanged; advanced-link requirement explicitly superseded by AC-007. |
| AC-003 | REQ-003/006; SCN-001–003 | Nine Copy buttons preserve exact text and promise-accurate lifecycle, accessible names/keyboard and manual selection. Focused component and actual browser checks; no execution. |
| AC-004 | REQ-005; SCN-004 | Partial data enables only valid platform and retains version; null/invalid disables affected cards/version. No standalone link in any state. Docker unchanged. |
| AC-005 | REQ-004/006; SCN-001/002/004/006 | Essential trust/unencrypted/outage advice and existing intended-host cards remain truthful in both locales. No support expansion or claim field tests passed. Detailed removed material retained in guide documentation/records. |
| AC-006 | REQ-007/006; SCN-005 | R2 links remain absent; review via displayed URL intact; no reserved gaps. Prior advanced-link preservation explicitly superseded by R3. |
| AC-007 | REQ-008/004/006; SCN-006 | No advanced CLI line/anchor; blue detailed block and trailing caveat paragraphs gone, short unboxed tip plus compact warning instead. English footer ≤60 words, equivalent short Chinese, no repeated internal validation prose. Rendered inspection at 1280 and 390px in both locales proves no blank area/overflow and preserved command/Copy usability. |

## UI, quality, data and external contracts
- Applicable UI: existing Nodes → NFS Guide; screenshots identify deletion area, not a new Product-owned spec. Docker Guide is read-only density/style reference. No Product handoff requested or unresolved taste decision.
- Quality: AC-003/005/007 protect accessibility, localization and compact responsive layout. No performance benchmark/capacity promise.
- Persisted data: **Not Affected**. Clipboard is the only explicit user effect, unchanged. No acceptable reset/loss or host operation.
- Contracts: existing validated release descriptor and browser clipboard semantics unchanged. No fresh release-availability claim needed for a fixed-content cleanup; command pin update would be a different decision.
- Supplements: PM's two Oct26 screenshots and R2 terminal receipt are external factual context; investigation inventories them. No behavior-defining supplement.

## Decisions and readiness
- Historical DEC-001/003/004 remain: static pinned command contract, public operator commands, distribution distinct from field proof. DEC-002's R2 installer-link removal remains.
- DEC-005 advanced-link retention is **superseded** only by explicit Oct26 direction; R2 remains valid history, not current preservation authority.
- DEC-006 (Solution Designer, Decided): keep one short folder-use sentence plus one compact safety note rather than another help panel. Source/screenshots show duplication; Docker favors action-focused cards/next step. This directly satisfies the user's requested simplification without hiding a second wall of text.
- DEC-007 (Solution Designer, Decided): remove detailed caveats from the page, retain them in existing guide documentation and historical evidence. No policy/qualification changes. A 60-word English cap makes the requested reduction measurable (current 164); Chinese retains equivalent concise meaning.
- No Needs user decision, assumption blocker or prerequisite. No additional platform/installer research required for immutable existing strings.
- Ready check: evidence, desired/preserved behavior, scope, supported scenarios, ACs, no-data-impact and approval are explicit. All required readiness items Yes; Product-specific fields N/A. R3 approved for proportionate architecture design; no current implementation or validation claim.
- Architecture input: use existing presentation/localization/clipboard owners; verify obsolete-key consumers and affected tests/docs; no new runtime boundary permitted.
