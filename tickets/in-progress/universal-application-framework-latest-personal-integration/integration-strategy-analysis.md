# Integration Strategy Analysis — Universal Application Framework on Latest Personal

## Status And Authority

- Status: Design-ready supplement.
- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/integration-strategy-analysis.md`
- Purpose: Preserve the measured merge evidence, option decision, semantic authority rules, integration seam, and verification delta.
- Scope: REQ-001–REQ-007 and AC-001–AC-011.
- Approval: The user explicitly authorized an isolated trial merge and delegated the technical approach subject to the required latest-Personal outcome.

## Executive Decision

Use a **single semantic merge on a new branch created from latest `origin/personal`**.

This is not a blind merge. Resolve it in four classes:

1. **Generated/derived paths:** remove from the conflict/index decision and regenerate later from canonical source.
2. **Obsolete mirrored/custom-builder paths:** accept clean removal; do not resurrect them.
3. **Canonical textual conflicts:** resolve according to the authority matrix below.
4. **Canonical marker-free overlaps:** inspect all 77 because Git's auto-merge proves only textual compatibility, not semantic compatibility.

This keeps both histories, creates one reviewable integration point, and avoids replaying the same conflicts across 115 commits.

## What The Trial Merge Proved

| Measurement | Result | Interpretation |
| --- | ---: | --- |
| Personal-only commits | 238 | Personal changed substantially after the feature's base. |
| Feature-only commits | 115 | The feature is too distributed for safe manual cherry-pick selection. |
| Conflict paths | 177 | Large headline number, but not 177 design choices. |
| Generated/derived conflicts | 137 | Mechanical remove/regenerate class. |
| Obsolete custom-builder conflicts | 2 | Clean removal class. |
| Canonical source/test conflicts | about 38 | Direct semantic resolution class. |
| Changed-both paths | 227 | Auto-merge does not eliminate audit work. |
| Canonical non-generated changed-both paths | 77 | Mandatory semantic audit set. |
| Feature-only canonical additions | 110 | Reimplementation would discard a large, already-reviewed capability set. |
| Derived paths to remove/regenerate | 656 | Do not hand-merge these outputs. |

The initial merge staged 1,223 paths with approximately 187k insertions and 23k deletions before abort. That number reflects package outputs and the long-lived feature history; it is not a useful proxy for conceptual refactoring effort.

## Option Analysis

| Option | Benefit | Cost / Risk | Decision |
| --- | --- | --- | --- |
| One semantic merge into latest-Personal branch | Preserves both histories; one conflict surface; Git retains unchanged work | Requires disciplined source authority and overlap review | **Selected** |
| Rebase finalized feature onto Personal | Linear history | Replays conflicts across 115 commits, rewrites finalized branch, obscures already-reviewed corrections | Rejected |
| Cherry-pick selected feature commits | Appears incremental | Feature behavior spans many corrections; high omission and ordering risk | Rejected |
| Reimplement feature from scratch on Personal | Maximum freedom | Discards 110 feature-only canonical additions and proven integration behavior; duplicates prior work | Rejected |
| Copy feature tree over Personal | Fast mechanically | Regresses 238 Personal commits and newer lifecycle/provider behavior | Rejected |
| Merge Personal into the finalized feature branch | Preserves feature worktree | User requires the result to be based on latest Personal; retained feature branch should remain a known checkpoint | Rejected |

## Semantic Authority Matrix

| Concern | Authoritative Input | Combined Rule |
| --- | --- | --- |
| Git base and current repository shape | Latest Personal | New ticket branch starts at Personal and keeps it as first parent. |
| Studio/process startup and migration gates | Latest Personal | Preserve readable-provider and current data-migration gating/unwind. Insert the feature's explicit Studio assembly without bypassing current gates. |
| Agent run preparation, activation, event publication, teardown | Latest Personal | Preserve current prepare/publish/abort/quarantine and exact cleanup semantics. |
| Team lifecycle and identity | Latest Personal | Preserve RootTeamRun, execution-tree, rooted `memberAddress`, and current member handles/registries. |
| Provider/session evolution and native provider behavior | Latest Personal | Preserve current Codex/Claude behavior and current model/provider availability. |
| Serialized contract numbers | Latest Personal | Manifest 4, backend bundle 1, current SDK/backend definition contract 6. |
| Same package in Studio and standalone | Finalized feature | Retain separate explicit host builders over one shared application-services boundary. |
| Standalone host and application dev workflow | Finalized feature | Retain devkit commands, standalone bootstrap/static/REST/WebSocket ingress, and canonical source ownership. |
| Application-platform outward boundary | Finalized feature | Retain exactly lifecycle, REST, realtime, and host-management projections; internals stay private. |
| Package defaults and host override semantics | Finalized feature + Personal availability rules | Package baseline, sparse host override, current availability blocking; no mutation or silent fallback. |
| Application Agent Tools scope/publication | Finalized feature adapted to Personal run identity | Same session/route/provider family must use exact application active-run/publication owner. |
| Studio external MCP gateway | Latest Personal / finalized feature preserved distinction | Remains Studio-only; it is not exposed by standalone. |
| Generated and mirrored application output | Devkit/canonical source design | Delete, then deterministically rebuild after canonical source resolves. |

## Combined Target Boundary

```text
                         shared application package
                                  |
                  +---------------+---------------+
                  |                               |
          Studio host builder              Standalone host builder
       (registry/import/iframe)          (selected app/static/CLI)
                  |                               |
                  +---------------+---------------+
                                  |
                    ApplicationPlatformRuntime
                       outward projections only
                  lifecycle | REST | realtime | host-management
                                  |
          +-----------------------+------------------------+
          |                       |                        |
 launch configuration     current run/team lifecycle    app engine/backend
 package + sparse host     preparation/activation        worker + app routes
 override + readiness      rooted member identity        projections/events
          |                       |
          +-----------------------+------------------------+
                                  |
                  scoped Agent Tools session runtime
                 /mcp/agent-tools/:sessionId in both hosts
                                  |
              messaging + artifact publication/projection

