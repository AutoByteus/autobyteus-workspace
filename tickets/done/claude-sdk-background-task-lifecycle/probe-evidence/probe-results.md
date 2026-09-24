# Probe Results — Claude Code background Bash under different query lifecycles

Date: 2026-09-24. SDK `@anthropic-ai/claude-agent-sdk@0.3.231` (from `autobyteus-server-ts/node_modules`),
real Anthropic API through the local Claude CLI auth, model `haiku`, cwd `/tmp/bgprobe`,
`permissionMode: bypassPermissions`, `settingSources: []`.

Scripts: `probe.mjs` (modes A/B/C) and `probeD.mjs` (mode D) in this folder.
Each probe asks the model to run `sleep 20; echo PROBE_DONE > /tmp/bgprobe/<mode>.marker`
with `run_in_background: true`, reply `STARTED` and end the turn. After the query
iteration ends, the script waits 30 s and checks the marker file.
(`system thinking_tokens` frames omitted below.)

## A — string prompt, `query.close()` on the first `result` (same as AutoByteus today)

```
3.1s assistant tool_use:Bash {"command":"sleep 20; echo PROBE_DONE > /tmp/bgprobe/A.marker","run_in_background":true}
6.3s assistant ["STARTED"]
6.3s result success
6.3s closing query on result (mirrors AutoByteus)
38.3s marker exists: false
```
Task output file `/private/tmp/claude-501/-private-tmp-bgprobe/1813c7f8-…/tasks/b4665jscp.output` = `\n[killed]\n`.
**Same signature as the delivery engineer's three failed builds.**

## B — string prompt, keep iterating after `result` (no close)

```
3.1s assistant tool_use:Bash {... "run_in_background":true}
5.5s result success
10.7s system background_tasks_changed
10.7s system task_updated
10.7s system task_notification stopped  .../tasks/bpsvdpbtu.output
10.7s iteration ended
40.7s marker exists: false
```
The CLI in single-prompt mode stops remaining background tasks itself about 5 s after
the result and then exits. So just not calling `close()` does not fix it.

## C — streaming input (async-iterable prompt, stdin kept open after `result`)

```
3.1s assistant tool_use:Bash {... "run_in_background":true}
4.2s system background_tasks_changed / task_started
5.7s assistant ["STARTED"]
5.7s result success                       <- turn 1 ends, CLI stays alive
24.7s system background_tasks_changed / task_updated
24.7s system task_notification completed .../tasks/biymrrucd.output
24.8s system init                          <- CLI starts a new turn on its own
26.2s assistant ["NOTIFIED"]
26.2s result success                       <- turn 2 ends (initiated by the CLI, not the user)
56.8s marker exists: true
```
The background command completes, and the CLI sends a `task_notification` and
**starts a new model turn without any new user input**.

## D — `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` in the CLI env, close on `result` (as today)

```
9.5s assistant tool_use:Bash {"command":"sleep 20; echo PROBE_DONE > /tmp/bgprobe/D.marker","description":"Background probe task"}   <- no run_in_background
30.8s user (tool_result, after the 20 s command finished)
32.4s assistant ["STARTED"]
32.5s result success
62.8s marker exists: true
```
With the switch set, the model can't pass `run_in_background` (even though the prompt
asked for it). The command runs in the foreground inside the turn and completes.
The normal foreground Bash timeout limits still apply.
