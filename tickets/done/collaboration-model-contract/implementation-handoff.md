# Implementation Handoff — collaboration-model-contract (Project Task 259ddae7)

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract`, branch `codex/collaboration-model-contract`, base `origin/personal` 8878625d94.
- Development commits: `5dd930d8be` (IR-001) and `44b5108b12` (IR-002, CR-001 fix; current) (`feat(collaboration): refuse own-team delegation, make messaging resolve-only, remove collaborators`). The ticket folder (this package) is uncommitted, as for earlier tickets; Delivery archives it.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); `ARCH-REV-002` **Pass** (round 2) after `ARCH-REV-001` Fail; handoff came from `architecture_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/requirements-doc.md`
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md` (SR-001..SR-003)
- Design spec: `.../design-spec.md`
- Supplemental task artifacts: `.../related-task-tool-split-receipt.md`, `.../new-task-proposal.md`, `.../temp-task-removal-proposal.md`, `.../temp-task-tool-split-proposal.md`; published model `autobyteus-server-ts/docs/design/collaboration_model.md`. `collaboration_model.draft.md` and `doc-consolidation.draft.patch` are superseded and were not used.
- Design review report: `.../design-review-report.md`
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework evidence: N/A (initial implementation). Real-data proof script kept at `.../evidence/real-data-proof.test.ts.txt`.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (CR-001 Local Fix; see the revision record). IR-001 text below is otherwise unchanged
- Related solution revision IDs: SR-001, SR-002, SR-003
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Related code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

What was built, in one place:

