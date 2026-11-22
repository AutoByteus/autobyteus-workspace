# Follow-ups — grok-release-smoke-551 (autobyteus-551)

| ID | Found by / when | Finding and evidence | Suggested owner / action | Status |
| --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, investigation 2026-11-22 | Grok's own start-up has one silent step (between `startup.settings_get` and `auth.sleep.power_listener_init` in its log) that took 5.2–22.9 s during the beta.4 smoke and ~20 ms otherwise (evidence P3). Provider-side; this ticket only widens our bounds | PM: optionally report to xAI with the log timings; no AutoByteus change | written down |
| FU-002 | Solution Designer, requirements 2026-11-22 | `autobyteus-567` (563 FU-1) asks why `grok models` changes between calls and for a per-scenario re-resolve/retry in the smoke. Answer: Grok shows its built-in list (`grok-4.6`, `grok-4.5`) on the first start after ≥ 6 h idle (expired sign-in) and the real list (`grok-4.7`) after its refresh; this ticket makes discovery wait for the refresh (evidence P4–P7, P15) | PM: tell 567's owner; the smoke retry may no longer be needed once 551 is merged | written down |
