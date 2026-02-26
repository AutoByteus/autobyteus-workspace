# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis
- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/discovery-client-registration-recovery/requirements.md`
- Source Artifact: `tickets/discovery-client-registration-recovery/implementation-plan.md`

## Use Case Index
| use_case_id | Requirement | Use Case Name | Coverage Target |
| --- | --- | --- | --- |
| `UC-001` | `AC-001`, `AC-003` | Client-first startup converges after registry becomes available | Yes/Yes/Yes |
| `UC-002` | `AC-002`, `AC-004` | Unknown-node heartbeat triggers immediate re-registration | Yes/N/A/Yes |
| `UC-003` | `AC-003` | Registry-first startup behavior remains valid | Yes/N/A/Yes |

## UC-001 Primary Path (Client started before registry)
```text
[ENTRY] src/discovery/runtime/discovery-runtime.ts:startDiscoveryRuntime()
└── DiscoveryRegistryClientService.start()
    ├── setInterval(...sendHeartbeatWithRegistrationRecovery)
    ├── setInterval(...syncPeersFromRegistry)
    ├── ensureRegistered()
    │   └── registerToDiscoveryRegistry()  # may fail while registry offline
    └── catch startup error (non-fatal)

[ASYNC TICK] DiscoveryRegistryClientService.sendHeartbeatWithRegistrationRecovery()
└── ensureRegistered()
    ├── registrationInFlight guard prevents concurrent register duplication
    └── registerToDiscoveryRegistry() succeeds once registry is reachable
        # state mutation: registered=true
└── sendHeartbeat() succeeds
└── syncPeersFromRegistry() merges peers into registryService cache
    └── src/discovery/services/node-discovery-registry-service.ts:mergePeers(...)
```

## UC-001 Error/Fallback Path
```text
[ERROR] register endpoint unreachable or non-2xx
DiscoveryRegistryClientService.registerToDiscoveryRegistry()
└── sets registered=false
└── throws error
    └── consumed by start() bootstrap catch or heartbeat tick catch
        # fallback: next heartbeat tick retries ensureRegistered()
```

## UC-002 Primary Path (Unknown-node heartbeat recovery)
```text
[ENTRY] DiscoveryRegistryClientService.sendHeartbeatWithRegistrationRecovery()
└── ensureRegistered()  # registered=true from prior success
└── sendHeartbeat()
    └── receives payload { accepted:false, code:"HEARTBEAT_UNKNOWN_NODE" }
        └── throws "Discovery heartbeat rejected: HEARTBEAT_UNKNOWN_NODE"
└── catch HEARTBEAT_UNKNOWN_NODE branch
    ├── state mutation: registered=false
    ├── ensureRegistered() -> registerToDiscoveryRegistry()
    └── sendHeartbeat() retry
```

## UC-002 Error Path
```text
[ERROR] heartbeat rejected for non-unknown reason
DiscoveryRegistryClientService.sendHeartbeatWithRegistrationRecovery()
└── sendHeartbeat() throws
    └── branch condition fails HEARTBEAT_UNKNOWN_NODE match
        └── rethrow -> tick catch handles transient failure and retries next tick
```

## UC-003 Primary Path (Registry-first unchanged)
```text
[ENTRY] startDiscoveryRuntime() with registry already online
└── DiscoveryRegistryClientService.start()
    ├── ensureRegistered() succeeds immediately
    ├── sendHeartbeatWithRegistrationRecovery() succeeds without recovery branch
    └── syncPeersFromRegistry() succeeds
```

