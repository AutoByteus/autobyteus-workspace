# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Refactor the current singular `publish_artifact` agent tool API to the canonical plural `publish_artifacts` API with a clean-cut replacement and no backward compatibility.

Target canonical contract:

```ts
publish_artifacts({
  artifacts: [
    { path: string, description?: string | null }
  ]
})
```

A single artifact must use the same tool with a one-item `artifacts` array. Built-in agents, prompts, configs, tests, and runtime exposure must move to the plural API. The singular `publish_artifact` tool must not remain registered, exposed, allowlisted, discoverable, selectable, or supported as an alias.

## Investigation Findings

- Current repo has `publish_artifacts` in zero tracked active files and `publish_artifact` references across 37 tracked files outside tickets/tmp/node_modules, including application source, generated application packages, runtime tool adapters, shared exposure gating, and tests.
- Current singular tool contract is centralized in `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts` as `{ path, description? }`, and all native/Codex/Claude runtime adapters reuse that contract.
- Current durable publication behavior is already owned by `PublishedArtifactPublicationService.publishForRun(...)`, which snapshots the file, writes the published-artifact projection, emits `ARTIFACT_PERSISTED`, and relays to application artifact handlers where applicable. The plural refactor should reuse this owner rather than duplicate persistence/event behavior in tool adapters.
- Current runtime exposure is controlled by agent `toolNames`: native AutoByteus creates registered tools by name, Codex exposes a dynamic tool only when `publishArtifactConfigured` is true, and Claude builds an MCP tool + allowed-tools list only when the same shared exposure flag is true.
- Built-in Brief Studio and Socratic Math agent configs/prompts currently teach `publish_artifact`, and their committed generated/importable packages also contain copied singular references.
- User clarification on 2026-05-05 requires no backward compatibility. Therefore old/custom configs that still list `publish_artifact` are unsupported by this change and must not receive an artifact-publication tool.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / agent-facing API cleanup with a strict plural batch capability.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed Now.
- Evidence basis: The user explicitly identified singular/plural tool-choice confusion, requested a canonical plural API, and clarified that no backward compatibility should be kept. Current code has only the singular contract and runtime exposure name, while application prompts/configs/tests depend on it.
- Requirement or scope impact: The implementation must replace the shared contract, each runtime exposure adapter, built-in app prompts/configs/generated packages, tests, and discoverability behavior together so plural is the only artifact-publication tool.

## Recommendations

- Replace `publish_artifact` with `publish_artifacts` as the only registered artifact-publication tool.
- Make the plural input schema exactly one top-level `artifacts` array.
- Put plural input normalization and per-item validation in the shared published-artifact tool contract file so native AutoByteus, Codex, and Claude do not each define their own schema rules.
- Add one shared batch publication path that calls existing `PublishedArtifactPublicationService.publishForRun(...)` once per artifact, preserving the existing durable snapshot/projection/event semantics for every item.
- Remove the singular tool name, singular input type/normalizer, singular native tool registration, singular Codex dynamic-tool registration, singular Claude MCP/allowed-tool names, and singular exposure flags.
- Ensure built-in/source application configs and prompts use only `publish_artifacts`.
- Ensure normal tool discovery/selection surfaces show `publish_artifacts` and do not show `publish_artifact` because the singular tool is not registered.
- Update generated/importable application packages by running the application build scripts rather than only editing source copies.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

Rationale: the persistence owner stays stable, but the change crosses shared contracts, three runtime exposure paths, built-in application prompts/configs, generated packages, discovery surfaces, and several unit/integration test suites.

## In-Scope Use Cases

- UC-PAP-001: A built-in/new agent publishes one artifact through `publish_artifacts` using `artifacts: [{ path, description? }]`.
- UC-PAP-002: An agent publishes multiple artifacts in one `publish_artifacts` call using the same item shape for each artifact.
- UC-PAP-003: Built-in Brief Studio and Socratic Math agents/prompts/configs teach and expose only `publish_artifacts`.
- UC-PAP-004: Tool discovery and new-agent selection surfaces expose/select only `publish_artifacts` for artifact publication.
- UC-PAP-005: An old/custom config that still contains only `publish_artifact` receives no artifact-publication tool from native AutoByteus, Codex, or Claude runtime exposure.
- UC-PAP-006: A config that contains both `publish_artifacts` and `publish_artifact` receives only `publish_artifacts`; the singular name is ignored because no singular tool exists.

