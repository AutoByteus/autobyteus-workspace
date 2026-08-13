# Brief Studio

Brief Studio is the current in-repo teaching sample for the “many runs over one business record” application pattern. It lives only under `applications/brief-studio` until a future explicit promotion decision.

It demonstrates:

- one provider-neutral `startApplication(...)` entry for Studio and standalone
- one app-owned GraphQL brief API hosted under the platform backend mount
- one app-owned `briefId` business identity
- one required manifest `executionResourceSlots[]` team slot resolved through the host-managed setup-first launch gate
- pending `launchRequestId` handoff before each direct draft-run launch
- many bound runs over time for one brief record
- host-managed saved team `launchProfile` before entry: shared runtime/model/workspace defaults plus per-member runtime/model overrides
- post-bootstrap business UI ownership only; the bundle does not author pre-bootstrap waiting/failure/direct-open UX
- application-owned runs that keep automatic tool execution enabled for the publishing workflow
- app-owned schema and generated frontend client artifacts that stay inside the application workspace
- durable `publish_artifacts` artifact publication and lifecycle projection back into `app.sqlite`
- restart catch-up that ignores retained platform publications outside Brief's producer/path rules while preserving strict rejection for unsupported live delivery

Artifact recovery is application-owned. On startup, Brief resolves the saved run
binding and replays only publications whose producer and semantic path are
eligible for Brief projection. Retained generic platform history that is not
eligible is left intact and skipped without reading or mutating Brief state, so
later eligible researcher and writer history can still recover the exact brief
and reach its projected lifecycle state. Live artifact delivery remains strict:
an unsupported producer/path combination is rejected rather than silently
accepted. Unknown bindings, unreadable eligible revisions, transaction failures,
and notification failures remain startup errors.

Authoring roots:

- `api/graphql/schema.graphql`
- `backend-src/`
- `frontend-src/`
- `agent-teams/brief-studio-team/`

Generated runnable bundle roots:

- `dist/importable-package/applications/brief-studio/ui/`
- `dist/importable-package/applications/brief-studio/backend/`

Package/import root:

- `applications/brief-studio/dist/importable-package`
