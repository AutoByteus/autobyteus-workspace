# Threat Model And Secret-Provisioning Option Analysis

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/threat-model-and-option-analysis.md`
- Purpose: retain security evidence, trust boundaries, assurance limits, custody/test/deployment option analysis, legacy-source non-authority, explicit importer analysis, exact provider-construction controls, external Codex exclusion, dependency query-log policy, and rejected shortcuts.
- Scope: REQ-002–REQ-005, REQ-008, REQ-009, REQ-012–REQ-021 / AC-002–AC-006, AC-009–AC-021.
- Status: `Refined — Original Gemini Metadata Preservation Reconciliation; Architecture Re-review Required`.
- Approval applicability: `Required` for stated guarantees/exclusions; existing custody/importer/no-automatic-update/dependency decisions remain approved, external Codex preservation is user-approved, and the user confirms the original dual-key Generative Language metadata path works. CR-021 corrects the artifacts without extending the LLM/media SDK-mode contract into metadata. Current-state/package evidence is approval `N/A`.
- Core artifacts supported: [requirements.md](./requirements.md), [investigation-notes.md](./investigation-notes.md), [design-spec.md](./design-spec.md).
- Related supplements: [use-case-spine-validation.md](./use-case-spine-validation.md), [secret-storage-architecture.md](./secret-storage-architecture.md), [secret-storage-backend-contract.md](./secret-storage-backend-contract.md), [credential-consumer-mapping.md](./credential-consumer-mapping.md), [live-test-secret-provisioning.md](./live-test-secret-provisioning.md), [repository-prisma-1.0.8-assessment.md](./repository-prisma-1.0.8-assessment.md).

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

Codex App Server is a separate explicit external-runtime exclusion. The user chose to leave its already-working Codex-owned `codex login` behavior alone, so `CodexAppServerClient` preserves the pre-ticket `options.env ?? process.env` and real HOME/CODEX_HOME launch. AutoByteus adds no Store consumer, account RPC, login UI, mode/status/rotation owner, or fallback. The inherited operator environment is consequently outside the `LOCAL_HARDENED` child-environment claim; generic output redaction still applies.

Gemini mode is also a security/correctness attribute, not incidental key presence. The exact shared construction union distinguishes AI Studio, Vertex Express, and Vertex Project so one credential cannot be delivered to the wrong Google SDK mode. LLM, media, and live-metadata provisioning map the explicit mode, and the existing Gemini client-construction boundary exhaustively constructs the exact options without inference or fallback. Curated metadata can preserve catalog availability after a live failure, but cannot act as authentication proof or hide a mode switch in test evidence.

The supported AutoByteus remote gateway is not removed to obtain the security improvement. Its LLM/audio/image discovery and construction remain, but the gateway API key moves from ambient `AUTOBYTEUS_API_KEY` custody to one Store definition with exact discovery/construction consumers. A model's displayed provider is no longer overloaded as credential ownership; explicit non-secret `credentialProviderId` prevents resolving a native-provider credential for a request that actually authenticates to AutoByteus.

The explicit Local importer is a deliberate transition exception, not a return to dotenv runtime custody. A trusted operator points it at one absolute private file; the filename/extension may be anything, including the current application `.env`, a renamed copy, or an extensionless file. Its security boundary is positive and cohesive: after file identity/size/encoding safety, only exact current aliases activate assignment parsing and Store planning. Valid normalized-empty recognized assignments are absent/non-selected and create no credential, plan/output metadata, warning, or failure; only populated selected values receive dynamic/duplicate validation. Every unrecognized line is ignored without right-hand-side interpretation or retained/reported metadata. Qwen maps only from the currently supported `DASHSCOPE_API_KEY`; `QWEN_API_KEY` and legacy ZHIPU are absent from the registry. Selected populated values are encrypted directly into exactly one selected Local Store under no-overwrite/default, target-specific direct-TTY, atomic transaction, and value-free outward-channel controls. The source remains a same-user residual until the operator separately removes/rotates it, and JavaScript cannot prove deterministic zeroization.

For existing installed data, the user selected untouched, non-authoritative legacy sources rather than any automatic credential update. Startup does not import, copy, scrub, delete, rewrite, remove parent aliases, convert custom-provider-v1, create a ledger, or extend the general app-data migration framework. `AppConfig` projects only approved non-secret settings without retaining sensitive assignments; the current custom-provider reader accepts v2 only and returns value-free v1 guidance. Users explicitly provision through UI/Settings or the importer and own legacy cleanup. This avoids a security-critical startup state machine but honestly leaves same-user plaintext residuals until the operator removes or rotates them.

The separately requested `repository_prisma@1.0.8` update adds no custody or runtime consumer. Exact published-package evidence shows that upstream `1.0.8` removes package-owned dotenv loading and defaults query logging to `info|warn|error`, adding `query` only through documented explicit environment or typed opt-in. AutoByteus therefore deletes the obsolete `1.0.6` local patch instead of rebasing or retaining legacy code. Exact lock/provenance, static ESM/CommonJS inspection, isolated zero-acquisition/log-policy probes, and value-free clean-install/build evidence preserve the boundary. Prisma/client, schemas, data, and current production owners remain unchanged.

## Confirmed Deployment Reality

| Deployment Shape | Current Reality | Security Consequence | Target Posture |
| --- | --- | --- | --- |
| Electron | client launches embedded server and supplies parent environment | Electron process/env is not a safe global custody boundary | embedded server constructs in-process Local backend against canonical default Store; no Store UI/process is required |
| Direct web/server | server runs without Electron | OS-specific Electron storage cannot be canonical | same backend contract; Local Store or enterprise adapter |
| Local development/worktree tests | ignored `.env.test` historically copied and loaded globally | workflow friction and broad key exposure | tracked non-secret config selects one machine-global physical real-E2E Store; one-time provisioning uses hidden input or an explicit operator importer, never the test runner |
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
- audit/status integrity and value-free legacy-guidance/import outcomes;
- real-test evidence and artifacts.
- a legacy operator-owned `.env`/`.env.test` selected for explicit import and the in-memory plaintext handled during that transition.
- canonical application-owned `.env`, inherited aliases, and custom-provider-v1 credential fields left untouched but excluded from current runtime authority.
- application/database privacy that could be lost if patched `repository_prisma` query-log policy drifts during dependency installation.
- Codex-owned external login/configuration state and the operator environment intentionally inherited by that external runtime.
- exact Gemini mode integrity, which controls the endpoint/authentication behavior receiving a resolved credential.

## Trust Boundaries

| Boundary | Trusted Responsibility | Untrusted / Less-Trusted Side | Required Control |
| --- | --- | --- | --- |
| Browser/Electron renderer -> server | subject-specific lifecycle/status | caller input and browser state | write-only value transport, no readback/raw resolve |
| Server service -> backend | catalog policy and exact-address operation | adapter/vendor/storage failures | typed port, normalized redacted errors, no fallback |
| SecretManagementService -> in-process Local backend | exact definition operations in one bootstrap-bound Store | database/key details and alternate Store | narrow backend port, no caller path/Store selector, database handle encapsulation |
| Consumer provisioning -> LLM/client | semantic auth delivery | serializable config and provider request data | ephemeral construction context, reveal only at SDK boundary |
| AutoByteus remote discovery -> registries/provider | one gateway credential plus non-secret hosts and scoped catalog results | remote provider response, displayed model provider, shared registries | exact discovery consumer, JIT resolution, explicit credential owner, runtime/model-kind scoped replacement, redaction |
| Claude runtime authentication -> exact Claude Code child | one catalog-authorized Anthropic credential in managed mode | agentic child, its tools/settings, sibling/descendant processes, diagnostics | JIT resolve, exact empty-base child env, managed safe-tool/settings policy, early redaction, no fallback; recipient explicitly trusted |
| Trusted server -> governed agent/application runtime | bounded work request/result | file/shell/PTY/MCP/Claude/browser/application-worker execution | empty-base allowlist plus file/descriptor controls; process/filesystem/network isolation remains limited |
| Trusted server -> external Codex runtime | existing Codex App Server request/result | Codex process with operator environment/home and Codex-owned account state | preserve one pre-ticket launch; no Store/account-lifecycle integration; generic output redaction; explicit exclusion from `LOCAL_HARDENED` environment claim |
| Test manifest -> machine custody | logical requirements and canonical Store selection only | agent-visible Git/worktree | no value/database/key bytes in tracked files |
| Legacy sources -> current config/provider readers | approved non-secret application settings and current metadata-only v2 | credential aliases/v1 values, source mutation, Store custody, ordinary runtime fallback, raw failures | name-first sensitive exclusion, source-preserving non-secret writes, v2-only reader, value-free v1 guidance, zero automatic Store/importer operations |
| Trusted operator -> explicit Local importer -> selected Store | one deliberate populated selected-credential transition and target choice | source path/file, selected value parser, terminal/output, unselected Store | absolute private regular source, positive current-alias registry, valid static parsing, empty-as-absent normalization, populated-only validation, no ignored/placeholder metadata, no argv/env/value/content output, direct-TTY target phrase, atomic one-Store batch, no other-Store access |
| package manifest/lock/removal -> installed `repository_prisma` | one exact attested `1.0.8` artifact with upstream dotenv-free/default-off policy | upstream package drift, obsolete local patch/version residue, unsafe probes, install/build evidence | exact resolution/provenance, no repository patch, static ESM/CommonJS inspection, empty-cwd/empty-env synthetic probes, clean/frozen-install proof, sanitized evidence; no production owner adoption |
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
| `AP-003` | parent environment -> Claude/MCP/background/browser/application worker child | governed runtime receives unrelated provider keys |
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
| `AP-016` | package update retains obsolete patch/version state, or a future artifact/probe regresses dotenv/import/query-log behavior without exact-byte validation | legacy integration persists, or configuration/SQL/application data can enter the validation process, logs, artifacts, and agent-visible evidence |
| `AP-017` | preserving the pre-ticket Codex `process.env` and real HOME/CODEX_HOME -> external codex app-server observes operator ambient/account state | external runtime can observe inherited state; this is an explicit user-approved trust exception rather than a hardened child |
| `AP-018` | Vertex Express credential resolves correctly -> shared auth collapses to generic `apiKey` -> helper constructs AI Studio client | provider operation fails and a credential is presented under the wrong Google mode semantics |
| `AP-019` | design treats the established dual-key Generative Language metadata provider as defective and forces it through the LLM/media SDK-mode contract without an approved behavior basis | unnecessary source rewrite can break a user-confirmed working path, widen ephemeral data, and conflate distinct owner contracts |

## External Runtime And Exact Construction Controls

| ID | Reachable Threat | Consequence | Required Control |
| --- | --- | --- | --- |
| `RP-001` | generic execution hardening applies a synthetic HOME to Codex | existing external login is hidden and the selectable runtime has no recovery path | restore only the pre-ticket `CodexAppServerClient` environment/home line; add no second path or wrapper |
| `RP-002` | AutoByteus invents a managed Codex definition/account lifecycle | duplicated ownership, wider secret surface, and behavior not approved by the user | no Codex consumer/definition/account RPC/UI/status/rotation/mode/fallback; Codex owns authentication |
| `RP-003` | assurance text silently includes Codex environment inheritance | false security claim | every `LOCAL_HARDENED` environment assertion says governed launcher and explicitly excludes Codex |
| `RP-004` | AI Studio and Vertex Express share generic `apiKey` in LLM/media, or metadata is forced to consume that SDK-mode union | exact LLM/media Google mode is lost, or the accepted metadata contract is needlessly replaced | retain exact inline Gemini variants and one exhaustive `gemini-helper.ts` boundary for LLM/media; keep metadata's exact consumer selection and existing key-based Generative Language provider separate |
| `RP-005` | missing mode/input triggers presence-based inference or fallback | wrong credential/mode may receive the request | explicit configured mode is authoritative; missing/invalid input fails closed; no cross-mode retry |
| `RP-006` | a corrected-mode LLM/media diagnostic or curated-only catalog is treated as product-path proof | lossy LLM/media wiring remains broken or metadata availability is overstated | focused LLM/media constructor tests and real Vertex Express LLM/audio/image product paths; separate metadata consumer/provider/mapping/fallback tests and accurate live-versus-curated reporting |

Codex preservation does not improve the inherited-environment risk; it accepts and documents it to avoid breaking the user-selected external runtime. The Gemini correction improves semantic least privilege by keeping the authorized mode attached to the resolved credential until the trusted SDK boundary for LLM/media, while metadata receives only its exact selected key at the existing provider-construction boundary.

## Explicit Importer Threats And Controls

| ID | Reachable Approved-Path Threat | Consequence | Required Control |
| --- | --- | --- | --- |
| `IP-001` | source/value supplied in argv, environment, shell expansion, or output | credential enters process lists, child inheritance, terminal capture, chat/evidence | argv contains path/flags only; no value flags/env; no shell evaluation; value-free stdout/stderr/errors |
| `IP-002` | relative/inferred/searched source resolves to an agent-controlled or wrong checkout file | imports attacker/wrong credentials and restores hidden worktree dependency | required explicit absolute regular-file path with any filename/extension; no directory/parent/environment inference |
| `IP-003` | symlink, race, wrong-owner, or broadly readable source changes between check and read | reads unintended file or trusts proliferated plaintext | lstat/realpath/open-fstat identity, current owner/private-access verification, non-mutating fail-closed policy |
| `IP-004` | malformed recognized syntax, dynamic populated value, or duplicate populated occurrence is partially accepted | ambiguous selected credential or partial target mutation | bounded UTF-8/no-NUL file safety; recognize exact positive alias first; require static grammar; validate every populated selected value and reject the selected set before prompt/write; one immutable registry |
| `IP-004A` | unrelated/legacy/unknown content is treated as importer policy or is exposed while being ignored | valid current application files are rejected; pressure to add legacy aliases; unknown content leaks to output | do not parse/validate unrecognized right-hand sides; ignore every unrecognized line; retain/report no ignored-line metadata; no ZHIPU mapping or negative secret-like classifier |
| `IP-004B` | a valid empty recognized placeholder is treated as a credential or whole-import error | ordinary multi-mode application config blocks populated current credentials or creates meaningless empty Store records | normalize after valid static parsing; represent empty as absence/no selected entry; no duplicate state, plan/output metadata, warning, or error; if none remain, use `IMPORT_NO_MAPPED_CREDENTIALS` before target access |
| `IP-005` | wrong implicit target or accidental overwrite | contaminates normal/E2E custody or destroys a valid credential | required closed `default\|e2e`; internal canonical paths; dry-run; skip by default; explicit `--overwrite`; exact target-specific direct-TTY phrase; no `--yes` |
| `IP-006` | failure after some mapped values are stored | partially migrated target with ambiguous operator state | validate all first; one SQLite transaction; rollback all; checkpoint/close; value-free stable outcome |
| `IP-006A` | absent selected pair is initialized during preview/cancellation, or a partial pair is silently completed | unexpected custody mutation or mismatched database/key accepted | dry-run/cancellation never initialize; confirmed execution alone uses staged pair initializer; one-file/crash partial pairs remain `CORRUPT`; batch failure may leave only a valid empty selected Store |
| `IP-007` | importer opens both Stores or reads one Store as source | breaks physical separation and becomes a decrypt/re-encrypt/copy tool | selected-target-only resolver; no Store source/read/fallback/copy; negative other-Store access test |
| `IP-008` | parsed values survive in logs/exceptions/temp files or runtime copies | credential disclosure after successful/failed import | no plaintext intermediate/log/exception; best-effort buffer overwrite/reference release; canary scans; explicit JavaScript zeroization limitation |
| `IP-009` | source remains after import | plaintext residual remains accessible to same-user agents/processes | importer never silently deletes operator data; value-free follow-up guidance; operator-owned cleanup/rotation outside this ticket |

These controls bound a user-approved trust decision; they do not elevate `LOCAL_HARDENED` to strong isolation and do not make an unsafe source safe merely because the target is encrypted.

## Legacy Source Non-Authority Threats And Controls

| ID | Reachable Approved-Path Threat | Consequence | Required Control |
| --- | --- | --- | --- |
| `MP-003-A` | non-secret config parsing retains a sensitive assignment before later filtering | ambient/runtime leak remains despite removed getters | classify names before value retention; aliases are absent from `get`, `getAll`, persistence state, logs, and child environments |
| `MP-003-B` | a non-secret update serializes only the projected map | operator-owned credential lines are silently dropped or reformatted | startup read-only plus source-preserving targeted writes only for an explicit non-secret Settings action; synthetic byte-unchanged/excluded-line fixtures |
| `MP-003-C` | custom-provider-v1 is decoded or converted to preserve metadata | historical plaintext becomes runtime authority or is rewritten | v2-only current reader; untouched v1 returns only `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED`; operator rebuilds explicitly |
| `MP-003-D` | no automatic cleanup leaves legacy plaintext accessible to the same user | an unrestricted same-user agent/process can still read residual files | built-in file-tool denial for server-data roots, explicit operator cleanup/rotation guidance, and honest `LOCAL_HARDENED` limitation; no claim of strong isolation |
| `MP-003-E` | no automatic updater silently regresses into startup later | sources mutate or credential authority returns | remove updater/call/ledger, zero Store/importer startup assertions, source/parent-alias immutability tests, and no runtime fallback |

This is a deliberate product tradeoff: neither credential continuity nor cleanup is performed automatically. Users retain explicit UI/Settings, hidden-input, and importer provisioning paths and remain responsible for source cleanup. The operator importer owns its own source/target transaction; startup never invokes or shares that orchestration.

## `repository_prisma@1.0.8` Dependency Controls

| ID | Reachable Integration Threat | Consequence | Required Control |
| --- | --- | --- | --- |
| `DP-001` | a future artifact enables query logging by default | raw SQL/parameters or sensitive application data reach logs/evidence | exact `1.0.8` lock/provenance; static plus ESM/CommonJS synthetic checks; default `info\|warn\|error`; documented explicit environment/typed opt-in only |
| `DP-002` | obsolete patched-dependency metadata/file or old resolution remains | legacy code/dual integration survives or clean installs diverge | update manifest/lock and remove root patch key/file as one unit; create no replacement patch; clean/frozen install; one exact `1.0.8` resolution |
| `DP-003` | package import discovers dotenv, eagerly acquires Prisma, or requires a datasource | validation can reload legacy credentials or touch an unintended database | static no-dotenv assertion plus empty-cwd/empty-base ESM/CommonJS import instrumentation proving zero acquisition and no datasource requirement |
| `DP-004` | upstream lifecycle is opportunistically adopted into production owners | duplicate datasource/lifecycle authority, shutdown/rebind conflicts, larger data risk | no production `repository_prisma` import in this ticket; preserve AppConfig/configured-client and bounded lazy-owner regressions |
| `DP-005` | compatibility evidence contains raw query, datasource URL/path, provider result, or diagnostic cause | sensitive data enters reports/chat/artifacts | use synthetic constructors/canaries, stable assertions and value-free summaries; evidence scan before handoff |

This dependency path changes package metadata/lock resolution, removes obsolete local patching, and adds exact-package regression evidence only. It does not strengthen or weaken the `LOCAL_HARDENED` assurance tier and has a `Not Affected` persisted-data decision.

## Assurance Tiers

| Tier | Claim | Required Controls | Explicit Non-Guarantee |
| --- | --- | --- | --- |
| `LOCAL_HARDENED` **(only first-delivery product tier)** | current runtime state and governed agent file-tool/env/descriptor/config/conversation paths do not expose Store credentials or legacy aliases; the exact managed Claude child is the sole Store-resolved environment recipient | central custody for current values, name-first legacy exclusion, Store/server-data path denial, explicit resolution, redaction, empty-base governed-child environments/descriptors, and managed Claude settings/tool restrictions | Codex external runtime environment/home is explicitly excluded; operator-owned legacy plaintext may remain; the tier does not hide state/keys from arbitrary same-user/same-container inspection or from the authorized Claude child/SDK |
| `STRONG_AGENT_ISOLATION` **(future, not reportable in first delivery)** | agent-controlled and supported application-worker runtimes lack path, process identity, mount, backend capability, workload identity, and network route needed to obtain secrets | all prior controls plus separate OS/container identity, filesystem/mount separation, sandboxed process launcher, restricted network/metadata, verification | does not resist privileged host/control/provider-process compromise |
| `TRUSTED_DIRECT_CONSUMER` | reviewed process may receive one declared credential to construct the real SDK client | exact definition authorization, last-moment reveal, no env/serialization, review gate, sanitized evidence | recipient code/SDK can observe the value by necessity |
| `TRUSTED_AGENTIC_SECRET_CONSUMER` **(managed Claude classification, not a separately reportable tier)** | one exact Claude Code child may receive one declared credential in its environment | explicit opt-in mode, exact consumer binding, JIT resolve, empty-base exact-child delivery, safe settings/tools, early redaction, no fallback | recipient executable/SDK can inspect/retain/exfiltrate its own key; compromised native code may create unsupported descendants |

First delivery reports `LOCAL_HARDENED` only after its concrete governed file-tool/environment/descriptor checks and, when managed Claude is enabled, its exact settings/tool/child-delivery controls pass; Codex environment inheritance is never included in that report. Otherwise governed agent execution fails closed rather than reporting the tier. It never reports `STRONG_AGENT_ISOLATION`. `TRUSTED_AGENTIC_SECRET_CONSUMER` names the managed-recipient trust grant; it is not a stronger security badge. A future delivery may add strong isolation only with enforceable and verified identity/mount/network isolation. Merely selecting any backend never establishes isolation.

## Custody Option Decision Matrix

| Option | Electron / Local | Worktree Reuse | Enterprise | Same-User Resistance | Complexity | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| ignored `.env` / `.env.test` | easy | poor | poor | none | low | reject |
| raw OS environment | easy | moderate | common but ambient | none inside process tree | low | reject for provider values |
| Electron `safeStorage` / OS keychain | Electron-specific | poor for direct servers | poor | OS-dependent | medium/high cross-platform | reject as canonical design |
| encrypted rows in ordinary application DB | easy | poor because application DB follows worktree/test `DATABASE_URL` | limited | weak | low/medium | reject: couples secrets to app state, reset, migration, and exports |
| **In-process Local backend with separate encrypted default/E2E Stores** | good | excellent through canonical E2E database | optional, not required | weak unless identity/ACL separation; better defense in depth through separate keys/files | medium-low | selected local design |
| fixed application-owned source -> default Store automatic import/scrub/conversion | preserves credentials or removes plaintext without user action | not an E2E/worktree setup path | local-node transition only | mutates operator-owned sources and expands trusted startup/recovery behavior | high | rejected; leave untouched/non-authoritative and provision explicitly |
| explicit legacy-source importer into one Local Store | transition only | excellent after one-time E2E import | not a remote enterprise provisioning design | no protection while source remains; narrows outward handling during transition | medium | selected bounded operator migration aid; never runtime custody |
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
4. normal runtime values are never accepted via command-line argument or ordinary `.env`; only the explicitly invoked operator importer may parse one verified legacy assignment file, and it never puts values in argv, `process.env`, shell evaluation, or outward output;
5. database/key permissions are server-local owner-only state; host real tests open only the separate E2E pair read-only;
6. automatic key-file unlock is an explicit security tradeoff: a process with equivalent machine identity/file access may read the Store and key or inspect trusted memory;
7. first delivery reports only `LOCAL_HARDENED` for governed paths, expressly excludes the external Codex environment/home path, and defers separate identities/ACLs/container boundaries/scoped workload identity to the strong tier.

Each database owns only `store_metadata` and `(definition_id, nonce, ciphertext)` records. There is no profile schema. Ordinary server runtime-data reset must preserve both Stores unless the operator explicitly requests deletion of one exact Store; otherwise nesting them under `server-data` would create a reachable destructive-reset path.

`store_metadata` contains the random `store_id`, format versions, and AES-GCM pair-verifier nonce/ciphertext/tag. Pair-verifier and record keys use different HKDF info domains. Every read-write/read-only open authenticates the verifier before exposing a backend. A swapped key, missing half-pair, missing current verifier, verifier tamper, or authentication failure is `CORRUPT`; an unsupported version is `INCOMPATIBLE`. Initial creation uses restrictive temporary files, fsync, and ordered renames; because two files cannot be committed atomically by one filesystem rename, any crash-produced partial pair fails closed rather than being silently repaired.

Separate host default/E2E databases and keys improve backup/reset isolation, reduce accidental cross-context access, and make compromise of one key insufficient to decrypt the other database. They do not help if the same unrestricted process can read both pairs. No automatic inheritance/fallback is allowed. Startup opens no Store on behalf of legacy sources; the explicit importer opens only its selected target and never uses another Store as a source. Docker owns its node-local default Store independently and is not joined to the host E2E arrangement.

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

## Codex External Authentication Decision

Codex authentication and cached account state remain Codex-owned. The selected target restores/preserves the pre-ticket `CodexAppServerClient` launch with `options.env ?? process.env` and real HOME/CODEX_HOME. This keeps existing `codex login` behavior available and intentionally accepts that the external process can observe inherited operator state. AutoByteus performs no Store resolution, account/login RPC, login/status UI, rotation, mode selection, auth-state migration, synthetic account-home creation, or fallback. Durable coverage uses synthetic roots/sentinels; a targeted real product turn may use the already-established external account without inspecting its files.

This closes CR-019 by defining an explicit exclusion, not by claiming the path is hardened. Restoring one pre-ticket line and removing the ticket-added helper is a clean cut; there is no old/new dual path.

## Gemini Construction And Metadata-Preservation Decision

The original `origin/personal` LLM/media path demonstrates the intended semantic distinction: `VERTEX_AI_API_KEY` constructed `GoogleGenAI({vertexai:true,apiKey})`, project/location constructed `GoogleGenAI({vertexai:true,project,location})`, and `GEMINI_API_KEY` constructed `GoogleGenAI({apiKey})`. The same original branch intentionally gave metadata a different contract: `GEMINI_API_KEY ?? VERTEX_AI_API_KEY` authenticated the Generative Language models endpoint, its response was mapped into model metadata, and the resolver merged live fields over curated data. The user confirms this dual-key metadata behavior works.

The target retains closed inline `geminiAiStudio`, `geminiVertexExpress`, and `geminiVertexProject` variants in LLM/media authentication. LLM/media provisioning maps explicit `GEMINI_SETUP_MODE` and exact credential/configuration to the variant. The existing `gemini-helper.ts` boundary owns the exhaustive SDK construction:

- `geminiAiStudio` -> `GoogleGenAI({apiKey})`;
- `geminiVertexExpress` -> `GoogleGenAI({vertexai:true,apiKey})`;
- `geminiVertexProject` -> `GoogleGenAI({vertexai:true,project,location})`.

Metadata remains separate. `ModelMetadataProvisioningService` maps `AI_STUDIO` to the exact AI Studio metadata consumer, `VERTEX_EXPRESS` to the exact Vertex Express metadata consumer, and `VERTEX_PROJECT` to no live provider/zero metadata secret lookup. For a key-backed mode, it reveals only the selected Store value to the existing `GeminiModelMetadataProvider`, which preserves the Generative Language request and response mapping. `ModelMetadataResolver` retains live-over-curated merge and failure containment. Curated data is an availability fallback only: it neither changes authentication, retries another definition, nor proves that the live request succeeded.

No LLM/media variant is inferred from presence, accepted as another mode, or retried as fallback. Metadata reads no ambient alias and tries no alternate definition or Store. This closes AP-018 and avoids AP-019 without adding another resolver/service, endpoint selector, metadata SDK-mode DTO, or broad optional-field structure.

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
- the legacy key alias belongs only to the immutable historical exclusion/import policy and is never a normal or fallback runtime source.

This closes `AP-013` and `AP-014` without duplicating one secret into each provider family. Runtime-scoped synchronization addresses `AP-015` and avoids treating feature removal as a security control. Trusted provider code necessarily observes the decrypted key when it constructs the outbound request; that is the same `TRUSTED_DIRECT_CONSUMER` limit as other provider SDKs, not a claim that plaintext never exists in memory.

## Test Provisioning Option Analysis

| Pattern | Real Provider? | Key Visible To General Test Process? | New Worktree Human Step? | Decision |
| --- | --- | --- | --- | --- |
| copy ignored `.env.test` | yes | yes | yes | remove |
| committed key | yes | yes/everywhere | no | forbidden |
| fake endpoint only | no | no | no | retain for deterministic tests, insufficient alone |
| separate real-E2E Store + direct trusted harness | yes | only narrow reviewed boundary | no after one-time setup | required for construction/auth paths; open read-only |
| explicit absolute file of any name -> recognize current aliases -> selected Local Store importer | yes after one-time transition | only trusted importer/setup process handles populated selected values; empty recognized placeholders are absent; test runner remains key-free; unknown RHS is not interpreted | no after one-time setup | selected operator transition with file-safety/positive-registry/empty-as-absent/populated-value/target/TTY/atomic/no-output controls; source remains residual until separately cleaned |
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
14. Shipping a default-to-E2E decrypt/re-encrypt copy command; hidden-input setup and the explicit importer write the selected target from operator input and cannot use the default Store as an E2E source.
15. Treating `auto`, ambient aliases, or child-detected state as permission to select/fall back between Claude authentication modes.
16. Letting Claude SDK/session/model-catalog callers supply arbitrary `env`, or spreading/mutating parent `process.env` before managed delivery.
17. Delivering a Claude managed key through CLI arguments, settings, session state, files, logs, diagnostics, external MCP configuration, or a built-in process/environment-inspection tool.
18. Claiming that child-environment delivery hides the key from the authorized Claude executable/SDK or that JavaScript deterministically zeroizes it.
19. Removing AutoByteus remote discovery/reload calls or provider wrappers as a shortcut for eliminating `AUTOBYTEUS_API_KEY`; supported functionality must remain while custody changes.
20. Inferring a gateway model's credential definition from its displayed provider instead of its explicit credential owner.
21. Giving LLM/audio/image three independent AutoByteus secret resolvers/discovery coordinators; one typed discovery owner and the generic management boundary are sufficient.
22. Replacing/clearing all models of a displayed provider after an AutoByteus refresh; only the matching AutoByteus runtime/model-kind subset is owned by that refresh.
23. Searching parent/current directories for an explicit import source, accepting a relative path, or letting startup/tests invoke the operator importer.
24. Accepting importer target Store paths, definition IDs, raw values, backend configuration, environment overrides, a default target, removal, or noninteractive `--yes`.
25. Selecting a parser from the source extension, auto-detecting JSON/YAML/shell formats, executing dotenv/shell content, or validating unknown lines as importer input. Every filename uses recognize-first exact-name selection; strict static assignment parsing applies only after a current alias matches, normalized-empty recognized values become absence, and populated values have no shell `source`, interpolation, command substitution, or ambient `process.env` mutation.
26. Mutating source permissions/ACLs, deleting/rewriting the source, or creating plaintext temporary/backup/quarantine files without a separate approved cleanup operation.
27. Exposing a Local bulk-import/batch method through `SecretManagementService` or the generic backend port when only the setup owner needs it.
28. Claiming deterministic zeroization of JavaScript/parser/SQLite/native string copies after import.
29. Adding any automatic credential import/copy/scrub/delete/rewrite/conversion, phase ledger, or new credential app-data migration framework after the user selected untouched/non-authoritative sources.
30. Combining legacy-source handling and operator import behind one generic source/target DTO, accepting backend/profile/Store selectors, or teaching ordinary runtime old-schema credential reads; current non-secret projection and explicit setup remain separately owned.
31. Updating only the `repository_prisma` semver while leaving the `1.0.6` patch key/file or any `1.0.7`/replacement patch path, wrapper, or fallback. Latest `1.0.8` makes those paths obsolete.
32. Replacing current AutoByteus Prisma owners, upgrading Prisma ORM/client, or changing schema/data merely because `repository_prisma@1.0.8` contains a similar lifecycle implementation.
33. Proving query-log policy by executing/recording a real query, datasource URL/path, or provider operation when synthetic option inspection is sufficient.
34. Routing Codex through the governed synthetic-home builder after the user selected external login preservation, or adding an AutoByteus-managed Codex Store/account lifecycle as compensation.
35. Claiming that Codex inherited environment/home is covered by `LOCAL_HARDENED`, dumping that environment in tests, or inspecting/migrating real Codex auth state.
36. Collapsing Gemini AI Studio and Vertex Express into generic `apiKey` for LLM/media; forcing metadata through the LLM/media SDK-mode union; adding optional Google-mode/endpoint fields to a loose base; reading ambient aliases or alternate definitions; falling back across modes; or counting curated-only catalog data as successful live enrichment.
37. Counting a direct corrected-mode diagnostic as proof that normal LLM/media provisioning and factory/helper wiring pass.

## External Authority Summary

- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) documents runtime volume/environment delivery and in-memory Secret volume behavior.
- [Kubernetes Secrets good practices](https://kubernetes.io/docs/concepts/security/secrets-good-practices/) documents encryption-at-rest and least-privilege access concerns.
- [Kubernetes service accounts](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/) documents disabling automatic service-account token mounting.
- [HashiCorp Vault KV v2](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2) provides versioned static-secret and check-and-set semantics.
- [Vault Agent](https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent) shows a separate client daemon as an established integration option, not a mandatory AutoByteus shape.
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) confirms the API is Electron main-process and OS-specific, supporting the decision not to make it the cross-platform canonical Local Store.
- [Anthropic's June 15–16 Agent SDK subscription update](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) states that the planned change is paused and current Agent SDK, `claude -p`, and third-party application usage still draw from subscription limits; it explicitly identifies third-party apps authenticating through the Agent SDK.
- [Anthropic Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) and [Claude Code legal/authentication guidance](https://code.claude.com/docs/en/legal-and-compliance) retain contrary API-key/prior-approval language. The package records this as `EXT-ANTHROPIC-AGENT-SDK-AUTH` rather than pretending the conflict is resolved. AutoByteus's local/self-hosted, no-login-broker shape and existing successful CLI path are relevant context but not standalone permission proof.
- [`repository_prisma` v1.0.7...v1.0.8 upstream comparison](https://github.com/ryan-zheng-teki/repository_prisma/compare/v1.0.7...v1.0.8), exact npm metadata/provenance, packed-artifact hashes, and isolated ESM/CommonJS probes establish the removed dotenv side effect, default-off/explicit-opt-in query policy, unchanged `@prisma/client:^5.22.0` peer, and attested `1.0.8` artifact used by UC-020. Detailed evidence is retained in [repository-prisma-1.0.8-assessment.md](./repository-prisma-1.0.8-assessment.md).
