# Server Settings User-Friendly Redesign

## Scope

This prototype redesigns the **Server Settings** experience (Quick Setup + Advanced / Developer) to reduce end-user input errors while preserving existing information architecture:

- Keep tabs: `Quick Setup`, `Advanced / Developer`
- Keep quick setup service set:
  - `LMSTUDIO_HOSTS`
  - `OLLAMA_HOSTS`
  - `AUTOBYTEUS_LLM_SERVER_HOSTS`
  - `AUTOBYTEUS_VNC_SERVER_HOSTS`
- Keep existing per-card save and global save affordances

## Current Implementation Understanding

Source reviewed:
- `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ServerSettingsManager.vue`
- `/Users/normy/autobyteus_org/autobyteus-web/stores/serverSettings.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerMonitor.vue`

Current quick setup behavior:
- Each service uses one plain text input.
- Values are comma-separated endpoint strings.
- Save can happen per field or with `Save All Changes`.
- Validation is minimal at input-structure level in quick setup (raw text accepted).

## Why The Current UI Feels Not Nice For End Users

1. Endpoint entry burden is manual and syntax-heavy:
- Users must type separators (commas) and full endpoint syntax in one line.
- One typo can invalidate multiple endpoints.

2. Mixed concerns in a single text field:
- Protocol, host, port, and optional path are merged.
- Users cannot easily scan or edit one part (for example only port).

3. Weak error locality:
- A malformed comma-separated string does not naturally point to one endpoint row.
- Recovery is harder for non-technical users.

4. Advanced terminology leaks into quick setup:
- Copy and structure are closer to raw config than guided setup.

## Prototype Intent

- Replace comma-separated text entry with structured endpoint rows.
- Separate `Protocol`, `Host`, `Port`, and optional `Path`.
- Make add/remove endpoint behavior explicit (`+ Add endpoint`, row delete action).
- Keep advanced mode for raw controls; keep quick mode user-facing.

## Key UX Rules

1. One endpoint per row.
2. `Host` and `Port` are first-class fields.
3. Inline validation at row level.
4. Save feedback must be explicit (`loading`, `success`, `error`).
5. Preserve visual continuity with current Settings shell.

## Platform and Visual Constraints

- Platform: web (desktop)
- Target ratio for flow: 1:1 in generated assets (tool output ratio lock)
- Fidelity: high
- Tone: clear, calm, practical

## Critical Flow Included

Flow: `server-settings` (Quick Setup endpoint editing + Advanced mode readability)

States:
1. `quick_default`
2. `advanced_default`
3. `quick_add_endpoint_focus`
4. `quick_validation_error`
5. `quick_saving`
6. `quick_save_success`

## Open Product Decisions

1. Should quick setup auto-normalize to raw env string format before save, or should backend accept structured payload directly?
2. For VNC rows, should protocol be fixed (`ws`/`wss`) to prevent invalid combinations?
3. Should per-card `Save` remain, or simplify to global `Save All Changes` only?
