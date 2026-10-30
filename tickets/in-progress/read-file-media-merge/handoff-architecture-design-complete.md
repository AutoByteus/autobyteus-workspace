# Handoff — Architecture Design Complete — read-file-media-merge (autobyteus-328)

- Result: `Architecture Design Complete`; `task_size` Medium, `architectural_risk` Low (design-spec § Task Size And Architectural Risk); direct implementation route.
- Task `autobyteus-328` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager`; the user's decision in autobyteus-327 (option (a)).
- SR: `SR-003`. Requirements approved by the user (SR-002, 2026-10-29).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/read-file-media-merge`, branch `codex/read-file-media-merge`, base `origin/personal` `e82d03b0f9`; finalization target `origin/personal`. No commits yet; the ticket folder `tickets/in-progress/read-file-media-merge/` is untracked.

## Request and goals

Make `read_file` read images, audio and video (as a context file the next turn sees) as well as text, and remove `read_media_file`; one path rule with the denied paths; refuse media the model cannot take (all three kinds), line ranges on media and empty media; Work Journals keep history; Daily Assistant updated. Native AutoByteus runtime only.

## Approval basis and scope changes

- The user (2026-10-29) moved two Task items out of this ticket: no migration of stored agent definitions, and the public packages are updated in another ticket (DEC-001, DEC-002). The Task carries a comment saying so.
- Every other decision: requirements-doc § Decisions.

## What to build

`design-spec.md` § Final File Responsibility Mapping and § Change / Refactor Sequence. Start from the failing reproduction: a PNG through `read_file` returns garbled lines (`autobyteus-327/investigation-notes-327.md`, SD-01). Hand over in the implementation handoff the 16 package files and their replacement wording (design-spec § Guidance).

## Open risks

AC-001 (text reads byte-identical); old skills with workspace-relative media paths get the shared rule's message until the packages change.

## Follow-ups (sent by the Solution Designer when the ticket leaves the team)

`follow-ups.md` FU-001, FU-002.

## Route record

- `get_handoff_rules` (2026-10-29): Medium / Low → `/software_engineering_team/implementation_engineer`.

## Revision SR-005 (2026-10-30), answering CRR-001/CRR-002

- CR-001 root cause proven: OpenAI Responses treats an omitted `strict` as `true`, so GPT-5 fills every optional tool argument (`evidence/SD-02-openai-strict-probe-run2.json`: strict omitted 8/8 calls fill all; `strict: false` image reads send only `path` 4/4). Fix in this ticket (the user's DEC-005): `openai-responses-llm.ts` `normalizeTools` sends `strict: false` (REQ-010, AC-010). BEH-004's line-range refusal for media stays, its message saying the file was not loaded.
- CR-002: whole-buffer NUL scan (DEC-006). CR-003: article fix. `start_line`/`end_line` descriptions improved (design-spec § Final File Responsibility Mapping).
- Classification unchanged: Medium / Low. Route record: same rule → `/software_engineering_team/implementation_engineer`.
