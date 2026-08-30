# Release Notes: Remote-node `open_tab` focus

## Fixed

- A successful `open_tab` executed on a Docker or remote node no longer makes the Electron desktop focus its local Browser shell or automatically select the right-side **Browser** tab. The user's existing right-panel selection and shown/collapsed state remain unchanged.
- Embedded/local Electron execution keeps the existing behavior: when the local Browser shell is available, the opened session is focused and **Browser** is selected.

## Preserved Behavior

- The executing node still opens the URL in its own configured browser runtime.
- Successful tool lifecycle, conversation tool-card, and Activity reporting remain intact for both embedded and remote executions.
- Standalone-agent and agent-team streams continue to use the same browser-success presentation policy.

## Operational Notes

- Persisted data: `Not Affected`; no migration or compatibility path is required.
- Configuration: no new setting, flag, protocol field, or remote-to-Electron browser bridge was added.
- Release/signing status: these notes are prepared for future aggregation only. No version bump, tag, release, signing, notarization, publication, or deployment has been performed.
