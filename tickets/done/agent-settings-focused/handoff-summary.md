# Handoff Summary: agent-settings-focused (autobyteus-366)

- Status: verified from the evidence, proven from a clean clone, archived and finalized on `personal`. **No release:** AC-006 says "release only on the user's word", and he has not given it for this ticket.
- Classification: `task_size=Medium`, `architectural_risk=Low`, direct route; no test-code review.
  - Code review: CRR records in `code-review-report.md`.
  - API/E2E: API-REV-003 Pass, 94% (round 1 and round 2 findings resolved).
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused`, branch `codex/agent-settings-focused`.

## What Changed

- The Settings of a focused agent show that agent's card, not the whole group of delegated copies and members:
  - the hub, a copy, or a Team or Org member each get one card;
  - a "Team settings" / "Organization settings" switch opens the run's card and Members.
- A stopped copy's or member's model and runtime can be changed there, and the next message uses them. A running one is locked with today's stop rule.
- Team-wide changes reach followers as before.
- Edits stay pending across focus changes. The save bar names every agent with unsaved edits; Save commits them all, Cancel discards them all.
- Web only; no stored data changes.

## Integration

- The design said to merge only after autobyteus-348 landed. The branch already contains `origin/personal` @ `84ea944ac5`, which has 348 (implementation's merge `58fdf50f33`).
- `origin/personal` had not moved at delivery, so no new merge was needed.

## Clean-Clone Proof (AC-006)

- Setup: a clone of `f1f2d137db` with no build output; frozen install; workspace and Brief Studio builds; server `prebuild`; `nuxt prepare`.
- Each check ran on its own and recorded its own exit code:

  | Check | Result |
  | --- | --- |
  | DEL-01 server typecheck | production 0; test files 1185/366, at baseline |
  | DEL-02 server unit | 7,880 passed |
  | DEL-03 server integration | 506 passed, 0 failed |
  | DEL-04 autobyteus-ts | 2,104 passed |
  | DEL-05 web typecheck | production 0; test files 99/43, at baseline |
  | DEL-06a/b/c web guards | each Passed |
  | DEL-07 web suite | 5,052 passed, 2 skipped |
  | DEL-08 Electron main | 291 passed |
  | DEL-09 `test:e2e:agent-settings-focused` (first run) | AFS-002 and AFS-003 Pass; **AFS-001 Fail** before its subject (see below) |
  | DEL-09b rerun alone, same clone | AFS-001…003, **3/3 Pass** |

- The AFS-001 failure: the run came right after the heavy suites, and the probe's scripted Antigravity CLI timed out on model discovery. The model menu showed "Antigravity CLI — Unavailable — Antigravity model discovery timed out" (`evidence/DEL-09-AFS-001-antigravity-discovery-timeout.png`), so the probe could not choose it. Settings were never reached. This is a probe-fixture timing problem, recorded as FU-002.

## Verification From Evidence

- API/E2E's merged-head run (`evidence/api-e2e/API-r3-merged-head-all-cases.json`): 20/20 Pass, `browserErrors: []`. The cases are AFS-001…003 (hub, Org, Team), DLP-003…007, DCP-001…005, DCR-001…003 and SSR-001…004, all reworked for focused Settings.
  - `API-r3-runtime-switch-members.log`: RSM-01…07 Pass.
  - MRD-01…08 (two nodes) Pass.
  - Folder picker FP-P01, 02 and 04…08 Pass. FP-P03 needs the native dialog and is not tested.
- `API-r3-SSR-003-refresh-recovered.png` shows a focused stopped copy with one card and its model, after a failed read-back and Refresh.
- AC-001…AC-005 are proven by the AFS, DCP, DCR and SSR cases. AC-006's clean clone was done by delivery.
- R07/R08 of `run-settings-live-probe.mjs`: the implementer's one-line edits were not run (they need live Claude and Codex). Delivery judged them proportionately:
  - each adds one click on `run-settings-switch-group`, which exists in `ExistingRunSettings.vue` and is clicked by the passing AFS cases;
  - `node --check` passes;
  - the ACs they touch are proven by AFS-002, AFS-003 and DCR-002.

  This stays a residual: run them at the next live-probe run.
- No user check is needed.

## Docs

- `settings.md` and `agent_execution_architecture.md` (the change); `agent_teams.md` wording (delivery).

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

- FU-001: an Org stopped by another client leaves its open Settings showing "active" for at least 20 s.
- FU-002 (new, delivery): the probe's scripted Antigravity discovery can time out on a loaded machine.

## Probe Ordering Note (from API/E2E)

- DLP-007 edits the shared engineer's default in the Agents editor, so in one stack run it must come after SSR-004.

## Release

- Decision: no release. AC-006: "release only on the user's word". The change is available for the next beta when he asks.
