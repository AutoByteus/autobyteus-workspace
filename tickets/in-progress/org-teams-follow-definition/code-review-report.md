# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-007; REQ-002, REQ-005, REQ-006, REQ-008, AC-002, AC-005, AC-007)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-014)
- Design Spec Reviewed As Context: `design-spec.md` (DS-004/R-3''/R-7 view and rows, R-5 unit runs not top-level, DS-006, § SR-013/SR-014)
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md`, `follow-ups.md`; autobyteus-22's approved behavior (archived `team-run-follows-definition`)
- Relevant Solution Revision IDs: SR-007, SR-010, SR-014
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-009)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-005, ARCH-REV-009
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (§ IR-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-003
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: `4`
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E round 1 (API-REV-001) failed; the API/E2E engineer asked for a failure-origin review of F-1..F-4 and A-1
- Prior Review Round Reviewed: CRR-003 (implementation review, Pass)
- Latest Authoritative Round: 4
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001 (commit `fa1f957778` on implementation `1f0aad498b`)
- Failing Scenario IDs: OC-04, OCL-02, OCU-04 (F-1); RC-47 (F-2); ORG-E2E `stopped-org-workspace-graphql` (F-3); RC-12, RC-13, RC-24 after RC-56 (F-4); A-1 (observation)
- Exact Failing Commands / Execution Mode:
  - F-1: `tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` (built server); `tests/e2e/runtime/org-container-live.e2e.test.ts -t OCL-02` (real Codex); probe `probes/org-container-ui-probe.mjs`.
  - F-2, F-4: `env -i … RUN_AGY_FAILURE_E2E=1 … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`.
  - F-3: `tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts`.
- Failure Evidence Paths: `evidence/api-e2e/round-1/{OC-01-11,OCL-01-02,OCU-01-05,ORG-E2E-TF-REG,RC-run1..3,RC-no56}/`

Implementation reviewed against: `1f0aad498b` (unchanged since CRR-003). How each origin was established is stated per failure: `Read`, `Reproduced` or `Measured`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review` (this round: API/E2E failure-origin review)
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None (unchanged from CRR-001).

## Review Scope

- Confirmed that each failing scenario still represents approved behavior, then traced only the production path each failure needs. No general test-suite review and no full source audit in this round; the CRR-003 audit stands for everything not named here (its full text is in `818e950d53`).
- Reproductions and instrumentation (all in this worktree, all removed before handoff, nothing committed):
  - F-3: a scratch unit test over `ContainerConfigTrees` with the stored-container helper (`tests/helpers/stored-org-container.ts`): first save workspace-only, then workspace + a `/team/lead` model patch; diff of readback vs `expected`.
  - F-4: two full runs of the two-server file (both: `4 failed | 52 passed`, the same four cases). The second ran with temporary `console.error` lines in the built `dist` (`remote-message-receiver.js` `resolve`, `collaboration-root-resolver.js` `resolveOrRestore`), which swallow restore errors today. Then a scratch unit test of `validateTeamRunStatePackage` on the Org's Team-unit fixture.
  - Diagnostics restored from backups (`grep CR_DIAG dist` empty), scratch tests deleted, `git status` clean.

## Failure-Origin Findings

### F-1 — a Team unit's leaving member disappears from the Org view (OC-04, OCL-02, OCU-04)

- Scenario still approved: Yes. REQ-002 ("a Team run in every respect: … leave, Leaving, … live rows") and AC-002 ("same outcomes as autobyteus-22 AC-001..AC-003, **in the Org view**").
- Production path (Read; the API/E2E runtime evidence shows the consequence):
  - Rows: `RunOwnAgentsReader.containerTreeOf` (`run-own-agents-reader.ts:94-110`) lists a Team unit's `rootTeam.members` only. The standalone Team path in the same file (`ownTreeOf`, `:122-127`) adds the `formerMembers` marked `leaving` with `leaving: true`, and the row type already carries it (`RunOwnMember.leaving`, `run-tree-view.ts:56`).
  - View: `OrgViewComposition` learns its agents from `composeOrgExecutionTree` (`org-execution-tree-composition.ts:45`, `rootTeam.members` only). On the unit's `parts_changed` frame after the removal, `learnAgents` drops the member; `relay` then publishes an agent frame only for a known agent (`org-view-composition.ts:206-207`), and `liveStatuses`/`snapshot` list known agents only. The leaving member's later frames (its next `TOOL_APPROVAL_REQUESTED`) never reach the Org view. The user cannot approve, the member never finishes, and the unit never releases it. OCL-02's own evidence matches: the Org stream stops at the approval request, the Team stream goes on.
  - Commands already know leaving members (`OrgContainerDirectory.unitOfAgent` reads `formerMembers`, `org-container-directory.ts:90`), so only the view side is missing.
