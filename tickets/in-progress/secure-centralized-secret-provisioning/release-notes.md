# Release Notes — Secure Centralized Secret Provisioning


## Security And Settings

- Provider, search, media, metadata, AutoByteus gateway, and managed Claude API
  credentials now use one centralized, write-only secret-management boundary
  instead of plaintext configuration or ambient provider-key lookup.
- API Key Management now shows value-free backend/configuration status and
  supports explicit key removal without reading stored values back.
- The default encrypted Local Store persists as a paired database and root-key
  file under the server data directory, with owner-only path controls and
  authenticated pair validation.

## Compatibility And Migration

- Existing provider/search credential aliases and secret-bearing custom-provider
  records are scrubbed during startup migration; non-secret configuration is
  preserved and affected credentials must be reprovisioned through Settings.
- AutoByteus remote LLM, audio, and image discovery/invocation retain their
  existing gateway behavior while resolving only the AutoByteus gateway
  credential.
- Claude Agent SDK authentication now has exact `cli` and `managed-secret`
  modes with no ambient-key fallback; managed mode limits credential delivery
  to the exact SDK child.
- Existing Docker topology and volumes remain unchanged, and ordinary Electron
  server-data reset preserves the encrypted secret Store.

## Quality

- Added Store lifecycle, fault, restart, migration, Settings, Docker, browser,
  provider-consumer, launch-policy, and captured real-E2E preflight coverage.
- Added a tracked, secret-free real-E2E manifest and a separate read-only host
  Store workflow so fresh worktrees do not require copied credential files.
