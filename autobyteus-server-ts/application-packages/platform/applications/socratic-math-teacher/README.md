# Socratic Math Teacher

Socratic Math Teacher is the lightweight repo-local sample app that stays on the same application-owned runtime orchestration contract as every other app.

This root is intentionally shallow:

- `application.json`
- `ui/`
- `backend/`
- `agent-teams/`

The sample still bundles an application-owned team under:

- `agent-teams/socratic-math-team/`

Unlike Brief Studio, this sample is intentionally minimal. It demonstrates the v2 iframe/bootstrap contract and the fact that the host no longer requires a singular launch-time runtime target or platform-owned application session before the iframe can load.
