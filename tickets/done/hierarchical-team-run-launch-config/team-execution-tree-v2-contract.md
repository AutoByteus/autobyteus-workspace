# TeamRun Execution Tree V2 — Concrete Contract

## Status And Recovery Provenance

`Approved behavior; recovered contract reconstruction pending architecture equivalence review.`

The user approved the V2 contract semantics on 2026-08-24. The original approved file was one of twelve paths that the disk-recovery archive could identify by path and Git blob ID but could not read. This file was reconstructed on 2026-08-24 from the recovered `requirements.md`, `design-spec.md`, `solution-revision-record.md` entries SR-004 through SR-006, and the recovered V2 domain/schema/migration implementation. It does not claim byte-for-byte identity with the unavailable blob `0fca000b40e49463b74427b8d95a9b4b0b14bf23`. Architecture review must confirm semantic equivalence before implementation resumes.

This supplement concretizes R-021 through R-031, R-035, and R-037 and AC-016 through AC-023 and AC-030. It does not change the approved behavior basis.

## Contract Principles

1. `AgentLaunchConfiguration` is the one complete executable launch value. An Agent stores it as `launchConfiguration`; a Team stores it as `defaultLaunchConfiguration`.
2. Every configured Team node, including the root, has a required complete default. Every configured Agent node retains a required complete resolved launch snapshot.
3. The root address is materialized as exactly `/`.
4. `TeamRunExecutionTreeFileV2` remains the compile-time file-payload name and `schemaVersion: 2` remains the persisted discriminator.
5. V2 uses current runtime values: `autobyteus`, `claude_agent_sdk`, and `codex_app_server`.
6. Current runtime, storage, transport, restore, and history readers are V2-only. V1 knowledge exists only inside the migration boundary.
7. All objects use exact keys; unknown or missing fields are invalid rather than silently tolerated.

## Exact TypeScript Shape

```ts
type IsoTimestamp = string;

type AgentLaunchConfiguration = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceRootPath: string | null;
}>;

type ConfiguredAgentExecutionNode = Readonly<{
  address: AgentTeamAddress;
  agentDefinitionId: string;
  role: string | null;
  description: string | null;
  agentRunId: string;
  platformAgentRunId: string | null;
  launchConfiguration: AgentLaunchConfiguration;
}>;

type ConfiguredTeamExecutionNode = Readonly<{
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

type ConfiguredExecutionNode =
  | ConfiguredAgentExecutionNode
  | ConfiguredTeamExecutionNode;

type TaskAgentExecution = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
  startedAt: IsoTimestamp;
  settledAt: IsoTimestamp | null;
}>;

type TaskTeamAgentExecution = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
}>;

type TaskTeamNestedTeamExecution = Readonly<{
  address: AgentTeamAddress;
  teamRunId: string;
  members: readonly TaskTeamMemberExecution[];
  taskExecutions: readonly TaskExecution[];
}>;

type TaskTeamMemberExecution =
  | TaskTeamAgentExecution
  | TaskTeamNestedTeamExecution;

type TaskTeamExecution = Readonly<{
  address: AgentTeamAddress;
  teamRunId: string;
  members: readonly TaskTeamMemberExecution[];
  taskExecutions: readonly TaskExecution[];
  startedAt: IsoTimestamp;
  settledAt: IsoTimestamp | null;
}>;

type TaskExecution = TaskAgentExecution | TaskTeamExecution;

type RootConfiguredTeamExecutionNode = Readonly<{
  address: "/";
  teamDefinitionId: string;
  teamDefinitionName: string;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredExecutionNode[];
  taskExecutions: readonly TaskExecution[];
}>;

type TeamRunApplicationBinding = Readonly<{
  applicationId: string;
  bindingId: string;
}>;

type CollaborationHandoff = Readonly<{
  from: string;
  to: string;
  rules: readonly string[];
}>;

type TeamRunExecutionTreeFileV2 = Readonly<{
  schemaVersion: 2;
  createdAt: IsoTimestamp;
  archivedAt: IsoTimestamp | null;
  applicationBinding: TeamRunApplicationBinding | null;
  handoffs: readonly CollaborationHandoff[];
  rootTeam: RootConfiguredTeamExecutionNode;
}>;
```

