# Requirements

## Status
Refined

## Goal / Problem Statement
Define a documentation-grade canonical memory layout for:
1. single-agent runs,
2. agent-team runs (local-only),
3. agent-team runs (distributed multi-node),
4. nested teams (route hierarchy).

This requirements file is intended to become source material for docs and implementation, so directory trees and node partition rules are explicit and normative.

## Scope Triage
- Size: `Medium`
- Rationale: cross-cutting persistence contract across run-history, team restore, distributed partitioning, and docs synchronization.

## Non-Goals
1. No GraphQL schema redesign in this ticket.
2. No new identity model. Keep existing canonical IDs.
3. No long-lived compatibility wrappers.

## Canonical Identity Model (Must Stay Stable)
1. Single-agent run identity: `agentId`
2. Team run identity: `teamId`
3. Team member persistence/runtime identity: `memberAgentId`
4. Nested routing identity: `memberRouteKey`

## Normative Memory Contract

### 1) Global Memory Roots
```text
memory/
  run_history_index.json
  team_run_history_index.json
  persistence/...
  agents/
    <agentId>/...                    # single-agent runs only
  agent_teams/
    <teamId>/
      team_run_manifest.json         # team-level contract artifact
      <memberAgentId>/               # team member subtree (node-local members only)
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
        raw_traces_archive.jsonl     # optional
        episodic.jsonl               # optional
        semantic.jsonl               # optional
```

### 2) Separation Rule
1. `memory/agents/<agentId>/...` is reserved for single-agent runs.
2. Team-member artifacts must live under `memory/agent_teams/<teamId>/<memberAgentId>/...`.
3. Team folder must be inspectable as a complete team-memory view for members hosted on that node.

### 3) Team Manifest Rule
Path:
- `memory/agent_teams/<teamId>/team_run_manifest.json`

Manifest member binding must include:
1. `memberRouteKey`
2. `memberName`
3. `memberAgentId`
4. `hostNodeId` (for distributed runs)
5. workspace binding metadata (`workspaceRootPath` and/or node-scoped workspace binding fields)

## Detailed Case Specifications

## Case 0: Single-Agent Local Run
Example agent id: `agent_8f1a0c21`

```text
memory/
  agents/
    agent_8f1a0c21/
      run_manifest.json
      working_context_snapshot.json
      raw_traces.jsonl
      raw_traces_archive.jsonl
      episodic.jsonl
      semantic.jsonl
```

Rules:
1. No `agent_teams/<teamId>` path is required for single-agent-only runs.
2. Projection/restore for this case is based on `agentId` and `memory/agents/<agentId>`.

## Case A: Team Local-Only (All Members On One Node)
Example node: `node_local`
Example team id: `team_cls_a12f9031`

Members:
1. `professor` -> `member_aa01`
2. `student` -> `member_bb02`

### Case A Directory Tree (Same Node)
```text
memory/
  agent_teams/
    team_cls_a12f9031/
      team_run_manifest.json
      member_aa01/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_bb02/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case A Rules
1. Both members are persisted under the same team folder.
2. `team_run_manifest.json` must bind both route keys to their member IDs.
3. `memory/agents/member_aa01` and `memory/agents/member_bb02` are not canonical targets for team-member persistence.

## Case A2: Team Local-Only With Nested Sub-Team
Example team id: `team_research_55d11be0`

Canonical route keys:
1. `coordinator`
2. `analysis_subteam/analyst`
3. `analysis_subteam/reviewer`
4. `writer`

Resolved member IDs:
1. `member_c001`
2. `member_a002`
3. `member_r003`
4. `member_w004`

### Case A2 Directory Tree (Nested Routes, Flat Member Folders)
```text
memory/
  agent_teams/
    team_research_55d11be0/
      team_run_manifest.json
      member_c001/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_a002/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_r003/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_w004/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case A2 Rules
1. Nested structure is represented by `memberRouteKey`, not by nested filesystem folders.
2. Filesystem layout remains `<teamId>/<memberAgentId>` flat.
3. `team_run_manifest.json` is authoritative for route-key-to-member-ID mapping.

## Case B: Distributed Team Across Node A (Host) And Node B (Worker)
Example team id: `team_dist_2ef75d44`

Member placement:
1. `professor` (`member_p111`) on `node_a`
2. `scribe` (`member_s222`) on `node_a`
3. `lab_subteam/analyst` (`member_l333`) on `node_b`
4. `lab_subteam/reviewer` (`member_l444`) on `node_b`

