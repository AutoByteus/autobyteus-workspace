# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/team-cross-node-home-node-alias-fix/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/team-cross-node-home-node-alias-fix/implementation-plan.md` (solution sketch)
- Source Design Version: `v1-draft`
- Referenced Sections:
  - Solution Sketch
  - Dependency And Sequencing Map

## Use Case Index (Stable IDs)

| use_case_id | Requirement | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- |
| UC-001 | AC-001..AC-004 | Fresh remote-team bootstrap with canonicalized alias | Yes/Yes/Yes |
| UC-002 | AC-002..AC-004 | Existing definition with aliased home node bootstraps | Yes/N/A/Yes |
| UC-003 | AC-005 | Unknown home node without alias still rejected | Yes/N/A/Yes |

## Use Case: UC-001 Fresh remote-team bootstrap with canonicalized alias

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/federated-catalog.ts:FederatedCatalogResolver.federatedNodeCatalog(input)
└── src/federation/catalog/federated-catalog-service.ts:FederatedCatalogService.listCatalogByNodes(input)
    ├── src/federation/catalog/federated-catalog-service.ts:FederatedCatalogService.uniqueNodes(nodes)
    ├── src/federation/catalog/federated-catalog-service.ts:FederatedCatalogService.resolveCanonicalRemoteNode(node) [IO]
    │   ├── src/discovery/runtime/discovery-runtime.ts:getDiscoveryRuntime()
    │   └── src/distributed/node-directory/node-id-alias-service.ts:NodeIdAliasService.registerAlias(inputId, canonicalId) [STATE]
    └── src/federation/catalog/node-catalog-remote-client.ts:NodeCatalogRemoteClient.fetchNodeCatalog(node)
        # remote refs emitted with canonical homeNodeId
```

```text
[ENTRY] src/api/graphql/types/agent-team-run.ts:sendMessageToTeam(input)
└── src/distributed/ingress/team-run-locator.ts:TeamRunLocator.resolveOrCreateRun(teamId)
    └── src/distributed/team-run-orchestrator/team-run-orchestrator.ts:TeamRunOrchestrator.startRunIfMissing(input)
        └── src/distributed/member-placement/member-placement-resolver.ts:MemberPlacementResolver.resolvePlacement(input)
            ├── src/distributed/member-placement/member-placement-resolver.ts:canonicalizeHomeNodeId(member.homeNodeId, defaultNodeId)
            │   └── src/distributed/node-directory/node-id-alias-service.ts:NodeIdAliasService.resolveCanonicalNodeId(memberHomeNodeId)
            └── src/distributed/policies/placement-constraint-policy.ts:PlacementConstraintPolicy.validateHomeNodeOwnership(...)
                # validates canonical node id and proceeds
```

### Branching / Fallback Paths

```text
[FALLBACK] canonical remote node not found from discovery registry
src/federation/catalog/federated-catalog-service.ts:resolveCanonicalRemoteNode(node)
└── returns input node unchanged (no alias registration)
```

### Error Path

```text
[ERROR] remote catalog fetch failure
src/federation/catalog/node-catalog-remote-client.ts:fetchNodeCatalog(node)
└── returns degraded scope (no crash)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Existing definition with aliased home node bootstraps

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-team-run.ts:sendMessageToTeam(input)
└── src/distributed/ingress/team-run-locator.ts:resolveOrCreateRun(teamId)
    └── src/distributed/member-placement/member-placement-resolver.ts:resolvePlacement(input)
        ├── canonicalizeHomeNodeId("remote-legacy-id", defaultNodeId)
        │   └── NodeIdAliasService.resolveCanonicalNodeId("remote-legacy-id") -> "node-canonical-id"
        └── PlacementConstraintPolicy.validateHomeNodeOwnership(member, knownNodeIds, availableNodeIds)
            # passes using canonical node
```

### Error Path

```text
[ERROR] alias exists but canonical node unavailable
PlacementConstraintPolicy.validateHomeNodeOwnership(...)
└── throws HomeNodeUnavailableError
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 Unknown home node without alias still rejected

### Primary Runtime Call Stack

```text
[ENTRY] TeamRunLocator.resolveOrCreateRun(teamId)
└── MemberPlacementResolver.resolvePlacement(input)
    ├── canonicalizeHomeNodeId("missing-node-id", defaultNodeId)
    │   └── NodeIdAliasService.resolveCanonicalNodeId("missing-node-id") -> null
    └── PlacementConstraintPolicy.validateHomeNodeOwnership(...)
        └── throws UnknownHomeNodeError("member", "missing-node-id")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
