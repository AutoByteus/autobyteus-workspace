# Minimal Agent Integration Guide (Streaming Bridge)

This document explains the minimal set of frontend pieces required to integrate with the AutoByteus agent backend. It is intended for apps that want to keep their own UI but reuse the core agent streaming infrastructure.

## What this guide covers

- The minimal files/components you need
- The request + streaming flow
- Required runtime configuration
- A small example call from a feature store

## High-level flow

1) Your UI collects user input (prompt).
2) Your feature store calls the GraphQL mutation `sendAgentUserInput`.
3) The backend returns a new `agentId`.
4) Your streaming service opens a WebSocket to `/ws/agent/<agentId>`.
5) Incoming stream events build AI segments in the conversation state.
6) The UI renders the latest AI message (streaming text).

## Minimal building blocks

### 1) GraphQL sender
A tiny wrapper that sends `sendAgentUserInput` and returns `agentId`.

Required fields for a new agent run:
- `agentDefinitionId` (string)
- `llmModelIdentifier` (string)
- `userInput.content` (string)

### 2) Agent run store
Orchestrates:
- creating a temporary context
- calling the GraphQL mutation
- opening the WebSocket stream
- tracking `isSending` / completion

### 3) Streaming service + protocol
A WebSocket client that:
- connects to `/ws/agent/<agentId>`
- parses server messages
- dispatches to handlers

### 4) Streaming handlers
Minimal handler set:
- `SEGMENT_START`
- `SEGMENT_CONTENT`
- `SEGMENT_END`
- `AGENT_STATUS`
- `ASSISTANT_COMPLETE`
- `ERROR`

These handlers update the agent context and mark messages complete.

### 5) Core types
You need small types for:
- Agent context + run state
- Conversation + message segments
- Agent status enum

## Minimal file checklist (frontend)

These are the minimal modules typically required:

- GraphQL
  - `services/agentGraphql.ts`
- Run store
  - `stores/agent/agentRunStore.ts`
- Streaming
  - `services/agentStreaming/GalavionAgentStreamingService.ts`
  - `services/agentStreaming/transport/*`
  - `services/agentStreaming/protocol/*`
  - `services/agentStreaming/handlers/*`
- Types
  - `types/agent/*`
  - `types/segments.ts`
  - `types/conversation.ts`

## Agent Team integration (minimal)

Agent teams use the same streaming protocol but connect to a different WebSocket endpoint and require a team run config. If your app needs multi-agent coordination, you need the additional minimal pieces below.

### Additional building blocks

1) **Team GraphQL sender**
- Mutation: `sendMessageToTeam`
- Required on first message:
  - `teamDefinitionId`
  - `memberConfigs[]`
  - `userInput.content`

2) **Team run store**
- Creates an `AgentTeamContext` with member contexts
- Sends the initial team message
- Opens `/ws/agent-team/<teamId>` stream

3) **Team streaming service**
- Routes incoming events to the correct member by `agent_name` or `agent_id`
- Handles core events: `SEGMENT_*`, `AGENT_STATUS`, `ASSISTANT_COMPLETE`, `TEAM_STATUS`, `ERROR`

### Minimal team file checklist

- Team GraphQL sender
  - `services/agentTeamGraphql.ts`
- Team run store
  - `stores/agent/agentTeamRunStore.ts`
- Team streaming service
  - `services/agentStreaming/TeamStreamingService.ts`
- Team types
  - `types/agent/AgentTeamContext.ts`
  - `types/agent/TeamRunConfig.ts`
  - `types/agent/AgentTeamStatus.ts`

### Team runtime config

```
NUXT_PUBLIC_TEAM_WS_ENDPOINT=ws://localhost:8000/ws/agent-team
```

## Runtime configuration

Recommended environment variables:

```
NUXT_PUBLIC_GRAPHQL_BASE_URL=http://localhost:8000/graphql
NUXT_PUBLIC_AGENT_WS_ENDPOINT=ws://localhost:8000/ws/agent
```

If you want fixed agents per feature, add:

```
NUXT_PUBLIC_EMAIL_WRITER_AGENT_ID=<agent-definition-id>
NUXT_PUBLIC_EMAIL_WRITER_MODEL=<model-identifier>
```

## Minimal feature store example

This example shows how a feature store can start a run and render streaming output.

```ts
import { defineStore } from 'pinia';
import { useAgentRunStore } from '~/stores/agent/agentRunStore';

export const useMyFeatureStore = defineStore('myFeature', {
  state: () => ({
    prompt: '',
  }),
  getters: {
    streamedText(): string {
      const agentRunStore = useAgentRunStore();
      return agentRunStore.latestAssistantText;
    },
  },
  actions: {
    async runAgent() {
      const agentRunStore = useAgentRunStore();
      await agentRunStore.startRun({
        agentDefinitionId: '<agent-definition-id>',
        llmModelIdentifier: '<model-identifier>',
        content: this.prompt,
        autoExecuteTools: true,
      });
    },
  },
});
```

## Troubleshooting

- Stuck in loading state
  - Ensure the streaming service sets `isSending = false` on `AGENT_STATUS: idle` or `ASSISTANT_COMPLETE`.
- "agentDefinitionId and llmModelIdentifier are required"
  - Both must be provided for a new agent run.
- No stream output
  - Verify WebSocket endpoint (`/ws/agent/<agentId>`) and backend logs.
- "String cannot represent a non string value"
  - Ensure `agentDefinitionId` is a string, not a number.

## Notes

- Agent IDs are internal; use the agent **definition ID**, not the display name.
- If you want to use agent names, add a lookup layer that resolves name -> id first.
