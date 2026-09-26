# Code Review Report — CRR-002

## Review Round Meta

- Review Entry Point: Implementation Review; round 2, fresh full source review after CRR-001's authority hold.
- Requirements, investigation, solution history, design, design review, architecture review history, implementation handoff and implementation history: canonical files in this ticket directory, reviewed as the cumulative context. Supplemental behavior artifacts: N/A.
- Relevant solution revisions: SR-005, SR-009/SR-010, approved SR-013/SR-014/E-034 and design SR-015. Relevant architecture revision: ARCH-REV-004 Pass (ARCH-REV-003 historical). Relevant implementation revision: IR-002. API/E2E and delivery revisions: N/A.
- Prior report/revision: `code-review-report.md` / `code-review-revision-record.md`, CRR-001 Blocked; C-001 held for authority, not a finding. Current revision: CRR-002.
- Source revisions: server `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926@98893d019` (implementation `dd9efb39b`, baseline `ae3aba1bf`); separate package `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-codex-skill-bundle-20260926@a140474` (base `1b1a75ee`). Commit identity rebase is indexed in IR-002.
- Failure-origin-only fields: N/A; no API/E2E execution result has arrived.

## Routing Classification Review

- Task size: **Medium**; architectural risk: **High**; selected route: independent Implementation Review.
- Evidence: provider-native permissions, public/private native-image results, shared file projection, and skill provenance cross a separate package boundary. Classification remains proportionate; no silent reroute.

## Review Scope

- Reviewed complete integrated BEH-001/002/003 production paths from chat activation through AGY capsule/provider events/Files, plus current skill resolution/materialization and the portable package. Read implementation changes against `ae3aba1bf` and IR-002 delta against `04e873ba1`; sampled relevant unchanged manager, MCP authority, file-content route, Codex/Claude resolver consumers, and tests. `git diff --check` is clean; implementation logs show 110 focused tests passed/1 skipped, later 62 passed, and 25 file/projection/REST units passed. This review does not claim live AGY/API-E2E validation or rendered UI inspection.
- Prior C-001 authority hold is resolved by explicit E-034 approval, SR-015 revised design and ARCH-REV-004 Pass; IR-002 now warns/omits semantic-invalid content. It was never a source finding.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved behavior basis: confirmed. SR-013/E-034 authorizes shared metadata/name validation, warn/omit for missing or semantic-invalid content, and hard safety/collision/source-change failures. SR-005 retains native AGY non-collaboration tool parity and native-image provenance; app MCP media is not a substitute.
- Design map: DS-001 through DS-004 are represented by the actual code, except the shared file-change projection's AGY-specific branch lacks the explicit runtime provenance required by SR-015's interface/ownership contract (F-001 below).
- No newly discovered product behavior or requirement gap. Provider's model-exposed tool profile and real image output remain verification gates, not inferred source findings.

| Behavior ID | Current Status | Production path and lifecycle evidence | Contradiction / qualification |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Chat activation → `AgyAgentRunBackendFactory.createBackend` → CLI version/model discovery → `agy-native-tool-policy.ts` → run capsule frontmatter; separately scoped `activateMcp` descriptor → `AgyStreamProcess`. Restore keeps saved capsule. | 1.2.11 names and actual model exposure require API/E2E; no MCP substitution in source. |
| BEH-003 | Confirmed with F-001 structural qualification | Native AGY `tool_name: generate_image` → `AgyStreamEventConverter` → explicit path/header verification or static failure → canonical tool event → `FileChangeEventProcessor` → projection/REST content/UI. | Shared projection's added branch does not check `RuntimeKind.ANTIGRAVITY_CLI`; F-001 is boundary fidelity, not a claim of observed wrong image output. |
| BEH-002 | Confirmed | Codex first prompt → definition `sourceInfo.agentDirPath` → detailed `SkillService` resolver → `certified_absent`/`invalid_candidate` warning omission or trusted `resolved` snapshot → manifest v1 → AGY start. | Source-safety/collision/source-change errors stay blocking; live first reply still needs API/E2E. |

## Supported Product Scenario And Reachability Gate

