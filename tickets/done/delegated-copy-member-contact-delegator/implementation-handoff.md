# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium / High) and passed (ARCH-REV-001). Routing after implementation follows `get_handoff_rules` (Code Review route for High risk).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/requirements-doc.md` (Approved, SR-005)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/design-spec.md` (SR-006)
- Supplemental task artifacts: none. Product Design: `N/A — not applicable`.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/design-review-report.md` (Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/architecture-review-revision-record.md` (ARCH-REV-001)
- Solution Designer handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/handoff-architecture-design-complete.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-005`, `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `CRR-001` — Pass (9.4/10, no findings) for IR-001 / `24baaf7c5`; report `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/code-review-report.md`. The reviewer forwarded the package to API/E2E (informational, no implementation action).
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (AR-001, AR-002 applied as implementation notes)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator`, branch `codex/delegated-copy-member-contact-delegator`, base `origin/personal` @ `a573465d9`. Implementation commit: `24baaf7c5` (local, not pushed). Ticket artifacts remain uncommitted.

The standalone Agent-root collaborator port is now built **per viewer** (the focused composer agent or the tool-calling sender). It always reports the host as an in-run placement with the new top rank `run_agent` at the host address, and reports the host definition as the viewer's own definition only when the viewer is the host. The generic `CollaboratorCandidatePolicy` is unchanged apart from the `ownDefinition()` rename and the rank order; it has no viewer or root-kind branch. Admission reports each mention's `presence`; the mention-note contract renders a `run_agent` entry with an explicit `send_message_to` sentence and no `delegate_task` alternative. The GraphQL candidates query takes `focusedAgentRunId` (required for `agent` roots), and the web caches Agent-root candidates per focused agent.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: about 15 production files across the three planned packages (server, contracts, web), all in existing owners; no new subsystem, persistence or lifecycle (Medium). Two shared contracts changed as designed (`MentionedCollaborator.presence` + note wording; GraphQL argument), and the Agent-root port gained the host placement that feeds addressing, bring-in and catalog-copy admission (High). None of the design's escalation triggers fired: non-host catalog addresses are identical across viewers in the normal case (pinned by test), no second host instance (bring-in/catalog copy refuse it, tested), Team/Org results unchanged (existing suites + fake-CLI E2E for all three roots), saved notes still parse (tested).
- Selected route: `Code Review` (per `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High risk → independent Code Review)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, AC-001) | Non-host composer `@` offers the host; host composer unchanged | `runMentionScope.ts` (Agent scopes carry `focusedAgentRunId`: host `runId`, task child `target.agentRunId`) → `collaboratorCandidatesService` (`{rootSubjectKind, rootRunId, focusedAgentRunId}`, key per focused agent) → GraphQL `collaboratorMentionCandidates(focusedAgentRunId)` → `resolveCollaboratorRootPort(agent, root, focused)` → `StandaloneAgentRunRoot.collaboratorPortFor` / `standaloneRootCollaboratorPortFor(tree, launch, focused)` → `CollaboratorCandidatePolicy.listCandidates` | Implemented. Unit: `standalone-root-collaborator-port.test.ts`, `standalone-agent-run-root.test.ts` (new copy-member case), web `collaboratorCandidatesService.spec.ts`, `runMentionScope.spec.ts` |
| BEH-002 (REQ-002, REQ-004, AC-002) | Mention of the host from a non-host resolves to the host address as `run_agent`; note says `send_message_to` with the address, no `delegate_task` for it | stream SEND_MESSAGE → `StandaloneAgentRunRoot.resolveCollaboratorMentions({focusedAgentRunId})` → `StandaloneRootMessageDelivery.resolveMentions` → `StandaloneRootCollaborators.resolveMentions(focused, …)` → `CollaboratorAdmission.resolveMentions` (`presence` from `preferredInRunPlacement` rank) → `composeCollaboratorMentionNote` (`guidanceFor`) | Implemented. Host self-mention still rejected ("… is this run's own definition."). Contract tests cover host-only and mixed notes |
| BEH-003 (REQ-006, AC-003) | `send_message_to(<host address>)` from a copy member reaches the existing host | Unchanged `resolveMessageRecipient` path | Preserved; regression-tested from a Team-copy member in `standalone-agent-run-root.test.ts` (host restored once, message reserved; no collaborator added) |
| BEH-005 (REQ-003, AC-006) | `list_available_agents` lists the host for non-host callers | `StandaloneRootMessageDelivery.listAvailableAgents(sender)` → `StandaloneRootCollaborators.listAvailable(sender.agentRunId)` → `policy.listEligible(portFor(sender))` | Implemented; non-host list = host entry + exactly the host's own list (same addresses) |
| BEH-006..009, AC-007..009 | Preserved: prompts, work packet, Team/Org menus and lists, nested delegators, no second instance, `delegate_task` to host refused, saved notes parse | Team/Org ports renamed only (`ownDefinition`); no prompt/work-packet/recipient-resolution change | Preserved; existing Team/Org suites pass; delegate to host refused (tested); `requireAdmissible`/catalog copy refuse the host (tested); saved/previous notes parse (tested) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Production:
- `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` (+ tracked `dist/collaborator-mention-note.*` rebuilt): `MentionedCollaboratorPresence`, `presence`, `PRESENCE_SUFFIXES`, `runAgentGuidance`, `guidanceFor`, parser recomputes guidance from entries or accepts `SAVED_NOTE_GUIDANCES`.
- `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-root-port.ts`: `ownDefinition()`, rank `run_agent`, `buildInRunPlacements({ runAgent? })`.
- `.../collaborators/collaborator-candidate-policy.ts`: `RANK_ORDER` with `run_agent` first; exported `preferredInRunPlacement`; `ownDefinition()` reads; private error builder renamed `ownDefinitionError`.
- `.../collaborators/collaborator-admission.ts`: `resolveMentions` computes `presence`; `plan()` emits `in_run`/`not_in_run` only.
- `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-root-collaborators.ts`: port per viewer; `portFor`, `resolveMentions(viewer, …)`, `listAvailable(viewer)`; bring-in, catalog copy and `ensureNow` use `senderRunId`.
- `.../standalone-agent-run-root/services/standalone-root-message-delivery.ts`: passes `focusedAgentRunId` / `sender.agentRunId` (`postToHost` already resolves with `hostRunId`).
- `.../standalone-agent-run-root/domain/standalone-agent-run-root.ts`: `collaboratorPortFor(viewerAgentRunId)` replaces `collaboratorPort()`.
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-collaborators.ts`, `.../agent-org-execution/services/agent-org-run-collaborators.ts`: rename only.
- `autobyteus-server-ts/src/api/graphql/types/agent-run-collaboration.ts`, `.../services/collaborator-root-port-resolver.ts`: nullable `focusedAgentRunId` argument, required (error) for `agent`.
- `autobyteus-web/composables/agentInput/runMentionScope.ts`, `services/collaborators/collaboratorCandidatesService.ts`, `composables/runSettings/useMentionCandidates.ts`, `graphql/queries/collaboratorQueries.ts`, `types/workspace/activeAgentWorkspaceTarget.ts`, `stores/agentRunCollaborationStore.ts`, `generated/graphql.ts` (collaborator hunks only).

Tests:
- New: `autobyteus-server-ts/tests/unit/standalone-agent-run-root/standalone-root-collaborator-port.test.ts`; `autobyteus-web/services/collaborators/__tests__/collaboratorCandidatesService.spec.ts`; `autobyteus-web/composables/agentInput/__tests__/runMentionScope.spec.ts`.
- Extended: contract `tests/collaborator-mention-note.test.mjs`; `standalone-agent-run-root.test.ts` (copy-member case).
- Updated for the renames/new argument: admission, Team/Org collaborator tests, stream-handler test fixture, web specs, and the four E2E candidate-query callers incl. AR-002's `remove-built-in-project-task-manager-startup.e2e.test.ts:324` and `standalone-agent-collaborator-mention.e2e.test.ts:230` (host run ID as the focused agent to keep host-view assertions). Web browser probe fixture task targets now carry `agentRunId`.

## Important Assumptions

- The focused/sender run ID is the viewer for every Agent-root call (A-05/A-06). `postToHost` resolves with the host as viewer.
- The GraphQL `focusedAgentRunId` is not membership-checked (design residual risk): an unknown ID gets the non-host view (menu contents only). The send-time re-check verifies membership.

## Known Risks

- AR-001 / MP-001 (residual, by design): after a host-definition rename plus a same-slug definition, a not-yet-in-run definition's catalog address can differ between the host and non-host views (not-found only, no second instance). Not handled by design; the normal case is pinned by `standalone-root-collaborator-port.test.ts` ("catalog addresses … are the same for the host and for other agents").
- `list_available_agents` is opt-in per agent (A-11); REQ-003 helps only agents with the tool enabled.
- Prompt adherence: an agent may still try `delegate_task` to the host; it is refused harmlessly and the note says it cannot target it.
- Stored (inactive) Agent roots in the GraphQL path derive the host address from the definition-ID slug when no package exists (unchanged behavior); candidates expose no addresses.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (fixes an unintended side effect)
- Reviewed root-cause classification: Missing Invariant (Agent-root port without a viewer)
- Reviewed refactor decision: `Refactor Needed Now` (small: `rootDefinition` → `ownDefinition`, `inRun` → `presence`)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: all viewer logic lives in `standaloneRootCollaboratorPortFor`; the policy has no viewer/root-kind branch; the web does no filtering.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes` — `rootDefinition()`, `MentionedCollaborator.inRun`, `IN_RUN_NOTE_GUIDANCE`/`IN_RUN_SUFFIX` constants, viewer-less `StandaloneRootCollaborators.port()` and `StandaloneAgentRunRoot.collaboratorPort()`, the per-root-only Agent cache key.
- Shared structures remain tight: `Yes` (one 3-state `presence`; `InRunPlacement` unchanged in shape)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (largest changed source: `standalone-agent-run-root.ts` 410 effective lines, +2 lines; production source delta about +221/−107 across 17 files, no single file near 220 changed lines)
- Notes: the parser's recognition of `SAVED_NOTE_GUIDANCES` is the designed data-continuity reader, not dual behavior; compose emits only current wording.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` → "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: contract tests parse notes composed by the previous release (in-run and not-in-run) and both saved guidances; for entries without `run_agent`, `guidanceFor` equals the previous `NOTE_GUIDANCE` / `IN_RUN_NOTE_GUIDANCE` byte for byte (the in-run suffix and in-run guidance were introduced together in `e08c4a8c5`, so no saved note pairs one without the other).
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` were run in the worktree; `pnpm -C autobyteus-web exec nuxt prepare` for web tests. Prebuild leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`; they are build outputs and are not committed.
- `autobyteus-agent-presentation-contracts/dist/` is tracked; it was rebuilt from the changed source by `pnpm -C autobyteus-agent-presentation-contracts test` and is committed with it, following prior commits.
- `autobyteus-web/generated/graphql.ts`: codegen needs a live schema URL (default `localhost:8000`, possibly the user's app), so the schema was emitted from the worktree server (`type-graphql` `emitSchemaDefinitionFile` via a temporary, deleted test file) to `/tmp/dccmd/schema.graphql` and codegen was pointed at that file. The full regeneration also showed unrelated base drift (Projects workspace fields, archive group mutation); only the four `collaboratorMentionCandidates` hunks were kept, each verified identical to the generator output.
- Discrepancy: `pnpm -C autobyteus-server-ts typecheck` fails on base with TS6059 (`tests` included under `rootDir: src`); used `tsc -p tsconfig.build.json --noEmit` (clean) and `tsc -p tsconfig.json --noEmit` filtered to non-TS6059 errors (none).

## Local Implementation Checks Run

All implementation-scoped; not API/E2E sign-off.

- Contract: `pnpm -C autobyteus-agent-presentation-contracts test` → 16/16 pass (includes run-agent-only note, mixed note, mismatched guidance rejected, previous-release notes, saved guidances).
- Server typecheck: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` → clean.
- Server targeted: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration/collaborators tests/unit/standalone-agent-run-root tests/unit/agent-org-execution tests/unit/agent-team-execution --no-watch` → 61 files pass (before adding the new file); `standalone-root-collaborator-port.test.ts` 5/5; `standalone-agent-run-root.test.ts` 20/20; `agent-collaboration-stream-handler.test.ts` 6/6.
- Server unit + integration: `pnpm -C autobyteus-server-ts exec vitest run tests/unit tests/integration --no-watch` → 694 files pass, 43 failed. One (`agent-collaboration-stream-handler.test.ts`) was this change's fixture lacking `presence`; fixed and passing. The other 42 files fail identically on a clean base worktree (`a573465d9`, fresh install + prebuild, same command with `--no-file-parallelism`): same 42 files, same 132 failed / 100 passed tests. They are unrelated to collaborators. Causes observed (grouped): `@prisma/client` has no default ESM export in the test environment (10 occurrences); test doubles out of date with `AgentRunManager` (“requires all execution-family dependencies”, `prepareNewAgentRun`/`releaseRetiredRun` not functions); file-explorer watcher runtime entrypoint not built (`src/file-explorer/watcher/runtime/watcher-runtime-process.js`); Brief Studio importable package not built (`applications/brief-studio/dist/importable-package`); application worker process exits. Fixing these is outside this ticket (several are build prerequisites or stale suites across unrelated subsystems); recorded here as a baseline item for the accountable owner per TESTING.md rule 9. File list: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/implementation-evidence/ir-001/server-baseline-failures.txt`.
- Server E2E (zero-credit fake AGY CLI, exercises the changed query with `focusedAgentRunId` = host and the `@` note through the real server for Agent, Team and Org roots): `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts --no-watch` → 3/3 pass. The other three updated E2E files are real-provider-gated and were not run.
- Web unit: `pnpm -C autobyteus-web test:nuxt --run` → 590 files pass (2 skipped), 4003 tests pass.
- Web type check: no package script; `pnpm -C autobyteus-web exec tsc --noEmit -p tsconfig.json` reports only pre-existing errors (plain `tsc` cannot resolve `.vue`/Apollo modules); none in changed lines.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the existing `@` menu in Agent-run composers (host and task children). Contents change only (the host appears in task-child menus); no new visuals.
- Approved UI/UX, interaction, requirement, or design references: requirements "UI, Interaction, And Experience Requirements" (existing menu contents only); no Product Design.
- Existing design system, shared components, and adjacent product surfaces reviewed: `AgentUserInputTextArea` menu, `useMentionCandidates`, `useComposerMentionMenu` (unchanged rendering).
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md browser dev-path probe `pnpm -C autobyteus-web test:e2e:composer-mention-discoverability --output-dir <ticket>/implementation-evidence/ir-001/composer-mention-probe` (owned Nuxt + candidate/upload doubles, headless Chrome).
- States, layouts, viewports, and interactions inspected: probe B01–B04 Pass — capability gating across Agent/Team/Org/task scope shapes, selection/caret/deletion/paste, keyboard dismissal/no-match, layout at 1512/1024/300 panel widths, locale, forced colors; 0 page errors; owned browser/Nuxt/page cleaned up. Candidate requests carried `focusedAgentRunId` for the Agent root (`evidence.json`).
- Visual or interaction issues found and corrected: none.
- Supporting evidence and remaining unverified states or limitations: screenshots and `evidence.json` in `implementation-evidence/ir-001/composer-mention-probe/`. The probe's candidate list is a double, so "host listed in a real task-child menu" is proven by server/web unit tests, not rendered against a live server; the real desktop journey (AC-003) is user verification.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/AC-002 through the real server: in a standalone Agent run with a delegated Team copy, query `collaboratorMentionCandidates(rootSubjectKind:"agent", rootRunId:<host>, focusedAgentRunId:<copy member>)` → host definition listed; with `focusedAgentRunId:<host>` → not listed. Send a SEND_MESSAGE with an `@host` mention to the copy member → posted note contains `- <Host> (Agent) at /<host_address>, the run's own agent` and `Use send_message_to with recipient_address /<host_address> to message <Host>; delegate_task cannot target it.`, with no `Delegate the work` sentence; no new collaborator/copy in the run tree.
- AC-003/AC-006: copy member calls `list_available_agents` (tool enabled) → host listed at its address; then `send_message_to(<host address>)` → host's existing run receives it (activated if idle).
- AC-009: copy member `delegate_task(<host address>)` → refused; host's own `list_available_agents` omits itself.
- `agent`-kind query without `focusedAgentRunId` → GraphQL error "focusedAgentRunId is required for an Agent run root."
- Good candidates to extend: `tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` (zero-credit fake CLI) or `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- New non-host journeys above through the real server (design step 5) are not authored here; owned by API/E2E.
- Real-provider-gated E2E files updated for the new argument (`agent-initiated-collaborators`, `standalone-agent-collaborator-mention`, `remove-built-in-project-task-manager-startup`) were not executed locally.
- Desktop verification of AC-003 by the user.
