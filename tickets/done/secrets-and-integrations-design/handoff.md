# Handoff — autobyteus-244: MCP server secrets in the vault (SR-008, after code review CRR-001)

- From: Solution Designer (run `solution_designer_9a83b5676cdb4488a7e25094626f527c`)
- To: Architecture Reviewer, for a focused round on SR-008
- Date: 2026-10-26
- Task: `autobyteus-244`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design`
- Branch: `codex/secrets-and-integrations-design`. Implementation was reviewed at `90c21a7cdb`; the review artifacts are in `dba930bb54`.
- Ticket folder: `tickets/in-progress/secrets-and-integrations-design/`

## What is asked

Review the SR-008 revision of `design-spec.md`: section "SR-008 Revision" and the lines it changed.
- It answers code review CRR-001: CR-001 and CR-002 (Design Impact) and CR-003 (Requirement Gap). CR-004 is an implementation Local Fix.
- Classification is unchanged: Large / High.
- Everything else in SR-007 (ARCH-REV-002 Pass) and the implementation the code reviewer confirmed as sound stays as it is.

## Decisions (made by the Solution Designer under the user's standing direction, 2026-10-26; the user is informed)

| Finding | Decision | Changed design lines |
| --- | --- | --- |
| CR-001 | Only the move writes backups, and its result already reports `backupPath`. `provider.update` writes none. In the form, an unchanged stored plain row offers "Move to vault" (the per-row move) instead of a lock toggle. A new or changed value can still be locked (`newSecret`, which replaces the old value like any edit, so no backup) | Decisions ("Plain → reference via the form"); DS-001 step 4; Provider interface row |
| CR-002 (MDEC-006) | The banner shows only unreviewed candidates. Reviewed means unticked in the dialog, "Keep as they are", or unlocked-and-saved in the form. The per-row hint stays. State: a per-device web preference `autobyteus.mcp.secretReview.<node key>` with one owner, `mcpSecretReviewState`. No migration; if it is lost, the banner shows once more | SR-008 section; Interface row "Web review state" |
| CR-003 (MDEC-007) | An imported reference is `keep` when the same server holds the same reference at the same field. Otherwise it becomes `missingSecret`: a fresh empty reference, state MISSING, "needs secret", listed in `needsSecret`. A foreign reference is never adopted, so no entry is ever shared | DS-001 import; `DraftValue`; Import result row |
| CR-004 | Delete the three uncollected `*.test.js` twins (implementation) | — |

## Documents

- `design-spec.md` (SR-008)
- `requirements-doc.md` (MDEC-006 and MDEC-007 added; MREQ unchanged)
- `solution-revision-record.md` (SR-008)
- `code-review-report.md` and `code-review-revision-record.md` (CRR-001)
- `design-review-report.md` (ARCH-REV-002)
- `implementation-handoff.md`
- `follow-ups.md` (FU-001…FU-006)

## After review

If it passes, implementation applies CR-001…CR-004, then the work returns through code review and API/E2E.

## Constraints in force

- Dummy values only.
- The real GitHub test token is used only through the test vault, in the gated live check. Never print it.
- Never touch the user's `~/.autobyteus` data or the running app.
- No change to the user's plain `mcps.json` values without his approval and a backup.
- No release unless the user asks.
