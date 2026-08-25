# Socratic Math Teacher

Socratic Math Teacher is the current in-repo teaching sample for the “one long-lived conversational binding” application pattern. It lives only under `applications/socratic-math-teacher` until a future explicit promotion decision.

It now demonstrates:

- one provider-neutral `startApplication(...)` entry for Studio and standalone
- one app-owned GraphQL lesson API hosted under the platform backend mount
- one app-owned `lessonId` business identity
- one required manifest `executionResourceSlots[]` team slot resolved through the host-managed setup-first launch gate
- one long-lived binding reused through `agentExecution.sendInput(...)`
- one standard frontend `agentCommunication.connect(...)` session that selects logical member `/tutor` from the binding and projects that member's exact binding-owned `agentRunId`
- READY-before-input sequencing so the mounted UI observes the first provider-neutral live response
- host-managed saved team `launchProfile` before entry: shared runtime/model/workspace defaults plus per-member runtime/model overrides
- the bundled Codex App Server tutor default (`gpt-5.6-sol`, high reasoning effort) while saved runtime/model selections retain priority
- post-bootstrap business UI ownership only; the bundle does not author pre-bootstrap waiting/failure/direct-open UX
- app-owned schema and generated frontend client artifacts that stay inside the application workspace
- provider-neutral live text and turn lifecycle presentation that converges in either arrival order with tutor-turn publication and durable lesson-history projection
- one Socratic-local turn admission slot so follow-up and hint actions cannot replace the active live/durable join baseline

Authoring roots:

- `api/graphql/schema.graphql`
- `backend-src/`
- `frontend-src/`
- `agent-teams/socratic-math-team/`

Generated runnable bundle roots:

- `dist/importable-package/applications/socratic-math-teacher/ui/`
- `dist/importable-package/applications/socratic-math-teacher/backend/`