- Origin: **implementation defect**, and an **earlier review gap** (mine). In CRR-001 I read `containerTreeOf` and the composition. The asymmetry with `ownTreeOf` and with `unitOfAgent` was visible in the same files, and AC-002 says "in the Org view".
- Classification: `Local Fix` (implementation). The design already composes "today's Org view" from the units' views, and today's Team view shows leaving members.
- Required action: one owner for a Team unit's members as the Org shows them: current members, then the `formerMembers` marked `leaving` (tagged `leaving`, at `P/x`). Rows (`containerTreeOf`) and the composition (its agents map, relay, statuses, snapshot) both use it, so a leaving member's frames and status reach the Org view until its release. A test through the composition: remove a busy Team-unit member; its row is tagged leaving, its next frame and status are relayed, and after the release it is gone. OC-04, OCL-02 and OCU-04 then rerun.

### F-2 — `list_running_agents` lists Org units as top-level running agents (RC-47)

- Scenario still approved: Yes. Design R-5/R-7 and contract §8: a unit run is listed under its Org, never as a top-level run. The listing contract (autobyteus-492): "Org runs, Team members and delegated runs are never entries". At base, Org members were parts of the Org run and never listed.
- Production path (Read): `RunningAgentsListing.list` (`running-agents-listing.ts:36`) excludes `agent_org` roots only. `entryOf` keeps a root whose `listingFactsOf(...).startedByPerson` is true. `RunOwnAgentsReader.listingFactsOf` sets it to `!metadata.delegatedFrom` for an agent and `!tree.delegatedFrom` for a Team (`run-own-agents-reader.ts:162`, `:168`). A unit has `containedIn`, not `delegatedFrom`, so every live agent unit, and every Team unit whose coordinator runs, is listed. A `grep` of negated `delegatedFrom` checks in `src` finds no other such top-level test.
- Origin: **implementation defect**; an **earlier review gap** (mine): I checked history rows and the catalog against R-7 but did not inventory the other "started by a person" readers.
- Classification: `Local Fix` (implementation).
- Required action: a contained run is not started by a person: `listingFactsOf` answers `startedByPerson: false` when the run's own file has `containedIn` (both kinds). Keep that one rule in the facts, not a second filter in the listing. Add a unit test for an agent unit and a Team unit. RC-47 reruns.

### F-3 — the stopped Org's mixed settings save returns `PERSISTENCE_INDETERMINATE` (ORG-E2E)

- Scenario still approved: Yes. REQ-006 / DEC-004: the Org settings contract is unchanged.
- Production path (**Reproduced** in-process): `AgentOrgRunManager` builds `expected` with `applyAgentOrgRunSelectionPatches`. For a model patch, `applySelectionToConfiguredMember` (`runtime-selection-rule.ts:132-147`) sets the member's `launchSource` to `{ origin: "settings", fallbacks: [] }`. `ContainerConfigTrees.write` (`container-config-trees.ts`) writes a Team-unit member through `withLaunch`, which copies only `launchConfiguration` and `pendingRuntimeSwitch`. So `launchSource` is not saved, the readback lacks it, and `isDeepStrictEqual(readback, expected)` fails (`agent-org-run-manager.ts:280-283`).
  - Scratch result: workspace-only save `committed`, equal. Workspace + model save `committed`, **not** equal; the only difference is `.rootOrg.members[1].members[0].launchSource: readback=undefined expected={"origin":"settings","fallbacks":[]}`.
  - `writeAgent` (an agent unit) has the same gap: it builds the metadata from the stored record, so a changed `launchSource` from the patch is not written either. The Team member schema (`run-execution-tree-shared-record-schemas.ts:114`) and the agent metadata (`agent-run-metadata-store.ts:72`) both store `launchSource`.
  - Consequence beyond the outcome: the provenance the settings page shows ("from settings") is lost for those members. The released Org tree stored the whole node, so this is a regression.
