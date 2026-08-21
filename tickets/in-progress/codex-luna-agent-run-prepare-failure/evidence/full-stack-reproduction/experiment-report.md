# Isolated Production Full-Stack Reproduction

## Purpose

Reproduce the reported Daily Assistant failure independently of the user's live application data, identify the exact internal exception from the delivered production build, and run causal A/B controls.

## Environment

- Delivered application: `/Applications/AutoByteus.app`
- Version: `1.4.53`
- Backend artifact: delivered `Contents/Resources/server/dist/app.js`
- Isolated server: `127.0.0.1:39721`
- Isolated application data, SQLite database, memory, logs, and temp workspace under a disposable `/tmp/autobyteus-skill-bootstrap-repro.*` root
- Agent package imported through production GraphQL `importAgentPackage` from `/Users/normy/autobyteus_org/autobyteus-agents`
- Agent definition: `daily-assistant`
- Runtime/model: `codex_app_server` / `gpt-5.6-luna`
- Skill mode: `PRELOADED_ONLY`

The reproduction used the exact production GraphQL `prepareAgentRun` plus `/ws/agent/:runId` `SEND_MESSAGE` sequence used by the frontend. The user's screenshot already supplies the real renderer observation; relaunching another renderer would not add causal evidence beyond this exact transport path.

## Experiment A — Synthetic Copy Of Observed Stale State

Created this broken symlink in the isolated temp workspace:

```text
.codex/skills/shell-first-operating-practice
  -> /Users/normy/autobyteus_org/autobyteus-agents/agents/daily-assistant/skills/shell-first-operating-practice
```

The target does not exist. The current resolved source is:

```text
/Users/normy/autobyteus_org/autobyteus-skills/shell-first-operating-practice
```

Results:

1. `prepareAgentRun` succeeded and returned prepared run `daily_assistant_ae4c8ad28c2843dc942dc9124e8426c8`.
2. The first WebSocket `SEND_MESSAGE` transitioned `offline -> initializing -> error`.
3. The command ACK was `state: failed`, `accepted: false`, `code: ACTIVATION_FAILED`.
4. The surfaced message exactly matched the reported UI shape: `Failed to prepare agent run ...`.

## Exact Internal Exception Probe

Invoked the delivered production `CodexWorkspaceSkillMaterializer` directly against the same isolated workspace and current resolved `Skill` object. It threw:

```text
Workspace skill path collision for Codex skill 'shell-first-operating-practice': workspace skill path '/tmp/autobyteus-skill-bootstrap-repro.KknVzE/temp_workspace/.codex/skills/shell-first-operating-practice' already points to '/Users/normy/autobyteus_org/autobyteus-agents/agents/daily-assistant/skills/shell-first-operating-practice' instead of '/Users/normy/autobyteus_org/autobyteus-skills/shell-first-operating-practice'.
```

This is the exception that `AgentRunManager` stores as `.cause` before replacing its visible message with the generic preparation error.

## Experiment B — Single-Variable Control

Removed only the synthetic broken symlink. Kept the delivered server, isolated database, imported agent package, Daily Assistant definition, workspace, runtime, model, and skill mode unchanged.

Results:

1. `prepareAgentRun` succeeded for `daily_assistant_646d31fee5e04a349ac9c9f7f54ff0a8`.
2. The first `SEND_MESSAGE` ACK was `state: accepted`, `accepted: true`.
3. AutoByteus created the correct materialization link to `/Users/normy/autobyteus_org/autobyteus-skills/shell-first-operating-practice`.
4. The run was then terminated successfully.

This A/B control isolates the stale link as the causal variable.

## Experiment C — Genuinely Unresolvable Configured Skill

Restarted the same isolated server without the shared skills repository in `AUTOBYTEUS_SKILLS_PATHS`, while retaining the same imported Daily Assistant package. The configured skill therefore could not be resolved at all.

Results:

1. The server warned: `Skill 'shell-first-operating-practice' defined in agent definition 'Daily Assistant' could not be resolved. Skipping.`
2. The first `SEND_MESSAGE` ACK was nevertheless `state: accepted`, `accepted: true` for run `daily_assistant_3295ad24633341dbbf0e5addfebd3b32`.
3. The run was terminated successfully.

Therefore, a genuinely missing/unresolvable configured skill is already non-blocking in the tested release. The defect is specifically the stale materialization-path collision, which is currently treated as fatal.

## Excluded Alternative Causes

- `gpt-5.6-luna` is advertised by Codex and direct `thread/start` succeeds.
- A Codex project-trust warning appeared in both failed and successful paths and explicitly states that skills still load; it is not causal.
- Removing only the stale link changes failure to success.
- The completed CWD branch does not modify the activation/materialization paths.

## Conclusion

The immediate root cause is confirmed with a production full-stack reproduction and a single-variable A/B control: a persistent AutoByteus-created skill symlink retained the old source after the skill moved, and the materializer treats that stale broken link as a fatal collision rather than reconciling it.

The product requirement should preserve the already-correct warning-and-skip behavior for genuinely missing skills and extend non-blocking recovery to stale managed materialization state. Diagnostics must also stop hiding the original cause.