Studio-only external MCP configuration route: /mcp/gateway
Standalone: does not register /mcp/gateway
```

The application business code begins after host selection/bootstrap. Both hosts then invoke the same application-platform boundaries and the same package backend/frontend behavior.

## Critical Construction Adaptation

### The problem

The finalized feature created application-scoped publication/session services against an older run-manager shape. Latest Personal now owns activation candidates and active-run state inside its current `AgentRunManager`, but provider factories that create Codex/Claude sessions must receive the application-scoped MCP session manager before the full run manager can be constructed. Reusing global defaults would violate the application boundary; a bind-later proxy would restore temporal coupling.

### Target structure

Introduce or extract one concrete **`AgentRunActivationRegistry`** under current agent execution. It is not a second run manager and not a generic container. It owns only:

- pending activation claims/candidates;
- active run registration and lookup;
- replacement/removal result shapes;
- exact run-scoped cleanup/resource attachment needed when a run leaves the registry.

Construction order:

```text
application run resources + application session scope
  -> AgentRunActivationRegistry
  -> application PublishedArtifactPublicationService(registry, awaited event pipeline)
  -> application ScopedAgentToolMcpSessionManager(exact publisher)
  -> current Codex/Claude bootstrap/factory instances(explicit scoped sessions)
  -> current AgentRunManager(registry, resources, factories, event pipeline)
  -> current team manager/factory/member graph(explicit AgentRunManager + rooted identities)
  -> orchestration, launch configuration, application engine, projections
  -> lifecycle READY
