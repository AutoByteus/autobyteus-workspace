# Full-Stack Nested Team UI Validation Failure

## Summary

Full-stack browser validation on the worktree backend/frontend found a product/design gap: the backend creates and persists the nested mixed team correctly, but the frontend run UI flattens the nested child team and does not present the nested `BuildSquad` team node in the active run tree/workspace view.

This should go back to solution/design because it affects the user-facing model for nested teams, not only a local fixture or isolated test typo.

## Worktree / Branch

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`
- Branch: `codex/mixed-team-nested-agent-team`
- Backend server source: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts`
- Frontend source: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web`

## Important: This Did Not Use The Electron Backend

The user explicitly challenged this, so I verified process origins.

- Worktree backend listened on `127.0.0.1:8000`:
  - command: `node dist/app.js --host 127.0.0.1 --port 8000`
  - cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts`
- Worktree Nuxt browser frontend listened on `127.0.0.1:3020`:
  - command: `nuxt dev --host 0.0.0.0 --port 3020 --host 127.0.0.1`
  - cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web`
- Electron remained separately on port `29695`:
  - command path: `/Applications/AutoByteus.app/Contents/MacOS/AutoByteus ... --port 29695 --data-dir /Users/normy/.autobyteus/server-data`
  - cwd: `/Applications/AutoByteus.app/Contents/Resources/server`
  - not targeted by the browser validation.

Browser runtime evidence also showed:

- `window.electronAPI` absent / false.
- Nuxt public config used browser development proxy endpoints (`/graphql`, `/rest`) and WebSocket endpoint `ws://localhost:8000/ws/agent-team`, i.e. the worktree backend on port `8000`.

## Setup Used

The user asked to copy the main repo envs into the worktree, start backend/frontend, enhance the seed script, then validate from the frontend.

I copied env files without printing secret values:

```bash
cp /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/.env \
  /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts/.env
cp /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/.env \
  /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/.env
```

I used an isolated worktree SQLite DB to avoid mutating the user's main Electron/server data:

```bash
DATABASE_URL="file:/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts/db/fullstack-e2e.db"
```

Because the copied server `.env` caused Prisma to pick an incompatible cached engine in this local macOS environment on the first attempt, I used explicit Darwin engine overrides for the worktree server process:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts
APP_ENV=development \
AUTOBYTEUS_SERVER_HOST=http://localhost:8000 \
DATABASE_URL="file:/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-server-ts/db/fullstack-e2e.db" \
PRISMA_QUERY_ENGINE_LIBRARY="/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node" \
PRISMA_SCHEMA_ENGINE_BINARY="/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/schema-engine-darwin-arm64" \
node dist/app.js --host 127.0.0.1 --port 8000
```

Frontend browser dev command:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web
pnpm dev --port 3020 --host 127.0.0.1
```

Seed command:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team
python3 scripts/seed-personal-test-fixtures.py --graphql-url http://127.0.0.1:8000/graphql --wait-retries 10 --wait-delay 1
```

Seed output included the nested fixtures:

```text
Agent unchanged/created: Nested Program Manager Agent (id=nested-program-manager-agent)
Agent unchanged/created: Nested Review Lead Agent (id=nested-review-lead-agent)
Agent unchanged/created: Nested QA Specialist Agent (id=nested-qa-specialist-agent)
Team unchanged/created: Nested Build Squad Team (id=nested-build-squad-team)
Team unchanged/created: Nested Mixed Runtime Delivery Team (id=nested-mixed-runtime-delivery-team)
Fixture seed completed.
```

## Seed Fixture Added

Updated durable seed script:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/scripts/seed-personal-test-fixtures.py`

Seeded nested structure:

- Parent: `Nested Mixed Runtime Delivery Team`
  - coordinator leaf agent: `program_manager` -> `Nested Program Manager Agent`
  - nested child team node: `BuildSquad` -> `Nested Build Squad Team`
- Child: `Nested Build Squad Team`
  - coordinator leaf agent: `review_lead` -> `Nested Review Lead Agent`
  - teammate leaf agent: `qa_specialist` -> `Nested QA Specialist Agent`

The seed intentionally mirrors the durable live E2E's realistic mixed-runtime topology:

