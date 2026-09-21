# Design — Optional definition avatars

## Solution And Approval Basis
OPTIONAL-AVATAR-20260915-001; **DS-001 Ready / SR-002**. Approved requirements SR-001, reaffirmed by user explicitly naming individual Agent, Team and Org and asking to continue. No new behavior-defined supplement. Investigation-notes.md INV-001/002 owns sources and limitations. No changes to prior finalized ticket authority.
Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/optional-definition-avatar, branch codex/optional-definition-avatar; fresh base21efd0b6a49d1b771ed6a71b80b7e9e5531f09e4 from origin/requirements/flat-agent-organization-model. Eventual same unreleased base, NOT personal. No source edits or executable validation by Designer.

## Current-State Read / Architecture Investigation Evidence
| Source under autobyteus-server-ts/src | Current observation / evidence | Decision | Uncertainty |
| --- | --- | --- | --- |
| agent-definition/providers/agent-definition-config.ts:15,44; file-agent-definition-provider.ts:125,260+; application-owned-agent-source.ts:72 | Optional Agent avatar normalizes missing/null to null across normal source paths, INV-001 | Preserve Agent production code; test placements | Actual current-browser behavior pending |
| agent-team-definition/providers/agent-team-definition-config.ts:151+ | Normal reader defaults absent launch config but not avatar; strict output parser requires avatar | Default absent avatar in existing input reader | Tests pending |
| agent-org-definition/providers/agent-org-definition-config.ts:108+ | Shared exact codec serves raw input and canonical builder | Add one input boundary normalizing omission only; keep strict output | No other Org optionality implied |
| agent-org-definition/providers/file-agent-org-definition-provider.ts:63,79 | Transaction validation versus normal read | Switch read only | No source rewrite |
| agent-org-definition/providers/agent-org-owned-definition-source-index.ts:44,47 | Parent parse failure skips owned discovery | Use same Org input reader | Real source index must be tested, not mocked away |
| collaboration-definition-admission/services/definition-admission-service.ts:121 | Raw Org predecode before fresh provider | Use same Org input reader | Admission policy unchanged |
No migration/parser coupling from the removed definition migrations remains. Canonical writer contract still matters independently. No default-image UI redesign: existing Agent/Team components already branch on avatar presence; verify Org existing no-avatar presentation in implementation/API, change UI only if a supported AC exposes a real existing incompatibility and return design impact if structural.

## Intended Change
1. Team readAgentTeamDefinitionConfig: after known-key projection, normalize undefined avatarUrl to null just as root defaultLaunchConfig is normalized. Do not change strict parse/build, member refs or other key policy.
2. Org codec: add readAgentOrgDefinitionConfig(unknown). Require a record using existing error type, shallow-copy root without mutation, normalize only missing/undefined avatarUrl to null, then call existing parseAgentOrgDefinitionConfig once. Preserve extra keys in the copy so existing strict rejection of unrelated Org fields stays unchanged; this ticket does NOT introduce generic tolerant Org metadata. All present supported values, null, malformed types, defaultLaunchConfig requirement, member/refType/refScope and handoff semantics unchanged.
3. Replace Org raw-input calls in provider read, admission predecode and owned-source index. Use updated return type reference in source index if needed. Keep provider validatePackage and builder on strict canonical parser. Search remaining parse usages to verify every raw read versus write consumer is classified.
4. Agent normalizer stays untouched: it already fulfills omission behavior. Its current non-string→null handling is not tightened; Team/Org current malformed present-value rejection is not weakened. No new URI validation, coercion or avatar storage feature.
This creates one subject-owned normal reader, not a fallback/old-format adapter, and one canonical output validator. Do not spread fallback normalization across callers.

## Relevant Behavior And Production-Path Map
| BEH | Kind / requirements | Trigger | Desired/preserved outcome | Spines |
| --- | --- | --- | --- | --- |
| 001 | User / REQ001,003,004; AC001,003,004 | Import/reload/select Team | Missing/null avatar yields normal no-image definition; supplied image and admission retained | DS-001/003 |
| 002 | User / REQ001–004; AC001–004 | Import/reload Org and inspect owned members | Parent/child omission not an availability barrier; exact IDs/ownership retained | DS-001/002/003 |
| 003 | Contract/User / REQ002–004; AC002–004 | Same operation with independent or contained Agents | Preserve current normalization and normal fallback | DS-001/002 |
Supported SCN001–003 in requirements; no synthetic policy extension or new UI journey.

## Relevant Supplemental Artifacts
Prior archived API report at /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-base/tickets/done/tolerant-flat-team-package-reading/api-e2e-execution-coverage-report.md records7 missing-avatar exclusions. Evidence only, owned by API, not modified, not this ticket's validation. Complete supplement inventory in investigation-notes.md. No Product/prototype.

