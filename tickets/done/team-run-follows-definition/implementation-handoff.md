# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Large / High). ARCH-REV-004 passed design revision SR-010 with notes N-12 … N-14; N-5, N-6, N-7, N-9 and N-10 still apply. The handoff rule for Large / High routes to `/code_reviewer`.
- Requirements doc: `tickets/in-progress/team-run-follows-definition/requirements-doc.md`
- Investigation notes: `tickets/in-progress/team-run-follows-definition/investigation-notes.md`
- Solution revision record: `tickets/in-progress/team-run-follows-definition/solution-revision-record.md` (through SR-010)
- Design spec (required on every route): `tickets/in-progress/team-run-follows-definition/design-spec.md` (SR-010)
- Supplemental task artifacts: `follow-ups.md`, `handoff-architecture-design.md`
- Design review report: `tickets/in-progress/team-run-follows-definition/design-review-report.md` (round 4, ARCH-REV-004)
- Architecture review revision record: `tickets/in-progress/team-run-follows-definition/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence (IR-003): `code-review-report.md` CRR-004, CR-003 Local Fix (API-REV-002 F-3). Earlier rounds:
  - `code-review-report.md` round 2 (CRR-002: CR-001 Local Fix, CR-002 Design Impact, O-1, O-2);
  - `api-e2e-execution-coverage-report.md` (API-REV-001: F-1, F-2);
  - `code-review-report.md` round 1 note C-07 (cosmetic).

## Current Implementation Summary

A Team run follows its Team definition while the run exists, live on every definition-change announcement and before a stopped run is restored. `autobyteus-server-ts/docs/modules/agent_team_execution.md` § Membership Follows The Definition documents the current behavior; it was updated in this round. That covers which runs follow, how a change is planned, committed, told to the members and shown, the former-member and leaving rules, the release step and the member rows.

This round (IR-002) does three things:
- **Leaving is a stored marker.** A removed member whose execution is still live gets `formerMembers[i].leaving`. The execution manager only stops the member, and the committer owns its release.
- **Leaving members are shown in the rendered list.** They appear on the run-tree member rows: the run's own rows, and a Team copy's rows under its delegating run, tagged "Leaving" while the run is live.
- **Fixes.** Run-ID messages to removed members reach the refusal (CR-001). The planner no longer follows a definition the loader could not read, and warns once per run and reason (O-1, O-2).

- Implementation cycle: `Rework`
- Implementation revision record: `tickets/in-progress/team-run-follows-definition/implementation-revision-record.md`
- Current implementation revision ID: `IR-004` (IR-001 baseline, IR-002 rework, IR-003 CR-003, IR-004 CR-004)
- Related solution revision IDs: `SR-009`, `SR-010`
- Related architecture-review revision IDs: `ARCH-REV-003`, `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001` … `CRR-005`
- Related API/E2E revision IDs: `API-REV-001`, `API-REV-002`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-003` (IR-003); earlier `CR-001`, `CR-002` (via SR-009/SR-010), `O-1`, `O-2`, `C-07`; review notes `N-12`, `N-13`, `N-14`
- Commits:
  - `19b31ad365`, `6b46ec5bdd`: IR-001.
  - `d005fa2a5b`: IR-002 code, tests, docs and web.
  - `64a4b6100c`: IR-002's handoff, evidence, and the O-2 warn-once follow-up in the planner, with its test.
  - `072bdb7217`: IR-003, the CR-003 fix, its tests and evidence IMP-18 … IMP-21.
  - The IR-004 commit: CR-004 (no behavior change). A team location's `configuredPlacement` is non-null; the unreachable refusal and `!` in `team-member-run-view-projection-service.ts` and the second node lookup (`ownNodeOf`) are removed, along with the stale test of that refusal. Evidence IMP-22.

IR-003 (CR-003): a leaving or stopped former member is located with its own stored node. So its member projection, active trace, file changes and file-change entry open by run ID. In the app, its Leaving row now opens it with its pending Approve control (rendered TFU-04 with a real Codex member, IMP-21). This was a server-only change; the web needed nothing.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk; ARCH-REV-004.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: this round touches the persisted tree (a new marker), the committer and execution manager, the run-tree layer and its contract DTO, the router and every root boundary, and the web rows, as the design names.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

