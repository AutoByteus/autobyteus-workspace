# Solution Revision Record

The current `requirements.md`, `investigation-notes.md`, `design-spec.md`, and approved supplement remain authoritative. This record indexes solution rounds only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer initial baseline; user-approved requirements basis | N/A | `Initial Baseline` | Complete solution package ready for architecture review |
| SR-002 | User naming feedback and approval after the initial handoff was stopped | N/A | `Design Impact` | Capability port renamed to remove redundant “Runtime” terminology |
| SR-003 | Architecture reviewer `ARCH-REV-001` round 1; `design-review-report.md` | `ARCH-DI-001`, `ARCH-DI-002` | `Design Impact` | Native schema parity and the supported package catalog-transition spine corrected for re-review |
| SR-004 | Architecture reviewer `ARCH-REV-003` round 3; `design-review-report.md` | `ARCH-DI-001` | `Design Impact` | Native application adapter now preserves raw arguments until the common Ajv gateway; generic BaseTool behavior remains unchanged |
| SR-005 | Code reviewer `CRR-001` implementation source review; `code-review-report.md` | `CR-DI-001` | `Design Impact` | Complete platform/static adapter namespace is reserved from applications independently of configured-MCP precedence |

## Revision Entries

### SR-001 — Initial application-owned agent-tool capability baseline

- Triggering role, report path, and round: Solution designer initial design round; no prior review report.
- Triggering finding IDs: `N/A`.
- Prior authoritative result: `N/A`.
- Current authoritative result: Design-ready requirements and approved intended-behavior basis have been mapped to an implementation-aware architecture in the dedicated ticket worktree.
- Why this baseline or revision entry is recorded: Establish the first reviewable solution package before architecture review.
- Resolution: Define a static manifest `agentTools` catalog and worker `agentToolHandlers`; one application-local catalog/route/gateway/call-lifecycle capability; sealed injection only into the application execution family; thin Agent Tools MCP and AutoByteus bound projections; exact binding/producer authorization; strict input/result/frame enforcement; lifecycle-aware reentry/removal/shutdown; clean manifest v5/backend definition v7 rebuild; and Brief Studio `get_brief_context` as the durable read-only proof.
- Approved behavior or requirement IDs affected: BEH-001–BEH-007; REQ-001–REQ-017; AC-001–AC-031.
- Canonical artifacts and sections updated:
  - `requirements.md` — approved Design-ready basis and resolved worker-failure posture.
  - `investigation-notes.md` — complete current-state/construction/identity/lifecycle/schema/sample evidence.
  - `design-spec.md` — complete initial architecture baseline.
  - `application-owned-mcp-intended-behavior.md` — approved intended-behavior authority.
- Supplemental artifacts updated, added, or removed: `application-owned-mcp-intended-behavior.md` marked approved; no supplement removed.
- Downstream and architecture-review impact: Architecture review must decide whether the design is ready for implementation, especially the capability assembly, task-created Team identity authorization, native/MCP precedence, lifecycle-aware catalog replacement, and strict contract transition.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: No known requirement gap. Implementation risks are the construction cycle, catalog/reentry races, schema projection parity, safe error/result handling, and environment setup for the full runtime matrix.

### SR-002 — Rename the application tool capability port

- Triggering role, report path, and round: User feedback on the design terminology after stopping the initial architecture-review pass, followed by explicit approval to continue the naming update on 2026-08-27; no review report.
- Triggering finding IDs: `N/A`.
- Prior authoritative result: The newly proposed port and its construction assembly were named `ApplicationAgentToolRuntimeCapability` and `ApplicationAgentToolRuntimeCapabilityAssembly`.
- Current authoritative result: They are named `ApplicationAgentToolCapability` and `ApplicationAgentToolCapabilityAssembly`.
- Why this revision entry is recorded: “Runtime” described where the capability is projected, not what the boundary owns, and was redundant in the canonical type name.
- Resolution: Rename the port and assembly throughout the design while retaining the same application-execution-only scope, immutable route input, MCP/native projections, gateway delegation, and construction-cycle solution.
- Approved behavior or requirement IDs affected: None; this is naming-only and does not change BEH-001–BEH-007, REQ-001–REQ-017, or AC-001–AC-031.
- Canonical artifacts and sections updated: `design-spec.md` terminology, spines, ownership map, boundaries, interfaces, naming check, folder responsibilities, and change sequence; this revision record.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Future review and implementation must use the shorter canonical name and must not reintroduce the old `RuntimeCapability` types.
- Next recipient or routing: `/architecture_reviewer`; the user explicitly requested that the updated package be sent for additional review on 2026-08-27.
- Remaining gaps or risks: No new gap; existing implementation risks remain unchanged.