| Scenario ID | Related IDs | Kind / independent actor or event | Supported entry, forward path and lifecycle | Expected consequence / evidence | Validity / review use |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001/003; REQ-001/002/005; AC-001/002/005 | User asks AGY-backed Solution Designer for native image. | AutoByteus chat → new AGY run/capsule → native `generate_image` step → converter → file projection/content; failure takes safe public terminal path. | Real accessible image or accurate safe failure; SR-005, E-001/003/014/016–018. | Supported Normal Scenario / Use. |
| SCN-002 | BEH-002; REQ-003; AC-003 | User starts standalone Codex and sends first prompt. | Agent package definition/skill → detailed resolution → run snapshot → AGY activation/first reply. | Intended bundled skill when valid; E-004/005/019/020 and SR-013. | Supported Normal Scenario / Use. |
| SCN-003 | BEH-002; REQ-004; AC-004 | Supported skill-content/safety event during otherwise healthy first-turn preparation. | Contextual/global candidate inspection → typed skippable absence/semantic invalidity or coded source/collision failure → capsule/launch or safe failure. | Warn/omit invalid content, preserve peers, block unsafe source; E-028–E-034, SR-013/E-034. | Supported Explicit Edge Scenario / Use. |
| SCN-004 | BEH-001; REQ-006; AC-006 | User-approved Team/Org native-collaboration exclusion contract. | New AGY Team/Org run → native profile excludes collaboration names while MCP authority grants configured collaboration. | Tracked AutoByteus team work; E-013 and SR-005. | Supported Explicit Edge Scenario / Use. |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation or mechanism | Supported scenario / contract and independent trigger | Forward path / lifecycle / consequence | Evidence | Disposition / proportionate response |
| --- | --- | --- | --- | --- | --- |
| C-002 | Shared generated-file owner applies an AGY-specific file check without AGY runtime provenance. | SR-015 Interface Boundary and Ownership Map explicitly require AGY-native checks at file projection to use **run runtime kind and provider tool name**; SCN-001's independently supported image chat/run is the initiating path. | AGY converter emits `result.provider_state="DONE"` and `tool_name="generate_image"` → generic `FileChangeEventProcessor` branch at lines 315–321. Current gate proves only tool name/result-shape, not source runtime, so the shared owner cannot enforce its reviewed AGY-only boundary and could apply this policy to another generated-image event carrying the same shape. No current cross-provider corruption is claimed. | `design-spec.md` Interface Boundary Check, Ownership Map and Final File Responsibility Mapping; `file-change-event-processor.ts:315-321`; `agy-stream-event-converter.ts:106-118`; `AgentRunEventProcessorInput.runContext.config.runtimeKind`. | **Promote** as an established structural contract violation (F-001), not as a speculative current cross-provider failure. Add the AGY runtime-kind guard at the shared owner and a focused regression proving native AGY verification and preserved non-AGY projection. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Bounded provider policy, output adapter, skill classification per SR-015 and IR-002. | None. |
| Approved supplements | Pass | N/A; no behavior supplement. | None. |
| Data-flow spine inventory | Pass | DS-001–004 trace from chat/provider to tool/Files or first reply. | None. |
| Ownership boundary preservation | **Fail** | C-002: generic projection lacks explicit AGY provenance for AGY-only check. | F-001. |
| Off-spine concern clarity | Pass | Native policy, diagnostic sink and fingerprinting serve named owners. | None. |
| Existing subsystem reuse | Pass | Existing AGY capsule, MCP authority, events and projection reused. | None. |
| Reusable owned structures | Pass | Narrow profile and detailed skill result, no duplicated skill package source in runtime. | None. |
| Shared model tightness | Pass | Typed `resolved`/`certified_absent`/`invalid_candidate`, bounded fields, no MCP names in native profile. | None. |
| Repeated coordination ownership | Pass | Resolver owns cause; materializer owns warn/snapshot; converter owns native image public mapping. | None. |
| Empty indirection | Pass | New policy/normalizer/sink/fingerprint each own real behavior. | None. |
| Separation of concerns/file responsibility | Pass | Backend/capsule/stream/skill/projection concerns remain distinct; F-001 is missing scope condition within correct owner. | F-001 only. |
| Ownership-driven dependencies | Pass | Factory uses SkillService/MCP authority; shared projection does not import AGY internals. | None. |
| Authoritative Boundary Rule | Pass | No caller depends on an outer owner and its internal helper/repository simultaneously in changed path. | None. |
| File placement | Pass | Files remain with actual concern; AGY check belongs in projection but needs provenance. | F-001. |
| Flat-vs-over-split layout | Pass | Small AGY-specific files prevent stream/capsule blobs without artificial hierarchy. | None. |
| Interface/API/query/command clarity | **Fail** | C-002: shared projection infers AGY from `provider_state` rather than explicit `runtimeKind`. | F-001. |
| Naming quality | Pass | AGY-native versus MCP names and safe skill-reason codes are explicit. | None. |
| Duplication/repeated structures | Pass | No new media transport or duplicate source skill; policy list single owner. | None. |
| Patch-on-patch complexity | Pass | IR-002 narrows resolver catch and changes only typed skip disposition. | None. |
| Dead/obsolete cleanup | Pass | Old eight-tool constant and dangling Codex link removed. | None. |
| Test scenarios/assertions | Pass | Focused profile, image redaction/provenance, absent/invalid/safety, projection and restore tests align with approved IDs. | Add F-001 regression. |
| Fixture/helper reuse | Pass | Temporary skill/package builders and shared capsule helpers are coherent. | None. |
| Stale/compatibility-only tests | Pass | Changed tests assert current warning policy; no old invalid-hard-failure expectation remains. | None. |
| API/E2E readiness | **Fail** | Static boundary must be corrected before executable validation; live provider gates are otherwise explicitly carried. | F-001, then API/E2E. |