- parent coordinator: AutoByteus / LM Studio
- child coordinator: Codex App Server
- child teammate: Claude Agent SDK

## Browser Validation Steps

1. Opened `http://127.0.0.1:3020/agent-teams?view=team-list`.
2. Confirmed seeded cards appeared, including:
   - `Nested Build Squad Team`
   - `Nested Mixed Runtime Delivery Team`
3. Clicked `Run` for `Nested Mixed Runtime Delivery Team`.
4. In the workspace run config, configured the actual runtime/model set:
   - global runtime: `autobyteus`
   - global model: `qwen/qwen3.5-35b-a3b:lmstudio@127.0.0.1:1234`
   - global auto approve tools: `true`
   - skill access mode: `NONE`
   - member override `review_lead`: runtime `codex_app_server`, model `gpt-5.4-mini`, auto approve tools `true`
   - member override `qa_specialist`: runtime `claude_agent_sdk`, model `haiku`, auto approve tools `true`
   - workspace: `temp_ws_default`
5. Launched/sent a message to the parent coordinator asking it to call `send_message_to` to `BuildSquad`.
6. The worktree backend created a real team run: `team_nested-mixed-runtime-delivery-team_9585e151`.
7. The parent tool call succeeded:
   - tool: `send_message_to`
   - recipient_name: `BuildSquad`
   - result: `SUCCESS`
8. I terminated that validation team run afterward via GraphQL cleanup:
   - `terminateAgentTeamRun(teamRunId: "team_nested-mixed-runtime-delivery-team_9585e151")`
   - result: `success: true`

## Evidence That Backend Metadata Is Correct

After termination, `getTeamRunResumeConfig(teamRunId: "team_nested-mixed-runtime-delivery-team_9585e151")` returned recursive metadata with the nested child team preserved:

```json
{
  "memberTree": [
    {
      "memberKind": "agent",
      "memberRouteKey": "program_manager",
      "memberPath": ["program_manager"],
      "runtimeKind": "autobyteus"
    },
    {
      "memberKind": "agent_team",
      "memberRouteKey": "BuildSquad",
      "memberPath": ["BuildSquad"],
      "memberName": "BuildSquad",
      "teamDefinitionId": "nested-build-squad-team",
      "teamRunId": "team_nested-build-squad-team_4ea31f91",
      "coordinatorMemberRouteKey": "BuildSquad/review_lead",
      "memberTree": [
        {
          "memberKind": "agent",
          "memberRouteKey": "BuildSquad/review_lead",
          "memberPath": ["BuildSquad", "review_lead"],
          "runtimeKind": "codex_app_server"
        },
        {
          "memberKind": "agent",
          "memberRouteKey": "BuildSquad/qa_specialist",
          "memberPath": ["BuildSquad", "qa_specialist"],
          "runtimeKind": "claude_agent_sdk"
        }
      ]
    }
  ]
}
```

So the backend state contained the subteam node and proper nested route keys.

## Evidence That Frontend UI Is Wrong / Incomplete

Screenshot artifact:

- `/Users/normy/.autobyteus/browser-artifacts/995de5-1778644109170.png`

The user-provided screenshot also shows the same issue: the frontend workspace tree displays only:

- `Nested Mixed Runtime Delivery Team`
  - `Nested Program Manager Agent`
  - `Nested QA Specialist Agent`
  - `Nested Review Lead Agent`

It does not display:

- `BuildSquad`
  - `review_lead`
  - `qa_specialist`

Browser-store inspection from the frontend active team context showed:

```json
{
  "activeTeamRunId": "team_nested-mixed-runtime-delivery-team_9585e151",
  "focusedMemberName": "program_manager",
  "uiMemberKeys": ["program_manager", "review_lead", "qa_specialist"],
  "uiMemberNames": [
    "Nested Program Manager Agent",
    "Nested Review Lead Agent",
    "Nested QA Specialist Agent"
  ],
  "parentDefinitionNodes": [
    { "memberName": "program_manager", "refType": "AGENT" },
    { "memberName": "BuildSquad", "refType": "AGENT_TEAM" }
  ],
  "childDefinitionNodes": [
    { "memberName": "review_lead", "refType": "AGENT" },
    { "memberName": "qa_specialist", "refType": "AGENT" }
  ]
}
```

