# Handoff Summary: live-tool-list-updates (autobyteus-324)

- Status: verified from the evidence, with the user's waiver of the real Grok run; proven from a clean clone; finalized on `personal` and released as a beta at the user's request. The final repository and release state is in `release-deployment-report.md`.
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route.
  - Architecture review ARCH-REV-010: Pass.
  - Source review CRR-005: Pass, 9.5/10, CR-001…CR-005 resolved.
  - API/E2E API-REV-002: Pass, 94%.
  - Test review CRR-006: Pass.
- Revisions: SR-010 / IR-004 / API-REV-002 / CRR-006 / DR-001.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates`, branch `codex/live-tool-list-updates`.

## What Changed

The user's outcome: "when tool change, user does not have to stop manually the agent or team, they send message directly and it will work".

- A running agent takes its definition's new tool list:
  - AutoByteus (`Agent.replaceTools`), Claude and Antigravity at once;
  - Codex and Grok at the next message, by reopening the runtime session with the new config and keeping the conversation;
  - a stopped run when it is restored.
- Each run gets a platform notice and a "Tools updated" card. A removed tool is refused ("Tool is not enabled for this session") and is not offered again. A save without a tool change does nothing.
- A failed Codex/Grok reopen leaves the triggering message unsent and shown as a failed message (one shared `createUnsentInputFailureObserver`, single runs and Team members). The next message retries. No other run or Team member is touched.
- The agent-tools MCP session is always active, with live exposure and a held GET stream, and one change signal covers every agent-definition change.
- Docs: `tool_list_updates.md` (new) and five server module docs, the web architecture doc, and (delivery) `autobyteus-web/docs/agent_management.md`.

## Integration And The Clean-Clone Proof

- Merge: `origin/personal` @ `e82d03b0f9` (v1.5.11-beta.1, the autobyteus-149 release smoke check) merged as `6fae6761d3`, with no conflicts. `autobyteus-web/package.json` was changed on both sides, in different lines (the version bump and the new `test:e2e:tool-list-updates` script), and both are kept.
- Clean clone of `6fae6761d3`, set up in this order:
  1. `pnpm install --frozen-lockfile`;
  2. build the workspace dependencies;
  3. reinstall;
  4. build Brief Studio.

  Results (`evidence/DEL-*.log`):

  | Check | Result |
  | --- | --- |
  | DEL-01 server typecheck | exit 0 |
  | DEL-02 server unit (`tests/unit tests/app-data-migrations tests/architecture tests/agent-work-journal`) | 7,335 passed, 1 failed, 9 skipped (see below) |
  | DEL-02b architecture rerun | 54/54; the check itself passes in 2 s |
  | DEL-03 server integration (`test:integration:prepare` + `test:integration`) | 461 passed, 69 skipped, 0 failed |
  | DEL-04 autobyteus-ts unit | 2,082/2,082 |
  | DEL-05 web full suite (rerun after DEL-06 generated `.nuxt`) | 668 files; 4,860 passed, 2 skipped (packaged-output checks) |
  | DEL-06 web typecheck | production 0; test files at the 298/139 baseline; PASS |
  | DEL-07 web guards | Passed |
  | DEL-08 `tool-list-reopen-failure.e2e` (API-05's real-server case) | 1/1 |
  | DEL-09 browser probe `test:e2e:tool-list-updates` (TLU-001, API-06's case) | 1 Pass, 0 Fail |

- The one failed server unit test was `tests/architecture/tracked-imports.test.ts`, which timed out at 5107 ms against the 5000 ms default. That run shared the machine with a smoke run started by mistake and stopped (see the release report). Alone the test took 3,222 ms. This is not a defect of this change; FU-005 records the thin time margin.
- The first web run failed all 668 files at setup ("Cannot find module './.nuxt/tsconfig.json'"), because the web typecheck that generates `.nuxt` had not run yet in the fresh clone. It was rerun after the typecheck (DEL-05).

## Verification From Evidence

- Real runs, one per runtime (`evidence/real-runs/README.md`, `evidence/api-e2e/API-03-codex-live-run.log`):
  - AutoByteus native, Claude and Antigravity pass: the new tool works, the codeword is quoted and the removed tool is refused.
  - Codex passes: the "Now available: list_project_tasks." notice, the new tool works, "DONE-2 OKAPI-8545" quotes turn 1, the removed tool is no longer offered.
- AC-002 for **Grok: no real run (API-04), waived by the user** (2026-10-29: "for grok, i can accept that"). The account is at its free usage limit; turn 1 stalled before any tool change. Grok's reopen is proven through the real server with a test agent (API-05, rerun as DEL-08).
- AC-007 (failed reopen): API-05 and DEL-08; Team members by integration (`team-member-reopen-failure`).
- AC-001/003/006 in the app (API-06, rerun as DEL-09).
- AC-004/005/008: API-01/02/03.

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

- FU-001 and FU-002: from the design.
- FU-003: closed.
- FU-004: a card's position after a reload; cosmetic, in existing replay code.
- FU-005 (new, delivery): the tracked-imports architecture test's thin time margin.
- Owed after release: API/E2E's real Grok run (API-04) when the credit returns. API/E2E planned it; the user's waiver means the release does not wait for it.

## Release

- Decision: beta, at the user's request ("if everythign good, release a new beta please"), with Grok waived.
