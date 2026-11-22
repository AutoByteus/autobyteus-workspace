# Code Review Report — autobyteus-609 (phone-web-followups-609, absorbs autobyteus-575)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003; DEC-009 added during implementation)
- Investigation Notes Reviewed As Context: through the design spec's evidence table (sections A–J)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, D-A…D-J)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-006)
- Relevant Solution Revision IDs: SR-002, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass; N-2 non-blocking). It is untracked in the worktree.
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (untracked)
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation Engineer, IR-001 ready for source review
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609`, branch `codex/phone-web-followups-609` (pushed), `f2c0d2a902..c9d184ce80` (code commits `6ed56306aa`…`ab72e00e7a`)
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. Ten items cross six subsystems. A GraphQL field changes shape, a contract package gains an export, the phone-serving REST routes gain registry restore, and build inputs change. No escalation trigger fired: route permissions, persisted data and the summary rules are unchanged.

## Review Scope

- Changed implementation and behavior reviewed:
  - A: `contextText` removed.
  - B: team-stream `dist/` rebuilt; `check:contract-dist`; TESTING.md and RELEASE.md.
  - C: the `prepare-server.mjs` `try/finally`; `.gitignore`.
  - D: `interrupted` → "Stopped" on the Activity rows, the cards and the earlier-trace status keys.
  - E: `TOOL_SUMMARY_ARGUMENT_KEYS`; web summary and node page projection read it; `summaryArgs: JSON`; codegen.
  - F, G: probe case edits.
  - H: run-relative links (renderer, resolver, opener).
  - I: `endRunningTasksForRunEnd`; the panel view's `runStopped`.
  - J: REST routes through `getOrCreateWorkspace`.
- Files / areas reviewed: every changed source file (diff `f2c0d2a902..HEAD`, 77 files) and the changed specs and probe cases. The owners needed to judge them were read too:
  - `workspace-manager.ts` `getOrCreateWorkspace`;
  - `activeContextStore.resolveWorkspaceMetadataForTarget`;
  - the absolute flow of `useEventMonitorFilePreview.openPath`;
  - `MarkdownRenderer.handleLinkClick`;
  - `RunProjectionActivityStatus`;
  - the base `toolDisplaySummary.ts`.
- Explicit exclusions: none. No recorded check was rerun: the code each exercises is unchanged since it ran (IMP-01…IMP-10), and the conclusions here come from reading.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-A…REQ-J, AC-A…AC-J, DEC-001…DEC-009).
- Design-spec behavior map verified against the implementation: Yes (DS-A…DS-J).
- Design review report and round confirmed: ARCH-REV-002 Pass on SR-002. SR-003 (DEC-009) narrows REQ-F's phone part to "recorded, not asserted".
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-A | Confirmed | Field and both `resolveContextText` copies removed; the dedupe's term is equal on both sides, so removing it decides nothing new; no `contextText` left in `autobyteus-server-ts/src` or `autobyteus-web` (`grep`) | — |
| BEH-B | Confirmed | `scripts/check-contract-dist.mjs`: tracked-`dist/` contract packages → one topological `pnpm --filter` build → `git status --porcelain --untracked-files=all` per `dist/`; TESTING.md (own `docs(testing):` commit `2b2c5c3509`) and RELEASE.md name it | — |
| BEH-C | Confirmed | `run()` wraps stage → publish in `try/finally rm(stageDir, { force: true })`; the native rebuild runs on `targetDir` after it; `.gitignore` entry | — |
| BEH-D | Confirmed | `toolActivityStatusPresentation('interrupted')` = "Stopped", neutral, `stop-circle-solid` (`default` removed, so the switch is exhaustive); `getToolCardStatusPresentationKey`, `ToolCallIndicator` (icon from the Activity presentation, one source), web `STATUS_KEYS` and node `statusKey()` include `interrupted`; `RunProjectionActivityStatus` has `interrupted`, so the page card's key is reachable | — |
| BEH-E | Confirmed | One frozen list in agent-presentation-contracts; the web reads it by kind in the same order; the node page projection copies file keys for write/edit cards, command keys for terminal cards and all keys otherwise; GraphQL `summaryArgs` is `GraphQLJSON`; the query selects it whole; codegen regenerated | — |
| BEH-F/G | Confirmed | MSP-44/45 follow 576; the phone results are recorded per DEC-009; MSP-55 accepts both codes | — |
| BEH-H | Confirmed | `MarkdownRenderer`: with file actions on, a scheme-less, non-`#`, non-`//`, non-`/` href emits `{ kind: 'run-relative', href }`; elsewhere it emits `relative-link` (576 preserved). `openPath`: origin and other-node checks first; `resolveRunRelativeFileLink` confines the link through 576's `resolveWorkspaceRelativeReference(href, '')` and builds the absolute action; then the existing desktop or phone flow | — |
| BEH-I | Confirmed | `watch([runId, runStopped])`: the same run false→true ends running rows (`stopped`, `run_ended`, `exitCode: null`) and clears the timer; true→false re-reads once; a run switch and the first value never count; the 2 s re-read is not scheduled while stopped | — |
| BEH-J | Confirmed | `findWorkspace` → `getOrCreateWorkspace` (memory → temp → skill → semantic → registry, else throws "not found") → 404 on any failure; path rules unchanged (`resolveReadablePath`) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A…SCN-J | REQ-A…REQ-J | per requirements | per requirements | per requirements | per requirements | Normal (SCN-H2 Explicit Edge) | DS-A…DS-J | per AC | requirements-doc.md | Supported Normal / Explicit Edge, as recorded there | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CG-01 | (Question 1) H's run-folder fallback is `target.context.config.workspaceMetadata.workspaceRootPath`, not the design's `resolveWorkspaceMetadataForTarget` | REQ-H1 ("the run's own folder") | A run target whose `workspaceRootPath` is empty | `resolveWorkspaceMetadataForTarget` returns null when the target has no root (`activeContextStore.ts:130-139`), so it could never be the fallback. The absolute flow maps with `workspaceTarget?.workspaceRootPath \|\| activeMetadata?.workspaceRootPath`, the same folder. Confinement still comes from the 576 resolver | Code read | Reject — `Pass — deviation recorded, reason holds` | — | The reason holds; it is recorded in the handoff and covered by `useEventMonitorFilePreview.runRelative.spec` |
| CG-02 | (Question 2) N-2 declined: rows end only while a list is mounted | REQ-I ("stops while its tasks are listed") | A list opened after the stop, its end update lost | Outside REQ-I's trigger | ARCH-REV-002 N-2 (non-blocking); FU-003 | Reject (follow-up) | Follow-up FU-003 | The panel view stays the one owner of the rule; recorded |
| CG-03 | (Question 3) MSP-99 drops the update by wrapping `window.WebSocket` in the page | AC-I | — | A capture-phase listener added before the app's stops `BACKGROUND_TASK_UPDATED` on `/ws/agent/<run>` only; `droppedUpdates > droppedBeforeStop` proves the end update arrived and was lost | Case code; IMP-04 (base Fail, branch Pass at 74 ms) | Reject (valid test means) | — | `routeWebSocket` cannot reach the node through Chrome's host mapping; the substitute drops the same frame |
| CG-04 | (Question 4) MSP-44 phone file links recorded, not asserted; `../../out.md`; MSP-46 narrowed | REQ-F per DEC-009 (SR-003) | — | Matches the approved requirement; `../out.md` resolved inside the probe's root, so it was not a link out of it | Case code; DEC-009 | Reject (no finding) | — | — |
| CG-05 | J: a URL read can now create the temp workspace or an on-demand skill/semantic workspace | REQ-J, QR-2 | — | Same lookup the GraphQL Files path already uses behind the same gate; an unknown ID still throws → 404 | `workspace-manager.ts:111-150`; design Risks | Reject (design risk accepted) | — | — |
| CG-06 | E: write/edit page cards carry only file keys, terminal cards only command keys | REQ-E | — | Unchanged filtering from the base; the live card for those kinds picks the same key kind first | Code read | Reject | — | Summary rules out of scope |
| CG-07 | `design-review-report.md` and `architecture-review-revision-record.md` are untracked in the worktree | Ticket documents | — | Delivery would not find them in the branch | `git status` | Note (not code) | — | Their owner (architecture reviewer) or delivery should commit them; mentioned in the handoff |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | E: one key list; J: one lookup; the rest local fixes in their owners | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | DEC-009 (SR-003) followed in MSP-44 | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-A…DS-J traced | — |
| Ownership boundary preservation and clarity | Pass | The renderer hands the href to the opener; REST routes use the manager's lookup; the store owns the run-end row shape | — |
| Off-spine concern clarity | Pass | 576 resolver reused for confinement | — |
| Existing capability/subsystem reuse check | Pass | `getOrCreateWorkspace`, `resolveWorkspaceRelativeReference`, `createAbsoluteFilePathAction`, the panel view's `refresh` | — |
| Reusable owned structures check | Pass | `TOOL_SUMMARY_ARGUMENT_KEYS` replaces three lists | — |
| Shared-structure/data-model tightness check | Pass | Frozen by kind; `ToolSummaryArgumentKey` types the node's summary record | — |
| Repeated coordination ownership check | Pass | — | — |
| Empty indirection check | Pass | `findWorkspace` adds the null-on-failure translation and logging the two routes share; `resolveRunRelativeFileLink` owns confinement plus action building | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | web and node → contracts (existing dependency) | — |
| Visible dependencies check | Pass | `runStopped` passed in by callers; `getWorkspaceManager()` is used, not added | — |
| Authoritative Boundary Rule check | Pass | — | — |
| File placement check | Pass — deviation recorded, reason holds | CG-01 (H fallback) | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `ConversationFileLink` discriminated by `kind`; `summaryArgs: JSON` | — |
| Naming quality and one vocabulary | Pass | "Stopped" matches `runSettings.status.stopped` and "Stopped: the run ended" | — |
| No unjustified duplication in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | `contextText`, both `resolveContextText`, node key sets, the GraphQL object type, web key arrays, the status builder's `default` | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | J integration (restart via `vi.resetModules`; base 404, branch 200; unknown 404; outside refused); I unit (4 transitions); E page-versus-live; MSP-99, MSP-100 | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests retained in changed scope | Pass | The `contextText` hydration case removed; MSP-44/45/46 updated to 576 | — |
| API/E2E readiness for the next workflow stage | Pass | — | — |

