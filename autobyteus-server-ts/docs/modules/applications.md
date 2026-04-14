# Applications

## Scope

Discovers self-contained application bundles, exposes transport-neutral application catalog metadata, validates bundle-owned runtime dependencies, and serves bundle-owned `ui/` assets for the generic frontend application host.

Launched runtime lifecycle, route binding, retained session state, and publication projection are documented separately in [`application_sessions.md`](./application_sessions.md). Runtime module availability is documented separately in [`application_capability.md`](./application_capability.md).

## TS Source

- `src/application-bundles`
- `src/api/graphql/types/application.ts`
- `src/api/rest/application-bundles.ts`

## Main Service

- `src/application-bundles/services/application-bundle-service.ts`
- `src/application-bundles/providers/file-application-bundle-provider.ts`

## Bundle Contract

- Each application bundle lives under `applications/<application-id>/`.
- The manifest file is `application.json`.
- `application.json.id` must match the bundle folder name.
- `ui.entryHtml` is required and must point to a file under `ui/`.
- `icon` is optional and must also stay under `ui/`.
- `runtimeTarget.kind` must be `AGENT` or `AGENT_TEAM`.
- `runtimeTarget.localId` must resolve to an embedded agent under `agents/` or an embedded team under `agent-teams/` in the same bundle.

## Discovery And Catalog Notes

- Built-in applications and imported package applications use the same bundle-discovery path.
- Discovery walks built-in roots plus registered additional package roots and produces one catalog entry per valid bundle.
- GraphQL exposes transport-neutral asset paths (`iconAssetPath`, `entryHtmlAssetPath`) rather than host-usable absolute URLs.
- The frontend resolves those asset paths against the currently bound REST base before rendering icons or iframe URLs.
- Runtime targets are surfaced with canonical ids so launches bind to the owning bundle’s embedded agent or team instead of relying on global name lookup.
- Session snapshots reuse this catalog metadata so `/applications/[id]` can render bundle ownership and asset details without a second lookup model.

## Runtime Availability Boundary

- Whether the Applications module is available at all is no longer a baked frontend build flag.
- The backend answers that question through the typed runtime Applications capability documented in [`application_capability.md`](./application_capability.md).
- Bundle discovery only participates in one place: first-time capability initialization when `ENABLE_APPLICATIONS` has not been persisted yet.
- After initialization, bundle discovery and bundle serving remain distinct from the steady-state runtime capability authority.

## Runtime Session Handoff

- The applications module owns discovery, validation, and asset serving only; it does not own live runtime state.
- Application launch/create/bind/query/terminate/send-input flows move into the application-session subsystem after a catalog entry is selected.
- Bundles therefore remain the durable package/distribution boundary, while application sessions remain the live runtime boundary.

## Integrity Rules

- Missing `ui` assets or a missing runtime target make the bundle invalid.
- Application-owned teams are validated during bundle scan/import so their members cannot point outside the same owning application bundle.
- The REST asset route only serves files that remain inside the resolved bundle root.
- Built-in and imported bundles are both treated as package-owned application sources.

## Related Docs

- [`application_capability.md`](./application_capability.md)
- [`application_sessions.md`](./application_sessions.md)
- `../../autobyteus-web/docs/applications.md`
- `../../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
