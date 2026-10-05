# Solution Revision Record — run-settings-ui-unification

## Revision Index

| SR ID | Date | Kind | Status After | Summary |
| --- | --- | --- | --- | --- |
| SR-001 | 2026-10-04 | Requirements baseline (draft) + Product Design request | Requirements Draft; Design N/A | Initial investigation; Product UI/UX design requested by user |
| SR-002 | 2026-10-05 | Product result integrated into requirements | Requirements Ready for Approval; Design N/A | DEC-001 = D (Run opens New chat), DEC-002 decided; REQ-001..018 / AC-001..015 |
| SR-003 | 2026-10-05 | User correction: Orgs not a chat target | Requirements Draft; Product revision requested | DEC-004 = A: Org launch page; `@` only Agents/Teams |
| SR-004 | 2026-10-05 | Product revision integrated | Requirements Ready for Approval; Design N/A | Org launch page, heading switcher, start-surface tools, "Run" label, default order; REQ-019..021 / AC-016..018 |
| SR-005 | 2026-10-05 | Requirement gap: non-thinking model settings | Requirements Approved (user-directed delta); design in progress | REQ-022 / AC-019: Fast mode and other model settings in the Thinking menu |
| SR-006 | 2026-10-05 | Product SR-005 correction integrated | Requirements Approved; design in progress | REQ-022 / AC-019 aligned with the confirmed chip/row design; VIS-001..042 |
| SR-007 | 2026-10-05 | Architecture design complete | Requirements Approved; Design Ready | Large / High → architecture review |
| SR-008 | 2026-10-05 | Design revision after ARCH-REV-001 | Requirements Approved; Design Ready (revised) | AR-001 @ eligibility mirror; AR-002 tree "+" intent; AR-003 hide ⚙ on temp; AR-004 conversion boundaries |
| SR-009 | 2026-10-05 | Design revision after CRR-002 | Requirements Approved; Design Ready (revised) | CR-001: "+" copies the agent on screen via copyAgentFromConfig(config); CR-002/003 guidance |
| SR-010 | 2026-10-05 | Design decisions on CRR-004 | Requirements Approved; Design Ready (revised) | DI-001 audit + newChat intent; DI-002 FU-001 + contract pins; DI-003 proven; DI-004 one readiness rule; DI-005 slices; DI-006 b,e adopt |

## Revision Entries

### SR-001 — Initial draft baseline and Product Design request

- Trigger: User request 2026-10-04 (run config forms cluttered vs chat composer) and user direction to send the UI work to the Product Team.
- Report/round/finding IDs: N/A
- Prior status: N/A
- Current status: Requirements `Draft`; design `N/A`.
- Affected IDs: BEH-001..005, SCN-001..005, UC-001..004, REQ-001..004, DEC-001..002.
- Canonical sections changed: all (initial creation) — `requirements-doc.md`, `investigation-notes.md`.
- Approval basis and impact: None yet; user will approve UI with Product, then requirements.
- Design/review/routing impact: Classified `Product Design Requested` (purpose `New Request`); see `product-design-request.md`.
- Remaining gaps: Product UI result; DEC-001, DEC-002; acceptance criteria.

### SR-002 — Product UI/UX result integrated; requirements ready for approval

- Trigger: Product UI/UX Designer `Design Completed` message, 2026-10-05, from
  `/product_team/product_ui_ux_designer` (run `product_ui_ux_designer_7c5b22b105584140bb57ad0d2169efb2`).
- Report/round/finding IDs: Product `review-round-30.md`; findings F-001..F-004 (pre-existing
  fixture gaps, not product requirements).
- Prior status: Requirements Draft (SR-001).
- Current status: Requirements `Ready for Approval`; design `N/A`.
- Affected IDs:
  - BEH-001..004 revised; BEH-006..008 added;
  - SCN-006..008 added;
  - UC-005..006 added;
  - REQ-001..018 (SR-001 IDs REQ-001..004 keep their meaning, refined; REQ-005..018 are new);
  - AC-001..015;
  - DEC-001 and DEC-002 closed; DEC-003 opened, then closed by the user on 2026-10-05: the saved-run stop icon reuses the tree labels "Terminate run" / "Terminate team" / "Stop Agent Org" (REQ-014).
