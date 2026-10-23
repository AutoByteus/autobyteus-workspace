# Solution Revision Record — task-comments

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline from Task `autobyteus-259` and the 2026-10-21 extra direction | N/A | N/A | Ready for Approval | BEH-001–007, REQ-001–014, AC-001–013, DEC-001–015 | DEC-001–005 put to the user |
| SR-002 | Requirements | The user: simple first version; worker notification and meaning search of comments become follow-ups (2026-10-21) | N/A | Ready for Approval | Ready for Approval | DEC-002, DEC-010, DEC-014; REQ-008, REQ-009 (withdrawn); UC-005 removed; AC-005, AC-006, AC-007 (removed); SCN-004; QR-002 removed; FU-001 widened, FU-002 new | Smaller scope; the go on the rest pending |
| SR-003 | Requirements | The user: comments through `update_task` (2026-10-21) | N/A | Ready for Approval | Ready for Approval | DEC-003, REQ-005, REQ-010, AC-001, AC-008, SCN-001 | `update_task comment`, no new tool |
| SR-004 | Requirements | The user: an ID per comment, the on-disk model, no author (2026-10-21) | N/A | Ready for Approval | Ready for Approval | REQ-001, REQ-003 (withdrawn), REQ-007, REQ-008, REQ-012; AC-001–AC-003; DEC-006, DEC-016; QR-003 removed | `comments: [{id, createdAt, text}]` in `task.json` |
| SR-005 | Requirements | The user: comments can be edited, not deleted; `add_comment` / `edit_comment` (2026-10-21) | N/A | Ready for Approval | Ready for Approval | DEC-001, DEC-003, DEC-016, DEC-017; REQ-001, 002, 005–008; UC-008, SCN-008, AC-014, AC-015 | Add + edit, no delete; `editedAt` |
| SR-006 | Requirements | Part 2 added by `/project_task_manager` for the user (2026-10-21), with the user's options A and B | N/A | Ready for Approval | Ready for Approval | DEC-020–DEC-023; investigation P2-001–P2-006 | Options put to the user |
| SR-007 | Requirements | The user: Part 2 is a separate ticket (2026-10-22) | N/A | Ready for Approval | Ready for Approval | DEC-020–DEC-022; Out Of Scope; Done when | Part 2 handed to `/project_task_manager` for its own Task |
| SR-008 | Requirements | The user: no times in agent-facing results (2026-10-22) | N/A | Ready for Approval | Ready for Approval | DEC-024; REQ-008, REQ-012 | Agents get `{id, text}`; `addedComment` / `editedComment` `{id}` |
| SR-009 | Requirements | The user: no edit, add only (2026-10-22) | N/A | Ready for Approval | Ready for Approval | DEC-001, DEC-003, DEC-016; DEC-017 removed; REQ-001, 002, 005–008; UC-008, SCN-008, AC-014, AC-015 removed | `update_task add_comment` only |
| SR-010 | Requirements | The user: no comment IDs in agent results (2026-10-22) | N/A | Ready for Approval | Ready for Approval | DEC-024; REQ-008, REQ-012 | Agents get comment texts in order; the `update_task` result is unchanged |
| SR-011 | Requirements | The user's go (2026-10-22) | N/A | Ready for Approval | Approved | DEC-004, DEC-005; REQ-006, 007, 011, 014 | Approved; architecture design starts |
| SR-012 | Design | Architecture design over SR-011 | N/A | No design | Design Ready (Medium / High) | All REQ / AC (design mapping); DS-001–DS-006 | `design-spec.md`; routed to architecture review |
| SR-013 | Mixed | ARCH-REV-001 Fail (Requirement Gap) | ARF-001, ARF-002 | Approved; Design Ready | Approved; Design Ready | AC-001, AC-010, AC-012, AC-016 (new), DEC-012, DEC-025 (new), SCN-001, SCN-009 (new), BEH-004, REQ-008, UC-004, ASM-001, External Contracts, Architecture Phase Input, Data Continuity, Out Of Scope | Stale text aligned; board search recorded; back to review |

## Revision Entries