### SR-003 — Correct native schema parity and the real package catalog transition

- Triggering role, report path, and round: `/architecture_reviewer`, `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`, `ARCH-REV-001`, round 1. Review history: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/architecture-review-revision-record.md`.
- Triggering finding IDs: `ARCH-DI-001`, `ARCH-DI-002`.
- Prior authoritative result: `Fail — Design Impact`. The initial subset accepted nullable/length/closed-object semantics not faithfully represented by current native `ParameterSchema`/`BaseTool`, and DS-006 skipped the supported Settings/GraphQL/package-command path that mutates live bundle state.
- Current authoritative result: The application schema contract is narrowed to an exact current native mapper-round-trippable subset with a checked native projector, and every live package/application catalog change crosses one staged `ApplicationCatalogTransitionService` before mutation/commit.
- Why this revision entry is recorded: Both reachable issues protected already-approved runtime invariance and lifecycle behavior and required actionable design correction without changing product scope.
- Resolution:
  - `ARCH-DI-001`: reject defaults, nullable, length, `additionalProperties`, composition/reference, tuple/boolean-schema, and unknown keywords; retain only non-null object/array/primitive types, required fields, string enum-or-pattern, and numeric bounds. Add `ApplicationAgentToolNativeSchemaProjector` over the unchanged current mapper/model and require canonical `ParameterSchema.toJsonSchema()` round-trip equality before native materialization.
  - `ARCH-DI-002`: replace `ApplicationCatalogRefreshCoordinator` and the catalog-mutation portion of `ApplicationReentryService.reloadAndReenter` with `ApplicationCatalogTransitionService`; revise reentry into participant-only prepare/recover/quarantine operations; enter the transition from `ApplicationPackageCommandService` before registry/root/source mutation and from REST exact-app reentry; derive old package participants from the live snapshot; quiesce/drain/stop them; stage only the target package/application slice; synchronously commit prepared bundle/tool state; reconcile/recover or close/quarantine; and restore then re-stage actual rollback state. Unrelated application lanes and catalog slices remain untouched.
- Approved behavior or requirement IDs affected: BEH-003–BEH-005; REQ-003, REQ-005, REQ-010, REQ-013–REQ-015; AC-005, AC-010, AC-019, AC-021–AC-024. Their approved outcomes are unchanged.
- Canonical artifacts and sections updated:
  - `investigation-notes.md` — corrected native schema evidence; recorded the real Settings/GraphQL/package refresh path, affected-ID evidence, architecture findings, and revised decisions/risks.
  - `design-spec.md` — current-state read, behavior map, DS-002/DS-006/DS-011, ownership and dependency boundaries, interfaces, file/folder mapping, exact schema subset/projector, catalog operation matrix, removal plan, sequence, risks, and implementation guidance.
  - `solution-revision-record.md` — this `SR-003` entry.
- Supplemental artifacts updated, added, or removed: None; the approved intended-behavior supplement remains consistent and unchanged.
- Downstream and architecture-review impact: Re-review must verify exact native schema round-trip semantics and that package import/reload/removal plus REST reentry have no direct live bundle/tool mutation bypass. Implementation must remove the refresh coordinator and old reentry bundle-mutation entrypoint rather than retain wrappers; revised reentry remains only as an internal participant lifecycle owner.
- Next recipient or routing: `/architecture_reviewer` with the cumulative package, `design-review-report.md`, and `architecture-review-revision-record.md`.
- Remaining gaps or risks: No known requirement gap. Residual implementation risks are rollback restoration/quarantine, construction assembly sealing, Team descendant authorization, result/frame parity, and full environment-backed runtime/lifecycle coverage.

### SR-004 — Preserve raw native application-tool arguments at the adapter boundary

- Triggering role, report path, and round: `/architecture_reviewer`, `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`, `ARCH-REV-003`, round 3. Review history: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/architecture-review-revision-record.md`.
- Triggering finding IDs: narrowed `ARCH-DI-001`. `ARCH-DI-002` was accepted as resolved in `ARCH-REV-003` and is not reopened.
- Prior authoritative result: `Fail — Design Impact`. The mapper-round-trippable v5 schema subset was coherent, but the design still allowed inherited `BaseTool.prepareExecution` to coerce native integer/number/boolean strings, empty-string arrays, and nested values before the common gateway, while Claude/Codex MCP passed raw JSON.
- Current authoritative result: The native bound application adapter explicitly preserves raw arguments and the common strict Ajv gateway receives the same JSON meaning from AutoByteus, Claude, and Codex. The checked `ParameterSchema` remains the native advertised definition. Generic `BaseTool`, fundamental tools, configured tools, automatic exposure, and the accepted catalog-transition design remain unchanged.
- Why this revision entry is recorded: The remaining reachable mismatch violated the already-approved runtime-invariant invalid-input contract even though schema advertisement had become portable. The correction belongs at the one native adapter that introduced the transformation, not in the fundamental tool framework.
- Resolution:
  - Add `DS-012`, the native raw-preparation bounded spine, and revise DS-002/DS-003 so both projections enter `ApplicationAgentToolCapability` with the original JSON object.
  - Make `ApplicationAgentTool.prepareExecution` the explicit native seam: bind ordinary agent identity, check pre-start cancellation, resolve and locally normalize ordinary result mode, and return the same argument object. It must not call `super.prepareExecution`, coerce, default, clone, normalize, or validate with `ParameterSchema`; inherited `BaseTool.execute` retains its post-preparation abort and `_execute` behavior.
  - Keep `ApplicationAgentToolNativeSchemaProjector` and `getArgumentSchema()` as the exact native advertisement path; make the common gateway's strict Ajv validator the sole application-schema invocation authority.
  - Add explicit integer/number/boolean string, empty-string array, nested coercible value, correctly typed value, object-identity, agent-ID, cancellation, result-mode, worker-non-invocation, and native/MCP parity cases.
  - Forbid a global `BaseTool` change or application path through generic preparation; map the seam through ownership, interfaces, dependencies, file responsibilities, sequence, risks, tradeoffs, and implementation guidance.
