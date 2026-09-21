# AgentOrg Composer Submission Investigation

- Package: AORG-FLAT-TEAM-001; finding: COMPOSER-001; date: 2026-09-11.
- Outcome: implementation-local omission against existing composer parity.
- Workspace: /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model
- Branch: requirements/flat-agent-organization-model.
- Inspected source: 0cf14f6f5371804fbadd2f34ac37fde250cbfd55.
- Unchanged authority: RER-032@ca04d71577a8ecc2cb087b5dd7cde6d0c5dd8b8a;
  completed design AD-REV-022@17b0b3cc5dca03c7e4016cf54516c4441a16df35.
- This is a source investigation, not a new completed architecture-design round,
  Requirements gap, Product gate, executable validation result or delivery pass.

## Supported User Observation

In the Delivery-built DR-009 Electron application, the user selects the mixed
Org's configured direct Agent `/concierge`, sends `hello`, and receives a model
reply. The conversation contains the user message and reply, but the input box
still contains `hello`. The user reports the established standalone Team input
clears after sending and explicitly expects the same Org composer behavior.

Screenshot:
/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/software_engineering_team_570be46d520142849ac61785be03dca1/architecture_designer_6b8b3019214246e086957b3f395901bb/context_files/ctx_3ae88ece2267__image.png

This is an ordinary successful-send journey, not a synthetic lifecycle trigger.
The screenshot contains no attachments; attachment behavior below is a local
submission regression boundary, not a separately reproduced attachment failure.

## Source Path And Cause

Paths below are relative to the canonical worktree at the inspected commit.

| Boundary | Evidence | Consequence |
| --- | --- | --- |
| Shared input | `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue:236-269,294-312` | The textarea mirrors the active AgentContext requirement and recognizes local submission through submissionPending. It does not independently empty itself when a send promise resolves. |
| Shared dispatch | `autobyteus-web/stores/activeContextStore.ts:237-260` | Sends the captured context text/attachments through the exact target interaction port; it does not own draft clearing. |
| Working Team adapter | `autobyteus-web/stores/agentTeamRunStore.ts:266-301` | Calls beginLocalUserSubmission for the exact member before transport, assigns message correlation, and handles failure on that submission context. |
| Local submission state | `autobyteus-web/services/runSubmission/localUserSubmission.ts:56-79` | Appends the local user message, clears requirement and contextFilePaths, and sets submissionPending. The textarea therefore clears through existing reactive state. |
| Org target adapter | `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts:117-139` | Direct, mounted and task Agent targets use the Org transport interactionFor(exact AgentRun ID). |
| Missing Org submission step | `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts:151-178` | send only constructs SEND_MESSAGE and awaits command. It does not update the submitted AgentContext draft or start local submission. |
| Org accepted ACK | `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts:302-329` | Resolves the command and requests authoritative history refresh; neither action clears the draft. |
| Conversation return path | `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts:148-161`; `autobyteus-web/services/agentStreaming/handlers/memberInputMessageHandler.ts:8-16` | Dispatches exact Agent presentation events into the conversation projection. Receiving a user-message event is not a composer-clear operation. |

The same visual component is used, but the Org subject adapter omits the local
submission handling that makes that component work for Teams. This explains
the observed stale input without requiring a server delivery failure or a new
user-experience decision.

Existing `design-spec.md` current-state evidence for accepted Team/Agent
presentation (line 620) and the **Input and command parity** row (line 1196)
already require shared composer/local-submission behavior through exact subject
adapters. No intentional leave-the-draft behavior is specified.

## Bounded Implementation Correction And Validation Boundary

Restore the established submission behavior in the Org adapter using the
existing exact AgentContext/interaction boundary. Do not add an Org-specific
textarea, clear on model reply, or clear whichever Agent happens to be focused
after awaiting a command. Preserve the submitted context, error handling,
pending-state behavior, newer drafts and exact message correlation.

The current local-submission helper also performs Team/standalone-specific
navigation/history work. Reuse is not permission to pass a fake Team identity,
add an optimistic Org history title, or append an uncorrelated second user
message. DS-027's authoritative accepted-send summary and existing exact Org
command/event ownership remain unchanged. If the bounded correction cannot fit
those boundaries, return the concrete Design Impact instead of expanding scope.

Implementation-scoped checks should cover successful direct and mounted Org
sends; exact-context behavior when focus changes; a new draft during an in-flight
send; failure/disconnection without draft loss or automatic duplicate resend;
submitted attachments; and one conversation message after authoritative echo.
Retain standalone Team behavior. API/E2E should assert that the visible composer
clears in a real send journey, not merely that the command was accepted or the
model replied. Existing streaming ACK/history tests alone do not assert this.

Focused expected correction: Small / Low within existing presentation and
submission ownership; parent reviewed Large / High context is not downgraded.
Implementation owns the fix and its validation. No source/test changes or fresh
browser/provider run were performed in this investigation. Other-owner dirty
delivery documents and runtime evidence were left untouched.
