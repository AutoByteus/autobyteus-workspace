# Solution Revision Record

Package: `update-checks-and-auto-updates` (Project Task autobyteus-210). Canonical artifacts in
`/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/`.

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-210, 2026-10-23) | N/A | N/A | Ready for Approval | BEH-001..007, REQ-001..019, AC-001..017, SCN-001..009, DEC-001..016 | Waiting for the user on DEC-003 |
| SR-002 | Requirements | The user's answers, 2026-10-23 | DEC-003; new category | Ready for Approval | Approved | BEH-008, UC-006, REQ-001/002/005/010/011, REQ-020..023, AC-018..022, SCN-010/011, DEC-003/004/017/018 | Product Design Requested |
| SR-003 | Requirements | Product designer's Requirement Impact (the user's design-review direction), 2026-10-23 | Impact on REQ-007/008/010 | Approved (SR-002) | Approved (SR-003) | REQ-007, REQ-008, REQ-010, AC-008, SCN-006, BEH-004, DEC-002 → DEC-019, Data Continuity | Design continues |
| SR-004 | Mixed (Requirements + Design) | The user-approved Product package (2026-10-23); architecture investigation and design | Designer findings (PQ-1, PQ-2, new behaviors, own-node rule) | Approved (SR-003); design not started | Requirements Approved (SR-004); design Ready | REQ-008, REQ-024, REQ-025, AC-022, DEC-020; design DS-001..DS-008 | Architecture Design Complete — Large / High |
| SR-005 | Design (+ DEC-020/AC-022 restated) | Architecture review ARCH-REV-001 (Fail, Design Impact) | AR-001..AR-007, R-1..R-3 | Requirements Approved (SR-004); design Ready | Requirements Approved (SR-005); design Ready (revised) | REQ-020..022, REQ-005/017, REQ-008/009, REQ-012..014, DEC-020, AC-022 | Architecture Design Complete — Large / High; back to review |
| SR-006 | Evidence | ARCH-REV-002 Pass (informational); delivery DR-001 Blocked by a base breakage | PRQ-001; R-5 | Approved (SR-005) | Approved (SR-006); waiting for prerequisite | — (no requirement change) | Prerequisite raised to `/project_task_manager` |

## Revision Entries

### SR-001 — Requirements baseline for check intervals, the app check and automatic updates

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Task autobyteus-210 from `/project_task_manager`, including the user's 2026-10-23 comment. Investigation in `investigation-notes.md` measured that unauthenticated conditional requests still count against GitHub's limit, and that the git ref advertisement is quota-free.
- Prior status: N/A. Current status: requirements `Ready for Approval`; design not started.
- IDs: all (baseline).
- Changes 209 requirements: 209 REQ-002's 6-hour cadence becomes REQ-001's interval; 209 REQ-015 becomes opt-in automatic update (REQ-005).
- Intended behavior changed: N/A (baseline).
- Approval impact: one decision needs the user (DEC-003: undo / pin / skip); the rest is decided within the direction.
- Next action: the user's answer on DEC-003 → approval → Product Design request (delegated by the Solution Designer to the Product Team).

### SR-002 — The user's answers: no undo; no automatic app update; agent runtimes as a category

- Phase and classification: Requirements, `Refinement` (the user changed and added intended behavior).
- Trigger: the user in the Solution Designer conversation, 2026-10-23:
  - "We don't do automatic updates … for software, of course, we do not do automatic updates";
  - automatic update is "a toggle for agent packages and the skill sources";
  - "I want to also have another notification … agent runtimes … so user can also enable just automatic updates … a lot of users, they don't know that they need to update those".
- Changes:
  - DEC-003 decided (none);
  - REQ-023 (the app never updates itself);
  - agent runtimes as a fourth category on the desktop's own node: BEH-008, UC-006, REQ-020..022, AC-018..022, SCN-010/011, DEC-017 (desktop's own node, following runtime-lifecycle-review D-3) and DEC-018 (never while agents run);
  - one interval per category (DEC-004 revised; runtimes 60 min);
  - REQ-002 also covers the runtime version sources (the Codex source uses `api.github.com` today, outside the gate).
