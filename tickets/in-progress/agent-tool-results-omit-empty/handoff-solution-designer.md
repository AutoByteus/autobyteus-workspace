# Handoff — Solution Designer → Architecture Review (autobyteus-260)

- Result: `Architecture Design Complete`, `task_size` **Large**, `architectural_risk` **High** → independent architecture review (handoff rule: Large or High).
- Package: `agent-tool-results-omit-empty`, Project Task `autobyteus-260`, current revision `SR-007`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty/tickets/in-progress/agent-tool-results-omit-empty/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty`, branch `codex/agent-tool-results-omit-empty`, base `origin/personal@fc06a7355d1c4d76a55c812011e3718709c035d6`; finalization target `origin/personal`. Nothing committed yet: the ticket documents and the `docs/design-cases.md` addition are uncommitted in the worktree; no source changes.
- Second repository (REQ-012 only): `/Users/normy/autobyteus_org/autobyteus-agents` (`origin/main@d8cf242`); its worktree is created at implementation.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.

## Original request (summary)

The user (2026-10-21): "for the fields which don't have any value, why do we even send those fields back? It's just a waste of tokens … a general problem … maybe the changes are in some central place." Comments 2026-10-24: every platform tool, both routes; compact JSON; a title field on Tasks (required on new Tasks, old Tasks from their first line), short Task lists by default with full text on request. Constraints: no new tool exposure; change only what tools return (plus the approved `title` / `task_ids`); no secrets. Done when: the user has seen measured before/after sizes; every agent tool omits empty fields under one rule; consumers work (Project Task Manager skill updated); tests; finalized on personal. No release unless asked.

## Approval basis

- Requirements `Approved` at SR-006 by the user, 2026-10-25, in the Solution Designer's conversation: "you know the best I think, you understand the code more than me, I trust your design" — after the open points were put to him; recorded with DEC-009 (a) one-time startup conversion, DEC-013 existing app style, DEC-016 "summary" → "title".
- The user also decided in this conversation: no length or line limit on titles (DEC-010; the 200-character cut applies only to titles derived from old descriptions).
- SR-007 (design) adds DEC-018: design details within the direction (search exact tier on title; title on the Task page and panel; card preview skips a first line equal to the title; `task_ids` refusals). No approved behavior changed.

## Design summary

- One result rule, `autobyteus-ts/src/tools/tool-result-json.ts` (`omitEmptyToolResultFields`, `toToolResultJson`): drop `null`/`""`/`[]`/`{}` at any depth, keep `false`/`0`, compact JSON. Every platform adapter on both routes calls it; `json-utils.ts` and the three family serializers removed; MCP structured helper takes a value; `send_message_to` null rule removed with its schema, text and doc; architecture guard test.
- Codex probe (DEC-006): Codex 0.164 gives the model only `structuredContent`; the two MCP copies stay.
- Stored `title` on Project Tasks; `projects/domain/task-text.ts` (keeps the 494-line service under 500); new migration `project-task-titles` (after `project-task-keys-v1`), 4 inventoried shapes.
- `list_project_tasks` short / full (`task_ids`) entries, context files `{name, path}`, no per-Task `projectId`; search `title`, `meaningSearch` only when not ready.
- Web: required Title field (existing style), labels from the title (`utils/projects/taskText.ts`), i18n `{title}`.
- Docs, `GLOSSARY.md` (Title, Summary), `docs/design-cases.md` (Cases 6 and 7 extended), Project Task Manager skill sentences.

## Open risks

- Hidden consumer of an empty field (ASM-001); AGY/Grok's handling of two MCP copies unknown (unchanged from today); rollback after the migration hides Tasks saved by an older build (release-note item).

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` (this folder).
- Evidence (in `evidence/`, listed in the investigation notes' supplement inventory): before sizes, first-line lengths, Task shape inventory, Codex probe excerpt.
- Follow-ups: none (`follow-ups.md` not created).

## Expected next step

Architecture review of the design against the approved requirements. On Pass, the reviewer routes to implementation per its rules; findings return to the Solution Designer.

## Route record

- 2026-10-25: `get_handoff_rules` → `/software_engineering_team/architecture_reviewer` (Large/High).

## SR-008 delta (2026-10-25)

- Architecture review ARCH-REV-001 on SR-007: `Pass` (`design-review-report.md`; AR-001–AR-004 went to implementation as guidance; recorded, no duplicate forwarding).
- Its residual (two names for a context file inside the Project Task family) is taken into this ticket as DEC-019 / REQ-013 / AC-011: `create_task` / `update_task` acknowledgements use `attachedContextFiles: [{name, path}]`, built by the same manifest helper as full list entries. Within the user's direction; the user informed.
- Changed: `requirements-doc.md` (REQ-013, AC-011, DEC-019), `design-spec.md` (BEH-005 row, tightness check, manifest row, example), `solution-revision-record.md` (SR-008). Nothing else in SR-007 changed.
- Route: revised Large/High package → `/software_engineering_team/architecture_reviewer` for the delta.
- 2026-10-25: ARCH-REV-002 `Pass` on SR-008 (AR-005 guidance to implementation); the reviewer routed to implementation. Recorded only.

## SR-009 / SR-010 delta (2026-10-25): `get_project_task`

- Trigger: Task comment #6 ("PM + USER") and `/project_task_manager`: a read-one-Task tool in the same contract change; workers scoped, read-only. The user then decided in the Solution Designer's conversation: the tool takes the Project (`get_project_task(project_id, task_id)`); the worker's first message names `Task: <key> in Project <projectId>`; `task_ids` dropped from `list_project_tasks`; workers read only their own Task (no parent, parts or dependencies).
- Requirements: `Approved` at SR-010 (REQ-007 changed; REQ-014–REQ-017, AC-012–AC-015, DEC-020–DEC-024).
- Design: `design-spec.md` section "`get_project_task` (SR-010 addition)": caller scope from the existing `ownerOf` rule through a read-only `ownedTaskOf` on the member Task capability (renamed `MemberTaskCapability`); scope check in the manifest; native bound tool + MCP provider pass the scope; `resolveAssignment` returns `projectId`; first-message line on both saved-Task paths.
- Implementation: stopped by the user while this was decided; resumes from the reviewed package.
- Route: `/software_engineering_team/architecture_reviewer` (Large / High).
- 2026-10-25: ARCH-REV-003 `Pass` on SR-009/SR-010 (AR-007, AR-008 guidance to implementation; reviewer routed to implementation). AR-006 stated in SR-011 (a copy with several open Tasks reads only its current one). Recorded only.
