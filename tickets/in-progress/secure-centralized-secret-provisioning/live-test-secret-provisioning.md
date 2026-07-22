# Live-Test Secret Provisioning Specification

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/live-test-secret-provisioning.md`
- Purpose: define hidden-input and explicit source-file provisioning of the physically separate host real-E2E Store, tracked non-secret test contract, per-worktree zero-copy flow, real execution modes including exact Vertex Express LLM/media behavior and preserved dual-key Gemini metadata behavior, managed Claude SDK, preserved AutoByteus remote behavior, and external Codex regression evidence, failure semantics, security boundary, and non-impact on existing Docker deployment.
- Scope: REQ-002–REQ-005, REQ-008, REQ-009, REQ-012, REQ-016–REQ-020 / AC-003, AC-004, AC-006, AC-010, AC-012, AC-013, AC-015, AC-016, AC-018–AC-020.
- Status: `Refined — Original Gemini Metadata Preservation Reconciliation; Architecture Re-review Required`.
- Approval applicability: `Required`; the importer/no-automatic-update workflow remains approved, external Codex preservation is user-approved, and the user confirms the original dual-key Generative Language metadata path works. CR-021 changes the evidence contract only: retain exact LLM/media SDK modes and verify metadata's separate selected-consumer/request/mapping/fallback behavior without source redesign.
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
one-time hidden-input setup or explicit operator import provisions real-e2e-secret-store.db with its independent key
 -> Git supplies non-secret scenario/Store configuration to every worktree
 -> test command constructs the Local backend in Agent Server
 -> backend opens the real-E2E Store read-only and validates its format
 -> value-free preflight verifies required logical IDs
 -> trusted test/server boundary resolves only scenario-declared credentials
 -> real provider is exercised
```

No person copies a secret file or re-enters credentials merely because a worktree was created. The optional importer is an explicit one-time setup action against an operator-selected source; it is never part of per-worktree execution.

