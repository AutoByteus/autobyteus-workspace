# Architecture Design Complete — run-settings-ui-unification

- Result classification: `Architecture Design Complete`
- Package identifier: `run-settings-ui-unification`
- Current SR: `SR-010` (re-review after CRR-004 DI-001..DI-006; earlier SR-009 after CRR-002, SR-008 after ARCH-REV-001)
- From: `/software_engineering_team/solution_designer`
- To: `/software_engineering_team/architecture_reviewer`. The handoff rule applies because
  `task_size = Large` and `architectural_risk = High`.
- Date: 2026-10-05

## Original Request And Goal

The user (2026-10-04) said the Agent run config form "looks not clean, not user-friendly". It shows
the same four settings as the chat composer, which is "very clean, very simple". The Agent Team and
Agent Org forms are "a super long list of configuration".

Goal:
- Make run configuration as clean and consistent as the chat composer.
- Keep member customization compact.
- Use the same language for saved-run settings.

## Approval State

- Requirements: `Approved`, `SR-006`.
  - Base approval 2026-10-05: "I think it's like now the requirement is clear, right? You can go
    ahead now. No more, I think it's clear now."
  - User-directed delta REQ-022 (Fast mode): "we need to enable the faster mode … you can update".
  - Delegated defaults REQ-021, DEC-005 and DEC-006: "you can read our current project and give
    reasonable answer"; auto-approve confirmed: "the automatic tool approval is always on".
- Product UI/UX supplement: user-confirmed in three rounds.
  - SR-001: "Okay, I like this UI…".
  - SR-003: "I'm currently satisfied with the UI now … the ticket is done".
  - SR-005: "perfect. i checked. its great".
  - Location: design repo `/Users/normy/autobyteus_org/autobyteus-web-design` `origin/personal@6718986`,
    `tickets/done/run-settings-ui-unification/ui-ux-spec.md`, `visual-references/VIS-001..042`.
  - The Product artifacts are externally owned and are linked, not copied.

## Package (absolute paths)

Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/`

- `requirements-doc.md` (Approved, SR-006): REQ-001..022, AC-001..019, SCN-001..009, DEC-001..007
- `investigation-notes.md`: SF-001..SF-010, AF-001..AF-012, the Product findings, and the supplement
  inventory
- `design-spec.md` (Ready): the architecture under review
- `solution-revision-record.md`: SR-001..SR-007
- Supplements:
  - `evidence/user-screenshots/01..04-*.png`
  - `product-design-request.md`, `product-design-request-r2.md`, `product-design-request-r3.md`
    (Product request history)
- Product (external):
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/ui-ux-spec.md`
  - `…/visual-references/`
  - `…/product-ticket.md`
  - `…/review-round-*.md`
- Prior review artifacts: `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001, Fail / Design Impact, reviewed basis SR-006/SR-007). Resolutions are in `solution-revision-record.md` SR-008 and the revised `design-spec.md`.

## Workspace / Base / Finalization

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification`
- Branch: `codex/run-settings-ui-unification`
- Base: `origin/personal@19dee40b3` (fetched 2026-10-05)
- Finalization target: `personal`
- Ticket artifacts are uncommitted in the worktree.

## Classification Evidence

- `task_size = Large`:
  - about 30 production files added or changed and about 20 removed (plus specs) in `autobyteus-web`;
  - new surfaces: the Org launch page, the member drawer, the heading switcher, start-surface tools,
    the saved-run view, and the other-model-setting controls;
  - every Run/"+" entry point is rewired.
- `architectural_risk = High`:
  - route/ownership changes: Run → `/chat`; the Org `mode=configuration` page is rendered outside
    `WorkspaceAdaptiveLayout`;
  - Org launch orchestration moves out of the `AgentOrgRunConfigPanel` view into a store + service;
  - the chat draft carries Team member overrides into `TeamRunConfig`;
  - first-message `@` mentions rely on server admission, verified only by code reading (AF-009);
  - broad test and localization blast radius;
  - no server API or persistence change.
- Escalation trigger: any required server API change, a mobile/Applications behavior change, or an
  unlisted consumer of a removed component.

## Points Worth Reviewer Attention

1. The `useRunStart` single start boundary vs the per-view entry points (design §Boundary
   Encapsulation).
2. `agentOrgLaunchDraftStore` (renamed from `agentOrgRunConfigStore`) + `agentOrgLaunchService`.
   Org readiness drops per-scope schema-state gating in favor of:
   - model-config sanitize;
   - model-required per scope;
   - runtime enabled;
   - topology diagnostics.
   Server validation stays authoritative (design §Risks).
