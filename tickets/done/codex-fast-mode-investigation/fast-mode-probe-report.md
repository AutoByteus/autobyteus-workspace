# Codex Fast-Mode Probe Report

## Status

Evidence complete on 2026-09-01. This report is investigative context, not intended-behavior authority; approval applicability is `N/A`.

## Executive Result

The user's process-reuse hypothesis was **not reproduced**. AutoByteus intentionally shares one Codex app-server client per normalized workspace, but Codex applies `serviceTier` on each thread and turn. A single local Codex 0.152.0 app-server process accepted three consecutive thread starts as Default -> Fast -> Default and returned effective tiers `default` -> `priority` -> `default`.

The currently active Software Engineering Team run is not configured for Fast mode. Its persisted launch configuration contains only `reasoning_effort: "xhigh"`, and Codex's own structured debug log records `service_tier: Some(None)` for both turns. The supplied screenshot also shows a checkmark beside `Default`, not `fast`.

Older AutoByteus runs configured with `service_tier: "fast"` did reach Codex correctly. A recent same-product Software Engineering Team run stored `service_tier: "fast"`, and Codex's structured log records `service_tier: Some(Some("fast"))` on its turns.

## Current OpenAI / Codex Contract

- Official OpenAI API documentation says a request opts into Fast mode with `service_tier=fast` or `service_tier=priority`; a successfully served Fast response reports `service_tier=priority`.
- Local Codex 0.152.0 generated app-server types still expose `serviceTier` on `thread/start`, `thread/resume`, and `turn/start`. `turn/start` describes that field as an override for the current and subsequent turns.
- Codex 0.152.0 also adds `serviceTierForTurn` for a one-turn-only override. AutoByteus's run-level configuration correctly uses `serviceTier`, not `serviceTierForTurn`.
- Model metadata has evolved: `additionalSpeedTiers` is now explicitly deprecated in favor of structured `serviceTiers`. The live `gpt-5.6-sol` row returned:
  - deprecated `additionalSpeedTiers: ["fast"]`;
  - modern `serviceTiers: [{ "id": "priority", "name": "Fast", "description": "1.5x speed, increased usage" }]`;
  - `defaultServiceTier: null`.
- AutoByteus currently reads only deprecated `additionalSpeedTiers` for UI capability discovery and continues sending the accepted legacy alias `fast`. This works today but is a forward-compatibility risk, not the cause of the reported current behavior.

## Probe A — Mixed Tiers In One Shared Process

### Method

A temporary Node JSON-RPC probe spawned exactly one `codex app-server` process in `/Users/normy/autobyteus_org/browser_docker`, initialized it, selected live model `gpt-5.6-sol`, then issued three `thread/start` calls on that same PID:

1. `serviceTier: null`
2. `serviceTier: "fast"`
3. `serviceTier: null`

Temporary script: `/tmp/probe-codex-shared-process-service-tier.mjs` (not a repository artifact).

### Result

- Codex CLI: `0.152.0`
- Shared process PID: `46048`
- Returned tiers in call order:
  - thread `01a05d92-aaa8-7700-a8b4-f28fc9a11267`: `default`
  - thread `01a05d92-abe5-7943-9d2b-27751ced8e55`: `priority`
  - thread `01a05d92-ac77-7741-b025-44ce2cb9f433`: `default`

### Conclusion

The process is a transport/runtime host, not a service-tier singleton. Reusing an app-server process that already hosts a Default thread does not pin later threads to Default.

### Codex 0.151 Compatibility Recheck

The same probe was repeated with the exact Codex 0.151.0 binary used by the running AutoByteus app-server process. It also returned `default` -> `priority` -> `default` and advertised:

```json
{
  "serviceTiers": [
    { "id": "priority", "name": "Fast", "description": "1.5x speed, increased usage" }
  ],
  "additionalSpeedTiers": ["fast"]
}
```

This confirms that the current structured `serviceTiers` field is available in both locally supported Codex 0.151.0 and 0.152.0; deprecated-field fallback is unnecessary for the approved capability-discovery change.

## Probe B — Minimal Live Turn Timing

### Method

A second temporary probe used one Codex 0.152.0 app-server process and alternated four new ephemeral `gpt-5.6-sol` threads: Default, Fast, Default, Fast. Each turn used `reasoning effort: low` and requested the exact one-word response `READY`.

Temporary script: `/tmp/probe-codex-fast-latency.mjs` (not a repository artifact).

### Result