## Source File Size And Structure Audit

Changed implementation-source files only; effective nonempty lines and net changed-line signals against `ae3aba1bf`. All are below the >500 hard limit and >220 changed-line signal. Tests, fixtures, generated files and bundled Markdown skill content are excluded.

| Source file (under `autobyteus-server-ts/src/`) | Effective nonempty lines | >500 / >220 delta | SoC/placement | Verdict/action |
| --- | ---: | --- | --- | --- |
| `agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` | 105 | No / No | Factory owns launch/MCP binding. | Pass |
| `agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` | 95 | No / No | Run events and private diagnostic callback. | Pass |
| `agent-execution/backends/antigravity/capsule/agy-configured-skill-materializer.ts` | 158 | No / No | Snapshot/warning owner. | Pass |
| `agent-execution/backends/antigravity/capsule/agy-native-tool-policy.ts` | 30 | No / No | Versioned native profile. | Pass |
| `agent-execution/backends/antigravity/capsule/agy-run-capsule.ts` | 88 | No / No | Capsule/manifest/restore. | Pass |
| `agent-execution/backends/antigravity/stream/agy-native-image-diagnostic-sink.ts` | 37 | No / No | Private bounded sink. | Pass |
| `agent-execution/backends/antigravity/stream/agy-native-image-result.ts` | 25 | No / No | Explicit verified path. | Pass |
| `agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` | 164 | No / No | Provider-specific event mapping. | Pass |
| `agent-execution/events/processors/file-change/file-change-event-processor.ts` | 339 | No / No | Correct shared owner, but AGY check lacks origin guard. | F-001 |
| `runtime-management/antigravity-cli-capability.ts` | 107 | No / No | CLI discovery/version boundary. | Pass |
| `skills/domain/configured-agent-skill-binding.ts` | 21 | No / No | Narrow typed result. | Pass |
| `skills/services/configured-agent-skill-resolver.ts` | 303 | No / No (140 additions) | Resolution, precedence, safety/content classification. | Pass |
| `skills/services/configured-skill-source-fingerprint.ts` | 57 | No / No | Trusted tree identity. | Pass |
| `skills/services/skill-discovery.ts` | 227 | No / No | Candidate search and cycle guard. | Pass |
| `skills/services/skill-service.ts` | 430 | No / No | Existing catalog/service entrypoint, narrow new method. | Pass |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No compatibility machinery | Pass | Unsupported AGY version fails; no old eight-tool or MCP-image fallback. |
| No legacy behavior retention | Pass | Broken machine-specific Codex skill link removed; current skill policy reflected in package README. |
| Dead/obsolete cleanup | Pass | No scoped obsolete path remains. |
| Persisted-data transition | Pass | Existing manifest v1/restore unchanged, Directly Usable — No Migration. |
| No version-specific dual reads/writes/request-time old-shape fallback | Pass | Existing snapshots restored without rewriting or re-resolving. |
| Migration mechanics | Pass | N/A — no migration required. |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining in changed scope.

## Docs-Impact Verdict

- Docs impact: Yes. Package README/provenance already updated; Delivery Engineer must sync any user-facing/native-tool/skill policy documentation after executable validation. No code-review-origin documentation blocker.

## Additional Material Premise Validation

