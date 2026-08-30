# API-REV-004 Supported Brief Studio Browser Journey

- Date: 2026-08-27 UTC
- Worktree: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability`
- Isolated data root: `.autobyteus/api-e2e-004`
- Backend: production build on `127.0.0.1:8015`
- Frontend: supported Next development server on `127.0.0.1:3015`
- Same-origin browser surface: `http://127.0.0.1:3016`

## Browser setup and actions

1. Opened the normal AutoByteus web surface.
2. Imported the built Brief Studio package through **Settings -> Application Packages**.
3. Enabled applications through **Settings -> Server Settings**.
4. Restarted only the API-REV-004-owned backend after initial catalog registration, then reopened launch setup. The registered package was preserved and the application became ready; no package or database files were altered directly.
5. Confirmed the launch form rendered both `/researcher` and `/writer` as `codex_app_server` / `gpt-5.6-luna`; saved the normal setup and entered Brief Studio.
6. Created `API E2E Luna Patch Proof 2026-08-27T21:31Z` through the Brief Studio iframe UI.
7. Selected that brief and clicked **Generate draft** at `2026-08-27T21:32:37.492Z`.
8. Waited for the real configured Team to finish. No MCP call, backend launch, database update, runtime switch, refresh button, or model interaction was issued outside the supported UI journey.
9. Observed the selected same brief update automatically to **In_review**, **2** draft outputs, and **1 final**. Both researcher and writer artifacts, their marker lines, paths, and bodies were visible.

## Result

`PASS`. Semantic DOM evidence is in `final-browser-observation.json`; the final rendered state is in `final-browser-in-review.png`. Runtime identity, provider-native patch records, normalized traces, Team handoff, publication projections, and the same UI observation are joined in `identity-trace-artifact-ui-join.json`.

The initial post-import quarantine was a setup-order observation: the catalog had registered the application before applications were enabled. The owned restart exercised catalog transition/reload and preserved package registration; it was not an implementation failure and did not alter the tested application source.
