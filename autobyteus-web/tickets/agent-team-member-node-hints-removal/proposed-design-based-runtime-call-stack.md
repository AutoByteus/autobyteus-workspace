# Proposed-Design-Based Runtime Call Stack - agent-team-member-node-hints-removal

## Design Basis (Small Scope)
- Source: `tickets/agent-team-member-node-hints-removal/requirements.md`
- Target: Team definition form treats node hints as non-editable/non-applicable.

## UC-1: Member details render without node hint selectors
1. `components/agentTeams/AgentTeamDefinitionForm.vue` renders selected member details.
2. Template omits `Required Node` and `Preferred Node` sections.
3. User sees member name/type/source/coordinator only.

## UC-2: Submit payload clears node hints
1. `components/agentTeams/AgentTeamDefinitionForm.vue:handleSubmit()` validates data.
2. Payload mapper sets:
   - `requiredNodeId: null`
   - `preferredNodeId: null`
3. Emit submit payload to create/update flow.

## UC-3: Initial hydration normalizes away legacy hints
1. Watcher on `initialData` maps nodes to form state.
2. Node mapper sets:
   - `requiredNodeId: null`
   - `preferredNodeId: null`
3. Save action cannot re-persist legacy hint values from this form path.