| Sample | Requested Tier | App-Server Returned Tier | Completed | Elapsed |
| --- | --- | --- | --- | ---: |
| 1 | Default | `default` | Yes | 5009 ms |
| 2 | Fast | `priority` | Yes | 3497 ms |
| 3 | Default | `default` | Yes | 3604 ms |
| 4 | Fast | `priority` | Yes | 3524 ms |

- Default mean: `4307 ms`
- Fast mean: `3511 ms`
- Observed mean difference: about `18.5%` lower wall time for Fast in this tiny sequence.

### Interpretation Limit

This is configuration and smoke evidence, not a statistically valid performance benchmark. Cold-start effects, upstream variance, prompt/cache state, reasoning tokens, and transport reuse can dominate four tiny samples. The returned `priority` tier is the authoritative configuration evidence.

## Active AutoByteus Run Evidence

Active team run:

- Team run ID: `software_engineering_team_dfd262862a3e4a66b044794c1713eaf1`
- Member run: `/solution_designer`
- Codex thread: `01a05d8b-afd5-7723-b44f-51225e0b4e64`
- Workspace: `/Users/normy/autobyteus_org/browser_docker`
- Running app-server PID for that workspace: `54973`
- Running app-server binary resolved by `lsof`: Codex `0.151.0`

Persisted launch configuration in `team_run_execution_tree.json`:

```json
{
  "llmModelIdentifier": "gpt-5.6-sol",
  "llmConfig": {
    "reasoning_effort": "xhigh"
  }
}
```

Codex structured log for both current turns:

```text
service_tier: Some(None)
effort: Some(Some(XHigh))
```

Conclusion: this active run is standard/default tier with maximum configured reasoning effort. It cannot be used as evidence that configured Fast mode is slow.

## Historical AutoByteus Fast Evidence

Example recent run:

- Team run ID: `software_engineering_team_18262a8ace9447e29f7f92b8940a94fd`
- Member Codex thread: `01a053d0-2f86-71a3-b3f0-fd2074d0f02a`
- Workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`

Its execution tree contains:

```json
{
  "reasoning_effort": "xhigh",
  "service_tier": "fast"
}
```

Codex structured log records on multiple turns:

```text
service_tier: Some(Some("fast"))
effort: Some(Some(XHigh))
```

Conclusion: AutoByteus's UI/config/backend path has successfully delivered Fast mode to real Codex turns. `xhigh` remained independent and can still make end-to-end agent work long.

## Code Path Findings

1. `ModelConfigSection.vue` and `ModelConfigAdvanced.vue` emit schema-backed `llmConfig.service_tier` and remove it when Default is selected.
2. Team launch services preserve `llmConfig` into the run execution tree and member launch configuration.
3. `resolveCodexSessionServiceTier()` maps stored `service_tier: "fast"` to `CodexThreadConfig.serviceTier`.
4. `CodexThreadManager` passes the tier to `thread/start` and `thread/resume`.
5. `CodexThread.startInput()` passes the tier again to every `turn/start`.
6. `CodexAppServerClientManager` shares one client per normalized workspace and maintains independent thread objects/configurations behind that shared transport.
7. The manager currently extracts only thread ID from start/resume responses; it discards the returned effective `serviceTier`. AutoByteus therefore cannot show or assert the provider-acknowledged tier.

## Root-Cause Assessment And Scope Decision

- Reported suspicion (shared process pins service tier): disproved.
- Current active run: not configured for Fast mode.
- Existing runtime propagation defect: not found.
- Confirmed local defect: capability discovery depends on deprecated `additionalSpeedTiers` rather than current structured `serviceTiers`.
- Observed but explicitly out of scope by user decision: effective service tier returned by Codex is discarded. The user does not want runtime/model-specific tier state added to global run headers or other runtime UI; the existing configuration form is sufficient.
- Existing durable tests verify shared-client reuse and service-tier payloads separately, but not mixed-tier isolation on one shared client/process. This remains evidence context rather than an approved source-change requirement.

## Conclusion For The Requested Scope

The backend Fast-mode execution is correct for installed Codex 0.151/0.152. Keep the shared per-workspace app-server process; a process-per-tier split is neither required nor justified.

The approved follow-up is narrowly to replace deprecated capability discovery with canonical `model/list.serviceTiers`. Preserve the existing configuration-form-only UX and stable product value `service_tier: "fast"`. Do not add effective-tier status, header badges, runtime transport fields, or acknowledgement parsing.
