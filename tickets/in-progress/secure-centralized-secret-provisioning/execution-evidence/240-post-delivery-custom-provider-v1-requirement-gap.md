# Post-delivery requirement gap — custom-provider v1 recovery

- Date: 2026-07-27
- Trigger: actual existing-user Electron/API Keys failure
- Observed value-free code: `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED`
- No custom-provider file contents, credential values, vault values, database rows, or root key were read.

## User-required outcome

1. A legacy custom-provider JSON v1 file must not make the application, Settings, or unrelated provider API-key configuration unusable.
2. A migration attempt must preserve the original v1 file until the entire credential-to-vault plus metadata-to-v2 transition succeeds.
3. A failed migration must not delete, truncate, or partially rewrite the v1 file.
4. The preferred path is a bounded one-time migration: preserve provider metadata, move plaintext credentials internally to the encrypted vault without value output, then atomically publish v2 metadata only after complete success.
5. If migration cannot complete, isolate only the affected legacy custom-provider capability and present value-free recovery/reconfiguration guidance; built-in provider Settings and API-key operations must continue working.
6. The worst acceptable operational outcome is explicit user reconfiguration of custom providers, not a broken general Settings surface.
7. Any destructive discard/quarantine action requires an explicit approved contract; it must not happen merely because startup encountered v1.

## Design conflict

The current reviewed package explicitly classifies custom-provider-v1 credential values as `Discard or Rebuild` and rejects v1 with reconfiguration-required rather than migrating it. The newly observed existing-user failure shows that this decision also rejects the assembled provider-settings query. The user now requests solution-design reconsideration of automatic migration and failure containment.

## Required routing

Return to `solution_designer` as a Requirement Gap / persisted-data-transition correction, then through `architecture_reviewer` before implementation or further API/E2E execution.
