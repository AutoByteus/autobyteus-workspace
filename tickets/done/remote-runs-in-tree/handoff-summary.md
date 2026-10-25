# Handoff Summary — remote-runs-in-tree (autobyteus-278)

Status: **finalized into `personal`, no release** (DR-001). **AC-807, the user's desktop ↔ Docker check, is open.**

## Ticket

- Package `remote-runs-in-tree`, Project Task `autobyteus-278`.
  - The delegating node's run tree lists each remote delegated run (Agent or Team) under its delegator, tagged with the node, with its title and status.
  - The owner opens it, sees its live conversation, messages it (marked `From the owner of node "…":`), interrupts and stops it.
  - An unreachable node shows an error with Retry, and the rest of the tree keeps working.
- Classification: `Large` / `High`, reviewed route:
  - design SR-008, ARCH-REV-005;
  - implementation IR-005;
  - code review CRR-001 … CRR-007;
  - API/E2E API-REV-003, Pass, 95%;
  - test-code review CRR-008, Pass.
- Archived: `tickets/done/remote-runs-in-tree/`.

## Integration

- The base advanced from `3b09fbe308` to `27f2d2f72d` (task-agent-several-tasks, `1.5.9-beta.2`), which touches the Task lifecycle.
- Checkpoint `da46429f47` (the reviewer's documents and FU-004 … FU-006). Clean merge `444dfc7ec2`. `collaboration_model.md` and `autobyteus-web/package.json` changed on both sides and merged correctly.
- Rerun on the merged state (`evidence/delivery/`):

| ID | Check | Result |
| --- | --- | --- |
| DEL-01 | server typecheck; `test:unit` | Pass; 801 files, 6550 passed |
| DEL-02 | web guards; `test:nuxt` | Pass; 672 files, 4801 passed |
| DEL-03 | server build; `test:integration:prepare` | Pass |
| DEL-05 | two-server E2E | Pass, 37/37 |
| DEL-06 | the base's `task-agent-several-tasks.e2e` | Pass, 4/4 |
| DEL-07 | browser probe | Pass, 7/7; no browser errors; cleanup clean |

## Verification

- **AC-801 … AC-806 proven from the evidence.** Delivery opened probe run 22 and DEL-07, the E2E receipt run 4 and DEL-05 (RC-31, RC-35 … RC-37), and the screenshot of the owner message with its heading and the live answer. Scorecard: 95%, with no category below 90%.
- **AC-807 is the user's check.** It is open. The user's standing direction is to finalize when a ticket reaches delivery: "but it reaches your place now", for autobyteus-269 on 2026-10-22.

## Release

- `No release`: the implementation handoff and `RELEASE.md`'s default. It ships with the next release.

## Residual Risks And Follow-ups

- Follow-ups in `follow-ups.md`, sent by the Solution Designer:
  - FU-001, files and terminal of remote runs;
  - FU-002, a stopped delegator's remote rows read Offline with no title;
  - FU-003, pre-existing web spec type errors;
  - FU-005, one end-of-run notion;
  - FU-006, splitting `root-team-run.ts` and `teamExecutionViewState.ts`.

  FU-004 is resolved in this ticket and is not to be sent.
- Pre-existing: the server architecture test's `SR-011 host definition` assertion on an untouched file.
