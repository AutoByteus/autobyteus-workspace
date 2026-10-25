# Solution Revision Record — agent-tool-results-omit-empty

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task `autobyteus-260` (2026-10-24), read-only size measurement (first team) | N/A | N/A | Ready for Approval | All | Before sizes; DEC-002 / DEC-004 to the user |
| SR-002 | Requirements | Project Task Manager's view (2026-10-24): summaries by default (first team) | N/A | Ready for Approval | Ready for Approval | DEC-008 | Summary mode measured (−93%) |
| SR-003 | Requirements | The title decision, Task comment 2026-10-24 (first team) | N/A | Ready for Approval | Ready for Approval | REQ-003–REQ-009, DEC-008–DEC-013 | Not approved; team stopped 2026-10-25 |
| SR-004 | Requirements | Reassignment to this team, 2026-10-25; verification at `fc06a7355d` | N/A | Ready for Approval (SR-003) | Ready for Approval | REQ-003, REQ-005, REQ-007, REQ-011, REQ-012 (new), DEC-007, DEC-010, DEC-014–DEC-017 (new), Measured table | Four points asked of the user |
| SR-005 | Requirements | The user, 2026-10-25: no hard limit on the title | N/A | Ready for Approval | Ready for Approval | REQ-003, REQ-004, REQ-005, AC-003, DEC-010 | Title limit removed; derived titles keep the safety cut |
| SR-006 | Requirements approval | The user, 2026-10-25: "I trust your design" | N/A | Ready for Approval | Approved | DEC-009, DEC-013, DEC-016 decided as recommended | Architecture design starts |
| SR-007 | Design | Architecture design on SR-006 | N/A | N/A (no design) | Design Ready | DEC-006 resolved (Codex probe), DEC-018 (new, within direction), design-spec.md | Large / High; to architecture review |
| SR-008 | Requirements + design (within direction) | ARCH-REV-001 Pass with a residual: ack `attachedContextFiles` vs list `contextFiles` names | ARCH-REV-001 residual | Approved / Design Ready (reviewed ARCH-REV-001) | Approved / Design Ready (delta pending review) | REQ-013, AC-011, DEC-019, BEH-005; design-spec rows | Delta to architecture review |
| SR-009 | Requirements | PM + user, Task comment #6 and PM message (2026-10-25): a read-one-Task tool in the same contract change | N/A | Approved (SR-008) | Ready for Approval (addition) | UC-007, BEH-006, REQ-007 (changed), REQ-014–REQ-016, AC-006 (changed), AC-012–AC-014, DEC-020–DEC-023 | Asked the user (DEC-021, DEC-022); design of the addition after approval |
| SR-010 | Requirements | The user's answers, 2026-10-25 (this conversation) | N/A | Ready for Approval | Approved | REQ-007, REQ-012, REQ-014–REQ-017, AC-006, AC-012–AC-015, BEH-003, BEH-006, UC-007, SCN-004, SCN-007, DEC-008, DEC-018, DEC-020–DEC-024 | Design of the addition; then architecture review |
| SR-011 | Clarification | ARCH-REV-003 Pass on SR-009/SR-010, AR-006 | AR-006, AR-007 | Approved / Design Ready | Approved / Design Ready | REQ-015, DEC-022 (wording), design-spec first-message bullet | Stated; no re-review, no renewed approval |

## Revision Entries

### SR-001 to SR-003 — first team (summary)

- Recorded by the first team in its own worktree (removed); its handover is `evidence/first-team-handoff-reassignment.md`, its outputs `evidence/first-team-SD-measure-*-20261024.txt`. Never approved.

### SR-004 — Verified baseline for the second team

- Trigger: `/project_task_manager` reassigned `autobyteus-260` on 2026-10-25 ("Do not redo the investigation; verify what you rely on").
- Verification: inventory re-read at `origin/personal@fc06a7355d` (one rename: `list_peer_nodes`); measurements re-run read-only on current data (153 open Tasks 481,648 B; short entries 31,126 B; 376 first lines).
- Changes from SR-003:
  - title limit 160 → 200 (DEC-010: "generous safety cut"; 81% of first lines fit whole);
  - DEC-007 widened to core AutoByteus tools with structured results;
  - new: DEC-014 (Temp tasks have no title), DEC-015 (no per-Task `projectId` in lists), DEC-016 / REQ-011 (summary → title, glossary), DEC-017 / REQ-012 (the Project Task Manager skill in this ticket, per the done-when).
- Status: `Ready for Approval`. Asked the user directly: confirmation of the package; DEC-009; DEC-013; DEC-016.
- Design / review impact: none yet (design starts after approval).

### SR-005 — No limit on the title

- Trigger: the user, 2026-10-25, in this conversation: "No need to limit the title … the title is written by the large language model … in the code we don't have to apply a hard limit on the title itself."
- Changes: REQ-003 (required, not blank, no length or line limit), REQ-004 and AC-003 (only missing or blank titles refused), DEC-010 (owner: user). REQ-005 keeps the 200-character cut for titles derived from old descriptions only.
- Status: `Ready for Approval`; still open: confirmation, DEC-009, DEC-013, DEC-016.

### SR-006 — Requirements approved

- Trigger: after the four open points, the "central place" questions and the preliminary design, the user wrote (2026-10-25): "you know the best I think, you understand the code more than me, I trust your design".
- Recorded as the user's approval of the SR-005 package with the recommendations: DEC-009 (a) one-time conversion at startup; DEC-013 existing style; DEC-016 "summary" becomes "title", glossary entry. The user was told in the same conversation and may object.
- Status: `Approved`. Design impact: architecture design starts on this basis.

