# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/tickets/in-progress/claude-ask-user-question-disallow/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/tickets/in-progress/claude-ask-user-question-disallow/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/tickets/in-progress/claude-ask-user-question-disallow/design-spec.md`
- Current Review Round: 1
- Trigger: `solution_designer` handoff requesting pre-implementation architecture review for Claude `AskUserQuestion` disallow task.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Requirements, investigation notes, design spec, current source reads of `claude-sdk-client.ts`, `claude-sdk-client.test.ts`, Claude session tooling/MCP server builders, `package.json` / lockfile, npm package inspection for `@anthropic-ai/claude-agent-sdk@0.2.71`, and primary Claude Code documentation accessed 2026-06-06:
  - https://code.claude.com/docs/en/agent-sdk/typescript
  - https://code.claude.com/docs/en/agent-sdk/custom-tools
  - https://code.claude.com/docs/en/tools-reference
  - https://code.claude.com/docs/en/agent-sdk/user-input

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | No | Pass | Yes | Design is narrow, evidence-backed, and places the provider SDK option at the correct boundary. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/tickets/in-progress/claude-ask-user-question-disallow/design-spec.md` against the architecture-reviewer design principles and current code.

The design proposes adding a bare `disallowedTools: ["AskUserQuestion"]` option in `ClaudeSdkClient.buildQueryOptions`, preserving existing `allowedTools`, `mcpServers`, permission mode, `canUseTool`, resume, cwd, env, abort, and settings-source behavior. It rejects a restrictive `tools` allowlist and rejects post-call denial in `canUseTool`.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design identifies the task as a behavior change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classified as `No Design Issue Found`; evidence correctly points to `ClaudeSdkClient.buildQueryOptions` as the existing provider query option owner and separate session/MCP files as AutoByteus tooling owners. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says no refactor needed now. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, ownership boundaries, dependency rules, and migration sequence all keep the change localized to the existing option builder plus unit coverage. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | Initial review round. | No prior findings. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Bounded Local | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Return-Event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime Management / Claude SDK Client | Pass | Pass | Pass | Pass | Correct owner for provider SDK option shape. |
| Claude Agent Execution Session | Pass | Pass | Pass | Pass | Reused without change; session continues to own turn orchestration and AutoByteus tooling inputs. |
| Tests / Runtime Management Unit Coverage | Pass | Pass | Pass | Pass | Existing SDK-client option contract test is the right coverage point. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Single disallowed built-in tool name | Pass | N/A | Pass | Pass | Local inline value or local constant in `claude-sdk-client.ts` is sufficient; no shared registry needed. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | Pass | Pass | Pass | N/A | Pass | No shared DTO/schema/model changes. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AskUserQuestion` built-in availability in AutoByteus Claude runs | Pass | Pass | Pass | Pass | Removal is from Claude context via SDK option, not local code deletion. |
| Compatibility alternatives | Pass | Pass | Pass | Pass | Design explicitly rejects `tools` allowlist, `canUseTool`-only denial, and a user toggle for this ticket. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Pass | Pass | N/A | Pass | Current `buildQueryOptions` already centralizes SDK launch options; adding `disallowedTools` there is coherent. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Pass | Pass | N/A | Pass | Existing stable query options test can assert the new option while preserving MCP/allowedTools expectations. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSession` -> `ClaudeSdkClient` | Pass | Pass | Pass | Pass | Session can pass semantic AutoByteus tool/MCP inputs; it should not directly manage vendor built-in names for this constant policy. |
| `ClaudeSdkClient` -> Anthropic SDK | Pass | Pass | Pass | Pass | Provider-specific option names belong at this boundary. |
| AutoByteus MCP tooling builders | Pass | Pass | Pass | Pass | Design forbids moving MCP definitions into the SDK client. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSdkClient.startQueryTurn` / `buildQueryOptions` | Pass | Pass | Pass | Pass | No caller plumbing required for the constant disallow policy. |
| `buildClaudeSessionMcpServers` / session tooling resolution | Pass | Pass | Pass | Pass | MCP exposure remains separate from provider built-in availability. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSdkClient.startQueryTurn(options)` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSdkClient.buildQueryOptions(options)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Pass | Pass | Low | Pass | Provider client folder is correct for SDK option defaults. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Pass | Pass | Low | Pass | Unit test placement mirrors source boundary. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Hide one Claude built-in tool | Pass | Pass | N/A | Pass | Extend `ClaudeSdkClient.buildQueryOptions`; no new service/config subsystem. |
| Preserve AutoByteus MCP tools | Pass | Pass | N/A | Pass | Existing `allowedTools` and `mcpServers` construction remains unchanged. |
| Verify behavior | Pass | Pass | N/A | Pass | Existing SDK-client unit coverage is sufficient for implementation-scoped verification. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| `AskUserQuestion` availability | No | Pass | Pass | Clean-cut product default: always disallow in normal query options. |
| Optional user toggle | No | Pass | Pass | Correctly deferred until a real product requirement exists. |
| Full `tools` allowlist / post-call denial alternatives | No | Pass | Pass | Rejected to avoid context-visible attempts or accidental built-in removal. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| SDK query option change | Pass | Pass | Pass | Pass |
| Unit test update | Pass | Pass | Pass | Pass |
| Type/test validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Bare disallowed tool vs built-in allowlist | Yes | Pass | Pass | Pass | Good/bad examples make the key SDK-option distinction clear. |
| Preserve AutoByteus MCP tools | Yes | Pass | Pass | Pass | Examples distinguish `allowedTools`/`mcpServers` from built-in availability. |
| Avoid `canUseTool`-only denial | Yes | Pass | Pass | Pass | Design correctly explains why post-call denial is insufficient. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Older deployment SDK behavior | An older SDK could ignore `disallowedTools`; current lock/package inspection for `@anthropic-ai/claude-agent-sdk@0.2.71` shows the option exists and forwards to `--disallowedTools`. | Implementation should run targeted unit test and typecheck path if practical. | Residual risk only; not blocking. |
| Future desire for interactive clarification UI | Some future workflow may want `AskUserQuestion`. | Treat as a future product setting if requested; do not add compatibility branch now. | Residual product risk only; not blocking. |
| Model discovery query options | `listModels()` uses a separate max-turns-zero probe path and not `buildQueryOptions`. | No implementation action for this ticket because it is not a user agent turn and cannot call tools with `maxTurns: 0`. | Reviewed; not blocking. |

## Review Decision

`Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A. No design-review findings require reroute.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Runtime environments should remain on an SDK version that honors `disallowedTools`. Current local lock/package inspection confirms support in `@anthropic-ai/claude-agent-sdk@0.2.71`; official docs also document the option.
- If a future workflow needs Claude's interactive multiple-choice clarifying UI, add a scoped product requirement/toggle in a follow-up rather than preserving dual behavior now.
- Implementation should avoid introducing a `tools` allowlist and should keep `allowedTools`, `mcpServers`, `canUseTool`, settings sources, env, cwd, resume, permission mode, and abort forwarding unchanged.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Approved for localized implementation in `ClaudeSdkClient.buildQueryOptions` with unit coverage in `claude-sdk-client.test.ts`.