Behaviors IR-001 implemented and IR-002 left unchanged (DS-001 trigger, DS-003 plan, DS-005 live rules, DS-006 notices, D-SCOPE / N-6 / N-7) are traced in IR-001. The table lists the current paths of what changed.

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-004 (SR-010, AR-008) / DEC-002 / AC-003 | A removed member with a live execution is written `leaving` by the locked plan. It finishes its turn, is stopped when quiet, then released by the committer: write → replace → handle removal → rows → view event. A definite release-write failure is healed by the next plan. | `membership/team-membership-change.ts` (`planTeamMembershipChange(tree, view, liveExecutionIds)`, `clearStoppedLeavingMarkers`, `leavingReleaseChange`, `changesTheTeam`); `membership/team-membership-committer.ts` (`commit` reads `liveExecutionIds` inside `prepareAgainstCurrent`, N-14; `applied`; `memberStopped`); `local/flat-team-execution-manager.ts` (`liveExecutionIds`, `applyMembership(leavingIds, stopped)`, `removeStoppedHandle`); `domain/team-run-membership.ts` (`replace` reads the markers; no `release`) | N-12: `memberStopped` removes the stopped handle even if the member rejoined; it clears only stale markers. An ending run (not admitting) writes nothing. A leaving member is no longer retried after its team stops. |
| AR-007 / restore | Outside a live run a marker reads as former; the restore clears markers; unregister re-reads the rows | `membership/team-membership-planner.ts` `followStored` (always `leavingReleaseChange` with nothing live, even when the definition is not read); `services/agent-team-run-manager.ts` `unregister` (`runPartsChanged` after `activeRootDirectory.unregister`, only when the tree has markers, N-13) | — |
| DS-007 (SR-010, AR-007/AR-009) / AC-009 | One rule for member rows in both run-tree paths: a leaving row is tagged only while the run is live. Delegated copies read the child's own parts. | `agent-collaboration/delegation/run-tree-view.ts` (`teamMemberRowsOf`, `RunTreeSources.isLiveTeamRun`, `RunTreeRow.leaving`); `run-tree-records.ts` (`localChildRecord` reads `ownTreeOf`, launch looked up by run ID in members and former members); `run-history/store/run-own-agents-reader.ts` `ownTreeOf` (members, then former members marked `leaving`); `compositions/collaboration-composition.ts` (`isLiveTeamRun` from the active root directory); `autobyteus-collaboration-stream-contracts/src/run-tree-dtos.ts` (`leaving?: true`, dist rebuilt) | `DelegationIndex.agentsOf` is unchanged (messages, history). The root's view snapshot lists `leavingMembers` from the stored marker. |
| DS-007 web | "Leaving" tag on the rendered member rows; the row still opens | `utils/runTree/runTreeDisplayRows.ts`, `components/workspace/history/WorkspaceTeamExecutionTree.vue` (own-row mapping keeps `leaving`), `WorkspaceStableExecutionRow.vue`, `WorkspaceDelegatedRunRow.vue`, `stores/runHistoryTypes.ts` (`leaving?`), en / zh-CN `workspace.history.hierarchy.leaving(_title)` | `TeamMembersPanel.vue` (unmounted on base) and all its locale keys are removed. The navigation rows' `leaving` field, read only by that panel, is removed. |
| CR-001 / REQ-009 / AC-010 | A run-ID message to a leaving or former member reaches the root's refusal | `ActiveRootMessageBoundary.ownsAgentRun` (required, also checked at registration); `RootTeamRun.ownsAgentRun` (current, leaving, former); Org / standalone roots: `= hasAgentExecution`; `GlobalAgentRunMessageRouter.deliver` uses `ownsAgentRun` | `hasAgentExecution` is unchanged, so `placeOf` never places a former member (tested). Proven through the router (integration) and through the real tool path (IMP-17 TF-02/TF-03). |
| CR-003 / AC-003 / DEC-002 / REQ-002 (IR-003) | A Leaving row opens its member: projection, active trace and file changes, so its pending approval can be answered. A stopped former member's conversation opens by run ID. | `run-history/services/team-run-execution-tree-location-service.ts` `toLocation` (`configuredPlacement` = the located agent's own stored node, marker stripped); `run-history/services/team-member-run-view-projection-service.ts` (`ownNodeOf` for `platformAgentRunId`) | No web change. Rendered TFU-04 (real Codex): the Approve control shows and the approval runs the command. |
| O-1, O-2 / D-INVALID / AC-007 | A definition with a load issue (last good kept), one naming an unknown agent, a missing one, or one whose coordinator can't be added leaves the run unchanged, warned once per run and reason, and again after it was valid | `team-membership-planner.ts` (`listLoadIssues`, `notFollowed` with its warn-once map, coordinator check in `viewFor`, run-ID allocation failure in `viewFor`) | The warning keeps the existing format, `TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '<id>' keeps its members: <reason>`, which the TF suite matches. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- **IR-002, server:**
  - `membership/team-membership-change.ts`, `team-membership-committer.ts`, `team-membership-planner.ts`;
  - `domain/team-run-membership.ts`, `domain/team-run-execution-tree.ts` (`FormerMemberExecutionNode`), `domain/root-team-run.ts`, `domain/team-run.ts`;
  - `backends/team-run-backend.ts`, `local/flat-team-run-backend.ts`, `local/flat-team-execution-manager.ts`;
  - `services/agent-team-run-manager.ts`;
  - `run-history/store/team-run-execution-tree-schema.ts`, `run-history/store/run-own-agents-reader.ts`;
  - `agent-collaboration/delegation/run-tree-view.ts`, `run-tree-records.ts`;
  - `agent-collaboration/execution/services/active-collaboration-root-directory.ts`, `agent-communication/services/global-agent-run-message-router.ts`;
  - `agent-org-execution/domain/agent-org-run.ts`, `standalone-agent-run-root/domain/standalone-agent-run-root.ts`, `agent-org-execution/services/agent-org-execution-index.ts` (C-07);
  - `compositions/collaboration-composition.ts`.
