# Quick-Launch Browser / Live API Evidence Summary

- Authoritative detailed evidence: `browser-live-evidence.json`
- Development commit: `bb3e5161a73ae78bea2bcaba00700e3d849a550a`
- Run interval: `2026-08-21T06:57:32.422Z` to `2026-08-21T06:57:54.579Z`
- Result: `Pass`
- Platform / Node: `darwin-arm64` / `v22.23.1`
- Isolated endpoints: backend `http://127.0.0.1:55233`, Nuxt `http://127.0.0.1:55234`
- Renderer: Google Chrome via Playwright Core, headless, 1440x1000, en-US, Europe/Berlin.
- External provider calls: none; configuration allocation is observable before a provider turn.

## Scenario Results

| Scenario | Result | Direct evidence |
| --- | --- | --- |
| `QL-E2E-001` | `Pass` | Uniform browser form rendered `0` overrides; all six submitted members received the edited runtime, model, nested model config, and auto-approval values. |
| `QL-E2E-002` | `Pass` | Heterogeneous browser form rendered `4 overridden`; six-member no-edit materialization preserved source effects, and the global config edit reached inheritors while genuine runtime/model/config/auto deltas remained. |
| `QL-E2E-003` | `Pass` | Two actual `CreateAgentTeamRun` requests were captured. For uniform and heterogeneous launches, submitted records deep-equaled server-tree records and hydrated records; each new run had an active runtime checkpoint and its own schema-v1 file. |
| `QL-E2E-004` | `Pass` | Uniform/heterogeneous source files and all seven definition directories had identical before/after hashes; source resume payloads were deep-equal and new run IDs/files were distinct. |

## Exact Correlation Evidence

| Launch | Members | Submitted = server tree | Submitted = hydrated | Runtime checkpoint | New persisted schema-v1 file |
| --- | ---: | --- | --- | --- | --- |
| uniform | 6 | `True` | `True` | active root `quick_launch_team_95e834c136be_08d33f1b3b7e4a3aa5d073a0ee2f64ce`; sequence `0`; open work `False` | SHA-256 `f1c43f233e7beb1cac5fedc7038859f967dba37bd00e084db14a0c897d66a1be`, 5700 bytes |
| heterogeneous | 6 | `True` | `True` | active root `quick_launch_team_95e834c136be_784db4eaf51941b587f5071b09bf75df`; sequence `0`; open work `False` | SHA-256 `4d4b90d3397ef0eed1bcb0457d8ad474017f6a0776395286a7674a8086ff0d4d`, 5829 bytes |

## Source Direct-Use / Non-Rewrite Evidence

| Source history | Schema | Before/after SHA-256 | Bytes | mtime unchanged | Resume payload unchanged |
| --- | ---: | --- | ---: | --- | --- |
| uniform | `1` | `5a074d149f1f37016d181d1a47797d88c4d6cad7a5b51b473f9f9d4e18e9b7d5` (identical) | 5442 | `True` | `True` |
| heterogeneous | `1` | `e6acf94f3427ce4e82dfc8b8286dac745604f11996c8798f81c46889bdd75a39` (identical) | 5439 | `True` | `True` |

- Definition directory hashes unchanged: `True` (team plus six agent definitions).
- Source history files were read through the normal GraphQL resume reader, projected in the production frontend path, and never migrated or rewritten.
- New run files were separate from both source history paths.

## Browser / Visual Evidence

- `uniform-override-render.png`: visually inspected production `TeamRunConfigForm`; no override badge is shown for the uniform source.
- `heterogeneous-override-render.png`: visually inspected production `TeamRunConfigForm`; `4 overridden` is shown and all six members render.
- Browser events recorded: 7; request failures/page errors: 0; probe failures: 0.
- Browser console evidence contains only Vite connection, expected server-store informational messages, and the Vue Suspense informational notice.

## Cleanup

- browser: `closed`
- nuxt: `stopped`
- backend: `stopped`
- fixtureRoute: `removed` (`/Users/normy/autobyteus_org/autobyteus-worktrees/quick-launch-config-override/autobyteus-web/pages/api-e2e-quick-launch-config.vue`)
- dataRoot: `removed` (`/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/quick-launch-api-e2e-data-ix6jBf`)
- workspaceRoot: `removed` (`/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/quick-launch-api-e2e-workspace-F5hdyI`)
- Temporary dependency links were removed after repository/build/live execution.
- No owned probe, backend, Nuxt, or isolated-port process remains; the temporary Nuxt route is absent.
- The detailed evidence JSON, logs, screenshots, probe source, and ticket-scoped fixture source are retained as audit evidence.

## Non-Product Attempt Corrections

- An initial probe invocation could not resolve `playwright-core` from the ticket directory; the probe was corrected to resolve it from the frontend package.
- A first complete evidence attempt exposed a probe-only readiness-catalog accumulation bug; `QL-E2E-001` passed and `QL-E2E-002` stopped before product launch. The fixture was corrected, and the final authoritative rerun passed all four scenarios.
- These were local validation-harness/environment corrections, not product failures. `browser-live-evidence-attempt-1.json` is retained for traceability; `browser-live-evidence.json` is authoritative.
