# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis
- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/team-node-id-canonical-only/requirements.md`
- Source Artifact: `tickets/team-node-id-canonical-only/implementation-plan.md`

## Use Case Index
| use_case_id | Requirement | Use Case Name | Coverage Target |
| --- | --- | --- | --- |
| UC-001 | AC-002 | Canonical remote node IDs in catalog | Yes/Yes/Yes |
| UC-002 | AC-003 | Strict placement validation | Yes/N/A/Yes |
| UC-003 | AC-005 | No compatibility path | Yes/N/A/Yes |

## UC-001 Primary Path
```text
[ENTRY] FederatedCatalogResolver.federatedNodeCatalog(input)
└── FederatedCatalogService.listCatalogByNodes(input)
    ├── resolveCanonicalRemoteNodeFromDiscovery(node) [IO]
    └── NodeCatalogRemoteClient.fetchNodeCatalog(node)
        # nodeId in output is canonical runtime node id
```

## UC-002 Primary Path
```text
[ENTRY] TeamRunLocator.resolveOrCreateRun(teamId)
└── TeamRunOrchestrator.startRunIfMissing(input)
    └── MemberPlacementResolver.resolvePlacement(input)
        └── PlacementConstraintPolicy.validateHomeNodeOwnership(...)
            # strict known-node validation
```

## UC-003 Error Path
```text
[ERROR] stale/non-canonical homeNodeId
MemberPlacementResolver.resolvePlacement(...)
└── PlacementConstraintPolicy.validateHomeNodeOwnership(...)
    └── throws UnknownHomeNodeError
```
