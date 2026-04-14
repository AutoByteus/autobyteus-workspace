# Handoff Summary

## Delivery

- Applications is no longer rendered as a separate top panel in Server Settings.
- The control now appears as a standard Basics card in the same grid as the other server settings cards.
- The card uses a single switch-style toggle for enable/disable while preserving the existing typed capability update and raw settings refresh behavior.

## Validation

- `pnpm exec vitest run components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts`
- `pnpm exec vitest run pages/__tests__/settings.spec.ts`
- `pnpm exec vitest run components/settings/__tests__/ServerSettingsManager.spec.ts`

## Docs

- `autobyteus-web/docs/settings.md` updated to match the new placement.

## Release / Finalization

- User verification received on `2026-04-14`.
- Release notes: `not required`
- Release / publication / deployment: `not required`
