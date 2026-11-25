# Handoff Summary

## Summary Meta

- Ticket: `remove-long-running-prompt-649` (Project Task `autobyteus-649`; requested by `/project_task_manager` on the founder's words, 2026-11-25)
- Date: `2026-11-25`
- Classification: `task_size: Small`, `architectural_risk: Low`; route: direct low-risk (no architecture review, no code review); test-code review `Not Required`.
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/remove-long-running-prompt-649`, base `origin/personal` `bc4351cad7` at bootstrap and at delivery (nothing newer; no base commit integrated).
- Delivery rounds: `DR-001` delivered (`delivery-revision-record.md`).

## Delivery Summary

- Delivered scope (REQ-001..003, requirements approved by the founder, 2026-11-25):
  - **No runtime's system prompt has the "Long-Running Commands" section any more** (Claude, Codex, Grok, Antigravity, DeepSeek harness and native AutoByteus). Clean cut: the texts file `long-running-command-sections.ts` is deleted, the composer's required `longRunningCommandSection` input (and its blank check) and the ACP profile field are gone, and the five callers stop passing it. The composer is back to its shape before autobyteus-483: the shared prompt ends with the Semantic Memory and Global Semantic Memory sections; the native prompt ends with File And Directory Practice.
  - **Tests:** 18 test files rewritten (assertions that the section exists removed; each "ends with the section" check now checks the pre-483 ending, with a `not.toContain("Long-Running Commands")` beside it); the snapshot lost its 20 section copies and nothing else.
  - **Docs:** `prompt_engineering.md` and `agent_execution.md` (implementation), and `TESTING.md`'s system-prompt row (delivery: the clause about "the section a backend passes to it" described a mechanism that no longer exists; the rule is unchanged).
  - **REQ-003:** the habit lives as `semantic-global/best-practice-long-running-commands.md` in the node's global memory, the text the founder approved (DEC-003); written by the Solution Designer before the code work.
- Left alone, as the design says: the rest of autobyteus-483 (the 2-hour Claude shell limit, background-task end reasons and exit codes, the Background Tasks panel), the runtimes' own tool descriptions, and the archived 483 ticket.
- Docs synced: see `docs-sync-report.md`.
- Durable coverage: the absence assertions in the composer, the five backends and the live semantic-memory suite; the other prompt-reading suites that reach the same prompt.

## Delivery's round

- **DR-001** found the branch already current with `origin/personal` (0 commits behind), judged the evidence, synced the docs (one more stale place found in `TESTING.md`), archived the ticket, and finalized on `origin/personal` without a release. No suite was rerun: no base commit came in, so the state API/E2E validated is the state merged (RELEASE.md: delivery audits, it does not redo).

## Verification Summary

- Verified from evidence by delivery. Every acceptance criterion is directly proven; nothing needs the user's check.
- Final confidence 95.6 % (API/E2E; the 95 % default target is met; no category below 90 %).
- Key evidence opened by delivery:
  - AC-001: `API-01-prompt-reading-suites/vitest.log`: the 18 files that read a run's composed prompt: 16 pass (collaboration-prompt-wording 14, agent-semantic-memory 10, configured-skill 4, the scripted Grok replay 11 and more), 1 is skipped by its own gate, and `brief-package-team-prompt` failed first with `Standalone package root is not a directory` (the build output was not prepared) and passed after `pnpm -C autobyteus-server-ts test:integration:prepare` (`brief-package-after-prepare.log`: `Tests 1 passed (1)`). `IMP-01-unit-tests.log`: `Tests 2334 passed | 6 skipped (2340)` after the snapshot update (the first run's `20 failed` are the 20 snapshot copies); `IMP-02-typechecks.log`: server 972 in 299 files and web 86 in 36 files, both at baseline, 0 production errors.
  - AC-002: `IMP-04-live-claude-prompt.log`: live Claude's received instructions `"instructionsHaveLongRunningCommands":[false]`, last heading `## Global Semantic Memory`; the live Codex run's recorded `thread/start` instructions say the same (`SML-WRITE-codex.json`), and `API-02-wire-ending-check.txt` shows the rewritten ending assertion holds on all three recorded Codex requests (`tail == section(folder, globalFolder): True`, `contains Long-Running Commands: False`).
  - AC-003: delivery's own search outside `tickets/` finds only the absence assertions and their comments in nine test files; no source or doc.
  - AC-004: the note's body is DEC-003's text word for word (checked by delivery in `~/.autobyteus/server-data/memory/semantic-global/`).

## Residual Risks For The User

- **Codex's model turn was not run** (SML-WRITE and SML-CODEX-TEAM: the machine's Codex account is at its usage limit until Nov 27, 2026 7:43 AM). The instructions Codex received were recorded and checked; the model turn (reading a codeword from memory) is behavior this ticket does not touch. Not an accepted-risk decision of the Solution Designer; it is a limit of the environment.
- **Product trade-off the founder accepted:** agents no longer get the long-job habit in their prompt, and it was never measured whether they wait well without it. The release notes say so.
- **A release before Nov 27, 7:43 AM:** the release smoke would hit Codex's limit again (the founder's advance waiver for `v1.5.15-beta.1` covered that beta only; a new release needs its own decision).

## Follow-ups

- `follow-ups.md` FU-001 (the Solution Designer's, to the founder): record the founder's rule "be really really cautious what we add to the system prompt" in global memory. It is proposed to the founder and not written; the Solution Designer sends it when the ticket leaves the team.

## Release

- No release: the founder did not ask for one in this Task and `RELEASE.md` makes none the default (API/E2E's handoff says "release only on the founder's word"). A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do` section, since nothing needs an action). The section shipped in `v1.5.13` and every release after it, so the removal is visible to every user who updates.
