# The user's desktop check — autobyteus-32 Model Routing (Done-when)

An isolated AutoByteus desktop app of this worktree's build: its own data and ports, your real runtime sign-ins
(Claude, Codex, Antigravity, Grok), and nothing in your everyday app or `~/.autobyteus` is touched.

## Start and stop

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing
pnpm --silent isolated-app start --from-worktree      # the build is in autobyteus-web/electron-dist (1.5.9-beta.9 build of this branch)
# … check …
pnpm --silent isolated-app stop <instanceId from the start output>
```

## What to check (about 10 minutes)

1. **Settings → Model Routing → Configuration**: turn Model Routing on; choose the router, e.g. Claude / sonnet.
   The status line then says the router is ready.
2. **Talk to the router**: tell it your preference, e.g. "For implementation tasks choose Codex; for design and
   writing choose Claude." It writes this into its `knowledge.md`.
3. **Agents**: create two agents without a default runtime ("Solution Designer", "Implementation Engineer"), an Agent
   Team with both, and a "Manager" agent (any runtime, e.g. Claude / haiku).
4. **Chat** with the Manager: "Delegate the team with the task: design and implement a login form."
5. Expect:
   - the `delegate_task` result (Activity) has one line per member: "runs on <runtime> / <model>, chosen by the Model
     Router (<task kind>): <reason>", e.g. Solution Designer on Claude, Implementation Engineer on Codex;
   - the Manager run's **Settings** → Delegated copies: each member's runtime, model, "Model Router · <task kind>" and
     the reason, with "View decision";
   - **Model Routing → Decisions**: the Task with both members, their launches and reasons; **Overview**: the sources
     and task kinds.
6. Optional: turn Model Routing off and delegate again: everything is as before (the delegating run's launch).
