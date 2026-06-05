# Round 7 UI Launch-Path Browser E2E Evidence — 2026-06-05

Result: **Fail** for the full self-evolution loop; **Pass** for the user-visible launch-path fix.

This round validated the normal browser workflow requested after code review round 9:

1. Open Settings and enable global Self-evolution.
2. Open a standalone disposable agent run from the visible Agents UI.
3. Verify and enable the visible `Self-evolution eligibility` run-config toggle.
4. Start the run, send the first user message through the browser UI, and verify the prepared run snapshot has `selfEvolutionEffective.enabled === true` from `agent_run_launch`.
5. Verify the run-history `Improve skills from this run` action is visible, enabled, and accessibility-labeled.
6. Click the action in the browser and verify a visible `Skill Self-Evolver` helper run starts.
7. Inspect helper prompt/metadata, record provenance, notification outcome, skill diff, and a post-evolution next run.
8. Check team-run eligibility/member override controls in the browser UI.

Key outcome:

- AE2E-022 is fixed: the standalone run configuration form exposes the self-evolution eligibility toggle and snapshots it correctly.
- The helper prompt was redacted/anonymized as expected and the self-evolution record completed with notification status `sent_active_idle`.
- The full loop still failed: the helper edited `SKILL.md` but left the durable answer at `CALIBRATION_MARKER_R7_V1`; the post-evolution next UI-created run also answered `CALIBRATION_MARKER_R7_V1` instead of expected `CALIBRATION_MARKER_R7_V2`.

Important evidence files:

- `ui-created-run-metadata.json` — proves the normal UI-created run snapshot had self-evolution enabled.
- `06-run-history-self-evolve-action-visible-redacted.png` — shows the discoverable run-history action.
- `07-self-evolver-run-conversation-redacted.png` — shows the visible helper run.
- `self-evolution-record.json` — completed minimal self-evolution record and notification summary.
- `skill.diff` and `skill-after-first-ui-self-evolution.SKILL.md` — show the helper changed the file but did not apply the V2 durable marker.
- `post-evolution-next-run.json` and `08-post-evolution-next-run-still-v1-failure.png` — show the next run still answered V1.
- `team-config-ui-check.json`, `09-team-run-config-controls-visible.png`, and `10-team-toggle-on-member-override-roundtrip.png` — show team-level/member override controls were visible and interactable.
- `evidence-secret-scan.json` — records the local scan of copied evidence for raw fake canary and common raw secret patterns.
