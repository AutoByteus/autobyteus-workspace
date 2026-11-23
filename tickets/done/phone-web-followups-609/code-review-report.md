# Code Review Report — autobyteus-609 (phone-web-followups-609, absorbs autobyteus-575)

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 3, after IR-002; round 1 Implementation Review Pass CRR-001; round 2 Failure-Origin, Design Impact CRR-002)
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
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: `3`
- Review Scope: `Full Re-Audit`
- Review Scope Evidence (round >1): IR-002 (`70f3d8d410`, `e78a539dfe`) changes a shared data shape (the conversation entry gains `toolStatus`; the web stops deriving the status), adds a shared node rule, and removes three Codex source files and their tests (SR-005). That spreads beyond F-1's files, so every structural check and the full scorecard were rerun. Round-1 evidence is carried forward for items A–C and E–J, whose code IR-002 does not touch (`git diff e418414a2d..7ce2b67ea1` touches only D-D2's and SR-005's files).
- Trigger: Implementation Engineer, IR-002 (SR-004 D-D2, ARCH-REV-003 Pass; SR-005 N-3/N-4)
- Prior Review Round Reviewed: 2 (CRR-002, Failure-Origin: F-1 Design Impact)
- Latest Authoritative Round: 3
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609`, branch `codex/phone-web-followups-609` (pushed), `f2c0d2a902..c9d184ce80` (code commits `6ed56306aa`…`ab72e00e7a`)
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: MSP-102 (AC-D, REQ-D): a call the user stopped, read back from the node (phone opened after the stop; desktop after a reload)
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-102` (desktop Stop press, then the phone and a desktop reload; scripted AGY)
- Failure Evidence Paths: `evidence/api-e2e/MSP-102-stopped-and-page-cards/result.json` (phone row `{"status":"error","word":"Failed"}`, page card `"statusKey":"error"`), `MSP-102-phone-detail-stopped.png`, `MSP-102-desktop-page-cards.png`
- Tree under failure-origin review (round 2): `255a0b0ada` + API/E2E `54a305f690`, `e84ba7fc48`
- Tree under round-3 review: `7ce2b67ea1` (pushed); code `70f3d8d410` (D-D2), `e78a539dfe` (SR-005); evidence IMP-11…IMP-16

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
| BEH-D | Confirmed (round 3) | Live: unchanged from round 1. Read back: the shared rule `isInterruptedToolResult({ sourceEvent, error })` (`agent-memory/domain/tool-result-interruption.ts`) is read by the replay's `createToolEvent` after the denial check and only for a call with a result trace (`terminal &&`), which covers both call sites, and by the journal's `interruptedFromError` (its outputs unchanged). The sequencer takes its text from the same file. The conversation transformer puts `toolStatus: event.status` on tool entries, the only producer of them (`historical-replay-events-to-conversation.ts`). The web reads `toolStatus` through `isToolInvocationStatus` (`utils/toolInvocationStatus.ts`; anything else reads `parsed`); `inferToolStatus` is removed. The dedupe keeps a whole winning entry, so `toolStatus` survives a merge. Round 2's gap (no producer) is closed | — |
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
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 (round 3) | F-1 resolved: every runtime's stored interruption reads `interrupted`; the team reconciliation conflict is gone | A stopped call keeps its stored error text in a red Error section, live and read back (FU-010) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cuts | — | — |
| 10 | Cleanup Completeness | 9.5 (round 3) | Every replaced list and rule removed; SR-005 removed the dead Codex view provider, reader and normalizer with search evidence (IMP-14); the web's duplicate status guard moved to one place | Three server docs still name the removed files (docs sync); the Claude view provider is FU-009 | — |

## Failure-Origin Review (Round 2)

### F-1 — A stopped call reads "Failed" once read back from the node (AC-D, REQ-D)

- Scenario: SCN-D, Supported Normal.
  - The user stops a run mid-call, then opens the run on the phone, or reloads the desktop and scrolls to earlier trace.
  - AC-D: "the desktop panel, the phone row and the phone detail read 'Stopped' … The conversation card and earlier-trace card show the same status. No 'Unknown' remains".
  - The phone's Activity of a run opened after the stop is hydrated from the node's projection.
