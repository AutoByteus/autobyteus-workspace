# API-FIND-019 — AgentOrg cross-Agent communication is not observable with AgentTeam parity

## Source

Post-API-REV-013 user verification on the latest Electron application built by Delivery, reported 2026-09-06. The user explicitly identifies this as a bug and asks Architecture Designer to classify/design the missing AgentOrg communication visibility.

## User-observed supported scenario

1. Run a direct-Agent AgentOrg containing `/lead` and `/verifier`.
2. In `/lead`, invoke `send_message_to` targeting `/verifier`.
3. The lead conversation shows the successful tool call and later reply.
4. Select the target Agent and inspect its center event-monitor/conversation and right-side workspace tabs.

## Expected by user / AgentTeam parity

- The target Agent exposes the received inter-Agent message in its observable event-monitor/conversation experience.
- A root-scoped communication surface analogous to standalone AgentTeam's right-side **Team** tab makes cross-member sent/received messages inspectable.
- AgentOrg must not make ordinary internal communication less observable merely because the same Agents are mounted directly or under Teams inside an Org.

## Observed

- AgentOrg `/lead` shows its own successful `send_message_to` call and a later `/verifier` reply, proving delivery occurred.
- AgentOrg target communication is not exposed with standalone Team parity: the selected Agent's event-monitor area does not show the incoming message as expected, and the right panel has no Team/AgentOrg communication tab through which sent/received messages can be inspected.
- Standalone AgentTeam comparison does expose a right-side **Team** tab. Selecting `/analyst` shows the inbound message in the center and the Team tab's Messages panel; selecting `/lead` shows the corresponding outbound message; Activity shows the tool invocation.

## API/E2E coverage correction

API-REV-013 exercised real `send_message_to`/handoff/provider behavior as part of AgentOrg flows but did **not** assert either:

1. target-member event-monitor visibility of an ordinary AgentOrg message, or
2. a root-scoped AgentOrg communication/messages panel equivalent to the standalone Team tab.

Therefore the clean API-REV-013 coverage claim is incomplete for this scenario. This is not dismissed as covered by task lifecycle, conversation continuation, or source-level delivery success.

## Preliminary classification

`Unclear / likely Design Impact or Requirement Gap`, routed to Architecture Designer as the user requested. Architecture should establish:

- the normative AgentOrg right-side communication surface and label;
- whether direct-Agent and mounted-Team messages share one Org-level ledger or retain scoped views;
- how inbound/outbound messages appear for exact target/sender event monitors;
- history/Restore persistence and exact identity semantics for those messages;
- desktop/narrow behavior and parity boundaries with standalone AgentTeam.

No speculative implementation is prescribed by API/E2E.

## User evidence

- AgentOrg lead with successful `send_message_to`, but no communication tab:
  `/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/software_engineering_team_570be46d520142849ac61785be03dca1/api_e2e_engineer_d23a092db04042b69d944416be75d3b9/context_files/ctx_83457e940865__image.png`
- Standalone Team target Agent with inbound message and Team/Messages surface:
  `/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/software_engineering_team_570be46d520142849ac61785be03dca1/api_e2e_engineer_d23a092db04042b69d944416be75d3b9/context_files/ctx_776d92a7d604__image.png`
- Standalone Team sender with outbound message and Team/Messages surface:
  `/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/software_engineering_team_570be46d520142849ac61785be03dca1/api_e2e_engineer_d23a092db04042b69d944416be75d3b9/context_files/ctx_1afc7c83b6da__image.png`
- AgentOrg Activity showing tool execution but no communication-ledger parity:
  `/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/software_engineering_team_570be46d520142849ac61785be03dca1/api_e2e_engineer_d23a092db04042b69d944416be75d3b9/context_files/ctx_291d5166c865__image.png`
