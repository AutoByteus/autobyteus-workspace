## Improvements

- Agent Org list and detail pages now use the readable role names defined by the organization, keeping labels consistent with Agent Team role presentation.
- Mounted Team coordinator and handoff details now load independently without changing direct Agent or Team labels.
- Agent Org browsing avoids redundant per-member definition lookups while preserving exact identities for editing, navigation, and launch validation.

## Fixes

- Fixed Agent Org member labels changing from local roles into referenced Agent or Team definition names after loading, Reload, or search.
- Fixed detail pages briefly exposing opaque internal references while Team role details were loading.
- Incomplete or unavailable Team role details now show localized unavailable feedback while keeping direct role labels stable and free of internal IDs.
