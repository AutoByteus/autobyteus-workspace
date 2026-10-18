# API/E2E Test-Case Ledger — `skill-update-notice-changed-files`

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-update-notice-changed-files`
- Scope: API-REV-001
- Last updated: 2026-10-17

## Planned Cases

| Case ID | Case | Requirement / AC | Surface | Order |
| --- | --- | --- | --- | --- |
| REPO-001 | server typecheck + unit | AC-001–004 | tsc, Vitest | 1 |
| REPO-002 | notice integration folder | AC-001, AC-002 | Vitest | 2 |
| WEB-001 | segment spec, including the new-layout case | REQ-006 | Vitest (web) | 3 |
| AGY-001 | roots + transport scripted E2E | REQ-007, provider text | real server + scripted AGY | 4 |
| LIVE-001 | live Claude, both cases | ASM-001, REQ-007 | real model | 5 |
| DESK-001 | AC-005 on an isolated desktop: Claude busy with references-only changes; AutoByteus idle with mixed statuses; updated + removed skill if reachable | AC-005, AC-002, AC-003 | isolated desktop | 6 |
| OBS-001 | Markdown-significant characters in listed paths | REQ-006 (observation) | browser probe | 7 |

## Execution Events

| Seq | Case | Time | Event | Command / Config | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | WEB-001 | 2026-10-17 | Completed | new case in `SystemTaskNotificationSegment.spec.ts`; `test:nuxt --run components/conversation/segments` | pass | 9 files / 60 tests; the new case passes (label, inline code, 3 list items, separate paragraphs, no `SKILL.md`) | Pass | `api-e2e-evidence/web-segments.log` | commit |
| 2 | REPO-001, REPO-002 | 2026-10-17 | Completed | `typecheck`; `vitest run tests/integration/skill-update-notices`; `test:unit` | pass | typecheck clean; integration 21/21; unit 715 files / 5815 tests (4 files skipped) | Pass | `typecheck.log`, `notice-integration.log`, `server-unit.log` | — |
| 3 | LIVE-001 | 2026-10-17 | Completed | `RUN_SKILL_NOTICE_E2E=1 SKILL_NOTICE_E2E_RUNTIMES=claude_agent_sdk` | 2/2 | 2/2 (busy and idle with re-read; restore and delete) | Pass | `live-claude.log` | — |
| 4 | AGY-001 | 2026-10-17 | Completed | gated AGY roots + transport | 5/5 | 5/5; provider input carries ``Your skill package `roots-probe` has been updated (…)`` | Pass | `agy-roots-transport.log`, `agy/` | — |
| 5 | DESK-001 | 2026-10-17 | Completed | `iso-56926-25fc` (`--build` at `95a490ff1`); keys via `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` (dry run 9 CREATE / 0 BLOCKED, then import) and `isolated-app restart`; test-owned source `release-guide` + `style-guide`; Daily Assistant; clicks and typing; recorded | AC-005 | **Claude Agent SDK** (`claude-haiku-5-5`, busy): edited only `references/checklist.md` and `references/rollback.md` during the turn; one card about 2 s later. DOM: label "SKILL UPDATED", paragraphs (header, package sentence with folder, "Changed files:", closing line), 2 list items `(changed)`, `release-guide` as inline code, no `SKILL.md`, no `pre`. The agent re-read `references/checklist.md` (CHECK-BRAVO) and later `references/rollback.md` (ROLL-BRAVO) from folder plus relative path. **AutoByteus** (`gpt-5.5`, idle): `SKILL.md` edited, `references/new.md` added, `scripts/old.sh` deleted. No card while idle; the next message brought one card listing the three statuses with `SKILL.md` first, "Re-read …" and "Removed files are no longer available."; re-read gave RG-2; FREEZE-ALPHA. **AC-003** on AutoByteus: checklist edited and `style-guide` deleted in one batch → one card with an updated block (1 file) and "Your skill package `style-guide` is no longer available.", closing plus "Do not rely …"; answered CHECK-CHARLIE, style-guide unavailable. Claude run after both batches: one combined card (4 files, removed skill, 3 closing lines); re-read; correct answer | Pass | `api-e2e-evidence/desktop/` (`desk-001-ac005.mp4`, `d01`–`d04*`) | — |
| 6 | DESK-001 (harness) | 2026-10-17 | Note | row click did not change the selected run, so one question went to AutoByteus run B instead of Claude run A | — | run B correctly showed no new card (no pending change); resent to run A after a selection by the row label | — | `d04a-misrouted-message-to-run-b.png` | — |
| 7 | OBS-001 | 2026-10-17 | Completed | added `references/__init__.py` and `references/*draft*_notes.md`; next message on run B | observation | the card shows `references/<strong>init</strong>.py` and `references/<em>draft</em>_notes.md`, displayed as "init.py" and "draft_notes.md". The agent's text is exact. The old inline list had the same issue | Observation (follow-up candidate) | `desktop/obs-001-markdown-paths.{json,png}` | report |
| 8 | — | 2026-10-17 | Completed | cleanup; commit `e74bb1cb0` (web spec, explicit path) | owned resources removed | instance stopped (not forced), data root and vault removed, ports released; `/tmp/apar-cf` removed; the instances still listed belong to `cmc-desktop-test-app` | Pass | `desktop/isolated-stop.json` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 8
- Cases still running or not started: none
- Reconciled into the execution coverage report: `Yes`
