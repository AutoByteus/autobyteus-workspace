# Solution Revision Record — `remote-collaboration-without-publishing` (autobyteus-245)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | autobyteus-245 from the PTM; the user's direction of 2026-10-21 | N/A | N/A | Ready for Approval | BEH-201…204, REQ-201…209, AC-201…208, SCN-201…203, DEC-201…206 | Presented to the user |

## Revision Entries

### SR-001 — Initial baseline (2026-10-21)

- Phase and classification: Requirements / `Initial Baseline`.
- Trigger: autobyteus-245 (FU-007 of autobyteus-191) with the user's direction: no publishing; all agents and teams automatically available; refuse when no default configuration.
- Prior status: N/A. Current: requirements `Ready for Approval`; design not started.
- Decisions:
  - DEC-201: the agent default runtime/model, with the user's refusal wording.
  - DEC-206: the contract field is renamed to `address`.
  - Needs user: DEC-202 (workspace), DEC-203 (auto-approve), DEC-204 (leftover file, acknowledgement), DEC-205 (245/247 in sequence or merged).
- Intended behavior changed: N/A (baseline).
- Approval impact: not approved.
- Next action: the user answers; then architecture.

### SR-002 — Approval (2026-10-21)

- Phase and classification: Requirements / `Refinement` (approval capture, plus DEC-203 resolved by a new option).
- Trigger: the user, 2026-10-21:
  - "I would just want to be able to delegate to any agent on the other nodes. I don't want to just every time do configuration";
  - the workspace is the temp workspace, plus the default-workspace follow-up (FU-001, sent);
  - "Yeah, of course like auto approve";
  - the refusal "is sent to the client".
- Decisions:
  - DEC-202 (a): the temp workspace;
  - DEC-203 (d): auto-approve inherited from the delegating run (proposed after the user's "no configuration"; confirmed);
  - DEC-204 (a): no migration;
  - DEC-205 (a): 245, then 247.
- Changed: REQ-205, REQ-206, REQ-207 (no node setting), Document Status, Decisions, Readiness.
- Intended behavior changed: `Yes` (decisions taken). Approved by the User (quotes above). Baseline: `requirements-doc.md` at SR-002.
- Next action: architecture design.

### SR-003 — Remote runs always auto-approve (2026-10-21)

- Phase and classification: Requirements / user change to intended behavior.
- Trigger: the user, 2026-10-21: "auto-approve is like recorded … I kind of even have a feeling that this approve mode will even be removed in the future … because it will always be auto-approved. But anyway, auto-approve equal to true for remote runs."
- Change: DEC-203 (d) "inherited from the delegating run" → (c) "always on". REQ-206 updated; RSK-201 accepted by the user.
- Approval: the User (quote above). Baseline: `requirements-doc.md` at SR-003.
- Design impact: none yet (design not written); the contract carries no auto-approve.

### SR-004 — Design complete (2026-10-21)

- Phase and classification: Design / `Architecture Design Complete`.
- Design: node B resolves a remote target as a local catalog copy, through `CollaboratorAdmission.catalogTaskSource` with a new `NodeCatalogPort` (no run; launch base `defaults_only`: the temp workspace, auto-approve on).
  - The resolver gains a launch base (`inherited` is today's behavior; `defaults_only` has no inherited layer).
  - `CollaboratorNoDefaultLaunchError` carries the user's wording.
  - The contract field is `address`; refusal codes `AGENT_NOT_FOUND`, `REMOTE_TEAMS_NOT_SUPPORTED` (until 247), `NO_DEFAULT_RUNTIME`, `AGENT_CANNOT_RUN`.
  - The publish subsystem, its GraphQL, web, tests and docs are removed.
- Health: `Duplicated Policy Or Coordination`. Slice 1's parallel publishing resolution is replaced by the single local owners.
- Classification: `Medium` / `High` (inter-node contract change; a shared resolver mode; security posture with auto-approve on).
- Evidence: A-01 … A-05 (Read).
- Applied handoff rule: see `handoff-architecture-review.md`.
