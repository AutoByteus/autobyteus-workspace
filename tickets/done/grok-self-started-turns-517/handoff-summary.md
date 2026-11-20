# Handoff Summary

## Summary Meta

- Ticket: `grok-self-started-turns-517` (Project Task `autobyteus-517`, round 3, the Grok follow-up `483-FU-004`; delegated by `/project_task_manager`)
- Date: `2026-11-20`
- Classification: `task_size: Medium`, `architectural_risk: High`; route: reviewed. Architecture review ARCH-REV-001..005 (Fail, Fail, Pass, then SR-004/SR-005 after the implementation's Design Impact, Pass at ARCH-REV-005); implementation IR-001 (Design Impact), IR-002, IR-003; code review CRR-001 Fail (CR-001, one dead export) then CRR-002 Pass (average 9.5); API/E2E `API-REV-001` Pass, final confidence 95.1%; test-code review CRR-003 Pass.
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`)
- Branch: `codex/grok-self-started-turns-517`, base `origin/personal` @ `ca4317a386` at bootstrap and at delivery (no new base commits; `Already current`). Product code is final at `cc2701af8a`; everything after it is tests and ticket documents.

## Delivery Summary

- Delivered scope: when a Grok agent's background command ends, Grok starts a turn of its own. The run now shows it like a Claude run shows the turns the Claude CLI starts itself:
  - A notice (`system.grok_provider_turn`) carrying Grok's own reminder text, for example `Background task "…" completed (exit code: 0)`, then the turn's reasoning, text, tool cards and per-call usage, then its end. The run reads busy meanwhile.
  - A message the user sends during that turn is held and sent after it; Stop sends `session/cancel` and ends the turn interrupted.
  - The notice is recorded in the run's memory and is in the history after a reload.
  - When the job ends during an input turn, the session hands over in one batch (the input turn's end, the provider turn's start and its notice), so the run never reads idle in between, a held message stays held and is never failed, and no second `session/prompt` goes out while one is outstanding.
- How: the shared ACP connection gets an inbound stage that delivers notifications to their session synchronously in wire order (the ACP SDK otherwise lets a `session/prompt` response overtake earlier notifications; this was the Design Impact that split the work into SR-004/SR-005). The ACP session gets a second turn origin and the hand-over; the Grok profile reads two signals (`_x.ai/queue/changed` with a running prompt, `turn_completed`); one converter method builds the notice; the sender id joins the memory recorder's allow-list. DeepSeek Harness uses the same connection and session and behaves as before (it sends no such signals).
- Docs synced (`docs-sync-report.md`): `grok_build_runtime.md` (new section "Turns Grok starts itself" and the corrected statements), `agent_execution.md` (the recorded notice senders); `GLOSSARY.md` "Provider-started turn" (implementation, confirmed). `DESIGN.md`, `TESTING.md`, `RELEASE.md`: no change.
- Durable coverage: the connection's wire-order and containment cases and the session's 9 provider-turn rules over the real connection (unit); the scripted Grok E2E (`grokProviderTurnScript`: a wake after an input turn, a job ending during an input turn with the hand-over, the hand-over's gap, a cancel of Grok's own prompt) in `grok-build-runtime-replay.e2e.test.ts`; a gated live case in `grok-build-live-runtime.e2e.test.ts` (`RUN_GROK_E2E=1`).

## Verification Summary

- Verified from evidence by delivery; no user check is needed. AC-001, AC-002, AC-003, AC-004 and AC-006 (critical) are directly proven by cases whose files were opened; AC-005 (live Grok) was run and passed, so the founder's waiver for no credits was not used (`release-deployment-report.md`, Verification).
- Final confidence 95.1% (target 95% met), no applicable category below 92%.
- Key evidence:
  - `evidence/API-01-grok-replay/vitest.log`: replay suite `Tests 10 passed (10)`: the 6 existing cases and the 4 provider-turn cases, including "keeps a message sent in the hand-over's gap …". `API-02-gap-case-repeat.log`: the gap case alone 3 of 3.
  - `evidence/IMP-04-grok-live-provider-turn.log`: real Grok 1.0.89, a real background job: notice `sender_id system.grok_provider_turn`, content "Background task … completed (exit code: 0)", the reply text with the job's output, `end TURN_COMPLETED`.
  - `evidence/IMP-03-acp-scripted-suites.log`: Grok compaction replay 3 passed; DeepSeek scripted provider (real dsh over the changed connection) 6 passed. `IMP-05` units 299/299, typechecks at baseline; `API-03` typechecks at baseline after the test additions.
- Reviews: source review CRR-001 Fail (CR-001, an unused exported type) then CRR-002 Pass after the fix, test-code review CRR-003 Pass with no findings.
- Integrated-state check: not needed; the ticket branch is not behind `origin/personal`.
- Secret Gate and artifact hygiene: recorded in `release-deployment-report.md`.

## Residual Risks For The User

- Every in-process E2E file's `afterAll` times out in `app.close()` under a macOS file-event backlog (the replay suite reports `Hook timed out in 60000ms` although its 10 of 10 tests pass). It is the known stall recorded as `FU-002` in `tickets/done/followups-483-517/follow-ups.md`; the implementation's control run of the six existing cases alone shows it too.
- RSK-001: a client prompt sent at the very instant Grok wakes itself is not designed for. RSK-003: provider content arriving before the input prompt's response was never produced by Grok in the probes, the scripted orders or the live run. RSK-004: an ACP SDK upgrade replaces the notification path, so it must rerun the connection's wire-order cases and the ACP suites (Grok replay and compaction replay, DeepSeek scripted provider); `grok_build_runtime.md` says so.
- The live Grok case needs a signed-in `grok` and credits; it ran and passed. DeepSeek was covered by the scripted provider (the real `dsh` over a scripted endpoint), not by a live DeepSeek run.
- `acp-agent-session.ts` is 488 lines (limit 500): the next growth belongs in an owned file (the code review's note).
- No browser run of a Grok provider turn: the web receives the same event types as Claude's provider turns and renders the sender generically.

## Follow-ups

- `follow-ups.md`: `FU-001` (Grok's startup of 4 to 35 s against the 15 s model discovery bound; from the implementation's candidate, recorded by delivery; unsent). No other follow-up was found by any role.

## Release

- No release: the founder has not asked for one, and RELEASE.md's default is no release. A release is available. `release-notes.md` holds the user-facing notes for the next release, including that it replaces the v1.5.13 note that a Grok agent "was not woken".