Startup performs no legacy credential import, copy, scrub, delete, rewrite, conversion, or Store write; legacy sources remain untouched/non-authoritative. This is not an E2E setup path. Real-E2E custody is populated only by hidden input or the explicit importer selected by the operator.

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
    },
    "autobyteus.remote-llm": {
      "mode": "REAL_DIRECT_SECRET",
      "requiredSecrets": ["provider.autobyteus.api-key"],
      "hosts": ["configured-non-secret-host"],
      "expectedCapabilities": ["llm-discovery", "llm-invocation"]
    },
    "autobyteus.remote-audio": {
      "mode": "REAL_DIRECT_SECRET",
      "requiredSecrets": ["provider.autobyteus.api-key"],
      "hosts": ["configured-non-secret-host"],
      "expectedCapabilities": ["audio-discovery", "audio-generation"]
    },
    "autobyteus.remote-image": {
      "mode": "REAL_DIRECT_SECRET",
      "requiredSecrets": ["provider.autobyteus.api-key"],
      "hosts": ["configured-non-secret-host"],
      "expectedCapabilities": ["image-discovery", "image-generation"]
    }
  }
}
```

Allowed tracked content:

- schema version, backend kind, canonical Store filenames, and read-only access mode;
- scenario IDs/modes and logical secret definition IDs;
- non-secret models, timeouts, feature flags, expected capabilities, and explicit runtime mode such as `managed-secret`;
- non-secret server/test ports and URLs, including AutoByteus remote hosts.

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

Stores do not inherit. A missing real-E2E credential fails preflight even if the default Store contains it. Hidden-input setup is constructed with the writable E2E target only and accepts dedicated test credentials directly through transient input. It has no source/default backend dependency, read path, copy command, or automatic inheritance. The separate explicit importer may read one verified absolute plaintext source but writes only the selected E2E Store and never opens the default Store. Both choices preserve the same physical boundary.

## Local Developer Workflow

### One-time machine setup — hidden input

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

The setup definition set includes `provider.autobyteus.api-key` when any AutoByteus remote scenario is enabled. It is provisioned once, directly into the E2E Store, exactly like other provider definitions. The setup command never writes `AUTOBYTEUS_API_KEY` into `.env`, `.env.test`, process-wide environment, or tracked configuration.

### One-time machine setup — explicit source importer

An operator who already has approved credentials in one privately owned file may use the committed command instead of re-entering each value:

```text
pnpm secrets:local:import -- --source /absolute/path/to/server-data/.env --target e2e --dry-run
pnpm secrets:local:import -- --source /absolute/path/to/copied-test-api-keys --target e2e --dry-run
pnpm secrets:local:import -- --source /absolute/path/to/copied-test-api-keys --target e2e
pnpm secrets:local:import -- --source /absolute/path/to/copied-test-api-keys --target e2e --overwrite
```

The current application `.env` preview is the approved ordinary journey. The CLI accepts its documented single leading PNPM separator (and the equivalent direct-option form), performs source trust/file-safety, recognize-first alias selection, empty-as-absent normalization, populated selected-value/catalog, E2E Store target-status, and current-definition checks, then prints only logical IDs, planned actions, and counts. It never prompts, initializes, or writes. If both E2E pair files are absent it reports `INITIALIZATION_REQUIRED`; the confirmed command stage-initializes only that selected pair, creates missing selected records, and skips configured records. A one-file partial pair remains `CORRUPT`. `--overwrite` is the only replacement form. Every write requires a direct TTY and exact `IMPORT REAL-E2E STORE`; no noninteractive bypass exists.

The source path must be absolute, but any filename or extension is accepted so the current application `.env`, renamed/copied files, and extensionless files work. The command never searches the repository, a parent, or another checkout. It rejects symlink/non-regular/raced/wrong-owner/non-private files, files over 1 MiB, and invalid UTF-8/NUL. It then recognizes exact current aliases before parsing assignments. Recognized lines must use the supported static same-line grammar. After unquoting and outer-horizontal-whitespace normalization, an empty recognized assignment is absent/non-selected: it creates no credential, plan/output metadata, warning, count, or failure and does not enter duplicate tracking. Only populated selected aliases are checked for dynamic content and duplicate populated occurrences. Every unrecognized line is ignored without right-hand-side interpretation. Therefore an empty `GEMINI_API_KEY` does not block populated `VERTEX_AI_API_KEY` or other current credentials, while `DATABASE_URL`, `OLLAMA_API_KEY`, `GOOGLE_CSE_API_KEY`, legacy `ZHIPU_API_KEY`, Claude delivery aliases, unknown secret-like names, arbitrary text, and malformed unrelated lines do not block the import and are not reported by name. One positive registry translates current aliases to definition IDs. For Qwen, only `DASHSCOPE_API_KEY` is mapped; `QWEN_API_KEY` and ZHIPU are unrecognized/non-blocking. A source with zero populated selected mapped credentials returns `IMPORT_NO_MAPPED_CREDENTIALS` before target access or mutation.

The importer never mutates/deletes the source, uses shell evaluation, assigns values to `process.env`, creates a plaintext intermediate, accepts a Store/definition/value path in argv, or opens the default Store. All planned creates/replacements commit in one E2E SQLite transaction or none. Output is restricted to target status, logical IDs, action counts, and stable instruction/error codes; ignored-line metadata and values are absent. Selected values necessarily exist transiently in the trusted process; buffers/references are minimized/cleaned best-effort, but JavaScript/runtime zeroization is not claimed. Hidden-input provisioning remains available.

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
serper.search: MISSING (use hidden-input setup or explicit e2e import; no value shown)
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

### Gemini metadata preservation harness

- LLM/media constructor capture separately drives all three closed authentication variants through `gemini-helper.ts` and asserts exactly `{ apiKey }`, `{ vertexai: true, apiKey }`, or `{ vertexai: true, project, location }` with no optional/extra mode fields;
- metadata tests start at `ModelCatalogService.listLlmModels` and reload, prove the exact `llmMetadata/GEMINI/<slot>` consumer for AI Studio/Vertex Express, and prove zero secret resolution/no live provider for Vertex Project;
- provider tests preserve the existing Generative Language request and response mapping for either selected key; resolver tests prove live-over-curated precedence, timeout/failure containment, and cache invalidation without a real credential;
- negative tests prove no ambient alias lookup, alternate-definition/Store lookup, credential-presence inference, endpoint override, or cross-mode retry;
- a real key-backed metadata scenario may begin at the ordinary GraphQL/web model-list or reload surface and verify that a live-returned field reaches the catalog. If provider loading is unavailable, curated-only availability is the existing product fallback and is reported accurately rather than treated as proof of a different SDK mode. No metadata SDK-construction rewrite is required by this harness.

### External Codex preservation harness

- uses the normal user-selectable Codex App Server product path, never a new AutoByteus auth mode or Store definition;
- deterministic spawn capture proves `CodexAppServerClient` preserves `options.env ?? process.env` and real HOME/CODEX_HOME, removes the ticket-added synthetic-home builder, and makes zero management/Store/account-RPC calls;
- synthetic HOME/CODEX_HOME/account sentinels are used for durable source tests. They inspect no real Codex auth file and assert no environment dump/output;
- when Codex is installed and its existing external login is available, a targeted product-path model/turn smoke validates that the preserved path still authenticates. If the runtime is declared available but the established operation fails, the scenario fails with existing sanitized output; no Store/API-key fallback or account login mutation is attempted;
- the harness and assurance report explicitly exclude Codex environment inheritance from `LOCAL_HARDENED`. Generic output redaction still applies.

### Managed Claude Agent SDK harness

- tracked configuration selects `runtimeAuthMode: "managed-secret"`; no raw key or alias is tracked;
- the Store-bound server invokes the normal `ClaudeSdkClient`; that client calls its injected `ClaudeRuntimeAuthenticationService`, which resolves the exact `agentRuntime/claude_agent_sdk/apiKey` consumer through `SecretManagementService` immediately before model-discovery/run child construction;
- the runner, browser, parent server environment, sibling processes, and AutoByteus-owned tool children never receive the key;
- `ClaudeSdkClient` supplies exactly `ANTHROPIC_API_KEY` to the exact Claude Code child through SDK `env`, with empty setting sources, `tools: []`, and strict explicitly materialized AutoByteus MCP configuration;
- a real provider authentication plus one bounded Claude SDK request proves the actual Store-to-SDK-child path; missing declared real-E2E credential/capability is reported as explicit unavailable/failure and is never counted as pass or silently replaced with a fake;
- a synthetic spawn-capture test separately verifies the exact environment shape and parent/sibling/tool-child noninheritance without printing the value;
- diagnostics are redacted before buffering; scanner coverage includes prompts, messages, tool I/O, stderr, session events, logs, reports, and artifacts;
- cleanup drops AutoByteus references and closes/aborts the SDK query, without claiming deterministic deletion from the authorized child or SDK memory.

### AutoByteus remote gateway direct-secret harness

- tracked configuration supplies only non-secret hosts, expected capabilities, and `provider.autobyteus.api-key` as the required logical definition;
- the Store-bound server follows the normal `AutobyteusRemoteModelDiscoveryService` path; the runner/browser receives neither the value nor a raw resolver;
- with no configured hosts, a synthetic/product integration check proves zero management/backend calls, authoritative clear of only the matching AutoByteus runtime subset, and preservation of native/unrelated catalogs;
- with configured hosts, the service resolves the exact model-kind discovery consumer and performs real LLM/audio/image discovery through the current AutoByteus remote provider/factory;
- discovered targets must carry `credentialProviderId: "AUTOBYTEUS"`; a representative real LLM invocation and each advertised audio/image generation capability must traverse the generic construction path and resolve the same Store definition;
- registry assertions prove replacement is scoped by model kind plus AutoByteus runtime ownership, including native same-provider coexistence, authoritative empty clear, last-known-good preservation on transient pre-authoritative failure, and all-AutoByteus-subset clear without lookup after explicit credential removal;
- capability absence must be explicit in the tracked scenario or authoritative server response. A declared/advertised capability that cannot be discovered or invoked is a failure, not a skip or pass;
- no server/test code reads `AUTOBYTEUS_API_KEY`, and safe synthetic leak controls cover request headers, logs, errors, catalog metadata, browser responses, reports, and artifacts.

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
| live Gemini model metadata list/reload for AI Studio or Vertex Express | `REAL_DIRECT_SECRET` for key modes; curated-only for Vertex Project | proves exact metadata consumer selection and the established Generative Language provider/mapping; curated fallback is reported separately and never causes another credential lookup |
| media formats/generation | real mode | fake bytes do not prove provider behavior |
| Gemini Vertex Express LLM/audio/image construction and representative operations, plus separately preserved metadata list/reload | `REAL_DIRECT_SECRET` | validates exact `geminiVertexExpress` propagation and `GoogleGenAI({vertexai:true,apiKey})` for LLM/media; metadata independently validates its exact semantic consumer and established Generative Language path without being forced through that SDK-mode union |
| Codex external-login product turn when installed/account-ready | existing external Codex state, no Store secret | proves the pre-ticket environment/home preservation without inventing an AutoByteus auth lifecycle |
| live search | real mode | real service/schema behavior |
| Claude Agent SDK managed authentication and one bounded request | `REAL_DIRECT_SECRET` with `runtimeAuthMode: managed-secret` | validates exact consumer authorization, Store resolution, child environment delivery, and current SDK/CLI authentication |
| AutoByteus remote LLM discovery plus representative invocation | `REAL_DIRECT_SECRET` | validates host gate, discovery consumer, Store-backed AutoByteus credential ownership, scoped catalog update, and real construction/request |
| AutoByteus remote audio discovery plus generation when advertised | `REAL_DIRECT_SECRET` | validates the current audio gateway contract and real artifact production; declared capability unavailability is not a fake-success path |
| AutoByteus remote image discovery plus generation when advertised | `REAL_DIRECT_SECRET` | validates the current image gateway contract and real artifact production; declared capability unavailability is not a fake-success path |
| isolation, denial, and canary absence | `SYNTHETIC`, plus selected real checks | safe exact negative assertions |

The downstream coverage owner decides the precise durable test inventory after implementation, but may not remove the semantic real-provider intent defined here.

## Failure Semantics

| Condition | Required Result |
| --- | --- |
| tracked config missing/invalid | fail with file/schema location; never search another checkout |
| import source/target option missing, duplicated, relative, unknown, or invalid; repeated/misplaced separator | fail value-free before source value handling; never infer source/target; zero/one leading separator succeeds |
| import source is symlink/non-regular/raced/wrong-owner/non-private/unverifiable | fail closed without changing permissions/ACLs or target Store |
| import source is oversize/invalid UTF-8/NUL | reject the entire operation before recognition/prompt/write |
| recognized assignment is valid but normalizes empty | treat as absent/non-selected; continue with populated current credentials; emit no placeholder metadata/warning |
| recognized assignment is malformed, has a dynamic populated value, or repeats a populated occurrence | reject before target mutation; never emit line/name/value |
| source contains unrelated settings, unknown/legacy/secret-like names, or malformed unrelated lines | ignore without interpreting their right-hand side; report no ignored-line metadata; continue if at least one recognized credential is populated and valid |
| every recognized assignment is absent or normalizes empty | fail value-free with `IMPORT_NO_MAPPED_CREDENTIALS` before target access or mutation |
| import target configured and no `--overwrite` | skip record and preserve it; dry-run may report replacement requires overwrite |
| import write is non-TTY, unconfirmed, cancelled, or transaction fails | write nothing or roll back all planned records; source and other Store unchanged |
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
| AutoByteus host list absent | discovery performs zero management/backend/provider calls and clears only the matching AutoByteus runtime subset; no remote scenario may report pass unless it explicitly tests this no-host contract |
| AutoByteus credential explicitly removed | idempotent lifecycle success clears every AutoByteus runtime subset without discovery lookup and preserves native models |
| AutoByteus definition missing or Store non-ready | configured-host discovery/invocation fails value-free; preserves last-known-good remote subset and never reads `AUTOBYTEUS_API_KEY` or another Store |
| AutoByteus remote discovery/provider auth fails before authoritative response | preserve last-known-good matching runtime subset, keep native models, fail the declared scenario, redact provider details |
| AutoByteus remote discovery returns authoritative empty | clear only matching model-kind AutoByteus runtime subset; a scenario requiring that capability fails unavailable |
| AutoByteus advertises LLM/audio/image capability but representative operation fails | fail the exact scenario; do not skip, downgrade to synthetic, or count discovery alone as pass |
| quota/model/provider issue | fail or classify via existing provider rules; never reinterpret as “secret missing” |
| Codex external runtime is installed/selected but existing login state is hidden by a synthetic home or the product turn fails authentication | fail the Codex preservation scenario with existing sanitized outcome; do not call Store/account RPC, mutate login, or fall back |
| Gemini mode/input is invalid or the exact Vertex Express product construction uses AI Studio options | fail before construction or fail the exact real scenario; never infer another mode/key and never count the corrected-mode diagnostic as a product pass |
| Gemini live metadata request fails but curated metadata still returns | report the exact live-enrichment scenario unavailable/failed while retaining the ordinary curated catalog result; do not count curated fields as proof of exact-mode authentication and do not retry another Google mode |
| result/log/artifact canary hit | fail the run and restrict evidence; never attach the raw hit |

## Preserved Current API/E2E State At Revision Time

- Round 10 confirmed the explicit current-application importer: the dedicated Store remained `READY`, eight recognized credentials were newly configured, the previously configured OpenAI record was preserved, the source remained byte-identical, and empty `GEMINI_API_KEY` was absent/non-blocking while populated `VERTEX_AI_API_KEY` was imported. No credential value was emitted or inspected.
- Canonical preflight passed 11/11: ten tracked scenarios were `READY/CONFIGURED`; Serper alone was `READY/MISSING`.
- Real OpenAI LLM, agent-flow, audio, and image all passed. Real Anthropic managed-secret Claude Agent SDK passed.
- Real Gemini Vertex Express audio/image failed on the normal product path because the correct definition was collapsed to generic `apiKey`; a bounded value-safe same-credential diagnostic using `GoogleGenAI({vertexai:true,apiKey})` passed both. This proves the LLM/media correction direction but is not a product-path pass. Metadata does not share that SDK-construction contract: its original/current dual-key Generative Language path is preserved and verified separately.
- AutoByteus remote LLM/audio/image were `READY/CONFIGURED` but the declared `https://api.autobyteus.com` endpoint was not DNS-resolvable. AC-019(f) permits exact unavailable reporting. No alternate endpoint may be invented and no remote capability is claimed.
- Codex remains an established external-login runtime, and the user explicitly directed that it be left alone. The next matrix must prove the restored product path without reading real auth files or adding managed custody.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck dependency only. Both Claude modes remain unchanged. `LOCAL_HARDENED` retains its explicit Codex exclusion and deferred `STRONG_AGENT_ISOLATION`.

