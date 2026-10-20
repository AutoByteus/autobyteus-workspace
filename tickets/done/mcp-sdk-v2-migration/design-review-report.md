# Design Review Report — mcp-sdk-v2-migration

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/requirements-doc.md`. Approved basis SR-002 (the user, 2026-10-20). SR-004 clarified only the verification wording of AC-001 and AC-008.
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed: `probes/` (6 scripts including the new `route-protocol-header-auto-fallback-probe.mjs`, and `probe-output.txt`), `follow-ups.md`, `handoff-sr-004.md`
- Relevant Solution Revision IDs: SR-002, SR-003, SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-004 re-review of AR-001 and AR-002
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/mcp-sdk-v2-migration` @ base `dc530fdcb0` (no code changes).
  - Round 1 reads remain valid: the three managed-server files, the 14 mapped test files, `prepare-server.mjs`, and the v2 client sources.
  - Round 2 re-read: `DEFAULT_PROTOCOL_VERSION = "2025-03-26"` at `agent-tools-mcp-routes.ts` L23 and `mcp-gateway-routes.ts` L27.
  - Round 2 ran: `grep -n "asObject\|asString\|callSdkFunction"` on `claude-sdk-client.ts`, and the narrowed AC-008 greps against the current tree.
  - Round 2 read: the new probe script and its output.
  - The shared design principles were re-read after the 2026-10-20 update. It is a one-word change to the Principle 12 check and does not affect this review.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1.
  - Medium: 3 adapter files and 1 dead-code removal, inside existing ownership.
  - High: blast radius under every runtime's MCP path, new runtime packages in the packaged app and the image, and R-002/R-003 settled only by validation.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes.
  - A parity-preserving swap to `@modelcontextprotocol/client` 2.3.1.
  - Approved differences: DEC-003 and DEC-004 only.
  - `legacy` negotiation per DEC-002, with REQ-013/AC-012.
  - O-002 removed.
- Relevant existing behavior and evidence confirmed: Yes (round 1). Round 2 adds the route-level protocol-version check as the first node of DS-002.
- Scope guardrail confirmed: Yes
- Approved change, preserved behavior, and outside scope understood: Yes. The SR-004 edits to AC-001 and AC-008 change only how they are verified, not what is required, so no renewed approval is needed.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: Yes (none remain)
- Remaining material ambiguity: none

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User/System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | Contract | Pass | Pass | Pass | Confirmed | AR-001 resolved. DS-002 now shows the route version check (400/`-32600`) followed by the client's legacy fallback. |
| BEH-009 | Operational | Pass | Pass | Pass | Confirmed | AR-002 resolved |
| BEH-010 | Operational | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/` + `probe-output.txt` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

Probe notes:
- Probe 3 is now labelled in the investigation notes as not modelling the route check.
- The new route-header probe mirrors the route exactly: the 2025-03-26 default, the supported set, and 400/`-32600` with `id: null`. Its `auto` output shows `server/discover` → 400, then `initialize`, era legacy, 2025-11-25, and list and call working.
- The AC-007 tests still prove this against the real routes.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec | — |
| Root-cause classification is explicit and evidence-backed | Pass | Adapter boundary isolates the SDK (3 files) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No client refactor; O-002 removed now | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Mapping and Removal Plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | GraphQL/agent call → managed server → v2 client → external server | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | External MCP client → route (access, version check) → dispatcher → executor | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Release build → packaged `node_modules` | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `*ManagedMcpServer` | Pass | Pass | Pass | Pass | Unchanged from round 1 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` MCP client; server-ts via `workspace:*` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `BaseManagedMcpServer.listRemoteTools()` | Pass | Pass | Pass | Low | Pass |
| `BaseManagedMcpServer.callTool(name, args, { signal })` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Test servers, start counter, v2 endpoint clients, parity method | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| MCP client, Claude client, test infrastructure, docs | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Test servers across packages | Pass | N/A | N/A | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ClientSessionLike` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| 3 managed-server files | Pass | Pass | N/A | Pass | — |
| `claude-sdk-client.ts` | Pass | Pass | N/A | Pass | Removal items named with lines; `asObject`/`asString` kept (L478; L228/260/395) |
| 14 test/fixture files | Pass | Pass | N/A | Pass | AC-007 rows require the real routes over loopback, asserting legacy era, 2025-11-25, list and call |
| 2 docs files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| No new files or folders | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| v1 manifest entries and imports | Pass | Pass | Pass | Pass | Comments naming v1 are reworded (AC-001) |
| O-002 Claude path | Pass | N/A | Pass | Pass | Covers `createMcpServer`, `createToolDefinition`, the `createSdkMcpServer` union and type members, `callSdkFunction` (only caller L345), and the integration-test case. Verified: today the narrowed AC-008 greps hit only these removal targets. |
| Stale `autobyteus-ts/pnpm-lock.yaml` | N/A | N/A | N/A | Pass | FU-003; step 1 leaves it alone |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| MCP client; test servers; manifests | No | Pass | Pass | v1 remains only as the Claude Agent SDK's peer |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `mcps.json`, vault, run history | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Manifests → adapters → ts tests → O-002 → server tests → docs → greps | Pass | Pass (none) | Pass (step 7 now has precise AC-001/AC-008 commands) | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `callTool` options position, loaders, client construction, test servers, paging server | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A real external server declares a tool `outputSchema` with a `$schema` dialect the v2 default validator rejects (e.g. draft-04)

- Related approved requirement or established contract: REQ-002/REQ-004 parity; AC-009
- Relevant behavior ID(s): BEH-001, BEH-006
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: the user configures a third-party MCP server and an agent calls its tool (SCN-001/SCN-002)
- Support evidence: the surface and actions are supported. No known server emits such a dialect.
- Forward production path: `BaseManagedMcpServer.callTool` → v2 `Client.callTool` → output validator compile → `ProtocolError(InvalidParams)`, thrown before `tools/call`
- Lifecycle preconditions and material consequence: only that tool's calls fail. The reviewer script showed v1 accepts draft-04 and v2 rejects it.
- Reachability: `Unclear`
- Review consequence / proportionate response: no finding and no machinery. The design took it into R-003, and the parity run records each server's `$schema`. If it is observed, the existing escalation trigger and AC-009 apply.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. AR-001 and AR-002 are resolved; see `ARCH-REV-002`.

Correction to round 1: AR-002 wrongly said the `asObject` import would become unused. It is still used at L478 (`tryGetSupportedModelsFromQueryControl`). My round-1 grep output was truncated. The design correctly keeps it.

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational pass notice to the Solution Designer.

## Residual Risks

- **R-002 (packaging) and R-003 (strictness, including RR-001).** Settled by the packaged before/after parity run. The escalation triggers are in the design spec.
- **AC-007 against the real routes.** The client source and the route-faithful probe both predict a legacy fallback. If the real-route test fails, endpoint changes are outside this design and return to the Solution Designer as Design Impact.
- **REQ-013.** A protocol-era failure found in validation is fixed in this ticket by adopting the needed negotiation. That is a design re-entry, not an implementation-local choice.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: Ready for implementation per `design-spec.md` SR-004. Classification `Medium`/`High` is preserved.
