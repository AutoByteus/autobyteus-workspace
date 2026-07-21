# Threat Model And Secret-Provisioning Option Analysis

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/threat-model-and-option-analysis.md`
- Purpose: retain security evidence, trust boundaries, assurance limits, custody/test/deployment option analysis, and rejected shortcuts.
- Scope: REQ-002–REQ-005, REQ-008, REQ-009, REQ-012–REQ-019 / AC-002–AC-006, AC-009–AC-019.
- Status: `User Approved — CR-001 AutoByteus Remote Gateway Preservation; Architecture Re-review Required`.
- Approval applicability: `Required` for stated security guarantees and exclusions; current-state evidence is approval `N/A`.
- Core artifacts supported: [requirements.md](./requirements.md), [investigation-notes.md](./investigation-notes.md), [design-spec.md](./design-spec.md).
- Related supplements: [use-case-spine-validation.md](./use-case-spine-validation.md), [secret-storage-architecture.md](./secret-storage-architecture.md), [secret-storage-backend-contract.md](./secret-storage-backend-contract.md), [credential-consumer-mapping.md](./credential-consumer-mapping.md), [live-test-secret-provisioning.md](./live-test-secret-provisioning.md).

## Executive Finding

The current leak risk is not only “keys are in dotenv.” It is the combination of:

1. plaintext or broadly loaded custody;
2. ambient resolution by many consumers;
3. inherited parent environments and broad filesystem/process capability;
4. ignored per-checkout test bootstrap;
5. no server-owned lifecycle/resolution boundary.

Moving a value from `.env` to an encrypted file helps accidental exposure, but it does not protect against an unrestricted same-user shell that can read the encrypted database **and** its key file or inspect a trusted process. The architecture therefore pairs centralized custody with explicit consumer construction, narrow process environments, file/process isolation, and honest assurance levels.

The proposed first-delivery design is an in-process cross-platform `LocalSecretStorageBackend`. Each normal server owns an encrypted default Store below its configured data directory; host real-E2E uses a physically separate database and independent key. It is a simplified local vault implemented independently of Electron/OS keychains and without a daemon/IPC protocol. It solves the host-worktree and local/Electron workflow while allowing ordinary Docker to persist its node-local Store in the existing server-data volume with no Compose/launcher change. The first delivery registers only Local in product bootstrap and InMemory in tests. Vault, AWS, Kubernetes, and company adapters remain future extensions; an unknown kind fails closed rather than falling back.

Claude Agent SDK is the deliberate exception to a blanket “no agent child ever receives a key” statement. Default `cli` remains external and secret-free. Explicit `managed-secret` makes the exact Claude Code child an authorized consumer of one Anthropic credential. The architecture removes ambient selection, parent/sibling/tool-child inheritance, built-in tools/settings propagation, and raw diagnostics, but it does not claim secrecy from that authorized executable/SDK.

The supported AutoByteus remote gateway is not removed to obtain the security improvement. Its LLM/audio/image discovery and construction remain, but the gateway API key moves from ambient `AUTOBYTEUS_API_KEY` custody to one Store definition with exact discovery/construction consumers. A model's displayed provider is no longer overloaded as credential ownership; explicit non-secret `credentialProviderId` prevents resolving a native-provider credential for a request that actually authenticates to AutoByteus.

## Confirmed Deployment Reality

| Deployment Shape | Current Reality | Security Consequence | Target Posture |
| --- | --- | --- | --- |
| Electron | client launches embedded server and supplies parent environment | Electron process/env is not a safe global custody boundary | embedded server constructs in-process Local backend against canonical default Store; no Store UI/process is required |
| Direct web/server | server runs without Electron | OS-specific Electron storage cannot be canonical | same backend contract; Local Store or enterprise adapter |
| Local development/worktree tests | ignored `.env.test` historically copied and loaded globally | workflow friction and broad key exposure | tracked non-secret config selects one machine-global physical real-E2E Store |
| Docker | server and agent execution can share one image/process/container trust zone; current Compose already persists `/home/autobyteus/data` in a named volume | same-container code may reach node-local custody; encrypted DB and key in one volume remain lower assurance | treat the container as one independent Local node; keep Compose/launcher/volumes unchanged; derive the normal Store below existing data dir; do not claim strong isolation |
| Kubernetes | Secrets may be mounted or injected; service-account identity may be available to Pod | same-container agent can reach mount/env/token; shared writable SQLite is not a replica-safe custody design | first delivery supports one server Pod with its own Local PVC; multiple replicas remain unavailable until an appropriate future centralized adapter is installed |
| Company-managed infrastructure | external Vault/cloud/Kubernetes policy often owns provisioning | AutoByteus UI cannot assume write authority | company may implement/register an explicit backend later; first delivery rejects unregistered configuration value-free |

## Assets

- provider API keys/tokens and custom-provider credentials;
- the AutoByteus remote gateway API key and its LLM/audio/image catalog integrity;
- default Local Store encrypted database and independent key;
- real-E2E Local Store encrypted database and independent key;
- Vault/cloud/Kubernetes workload identity and mounted credentials;
- trusted provider SDK/client process memory;
- non-secret but security-sensitive backend configuration;
- audit/status integrity and migration ledger;
- real-test evidence and artifacts.

## Trust Boundaries

| Boundary | Trusted Responsibility | Untrusted / Less-Trusted Side | Required Control |
| --- | --- | --- | --- |
| Browser/Electron renderer -> server | subject-specific lifecycle/status | caller input and browser state | write-only value transport, no readback/raw resolve |
| Server service -> backend | catalog policy and exact-address operation | adapter/vendor/storage failures | typed port, normalized redacted errors, no fallback |
| SecretManagementService -> in-process Local backend | exact definition operations in one bootstrap-bound Store | database/key details and alternate Store | narrow backend port, no caller path/Store selector, database handle encapsulation |
| Consumer provisioning -> LLM/client | semantic auth delivery | serializable config and provider request data | ephemeral construction context, reveal only at SDK boundary |
| AutoByteus remote discovery -> registries/provider | one gateway credential plus non-secret hosts and scoped catalog results | remote provider response, displayed model provider, shared registries | exact discovery consumer, JIT resolution, explicit credential owner, runtime/model-kind scoped replacement, redaction |
| Claude runtime authentication -> exact Claude Code child | one catalog-authorized Anthropic credential in managed mode | agentic child, its tools/settings, sibling/descendant processes, diagnostics | JIT resolve, exact empty-base child env, managed safe-tool/settings policy, early redaction, no fallback; recipient explicitly trusted |
| Trusted server -> other agent runtime | bounded work request/result | file/shell/PTY/MCP/Codex/Claude-controlled execution | explicit env allowlist plus process/filesystem/network isolation |
| Test manifest -> machine custody | logical requirements and canonical Store selection only | agent-visible Git/worktree | no value/database/key bytes in tracked files |
| Kubernetes control -> trusted Pod | backend config/identity/mount | agent worker/container | dedicated workload boundary and least privilege |

## Threat Actors And Capabilities

### T1 — Accidental model/tool behavior

An agent reads files, enumerates environment variables, or includes terminal/log output in a conversation without malicious intent.

### T2 — Prompt-injected or deliberately probing agent

An agent intentionally searches paths, environment, process state, Store files, or metadata endpoints using its granted tools.

### T3 — Network caller with node reachability

A caller attempts generic secret operations, value readback, arbitrary paths, status enumeration, or backend reconfiguration through server transports.

### T4 — Compromised or over-privileged server/control process

This actor can resolve secrets or inspect trusted SDK memory. It is outside the non-disclosure guarantee; blast radius is reduced by scope, workload identity, and provider-side permissions.

### T5 — Other same-user or same-container process

Without OS/process separation, it may read a Local Store database and its key, inspect processes, or access mounts. Local encryption alone is not a defense against this actor.

### T6 — Infrastructure/operator credential compromise

A compromised Local Store key, Vault/cloud workload identity, Kubernetes control-plane permission, or deployment operator can access custody. This is mitigated by least privilege, physically separate Stores/namespaces, audit, rotation, and infrastructure policy, not an application login model.

### T7 — Unreviewed code executed with real credentials

Branch/test code that runs in the trusted direct-secret boundary can exfiltrate the value. Real direct-secret execution therefore occurs only after implementation source review and uses limited declared scenarios/definitions; no new runtime attestation mechanism is claimed.

## Confirmed Current Attack Paths

| ID | Current Path | Consequence |
| --- | --- | --- |
| `AP-001` | agent file tools can receive broad/absolute paths -> read repository/application `.env` | secret enters tool output/conversation |
| `AP-002` | dotenv loads keys -> shared `process.env` -> shell/PTY/tool enumerates environment | broad discovery and inheritance |
| `AP-003` | parent environment -> Codex/Claude/MCP/background/browser/application worker child | supported external/application runtime receives unrelated provider keys |
| `AP-004` | custom-provider JSON -> plaintext `apiKey` -> endpoint model | durable plaintext outside central lifecycle |
| `AP-005` | ignored `.env.test` -> copied across checkouts/worktrees -> global test setup | proliferation plus human workflow dependency |
| `AP-006` | generic error/log/snapshot/config serialization | accidental value capture |
| `AP-007` | secret mount/workload identity in all-in-one container -> unrestricted agent shell | centrally provisioned secret remains reachable |
| `AP-008` | frontend-public runtime configuration | any browser client can receive key |
| `AP-009` | broad backend identity/namespace -> one node resolves unrelated values | excessive blast radius |
| `AP-010` | Local database is empty -> wrong/swapped key appears usable because no record decryption occurs | a mismatched Store/key pair is accepted until a later write/read, undermining custody integrity |
| `AP-011` | Claude raw `api-key`/`auto` path -> copied parent environment/API-key aliases -> agentic Claude runtime | unrelated ambient state and Anthropic key enter an agent-controlled runtime without explicit consumer authorization |
| `AP-012` | explicit managed Claude child -> built-in shell/settings/hooks/plugins/external MCP or raw diagnostic buffer -> child/descendant reads or emits its authorized environment | intentionally delivered key can propagate into tool output, conversation, logs, or sibling/descendant processes unless the managed launch surface is constrained |
| `AP-013` | `AUTOBYTEUS_API_KEY` remains ambient or is restored as fallback -> server/tests/children inherit gateway key | centralized custody is bypassed and the original leak path remains |
| `AP-014` | AutoByteus-discovered model displays `OPENAI`/`GEMINI` -> construction infers credential owner from display provider -> wrong Store definition is resolved | credential crosses the wrong authorization binding or valid remote behavior breaks |
| `AP-015` | gateway refresh replaces an entire displayed-provider catalog instead of the AutoByteus runtime subset | native same-provider models disappear; pre-authoritative failures destructively mutate catalog state |

## Assurance Tiers

| Tier | Claim | Required Controls | Explicit Non-Guarantee |
| --- | --- | --- | --- |
| `LOCAL_HARDENED` **(only first-delivery product tier)** | normal supported agent file-tool/env/descriptor/config/conversation paths do not contain credentials; the exact managed Claude child is the sole explicit authorized environment recipient | central custody, no dotenv/custom JSON values, explicit resolution, redaction, built-in Store-path denial, empty-base child environments/descriptors, and managed Claude settings/tool restrictions | does not hide a credential from its authorized Claude child/SDK or resist arbitrary same-user/same-container filesystem/process inspection |
| `STRONG_AGENT_ISOLATION` **(future, not reportable in first delivery)** | agent-controlled and supported application-worker runtimes lack path, process identity, mount, backend capability, workload identity, and network route needed to obtain secrets | all prior controls plus separate OS/container identity, filesystem/mount separation, sandboxed process launcher, restricted network/metadata, verification | does not resist privileged host/control/provider-process compromise |
| `TRUSTED_DIRECT_CONSUMER` | reviewed process may receive one declared credential to construct the real SDK client | exact definition authorization, last-moment reveal, no env/serialization, review gate, sanitized evidence | recipient code/SDK can observe the value by necessity |
| `TRUSTED_AGENTIC_SECRET_CONSUMER` **(managed Claude classification, not a separately reportable tier)** | one exact Claude Code child may receive one declared credential in its environment | explicit opt-in mode, exact consumer binding, JIT resolve, empty-base exact-child delivery, safe settings/tools, early redaction, no fallback | recipient executable/SDK can inspect/retain/exfiltrate its own key; compromised native code may create unsupported descendants |

First delivery reports `LOCAL_HARDENED` only after its concrete file-tool/environment/descriptor checks and, when managed Claude is enabled, its exact settings/tool/child-delivery controls pass; otherwise agent execution fails closed rather than reporting the tier. It never reports `STRONG_AGENT_ISOLATION`. `TRUSTED_AGENTIC_SECRET_CONSUMER` names the managed-recipient trust grant; it is not a stronger security badge. A future delivery may add strong isolation only with enforceable and verified identity/mount/network isolation. Merely selecting any backend never establishes isolation.

## Custody Option Decision Matrix

| Option | Electron / Local | Worktree Reuse | Enterprise | Same-User Resistance | Complexity | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| ignored `.env` / `.env.test` | easy | poor | poor | none | low | reject |
| raw OS environment | easy | moderate | common but ambient | none inside process tree | low | reject for provider values |
| Electron `safeStorage` / OS keychain | Electron-specific | poor for direct servers | poor | OS-dependent | medium/high cross-platform | reject as canonical design |
| encrypted rows in ordinary application DB | easy | poor because application DB follows worktree/test `DATABASE_URL` | limited | weak | low/medium | reject: couples secrets to app state, reset, migration, and exports |
| **In-process Local backend with separate encrypted default/E2E Stores** | good | excellent through canonical E2E database | optional, not required | weak unless identity/ACL separation; better defense in depth through separate keys/files | medium-low | selected local design |
| same-user Local Store daemon/IPC | good | good | optional | little improvement without separate identity | medium/high | reject for initial design |
| HashiCorp Vault KV v2 | possible but heavy | good | strong fit | strong with workload isolation | high | future adapter candidate; not registered in first delivery |
| AWS/cloud secret manager | cloud-specific | good | strong cloud fit | strong with workload isolation | high | future adapter candidate; not registered in first delivery |
| Kubernetes mounted Secret | container deployment only | CI possible | common | depends entirely on Pod/container boundary | medium | future externally-managed adapter candidate; not registered in first delivery |
| Kubernetes API backend | container deployment only | CI possible | policy-dependent | good only with scoped server service account | medium/high | future adapter candidate; not registered in first delivery |
| envelope-encrypted app database | broad | good | broad | depends on KEK custody and server boundary | high | possible future adapter, not initial local design |

## Local Store Security Posture

The Local Store is an in-process backend because Agent Server already owns resolution and a same-user daemon would add process lifecycle, IPC, and compatibility machinery without establishing meaningful isolation. Multiple host-worktree servers can safely read one prepared read-only E2E SQLite database; normal writable Stores belong to one independent Electron/direct/Docker/single-Pod server-node and persistent-volume domain. Multiple replicas never share that writable SQLite Store. Writable access uses database transactions and bounded lock handling. No general TCP/HTTP listener, socket, named pipe, or multi-node file sharing is introduced.

At-rest design constraints:

1. normal custody is `${serverDataDir}/secret-store/secret-store.db` plus `secret-store.key`; Electron resolves under `~/.autobyteus/server-data`, normal Docker under its existing `/home/autobyteus/data` volume, and host live tests explicitly select physically separate `real-e2e-secret-store.db` plus `real-e2e-secret-store.key` outside worktrees;
2. each Store has an independently random 256-bit root key and random public `store_id`; encryption format 1 uses HKDF-SHA-256 domain separation and AES-256-GCM for both a fixed pair verifier and records; the pair verifier authenticates schema/encryption/verifier versions plus `store_id` before the backend becomes ready, including when there are no records;
3. writes are atomic and crash-safe; SQLite transactions, busy handling, and journal/checkpoint discipline coordinate processes;
4. values are never accepted via command-line argument or ordinary `.env`;
5. database/key permissions are server-local owner-only state; host real tests open only the separate E2E pair read-only;
6. automatic key-file unlock is an explicit security tradeoff: a process with equivalent machine identity/file access may read the Store and key or inspect trusted memory;
7. first delivery reports only `LOCAL_HARDENED`; separate identities/ACLs or container boundaries and scoped workload identity belong to the deferred strong tier.

Each database owns only `store_metadata` and `(definition_id, nonce, ciphertext)` records. There is no profile schema. Ordinary server runtime-data reset must preserve both Stores unless the operator explicitly requests deletion of one exact Store; otherwise nesting them under `server-data` would create a reachable destructive-reset path.

`store_metadata` contains the random `store_id`, format versions, and AES-GCM pair-verifier nonce/ciphertext/tag. Pair-verifier and record keys use different HKDF info domains. Every read-write/read-only open authenticates the verifier before exposing a backend. A swapped key, missing half-pair, missing current verifier, verifier tamper, or authentication failure is `CORRUPT`; an unsupported version is `INCOMPATIBLE`. Initial creation uses restrictive temporary files, fsync, and ordered renames; because two files cannot be committed atomically by one filesystem rename, any crash-produced partial pair fails closed rather than being silently repaired.

Separate host default/E2E databases and keys improve backup/reset isolation, reduce accidental cross-context access, and make compromise of one key insufficient to decrypt the other database. They do not help if the same unrestricted process can read both pairs. No automatic inheritance/fallback is allowed. Docker owns its node-local default Store independently and is not joined to the host E2E arrangement.

## Future Enterprise And Kubernetes Posture

Kubernetes Secret data is commonly supplied to a Pod as a volume or environment variable; base64 representation is not encryption, and cluster RBAC/encryption-at-rest still matter. For AutoByteus:

- never bake a provider key into an image;
- do not inject provider keys through environment variables;
- if using a volume, mount it read-only only into a trusted control/provider container with no unrestricted agent shell;
- prefer a scoped Vault/AWS workload identity held only by that trusted boundary;
- give agent workers no Secret mount, Local Store database/key files, cloud/Vault identity, or service-account token; use `automountServiceAccountToken: false` where the worker does not need it;
- communicate between trusted server and worker through bounded work requests and sanitized results;
- treat the present all-in-one container topology as accidental-leak tier until separation is actually enforced and verified.

These are extension requirements, not first-delivery product claims. A future backend configuration may be selected through startup/deployment configuration and an appropriate non-secret Settings surface. Infrastructure bootstrap identity remains deployment-owned. The future adapter must declare whether AutoByteus may write it; the UI must not pretend an externally managed Kubernetes mount is writable. Until such an adapter is implemented and registered, an enterprise kind returns `SECRET_BACKEND_KIND_NOT_INSTALLED` without fallback.

## Claude Runtime Cutover Decision

Native `AnthropicLLM` and metadata clients remain reviewed SDK-construction consumers. The user also selected the Claude Agent SDK as an explicit managed consumer, accepting that the authorized agentic child can observe its own credential. The clean target therefore distinguishes intent rather than pretending the risk disappears:

- `cli` is default, external account auth, performs no secret lookup, and receives no ambient Anthropic key;
- `managed-secret` is explicit, maps the exact `agentRuntime/claude_agent_sdk/apiKey` identity to the existing `provider.anthropic.api-key`, resolves just in time, and supplies only `ANTHROPIC_API_KEY` to the exact Claude Code child;
- legacy `auto`, legacy `api-key`, unknown modes, and ambient aliases never select/fallback and fail before spawn where invalid;
- neither mode spreads or mutates parent environment or accepts caller `env`;
- managed mode loads no user/project/local settings/hooks/plugins/API-key helper/external MCP, passes `tools: []`, and uses strict explicitly materialized AutoByteus MCP only; AutoByteus-owned tool children use sanitized environments;
- diagnostic text is redacted before buffering and before outward formatting;
- missing/non-ready custody, invalid binding, spawn, and provider-auth failures never change mode/backend or reveal raw diagnostics.

This closes `AP-011` by removing accidental ambient authorization and constrains `AP-012` across supported tools/settings/children. It does not claim protection from the authorized Claude executable/SDK, unsupported native descendants, equivalent-user debuggers/processes, or deterministic memory retention.

## AutoByteus Remote Gateway Custody Decision

The base behavior remains supported; only its secret source changes:

- `provider.autobyteus.api-key` is the one stored definition;
- exact `modelDiscovery/{llm|audio|image}/AUTOBYTEUS/apiKey` and `llm|media/AUTOBYTEUS/apiKey` consumers authorize discovery and construction without arbitrary definition lookup;
- `AUTOBYTEUS_LLM_SERVER_HOSTS` remains non-secret endpoint configuration and an empty list causes zero secret lookup plus authoritative clear of only the matching AutoByteus runtime subset;
- `credentialProviderId = AUTOBYTEUS` is explicit on every discovered target, while displayed provider/model semantics remain available to callers;
- successful discovery replaces only the matching model-kind AutoByteus runtime subset; authoritative empty success clears only that subset, transient pre-authoritative failure preserves last-known-good, and explicit credential removal authoritatively clears every AutoByteus runtime subset without lookup;
- the legacy key alias is migration-owned only and never a normal/fallback runtime source.

This closes `AP-013` and `AP-014` without duplicating one secret into each provider family. Runtime-scoped synchronization addresses `AP-015` and avoids treating feature removal as a security control. Trusted provider code necessarily observes the decrypted key when it constructs the outbound request; that is the same `TRUSTED_DIRECT_CONSUMER` limit as other provider SDKs, not a claim that plaintext never exists in memory.

## Test Provisioning Option Analysis

| Pattern | Real Provider? | Key Visible To General Test Process? | New Worktree Human Step? | Decision |
| --- | --- | --- | --- | --- |
| copy ignored `.env.test` | yes | yes | yes | remove |
| committed key | yes | yes/everywhere | no | forbidden |
| fake endpoint only | no | no | no | retain for deterministic tests, insufficient alone |
| separate real-E2E Store + direct trusted harness | yes | only narrow reviewed boundary | no after one-time setup | required for construction/auth paths; open read-only |
| separate real-E2E Store + trusted gateway | yes | no raw key in general runner | no after one-time setup | preferred for broad real behavior where suitable |
| existing Docker node-local Store in current data volume | potentially, when that node is configured and separately tested | current all-in-one container trust zone | node setup is independent | preserve as deployment behavior; not a prescribed host-E2E sharing pattern |
| CI workload identity + external backend | yes | narrow trusted boundary | no | target CI pattern |

## Non-Solutions / Forbidden Shortcuts

1. Moving dotenv parsing into a global `SecretProvider` while still loading every value into process state.
2. Putting raw credentials in `LLMConfig`, `extraParams`, model metadata, GraphQL output, command arguments, or browser runtime config.
3. Letting an LLM/client resolve its own secret from a server/backend.
4. Falling back from one backend/Store to another or to environment/file plaintext.
5. Treating `cwd` restriction or an environment denylist as process isolation.
6. Mounting a Kubernetes Secret or cloud identity into the same container that exposes an unrestricted agent shell.
7. Storing Local Store key material in Git, `.env.test`, or an agent-authorized path.
8. Designing proprietary cryptography or claiming encrypted storage alone resists equivalent-user processes.
9. Replacing all real-provider tests with fakes.
10. Providing a generic secret read/list API or arbitrary backend-path selector.
11. Introducing an application identity/role system solely to configure this feature; access-control evolution is a separate product concern.
12. Adding a Local Store daemon/IPC layer without a distinct enforceable identity boundary.
13. Placing default and real-E2E records in one profile table when the approved physical-isolation requirement can use independent databases/keys.
14. Shipping a default-to-E2E decrypt/re-encrypt copy command in the first delivery; setup accepts dedicated test credentials directly and cannot open the default Store.
15. Treating `auto`, ambient aliases, or child-detected state as permission to select/fall back between Claude authentication modes.
16. Letting Claude SDK/session/model-catalog callers supply arbitrary `env`, or spreading/mutating parent `process.env` before managed delivery.
17. Delivering a Claude managed key through CLI arguments, settings, session state, files, logs, diagnostics, external MCP configuration, or a built-in process/environment-inspection tool.
18. Claiming that child-environment delivery hides the key from the authorized Claude executable/SDK or that JavaScript deterministically zeroizes it.
19. Removing AutoByteus remote discovery/reload calls or provider wrappers as a shortcut for eliminating `AUTOBYTEUS_API_KEY`; supported functionality must remain while custody changes.
20. Inferring a gateway model's credential definition from its displayed provider instead of its explicit credential owner.
21. Giving LLM/audio/image three independent AutoByteus secret resolvers/discovery coordinators; one typed discovery owner and the generic management boundary are sufficient.
22. Replacing/clearing all models of a displayed provider after an AutoByteus refresh; only the matching AutoByteus runtime/model-kind subset is owned by that refresh.

## External Authority Summary

- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) documents runtime volume/environment delivery and in-memory Secret volume behavior.
- [Kubernetes Secrets good practices](https://kubernetes.io/docs/concepts/security/secrets-good-practices/) documents encryption-at-rest and least-privilege access concerns.
- [Kubernetes service accounts](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/) documents disabling automatic service-account token mounting.
- [HashiCorp Vault KV v2](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2) provides versioned static-secret and check-and-set semantics.
- [Vault Agent](https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent) shows a separate client daemon as an established integration option, not a mandatory AutoByteus shape.
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) confirms the API is Electron main-process and OS-specific, supporting the decision not to make it the cross-platform canonical Local Store.
- [Anthropic's June 15–16 Agent SDK subscription update](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) states that the planned change is paused and current Agent SDK, `claude -p`, and third-party application usage still draw from subscription limits; it explicitly identifies third-party apps authenticating through the Agent SDK.
- [Anthropic Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) and [Claude Code legal/authentication guidance](https://code.claude.com/docs/en/legal-and-compliance) retain contrary API-key/prior-approval language. The package records this as `EXT-ANTHROPIC-AGENT-SDK-AUTH` rather than pretending the conflict is resolved. AutoByteus's local/self-hosted, no-login-broker shape and existing successful CLI path are relevant context but not standalone permission proof.
