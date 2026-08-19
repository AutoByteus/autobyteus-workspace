# API-REV-037 Browser/provider matrix

- Overall: **Pass**
- Team browser rows: AutoByteus, Codex, Claude — 3/3 passed.
- Standalone browser rows: AutoByteus, Codex, Claude — 3/3 passed.
- Active desktop/mobile message and reference journey: passed.
- Persisted desktop/mobile message and reference restore journey: passed.
- The first AutoByteus attempt was discarded because Nuxt's dependency optimizer reloaded the development server during navigation (`504 Outdated Optimize Dep`). The stable warmed-server rerun passed and is the authoritative row.
- AutoByteus displayed generic error cards for one rejected provider-generated tool attempt and one duplicate post-accept review attempt. The exact current peer request/reply and accepted lifecycle still completed once; there was no `SEGMENT_START`/`CONTENT`/`END` admission rejection. This is recorded as nonblocking model/tool-election behavior under CR-PREM-032, not hidden.
- Operational database action/inspection: NONE. Protected user-stack action: NONE.
