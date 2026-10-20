# Solution Revision Record — runtime-lifecycle-review

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-012 | Mixed | Code review CRR-001 CR-003 (responsive switch) + Claude rule correction | CR-003 | Approved | Approved (UI note addition, Solution Designer decision) | REQ-001, UI note | No code change; design-spec Claude line corrected |
| SR-011 | Design | Implementation Design Impact: Application agents not counted | — | Architecture Design Complete (ARCH-REV-002 Pass) | Architecture Design Complete (Large/High) | REQ-003, AC-004 | Count via hostManagement.activeAgentRuns |
| SR-010 | Mixed | User decisions UD-007 (lookup unchanged + restart hint), UD-008 (no Antigravity sign-in) | AR-001…007 | Design revised, delta pending | Approved; Architecture Design Complete (Large/High) | REQ-004, REQ-006, AC-005, AC-008, SCN-004, REQ-009, DEC-008 | Re-review requested |
| SR-009 | Mixed | ARCH-REV-001 Fail (AR-001…AR-007) | AR-001…007 | Architecture Design Complete | Design revised; requirement delta Ready for Approval | REQ-009, DEC-008 | Waiting for the user on AR-003 |
| SR-008 | Design | Architecture design after approval | — | Approved | Architecture Design Complete (Large/High) | REQ-001…008 | design-spec.md; FU-003/004 |
| SR-007 | Requirements | User approves; Claude no sign-in button | — | Ready for Approval | Approved | D-1…D-4 | Approved by the user; architecture design starts |
| SR-006 | Requirements | Product returns user-approved UI (Agent Runtimes) | — | Draft | Ready for Approval | BEH-001…006, REQ-001…008, AC-001…011, D-1…D-4 | UI integrated; install links verified; decisions to the user |
| SR-005 | Evidence | Product designer relays user: wants full sign-in (detect + button); asks feasibility | — | Draft | Draft | REQ-005, Q-2 | E-R21: detection for all four; button feasible for Codex/Claude/Grok, AGY needs a terminal; terms limit Claude and commercial Codex; FU-001/002 |
| SR-004 | Requirements | User asks Product Team to pin down the UI first | — | Draft | Draft (Product Design Requested) | BEH-001…005, REQ-001…005, Q-1…Q-3 | Delegated to /product_team, coordinator run product_ui_ux_designer_4db43b9c51344b828ce324df5603206e |
| SR-003 | Evidence | User suggestion: per-engine update-check strategies; check Antigravity website | — | Draft | Draft | DEC-002, BEH-002, REQ-002 | All four engines have a latest-version source (E-R20); all four self-update |
| SR-002 | Requirements | User direction UD-001 in conversation | — | Draft | Draft | BEH-001…005, REQ-001…005 | Scope narrowed to status + update of user-installed engines; Install/bundling out; Q-1…Q-3 open |
| SR-001 | Evidence | Project Task: independent review of predecessor `runtime-lifecycle-usability` | F-01…F-11 | N/A (predecessor: Approved SR-012, design SR-015) | Draft | BEH-001…006, REQ-001…006 (draft) | Verdict: redesign; decisions D-1…D-7 put to the user |

## Revision Entries

### SR-001 — Independent review and draft redirection

