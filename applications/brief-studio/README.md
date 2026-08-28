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
- one read-only application-owned `get_brief_context` tool whose caller and
  Brief identity come from the current application Team binding
- app-owned schema and generated frontend client artifacts that stay inside the application workspace
- durable `publish_artifacts` artifact publication and lifecycle projection back into `app.sqlite`
- restart catch-up that ignores retained platform publications outside Brief's producer/path rules while preserving strict rejection for unsupported live delivery

## Maintained Agent-to-UI workflow

The bundled `brief-studio-team` is intentionally pinned to
`codex_app_server` / `gpt-5.6-luna`. Its researcher and writer each select only
`get_brief_context`, `publish_artifacts`, and `send_message_to`. They do not
configure ordinary registry file tools, shell, provider built-ins, or
normalized trace names as routed tools.

For a fresh draft:

1. The researcher calls `get_brief_context` exactly once as its first tool
   action. The read-only handler derives the selected Brief from the
   application binding and returns the `briefId`, title, and observed status.
2. The researcher writes the exact compact `Brief context:` marker and research
   body to `brief-studio/research.md` using Luna's built-in `apply_patch`, then
   publishes that workspace-relative path.
3. The researcher sends `/writer` the marker, canonical relative path, and the
   complete research body. The writer does not read across member workspaces.
4. After receiving the handoff, the writer calls `get_brief_context` exactly
   once as its first tool action, rejects a Brief-identity mismatch, and uses
   the complete handoff body. At least one complete research `Key findings`
   bullet is copied under the final `Key evidence` section.
5. The writer uses built-in `apply_patch` to create
   `brief-studio/final-brief.md` and publishes that relative path. Existing
   artifact relay/reconciliation changes the same Brief to `in_review`, emits
   the ready-for-review notification, and refreshes the existing UI.

The three file-operation names describe different layers and must not be
conflated: `apply_patch` is the model-facing Codex/Luna built-in; Codex reports
the resulting native `item/fileChange` / `file_change`; AutoByteus records that
provider activity as normalized `edit_file` lifecycle evidence. Neither
`apply_patch` nor `edit_file` belongs in the role `toolNames`, and roles react
only to the provider-reported patch result rather than reading protocol or
trace internals.

`get_brief_context` never mutates Brief business state. If context, patch,
publication, or the required handoff fails, the role reports a truthful blocker
and stops without shell fallback or fabricated publication. The browser-visible
state transition is owned only by the established final-artifact publication
and reconciliation path.

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
