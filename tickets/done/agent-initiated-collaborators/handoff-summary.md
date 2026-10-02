# Handoff Summary — agent-initiated-collaborators

## Status

- Delivery state: **User verified on 2026-10-02**: "the task is done. i have tested. it works. lets finalize and release a new beta". The ticket is archived, finalized into `personal` and released as a new beta; see `release-deployment-report.md` for the final state.
- Classification (unchanged by delivery): `task_size=Large`, `architectural_risk=High`. Route: reviewed (Solution Designer → Architecture Review → Implementation → Code Review → API/E2E → test-code review → Delivery).
- Review chain on the final candidate:

  | Stage | Revision | Result |
  | --- | --- | --- |
  | Requirements | SR-007 (REQ-012/AC-013 added) | User-approved 2026-10-01 |
  | Design | SR-007 | ARCH-REV-005 Pass |
  | Implementation | IR-003 (`e2c658e3d`) | — |
  | Source review | CRR-006 (round 5) | Pass, 9.3/10 |
  | API/E2E | API-REV-003 | Pass, 96% |
  | Test-code review | CRR-007 | Pass |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators` |
| Ticket branch | `codex/agent-initiated-collaborators` (local only, not pushed) |
| Finalization target | `origin/personal` |
| Reviewed candidate | `00331b428` + uncommitted API/E2E tests and ticket artifacts. Delivery checkpoint `023279097` holds it, without the generated SDK `dist/` |
| Integrated base | `origin/personal@314b5a976`: 15 commits — the context-compaction simplification and recovery, plus the beta.6 and beta.7 releases. Merge commit `118758927` |
| Merge conflicts | Only 7 generated source maps in two contract `dist/` folders. Resolved by rebuilding all three contract packages from the merged sources. All source files merged automatically, including the 15 non-generated files both sides changed (domain, contracts, docs, tests) |
| Delivery-owned uncommitted changes | Docs sync (10 docs), delivery artifacts, `delivery-evidence/` |

## What Changed (for you)

1. **`list_available_agents` (opt-in tool).** It lists shared agents and teams with name, kind, address and description, using the `@` menu's eligibility. Addresses are deterministic; name collisions get a short hash suffix.
2. **Agent bring-in.** An agent's first `send_message_to` to a listed address adds that agent or team as a collaborator, with the same admission as `@`, and delivers. `@` and agent bring-in share one instance.
3. **Catalog copies.** `delegate_task` to a listed address starts a fresh copy each time. A copy is never a collaborator, records its `source`, and restores from it.
4. **One unit (REQ-007).** Inside any team instance, team addresses resolve within that instance. *Behavior change:* an Org copy of a mounted team no longer reaches the mounted team.
5. **Placement by address (REQ-012).** *Behavior change:* a copy of a top-level address now appears at the top level, even when a mounted team's member started it. Old runs keep their placement.
6. **Wording (REQ-009).** The prompt and tool descriptions say "the one instance at an address, brought in on first use" and "every `delegate_task` spawns a new copy".
7. **Docs (delivery).**
   - Corrected the C-01 premise: concurrent first messages are serialized by the per-root `CollaboratorAdmissionQueue`, not by the gate.
   - Rewrote the stale `agent_tools.md` delegation and messaging text.
   - Updated the `prompt_engineering.md` prompt example, now verified identical to the source.
   - Documented the persisted `source` in `run_history.md`.
   - Updated the web docs for agent-initiated collaborators and catalog copies.
   - Recorded the limits: `source` downgrade and C-11.

   See `docs-sync-report.md`.

## Validation Evidence

- **API/E2E (API-REV-003), 96%.** Live runs:
  - Claude, Codex and AGY: LE-A1, A2, A3, T1, O1 (LE-F1 on Claude only).
  - AutoByteus over DeepSeek: 5/5.
  - Old stored copies reopen at their paths (8/8).
  - Desktop placement and full-restart checks pass.
  - Predecessor suites pass.
- **Delivery checks on the integrated state `118758927`.** All run in a sanitized environment (your app's `DATABASE_URL` / `AUTOBYTEUS_*` removed); logs in `delivery-evidence/`.

  | Check | Result |
  | --- | --- |
  | `prepare:shared`, Prisma generate | Pass |
  | Server production typecheck | Clean |
  | Full server typecheck incl. tests | 0 real errors (only the config-level "not under rootDir" warning for test files) |
  | Contract packages rebuilt and tested | Presentation 9/9, team 5/5. Collaboration 9 pass / 7 fail: the same 7 fail on `origin/personal` and on the pre-merge ticket |
  | Server unit suite (4,146 tests) | 95 failures in 30 files, **all 95 also fail on `origin/personal`** → 0 regressions. The pre-merge ticket had 72 of them; the other 23 came with the base's compaction work |
  | Web specs for affected areas (158 files, 1,292 tests) | 3 failures, all also failing on `origin/personal` |
  | **Live E2E on the merged state (Claude)** | LE-A1, A2, A3, T1, O1, F1: **6/6 Pass** (278 s), across the Agent, Team and Org roots |
- **Secret hygiene.** The DeepSeek key value was searched for literally (without printing it) across the ticket folder, tests, docs and every commit on the branch: no match.

## Verification Requested From You

Answered 2026-10-02: tested by the user and verified; finalize and release a new beta. Original questions kept below.


1. **Try it (optional).** Run `pnpm dev` or `pnpm isolated-app start --build` from the worktree. Then:
   - give an agent `list_available_agents` and ask it to find and brief a team;
   - have it delegate two parallel copies;
   - check the rows, the Team/Org tab, "From <Sender>:", and Stop → reopen.
2. **Release.** A new beta would be **1.4.92-beta.8** (current `personal` is 1.4.92-beta.7). Or should I finalize into `personal` only?

## Residual Risks / Observations

- **Grok/ACP not live** (quota). It shares the Agent Tools MCP catalog verified on Codex, Claude and AGY.
- **Instruction-content checks run live on Claude only** (only Claude emits `SYSTEM_INSTRUCTIONS_SUPPLIED`); the shared prompt composer is unit-pinned.
- **Pre-existing base failures** need a separate cleanup ticket, e.g.:
  - server: `team-run-model-selection-save.test.ts`, `application-framework-boundaries.test.ts`, and the other base-failing files in `delivery-evidence/failing-tests-origin-personal.txt`;
  - contracts: the 7 collaboration-contract tests;
  - web: 3 specs.
- **Size watch.** `agent-org-run.ts` (480) and `agent-run-collaboration-root.ts` (471) are near the 500-line limit.
- **C-11.** A collaborator in an Agent root can delegate to its own address (an extra copy; harmless). Now documented.
- **Downgrade.** An older build ignores `source`, so it can't restore catalog copies (unsupported).
- **Claude auto-approves Agent Tools** (carried O-6). The SDK warns that `canUseTool` is shadowed for `send_message_to` / `delegate_task`.

## Artifacts

(`…` = `tickets/done/agent-initiated-collaborators` on `personal`, e.g. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-initiated-collaborators` once that checkout is updated; the ticket worktree is removed at cleanup)

- Requirements and design:
  - `…/requirements-doc.md`, `…/investigation-notes.md`, `…/design-spec.md`
  - `…/solution-revision-record.md`, `…/architecture-design-handoff.md`
- Architecture review: `…/design-review-report.md`, `…/architecture-review-revision-record.md`
- Implementation: `…/implementation-handoff.md`, `…/implementation-revision-record.md`, `…/implementation-evidence/`
- Source and test-code review: `…/code-review-report.md`, `…/code-review-revision-record.md`, `…/api-e2e-test-review-report.md`
- API/E2E: `…/api-e2e-coverage-investigation.md`, `…/api-e2e-execution-coverage-report.md`, `…/api-e2e-test-case-ledger.md`, `…/api-e2e-revision-record.md`, `…/api-e2e-evidence/`
- Delivery:
  - `…/docs-sync-report.md`, `…/release-notes.md`, `…/release-deployment-report.md`
  - `…/delivery-revision-record.md`, `…/delivery-evidence/`, this `handoff-summary.md`
- Durable tests:
  - `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (new);
  - `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` (updated).
- UI reference (reused): `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`
