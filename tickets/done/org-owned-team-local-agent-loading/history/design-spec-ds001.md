# Design — ORG-LOCAL-AGENT-20260916-001 / DS-001

## Solution And Approval Basis
SR-001 approved requirements-doc.md (user explicitly “requirement is clear…continue” after ownership explanation); design Ready, SR-002. Canonical investigation: investigation-notes.md in this ticket. No Product artifact needed; no UI redesign. Current workspace/base/finalization context in requirements and bootstrap-handoff.md.

## Current-State Read
An Org definition references an indexed owned Team by opaque ID; the Team references a local Agent relative to itself. The flat resolver builds a team-local Agent identity with the full owning Team identity. File Agent provider cannot locate an Org-owned Team source, so admission excludes a valid Org. Separately, normal exact Team service reads treat the public catalog cache as exhaustive even for parent-owned Teams. Fresh Team reads already work. Owners/contracts are present; the missing integration is local. Investigation records both gaps and limits of earlier tests.

## Task Size And Architectural Risk (Mandatory)
- task_size: Medium. Five bounded production files (source locator, two file readers, Team cache, identity classifier) plus focused tests/fixture and maintained docs if necessary. No frontend change planned.
- architectural_risk: Low. Reuses existing typed Org-owned source index/current-schema identity; fixes read dispatch within existing providers. No new ownership, persistence, API, security/permission, concurrency or deployment semantics. Public catalog remains non-exhaustive for owned definitions by design. No writer reachability extension.
- Escalate if fixing supported flow requires changed identity/schema, new ownership or write permission, cache inventory expansion, runtime lifecycle changes, or other material boundary change. Do not silently widen scope or infer L-001 resolution.

## Architecture Investigation Evidence
See investigation-notes post-approval inventory: missing findTeamSourcePaths variant, existing Team getById index adaptation, cached Team exact-read gap, real mounted instruction caller, existing Agent cache bypass, direct current package samples, and pinned personal recursive-owner comparison. Sources are not runtime success; implementation/API tests remain outstanding.

## Intended Change
1. Extend existing Team source locator with explicit read Org-root context and use the exact Org-owned source index for tagged owned-Team identities. Return normalized existing ResolvedTeamSourcePaths (teamDir=definitionDir, localTeamId=localDefinitionId); no decoded path inference.
2. Pass read Org roots from FileAgentDefinitionProvider.readTeamLocalAgent and FileAgentTeamDefinitionProvider.getById. Replace the latter's duplicated inline Org index/read mapping with this single source-locator path.
3. Add a Team-family classification predicate alongside existing isAgentOrgOwnedAgentDefinitionId. Family detection is only routing; exact index remains authoritative. CachedAgentTeamDefinitionProvider.getById sends an owned-Team ID directly to persistence.getById without populating/inserting into catalog. Preserve errors/nulls; do not negative-cache these reads.
4. Keep remaining discovery/listing, write/update/delete source resolution and guards unchanged. Exact-reading an owned definition must not grant mutation capability or publish it as shared.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Requirements / AC | Trigger | Current -> target | Spine |
|---|---|---|---|---|
| BEH-001 | REQ/AC001,002,004 | Register/import/reload/startup; inspect/run an Org-owned member | Missing local Agent/Team -> exact owned definitions resolve; ownership preserved | DS-001,002 |
| BEH-002 | REQ/AC002,003,004 | Existing shared/application/direct Org reads | Preserve existing results, catalog visibility, laziness and writer boundaries | DS-001,002 |
| BEH-003 | REQ/AC003 | Missing referenced owned child | Null/unavailable, never borrow unrelated same-name child | DS-001,002 |

## Relevant Supplemental Task Artifacts
Canonical supplement inventory is in investigation-notes.md. External package IR-002 handoffs are evidence only and remain externally owned. Prior cumulative analysis report contains user/context and personal comparison. No private package contents committed. No additional behavior supplement.