3. `runMemberTree` replacing four form-model projections, including the saved-run variant.
4. The `launchAgentChat` failure path after `DraftRunConfigEditor` is removed (design §Risks).
5. REQ-022 `chatModelOptions` kept separate from the thinking adapter.
6. Shared `@` mention menu and first-message mentions (AF-009/010).

## Open Risks / Uncertainty

- First-message mention admission needs API/E2E proof.
- Numeric non-thinking model params are not presented. None exist today; stored values are kept.

## Next Expected Action

An independent architecture review of `design-spec.md` against the approved requirements and the
Product supplement. On Pass, proceed per the reviewer's handoff rules. Route findings back per the
team workflow.

## Route Record

- `get_handoff_rules` (2026-10-05): matching rule → `/software_engineering_team/architecture_reviewer`
  (Large/High). The Small/Medium-Low implementation rule does not match. The Product and Delivery
  rules do not apply.

## Re-review (SR-008) — Changes Since ARCH-REV-001

- **AR-001:** `design-spec.md` §Off-Spine Concerns (mention candidates row) and §Guidance (`@`
  candidates rule, example, tests, P-002 Not Reachable). Evidence: `investigation-notes.md` AF-013/AF-014.
- **AR-002:** §Interface Boundary Mapping (`newChatInWorkspace`), §Boundary Encapsulation Map
  (callers), §Final File Responsibility Mapping (entry points). Evidence: AF-015.
- **AR-003:** §Risks (decided: hide ⚙ for `temp-*`) and the §Removal Plan row. Evidence: AF-016.
- **AR-004:** new §Workspace Representation Conversion Boundaries.
- **R-1:** §Guidance (saved runs: `reloadCanonical`).
- **R-2:** investigation-notes supplement inventory.
- Requirements are unchanged (SR-006, Approved). Classification is unchanged (Large/High).
- Route record (re-review): `get_handoff_rules` on 2026-10-05 → `/software_engineering_team/architecture_reviewer`.

## Re-review (SR-009) — Changes Since CRR-002 (code review)

- Trigger: CRR-002 CR-001 (Design Impact). On an `@` collaborator view of an Agent run, "+" is a no-op
  because `copyAgentRun(runId)` looks up `agentContextsStore`, while child contexts live in
  `agentRunCollaborationStore` (AF-017).
- Design change:
  - `copyAgentFromConfig(config: AgentRunConfig)` replaces `copyAgentRun(runId)`. It copies the agent
    on screen: the host, the collaborator child, or a team-member collaborator's member agent. This
    preserves the base behavior and adds the REQ-013 settings copy.
  - Updated sections: §Interface Boundary Mapping, §Spine Narratives/Primary Spines DS-003,
    §Workspace Representation Conversion Boundaries, §Guidance (incl. CR-002/CR-003 resolution
    notes, and a new test).
- Requirements are unchanged (SR-006). Classification is unchanged (Large/High).
- After a Pass: the implementation engineer applies CR-001 (new interface) together with the Local
  Fixes CR-002 and CR-003 from `code-review-report.md`. CR-002/CR-003 are already in progress in the
  worktree.
- Route record (SR-009): `get_handoff_rules` on 2026-10-05 → `/software_engineering_team/architecture_reviewer`
  (the revised Large/High package rule).

## Re-review (SR-010) — Decisions On CRR-004 (raised at the user's direction)

- Read `design-spec.md` §"SR-010 Addendum" (authoritative refinement) and `investigation-notes.md`
  AF-018..AF-020.
- Material design deltas for review:
  - the `useRunStart.newChat()` intent (DI-001);
  - the shared readiness rule `utils/runSettings/launchReadiness.ts` (DI-004);
  - two module moves: start orders → `startModelDefaults`, and `chatModelOptions` →
    `utils/runSettings/modelOptions.ts` (DI-006 b/e);
  - the contract pin for the built-in id mirror (DI-002).
- Deferred with reasons: FU-001 (server `@` query; needs user approval), FU-002, FU-003, FU-004.
- DI-003 is proven: server unit 43/43; live N02/N03 pass.
- Requirements are unchanged (SR-006). Classification is unchanged (Large/High).
- After a Pass: implementation applies the SR-010 deltas, then a targeted code review, then API/E2E
  resumes on the new head (the web suite and N01–N03 first).
- Route record (SR-010): `get_handoff_rules` on 2026-10-05 → `/software_engineering_team/architecture_reviewer`.
