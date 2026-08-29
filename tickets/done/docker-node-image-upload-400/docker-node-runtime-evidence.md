# Docker Node Runtime Evidence — Nested Team Context-File HTTP 400

## Status And Purpose

- Status: Complete investigation evidence
- Approval applicability: N/A — evidence only
- Purpose: retain the focused evidence proving why image-bearing sends fail on `localhost:8001`.
- Runtime mutation: None. The container was inspected read-only and was not restarted.

## Affected Runtime

| Field | Value |
| --- | --- |
| Host endpoint | `http://localhost:8001` |
| Container | `autobyteus-server-0` |
| Container ID | `5b830f1c04ceebfe4a6a73997492a359cfd388a40b317e25efbb3d87b5ee8ea5` |
| Image tag | `autobyteus/autobyteus-server:latest` |
| Image digest / ID | `sha256:4ebe776a10df6366705053d5681346498e557324ce78651d9aa6676dcfbe4bae` |
| Port mapping | host `8001` -> container `8000` |
| Data directory | `/home/autobyteus/data` |
| Root TeamRun | `software_development_department_644a2f0d9ee84a458ee6bbd9d586ac62` |

The port-8006 container `autobyteus-server-5` uses the same image digest. Relevant environment and mount shapes match except for node-specific ports and volume/bind names.

## Exact Failure Evidence

| UTC Time | Member Address | TeamRun ID Supplied | Endpoint / Result |
| --- | --- | --- | --- |
| 2026-08-27 04:49:38 | `/requirements_engineering_team/requirements_engineer` | `software_development_department_644a2f0d9ee84a458ee6bbd9d586ac62` | `POST /rest/context-files/finalize` -> 400 |
| 2026-08-27 04:50:30 | `/requirements_engineering_team/requirements_engineer` | `software_development_department_644a2f0d9ee84a458ee6bbd9d586ac62` | `POST /rest/context-files/finalize` -> 400 |
| 2026-08-27 04:52:42 | `/product_design_prototyping_team/product_prototyper` | `software_development_department_644a2f0d9ee84a458ee6bbd9d586ac62` | `POST /rest/context-files/finalize` -> 400 |

Representative backend detail:

```text
Failed to finalize context files: Error: Unable to resolve context-file owner member '/product_design_prototyping_team/product_prototyper' for TeamRun 'software_development_department_644a2f0d9ee84a458ee6bbd9d586ac62'.
```

## Upload Succeeded Before Finalization

| Target | Stored File | Size |
| --- | --- | ---: |
| Requirements Engineer | `ctx_a6d43aca5490__image.png` | 538,300 bytes |
| Requirements Engineer | `ctx_93293935bf7e__image.png` | 792,233 bytes |
| Product Prototyper | `ctx_6bf29c38c335__image.png` | 405,417 bytes |

These staged drafts prove multipart upload, image size/MIME acceptance, and data-volume writes succeeded. The failure occurs later during final-owner resolution.

## Exact Topology Mismatch

| Agent Address | Root TeamRun ID | Exact Containing TeamRun ID |
| --- | --- | --- |
| `/head_of_software_development` | `software_development_department_644...` | `software_development_department_644...` |
| `/requirements_engineering_team/requirements_engineer` | `software_development_department_644...` | `requirements_engineering_team_73f61e1eb54440f5b5887f23b2547395` |
| `/product_design_prototyping_team/product_prototyper` | `software_development_department_644...` | `product_design_prototyping_team_25c38a2da10b448fb11f8da48d20b802` |
| `/software_engineering_team/architecture_designer` | `software_development_department_644...` | `software_engineering_team_07d9c23059c74f85bc08cb633fbd3cd2` |

The request uses the root ID for Product Prototyper, but the server contract performs an exact lookup by containing TeamRun ID plus member address.

## Why The Current Embedded Node Works

The working attachment arrived at a root Software Engineering Team:

| Field | Value |
| --- | --- |
| Root TeamRun | `software_engineering_team_f6d1310e9fc34d75957f0cf45c5dc2fc` |
| Selected Agent | `/solution_designer` |
| Selected Agent's containing TeamRun | `software_engineering_team_f6d1310e9fc34d75957f0cf45c5dc2fc` |

Because the Agent is a direct root member, the incorrect frontend substitution is masked. Both submitted images exist in that AgentRun's final `context_files` directory. The affected Docker container also contains many finalized images for direct-root Team members, disproving a Docker storage limitation.

## Production Code Trace

1. `autobyteus-web/stores/agentTeamRunStore.ts` calls `buildTeamMemberFinalContextFileOwner(rootTeamRunId, memberAddress)`.
2. `autobyteus-web/stores/contextFileUploadStore.ts` posts that owner to `/context-files/finalize`.
3. `autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts` calls `findAgent({ containingTeamRunId: owner.teamRunId, memberAddress })`.
4. `autobyteus-server-ts/src/run-history/services/team-run-execution-tree-location-service.ts` requires the Agent execution's `containingTeamRunId` to equal the supplied ID.
5. Root+nested mismatch returns no location, so finalization returns HTTP 400 before Team WebSocket send.

## Focused Test Evidence

```bash
pnpm --dir autobyteus-server-ts exec vitest run \
  tests/unit/context-files/context-file-owner-resolver.test.ts \
  tests/integration/api/rest/context-files.integration.test.ts
```

Result: `2` test files passed; `9` tests passed.

The integration suite proves:

- nested Agent + exact child/containing TeamRun ID: finalization and read succeed;
- nested Agent + root TeamRun ID: rejected as an unresolved owner.

Current web coverage misses this connection: its attachment-bearing Team send uses a direct-root member, while its nested send carries no uploaded attachment.

## Conclusion

The bug is a frontend hierarchical identity error. It is deterministic and topology-dependent, not temporary and not Docker-specific. The server exact-identity rule and storage behavior are correct. The fix must obtain the focused AgentRun's exact containing TeamRun ID from the canonical Team execution view and use it for final context-file ownership without adding a fallback.
