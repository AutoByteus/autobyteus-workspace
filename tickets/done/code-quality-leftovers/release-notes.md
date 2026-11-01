# Release Notes — Code-quality leftovers

## Changed

- Internal clean-up across the agent library, the server and the app, with no
  change to how the app behaves or to stored data.
- Developers using the server's GraphQL API: `ModelSourceStatus` no longer has
  the `modelKind` field (it was always `LLM`). The app no longer reads it.

## Rolling back

Rolling back to an earlier version is possible. No stored data changes.
