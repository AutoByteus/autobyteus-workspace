# User Verification Report — Nested Diagram Overlay

## Verification Signal

- Date: `2026-07-21`
- Candidate implementation commit: `425ca42974b7e213c08033480b3301446aae1366`
- Candidate package: `AutoByteus_enterprise_macos-arm64-1.4.22.dmg`
- Candidate DMG SHA-256: `1766bdc0fe53ea102fade8bab4152bc29a6d9802cff371d001e69f2687489b62`
- User statement: `i tested it. the task is done. lets finalize and release a new version`
- Result: `Pass`
- Authorization: Finalize the repository and publish a new release.

## Verified Scope

The user's statement accepts the local macOS ARM64 Electron candidate prepared in the immediately preceding delivery handoff. That candidate contains the reviewed shared Mermaid viewer fix: a nested diagram opens above a maximized Markdown host, the viewer owns pointer input, and close/backdrop/first-`Escape` dismiss only the diagram while preserving the host and restoring its inline SVG/focus. A later distinct `Escape` remains available to dismiss the host.

## Finalization Refresh

- Latest remote target refresh after verification: `origin/personal` at `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`.
- Target advanced beyond the tested state: `No`.
- Renewed verification required: `No`; the tested implementation/base state did not change.

## Evidence Boundaries

This artifact records the explicit completion signal without inventing a scenario-by-scenario manual test log. The API/E2E execution report remains authoritative for its `98.7%` automated confidence, nine passing Chrome scenarios, and owned-resource cleanup. The local package was unsigned and unnotarized by design; the user's successful test authorizes finalization but does not represent signing/notarization or every release-platform workflow as locally exercised.
