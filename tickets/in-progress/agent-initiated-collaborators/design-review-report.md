# Design Review Report — agent-initiated-collaborators

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/requirements-doc.md` (Approved SR-005; REQ-003/AC-003 narrowed with user approval)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/investigation-notes.md` (E-01–E-12)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed: the predecessor's approved UI/UX spec, reused unchanged: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-001–015).
- Relevant Solution Revision IDs: SR-001, SR-002 (requirements approved), SR-003 (design), SR-004 (answers ARCH-REV-001), SR-005 (REQ-003 narrowed; bindings removed)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: SR-005 revised package answering ARCH-REV-002 (AR-005). It includes a user-approved narrowing of REQ-003/AC-003 and the reclassification of P-001.
- Prior Review Round Reviewed: Round 2 (`ARCH-REV-002`, Fail)
- Latest Authoritative Round: 3
- Round 2 additional evidence: `agent-run-collaboration/services/agent-run-collaboration-persistence-coordinator.ts:17-19` ("The package is created lazily: the first tree commit … writes the messages file, then the tree, and then records the catalog flag. A run that never has a collaborator never gets a package."); web `WorkspaceHistoryWorkspaceSection.vue:178` and `runTreeProjection.ts:273` read `hasCollaboration`.
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

- Overall Basis Status: `Confirmed`. Under SR-005, REQ-003 requires deterministic, collision-distinct addresses, and an unknown address returns the normal not-found. Listing never writes.
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

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. The resolution of each finding is in `architecture-review-revision-record.md` under ARCH-REV-003.

- AR-001: Obsolete. REQ-003 was narrowed with the user's approval and P-001 is reclassified as unsupported; the bindings are removed.
- AR-002: Resolved (SR-004), retained.
- AR-003: Resolved (SR-004), retained.
- AR-004: Resolved (SR-004).
- AR-005: Obsolete. Listing never writes.

Non-blocking wording cleanup, forwarded to implementation:
- Three phrases in `design-spec.md` still mention the removed stale-address behavior:
  - the BEH-002 row ("stale ⇒ not found");
  - Key Tradeoffs ("stale-safe");
  - the address-map test line ("stale detection").
- Under SR-005 these mean only that an unknown address returns the normal not-found. No stale-detection machinery is to be built.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- Admission inside delivery holds the root gate during `validateMany` and one tree write on the first message. This is acceptable and once per collaborator.
- If a mid-run rename, unshare or reuse of a listed name ever happens (unsupported, P-001), a call may reach the definition that currently owns the slug. This is accepted by the user.
- Live exposure of the context-bound opt-in tool through MCP on AGY and ACP is unverified. This is an escalation trigger.
- The REQ-007 Org behavior change is user-approved and documented.
- Prompt and wording regressions are covered by snapshot tests.
- A downgrade ignores `source` (P-003), which is unsupported.
- D-1 and D-2 are deferred refactors.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-001 is reclassified as Unsupported and drives nothing. P-002 and P-004 are resolved. P-003 is Not Reachable.
- Notes: the SR-005 package is ready for implementation from `84224a58d`.
