# Live-Test Secret Provisioning Specification

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/live-test-secret-provisioning.md`
- Purpose: define direct one-time provisioning of the physically separate host real-E2E Store, tracked non-secret test contract, per-worktree zero-copy flow, real execution modes including managed Claude SDK authentication, failure semantics, security boundary, and explicit non-impact on existing Docker deployment.
- Scope: REQ-002–REQ-005, REQ-008, REQ-009, REQ-012, REQ-016–REQ-018 / AC-003, AC-004, AC-006, AC-010, AC-012, AC-013, AC-015, AC-016, AC-018.
- Status: `User Approved — AR-007 / MP-002 Evidence Reassessment; Architecture Re-review Requested`.
- Approval applicability: `Required`; this supplement defines intended developer, test, and operator behavior.
- Core artifacts supported: [requirements.md](./requirements.md), [investigation-notes.md](./investigation-notes.md), [design-spec.md](./design-spec.md).
- Related supplements: [use-case-spine-validation.md](./use-case-spine-validation.md), [secret-storage-architecture.md](./secret-storage-architecture.md), [secret-storage-backend-contract.md](./secret-storage-backend-contract.md), [credential-consumer-mapping.md](./credential-consumer-mapping.md), [threat-model-and-option-analysis.md](./threat-model-and-option-analysis.md).

## Problem Being Solved

Current real tests commonly depend on this path:

```text
fresh worktree lacks ignored .env.test
 -> human identifies another checkout
 -> credential file is copied
 -> global Vitest setup loads every value into process.env
 -> every test/child may inherit every key
```

The target makes a machine-global, physically separate real-E2E Local Store—not the worktree—the credential distribution unit:

```text
one-time setup provisions real-e2e-secret-store.db with its independent key
 -> Git supplies non-secret scenario/Store configuration to every worktree
 -> test command constructs the Local backend in Agent Server
 -> backend opens the real-E2E Store read-only and validates its format
 -> value-free preflight verifies required logical IDs
 -> trusted test/server boundary resolves only scenario-declared credentials
 -> real provider is exercised