## Security Checks

1. Fresh worktree `git status` shows no copied secret file, Local Store data, or encryption-key material.
2. Governed test/agent child environments contain no provider key or backend bootstrap material, except the exact Claude Code child in explicit managed mode contains only its authorized `ANTHROPIC_API_KEY`. Codex is the explicit external-runtime exclusion and is not asserted here.
3. Agent file tools cannot reach Local Store paths and governed child environments/descriptors start from explicit empty-base allowlists. The managed Claude parent, siblings, unrelated governed children, and AutoByteus tool children receive no key. Codex preserves the pre-ticket external environment/home and is excluded. This proves `LOCAL_HARDENED` only within the stated boundary, not denial against Codex inherited state, the authorized Claude process, or arbitrary same-user filesystem/process access.
4. Browser/GraphQL cannot invoke raw resolve, enumerate values, select another Store, or supply Store paths.
5. Direct harness can resolve only declared scenario definitions and only during the run.
6. Gateway cannot attach credentials to caller-supplied destinations.
7. Logs, errors, traces, snapshots, and artifacts contain neither raw nor expected encoded synthetic canaries.
8. Cleanup closes backend/database handles and revokes/cleans ephemeral CI capabilities without value output.
9. A missing real-E2E value never opens or falls back to the default Store, `.env.test`, `.env`, or `process.env`.
10. Local CRUD tests receive a separate temporary writable pair; neither shared host Store is mutated.
11. Existing Docker Compose/launcher/volume configuration is unchanged by this test design.
12. Repository/team workflow runs implementation source review before `REAL_DIRECT_SECRET`; the product does not pretend to prove source trust through a new runtime flag.
13. Exact Gemini tests prove all three closed variants and exact SDK options for LLM/media. Separate metadata tests prove exact AI Studio/Vertex Express semantic consumers, trusted reveal into the existing provider, preserved Generative Language request/response mapping, Vertex Project zero lookup/no live provider, reload invalidation, curated fallback, and no ambient/alternate-definition fallback. Real scenarios use normal product paths and do not require a metadata SDK-mode rewrite.
14. Codex tests use synthetic state for durable launch assertions and, when available, the existing external product login for a bounded turn; they never read auth files, dump inherited environment, call Store/account RPC, or claim the environment is hardened.
13. Empty-Store pair verification proves correct pair `READY`, swapped key/partial pair/verifier tamper `CORRUPT`, and unsupported format `INCOMPATIBLE` without writing or regenerating.
14. Claude CLI-mode tests make zero management calls; managed-mode synthetic capture proves one resolve per child, no caller `env`, exact child-only alias delivery, empty settings/strict MCP/safe tools, and no fallback for the complete failure matrix.
15. A real managed-Claude scenario authenticates and completes a bounded SDK request from the read-only real-E2E Store; evidence passes structural redaction checks without reading/exporting the real value. Separate synthetic exact/encoded-canary scans include a seeded negative leak proving the scanner fails correctly.
16. AutoByteus remote tests prove no-host zero resolution/model-kind scoped clear, exact discovery/construction bindings, runtime-scoped catalog replacement, explicit-removal all-subset clear, native same-provider coexistence, and `credentialProviderId = AUTOBYTEUS` without serializing authentication.
17. Real AutoByteus LLM/audio/image scenarios use the read-only E2E Store and real hosts; each advertised capability completes a representative operation or reports an explicit failure. Evidence and child/process environments contain no `AUTOBYTEUS_API_KEY` value or fallback alias.
18. Legacy-source non-authority tests prove canonical application `.env` and parent aliases remain unchanged; `AUTOBYTEUS_API_KEY` and every sensitive alias are excluded before value retention while approved non-secret hosts remain usable; custom-provider-v1 remains byte-unchanged and returns only stable value-free guidance; and normal runtime never dual-reads or falls back.
19. Importer deterministic tests use synthetic canaries and constructor-injected temporary target resolver/Stores to prove zero/one leading separator, absolute-source/closed-target options, non-mutating source trust checks, file safety, recognize-first positive selection, selected-only validation, full current alias registry, exact Qwen `DASHSCOPE_API_KEY` mapping plus deliberate `QWEN_API_KEY` and ZHIPU absence, dry-run, selected-pair initialization, skip/no-overwrite, explicit replacement, both target-specific TTY phrases, cancellation, changed-plan rejection, atomic rollback/idempotency, source immutability, and other-Store non-access. Mixed fixtures include unrelated settings, unknown secret-like names, malformed unrelated lines, and legacy aliases that remain non-blocking. No CLI/environment path override exists and canonical host Stores are never opened by these tests.
20. Selected-value canaries and unrecognized-line canaries do not appear in argv, environment, stdout/stderr, logs, exceptions, snapshots, reports, evidence, or source copies; ignored-line metadata is absent, and a seeded negative leak control demonstrates the scanner fails correctly.
21. The real test runner never invokes the importer. After an operator import, it uses only normal value-free preflight/read-only product execution. Default-target import validation is a separate operator/status/restart check and never participates in host real-E2E execution.
22. Legacy-source negative tests prove startup performs no Local Store/importer operation and no source or parent-environment mutation, while explicit-import tests prove one selected target only and no test-runner/startup invocation.

## Why This Improves The Agent-Driven Workflow

The improvement comes from four properties together:

1. **one-time machine custody** — real values are provisioned once outside all checkouts, either through hidden input or an explicit operator import;
2. **physically separate E2E custody** — every worktree selects the same real-E2E database/key pair through tracked config while the default Store stays unavailable;
3. **in-process lifecycle** — Electron and test servers construct the Local backend directly, without another service or user action;
4. **explicit resolution** — trusted test/server code receives only the declared credential instead of broad ambient environment state.

If a consumer still reads `process.env`, a test still copies an ignored file, or a missing host test value falls back to normal credentials, the workflow and security problem remain unresolved.