1. **CM-1 (refusal).** `agent-collaboration/collaborators/catalog-delegation.ts#resolveDelegationPlacement` first calls the new `isOwnTeamAddress(senderAgentRunId, address)` port. The Team, Org and standalone execution indexes implement it (DEC-008): the sender's own address; any address equal to or inside a team instance that contains the sender at any depth (`isInsideSenderTeamInstances`); in a Team root, additionally every configured root placement for a configured member. It throws `COLLABORATION_SELF_TARGET_REJECTED` with `send_message_to` guidance (`ownTeamDelegationRefusedMessage`) before placement, preparation, Task link or run allocation. The three per-root self checks and delegation step 1 (`task-copy-host.ts`, teammate-copy hosting) are removed; new copies are always root-hosted; restore of stored Team-hosted copies is unchanged (DEC-006).
2. **Messaging.** `message-recipient-resolution.ts#resolveMessageRecipient` is synchronous and resolve-only: own team instances (deepest first, no fall-through), then run-wide standing placements; otherwise `COLLABORATION_TARGET_NOT_FOUND` ("… is not in this run. To give work to an outside Agent or Team, use delegate_task …"). Catalog bring-in (`CollaboratorAdmission.ensure`, `bringInAt`), the Task helper path (`task-scoped-message-recipient.ts`), the identity allocator and the admission queue are deleted. `broughtIn` records in Task resources stay readable (DEC-007).
3. **Collaborator removal.** Tree types/schemas/mutators (`run-execution-tree-shared-records*`, standalone/Team/Org tree schemas; the standalone tree now requires `source` on every task execution), index kinds, hosting registries and handle preparation, restore, admission `ensure`, `collaborator_added` / `COLLABORATOR_ADDED` events, stream DTOs in `@autobyteus/team-stream-contracts` and `@autobyteus/collaboration-stream-contracts` (tracked `dist/` rebuilt), GraphQL, web rows/Settings/disclosure/stores, memory-explorer kinds and Token Meter. Catalog machinery stays under its current names (`@` resolution, `list_available_agents`, candidate policy, launch resolver, `CollaboratorEntryBuilder`; FU-1).
4. **Migration** `20261015_collaborators_to_delegated_runs_v1` (`STARTUP_ONLY`, required, registered last). `src/app-data-migrations/migrations/collaborators-to-delegated-runs-v1/`: frozen released-entry schema (`released-collaborator-entry-v1.ts`), pure conversion (`collaborators-to-delegated-runs-conversion.ts`), runner (`…-app-data-migration.ts`). Per tree: validate entries with the frozen schema; stamp `source` on sourceless copies at collaborator and collaborator-Team-member addresses at any depth (AC-011); append each entry to root-level `taskExecutions` as an unowned run in `addedAt` order (delegator = `addedViaAgentRunId`, `startedAt` = `addedAt`, source from the entry, selections carried); validate with the current reader; atomic write through the current store; re-read. Dispositions: `MIGRATED`, `SKIPPED_ALREADY_CURRENT`, `PRESERVED_TREE_UNREADABLE_WARNING`, `FAILED_INVALID_COLLABORATOR`, `FAILED_CONVERTED_TREE_INVALID`, `FAILED_OPERATION`.
5. **Texts.** `agent-team-collaboration-llm-contract.ts` (hash-pinned test updated), `standalone-collaboration-instruction.ts`, the `list_available_agents` description, and the `@` note presence comment. `docs/modules/prompt_engineering.md` embeds the regenerated block. The `@` note IN_RUN / run-agent sentences are unchanged (only the delegate sentence changed in `task-tool-split`).
6. **Docs.** Module docs rewritten for the new mechanics (agent_communication → "Delegated catalog copies", agent_orgs, agent_team_execution, standalone_agent_run_root, agent_tools, run_history incl. the migration, projects, token_usage, agent_definition, agent_execution, agent_team_definition) and web docs (chat, agent_teams, agent_orgs, settings, agent_execution_architecture, projects, token_meter, agent_artifacts). Anchors that pointed at the old sections were updated. The CM-1 "any depth" sentence the solution designer added to `docs/design/collaboration_model.md` is kept; its status table already describes this change.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` (Large / High, confirmed by ARCH-REV-002)
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 329 files changed; a persisted-data migration over three tree families; shared contracts and generated artifacts changed across server, three contract packages and the web; one runtime concept removed end to end. The real-data proof and migration tests did not show new risk, so no change.
- Selected route: `Code Review` (Large / High; `get_handoff_rules` result in the message)
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001..BEH-003 (AC-001..AC-003) | `delegate_task` to self, a teammate, or the own Team is refused with `send_message_to` guidance | `collaborators/catalog-delegation.ts`; index ports `agent-team-execution/services/team-execution-index.ts`, `agent-org-execution/services/agent-org-execution-index.ts`, `standalone-agent-run-root/services/standalone-root-execution-index.ts`; callers `*-recipient-resolver.ts` | Tests: Team `team-root-delegation-and-messaging.test.ts`, integration `task-delegation-tool-lifecycle.integration.test.ts`; Org `agent-org-agent-initiated-collaborators.test.ts` (same mounted Team refused at any depth, `/target`, `/target/lead`; sibling mounted Team and `/director` allowed; a delegated Team copy's own sub-team refused); standalone `standalone-agent-run-root.test.ts` |
| BEH-004 (AC-004) | Independent units still delegated; new copies always root-hosted | `catalog-delegation.ts`, per-root adapters/resolvers; `task-copy-host.ts` deleted | Copies stored under a Team keep their host on restore (standalone test "copy already stored under a Team restores in place") |
| BEH-005..BEH-007 (AC-005, AC-006) | `send_message_to` resolves standing instances only; otherwise not found with `delegate_task` guidance; no run created | `collaborators/message-recipient-resolution.ts` and the three `*-recipient-resolver.ts` | Not-found tests for Team, Org, standalone and a Task-owned sender (integration lifecycle test); `message-recipient-resolution.test.ts` |
| BEH-009 (AC-010) | `@X` no longer implies a collaborator; note steers to `delegate_task` | `collaborator-admission.ts#resolveMentions`, `@autobyteus/agent-presentation-contracts` note | `agent-org-collaborators.test.ts`, `collaborator-admission.test.ts`, standalone `@` test |
| BEH-010 (AC-007, AC-011) | Stored collaborators become unowned delegated runs; memory untouched; sourceless copies get sources | migration folder above; registry `app-data-migration-registry.ts` | `tests/unit/app-data-migrations/collaborators-to-delegated-runs/` (conversion + per-family fixtures + memory-folder equality + AC-011 + idempotency + every disposition); real-data proof below; reopen by run ID covered by the standalone integration fixture (`native-compaction-root-fixture.ts` seeds a stopped unowned copy and wakes it by run ID) |
| BEH-011 (AC-008) | Texts state the model on AutoByteus, Codex, Claude | `agent-team-collaboration-llm-contract.ts`, `standalone-collaboration-instruction.ts`, `list-available-agents-contract.ts` | llm-contract hash test + "no bring-in wording" assertions; `member-collaboration-instruction-provider-parity.test.ts`; carpenter prompt snapshot updated |
| BEH-012 (AC-009) | Canonical model document published and referenced | `autobyteus-server-ts/docs/design/collaboration_model.md`, `DESIGN.md`, module docs | Doc review |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Not touched: delegated-run/message storage locations (Task 8641c0ac), temp Tasks and task tools, renaming catalog-only "collaborator" names (FU-1).

