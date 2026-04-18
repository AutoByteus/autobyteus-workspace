# Socratic Math Teacher

Socratic Math Teacher is the lightweight repo-local sample app that stays on the same application-bundle contract as every other app.

This root is intentionally shallow:

- `application.json`
- `ui/`
- `backend/`
- `agent-teams/`

The sample runtime target is an application-owned team whose private team-local tutor agent now lives under:

- `agent-teams/socratic-math-team/agents/socratic-math-tutor/`

Unlike Brief Studio, this sample is mainly a minimal bootstrap/runtime-target example. It does not teach the deeper app-owned repository/service/migration/event-projection flow.