```

No person copies a secret file or re-enters credentials merely because a worktree was created.

## Real And Deterministic Coverage Are Complementary

Fake endpoints do not replace real-provider tests. They remain preferable for deterministic lifecycle, error, request-shape, parser, denial, and failure-injection coverage. Real-provider tests remain required when the scenario is intended to detect actual authentication, SDK/protocol compatibility, current model behavior, provider-specific streaming/tools/media, quota, or real endpoint behavior.

| Mode | Credential Delivery | Upstream | Appropriate Scope |
| --- | --- | --- | --- |
| `SYNTHETIC` | per-test in-memory backend and synthetic value | local fake/test double | deterministic unit/integration/UI and security negatives |
| `REAL_GATEWAY` | opaque bounded gateway capability; gateway owns real key | real provider through fixed trusted gateway | broad real behavior where raw-key construction is not under test |
| `REAL_DIRECT_SECRET` | trusted reviewed client/server resolves scenario-declared key | provider directly | exact storage-to-constructor/authentication path and SDK credential delivery |

No coverage owner may reclassify a required real scenario as synthetic merely to avoid provisioning.

## Tracked Non-Secret Test Contract

Canonical file: `test-config/live-e2e.json`.

```json
{
  "version": 1,
  "backend": {
    "kind": "local-store",
    "databaseFile": "real-e2e-secret-store.db",
    "keyFile": "real-e2e-secret-store.key",
    "accessMode": "READ_ONLY"
  },
  "scenarios": {
    "openai.llm": {
      "mode": "REAL_DIRECT_SECRET",
      "requiredSecrets": ["provider.openai.api-key"],
      "model": "configured-non-secret-model"
    },
    "openai.agent-flow": {
      "mode": "REAL_GATEWAY",
      "requiredSecrets": ["provider.openai.api-key"]
    },
    "serper.search": {
      "mode": "REAL_DIRECT_SECRET",
      "requiredSecrets": ["search.serper.api-key"]
    },
    "anthropic.claude-agent-sdk": {
      "mode": "REAL_DIRECT_SECRET",
      "runtimeAuthMode": "managed-secret",
      "requiredSecrets": ["provider.anthropic.api-key"],
      "model": "configured-non-secret-model"
    }
  }
}
```

Allowed tracked content:

- schema version, backend kind, canonical Store filenames, and read-only access mode;
- scenario IDs/modes and logical secret definition IDs;
- non-secret models, timeouts, feature flags, expected capabilities, and explicit runtime mode such as `managed-secret`;
- non-secret server/test ports and URLs.

Forbidden tracked content:

- credential values, encoded variants, hashes, lengths, or recognizable fragments;
- Local Store encryption-key contents or any other bootstrap credential;
- Vault/cloud token, private key, cookie, session, or service-account credential;
- a path to an ignored file or another checkout;
- a command/environment export containing a secret;
- a runtime/caller-selected backend path or path outside the canonical trusted host root.

`.env.test` may be committed only after every credential field and credential loader is removed. It may retain non-secret compatibility settings such as ports or feature flags during the test-runner cleanup, but it is not the canonical live-secret/Store contract. Package `.gitignore` files must add an explicit exception only after a value/name scan demonstrates the tracked file is secret-free.

The root `pnpm test:e2e:real` script resolves `test-config/live-e2e.json` from its own tracked workspace root and passes that non-secret path explicitly to the harness. Package runners do not walk parent directories or guess another checkout to locate it.

## Machine-Global Local Store State

State outside every repository/worktree contains:

- `~/.autobyteus/server-data/secret-store/real-e2e-secret-store.db`;
- the independent `real-e2e-secret-store.key` with owner-only permissions;
- encrypted exact records for the real-E2E logical definitions;
- no daemon, socket, connection credential, process state, or profile catalog.

Git contains only backend kind, canonical filenames/access mode, scenarios, and logical definition IDs. The root launcher derives the host Store root from `~/.autobyteus/server-data/secret-store/`. Database ciphertext and key bytes remain host machine state and are not committed. This host test contract does not configure or mount Docker.

Stores do not inherit. A missing real-E2E credential fails preflight even if the default Store contains it. First-delivery setup is constructed with the writable E2E target only and accepts dedicated test credentials directly through hidden transient input. It has no source/default backend dependency, read path, copy command, or automatic inheritance. This deliberately accepts one extra provisioning action in exchange for a smaller custody boundary.

## Local Developer Workflow

### One-time machine setup

Representative command contract:

```text
pnpm secrets:local:e2e:setup
 -> initialize the dedicated real-E2E database/key pair if both are absent
 -> accept each provider credential using hidden input or a non-captured trusted UI
 -> construct a writable in-process Local backend against that Store
 -> authenticate the Store/key pair verifier, including before the first record exists
 -> write each exact definition and checkpoint/close the Store
 -> validate selected provider credentials when configured
 -> print only backend health plus logical ID and CONFIGURED/VALID/UNVERIFIED status
```

Setup is repeated only for a new machine/Store/provider, rotation/revocation, expired credentials, or Store repair. AutoByteus cannot manufacture an upstream provider key. Provisioning must not run concurrently with host read-only provider execution.

### Per-worktree execution

```text
git creates worktree
 -> tracked test-config/live-e2e.json is already present
 -> pnpm test:e2e:real [scenario filter]
 -> harness parses and validates tracked schema
 -> launcher derives canonical real-E2E database/key paths outside the worktree
 -> Agent Server constructs an in-process read-only Local backend for that pair
 -> backend authenticates the Store/key pair verifier and validates format without mutating it
 -> value-free preflight checks only scenario-required logical IDs
 -> reviewed test/server boundary starts with the explicit Store and requirements
 -> browser/API runner executes normal product behavior against real provider
 -> evidence is sanitized and the backend/database handle is closed