### Case B Host Node A Layout
```text
memory/
  agent_teams/
    team_dist_2ef75d44/
      team_run_manifest.json
      member_p111/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_s222/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case B Worker Node B Layout
```text
memory/
  agent_teams/
    team_dist_2ef75d44/
      member_l333/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_l444/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case B Rules
1. Same `teamId` appears on both nodes.
2. Node A stores manifest plus its local member subtrees.
3. Node B stores only its local member subtrees for the same `teamId`.
4. Manifest member bindings must map each member to `hostNodeId` and `memberAgentId`.
5. Restore and delete operations are node-partitioned by `hostNodeId`.

## Case B2: Distributed Mixed Placement (One Local, Multiple Remote On Same Worker)
Example team id: `team_dist_mixed_7ac93b01`

Member placement:
1. `professor` (`member_p901`) on `node_a`
2. `scribe` (`member_s902`) on `node_b`
3. `lab_subteam/analyst` (`member_l903`) on `node_b`
4. `lab_subteam/reviewer` (`member_l904`) on `node_b`

### Case B2 Host Node A Layout
```text
memory/
  agent_teams/
    team_dist_mixed_7ac93b01/
      team_run_manifest.json
      member_p901/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case B2 Worker Node B Layout
```text
memory/
  agent_teams/
    team_dist_mixed_7ac93b01/
      member_s902/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_l903/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_l904/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case B2 Rules
1. The split can be asymmetric (one local member and multiple remote members).
2. Team-memory contract is unchanged: each node stores only its local member subtrees under shared `teamId`.
3. Manifest must preserve exact `hostNodeId` per member binding for restore/projection/delete routing.

## Case B3: Distributed Host Manifest-Only (All Members Remote)
Example team id: `team_dist_manifest_only_31c4fd99`

Member placement:
1. `coordinator` (`member_c111`) on `node_b`
2. `scribe` (`member_s112`) on `node_b`
3. `reviewer` (`member_r113`) on `node_c`

### Case B3 Host Node A Layout
```text
memory/
  agent_teams/
    team_dist_manifest_only_31c4fd99/
      team_run_manifest.json
```

### Case B3 Worker Node B Layout
```text
memory/
  agent_teams/
    team_dist_manifest_only_31c4fd99/
      member_c111/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_s112/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case B3 Worker Node C Layout
```text
memory/
  agent_teams/
    team_dist_manifest_only_31c4fd99/
      member_r113/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case B3 Rules
1. Host node may hold only `team_run_manifest.json` and no local member directories.
2. This is valid when all member `hostNodeId` values are non-host nodes.
3. Projection, restore, and delete must still succeed through manifest-authoritative remote routing.

## Case C: Distributed Nested Team Across Three Nodes (A/B/C)
Example team id: `team_dist_nested_9e0436d2`

Placement:
1. `coordinator` (`member_c901`) on `node_a`
2. `planner_subteam/planner` (`member_p902`) on `node_b`
3. `planner_subteam/executor` (`member_e903`) on `node_c`
4. `reporter` (`member_r904`) on `node_a`

### Case C Node A
```text
memory/
  agent_teams/
    team_dist_nested_9e0436d2/
      team_run_manifest.json
      member_c901/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
      member_r904/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case C Node B
```text
memory/
  agent_teams/
    team_dist_nested_9e0436d2/
      member_p902/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case C Node C
```text
memory/
  agent_teams/
    team_dist_nested_9e0436d2/
      member_e903/
        run_manifest.json
        working_context_snapshot.json
        raw_traces.jsonl
```

### Case C Rules
1. Nested route segments do not alter folder hierarchy.
2. Host node with coordinator carries canonical manifest.
3. Worker nodes persist only node-local member subtrees.
4. Cross-node consistency is enforced by shared `teamId`, deterministic `memberAgentId`, and manifest bindings.

## Runtime Operation Rules (Read/Write)

### Create Team Run
1. Allocate `teamId`.
2. Resolve deterministic `memberAgentId` for each `memberRouteKey`.
3. Persist `team_run_manifest.json` under `agent_teams/<teamId>`.
4. Persist each local member under `agent_teams/<teamId>/<memberAgentId>` on its host node.

### Append Team Member Memory
1. Writes for a member append into that member's team subtree on its host node.
2. No writes to `memory/agents/<memberAgentId>` for team-member canonical storage.

### Restore Team Run
1. Load team manifest by `teamId`.
2. For each binding where `hostNodeId` is local, restore from `agent_teams/<teamId>/<memberAgentId>/...`.
3. Dispatch remote restore commands for non-local bindings.

