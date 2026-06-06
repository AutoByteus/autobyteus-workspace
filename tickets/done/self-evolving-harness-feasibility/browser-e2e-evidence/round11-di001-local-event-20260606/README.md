# Round 11 DI-001 Local Event Browser E2E Evidence — 2026-06-06

Decision: **PASS**.

This round revalidated the review-passed DI-001 fix with a real browser session against a fresh isolated AutoByteus backend/frontend:

- Backend: `http://127.0.0.1:54860`
- Frontend: `http://127.0.0.1:54861`
- Runtime: `AutoByteus`
- Model: `DeepSeek / deepseek-v4-flash`
- Disposable skill: `calibration_marker_r11_di001_local_event`
- Durable marker update: `CALIBRATION_MARKER_R11_V1` → `CALIBRATION_MARKER_R11_V2`

## Browser evidence

1. `01-settings-self-evolution-disabled.png` — global feature initially disabled in Settings.
2. `02-settings-self-evolution-enabled.png` — global feature enabled.
3. `03-agent-run-config-self-evolution-toggle-visible-off.png` — standalone run config exposes launch-time eligibility toggle, default off.
4. `04-agent-run-config-self-evolution-toggle-on.png` — standalone launch eligibility enabled.
5. `05-ui-created-run-first-answer-v1-and-self-improve-cta.png` — UI-created run answered V1 and showed exactly the composer CTA copy `Self improve`.
6. `06-system-task-notification-redacted-no-started-card.png` — after self-improve, standalone active target rendered `System Task Notification`; no persistent green started card, record id, or open-helper-run button.
7. `07-post-evolution-next-run-v2-ineligible-hidden.png` — subsequent normal UI-created ineligible run answered V2 and hid the CTA without backend technical reasons.
8. `08-team-run-config-self-evolution-toggle-on.png` — team run config exposes/enables eligibility.
9. `09-team-member-composer-cta-visible.png` — team member CTA says `Self improve` and targets the selected member.

## API/file evidence

- `self-evolution-record.json` — standalone record completed with `notificationSummary.status = sent_active_idle`.
- `target-source-run-raw-trace-notification-absence.json` — browser notification rendered while target runtime trace contains no injected notification message, proving the DI-001 local-event path rather than runtime `postUserMessage` injection.
- `helper-raw-traces.jsonl` — helper prompt includes the durable V2 correction under feedback signals and no fake canary.
- `skill.diff` / `skill-after-self-improve.SKILL.md` — target skill changed to V2 and does not contain the fake canary.
- `post-evolution-next-run.json` — next normal run answered V2 and was ineligible/CTA-hidden.
- `team-member-cta-identity-check.json` / `team-member-self-evolution-record.json` — team member start used `teamRunId + memberRunId`, with MVP `next_run_only` notification status.
- `focused-checks.log` — focused executable checks passed.
- `evidence-secret-scan.json` — text evidence contains no fake canary; source runtime raw trace contains it only because the user deliberately typed it.

No repository-resident durable validation code was added or changed during this API/E2E round.