- Canonical sections changed: `requirements-doc.md` (all sections); `investigation-notes.md`
  (Product Design Findings, Source Facts SF-001..007).
- Approval basis and impact:
  - The UI/UX spec is user-approved (2026-10-05).
  - This requirements baseline needs explicit user approval before architecture.
- Workspace: the task worktree was fast-forwarded to `origin/personal@02d6ddf05`, which matches
  the Product re-check.
- Design/review/routing impact: none yet; architecture starts after approval.
- Remaining gaps: user approval; ASM-001 (architecture to verify).

### SR-003 — Orgs are not a chat target; Org launch page requested

- Trigger: user clarification on 2026-10-05.
  - "one organization doesn't have a coordinator … on the @, it can only add one agent or agent team."
  - "organization can only be started from the organization page when user click run or with the plus
    on the running org."
  - Confirmed option A ("Yeah").
- Evidence: `autobyteus-web/docs/agent_orgs.md:56` ("AgentOrg has no coordinator field, initial
  recipient, or implicit first member") and `:192-211` (Org launch has no focused recipient).
- Prior status: Requirements Ready for Approval (SR-002, not approved).
- Current status: Requirements `Draft`, pending the Product revision for the Org launch page;
  design `N/A`.
- Affected IDs:
  - BEH-003, BEH-006, BEH-007;
  - UC-003; SCN-003, SCN-008; SCN-009 added (unsupported: Org from chat / `@` Org);
  - REQ-002, REQ-005..008, REQ-010, REQ-011, REQ-013, REQ-018;
  - AC-001..003, AC-007, AC-008, AC-013;
  - DEC-004 added (closed: option A).
- Canonical sections changed: `requirements-doc.md` (Status, Problem, Behavior, Use Cases,
  Requirements, ACs, Scenarios, UI, External Contracts, Assumptions, Decisions, Architecture Input).
- Approval basis and impact:
  - The Product UI approval still covers everything except the Org parts (Org as a New chat target,
    Org placeholder and unavailable copy, and the `@` footer's "or the org").
  - The Org launch page needs a Product revision and user UI confirmation, then requirements approval.
- Design/review/routing impact: `Product Design Requested` (purpose `Result Correction`, a
  user-directed revision within the same requested scope); see `product-design-request-r2.md`.
- Remaining gaps: the Product revision; requirements approval; ASM-001.

### SR-004 — Org launch page revision integrated; requirements ready for approval

- Trigger: Product UI/UX Designer `Design Completed` for the SR-003 request, 2026-10-05.
  - Design `origin/personal` = `a5b0eec`.
  - The user confirmed the final UI: "I'm currently satisfied with the UI now … Let's finalize now …
    the ticket is done."
- Report/round IDs: Product rounds 31–38 (`review-round-31.md`, `review-round-32.md`,
  `review-round-33-38.md`); spec UXJ-001..009, UIS-001..005, TR-001..016, VIS-001..019.
- Prior status: Requirements Draft (SR-003).
- Current status: Requirements `Ready for Approval`; design `N/A`.
- Affected IDs:
  - REQ-006, REQ-007, REQ-008, REQ-018 revised ("Run" label, outside the tool shell, existing route,
    states, switcher heading);
  - REQ-019 (heading switcher), REQ-020 (start-surface tools), REQ-021 (default model order) added;
  - AC-002, AC-003 revised; AC-016..018 added;
  - SCN-003 revised;
  - DEC-005 (route, default keep) and DEC-006 (typed message on switch, default cleared) opened as
    non-blocking; DEC-007 (Org entry point) recorded as out of scope.
- Evidence:
  - New chat's current preselection is last chat model → Daily Assistant default → runtime default
    (`stores/chatDraftStore.ts` `resolveDefaultModel`).
  - The Product Org order (Org default → last chat model → runtime first) is therefore applied to Run
    on any definition, while plain New chat keeps its existing order (REQ-021).
- Workspace: the task worktree was fast-forwarded to `origin/personal@fc79fad14`, which matches the
  Product re-check.
- Approval basis and impact: the UI is user-approved; requirements approval is pending.
- Remaining gaps: user approval; DEC-005/006 defaults to confirm; ASM-001 (architecture).
- Addendum (same round, 2026-10-05): the user delegated the remaining small decisions ("you can read our current project and give reasonable answer").
  - REQ-021: today's definition defaults are kept; there is a fallback instead of an empty model; Org approval defaults to on.
  - DEC-005: keep the existing route.
  - DEC-006: typed text is kept between Agent/Team switches but not through the Org page.
  - Screenshot-less states follow the spec copy and existing styles.
  - Evidence: `useDefinitionLaunchDefaults.ts`, `agentOrgRunConfigStore.begin`, `chatDraftStore.resolveDefaultModel`.
- User confirmation (2026-10-05): "Of course, the automatic tool approval is always on. default its own." This confirms the REQ-021 approval default of on for Agents, Teams and Orgs.
- **Requirements approval (2026-10-05):** "I think it's like now the requirement is clear, right? You can go ahead now. No more, I think it's clear now."
  - Approved baseline: `requirements-doc.md` SR-004 with the addendum above.
  - Supplements: Product `ui-ux-spec.md` + VIS-001..019 at design `a5b0eec`.
  - Status: Requirements `Approved`; architecture design starts.

### SR-005 — Requirement gap: non-thinking model settings (Codex Fast mode)

- Trigger: architecture investigation finding AF-012 (2026-10-05). The approved UI's Thinking control exposes only thinking keys, so removing the old forms would remove the ability to set Codex Fast mode (`service_tier`) and other non-thinking model settings.
- User decision (2026-10-05): "This means we're not complete … I think that's a miss … Of course, we need to enable the faster mode. For example, when codecs is selected … I think you can update … maybe the UI sent is not completely right." This is taken as option A, specified directly in requirements without a Product round.
- Prior status: Requirements Approved (SR-004).
- Current status: Requirements `Approved` (SR-005). The delta is approved by explicit user direction.
- Affected IDs: BEH-009, REQ-022, AC-019 added; traceability updated.
- Canonical sections changed: `requirements-doc.md` (Status, Behavior, Requirements, ACs, Traceability, supplements note); `investigation-notes.md` AF-012.
- Product supplement: unchanged and externally owned. REQ-022 is recorded as an extension of its Thinking control. The Product spec gap is noted for Product's records; no Product revision was requested, per user direction.
- Design impact: shared thinking-menu presentation (`chatThinkingMenu.ts`) gains an "other settings" section; covered in `design-spec.md`.
- Follow-up (2026-10-05): the user asked for a Product UI fix: "Maybe you ask the product team to fix the UI. I think I feel more secure."
  - REQ-022 behavior stays approved; its visual presentation now waits for the Product revision (`product-design-request-r3.md`, purpose `Result Correction`).
  - Architecture design is paused until the revision returns. Evidence is persisted in `investigation-notes.md` AF-001..AF-012.

### SR-006 — Product SR-005 correction integrated (other model settings)

- Trigger: Product `Design Completed` for `product-design-request-r3.md`, 2026-10-05.
  - Design `origin/personal` = `6718986`; round 39.
  - User confirmation: "perfect. i checked. its great".
- Change:
  - REQ-022 and AC-019 wording now matches the confirmed presentation: each other model setting is
    its own control next to Thinking (message-box chip, labelled row), with per-row
    Customized/Reset for members and a member summary of "… · Fast ·". The Thinking summary is
    unchanged.
  - Behavior is the same as the SR-005 approval (per-run, per-member and stopped-saved-run Fast
    mode; generic for any non-thinking parameter).
- Supplements: `ui-ux-spec.md` UXJ-001..010, TR-001..017, VIS-001..042. VIS-030..042 add
  screenshots for states that were previously copy-only.
- Approval: requirements remain `Approved`. The wording change follows the user-confirmed
  supplement; no new intended behavior.
- Product's still-open notes: the Org route under Chat and the typed message on switch were already
  decided in requirements DEC-005 (keep the route) and DEC-006 (text kept between Agent/Team
  switches, not through the Org page), under user delegation on 2026-10-05.
- Workspace: fast-forwarded to `origin/personal@19dee40b3`. The `autobyteus-web` delta since
  `fc79fad14` is tests, docs, fixtures and a version bump only.
- Next: architecture design (`design-spec.md`).

### SR-007 — Architecture design complete

- Trigger: requirements approved (SR-004 to SR-006); architecture investigation AF-001..AF-012.
- Prior status: Requirements Approved; design in progress.
- Current status: Requirements `Approved` (SR-006, unchanged); design `Ready` (`design-spec.md`).
- Classification: `task_size = Large`, `architectural_risk = High`.
  - Route changes: Run → `/chat`; the Org page rendered outside the workspace layout.
  - Org launch orchestration moves out of a view.
  - Chat draft Team overrides.
  - First-message mentions are verified by code reading only.
  - Broad removal surface.
  - No server or persistence change.
- Key design decisions:
  - `useRunStart` is the single start API.
  - Two draft owners: `chatDraftStore` and `agentOrgLaunchDraftStore` (renamed from
    `agentOrgRunConfigStore`).
  - New `agentOrgLaunchService` and `runWorkspaceChoice`.
  - A `runMemberTree` projection replaces four form-model projections.
  - A `components/run-settings/` view vocabulary.
  - `existingRunConfigStore` gains `discardChanges` and `reloadCanonical`; new `useRunStopAction`.
  - New `chatModelOptions` for REQ-022.
  - Shared `@` mention menu.
  - Forms, dead panels and form-only types are removed.
- Routing: handoff rules → independent architecture review (`architecture-handoff.md`).

### SR-008 — Design revision after ARCH-REV-001 (Fail, Design Impact)

- Trigger: Architecture Review ARCH-REV-001.
  - `design-review-report.md`, `architecture-review-revision-record.md`.
  - Findings: AR-001 (Medium, blocking); AR-002, AR-003, AR-004 (Low); R-1 and R-2 (non-blocking).
- Prior status: design `Ready` (SR-007). Current status: design `Ready` (revised); requirements
  `Approved` (SR-006, unchanged).
- Resolutions:
  - **AR-001:** New chat `@` candidates now come from one rule, `utils/collaborators/draftMentionEligibility.ts`,
    which mirrors the server's `CollaboratorCandidatePolicy`. The rule is:
    - shared, non-built-in agents and shared teams;
    - minus the target and every definition placed in the target's tree (recursive);
    - built-in ids live in `utils/agents/builtInAgentDefinitionIds.ts`.
    It includes an example and unit + API/E2E tests. P-002 is recorded as Not Reachable; no recovery
    machinery. Evidence: AF-013, AF-014.
  - **AR-002:** new `useRunStart.newChatInWorkspace` intent for the workspace tree "+". It keeps
    today's settings rule (no behavior change). `WorkspaceAgentRunsTreePanel` is added to the
    callers and entry points. Evidence: AF-015.
  - **AR-003:** Edit Config (⚙) is hidden for `temp-*` contexts; the error notice and composer retry
    stay. Evidence: AF-016.
  - **AR-004:** new "Workspace Representation Conversion Boundaries" section. It names the converters
    in `services/workspace/runWorkspaceChoice.ts` and their only callers: the Org store seed path,
    `useRunStart` copy intents, the `ExistingRunConfigEditor` container, and the launch services.
  - **R-1:** `reloadCanonical` reuses the existing canonical loaders / `retryCanonicalRefresh` path.
  - **R-2:** the supplement inventory is updated (Product package final and user-confirmed; review
    artifacts listed).
- Requirement impact: none.
  - AR-001 aligns New chat `@` with the server eligibility that live-run `@` already follows
    (BEH-006 preserved; REQ-011 intent "bring into this run").
  - AR-002 keeps the tree "+" behavior.
  - AR-003 hides a control on an error state without changing the approved surfaces.
  - No renewed approval is needed.
- Classification: unchanged (Large / High).
- Routing: back to the architecture reviewer for re-review of AR-001..AR-004 (`architecture-handoff.md`
  updated).
- Review outcome (informational, 2026-10-05): ARCH-REV-002 **Pass** on SR-006 requirements and SR-008 design.
  - AR-001..AR-004 resolved; R-1 and R-2 adopted.
  - Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
  - The reviewer forwarded the cumulative package to `/software_engineering_team/implementation_engineer`.
  - No Solution Designer handoff was repeated.

### SR-009 — Design revision after CRR-002 (CR-001 Design Impact)

- Trigger: Code Review CRR-002 (`code-review-report.md`, `code-review-revision-record.md`), commit
  `d45fe62bc`.
  - CR-001 (Medium, Design Impact): Agent "+" is a no-op on an `@` collaborator view.
  - CR-002 and CR-003 are Low Local Fixes that implementation owns.
- Prior status: design `Ready` (SR-008, ARCH-REV-002 Pass). Current status: design `Ready` (revised);
  requirements `Approved` (SR-006, unchanged).
- Resolution of CR-001:
  - The copy subject is **the agent on screen**: the host run, or the selected collaborator child.
    For a team-member collaborator it is the member agent. This matches the base behavior (AF-017)
    and extends it with REQ-013's settings copy.
  - Interface: `copyAgentRun(runId)` is replaced by `copyAgentFromConfig(config: AgentRunConfig)`. The
    view passes the displayed context config, with no store lookup by run id.
  - The DS-003 inventory and the conversion-boundary row are updated, and a test is added.
- Design guidance also records the CR-002 and CR-003 resolutions (dependency cleanup; diagnostics
  logged at detection), so implementation has one authority.
- Requirement impact: none. REQ-013 ("+ on a running Agent run opens New chat for the same definition
  prefilled with that run's settings") applies to the agent run on screen; base behavior already
  chose the collaborator's agent. No user clarification is needed.
- Classification: unchanged (Large / High).
- Routing: handoff rules → architecture re-review of the revised package (`architecture-handoff.md`).
  The implementation engineer is holding CR-001 per the code reviewer. CR-002 and CR-003 are already
  in progress in the worktree (uncommitted).
- Review outcome (informational, 2026-10-05): ARCH-REV-003 **Pass** on SR-006 requirements and SR-009 design.
  - CR-001 coverage verified with no new findings; AR-001..AR-004 remain resolved.
  - Report: `design-review-report.md`.
  - The reviewer routed the package to `/software_engineering_team/implementation_engineer` to apply CR-001 with CR-002/CR-003.
  - No Solution Designer handoff was repeated.

### SR-010 — Design decisions on CRR-004 (DI-001..DI-006), raised by user direction

- Trigger: Code Review CRR-004 (Design Impact, raised at the user's direction; the code at
  `c37b81de5` passed CRR-003). The API/E2E engineer supplied hold-state evidence (AF-020).
- Prior status: design `Ready` (SR-009, ARCH-REV-003 Pass). Current status: design `Ready`
  (revised); requirements `Approved` (SR-006, unchanged).
- Decisions (design-spec "SR-010 Addendum"):
  - **DI-001 (adopt):** rendered-surface audit table. New `useRunStart.newChat()` for `AppLeftPanel`;
    `RemoteAgentCard` is unrendered (FU-004).
  - **DI-002:** the server-owned query is deferred as FU-001 (server change, needs user approval).
    Adopted contract checks: live probe N03 as a required regression, and a unit pin of the built-in
    id mirror to the server registry file.
  - **DI-003 (resolved):** server unit tests 43/43 and live N02/N03 pass. The fallback if it ever
    breaks is recorded as a Requirement Gap with the recommended answer.
  - **DI-004 (adopt):** one readiness rule, `utils/runSettings/launchReadiness.ts`, over every
    effective scope, for both start surfaces.
  - **DI-005 (adopt):** validation/rework slices S1–S6 with AC mapping.
  - **DI-006:** (a) accept; (b) adopt (start orders → `startModelDefaults`); (c) defer FU-002;
    (d) accept, FU-003; (e) adopt (`modelOptions` → `utils/runSettings`).
- Requirement impact: none. The DI-004 readiness change blocks earlier with the existing copy for a
  state the server already rejects (AC-002 unchanged). The DI-001 Chat-nav routing keeps behavior.
- Classification: unchanged (Large / High).
- Routing: handoff rules → architecture re-review. API/E2E stays on hold until the chain reaches it
  with a new head (it will rerun the web suite and N01–N03 first).
- Review outcome (informational, 2026-10-05): ARCH-REV-004 **Pass** on SR-006 requirements and SR-010 design.
  - The DI-001..DI-006 decisions were verified with no new findings.
  - Report: `design-review-report.md`.
  - The reviewer routed the package to `/software_engineering_team/implementation_engineer` to apply the SR-010 deltas.
  - No Solution Designer handoff was repeated.
