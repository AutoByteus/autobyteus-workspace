# API-REV-018 Delegated-Task UI Post-Fix Analysis

## Product result

IR-021 resolves the two user-visible failures from API-REV-017. Real Chrome against the built server and Nuxt frontend shows:

- a nonzero task count and full task description in the Team panel;
- a distinct active task AgentTeam row;
- after expanding that row, a distinct nested task Agent row;
- exact task Agent selection with the task-scoped conversation and details;
- exact task AgentTeam selection;
- active, awaiting-review, accepted, refresh/restore, and terminal-cleanup transitions; and
- no browser console/page error in any accepted provider row.

The exact task Agent screenshot is `browser/postfix-task-ui-<runtime>-task-agent-selected.png` for AutoByteus, Codex, and Claude. The task Agent is intentionally nested beneath the collapsible task AgentTeam row; an assertion that does not expand the parent row is invalid.

## Real provider rows

All six accepted fresh rows passed in the isolated environment:

1. test-owned nested task UI Team on AutoByteus `gpt-5.6-luna`;
2. the same Team on Codex App Server `gpt-5.6-luna`, medium reasoning;
3. the same Team on authenticated Claude Agent SDK `sonnet`, medium reasoning;
4. staged nested-classroom task-Team UI on AutoByteus;
5. staged nested-classroom task-Team UI on Codex; and
6. staged nested-classroom task-Team UI on Claude.

The test-owned Team was deliberately created because the imported nested-classroom fixture does not grant `delegate_task` to `student_one`; asking that Agent to create a nested task Agent is not a valid fixture scenario. The test-owned Team preserves the same rooted Team/task-Team pattern but explicitly grants the Lead the task tools required to delegate a nested Worker task.

## Rejected exploratory attempts

- The first imported-fixture AutoByteus attempt requested an unsupported nested delegation. It produced a valid outer task Team but cannot prove a nested task Agent and is not acceptance evidence.
- One early task-UI probe observed the task Agent event and two active records while its DOM sampler reported only the task Team. Inspection showed the task Team row was collapsed. The final scripts expand it before asserting or selecting the nested task Agent.
- Provider/tool timing and browser-DOM races caused bounded failed attempts. Every failed root was terminated; final evidence uses fresh successful roots only.

## Package/import qualification

The current post-fix environment loaded the exact isolated staged package through `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`. API-REV-016 remains the current proof of public GraphQL `LOCAL_PATH` package import for the same source fixture. API-REV-018 does not relabel direct root registration as a fresh public-import result.

## Environment-safety result

Product behavior passes, but API-REV-018 is overall **Fail** because the first attempted isolated server start inherited an ambient `DATABASE_URL` and targeted `/Users/normy/.autobyteus/server-data/db/production.db`. It found no pending Prisma schema migration, then ran the canonical app-data migration and recorded another failed attempt with 203 failed items before startup halted. No automatic rollback, repair, deletion, or row inspection was attempted.

Every accepted provider/browser row subsequently ran against the exact disposable database `sr015-api-rev-018-20260810-1.db`. Open-file guards show the accepted isolated server had no operational-database reference. The isolated failure state is preserved; the user-held `60004/31004` stack remains running and untouched.

