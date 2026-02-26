# Proposed-Design-Based Runtime Call Stack

## Use Case UC-001: First message to new team where member homeNodeId is `embedded-local`

```text
[ENTRY] GraphQL: AgentTeamRunResolver.sendMessageToTeam(...)
└── AgentTeamRunManager.createTeamRun(...)
    └── team run created in memory (teamId assigned)
[ENTRY] TeamCommandIngressService.dispatchUserMessage(teamId,...)
└── TeamRunLocator.resolveOrCreateRun(teamId)
    └── TeamRunOrchestrator.startRunIfMissing(...)
        └── MemberPlacementResolver.resolvePlacement(..., defaultNodeId=<runtime host node>)
            ├── canonicalize member.homeNodeId 'embedded-local' -> defaultNodeId
            ├── PlacementConstraintPolicy.validateRequiredAndPreferred(...)
            └── placement source resolves as 'home' on runtime host node
        └── run starts without UnknownHomeNodeError
```

## Use Case UC-002: Unknown non-embedded homeNodeId still fails fast

```text
[ENTRY] MemberPlacementResolver.resolvePlacement(...)
└── canonicalize node hints
    └── non-embedded unknown IDs remain unchanged
└── PlacementConstraintPolicy.validateRequiredAndPreferred(...)
    └── throws UnknownHomeNodeError for invalid homeNodeId
```
