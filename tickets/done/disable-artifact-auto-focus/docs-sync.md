# Docs Sync — Disable Artifact Auto-Focus

## Result

Updated.

## Durable Documentation Updated

- `autobyteus-web/docs/agent_execution_architecture.md`

## Change Summary

Updated the Run File Changes sidecar-store description so it no longer says latest-visible artifact tracking auto-focuses the Artifacts tab. The documentation now states that latest-visible tracking supports selecting/refreshing the newest row after the user opens Artifacts, without stealing focus from other right-side tabs.

## Rationale

This behavior is user-facing and part of the agent artifact runtime flow. The durable architecture docs previously described the removed auto-focus behavior, so they needed to be synchronized with the new implementation.

## Verification

- Confirmed no remaining durable-doc `auto-focus` reference for this behavior with `rg`.
- Stage 7 executable validation passed: 4 test files, 12 tests.