## Task Design Health Assessment
Bug Fix; local input-boundary defect / missing optional-field normalization. Refactor needed now: only small Org read boundary to separate raw input normalization from complete canonical write assertion. Existing owners and models remain appropriate; no subsystem refactor. Source index/admission must reuse that owner, not implement competing defaults. Agent already correct. Deferred unrelated improvements: generic Org input tolerance, optional Org launch defaults, new Agent validation, image upload/security and UI design; none required by these ACs.

## Terminology / Reading Order
Definition avatar is optional presentation metadata, not member identity or runtime configuration. Input reader normalizes omission; canonical validator asserts complete output. Read evidence → behaviors → spines/ownership → mapping/removals → sequence/checks. No extra terminology or layering needed.

## Legacy Removal Policy / Backward-Compatibility Rejection Log
No backwards-compatibility wrappers, version/refType branches, dual readers, migrations or try-strict/fallback. Omission normalization is current version-agnostic input policy. Remove direct strict-only raw Org read calls at3 sites, replacing them with reader. Preserve strict writes as distinct live responsibility. Delete no production files; remove/update obsolete tests requiring missing avatar rejection at normal read, retain canonical strict-output controls. Do not restore deleted definition-migration code. No shared global normalizer or per-caller null fixes.

## Persisted Data / State Transition Decision
**Directly Usable — No Migration.** Existing authored JSON omitted avatar simply lacks an optional image; recognized values and null already have supported internal semantics. Prior actual7 Teams rejected for absence provide concrete affected data; complete current package admission remains to validate. No changed schema/model/physical store, source ID, revision or writer output. External/package files stay byte-for-byte unchanged on read/reload; canonical writes may still emit null on ordinary explicit save. No user data deletion/reset/rebuild, image generation, database migration or runtime migration update. External repository ownership respected. Existing execution-history migration and prior definition-migration removal unchanged. No migration plan or rollout machinery required.

## Data-Flow Spine Inventory / Primary Execution Spines
| ID | Scope | Start → End | Governing owners / purpose |
| --- | --- | --- | --- |
| DS-001 | Primary end-to-end, BEH001–003 | User package import/reload → registration/discovery → family provider/input reader → admission/catalog → existing card/detail | Existing package/provider/admission owners; avatar omission must not suppress valid definitions |
| DS-002 | Primary member access, BEH002/003 | User selects Org/member → exact owned-source discovery → parent Org reader → child family provider → resolved member presentation | Org source index correlates exact IDs; child family owns its own avatar |
| DS-003 | Bounded local, BEH001/002 | Raw Team/Org config → missing-avatar normalization → strict current config | Family codec; no mutation, no semantic bypass |

## Spine Narratives / Actors / Ownership Map
DS-001: registration retains roots; providers decode each subject normally. Team and Org input readers make absent avatar null before existing validation. Semantic admission still rejects unresolved members/invalid required values; valid definitions reach unchanged UI fallback. Shared/app/owned sources use their established family readers, not special avatar routing.
DS-002: Org source index must accept missing parent avatar before it correlates owned references with physical folders. It uses the Org reader and preserves existing scope/identity checks. Each child then uses its existing Agent or Team family reader; no avatar inheritance from parent is introduced. Agent behavior is preserved, not reimplemented.
DS-003: normalization supplies only the approved optional presentation value, then strict validation guards current structure. Supplied values remain unchanged. Return flow is existing nullable avatar in definition DTO → UI; no new event/state-machine or provider work.
Thin facade: existing GraphQL surfaces remain delegates, not JSON readers. Main-line nodes above own registration, source resolution, model conversion, availability and presentation respectively.

## Off-Spine Concerns / Ownership Boundaries
- Source ownership/revision/hash: existing provider paths/descriptors; no write during read.
- Scoped references/handoffs/admission: existing resolvers; no target filtering or defaulting to fake members.
- Canonical save transaction: existing builder/validatePackage; do not replace with tolerant input boundary.
- Image error/no-image fallback: existing UI; no loader/network redesign.
Encapsulation: callers use family input boundary; Agent uses its existing normalizer. Org source index owns only discovery/correlation, not a second config policy. Upstream UI never reads raw package files. No runtime service dependency added.

## Dependency Rules / Interface Boundary Check
Team reader → Team parser; Org reader → Org parser; builders/transaction validation → strict parser. No reverse recursion/cycle, mode flag, fallback or migration import. readAgentOrgDefinitionConfig accepts unknown Org config, returns existing AgentOrgDefinitionConfigFile; singular responsibility, explicit subject. Existing Team boundary analogous. No new transport/API/schema or generic Agent/Team/Org ID guessing. Names remain natural; low ambiguity. Source index updates its type import/reference without retaining obsolete parser dependency where unused.

