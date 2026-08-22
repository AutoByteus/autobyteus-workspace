# Requirements — Universal Application Framework Latest-Personal Integration

## Status

Design-ready. The user explicitly authorized an isolated merge experiment and delegated selection of the safest integration method, with the governing outcome that the Universal Application Framework branch must be rebuilt on the latest `origin/personal` rather than merged into `personal` directly.

## Goal / Problem Statement

Integrate the finalized Universal Application Dual-Host Foundation from `origin/codex/universal-application-framework-proposal-analysis@a5ffd289aa58293574e44dfa8b38ed8b1978ffd0` onto the latest tracked Personal baseline `origin/personal@8ef282ba77705180d985e7000d801f0e0068cdc1`. Preserve both the feature's proven Studio/standalone contract and Personal's newer agent/team/provider lifecycle, identity, model-availability, migration, and package behavior. Resolve the two histories semantically; do not overwrite either side wholesale.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The finalized feature branch runs the same application package in Studio and standalone, but it is no longer based on latest Personal. Latest Personal does not contain the dual-host assembly. | A new ticket branch based exactly on latest Personal contains the dual-host foundation. | `personal` and the finalized feature branch remain unchanged until separate finalization instructions. | REQ-001, REQ-002; AC-001, AC-002 |
| BEH-002 | The finalized feature provides `pnpm dev`, `dev:studio`, `build`, `validate`, and `start`; latest Personal applications still use custom package builders and mirrored/generated trees. | Retain the native application developer workflow and one canonical source tree, adapted to current Personal package contracts. | A package built once remains importable in Studio and runnable as standalone. | REQ-003; AC-003, AC-004 |
| BEH-003 | Personal has newer agent/team execution state, rooted member identity, provider preparation/publication, and cleanup behavior. The feature branch has application-scoped execution/publication integration against older owners. | Dual-host application execution uses Personal's current lifecycle and identity owners while preserving application-scoped publication, messaging, cleanup, and projection. | No global/process fallback may replace an application-scoped dependency. Native provider tools and the external Studio MCP gateway remain outside the application transport change. | REQ-004, REQ-005; AC-005–AC-008 |
| BEH-004 | The feature has self-contained package launch defaults, Studio sparse overrides, host readiness validation, and Codex/Luna defaults. Personal has newer provider/model availability semantics and current contract values. | Preserve package defaults and sparse overrides while using Personal's current availability semantics, identities, and serialized contract values. Brief and Socratic defaults remain Codex App Server with `gpt-5.6-luna`. | Studio overrides never mutate the imported package; invalid/unavailable selections remain visible and block launch rather than silently falling back. | REQ-005; AC-006, AC-009 |
| BEH-005 | The two branches contain 177 textual conflicts and 227 paths changed by both; most conflicts are generated or obsolete outputs, while a bounded canonical set needs semantic resolution. | Resolve canonical source and tests owner-by-owner, remove obsolete/derived copies, then regenerate outputs only from the integrated source. | Do not hand-merge generated artifacts or restore deleted intermediate compatibility seams. | REQ-002, REQ-006; AC-002, AC-010 |
| BEH-006 | Both branches have durable verification, but neither suite alone proves the combined latest-Personal candidate. | Re-run focused architecture/source checks, both real host journeys, provider/tool/publication behavior, package parity, current Personal regressions, and Electron build. | Existing passing evidence is characterization input, not proof of the new integrated state. | REQ-007; AC-011 |

## Investigation Findings

