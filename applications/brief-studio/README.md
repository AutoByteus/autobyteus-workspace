# Brief Studio

Brief Studio is the canonical imported teaching sample for the “many runs over one business record” application pattern.

It demonstrates:

- one app-owned GraphQL brief API hosted under the platform backend mount
- one app-owned `briefId` business identity
- `executionRef = briefId` when launching draft runs
- many bound runs over time for one brief record
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
