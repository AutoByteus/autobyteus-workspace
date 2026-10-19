# Implementation Handoff — `skill-update-notice-changed-files`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct implementation route (Small / Low); independent architecture review `N/A — not applicable`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-update-notice-changed-files/tickets/in-progress/skill-update-notice-changed-files/requirements-doc.md` (SR-001, approved within the direction)
- Investigation notes: `…/investigation-notes.md`
- Solution revision record: `…/solution-revision-record.md`
- Solution handoff: `…/solution-handoff.md`
- Design spec: `…/design-spec.md` (SR-001)
- Supplemental task artifacts: the user's screenshot (evidence, see the solution handoff); rendered-check screenshots in `implementation-evidence/`
- Design review report / architecture review record: `N/A — not applicable` (direct route)
- Triggering rework report: `N/A` (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `…/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Branch: `codex/skill-update-notice-changed-files` on `origin/personal@cba5563a5d` (commits in the revision record).

What exists now (`autobyteus-server-ts/src/skill-update-notices/`):

- `domain/skill-update-notice-types.ts`: the updated variant of `SkillChange` is `{ kind: "updated"; skillName; skillDir; files: readonly { path; status: "changed" | "added" | "removed" }[] }` (new `SkillFileChange`, `SkillFileChangeStatus`). `changedFiles` and `skillMdPath` are gone (clean cut).
- `services/skill-version-diff.ts`: each differing file gets its status (in current only → `added`; digest differs → `changed`; in seen only → `removed`); order unchanged (`SKILL.md` first, then by path); `skillDir` is the current folder.
- `services/skill-update-notice-builder.ts`: the notice is the unchanged header, a blank line, then one Markdown block per skill in the given order:
  - updated: ``Your skill package `x` has been updated (<skillDir>).`` / blank / `Changed files:` / `- <path> (<status>)` (at most 10) / `- …and N more files` when longer / blank;
  - removed: ``Your skill package `x` is no longer available.`` / blank;
  - then, as applicable: "Re-read the updated files before continuing work that relies on this skill." ("these skills" when more than one skill was updated), "Removed files are no longer available." (when a listed file was removed), "Do not rely on a skill that is no longer available." (when a skill was removed).
  - No `SKILL.md` path anywhere; `SKILL.md` appears only as a listed file when it changed.
- `skill-update-notice-service.ts`, delivery, the watcher, the store and the web segment are unchanged (the service already passes the change list through; it compiles against the new type without edits).
- Docs: `autobyteus-server-ts/docs/modules/skill_update_notices.md` (intro sentence, example and rules).

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed` — three source files in one subsystem, text and a local type only; no delivery, persistence, contract or web change; header byte-identical.
- Selected route: direct route → API/E2E (exact recipient from `get_handoff_rules`).
- Lightweight implementation self-review completed for the direct route: `Yes` (see below).
- New design impact or escalation trigger: `None`.

## Lightweight Implementation Self-Review (direct route)

- Ownership: wording strings only in the builder; status computed only in the diff; no other owner touched.
- Dead code: `changedFiles` and the old phrases removed; no compatibility field. `SkillChange.skillMdPath` removed as well (see deviation 1).
- Contracts: header unchanged (`SKILL_UPDATE_NOTICE_HEADER`), sender and event payload unchanged; history replay and the web label still match (unit/integration and rendered check).
- Persisted data: unaffected (`seen_skill_versions.json` stores snapshots, not change records). Notices already in history keep their old text.
- Size: builder 72 lines, diff 36 lines.

## Deviations From The Design Text (no behavior or contract change)

1. **`skillMdPath` dropped from the updated `SkillChange`.** The design's type sketch kept it, but the new text never uses it and nothing else reads it; keeping it would be a dead field (the design's own rule: no `SKILL.md` path anywhere). The snapshot type keeps `skillMdPath` (stored records unchanged).
2. **Test fixtures with sample notice text updated** (`agent-run-input-preface.test.ts`, `runtime-memory-system-task-notification.test.ts`, `native-skill-notice-history.integration.test.ts`): they pass notice text through opaquely; updated so no stale example of the old wording remains. Also `agy-skill-update-notice-transport.e2e.test.ts` and `skill-update-notice-live.e2e.test.ts` asserted the old line shape and were updated with the roots suite.

## Reviewed Behavior Implementation Trace