### Projection Retrieval
1. Selection key is (`teamId`, `memberRouteKey`) at team-history boundary.
2. It resolves to `memberAgentId` via manifest.
3. Data source is that member's team subtree on local or remote host node.

### Delete Team Run
1. Team delete can execute only when run is inactive.
2. Inactive verification must be distributed-authoritative for team runtime state, not only host in-process team map.
3. Delete coordination is keyed by `teamId`; it must not require active-run-only identifiers (`teamRunId`, `runVersion`) for cleanup routing.
4. Resolve cleanup ownership exclusively from manifest `memberBindings[].hostNodeId`.
5. Delete local `agent_teams/<teamId>/<memberAgentId>` subtrees for bindings owned by current node.
6. For distributed teams, host dispatches remote delete to every distinct non-host `hostNodeId` present in manifest.
7. Team index `deleteLifecycle` must be set to `CLEANUP_PENDING` until all required node-local cleanups are confirmed.
8. Host deletes `team_run_manifest.json` and removes index row only after distributed cleanup completion criteria are satisfied.
9. Repeated delete requests must be idempotent: missing member subtree on a node is treated as already deleted, not as hard failure.

### Delete Case Matrix (Normative)

#### Delete Case D0: Local Team (Case A / A2)
1. Current node deletes all local member subtrees under `agent_teams/<teamId>/<memberAgentId>`.
2. Current node deletes `team_run_manifest.json`.
3. Current node removes row from `team_run_history_index.json`.
4. Repeat delete on same `teamId` returns idempotent success (already removed).

#### Delete Case D1: Distributed Mixed Or Split Team (Case B / B2)
1. Host sets index row to `deleteLifecycle=CLEANUP_PENDING`.
2. Host computes cleanup plan grouped by `hostNodeId` from manifest bindings.
3. Host executes local delete for host-owned member subtrees.
4. Host dispatches remote delete to each worker node with its member binding subset.
5. Worker deletes only its local member subtrees for that `teamId`; worker must not delete host-owned bindings.
6. Host finalizes delete (manifest + index row removal) only after all worker acknowledgements.
7. Any worker failure keeps host record in `CLEANUP_PENDING` and preserves manifest for retry routing.

#### Delete Case D2: Host Manifest-Only (Case B3)
1. Host has no local member subtree to delete and keeps only manifest/index coordination state.
2. Host dispatches delete to all worker nodes listed in manifest bindings.
3. Workers delete their local member subtrees.
4. Host removes manifest/index only after all worker acknowledgements.

#### Delete Case D3: Distributed Nested Team (Case C)
1. Cleanup ownership is resolved by `memberRouteKey -> memberAgentId -> hostNodeId` from manifest bindings.
2. Duplicate leaf names across different route branches must not affect cleanup targeting.
3. Each node deletes only its own leaf-member subtrees.
4. Host finalization still requires all participating nodes to acknowledge completion.

#### Delete Case D4: Partial Failure And Retry
1. If one node is unreachable, host records pending cleanup (`CLEANUP_PENDING`) and returns retryable delete result.
2. Next delete attempt retries only remaining node groups; already deleted node groups remain no-op success.
3. Final success transition is atomic at host boundary: manifest removal + index row removal after all node groups completed.

#### Delete Case D5: Runtime-State Drift Safety
1. If distributed runtime indicates team still active on any node, delete must not proceed with history removal.
2. System returns explicit inactive-precondition failure and requires terminate/stop reconciliation first.
3. Delete flow may perform a bounded runtime-state reconciliation check before declaring precondition failure.

#### Delete Case D6: TeamId Disambiguation Across Distributed Runtime Bindings
1. Worker runtime-state/probe and cleanup guard logic must use explicit host `teamId` identity, not only `teamDefinitionId` or `teamRunId`.
2. Distributed bootstrap/runtime-binding contract must propagate host `teamId` to worker run-scoped bindings.
3. If multiple historical teams share one definition lineage over time, delete/preflight must target only the requested `teamId`.

