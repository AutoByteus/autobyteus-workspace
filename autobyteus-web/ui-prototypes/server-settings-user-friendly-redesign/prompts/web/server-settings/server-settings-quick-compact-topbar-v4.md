# server-settings - quick_compact_topbar_v4

## Transition Metadata
- Transition ID: `server_settings_compact_top_tile_v4`
- Trigger: `system:redesign-top-tile-simpler`
- From State: `quick_provider_cards_no_extra_header_v3`
- To State: `quick_compact_topbar_v4`
- Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-no-endpoints-header-v3.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-compact-topbar-v4.png`

## Edit Prompt
Transition ID: server_settings_compact_top_tile_v4
Trigger: system:redesign-top-tile-simpler
From State: quick_provider_cards_no_extra_header_v3
To State: quick_compact_topbar_v4

Edit this server settings UI mockup to simplify the top tile.

Keep unchanged:
- Left app shell and settings navigation
- Provider cards layout style (LM Studio, Ollama, AutoByteus LLM Hosts, AutoByteus VNC Hosts)
- Per-provider add endpoint actions and card save actions

Change only the top tile area:
- Remove the large empty blank header block.
- Replace it with a compact single-row control bar card.
- In this compact row:
  - Left side: segmented tabs "Quick Setup" (active) and "Advanced / Developer"
  - Right side: primary button "Save All Changes"
- Keep spacing tight and clean, no unnecessary vertical whitespace.
- Ensure provider cards start directly below this compact row with consistent margin.

Visual goal:
- Minimal, clean, and simple.
- The top should feel intentional and lightweight, not like an oversized empty tile.

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-no-endpoints-header-v3.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-compact-topbar-v4.png`
- Delta Summary: Replaced oversized top tile with compact tab/action bar.