- Origin: **implementation defect**; an **earlier review gap** (mine): `withLaunch` and `writeAgent` copy a field list, and comparing it with the node shape would have shown the missing field.
- Classification: `Local Fix` (implementation).
- Required action: write every per-member field the composed config tree carries and the owning file stores (`launchConfiguration`, `pendingRuntimeSwitch`, `launchSource`) for Team-unit members and agent units, so the readback equals `expected`. Add a unit test of `ContainerConfigTrees` that writes a model patch for a Team-unit member and an agent unit and reads back an equal tree. ORG-E2E reruns.

### F-4 — beta cannot restore the peer Team copy after its member changes (RC-12, RC-13, RC-24 after RC-56)

- Scenario still approved: Yes. AC-007 (the copy gains and loses a member) followed by the delegator's follow-up to the idle-stopped copy (autobyteus-247 AC-304: a follow-up restores it). RC-24's "Agent team run not found" follows from the same unrestored copy.
- Production path (**Measured**: second two-server run with temporary diagnostics):
  - alpha `send_message_to(target_agent_run_id=<studio coordinator>)` → beta `RemoteMessageReceiver.accept` → `messageRoot` → `roots.team` → `resolveOrRestore` → `TeamRunService.restoreTeamRun` → `TeamRunStatePackageLoader.load` → `validateTeamRunStatePackage` throws: `Message 'collabmsg_1dKmL9…' has no endpoint that is an agent of this run.` `RemoteMessageReceiver.resolve` swallows it (`remote-message-receiver.ts:176-178`) → `REMOTE_TARGET_NOT_FOUND`.
  - The message is RC-56's `AUDITOR-PACKET`: alpha's lead (a peer endpoint) → beta's auditor, who was later removed and released into `formerMembers`. `validateTeamRunStatePackage` (`team-run-state-package-validator.ts:37-44`) requires one endpoint to be `index.getAgent(…)`, current members only. `TeamExecutionIndex` already indexes former members (`formerMemberByRunId`, `team-execution-index.ts:77-82`), but the validator does not ask it.
- Origin: **a pre-existing defect from autobyteus-22**, not caused by this ticket. Neither the validator nor the index changed in this ticket (`git diff 9f6add773b..HEAD` empty for both). Since autobyteus-22 (`19b31ad365`, in base), any Team run whose removed member exchanged a message with an agent outside the run cannot be restored.
- Why it is **this ticket** (ticket-scope test), not a follow-up:
  - This ticket's REQ-002 makes every autobyteus-22 behavior, including reopen, part of a Team unit.
  - Units are separate runs, so every cross-unit message (AC-003, the Org's normal handoff) puts an outside endpoint into the Team unit's log. **Reproduced** on the Org shape: a scratch test of `validateTeamRunStatePackage` on the contract's Team-unit fixture, with one member moved to `formerMembers` and a message `concierge_1` → that member, throws the same error. So AC-005 (stop the Org, change a Team definition, reopen) and AC-002 fail whenever the removed member had handled a handoff from another unit.
  - It also blocks AC-007's follow-up on the peer copy (FU-003's own trigger).
  - It is in the functionality the ticket changes, and the fix is small.
- Not reasonably detectable in this ticket's source review: the code is untouched by the change. That the container multiplies outside endpoints was foreseeable; no review in the chain, including mine, connected it.
- Classification: `Local Fix` (implementation).
- Required action:
  - In `validateTeamRunStatePackage`, accept a former member as an endpoint of the run (`index.getAgent(id) ?? index.formerMemberByRunId(id)`), since its messages stay in the Team's log.
  - Check the other readers of a Team log that resolve endpoints against current members only, so the restored run shows those lines (for example the participant reader).
  - Tests:
    - a unit test of the validator with a former-member endpoint and an outside sender;
    - a restore test of an Org Team unit whose removed member received a cross-unit message (AC-005 shape).
  - Reruns: RC-12, RC-13, RC-24 with RC-56 first (the whole two-server file).
  - Optional, recommended: log the swallowed restore error in `RemoteMessageReceiver.resolve`. This one took instrumentation to find.

### A-1 — another unit addressing a Team unit's removed member gets the generic not-found

