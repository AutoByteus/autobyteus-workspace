# API-REV-009 — Isolated CR Visible-Whitespace Failure

## Result

`API-E2E-F-003` — **Fail**, preliminary implementation/product presentation origin.

## Reproduction Boundary

- HEAD: `45cb5e2be6d2bcc325eb49b386f98158663072bb`
- Actual AutoByteus `open_tab`: `4ce41d`
- Current Nuxt: `http://127.0.0.1:59124/workspace?api-rev-009=1`
- Owned packaged backend/profile: `59049`, `/private/tmp/autobyteus-api-rev-009-owned`
- TeamRun: `nested_classroom_test_team_50b47ce67a654603be2e089b7923a556`
- Fixture: private `nested-classroom-test`; `codex_app_server` / `gpt-5.6-luna`
- Journey: root workspace -> Nested Classroom Test Team -> owned TeamRun -> Teacher -> Edit Config -> expand members -> expand `/StudentStudyGroup`
- Current schema setup: temporary owned-page `type: string` catalog fields `ordinary_prompt` and `multiline_prompt`; persisted snapshot unchanged.

## Direct Observations

| Scope / Value | Exact DOM | CSS | Range Layout | Visible Result |
| --- | --- | --- | --- | --- |
| `/`, `ROOT line one\nROOT line two` | code point 10 retained | `white-space: pre-wrap` | two distinct Y values; 32px box | two lines — Pass |
| `/Teacher`, `TEACHER alpha\nTEACHER beta` | code point 10 retained | `white-space: pre-wrap` | two distinct Y values; 32px box | two lines — Pass |
| `/StudentStudyGroup`, `NESTED first\rNESTED second` | code point 13 retained | `white-space: pre-wrap` | one Y value; 16px box | `NESTED firstNESTED second` — **Fail** |
| `/StudentStudyGroup/student_one`, `STUDENT ONE alpha\rSTUDENT ONE beta` | code point 13 retained | `white-space: pre-wrap` | one Y value; 16px box | one line with no separation — **Fail** |
| `/StudentStudyGroup/student_two`, `STUDENT TWO alpha\nSTUDENT TWO beta` | code point 10 retained | `white-space: pre-wrap` | two distinct Y values; 32px box | two lines — Pass |

All five ordinary single-line values render once in disabled `input[type=text]` controls. Every multiline residual occurs exactly once. No Run/Reset, Team draft, selected draft, post-instrumentation network request, or V2 mutation occurred.

## Failure Origin Evidence

- API/V2/history are exact before and after browser interaction. Tree SHA-256 is unchanged: `367491ac21c2cceced68921b6a764cb2475241c6fad0e91212d53f0aa688eb2d`.
- The classifier correctly routes both LF and CR away from `input[type=text]`.
- The shared residual retains exact DOM text.
- The failure begins at actual browser layout: CSS `whitespace-pre-wrap` renders LF as a segment break but does not visibly separate the isolated CR text node.
- Therefore this is not fixture, persistence, provider, environment, or API drift.

## Evidence Files

- `api-rev-009-browser-persisted-multiline-result.json`
- `api-rev-009-persisted-fixture-before.json`
- `api-rev-009-persistence-after-browser.json`
- `api-rev-009-stored-multiline-desktop.png` — LF pass
- `api-rev-009-stored-multiline-nested-desktop.png` — CR failure
- `api-rev-009-web-stored-settings-focused.txt` — 11 files / 113 tests pass despite the browser defect
- `api-rev-009-cleanup-audit.txt`

## Routing

Send to `/code_reviewer` for focused failure-origin review. Do not route to delivery. A likely implementation correction must keep the singular residual owner and exact `textContent` while adding an actual visual separator for isolated CR; the reviewer should determine the approved production/test correction.