### SR-001 — Initial comments requirements baseline

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Project Task `autobyteus-259` and the extra direction from `/project_task_manager`, 2026-10-21.
- Triggering finding IDs: N/A.
- Prior status: N/A.
- Current status: `Ready for Approval`; no design.
- IDs affected: all (new).
- Scenario basis: SCN-001 to SCN-007 proposed.
- Why recorded: first baseline, used to ask the user.
- Canonical sections changed: whole `requirements-doc.md`; `investigation-notes.md`; `follow-ups.md` (FU-001).
- Supplements: none yet.
- Product design evidence: none yet; DEC-005 proposes a design step.
- Intended behavior changed: `Yes` (new).
- Approval impact: DEC-001 to DEC-005 need the user; DEC-006 to DEC-015 decided by the Solution Designer, the user informed with the questions.
- Behavior-defining supplement versions: N/A.
- Affected design / review basis: N/A.
- Task size / risk: N/A before design.
- Handoff: none (approval hold in the Solution Designer's conversation).
- Downstream impact: none yet.
- Remaining gaps: the user's answers.
- Next action: the user's answers.

### SR-002 — Simple first version

- Phase and classification: Requirements, `Refinement`.
- Trigger: the user, 2026-10-21: "I want to make it simple". On the notification: "it's a possible follow up … I don't want to make the scope really big in these tickets, and currently we also have no idea whether it's really going to give us a lot of benefits." On indexing: the later indexing should cover the comments too.
- Prior status: `Ready for Approval` (SR-001).
- Current status: `Ready for Approval`; the user's go on DEC-001, DEC-003, DEC-004 and DEC-005 is pending.
- IDs affected:
  - DEC-002 is the user's: a follow-up (FU-002);
  - DEC-010: exact text only now; meaning search of comments in FU-001, widened;
  - DEC-014;
  - REQ-008 revised, REQ-009 withdrawn;
  - UC-005 removed; AC-005 revised, AC-006 replaced by "nothing delivered", AC-007 removed; SCN-004 withdrawn; QR-002 removed; BEH-003 and BEH-005 unchanged in this ticket.
- Intended behavior changed: `Yes` (smaller).
- Approval impact: DEC-002 approved by the user (quote above); the rest still waits for the user's go.
- Handoff: none.
- Next action: the user's go.

### SR-003 — Comments through `update_task`

- Trigger: the user asked whether `update_task` could do it, then: "Yeah, please. So if I call it twice, it will continue to add more comments, right?" Answer recorded: each call appends one comment; a repeated call adds a duplicate (append-only).
- IDs affected: DEC-003 (the user's: the `comment` parameter); REQ-005, REQ-010; AC-001 (two calls, a combined status + comment call), AC-008; SCN-001.
- Intended behavior changed: `Yes` (tool contract).
- Approval impact: DEC-003 approved by the user. DEC-005 is still open, and DEC-001 / DEC-004 await the user's go.
- Next action: the user's answer on the design pass.

### SR-004 — Comment IDs, data model, no author

- Trigger, the user, 2026-10-21:
  - "it's better to give a comment one id … first figure out the data model on disk";
  - "why do we need who changed it? lets keep it simple please";
  - "no author please, because i want to keep it simple to be honest".
- IDs affected:
  - DEC-016 new: storage in `task.json`, Task-local numeric IDs;
  - DEC-006 is now the user's: no author;
  - REQ-001, REQ-007, REQ-008, REQ-012 revised; REQ-003 withdrawn;
  - AC-001 to AC-003 revised; QR-003 removed.
- Intended behavior changed: `Yes`.
- Approval impact: DEC-006 and DEC-016 approved by the user. DEC-001, DEC-004 and DEC-005 are still open.
- Next action: the user's answers on DEC-001, DEC-004 and DEC-005.

### SR-005 — Edit, no delete

- Trigger, the user, 2026-10-21:
  - "then we could even update comment if it has id right?";
  - "So basically we can update, but we cannot delete … the user can also edit … I don't want to introduce any semantic confusion";
  - on the proposal of two parameters and an "edited" mark: "yesss. sounds good actually".
- IDs affected:
  - DEC-001: add and edit, no delete;
  - DEC-003: `update_task add_comment` / `edit_comment {comment_id, text}`;
  - DEC-016: `editedAt` added; DEC-017 new (edit semantics);
  - REQ-001, REQ-002, REQ-005–REQ-008 revised;
  - UC-008, SCN-008, AC-014 and AC-015 new.
- Intended behavior changed: `Yes`.
- Approval impact: approved by the user (quotes above). DEC-004 and DEC-005 are still open.
- Next action: the user's answers on DEC-004 and DEC-005.

### SR-006 — Part 2: parts and the parent's copy

- Trigger: `/project_task_manager`, 2026-10-21. It extended the Task text with Part 2 (the user: "this is the problem with our delegate task management"). It then sent two directions: (A) the user's preferred narrow fix; (B) the user's question "why can't we just assign multiple Tasks to the same team? … free the resources only when all are closed". The Task text also folds in `autobyteus-260`.
- Investigation: notes "Part 2 Investigation" P2-001 to P2-006, all established by reading.
- IDs affected: DEC-020 to DEC-023 new; the Done when updated.
- Approval impact: DEC-020 and DEC-022 need the user; DEC-021 is proposed with DEC-020; DEC-023 was decided by the Solution Designer, the user informed.
- Next action: the user's answers.

### SR-007 — Part 2 split off

- Trigger: the user, 2026-10-22: "I don't think we need to work on part two. I think part two definitely belongs to a separate ticket."
- IDs affected: DEC-022 (the user's: split); DEC-020 and DEC-021 moved out; Out Of Scope; Done when scoped to Part 1.
- Handoff: `/project_task_manager` asked to create the Part 2 Task, with the analysis (investigation notes "Part 2 Investigation"; the options in the user's conversation, A recommended).
- Next action: the user's answers on DEC-004 and DEC-005.

### SR-008 — Agent-facing comment shape

- Trigger: the tool contract shown to the user on 2026-10-22. The user: "do we really need to return the created … this kind of information is completely not useful for agents … They only care about the useful information."
- IDs affected: DEC-024 new (the user's); REQ-008 and REQ-012 revised. Stored times are unchanged (the app shows them).
- Next action: the user's answers on DEC-004 and DEC-005.

### SR-009 — Add only

- Trigger: the user asked, 2026-10-22, whether add and edit are both needed. The Solution Designer recommended add-only. The user: "i also think so, no need for update".
- IDs affected: DEC-001 and DEC-003 revised (add only, `add_comment`); DEC-016 (no `editedAt`); DEC-017 removed; REQ-001, REQ-002, REQ-005–REQ-008 revised; UC-008, SCN-008, AC-014 and AC-015 removed. This supersedes SR-005's edit.
- Next action: the user's answers on DEC-004 and DEC-005.

### SR-010 — Comment texts only for agents

- Trigger: the user, 2026-10-22: "then in teh return we dont have to show id then list project tasks i meant". The Solution Designer applied the same to the `update_task` result (no `addedComment`) and told the user.
- IDs affected: DEC-024; REQ-008 and REQ-012 revised. Stored `{id, createdAt, text}` is unchanged.
- Next action: the user's answers on DEC-004 and DEC-005.

### SR-011 — Approved

- Trigger: the user, 2026-10-22, after seeing the final `update_task` contract: "Okay, cool. I agree. Look good. Now let's now we're good. It's working on it now".
- Decisions:
  - DEC-004 (`partsNotClosed` included) is read from that agreement;
  - DEC-005 (no design step; the existing Task-page style) was decided by the Solution Designer within the direction, the user informed in the same conversation.
- Approval: `User`. Baseline: `requirements-doc.md` at SR-011.
- Next action: architecture design.

### SR-012 — Architecture design

- Trigger: requirements approved at SR-011.
- Current status: `design-spec.md` `Ready`; requirements unchanged.
- Findings: AF-001 to AF-009 (all read).
- Task size / risk: `Medium` / `High`. Contracts: the agent tool, GraphQL (field + mutation), the strict feed, the delegated work text.
- Solution Designer decision, user informed: the board's exact search also matches comments (one server rule, AF-007).
- Handoff: `Architecture Design Complete` to `/software_engineering_team/architecture_reviewer`.
- Next action: architecture review.

### SR-013 — ARCH-REV-001 findings resolved

- Trigger: ARCH-REV-001 Fail (`design-review-report.md`), findings ARF-001 and ARF-002. The architecture itself passed.
- ARF-001 (stale text, no intended-behavior change):
  - AC-001 uses `add_comment` and an unchanged result;
  - AC-010 and DEC-012: texts as bullets, no IDs or times (the numbering in the design example was removed, consistent with DEC-024);
  - External Contracts and Architecture Phase Input rewritten to the decided scope;
  - AC-012 no longer refers to a spec;
  - ASM-001 accepted;
  - SCN-001's trigger;
  - Data Continuity names the rollback consequence (an older build drops comments when it rewrites a Task).
- ARF-002: DEC-025 records that the board's search matches comments. The decision is the Solution Designer's: consistency across surfaces sharing one server rule is a solution detail. The user was informed on 2026-10-22, in the message after the design, and did not object. Also recorded: Out Of Scope wording, BEH-004, REQ-008, UC-004, SCN-009 and AC-016 (new).
- Design: `design-spec.md` work-text example and DS-003 narrative aligned (bullets); no other design change; classification unchanged (Medium / High).
- Approval impact: no renewed user approval needed for ARF-001 (text matches the user's decisions); DEC-025 within the direction, user informed.
- Handoff: back to `/software_engineering_team/architecture_reviewer` for ARF-001 and ARF-002.

### Review notifications (informational, no new solution round)

- 2026-10-22, ARCH-REV-001: Fail (ARF-001, ARF-002). Resolved in SR-013.
- 2026-10-22, ARCH-REV-002: **Pass** on SR-013 over SR-011 / SR-012. Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
  - The reviewer routed the package to `/software_engineering_team/implementation_engineer`; no repeat handoff.
  - Residual risk: DEC-025 (the board's search matching comments) rests on "user informed"; the user may revisit it.
