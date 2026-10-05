# Solution Designer Result — SR-026 (REQ-BL-010): Disable Codex built-in multi-agent for AutoByteus-launched Codex

## Outcome
- Package **project-task-manager-linked-delegation**, **SR-026**, 2026-10-05.
- **Architecture Design Complete for a small, independent delta:** `task_size` **Small**, `architectural_risk` **Low**, route **direct implementation**. The cumulative package (SR-023/SR-024, ARCH-REV-010/011) is unchanged.
- **Approval:** REQ-BL-010 / **SD-AP-005**. The user approved it during API/E2E testing: "we definitely should do that… we have to do it ourselves… otherwise the users will feel very strange behavior". It was relayed verbatim by `/api_e2e_engineer`, with a request to fast-track it.

## Requirement (requirements-doc.md, REQ-BL-010)
- **REQ-014:** every Codex app-server AutoByteus launches runs with Codex's built-in multi-agent features disabled, whatever the user's Codex config says, including when env overrides customize the args. The user's `config.toml` is not modified.
- **AC-017:** with `[features] multi_agent = true` (and `multi_agent_v2 = true`) in the user's config:
  - an AutoByteus Codex agent, including a delegated Task copy, has no built-in `send_message` / `list_agents`;
  - it replies through AutoByteus's `send_message_to`;
  - the Codex journeys are unchanged;
  - AutoByteus still starts on a Codex version that doesn't know one of the feature names.

## Design (design-spec.md § SR-026)
- **File:** `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-launch-config.ts` (the single launch-args owner).
- **Change:** `parseArgs()` returns `[...base, "-c", "features.multi_agent=false", "-c", "features.multi_agent_v2=false"]`, where `base` is today's default `["app-server"]` or the env override (`CODEX_APP_SERVER_ARGS_JSON` / `CODEX_APP_SERVER_ARGS`), parsed exactly as now. The overrides are **always appended**.
- **Use `-c`, not the proposed `--disable`.** The Designer verified with codex-cli 0.160.0 in an isolated `CODEX_HOME` (E-103):
  - `-c` overrides config.toml;
  - `app-server` starts with `-c` even for an unknown feature key;
  - `--disable <unknown>` → "Unknown feature flag", and app-server fails to start. A Codex version without `multi_agent_v2` would break every Codex run.
- **Tests:** unit tests for the default, `CODEX_APP_SERVER_ARGS` and `CODEX_APP_SERVER_ARGS_JSON` (valid and invalid) cases, each ending with the four tokens. API/E2E for AC-017 with the user-level feature on, plus a Codex journey regression.
- **Not in scope:** editing the user's `~/.codex/config.toml` (the API engineer's local `multi_agent = false` stopgap is user-local, not the fix), other features, other runtimes.

## Context
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`, HEAD `e94d83538` (IR-014 merge), base/finalization origin/personal.
- The current API/E2E round on IR-014 (Codex + Claude reruns) continues; this delta joins the same package.
- **DR-002 must not finalize an earlier candidate.**

## Artifacts (absolute)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/data-model-draft.md` (unchanged)

## Routing
Recorded below after `get_handoff_rules`.

### SR-026 routing / confirmed handoff
The delta is classified Small / Low → only the direct-implementation rule matches (the Large/High review rule and the Delivery receipt rule do not). `send_message_to` → `/implementation_engineer` confirmed accepted=true / DELIVERED (run `implementation_engineer_9c1d0893d06d4c5da7a7346539895a59`). No other recipient; the requesting API/E2E engineer receives the result through the normal implementation → review → API route. Solution Designer stops.