- **Contracts:** `autobyteus-collaboration-stream-contracts/src/run-tree-dtos.ts` (+ dist).
- **Web:** listed in the trace above.
- **Docs:** `agent_team_execution.md` (Plan, Commit, Membership, Leaving, Former members, the new Rows item, Views, Restore); `agent_communication.md` (same-root path uses `ownsAgentRun`); `GLOSSARY.md` (Leaving).
- **N-5 line counts (limits 500 / 500 / 548):**
  - `root-team-run.ts`: 499. I simplified `executeAgentCommand`'s duplicated branch, which saved 3 lines; no new block moved.
  - `agent-team-run-manager.ts`: 499.
  - `delegation-index.ts`: 536, unchanged this round.
  - The IR-001 moves still stand: `domain/team-run-member-authority.ts`, `services/team-model-config-update-result.ts`, `delegation/run-parts.ts`, `followLiveTeamRun`.

## Important Assumptions

- "Live execution" means a member handle that exists and is not stopped (`FlatTeamAgentExecutionHandle.isStopped()`). An idle started member is live, so its removal writes `leaving` and stops it at once.
- `RunTreeSources.isLiveTeamRun` means registered in the active root directory, the same notion the manager's unregister ends.
- Earlier assumptions still hold: `<name>` is the address basename; notices are delivered as a preface at the member's next input; a joined member gets no notice.

## Known Risks

- **Two row components.** History items list current members only. So without the Team view open, the Workspaces tree shows a leaving member's server row through `WorkspaceDelegatedRunRow` (no own-row match). With the view open, the view's tree contains it and it renders through `WorkspaceStableExecutionRow`. Both components show the tag.
- **Rendered check (IR-003).** The rendered UI probe was run (TFU-01 … TFU-06, IMP-21). The tag, the opening of a Leaving row, and its Approve control are verified there.
- **Error in a follower step.** A follower step that throws after a commit skips the rest of that change's steps (C-04, unchanged).
- **Remote peer links.** FU-003 still applies (remote peer links).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature` (plus a Local Fix and the realization of a revised design)
- Reviewed root-cause classification: `Missing Invariant` with `Shared Structure Looseness`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes:
  - One stored fact (the marker) drives the membership, the index, the view snapshot and the rows.
  - The tree is written only by the committer (follow, release) and the restore step.
  - `TeamRunMembership` changes only by `replace`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. A tree without markers reads as before.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed:
  - `TeamMembersPanel.vue` and its locale keys;
  - `TeamRunMembership.release`;
  - the navigation rows' `leaving` field;
  - the duplicated branch in `executeAgentCommand`.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`leaving?: true` only; `FormerMemberExecutionNode` = configured node + marker)
- Canonical shared design guidance was reapplied, and file-level design weaknesses were routed upstream when needed: `Yes`
- Deviations from a design principle decided during implementation:
  1. **History list** (IR-001 deviation 1, accepted in CRR-001 C-05): history items list only current members.
  2. **Launch resolution** (IR-001 deviation 2, accepted in CRR-001 C-06): new members use `LaunchUsabilityCheck`, not `CollaboratorLaunchResolver`.
  3. **Warning format** (new): D-INVALID writes the warning as `TEAM_RUN_DEFINITION_NOT_FOLLOWED:<teamRunId>: <reason>`. I kept the existing `TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '<id>' keeps its members: <reason>`: it names the run and reason the same way, and the API/E2E suite and logs already use it.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`
  - `flat-team-execution-manager.ts` is 376 lines and `run-tree-view.ts` 274; each grew by a cohesive block.
  - The membership files are each ≤164 lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: § Persisted Data / State Transition Decision (SR-009 adds the optional `leaving: true` on a `formerMembers` entry)
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: `tests/unit/run-history/team-run-tree-former-members-schema.test.ts` (IMP-12):
  - the marker round-trips;
  - any value but `true` is refused;
  - an absent marker reads as stopped.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Linux container, Node 22, pnpm via corepack. No provider keys were used: IMP-17 uses the scripted AGY CLI fixture, with a temp HOME and `env -i`.
