# Handoff Summary — mention-candidates-in-run

## Status

- Delivery state: **The user verified on 2026-10-06 ("finalize and release a new beta"); see `user-verification-record.md`.** Finalization into `personal` and one new beta are in progress; the outcomes are recorded in `release-deployment-report.md` (DR-002).
- Classification (unchanged): `task_size=Medium`, `architectural_risk=Low`.
  - Route: direct low-risk (Solution Designer → Implementation → API/E2E → Delivery).
  - Architecture review, source review and test-code review: `N/A — not applicable`.

| Stage | Revision | Result |
| --- | --- | --- |
| Requirements / design | see `solution-revision-record.md` | User-approved; REQ-001..REQ-006, AC-001..AC-008 |
| Implementation | IR-001 (`e08c4a8c5`) | Done |
| API/E2E | API-REV-001 | Pass, 95.3% |
| Delivery | DR-001 | Current with the base, docs synced, awaiting verification |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run` |
| Ticket branch | `codex/mention-candidates-in-run` (local, not pushed) |
| Finalization target | `origin/personal` |
| Validated candidate | `e08c4a8c5` on `f48dbfbf3`, plus delivery checkpoint `ee8d0b6f0` (API/E2E tests, `TESTING.md`, artifacts) |
| Integrated base | `origin/personal@f48dbfbf3`, unchanged since bootstrap, so no merge was needed |
| Delivery checks | A contracts rebuild and test pass 12/12 with 0 `dist/` drift. Server: collaborator units and resolver pass 5 files / 35 tests; the gated wire E2E (ad-hoc delegation step 6b and task-closure visibility) passes 6/6. Web: mention, collaborator, chat and agentInput specs pass 18 files / 119 tests. Logs are in `delivery-evidence/`. |
| Not committed (by design) | SDK `dist/` build folders |

## What Changed (for you)

1. The `@` menu in a live run now lists eligible shared Agents and Teams that are **already in the run**: collaborators and a Team or Org's shared configured members. Only the run's own definition is left out. Built-ins, Agent Orgs, team-local definitions and application-owned runs are unchanged.
2. Mentioning one is accepted and resolves to its in-run address. The note says `… at /address, already in this run` and tells the agent it can message that instance with `send_message_to` or start a separate copy with `delegate_task`. Nothing is added to the tree. Notes with no in-run mention are unchanged, and saved notes of every form still show as chips.
3. New chat for a Team lists its members too.
4. The menu copy is now "Delegate to an agent or team" and "{agent} gets your message and delegates the work" (en and zh-CN). The placeholder is unchanged.
5. Agent-initiated bring-in and `list_available_agents` are unchanged, so no duplicate collaborator is ever created.

## Verification Evidence

- API/E2E `api-e2e-execution-coverage-report.md`:
  - Wire E2E for all three root kinds.
  - Live Claude probe: 19 Pass, 2 N/A (AGY-only). This includes S01, your reported case: the real agent messaged the existing collaborator.
  - A human-style desktop journey in en and zh-CN; its video is in `api-e2e-evidence/`.
- Delivery docs fix: three docs still said collaborators are "brought in with `@`" (stale since beta.6), and they are corrected (`docs-sync-report.md`).

## Suggested Checks For You

1. In a run where an agent already brought in a collaborator (for example Agent Package Creator), type `@Agent`. It should be listed. Send `@Agent Package Creator …`: no new row should appear, and the agent should message the existing one.
2. Start a New chat with a Team and type `@`. Its members should be listed.
3. Check the `@` menu header and footer wording (also in Simplified Chinese, if you like).

## Residual Risks / Non-goals

- Accepted by design: the menu offers the focused member's own definition (for example Research Assistant while it is focused).
- The footer uses the member's run name ("research_assistant gets your message…"), as before.
- Whether the agent messages the existing instance or delegates a copy is the model's choice. Claude messaged the existing instance in all live checks.
- Not run: AGY-only probe cases L01 and L02, and the AutoByteus runtime (no keys). The change does not depend on the runtime.
- Two test files fail identically at base `f48dbfbf3`: `org-owned-team-local-agent.test.ts` and `workspaceSelectionComposition.spec.ts`.

## Pending After Your Verification

Archive the ticket to `tickets/done/`, commit and push, merge into `origin/personal` and push, release only if you ask for one, then clean up the worktree and branch.