- Read: `CollaborationTree.resolve` refuses by name only a removed **Org unit** (`collaboration-tree.ts:227-229`, `formerUnitAt`). A Team unit's former member at `P/x` is not in `placementsOf`, so another unit gets `COLLABORATION_TARGET_NOT_FOUND`, while a teammate gets autobyteus-22's exact former-member refusal.
- The design and requirements do not say which text another unit should get. Classification: `Requirement Gap` (minor), owner Solution Designer. My recommendation: refuse it by name with the same former-member text, as for a removed unit, through `ContainedTeamAddressSpace`. This does not block F-1..F-4.

## Review Scorecard (Mandatory)

Not repeated for a failure-origin round. Affected rationale: CRR-003 scored `Runtime Correctness And Behavioral Fidelity` 9.4 and `API/E2E Readiness` 9.4. F-1, F-2 and F-3 are defects that source review could have caught, so those two scores did not hold. The pass bar of at least 9.4 in every category applies again at the next implementation review.

## Findings

| ID | Finding | Evidence | Required Action | Classification | Owner |
| --- | --- | --- | --- | --- | --- |
| F-1 | A Team unit's leaving member is dropped from the Org view's rows, agents, relay and statuses; its later events never reach the user, and with a real runtime it never finishes | Read; OC-04, OCL-02, OCU-04 | As above (one owner for current + leaving Team-unit members; rows and composition use it; test) | `Local Fix` | Implementation engineer |
| F-2 | Org units are listed by `list_running_agents` as started by a person | Read; RC-47 | `startedByPerson: false` for a run with `containedIn` (both kinds); test | `Local Fix` | Implementation engineer |
| F-3 | The stopped-Org settings write drops `launchSource` for Team-unit members and agent units; the readback differs, so `PERSISTENCE_INDETERMINATE`, and provenance is lost | Reproduced | Write the per-member fields the tree carries; test | `Local Fix` | Implementation engineer |
| F-4 | A Team run whose removed member exchanged a message with an outside agent cannot be restored (pre-existing since autobyteus-22; in this ticket because REQ-002/AC-005 Team units and AC-007's follow-up hit it) | Measured (two-node, instrumented); Reproduced (Org shape) | Accept former members as endpoints in `validateTeamRunStatePackage`; check the other Team-log endpoint readers; tests; optional logging of swallowed restore errors | `Local Fix` | Implementation engineer |
| A-1 | Another unit's message to a Team unit's removed member gets the generic not-found; the requirements do not decide the text | Read | Decide the text (recommended: the former-member refusal by name) | `Requirement Gap` (minor) | Solution Designer |

## Follow-ups

- Follow-ups this review added: None. F-4 is pre-existing, but by the ticket-scope test it belongs to this ticket (above).

## Classification

- F-1, F-2, F-3, F-4: `Local Fix`, implementation-owned.
- A-1: `Requirement Gap` (minor), Solution Designer; independent of the fixes.
- Large/High classification preserved.

## Recommended Recipient

- Implementation engineer (`get_handoff_rules`: failure-origin review confirms an implementation defect), for F-1..F-4. After the fix: source review again, then API/E2E reruns OC, OCL-02, the OCU probe, the whole two-server file and `stopped-org-workspace-graphql`.
- Solution Designer (`Requirement Gap`), for A-1 only.

## Residual Risks

- F-4's swallowed restore error makes similar failures silent on a peer node. Logging is recommended in the required action.
- The rest of API-REV-001 passed (OF, AOML, migration, OC-01..03/05..11, RC-56, OCL-01, OCU-01..03/05).

## Latest Authoritative Result

- Review Decision: `Fail` (API/E2E failure confirmed as implementation-owned)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Fail` (AC-002, AC-005 in the Org, AC-007's follow-up, REQ-006)
- Material-Premise Gate: `Pass` (the failing scenarios are approved behavior)
- Score Summary: not rescored (failure-origin round); CRR-003's Runtime Correctness and API/E2E Readiness rationale no longer holds (F-1..F-3)
- Failure Origin: F-1, F-2, F-3: implementation defects, each also my earlier review gap. F-4: pre-existing autobyteus-22 defect, in this ticket by the scope test. A-1: Requirement Gap
- Recommended Recipient: Implementation engineer (F-1..F-4); Solution Designer (A-1)
- Notes: The API/E2E test changes for this ticket's intended changes (RC-07, RC-13, RC-20, `stopped-org-workspace`) are consistent with the design; no test-owned cause was found.
