# Round 9 Browser E2E Evidence — Composer CTA MVP

Validation date: 2026-06-05

This directory contains live browser/API evidence collected after code review round 13 resolved CR-008 and CR-009. The validation used a fresh isolated backend/frontend, the AutoByteus runtime, and the `deepseek-v4-flash` model with `thinking_type: disabled`.

## Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility`
- Backend during test: `http://127.0.0.1:54840`
- Frontend during test: `http://127.0.0.1:54841`
- Isolated runtime root during test: `/tmp/autobyteus-self-evolution-round9-composer-cta-e2e`
- Disposable skill: `calibration_marker_r9_cta_loop`
- Disposable agent: `Calibration CTA Agent r9_cta_loop`
- Disposable team: `Calibration CTA Team r9_cta_loop`
- Initial marker: `CALIBRATION_MARKER_R9_V1`
- Updated marker: `CALIBRATION_MARKER_R9_V2`

## What was validated

1. Settings self-evolution toggle was visible and enabled in the browser.
2. The standalone agent run configuration form exposed self-evolution eligibility and the UI-created run snapshot recorded `selfEvolution.enabled === true` from `agent_run_launch`.
3. The normal target agent answered the V1 marker before self-evolution.
4. The composer-adjacent `Improve skills from this run` CTA appeared; no run-history row self-evolution action outside the composer CTA container was present.
5. Clicking the composer CTA rendered the neutral started-state card with the evolution record id and `Open Skill Self-Evolver run` button.
6. The open button navigated to the visible Skill Self-Evolver helper run.
7. The helper prompt contained the V2 durable correction under `Feedback and improvement signals`, redacted the fake credential canary, and did not expose the raw source run id.
8. The helper updated only the disposable skill `SKILL.md`, changing the durable marker from V1 to V2 and adding a V2 change-log row.
9. The self-evolution record completed with notification status `sent_active_idle`, and the source run received the notification.
10. A later normal UI-created target run answered `CALIBRATION_MARKER_R9_V2`.
11. Team/member composer CTA identity was validated: the record target used `teamRunId + memberRunId`, and `sourceRunIds` contained the selected member run id.

## Key files

- `setup-summary.json` — disposable package/agent/team/runtime identifiers.
- `ui-created-run-metadata.json` — standalone source run prepared metadata proving AutoByteus/DeepSeek and `selfEvolutionEffective.enabled=true`.
- `composer-cta-row-action-check.json` — DOM check proving composer CTA present and no run-history row action outside it.
- `composer-cta-started-card.json` — started-card text, record id, and open-button evidence.
- `self-evolution-record.json` — completed standalone self-evolution record.
- `helper-raw-traces.jsonl` — redacted helper trace evidence.
- `skill.diff` — Git diff from V1 to V2.
- `target-source-run-notification-trace.jsonl` — source-run notification message.
- `post-evolution-next-run.json` — next UI-created run answered V2.
- `team-member-self-evolution-record.json` and `team-member-cta-identity-check.json` — team/member identity evidence.
- `round9-validation-summary.json` — machine-readable pass/fail summary for all checks.
- `evidence-secret-scan.json` — copied-evidence scan confirming the raw fake canary and generic secret-like forms are absent.

## Screenshots

- `01-settings-self-evolution-disabled.png`
- `02-settings-self-evolution-enabled.png`
- `03-agent-run-config-self-evolution-toggle-visible-off.png`
- `04-agent-run-config-self-evolution-toggle-on.png`
- `05-ui-created-run-first-answer-v1-and-composer-cta.png`
- `06-composer-cta-started-card-redacted.png`
- `07-open-evolver-run-navigates-to-helper-redacted.png`
- `08-post-evolution-next-run-v2.png`
- `09-team-run-config-self-evolution-toggle-on.png`
- `10-team-member-composer-cta-visible.png`

Screenshots taken after the fake credential-looking canary was in the visible conversation were redacted in the DOM before capture.