- Approved behavior or requirement IDs affected: BEH-003, BEH-004; REQ-003, REQ-005, REQ-010; AC-010, AC-019. Their approved outcomes and the approved requirements/supplement are unchanged.
- Canonical artifacts and sections updated:
  - `investigation-notes.md` — `ARCH-REV-003` evidence, exact `BaseTool`/ToolPhase dispatch findings, relevant file responsibility, raw-argument decision, and reviewer notes.
  - `design-spec.md` — current-state read, intended change, behavior map, health assessment, terminology, DS-002/DS-003/DS-012, ownership and boundaries, dependencies/interfaces, file/folder mapping, concrete preparation/parity example, rejection log, sequence, tradeoffs, risks, and guidance/coverage.
  - `solution-revision-record.md` — this `SR-004` entry.
- Supplemental artifacts updated, added, or removed: None; the approved intended-behavior supplement remains consistent and unchanged.
- Downstream and architecture-review impact: Re-review must verify that native schema advertisement stays exact while native invocation bypasses only application-tool coercion/validation, preserves ordinary preparation/cancellation/result-mode behavior, and reaches the same Ajv boundary with raw JSON. Implementation must not change `autobyteus-ts/src/tools/base-tool.ts` or any fundamental/configured tool path.
- Next recipient or routing: `/architecture_reviewer` with the full cumulative package, `design-review-report.md`, and `architecture-review-revision-record.md`.
- Remaining gaps or risks: No known requirement gap. Residual implementation risks are accidentally re-entering generic preparation twice through `super`, incorrect adapter-local result-mode normalization, rollback restoration/quarantine, construction assembly sealing, Team descendant authorization, result/frame parity, and full environment-backed runtime/lifecycle coverage.

### SR-005 — Separate application static-name reservation from configured-MCP collision policy