```

The harness never searches parent directories, guesses the “main repo,” copies `.env.test`, loads credential dotenv, opens the default Store, or falls back to environment.

### Docker non-impact

This specification does not define a Docker real-E2E Store-sharing path. Existing Docker Compose, launcher, named volumes, and normal node setup remain unchanged.

A normal Docker container is one independent Agent Server node. It derives its default Local Store below its existing `AUTOBYTEUS_DATA_DIR` (`/home/autobyteus/data` in the current Compose file), which is already backed by the `autobyteus-server-data` persistent volume. A user may connect the web or Electron client to that node and configure credentials through the normal server Settings flow; those credentials remain owned by that Docker node. Kubernetes follows the same rule for a single server Pod with its own PVC. Multiple replicas cannot share a writable Local Store and require a future installed centralized adapter; no such production adapter ships in this delivery.

Operators remain free to customize Docker volumes or backend configuration themselves, but AutoByteus does not prescribe bind mounts, external E2E volumes, path environment variables, or launcher behavior in this ticket. Host worktree zero-touch testing and Docker node persistence are independent use cases.

### Value-free preflight output

Allowed:

```text
Real-E2E Store: READY (read-only)
openai.llm: READY (provider.openai.api-key configured)
serper.search: MISSING (run pnpm secrets:local:e2e:setup --definition search.serper.api-key)
```

The preflight health vocabulary is exactly `READY`, `LOCKED`, `UNAVAILABLE`, `CORRUPT`, or `INCOMPATIBLE`. Definition state (`MISSING`/`CONFIGURED`) is shown only for `READY`; every other health returns a stable value-free setup instruction and no definition projection. A wrong/swapped key, missing half-pair, or verifier failure reports `CORRUPT`; an unsupported Store/verifier version reports `INCOMPATIBLE`.

Forbidden: key fragments, lengths, fingerprints, hashes, absolute backend paths, encryption-key material, raw provider response bodies, or default-Store existence/details.

## Test Harness Trust Boundaries

### Default deterministic harness

- uses a fresh in-memory backend or disposable temporary Local Store, according to the behavior under test;
- uses synthetic canary values only;
- cannot open either shared canonical default or real-E2E Store;
- proves lifecycle, error mapping, redaction, no-fallback, UI, and client-construction behavior deterministically.

### Real direct-secret harness

- is a narrow package or server process, not a general test helper available to arbitrary test code;
- opens only the host real-E2E database/key pair read-only; the default Store paths are not supplied;
- loads only the selected scenario declaration;
- runs only the selected scenario's normal catalog-bound product path; no general raw resolver is exposed to the browser or test API;
- resolves at the last trusted moment, constructs the SDK client, and discards `SecretValue` references;
- does not mutate parent `process.env` or add the value to command lines, snapshots, fixtures, browser state, or reporters; the exact Claude managed scenario may place its authorized key only in the exact Claude Code child environment under the specialized contract below;
- runs only after implementation source review or an equivalent local trust gate;
- scans logs/results/artifacts using safe synthetic canaries and structural redaction checks.

Direct access is necessary for scenarios whose subject is credential delivery into the actual SDK. Source review before this mode is a team-workflow prerequisite, not an invented runtime attestation/capability subsystem. It is not a claim that reviewed code which receives the key cannot exfiltrate it.

### Managed Claude Agent SDK harness

- tracked configuration selects `runtimeAuthMode: "managed-secret"`; no raw key or alias is tracked;
- the Store-bound server invokes the normal `ClaudeSdkClient`; that client calls its injected `ClaudeRuntimeAuthenticationService`, which resolves the exact `agentRuntime/claude_agent_sdk/apiKey` consumer through `SecretManagementService` immediately before model-discovery/run child construction;
- the runner, browser, parent server environment, sibling processes, and AutoByteus-owned tool children never receive the key;
- `ClaudeSdkClient` supplies exactly `ANTHROPIC_API_KEY` to the exact Claude Code child through SDK `env`, with empty setting sources, `tools: []`, and strict explicitly materialized AutoByteus MCP configuration;
- a real provider authentication plus one bounded Claude SDK request proves the actual Store-to-SDK-child path; the result may be skipped only when the declared real-E2E credential/capability is unavailable, never silently replaced with a fake;
- a synthetic spawn-capture test separately verifies the exact environment shape and parent/sibling/tool-child noninheritance without printing the value;
- diagnostics are redacted before buffering; scanner coverage includes prompts, messages, tool I/O, stderr, session events, logs, reports, and artifacts;
- cleanup drops AutoByteus references and closes/aborts the SDK query, without claiming deterministic deletion from the authorized child or SDK memory.

### Real gateway harness

- gateway holds the key and accepts a narrow provider/scenario protocol;
- caller receives an opaque, short-lived, scenario-scoped capability;
- destination/provider/model constraints are server-owned; callers cannot choose an arbitrary URL or header;
- gateway logs/events remain value-free;
- this mode reduces broad test-process exposure but cannot replace direct construction tests.

## CI Workflow

CI does not reuse a developer's Local Store. It uses the same logical `SecretManagementService`/consumer contracts with CI custody:

```text
CI job obtains workload identity
 -> selected CI backend resolves a restricted test namespace
 -> non-secret scenario manifest selects definitions
 -> preflight checks configured status
 -> trusted server/gateway executes real scenarios
 -> results/artifacts are sanitized
 -> ephemeral identity/session/namespace is revoked or expires
