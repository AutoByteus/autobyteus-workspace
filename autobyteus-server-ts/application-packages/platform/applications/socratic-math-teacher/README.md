# Socratic Math Teacher

Socratic Math Teacher is the built-in teaching sample for the “one long-lived conversational binding” application pattern.

It now demonstrates:

- one app-owned GraphQL lesson API hosted under the platform backend mount
- one app-owned `lessonId` business identity
- one long-lived binding reused through `runtimeControl.postRunInput(...)`
- app-owned schema and generated frontend client artifacts that stay inside the application workspace

Authoring roots:

- `api/graphql/schema.graphql`
- `backend-src/`
- `frontend-src/`
- `agent-teams/socratic-math-team/`

Runnable bundle roots remain:

- `ui/`
- `backend/`