## Key Files Or Areas

- Shared rules: `agent-collaboration/collaborators/{catalog-delegation,message-recipient-resolution,collaborator-errors,collaborator-root-port,collaborator-admission}.ts`.
- Per root (Team / Org / standalone): `*-execution-index.ts`, `*-recipient-resolver.ts`, `*-message-delivery.ts`, `*-task-execution-adapter.ts`, `*-collaborators.ts` (now catalog queries only), tree schemas/stores under `run-history/store/` and `standalone-agent-run-root/persistence/`.
- Migration: `src/app-data-migrations/migrations/collaborators-to-delegated-runs-v1/`.
- Contracts: `autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts`, `autobyteus-agent-presentation-contracts` (`src/`, tracked `dist/`, `tests/`).
- Web: `services/agentCollaboration/*`, `services/agentOrgExecution/*`, `services/teamExecution/*`, `stores/*`, `utils/runSettings/*`, `components/workspace/{history,config,org}`, `components/run-settings`.

## Important Assumptions

- ASM-001 (design): users upgrade through the startup migration; downgrade after conversion is unsupported (documented).
- A collaborator Team that never started has no conversation; waking it by run ID reports `TASK_EXECUTION_CONTEXT_UNAVAILABLE` (AC-007), as for any copy without a saved conversation.
- The stored `broughtIn` Task records are only read; nothing writes new ones.

## Known Risks

- Large removal surface: the reviewer should read `git diff 8878625d94..5dd930d8be --stat` by area (server src ≈117 files, web ≈110, contracts, docs).
- Five server e2e files still describe the removed behavior (live-runtime or controlled-runtime suites owned by `api_e2e_engineer`; not runnable in this environment without live providers). They need rewriting, not fixing in place: `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (1093 lines), `…/runtime/standalone-agent-collaborator-mention.e2e.test.ts` (518), `…/agent-org-runs/controlled-org-publication-http.e2e.test.ts` (asserts `rootOrg.collaborators`, `collaborator_added`), `…/projects/ad-hoc-task-delegation.e2e.test.ts` (step 6 "bring-in adds a collaborator"), `…/projects/delegated-copy-member-contact-host.e2e.test.ts` (`collaboratorsIn` checks; mostly still valid). Replace the bring-in steps with `delegate_task` + `send_message_to` run-ID steps and assert not-found for outside addresses.
- `tests/unit/agent-execution/native-compaction-terminal-drain.test.ts` failed once in the full unit run and passes 2 of 3 reruns in isolation; it imports nothing from this change (`recovery-native-fixture`), so it is a pre-existing timing flake.
- The real-data copy was taken while the app was running. Tree files are written atomically, so each is consistent, but the copy is not a quiesced snapshot.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change` + `Refactor` (removal).
- Reviewed root-cause classification: duplicated policy, empty capability (`send_message_to` also creating runs), legacy overlap (collaborators vs delegated runs).
- Reviewed refactor decision: `Refactor Needed Now`.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: one shared refusal rule replaced three; messaging resolve-only; one runtime representation of an outside unit (a delegated run).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the old shapes are read only inside the migration folder's frozen schema).
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (collaborator code, helper path, admission queue, identity allocator, hosting registries, task-copy-host and their tests deleted; `tsc --noUnusedLocals` shows no new unused symbol in touched files).
- Dead code found elsewhere, listed as follow-up: pre-existing unused imports in `agent-org-run.ts` (lines 10–48), `agent-org-task-execution-adapter.ts`/`team-task-execution-adapter.ts` (`PreparedTaskExecutionActivation`), `agent-team-run-manager.ts` (`AgentOperationResult`), `token-usage-stats.ts` (`Int`, `GraphQLJSON`); not caused by this change.
- Shared structures remain tight: `Yes` (the standalone tree now requires `source` on every task execution rather than adding optional fields).
- Canonical shared design guidance reapplied: `Yes`.
- Source-file size guardrails: `Yes` (no changed non-test file exceeds 500 non-empty lines; new files ≤ 190 lines).
- Notes: catalog code keeps "collaborator" in names (FU-1, cosmetic).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Migration Required` (design DEC-005 (a), isolated startup migration).
- Design-spec decision reference: design-spec "Migration Plan".
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes` (current readers no longer know `collaborators`; old knowledge is confined to the migration folder; `Directly Usable` reads of other records are unchanged).
- Migration implementation and focused checks: see "Local Implementation Checks Run" and "Real-data proof". Retry/idempotency: a converted tree has no `collaborators`, so a re-run is `SKIPPED_ALREADY_CURRENT` and changes no byte (tested). Interrupted write: the atomic writer leaves the old or the new file; the next start converts or skips.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- `pnpm -C autobyteus-server-ts test:integration:prepare` was run (integration prerequisites present).
- Untracked build output in `applications/*/dist` and SDK `dist/` folders is not part of the change.

