# Handoff Summary — cross-scope-agent-mentions

## Status

- Delivery state: **Delivery completed (DR-005).** User verified on 2026-10-01: "finalize and release a new beta version."
  - The ticket is archived and finalized into `personal` (`d057801c8`, record commits after it).
  - `v1.4.92-beta.5` is fully published: desktop (macOS, Windows, Linux with updater files), Android, iOS TestFlight and Server Docker.
  - The first desktop attempt failed at Apple notarization because of an unaccepted Apple Developer Program License Agreement. The user accepted it, and the rerun of the failed jobs succeeded (DR-004 → DR-005).
  - **R-1:** the user gave no separate instruction, so delivery applies its stated recommendation: the host-label casing is accepted as-is.
  - DR-002 added the desktop evidence (API-REV-004, CRR-008).
  - DR-003 closed OBS-D3: a manual user click, not a product issue.
  - Code and docs are unchanged since DR-001.
- Classification (unchanged by delivery): `task_size=Large`, `architectural_risk=High`. Route: reviewed (Solution Designer → Architecture Review → Implementation → Code Review → API/E2E → test-code review → Delivery).
- Review chain on the final candidate:

  | Stage | Revision | Result |
  | --- | --- | --- |
  | Requirements | SR-008 (RD-004 as REQ-014/AC-016) | User-approved 2026-10-01 |
  | Design | SR-010 | Architecture review ARCH-REV-004 Pass |
  | UI/UX | VIS-001–015 (`…/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`) | User-confirmed 2026-10-01 |
  | Implementation | IR-004 @ `bcff48200` | — |
  | Source review | CRR-005 (round 5) | Pass, 9.3/10 |
  | API/E2E | API-REV-002 (+ API-REV-003, TR-001 fix; API-REV-004, real desktop journeys) | Pass, confidence 96% |
  | Test-code review | CRR-007, CRR-008 (evidence update) | Pass (TR-001 resolved) |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions` |
| Ticket branch | `codex/cross-scope-agent-mentions` @ `bcff48200` (local only, not pushed) |
| Finalization target | `origin/personal` |
| Integrated base | `origin/personal@8caa610ff`. Re-fetched twice on 2026-10-01 (DR-001 and DR-002): base has not advanced, branch is current (0 behind). No merge or checkpoint needed |
| Uncommitted, to be committed at finalization | Ticket folder, including `api-e2e-evidence/r3-desktop/` (49 files, 15 MB); API/E2E durable tests (2 added, 5 updated; see Artifacts); delivery docs sync (9 docs) |
| Not to be committed | `autobyteus-application-sdk-contracts/dist/`, `autobyteus-application-backend-sdk/dist/` (made by `pnpm prepare:shared`; currently present and untracked) |

## What Changed (for you)

1. **`@` in every live run** (standalone Agent, Team member, Org member, any child). It lists shared Agents, then shared Agent Teams, that are not already in the run. It never lists the Daily Assistant or Orgs.
2. **One collaborator per mention.** Sending adds one hosted instance to the run *before* the focused agent gets the message.
   - It shows **Offline** under the run at once, uses the run's root settings and starts on its first message.
   - A repeated mention reuses it. It is saved, restored and stopped with the run.
3. **`send_message_to` first.** The mention note tells the focused agent the collaborator's address and to use `send_message_to`.
   - Briefings and reports are Team/Org tab rows.
   - Members of a collaborator Team reach each other's instances by address (DI-001).
   - `delegate_task` to a collaborator address starts a separate extra copy.
4. **Failed add blocks the send.** Nothing is added or sent, the draft and chips stay, and the red "Couldn't add <name> to this run" notice appears (all three transports).
5. **"From <Sender>:" everywhere (RD-004).** Agent-to-agent messages show their sender, live and after reopening, in all three run kinds. Old messages without a recorded sender stay user-style.
6. **Product-wide task rows.** Member marker, no visible "Started by" line.
7. **Always-on tools.** Every user-facing agent run has `send_message_to` and `delegate_task` from turn one. Server helper runs and application-owned runs are excluded.
8. **Docs (delivery).** Three docs still described the old SR-007 model (`delegate_task`-started collaborators, "send_message_to: configured placements only"); five passages still showed the removed "Started by" line; and the `autobyteus-ts` memory docs lacked a note on sender recording. All are corrected, and residual limits are recorded. See `docs-sync-report.md`.

## Validation Evidence

- **API/E2E (API-REV-002/003), 95%:**
  - Live E2E on Claude, Codex, AGY and AutoByteus (LM Studio): LE-01 and LE-02 Pass on each.
  - Full browser probe on Claude: A01–A05, T01, T02, O01, O02, F01, P01, N01 Pass. L01/L02 are Not Applicable on Claude and Pass on AGY.
  - F01 is a real add failure, tested on all transports.
  - Persisted data: old traces and old trees reopen unchanged.
  - Repository suites (RC-01–06): failures match the base sets only.
  - Admission latency: ≤ ~1.1 s on Claude, 23–36 ms after the first Codex call, and ordinary sends to other members are not delayed.
- **Real desktop app (API-REV-004, 96%):**
  - Setup: an isolated Electron instance built from this worktree (own ports and data), the public agent package (`autobyteus-agents`) imported through Settings, Claude `haiku`. Your own AutoByteus and its data were not touched.
  - Journeys, all Pass:
    - D0: import the package.
    - D1: Daily Assistant `@` Software Engineering Team.
    - D2: solution designer `@` Product Prototyper, then `@` Product Team.
    - D3: delivery engineer `@` Marketing Team.
    - BI-1…4: two-way messaging with each collaborator.
    - RESTORE: full app and server restart. The same 14 collaborator rows come back Offline, all 7 conversations are unchanged, and RS-1…4 messaging works in both directions.
  - Evidence: `api-e2e-evidence/r3-desktop/`. The `*-error.png` files are earlier driver retries that show correct product states.
- **Delivery:** the base did not advance, so no executable rerun was needed (rationale in `release-deployment-report.md`). The delivery edits are documentation only.

## Verification Requested From You

Answered 2026-10-01: verified; finalize and release a new beta. R-1 accepted as-is (no separate instruction; delivery's recommendation applies). Original questions kept below.


1. **Try it** (optional). API/E2E has now exercised the real desktop app (see Validation Evidence), so your own check is a final look, not the only desktop proof. Options:
   - Run `pnpm dev` in the worktree. It uses its own data under `<worktree>/.autobyteus/development`, not `~/.autobyteus`.
   - Run `pnpm isolated-app start --build`.
   - I can build a desktop app from the worktree, as last time.

   Then send `@<shared agent> …` in a standalone run, a Team run and an Org run. Watch the Offline row, the `send_message_to` briefing, "From <Sender>:", the Team/Org tab rows, Stop → reopen, and a failed add.
2. **R-1 (cosmetic).** In a standalone run's collaborator view, the Team tab names the host "research assistant"; VIS-013 shows "Research Assistant". Accept as-is (delivery's recommendation; it comes from the shared formatter), or send it back to implementation?
3. **Release.** Do you want a new beta? It would be **1.4.92-beta.5** (current `personal` is 1.4.92-beta.4), made with `scripts/desktop-release.sh beta` and a tag push. Or should I finalize into `personal` only?

## Residual Risks / Observations

- **OBS-D3: closed, not a product issue.** The focus change during desktop journey D3 came from your manual click in the desktop UI during the run (CRR-008 correction). All desktop checks pass.
- **OBS-D1:** whether a collaborator reports back unprompted depends on the agent; one re-briefing left out "report back". The explicit round trips prove messaging in both directions.
- **R-2:** an open page whose stream reconnects to a restarted server restores the root without a send, as Team streams do (AR-001). Merely viewing after Stop or reload does not restore (A05).
- **R-3:** another root can reach a *live* collaborator by exact run ID (the existing live-only rule, kept by REQ-012). An Offline one is rejected with `TARGET_AGENT_RUN_NOT_ACTIVE`. Now documented.
- **R-4:** Grok/ACP was not run live for SR-010 because of provider quota (`429`). To rerun: `RUN_GROK_E2E=1 npx vitest run tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts`. No ACP-specific code changed.
- **R-5:** application-owned runs were not exercised live; their exclusions are unit-tested.
- **Code notes (minor):**
  - C-11: the Agent root has no self-delegation guard.
  - C-15: an inert `hasTaskExecutionAt` is left in `collaborator-root-port-resolver.ts`.
  - The Event Monitor "earlier events" page still shows deliveries user-style (documented).
- **Data:**
  - Downgrade: an older build rejects trees whose collaborator entries carry run IDs.
  - No migration (SR-007 shapes were never released).
  - Old traces without a sender stay user-style.
  - Pre-existing: one malformed Agent-root package blocks new standalone runs. The Agent-root location service reads every package strictly; this is in the implementation handoff's Known Risks.
- **Size watch:** `memory-manager.ts` is at 500 effective lines and `root-team-run.ts` at 495 (limit 500).

## Artifacts

(`…` = `tickets/done/cross-scope-agent-mentions` on `personal`, e.g. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/cross-scope-agent-mentions` once that checkout is updated. The ticket worktree is removed at cleanup.)