- ARCH-REV-002/MP-001 (present invalid package candidate): Confirmed under approved SR-013, with changed **warn/omit** consequence; source now preserves provenance failures separately. ARCH-REV-004 carries the current design authority.
- No new production/failure premise is asserted. C-002 relies on the explicit reviewed engineering boundary, not a conjectured current cross-provider event. No fallback, recovery or concurrency machinery is prescribed for a technical-only scenario.

## Review Scorecard

- Overall: **9.12/10; 91.2/100** (simple ten-category mean, not the decision rule). Clean pass requires all categories >=9.0; two are below due F-001.

| Priority | Category | Score | Why this score | Weakness / drag | Improvement |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.2 | DS-001–004 are traceable end to end. | Live AGY payload/tool exposure unverified downstream. | Preserve evidence gates in API/E2E. |
| 2 | Ownership Clarity and Boundary Encapsulation | **8.8** | Provider/skill owners otherwise clear. | C-002 lets an AGY-specific predicate run in shared projection without explicit runtime origin. | F-001 guard. |
| 3 | API / Interface / Query / Command Clarity | 9.1 | Typed skill outcomes and provider events are clear. | Projection's provenance inference is implicit (C-002). | F-001 guard/regression. |
| 4 | Separation of Concerns and File Placement | **8.8** | Files are coherently placed. | Shared owner currently applies AGY policy by event shape (C-002), not explicit scope. | F-001 guard. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.3 | Narrow native profile, image result and skill outcomes. | Version profile needs real-provider confirmation. | API/E2E profile proof. |
| 6 | Naming Quality and Local Readability | 9.2 | Provider-native, source safety and skip reasons are readable. | Dense resolver safety logic merits ongoing tests. | Maintain focused cases. |
| 7 | API/E2E Readiness | 9.0 | Focused units and honest downstream gates exist. | F-001 must be corrected first; no live validation yet. | Fix then execute AC-001–006. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.1 | Static native image, skill skip and redaction paths follow approved behavior. | Actual AGY result/profile and first turn unproven. | Real native provenance/bytes and Codex checks. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Eight-tool fallback and broken package link removed. | Historic snapshots still deliberately retained. | No change. |
| 10 | Cleanup Completeness | 9.2 | Scoped obsolete code removed; diffs clean. | F-001 regression remains. | Close F-001. |

## Findings

### F-001 — Scope AGY-native file verification by run provenance

- Classification: **Local Fix**, implementation-owned; candidate C-002; affects approved BEH-003/SCN-001 and SR-015's explicit shared-projection ownership/interface contract.
- Evidence: `file-change-event-processor.ts:315-321` checks `toolName === "generate_image"` plus `result.provider_state === "DONE"` but never `input.runContext.config.runtimeKind`. The reviewed design explicitly says the file-change owner scopes AGY-native image verification using runtime kind **and** provider tool name. `agy-stream-event-converter.ts:106-118` emits the normalized native result; the shared processor then applies the policy. No current other-provider failure is asserted or needed for this structural contract finding.
- Consequence: The generic projection owns an AGY-specific rule without proving AGY origin, weakening a high-risk provider/native-versus-MCP boundary and leaving non-AGY generated output vulnerable to that rule if it carries the same generic result fields. The correction is bounded: require `RuntimeKind.ANTIGRAVITY_CLI` in this branch and test AGY-native verification alongside unchanged non-AGY projection. Do not add a new projection subsystem or fallback.

## Classification, Recipient And Residual Risks

- Review decision: **Fail — Local Fix**. Recipient: `/implementation_engineer`; do not advance to API/E2E yet. After the bounded source/test correction, require another source review and then API/E2E.
- Residual validation gates (not source findings): exact AGY 1.2.11 model-exposed native non-collaboration list and configured MCP coexistence; provider `tool_name: generate_image` rather than `call_mcp_tool`; real image bytes/path through Files/content; denial/error public and private separation across UI/history/ACK; bundled Codex skill and first AGY response; AGY-origin rejection of otherwise validated skill content. If provider contract contradicts SR-015, route Design Impact, not an MCP fallback.

## Latest Authoritative Result

- Review Decision: Fail.
- Review Entry Point: Implementation Review, round 2.
- Supported Product Scenario Gate: Pass.
- Material-Premise Gate: Pass; C-002 grounded in reviewed contract.
- Score Summary: 9.12/10; 91.2/100, with ownership and SoC <9.0.
- Failure Origin: N/A.
- Recommended Recipient: `/implementation_engineer`.
- Notes: F-001 is the sole promoted source finding; CRR-001 authority hold is resolved, not a prior source defect.
