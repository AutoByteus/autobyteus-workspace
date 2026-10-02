# Design Review Report — agent-initiated-collaborators

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/requirements-doc.md` (Approved SR-005; REQ-003/AC-003 narrowed with user approval)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/investigation-notes.md` (E-01–E-12)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed: the predecessor's approved UI/UX spec, reused unchanged: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-001–015).
- Relevant Solution Revision IDs: SR-001, SR-002 (requirements approved), SR-003 (design), SR-004 (answers ARCH-REV-001), SR-005 (REQ-003 narrowed; bindings removed), SR-006 (member collaboration scope, CRR-003 CR-001), SR-007 (copy placement by address, CRR-005 DI-01; REQ-012/AC-013 approved)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: 5
- Trigger: SR-007, for code review CRR-005 DI-01 (Org catalog copy nested under the delegator's team). It includes a user-approved REQ-012/AC-013.
- Prior Review Round Reviewed: Round 4 (`ARCH-REV-004`, Pass on SR-006)
- Latest Authoritative Round: 5
- Round 5 additional evidence:
  - CRR-005 DI-01 row (`agent-org-task-execution-adapter.ts:86` → `requireAgent(delegator).host`);
  - investigation notes E-14;
  - Team root `team-execution-scope-resolver.ts#resolveTargetOwner` (deepest-first containing ancestor whose address is the target's parent, else `/`; read in the predecessor review and unchanged).
- Current-State Evidence Basis: worktree `codex/agent-initiated-collaborators` @ `84224a58d`. Code read:
  - `collaborator-address-allocator.ts` (first-free slug, order-dependent);
  - `collaborator-candidate-policy.ts` (`inRunDefinitionIds` returns definition IDs only; the `@` exclusions);
  - `collaborator-root-port.ts` (the port exposes `configuredDefinitionIds`, `collaborators`, `addressesInUse`, and no per-definition in-run address);
  - `root-team-run.ts`: `admitCollaboratorMentions` wraps `this.collaborators.admit` in `materializationGate`, so an inner, gate-held call already exists; the file is 532 lines;
  - the `publish_artifacts` opt-in pattern: tool, MCP provider, `runtime-agent-tool-exposure.ts`, `agent-tool-mcp-session-registry.ts`, Claude tooling options.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Confirmed: the shared tool contract changes meaning, a persisted record shape changes, Org behavior changes, and admission runs inside delivery under the gate, in three roots and on every runtime.
- Independent Architecture Review required: `Yes`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. Under SR-005, REQ-003 requires deterministic, collision-distinct addresses, and an unknown address returns the normal not-found. Listing never writes. SR-006 adds the member-scope invariant that REQ-007, AC-005 and AC-007 already require.
- Approved intent understood:
  - an opt-in discovery tool with the same eligibility as `@`;
  - `send_message_to(address)` reaches the one instance at that address and brings it in on first use, with the same admission as `@`;
  - `delegate_task(address)` always starts a copy, including from the catalog, and never creates a collaborator (Q-1);
  - a team instance resolves its own members, an approved Org behavior change;
  - anyone in the run may do this, with no switch and no limit;
  - listed addresses are deterministic and stale-safe (REQ-003).
- Existing behavior is confirmed in code: E-08 (order-dependent allocator), E-09 (admission inside the gate), E-02 (policy) and E-06 (opt-in tool path).
- Scope guardrail: UC-001–005. Out of scope: a global switch, a copy limit, per-definition allow-lists, Orgs, cross-run linking, `@` UX, helper and application runs. Review authority: REQ/AC and the preserved IDs.
- Every blocking `Design Impact` finding traces to an approved ID: `Yes`.

| Behavior ID | Alignment | Trigger / Evidence | Target Path | Status | Required Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Pass | Pass | Pass. Listing is read-only. In-run precedence comes from `inRunPlacementsByDefinition`. | Confirmed | — |
| BEH-002 | Pass | Pass | Pass. A deterministic map with a hash suffix on collision meets the narrowed REQ-003/AC-003. | Confirmed | — |
| BEH-003 | Pass | Pass | Pass. The gate-internal `ensure` follows the existing `collaborators.admit` inside the gate. | Confirmed | — |
| BEH-004 | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | Pass | Pass | Pass. No fall-through inside the instance prefix (AR-003 resolved). | Confirmed | — |
| BEH-006 | Pass | Pass | Pass. The package is created only on the first bring-in or delegation (AC-008); there is a test that a run which only lists has none. | Confirmed | — |
| BEH-007 | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | Pass | Pass | Pass. Step 1 yields the configured result for configured instances. | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Predecessor UI/UX spec (VIS-001–015), reused | Pass | Pass (requirements, design) | Pass | Pass | Pass (Approved, reused) | — |
| Investigation-notes supplement inventory | Pass | Pass (filled in, SR-004) | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Area | Result | Evidence |
| --- | --- | --- |
| Present | Pass | Larger Requirement |
| Root cause evidence-backed | Pass | Missing invariants E-05 and E-08; admission coupling E-09 |
| Refactor decision | Pass | R-1 to R-3 in scope; D-1 and D-2 deferred with reasons. Neither deferral blocks this scope. |
| Reflected in design | Pass | The removal plan and file mapping cover R-1 to R-3, including the `team-run-message-delivery.ts` extraction |

## Spine Inventory Verdict

| Spine | Readable | Narrative | Owner Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 List | Pass | Pass | Pass | Pass | Read-only; no tree or package write |
| DS-002 Message and bring-in | Pass | Pass | Pass | Pass | Gate held throughout. Catalog hit through the map. No fall-through inside the instance prefix. |
| DS-003 Catalog delegation | Pass | Pass | Pass | Pass | `source` persisted; restore reads it first |
| DS-004 Exposure and wording | Pass | Pass | Pass | Pass | — |
| DS-005 Web | Pass | Pass | Pass | Pass | — |

## Boundary / Dependency / Interface Verdicts

| Item | Verdict | Notes |
| --- | --- | --- |
| `Root.deliverLogicalMessage` / `delegateTask` / `listAvailableAgents` as the only entries | Pass | Handlers never call admission or the map directly |
| `CollaboratorAdmission.ensure(gateHeld)` | Pass | Matches the existing inner `collaborators.admit` |
| `CatalogAddressMap` (pure) | Pass | Meets the narrowed REQ-003. Bindings removed. |
| `MessageRecipientResolution` (pure, ordered, port-based) | Pass | No fall-through inside the instance prefix |
| `CollaboratorRootPort.inRunPlacementsByDefinition()` | Pass | Precedence: configured or mounted → collaborator entry → collaborator-Team member, then lexicographically smallest |
| `list_available_agents` → `{agents:[{name, kind, address, description}]}` | Pass | — |
| Dependency direction (roots → helpers → ports) | Pass | — |

## Existing Capability Reuse / Subsystem Allocation / Structures

Pass. Reused: the policy, the entry builder, `validateMany`, the predecessor's per-root hosting, the task lifecycle and the `publish_artifacts` pattern. The new folder `agent-tools/agent-discovery/` is justified. `TaskExecutionSource` is tight: a definition snapshot without identities, present only on catalog copies.

## File Responsibility / Placement Verdict

Pass. The new pure helpers sit in `agent-collaboration/collaborators/`. `root-team-run.ts` is held to no net growth by extracting `services/team-run-message-delivery.ts`. The Agent Tools MCP session registry also needs the new exposure flag (as with `publishArtifactsEnabled`); this is implied by the exposure row.

## Removal / Legacy Verdict

Pass. Removed:
- the first-free allocator;
- the combined admit-plus-compose;
- the per-root inline resolution order;
- the "already existing" wording.

The Org copy → mounted-team routing is removed by the user-approved change, with no dual path.

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence | Verdict |
| --- | --- | --- | --- |
| Optional task-copy `source` | Directly Usable — No Migration | Pass. `parseTaskExecutions` is tolerant; absence truthfully means a configured or collaborator source. | Pass |
| Root `catalogAddressBindings[]` | Removed in SR-005 (never introduced) | N/A | N/A |
| Stored collaborator addresses | Unchanged; treated as in use by the map | Pass | Pass |

AR-001's fix may add a per-run persisted binding. If it does, the same no-migration reasoning applies: an optional field whose absence is truthful.

## Change / Refactor Safety Verdict

Pass. The order runs records → map → admission split (with `@` regression tests) → resolver (step 1 first, verifying the Org change) → gate-internal ensure → delegation → tool → wording → web → docs.

## Example Adequacy Verdict

Pass for the map, staleness under collision, instance-relative resolution, bring-in and catalog delegation. The staleness example covers only the case where a collision is introduced, not a base slug being taken over (AR-001).

## Material Premise Validation

### `P-001` — A listed address's base slug is taken over by a different definition mid-run (reclassified)

- Round 1 classified it `Reachable` under the then-approved REQ-003, which explicitly required stale calls to "never reach a different definition".
- SR-005: the user confirmed the triggering catalog edits are not a workflow they perform ("you can almost like assume I will never do that"), and approved narrowing REQ-003/AC-003.
- Under principle 6 it is now `Technically Possible but Unsupported/Contrived`. It drives no finding or machinery; AR-001 is obsolete.

### `P-002` — A definition is in the run at several placements, or only as a collaborator Team member

- Reachable. Resolved in SR-004 by `inRunPlacementsByDefinition` and the precedence rule (AR-002). This is retained in SR-005.

### `P-004` — A standalone agent lists before bringing anything in

- Reachable (SC-001). It drove AR-005 in Round 2.
- SR-005 removes every listing write, so listing creates no package or flag, which satisfies AC-008. Test added. AR-005 is obsolete.

### `P-003` — Downgrade ignores `source`

- Reachability: `Not Reachable`; this is an unsupported version path, as in the predecessor. Residual only.

## Member Collaboration Scope Review (SR-006, CR-001)

| Check | Result | Evidence |
| --- | --- | --- |
| One owner, used by all roots at construction and at restore | Pass | `resolveMemberCollaborationScope` (pure). The three per-root special cases are removed (Removal plan row). |
| Rule 1: a non-root team-instance member gets the hosting instance's handoffs and team instruction | Pass | Every TeamRun is prepared from exactly one source: a configured or mounted node, a collaborator entry, or a task source / catalog `source`. |
| Org preserved behavior (AC-012) | Pass | Mounted Team runs carry the Org-wide handoffs today, so `from`-filtering inside the instance yields today's edges, cross-placement ones included. The instruction remains the mounted team definition's. Direct Agents, and copies at their address, keep the Org scope (rule 2). |
| Team-root preserved behavior | Pass | Configured members, and task copies at their address, keep the root scope (rule 2). |
| Catalog Agent copy in a Team root gets no root-team instruction (CR-001) | Pass | Rule 3 |
| `teamScoped` unchanged | Pass | The predecessor's AR-003 rule |
| Tests | Pass | Every rule, live on Claude plus one other runtime; see the notes below |

Implementation notes (non-blocking):
- The hosting-team facts must be optional in `resolveMemberCollaborationScope`, because root-hosted agents (Org/Agent `rootAgents`) have no hosting TeamRun. Rules 2–3 apply to them.
- Add two tests to the CR-001 set:
  - an Org **mounted configured** team member's cross-placement Org handoffs (to non-team placements) and its team instruction are unchanged (AC-012);
  - a catalog team copy's members keep their own handoffs after Stop → reopen → message (restore path).

Review note: CRR-003 correctly records CR-001 as partly a gap in this review's round 1. The SR-003 file mapping omitted the member-context builders, and this review did not trace member scope for catalog copies. This round traced it for every copy kind and root.

## Copy Placement Review (SR-007, DI-01, REQ-012)

| Check | Result | Evidence |
| --- | --- | --- |
| Approved basis | Pass | REQ-012/AC-013 added with the user's approval ("approve. i trust your suggestion"); the Org and standalone behavior change is approved. Stored runs keep their placement. |
| One owner across roots | Pass | `resolveTaskCopyHost` in `agent-collaboration/execution/task/task-copy-host.ts`, generalized from the Team root rule. It replaces `requireAgent(delegator).host` in the Org and Agent-root adapters. |
| Instance-correctness | Pass | The deepest-first walk matches the delegator's **own** instance first. A member of an Org copy of `/se` delegating to `/se/impl` is hosted by its copy's TeamRun, not the mounted `/se`, which is consistent with REQ-007. |
| Team-root regression | Pass | Same rule as `resolveTargetOwner`; a test is listed |
| Root-hosted copies supported in the Org and Agent root | Pass | Existing `hostKind: "root"` paths (`rootAgents.prepareTask`, `teams.prepareRootTaskTeam`) already serve copies started by root-level agents |
| Independence from member scope and resolution | Pass | CR-001 rule 2 is by address (a configured root placement or a copy at it) and rule 3 is the default. REQ-007 resolution is sender-instance based. Neither depends on the copy's host. |
| Persisted data | Pass | `Directly Usable — No Migration`. Readers accept task executions at the root and under teams; restore uses the recorded host. A restore test of a pre-existing nested copy is listed. |
| Lifetime | Pass | Root-hosted copies live with the root; idle shutdown is per copy. A copy no longer shares its delegator team's TeamRun lifetime, which is the intended DI-01 correction. |

Implementation notes (non-blocking):
- Root-hosted delegators (Org/Agent `rootAgents`, the Agent-root host) have no containing team ancestors, so the walk returns the root.
- If an adapter re-checks the host at commit (as the Team adapter does with `expectedHost`), it must use the same owner.
- AC-013's "shown … with 'Started by <delegator>'" must follow the predecessor's REQ-009/VIS-006/009: the starter goes in the row's **accessible label**. No visible "Started by" line is reintroduced.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. DI-01 (code review) is addressed by the design. CR-001 and CR-002 remain resolved. Earlier architecture findings stay as recorded in ARCH-REV-003/004.

Non-blocking wording cleanup, still open from SR-005: the leftover "stale" phrases in `design-spec.md` mean only that an unknown address returns not-found.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- Admission inside delivery holds the root gate during `validateMany` and one tree write on the first message.
- Unsupported mid-run catalog name reuse (P-001) is accepted by the user.
- The REQ-007 and REQ-012 Org behavior changes are user-approved. A mounted member's copy of another Org-level address (for example `/coordinator`) now appears at the Org top level.
- A downgrade ignores `source`, which is unsupported.
- D-1 and D-2 are deferred refactors.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. The DI-01 scenario (a mounted Team member delegates a listed catalog team, SC-002/UC-003) is Supported Normal and live-evidenced. No new premises.
- Notes: the SR-007 package is ready for implementation from `f8ea65289`.