- Triggering role, report path, and round: `/code_reviewer`, `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`, `CRR-001`, implementation source review round 1. Review history: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-revision-record.md`. Reviewed implementation basis: `IR-001` in `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/implementation-revision-record.md`.
- Triggering finding IDs: `CR-DI-001`.
- Prior authoritative result: `Fail — Design Impact`. The architecture-approved design and `IR-001` treated only static adapters with `configuredMcpCollisionPolicy: "protect_static_adapter"` as forbidden application names. Browser static adapters such as `open_tab` use `prefer_configured_mcp`, so readiness omitted them and MCP session composition allowed an application route to shadow them. The code reviewer confirmed the reachable contradiction with a focused temporary Vitest probe and removed the probe after recording evidence.
- Current authoritative result: Every registered `AgentToolMcpCatalog` static-adapter name is reserved from application declarations regardless of adapter availability or configured-MCP collision policy. The configured-MCP protected/prefer rule remains unchanged and applies only when configured MCP collides with a static adapter. The corrected design is ready for architecture re-review before source correction.
- Why this revision entry is recorded: Approved `REQ-009`/`AC-013` already distinguish platform/static ownership from host-configured MCP precedence. The prior design reused a narrower policy set with a different meaning, allowing application ownership to vary with an unrelated configured-MCP decision.
- Resolution:
  - Stretch DS-001 from static adapter registration through `AgentToolMcpCatalog` and a frozen `AgentToolsMcpHost.staticAdapterToolNames` snapshot into application readiness; compare every application declaration with the complete set, including inactive and `prefer_configured_mcp` adapters.
  - Make `AgentToolMcpCatalog.resolveRuntimeSessionToolExposure` hold separate registered, active, and configured-protected static views. An application route plus any registered static adapter fails defensively. Only a non-static application name may precede configured MCP. The existing no-application configured-MCP protected/prefer branch remains unchanged.
  - Rename/remove the public/application-facing `protectedStaticToolNames`, `listProtectedStaticToolNames()`, and ambiguous complete `listSupportedToolNames()` path in favor of exact `staticAdapterToolNames` / `listStaticAdapterToolNames()` naming; carry only the immutable name set through Studio/standalone composition to readiness. Do not expose adapter objects, availability, or configured policy outside MCP ownership and do not retain compatibility aliases.
  - Keep native composition dependent on successful readiness rather than MCP internals. Add explicit `open_tab`, protected-static, inactive-static, non-static application-over-configured, and configured-browser-precedence non-regression cases.
- Approved behavior or requirement IDs affected: BEH-002; REQ-004, REQ-009; AC-013. Their approved outcomes and the requirements/intended-behavior supplement are unchanged.
- Canonical artifacts and sections updated:
  - `investigation-notes.md` — CRR-001/probe evidence, collision-owner/source trace, corrected policy separation, file implications, status, and architecture-review notes.
  - `design-spec.md` — current-state read, intended change, BEH-002, health evidence/response, terminology, DS-001/DS-002, ownership/boundaries, dependencies/interfaces/naming, subsystem/file/folder mappings, collision matrix, rejection log, sequence, tradeoffs, risks, guidance, and coverage.
  - `solution-revision-record.md` — this `SR-005` entry.
- Supplemental artifacts updated, added, or removed: None; the approved `application-owned-mcp-intended-behavior.md` already states the complete platform/static collision rule and remains unchanged.
- Downstream and architecture-review impact: Architecture re-review must verify the full static-name production path and that the configured-MCP policy is neither widened nor reused. After a pass, `/implementation_engineer` must correct `IR-001`, append its own implementation revision, rerun focused build/check evidence, and return the cumulative package through `/code_reviewer`. API/E2E must remain blocked until source review passes.
- Next recipient or routing: `/architecture_reviewer` with requirements, investigation, design, approved supplement, all solution/design review history, `IR-001`, and `CRR-001` artifacts.
- Remaining gaps or risks: No requirement gap. Implementation-sensitive risks are accidentally treating every static adapter as configured-protected (breaking browser configured precedence), filtering the reserved application set by availability/request, retaining the misleading protected-subset API as an alias, or coupling native/readiness code directly to MCP adapter internals. Prior assembly, Team identity, result/frame, transition rollback, and full runtime coverage risks remain.
