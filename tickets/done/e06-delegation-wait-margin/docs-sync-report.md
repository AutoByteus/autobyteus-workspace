# Docs Sync Report — e06-delegation-wait-margin

## Scope

- Ticket: `e06-delegation-wait-margin` (the founder's word during the beta v1.5.14-beta.1 release, autobyteus-538), `task_size` `Small`, `architectural_risk` `Low`, route `Direct Low-Risk` (implementation IR-001 → API/E2E API-REV-001 Pass, 95%; test-code review `Not Required`).
- Bootstrap base reference: `origin/personal` @ `53b72018ad`.
- Integrated base reference used for docs sync: `origin/personal` @ `53b72018ad`, checked by `git fetch` at delivery; it equals the ticket branch's merge-base, so nothing was merged.

## Why Docs Were Updated

- The ticket changes two product bounds in the node's Antigravity discovery (`SHORT_PROBE_TIMEOUT_MS` 3 s → 10 s, `MODELS_TIMEOUT_MS` 15 s → 30 s) besides E06's test waits. One long-lived doc named the old 3 s bound as its example.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Names Antigravity's `--help` probe time-out as an example of an ordinary per-command time-out | Updated | "Antigravity's 3 s `--help` probe" → "Antigravity's 10 s `--help` probe" (line 201). |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | The Antigravity runtime's discovery section | No change | It says "bounded `--help` validation followed by `models`" and "one bounded" discovery, with no numbers; still true. Line 293 ("AGY turns have no idle timeout") is about turns, not discovery. |
| `TESTING.md` | The release smoke and E2E rules | No change | No command, suite or gate changed; E06 stays in the same file and the same smoke step. |
| `RELEASE.md` | Finalization rules | No change | Followed as written. |
| `DESIGN.md` | Project design rules | No change | Two constants and a test's waits; no rule touched. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Correction | The example bound is now 10 s | The code's bound changed in `b1b95ea158` |

## Out-Of-Scope Findings

- None.
