# Brief Studio

Brief Studio is the current in-repo teaching sample for the “many runs over one business record” application pattern. It lives only under `applications/brief-studio` until a future explicit promotion decision.

It demonstrates:

- framework-owned hosted application startup through `startHostedApplication(...)`
- one app-owned GraphQL brief API hosted under the platform backend mount
- one app-owned `briefId` business identity
- one required manifest `resourceSlots[]` team slot resolved through the host-managed saved launch setup
- pending `bindingIntentId` handoff before each direct draft-run launch
- many bound runs over time for one brief record
- host-managed saved launch defaults for runtime/model/workspace selection before entry
- post-bootstrap business UI ownership only; the bundle does not author pre-bootstrap waiting/failure/direct-open UX
- application-owned runs that keep automatic tool execution enabled for the publishing workflow
- app-owned schema and generated frontend client artifacts that stay inside the application workspace
- durable artifact and lifecycle projection back into `app.sqlite`

Authoring roots:

- `api/graphql/schema.graphql`
- `backend-src/`
- `frontend-src/`
- `agent-teams/brief-studio-team/`

Runnable bundle roots remain:

- `ui/`
- `backend/`

Package/import root:

- `applications/brief-studio/dist/importable-package`
