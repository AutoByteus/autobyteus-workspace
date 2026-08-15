# Docs Sync Report

## Scope

- Ticket: `runtime-specific-carpenter-prompt`
- Trigger: Delivery-stage review after API-REV-004 and CRR-005 passed.
- Bootstrap base reference: `origin/personal` at `cd2420c607c5129c961f14d4d9e2559c0888331f`.
- Integrated base reference used for docs sync: Same `origin/personal` revision; the ticket branch was already ahead by three commits and had no base drift (`git rev-list --left-right --count HEAD...origin/personal` = `3 0`).
- Post-integration verification reference: API-REV-004 (`Pass`, 93% confidence), CRR-005 proportional durable-test review (`Pass`), and build-scoped TypeScript plus range diff checks.

## Why Docs Were Updated

- Summary: The implementation separates shared Carpenter prompt context from native-only workspace/Bash/file guidance and renames the generated team section to `Team Collaboration`.
- Why this should live in long-lived project docs: Runtime prompt ownership, provider injection boundaries, native-only guidance, and team collaboration terminology are durable contracts needed by future implementers and operators. The implementation commit already synchronized the scoped server documentation; delivery verified that synchronization against the final reviewed state and found no additional wording gap.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/prompt_engineering.md` | Authoritative Carpenter sections, ownership, order, and runtime projection | Updated | Records shared versus native-only composition and the `Team Collaboration` contract. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime bootstrap and provider injection behavior | Updated | Records explicit shared/native entrypoints and preserved native, Claude, and Codex fields. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_team_execution.md` | Mixed-team member prompt behavior and renderer path | Updated | Records native versus external prompt projection and the renderer rename. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_definition.md` | Agent-authored content boundary | Updated | Removes stale `Team Runtime` wording and keeps platform-owned native guidance out of `agent.md`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_tools.md` | Automatic team communication/delegation tool contract | Updated | Uses the durable `Team Collaboration` terminology without changing exposure semantics. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/codex_integration.md` | Codex shared prompt projection | Updated | Explicitly records shared-only prompt projection and retained provider-native guidance. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-ts/docs/tool_schema_and_configuration.md` | Native tool schema ownership and prompt/tool separation | No change | Verified as the authoritative out-of-band tool contract; no prompt refactor change required. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Historical native-runtime terminology | No change | Explicitly classified in the design as unrelated historical documentation; no global replacement was appropriate. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/prompt_engineering.md` | Runtime contract clarification | Shared/native entrypoints, section ownership/order, provider projection, and `Team Collaboration` terminology | Prevents future reintroduction of native-only guidance into external prompts. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_execution.md` | Bootstrap boundary clarification | Native resolves workspace and uses native composition; Claude/Codex use shared composition and existing fields | Keeps runtime adapters and prompt ownership aligned. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team runtime documentation update | Native and external member prompt paths plus renderer rename | Documents mixed-runtime behavior without changing team lifecycle ownership. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_definition.md` | Authoring guidance update | Native platform instructions and collaboration roster are not authored in agent Markdown | Preserves the authored/platform boundary. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_tools.md` | Terminology-only contract update | `Team Runtime` to `Team Collaboration` | Aligns docs with generated headings while preserving automatic tool exposure. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/codex_integration.md` | Provider projection clarification | Codex receives shared context only; native Bash/file guidance is excluded | Makes the provider boundary explicit. |

These six documentation changes were already present in the reviewed implementation range and were revalidated during delivery; no additional delivery-owned documentation edit was necessary.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Shared/native Carpenter boundary | Identity, team instruction, and team collaboration are shared; workspace/Bash/file guidance is native-only. | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/done/runtime-specific-carpenter-prompt/requirements.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/done/runtime-specific-carpenter-prompt/design-spec.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/prompt_engineering.md` |
| Injection ownership | Native uses `AgentConfig.systemPrompt`; Codex uses `baseInstructions`; Claude uses SDK `systemPrompt`, with provider-native guidance retained. | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/done/runtime-specific-carpenter-prompt/design-spec.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/done/runtime-specific-carpenter-prompt/api-e2e-execution-coverage-report.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_execution.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/codex_integration.md` |
| Team collaboration naming | Generated team rosters and communication/delegation rules are `Team Collaboration`; exposure and approval semantics are unchanged. | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/done/runtime-specific-carpenter-prompt/design-spec.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/done/runtime-specific-carpenter-prompt/api-e2e-revision-record.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_team_execution.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_tools.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `composeCarpenterPrompt(...)` as one all-runtime contract | `composeSharedCarpenterPrompt(...)` and `composeNativeAutoByteusPrompt(...)` | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/prompt_engineering.md` |
| Generated `Team Runtime` section and renderer path | `Team Collaboration` and `team-collaboration-instruction-renderer.ts` | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_team_execution.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `Not applicable; scoped docs were updated in the implementation range`
- Rationale: This ticket has documented runtime-contract impact. Delivery therefore does not claim no impact; it records and verifies the existing six-file server documentation synchronization above.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Finalize the verified ticket branch into the recorded `personal` target, with no release or deployment.
- Notes: The package typecheck's TS6059 `rootDir`/test-include limitation is pre-existing; build-scoped TypeScript passed. Live Claude/Codex provider-wire isolation remains explicitly `Not Tested` because safe provider gates/authentication were unavailable.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`; the final implementation and documented ownership boundaries are clear.
