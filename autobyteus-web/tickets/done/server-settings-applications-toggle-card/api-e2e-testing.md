# API / E2E / Executable Validation

## Validation Scope

- This ticket changes only frontend composition and control UX.
- No backend API contract, GraphQL schema, or browser E2E flow changed.
- Focused executable validation is therefore the appropriate gate for this scope.

## Executed Checks

1. `pnpm exec vitest run components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts`
   - Result: `Pass`
   - Evidence:
     - capability resolves on mount,
     - switch toggles from disabled to enabled,
     - switch toggles from enabled to disabled,
     - raw server settings refresh still happens after success.
2. `pnpm exec vitest run pages/__tests__/settings.spec.ts`
   - Result: `Pass`
   - Evidence:
     - server settings page still renders the server settings manager,
     - no separate top-level Applications card shell is expected from the page component anymore.
3. `pnpm exec vitest run components/settings/__tests__/ServerSettingsManager.spec.ts`
   - Result: `Pass`
   - Evidence:
     - the manager still renders and behaves correctly after owning the Applications card placement.

## Acceptance Criteria Mapping

| Acceptance Criterion | Validation Evidence | Result |
| --- | --- | --- |
| Applications is no longer mounted as a standalone top panel | `pages/__tests__/settings.spec.ts` | Pass |
| Applications renders as a normal Basics card | `components/settings/__tests__/ServerSettingsManager.spec.ts` plus implementation diff review | Pass |
| Toggle calls existing enable/disable flow | `components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts` | Pass |
| Focused tests reflect the new placement and interaction | Updated spec files plus all three focused spec runs | Pass |
