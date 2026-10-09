# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/requirements-doc.md` (Approved, SR-005)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/design-spec.md` (SR-006)
- Supplemental Task Artifacts Reviewed As Context: none (`followup-existing-team-run-new-members-brief.md` in the ticket folder is a separate follow-up brief, not part of this package)
- Relevant Solution Revision IDs: `SR-005`, `SR-006`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/design-review-report.md` (round 1, Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: initial implementation (IR-001), commit `24baaf7c5` on `codex/delegated-copy-member-contact-delegator`, base `a573465d9`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The diff matches the design's estimate (17 production source files across contracts, server and web, all in existing owners). Two shared contracts changed as designed (`MentionedCollaborator.presence` + note wording; GraphQL `focusedAgentRunId`). No escalation trigger fired.

## Review Scope

- Changed implementation and behavior reviewed: `git diff a573465d9..24baaf7c5` (40 files). Agent-root collaborator port per viewer; `run_agent` placement rank; `ownDefinition()` rename; admission `presence`; mention-note contract `presence`/`guidanceFor`/parser; GraphQL `focusedAgentRunId` and port resolver; web scope, candidate service/cache/invalidation, query, generated types, task-child target `agentRunId`.
- Files / areas reviewed: all production files in the diff; collateral read of `catalog-address-map.ts`, `collaborator-admission.ts` (`catalogDefinitionAt`, `catalogTaskSource`, `plan`, `ensure`), `collaborator-candidate-policy.ts` (`requireAdmissible`), `standalone-root-recipient-resolver.ts`, `standalone-root-message-delivery.ts` (`postToHost`, `deliverToAddress`, `delegateTask`), web `runMentionScope.ts`, `useMentionCandidates.ts`, all `collaboratorCandidatesService` callers. Tests: new `standalone-root-collaborator-port.test.ts`, extended `standalone-agent-run-root.test.ts`, contract tests, web specs.
- Explicit exclusions: tracked contract `dist/` (verified it is rebuilt output identical to source: rerunning the contract test build left no tracked diff); the 42 baseline-failing server files (recorded as identical on base); real-provider E2E execution.
- Reviewer verification runs: contract `pnpm -C autobyteus-agent-presentation-contracts test` → 16/16; server `vitest run tests/unit/standalone-agent-run-root tests/unit/agent-collaboration tests/unit/agent-team-execution tests/unit/agent-org-execution` → 82 files / 604 tests pass; `tsc -p tsconfig.build.json --noEmit` → clean; web `vitest run services/collaborators composables/agentInput/__tests__/runMentionScope.spec.ts stores/__tests__/agentRunCollaborationStore.spec.ts utils/collaboration` → 8 files / 30 tests pass.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001/002/003/004/006 and AC-001..003, AC-006..009 (SR-005). The intent is narrow: in a standalone Agent run, every non-host agent can `@`, resolve, list and message the host. The host view and Team/Org views are unchanged, and prompts are unchanged.
- Design-spec behavior map verified against the implementation: Yes. DS-001..DS-004 trace to the code as described.
- Design review report and round confirmed: round 1 Pass; AR-001 (residual-risk wording / normal-case test) and AR-002 (all `agent`-kind query callers pass the focused run) were applied.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `runMentionScope` (task child → `focusedAgentRunId: target.agentRunId`, set by `agentRunCollaborationStore.childTargetFor`) → `collaboratorCandidatesService` key `agent:<root>|<focused>` → GraphQL `collaboratorMentionCandidates(focusedAgentRunId)` → `resolveCollaboratorRootPort` → `StandaloneAgentRunRoot.collaboratorPortFor` → `standaloneRootCollaboratorPortFor(tree, launch, viewer)` (`ownDefinition` null for non-host; host placement `run_agent`) → `CollaboratorCandidatePolicy.listCandidates` (unchanged logic). Host composer passes its own run ID → host excluded as before. | — |
| BEH-002 | Confirmed | Stream SEND_MESSAGE → `StandaloneRootMessageDelivery.resolveMentions(focused)` (index membership check) → `StandaloneRootCollaborators.resolveMentions(viewer)` → `CollaboratorAdmission.resolveMentions`: `requireEligible` passes for non-host; address = `CatalogAddressMap` in-run address = host address; `presence` = `run_agent` from `preferredInRunPlacement` → `composeCollaboratorMentionNote` emits the `send_message_to` sentence and no delegate sentence for a host-only note. Host self-mention still rejected. | — |
| BEH-003 | Confirmed (unchanged) | `deliverToAddress` → `resolveMessageRecipient` resolves the host placement before any `bringInAt`; `bringInAt`/`catalogTaskSource` would get `null` for the host address anyway (in-run address, not a catalog address — tested). | — |
| BEH-005 | Confirmed | `listAvailableAgents(sender)` → `collaborators.listAvailable(sender.agentRunId)` → `policy.listEligible(portFor(viewer))`. Non-host list = host entry + host's list at identical addresses (tested). | — |
| BEH-006..009 | Confirmed (preserved) | No prompt, work-packet or `resolveMessageRecipient` change; Team/Org ports renamed only; `delegate_task` to the host refused (tested); `requireAdmissible` refuses the host for non-host viewers via the `run_agent` placement (tested). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-002, BEH-003 | User | User | Have a copy member ask the delegator directly | `@` in a task-child composer of a live Agent run | Normal | DS-001 → DS-002 → DS-003 (above) | Menu lists host; note names host address with `send_message_to`; existing host run receives the member's message | Requirements SCN-001, user report 2026-10-08 | Supported Normal Scenario | Use |
| SCN-002 | BEH-005, BEH-003 | Contract | Copy member agent | Contact the PM when asked in plain words | `list_available_agents` tool call | Normal | DS-004 → DS-003 | Host listed at its address; message reaches existing run | Requirements SCN-002, SR-005 approval | Supported Normal Scenario | Use |
| SCN-004/005 | BEH-007, BEH-008 | User | User | Team/Org `@` unchanged | Team/Org composers | Normal | Team/Org ports (rename only) | Unchanged | Requirements SCN-004/005 | Supported Normal Scenario (preserved) | Use |
| PRESERVE-NOTE | Data continuity (AC-009, design persisted-data decision) | Contract | Web history display | Saved mention notes from earlier releases still render | Opening a saved conversation | Normal | `parseCollaboratorMentionNote` on stored user-message text | Earlier notes parse unchanged | Requirements "Preserved Behavior Boundary", design decision `Directly Usable — No Migration` | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C01 | Catalog address of a not-in-run definition can differ between host and non-host views (host in/out of `eligible` changes slug collision counting when the host address segment ≠ the current host-name slug) | MP-001 (design review) | Host definition renamed after the run started **and** another definition sharing a slug | Each viewer's own bring-in uses its own port, so a viewer's addresses are self-consistent; only an address relayed from one viewer to another could be not-found. No second instance. | `catalog-address-map.ts` collision rule; design review MP-001/AR-001; normal case pinned by `standalone-root-collaborator-port.test.ts` | Reject (as a finding) | Already accepted upstream as non-blocking residual risk with a not-found-only consequence. Carried in Residual Risks; no machinery. |
| CR-C02 | GraphQL `focusedAgentRunId` is not membership-checked; an unknown ID gets the non-host view | Design interface mapping (residual risk) | Only a non-web caller sending an arbitrary ID; the web always sends the focused composer's real run ID | Consequence is menu contents only; send-time `resolveMentions` re-checks membership (`getIndex().getAgent`) and rejects `RUN_NOT_FOUND` | `standalone-root-message-delivery.ts` `resolveMentions`; design residual risk | Reject | No supported scenario or security contract makes the candidates list sensitive (it lists shared catalog definitions). |
| CR-C03 | Parser now calls `guidanceFor` (which uses `singleLine`, throwing on an empty name) on user-authored text that forges a note with a whitespace-only name and a run-agent suffix | PRESERVE-NOTE | User deliberately typing a malformed note block at the end of their own message | Display parse might throw instead of returning null | `parseCollaboratorMentionNote`, `runAgentGuidance` | Reject | Contrived: requires a user to hand-author a malformed system note; no product workflow produces it. Composed notes always have non-empty names. |
| CR-C04 | Web `invalidate` uses string-prefix matching on `agent:<root>|` | Return/event spine (design) | `collaborator_added` event | Clears all focused-agent entries of that root; run IDs do not contain `|`, and the root key itself is matched exactly | `collaboratorCandidatesService.ts`, spec coverage | Reject | Correct for the supported identifiers; no issue. |
| CR-C05 | Team/Org roots still expose viewer-less `collaboratorPort()` | Design dependency rule "Team/Org ports taking a viewer: forbidden" | — | — | `agent-org-run.ts:224`; design removal plan scopes the removal to the Agent root | Reject | Matches the design; Team/Org are intentionally per-root. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Missing Invariant fixed at the Agent-root port; small refactor (`ownDefinition`, `presence`) done as designed | None |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No supplements; note wording matches the design's normative examples byte for byte (contract tests) | None |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-004 traced end to end in code | None |
| Ownership boundary preservation and clarity | Pass | Viewer logic lives only in `standaloneRootCollaboratorPortFor`; policy has no viewer/root-kind branch; wording only in the contract | None |
| Off-spine concern clarity | Pass | Web cache stays a cache; no web-side filtering | None |
| Existing capability/subsystem reuse check | Pass | Reuses policy, admission, `CatalogAddressMap`, `resolveMessageRecipient` | None |
| Reusable owned structures check | Pass | `guidanceFor` shared by compose and parse; `preferredInRunPlacement` exported from the policy instead of duplicating the sort in admission | None |
| Shared-structure/data-model tightness check | Pass | One 3-state `presence` replaces `inRun`; `CollaboratorCandidateSubject` is a discriminated union (focused ID only on `agent`) | None |
| Repeated coordination ownership check | Pass | Exclusion rule still has one owner, shared by `@`, re-check and `list_available_agents` | None |
| Empty indirection check | Pass | No new layers | None |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Each change stays in its owning file | None |
| Ownership-driven dependency check | Pass | Admission → policy (existing direction); no new cycles | None |
| Authoritative Boundary Rule check | Pass | Delivery and root go through `StandaloneRootCollaborators`; GraphQL goes through `collaboratorPortFor`/`standaloneRootCollaboratorPortFor` (stored path), as before | None |
| File placement check | Pass | No files moved/added except tests | None |
| Flat-vs-over-split layout judgment | Pass | Unchanged layout | None |
| Interface/API/query/command/service-method boundary clarity | Pass | `focusedAgentRunId` explicit, required for `agent` with a clear error, ignored for Team/Org; `portFor(viewer)` names its identity | None |
| Naming quality and naming-to-responsibility alignment | Pass | `ownDefinition`, `run_agent`, `presence`, `portFor`, `ownDefinitionError` (avoids method/name clash) | None |
| No unjustified duplication in changed scope | Pass | — | None |
| Patch-on-patch complexity control | Pass | Single coherent commit | None |
| Dead/obsolete code cleanup completeness | Pass | `rootDefinition`, `inRun`, `IN_RUN_NOTE_GUIDANCE`, `IN_RUN_SUFFIX`, viewer-less Agent `port()`/`collaboratorPort()` removed; no stale references (grep) | None |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Per-viewer port tests, copy-member integration-style test (REQ-001..004, 006), contract host-only/mixed/mismatch/previous-release tests, web cache-key/invalidate specs | None |
| Test fixtures/helpers reusable and coherent | Pass | New port test is self-contained; root test reuses `buildManager`/`childIdentity` | None |
| No stale, duplicated, or compatibility-only tests retained | Pass | Old `inRun` assertions migrated | None |
| API/E2E readiness for the next workflow stage | Pass | Handoff lists concrete real-server scenarios for AC-002/003/006/009 and good host files; fake-CLI E2E path already runs with the new argument | None |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | ~410 (434 total) | Pass | Pass (+2/−1) | Pass | Pass | OK | None |
| `standalone-agent-run-root/services/standalone-root-message-delivery.ts` | <247 | Pass | Pass (+2/−2) | Pass | Pass | OK | None |
| `standalone-agent-run-root/services/standalone-root-collaborators.ts` | <138 | Pass | Pass (+41/−19) | Pass | Pass | OK | None |
| `agent-collaboration/collaborators/collaborator-admission.ts` | <239 | Pass | Pass | Pass | Pass | OK | None |
| `agent-collaboration/collaborators/collaborator-candidate-policy.ts` | <230 | Pass | Pass | Pass | Pass | OK | None |
| `agent-collaboration/collaborators/collaborator-root-port.ts` | small | Pass | Pass | Pass | Pass | OK | None |
| `agent-presentation-contracts/src/collaborator-mention-note.ts` | <168 | Pass | Pass (+44/−14) | Pass | Pass | OK | None |
| `api/graphql/services/collaborator-root-port-resolver.ts`, `api/graphql/types/agent-run-collaboration.ts` | small | Pass | Pass | Pass | Pass | OK | None |
| `autobyteus-web/services/collaborators/collaboratorCandidatesService.ts` | <128 | Pass | Pass | Pass | Pass | OK | None |
| Other web files (`runMentionScope.ts`, `useMentionCandidates.ts`, `collaboratorQueries.ts`, `activeAgentWorkspaceTarget.ts`, `agentRunCollaborationStore.ts`, `generated/graphql.ts` collaborator hunks) | — | Pass | Pass (1–13 lines each) | Pass | Pass | OK | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | `focusedAgentRunId` is required for `agent` (no host-view default); no `inRun` alias |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead/obsolete code cleanup completeness | Pass | See structural check |
| Approved persisted-data transition decision followed | Pass | `Directly Usable — No Migration`. `guidanceFor` without run-agent entries equals the previous guidance; `SAVED_NOTE_GUIDANCES` retained as a data-continuity reader only; compose emits current wording only |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | Parser recomputes guidance from parsed entries; no version branch |
| Approved transition mechanics match the reviewed design | Pass | No migration, as designed |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `No` (likely none)
- Why: no user-facing docs describe the `@` candidate rule or the note wording; behavior change is visible only through the existing `@` menu. Delivery should still check any collaboration docs that state "the run's own agent is never offered".
- Files or areas likely affected: none identified.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | Implementation matches the analysed collision rule; normal case pinned by test; residual risk recorded (CR-C01). |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94
- Score calculation note: simple average for trend visibility only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | All four spines implemented as designed, from composer/tool to policy to delivery | Nothing material | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Viewer knowledge confined to the Agent-root port; policy generic; wording in the contract | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | Explicit `focusedAgentRunId` with per-kind validation; discriminated web subject type | Nullable GraphQL argument validated at runtime rather than by schema (designed trade-off) | — |
| `4` | `Separation of Concerns and File Placement` | 9.5 | Changes stay in owning files | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | `presence` removes the overlapping boolean; `guidanceFor` single source for compose/parse | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Renames carry the changed meaning; doc comments updated | The nested ternary for `presence` in admission is dense but readable | — |
| `7` | `API/E2E Readiness` | 9.2 | Concrete downstream scenarios listed; fake-CLI E2E path already passes with new argument | Non-host journeys not yet exercised through the real server (owned by API/E2E) | API/E2E to add AC-002/003/006 real-server coverage |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.4 | Host view preserved; non-host view lists/resolves/messages host; no second instance; delegate refused; verified by reviewer runs | MP-001 residual (accepted upstream) | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean-cut renames; saved-note reader is data continuity, not dual behavior | — | — |
| `10` | `Cleanup Completeness` | 9.4 | Obsolete names/constants removed; no stale references | Untracked SDK `dist/` build outputs in the worktree (not committed; must stay out of the delivery commit) | Delivery keeps them uncommitted |

## Findings

None.

## Classification

N/A — review passed.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (pass route, per handoff rules).

## Residual Risks

- MP-001 / AR-001: after a host-definition rename plus a same-slug definition, a not-in-run definition's catalog address can differ between host and non-host views (not-found only; no second instance).
- `list_available_agents` is opt-in per agent (A-11); REQ-003 helps only agents with the tool enabled.
- Prompt adherence: an agent may still try `delegate_task` to the host; it is refused, and the note says it cannot target it.
- Real-provider-gated E2E files updated for the new argument (`agent-initiated-collaborators`, `standalone-agent-collaborator-mention`, `remove-built-in-project-task-manager-startup`) were not executed locally.
- 42 server unit/integration files fail identically on base `a573465d9` (baseline item recorded in `implementation-evidence/ir-001/server-baseline-failures.txt`); unrelated to this change.
- Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build outputs in the worktree; keep them out of commits.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (MP-001 confirmed, non-blocking)
- Score Summary: 9.4/10 (94/100); every category ≥ 9.2
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: implementation follows SR-006 exactly; no findings. API/E2E should cover the non-host journeys through the real server (AC-002, AC-003, AC-006, AC-009 delegate refusal and host self-exclusion, and the `agent`-kind query error without `focusedAgentRunId`).