### SR-007 — Architecture design

- Basis: SR-006 approved requirements.
- Evidence added: Codex 0.164 model view of MCP results (`evidence/SD-codex-0.164-mcp-result-to-model.txt`: only `structuredContent`), Task file shape inventory (`evidence/SD-task-file-shape-inventory-output-20261025.txt`: 4 shapes, 376 files), correction of the discovery-refusal reading.
- Design: one result rule in `autobyteus-ts/src/tools/tool-result-json.ts` called by every platform adapter on both routes; old serializers removed; guard test; `projects/domain/task-text.ts`; stored `title` with migration `project-task-titles`; short/full list entries; web Title field and labels; glossary and design cases.
- Requirements: DEC-018 added (design details within the direction: search exact tier on title, title on Task page and panel, card preview, `task_ids` refusals); no approved behavior changed; the user is informed.
- Classification: `task_size` Large, `architectural_risk` High.

### SR-008 — Context files named the same in acknowledgements

- Trigger: architecture review ARCH-REV-001 on SR-007 (`design-review-report.md`): `Pass`, AR-001–AR-004 non-blocking guidance to implementation; residual risk: `create_task` / `update_task` acks keep `attachedContextFiles: [{storedFilename, displayName}]` while full list entries use `contextFiles: [{name, path}]` (Principle 15).
- Judgement (ticket-scope): this ticket introduces the second name, so it is this ticket, not a follow-up. Within the user's direction (DEC-004 reasoning); decided by the Solution Designer, the user informed.
- Changes: REQ-013, AC-011, DEC-019; design-spec BEH-005 row, tightness check, file mapping, example.
- Approval impact: within the direction; the user informed in the Solution Designer's conversation.
- Review impact: ARCH-REV-001 covered SR-007; this delta goes back to architecture review. The rest of SR-007 is unchanged.

### Note (no new round) — ARCH-REV-002, 2026-10-25

- The SR-008 delta passed architecture review (ARCH-REV-002, `design-review-report.md`); the reviewer forwarded it to implementation. AR-005 (non-blocking, implementation guidance): on `update_task`, `ProjectTaskService` resolves the attached files' paths, so `TaskAcknowledgementView.attachedContextFiles` becomes `ProjectTaskContextFileView[]`; the manifest never reaches the context store. Recorded; no re-forwarding.

### SR-009 — A read-one-Task tool (`get_task`)

- Trigger: Task comment #6 (2026-10-25, "PM + USER") and `/project_task_manager`'s message: add a read-one-Task tool in the same contract change; workers scoped to their Task plus its parts and dependencies, read-only; the team decides name, scope rules and shape and puts open choices to the user.
- Evidence: the caller's Task is already answerable from its run (`agent-collaboration/execution/task/root-task-execution-resource-scope.ts:48` `ownerOf`, used by `root-task-execution-lifecycle.ts:147,188` to refuse `task_id` for task agents); the member's root-bound Task capability (`member-task-command-capability.ts`) reaches both routes (native tools hold `memberExecutionContext`; MCP sessions hold `sender.memberExecutionContext`).
- Changes: UC-007, BEH-006, REQ-014–REQ-016, AC-012–AC-014, SCN-007, DEC-020–DEC-023; REQ-007 / AC-006 drop `task_ids` (DEC-021, pending).
- Approval impact: new behavior and an access rule → the user's approval (asked in the Solution Designer's conversation). The SR-008 basis stays approved for everything else; implementation of the unaffected parts continues; `task_ids` is on hold.
- Design impact: `design-spec.md` gets the `get_task` section after approval; then architecture review of the delta.
- Note for the PM: DEC-009 and DEC-013 were already decided by the user on 2026-10-25 (SR-006).

### SR-010 — `get_project_task`, approved

- Trigger: the user in the Solution Designer's conversation, 2026-10-25: the tool should take the Project like the Project family, and the delegated message should carry the Task key and the Project ID ("a very short message … a very big difference"); `task_ids` "drop it is a good idea"; worker scope "for the current being, no parents", to keep workers focused on one Task; then "you can continue now" after the Solution Designer narrowed worker reads to the own Task only.
- Changes: tool renamed and reshaped (`get_project_task(project_id, task_id)`, Project Tasks only); REQ-015 own Task only; REQ-017 / AC-015 / DEC-024 (first message names Task and Project); REQ-007 / AC-006 / DEC-021 (no `task_ids`); DEC-018 item (4) removed; REQ-012 skill sentences adjusted.
- Status: `Approved` (the user). Design: addition to `design-spec.md` (SR-010), then architecture review of the delta. Implementation was stopped by the user and resumes from the reviewed package.
- Design (same round): `design-spec.md` section "`get_project_task` (SR-010 addition)", DS-007 / DS-008, interface, file mapping, sequence step 5b, risks; Change Scope now includes the first-message line and the member Task capability query (renamed `MemberTaskCapability`). Classification unchanged: Large / High. Route: delta to architecture review.

### SR-011 — Several open Tasks on one copy (clarification)

- Trigger: ARCH-REV-003 (`design-review-report.md`), `Pass` on SR-009/SR-010; AR-007 and AR-008 went to implementation as guidance; AR-006 asked to state what a copy holding several open Tasks may read.
- Statement: it reads only its current Task (the latest given to it), which is the `ownerOf` answer the approved rule already uses and the user's "one task at a time" (2026-10-25). REQ-015 and DEC-022 now say so; the design spec names `buildExistingCopyTaskMessage` for the existing-copy path (AR-007).
- Impact: evidence/wording clarification of approved intent; no renewed approval, no re-review; the user is informed.
