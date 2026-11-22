# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/requirements-doc.md` (Approved SR-007)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/investigation-notes.md` (IF-06 premise withdrawn by SR-008)
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/solution-revision-record.md` (SR-001..SR-008)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-spec.md` (SR-008, commit `c89b409455`; § SR-008 Revision supersedes R-1, R-3's snapshot paragraph and R-4 (a))
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001); autobyteus-22 behavior
- Relevant Solution Revision IDs: SR-008
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: SR-008 resubmission after ARCH-REV-002 Fail (AR-001, AR-002, AR-007)
- Prior Review Round Reviewed: 2 (`ARCH-REV-002`, Fail)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: base `9f6add773b`. Newly opened:
  - `agent-collaboration/collaborators/message-recipient-resolution.ts:90-115` (`reachingAddressOf`, which resolves the sender's stored address from the receiver's position);
  - `agent-team-execution/services/inter-agent-message-runtime-builders.ts:33` (the received-message header carries that address);
  - `agent-collaboration/execution/communication/root-communication-engine.ts:370` (the `send_message_to` result's `agentAddress` = the receiver's stored address);
  - `agent-collaboration/collaborators/catalog-delegation.ts:94-124` (`delegate_task`: self check by `agentAddressOf`, own-team check by `isOwnTeamAddress`, then in-run placement and step 2);
  - `agent-team-execution/services/team-execution-index.ts:140-153` (`isOwnTeamAddress`: team instances, excluding the root, plus `configuredByAddress`).
  
  Evidence from earlier rounds holds for unaffected checks.

## Routing Classification Review

