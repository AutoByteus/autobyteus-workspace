# Round 8 UI-Created Self-Evolution Loop Rerun — 2026-06-05

Result: **Pass**.

This round reran the normal user-visible browser path after CR-007:

1. Started isolated backend/frontend processes from the ticket worktree.
2. Used AutoByteus runtime with `deepseek-v4-flash` and `thinking_type: disabled`.
3. Enabled global Self-evolution in Settings through the browser.
4. Created a standalone target-agent run through the visible Agents UI.
5. Turned on the visible `Self-evolution eligibility` toggle in the run configuration form.
6. Sent the first marker question through the browser UI and verified the UI-created run snapshot had `selfEvolutionEffective.enabled === true` from `agent_run_launch`.
7. Sent a `DURABLE_SKILL_UPDATE:` correction through the browser UI with an intentionally fake bearer-token canary.
8. Clicked the visible run-history `Improve skills from this run` action.
9. Verified the visible `Skill Self-Evolver` helper prompt included `Explicit durable skill update requested` under `Feedback and improvement signals`.
10. Verified the helper updated the target `SKILL.md` durable behavior rule from `CALIBRATION_MARKER_R8_V1` to `CALIBRATION_MARKER_R8_V2`, updated the change log, and did not copy the fake canary.
11. Verified the self-evolution record completed with notification status `sent_active_idle`.
12. Started a subsequent UI-created target-agent run and verified it answered `CALIBRATION_MARKER_R8_V2`.

Key files:

- `ui-created-run-metadata.json` — UI-created source run snapshot with self-evolution enabled.
- `06-run-history-self-evolve-action-visible-redacted.png` — visible/clickable self-evolve action.
- `07-self-evolver-run-feedback-signal-redacted.png` and `helper-raw-traces.jsonl` — helper prompt shows the explicit durable update feedback signal and redacted token.
- `skill.diff` and `skill-after-ui-self-evolution.SKILL.md` — durable behavior changed to V2 and fake canary was not copied.
- `self-evolution-record.json` and `target-source-run-notification-trace.jsonl` — completed minimal record and target notification outcome.
- `post-evolution-next-run.json` and `08-post-evolution-next-run-v2.png` — subsequent UI-created run answered V2.
- `round8-validation-summary.json` — machine-readable pass/fail checks.
- `evidence-secret-scan.json` — local scan result for copied evidence.
