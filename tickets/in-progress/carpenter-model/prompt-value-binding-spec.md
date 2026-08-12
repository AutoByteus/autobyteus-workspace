# Prompt Value Binding Specification

## Status

Approved intended-behavior authority — approved with `requirements.md` on 2026-08-12, including the same-day automatic team-tool clarification.

## Purpose

Prove that every dynamic value in the carpenter-model prompt has an authoritative runtime source, an explicit normalization rule, and an explicit missing-value outcome. Double-brace expressions in the prompt specifications are documentation notation only. They must never survive into a provider request.

## Global Binding Invariants

1. Compose from resolved domain/runtime objects, not by reparsing author files inside a provider adapter.
2. Trim surrounding whitespace from scalar identity values. Normalize any line break in a label value (agent name, agent description, team member name, team/recipient/target label) to one space so a value cannot create a new prompt section. Preserve authored-body content after trimming surrounding whitespace once, then apply the heading-containment rule below.
3. A missing required value fails run bootstrap before the first provider request. It is never rendered as an empty label, `undefined`, `null`, a guessed value, or unresolved template syntax.
4. A missing optional value omits its exact line, subsection, or section. It does not leave an empty heading.
5. Generated rosters and Team Runtime blocks are renderer output derived from validated runtime collections. They are not free-form variables supplied by a caller and do not consume configured/provider tool exposure.
6. The actual final provider instruction payload must contain no token matching the unresolved-placeholder pattern `\{\{[^}]+\}\}`. The shared composer enforces this for the carpenter portion; any runtime that adds dynamic instruction content afterward must enforce it again at its complete-payload boundary.

## Scalar And Authored-Body Bindings

| Binding | Requiredness | Authoritative source | Normalization | Missing or invalid outcome | Verified current source |
| --- | --- | --- | --- | --- | --- |
| `agent_definition_name` | Required for every run | Selected `AgentDefinition.name`; file-backed source is `agent.md` frontmatter `name` | Trim surrounding whitespace | Fail run bootstrap before provider invocation | `autobyteus-server-ts/src/agent-definition/domain/models.ts`; `autobyteus-server-ts/src/agent-definition/utils/agent-md-parser.ts`; provider bootstrappers already resolve the selected definition |
| `agent_definition_description` | Optional prompt line | Selected `AgentDefinition.description`; file-backed source is `agent.md` frontmatter `description` | Trim surrounding whitespace | Omit the Description line | The file parser defaults an absent description to `""`; therefore the prompt must not assume it is always non-blank |
| `agent_instruction_body` | Optional subsection | Selected `AgentDefinition.instructions`; file-backed source is the `agent.md` body | Trim surrounding whitespace once; preserve internal Markdown | Omit `### Responsibilities and Boundaries` and its body; do not substitute the description as a second copy | The file parser permits an empty body; current runtime fallbacks from instructions to description must not be reused inside the structured identity renderer |
| `workspace_root_path` | Required for every in-scope run | The exact resolved filesystem directory used as the run's default working directory: native `workspaceInstance.getBasePath()`, Codex `workingDirectory`, or Claude `workingDirectory` | Canonical absolute filesystem path | Fail bootstrap if the adapter cannot produce a non-blank absolute path; do not compose a different path from stale metadata | Run provisioning requires and canonicalizes `workspaceRootPath`; all three backends already resolve the actual runtime directory before provider startup |
| `team_instruction_body` | Optional section, team runs only | Confirmed non-blank `AgentTeamDefinition.instructions`; file-backed source is the selected `team.md` body, carried by `MemberTeamContext.teamInstruction` | Trim surrounding whitespace once; preserve internal Markdown | Omit Team Instruction only when the confirmed body is blank. A definition-resolution failure must not be silently treated as a blank body | `team-md-parser.ts`; `member-team-context-builder.ts` currently trims the value but also collapses lookup errors to null, which the target design must correct |
| `member_name` | Required for a team member run | `MemberTeamContext.memberName`, originating from the normalized topology member name/current run identity | Trim surrounding whitespace | Fail that team member's bootstrap if blank | `team-definition-topology-planner.ts` requires a non-blank member name; the target composer still validates its boundary input |

## Authored Markdown Heading Containment

An authored body must not create sibling sections outside its carpenter-owned wrapper.

- The agent instruction body is nested below `### Responsibilities and Boundaries`; its authored ATX headings must therefore begin at level 4 or deeper.
- The team instruction body is nested below `## Team Instruction`; its authored ATX headings must therefore begin at level 3 or deeper.
- Find the smallest ATX heading level present in the body. If it is not deeper than the containing heading, shift every ATX heading in that body downward by the same number of levels needed to make the smallest one exactly one level deeper. This preserves relative hierarchy.
- If a shifted heading would exceed level 6, render that heading as a bold label at the corresponding body position rather than allowing it to escape the containing section or silently dropping its text.
- Do not rewrite prose, lists, code fences, links, or other authored Markdown.

