# Solution Designer Handoff — autobyteus-579 (small-follow-ups-579)

- From: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`), 2026-11-22
- Classification: `Architecture Design Complete`, `task_size = Medium`, `architectural_risk = Low`
- Solution revision: SR-001
- Approval: within the direction (the founder's word: merge the small follow-ups into one ticket); the founder was informed. No design approval needed.

## Original request

Project Task `autobyteus-579`, from `/project_task_manager`. Six merged follow-ups:

| Item | Source | Problem |
| --- | --- | --- |
| I-1 | 576 FU-001 | An unreadable file shows raw JSON in the Files viewer |
| I-2 | 576 FU-002 + 583 FU-003 | Busy-Mac server E2E default limits |
| I-3 | 576 FU-003 + 583 FU-004 | `ENVIRONMENT:` labels |
| I-4 | 583 FU-002 | The race test's fixed settle |
| I-5 | 599 FU-002 | `ENOTEMPTY` cleanup |
| I-6 | 599 FU-003 | The Claude throwaway home in TESTING.md |

Constraints: `DESIGN.md`, `TESTING.md`; synthetic data; no release without the founder's word.

## Design summary (design-spec.md)

- **I-1:** `fileContent` throws `GraphQLError` (message unchanged, with `extensions.code`) for every refusal. The web already shows query errors in the viewer's error state. The demo and three server tests follow. A file whose text is `{"error":…}` shows as text.
- **I-2:** measure each test's phases on the busy host. Then apply DEC-002 by cause:
  - OS latency: use the `os-latency-under-load.ts` limits;
  - a test's own waits: condition waits;
  - product slowness: a follow-up plus an explicit, named limit.
- **I-3:** one shared helper, `tests/helpers/os-file-event-probe.ts`, extracted from `file-system-watcher.integration.test.ts`. It runs the post-time-out raw-watch probe and gives the `ENVIRONMENT:`/`INCONCLUSIVE:` labels. It is used by the integration test, the live-refresh E2E `waitFor` and the chokidar unit test.
- **I-4:** condition waits replace `settle()`.
- **I-5:** wait for the writers to exit (the fake CLI children; the SIGKILLed server), then remove.
- **I-6:** the TESTING.md entry, written by the API/E2E engineer (DEC-003).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-579`
- Branch: `codex/small-follow-ups-579`
- Base: `origin/personal` @ `f2c0d2a902`
- Dependencies are installed.
- Ticket folder: `tickets/in-progress/small-follow-ups-579/` (uncommitted)

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`

## Open risks

- RSK-001: host load varies.
- UNK-001: the I-2 causes, measured in implementation.

## Routing record

- `get_handoff_rules`: the rule for Small or Medium with Low risk sends to `/implementation_engineer`.
- Sent 2026-11-22 to `/implementation_engineer` (run `implementation_engineer_b837a62ada2a4a38923f9ee7df199366`): DELIVERED, with the handoff and the four ticket documents attached.