## Task Design Health Assessment (Mandatory)
Bug Fix; issue Yes; root cause Local Implementation Defect / Missing Invariant: exact child reads must resolve the immediate owner independently of public catalog membership. Refactor needed now: small local consolidation of duplicated Org-Team source mapping into the existing Team source locator. No new subsystem or generic resolver. Remove inline read-only duplication; preserve explicit writer guards. Existing schema, source index and Agent read mechanism fit scope. Performance/global catalog inventory and other migration issues deferred; no performance claims.

## Terminology
Org-local means directly owned by the Org. Team-local Agent means directly owned by its Team, even if Team is Org-local. Tagged opaque ID identifies a family, not an instruction to derive a filesystem path. Public catalog is not an exhaustive owned-definition inventory.

## Design Reading Order
Evidence/approved behavior -> source and cache owners -> file deltas -> regression coverage. Compact tables below apply template proportionately; no speculative runtime machinery.

## Legacy Removal Policy (Mandatory)
No backward compatibility; remove legacy code paths. This task introduces no legacy schema path. Do not copy old recursive Team ownership parser; old personal branch is evidence for resolving the immediate owner, not target code. Remove duplicated Org-owned Team read mapping after centralization.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
Definitions: Directly Usable — No Migration. Representative current Org packages have org.md/org-config.json, indexed org_local Team IDs, Team files beneath agent-teams/, and Agents beneath each Team's agents/. Existing current reader correctly interprets their contents once the source is resolved. Two real converted packages are evidence, not a bulk rewrite inventory. Preserve IDs, roles/handoffs/assets/defaults/file bytes and source privacy. Only lookup changes; no serializer/schema change, no new ledger, no import-time rewriting. Runtime/history/DB: Not Affected. No discard/rebuild or migration plan applicable.

## Data-Flow Spine Inventory
| ID | Scope | Start -> end | Owner / purpose |
|---|---|---|---|
| DS-001 | Primary end-to-end | Startup/import/reload -> source registration -> definition admission -> file Team/Agent providers -> exact source -> topology/handoffs -> available Org catalog/detail | DefinitionAdmissionService owns admission, providers own read resolution |
| DS-002 | Primary end-to-end | Ordinary Org member read/run -> Org planner/mounted context -> definition services -> exact cached/fresh provider dispatch -> source index/files -> correct member definition/instructions | Existing services/providers; preserve owner-specific result |

## Primary Execution Spine(s)
DS-001: external package registration -> source registry -> admission -> flat member resolution -> Agent file provider -> Team source locator -> Org-owned index -> existing Team-local Agent reader -> admitted Org.
DS-002: Org run planner / mounted context -> Team/Agent definition service -> exact provider read (cache bypass for owned identity) -> indexed file source -> definition returned -> existing run setup/instructions. No runtime-owner changes.

## Spine Narratives (Mandatory)
DS-001 first correlates the Org's current member ref with its physical owned Team. The Agent reader then uses that Team directory, not a top-level guessed folder, to read the Team-local Agent. Admission stays the gate; a truly absent child still excludes its parent.
DS-002 normal Team reads bypass only the non-owning catalog cache for owned IDs, as Agent reads already do. Current persistence/index establishes identity and content, returns null/errors truthfully, and does not publish the child into the shared catalog. The existing planner/mounted context receives that result without separate bespoke file access.

## Spine Actors / Main-Line Nodes
Registry, admission, topology resolver, definition services/providers, Team source locator, existing Org-owned source index and Agent reader. No new manager/event owner.

## Ownership Map
Admission owns availability; topology owns member resolution; cache owns shared/application catalog snapshot, not owned inventory; file providers own domain reads; Team source locator owns source selection/adaptation; Org-owned index owns exact ID-to-source correlation; Agent reader owns file parse and immediate Team ownership. Runtime owns activation unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)
Existing GraphQL/catalog/services remain unchanged; must not acquire source-path selection or filesystem probing.

## Removal / Decommission Plan (Mandatory)
Remove FileAgentTeamDefinitionProvider.getById's duplicated inline Org source mapping when routed through locator. Keep its index import if update/delete guards still need it. No whole-file removal. No obsolete recursive Team machinery reintroduced.