## Local Implementation Checks Run

Implementation-scoped only; no API/E2E sign-off is claimed.

- Server typecheck `tsc -p tsconfig.build.json --noEmit`: clean.
- Server unit `pnpm exec vitest run tests/unit`: 692 files / 5499 tests pass; 1 unrelated flaky timing test (above).
- Server integration `pnpm exec vitest run tests/integration` after `test:integration:prepare`: 73 files pass, 373 tests pass; the two `agent-status-websocket.integration.test.ts` cadence cases fail — the documented baseline exception in `TESTING.md`. Adapted: `native-compaction-root*.integration` (seed a stopped unowned copy and wake it by run ID), `task-delegation-tool-lifecycle.integration` (own-Team refusal; Task-owned delegation instead of helper bring-in), `draft-context-files-universal`, `remove-built-in-project-task-manager-startup`.
- Contract packages `pnpm test` (build + node tests): team-stream 16/16, collaboration-stream 27/27, agent-presentation 20/20. Tracked `dist/` rebuilt and committed.
- Web `NUXT_TEST=true vitest run`: 624 files / 4388 tests pass.
- New migration tests (18): conversion (pure) 8, filesystem migration 10 — per family (Agent, Team, Org), run IDs preserved, non-tree files and folder listing byte-identical, no folder created for the never-started Team, AC-011 stamping, idempotency, invalid entry, unreadable tree, converted-tree-invalid, failed write, registration last/STARTUP_ONLY.
- **Real-data proof (AC-007)** on a copy of `~/.autobyteus/server-data/memory` (the 7 trees' run folders, 190 MB; the original was never written): migration result `SUCCEEDED`, 7 trees scanned, 7 `MIGRATED`, 9 collaborators converted; no non-tree file or folder changed (hash and listing equal); every tree reads with the current store and indexes (`TeamExecutionIndex`, `StandaloneRootExecutionIndex`); for each of the 14 converted agent runs that has a memory folder, the current location service resolves exactly that folder; 4 Team-collaborator members never started and have no folder (waking them reports context unavailable); a second run migrates 0 and skips 7. Source: `evidence/real-data-proof.test.ts.txt` (run from a temporary test file, then removed).

## Frontend Rendered-Result Check (When Applicable)

Not Applicable as a visual task: web changes remove collaborator rows/events and rewire existing rows to delegated-run data. Component and store behavior is covered by the web suite above (Settings rows, history rows, disclosure, Token Meter, stream contexts). No new visual design; no rendered-state inspection was performed, so none is claimed.

## Downstream Coverage Hints / Suggested Scenarios

- Rewrite the five e2e files listed under Known Risks for the new model.
- Live: a Team member delegating to its own teammate (refused with guidance), a Team coordinator delegating to an outside catalog Agent (copy at root; message it by run ID), `send_message_to` an outside catalog address (not found, nothing created), an Org agent delegating to a sibling mounted Team (allowed) and to its own mounted Team (refused).
- Startup on a data root that holds old collaborators in all three families (user data copy) and open the converted runs in the UI; wake a converted run by run ID; the never-started Team reports context unavailable.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required, owned by `api_e2e_engineer` after Code Review: the e2e rewrites above, a startup run against a copy of the user's data through the built server (`pnpm -C autobyteus-server-ts build` first; TESTING.md), and the Agent/Team/Org live scenarios. Not claimed here.
