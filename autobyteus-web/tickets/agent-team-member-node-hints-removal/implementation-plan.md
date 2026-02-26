# Implementation Plan - agent-team-member-node-hints-removal

## Small-Scope Solution Sketch
- Remove `Required Node` and `Preferred Node` controls from member details panel.
- Remove now-unused node hint update handlers and supporting computed data.
- Normalize node hint values to `null` in initial hydration and submit mapping.
- Update component tests to assert removed controls and null normalization.

## Tasks
1. Edit `components/agentTeams/AgentTeamDefinitionForm.vue` template to remove node hint controls.
2. Edit `components/agentTeams/AgentTeamDefinitionForm.vue` script:
   - remove unused hint handlers/computed values,
   - normalize hydrated hints to null,
   - emit null hints on submit.
3. Update `components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts`:
   - remove old selector interaction expectations,
   - add assertions for hidden controls and null payload hints.
4. Run targeted unit tests.

## Verification Strategy
- `pnpm vitest run components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts`