## Out of Scope

- Changing the durable published-artifact projection schema, revision schema, event payload shape, or application artifact reconciliation semantics.
- Reintroducing old application-authored artifact metadata (`artifactType`, `artifactKey`, `title`, `summary`, `metadata`, `contractVersion`, `artifactRef`).
- Building a new published-artifact frontend display surface; the current web Artifacts tab behavior remains unchanged.
- Rewriting historical run-history tool-call records that already contain the old singular tool name.
- Preserving old/custom agent configs that still request `publish_artifact`. They must be updated to `publish_artifacts` by their owners.
- Guaranteeing all-or-nothing transactionality across a multi-artifact batch. The batch tool may publish items sequentially; if a later filesystem/persistence failure occurs after earlier items have persisted, those earlier published artifacts remain durable.

## Functional Requirements

- REQ-PAP-001: The platform must register and expose a canonical `publish_artifacts` tool whose top-level input is an object containing required `artifacts` array.
- REQ-PAP-002: Each `artifacts` item must accept exactly `path: string` and optional `description?: string | null`; blank descriptions normalize to `null`.
- REQ-PAP-003: The plural tool must reject missing/empty/non-array `artifacts`, non-object items, blank/non-string paths, and any unknown fields at the top level or item level.
- REQ-PAP-004: For each normalized artifact item, publication must reuse the existing published-artifact publication owner so workspace path canonicalization, file existence checks, snapshots, projections, `ARTIFACT_PERSISTED` events, and app relay behavior stay consistent with the current durable published-artifact behavior.
- REQ-PAP-005: The plural tool result must return a list of published artifact summaries, preserving item order for successful calls.
- REQ-PAP-006: Native AutoByteus, Codex dynamic tools, and Claude MCP tools must all support the canonical plural contract.
- REQ-PAP-007: Built-in Brief Studio and Socratic Math source agent configs/prompts/team/runtime guidance must use `publish_artifacts`, and generated/importable package copies must match the source updates.
- REQ-PAP-008: `publish_artifact` must not be registered as a native tool, must not be built as a Codex dynamic tool, must not be built or allowlisted as a Claude MCP tool, and must not be represented by any singular input type/normalizer.
- REQ-PAP-009: Runtime exposure must not map, alias, translate, or otherwise support `publish_artifact`. Configured singular names should be ignored/skipped like any other unavailable tool name.
- REQ-PAP-010: New-tool discovery/selection surfaces must show `publish_artifacts` and must not show `publish_artifact`.
- REQ-PAP-011: Tests must cover plural contract validation, one-item publication, multi-item publication, plural runtime exposure, built-in package config/prompt updates, rejection of old rich artifact metadata, and absence of any singular runtime/discovery support.

## Acceptance Criteria

- AC-PAP-001: `publish_artifacts({ artifacts: [{ path: "docs/brief.md", description: "Ready" }] })` publishes one file and returns `{ success: true, artifacts: [<summary>] }` through the native AutoByteus tool path.
- AC-PAP-002: `publish_artifacts({ artifacts: [{ path: "a.md" }, { path: "b.md", description: null }] })` publishes both files in order and produces one durable artifact summary/event per item.
- AC-PAP-003: `publish_artifacts({ path: "docs/brief.md" })` and `publish_artifacts({ artifacts: [{ path: "docs/brief.md", artifactType: "old" }] })` are rejected with contract errors before any publication attempt.
- AC-PAP-004: Codex exposes a dynamic tool named `publish_artifacts` when agent `toolNames` contains `publish_artifacts`, and the dynamic tool input schema contains only the `artifacts` array shape.
- AC-PAP-005: Claude exposes/allowlists `publish_artifacts` and `mcp__autobyteus_published_artifacts__publish_artifacts` when agent `toolNames` contains `publish_artifacts`.
- AC-PAP-006: A config containing only `publish_artifact` receives no artifact-publication dynamic/MCP/native tool; no compatibility tool is exposed.
- AC-PAP-007: A config containing both `publish_artifacts` and `publish_artifact` exposes only `publish_artifacts`; no singular tool is exposed.
- AC-PAP-008: Brief Studio researcher/writer configs and Socratic Math tutor config contain `publish_artifacts` and no longer contain `publish_artifact` in source or committed generated/importable package copies.
- AC-PAP-009: Brief Studio and Socratic Math prompts/guidance show one-item array examples for single-artifact publication.
- AC-PAP-010: `list_available_tools`, GraphQL tool listing/grouping used for new selection, and available tool names include `publish_artifacts` and do not include `publish_artifact`.
- AC-PAP-011: Existing published-artifact projection/revision/application reconciliation tests continue to pass with no schema migration.
- AC-PAP-012: Targeted unit/integration tests and TypeScript build/typecheck for affected packages pass, including app package builds that refresh committed dist/importable outputs.