- The isolated no-commit merge produced **177 conflict paths**: 137 generated/derived, 2 obsolete custom builders, 3 canonical application files, 7 SDK/devkit files, 18 server files, 6 tests, and 4 web files.
- Personal and the feature branch have 227 changed paths in common; 77 are canonical non-generated paths requiring semantic audit even when Git auto-merges them.
- The conflict count therefore overstates the hard part: about 38 source/test conflicts require direct resolution, but the 77 auto-merged canonical overlaps still need review.
- Latest Personal has not independently absorbed the feature: its tree lacks the explicit Studio and standalone builders, the four-projection application platform boundary, the standalone host, and maintained application devkit configuration.
- Rebase would replay the conflict surface through 115 feature commits. Selective cherry-pick/reimplementation risks omitting behavior distributed across the finalized branch. A single semantic merge on a branch created from latest Personal is the least risky and most auditable strategy.
- Personal is authoritative for newer provider and agent/team execution behavior; the feature is authoritative for the same-package/two-host boundary and its tested developer experience. The integration requires a small structural adaptation where those authorities meet, not a wholesale selection of either version.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Intended integration strategy and semantic authority matrix | REQ-001–REQ-007 | AC-001–AC-011 | Design-ready; approved by the user's delegated technical-direction instruction | Constrains how the merge may be resolved and verified. |
| `merge-conflict-inventory.txt` | Evidence: exact no-commit conflict set | REQ-002, REQ-006 | AC-002, AC-010 | Complete; approval N/A | Supports conflict classification. |
| `branch-overlap-inventory.txt` | Evidence: changed-both path inventory | REQ-002, REQ-006 | AC-002, AC-010 | Complete; approval N/A | Prevents reliance on conflict markers alone. |
| `integration-path-inventory.txt` | Evidence: add/modify/remove/regenerate candidate inventory | REQ-003–REQ-007 | AC-003–AC-011 | Complete; approval N/A | Drives detailed implementation and review inventory. |
| `merge-attempt.log` | Evidence: isolated merge transcript | REQ-002 | AC-002 | Complete; approval N/A | Proves the measured conflict surface. |

## Design Health Assessment

