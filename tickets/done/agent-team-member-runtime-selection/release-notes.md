# Release Notes

## What's New
- Added a server-owned mixed-runtime team orchestration path so one team can run members on different runtimes while preserving deterministic member identity.
- Added frontend per-member runtime override support in the workspace team run form so mixed-runtime teams can now be configured truthfully from the app.

## Improvements
- Improved Codex and Claude team-member bootstrap so teammate instructions, allowed recipients, and `send_message_to` wiring now flow through one runtime-neutral member-team context.
- Improved mixed-team restore so the server keeps per-member runtime identity, workspace/memory metadata, and platform-native run/thread ids instead of collapsing restored teams back to one runtime owner.
- Improved the workspace **Run Team** flow so unresolved mixed-runtime rows now block launch with a truthful warning until the user chooses a compatible divergent member model or clears the override.

## Fixes
- Fixed mixed AutoByteus `send_message_to` delivery so rejected teammate deliveries surface as real tool failures instead of false success messages.
- Fixed live mixed-runtime prerequisites by assigning mixed-member memory directories during backend creation and by using Codex's current `inputSchema` dynamic-tool contract for `send_message_to`.
- Fixed the frontend mixed-runtime launch gap so temp-team materialization, first-send promotion, reopen/hydration reconstruction, and CR-003 member-only `llmConfig` cleanup all preserve divergent member runtime/model truth.
- Fixed reopened mixed-team hydration so the default runtime/model/config tuple is reconstructed from one coherent dominant runtime cohort instead of a false split-runtime vote, while preserved divergent member overrides remain explicit.
- Expanded runtime-selection validation to cover fully live mixed AutoByteus+Codex GraphQL/WebSocket create, terminate, restore, and resumed cross-runtime delivery flows plus the reviewed frontend/browser mixed-launch and reopen/hydration proof.