- Task size `Large`; architectural risk `High`. Independent review required: `Yes`. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Statements about existing code the design relies on: checked.
  - R-1' now matches the current Team tree contract (`team-run-execution-tree-schema.ts:47,54-55`), and the IF-06 premise is withdrawn.
  - R-7's three routes are cited correctly (`api/rest/context-files.ts:238`, `agent-org-references.ts:37`, `run-file-changes.ts:99`; web builders at `contextAttachmentModel.ts:12-13`, `agentOrgExecutionContext.ts:324`, `runFileChangeContentPath.ts:18`).
  - One claim does not hold: "applied at exactly these points … and nowhere else" (R-1'). A contained Team member gives and receives addresses at more points than the four listed (AR-001).

| Behavior ID | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001, BEH-002, BEH-004, BEH-005, BEH-006, REQ-009, DEC-006 | Pass | Pass | Pass | Confirmed | — |
| BEH-003 addresses (REQ-003) and preserved delegation from Org units | Pass | Pass | Fail: delegation entry form and two address outputs untranslated (AR-001) | Needs Correction | AR-001 |
| REQ-006 Org view (R-3''), routes (R-7) | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

Pass.

## Task Design Health Assessment Verdict

Pass on all rows. Option (i) keeps the Team tree contract and autobyteus-22 untouched, which is the smaller structure.

## Spine Inventory Verdict

| Spine ID | Verdict | Notes |
| --- | --- | --- |
| DS-001, DS-002, DS-003, DS-005, DS-006, DS-007 | Pass | DS-002 through `CrossRunMessageDelivery`; sender and receiver addresses translated (R-1' point 3) |
| DS-004 Org view | Pass | R-3'': per-unit `openViewSnapshotConnection`s, post-base relay queued per connection, re-opened on an in-band snapshot, exactly-once test (AR-002 resolved) |
| `ContainedTeamAddressSpace` (bounded local, R-1') | Fail | Its application points omit an entry form and two outputs (AR-001) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Verdict | Notes |
| --- | --- | --- |
| `ContainedTeamAddressSpace` | Fail | Meant to be the one boundary between Org space and team space, but listed as four call sites, so other tool-facing paths bypass it (AR-001) |
| `AgentOrgContainer`, `OrgViewComposition`, `OrgContainerPort`, Org REST edges (R-7) | Pass | Routes are thin edges resolving through the container |

## Dependency Direction / Forbidden Shortcut Verdict

Pass. Principle 16: Pass. N-1 resolved: `sameContainer` is one fact, from the container directory.

## Interface Boundary Verdict

| Interface | Verdict | Notes |
| --- | --- | --- |
| `ContainedTeamAddressSpace.toOrg` / `fromOrg` | Fail | Correct functions; incomplete application (AR-001). `fromOrg(P)` (the Team's own Org address) needs a defined result for the own-team refusal |
| Port, admission, composition, routes | Pass | — |

Empty indirection check: `Pass`. The R-7 route edges translate an owner (`{orgRunId, agentRunId}` → unit run), so they are not empty.

## Existing Capability / Subsystem Reuse Verdict

Pass.

## Subsystem / Capability-Area Allocation Verdict

Pass, except the translator's reach (AR-001).

## Reusable Owned Structures Verdict

Pass.

## Shared Structure / Data Model Tightness Verdict

Pass. The Team tree stays in team space, the container file is unchanged, and Org-owner attachments keep their form.

Derived consumers with a decision each: `Pass`, except the agent-facing address surfaces of a contained Team (AR-001). One vocabulary: `Pass`.

## File Responsibility Mapping Verdict

Pass (`agent-team-execution/container/contained-team-address-space.ts`; R-5 rows updated for R-7).

## Subsystem / Folder / File Placement Verdict

Pass.

## Removal / Decommission Completeness Verdict

Pass. The frozen visitor is dropped (no trace rewriting). The Org routes stay as container edges and are not removed.

## Legacy / Backward-Compatibility Verdict

Pass.

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Org runs | Migration Required (DEC-001) | Pass | Pass | Pass | Pass | Team trees in team space (the inverse of the mounted endpoints); log lines in the current writer's shape; files move with folders; saved references keep the Org owner form, resolved by the edges |

## Change / Refactor Safety Verdict

Pass.

## Example Adequacy Verdict

| Topic | Verdict | Notes |
| --- | --- | --- |
| Address example (R-1') | Pass in part | Covers `send_message_to`. Add `delegate_task` to the own Team and to a teammate by Org address (AR-001) |
| Composition (R-3''), routes (R-7) | Pass | — |

## Material Premise Validation

### `MP-05` — A contained Team member delegates to its own Team or to a teammate by Org address

- Related requirement: preserved boundary ("delegation from Org units … work as today"); CM-1 (`delegate_task` refuses the sender's own team at any depth, `agent_orgs.md` § Addresses)
- Initiating basis kind: `User`/`System`. The agent calls `delegate_task` with an Org address it got from its rules, the Org view or its earlier conversation, e.g. `/software_engineering_team` or `/software_engineering_team/architecture_reviewer`. Today this is refused (CM-1).
- Forward path: `resolveDelegationPlacement` (`catalog-delegation.ts:104-111`) runs:
  - the self check `agentAddressOf(sender)` (team space, `/code_reviewer`);
  - the own-team check `isOwnTeamAddress` (`team-execution-index.ts:147-153`: team instances, root excluded, plus `configuredByAddress` in team space). Neither matches an Org-space address;
  - `resolveInRun` → step 2 → the container's `placementAt` resolves the sender's own Team unit, or the teammate in the same Team run.
  
  R-1' point 1 translates only `message-recipient-resolution.ts`.
- Consequence: the delegation is not refused. A copy of the agent's own Team, or a delegated run of a teammate, is started where today the agent gets the own-team refusal.
- Reachability: `Reachable`
- Review consequence: AR-001.

### `MP-06` — A teammate's message in a contained Team

- Related requirement: REQ-003 ("same addresses as today")
- Initiating basis kind: `User`/`System`: any intra-Team message.
- Forward path:
  - The receiver's message header carries `reachingAddressOf(index, receiver, sender)` (`inter-agent-message-runtime-builders.ts:33`). That resolves the sender's stored team-space address (`/code_reviewer`) through resolution, where a bare `/x` now goes to step 2 → not found → `null`. The header shows the run ID only. Today it shows `/software_engineering_team/code_reviewer`.
  - The sender's `send_message_to` result returns `agentAddress: receiverIdentity.memberAddress` (`root-communication-engine.ts:370`): the team-space `/architecture_reviewer`, which the sender cannot use.
- Consequence: within every contained Team, agents lose their teammates' addresses in received messages and get unusable addresses in send results.
- Reachability: `Reachable`
- Review consequence: AR-001.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Fail`

## Findings

### AR-001 — The address translator misses the delegation entry form and two address outputs

- Type: `Design Impact`; severity Medium (narrowed again: the realization is now right)
- Protects: REQ-003, the preserved boundary (delegation from Org units as today; CM-1), AC-003
- Problem: R-1' lists four application points and says "nowhere else", but a contained Team member also gives and receives addresses through:
  - **(a) `delegate_task`** (`catalog-delegation.ts:104-111` with `isOwnTeamAddress`): Org-space own-team and teammate addresses escape the CM-1 refusal (MP-05);
  - **(b) the received-message sender address** (`reachingAddressOf`, `message-recipient-resolution.ts:96-115`): it resolves the stored team-space address, so the header loses it (MP-06);
  - **(c) the `send_message_to` result's `agentAddress`** (`root-communication-engine.ts:370`): team space.
  
  The same check is owed for any other address a member's tools show or accept: `@mention` notes, `list_available_agents`, delegation results, Task notices.
- Required update: state the translator as the contained Team root's **one tool-facing boundary**, with the surfaces inventoried:
  - every address a contained member passes to a tool is normalized with `fromOrg` first: under `P/` → team space; `P` itself → the own Team, so CM-1 refuses it; anything else → Org space, to the container;
  - every address a tool or prompt shows to it is `toOrg`.
  
  Then list the surfaces it covers: `send_message_to`, `delegate_task` (self and own-team checks, in-run placement), `reachingAddressOf`, send results, notices, refusals, rules, the Handoffs section, mentions, and `list_available_agents` if it shows addresses. Add `delegate_task` to the example, and tests for MP-05 and MP-06.
- Proportionate: the same translator, applied at its real boundary; no new structure.
- Recipient: Solution Designer

## Classification

`Design Impact` (AR-001).

## Recommended Recipient

Solution Designer.

## Residual Risks

- R-7's reference route searches each unit's log by message ID. The cost is bounded by the unit count; fine.
- FU-001 (memory sync) and FU-003's release-note line are as recorded.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-05, MP-06 reachable, witnessed forward)
- Notes: SR-008 resolves AR-002 and AR-007. Its option (i) for AR-001 is the right shape. Only the translator's reach is left: it should be the contained Team root's one tool-facing boundary, not four call sites. Classification is Large / High.
