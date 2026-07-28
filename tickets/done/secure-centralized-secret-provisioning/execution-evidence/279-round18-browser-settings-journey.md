# Round 18 Actual-Browser Settings Journey

- Scenario: `SCSP-E2E-BROWSER-REAL-STATUS-001`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- HEAD: `3877b39bdcad2e8c88bb9f86d190308aaf034829`
- Runtime command: `pnpm dev:test`
- Backend: built server at `http://127.0.0.1:8000`, using the committed `.env.test` materialized into the persistent project test runtime.
- Frontend: Nuxt development frontend at `http://127.0.0.1:3000`.
- Browser surface: AutoByteus `open_tab`, not a direct HTTP assertion or a separate Playwright browser.
- URL: `http://127.0.0.1:3000/settings`

## Observed semantic UI state

- The real Settings page rendered `API Key Management` rather than an error boundary.
- The assembled provider list rendered Anthropic, AutoByteus, DeepSeek, Gemini, OpenAI, and the remaining supported providers.
- Anthropic rendered the value-free `Configured` status and the normal `Reload Models`, `Save Key`, and `Remove Key` controls.
- Configured-provider indicator dots rendered for Anthropic, AutoByteus, DeepSeek, Gemini, and OpenAI.
- No credential value appeared in the DOM snapshot, screenshot, or retained evidence.
- The browser-rendered model list included the current Anthropic catalog, proving the renderer/backend GraphQL path completed.
- Backend startup logs show one-database vault migrations/listen and cache initialization; the browser observation correlates with evidence `275`.

## Supporting evidence

- Screenshot: `279-round18-browser-settings-configured.png`
- Runtime log: `275-round18-real-dev-runtime.log`
- Real provider execution: `274-round18-real-provider-full.log`

## Non-fatal observation

Nuxt development startup emitted repeated `#app-manifest` pre-transform diagnostics, but completed both Vite client/server builds and Nitro startup. The actual browser rendered and hydrated the Settings route successfully. This rerun does not treat those development-only diagnostics as proof of a product failure; the production Nuxt build is checked separately.

## Result

`PASS` for the browser-visible configured-status journey. Provider invocation is established separately by the real managed-provider suite; this browser check does not claim that every provider was selected or mutated through the UI in this round.