- Test validity: valid. MSP-102 presses Stop in the desktop composer (the real trigger), then reads the phone and a reloaded desktop. The live half passes, the read-back half fails.
- Established by:
  - `Read`: the trace sequencer, the replay transformer, the native memory manager and the journal's rule, with the lines cited in BEH-D above.
  - `Reproduced`: by API/E2E (MSP-102).
- Cause: there is no producer of a stored `interrupted` status.
  - The node stores an interrupted call distinctly. The server-side sequencer writes `content: "Tool execution interrupted."` and `sourceEvent` `TOOL_EXECUTION_INTERRUPTED` or the turn interrupt. The native runtime stores the reason as the error (`user_interrupt`).
  - But the replay maps every stored error to `error` (`raw-trace-to-historical-replay-events.ts:88-93`).
  - The node already has one rule that reads these stored forms as an interruption: the work journal's `interruptedFromError` (`agent-work-journal/rendering/result-envelopes.ts:143-146`, "`user_interrupt` and `Tool execution interrupted.` (AutoByteus, AGY)").
  - The run projection does not use it, or anything like it.

### Classification: `Design Impact` (owner: Solution Designer)

- The design's D-D change list starts at "the `interrupted` status". It names only consumers: the Activity builder, the card key, `ToolCallIndicator`, the page projection's `statusKey()`, the web reader's `STATUS_KEYS`.
- It does not name the producer of that status for stored runs. The investigation notes (D) list hydration as a setter of `interrupted`, a premise that holds for the web's mapping but not for what the node sends.
- The implementation follows the design exactly.
- Fixing it needs decisions the design has not made:
  1. **Where the one rule lives.** The fact "this stored tool result is an interruption" is already derived by the work journal (`interruptedFromError`). Principle 11 says one owner per derived fact, so the run projection should not grow a second copy. The decision is whether the rule moves to a shared owner that both the journal and the run projection read, or stays in the journal with the projection depending on it.
  2. **Which stored signals count, for every runtime.**
     - Server-side sequencer (AGY, Claude, ACP): the result's `content`/`sourceEvent`, or its error text.
     - Native: the reason as the error, e.g. `user_interrupt`.
     - Codex: its own provider (`codex-run-view-projection-provider.ts` `resolveToolStatus`), not traced here.
  3. **Persisted data.** A read-side rule keeps the design's `Not Affected` decision and reads traces stored before the change the same way: the sequencer and the native memory manager are untouched by this ticket. A write-side change, recording `interrupted` in the stored result, would change persisted traces and need its own transition decision. Recommendation: read-side.
- Not an implementation defect: no design decision asked for the replay change, and the choice above belongs to the design.
- **Earlier review gap, owned here.** Round 1 (CRR-001) recorded under BEH-D that "`RunProjectionActivityStatus` has `interrupted`, so the page card's key is reachable". A type union is not a producer. Tracing the replay (`raw-trace-to-historical-replay-events.ts:88-93`) would have shown that nothing yields `interrupted`, and that should have been a round-1 `Design Impact`.
- Not a prerequisite: it is the functionality this ticket changes (D).

### Other failures in the API/E2E report

- SE-1 (`app-data-migrations`, RRB-1 and SID-2): pre-existing and unrelated.
  - The fixture's `snapshot()` reads every non-directory entry with `readFile`, including the running node's Unix socket `node-access/local-control.sock` (`tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts:155-168`).
  - API/E2E reproduced it identically on a fresh clone of the base.
  - Recorded as **FU-007**. API/E2E records it as out of scope.
- MSP-61: FU-006, red on the base.

## Round 3 (IR-002): D-D2 and SR-005

- **D-D2.** The design's file, rule and readers are implemented as written (`tool-result-interruption.ts` matches the design's code block).
  - The replay checks the denial first, then `terminal && isInterruptedToolResult(...)` → `interrupted`, then the existing mapping, so an ordinary failure stays `error`.
  - A call with no result trace stays pending.
  - The journal's rule now reads the same function, with the same input and outputs.
  - The sequencer's four literals use the shared constant; no writer's behavior changes.
  - Persisted data stays `Not Affected`: read-side only, and traces written before the change carry the same `sourceEvent` and error.
