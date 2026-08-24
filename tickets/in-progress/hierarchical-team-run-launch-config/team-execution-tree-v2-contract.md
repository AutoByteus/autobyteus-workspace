# TeamRun Execution Tree V2 — Contract And Materialized Example

## Status And Authority

`Approved` design/interface contract. Approved by the user on 2026-08-24 after personal review of the materialized structure, naming, version markers, V1-to-V2 differences, and migration boundary.

This supplement makes the V2 execution-tree structure concrete. It is authoritative for the proposed TypeScript names, required fields, JSON representation, and materialized example. It supports `requirements.md` R-021–R-031, R-035, R-037 and AC-016–AC-023, AC-030. It does not replace the behavioral requirements or migration mechanics in `design-spec.md`.

## Contract Principles

1. `AgentLaunchConfiguration` is the one complete executable Agent value.
2. A configured Agent stores that value as `launchConfiguration`.
3. A configured Team stores that value as `defaultLaunchConfiguration`; the Team itself does not launch an LLM runtime.
4. Every configured Team default and Agent launch configuration is fully materialized. The persisted tree contains no partial override or inheritance marker.
5. Root address `/` is stored explicitly in V2.
6. Configured execution-tree node names use one parallel `*ExecutionNode` family.
7. `RuntimeKind` is serialized using its current enum values: `autobyteus`, `claude_agent_sdk`, or `codex_app_server`.
8. Task execution structures remain unchanged by this ticket.
9. The current file-payload type deliberately retains the versioned name `TeamRunExecutionTreeFileV2`, while materialized JSON retains `schemaVersion: 2`. The suffix identifies the compile-time contract being implemented; the field lets migration and storage code classify the actual persisted payload. The user explicitly accepted retaining both during design review.

## Canonical TypeScript Shape

```ts
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type AgentLaunchConfiguration = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceRootPath: string | null;
}>;

export type ConfiguredAgentExecutionNode = Readonly<{
  address: AgentTeamAddress;
  agentDefinitionId: string;
  role: string | null;
  description: string | null;
  agentRunId: string;
  platformAgentRunId: string | null;
  launchConfiguration: AgentLaunchConfiguration;
}>;

export type ConfiguredTeamExecutionNode = Readonly<{
  address: AgentTeamAddress;
  teamDefinitionId: string;
  role: string | null;
  description: string | null;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredExecutionNode[];
  taskExecutions: readonly TaskExecution[];
}>;

export type ConfiguredExecutionNode =
  | ConfiguredAgentExecutionNode
  | ConfiguredTeamExecutionNode;

export type RootConfiguredTeamExecutionNode = Readonly<{
  address: "/";
  teamDefinitionId: string;
  teamDefinitionName: string;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredExecutionNode[];
  taskExecutions: readonly TaskExecution[];
}>;

export type TeamRunApplicationBinding = Readonly<{
  applicationId: string;
  bindingId: string;
}>;

export type TeamRunExecutionTreeFileV2 = Readonly<{
  schemaVersion: 2;
  createdAt: string;
  archivedAt: string | null;
  applicationBinding: TeamRunApplicationBinding | null;
  handoffs: readonly CollaborationHandoff[];
  rootTeam: RootConfiguredTeamExecutionNode;
}>;
```

`TaskExecution` and its task-Agent/task-Team child types retain their current fields and validation. They are shown as empty arrays below because this contract focuses on configured launch policy rather than delegated task history.

## Materialization Rules

| Subject | Stored property | Materialized source for a new run |
| --- | --- | --- |
| Root Team `/` | `defaultLaunchConfiguration` | Complete root launch configuration |
| Nested Team | `defaultLaunchConfiguration` | Complete effective parent configuration merged with that Team's explicit override |
| Configured Agent | `launchConfiguration` | Complete containing-Team default merged with that Agent's exact override |

Consequences:

- A Team with no explicit override still stores a complete `defaultLaunchConfiguration` equal to its parent's effective value.
- Changing the definition's defaults later cannot change a stored run.
- Restore does not need the original frontend draft, current definition defaults, or a coordinator inference.
- A future Agent added to a live TeamRun can use the nearest configured Team's `defaultLaunchConfiguration` when no exact configuration is supplied.

## Materialized JSON Example

This example represents:

- root `/` using AutoByteus in `/workspace/product`;
- `/research` overriding runtime/model/workspace/auto-execute for its subtree;
- `/research/reviewer` overriding only the model and model configuration;
- `/delivery` having no Team override and therefore materializing the same default as `/`.