The parent and child team definitions are present in frontend state, but the active team UI context has already flattened the child team away.

## Source-Level Suspected Cause

Likely involved frontend files:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/utils/teamDefinitionMembers.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/stores/agentTeamContextsStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/stores/agentTeamRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/components/workspace/team/TeamMembersPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/components/workspace/team/TeamGridView.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/autobyteus-web/components/workspace/team/TeamSpotlightView.vue`

Specific source smell:

- `resolveLeafTeamMembers(...)` recursively returns only leaf `AGENT` members.
- In `agentTeamContextsStore.createRunFromTemplate()`, active team member contexts are created only from those leaf members.
- Current frontend active team context became a flat map keyed by `program_manager`, `review_lead`, `qa_specialist`.
- It did not preserve a display/runtime tree containing `BuildSquad` nor nested leaf route keys such as `BuildSquad/review_lead` and `BuildSquad/qa_specialist`.
- Existing frontend tests explicitly expect flattening; for example `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts` has a test named `flattens nested team definitions into leaf member contexts`. That expectation likely needs design review, not just implementation patching.

## Why This Needs Solution/Design Re-entry

The backend contract now supports recursive `memberTree` and canonical nested `memberRouteKey` / `memberPath`. The UI currently does not have an obvious product contract for how nested team nodes should appear and behave.

Design questions to settle before implementation:

1. Should the workspace run tree show nested team nodes as expandable groups, e.g. `Nested Mixed Runtime Delivery Team -> BuildSquad -> review_lead/qa_specialist`?
2. Should focus/spotlight/grid modes be able to focus a subteam node as well as leaf agents?
3. Should the message composer target a subteam coordinator by selecting `BuildSquad`, or only leaf members?
4. Should active team context keep both:
   - a recursive display tree, and
   - a leaf-member lookup map for streaming/conversation updates?
5. Should frontend launch member configs always use canonical nested route keys (`BuildSquad/review_lead`, `BuildSquad/qa_specialist`) rather than flat names for child-team leaves?
6. Should run history and restore views use backend `metadata.memberTree` as the authoritative tree for nested display?
7. How should tool/activity panels display inter-agent messages whose recipient/source is a nested team node?

## Validation Classification

- Result: `Fail`
- Failure type: Requirement/design gap exposed by full-stack E2E validation.
- Not a backend runtime failure: backend creates recursive child metadata correctly and parent `send_message_to` to `BuildSquad` succeeded.
- Not a simple test-only issue: the user-visible frontend tree omits the nested team node.
- Recommended owner: `solution_designer` for investigation/design reset.

## Focused Checks Already Passed During This Round

```bash
python3 -m py_compile scripts/seed-personal-test-fixtures.py
# passed

git diff --check
# passed
```

Backend health check during validation:

```bash
curl -fsS http://127.0.0.1:8000/graphql \
  -H 'content-type: application/json' \
  --data '{"query":"query { __typename }"}'
# {"data":{"__typename":"Query"}}
```

Frontend health check during validation:

```bash
curl -fsS http://127.0.0.1:3020/
# returned Nuxt HTML
```

## Reproduction Checklist

1. Build backend if needed:
   ```bash
   pnpm -C autobyteus-server-ts build
   ```
2. Start worktree backend on `8000` using the command in this note.
3. Seed fixtures:
   ```bash
   python3 scripts/seed-personal-test-fixtures.py --graphql-url http://127.0.0.1:8000/graphql --wait-retries 10 --wait-delay 1
   ```
4. Start worktree Nuxt frontend:
   ```bash
   pnpm -C autobyteus-web dev --port 3020 --host 127.0.0.1
   ```
5. Open `http://127.0.0.1:3020/agent-teams?view=team-list`.
6. Run `Nested Mixed Runtime Delivery Team`.
7. Configure runtime/model overrides as described above.
8. Launch by sending parent coordinator a message to `send_message_to` recipient `BuildSquad`.
9. Observe that the frontend tree/workspace displays only flat leaf members and omits the `BuildSquad` nested team node, while backend resume metadata contains the correct recursive `BuildSquad` tree.
