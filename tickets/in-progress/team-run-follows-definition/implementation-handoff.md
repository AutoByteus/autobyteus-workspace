# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Large / High). ARCH-REV-002 passed design revision SR-008 with notes N-5 … N-10. The handoff rule for Large / High routes to `/software_engineering_team/code_reviewer`.
- Requirements doc: `tickets/in-progress/team-run-follows-definition/requirements-doc.md`
- Investigation notes: `tickets/in-progress/team-run-follows-definition/investigation-notes.md`
- Solution revision record: `tickets/in-progress/team-run-follows-definition/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/team-run-follows-definition/design-spec.md`
- Supplemental task artifacts: `tickets/in-progress/team-run-follows-definition/follow-ups.md`, `handoff-architecture-design.md`
- Design review report: `tickets/in-progress/team-run-follows-definition/design-review-report.md` (round 2, committed with this work)
- Architecture review revision record: `tickets/in-progress/team-run-follows-definition/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

A Team run now follows its Team definition while the run exists. When the definition's members, coordinator or handoff rules change, the run follows: live on every definition-change announcement, or before a stopped run is restored. Which runs follow, how a change is planned, committed, told to the members and shown in the app, and the former-member and leaving rules are documented in `autobyteus-server-ts/docs/modules/agent_team_execution.md` § Membership Follows The Definition, written with this change.

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/team-run-follows-definition/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-008`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits: `19b31ad365` (server core), `6b46ec5bdd` (tests, a leaving-member fix, web, docs), then the handoff commit with this file and the evidence.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Classification (line 26 onwards); ARCH-REV-002.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change touches the team root, the execution manager, the communication engine, the tree schema, composition, the view stream contract and the web, as designed. Nothing outside the design's Change Scope was needed.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The deviations below are within the design's intent; each is listed for the reviewer to judge.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 / D-TRIGGER | A live run follows every definition-change announcement, each run contained | `membership/team-definition-change-listener.ts` (`TeamDefinitionChangeListener`, `followLiveTeamRun`), wired in `general-process-run-supervisor.ts` from `definitionChanges`; `membership/team-membership-committer.ts` inside `root-team-run.ts` (`followDefinition`) | Lock → plan against the current tree → write once → `replaceTree` (tree, index, membership) → leave → notices → `runPartsChanged` → `TEAM_MEMBERSHIP_CHANGED_EVENT`. Fail-stop if a durable write cannot be applied live. Unchanged: no write, no event. |
| DS-002 | A stopped run is brought up to date before restore, then told | `agent-team-run-manager.ts` restore: `followStored` → write (`TEAM_RUN_DEFINITION_NOT_SAVED` unless committed) → materialize → register → `root.followedStored` → `followLiveTeamRun` | A follow is re-run right after registration to catch a change that came in during restore. |
| DS-003 / DEC-005 / DEC-006 / DEC-007 / N-3 | The plan: add, remove, swap, rejoin, coordinator, rules filtered to members | `membership/team-membership-change.ts` (pure `planTeamMembershipChange`), `membership/team-membership-planner.ts` (`viewFor`, `followStored`, launch layers) | A rejoin takes the latest former member at that address with the same agent. A missing coordinator throws `TeamMembershipPlanError`, logged; the run stays as it is. |
| D-SCOPE / N-6 / N-7 | Standalone and Team-definition copies follow; app-bound runs and configured-placement copies do not; peer-started copies record `team_definition`; copies compile `delegated_team` at their own root | `followsTeamDefinition`; `copiedFrom` set in `catalog-delegation.ts` callers, `task-delegation.ts`, `delegated-run-starter.ts`, `remote-team-run-starter.ts:34` (`"team_definition"`), `team-run-service.ts`; planner compiles `{ kind: "delegated_team" }` when `tree.delegatedFrom`, with no mount-path reconstruction | A copy recorded before `copiedFrom` existed follows (absent ≠ `configured_placement`). The app kernel uses `NO_TEAM_DEFINITION_FOLLOWING`. |
| DS-004 / DEC-002 / AC-003 | A removed member mid-turn finishes its turn: its own approvals, denials and interrupt work and its sends are delivered; it receives nothing; it is stopped once quiet, then released | `local/flat-team-execution-manager.ts` (`applyMembership`, `tryRetire`, retry `LEAVE_RETRY_MS`); engine `maySend` vs `isCurrentAgent` (`root-communication-engine.ts`, `domain/team-run-member-authority.ts`); `team-execution-index.ts` `getAgentForOwnCommand` | **Fixed during tests:** the retire check now runs in a microtask after the member's event, because the handle settles its status overlay after publishing the event. Before this fix a quiet member was not stopped until the 1 s retry. |
| DS-005 / D-ONE-VIEW | One in-memory view of membership; a retained member keeps its context object | `domain/team-run-membership.ts`; `team-run-context.ts` (`teamNode`/`handoffs` getters); registry keyed by agent run ID (`configured-agent-execution-registry.ts`); resolver via `membership.agentNode` | A rejoin restores the conversation (`activationMode` `restore` via `wasRejoined`). |
| DS-006 / DEC-004 / REQ-006 / AC-006 | One notice per remaining member at its next input, net-merged; the joined member hears nothing | `membership/team-change-notice-source.ts` (a platform notice source in `platform-notice-sources.ts`); sender `system.team_change_notifier` recorded in memory | Exact texts as in design § Exact Texts. `<name>` is the address basename. Delivery is preface-only, at the member's next input. |
| DS-007 a / AC-009 | An open Team view takes an in-band snapshot; leaving members are listed with `leaving: true`; the web keeps, adds and drops rows and contexts and tags "Leaving" | `team-view-session.ts` (MEMBERSHIP → `run(reenterLive)`), `team-execution-view-projector.ts`, `team-execution-view-dtos.ts` (`leaving?: true`); web `teamExecutionViewState.ts` (drops absent contexts), `teamExecutionTreeSelectors.ts`, `TeamMembersPanel.vue`, locales | **Web fix found by spec:** `applySnapshot` used to reject a snapshot that dropped a member. It now drops that member's context, as DS-007 says. |
| DS-007 b | Run-tree rows of the run and its ancestors are read again | `delegation-index.ts` `runPartsChanged`; `run-own-agents-reader.ts` `formerAgents` | — |
| REQ-003 / AC-001 / AC-008 | `get_handoff_rules` and the prompt read the run's current rules | `member-execution-context.ts` (`outgoingHandoffs` is a reader); `member-team-context-builder.ts` (`() => membership.handoffsOf(agentRunId)`); `get-handoff-rules-service.ts`, `collaboration-prompt-sections.ts` | — |
| REQ-009 / AC-010 | A message to a former member is refused, by address in both resolution steps and by run ID, with the exact text and `COLLABORATION_TARGET_NOT_FOUND` | `message-recipient-resolution.ts` (`formerMemberRefusal`), `collaborator-errors.ts` (`formerMemberRefusalMessage`), `team-run-message-delivery.ts` `deliverToRunId` | An address now held by a current member resolves to that member. |
| REQ-005 / D-FORMER | Saved with the run; former members kept for history | Tree type, schema (`team-run-execution-tree-schema.ts`), mutators, `team-run-execution-tree-location-service.ts`, `run-own-agents-reader.ts`, `delegation-index.ts` `agentsOf` | See deviation 1 for `team-run-history-service.ts`. |
| REQ-007 / AC-007 | A missing, unreadable or invalid definition leaves the run as it is, with a warning | planner `viewFor` / `planOrWarn`; listener containment | Warning codes `TEAM_RUN_DEFINITION_NOT_FOLLOWED` and `TEAM_MEMBER_NOT_ADDED`. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New, server: `src/agent-team-execution/membership/` (`team-membership-change.ts`, `team-membership-planner.ts`, `team-membership-committer.ts`, `team-definition-change-listener.ts`, `team-change-notice-source.ts`), `domain/team-run-membership.ts`, `domain/team-run-member-authority.ts`, `services/team-model-config-update-result.ts`, `agent-collaboration/delegation/run-parts.ts`.
- Changed, server: `root-team-run.ts`, `agent-team-run-manager.ts`, `team-root-materializer.ts`, `flat-team-execution-manager.ts` (+ backend chain), `team-run-context.ts`, `flat-team-execution-context.ts`/`-factory.ts`, registries, `team-execution-index.ts`, `message-recipient-resolution.ts`, `collaborator-errors.ts`, communication engine/ports, `team-run-message-delivery.ts`, `member-execution-context.ts` and its builders, `delegation-index.ts`, run-history readers, tree type/schema/mutator/builder, view session/projector, `copiedFrom` creation sites, compositions (`platform-notice-sources.ts`, supervisor input/supervisor, `build-studio-server.ts`, `start-standalone-application-host.ts`, `application-execution-scope-kernel-builder.ts`).
- Contracts: `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` (+ rebuilt `dist`).
- Web: `services/teamExecution/teamExecutionViewState.ts`, `teamExecutionTreeSelectors.ts`, `teamExecutionViewModels.ts`, `components/workspace/team/TeamMembersPanel.vue`, en / zh-CN `workspace.ts`.
- Docs: `docs/modules/agent_team_execution.md` (new § Membership Follows The Definition; fixed-topology statements rewritten; FU-001 fixed: "a message never starts an agent"), `docs/modules/agent_communication.md`, `docs/design/collaboration_model.md` (§ 2.1, remote Team entry), `GLOSSARY.md` (§ Team Runs: Former member, Leaving, Follows its definition).
- N-5 moved blocks (line counts on base → now):
  - `root-team-run.ts` 495 → **500**:
    - moved the member authority checks (`isCurrentAgent`, `maySend`, `authorizeSender`, `isLiveAgent`) into `domain/team-run-member-authority.ts` (`TeamRunMemberAuthority`);
    - removed an unused import and two dangling doc comments.
  - `agent-team-run-manager.ts` 495 → **497**:
    - moved `teamModelConfigUpdateResult` into `services/team-model-config-update-result.ts`;
    - the live follow lives in `membership/team-definition-change-listener.ts` (`followLiveTeamRun`).
  - `delegation-index.ts` 548 → **536**: moved the types `RunAgent`, `RunParts`, `RunStanding` and `RunPartsReader` into `delegation/run-parts.ts` (importers updated).