## Materialization Rules

- `rootTeam.address` is always `/`; non-root Team and Agent addresses are canonical, non-root addresses.
- A configured member must be a direct child of the containing Team address.
- Every configured Team has exactly one direct configured Agent whose address equals `coordinatorAddress`.
- Configured addresses, AgentRun IDs, and TeamRun IDs are unique across the configured tree. Task executions also use new unique run IDs while referring to configured placement addresses.
- The root and nested `defaultLaunchConfiguration` values are complete effective snapshots, not partial override intent.
- Each Agent `launchConfiguration` is its complete resolved snapshot after root, nearest-Team, and exact-Agent precedence has been applied.
- `llmConfig: null` and `workspaceRootPath: null` are complete values, not absent fields.
- `applicationBinding` and `handoffs` retain their current meanings. Handoff endpoints must resolve to configured placements, and the sender must be a configured Agent.
- Timestamps are ISO-8601 UTC strings. `settledAt`, when present, cannot precede `startedAt`.

## Realistic Materialized JSON

The example shows a root default, a customized `/research` Team default, an exact reviewer Agent configuration, and a `/delivery` Team that materializes inherited root values. Empty task arrays are deliberate valid snapshots, not omitted fields.

```json
{
  "schemaVersion": 2,
  "createdAt": "2026-08-24T10:00:00.000Z",
  "archivedAt": null,
  "applicationBinding": {
    "applicationId": "brief-studio",
    "bindingId": "default-team"
  },
  "handoffs": [
    {
      "from": "/coordinator",
      "to": "/research",
      "rules": ["Delegate source investigation to the research team."]
    }
  ],
  "rootTeam": {
    "address": "/",
    "teamDefinitionId": "editorial-team-definition",
    "teamDefinitionName": "Editorial Team",
    "teamRunId": "team-run-root",
    "coordinatorAddress": "/coordinator",
    "defaultLaunchConfiguration": {
      "runtimeKind": "autobyteus",
      "llmModelIdentifier": "gpt-5.4",
      "llmConfig": null,
      "autoExecuteTools": false,
      "skillAccessMode": "PRELOADED_ONLY",
      "workspaceRootPath": "/workspace/editorial"
    },
    "members": [
      {
        "address": "/coordinator",
        "agentDefinitionId": "editor-in-chief",
        "role": "Coordinator",
        "description": "Coordinates the editorial run.",
        "agentRunId": "agent-run-coordinator",
        "platformAgentRunId": null,
        "launchConfiguration": {
          "runtimeKind": "autobyteus",
          "llmModelIdentifier": "gpt-5.4",
          "llmConfig": null,
          "autoExecuteTools": false,
          "skillAccessMode": "PRELOADED_ONLY",
          "workspaceRootPath": "/workspace/editorial"
        }
      },
      {
        "address": "/research",
        "teamDefinitionId": "research-team-definition",
        "role": "Research",
        "description": "Investigates sources and evidence.",
        "teamRunId": "team-run-research",
        "coordinatorAddress": "/research/lead",
        "defaultLaunchConfiguration": {
          "runtimeKind": "claude_agent_sdk",
          "llmModelIdentifier": "claude-sonnet",
          "llmConfig": { "thinking": "enabled" },
          "autoExecuteTools": true,
          "skillAccessMode": "PRELOADED_ONLY",
          "workspaceRootPath": "/workspace/research"
        },
        "members": [
          {
            "address": "/research/lead",
            "agentDefinitionId": "research-lead",
            "role": "Research lead",
            "description": null,
            "agentRunId": "agent-run-research-lead",
            "platformAgentRunId": null,
            "launchConfiguration": {
              "runtimeKind": "claude_agent_sdk",
              "llmModelIdentifier": "claude-sonnet",
              "llmConfig": { "thinking": "enabled" },
              "autoExecuteTools": true,
              "skillAccessMode": "PRELOADED_ONLY",
              "workspaceRootPath": "/workspace/research"
            }
          },
          {
            "address": "/research/reviewer",
            "agentDefinitionId": "evidence-reviewer",
            "role": "Reviewer",
            "description": "Checks source quality.",
            "agentRunId": "agent-run-reviewer",
            "platformAgentRunId": null,
            "launchConfiguration": {
              "runtimeKind": "codex_app_server",
              "llmModelIdentifier": "gpt-5.6-luna",
              "llmConfig": { "reasoning_effort": "high" },
              "autoExecuteTools": true,
              "skillAccessMode": "PRELOADED_ONLY",
              "workspaceRootPath": "/workspace/research"
            }
          }
        ],
        "taskExecutions": []
      },
      {
        "address": "/delivery",
        "teamDefinitionId": "delivery-team-definition",
        "role": "Delivery",
        "description": null,
        "teamRunId": "team-run-delivery",
        "coordinatorAddress": "/delivery/publisher",
        "defaultLaunchConfiguration": {
          "runtimeKind": "autobyteus",
          "llmModelIdentifier": "gpt-5.4",
          "llmConfig": null,
          "autoExecuteTools": false,
          "skillAccessMode": "PRELOADED_ONLY",
          "workspaceRootPath": "/workspace/editorial"
        },
        "members": [
          {
            "address": "/delivery/publisher",
            "agentDefinitionId": "publisher",
            "role": "Publisher",
            "description": null,
            "agentRunId": "agent-run-publisher",
            "platformAgentRunId": null,
            "launchConfiguration": {
              "runtimeKind": "autobyteus",
              "llmModelIdentifier": "gpt-5.4",
              "llmConfig": null,
              "autoExecuteTools": false,
              "skillAccessMode": "PRELOADED_ONLY",
              "workspaceRootPath": "/workspace/editorial"
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

## V1-To-V2 Conversion Contract

| V1 Fact | V2 Result | Rule |
| --- | --- | --- |
| `schemaVersion: 1` | `schemaVersion: 2` | Fixed target discriminator |
| Root Team has no `address` | `rootTeam.address: "/"` | Deterministic canonical root |
| Configured Team has no default | Required `defaultLaunchConfiguration` | Copy the complete launch snapshot of that Team's persisted direct coordinator Agent |
| `runtimeKind: "AUTOBYTEUS"` | `runtimeKind: "autobyteus"` | Closed legacy-to-current mapping |
| `runtimeKind: "CLAUDE"` | `runtimeKind: "claude_agent_sdk"` | Closed legacy-to-current mapping |
| `runtimeKind: "CODEX"` | `runtimeKind: "codex_app_server"` | Closed legacy-to-current mapping |
| Agent launch snapshot | Agent launch snapshot | Preserve every field semantically; only decode the runtime label |
| IDs, topology, roles, descriptions, tasks, handoffs, binding, and timestamps | Same facts | Preserve semantically without current-definition lookup |

Migration fails before mutation when V1 is invalid, the runtime label is unsupported, a Team lacks exactly one persisted direct coordinator Agent, or the materialized V2 candidate fails exact schema/tree validation. A valid V2 file is idempotently skipped. After the existing atomic writer returns, the migration rereads the canonical path and accepts only exact V2.

## Explicitly Excluded Shapes

- No optional Team `defaultLaunchConfiguration`.
- No persisted partial Team or Agent overrides.
- No V1/V2 union in current runtime, history, stream, or GraphQL code.
- No coordinator-derived default for a new run.
- No current-definition lookup during migration or historical projection.
- No alternative root address and no omitted root address.
- No bespoke backup, journal, compatibility wrapper, dual writer, or legacy fallback in normal business paths.

## Implementation Sources Used For Recovery Cross-Check

- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-execution-tree.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts`
- `autobyteus-server-ts/src/run-history/store/team-run-execution-tree-schema.ts`
- `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-types.ts`
- `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.ts`
- `autobyteus-server-ts/tests/unit/app-data-migrations/team-run-execution-tree-v2-app-data-migration.test.ts`