- Intended behavior changed: `Yes` (approved by the user's own answers; the rest within the direction, user informed).
- Approval: `requirements-doc.md` at SR-002.
- Next action: Product Design request, delegated by the Solution Designer to the Product Team; the user approves the UI.

### SR-003 — Local changes are replaced, after a one-time confirmation

- Phase and classification: Requirements, `Refinement` (the user changed intended behavior).
- Trigger: a Requirement Impact from the Product UI/UX Designer (run `product_ui_ux_designer_d3a466b2a14542698fcb2a9b4ab76b32`), 2026-10-23. It quotes the user: with automatic updates enabled "we should directly overwrite those" local changes, and "give them a confirmation overlay" when the switch is turned on.
- Changes:
  - REQ-007: replace, with confirmation on turning the switch on, no record and no backup;
  - REQ-008: the "local changes" outcome is removed;
  - REQ-010: the explanation text says local changes are replaced;
  - AC-008 and SCN-006 rewritten; BEH-004 desired text; Data Continuity; Architecture Phase Input (no fingerprint);
  - DEC-002 superseded by DEC-019: skill sources follow the same rule, decided by the Solution Designer for consistency.
- Intended behavior changed: `Yes`. Approved by the user's own words; skill-source consistency is within the direction, user informed.
- Approval: `requirements-doc.md` at SR-003.
- Next action: the reply to the Product designer; the design continues to the user's approval.

### SR-004 — Approved UI integrated; architecture design complete

- Phase and classification: Mixed (Requirements `Refinement` from the returned Product package, plus Design).
- Trigger: Design Completed from the Product UI/UX Designer (run `product_ui_ux_designer_d3a466b2a14542698fcb2a9b4ab76b32`), 2026-10-23.
  - The user approved after round 7: "Okay, now I think I like [it]. It's satisfying. I like it now. Works nice. Looks nice as well. Approved."
  - The spec and VIS-001..037 are at design repository `5f5fb4c`.
  - Verified by the Solution Designer (spec status and VIS-010).
- Requirements changes:
  - the UI section is now normative from the spec;
  - REQ-008: the "N updated" entry;
  - REQ-024: confirmations above the panel (PQ-2 fixed);
  - REQ-025: quiet periodic app failure and truthful "Automatic checks are off";
  - AC-022 and DEC-020: own-node rule = the Agent Runtimes page's rule;
  - PQ-1 recorded as not adopted.
- Design: `design-spec.md` (new):
  - quota-free head read (git v2 `ls-refs`, Measured) for checks and updates;
  - Codex tag from the github.com redirect (Measured);
  - gate families;
  - `UpdatePass` as the one owner of the pass sequence (checks, then automatic updates through the owners' own update methods);
  - outcome fields on records;
  - runtime service additions;
  - the shell schedule;
  - web per spec.
- Intended behavior changed: the UI per the user's approval. DEC-020 is within the direction, user informed.
- Approval: requirements at SR-004; UI approved by the user.
- Classification: `task_size=Large`, `architectural_risk=High`.
- Next action: architecture review (handoff rules).

### SR-005 — Architecture review ARCH-REV-001 resolved

- Phase and classification: Design, `Design Impact`, plus a restatement of DEC-020 and AC-022 within REQ-020.
- Trigger: ARCH-REV-001 against SR-004, Fail (`design-review-report.md`, `architecture-review-revision-record.md`), `/software_engineering_team/architecture_reviewer`, 2026-10-23.
- Changes:
  - AR-001: `runUpdate` owns the refusals and returns results; the pass maps them.
  - AR-002: re-read before every automatic candidate.
  - AR-003: DS-008 rows and a `not_applied` result.
  - AR-004: DS-005 with three entry forms and the one owner `AppUpdateCheckSchedule`; `startAutoCheck` disposition; file split to ≤ 470 lines.
  - AR-005 (a): the server-side desktop-embedded-node fact (env set by the shell); the runtime kind only there; DEC-020 and AC-022 restated, so REQ-020 and the Out of Scope line hold on every node kind.
  - AR-006: composition order.
  - AR-007: background runtime checks read versions only.
  - R-1: reading recorded. R-2: runtime kind not gated. R-3: `followRedirects: false`.
  - The supplement tables list the 210 UI spec.
- Intended behavior changed: no approved requirement changed. DEC-020's browser-window case for non-embedded nodes is restated to match REQ-020; the user is informed. The UI spec left this rule to engineering (Open Decisions).
- Approval: requirements at SR-005; DEC-020 by the Solution Designer within REQ-020, user informed.
- Next action: architecture re-review.

### SR-006 — Review passed; delivery waits for a prerequisite on `personal`

- Phase and classification: Evidence (a prerequisite, outside this ticket).
- Triggers:
  - ARCH-REV-002 Pass against SR-005 (informational; the reviewer routed to implementation; its R-5, a stale SR in design-spec line 6, is corrected);
  - delivery DR-001 `Blocked` (`/software_engineering_team/delivery_engineer`, 2026-10-24): a Requirement Gap naming a prerequisite.
- Finding: PRQ-001 (requirements, Prerequisites). `origin/personal` misses the frozen memory modules of autobyteus-280 because of `.gitignore:43` `memory`. Verified by the Solution Designer (Read: `git ls-tree`, `git grep`, `git check-ignore`).
- Ticket-scope test:
  - this ticket cannot be finalized safely, because the integrated server cannot be built or checked;
  - the functionality belongs to app-data migrations (autobyteus-280), not to this ticket.
  - So it is a prerequisite.
- Also recorded: FU-001 (the VIS-037 contact line on a remote node's card), in `follow-ups.md`.
- Intended behavior changed: `No`.
- Next action: the Project Task Manager creates the prerequisite Task. When it is delivered on `personal`, this ticket resumes with delivery's re-integration (DEL-01..07).
