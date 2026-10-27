# Design Review Report — embedded-browser-history

## Review Round Meta
- Upstream Requirements Doc: `requirements-doc.md`, R1 Approved / SR-001.
- Upstream Investigation Notes: `investigation-notes.md`, E1–E11.
- Upstream Solution Revision Record: `solution-revision-record.md`.
- Reviewed Design Spec: `design-spec.md`, SR-002.
- Supplemental Task Artifacts Reviewed: native probe source, corrected and superseded traces, stdout/cleanup record, original screenshot, follow-ups and solution handoff (canonical inventory in investigation).
- Relevant Solution Revision IDs: SR-001, SR-002.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: ARCH-REV-001.
- Current Review Round: 1; trigger: initial independent architecture gate, 2026-10-26.
- Prior Review Round Reviewed: None. Latest Authoritative Round: 1.
- Current-State Evidence Basis: independent source inspection at `a3820927cf7f57129e40f6990177156c73bea8f3`, branch `task/embedded-browser-history`; clean worktree before review artifacts. Base recorded upstream: origin/personal `ec92b3c02`.
- Workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/embedded-browser-history`.
- Ticket: `tickets/in-progress/embedded-browser-history`. Ticket-relative artifact paths below resolve here; source paths resolve under `autobyteus-web/` unless stated otherwise.
- Authorities: architecture-reviewer skill, full report/revision templates, shared design principles and scope/handoff rules; root DESIGN.md, root/web AGENTS.md, TESTING.md, browser_sessions.md, localization guidance. No closer applicable DESIGN file. Shared design examples and project design cases consulted for spine/notification boundaries and derived consumers. No conflicting project rule identified.
- Evidence limit: reviewed retained dependency execution evidence; did not rerun Electron, execute product tests, build, release, install, or access a running application.

## Routing Classification Review
- Task size: **Medium**. Several components within existing Browser ownership, one bounded observer extraction.
- Architectural risk: **High**. New renderer-to-main mutation command and required shell snapshot fields materially extend the shell contract.
- Classification rationale reviewed: sound; locale/evidence volume is not the reason for risk.
- Independent Architecture Review required by classification: **Yes**.
- Classification correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation
- Overall Basis Status: **Confirmed**.
- Approved intent: active-tab native Back/Forward, native capability-driven disabled state including same-document/same-URL history, independent tabs, preserved other controls. R1 approval is recorded by Solution Designer within Task direction, with user informed; this review does not reapprove product decisions.
- Scope guardrail: UC-001–003 in scope; no site/account work, history persistence, agent-tool expansion, new lease policy, release/install or real-user-data operations. BEH-003 / REQ-004 preservation remains binding. FU-001/002 remain deferred.
- Blocking Design Impact scope traceability: Yes (no blockers raised).
- Remaining material ambiguity: None.
- Current facts independently opened: BrowserPanel.vue:48–119,222–319,328–371 (controls, address, bounds, watcher); browserShellStore.ts:62–108,114–174,189–247 (projection/equality/actions); browser-shell-controller.ts:48–67,145–237,274–305,329–385 (selection, leases, publication); browser-tab-manager.ts:32–103,180–239,242–271,308–344,425–469,532–570 (session lifecycle, observers and popup attachment); browser-tab-navigation.ts:108–258 (existing readiness and failure semantics); register-browser-shell-ipc-handlers.ts:26–93, preload.ts:55–77, types/electron.d.ts:51–62 (transport); browser-view-factory.ts:14–24 and browser-session-profile.ts:5–21 (view and persistent partition). These substantiate E1–E8/E11 rather than assuming the existing async command shape is safe for history.

| Behavior ID | Kind | Design alignment | Trigger/current evidence | Target path coherence | Status | Required action |
|---|---|---|---|---|---|---|
| BEH-001 | Approved addition; user navigation | Pass | Pass: SCN-001/003, existing link/address paths create native entries; screenshot/source confirm missing controls | Pass: DS-001/004 native dispatch, DS-002 event projection; not loadURL replay | Confirmed | Implement and verify AC-001/003 |
| BEH-002 | Approved addition and preserved lifecycle | Pass | Pass: SCN-002/004, controller selection/close and manager per-view identity/leases | Pass: capabilities queried per retained session, inactive request inert, no post-await reselect | Confirmed | Verify AC-002/004, including flag-only change |
| BEH-003 | Preserved behavior | Pass | Pass: SCN-005, existing address/reload/tab/emulation/bounds paths | Pass: narrow URL/identity watcher, unchanged native views/partition and existing controls | Confirmed | Verify AC-005/006 in changed isolated build |

The new history operation's acceptance semantics do not change the existing navigate/reload readiness contract. AC-006 merge, integrated verification, archiving and cleanup remain delivery obligations, not completed architecture evidence.

## Supplemental Artifact Coherence Verdict
| Artifact | Purpose/scope | Linked to core | Complete for stated purpose | Consistent | Status/approval clear | Required action |
|---|---|---|---|---|---|---|
| Original screenshot (absolute path in investigation) | Pass | Pass | Pass | Pass | Pass: context, not visual approval | None; inspected supplied image only |
| probes/native-history.cjs + evidence/native-history.json | Pass | Pass | Pass | Pass | Pass: dependency evidence, not product E2E | Downstream product coverage remains required |
| evidence/native-history-initial-index-race.json | Pass | Pass | Pass | Pass | Pass: explicitly superseded despite coarse PASS marker | Do not use as traversal-completion proof |
| evidence/native-history.stdout.log + probe-cleanup.txt | Pass | Pass | Pass | Pass | Pass | Cleanup is upstream receipt, not independently repeated process audit |
| follow-ups.md | Pass | Pass | Pass | Pass | Pass: FU-001/002 deferred | Solution Designer forwards at team exit |
| solution-handoff.md | Pass | Pass | Pass | Pass | Pass | None |

Corrected trace distinguishes document/hash/SPA/same-URL transitions and native availability. Source waits for native traversal events before its traversal assertions. This supports feasibility on retained Electron 42.11.16 evidence, not exhaustive unload/failure/platform behavior. Official [NavigationHistory documentation](https://www.electronjs.org/docs/latest/api/navigation-history) confirms capability-query and directional-command APIs; [webContents documentation](https://www.electronjs.org/docs/latest/api/web-contents) distinguishes document and in-page events and frame scope. Latest docs are corroboration, not a replacement for pinned-runtime evidence.

## Task Design Health Assessment Verdict
| Assessment area | Result | Evidence | Required action |
|---|---|---|---|
| Present for current posture | Pass | Feature: missing chrome/command/projection, not missing native history | None |
| Root cause explicit/evidence-backed | Pass | E1–E7 and inspected code; responsibility-drift risk in 570-line manager | None |
| Refactor decision explicit | Pass | Extract native observers now; defer broader popup/registry changes | None |
| Refactor reflected concretely | Pass | Observer file, notification seam, removal plan and sequence; manager must not grow | Verify parity and size during implementation |

## Spine Inventory Verdict
| Spine | Scope | Readable | Narrative | Facade/owner | Domain naming | One owner per node/call order | Off-spine separation | Verdict |
|---|---|---|---|---|---|---|---|---|
| DS-001 | Primary BEH-001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Return/event BEH-001/002 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary lifecycle BEH-002/003 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded native operation BEH-001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Reviewed call-order reconstruction:
- DS-001: toolbar intent → store → preload → IPC sender identity → controller request/attachment/lease/active checks → manager session resolution → navigation capability check/dispatch → same WebContents traversal. Immediate snapshot is acceptance/current state, not completion.
- DS-002: native event → observer record update/notification → manager publication → controller shell snapshot assembly (manager history query → navigation native read) → shell IPC event → store comparison/application → active controls/address. The inventory names manager session truth and controller projection separately; the narrative gives each its own node, not competing coordinators. Observer callbacks are event/lifecycle notifications, not a mechanism calling another collaborator to execute an outsourced sequence.
- DS-003 selection: tab strip → store/preload/IPC → controller lease/selection → manager existing view/bounds → shell native attachment → snapshot → controls. Close: UI → transport/controller → manager removal/native close → session-closed → controller retained selection/projection → snapshot → controls. Views are not recreated on switch/full-view.
- DS-004: navigation owner obtains native history → requested capability check → no-op or corresponding native directional call. No new pending-load waiter, global queue or selection mutation.

## Boundary Encapsulation Verdict
| Boundary/owner | Public entry clear | Internals internal | Bypass controlled | Verdict | Notes |
|---|---|---|---|---|---|
| Shell controller | Pass | Pass | Pass | Pass | Actual sender-derived shell identity; validates tab and direction before native dispatch |
| Tab manager/navigation | Pass | Pass | Pass | Pass | Controller uses manager history APIs, not raw view history; navigation owns native reads/calls |
| Observer adapter | Pass | Pass | Pass | Pass | Manager retains registry, popup policy and destruction cleanup |
| Renderer projection | Pass | Pass | Pass | Pass | Consumes flags; no native history reconstruction or page-script execution |

## Dependency Direction / Forbidden Shortcut Verdict
| Owner/boundary | Allowed clear | Forbidden explicit | Direction coherent | Verdict | Notes |
|---|---|---|---|---|---|
| Toolbar→store→transport→controller | Pass | Pass | Pass | Pass | No renderer-supplied shell authority |
| Controller→manager→navigation | Pass | Pass | Pass | Pass | No controller raw-view history bypass |
| Native observer→manager notification | Pass | Pass | Pass | Pass | No shell policy inside observer; existing popup authorization stays manager-owned |
| Desktop Browser vs server tools | Pass | Pass | Pass | Pass | No agent summary/tool API widening |

## Interface Boundary Verdict
| Interface | Subject clear | Singular responsibility | Identity explicit | Generic risk | Verdict |
|---|---|---|---|---|---|
| BrowserShellHistoryNavigationRequest / navigateBrowserHistory | Pass | Pass | Pass: tabId + finite direction | Low | Pass |
| Controller navigateHistory(shellId, request) | Pass | Pass | Pass: transport shell + selected session | Low | Pass |
| Manager getSessionHistoryState / navigateHistory | Pass | Pass | Pass: existing session handle | Low | Pass |
| Required shell capability fields | Pass | Pass | Pass: per-session summary | Low | Pass |

Runtime request validation is explicit, not delegated to TypeScript. Foreign/unattached rejection, inactive no-op and unavailable-direction no-op are distinct rules. No await between authorization/active checks and dispatch; no late selection assignment.

## Existing Capability / Subsystem Reuse Verdict
| Need | Existing checked | Reuse sound | New piece justified | Verdict | Notes |
|---|---|---|---|---|---|
| Native traversal | Pass | Pass | N/A | Pass | Extend navigation owner, not a new history service |
| Publication/errors | Pass | Pass | N/A | Pass | Existing manager events, shell snapshots, store lastError |
| Observation | Pass | Pass | Pass | Pass | Concrete extracted adapter, not a second registry |
| Labels/view geometry | Pass | Pass | N/A | Pass | Existing locale catalogs and host-bounds mechanism |

## Subsystem / Capability-Area Allocation Verdict
| Capability | Ownership clear | Reuse/extension sound | Correct spine owners | Verdict | Notes |
|---|---|---|---|---|---|
| Electron Browser | Pass | Pass | Pass | Pass | Existing registry, lease, navigation and projection owners |
| Renderer Browser | Pass | Pass | Pass | Pass | UI intent and snapshot projection only |
| Transport/shared shell contract | Pass | Pass | Pass | Pass | Existing process boundary, not empty service |
| Localization/docs/tests | Pass | Pass | Pass | Pass | Colocated coverage and current Browser docs |

## Reusable Owned Structures Verdict
| Structure/logic | Extraction evaluated | Shared file sound | Owner clear | Verdict | Notes |
|---|---|---|---|---|---|
| Shell request/state | Pass | Pass | Pass | Pass | Existing types/browserShell.ts; tight native state type where reused |
| Native event wiring | Pass | Pass | Pass | Pass | One observer attachment per ordinary or popup-created view |
| Capability calculation | Pass | Pass | Pass | Pass | Native navigation query sole derivation owner |

## Shared Structure / Data Model Tightness Verdict
| Structure | Singular fields | No redundant additions | Overlap controlled | Core/variant decision | Verdict | Notes |
|---|---|---|---|---|---|---|
| BrowserShellTabSummary | Pass | Pass | Pass | Pass | Pass | Two required booleans; no URL stacks, index arrays or stored duplicate flags |
| Agent BrowserTabSummary | Pass | Pass | Pass | Pass | Pass | Remains separate/unmodified; shell enriches projection only |

Derived-consumer inventory: **Pass**. Design identifies producer, preload/types, store equality, activeSession/buttons, address synchronization and test fixtures; agent/list_tabs consumers stay unchanged. Independent symbol search confirms these runtime consumers. `electron/types.d.ts` additionally contains a module-local, unexported Window interface (not the global `types/electron.d.ts` declaration); it is not a second runtime snapshot authority and is not grounds to widen this change.

Vocabulary consistency: **Pass**. Existing tab_id/tabId wire conventions retained for one session identity. Back/Forward and capability flags have one native-history meaning. No unrelated domain renames.

## File Responsibility Mapping Verdict
| File/group | Singular | Matches owner | Retightened after extraction | Verdict | Notes |
|---|---|---|---|---|---|
| types/browserShell.ts; types/electron.d.ts | Pass | Pass | Pass | Pass | Required command/projection and global bridge declaration |
| electron/preload.ts; browser/register-browser-shell-ipc-handlers.ts | Pass | Pass | N/A | Pass | Transport and actual sender identity |
| browser-shell-controller.ts | Pass | Pass | Pass | Pass | Shell command policy and projection |
| browser-tab-manager.ts | Pass | Pass | Pass | Pass | Registry/lifecycle/public boundary, observer body removed |
| browser-tab-navigation.ts | Pass | Pass | Pass | Pass | Native command/query, existing readiness unchanged |
| browser-tab-observers.ts (new) | Pass | Pass | Pass | Pass | Event adapter; safe main-frame URL and notification |
| browser-tab-types.ts (if needed) | Pass | Pass | Pass | Pass | Tight main-process type only, not public tool summary widening |
| stores/browserShellStore.ts; BrowserPanel.vue | Pass | Pass | Pass | Pass | Projection/equality vs UI intent/address/rendering |
| Locales, colocated tests, docs/browser_sessions.md | Pass | Pass | N/A | Pass | Existing concern locations |

## Subsystem / Folder / File Placement Verdict
| Item | Placement clear | Folder matches owner | Split/mixed risk | Verdict | Notes |
|---|---|---|---|---|---|
| Native observer and navigation | Pass | Pass | Low | Pass | Existing electron/browser directory; no artificial hierarchy |
| Shared types/transport | Pass | Pass | Low | Pass | Existing contract locations |
| Renderer/localization/docs/tests | Pass | Pass | Low | Pass | Established project conventions |

## Removal / Decommission Completeness Verdict
| Item | Removal named | Replacement clear | Scope explicit | Verdict | Notes |
|---|---|---|---|---|---|
| Inline manager observers | Pass | Pass | Pass | Pass | Relocate once; no duplicate listeners; keep popup handler/cleanup ownership |
| Broad activeSession address watcher | Pass | Pass | Pass | Pass | Watch tab identity and URL; preserve explicit address-command sync |
| URL/title-only equality assumption | Pass | Pass | Pass | Pass | Compare both flags |
| Other dead code in touched files | Pass | N/A | Pass | Pass | No additional confirmed unreachable item found; design requires implementation audit/removal with evidence |

## Legacy / Backward-Compatibility Verdict
| Area | Dual path/compatibility retained | Clean cut explicit | Verdict | Notes |
|---|---|---|---|---|
| History command/snapshot | No | Pass | Pass | Same-release coordinated fields; no optional old-preload negotiation |
| Native history implementation | No | Pass | Pass | No deprecated API fallback, injected history or parallel stack |
| Existing URL readiness path | No | Pass | Pass | Separate preserved operation, not legacy fallback for history |

## Persisted-Data Transition Verdict (When Applicable)
| Subject | Decision | Evidence sufficient | Proportionate | Migration safety | Verdict | Notes |
|---|---|---|---|---|---|---|
| Browser history/auth partition | Not Affected | Pass | Pass | N/A | Pass | Live per-WebContents history; manager records in memory; persistent session partition/auth policy unchanged |

No historical stored schema is read, written or renamed by these flags/commands. No user-data inspection, migration, reset or rebuild is needed. Native forward-branch truncation is the approved browsing operation, not a storage migration.

## Change / Refactor Safety Verdict
| Area | Sequence realistic | Temporary seams explicit | Cleanup explicit | Verdict |
|---|---|---|---|---|
| Native API→observer extraction→controller/IPC→store/UI | Pass | Pass: no shipping dual seam | Pass | Pass |
| Required snapshot fields and fixtures | Pass | Pass: atomic same-release change | Pass | Pass |
| Observer parity and manager no-growth | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict
| Topic | Needed | Clear example | Avoided shape explained | Verdict | Notes |
|---|---|---|---|---|---|
| Same-URL capability update | Yes | Pass | Pass | Pass | Flag-only snapshot must not erase typed address |
| Selection during traversal | Yes | Pass | Pass | Pass | T1 request received when T2 active is inert; accepted T1 never later reselects |
| Native vs simulated history | Yes | Pass | Pass | Pass | Native traversal, not two renderer URL arrays or loadURL replay |

## Material Premise Validation (Only When Needed)
None additional. SCN-003 establishes same-document/same-URL history; SCN-004 expressly establishes unavailable/stale requests, switching/closing during navigation and ordinary failure. REQ-004 establishes lease preservation. These independently justify the designed guards, native event refresh and absence of a new load waiter. Frame identity is an existing native event contract handled by the extracted adapter, not a new product scenario. No speculative queue, retry or recovery machinery is introduced.

## Unresolved Approved-Behavior Or Current-State Gaps
None. Pending implementation and execution proof is downstream work, not missing design intent.

## Review Decision
**Pass** — ready for implementation against R1/SR-002. All reviewed structural checks pass; no blocking correction or new product approval is required.

## Findings
None.

## Classification
N/A — no failure classification. Retain task_size **Medium**, architectural_risk **High**.

## Recommended Recipient
Implementation engineer through the configured primary pass rule. Informational Solution Designer notification only if returned routing rules require it; no duplicate implementation forwarding.

## Residual Risks
- Retained native probe is dependency evidence, not shell IPC/UI evidence. Implementation/API-E2E must prove active/lease guards, errors/no-op, close/switch safety, event-driven availability, flag-only snapshots, address-edit preservation and native page content through the changed build.
- Observer extraction touches ordinary and popup-created sessions. Preserve custom titles, single listener registration, destruction cleanup and popup leases. Stop-loading refresh must not introduce selection mutation or a parallel history store.
- Native index/capability can advance before page commit. Do not assert completed navigation from the IPC result or index alone; downstream assertions must observe committed page/event state. No speculative serialization framework is required.
- Narrow panel/full-view layout, native overlay bounds, mobile emulation, disabled states and localized accessible names require actual rendered interaction evidence under AC-005/006.
- FU-001/002 remain non-blocking, outside the approved implementation delta. No new follow-up added.
- No application/build tests executed in this review. No release/install or running-app access performed.

## Latest Authoritative Result
- Review Decision: **Pass**.
- Material-Premise Gate: **Pass**.
- Notes: ARCH-REV-001; approved R1/SR-001, design SR-002. Architecture approval is not product validation or delivery completion.
