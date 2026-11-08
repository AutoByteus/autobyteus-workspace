# Handoff Summary — switch-back-eexist (Task autobyteus-440)

## Ticket
- `task_size=Small`, `architectural_risk=Low`; direct route (reviews Not Applicable). API/E2E Pass (95%). Archived at `tickets/done/switch-back-eexist/`.

## What Changed
- Fix: a run that returned to the Antigravity runtime (Antigravity → another runtime → Antigravity) failed at its next message with `EEXIST: file already exists, mkdir …/agy-project`, because the earlier era's capsule was still in the run's memory folder and the new start created it exclusively. `createAgyRunCapsule` now removes the run's capsule folder first, so a new start always begins on an empty capsule. Only the capsule folder goes: a skill link inside it is removed without following it. A restore never creates a capsule and is unchanged. The same fix completes a start that failed after its capsule was made.
- Tests: capsule and factory unit tests; built-server cases SB-01..03 (Org member and nested worker, delegated copy, Team member; restart before the return; a start that fails at the real archive step and is retried) and a gated live case (real Antigravity → Claude → Antigravity, record ids equal on both archived segments); two existing built-server suites gained return hops (RS-09, MS-05).
- Docs: `antigravity_cli_runtime.md`; `TESTING.md` rule 10 (test a switch there and back), added by the ticket.

## Integration
- `origin/personal` @ `31aa11b241` has nothing beyond the ticket's base; no merge needed. On the head: typecheck, 324 Antigravity unit tests, server build and 31 built-server tests pass.

## Verification
- From the evidence; no user check. Every critical AC is proven. Without the fix, the mutation of the compiled capsule reproduces `EEXIST` in all three built-server cases and in the live run. One unexplained single failure of DCM-009 (a Grok test) in API/E2E's first combined run, recorded as FU-1; it passed in nine later combined runs, alone, and in mine.

## For the user: the stuck run on node 8001
- It was not read. Its state is exactly the one the tests cover (a pending switch to Antigravity with an earlier capsule), so it completes at its next message once a server with this fix runs. It needs this change in a release (or a build of `personal`).

## Release
- `No release`: not requested. The fix reaches users with the next release. A beta or stable release is available on request.

## For The Solution Designer
- FU-1 (DCM-009 flake, with the one-line instrumentation to capture its message on recurrence). The live case added `agy` and `claude` conversations (a synthetic `ls` task) to the user's histories, which cannot be removed. Codex was not exercised live (usage limit until Nov 10).