- Known environment failures, identical on base: `agent-package-folder-watcher`, `unreadable-package-root`, `app-config` "read-only", two `socratic-*` load failures, and web `projectRunsStore`.

## Checks Run

Evidence is in `tickets/in-progress/team-run-follows-definition/evidence/`. IMP-01 … IMP-09 are IR-001's. This round's checks:

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-10 | `pnpm -C autobyteus-server-ts typecheck` | `d005fa2a5b` + O-2 change | Linux, Node 22 | all server src and tests | — | Pass | `IMP-10-server-typecheck.log` | `[typecheck] PASS`; `production errors: 0; test-file errors: 1005 in 314 files (baseline 1005 in 314 files)` |
| IMP-11 | `pnpm -C autobyteus-server-ts test:unit` (full) | `d005fa2a5b` code, before 3 test fakes were fixed | Linux, Node 22 | whole server unit and architecture suite | all | Pass after fixes (the 3 lifecycle files are rerun in IMP-12; the rest are known environment failures) | `IMP-11-server-unit-full-excerpt.log` | `Tests  12 failed \| 8659 passed`; the failing files are listed with their disposition in the header |
| IMP-12 | `vitest run` of the 26 server test files this round touched or added, `--reporter=verbose` | `d005fa2a5b` + O-2 change | Linux, Node 22 | plan and markers, committer release order and healing, membership, manager stop, planner O-1/O-2 and `followStored`, run-tree rows (own and copy, live and not), reader, schema, router doubles, lifecycle fakes, integration (live flow, router refusal, `placeOf`, release, restore, restart while leaving) | DS-004, DS-007, AR-007, AR-008, AR-009, CR-001, O-1, O-2, N-12, N-13, N-14 | Pass | `IMP-12-server-touched-verbose.log` | `Tests  169 passed (169)`; e.g. `✓ … committer … a release write that does not commit keeps the marker with a warning; the next plan heals it` |
| IMP-13 | `vitest run tests/architecture tests/unit/compositions tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts` | same | Linux, Node 22 | AFB boundaries, tracked imports, host owners | — | Pass | `IMP-13-architecture.log` | `Tests  95 passed (95)` |
| IMP-14 | `pnpm -C autobyteus-web typecheck` + `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | same | Linux, Node 22 | web app, locales | AC-009 | Pass | `IMP-14-web-typecheck-guards.log` | `[typecheck] PASS`; `Passed with zero unresolved findings.` |
| IMP-15 | `NUXT_TEST=true vitest run` (full web suite) | same | Linux, Node 22 | whole web | AC-009 | Pass (known `projectRunsStore` failure only) | `IMP-15-web-suite-excerpt.log` | `Test Files  1 failed \| 791 passed (792)`; the failure is `projectRunsStore > keeps one read per Project in flight…` |
| IMP-16 | web specs: `WorkspaceMemberLeavingTag.spec.ts`, `services/teamExecution`, `WorkspaceDelegatedRunRow.spec.ts` (verbose) | same | Linux, Node 22 | tag on both row components, row model from the DTO, view state contexts, selectors | AC-009, DS-007 | Pass | `IMP-16-web-specs.log` | `Tests  33 passed (33)` |
| IMP-17 | `pnpm -C autobyteus-server-ts build`, then the API/E2E TF suite (built server, scripted AGY CLI) run as a self-check | same | Linux, Node 22, temp HOME, `env -i` | the whole feature through the built server, the real `send_message_to` tool path and the package watcher | AC-001 … AC-010 (scripted runtime), CR-001/F-1 | Pass | `IMP-17-tf-e2e.log`, `IMP-17-tf/TF-*.json` | `Tests  10 passed (10)`; `TF-02.json` `byRunId` and `TF-03.json` `refusedByRunId`: `"code": "COLLABORATION_TARGET_NOT_FOUND"` with the exact text; three planner warnings, each once |

| IMP-22 | `pnpm -C autobyteus-server-ts typecheck`; the same tests as IMP-19 | IR-004 | Linux, Node 22 | location and projection services after CR-004 | CR-003, CR-004 | Pass | `IMP-22-cr004-typecheck-tests.log` | `[typecheck] PASS`; `Test Files  96 passed (96)` |
| IMP-18 | `pnpm -C autobyteus-server-ts typecheck` | IR-003 | Linux, Node 22 | all server src and tests | — | Pass | `IMP-18-server-typecheck.log` | `[typecheck] PASS` |
| IMP-19 | `vitest run tests/unit/run-history tests/unit/agent-memory tests/unit/context-files`, the integration reproduction, `team-run-history.test.ts` | IR-003 | Linux, Node 22 | location and projection services, memory locations, history readers | CR-003, REQ-002 | Pass | `IMP-19-server-tests-cr003.log` | `Test Files  96 passed (96)`; the new `CR-003: …` cases in `team-run-former-member-location.test.ts` |
| IMP-20 | The TF suite again (12 cases, including API/E2E's round-2 TF-11, TF-12 and TF-03's projection assertions) | IR-003 | built server, scripted AGY | the whole feature | AC-001 … AC-010, F-3 | Pass | `IMP-20-tf-e2e.log`, `IMP-20-tf/TF-*.json` | `Tests  12 passed (12)`; `TF-03.json`: `"openedProjection": "ok"`, `"openedFileChanges": "ok"` |
| IMP-21 | `node tickets/…/probes/team-follows-ui-probe.mjs --output-dir <dir>` (rendered app; TFU-04 with a real signed-in Codex member via a throwaway `CODEX_HOME`) | IR-003 | built server, Nuxt dev, Chromium | rows, Leaving tag, opening a Leaving row, its approval, release, copy rows, stop while leaving | AC-003, AC-009, DEC-002 | Pass | `IMP-21-tfu-probe.log`, `IMP-21-tfu/` | `TFU-04 Pass`; `"approvalShown": true`, `"rowText": "C coder Leaving now"`; `TFU-04-c-leaving-coder-opened.png` shows the `run_bash` request with Deny/Approve |

- Not run, and why:
  - The real-runtime live suite (Codex/AutoByteus, `team-run-follows-definition-live.e2e.test.ts`) needs provider credentials and is API/E2E's.
  - The remote two-server suite was not run.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the Workspaces tree's team member rows (a Team's own members) and a delegated Team copy's member rows under the run that delegated it. A leaving member shows a small amber "Leaving" tag next to its name and still opens.
- Approved UI/UX, interaction, requirement, or design references: REQ-008, AC-003, AC-009, DS-007 (SR-010), design § Member States, Visibility.
- Existing design system, shared components, and adjacent product surfaces reviewed: `WorkspaceStableExecutionRow.vue` and `WorkspaceDelegatedRunRow.vue` (the rows the Workspaces tree renders, chosen in `WorkspaceTeamExecutionTree.vue`), `runTreeDisplayRows`. The tag uses the rows' existing secondary text sizing, with amber like other status hints.
- Testing guideline or development / preview instructions and rendered surface used: component specs (IMP-16). No rendered run here.
- States, layouts, viewports, and interactions inspected (in specs): tag present when leaving; absent otherwise; on both components; mark carried from the DTO.
- Visual or interaction issues found and corrected: the design's earlier target (`TeamMembersPanel.vue`) was never mounted; the tag now sits on the rows the app renders.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-14, IMP-15, IMP-16. The rendered look is unverified here; API/E2E's TFU-03 rerun covers it.

## Downstream Coverage Hints / Suggested Scenarios

- **TFU-03.** Remove a busy member while the team view is open. Its row stays with the "Leaving" tag and opens to answer its approval. After it stops, the row goes.
- **TF-02 / TF-03.** Rerun them; this round's self-run passes.
- **TFL-02.** Run the real Codex leaving member with approvals.
- **Stop while leaving.** Stop the team while a member is leaving. No leaving row should remain, either under the run or under the delegating run. Reopen the run: the marker is cleared.
- **Delegated copy (SemFlow-shaped).** A copy's member is removed while busy. It should appear tagged under the delegating run while the copy is live.
- **Unknown agent and unparsable `team-config.json`.** Each should produce exactly one warning naming the run and the reason, and another one after a valid edit followed by a new breakage.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E reruns: TF-02, TF-03 (built-server suite, already passing in IMP-17), TFU-03 (rendered), TFL-02 (real Codex).
- The new cases from the design's Guidance: Stop or quit while leaving, a delegated copy's leaving row, and the release order and healing (covered by unit tests here). Also the remaining Verification Intent cases on real runtimes.