- Phase and classification: Initial Baseline (review of an inherited package).
- Trigger: Project Task from `/project_task_manager`, 2026-10-20, carrying the user's request for an independent design review.
- Triggering finding IDs: F-01…F-11 in `design-review.md`.
- Prior authoritative status: predecessor requirements Approved SR-012 (AP-001/002/003), design SR-015 with ARCH-REV-006 Pass, implementation IR-006 uncommitted on base 63aac5939f. These approvals cover the predecessor basis only.
- Current status: requirements Draft; no design spec yet.
- Why recorded: first coherent review baseline presented to the user.
- Canonical sections: `investigation-notes.md` (E-R01…E-R17), `design-review.md`, `requirements-doc.md` (draft).
- Intended behavior changed: proposed only (narrower scope, vendor-owned install/update/sign-in); nothing approved.
- Approval impact: renewed user approval required before any design or implementation.
- Workspace: predecessor worktree preserved as branch `preserve/runtime-lifecycle-usability-wip-20261020` (commit 96843635293273109d1d50bdd3e4c513c0c80832); new worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review` on `origin/personal` 3d4d9d0a95.
- Downstream impact: none yet; no architecture review or implementation is routed.
- Remaining gaps: D-1…D-7 (user); U-01…U-04 (investigation).
- Next action: discuss the review with the user; on his direction, write requirements and acceptance criteria for approval.

### SR-002 — User direction: status and updates for engines the user installed

- Phase and classification: Refinement (requirements, draft).
- Trigger: user message in conversation, 2026-10-20 (UD-001 in `requirements-doc.md`), plus his question whether the branch is on the latest `origin/personal`.
- Prior status: Draft (SR-001). Current status: Draft.
- Affected IDs: BEH-001…005, REQ-001…005 rewritten; UC-002 "install" removed; new open questions Q-1…Q-3; decisions DEC-001…003 recorded within the direction.
- Evidence added: E-R18 (task branch fast-forwarded to `origin/personal` 9227d61597, which had moved 9 commits since creation), E-R19 (per-vendor "new version" sources; Grok `update --check --json` works; Claude/Codex via npm latest; AGY none found).
- Intended behavior changed: proposed only; nothing approved.
- Approval impact: user approval still required before design.
- Next action: answers to Q-1…Q-3, then acceptance criteria and approval.

### SR-003 — Per-engine update-check sources

- Phase and classification: Evidence-only refinement (draft requirements; DEC-002 revised).
- Trigger: user, 2026-10-20: "there are different ways to check … we could implement different strategies … for example antigravity. maybe you can check their website".
- Evidence added: E-R20. Antigravity website is not usable (install page → 404 quickstart; changelog CLI list stops at 1.4.0). The AGY updater manifest gives version/url/sha512 per platform; Claude and Codex have their own vendor sources; Grok has a documented check flag. All four engines update themselves; AGY did so on this machine today (1.4.2 → 1.4.3).
- Changed: DEC-002 (sources), U-05/U-06 resolved, R-02 added.
- Intended behavior changed: No (still Draft).
- Next action: user answers Q-1…Q-3; then acceptance criteria for approval.

### SR-004 — Product Design Requested (New Request)

- Trigger: user, 2026-10-20: "could you ask @Product Team to work on the UI first. so we could first pin down the ui design you know".
- Classification: `Product Design Requested`, purpose New Request; requirements stay Draft.
- Request artifact: `product-design-request.md`.
- Route: user-named collaborator; `delegate_task` to `/product_team` → team run `product_team_3a4e8949079d4520a0ddf6bcb5e7f83b`, coordinator `product_ui_ux_designer_4db43b9c51344b828ce324df5603206e`. Attached: product-design-request.md, requirements-doc.md, investigation-notes.md, solution-revision-record.md, analysis-result.md.
- Intended behavior changed: No.
- Next action: wait for the Product result; then integrate the user-confirmed UI, answer Q-1…Q-3 with the user, write acceptance criteria and seek approval.

### SR-005 — Sign-in feasibility for the user's "full sign-in" direction

- Trigger: Product designer (run product_ui_ux_designer_4db43b9c51344b828ce324df5603206e) relays the user's direction: detect sign-in, and offer a Sign in button when not signed in; smaller first version acceptable (status + terminal). Four questions: detection, trigger, terms, remote.
- Evidence added: E-R21. Follow-ups FU-001 (Antigravity terms risk, urgent) and FU-002 (Claude subscription use) in `follow-ups.md`, not yet sent.
- Answer sent to the designer (delivered). Recommendation: status for all four; buttons for Codex and Grok; Claude and Antigravity through their own command line unless the user chooses otherwise.
- Intended behavior changed: not yet; Q-2 now reads "which engines get a Sign in button", to be decided by the user in the UI review.
- Next action: Product returns the user-confirmed UI; then acceptance criteria and approval.

### SR-006 — Approved UI integrated; requirements ready for approval

- Trigger: Product UI/UX Designer returns the user-approved design ("yes approved", 2026-10-20); the user sent Q-1…Q-3 to the Solution Designer.
- Product package verified (spec Approved, 23 references, same revision a74ecd4 / integration 43d2d7d).
- Requirements rewritten: BEH-001…006, REQ-001…008, AC-001…011; section name "Agent Runtimes"; sign-in in scope (REQ-006); install links verified (E-R22, DEC-004); DEC-005…007 decided; D-1…D-4 Needs user.
- Status: Draft → Ready for Approval.
- Next action: user answers D-1…D-4 and approves; then architecture design (reading gate: updated design-principles, design-examples, design-spec template).

### SR-007 — Requirements approved by the user

- Trigger: user, 2026-10-20 (UD-005, UD-006): installation by users; no Claude sign-in button ("we have to abide their rules"); "if we use the strategies, I think it's really easy to implement".
- Approval: User, baseline requirements-doc SR-007 + approved UI/UX spec a74ecd4. D-2 Codex and D-3 taken as the presented recommendations (user informed; reversible).
- Next action: architecture design.

### SR-008 — Architecture design complete

- Trigger: approved requirements SR-007.
- Design: `design-spec.md` — Agent Runtimes service with one strategy per runtime, process operation, executable locator; readiness adapter delegates sign-in reads; GraphQL query + 4 mutations; Settings section reusing the Embedding polling pattern and Terminal.vue.
- Evidence: E-A01…E-A09. Follow-ups FU-003, FU-004 added.
- Classification: task_size Large, architectural_risk High.
- Intended behavior changed: No.
- Next action: independent architecture review (handoff rule).

### SR-009 — ARCH-REV-001 resolution; requirement delta for the user

- Trigger: `design-review-report.md` ARCH-REV-001 **Fail**, findings AR-001…AR-007 (Design Impact) and AR-003 (Requirement Gap).
- Design revised (design-spec "ARCH-REV-001 Resolution"): terminal sign-in watch; fresh Antigravity version; Terminal.vue props/emit; `SignInReading` + `AgentRuntimeSignInReader` in both composition roots; post-update result kept; cadence 2 s/10 s; dead-code check; inventory updated.
- Requirement delta (Ready for Approval): REQ-009 (option (a) vendor-folder lookup for page, agents and model menu vs (b) unchanged); DEC-008 (Codex custom provider → "–").
- Classification unchanged: Large/High.
- Next action: user's decision; then forward the revised package to the architecture reviewer.

### SR-010 — User decisions on the review; design re-written

- Trigger: user, 2026-10-20: UD-007 (answering AR-003: keep runtime lookup as today; tell users to restart after installing) and UD-008 (no in-app sign-in for Antigravity).
- Requirements (Approved by the user): REQ-004 adds the restart hint; REQ-006 Sign in only for Codex and Grok; AC-005 updated; AC-008 and SCN-004 removed; REQ-009 not adopted; DEC-008 decided by the Solution Designer (Codex custom provider → "–"), user informed. UI note records two user-directed differences from the Product spec (restart hint; Antigravity command-line state).
- Design: `design-spec.md` rewritten for SR-010 — resolvers and `Terminal.vue` no longer touched; AR-001/AR-004 N/A; AR-002/005/006/007 resolved; classification Large/High.
- Next action: re-review by the architecture reviewer.

### Receipt — ARCH-REV-002 Pass (informational, no new round)

- `design-review-report.md` ARCH-REV-002 **Pass** of SR-010 (Large/High). AR-001/AR-004 obsolete (UD-008); AR-002, AR-003 (UD-007), AR-005, AR-006, AR-007 resolved. The reviewer delivered the package to `/software_engineering_team/implementation_engineer` (run `implementation_engineer_40c3051b92cb4a71afadf8349f6cf4f5`); no duplicate forwarding by the Solution Designer.
- Factual corrections from the reviewer's nits: requirements-doc baseline line and readiness line now say SR-010; REQ-008 traceability no longer lists the removed SCN-004. Intended behavior unchanged.

### SR-011 — Application agents in the running-agent count

- Trigger: implementation engineer Design Impact question (2026-10-20): Application agents live in the application platform's own `AgentRunManager`.
- Design delta: `ApplicationExecutionScope.countActiveAgentRuns(kind)`, `hostManagement.activeAgentRuns.countByRuntimeKind`, studio composition sums it with the process count into the service's `countRunningAgents` port. Evidence E-A10.
- Intended behavior changed: No (implements REQ-003/AC-004 fully).
- Review: focused re-review requested for the delta (Large/High rule); other implementation continues.

### Receipt — ARCH-REV-003 Pass (informational)

- `design-review-report.md` "SR-011 Delta Review": **Pass** (Large/High). The reviewer delivered to the implementation engineer; no duplicate forwarding. AR-008 (non-blocking) applied as a factual file-mapping addition: `application-execution-scope-kernel-builder.ts` exposes a narrow active-run reader.

### SR-012 — Responsive switch decision (CR-003) and Claude rule correction

- Trigger: code reviewer (run code_reviewer_064191c97ef649089bdbc6f42050e984), CRR-001 CR-003 Requirement Gap: the approved spec's "table from 640 px" and "no horizontal overflow" cannot both hold beside the Settings menu; the implementation switches on the list's own width.
- Decision (Solution Designer, a gap in the approved design, user informed): record option 1 in requirements "UI note (SR-010)" item (3); no code change. Evidence IMP-10a/b.
- Correction (evidence-only): design-spec Claude sign-in rule reads the JSON whatever the exit code (2.1.302 exits 1 when signed out).
- Intended behavior: visible layout between ~640 and ~1100 px windows changes to the approved stacked layout; recorded as a Solution Designer decision with the user informed.
- SR-012 addendum (factual correction, code reviewer note): design-spec Claude rule keeps today's plain-text fallback (exit 0 + "logged in" → signedIn), matching the code and ARCH-REV-003.
- SR-012 addendum (factual correction from API/E2E ARP-02): UI note (3) window range corrected to roughly 640–1250 px; the rule (list width ~58 rem) is unchanged.