| Behavior | REQ / AC | Path | Result |
| --- | --- | --- | --- |
| BEH-001 | REQ-001…006; AC-001…004 | `diffSkillVersion` (status per file) → `buildSkillUpdateNoticeText` (blocks) → existing delivery | Implemented. Unit: exact text for references-only (AC-001), mixed statuses (AC-002), updated + removed skill blocks (AC-003), 25 files → 10 + "…and 15 more files" (AC-004), "these skills" / no re-read line for removal only. Integration through the service with real files: references only (exact text, no `SKILL.md`), then `SKILL.md` changed + added + removed. |
| BEH-002 | REQ-006, REQ-007; AC-005 | Unchanged delivery and presentation | Header unchanged; scripted AGY E2E 5/5 (busy, stop, idle, restore, Team/Org/copy, GitHub generation); rendered check on the dev stack (below). |

- Changes stayed within the Scope Guardrail: `Yes`.

## Key Files Or Areas

- Source: `autobyteus-server-ts/src/skill-update-notices/{domain/skill-update-notice-types.ts, services/skill-version-diff.ts, services/skill-update-notice-builder.ts}`.
- Tests: `tests/unit/skill-update-notices/skill-update-notice-parts.test.ts`, `tests/integration/skill-update-notices/{skill-update-notice-service,native-skill-notice-history}.integration.test.ts`, `tests/unit/{agent-execution/agent-run-input-preface,agent-memory/runtime-memory-system-task-notification}.test.ts`, `tests/e2e/runtime/{agy-skill-update-notice-roots,agy-skill-update-notice-transport,skill-update-notice-live}.e2e.test.ts`.
- Docs: `autobyteus-server-ts/docs/modules/skill_update_notices.md`.

## Important Assumptions

- ASM-001 (requirements): agents resolve the listed relative paths against the folder shown in the sentence. Confirmed live on Claude (see Local Checks); not run on Codex.

## Known Risks

- The notice no longer contains an absolute `SKILL.md` path; an agent that needs `SKILL.md` must join the shown folder and the file name (ASM-001). Accepted by the design (Key Tradeoffs).
- The dev-stack renderer turns `SKILL.md` in the list into a file link (existing behavior for file names); harmless.

## Local Implementation Checks Run

- Server typecheck clean.
- `tests/unit/{skill-update-notices,agent-memory,agent-execution}` + `tests/integration/skill-update-notices`: 154 files / 1611 tests pass (4 skipped).
- Scripted AGY E2E (`RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`): `agy-skill-update-notice-roots` 3/3 and `agy-skill-update-notice-transport` 2/2 pass with the new assertions.
- Live E2E, Claude only (`RUN_SKILL_NOTICE_E2E=1 SKILL_NOTICE_E2E_RUNTIMES=claude_agent_sdk`): 2/2 pass. Busy notice in the turn, then the agent re-read the changed file from the folder plus relative path (ASM-001) and answered the new codeword; idle combined turn; history with notices as system notices and user messages as typed; the stopped-run restore case. Codex was not run at the user's request (no Codex quota); a Codex run that had started was stopped before its first turn.

## Frontend Rendered-Result Check

- Where: development stack (`pnpm dev` from this worktree under `env -i` with a temp HOME and the scripted AGY CLI; development state removed afterwards). No component change; the check covers Markdown rendering of the new text (the design's named risk, AC-005 part).
- Busy run, only `references/package-anti-patterns.md` and `references/result-and-handoff-contract.md` edited: one "Skill updated" card; DOM: header, the package sentence (name as inline code, folder once), "Changed files:" and the closing line as separate paragraphs; a two-item list `… (changed)`; no `SKILL.md`. Evidence: `implementation-evidence/rendered-references-only-notice.png`.
- Idle run, `SKILL.md` edited + `references/new.md` added + `scripts/old.sh` deleted, then a message: one combined turn; list `SKILL.md (changed)`, `references/new.md (added)`, `scripts/old.sh (removed)`; closing lines "Re-read …" and "Removed files are no longer available.". Evidence: `implementation-evidence/rendered-mixed-statuses-notice.png`.
- Not done here: the isolated desktop instance (needs model access or a desktop build) and the user's check; both remain for API/E2E and delivery (AC-005).

## Downstream Coverage Hints

- AC-005 on an isolated desktop instance with a real runtime: edit a reference file of a skill used by a running agent; confirm one card with the new layout and that the agent re-reads the listed files.
- Codex live run when quota is available (`SKILL_NOTICE_E2E_RUNTIMES=codex_app_server`).