```

Where a CI platform can only expose a credential as a job secret, inject it directly into a one-shot trusted setup/provider process, not a shared environment inherited by agent-controlled commands. Prefer workload identity and external backend resolution.

## Scenario Coverage Intent

| Scenario Purpose | Expected Mode | Reason |
| --- | --- | --- |
| lifecycle/atomic-replacement/status/error mapping | `SYNTHETIC` | storage correctness does not require billable providers |
| UI write-only behavior and no readback | `SYNTHETIC` | deterministic assertions are stronger |
| provider request shape/error redaction | `SYNTHETIC` | exact interception/fault injection |
| provider authentication acceptance | `REAL_DIRECT_SECRET` | validates storage-to-SDK path |
| model simple/streaming/tool behavior | `REAL_GATEWAY` or `REAL_DIRECT_SECRET` | current provider/model behavior changes |
| agent end-to-end turns | `REAL_GATEWAY` where suitable | real model behavior with narrower key exposure |
| live model discovery | `REAL_DIRECT_SECRET` | real metadata endpoint and authentication |
| media formats/generation | real mode | fake bytes do not prove provider behavior |
| live search | real mode | real service/schema behavior |
| Claude Agent SDK managed authentication and one bounded request | `REAL_DIRECT_SECRET` with `runtimeAuthMode: managed-secret` | validates exact consumer authorization, Store resolution, child environment delivery, and current SDK/CLI authentication |
| isolation, denial, and canary absence | `SYNTHETIC`, plus selected real checks | safe exact negative assertions |

The downstream coverage owner decides the precise durable test inventory after implementation, but may not remove the semantic real-provider intent defined here.

## Failure Semantics

| Condition | Required Result |
| --- | --- |
| tracked config missing/invalid | fail with file/schema location; never search another checkout |
| real-E2E database and key both absent | fail with the one-time E2E setup command |
| only database or key exists | fail `CORRUPT_STORE`; never generate a replacement key or overwrite the surviving file |
| Store files inaccessible | report `UNAVAILABLE` with a value-free setup instruction |
| Store schema/encryption/verifier format incompatible | report `INCOMPATIBLE` / fail `INCOMPATIBLE_STORE_FORMAT`; do not rewrite, downgrade, or replace the Store |
| Store locked | report `LOCKED` / fail `BACKEND_LOCKED`; no fallback |
| wrong/swapped key, one missing pair file, pair-verifier failure, or authenticated-record failure | report `CORRUPT` / fail `CORRUPT_STORE` or `CORRUPT_STORED_VALUE`; no fallback |
| required definition missing | report logical definition and scenarios only |
| invalid/revoked provider credential | scenario fails with sanitized `INVALID_PROVIDER_CREDENTIAL` |
| Claude mode is `auto`, `api-key`, or unknown | fail `CLAUDE_RUNTIME_AUTH_MODE_INVALID` before secret lookup or child spawn |
| Claude managed definition missing | fail `CLAUDE_RUNTIME_CREDENTIAL_MISSING`; no CLI/ambient fallback |
| Claude managed Store non-ready | map exactly to `CLAUDE_RUNTIME_SECRET_STORE_LOCKED`, `_UNAVAILABLE`, `_CORRUPT`, or `_INCOMPATIBLE`; no child spawn |
| Claude managed binding invalid | fail `CLAUDE_RUNTIME_SECRET_BINDING_INVALID`; no backend resolve or child spawn |
| Claude SDK child spawn/provider auth fails | fail `CLAUDE_RUNTIME_SPAWN_FAILED` or `CLAUDE_RUNTIME_AUTH_FAILED`; redact before buffering and never change mode/backend |
| quota/model/provider issue | fail or classify via existing provider rules; never reinterpret as “secret missing” |
| result/log/artifact canary hit | fail the run and restrict evidence; never attach the raw hit |

## Security Checks

1. Fresh worktree `git status` shows no copied secret file, Local Store data, or encryption-key material.
2. Test/agent child environments contain no provider key or backend bootstrap material, except the exact Claude Code child in explicit managed mode contains only its authorized `ANTHROPIC_API_KEY`.
3. Agent file tools cannot reach Local Store paths and agent child environments/descriptors start from explicit empty-base allowlists. The managed Claude parent, siblings, unrelated children, and AutoByteus tool children receive no key. This proves `LOCAL_HARDENED`, not denial against the authorized Claude process or arbitrary same-user filesystem/process access.
4. Browser/GraphQL cannot invoke raw resolve, enumerate values, select another Store, or supply Store paths.
5. Direct harness can resolve only declared scenario definitions and only during the run.
6. Gateway cannot attach credentials to caller-supplied destinations.
7. Logs, errors, traces, snapshots, and artifacts contain neither raw nor expected encoded synthetic canaries.
8. Cleanup closes backend/database handles and revokes/cleans ephemeral CI capabilities without value output.
9. A missing real-E2E value never opens or falls back to the default Store, `.env.test`, `.env`, or `process.env`.
10. Local CRUD tests receive a separate temporary writable pair; neither shared host Store is mutated.
11. Existing Docker Compose/launcher/volume configuration is unchanged by this test design.
12. Repository/team workflow runs implementation source review before `REAL_DIRECT_SECRET`; the product does not pretend to prove source trust through a new runtime flag.
13. Empty-Store pair verification proves correct pair `READY`, swapped key/partial pair/verifier tamper `CORRUPT`, and unsupported format `INCOMPATIBLE` without writing or regenerating.
14. Claude CLI-mode tests make zero management calls; managed-mode synthetic capture proves one resolve per child, no caller `env`, exact child-only alias delivery, empty settings/strict MCP/safe tools, and no fallback for the complete failure matrix.
15. A real managed-Claude scenario authenticates and completes a bounded SDK request from the read-only real-E2E Store; evidence passes structural redaction checks without reading/exporting the real value. Separate synthetic exact/encoded-canary scans include a seeded negative leak proving the scanner fails correctly.

## Why This Improves The Agent-Driven Workflow

The improvement comes from four properties together:

1. **one-time machine custody** — real values are provisioned once outside all checkouts;
2. **physically separate E2E custody** — every worktree selects the same real-E2E database/key pair through tracked config while the default Store stays unavailable;
3. **in-process lifecycle** — Electron and test servers construct the Local backend directly, without another service or user action;
4. **explicit resolution** — trusted test/server code receives only the declared credential instead of broad ambient environment state.

If a consumer still reads `process.env`, a test still copies an ignored file, or a missing host test value falls back to normal credentials, the workflow and security problem remain unresolved.
