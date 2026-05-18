# API / E2E Testing

## Acceptance Criteria Matrix

| Criterion | Scenario | Result |
| --- | --- | --- |
| Compact nested team action label | Component tests verify nested team view action still renders as a `View` action and emits expected navigation. | Pass |
| Parent return context | Component test verifies nested team view emits `returnToTeam`; detail back action emits parent navigation with context clear. | Pass |
| Shared agent return flow unaffected | Existing component test verifies shared agent member emits `/agents` return context. | Pass |
| Unresolved nested team safety | Existing component test verifies unresolved nested team does not show a broken view action. | Pass |
| Real server frontend smoke | Dev frontend was opened against Electron embedded server `http://127.0.0.1:29695`; DOM confirmed real server-backed app and parent-return label. | Pass |

## Commands

```bash
cd autobyteus-web
pnpm vitest run components/agentTeams/__tests__/AgentTeamDetail.spec.ts
pnpm guard:localization-boundary
```

Both commands passed.