```

The registry must expose explicit transition results rather than invoke a later-registered cleanup callback. `AgentRunManager` remains the lifecycle owner and consumes those results to detach observers and revoke sessions exactly once. General-process assembly may retain deliberately named process defaults; application construction must provide every scoped dependency explicitly and is guarded by the existing architecture boundary test.

### Why this is proportionate

- It adapts one construction cycle at the exact boundary where the branches differ.
- It preserves Personal's current state machine instead of resurrecting feature-era `ActiveAgentRunRegistry`, resource manager semantics, or old team registries verbatim.
- It preserves the feature's application-scoped publication identity without global fallback.
- It does not redesign the provider or team execution domains.

## Identity And Contract Adaptation

- Use current rooted **`memberAddress`** for team member topology and override selection.
- Use current explicit **`agentRunId`** and **`teamRunId`** for run bindings; never overload one ID field.
- Use the current MCP session's run owner plus optional team identity.
- Do not restore `memberRouteKey`, flattened team-run identities, or feature-era persistent/task registry implementations when Personal has replaced them.
- Keep code symbols unversioned for the in-scope application contracts, while serialized values remain Personal's current 4/1/6 values. No aliases for old code names.

## Conflict Resolution Plan

### Phase A — Recreate the merge

1. Confirm the ticket branch is clean and still starts at the recorded Personal ref.
2. Re-fetch both refs; if either moved, stop for an evidence refresh.
3. Merge the exact finalized feature ref once using `--no-ff`.
4. Save parent refs and conflict inventory in the merge evidence.

### Phase B — Mechanical conflict classes

1. Delete generated `dist`, compiled `backend`, vendor copies, generated GraphQL clients, and importable-package outputs that the target devkit owns.
2. Delete the two custom `scripts/build-package.mjs` paths and mirrored `ui`/`backend` source trees included in the feature cleanup.
3. Do not resolve derived contents line-by-line.

### Phase C — Canonical semantic classes

1. Resolve application canonical source using Personal's current app logic plus the feature's host-neutral contracts and Codex/Luna defaults.
2. Resolve SDK/devkit schemas using Personal serialized values and the feature's developer workflow/unversioned naming.
3. Bring forward explicit host builders, four runtime projections, standalone host, launch configuration, and scoped MCP behavior.
4. Adapt those additions to current Personal run/team identity and lifecycle through the construction shape above.
5. Resolve web launch editors as sparse baseline/override UI plus Personal unavailable-model retention/warnings.
6. Port durable assertions from deleted seams to current production owners; never restore removed source to make a test compile.

### Phase D — Marker-free overlap audit

For every path in `[MODIFY_BOTH_CANONICAL]`:

- identify the behavior owner from the authority matrix;
- inspect the three-way diff, not just the merge result;
- record `Personal`, `Feature`, or `Combined` resolution plus protected BEH/REQ/AC IDs;
- verify imports use current owners and identities;
- check no optional constructor argument activates a process/global fallback.

### Phase E — Regenerate and verify

1. Run format/typecheck/build before regeneration.
2. Regenerate application bundles/importable packages from canonical source.
3. Confirm regenerated output is reproducible and package parity is exact.
4. Run focused, broad, real-host, and Electron verification.

## File Inventory Interpretation

`integration-path-inventory.txt` is the exact starting inventory:

- `ADD_FEATURE_ONLY_CANONICAL` — 110 paths to introduce, but source must be adapted to current owners.
- `MODIFY_BOTH_CANONICAL` — 77 paths requiring three-way semantic audit.
- `REMOVE_LEGACY_CANONICAL` — 16 obsolete paths. Two custom builders appear in both modify and remove sets because both branches changed them before the feature deleted them; **removal is authoritative**.
- `REGENERATE_OR_REMOVE_DERIVED` — 656 paths that must not become manually maintained merge resolutions.

The implementation engineer may refine the exact list when current source ownership requires a file rename or split, but must record the reason and may not change the behavior boundary.

## Preserved Host Behavior Matrix

| Capability | Studio | Standalone | Combined Invariant |
| --- | --- | --- | --- |
| Application selection | Registry/import and iframe launch | One selected local package | Same package identity/contents |
| Frontend bootstrap | Studio iframe provider | Same-origin provider | Same normalized bootstrap contract |
| Business backend | Mounted selected application backend | Mounted selected application backend | Same app-owned routes/services |
| Launch configuration | Package baseline + optional persisted sparse override/reset | Package baseline + optional host override | One effective resolver; no package mutation |
| Internal Agent Tools | `/mcp/agent-tools/:sessionId` | `/mcp/agent-tools/:sessionId` | Exact scoped session/publication owner |
| External MCP gateway | `/mcp/gateway` where Studio configures tools | Not registered | Host boundary stays explicit |
| Native provider tools | Provider-owned | Provider-owned | Not modified by this ticket |
| Artifact projection | Application worker and stores | Same | Same event/publication contract |
| Stop/recovery | Multi-application lifecycle | Selected-application lifecycle | Same exact cleanup semantics |

## Verification Delta

### Git and source integrity

- ancestry/merge-parent assertions;
- clean index and conflict-marker scan;
- `git diff --check`;
- deleted/generated/mirrored path audit;
- all 77 overlap decisions accounted for.

### Architecture and construction

- existing application-framework boundary suite updated for current Personal sources;
- synthetic omission/null/undefined cases for every application-scoped constructor/factory obligation, including nested Codex/Claude bootstrap/session inputs;
- general-process exemption remains exact and named;
- no application path process/global fallback.

### Package/developer workflow

- Brief and Socratic `dev`, `dev:studio`, `build`, `validate`, `start`;
- clean-root build and deterministic package contents;
- exact package parity/importability;
- Codex/Luna portable-default validation and recursive secret rejection.

### Runtime/API/E2E

- fresh-root standalone real run;
- Studio imported-package real run;
- sparse alternate resource/model override, invalid/unavailable retention, reset to defaults;
- team instruction and rooted-member prompt composition;
- scoped Agent Tools descriptor/auth/list/dispatch;
- recipient-name handoff;
- artifact publication/projection;
- worker exit/restart before publication;
- remount/recovery and exact cleanup/session revocation;
- Studio external gateway present and standalone external gateway absent.

### Personal regression

- readable-provider migration startup gate/unwind;
- current provider preparation/publication and awaited event semantics;
- current agent/team lifecycle suites affected by the 77-path overlap;
- current model-availability warnings/blocking;
- current contract/version parsing and package validation.

### Product packaging

- affected workspace typechecks/builds/tests;
- repository suites appropriate to the changed paths;
- Electron build and smoke test on the integrated candidate.

## Explicitly Rejected Shortcuts

- No `git checkout --ours` or `--theirs` across production directories.
- No 115-commit rebase.
- No selective cherry-pick as the main integration mechanism.
- No feature-tree overwrite or greenfield rewrite.
- No hand-edited generated output.
- No resurrection of removed Personal or feature intermediate seams.
- No compatibility aliases, generic DI/service locator, generic event bus, mode-switched server builder, later-bound generic proxy, singleton fallback, or package-specific branch.
- No claim that pre-integration test results validate the integrated tree.