```json
{
  "schemaVersion": 2,
  "createdAt": "2026-08-24T12:00:00.000Z",
  "archivedAt": null,
  "applicationBinding": null,
  "handoffs": [
    {
      "from": "/coordinator",
      "to": "/research/research_lead",
      "rules": [
        "Delegate research work to the research team."
      ]
    }
  ],
  "rootTeam": {
    "address": "/",
    "teamDefinitionId": "team-def-product-delivery",
    "teamDefinitionName": "Product Delivery",
    "teamRunId": "team-run-product-delivery",
    "coordinatorAddress": "/coordinator",
    "defaultLaunchConfiguration": {
      "runtimeKind": "autobyteus",
      "llmModelIdentifier": "gpt-5.6-luna",
      "llmConfig": null,
      "autoExecuteTools": false,
      "skillAccessMode": "PRELOADED_ONLY",
      "workspaceRootPath": "/workspace/product"
    },
    "members": [
      {
        "address": "/coordinator",
        "agentDefinitionId": "agent-def-product-coordinator",
        "role": "Product coordinator",
        "description": null,
        "agentRunId": "agent-run-product-coordinator",
        "platformAgentRunId": null,
        "launchConfiguration": {
          "runtimeKind": "autobyteus",
          "llmModelIdentifier": "gpt-5.6-luna",
          "llmConfig": null,
          "autoExecuteTools": false,
          "skillAccessMode": "PRELOADED_ONLY",
          "workspaceRootPath": "/workspace/product"
        }
      },
      {
        "address": "/research",
        "teamDefinitionId": "team-def-research",
        "role": "Research",
        "description": null,
        "teamRunId": "team-run-research",
        "coordinatorAddress": "/research/research_lead",
        "defaultLaunchConfiguration": {
          "runtimeKind": "claude_agent_sdk",
          "llmModelIdentifier": "claude-sonnet-4-5",
          "llmConfig": null,
          "autoExecuteTools": true,
          "skillAccessMode": "PRELOADED_ONLY",
          "workspaceRootPath": "/workspace/product/research"
        },
        "members": [
          {
            "address": "/research/research_lead",
            "agentDefinitionId": "agent-def-research-lead",
            "role": "Research lead",
            "description": null,
            "agentRunId": "agent-run-research-lead",
            "platformAgentRunId": null,
            "launchConfiguration": {
              "runtimeKind": "claude_agent_sdk",
              "llmModelIdentifier": "claude-sonnet-4-5",
              "llmConfig": null,
              "autoExecuteTools": true,
              "skillAccessMode": "PRELOADED_ONLY",
              "workspaceRootPath": "/workspace/product/research"
            }
          },
          {
            "address": "/research/reviewer",
            "agentDefinitionId": "agent-def-research-reviewer",
            "role": "Research reviewer",
            "description": null,
            "agentRunId": "agent-run-research-reviewer",
            "platformAgentRunId": null,
            "launchConfiguration": {
              "runtimeKind": "claude_agent_sdk",
              "llmModelIdentifier": "claude-opus-4-1",
              "llmConfig": {
                "temperature": 0.2
              },
              "autoExecuteTools": true,
              "skillAccessMode": "PRELOADED_ONLY",
              "workspaceRootPath": "/workspace/product/research"
            }
          }
        ],
        "taskExecutions": []
      },
      {
        "address": "/delivery",
        "teamDefinitionId": "team-def-delivery",
        "role": "Delivery",
        "description": null,
        "teamRunId": "team-run-delivery",
        "coordinatorAddress": "/delivery/delivery_lead",
        "defaultLaunchConfiguration": {
          "runtimeKind": "autobyteus",
          "llmModelIdentifier": "gpt-5.6-luna",
          "llmConfig": null,
          "autoExecuteTools": false,
          "skillAccessMode": "PRELOADED_ONLY",
          "workspaceRootPath": "/workspace/product"
        },
        "members": [
          {
            "address": "/delivery/delivery_lead",
            "agentDefinitionId": "agent-def-delivery-lead",
            "role": "Delivery lead",
            "description": null,
            "agentRunId": "agent-run-delivery-lead",
            "platformAgentRunId": null,
            "launchConfiguration": {
              "runtimeKind": "autobyteus",
              "llmModelIdentifier": "gpt-5.6-luna",
              "llmConfig": null,
              "autoExecuteTools": false,
              "skillAccessMode": "PRELOADED_ONLY",
              "workspaceRootPath": "/workspace/product"
            }
          }
        ],
        "taskExecutions": []
      }
    ],
    "taskExecutions": []
  }
}
```

## V1-To-V2 Materialization

For a V1 tree:

1. Decode each legacy runtime label into the current `RuntimeKind`:
   - `AUTOBYTEUS` -> `autobyteus`
   - `CLAUDE` -> `claude_agent_sdk`
   - `CODEX` -> `codex_app_server`
2. Preserve every Agent launch field semantically while writing the V2 `AgentLaunchConfiguration` representation.
3. Set `rootTeam.address` to `/`.
4. For every root/nested configured Team, locate its persisted direct coordinator Agent and copy that coordinator's decoded `launchConfiguration` into `defaultLaunchConfiguration`.
5. Preserve all IDs, roles, descriptions, topology, handoffs, application binding, task executions, timestamps, and archive state.
6. Validate the complete V2 object before atomic replacement and again after materialization.

Coordinator reconstruction is migration-only. New-run writers receive explicit complete Team configurations and never derive them from an Agent.

## Explicitly Excluded Shapes

The V2 contract does not contain:

- `teamOverrides` or `agentOverrides`;
- inherited/customized flags;
- optional Team defaults;
- definition-default references;
- a second Team-specific launch-configuration value type;
- `TeamRunLaunchConfiguration` or `TeamRunLaunchConfigurationSnapshot`;
- V1/V2 unions in current runtime code.