## Important Assumptions

- `<name>` in the notice and refusal texts is the address basename (`/writer` → `writer`), as for other member names in agent-facing text.
- A member that joins, including one that rejoins, gets no notice: it starts with the team as it is now (design DS-006).
- Notices are delivered only as a preface to the member's next input. A member that is never given input again is not told.
- A change found at restore is told through `root.followedStored(change)` once the run is registered.

## Known Risks

- **Retry while leaving.** A leaving member whose stop keeps failing is retried every 1 s, with a warning (`TEAM_MEMBER_LEAVE_STOP_FAILED`) each time, until it stops or rejoins. No cap.
- **Errors after commit.** If a follower step throws after the commit (notices, run-tree rows or publish), the change is durable and live, but the remaining steps for that change are skipped. That step's error reaches the listener, which logs it. The design's fail-stop covers only `replaceTree`.
- **Remote links.** A peer node's Team link member list is not refreshed (FU-003, outside this ticket). Messages to a removed member are refused on the run's node.
- **Untested end to end.** Real-runtime behavior (Codex and AutoByteus, restart, rendered app) is not exercised here. That is API/E2E's scope.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `Missing Invariant` with `Shared Structure Looseness`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (one execution view of membership; live handoff read)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes:
  - The three membership copies (context `teamNode`/`handoffs`, flat context `memberContexts`, root tree) are now reads of `TeamRunMembership`, plus the root tree it is replaced from.
  - `FlatTeamExecutionContext` keeps only `configuredMemberActivationMode`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. An absent `copiedFrom` follows, by design (D-SCOPE). This is not a fallback.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (`FlatTeamExecutionContext.memberContexts`, dangling doc comments in `root-team-run.ts`)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case:
  1. **History list.** `team-run-history-service.ts` history items still list only current members. This deviates from the design's list of history readers (design line 55/308). Listing a removed member as a team "member" in the run list would contradict REQ-002 ("it is not a current member"). Its memory and conversation stay reachable by run ID through the location service, `run-own-agents-reader.ts` and `DelegationIndex.agentsOf`, which do include former members.
  2. **Launch resolution.** New members' launches use `LaunchUsabilityCheck` directly with the design's two layers (agent default → the run's own launch, both checked), not `CollaboratorLaunchResolver` (design line 84/282). The resolver's extra layers (Model Router, delegation work, `defaults_only`) belong to catalog delegation and would route a model for every added member. The fallback is recorded in `launchSource` as the resolver does.
- Changed source implementation files stayed within proactive size-pressure guardrails (no file taken over `>500` or grown while already over it by this change; files already over it and not grown added to `follow-ups.md`; `>220` assessed/acted on): `Yes`
  - The three N-5 files are within limits (above).
  - The new files are each ≤220 lines.
  - `flat-team-execution-manager.ts` is 368 lines: assessed, and leaving logic is ~40 of them in one cohesive block.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision (line 98)
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: `tests/unit/run-history/team-run-tree-former-members-schema.test.ts` (IMP-03). A tree without `formerMembers` or `copiedFrom` reads unchanged, with no field added. Both fields round-trip. An empty `formerMembers` list is written as absent. A repeated run ID, a nested former member and a bad `copiedFrom` are refused.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Linux container, Node 22, pnpm via corepack (`/tmp/sm-bin/pnpm` shim).
- No provider keys were used. No test touched `~/.autobyteus`.
- The server typecheck baseline shrank from 1006 errors in 315 files to 1005 in 314 (`typecheck-baseline.json`, committed).
- Known failures on this machine, identical on base (see the implementation engineer's environment note):
  - `agent-package-folder-watcher.test.ts`, `unreadable-package-root.test.ts` and `app-config.test.ts` "read-only" (chmod checks; the container runs as root);
  - the two `socratic-*` tests ("No such built-in module: node:");
  - web `projectRunsStore.spec.ts`.
- `brief-package-team-prompt.integration.test.ts` needs the built `applications/brief-studio/dist/importable-package`, which is not built in this worktree.

## Checks Run

Evidence is in `tickets/in-progress/team-run-follows-definition/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `6b46ec5bdd` | Linux, Node 22 | all server src and tests | — | Pass | `IMP-01-server-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 1005 in 314 files (baseline 1005 in 314 files)` and `PASS` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` (full) | working tree between `19b31ad365` and `6b46ec5bdd` | Linux, Node 22 | whole server unit and architecture suite | all | Pass after fixes (failures listed in the log, each fixed and rerun in IMP-03/IMP-05, or known environment) | `IMP-02-server-unit-full-excerpt.log` | `Tests  20 failed \| 8617 passed`; then the per-file disposition in the header |
| IMP-03 | `vitest run` of every unit test file the ticket touched or added (43 files) | `6b46ec5bdd` | Linux, Node 22 | membership, planner, committer, listener, notices, index refusal, schema, run parts, history readers, view session, leaving member, compositions | DS-001 … DS-007, REQ-001 … REQ-009 | Pass (except the 3 architecture timeouts under parallel load, rerun alone in IMP-05) | `IMP-03-server-unit-touched.log` | `Tests  3 failed \| 377 passed`, where the 3 failures are `Test timed out in 5000ms` in `tests/architecture` |
| IMP-04 | `vitest run tests/integration/agent-team-execution tests/integration/collaboration-definition-admission tests/integration/api/team-communication-api.integration.test.ts tests/integration/application-backend/brief-package-team-prompt.integration.test.ts`, then `team-communication-api` alone | `6b46ec5bdd` | Linux, Node 22 | reproduction (`team-run-follows-definition.integration.test.ts`: live add/remove, restore follow), manager, backend, admission | AC-001, AC-002, AC-004, AC-006, AC-010 | Pass (brief-studio: environment) | `IMP-04-server-integration.log` | Run 3 (verbose): `✓ … team-run-follows-definition.integration.test.ts > A live Team run follows its definition (reproduction) > adds a member and a rule…` and `… a stopped run whose definition changed…`, `Tests  38 passed (38)`; Run 2: `Tests  4 passed (4)`; the brief-studio failure in Run 1 is `Standalone package root is not a directory` |
| IMP-05 | `vitest run tests/architecture tests/unit/compositions tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts` | `6b46ec5bdd` | Linux, Node 22 | AFB boundaries, tracked imports, host owners | — | Pass | `IMP-05-architecture.log` | `Tests  95 passed (95)` |
| IMP-06 | `pnpm -C autobyteus-web typecheck` | `6b46ec5bdd` | Linux, Node 22 | web app, electron, cross-package tests | AC-009 | Pass | `IMP-06-web-typecheck.log` | `[typecheck] PASS` |
| IMP-07 | `pnpm -C autobyteus-web guard:web-boundary && guard:localization-boundary && audit:localization-literals` | `6b46ec5bdd` | Linux, Node 22 | web boundaries, locales | — | Pass | `IMP-07-web-guards.log` | `[guard:localization-boundary] Passed.`, `Passed with zero unresolved findings.` |
| IMP-08 | `NUXT_TEST=true vitest run` (full web suite) | `6b46ec5bdd` | Linux, Node 22 | whole web | AC-009 | Pass (known `projectRunsStore` failure only) | `IMP-08-web-suite-excerpt.log` | `Test Files  1 failed | 790 passed (791)`; the one failure is `projectRunsStore > keeps one read per Project in flight…` (known, identical on base) |
| IMP-09 | `NUXT_TEST=true vitest run services/teamExecution` | `6b46ec5bdd` | Linux, Node 22 | Leaving row, address preference, snapshot add/keep/drop | AC-009, N-9 | Pass | `IMP-09-web-team-specs.log` | `Tests  18 passed (18)` |

- Not run, and why:
  - Real-runtime E2E per the Verification Intent (AutoByteus and Codex; standalone and delegated copy; restart; the rendered app probe for AC-009 with N-8) is left to API/E2E.
  - `tests/e2e` was not run: those files needed only constructor updates.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the Team members panel in a running Team's view: a new member row appears, a leaving member shows "Leaving", and a released member's row goes.
- Approved UI/UX, interaction, requirement, or design references: REQ-008, AC-009, DS-007 a, AR-004 (Leaving tag).
- Existing design system, shared components, and adjacent product surfaces reviewed: `TeamMembersPanel.vue`. The tag reuses the panel's existing secondary-line style (`mt-0.5 block text-xs font-medium`, amber like other status hints).
- Testing guideline or development / preview instructions and rendered surface used: specs only (IMP-09). No rendered probe was run here.
- States, layouts, viewports, and interactions inspected:
  - in specs: the view state across snapshots (new, leaving, released);
  - the selector rows (`leaving`, `coordinator` false while leaving);
  - the address preference for a current member when a leaving member shares the address.
- Visual or interaction issues found and corrected: the snapshot rejection on a dropped member (fixed in `teamExecutionViewState.ts`).
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-06, IMP-08 and IMP-09. The rendered look of the tag is unverified; API/E2E's rendered probe covers AC-009 (N-8).

## Downstream Coverage Hints / Suggested Scenarios

- **Live add.** In a running Team (AutoByteus and Codex members), add a member and a rule from the lead to it in `team-config.json`.
  - Expect `get_handoff_rules` of the lead to list the rule.
  - Expect `send_message_to` to the new address to start it (Offline → running).
  - Expect the lead's next input to carry "Your team changed: its definition was updated. / Joined: <name> at <address>. / Your handoff rules changed; call get_handoff_rules to read them."
- **Live remove while busy.** Remove a member while it is mid-turn.
  - Expect it to finish: approvals still work and its messages are delivered.
  - Expect messages to it, by address and by its run ID, to be refused with the exact text.
  - Expect the app to show it "Leaving", then drop it.
- **Swap.** Change the agent at an existing address. Expect the old member to finish while the new one is reachable at the address.
- **Rejoin.** Add a removed member back. Expect the same run ID, with its conversation continued.
- **Restore.** Change the definition while the run is stopped, then reopen it, and also after a server restart. Expect the current members, and the lead's notice at its next input.
- **Delegated copy.** Repeat the cases above for a delegated Team copy (catalog delegation), and for one a peer node started (`copiedFrom: team_definition`).
- **Not followed.** Check that a configured-placement copy and an application's Team run do not change.
- **Invalid definition.** Make the definition invalid. Expect the run unchanged and a `TEAM_RUN_DEFINITION_NOT_FOLLOWED` warning naming the run.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All of the Verification Intent's real-runtime cases (above): AC-001 … AC-010 on real AutoByteus and Codex members, standalone and delegated, across restart, and the rendered app probe for AC-009 (N-8).
