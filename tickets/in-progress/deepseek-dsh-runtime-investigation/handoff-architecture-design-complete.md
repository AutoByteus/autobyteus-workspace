# Handoff — Architecture Design Complete (autobyteus-387, SR-002)

## Result

- Classification: `Architecture Design Complete`
- `task_size`: `Large`; `architectural_risk`: `High` (design spec, Task Size And Architectural Risk)
- Route: independent architecture review (`/software_engineering_team/architecture_reviewer`), per the handoff rule for Large or High.

## Original Request And Direction

- Project Task `autobyteus-387` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager`: investigate DeepSeek "dsh" as an agent runtime, ACP support, effort, proposal.
- The user then decided, in the Solution Designer conversation (2026-11-06): "But if you think like it's doable for DSH, then we do it now in this ticket." The build is therefore part of this ticket. Further user decisions are quoted in `investigation-notes.md` (Initial Request And Clarifications) and recorded as DEC-001…DEC-006 in `requirements-doc.md`.

## What dsh Is (Answer To The Task)

DeepSeek Harness (`dsh`), DeepSeek's official open-source agent program (`github.com/deepseek-ai/deepseek-harness`, MIT, developer preview), npm `@deepseek-ai/dsh` 0.2.2-rc.1, Node ≥ 24.9. `dsh --profile acp` is a standard ACP v1 server with `session/resume` (no `session/load`). Verified live against the real DeepSeek API (flash, test-vault key through a stand-in proxy): tool calls, approvals, restore, cancel, skills, Agent Tools over HTTP MCP, images, compaction (silent on ACP, visible to the proxy by header), usage from the stream, literal instructions through a plugin.

## Approval Basis

- Requirements `Approved` within the direction, user informed (requirements doc, Document Status); design approval not required by the direction.

## Package (Ticket Folder)

`/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation/tickets/in-progress/deepseek-dsh-runtime-investigation/`

- `requirements-doc.md` — BEH/REQ/AC/SCN/DEC
- `investigation-notes.md` — evidence (RT-001…RT-022), code facts with file:line
- `design-spec.md` — the design
- `solution-revision-record.md` — SR-001, SR-002
- `follow-ups.md` — FU-001 (urgent; not sent yet: sent when the ticket leaves the team)
- `probes/`, `evidence/` — reproductions and recorded frames (no key material)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation`
- Branch: `codex/deepseek-dsh-runtime-investigation`; base `origin/personal` at `3ef5e33eec`; finalization target `origin/personal`
- Code: unchanged so far (documents only).

## Open Risks For Review

- RSK-002: the compaction signal is dsh's `x-deepseek-harness-compact` header (in dsh's code, not its docs); the user accepts dsh breakage as bugs (DEC-003).
- RSK-004: dsh process memory per run is unmeasured.
- RSK-006: autobyteus-386 (Antigravity ACP) may change the same shared ACP files; the two teams resolve overlaps when they merge (Task direction).
- Shared-contract changes to the ACP launch profile and effect types affect Grok (AC-016 preserves its behavior).

## Expected Next Action

Architecture review of `design-spec.md` against `requirements-doc.md`. Route findings per the team rules: requirement or design findings return to the Solution Designer.

## Handoff Route Record

- Rules read with `get_handoff_rules` on 2026-11-06; matching rule: Architecture Design Complete with Large or High → `/software_engineering_team/architecture_reviewer`.
