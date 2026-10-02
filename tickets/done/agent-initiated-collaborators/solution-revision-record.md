# Solution Revision Record — agent-initiated-collaborators

## SR-001 — 2026-10-01 — First requirements baseline (Ready for Approval)
- Trigger: the user's direction after the predecessor release ("you can start the ticket now… the requirements, I think
  it's clear. Let's go."). The decisions are recorded in `investigation-notes.md`.
- Prior status: N/A. Current status: Ready for Approval.
- IDs: B-001–005, UC-001–005, REQ-001–011, AC-001–012, SC-001–005. Open: Q-1, Q-2.
- Approval basis: pending. Design: not started.
- 2026-10-01: Q-1 (only the task copy) and Q-2 (same as the `@` menu) resolved by the user; the term "task copy" was adopted. Awaiting explicit approval.

## SR-002 — 2026-10-01 — Requirements approved
- Trigger: the user said "all clear right? then i approve".
- Prior status: Ready for Approval. Current status: Approved.
- Basis: REQ-001–011, AC-001–012, SC-001–005; Q-1 (only the task copy); Q-2 (same rules as the `@` menu); the term
  "task copy".
- Next: architecture investigation and design.

## SR-003 — 2026-10-01 — Architecture design complete
- Evidence: E-08–E-12 (base `84224a58d`).
- Design (`design-spec.md`):
  - opt-in `list_available_agents` (`publish_artifacts` pattern) with `Root.listAvailableAgents`;
  - deterministic `CatalogAddressMap`, with a hash suffix on collisions and stale-safe addresses;
  - admission split into `ensure` plus the `@`-only note;
  - shared `MessageRecipientResolution`: sender team instance first (REQ-007), then run-wide, then catalog bring-in
    with a gate-internal ensure;
  - catalog delegation with a persisted per-copy `source`;
  - REQ-009 wording;
  - web selectors read `source`.
- Refactors in scope: R-1 (admission split), R-2 (address map), R-3 (shared resolver, plus extracting
  `team-run-message-delivery.ts`). Deferred: D-1 (explicit collaborator-agent registry), D-2 (`RootAgentRun`
  unification).
- Classification: task_size=Large, architectural_risk=High. Routing: architecture reviewer.

## SR-004 — 2026-10-01 — Design revision for ARCH-REV-001 (Fail, Design Impact)
- AR-001: issued catalog-address bindings (`catalogAddressBindings[]`, persisted on the root tree, written by
  `listAvailableAgents`). A catalog hit requires both the binding and the current map to agree on the definition;
  otherwise "list again". Never reaches a different definition. Survives restart.
- AR-002: the new port operation `inRunPlacementsByDefinition()` and a deterministic in-run address precedence, one entry
  per definition.
- AR-003: an address inside the sender's team-instance prefix resolves only within that instance; no fall-through.
- AR-004: supplement inventory filled in.
- Requirements and approval unchanged (REQ-003 is satisfied as written). Large/High. Routing: architecture reviewer.
- 2026-10-01 note: ARCH-REV-002 gave **Fail** on SR-004. AR-001 to AR-004 are resolved. New: AR-005 (Medium). Writing
  `catalogAddressBindings` on listing would create a standalone run's `collaboration/` package and the `hasCollaboration`
  flag with no collaborator. AR-005 comes entirely from the AR-001 binding mechanism. In parallel, the user questioned
  whether the AR-001 premise is realistic (renaming an agent mid-run and reusing its name). The Solution Designer
  proposed narrowing REQ-003 and removing the bindings, which also removes AR-005. Pending the user's decision; no
  routing yet.

## SR-005 — 2026-10-01 — REQ-003 narrowed (user) and design simplified (resolves AR-005)
- Trigger: the user challenged the AR-001 premise ("why would I do that… you can almost like assume I will never do
  that… you should use the design principle to reason… please continue").
- Requirements: REQ-003 and AC-003 narrowed to deterministic, collision-distinct addresses, with an unknown address
  returning the normal not found. P-001 classified `Technically Possible but Unsupported/Contrived` (principle 6).
  Approved by the user ("please continue", after the proposal).
- Design: removed `catalogAddressBindings` and the stale-address check; listing never writes, so AR-005 is resolved by
  construction. AR-002 and AR-003 are kept. A new "Material Premise Classification" section was added.
- Lesson recorded: review premises must be checked against principle 6 before machinery is added.
- Large/High. Routing: architecture reviewer.
- 2026-10-01 note (no new SR round): ARCH-REV-003 gave **Pass** on SR-005. The reviewer delivered the implementation handoff
  to `/software_engineering_team/implementation_engineer`; not repeated here. Editorial tidy only (no behavior or design
  change): three leftover "stale" phrases in design-spec.md (BEH-002 row, Key Tradeoffs, address-map test line), as the
  reviewer noted.

## SR-006 — 2026-10-01 — Design revision for CRR-003 (CR-001 Design Impact; CR-002 Local Fix)
- Trigger: code review CRR-003 after API/E2E API-REV-001 failed. Members of a catalog team copy get no own handoffs or
  instruction in all three roots (live on Claude, Codex and AGY). The user directed that it be classified as a design issue.
- Design change:
  - a new section, "Member Collaboration Scope": one owner, `resolveMemberCollaborationScope`, with three rules
    (team-instance member → hosting instance scope; configured root placement or a copy at it → root scope; else →
    standalone scope);
  - all per-root special cases removed;
  - a catalog Agent copy in a Team root gets no root-team instruction;
  - `teamScoped` unchanged;
  - file mapping, removal and tests updated.
- CR-002 (formatted names for Team-root catalog copy rows) is carried as a Local Fix in the web file mapping.
- Requirements unchanged (REQ-007 "one unit" and AC-005/AC-007 already require it). Large/High. Routing: architecture
  reviewer, then implementation.
- Evidence: E-13. The in-progress uncommitted implementation change is noted for reconciliation.
- 2026-10-01 note (no new SR round): ARCH-REV-004 gave **Pass** on SR-006 (requirements basis SR-005). The reviewer
  delivered the implementation handoff to `/software_engineering_team/implementation_engineer`, with three non-blocking
  notes:
  - the hosting-team input is optional for root-hosted agents;
  - add a test that an Org mounted member's cross-placement handoffs are preserved;
  - add a test that a catalog copy keeps its scope after restore.
  Not repeated here. Report: `design-review-report.md`.

## SR-007 — 2026-10-01 — Copy placement by address (CRR-005 DI-01); requirements and design
- Trigger: code review CRR-005 DI-01. An Org catalog copy was nested under the delegator's team. The user asked for an
  investigated recommendation and approved it ("approve. i trust your suggestion").
- Requirements: REQ-012 and AC-013 added (a behavior change for Org and standalone copy placement; stored runs keep
  their placement).
- Design: a new section, "Copy Placement By Address", with one shared owner, `resolveTaskCopyHost` (generalized from the
  Team root rule), used by all three adapters. No migration. Tests added.
- Evidence: E-14. Large/High. Routing: architecture reviewer.
- 2026-10-01 note (no new SR round): ARCH-REV-005 gave **Pass** on SR-007. The reviewer delivered the implementation
  handoff to `/software_engineering_team/implementation_engineer`; not repeated here. Editorial consistency fix only
  (no intent change): REQ-012 and AC-013 now say "Started by" stays in the accessible label only, matching the shipped
  predecessor REQ-009.
