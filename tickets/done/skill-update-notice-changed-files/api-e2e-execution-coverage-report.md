# API/E2E Execution Coverage Report — `skill-update-notice-changed-files`

## Execution Round Meta

All `…/` paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-update-notice-changed-files/tickets/in-progress/skill-update-notice-changed-files/`.

- Upstream package:
  - `requirements-doc.md` (SR-001), `investigation-notes.md`, `solution-revision-record.md`, `solution-handoff.md`, `design-spec.md` (SR-001);
  - `implementation-handoff.md` (IR-001), `implementation-revision-record.md`, `implementation-evidence/`.
- Design and code review: `N/A — not applicable` (direct route, Small/Low).
- API/E2E artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, `api-e2e-evidence/`.
- Revision `API-REV-001`; round 1; trigger IR-001.
- Code under test: `codex/skill-update-notice-changed-files`:
  - source and tests: `a059e210f`;
  - ticket records: `95a490ff1`;
  - this round's test commit: `e74bb1cb0`;
  - base: `origin/personal@cba5563a5d`.

## Routing Classification

- Small / Low; direct route; successful output goes to delivery.
- Proportional test-code review: `Not required` by policy.

## Investigation And Execution Basis

- Investigation written before test changes: `Yes`. Plan followed: `Yes`.
- User constraints (2026-10-17):
  - no Codex runs;
  - use the Claude Agent SDK and AutoByteus runtimes;
  - API keys only through `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` into a test vault.
- The imported Anthropic key has no credit, so AutoByteus ran OpenAI `gpt-5.5`.

## Test-Case Ledger Reconciliation

- Reconciled: `Yes`; last event 8; nothing running.

| Case | Result | Evidence |
| --- | --- | --- |
| WEB-001: web segment spec, including the new-layout case | Pass (9 files / 60 tests) | `web-segments.log` |
| REPO-001: server typecheck + unit | Pass (clean; 715 files / 5815 tests) | `typecheck.log`, `server-unit.log` |
| REPO-002: notice integration folder | Pass (21/21) | `notice-integration.log` |
| AGY-001: roots + transport scripted E2E | Pass (5/5) | `agy-roots-transport.log` |
| LIVE-001: live Claude, both cases | Pass (2/2) | `live-claude.log` |
| DESK-001: AC-005 (plus AC-002, AC-003) on an isolated desktop | Pass | `desktop/` |
| OBS-001: Markdown-significant file names | Observation | `desktop/obs-001-*` |

## Changed Boundary And Evidence Matrix

| Requirement / AC | Boundary | Evidence | Result |
| --- | --- | --- | --- |
| AC-001 (REQ-001–003, REQ-006) | builder text → card | unit and integration exact text (implementation); desktop, Claude, references only: package sentence with folder once, "Changed files:", 2 `(changed)` items, closing line, no `SKILL.md` | Pass |
| AC-002 | diff status → text → card | desktop, AutoByteus: `SKILL.md (changed)` first, `references/new.md (added)`, `scripts/old.sh (removed)`, plus the removed-files line | Pass |
| AC-003 | several blocks | desktop, AutoByteus: updated block plus the `style-guide` "no longer available" block, closing plus "Do not rely …" | Pass |
| AC-004 | cap | unit (implementation) | Pass |
| AC-005 (REQ-006, REQ-007) | real app | one card per change per run. Busy on Claude: the card about 2 s after the edit, inside the turn. Idle on AutoByteus: nothing until the next message, then one combined turn. A Claude run idle through two batches got one combined card. Header and label unchanged; Markdown renders paragraphs and lists | Pass |
| ASM-001 | agent behavior | Claude re-read `references/checklist.md` and `references/rollback.md`; AutoByteus re-read `SKILL.md`, `references/new.md` and `references/checklist.md`; all answers correct | Holds |
| REQ-007 (all runtimes) | provider input | scripted AGY 5/5 (roots, busy, idle, restore, GitHub generation); live Claude 2/2 | Pass |

## Broader Validation Decision And Execution

- `Required`, executed: isolated instance `iso-56926-25fc` built at `95a490ff1`.
- Keys: importer dry run (9 CREATE, 0 BLOCKED), then the confirmed import, then `isolated-app restart`.
- Test-owned skill source `/tmp/apar-cf/skills` (`release-guide`, `style-guide`). Daily Assistant (all installed skills). Clicks and typing; recorded (`desktop/desk-001-ac005.mp4`).
- Card DOM captured as JSON (`d01`–`d04`) with screenshots.
- Harness note: once, a row click did not change the selected run, and a question went to the AutoByteus run instead of the Claude run. That run correctly showed no new card. The question was then resent to the Claude run (ledger event 6).

## Observation OBS-001 (follow-up candidate, not a failure of this ticket)

- **What happens:** listed file names containing Markdown emphasis characters render altered in the card.
  - `references/__init__.py` shows as "references/init.py", in bold.
  - `references/*draft*_notes.md` shows as "references/draft_notes.md", in italics.
- **Scope of impact:** the agent receives the exact text, so only the user-facing card is affected.
- **Why it isn't counted as a failure:** the behavior predates this ticket (the old inline list had it too), and the card's design and rendering are out of scope (requirements § Out Of Scope).
- **Possible fixes, which are a product choice:**
  - render the file paths as inline code in the builder (this changes the normative text);
  - or escape them in the card renderer.
- **Recommendation:** a follow-up Task for the Project Task Manager.

## Durable Coverage Changed

| Path | Change | Owner / Commit | Result |
| --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` | Added the new-layout case. The old-wording sample is kept for history replay | API/E2E, `e74bb1cb0` | Pass |
| Server unit, integration and E2E notice tests | Updated to the new text | implementation, `a059e210f` | Pass |

## Temporary Execution Methods And Cleanup

- Isolated instance: stopped (not forced); data root, database and vault removed; ports released.
- `/tmp/apar-cf` removed.
- The instances still listed belong to `cmc-desktop-test-app` and were left alone.

## Dependencies Mocked Or Emulated

- Scripted AGY CLI in the gated E2E. Desktop and live runs use real models and real files.

## Validation Confidence Scorecard

| Category | Score | Basis / Residual |
| --- | --- | --- |
| Requirement and AC proof | 96% | every AC directly proven; AC-005 on two runtime classes |
| Changed-boundary directness | 96% | exact provider text (AGY), card DOM, agent behavior |
| Integration realism | 95% | packaged app, real models, real files |
| Environment fidelity | 93% | macOS only; Codex and Grok not run (user constraint, and not required for a text change) |
| Failure / lifecycle / recovery | 93% | removed skill, removed files and restore (live Claude) covered |
| User surface | 94% | card verified; OBS-001 is a pre-existing display edge |
| Durable regression | 95% | new web layout test; server text tests from the implementation |

- Overall **95%**; every category ≥ 93%.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Broader validation: `Required`, executed (desktop AC-005 on the Claude Agent SDK and AutoByteus)
- Critical acceptance criteria lacking direct proof: none
- Residual risks:
  - Codex was not run, by the user's direction;
  - Grok was not run;
  - OBS-001, a follow-up candidate.
- Next: delivery (direct route).
