# Socratic Math Teacher

Socratic Math Teacher is the current in-repo teaching sample for the “one long-lived conversational binding” application pattern. It lives only under `applications/socratic-math-teacher` until a future explicit promotion decision.

It now demonstrates:

- framework-owned hosted application startup through `startHostedApplication(...)`
- one app-owned GraphQL lesson API hosted under the platform backend mount
- one app-owned `lessonId` business identity
- one required manifest `resourceSlots[]` team slot resolved through the host-managed saved launch setup
- one long-lived binding reused through `runtimeControl.postRunInput(...)`
- host-managed saved launch defaults for runtime/model/workspace selection before entry
- post-bootstrap business UI ownership only; the bundle does not author pre-bootstrap waiting/failure/direct-open UX
- app-owned schema and generated frontend client artifacts that stay inside the application workspace

Authoring roots:

- `api/graphql/schema.graphql`
- `backend-src/`
- `frontend-src/`
- `agent-teams/socratic-math-team/`

Runnable bundle roots remain:

- `ui/`
- `backend/`