- **Conversation `toolStatus`.**
  - The only producer of conversation tool entries is the replay's conversation transformer. Its entries now carry the replay's status.
  - The web takes that status. A missing or unknown value reads `parsed`, the same as the removed `inferToolStatus` gave an undecided entry.
  - The removed function's `denied` / `error` / `success` decisions are the replay's own (`:88-96`), so no status changes meaning.
  - Team member reconciliation no longer meets a live `interrupted` against a read-back `error`. The new spec shows both the agreement and the old conflict.
- **Case 26 consumers:** the handoff lists them, and `recent-run-projection-policy.ts` and `run-projection-utils.ts` read no status (Read).
- **SR-005.** The Codex view provider, `codex-thread-history-reader.ts` and `codex-thread-history-item-normalizer.ts` are removed with their tests.
  - No code or config still names them (`grep` over both packages).
  - The service reads only `LocalMemoryRunViewProjectionProvider`.
  - The helpers they used keep live importers (IMP-14).
  - Docs that name them (`autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `docs/modules/run_history.md`, `docs/modules/codex_integration.md`) are left for delivery's docs sync, as the handoff lists.
- **Tests.**
  - `stopped-tool-call-read-back.test.ts` drives the real writers through the local provider: Codex through its converter, `TOOL_EXECUTION_INTERRUPTED`, native `finalizePendingToolCallsForTurn`, an error-only record, and a denial. All of its cases fail with the old replay and pass with the fix (IMP-11).
  - The rule's unit test covers each signal.
  - MSP-102 passes for the phone opened after the stop, the desktop reload and the earlier-trace card (IMP-13).
- **Sizes:** every file IR-002 changed is far under the limit, and the removals shrink the node.
- **The implementer's observation:** a stopped call's stored error, "Tool execution interrupted.", still shows in the phone detail's red Error section and under the desktop card. It does so live too (the live activity carries the same error, as the reconciliation spec shows), so read-back matches live. AC-D asks for the word and icon, which are right. Recorded as **FU-010**, outside this ticket.

## Findings

| ID | Finding | Classification | Owner | Status (round 3) |
| --- | --- | --- | --- | --- |
| F-1 | Stored runs never read back `interrupted` (AC-D) | Design Impact | Solution Designer → SR-004/SR-005 → implementation IR-002 | Resolved (`70f3d8d410`; IMP-11, IMP-13) |

No open findings.

## Follow-ups

- Follow-ups this review added: FU-007 (round 2) and FU-010 (round 3: a stopped call shows its stored interruption text as a red Error, live and read back). FU-001…FU-006, FU-008 (withdrawn) and FU-009 were recorded upstream.

## Classification

- None (Pass).

## Recommended Recipient

- API/E2E Engineer (`/api_e2e_engineer`), per the rule "implementation review passes". Implementation Engineer gets the informational notice.
- API/E2E's next round, as it planned:
  - MSP-102 and the whole phone probe;
  - the server suites, since node code changed;
  - the fresh-start build on the final tree (IMP-16 ran it on `7ce2b67ea1`'s code).

## Residual Risks

- C: the successful Windows path is proven only by the release run's Windows job (IMP-09, IMP-15).
- I: a wrong live→Offline transition would end a running row (design Risk).
- J: a URL read after a restart can create an on-demand skill or temp workspace, as GraphQL Files already does.
- Follow-ups: FU-003, FU-005, FU-006, FU-007, FU-009, FU-010.
- Docs naming the removed Codex files: delivery's docs sync.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 3, `Full Re-Audit`)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.3. Runtime Correctness is back to 9.4 with F-1 resolved.
- Failure Origin: N/A (round 2's Design Impact is resolved)
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - The round-2 review gap (taking the type union as proof that the status was reachable) is closed: round 3 traced the producer, every consumer of `toolStatus`, and the dedupe.
  - The implementer's observation is recorded as FU-010.