- Change posture: `Refactor` and integration of a previously completed `Larger Requirement`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` plus `Legacy Or Compatibility Pressure`.
- Refactor posture: `Likely Needed`.
- Evidence basis: the feature's application-scoped services target older execution owners, while latest Personal's new managers still contain process-default seams. Directly selecting either side would lose tested behavior. Generated mirrors and custom builders also conflict with the one-source devkit design.
- Requirement or scope impact: the integration may adapt internal construction and identity plumbing, but it may not add new product behavior or redesign the current Personal agent/team domain.

## Recommendations

1. Keep the dedicated branch created from latest Personal.
2. Perform one history-preserving semantic merge of the finalized feature branch.
3. Use an explicit authority matrix: current Personal owns evolved runtime behavior; the feature owns dual-host requirements and boundary behavior.
4. Delete/regenerate derived package outputs instead of manually resolving them.
5. Adapt application-scoped run/session/publication wiring to Personal's current activation and rooted-member identity model; do not resurrect feature-era registries.
6. Verify the integrated state from source, not by inheriting either branch's old test result.

## Scope Classification

`Large` — 238 Personal-only commits, 115 feature-only commits, 177 textual conflicts, 77 canonical changed-both paths, multiple packages, and real Studio/standalone/Electron verification.

## Scope Guardrail

### In-Scope Use Cases

- **UC-001:** Create an integration branch/worktree from the latest tracked Personal ref and merge the finalized feature history once.
- **UC-002:** Resolve canonical source, contract, application, server, web, SDK/devkit, and durable-test overlaps semantically.
- **UC-003:** Develop, validate, build, start standalone, and import/run the same maintained package in Studio.
- **UC-004:** Launch current agent/team resources from an application using package defaults or a valid Studio override.
- **UC-005:** Use application-scoped Agent Tools, team messaging, artifact publication, projection, recovery, and cleanup in both hosts.
- **UC-006:** Regenerate disposable outputs and prove package/source parity.
- **UC-007:** Verify current Personal behavior, dual-host behavior, and Electron packaging on the integrated candidate.

### Out of Scope

- Merging or pushing the result into `personal`, releasing, deploying, tagging, or deleting either source branch.
- Rewriting the feature branch through rebase.
- A repository-wide redesign of agent/team execution, providers, MCP, or application manifests.
- Authentication/user support, a shared external Studio MCP gateway for standalone, or alteration of native Codex/Claude tools.
- Compatibility aliases/wrappers for source seams removed on either branch.
- Hand-maintaining generated package output as an independent source of truth.

### Preserved Behavior Boundary

BEH-001–BEH-006 govern. The integrated branch must preserve latest Personal semantics except where the approved dual-host behavior explicitly extends them; Studio and standalone differ in hosting/ingress, not in application business behavior.

### Review Authority

- Every blocking Design Impact or implementation correction must cite an approved BEH, REQ, or AC ID.
- New product behavior, migration, security, or operational policy is a Requirement Gap and requires user approval.
- Technical possibility or aesthetic preference alone is non-blocking.
- Reviewer comments do not silently amend this requirements basis.

## Functional Requirements

- **REQ-001 — Latest-base isolation:** The authoritative work must remain on a dedicated ticket branch created from the fetched `origin/personal@8ef282b...`; source branches remain untouched.
- **REQ-002 — One semantic integration:** Merge the finalized feature ref once and resolve the resulting canonical overlaps by behavior and ownership, never by wholesale `ours`/`theirs` selection.
- **REQ-003 — Dual-host developer experience:** The maintained Brief and Socratic packages retain devkit-owned `dev`, `dev:studio`, `build`, `validate`, and `start`, one canonical source tree, and build-once Studio/standalone use.
- **REQ-004 — Current Personal execution authority:** Retain current Personal agent/team preparation, activation, rooted-member identity, event publication, teardown, provider availability, migration gates, and current package contract values.
- **REQ-005 — Dual-host application authority:** Retain explicit Studio and standalone assembly roots, narrow application-platform projections, package-owned launch defaults, sparse non-mutating overrides, host readiness, scoped Agent Tools session/publication, application communication, projection, recovery, and ordered stop.
- **REQ-006 — Clean source transition:** Remove obsolete mirrored/custom-builder/old-owner paths; regenerate derived outputs from the integrated canonical source; do not add compatibility wrappers or global fallbacks.
- **REQ-007 — Integrated proof:** Validate architecture boundaries and omission cases, compile/build affected workspaces, run focused and broad regressions, exercise real Brief/Socratic flows in both hosts, prove package parity, and rebuild/test Electron.

## Acceptance Criteria

- **AC-001:** `git merge-base --is-ancestor origin/personal HEAD` succeeds on the integrated ticket branch; `origin/personal` and the finalized feature ref have not been rewritten.
- **AC-002:** The merge commit has both source histories as parents, no unresolved index entries, no conflict markers, and every canonical conflict/overlap has a recorded semantic resolution owner.
- **AC-003:** From each maintained application directory, `pnpm dev` starts standalone, `pnpm dev:studio` targets Studio, `pnpm build` creates the importable package, `pnpm validate` accepts it, and `pnpm start` runs the built standalone package.
- **AC-004:** One package build is byte/contract compatible with both the Studio import path and standalone selection path; canonical source is not duplicated into maintained editable mirrors.
- **AC-005:** Current Personal preparation/activation/publication and rooted `memberAddress` semantics remain authoritative for agent and team runs; old feature-era manager/registry identity paths are absent.
- **AC-006:** Brief and Socratic package defaults resolve to `codex_app_server` + `gpt-5.6-luna`; Studio sparse overrides/reset and current unavailable-model retention/blocking operate without mutating package bytes.
- **AC-007:** Both hosts register the internal `/mcp/agent-tools/:sessionId` transport with application-scoped session/publication identity; standalone does not expose Studio's external `/mcp/gateway`.
- **AC-008:** A real team run in each host performs recipient-name handoff, publishes artifacts, projects them into the application, survives the supported recovery/restart paths, and revokes/detaches resources exactly once on termination/stop.
- **AC-009:** Current Personal readable-provider migration/startup gating, model availability, serialized manifest/bundle/SDK contract values, event-await semantics, and user-facing warnings remain intact.
- **AC-010:** Generated/derived conflicts are resolved by removal and deterministic regeneration; obsolete custom builders, mirrored source directories, old runtime owners, and compatibility aliases are absent.
- **AC-011:** The final candidate passes git integrity checks, architecture-boundary tests, affected workspace builds/typechecks, focused server/web/devkit/application suites, both real host journeys, package parity, current Personal regression suites identified during overlap review, and Electron build/smoke verification.

## Constraints / Dependencies

- Node/pnpm workspace tooling and the existing repository build/test scripts remain authoritative.
- The integration must use current Personal contract numbers: application manifest 4, backend bundle 1, and current backend/frontend SDK contract 6 where applicable; clean internal names remain unversioned.
- The application path must fail closed when an application-scoped dependency is omitted; general-process assembly may retain deliberately named defaults.
- No generic DI container, service locator, generic event bus, mode-switched `buildServer(mode)`, later-bound proxy, singleton fallback, compatibility wrapper, or package-ID special case.
- The feature's existing passing evidence and Personal's existing tests are characterization baselines only.

## Persisted Data Outcome

- Stored subject / location: Personal server database and application data roots, including package records, launch overrides, run/history state, artifact revisions, and host-managed provider configuration.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve: all current Personal data and migration ledger; launch overrides remain readable through their existing table/column semantics and are interpreted with current rooted resource identity.
- Unacceptable data loss or corruption: database replacement, copied/seeded defaults, launch override mutation, run/history loss, package mutation, or skipped Personal migrations.
- Availability/rollout constraints: Personal's current migration gates must complete before the integrated Studio runtime is ready; standalone uses its own data root and the same current migration authority.
- Related IDs: REQ-004–REQ-007; AC-005, AC-006, AC-009, AC-011.

## Assumptions

- `origin/personal@8ef282b...` and `origin/codex/...@a5ffd28...` are the explicit integration inputs until the user requests another refresh.
- Generated application outputs are reproducible from canonical source and may be deleted/regenerated.
- The user wants the existing finalized behavior, not a greenfield rewrite.

## Risks / Open Questions

- Personal may advance again before finalization; delivery must refresh and repeat semantic integration against the then-current ref.
- Auto-merged files can contain semantic regressions despite no conflict marker; the 77-path audit is mandatory.
- Exact source-file inventory may change while adapting to Personal's current owners, but behavior and boundary IDs may not drift.
- Full Electron/provider tests depend on the existing environment and credentials; unavailable infrastructure must be reported, not replaced by false proof.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001 |
| REQ-002 | UC-001, UC-002 |
| REQ-003 | UC-003, UC-006 |
| REQ-004 | UC-002, UC-004, UC-005, UC-007 |
| REQ-005 | UC-003–UC-005 |
| REQ-006 | UC-002, UC-006 |
| REQ-007 | UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Intended Scenario |
| --- | --- |
| AC-001–AC-002 | Git ancestry, parentage, worktree, conflict, and semantic-resolution audit |
| AC-003–AC-004 | Maintained application CLI workflow and package parity |
| AC-005 | Current Personal run/team identity and lifecycle characterization plus application-scope construction proof |
| AC-006 | Fresh-root defaults and Studio override/reset/unavailable-model journeys |
| AC-007–AC-008 | Real Studio/standalone Agent Tools, handoff, publication, projection, recovery, and cleanup |
| AC-009 | Latest-Personal provider/migration/model/event regression matrix |
| AC-010 | Source/derived/legacy inventory and regeneration proof |
| AC-011 | Full integrated source, API/E2E, package, and Electron evidence |

## Approval Status

Approved through the user's explicit instruction to determine the safest integration approach while ensuring the result is based on latest `origin/personal`. No production implementation is authorized until architecture review passes.