## Return Or Event Spine(s) (If Applicable)
Synchronous async-return definitions/null/errors flow back through existing service/admission to caller. No new event propagation.

## Bounded Local / Internal Spines (If Applicable)
N/A: bounded source selection, no new loop/state machine. Existing index enumeration remains its owner.

## Off-Spine Concerns Around The Spine
Exact Org index serves source locator; local-Agent path validation/ownership labeling serves Agent reader; tagged family classifier serves locator/cache dispatch. No new caching policy, diagnostics service or generic traversal.

## Ownership Boundaries
Services use provider APIs; providers use source locator; locator resolves Org-owned IDs through index. IDs remain opaque to callers. Read source discovery is not mutation authorization.

## Boundary Encapsulation Map
| Boundary | Internal mechanism | Allowed callers | Forbidden bypass |
|---|---|---|---|
| Team source locator | Org index, shared/application source adapters | File Team exact read and local Agent read | UI/admission decoding opaque ID into a path |
| Definition provider | Source lookup, parse, cache policy | Existing definition services/admission | Runtime reading files to compensate for missing provider |

## Dependency Rules
Pass explicit Org roots from current AppConfig (server-data plus registered external roots). Do not instantiate Team domain service inside Agent provider (would create circular admission/Agent dependency). Locator may depend on existing low-level Org source index (already type-linked); index does not depend on domain providers. Keep current write lookup context unchanged. No directory-name-only fallback across owners.

## Interface Boundary Mapping
Existing findTeamSourcePaths gains an explicit optional fourth readOrgRoots context (default empty list for callers without Org read capability). For a recognized Org-owned Team identity: require exact indexed source from those roots, return normalized source or null; do not fall through to shared directories on a missing owned ID. For other identities retain existing application/shared dispatch. This contextual argument is current source discovery, not a legacy overload or schema compatibility branch.
Classifier isAgentOrgOwnedTeamDefinitionId parallels existing Agent predicate; classify only and never return owner/path components. Cached Team getById signature unchanged; call persistence.getById for tagged owned Team. Agent local reader still consumes existing ResolvedTeamSourcePaths.

## Interface Boundary Check
Source locator selects one Team subject with explicit ID/context; predicates classify subject only; cache returns exact Team definition. No mixed Agent/Team API introduced. Null/error propagation unchanged. Writer callers do not receive new Org-root context.

## Main Domain Subject Naming Check
Reuse Team source paths, Org-owned definition source index, file/cached definition providers. No vague helper/support names, new facade, or backend rename.

## Existing Capability / Subsystem Reuse Check
Reuse Org source index, typed source union, Team-local Agent reader, Agent cache pattern and identity utility. Extend only missing lookup/cache dispatch; no new registry or recursive resolver.

## Subsystem / Capability-Area Allocation
Team definition providers own unified Team source selection/exact cached reads. Agent definition provider supplies Org-root read context for its immediate-owner lookup. Org identity utility owns subject classification. Admission/runtime/schema stay unchanged.

## Draft File Responsibility Mapping
Production candidates: team-definition-source-paths.ts (source variant), file-agent-team-definition-provider.ts (consolidated read), file-agent-definition-provider.ts (read context), cached-agent-team-definition-provider.ts (exact owned bypass), agent-org-owned-definition-id.ts (Team family classifier). Tests below validate all paths. No frontend/module added.

## Reusable Owned Structures Check
Reuse ResolvedTeamSourcePaths and its Org-owned discriminated member. Mapping definitionDir/localDefinitionId to teamDir/localTeamId occurs once in locator. Do not create parallel ownership DTO or flatten Org metadata into every Agent.

## Shared Structure / Data Model Tightness Check
Existing kind discriminant and canonical definitionId remain source of truth. Agent ownershipScope remains team_local, ownerTeamId is full canonical owned Team ID. Do not change to agent_org_owned or invent redundant owner IDs for this fix.

## Final File Responsibility Mapping
Same five production candidates above. One source-lookup authority for exact Team reads replaces inline duplication. Existing index and Team-local reader unchanged unless concrete tests show a narrowly related defect; report design impact before widening semantic scope.