## Capability Reuse / Subsystem Allocation
Extend existing Team/Org codec capability; reuse provider/admission/discovery, Agent normalizer, canonical config structures and UI fallback. No new subsystem or common utility. One small read function owns normalization; no new DTO or optional-field abstraction. Shared models still contain avatarUrl:string|null as normalized output, not a second undefined state. Source input optionality does not require nullable model redesign.

## Draft / Final File Responsibilities / Folder Mapping
All production paths under autobyteus-server-ts/src. Five bounded modifications; no new production file or move/delete anticipated.
| Path | Action / responsibility | Must not contain |
| --- | --- | --- |
| agent-team-definition/providers/agent-team-definition-config.ts | Modify reader absent-avatar default | New required-field relaxation beyond avatar |
| agent-org-definition/providers/agent-org-definition-config.ts | Add input read function, preserve strict canonical parse/build | Generic Org unknown-key tolerance or optional defaults |
| agent-org-definition/providers/file-agent-org-definition-provider.ts | Switch raw read only | Write validation relaxation |
| agent-org-definition/providers/agent-org-owned-definition-source-index.ts | Switch parent decode and related type reference | Duplicated defaults, changed identity/scope matching |
| collaboration-definition-admission/services/definition-admission-service.ts | Switch Org predecode only | Admission policy changes |
Existing directories reflect provider/discovery/admission boundaries; compact in-file reader is clearer than new folder/framework. Reusable structures: existing config types; no refType/value migration. Tests belong in existing codec/definition-authoring/org-local-roundtrip/admission/Agent-provider/application source suites; add focused Org codec unit file only if useful. Update narrowly affected documentation about optional avatar. Agent production files, runtime and UI need no anticipated change. Exact tests and docs paths are implementation-owned but obligations below are authoritative.

## Concrete Examples
- Otherwise valid Team/Org file with no avatarUrl → internal avatarUrl:null; external bytes unchanged.
- Parent Org absent avatar and owned Agent absent avatar → exact owned Agent still resolvable, Agent avatar null; no parent-image inheritance.
- Supplied Team/Org avatarUrl:42 → existing validation error, not silently no-image; Agent normalizer retains its existing behavior for42.
- Missing Org defaultLaunchConfig remains governed by existing contract; do not turn this ticket into general optional-field or Org-reader redesign.

## Change Sequence / Implementation Guidance
1. Add narrow codec positive/negative tests, Team normalization, Org read boundary.
2. Switch3 Org raw-input sites; classify all remaining parser uses; keep canonical write controls.
3. Add actual provider/admission/owned-index placement regression and source nonmutation checks; preserve Agent shared/Team-local/Org-local/app-owned read coverage.
4. Implementation scoped non-watch tests and build as proportionate; then API owns executable/browser validation via normal rules. No prior pass reused, no external package edit, no user-server operation or runtime/provider startup for reading.

## Verification Intent
- Codec matrix Team/Org omitted/null/valid string/malformed-present; input not mutated; canonical strict output validation retained. Agent omission/null/value behavior unchanged.
- Actual owned source index: Org parent missing avatar + owned Agent and owned Team missing avatar + Team-local child Agent; exact identifiers and availability remain. Do not mock parent decode away. Shared/application placements use existing boundaries; narrow regression enough, no unsupported Org nesting.
- Catalog mixed package: previously missing-avatar Team definitions available if otherwise valid; still2 supplied nested parents unavailable. Check actual count rather than infer all12 now valid from prior inventory. Hash external files before/after import/reload; use isolated test server, not user config.
- Actual frontend normal catalog/select/detail no-avatar fallback for Agent, Team and Org; supplied-avatar control. Fixture Org retains all other required fields. No provider×placement inference/launch matrix needed for image metadata. Unknown outcomes reported honestly, not added acceptance scope.
- Prior optional Team defaults/tolerant metadata and removal of automatic definition conversion remain covered by relevant existing tests; no new migration test campaign required.

## Key Tradeoffs / Risks
Small dedicated Org read function preserves canonical output assertion rather than globally loosening parser; unlike Team, unrelated Org extras remain strict because not approved. Missing the index callsite would hide owned definitions despite fixing direct Org read. Main residual is integration coverage pending, not uncertain ownership. Do not promise URL reachability/security validation or stricter Agent behavior. No new concurrency, persistence or ownership authority.

## Task Size And Architectural Risk
**Small / Low.** Single optional scalar normalization in2 existing family codec owners plus3 read callsite replacements, bounded tests. Current internal models, writer contracts, semantic references, security/ownership, runtime state, migration behavior and transport unchanged. Placement coverage uses established readers; no new discovery mechanism. Content/docs size does not change classification. Escalate to Solution Designer if a fix requires reference/ownership changes, broad Org schema policy, Agent validation tightening, UI/runtime redesign or migration. Renew approval for new intended behavior. Direct implementation route subject to current rules; independent architecture/source review N/A—not applicable for this Small/Low result. Implementation self-checks and API executable validation still required.