## In-Scope Use Cases
1. Operator opens `memory/agent_teams/<teamId>` and sees team manifest plus member folders directly.
2. Local-only team restore succeeds using only team-scoped member folders.
3. Distributed team restore succeeds with host/worker partitioning under same `teamId`.
4. Distributed mixed-placement restore succeeds when one member is local and one or more members are remote (for example `scribe` on `node_b`).
5. Distributed manifest-only host case succeeds when all members are remote.
6. Nested team route identity remains deterministic and correctly mapped in manifest.
7. Local team delete (Case D0) removes member subtrees, manifest, and index row idempotently.
8. Distributed split/mixed delete (Case D1) cleans local + remote node partitions using manifest `hostNodeId`.
9. Host-manifest-only delete (Case D2) succeeds even when host has zero member subtrees.
10. Distributed nested delete (Case D3) routes cleanup by route-key-derived bindings without leaf-name ambiguity.
11. Partial-failure delete (Case D4) transitions to retryable pending lifecycle and can resume without corruption.
12. Final delete success removes manifest/index only after all node partitions report complete cleanup.
13. Runtime-state drift case (Case D5) blocks delete when any node still reports active runtime for the same `teamId`.
14. TeamId disambiguation case (Case D6) ensures runtime probe/cleanup guards do not cross-match unrelated teams from the same definition lineage.

## Acceptance Criteria
1. Requirements explicitly document single-agent memory layout.
2. Requirements explicitly document local team memory layout.
3. Requirements explicitly document distributed team memory layout with host Node A and worker Node B trees.
4. Requirements explicitly document distributed mixed-placement variant (for example local `professor`, remote `scribe`).
5. Requirements explicitly document host-manifest-only distributed variant (all members remote).
6. Requirements explicitly document nested team layout behavior.
7. Team member canonical storage path is documented as `memory/agent_teams/<teamId>/<memberAgentId>/...`.
8. Team manifest path is documented as `memory/agent_teams/<teamId>/team_run_manifest.json`.
9. Manifest binding fields and meaning are explicitly documented.
10. Node partition rule by `hostNodeId` is explicitly documented.
11. Restore/read/write/delete path rules are explicitly documented.
12. `memory/agents/<agentId>` is explicitly scoped to single-agent runs.
13. Requirements are suitable for direct promotion into docs.
14. Requirements are sufficiently concrete to drive proposed design and implementation.
15. Requirements include explicit delete matrix for local, distributed split/mixed, host-manifest-only, and nested distributed cases.
16. Requirements define `deleteLifecycle` state expectations (`READY`, `CLEANUP_PENDING`) and transition intent.
17. Requirements define idempotent delete semantics for repeated requests and already-deleted member subtrees.
18. Requirements define partial-failure retry behavior for unreachable worker nodes.
19. Requirements define finalization gate: manifest/index removal only after distributed cleanup completion.
20. Requirements define distributed-authoritative inactive precondition before delete finalization.
21. Requirements define cleanup transport semantics that are `teamId`-scoped and independent of active run envelope identifiers.
22. Requirements define explicit `teamId` propagation in distributed runtime binding/probe contracts.

## Constraints / Dependencies
1. Keep identity model stable (`agentId`, `teamId`, `memberAgentId`, `memberRouteKey`).
2. Keep existing GraphQL operation names stable for this ticket.
3. Distributed runtime must preserve `hostNodeId` ownership semantics.
4. Distributed command path must support host-to-worker history delete cleanup for inactive team runs.
5. Team history index lifecycle state must be persisted durably across process restarts.
6. Delete transport contract must remain decoupled from active-run routing abstractions.
7. Distributed bootstrap/binding schema must carry host `teamId` as first-class field.

## Assumptions
1. `memberAgentId` generation remains deterministic from `teamId + memberRouteKey`.
2. Team restore remains durable-state restore; ephemeral in-memory runtime state is recreated.
3. Team manifest is available on host node for restore coordination.

## Risks
1. Historical runs currently persisted under global `memory/agents/<memberAgentId>` will be unsupported after canonical cutover unless explicitly migrated.
2. Incomplete distributed cleanup sequencing can leave orphan member subtrees on worker nodes.
3. If manifest/member subtree becomes inconsistent, projection and restore may diverge.
4. Missing or stale `hostNodeId` in manifest can route delete to wrong node partition.
5. Crash between node cleanup and host finalization can strand teams in `CLEANUP_PENDING` without retry policy.
6. If delete flow relies on runtime-envelope identifiers (`teamRunId`/`runVersion`), cleanup may fail for inactive runs lacking active bindings.
7. If worker runtime binding lacks explicit host `teamId`, inactive-preflight can misclassify active state under same definition lineage.

## Decisions Finalized In Design Review
1. Legacy history policy: explicit legacy cutoff. Pre-canonical team-member data under global `memory/agents/<memberAgentId>` is not part of target support.
2. Worker-node diagnostic policy: no worker-side manifest shard. Worker persists only node-local member subtrees under shared `teamId`.
