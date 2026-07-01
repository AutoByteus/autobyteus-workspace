# Implementation Polish Note — Transient Dotted Status SVG Icon

Date: 2026-07-01
Owner: implementation_engineer
Classification: UX polish / local implementation adjustment

## Trigger

User reviewed the thicker CSS dotted-border version and it still appeared too light in Electron. The issue is likely not only color: an 8px CSS dotted border is anti-aliased into a few faint pixels, while the UX recommendation's `◌` glyph is larger and intentionally weighted.

Reference screenshot:
`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ff152619cd40471aa99b7d021d9fd315/implementation_engineer_02a22d3a8afd4c4ea0952347a05edbf3/context_files/ctx_910dbf4890e1__image.png`

## Implementation summary

- Replaced the transient status dot's CSS dotted border rendering with a dedicated inline SVG dotted-ring icon inside the existing `StatusDot variant="transient"` path.
- Increased the transient marker footprint from `h-2 w-2` to `h-3 w-3` while keeping it in the leading status-dot slot.
- Darkened transient status colors from `*-500` border colors to `text-*-700` ring colors (gray fallback to `text-gray-600` / `text-gray-500`).
- Kept exactly one marker per transient row and preserved the hollow/ghost semantics.
- Updated tests to assert SVG anatomy, ring stroke width/dash pattern, larger base class, and darker color mapping.

## Files changed

- `autobyteus-web/components/workspace/common/StatusDot.vue`
- `autobyteus-web/utils/workspaceStatusDotPresentation.ts`
- `autobyteus-web/utils/__tests__/workspaceStatusDotPresentation.spec.ts`
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`

## Local implementation checks

Passed:

- `pnpm exec nuxi prepare`
- `pnpm test:nuxt run utils/__tests__/workspaceStatusDotPresentation.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`
- `git diff --check`
- `pnpm guard:web-boundary`
- `pnpm guard:localization-boundary`
- `pnpm audit:localization-literals`

Note: localization audit still emits the existing Node module-type warning for `localization/audit/migrationScopes.ts`; audit result remains pass with zero unresolved findings.