- Requirements and design:
  - `…/requirements-doc.md`, `…/investigation-notes.md`, `…/design-spec.md`
  - `…/solution-revision-record.md`, `…/architecture-design-handoff.md`
  - `…/product-design-request-handoff.md`, `…/product-design-revision-request-handoff.md`, `…/design-history/`
- Architecture review: `…/design-review-report.md`, `…/architecture-review-revision-record.md`
- Implementation: `…/implementation-handoff.md`, `…/implementation-revision-record.md`, `…/implementation-evidence/`
- Source and test-code review: `…/code-review-report.md`, `…/code-review-revision-record.md`, `…/api-e2e-test-review-report.md`
- API/E2E:
  - `…/api-e2e-coverage-investigation.md`, `…/api-e2e-execution-coverage-report.md`
  - `…/api-e2e-test-case-ledger.md`, `…/api-e2e-revision-record.md`, `…/api-e2e-evidence/`
- Delivery: `…/docs-sync-report.md`, `…/release-notes.md`, `…/release-deployment-report.md`, `…/delivery-revision-record.md`, this `handoff-summary.md`
- Durable tests:
  - Added: `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts`, `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (`pnpm test:e2e:cross-scope-agent-mentions`).
  - Updated:
    - `autobyteus-server-ts/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts`
    - `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts`
    - `autobyteus-server-ts/tests/fixtures/grok-acp/fake-acp-agent.mjs`
    - `autobyteus-server-ts/tests/skill-improvement/skill-improvement-improver-session-service.test.ts`
    - `autobyteus-web/package.json`
- Product Design: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-001–015)