## Source File Size And Structure Audit

| Source File | Effective Before | Effective After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/scripts/prepare-server.mjs` | 492 | 498 | Pass | Pass | Pass | Pass | — (close to the limit; the next growth should split it) | — |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | 499 | 499 | Pass | Pass | Pass | Pass | — (type-only change) | — |
| All other changed source files | ≤ 335 | ≤ 333 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | `contextText` and the typed GraphQL object removed outright (DESIGN.md rule 9) |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed | Pass | `Not Affected` |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the GraphQL `summaryArgs` shape, the run-relative links, "Stopped", and the contract-dist check.
- Files or areas likely affected: TESTING.md and RELEASE.md were updated in the change. Web and server docs are left to delivery's docs sync (design: "Delivery's docs sync").

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| ARCH-REV-001/002 premises (ASM-1, AR-001) | Confirmed | — |

None new.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | Ten spines, each traced in code | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | E and J consolidate to one owner; the renderer no longer resolves paths | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Discriminated file-link union; JSON field as designed | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Small owned files | `prepare-server.mjs` at 498 effective lines | Split it at its next growth |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | One frozen key list typed for both sides | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | "Stopped", `RunRelativeFileLink`, `endRunningTasksForRunEnd` | — | — |
| 7 | API/E2E Readiness | 9.4 | Base-fail proofs for B, I, J; probe cases for D, F, G, H, I, J | Team-member and delegated run-relative links are unit-only so far | API/E2E covers them |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Lookups, confinement, transition guards and status keys traced correct | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cuts | — | — |
| 10 | Cleanup Completeness | 9.4 | Every replaced list and rule removed | Two architecture-review documents untracked (CG-07, not code) | Commit them before delivery |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (FU-001…FU-006 recorded upstream).

## Classification

- None (Pass).

## Recommended Recipient

- API/E2E Engineer (`/api_e2e_engineer`), per the rule "implementation review passes". Implementation Engineer gets the informational notice.

## Residual Risks

- C: the successful Windows path is proven only by the release run's Windows job (IMP-09).
- I: a wrong live→Offline transition would end a running row (design Risk).
- J: a URL read after a restart can create an on-demand skill or temp workspace, as GraphQL Files already does.
- FU-003: a list mounted after a stop.
- FU-005: the raw not-found text.
- FU-006: MSP-61, red on the base.
- For API/E2E:
  - team-member and delegated run-relative links on desktop and phone;
  - a real runtime stopped mid-call ("Stopped" on every surface, including after reload);
  - a real node restart followed by a phone read;
  - the whole phone probe (with MSP-61 accounted for by FU-006).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes on the implementer's five points:
  - (1) The H fallback deviation is accepted; its reason holds.
  - (2) N-2 declined → FU-003, accepted.
  - (3) MSP-99's in-page drop is accepted.
  - (4) MSP-44 follows DEC-009, accepted.
  - (5) FU-005 and FU-006 are acknowledged.