## Applied Patterns (If Any)
Existing provider/source-index separation and exact-owned cache bypass. No new pattern abstraction.

## Target Subsystem / Folder / File Mapping
All production paths under autobyteus-server-ts/src/:
- agent-team-definition/providers/team-definition-source-paths.ts: extend read lookup, existing normalized union.
- agent-team-definition/providers/file-agent-team-definition-provider.ts: route getById through unified locator, preserve writes.
- agent-definition/providers/file-agent-definition-provider.ts: pass getReadOrgRoots for readTeamLocalAgent only.
- agent-team-definition/providers/cached-agent-team-definition-provider.ts: owned exact read-through without catalog insertion.
- agent-org-definition/utils/agent-org-owned-definition-id.ts: Team family predicate, no path parser.
Tests under tests/unit/agent-team-definition and tests/integration/collaboration-definition-admission (or existing neighboring suite): real-source missing-chain regression plus cached-service/normal Org consumption. Use generated temporary fixtures, not copied private packages. Maintained docs only if lookup contract descriptions need correction.

## Folder Boundary Check
Existing persistence-provider and identity folders fit. No transport/domain/runtime layering changes; no new shared dumping ground.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
Org -> org_local Team -> team_local Agent resolves `agent-orgs/org/agent-teams/team/agents/worker/agent.md`. Retain Team-local Agent ID with complete owning Team ID. Bad: searching top-level agent-teams/team, decoding an Org ID into a guessed path, setting every descendant org_local, or exporting it to shared so old lookup works.

## Backward-Compatibility Rejection Log (Mandatory)
Old personal recursive Team-local Team reader: rejected, obsolete topology. Shared extraction workaround: rejected by user, changes ownership. Direct file injection in admission tests: rejected as acceptance substitute, masks production defect. Dual schemas/writes: N/A; current schema only.

## Derived Layering (If Useful)
Unchanged services -> providers -> source-index/file adapters. No additional layer.

## Change / Refactor Sequence
1. Add real authored temporary Org->owned Team->local Agent regression; assert current failure, and cache exact-owned failure separately.
2. Implement Team identity predicate, locator variant, reader wiring and remove inline mapping duplication.
3. Implement symmetric Team cache read-through; owned reads never populate shared inventory.
4. Validate controls/negative cases, real admission/handoff/planner/mounted service path, preserve file hashes and mutation refusal. No runtime data migration.
5. Implementation self-check/build, then normal applicable API workflow. API validates actual isolated frontend import/reload/detail and ordinary owned-member Send; no user Electron restart or package edits. Finalization later requires user acceptance/Git authorization.

## Key Tradeoffs
Exact indexed reads may perform enumeration just as existing direct Org reads do; avoids stale/exhaustive-cache assumption without introducing a new cache lifecycle. No startup-speed optimization claim. Shared/application read paths remain unchanged. Contextual roots prevent accidentally expanding independent write routes.

## Risks
Tests that hand-create Agent definitions can hide source defects; positive tests must traverse actual provider. Cached owned IDs must not become shared catalog rows. Malformed/missing owned ID must not fall through to unrelated shared path. Parent-owned mutation guards must remain intact. Prior L-001 and unrelated runtime failure possible; classify on evidence, no success assumption. Original private fixtures remain external/private.

## Guidance For Implementation
Durable minimum: real external and server-data Org roots; owned Team/local Agent read with exact identity/source/instructions/tools/defaults preserved; real admission/topology/handoffs; cached Team owned read before/after catalog fill/refresh without insertion, missing/null/error behavior; same local names in two Orgs isolated; missing referenced Agent/Team rejected; direct Org Agent/shared/application controls; repeated read hashes unchanged. Include read-only mutation guard control (owned Team update/delete still denied; do not enable separate Agent writes by passing Org roots to mutation lookup). API acceptance must not replace providers with manual filesystem resolver, as prior package structural test did. No test pass currently claimed. Run Vitest non-watch per AGENTS.md; report build/typecheck limits honestly. Stop for design impact if source investigation exposes material changes beyond these read owners.