## Constraints / Dependencies

- Preserve the existing file-based published-artifact meaning: publication is by workspace file path plus optional description.
- Preserve existing published-artifact durable stores and application SDK event/query contracts.
- Reuse existing `PublishedArtifactPublicationService` behavior instead of duplicating snapshot/projection/event logic in runtime adapters.
- Support native AutoByteus, Codex app server, and Claude Agent SDK exposure paths.
- Do not keep singular backward compatibility.

## Assumptions

- Existing custom agents with `toolNames: ["publish_artifact"]` must be manually migrated by their owners.
- Historical run records do not need migration because durable artifact truth is stored as published-artifact summaries/revisions, not as tool-call names.
- Application package dist folders are committed/generated outputs and should be refreshed by the relevant build scripts after source prompt/config changes.

## Risks / Open Questions

- Clean-cut removal can break old/custom configs until their owners update `publish_artifact` to `publish_artifacts`.
- Multi-artifact batch publication is sequential and non-atomic; callers may observe partial success if a later item fails after earlier items persisted.
- Some UI/new-agent selection code may source tool names from more than one GraphQL resolver; all normal selection/listing paths must show only the registered plural tool.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-PAP-001 | UC-PAP-001, UC-PAP-002, UC-PAP-003 |
| REQ-PAP-002 | UC-PAP-001, UC-PAP-002 |
| REQ-PAP-003 | UC-PAP-001, UC-PAP-002 |
| REQ-PAP-004 | UC-PAP-001, UC-PAP-002 |
| REQ-PAP-005 | UC-PAP-001, UC-PAP-002 |
| REQ-PAP-006 | UC-PAP-001, UC-PAP-002 |
| REQ-PAP-007 | UC-PAP-003 |
| REQ-PAP-008 | UC-PAP-004, UC-PAP-005, UC-PAP-006 |
| REQ-PAP-009 | UC-PAP-005, UC-PAP-006 |
| REQ-PAP-010 | UC-PAP-004 |
| REQ-PAP-011 | All in-scope use cases |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-PAP-001 | Single artifact uses the same plural array contract. |
| AC-PAP-002 | Batch publication works without new persistence semantics. |
| AC-PAP-003 | The plural schema is strict and rejects old rich fields. |
| AC-PAP-004 | Codex receives canonical plural dynamic-tool exposure. |
| AC-PAP-005 | Claude receives canonical plural MCP/allowed-tools exposure. |
| AC-PAP-006 | Old singular-only configs get no artifact-publication tool. |
| AC-PAP-007 | Mixed configs expose only the registered plural tool. |
| AC-PAP-008 | Built-in configs no longer request the singular tool. |
| AC-PAP-009 | Built-in prompts teach the new one-item-array mental model. |
| AC-PAP-010 | New selection/discovery only shows plural. |
| AC-PAP-011 | Durable published-artifact behavior stays stable. |
| AC-PAP-012 | Executable validation covers the touched subsystems. |

## Approval Status

User supplied the target contract on 2026-05-05, requested the refactor, and then clarified that no backward compatibility should be kept. Requirements are marked `Refined` for architecture review with clean-cut singular removal in scope.
