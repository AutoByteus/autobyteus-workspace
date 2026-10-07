# Candidate Release Notes — Project workspace paths

Not published. User explicitly said “no need to release a new version” on2026-10-07. Prepared before verification for eventual inclusion, not authority to release.

- Project workspace links now accept an absolute folder path plus optional description. The existing-workspace picker and manual entry save the same representation.
- Agent tool rows use `workspace_path`; saved JSON, API and live views identify links by `workspaceRootPath`. Each saved workspace entry contains only path and description.
- Linking does not require registration or folder existence and never registers or creates the folder. Editing and unlinking work for unregistered references too.
- Existing saved paths/descriptions remain readable without a new data migration or eager rewrite. Ordinary Project saves drop obsolete workspace IDs and per-link timestamps; Task/context/assignment data is preserved.

## Operational Notes
Deploy matching server and web code. Old workspace-ID tool/API clients are not translated. Global runtime workspace IDs remain unchanged. Availability means registration, not physical access. The existing Projects per-folder migration retains its historical classifier/output and retry/terminal behavior.

Do not downgrade a profile to old ID-required binaries after ordinary saves reduce its links: reverse conversion and mixed-version writers are unsupported. No release, customer-data conversion or rollback action has been performed by this ticket.