For the Classroom Simulation fixture, this deterministically changes professor-body `##` headings to `####` and team-body `##` headings to `###`.

## Complete Documentation Placeholder Inventory

This is the exhaustive mapping for every named placeholder used in the intended-behavior prompt examples:

| Placeholder name | Binding |
| --- | --- |
| `agent_definition_name` | Scalar table above |
| `agent_definition_description` | Scalar table above |
| `agent_instruction_body` | Scalar table above |
| `workspace_root_path` | Scalar table above |
| `team_instruction_body` | Scalar table above |
| `member_name` | Scalar table above |
| `skill_name` | Skill Catalog Bindings below |
| `skill_description` | Skill Catalog Bindings below |
| `absolute_skill_md_path` | Skill Catalog Bindings below |

No other named placeholder is permitted in the intended-behavior prompt specifications without first adding its authoritative binding to this table.

## Team Communication Bindings

The communication fragment is generated, not accepted as an authored string.

| Rendered value or choice | Authoritative source and derivation | Empty/fallback behavior |
| --- | --- | --- |
| Whether the `send_message_to` contract is rendered | Presence of a valid `MemberTeamContext` | Always for a team member; standalone runs have no Team Runtime |
| Logical-recipient rule | Validated `MemberTeamContext.sendMessageToEnabled`, `deliverInterAgentMessage`, and `communicationRecipients.length` | Missing delivery binding fails team-member bootstrap; otherwise choose one of the two fixed roster-state sentences in `team-and-runtime-prompt-spec.md` |
| Current roster member | `MemberTeamContext.memberName` | Required under the `member_name` rule above |
| Local team name | `MemberTeamContext.teamName`; its constructor falls back to `teamDefinitionId` | Never blank after context construction; target boundary validation rejects blank after fallback |
| Parent team name | `parentBoundary.parentTeamName`, otherwise the literal `Parent team` | Fixed fallback, never an unresolved value |
| Current roster role | Exact renderer derivation: `coordinator`, `member`, or `<represented team name> representative` from route-key equality and parent-boundary data | No authored/default role is inserted |
| Roster member rows and badges | Self row plus `communicationRecipients`; badges are the fixed renderer outputs `you`, `coordinator`, and representation labels | If no renderable team exists, omit the roster manifest |
| Allowed recipient names | Messageable roster rows derived from `MemberTeamContext.communicationRecipients`; `allowedRecipientNames` remains the authorization cross-check | If logical delivery is active but the list is empty, render the fixed no-recipient sentence and no recipient list. Do not repeat a second selector/allowlist footer after the roster |

No team name, member name, role, badge, or recipient is inferred from conversational text.

## Task Delegation Bindings

The fixed assignment fragment is generated from validated `MemberTeamContext.members`. Runtime provisioning guarantees `delegate_task`; no configured or MCP-resolved name set is a prompt input.

| Rendered value or choice | Authoritative source and derivation | Empty/fallback behavior |
| --- | --- | --- |
| Assignment target roster | Every team member run; rows come from `buildDelegationTargetRosterManifest(MemberTeamContext)` | If no target exists, render the fixed no-target row |
| Member target and accountable owner | `MemberTeamDescriptor.memberName` for a non-self agent member | Both use the validated member name |
| Team target and accountable owner | Subteam `MemberTeamDescriptor.memberName` | Both use the validated subteam member name |
| Team ingress coordinator | `member.representative.memberName`; otherwise literal `unresolved` | The literal explicitly reports unavailable runtime state; it is not a leftover placeholder |
| Assignment protocol | Every valid team member run | Standalone runs omit Team Runtime |

The carpenter prompt does not describe `submit_task_result` or `review_task_result`; task packets/events and their lifecycle-specific runtime provisioning remain authoritative for those tools.

## Skill Catalog Bindings

For each successfully resolved configured skill:

| Binding | Requiredness | Authoritative source | Validation and normalization | Missing or invalid outcome |
| --- | --- | --- | --- | --- |
| `skill_name` | Required per rendered entry | Resolved `Skill.name`, parsed from `SKILL.md` frontmatter | Trim; require non-blank | Omit the invalid entry and emit a diagnostic; never advertise it |
| `skill_description` | Required per rendered entry | Resolved `Skill.description`, parsed from `SKILL.md` frontmatter | Trim; require non-blank | Omit the invalid entry and emit a diagnostic; never render a blank description |
| `absolute_skill_md_path` | Required per rendered entry | `path.resolve(skill.rootPath, "SKILL.md")` for the same resolved skill | Require an absolute path to the manifest that the loader/materializer resolved | Omit the invalid entry and emit a diagnostic |

The native Skills section is absent when skill access is disabled or no valid configured skill resolves. Codex and Claude may project the same validated configured skills through their provider-native materialization/catalog mechanism.

Current-source caveat resolved by this contract: the core `autobyteus-ts` loader rejects blank skill names and descriptions, while the server loader currently checks field presence but can construct empty values. The shared target composition/materialization boundary must enforce the same non-blank validation for every runtime.

## Fixed Sections With No Runtime Bindings

`## Bash Operating Practice` and `## File And Directory Practice` contain no dynamic values. Their approved Markdown is emitted verbatim.

## Provider Binding Matrix

| Semantic input | Native AutoByteus | Codex | Claude |
| --- | --- | --- | --- |
| Selected agent definition | Already loaded in `AutobyteusAgentRunBackendFactory` | Loaded in `CodexThreadBootstrapper` | Loaded in `ClaudeSessionBootstrapper` |
| Exact runtime workspace | Resolved `workspaceInstance.getBasePath()` used for runtime/tool context | Resolved `workingDirectory` used to start the Codex thread | Resolved `workingDirectory` used to start the Claude session |
| Team context | `AgentRunRuntimeContext.memberTeamContext` | `AgentRunRuntimeContext.memberTeamContext` | `AgentRunRuntimeContext.memberTeamContext` |
| Team collaboration protocol | Valid `MemberTeamContext`; provider tools independently include automatic team tools | Valid `MemberTeamContext`; existing MCP configuration independently includes automatic team tools | Valid `MemberTeamContext`; existing MCP configuration independently includes automatic team tools |
| Configured skills | Resolved configured skills registered for the native catalog | Resolved configured skills materialized/discovered for Codex | Resolved configured skills materialized for Claude |

Provider adapters place the carpenter Markdown in their approved high-authority boundary: native `AgentConfig.systemPrompt`, Codex `baseInstructions`, and Claude Agent SDK query `options.systemPrompt`. They may not independently invent values, fallbacks, or wording. Tool schemas remain out of band; prompt composition does not inspect or create an MCP descriptor.

## Final Provider-Payload Invariant Ownership

| Runtime | Content after shared composition | Actual final-instruction owner | Required failure point |
| --- | --- | --- | --- |
| Native AutoByteus | Terminal `AvailableSkillsProcessor` may append configured skill name, description, and path | `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts`, immediately after `SystemPromptPipeline.process` | Reject the complete string before assigning `processedSystemPrompt` or calling `llmInstance.configureSystemPrompt`; use the existing critical bootstrap error/`AgentErrorEvent` path |
| Codex | No later textual skill catalog; skills and tools are provider-native/out-of-band | `CarpenterPromptComposer` result used directly as `baseInstructions` | Reject before thread creation/restoration |
| Claude | No later textual skill catalog; skills and tools are provider-native/out-of-band | `CarpenterPromptComposer` result used directly as query `options.systemPrompt` | Reject before SDK query |

Native skill metadata remains valid under the catalog binding when it is non-blank and path-valid even if a description contains placeholder-shaped text such as `{{skill_token}}`. The complete-payload check must therefore remain authoritative even if a skill boundary later adds the same rejection as defense in depth.

## Verification Contract

Implementation and durable coverage must verify all of the following:

1. Every documented placeholder name is present in this binding specification.
2. Representative full, optional-empty, standalone, team, recipient-state, delegation-target-state, and skill-state cases render the specified values and omissions.
3. A missing agent definition, blank required agent name, blank team-member name, or unavailable runtime workspace fails before provider invocation.
4. Blank optional description, agent body, and team body produce the documented omissions.
5. No actual final provider instruction payload contains unresolved double-brace syntax. Focused native coverage configures valid skill metadata containing `{{skill_token}}`, lets terminal Skills render it, and verifies bootstrap failure plus no LLM system-prompt configuration/provider invocation.
6. A team prompt requires no configured/effective tool-name input and describes only the two automatically provisioned collaboration tools; standalone prompts describe neither.

## Related Authority

- Requirements: `BEH-012`; `R-005`, `R-014`; `AC-005`, `AC-014`
- Consolidated prompt: `system-prompt-contract.md`
- Focused sections: `agent-identity-prompt-spec.md`, `working-environment-prompt-spec.md`, and `team-and-runtime-prompt-spec.md`
