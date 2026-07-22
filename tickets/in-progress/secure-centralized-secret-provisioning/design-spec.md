# Secure Centralized Secret Provisioning — Design Spec

## Document Status

- Status: `Original Gemini Metadata Preservation Reconciliation — Architecture Re-review Required` (2026-07-22).
- Requirements basis: [requirements.md](./requirements.md), status `Refined — Original Gemini Metadata Preservation Reconciliation; Architecture Re-review Required` (2026-07-22).
- Architecture diagrams: [secret-storage-architecture.md](./secret-storage-architecture.md).
- Review reports: [design-review-report.md](./design-review-report.md) records the last architecture gate. [code-review-report.md](./code-review-report.md) round 25 at implementation HEAD `ad629bc55ed5c653db957ce46bdbc5092c7738ac` confirms CR-019 and CR-020 are corrected for Codex and Gemini LLM/media, withdraws round 24's metadata source-defect inference, and retains CR-021 only as an artifact Requirement Gap.
- Handoff state: implementation/API-E2E remain paused pending architecture re-review. This revision changes no source target or product decision: it preserves exact Gemini LLM/media variants and the separately established dual-key Generative Language metadata behavior. No metadata implementation rework is authorized. Preserve CR-002–CR-005, CR-009–CR-020, the empty-as-absent importer, exact unpatched `repository_prisma@1.0.8`, unchanged Docker, exact AutoByteus DNS-unavailable result, and `EXT-ANTHROPIC-AGENT-SDK-AUTH`.

## Current-State Read

The original base had no authoritative secret subsystem. The reviewed package established the secret-management subsystem, Local default/E2E Store support, explicit consumers, explicit importer, no-automatic-update behavior, Claude modes, AutoByteus gateway preservation, hardening, exact unpatched `repository_prisma@1.0.8`, and durable test harness. At current implementation HEAD `ad629bc55ed5c653db957ce46bdbc5092c7738ac`, source review round 24 confirms the earlier Codex and LLM/media corrections and exposes one independently reachable metadata regression; implementation evidence is context, not requirements authority.

The historical base behavior below remains relevant migration evidence. `autobyteus-server-ts/src/config/app-config.ts` loaded `${dataDir}/.env` into server-global `process.env`, persisted built-in LLM/search credentials back to that file, and mixed secret and ordinary configuration. Custom OpenAI-compatible provider schema v1 stored `apiKey` in plaintext JSON and copied it into `OpenAICompatibleEndpointModel`.

Credential consumption is distributed. `OpenAILLM` delegates to `OpenAIResponsesLLM`, which reads a configured environment alias. Anthropic, Mistral, Gemini, other LLMs, live metadata discovery, search strategies, and media clients have equivalent ambient paths. `LLMFactory.createLLM(modelIdentifier, configInput?)` currently owns model lookup/default composition, then invokes `new LLMClass(model, config)`. Its async seam and the injectable factory seam in `AutoByteusAgentRunBackendFactory` make a clean refactor possible without moving secret resolution into individual LLMs.

One supported path has an additional identity distinction. With `AUTOBYTEUS_LLM_SERVER_HOSTS` configured, the base factories discover remote LLM/audio/image models through `AutobyteusClient`, and the same ambient `AUTOBYTEUS_API_KEY` authenticates both discovery and later requests. A returned model can report `provider=OPENAI` or `provider=GEMINI` while `runtime=AUTOBYTEUS`; its model provider is therefore not the gateway credential owner. Source review found that the explicit-auth implementation removed the ambient read but also removed every production discovery caller, leaving remote providers dormant and configured remote models absent.

Tests load ignored superrepo/package `.env.test` files through `autobyteus-ts/tests/setup.ts`, and many live suites gate on provider-key environment aliases. Therefore a fresh worktree lacks both credential state and a tracked declaration of which real credentials/scenarios it needs. Fakes are useful but do not prove real authentication, current SDK/protocol/model behavior, or provider-specific media/search behavior.

Electron starts an embedded server, while direct Node/web, Docker, Kubernetes, and remote nodes operate without Electron. Agent file/shell/PTY/external-runtime paths can receive broad host access and inherited environments. The latest supported application backend worker is also spawned by `ApplicationWorkerSupervisor` with a spread of `process.env` and the server filesystem identity. The current all-in-one container cannot claim strong separation when a provider secret mount or workload identity is visible to the same container that hosts an unrestricted agent or application worker.

The current ordinary server database is SQLite through `DATABASE_URL`: Electron composes `~/.autobyteus/server-data/db/production.db`, while direct/test servers can use `test.db` or data-directory/worktree-specific locations. Secret rows in that database would not provide stable cross-worktree E2E custody and would couple secret reset/migrations/backups to application state. Current Docker Compose already persists `AUTOBYTEUS_DATA_DIR=/home/autobyteus/data` through the `autobyteus-server-data` named volume. The normal Docker Local Store can derive below that directory; the user explicitly rejected adding a Docker E2E bind-mount/volume contract, so existing Compose and launcher behavior remain unchanged. Current Claude Agent SDK authentication also has a distinct leak path: `claude-sdk-auth-environment.ts` accepts `auto|cli|api-key`, starts from `{...process.env}`, and can forward Anthropic/Claude key aliases. `ClaudeSdkClient` also accepts caller `env`, uses the same spawn path for model discovery and runs, loads user/project/local setting sources, and buffers raw stderr before summary redaction.

The current focused Prisma query-log policy test starts a Node child with `cwd=autobyteus-server-ts` and `{...process.env}`. That composition made the rejected `repository_prisma@1.0.7` target unsafe because both entrypoints loaded `dotenv/config`. Verified `1.0.8` removes package-owned dotenv loading, but the durable regression probe still uses empty temporary cwd and empty-base environment so a future package regression cannot read supported legacy configuration during validation.

The recognize-first import owner, CLI normalization, and target transaction boundary are sound after the approved correction. Round-9 API/E2E then exercised the exact current application `.env`: one recognized `GEMINI_API_KEY` assignment is empty because the product uses the populated `VERTEX_AI_API_KEY` mode, while nine recognized credentials are populated. The source reader nevertheless throws `IMPORT_SOURCE_EMPTY_CREDENTIAL` before target access. This is a local selected-value defect, not a reason for another owner or fallback: after valid static parsing/normalization, empty recognized values are absent/non-selected; only populated recognized values enter duplicate/dynamic validation and the plan.

Codex App Server is an established, user-selectable external runtime. The pre-ticket client passed `options.env ?? process.env`, so the real operator HOME/CODEX_HOME exposed Codex-owned `codex login` state. Ticket hardening replaced that line with `buildAgentChildEnvironment`, which forces a synthetic `/tmp/autobyteus-agent-runtime` HOME and leaves no authentication lifecycle. The user explicitly chose preservation rather than a new AutoByteus auth subsystem: restore the pre-ticket client launch line, retain Codex-owned login/configuration, perform no Store resolve or account RPC, and state that Codex is outside the `LOCAL_HARDENED` child-environment guarantee.

For Gemini, CR-020 preserves exact modes through LLM/media. Direct `origin/personal` inspection shows that live metadata is intentionally a separate contract: the original provider selects `GEMINI_API_KEY ?? VERTEX_AI_API_KEY`, calls the Generative Language models endpoint, maps `name`/`baseModelId` and token limits, and relies on `ModelMetadataResolver` for live-over-curated fallback. The user confirms that dual-key path works. Current `ModelMetadataProvisioningService` removes ambient lookup while preserving it: `AI_STUDIO` resolves `llmMetadata/GEMINI/geminiAiStudioApiKey`, `VERTEX_EXPRESS` resolves `llmMetadata/GEMINI/geminiVertexExpressApiKey`, both construct the same existing metadata provider, and `VERTEX_PROJECT` constructs no live provider so curated data remains. The clean correction is documentation-only: do not force metadata through the LLM/media SDK-mode union and do not replace its request path.

There is no current AutoByteus application-user or role model relevant to this feature. The target preserves existing Settings access behavior. Server-to-Local-Store/Vault/cloud authentication is deployment workload identity, not application-user identity.

Detailed evidence and exact source paths are in [investigation-notes.md](./investigation-notes.md); consumer aliases and target bindings are in [credential-consumer-mapping.md](./credential-consumer-mapping.md).

## Intended Change

Introduce a server-owned secret-management subsystem with the conceptual dependency direction:

```text
SubjectSpecificProvisioningService -> SecretManagementService -> SecretStorageBackend -> custody
```

Separate the non-secret storage configuration plane from provider credential lifecycle. The server selects exactly one typed backend instance during bootstrap. Backends report writable versus externally managed capabilities. Provider/search Settings continue to submit write-only values to subject-specific services; no saved value is returned.

For local/Electron/test use, add `LocalSecretStorageBackend` inside Agent Server, independent of Electron and OS keychains. A normal server derives `secret-store/secret-store.db` and `secret-store/secret-store.key` below its configured server data directory. Electron therefore uses `~/.autobyteus/server-data/secret-store/`; normal Docker uses its existing `/home/autobyteus/data` persistent volume without Compose/launcher changes. A Docker container or single Kubernetes server Pod is one independent Local Store node backed by its own persistent-volume domain. Multiple replicas require a future installed enterprise adapter rather than shared SQLite; no concrete enterprise adapter ships in this first delivery. Each Store format contains authenticated pair metadata so an empty database cannot accept a swapped key. The physically separate host `real-e2e-secret-store.db` and key are provisioned once with dedicated test credentials and selected by tracked non-secret configuration. Hidden-input setup and runtime have no default-Store copy/read/fallback path; the separate operator importer may read only its explicit plaintext source and writes exactly one selected Store without reading another Store. No Local Store daemon, IPC protocol, arbitrary profile framework, or prescribed Docker E2E mount is introduced.

Before LLM construction, `LLMProvisioningService` resolves authentication. `LLMFactory` remains responsible for lookup and effective `LLMConfig`, accepts authentication separately, and creates an ephemeral `LLMConstructionContext`. The shared LLM/media resolved-authentication union keeps generic API keys/none separate and preserves exact Gemini variants; `gemini-helper.ts` performs the exhaustive Google SDK construction for those clients. Metadata remains separate: its server owner selects the exact key-backed consumer, reveals only that Store value to the existing `GeminiModelMetadataProvider`, and preserves the Generative Language request/mapping plus resolver-curated fallback; Vertex Project performs no metadata secret lookup. Search retains its explicit provisioning boundary. First-delivery governed agent/application-worker launchers use empty-base allowlists and file-tool Store denial and report only `LOCAL_HARDENED`; Codex App Server deliberately preserves its external Codex-owned login environment/home and is excluded from that child-environment claim. Separate identity/container/network enforcement and `STRONG_AGENT_ISOLATION` are deferred.

Preserve AutoByteus remote discovery and invocation through `provider.autobyteus.api-key`. Existing provider Settings saves/statuses/removes the definition and retains the existing full/provider reload journey; explicit successful removal authoritatively clears all AutoByteus runtime subsets without lookup. A shared server-owned `AutobyteusRemoteModelDiscoveryService` resolves exact `modelDiscovery/{llm|audio|image}/AUTOBYTEUS/apiKey` consumers only when hosts exist, then passes ephemeral authentication to storage-neutral core providers. Remote model construction uses the existing generic LLM/media provisioning services through a required non-secret `credentialProviderId`. Native model registration initializes that field once from its credential owner; AutoByteus-runtime registration sets it explicitly to `AUTOBYTEUS`. After registration, provisioning reads only `credentialProviderId` and never falls back to or re-derives custody from the displayed/creator provider. Successful discovery replaces only the corresponding `runtime=AUTOBYTEUS` registrations, never native models with the same downstream provider. `AUTOBYTEUS_API_KEY` is recognized only by the positive explicit-import registry and the separate non-secret exclusion boundary; no ambient fallback returns.

Claude Agent SDK uses a specialized server-owned `ClaudeRuntimeAuthenticationService` over the existing generic management service. It accepts exactly default `cli` and explicit `managed-secret`. CLI performs no secret resolution. Managed mode constructs the exact `agentRuntime/claude_agent_sdk/apiKey` identity, calls `resolveForUse` immediately before model-discovery/run child construction, and authorizes reuse of `provider.anthropic.api-key`. `ClaudeSdkClient` alone unwraps into an empty-base SDK child environment containing exactly `ANTHROPIC_API_KEY`; it accepts no caller environment and never mutates the parent. Managed mode disables user/project/local settings, hooks, plugins, API-key helpers, external MCP configuration, and built-in process/environment-inspection tools; AutoByteus tools run server-side under sanitized policy. Diagnostics redact before buffering. Legacy `auto|api-key`, non-ready custody, invalid binding, spawn, and auth failures never fall back.

Backend initialization can leave the server in degraded secret mode. `SecretStorageConfigurationService` exposes exactly `READY`, `LOCKED`, `UNAVAILABLE`, `CORRUPT`, or `INCOMPATIBLE`; per-definition `MISSING`/`CONFIGURED` exists only while `READY`. Settings/health stay reachable, while provider construction and writes fail closed with value-free instruction codes.

Legacy plaintext readers/writers remain removed from runtime, but startup no longer mutates legacy sources. Remove `runLegacySecretCutoverMigration`, its rewrite/ledger owner, and parent-alias deletion. The non-secret configuration reader leaves application `.env` byte-for-byte unchanged, admits only approved non-secret names, and never retains/returns/persists sensitive assignments. Current custom-provider storage accepts metadata-only v2; a v1 file remains untouched and returns stable value-free reconfiguration guidance until the operator moves/deletes it and recreates providers. Separately, keep one explicitly invoked local operator CLI, exposed by `pnpm secrets:local:import -- --source <absolute source path> --target default|e2e [--dry-run] [--overwrite]`. The thin CLI adapter accepts zero or one leading PNPM sentinel and produces one canonical request. Source is required, absolute, privately owned, and never searched/inferred; any filename or extension is accepted. After file identity/size/encoding safety, a recognize-first scanner compares line assignment names to one immutable positive alias registry and parses an assignment only after a current alias matches. A valid recognized assignment whose post-unquote/outer-whitespace-normalized value is empty is absent/non-selected and produces no plan/output metadata, warning, or failure; only populated selected credentials are validated for dynamic markers and duplicates. Unknown lines—including operational settings, unknown secret-like names, unsupported `QWEN_API_KEY`, legacy ZHIPU, and malformed unrelated content—are skipped without right-hand-side interpretation and produce no ignored-line metadata. Qwen maps only the currently supported `DASHSCOPE_API_KEY`; neither `QWEN_API_KEY` nor ZHIPU is mapped. Target is a required closed enum resolving internally to one canonical **host** Store pair, never a path; custom-data-directory, Docker, Kubernetes, remote, and enterprise Stores remain outside this command and use their existing provisioning surfaces. Dry-run is value-free; configured records are skipped unless `--overwrite`; every write requires exact target-specific TTY confirmation. One Local setup-only batch transaction writes all planned records or none. The CLI never mutates the source or becomes a runtime/test-runner/API path.

As a separate bounded dependency-integration path, cleanly replace current `repository_prisma@1.0.6` integration with verified `1.0.8`. Keep `prisma` and `@prisma/client` on `5.22.0`, leave schemas/migrations/data and current AutoByteus database owners unchanged, and introduce no production import of `repository_prisma`. Move the server manifest and lock together, remove the obsolete root patched-dependency key and `1.0.6` patch file, and create no replacement patch. The exact upstream ESM/CommonJS entrypoints contain no dotenv/config or `.env` discovery, acquire no Prisma client at import, default logs to `info|warn|error`, and add `query` only through explicit environment or typed opt-in. Validation uses exact installed paths in children with empty temporary cwd, empty-base platform-minimal environment, no inherited dotenv/home/path/Node loader/database/provider state, and narrow test-owned interception of only `@prisma/client`. Import-only and log-policy phases prove zero acquisition and correct log kinds without opening a real source/database or executing/recording SQL. Clean/frozen install, production build, and existing restart/reopen regressions complete compatibility evidence.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Trigger / Contract | Existing Behavior Evidence | Approved Change / Preserved Outcome | Target Path / Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | REQ-001, REQ-002, REQ-006, REQ-007, REQ-010 / AC-001, AC-007, AC-008 | Existing provider/search Settings save/remove/status | Investigation `BEH-001`; AppConfig/custom-provider paths | Preserve familiar Settings and current access; use write-only lifecycle and value-free status | UC-001/002/013; DS-UC001, DS-UC002A/B, DS-UC013, DS-RET001 |
| `BEH-002` | System | REQ-003, REQ-004, REQ-012 / AC-003, AC-013 | Agent, supported application-worker, and Codex execution | Investigation `BEH-002`; spawn/file/application-worker and base/current Codex traces | Governed launchers remove ambient provider/backend state and enforce file-tool roots; Codex preserves pre-ticket external-login environment/home and is explicitly outside the child-environment assurance claim | UC-014; DS-UC014A/B |
| `BEH-003` | System | REQ-005, REQ-011 / AC-005, AC-006, AC-010 | LLM/search/media/metadata client creation plus model list/reload | Investigation `BEH-003`; CR-020 LLM/media evidence; corrected CR-021 original-branch comparison/user confirmation | Resolve semantic authentication before construction; exact Gemini SDK variants reach LLM/media; metadata preserves selected AI Studio-or-Vertex key -> established Generative Language provider -> live-over-curated merge, with Vertex Project curated-only and zero metadata lookup | UC-007/008; DS-UC007, DS-UC008A/B/C, DS-RET002 |
| `BEH-004` | Operational | REQ-009, REQ-016, REQ-017, REQ-020 / AC-006, AC-012, AC-015, AC-016, AC-020 | Real suite from a fresh worktree after one-time operator setup | Investigation `BEH-004`; test setup/live-suite scans | Preserve substantive real tests; remove per-worktree copied credential dotenv; allow hidden-input or explicit-source machine setup outside the runner | UC-009/010/019; DS-UC009, DS-UC010, DS-UC019A/C |
| `BEH-005` | Contract | REQ-006, REQ-008, REQ-010 / AC-004, AC-007, AC-008 | Lifecycle/status/health operation | Investigation `BEH-005`; fragmented status paths | Separate `READY/LOCKED/UNAVAILABLE/CORRUPT/INCOMPATIBLE` backend health from healthy-only `MISSING/CONFIGURED`; degraded control plane stays value-free | UC-001/002/013; DS-UC001, DS-UC002A/B, DS-UC013, DS-RET001 |
| `BEH-006` | System | REQ-004, REQ-010, REQ-012, REQ-013 / AC-001, AC-002, AC-013, AC-017 | Electron/direct/container server startup | Investigation `BEH-006` | Preserve all deployment modes; bootstrap selected backend before providers | UC-003/004/011; DS-UC003, DS-UC004, DS-UC011 |
| `BEH-007` | Operational | REQ-010, REQ-012, REQ-013, REQ-015 / AC-002, AC-013, AC-014, AC-017 | Docker/Kubernetes deployment | Investigation `BEH-007`; Docker/Kubernetes evidence | First delivery: independent Local Store node only; future registered enterprise adapter required for multi-node custody; no strong all-in-one claim and no Codex environment claim | UC-012/013/014; DS-UC012, DS-UC013, DS-UC014A/B |
| `BEH-008` | Operational | REQ-002, REQ-014, REQ-016 / AC-007, AC-009, AC-012 | Startup with existing legacy files | Investigation `BEH-008`; persisted-data evidence | Leave sources untouched; project approved non-secret config without retaining sensitive aliases; reject custom-provider-v1 value-free; no credential fallback | UC-015; DS-UC015 |
| `BEH-009` | Contract | REQ-011 / AC-005, AC-010 | `LLMFactory.createLLM` | Factory/OpenAI source evidence | Preserve factory composition; add separate required authentication input and ephemeral context | UC-007; DS-UC007 |
| `BEH-010` | Operational | REQ-012, REQ-017, REQ-020 / AC-015, AC-016, AC-020 | Local Store initialize/open/hidden-input provision or explicit source import | No current supported behavior | Pair-authenticated in-process default/E2E Stores; no Store-to-Store copy/read/fallback; one selected target per setup/import action | UC-004–006/010/011/019; DS-UC004, DS-UC005, DS-UC006A, DS-UC010, DS-UC011, DS-UC019B/C |
| `BEH-011` | Contract | REQ-007, REQ-010, REQ-013, REQ-015 / AC-002, AC-008, AC-014, AC-017 | Startup/deployment or supported Settings backend configuration | No current neutral contract | Typed config and tagged lifecycle extension contract; first delivery registers only InMemory/Local | UC-003/012/013/016; DS-UC003, DS-UC012, DS-UC013, DS-UC016 |
| `BEH-012` | System | REQ-004, REQ-005, REQ-008, REQ-014, REQ-018 / AC-003–AC-005, AC-009, AC-018 | Claude model-discovery or run child launch | Current `auto`, `cli`, and `api-key` modes start broad, accept caller env, and may forward key aliases/settings | Replace with exact default `cli` or explicit managed JIT consumer resolution and exact-child delivery; no fallback; preserve native Anthropic consumers | UC-017; DS-UC017, DS-RET002 |
| `BEH-013` | User/System | REQ-001, REQ-005, REQ-008, REQ-009, REQ-011, REQ-014, REQ-016, REQ-017, REQ-019 / AC-004–AC-006, AC-009, AC-010, AC-012, AC-019 | AutoByteus gateway key save/status; configured-host startup/list/reload; remote LLM/audio/image invocation | Base factories discover remote models and `AutobyteusClient` reads one ambient `AUTOBYTEUS_API_KEY`; implementation removed callers after requiring explicit key | Preserve all behavior using one managed definition, exact discovery/construction consumers, `credentialProviderId=AUTOBYTEUS`, runtime-scoped synchronization, explicit provisioning, and substantive real coverage | UC-018; DS-UC018A/B/C/D, DS-RET002 |
| `BEH-014` | Operational | REQ-002, REQ-004, REQ-008, REQ-009, REQ-012, REQ-014, REQ-016, REQ-017, REQ-020 / AC-004, AC-006, AC-009, AC-012, AC-015, AC-016, AC-020 | Trusted operator explicitly invokes the committed PNPM command with absolute source and `default\|e2e` target | The recognize-first importer reaches current aliases but rejects the entire selected current app `.env` when one recognized provider placeholder is empty | Keep no automatic update; treat valid normalized-empty recognized assignments as absent, validate/plan only populated selected credentials, ignore all unrecognized lines, map Qwen only from `DASHSCOPE_API_KEY`, and preserve dry-run/no-overwrite/confirmation/atomicity | UC-019; DS-UC019A/B/C |
| `BEH-015` | Operational / Dependency | REQ-021 / AC-021 | Server dependency install/build and focused exact-package policy validation | Manifest/lock/obsolete pnpm patch select `repository_prisma@1.0.6`; production database paths do not import the package | Resolve only attested `1.0.8`; remove obsolete package patch integration; probe exact dotenv-free ESM/CJS entrypoints from empty temp cwd/empty-base env with synthetic Prisma interception; preserve upstream default-off logging, zero import acquisition, and no Prisma/schema/data/owner change | UC-020; DS-UC020 |

### Architecture Review Round 1 Remediation

| Finding | Resolution In This Revision | Governing Locations | User-Approved Resolution State |
| --- | --- | --- | --- |
| `AR-001` | First delivery is explicitly `LOCAL_HARDENED`; strong separate-identity/container/network enforcement and its claim are deferred. AC-003 tests governed file-tool denial and non-inheritance, not arbitrary same-user denial or Codex external inheritance. | REQ-003, REQ-004, AC-003, AC-013, DS-UC014A/B | User re-approved 2026-07-21; explicit Codex exclusion approved 2026-07-22 |
| `AR-002` | First delivery registers InMemory and Local only. Concrete Vault/AWS/Kubernetes adapters are deferred; multi-node selection of an unregistered kind fails value-free. | REQ-013, REQ-015, AC-002, AC-014, AC-017, DS-UC012/016 | User re-approved 2026-07-21 |
| `AR-003` | Default-to-E2E Store copy remains removed. Hidden-input setup writes the E2E target directly. UC-019 adds a separate plaintext-source importer that writes one selected Store and never reads/decrypts another Store; DS-UC006B remains removed. | REQ-017, REQ-020, AC-016, AC-020, DS-UC006A, DS-UC019B/C | Original decision approved 2026-07-21; UC-019 revision approved 2026-07-22 |
| `AR-004` | Backend health is exactly `READY/LOCKED/UNAVAILABLE/CORRUPT/INCOMPATIBLE`; per-definition status exists only when ready. Non-ready startup exposes a degraded value-free control plane and disables provider use/writes. | REQ-006, AC-007, DS-RET001, backend contract | User re-approved 2026-07-21 |
| `AR-005` / `MP-001` | Current Store metadata includes random `store_id` plus an AES-GCM authenticated pair verifier under a domain-separated key. Every open validates it, including empty/read-only Stores; mismatch is `CORRUPT`. | REQ-012, AC-014, AC-015, DS-UC005/011, Local schema | User re-approved 2026-07-21 |
| `AR-006` | Reopened after the prior CLI-only decision. The revised target defines exact `cli` and `managed-secret` modes, a Claude runtime consumer bound to the existing Anthropic definition, a JIT authentication owner, exact-child SDK env delivery, managed settings/tool/diagnostic controls, complete failures, migration/removal, and negative/real test evidence. | REQ-018, AC-018, UC/DS-UC017, consumer mapping, backend contract, threat/test supplements | User-approved 2026-07-21; architecture re-review requested |
| `AR-007` / `MP-002` | Round 3 treated prior Anthropic approval as mandatory based on the SDK overview. The newer-dated June 15–16 Help Center update expressly says third-party Agent SDK application usage still draws from subscription limits while a planned billing change is paused; official SDK/legal pages remain inconsistent. The user retains both modes. CLI adds no AutoByteus login/relay/pooling surface and uses external node-local account state. Current working behavior is technical evidence, not standalone authorization. Add a maintained external release dependency and request premise reassessment. | REQ-018, UC/DS-UC017, investigation evidence, threat model | User reaffirmed 2026-07-21; architecture re-review requested |

### Code Review Round 1 Remediation

| Finding | Resolution In This Revision | Governing Locations | State |
| --- | --- | --- | --- |
| `CR-001` | Add BEH-013/REQ-019/AC-019/UC-018, one AutoByteus definition, exact discovery/construction bindings, runtime-aware credential ownership, server discovery owner, runtime-scoped catalog synchronization, migration, Settings/status/reload, and synthetic/real evidence. | This spec; consumer mapping; backend contract; live-test spec; architecture and spine supplements | User approved 2026-07-21; architecture re-review required |
| `AR-009` / `MP-003` | Keep the explicit importer; remove every automatic legacy app-data credential update including scrub/delete/rewrite/conversion. Leave legacy files untouched and non-authoritative; custom-provider-v1 is rebuilt explicitly rather than automatically preserved. | This spec; consumer mapping; backend/architecture/spine/threat supplements | User explicitly approved; architecture re-review required |
| `CR-002` | CLI mode maps the pre-existing node-local account root into the empty-base child. Default uses the actual OS home; a validated explicit override may select another existing root. Never create/select an empty replacement home by default. | DS-UC017 and implementation guidance | Bounded implementation fix |
| `CR-003` | Stdio MCP environment builder starts from the sanitized operational base and applies exact configured server-specific values as additions; it does not treat the additions as the parent or restore parent inheritance. | DS-UC014A and implementation guidance | Bounded implementation fix |
| `CR-004` | Custom-provider delete remains idempotent: absent custom provider is success; built-in provider deletion stays rejected. | DS-UC002B / AC-011 | Bounded implementation fix |
| `CR-005` | Correct implementation handoff: empty-base environment applies to both Claude modes; `tools: []`, empty setting sources, and strict explicit MCP apply only to managed-secret. | DS-UC017 / REQ-018 | Bounded packaging fix |

### Architecture Review Round 5 Bounded Correction

| Finding | Correction | Design Effect | Approval Effect |
| --- | --- | --- | --- |
| `AR-008` | The concrete LLM example now constructs the semantic consumer with `providerId: target.credentialProviderId` and reads `credentialSlot` only from the tagged authentication requirement. The canonical `LLMConstructionTarget` exposes no displayed/creator `providerId` and no duplicate top-level credential slot. | Removes the contradictory CR-001 failure path by construction; all production spines, owners, definitions, consumers, and intended outcomes remain unchanged. | `Design Impact` only; no requirement or user-visible behavior change and no new user approval required. Architecture re-review required. |

### Architecture Review Round 11 Bounded Correction

| Finding | Correction | Design Effect | Approval Effect |
| --- | --- | --- | --- |
| `AR-010` / `MP-004` | Replace the rejected dotenv-loading `1.0.7` target with verified upstream `1.0.8`, which removes dotenv/config and `.env` discovery from both entrypoints. Keep exact installed-entrypoint probes on empty temporary cwd and empty-base environment with narrow synthetic `@prisma/client` interception. | Eliminates the package-side legacy-source path and makes the old local query-log patch unnecessary while retaining defense-in-depth import/log regression evidence. No production package adoption, Prisma/schema/data/owner, or round-10 behavior changes. | Resolved by user-approved `1.0.8` clean replacement; architecture re-review required. |

### API/E2E Mixed-Source Bounded Correction

| Finding | Correction | Design Effect | Approval Effect |
| --- | --- | --- | --- |
| `API-E2E-DI-001` | Normalize exactly one optional leading PNPM `--`; replace negative whole-file secret-like classification with recognize-first positive selection; parse/validate values only for exact current aliases; ignore every other line; retain `DASHSCOPE_API_KEY` as the only Qwen mapping; keep `QWEN_API_KEY` and ZHIPU unmapped. | Removes duplicated policy and restores the approved current-application-file journey without weakening file trust, selected-value validation, target isolation, transaction, no-fallback, or outward secrecy. No new owner or compatibility path is introduced. | User-approved; implemented/source-reviewed at `4c9f01776347d18bac78805800363f8a92a096af`; separator and unrelated-line evidence pass; preserve unchanged. |
| `SCSP-E2E-IMPORT-001` | After valid static assignment parsing and normalization, treat an empty recognized value as absent/non-selected; create no credential/plan/metadata/warning/error; apply dynamic/duplicate checks only to populated selected occurrences; retain `IMPORT_NO_MAPPED_CREDENTIALS` if none remain. | Restores the ordinary current-application-file path when one supported provider mode is empty and another is configured, without adding alias/provider fallback, weakening syntax/trust checks, or changing any owner/API. | User explicitly approved on 2026-07-22; architecture re-review required. |

### Code Review Round 23 Requirement And Design Corrections

| Finding | User-Approved / Required Correction | Design Effect | Approval Effect |
| --- | --- | --- | --- |
| `CR-019` | Leave Codex authentication alone. Restore/preserve the pre-ticket `CodexAppServerClient` launch environment/home (`options.env ?? process.env`) so externally established `codex login` state remains available. Add no Store consumer, account RPC, login/status/rotation service, UI, mode selector, synthetic account home, or fallback. | Codex is an explicit external-runtime carveout from REQ-004 and the `LOCAL_HARDENED` child-environment guarantee. Generic result redaction remains, but AutoByteus makes no non-inheritance claim for Codex. This is one restored path, not a compatibility dual path. | User explicitly approved 2026-07-22; architecture re-review required. |
| `CR-020` | Replace the loose Gemini-bearing authentication shapes with exact `geminiAiStudio`, `geminiVertexExpress`, and `geminiVertexProject` variants shared by LLM/media. Both provisioning services map the explicit configured mode; `gemini-helper.ts` exhaustively maps to exact Google SDK options. | Fixes shared-structure looseness at the existing owners; adds no new service, credential definition, alias, inference, or fallback. Real Vertex Express LLM/audio/image product paths must pass; a same-credential diagnostic is not a substitute. | Preserves already approved provider behavior; architecture re-review required. |

### Architecture Round 17 Bounded Corrections

| Finding | Correction | Design Effect | Approval Effect |
| --- | --- | --- | --- |
| `AR-013` / `MP-006` | Scope the execution-security boundary, dependency rule, launcher interface, reusable policy, and launch-caller file map to governed launchers only. Name Codex as the sole external-runtime exclusion wherever those invariants are stated. | Removes universal wording that contradicted the approved `options.env ?? process.env` Codex path. No Codex wrapper, auth subsystem, Store consumer, fallback, or stronger assurance claim is added. | Direct reconciliation with the user-approved CR-019 outcome; no new approval required. |
| `AR-014` / `MP-007` | Make the mandatory example use the canonical two-field `LLMConstructionTarget`; keep `modelIdentifier` as the separate factory input; include the `geminiAuthenticationMode` requirement and dispatch through the existing provisioning/config owner to exact resolved Gemini variants. | Removes a competing target shape and prevents the example from collapsing Gemini into generic API-key/none behavior. No new owner, field, inference, or fallback is introduced. | Direct reconciliation with the already approved CR-020 behavior; no new approval required. |

### Code Review Round 24 Bounded Correction

| Finding | Correction | Design Effect | Approval Effect |
| --- | --- | --- | --- |
| `CR-021` | Reconcile the package with the accepted original contract: keep exact three-mode Gemini authentication for LLM/media, but keep metadata on its existing dual-key Generative Language request path. `ModelMetadataProvisioningService` selects only the exact AI Studio or Vertex Express consumer; `GeminiModelMetadataProvider` and `ModelMetadataResolver` remain unchanged; Vertex Project creates no live provider. | Removes an unsupported redesign caused by treating different consumer contracts as identical. No service, type, endpoint, provider, or test-only alternative becomes production policy. | User confirmed original dual-key metadata behavior; code-review round 25 withdrew the source-defect finding and requires architecture re-review of the artifact-only correction. |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To Design | Status / Approval |
| --- | --- | --- | --- | --- |
| [use-case-spine-validation.md](./use-case-spine-validation.md) | Complete UC-001–020 spines, reachability, and attribute-provenance audit | REQ-001–021 / AC-001–021 | Normative design-principles validation and removal authority | Original Gemini metadata preservation reconciled; architecture re-review required |
| [secret-storage-architecture.md](./secret-storage-architecture.md) | Mermaid system, Store/pair, runtime, local importer, host test, Docker/Kubernetes, Claude, external Codex, exact Gemini LLM/media construction, preserved metadata, and hardening diagrams | REQ-001–021 / AC-001–021 | Visual authority for spines and boundaries | Original Gemini metadata preservation reconciled; architecture re-review required |
| [secret-storage-backend-contract.md](./secret-storage-backend-contract.md) | Service/backend/Store/capability/lifecycle/health/pair plus local provisioning/import, Claude, AutoByteus, and Gemini construction/metadata contracts | REQ-001, 002, 004–008, 010–020 | Normative port and semantics | Original Gemini metadata preservation reconciled; architecture re-review required |
| [credential-consumer-mapping.md](./credential-consumer-mapping.md) | Current aliases and target consumer/construction/removal/import mapping | REQ-001, 002, 004, 005, 011, 014, 016, 018–020 | Evidence plus normative mappings | Original Gemini metadata preservation reconciled; architecture re-review required |
| [live-test-secret-provisioning.md](./live-test-secret-provisioning.md) | Hidden-input and explicit-source E2E provisioning, zero-copy workflow, Docker non-impact, managed Claude, preserved Gemini metadata, and AutoByteus real evidence | REQ-002–005, 008, 009, 012, 016–020 | Normative test/operator flow | Original Gemini metadata preservation evidence reconciled; architecture re-review required |
| [threat-model-and-option-analysis.md](./threat-model-and-option-analysis.md) | Threats, importer trust boundary, first-delivery assurance, Gemini construction/metadata separation, dependency query-log policy, options, exclusions | REQ-002–005, 008, 009, 012–021 | Security basis and constraints | Original Gemini metadata preservation reconciliation complete; architecture re-review required |
| [repository-prisma-1.0.8-assessment.md](./repository-prisma-1.0.8-assessment.md) | Exact metadata/provenance/hashes, static dotenv/log inspection, isolated ESM/CJS probes, and clean-replacement evidence | REQ-021 / AC-021 | Evidence basis for the bounded dependency decision and AR-010 resolution | Complete; approval `N/A`; architecture re-review context |

## Task Design Health Assessment (Mandatory)

- Change posture: the already reviewed `Larger Requirement`, retained importer/dependency corrections, one external-runtime preservation correction, and one shared authentication-contract correction.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, `Legacy Or Compatibility Pressure`, `Local Implementation Defect`, and `Shared Structure Looseness`.
- Refactor needed now: `Yes`.
- Evidence: secret state is owned by generic config/custom JSON/global environment; consumers perform ambient lookup; test setup distributes ignored files; agent children inherit trusted state; deployment has no backend/Store contract.
- Design response: introduce one lifecycle owner, explicit construction authentication, a separate configuration plane, replaceable-backend extension contracts, an in-process Local backend with pair-authenticated separate default/E2E Stores, first-delivery environment/file-tool hardening, current-only non-authoritative readers and one explicit operator transition path.
- Refactor rationale: adding a provider abstraction while retaining environment reads would preserve the root leak and worktree failure. The in-scope behavior cannot be coherent without removing those paths.
- Design-principles revalidation response: every UC-001–020 path has a complete spine. UC-019 remains a separate explicit source-preserving operator command whose importer subject is only populated current recognized credentials; the thin CLI adapter owns PNPM syntax, the source reader owns file safety, recognize-first selection, valid static parsing, and empty-to-absence normalization, and the existing import service owns target plan/transaction. No second classifier, ignored/empty-placeholder DTO, provider fallback, or compatibility map survives. UC-015 is a current-reader/non-authority path, not a migration. UC-020 is package integration owned by manifest/lock/exact unpatched-package/build validation and does not become a runtime database owner. The ordinary app-data runner remains unchanged. Generic scope/address/profile/CAS/copy/daemon/import machinery remains excluded.
- Importer root-cause / refactor posture: the earlier negative classifier was `Duplicated Policy Or Coordination`; SCSP-E2E-IMPORT-001 is a `Local Implementation Defect`. The existing reader/registry/service boundaries are correct. Move the empty check from failure to non-selection before credential/duplicate-state creation, remove its error code, and add focused semantics/tests without a new service, DTO, alias, fallback, or compatibility path.
- Dependency root-cause / refactor posture: `No Design Issue Found` for current database ownership. AR-010 exposed a missing isolation invariant in the focused package probe and an upstream side effect in the rejected target. Verified `1.0.8` removes the side effect and supplies the desired log policy, so the clean response is to delete obsolete patch code and retain one isolated synthetic probe builder—not add a wrapper, dual path, production refactor, or package-owner adoption.
- Codex root-cause / refactor posture: CR-019 is a `Local Implementation Defect` caused by over-applying the new execution-policy boundary to an established external-auth runtime. The current Codex client remains the correct owner. Restore its single pre-ticket launch environment/home path and explicitly exclude it; do not create a second owner or compatibility wrapper.
- Vertex Express root-cause / refactor posture: CR-020 is `Shared Structure Looseness`. A generic API-key variant erased the selected Google authentication mode across otherwise correct owners. Tighten the existing shared discriminated union and exhaustively map it in the existing helper; do not add a resolver, optional-field base, or fallback.
- Intentional deferrals/residual risk: no concrete enterprise adapter or strong identity/container enforcement ships initially. Same-user Local Store mode remains `LOCAL_HARDENED`; JavaScript/SDK memory cannot be reliably zeroized. Managed Claude intentionally trusts one agentic child with one credential and cannot hide it from that executable/SDK; stronger non-environment delivery is deferred unless the upstream SDK exposes a stable public cross-platform channel.

## Terminology

- **Secret Management Service**: server domain owner for lifecycle, resolution policy, status/errors, and value-free events.
- **Secret Storage Backend**: injected port implementation below the management service; owns custody mechanics only.
- **AutoByteus Local Secret Storage Backend / Local backend**: an in-process Agent Server implementation of `SecretStorageBackend` that opens one configured encrypted SQLite database/key pair; not Electron-owned and not a shared multi-node network vault.
- **Local Store / Store**: one physical encrypted SQLite database plus its independent key file. The default and real-E2E Stores are distinct custody instances, not profiles.
- **Backend configuration**: typed non-secret adapter selection/options; excludes bootstrap identity/capability.
- **Consumer provisioning service**: trusted owner that describes its semantic consumer/credential slot, asks `SecretManagementService` to resolve it, maps the returned value into construction authentication, and calls a credential-agnostic factory. Definition lookup remains encapsulated by management.
- **Claude runtime authentication service**: specialized server-owned consumer-provisioning owner for exact Claude mode selection, managed consumer identity, JIT `resolveForUse`, and value-free subject failure mapping. It does not build the child environment or call a backend/catalog directly.
- **Construction context**: ephemeral object combining effective behavior config with resolved authentication at client construction only.
- **Credential provider ID**: non-secret construction-target identity naming the provider/gateway whose credential authenticates the next request. It defaults to the model provider; AutoByteus-runtime models explicitly use `AUTOBYTEUS` even when their displayed downstream provider differs.
- **AutoByteus remote model discovery service**: server-owned application service that resolves exact LLM/audio/image discovery consumers and passes ephemeral authentication to storage-neutral remote providers. It owns no Store mechanics and is not a second secret-management service.
- **Externally managed backend**: extension-contract backend instance for which AutoByteus can status/resolve but deployment tooling owns save/remove; first delivery uses only a test fixture for this capability and ships no concrete enterprise adapter.
- **`LOCAL_HARDENED`**: first-delivery assurance that current runtime/configuration surfaces and ambient child environments do not expose credentials, built-in file tools deny Store and server-data roots, and output is redacted. Operator-owned legacy plaintext may remain until explicit cleanup, so the tier does not resist arbitrary same-user process access.
- **`STRONG_AGENT_ISOLATION`**: future assurance requiring verified separate identity/container/filesystem/network enforcement; never reported by this delivery.
- **Authenticated pair verifier**: current-format Store metadata binding a random `store_id` to the exact root key so an empty Store detects a swapped key before becoming ready.
- **Local environment-secret import CLI**: explicit trusted operator boundary that opens one privately owned absolute file with any filename/extension, recognizes and parses only approved current aliases, ignores all other content, and writes one selected Local Store through an atomic setup-only batch. It is not a runtime consumer or generic secret import API.
- **Legacy-source non-authority**: current-only reader policy that leaves legacy files untouched, projects only approved non-secret application settings, rejects custom-provider-v1 value-free, and never treats a legacy credential or ambient alias as runtime authority/fallback.

## Design Reading Order

The document follows verified behavior -> transition/removal -> spines/ownership -> interfaces -> subsystem/files -> sequence/risks. The Mermaid supplement is the visual companion, not a substitute for the contracts here.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove all provider/search/media/metadata credential reads from `process.env` and all corresponding `AppConfig` secret methods/writers.
- Remove `AUTOBYTEUS_API_KEY` reads but preserve every AutoByteus remote discovery/reload/invocation caller through the new Store-backed service; feature removal is forbidden.
- Remove credential loading from global `.env.test` setup and all live-suite environment gates.
- Remove `apiKey` from custom-provider persisted schema and endpoint/model objects.
- Remove browser-public secret config and unsupported Google CSE credential Settings paths.
- Replace Claude `auto|cli|api-key` parsing with exact `cli|managed-secret`; remove ambient key/OAuth selection, arbitrary caller `env`, broad setting sources, and raw-before-redaction diagnostic buffering.
- Do not retain compatibility fields, dual constructors, env fallback, old schema reads in normal repositories, or another-Store fallback.
- Historical/current source-alias handling exists only in the explicit local provisioning registry and, by name only, the non-secret configuration exclusion policy. Runtime consumers never resolve by alias. The importer uses only the positive registry; it never consumes the broader configuration boundary's generic sensitive-name predicate. No startup source updater, negative import classifier, ZHIPU compatibility, or fallback survives.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: mixed `Directly Usable — No Migration` for approved non-secret application settings, `Discard or Rebuild` for legacy credential authority/custom-provider-v1, and `Not Affected` for ordinary Prisma-backed SQLite data under the dependency-only `repository_prisma@1.0.8` update. **No automatic persisted-data transformation exists.**
- Preserved data: legacy files themselves remain byte-for-byte operator-owned; approved non-secret application settings remain readable through a non-retaining projection.
- Rebuilt data: custom-provider-v1 is not converted or automatically preserved. The operator moves/deletes it and recreates providers through the current UI; credentials are explicitly provisioned through UI/Settings, hidden input, or UC-019.
- Current runtime: Store/current-schema only. Sensitive aliases are excluded from configuration getters/persistence and current custom-provider storage accepts metadata-only v2 only.
- Recovery/compatibility: none is required because startup performs no source mutation. A v1 file yields stable value-free reconfiguration guidance; no compatibility read/fallback, cutover record, or app-data migration extension is introduced.
- Dependency data evidence: Prisma ORM/client stay on `5.22.0`; schema and SQL migrations do not change; the dependency is not adopted by production database owners; existing application SQLite files and Local secret Stores are neither opened nor rewritten by dependency installation.
- Supported criteria: AC-007, AC-009, AC-012, AC-019, AC-020, AC-021.

### No-Automatic-Update Plan

| Step | Input | Output | Owner | Invariant |
| --- | --- | --- | --- | --- |
| 1 | unchanged canonical application `.env` | approved non-secret projection only | `AppConfig` non-secret reader | sensitive names/values never enter config state/getters/persistence; source bytes do not change |
| 2 | unchanged custom-provider-v1 file | value-free `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED` | current custom-provider store | no v1 provider or credential enters runtime; no metadata/value conversion or file write |
| 3 | parent credential aliases | ignored ambient state | configuration/runtime/child environment policy | no delete/mutation and no getter, resolver, mode selection, or child inheritance |
| 4 | missing current Store definitions/providers | UI/Settings, hidden input, UC-019, and operator cleanup/recreation | existing lifecycle/provisioning owners | explicit user action selects values/target; startup remains read/non-authoritative only |

The user explicitly accepts reconfiguration and loss of automatic custom-provider-v1 continuity. The separately approved importer may transform approved assignment aliases into one Store after explicit invocation, but server startup never invokes it and all legacy source files remain unchanged.

## Data-Flow Spine Inventory

The architecture is validated per approved use case rather than through one aggregated “secret flow.” Detailed evidence, return paths, and attribute decisions are retained in [use-case-spine-validation.md](./use-case-spine-validation.md).

| Spine ID | Scope | Use Case / Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-UC001` | Primary End-to-End | UC-001 / BEH-001, 005 | provider Settings | stored/removed value-free status | `LlmProviderService`; management owns secret lifecycle | built-in credential lifecycle |
| `DS-UC002A` | Primary End-to-End | UC-002 / BEH-001, 005 | custom provider editor | metadata-only provider + credential-backed catalog | `LlmProviderService` | custom create transaction |
| `DS-UC002B` | Primary End-to-End | UC-002 / BEH-001, 005 | custom provider delete | provider/credential absent + catalog refreshed | `LlmProviderService` | custom delete transaction |
| `DS-UC003` | Primary End-to-End | UC-003 / BEH-006, 011 | deployment/Settings backend config | validated config + restart-required status | `SecretStorageConfigurationService` | separate configuration plane |
| `DS-UC004` | Primary End-to-End | UC-004 / BEH-006, 010 | Electron/direct/normal Docker/single Kubernetes server Pod/host-test start | services ready with in-process Store-bound backend | bootstrap composer | deployment-neutral Local backend construction |
| `DS-UC005` | Primary End-to-End | UC-005 / BEH-010 | writable initialization or read-only open | pair-verifier validated backend or exact degraded health | `LocalSecretStorageBackend` | empty-Store-safe physical lifecycle |
| `DS-UC006A` | Primary End-to-End | UC-006 / BEH-010 | hidden trusted credential input | encrypted record in separate real-E2E Store | `LocalSecretStoreProvisioningService` | one-time E2E provisioning |
| `DS-UC007` | Primary End-to-End | UC-007 / BEH-003, 009 | agent/run LLM creation | normalized provider response/stream | `LLMProvisioningService` then concrete LLM | explicit LLM authentication |
| `DS-UC008A` | Primary End-to-End | UC-008 / BEH-003 | Search tool | normalized search result | `SearchProvisioningService` / executor | subject-specific search path |
| `DS-UC008B` | Primary End-to-End | UC-008 / BEH-003 | media tool/service | media result/artifact | `MediaClientProvisioningService` | subject-specific media path |
| `DS-UC008C` | Primary End-to-End | UC-008 / BEH-003 | model-list/reload request | preserved dual-key Generative Language live metadata merged over curated catalog, or curated-only outcome | `ModelMetadataProvisioningService` | exposes exact selected-consumer metadata path without conflating it with LLM/media SDK mode |
| `DS-UC009` | Primary Operational | UC-009 / BEH-004 | default test command | deterministic assertions | subject package test harness | fake/synthetic coverage without real keys |
| `DS-UC010` | Primary Operational | UC-010 / BEH-004, 010 | real command in fresh host worktree | sanitized real-provider evidence | live E2E harness | zero-copy substantive real coverage |
| `DS-UC011` | Bounded Local / Startup | UC-011 / BEH-006, 010 | Local backend open or exact-Store reset | ready handle or selected Store deleted safely | Local backend / reset owner | concurrent readers, bounded writers, explicit deletion |
| `DS-UC012` | Primary End-to-End | UC-012 / BEH-007, 011 | local container config or unregistered enterprise kind | node-local readiness or value-free unsupported-kind failure | deployment composition | first-delivery boundary and future extension |
| `DS-UC013` | Primary End-to-End | UC-013 / BEH-001, 005, 011 | Settings status load | writable controls or external guidance | configuration service projection | capability-aware UI |
| `DS-UC014A` | Primary End-to-End | UC-014 / BEH-002, 007 | governed agent/application-worker run provisioning | sanitized result plus verified `LOCAL_HARDENED` state | execution security context/launcher | exact first-delivery non-inheritance claim for governed launchers |
| `DS-UC014B` | Primary End-to-End | UC-014 / BEH-002 | Codex App Server runtime selection | Codex result using existing external `codex login` state or existing sanitized failure | `CodexAppServerClient` | preserves established Codex-owned authentication without Store/account-lifecycle invention |
| `DS-UC015` | Primary Startup | UC-015 / BEH-008 | server start with optional legacy sources | current runtime with approved non-secret config or value-free v1 guidance and zero source mutation | non-secret `AppConfig` reader / current custom-provider store | legacy sources remain untouched and credential-non-authoritative |
| `DS-UC016` | Primary Operational | UC-016 / BEH-011 | InMemory/Local/fixture conformance runner | declared-capability and health assertions | conformance suite | first-delivery implementations + extension contract |
| `DS-UC017` | Primary End-to-End | UC-017 / BEH-012 | Claude model-discovery/run authentication selection | CLI-authenticated result, managed-secret result, or exact value-free failure | public `ClaudeSdkClient`; injected `ClaudeRuntimeAuthenticationService` owns mode/JIT auth | explicit two-mode auth and managed exact-child delivery |
| `DS-UC018A` | Primary End-to-End | UC-018 / BEH-013 | AutoByteus provider Settings save/remove/status | managed AutoByteus definition + existing reload or authoritative scoped-clear trigger | `LlmProviderService` | gateway credential lifecycle without UI redesign |
| `DS-UC018B` | Primary End-to-End | UC-018 / BEH-013 | configured-host startup/list/full or provider reload | synchronized remote LLM/audio/image catalogs or value-free failure | `AutobyteusRemoteModelDiscoveryService` plus core remote providers/factories | Store-backed discovery with no feature removal |
| `DS-UC018C` | Primary End-to-End | UC-018 / BEH-013 | selected AutoByteus-runtime LLM/audio/image model | authenticated remote result | generic LLM/media provisioning then `AutobyteusClient` | runtime-aware credential ownership |
| `DS-UC018D` | Primary Operational | UC-018 / BEH-004, 013 | fresh-worktree AutoByteus live scenario | sanitized real discovery/invocation evidence | live E2E harness | regression proof with no key environment |
| `DS-UC019A` | Primary Operational | UC-019 / BEH-014 | PNPM CLI with optional leading separator, absolute source, explicit target, `--dry-run` | value-free populated-selected-definition plan | `LocalEnvironmentSecretImportService` | recognize-first/empty-as-absent safe preview with zero writes |
| `DS-UC019B` | Primary Operational | UC-019 / BEH-014 | confirmed target `default` import | atomic default Store batch + restart instruction | `LocalEnvironmentSecretImportService` | explicit normal-local provisioning without implicit overwrite |
| `DS-UC019C` | Primary Operational | UC-019 / BEH-014 | confirmed target `e2e` import | atomic real-E2E Store batch + preflight instruction | `LocalEnvironmentSecretImportService` | explicit test-custody provisioning without default access |
| `DS-UC020` | Primary Operational | UC-020 / BEH-015 | approved latest dependency update and clean install | unpatched exact `1.0.8` plus value-free static/import/log/build/lifecycle evidence with unchanged Prisma/data owners | package/dependency integration | clean replacement without runtime ownership drift, query-log regression, dotenv discovery, or legacy patch retention |
| `DS-RET001` | Return-Event | UC-001–006, 011, 013, 015, 016, 019 | storage/config/import/legacy-read outcome | backend health plus healthy-only definition/import state or value-free legacy reconfiguration guidance | configuration/initiating service | complete degraded/value-free status semantics |
| `DS-RET002` | Return-Event | UC-007, 008, 010, 012, 017 | provider/runtime response/error | normalized product/test result | client + initiating use-case owner | provider/runtime return behavior |
| `DS-LOC001` | Bounded Local | UC-001, 005, 006, 011 | validated exact Local Store record command | committed ciphertext + status | `LocalEncryptedSecretRepository` | one crypto/persistence owner |
| `DS-LOC002` | Bounded Local | UC-011 | explicit exact-Store reset confirmation | selected DB/key/sidecars deleted after handles close | Local Store reset owner | safe destructive reset |
| `DS-LOC003` | Bounded Local | UC-019 / BEH-014 | file-safe source plus populated selected current aliases and selected target | all planned records committed or none; empty recognized and unrecognized lines absent from the plan | `LocalEnvironmentSecretImportService` + recognize-first/empty-as-absent scanner + internal Local setup batch | populated-selected parse/plan/confirm/transaction/cleanup inside one owner boundary |

## Primary Execution Spine(s)

- `DS-UC001`: `ProviderApiKeyEditor -> Pinia action -> provider GraphQL mutation -> LlmProviderService -> SecretManagementService -> active writable backend -> custody record`.
- `DS-UC002A`: `CustomProviderEditor -> GraphQL -> LlmProviderService ID allocation/probe -> metadata-only store -> SecretManagementService/backend -> runtime/model catalog sync -> Settings result`.
- `DS-UC002B`: `Settings delete -> GraphQL -> LlmProviderService -> SecretManagementService remove -> metadata store remove -> model catalog sync -> result`.
- `DS-UC003`: `Deployment/Settings config -> typed transport -> SecretStorageConfigurationService -> typed validation -> candidate factory/health probe -> config repository -> restart-required status`.
- `DS-UC004`: `Electron/direct/normal Docker/single Kubernetes server Pod/host-test start -> bootstrap -> Local Store config -> backend factory -> in-process Local backend -> exact database/key open -> management/provisioning ready`.
- `DS-UC005`: `Writable initialization or read-only bootstrap -> pair presence/permission check -> open SQLite -> validate format and authenticated store_id/key verifier -> READY handle or LOCKED/UNAVAILABLE/CORRUPT/INCOMPATIBLE health`.
- `DS-UC006A`: `Hidden trusted input -> E2E provisioning service -> E2E Store encryption -> exact target record -> checkpoint/close -> status`.
- `DS-UC007`: `AgentRunBackendFactory -> LLMProvisioningService -> SecretManagementService/backend -> LLMFactory -> concrete LLM/SDK -> real provider -> normalized response`.
- `DS-UC008A`: `Search tool -> injected executor -> SearchProvisioningService -> management/backend -> search strategy/client -> provider -> result`.
- `DS-UC008B`: `Media service/tool -> MediaClientProvisioningService -> management/backend -> media factory/client -> provider -> result`.
- `DS-UC008C`: `Web model list/reload -> GraphQL/LlmProviderService -> ModelCatalogService -> ModelMetadataProvisioningService -> explicit GEMINI_SETUP_MODE -> AI Studio or Vertex Express exact llmMetadata consumer -> SecretManagementService/backend -> selected SecretValue reveal -> existing GeminiModelMetadataProvider -> Generative Language models request/response mapping -> ModelMetadataResolver live-over-curated merge -> refreshed catalog`; `VERTEX_PROJECT -> zero metadata secret lookup -> curated catalog`.
- `DS-UC009`: `Default test command -> classified fixture -> in-memory backend or disposable Local Store synthetic canary -> normal subject path -> fake provider -> assertions`.
- `DS-UC010`: `Fresh host worktree -> tracked manifest -> live harness -> canonical host E2E Store read-only open/preflight -> Store-bound server -> browser/API product path -> real provider -> sanitized evidence`.
- `DS-UC012`: `Docker/single-Pod Local config -> node-local Store -> ready`; or `unregistered enterprise kind -> configuration validation -> value-free unsupported-kind guidance`. Multi-node centralized execution is deferred.
- `DS-UC013`: `Settings load -> GraphQL status -> configuration service/active backend descriptor -> tagged lifecycle projection -> enabled controls or instruction code`.
- `DS-UC014A`: `Governed agent/application-worker trigger -> AgentExecutionSecurityContext -> file-tool root policy + empty-base env/descriptor allowlist -> runtime -> sanitized result + LOCAL_HARDENED report`; no same-user isolation claim.
- `DS-UC014B`: `Codex runtime selection -> existing CodexAppServerClient manager -> CodexAppServerClient.start -> pre-ticket options.env ?? process.env plus real HOME/CODEX_HOME -> codex app-server -> Codex-owned login state -> model/thread/turn result or existing sanitized failure`; no SecretManagementService call, Store consumer, account RPC, fallback, or `LOCAL_HARDENED` environment claim.
- `DS-UC015`: `Server startup -> non-secret configuration reader -> exclude sensitive names without retention -> current custom-provider reader -> v2 metadata or value-free v1 reconfiguration guidance -> current Store-only runtime`; neither legacy source is written.
- `DS-UC016`: `Conformance runner -> InMemory or Local variant or test-only external fixture -> declared lifecycle/health suite -> pair/fault/redaction/no-fallback assertions`.
- `DS-UC017`: `Claude model-discovery/run request -> ClaudeSdkClient public boundary -> ClaudeRuntimeAuthenticationService -> cli (zero lookup) or managed SecretManagementService.resolveForUse(exact runtime consumer) -> return closed auth to client -> internal empty-base exact-child environment -> Claude Code child -> redacted result/error`; invalid/non-ready branches stop before spawn without fallback.
- `DS-UC018A`: `AutoByteus provider editor -> existing provider GraphQL/service -> SecretManagementService save/remove/status (llm/AUTOBYTEUS/apiKey) -> provider.autobyteus.api-key -> value-free credential status -> save: established reload-all trigger; remove: authoritative AutoByteus runtime-subset clear with zero lookup`.
- `DS-UC018B`: `startup/list/reload -> server model provider -> AutobyteusRemoteModelDiscoveryService -> no hosts ? zero lookup : resolveForUse(modelDiscovery/<kind>/AUTOBYTEUS/apiKey) -> core remote provider -> AutobyteusClient catalog request -> parsed models with credentialProviderId=AUTOBYTEUS -> factory replace corresponding AUTOBYTEUS-runtime subset -> server cache/UI`.
- `DS-UC019A`: `PNPM entrypoint -> optional-sentinel normalization + option validation -> source trust/open identity + size/encoding safety -> recognize exact positive alias names -> parse valid recognized assignments -> normalized empty becomes absent -> validate populated selections only + exact current alias resolution -> ignore all unrecognized lines -> catalog validation -> selected target status -> dry-run plan -> value-free IDs/counts -> source/target close and selected-buffer cleanup`.
- `DS-UC019B`: `PNPM entrypoint (--target default) -> validated plan/target status -> optional --overwrite policy -> exact IMPORT DEFAULT STORE TTY confirmation -> staged selected-pair initialization if required -> LocalSecretStoreProvisioningService.provisionBatchExact -> one default-Store record transaction/checkpoint -> value-free counts + restart-required instruction`.
- `DS-UC019C`: `PNPM entrypoint (--target e2e) -> validated plan/target status -> optional --overwrite policy -> exact IMPORT REAL-E2E STORE TTY confirmation -> staged selected-pair initialization if required -> LocalSecretStoreProvisioningService.provisionBatchExact -> one real-E2E record transaction/checkpoint -> value-free counts + preflight instruction`.
- `DS-UC020`: `approved latest-library request -> autobyteus-server-ts/package.json selects repository_prisma ^1.0.8 -> pnpm resolves the attested 1.0.8 artifact -> obsolete repository_prisma patchedDependencies metadata/file is removed -> exact installed dotenv-free ESM/CJS entrypoints enter empty-temp-cwd/empty-base-env children -> narrow synthetic Prisma interception -> import-only zero-acquisition check -> isolated default/explicit log-policy check -> clean/frozen install and production build -> existing lazy-owner/restart/reopen regressions -> value-free dependency evidence`.
- `DS-UC018C`: `remote model selection -> generic LLM/media provisioning -> describe target -> credentialProviderId AUTOBYTEUS -> resolve exact llm/media consumer -> construction context -> AutobyteusLLM/audio/image client -> remote request -> normalized result`.
- `DS-UC018D`: `fresh worktree -> tracked non-secret hosts/scenario -> read-only real-E2E Store -> exact definition preflight -> product discovery/construction path -> real AutoByteus endpoint -> sanitized evidence and capability report`.

## Spine Narratives (Mandatory)

| Use Case(s) | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| UC-001 | A write-only key crosses transport once, is stored atomically through management, and returns only status. | provider subject, management, backend | provider service / management | validation, binding, redaction |
| UC-002 | Provider service coordinates transient probe, metadata-only persistence, derived secret lifecycle, and runtime sync. | provider, metadata record, credential definition, model catalog | provider service | URL policy, compensation, redaction |
| UC-003/004/011 | Configuration selects one backend; startup constructs it; the in-process Local backend owns exact Store open/close/concurrency while reset names one Store. | backend configuration, bootstrap, Store handle | config service/bootstrap/Local backend | path normalization, format validation, health, locking |
| UC-005/006 | Local backend authenticates the Store/key pair even when empty; trusted setup directly provisions the separate E2E Store and cannot open the default Store. | physical Store, pair verifier, exact secret record | Local backend / setup service | KDF/AEAD, staged creation, checkpoint/close |
| UC-007 | LLM provisioning resolves semantic auth, factory composes config, and concrete LLM owns the provider call. | provisioning, factory, LLM/SDK | provisioning then LLM | binding catalog, error sanitizer |
| UC-008 | Search, media, and metadata retain separate subject-specific provisioning paths while sharing management/value contracts. | subject provisioning, client, provider | respective subject owner | provider selection, result normalization |
| UC-009/010 | Synthetic default coverage and host real-provider coverage have separate custody/setup paths but exercise normal subject contracts; existing Docker deployment is independent and unchanged. | harness, backend/Store, product path | corresponding test harness | source-review workflow prerequisite, host path derivation, preflight, evidence scan |
| UC-012/014 | Local Docker/single-Pod nodes use Local custody. Governed launchers remove ambient state and report lower-tier assurance; the established Codex external runtime preserves Codex-owned login environment/home and is expressly excluded from that claim. Centralized custody and strong worker separation are deferred. | server control, Local adapter, governed execution launcher, external Codex client | deployment/execution owners plus `CodexAppServerClient` for its existing path | no shared SQLite, no inflated assurance, no Codex auth subsystem |
| UC-013 | A tagged lifecycle capability drives value-free writable/external UI state without contradictory booleans. | configuration descriptor, Settings state | config service projection | localization/instruction mapping |
| UC-015 | Current readers leave legacy sources untouched and prevent their credential fields from becoming runtime authority. | non-secret config projection, current custom-provider store | respective current reader owner | sensitive-name exclusion, value-free v1 guidance, zero source/Store mutation |
| UC-016 | One suite proves InMemory/Local and the external capability fixture against declared behavior and complete health states. | suite, fixture, adapter | conformance suite | pair fault injection, cleanup |
| UC-017 | Claude authentication explicitly selects external CLI with no resolution or managed-secret with catalog-authorized JIT resolution and exact-child delivery; every outcome is sanitized and fallback-free. | Claude auth service, management, SDK client, exact child | Claude auth service then SDK client | child environment builder, safe tool/settings policy, early diagnostic redaction |
| UC-018 | Existing AutoByteus gateway Settings, discovery, reload, and LLM/audio/image invocation remain intact while one Store-backed definition replaces the ambient alias. | provider subject, remote discovery service, model factories, generic construction provisioning, `AutobyteusClient` | provider service for lifecycle; discovery service for catalogs; generic provisioning for invocation | host validation, runtime-scoped replacement, last-known-good behavior, redaction, capability-aware real coverage |
| UC-019 | A trusted operator invokes one committed command with an explicit absolute source file of any name/extension and explicit physical target role. The importer validates file safety, recognizes only catalog-approved aliases, parses valid recognized assignments, treats normalized-empty values as absent, validates/plans only populated selected credentials, ignores all unrecognized lines without metadata, builds a value-free create/skip/replace plan, and either previews it or commits the confirmed plan atomically to exactly one Store. | operator command, populated selected import plan, target Store | `LocalEnvironmentSecretImportService` | PNPM adapter, source trust verifier, recognize-first/empty-as-absent scanner, immutable positive alias registry, TTY confirmation, redaction |
| UC-020 | Package integration cleanly replaces current patched `1.0.6` state with exact unpatched `1.0.8`, removes obsolete package policy code, and proves dotenv-free/import-safe/default-off-log/lifecycle compatibility without changing any runtime database owner or persisted data. | dependency declaration, resolved artifact, obsolete patch removal, isolated probe, compatibility evidence | package/dependency integration | npm provenance, clean frozen resolution, empty-cwd/empty-env ESM/CJS instrumentation, query-log policy, sanitized build/regression evidence |

## Spine Actors / Main-Line Nodes

| Node | Direct Role On Spine | Not Its Responsibility |
| --- | --- | --- |
| Settings/startup transport | map external input to typed subject command | secret policy, backend calls, identity invention |
| `SecretStorageConfigurationService` | validate/persist non-secret adapter selection and report restart requirement | provider credential lifecycle/bootstrap-secret storage |
| Provider/search subject service | coordinate subject metadata and credential lifecycle transaction | custody implementation |
| `SecretManagementService` | authoritative lifecycle/resolution/status/events | vendor mechanics, UI, model config composition |
| `SecretStorageBackend` | exact-definition custody operations and tagged lifecycle capability | catalog policy, consumer mapping, or caller-selected physical path |
| Subject-specific provisioning service | describe its semantic consumer, request resolved authentication, then construct its client | catalog lookup, encrypted persistence, or another consumer family's behavior |
| `AutobyteusRemoteModelDiscoveryService` | resolve exact model-kind discovery consumer, call core remote provider, publish runtime-scoped catalog result | Settings lifecycle, Store mechanics, construction-time resolution, or model-provider rewriting |
| `LLMFactory` / client factory | model lookup/default composition and construction | secret resolution/Store selection |
| Concrete client/SDK | authenticated provider request/stream | storage backend or serializable credential config |
| In-process Local backend | exact Store open/close, encryption, transactions, format/permission validation | product consumer policy, GraphQL, or alternate-Store selection |
| Agent execution security context/launcher | derive/enforce the governed runtime capability envelope | secret resolution or Codex external-auth launch |
| `CodexAppServerClient` | preserve the established external Codex process launch and Codex-owned login/configuration state | Store resolution, account/login RPC, auth status/rotation, synthetic account home, or `LOCAL_HARDENED` environment claim |
| `ClaudeRuntimeAuthenticationService` | select exact mode, own the Claude managed consumer, resolve JIT, map subject failures | child environment construction, backend/catalog access, raw-value serialization |
| `ClaudeSdkClient` | build exact child environment/options, spawn SDK child, redact diagnostics, drop temporary references | mode fallback, catalog/backend lookup, accepting caller env |
| Live test harness | tracked scenario interpretation, preflight, run cleanup/evidence | global key exposure or fake-only substitution |
| `LocalEnvironmentSecretImportService` | validate the canonical import request and selected current credentials; derive a value-free plan; require confirmation; coordinate one atomic setup batch | validation of unknown source content, runtime resolution, generic Store selection, arbitrary definition/path input, source mutation, test execution |
| Local import source verifier/parser | establish file identity/access and parse approved assignments without evaluation | target selection, overwrite policy, persistence, logging values |
| non-secret application configuration reader | project approved non-secret names while leaving the legacy file unchanged | retaining/exposing sensitive assignments, rewriting source, secret fallback |
| current custom-provider store | accept/write metadata-only v2 or return value-free legacy reconfiguration guidance | v1 credential/metadata conversion, automatic file mutation, Store provisioning |
| package/dependency integration | keep the server manifest, exact `1.0.8` lock resolution, obsolete patch removal, isolated entrypoint-probe boundary, and focused compatibility evidence consistent | retaining a local/legacy package patch or old resolution, project-cwd/parent-env access, adopting the package as a production database owner, changing Prisma/schema/data, or emitting dotenv/query/path/URL evidence |

## Ownership Map

- **Secret storage configuration** owns typed non-secret adapter choice, validation, persistence, health probe, and restart-required status. Phase 1 does not hot-swap the active backend.
- **Secret management** is the sole authoritative public server boundary for catalogued secret lifecycle/resolution; it encapsulates definition validation, tagged lifecycle capability, policy, errors, and operation events.
- **Provider/search services** own the transaction between their subject metadata and secret lifecycle. They do not own storage.
- **Consumer provisioning** owns mapping its concrete runtime request to a semantic consumer/credential slot and then to construction authentication; `SecretManagementService` alone maps that identity to a definition.
- **AutoByteus remote discovery** owns only JIT discovery authentication and LLM/audio/image catalog synchronization. It reuses management, does not access a backend directly, and does not own runtime construction. No configured hosts means no resolution and authoritative clear of that model-kind AutoByteus subset. A transient pre-authoritative configured-host refresh failure preserves the last-known-good remote subset; a successful authoritative result replaces only that model kind's AutoByteus-runtime subset. An explicit successful credential removal is authoritative lifecycle input and clears all AutoByteus-runtime subsets without discovery.
- **Core factories** own effective runtime configuration and construction contracts; they do not reach upward to server services.
- **Local backend** owns database/key pairing, staged creation, authenticated pair-verifier validation, open/close, encryption, transaction/busy policy, access mode, and schema/encryption/verifier-format validation for one Store. SQLite coordinates bounded host readers/writers; no standalone Store process exists.
- **Local Store hidden-input setup** owns trusted direct E2E provisioning against only the target E2E backend; it has no source/default backend dependency and is not a runtime API.
- **Local environment-secret import** is a separate trusted operator boundary. Its thin CLI owns optional PNPM-sentinel normalization and option/TTY adaptation. The source reader owns source trust/identity, file-level safety, recognize-first positive selection, selected-only parsing, and immediate discard of unrecognized lines without metadata. `LocalEnvironmentSecretImportService` owns catalog validation, create/skip/replace planning, target-specific confirmation, atomic batch coordination, and value-free output. Its closed `default|e2e` selector resolves internally to one canonical Store pair; neither a caller nor a source file can supply a path, definition, backend, or target.
- **Agent execution security** owns first-delivery child environment/descriptor composition and built-in file-tool roots for governed launchers only. Codex is an explicit external-runtime exclusion and stays on the pre-ticket `CodexAppServerClient` path. Separate identity/container/network enforcement is a future owner extension, not a shipped claim.
- **Codex App Server client** preserves external Codex-owned authentication and real HOME/CODEX_HOME through the pre-ticket `options.env ?? process.env` launch. AutoByteus owns no Codex credential lifecycle, account API, or assurance over inherited state.
- **Claude runtime authentication service** owns exact `cli|managed-secret` mode selection, the managed consumer identity, JIT call to `SecretManagementService`, and value-free failure mapping. It never accesses the catalog/backend directly or builds the child environment.
- **Claude SDK client** owns last-mile empty-base environment construction, managed tool/settings controls, exact child spawn, reference lifetime minimization, and early diagnostic redaction. Sessions/model catalog cannot supply an environment or receive authentication.
- **Non-secret configuration reader** owns name-first admission of approved non-secret entries, preservation of excluded source lines on explicit non-secret writes, and denial of sensitive names through `get`, `getAll`, and persistence. It never mutates legacy credential lines automatically.
- **Current custom-provider store** owns metadata-only v2. A v1 file is left untouched and returns stable value-free reconfiguration guidance; the operator removes/moves it and recreates providers explicitly.
- **Package/dependency integration** owns the `repository_prisma@1.0.8` declaration, exact resolved artifact, removal of obsolete patched-dependency metadata/file, safe ESM/CommonJS probe composition, and install/import/log/build regression evidence. Its test child starts from empty cwd/environment and delegates only through narrow synthetic Prisma interception. The dependency's internal lifecycle is not an AutoByteus runtime owner; AppConfig/configured-client and bounded lazy owners remain authoritative.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| provider/search GraphQL resolvers | subject service + secret management | existing API transport and UI mapping | backend/Store choice, plaintext retention |
| backend Settings/startup resolver | storage configuration service | typed external configuration | backend bootstrap identity or secret lifecycle |
| `LLMFactory` static entry | factory registry/composer | preserve established core construction entry | resolution/backend access |
| `LocalSecretStorageBackend` | local encrypted repository | server-side in-process backend implementation | management/catalog policy or caller-selected alternate Store |
| server model-provider wrappers | `AutobyteusRemoteModelDiscoveryService` + core factories | preserve established startup/list/reload entry points while moving resolution above core | ambient key reads, backend access, downstream-provider credential guessing |
| `pnpm secrets:local:import` | `LocalEnvironmentSecretImportService` | stable repository operator entrypoint and option/TTY adapter | parser policy, mapping, Store paths, transactions, shell evaluation, or secret output |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| `AppConfig` credential get/set and `.env` writes | generic config is not custody | subject services + management/backend | In This Change | retain non-secret config only |
| provider/search/media/metadata `process.env` reads | ambient, duplicated, inheritable | construction authentication/provisioning | In This Change | no fallback |
| AutoByteus discovery-call removal | removes supported configured-host behavior rather than legacy code | server-owned explicit-auth discovery and runtime-scoped factory synchronization | In This Change | preserve startup/list/full/provider reload plus LLM/audio/image invocation |
| global dotenv credential test setup and live key gates | broad exposure/worktree copies | tracked manifest + Store/harness | In This Change | `.env.test` only if verified non-secret |
| custom-provider JSON `apiKey` and endpoint key fields/defaults | plaintext duplicate custody | derived definition + resolved context | In This Change | current store accepts v2 only; v1 stays untouched and requires operator cleanup/recreation |
| public `googleSpeechApiKey` config | browser exposure/no supported owner | remove | In This Change | no replacement unless future server consumer |
| unsupported Google CSE credential setting | current core rejects provider | remove active UI/config aliases | In This Change | no compatibility |
| unrestricted absolute-path behavior in built-in file tools | reaches custody/host data | authorized realpath policy | In This Change | process tools also need sandbox |
| `{...process.env}` child launch patterns | passes trusted state | runtime-specific allowlist | In This Change | centralized policy |
| Claude Agent SDK `auto` and `api-key`, ambient alias selection, parent-env spread, and caller `env` | hidden fallback and broad state delivery bypass central custody | exact `cli` or `managed-secret`; managed JIT resolution and exact-child environment | In This Change | native Anthropic and managed Claude identities reuse one definition independently |
| Claude user/project/local settings, hooks/plugins/API-key helper/external MCP and built-in tools in managed mode | can inspect/propagate child environment or create inheriting descendants | empty setting sources, `tools: []`, strict explicitly materialized AutoByteus MCP, sanitized server-owned tool children | In This Change | CLI mode remains external auth but still uses purpose-built environment |
| raw-before-redaction Claude diagnostics | managed key may enter memory/log/session evidence before sanitizer | redact on append and at outward formatting; stable subject error codes | In This Change | no raw stderr in product events/artifacts |
| compatibility provider constructor overloads | enable old env/config path | one context constructor | In This Change | update all callers/tests together |
| automatic `runLegacySecretCutoverMigration` startup call, file rewriter, and ledger | user rejected every automatic legacy data update | current-reader non-authority plus explicit importer/operator cleanup | In This Change | remove rather than replace with another migration owner |
| duplicated importer eligibility policies | a positive map plus negative secret-like classifier drifts and rejects unrelated content | one immutable positive alias registry owns import eligibility; non-secret configuration may reuse its names for exclusion but its broader predicate never flows back into import | In This Change | current runtime definitions still contain no environment aliases; ZHIPU remains unmapped |

## Return Or Event Spine(s) (If Applicable)

`DS-RET001`: `backend initialization/operation -> SecretStorageConfigurationService health normalization -> READY ? management MISSING/CONFIGURED status : null definition state + value-free instruction -> subject projection -> GraphQL/UI/CLI/preflight`.

Health is exactly `READY`, `LOCKED`, `UNAVAILABLE`, `CORRUPT`, or `INCOMPATIBLE`. Only `READY` permits definition status, resolve, or lifecycle; definition state is exactly `MISSING` or `CONFIGURED`. Non-ready bootstrap starts only the value-free configuration/Settings/health control plane, disables writes and provider construction, and maps to stable instruction codes. A subject service may separately compose provider validation only when backend health permits it. No path exposes values, fragments, hashes, lengths, storage revision/timestamp, physical address, bootstrap identity, request headers, or raw provider error bodies.

## Bounded Local / Internal Spines (If Applicable)

### DS-UC011 Local backend open/concurrency

- Parent owner: `LocalSecretStorageBackend`.
- Flow: `normalize configured paths -> validate pair presence/permissions/access mode -> open SQLite -> validate schema/encryption/verifier format -> authenticate store_id pair verifier with derived key -> configure read-only or bounded transaction/busy behavior -> READY backend`; failures map to exact degraded health.
- Importance: Electron/direct/Docker servers use the same in-process implementation with server-local defaults; multiple host worktrees read one prepared host E2E Store without another process or routine human steps.

### DS-LOC001 Local Store encrypted record write

- Parent owner: Local encrypted repository inside the Local backend.
- Flow: `validate definition ID -> derive Store encryption key from that Store's independent root key -> authenticated encrypt with fresh nonce and bound associated data -> SQLite transaction -> durable commit -> return status`.
- Importance: keeps cryptography/crash consistency inside one auditable owner. Vetted library only; no proprietary algorithm.

### DS-LOC002 Explicit Local Store reset

- Parent owner: exact-Store reset service in the server/local-storage subsystem.
- Flow: `explicit exact-Store confirmation -> stop new operations and close local backend handle -> acquire DB/filesystem exclusion -> delete selected DB + independent key + SQLite sidecars -> value-free reset status`.
- Importance: ordinary server-data reset preserves both physical Stores; destructive reset cannot race an open handle or delete every Store by omission.

### DS-LOC003 Local environment import batch

- Parent owner: `LocalEnvironmentSecretImportService`, using an internal setup-only Local repository batch operation.
- Flow: `normalize optional sentinel + validate options/closed target -> verify/open source identity -> enforce bounded UTF-8/no-NUL -> scan exact names -> parse/validate only recognized assignments -> resolve ordered positive aliases/catalog -> discard every unrecognized line without metadata -> target status snapshot (READY or both-absent INITIALIZATION_REQUIRED; partial pair CORRUPT) -> derive create/skip/replace plan -> dry-run return or exact TTY confirmation -> staged selected-pair initialization if required -> one SQLite transaction for all planned records -> checkpoint/close -> value-free selected IDs/action counts -> best-effort selected-buffer cleanup`.
- Importance: turns a deliberately trusted plaintext transition into one auditable owner and one all-or-nothing target mutation. It does not widen `SecretManagementService`, the general backend port, runtime startup, or the test harness with a bulk-import API.

### Authenticated Store/key pair check

- Parent owner: Local Store initializer/crypto inside `LocalSecretStorageBackend`.
- Flow: `read store_id + verifier metadata -> derive pair-verifier key from root key with HKDF domain -> AES-GCM authenticate fixed verifier plaintext with format/store_id AAD -> READY or CORRUPT`.
- Importance: closes MP-001 when `secret_records` is empty. Read-only open performs the same check; missing verifier in the declared current format is `CORRUPT`, while an unsupported verifier/Store format is `INCOMPATIBLE`.

## Off-Spine Concerns Around The Spine

- The exact Gemini resolved-auth variants and Google SDK constructor serve LLM/media only. They own no metadata request, credential lookup, or retry policy.
- `GeminiModelMetadataProvider` remains the separate established key-authenticated Generative Language adapter. `ModelMetadataResolver` remains an off-spine merge/failure-containment concern for `ModelMetadataProvisioningService`; curated data cannot authorize another credential lookup or restore ambient custody.
| Concern | Spine IDs | Serves Owner | Responsibility | Why | Risk If Main-Line/Misplaced |
| --- | --- | --- | --- | --- | --- |
| Secret binding catalog | UC-001, 002, 007, 008 | management | stable definitions and allowed semantic consumers | central semantic policy behind the authoritative service | adapters learn product subjects or callers bypass management with duplicate bindings |
| Sensitive error sanitizer | all | every trusted boundary | redact errors/logs/traces/artifacts | return paths leak too | scattered denylist misses shapes |
| Provider credential validator | UC-001, 002 | subject service | optional provider probe and sanitized validation state | storage != validity | backend couples to provider APIs |
| Backend configuration repository | UC-003, 004, 012, 013 | config service/bootstrap | persist typed non-secret config | independent configuration plane | bootstrap secrets enter AppConfig/UI |
| Local Store path composer | UC-003, 004, 010, 011 | server bootstrap/live launcher | derive normal database/key paths below serverDataDir or explicit host E2E paths | Git needs only canonical host E2E filenames/access mode; Docker uses its existing data dir | runtime caller selects arbitrary path or worktree uses local custody |
| Operation event sink | UC-001, 002, 007, 008 | management | value-free lifecycle/resolve evidence | observability | fabricated identity or secret fields |
| Sensitive configuration-name admission policy | UC-015 | non-secret `AppConfig` reader | admit approved non-secret names and reject sensitive/legacy aliases before value retention | keep legacy source usable for non-secret settings without making it credential authority | copied credential values, implicit source rewrite, generic secret-name access |
| Legacy custom-provider status mapper | UC-015 | current custom-provider store | map v1 detection to one value-free reconfiguration code | UI/operator needs actionable failure without conversion | v1 provider/value projection, raw parse error, automatic metadata preservation |
| Source-review execution rule | UC-010 | software-team workflow | run direct-secret coverage only after implementation source review | test code can exfiltrate by design | invented runtime attestation flag or false security claim |
| Platform sandbox adapters | UC-012, 014 | execution launcher | OS/container-specific enforcement | allowlist alone insufficient | policy claims without enforcement |
| SSRF/base-URL policy | UC-002, 007, 008 | custom provider service/client | validate destination/redirect/private-network rules | key can be sent to configured endpoint | agent-controlled exfiltration URL |
| import source trust verifier | UC-019 | local importer | regular-file, symlink, owner, private-access and open/fstat identity checks | source bytes are intentionally trusted only after identity is fixed | parser opens a raced/link/untrusted file or mutates ACLs |
| recognize-first source scanner + positive alias registry | UC-019 | local importer | identify exact current aliases, parse/validate only selected values, map Qwen only from `DASHSCOPE_API_KEY`, and discard every unrecognized line without interpreting or describing its right-hand side | one bounded explicit transition with cohesive positive policy | current runtime learns aliases; a second negative classifier returns; unknown content is decoded/retained; ignored-line metadata appears; or generic dotenv/shell behavior appears |
| target-specific TTY confirmation | UC-019 | local importer | direct terminal proof of the already validated target/plan | default Store replacement has higher operator consequence | shell wrapper bypass or confirmation text contains values/paths |
| Local import target resolver | UC-019 | local importer composition | map closed target role to production canonical pair; allow only constructor-injected temporary resolver in tests | production CLI cannot safely test canonical Stores or accept path overrides | CLI/environment path flags or hard-coded tests mutate real custody |

## Ownership Boundaries

1. **Transport -> subject service:** transport drops raw input immediately after constructing `SecretValue`; it cannot access backends or expose generic read/list.
2. **Subject service -> management:** subject service owns provider metadata transaction; management owns every credential lifecycle and resolution invariant.
3. **Management -> backend:** management passes one catalog-validated definition ID to one injected port; physical Store/prefix mapping and custody mechanics remain encapsulated below it.
4. **Provisioning -> factory/client:** provisioning resolves authentication; factory composes config; client unwraps only at SDK construction. Neither side reaches around the other.
5. **Server bootstrap -> Local backend:** factory supplies one exact database/key/access configuration; the in-process backend opens it and owns repository format/crypto. Requests above management carry no Store/path selector.
6. **Trusted server -> agent:** only bounded requests/results cross. Custody database/key files, backend handles, workload identity, parent environment, and unrelated resolved values stay on the server side. Explicit Claude managed mode is the one exception: the exact Claude child receives one catalog-authorized Anthropic value and becomes a trusted agentic secret consumer; no sibling/tool/other child receives it.
7. **Claude auth service -> SDK client:** the service supplies a closed authentication union only; the client unwraps managed `SecretValue` at exact child environment construction. Session/catalog callers cannot depend on either management or authentication internals.
8. **Legacy sources -> current readers:** application `.env` remains immutable input only for approved non-secret projection; custom-provider-v1 is not current data and yields value-free guidance. Neither credential source becomes runtime authority.
9. **PNPM command -> local importer -> target Local Store:** the command passes only typed options. The importer validates and owns the transition, while the setup repository owns one target's atomic encrypted batch. The command never imports repository internals, and normal services never call the importer.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Callers Must Use | Forbidden Bypass | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SecretManagementService` | catalog validation, lifecycle capability, lifecycle/resolution, errors/events | subject and provisioning services | caller -> adapter; caller -> catalog + backend | add subject-specific request method/type, not expose internals |
| `SecretStorageConfigurationService` | config schema/repository/validation/restart-required status and five-state backend health/degraded control plane | startup and Settings config resolver | Settings -> backend factory/identity | expand typed configuration/health API |
| each subject-specific provisioning service | semantic consumer selection, resolve request, authentication mapping, client construction | its agent/tool/media/metadata owner | runtime -> management + factory separately | add explicit subject method rather than a generic coordinator |
| `LLMFactory` | model registry, defaults, context construction | provisioning and trusted core callers | provisioning directly `new`s LLM while also using factory | expose construction target and creation input |
| `LocalSecretStorageBackend` | one Store's pair validation, format, encryption, transaction/access mode | backend factory and management through port | caller/subject opens DB; runtime selects another Store | add exact internal repository operation, never expose database handle |
| `LocalSecretStoreProvisioningService` | target-bound Local open/initialize/write/checkpoint/close lifecycle, including one-record hidden input and internal atomic batch | hidden E2E setup and `LocalEnvironmentSecretImportService` only | source parsing/mapping/target policy, caller-opened repository/backend, runtime/GraphQL provision, arbitrary target path, readback | construct each service instance with one exact selected writable `LocalStoreConfiguration` plus Local opener/initializer dependencies |
| `LocalEnvironmentSecretImportService` | canonical request, selected current credentials, target plan/confirmation, and value-free outcome for one explicit local transition | PNPM CLI adapter only in production; constructor-injected synthetic fixtures in tests | runtime/test runner/API/GraphQL/MCP call; validation of unknown lines; CLI Store paths/definition IDs/values; direct repository access | keep a typed request/result, recognize-first source port, internal target-resolver seam, and narrow confirmation port whose production adapter is direct TTY; do not add generic import/list/read methods |
| Local encrypted repository setup batch | atomic encrypted writes plus in-transaction create/replace precondition revalidation for one selected writable Store | `LocalSecretStoreProvisioningService` only | general backend port bulk-write; caller opens SQLite; cross-Store transaction; silent plan drift | service exposes internal setup-only `provisionBatchExact`; repository owns the transaction and aborts changed plans |
| execution launcher/security boundary | first-delivery file roots and empty-base environment/descriptor enforcement | agent-controlled spawners and supported application workers governed by this ticket; Codex is explicitly excluded | governed spawner uses parent env/direct spawn, or any caller claims Codex is covered or claims strong isolation | add launcher adapter/capability for the governed path; never wrap the external Codex path |
| `ClaudeRuntimeAuthenticationService` | exact mode, managed consumer, JIT resolution, subject error mapping | `ClaudeSdkClient` only | session/model catalog resolves directly; service imports catalog/backend; automatic fallback | expose one `prepareForLaunch` result |
| `ClaudeSdkClient` | exact child environment/options, spawn, cleanup, early diagnostics | session/model catalog callers | caller-supplied env; parent spread/mutation; direct management/backend calls | keep one internal launch builder used by model discovery and runs |
| non-secret `AppConfig` reader | sensitive-name exclusion, approved non-secret projection, source-preserving non-secret updates | startup and current config callers | generic getter returns sensitive aliases; writer drops/rewrites excluded lines | strengthen name-first reader/writer without a migration owner |
| current custom-provider store | v2 metadata-only read/write plus value-free v1 guidance | provider service/Settings | v1 conversion, `apiKey` projection, automatic source update | expose explicit current-schema status, not legacy data |

## Dependency Rules

1. `autobyteus-ts` may define secret-safe value/authentication/construction and execution-security contracts. It never imports server management/backends/catalog/Store configuration.
2. `autobyteus-server-ts` consumer provisioning depends on core factory contracts and server `SecretManagementService`.
3. `SecretManagementService` depends on the backend port and catalog; not concrete adapters.
4. Concrete adapters depend inward on the port and outward on their vendor/local clients. Other server domains do not import adapters.
5. Configuration service/factory constructs one backend; requests cannot select backend/Store/path.
6. GraphQL resolvers use subject services/config service; no generic resolve/list/value API.
7. LLM/search/media/metadata classes do not read provider credentials from environment/config stores.
8. Local persistence files remain internal to server secret management and do not import provider catalogs, GraphQL, LLMs, or subject services.
9. Agent launchers governed by this ticket receive an explicit security context built from an empty environment baseline; no governed launcher spreads/clones trusted `process.env`. Codex App Server is the explicit exclusion and retains its single pre-ticket external-login environment/home path.
10. Test code uses the manifest/harness; no secret dotenv import, importer invocation, or other-checkout discovery. The operator may invoke the import command before a test run, but the runner cannot.
11. Missing/non-ready backend/Store/value is typed. No adapter, alternate Store, environment, or legacy fallback.
12. Claude CLI mode never calls management; managed mode calls only `SecretManagementService.resolveForUse` with the exact runtime identity. The SDK client never calls management/backend or accepts caller env. Only the exact managed child receives `ANTHROPIC_API_KEY`; no mode fallback exists.
13. AutoByteus remote core providers/clients never call management or read `AUTOBYTEUS_API_KEY`. The server discovery owner and generic construction provisioning resolve exact consumers and pass ephemeral authentication.
14. `model.providerId` remains display/creator identity only. Model registration materializes the required `credentialProviderId`—native definitions set their credential owner once; gateway models set `AUTOBYTEUS`. The construction target omits displayed `providerId`, and generic provisioning resolves only against `credentialProviderId`; there is no runtime fallback/re-derivation from provider, model name, client class, or host.
15. Remote catalog synchronization is model-kind and runtime scoped. It must not replace/delete native API models that share a downstream provider with a remote model.
16. The PNPM entrypoint normalizes exactly zero or one leading separator and otherwise depends only on the typed local-import owner. That owner may depend on the immutable positive alias registry, current catalog lookup, recognize-first source reader, target-role resolver, and Local setup batch. Import eligibility is defined only by the positive registry; no negative secret-like classifier, caller-supplied map, ignored-line metadata, or ZHIPU compatibility table exists. The owner never depends on subject services, runtime provisioning, `SecretManagementService`, GraphQL, Electron, Docker composition, or test execution. No other caller imports it.
17. `autobyteus-server-ts/package.json`, root removal of obsolete `pnpm.patchedDependencies` metadata, and `pnpm-lock.yaml` are one `repository_prisma@1.0.8` clean-integration unit. No replacement package patch is permitted. Production database owners continue to depend directly on reviewed configured `@prisma/client` paths; they must not import or delegate lifecycle ownership to `repository_prisma` in this ticket.
18. The exact unpatched upstream package policy, enforced by the package-integration regression-probe boundary, is not a runtime configuration layer: both ESM and CommonJS entrypoints default to `info\|warn\|error`, add `query` only for explicit truthy `PRISMA_LOG_QUERIES`, and never introduce dotenv fallback, import-time acquisition, or evidence containing query/datasource/provider data.
19. Package probes never use server/project cwd or inherit `process.env`. They resolve exact installed entrypoint paths in the parent, invoke absolute `process.execPath`/probe/preload paths with `shell:false`, use a new empty temporary cwd, and build an environment from `{}` with only platform-minimal variables plus explicit synthetic log-policy input. ESM and CommonJS preload mechanisms intercept only `@prisma/client`; every other module executes normally. A separate static assertion requires both installed entrypoints and manifest to contain no dotenv/config or `.env` discovery path.

## Interface Boundary Mapping

| Interface / Method | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `SecretStorageConfigurationService.validateAndSave` | backend config | validate registered selection/persist non-secret config | typed discriminated config | returns five-state health/capabilities/restart-required status only |
| `SecretManagementService.saveForConsumer/removeForConsumer` | catalogued credential | catalog-bound atomic lifecycle/status/event | semantic consumer identity; value only on save | `WRITABLE` lifecycle required |
| `SecretManagementService.getStatusForConsumer` | one catalogued credential | value-free status result | semantic consumer identity | `{health, definitionState}`; state null unless health READY |
| `SecretManagementService.resolveForUse` | one authorized use | catalog lookup plus exact resolution | semantic consumer identity only | internal only; caller cannot supply a duplicate expected definition |
| `SecretStorageBackend.resolve` | one storage record | custody read | validated definition ID | base port; adapter/Store or namespace already bound |
| `WritableSecretStorageBackend.save/remove` | one storage record | atomic create-or-replace and idempotent remove | validated definition ID + value on save | capability-checked; no caller CAS |
| `LocalSecretStoreProvisioningService.provisionExact` | one-record Local setup write | save hidden transient input to its exact constructed target without readback | definition ID + transient value; service holds target only | public only to hidden E2E CLI composition; no source/copy API |
| `LocalSecretStoreProvisioningService.inspectExact` | selected Local setup status | non-mutating target/pair and requested-definition status for import planning | validated definition IDs; service holds target only | both absent -> `INITIALIZATION_REQUIRED`; partial -> `CORRUPT`; never resolves values |
| `LocalSecretStoreProvisioningService.provisionBatchExact` | selected-target Local setup batch | validate exact internal entries and delegate one encrypted repository transaction | immutable planned `{definitionId, SecretValue, action}` entries; service holds target only | callable only by import owner; no remove/readback/path/fallback or generic port exposure |
| `LocalEnvironmentSecretImportService.preview/execute` | one explicit source-to-Local-Store transition | validate source safety plus selected current aliases/target/overwrite; produce a value-free plan or issue the target challenge through an injected confirmation port and commit | `{sourceAbsolutePath, target: default\|e2e, dryRun, overwrite}` | no value, definition, Store path, environment map, or backend config in request; output has IDs/action counts and codes only; ignored-line metadata is absent; production confirmation port permits direct TTY only |
| Local encrypted repository batch | one selected Store transaction | atomically create or replace only the service-validated planned records | immutable planned `{definitionId, SecretValue, action}` entries | internal below `LocalSecretStoreProvisioningService`; no remove, readback, path selector, fallback, or general backend-port exposure |
| `LLMFactory.describeConstructionTarget` | model auth need | credential-provider/requirement declaration | model identifier | returns exactly `{credentialProviderId, authenticationRequirement}`; no displayed provider, duplicate slot, definition ID, or value |
| `LLMFactory.createLLM` | concrete LLM | compose config and construct | model ID + `{configInput?, authentication}` | auth input mandatory, including `none` |
| `AutobyteusRemoteModelDiscoveryService.ensure/refresh` | gateway catalog discovery | no-host zero-resolve/scoped clear; exact discovery resolution; core discovery; runtime-scoped publish | model kind `llm\|audio\|image` | one application service with model-kind-specific consumers; no raw string/status/UI/backend API |
| core factory `replaceModelsForRuntime` | remote catalog registry | atomically replace one runtime subset | model kind's factory + `AUTOBYTEUS` runtime + parsed models | preserves native same-provider models; no resolution/network call |
| `LiveE2EManifestLoader.load` | real test scenarios | validate tracked config | canonical file path | contains names only |
| `AgentExecutionLauncher.launch` | agent runtime capability | enforce sandbox/environment | explicit security context + runtime request | no implicit parent state |
| `ClaudeRuntimeAuthenticationService.prepareForLaunch` | Claude runtime auth | select CLI or authorize/resolve managed consumer JIT | validated server mode only | internal; returns closed auth union, no env/raw string/backend handle |
| `ClaudeSdkClient` internal launch builder | exact Claude child | compose empty-base env/settings/tools, spawn, cleanup/redact | `ClaudeRuntimeAuthentication` | no caller env, management/backend, serialization, CLI arg, or fallback |

Claude subject-level failure mapping is closed: invalid/legacy mode -> `CLAUDE_RUNTIME_AUTH_MODE_INVALID`; CLI account failure -> `CLAUDE_RUNTIME_CLI_AUTH_UNAVAILABLE`; invalid catalog binding -> `CLAUDE_RUNTIME_SECRET_BINDING_INVALID`; missing -> `CLAUDE_RUNTIME_CREDENTIAL_MISSING`; backend health maps individually to `CLAUDE_RUNTIME_SECRET_STORE_LOCKED|UNAVAILABLE|CORRUPT|INCOMPATIBLE`; child construction -> `CLAUDE_RUNTIME_SPAWN_FAILED`; provider rejection -> `CLAUDE_RUNTIME_AUTH_FAILED`. Pre-spawn failures do not spawn; none falls back or contains raw diagnostics/value/path/environment.

The initiating operation owns projection: a run/start request returns the typed Claude runtime failure; best-effort `listModels()` preserves its current empty-list behavior and records only the stable value-free status internally. It must not hide the cause by trying CLI, ambient aliases, or another Store. A later status-bearing model-catalog API is outside this ticket.

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| management service methods | Yes | Yes | Low | keep subject-specific request types |
| backend ports | Yes | Yes | Low | accept validated definition IDs only; adapter owns physical mapping |
| factory creation | Yes | Yes | Low | separate config/auth shapes; no option bag of secrets |
| Local Store direct E2E provision | Yes | Yes | Low | target backend is constructor dependency; request has exact definition/value only; no source/copy/list/readback |
| local environment-secret import | Yes | Yes | Low | required absolute source plus closed target role; reject arbitrary paths for targets, definitions, values, or backend configuration |
| GraphQL lifecycle | Yes per subject | Yes | Low | never add generic name/path query |
| governed agent launcher | Yes | Yes | Low | every launcher governed by this ticket routes through it; external Codex deliberately does not |
| Claude runtime authentication service | Yes | Yes | Low | exact mode and exact consumer; no definition/backend/env selector |
| Claude SDK child builder | Yes | Yes | Low | accepts closed auth union internally; public callers cannot supply env |
| AutoByteus remote discovery service | Yes | Yes | Low | fixed provider `AUTOBYTEUS`, explicit model kind; no definition/path selector |
| construction target descriptor | Yes | Yes | Low | `credentialProviderId` supplies the exact non-secret ownership fact; no runtime-specific branch in provisioning |

## Main Domain Subject Naming Check

| Subject | Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| lifecycle owner | `SecretManagementService` | Yes | “backend service” reversal | keep service above backend |
| custody port | `SecretStorageBackend` | Yes | “provider” confused with AI provider | consistently use backend/adapter |
| local custody implementation | `LocalSecretStorageBackend` | Yes | “server” or “broker” implies another process | use backend for in-process implementation and Store for one database/key pair |
| local physical custody | default Store / real-E2E Store | Yes | “profile” implies one shared DB namespace | use exact physical file roles; no generic profile domain type |
| runtime composition | `LLMConstructionContext` | Yes | generic `LLMRuntimeConfig` merges serialized config/auth | retain explicit context name |
| backend configuration owner | `SecretStorageConfigurationService` | Yes | mixed with credential management | separate APIs/folder |
| Claude managed provisioning owner | `ClaudeRuntimeAuthenticationService` | Yes | vague policy/helper name could hide resolution/lifecycle | name by exact runtime-auth subject and keep child delivery in client |
| AutoByteus catalog provisioning owner | `AutobyteusRemoteModelDiscoveryService` | Yes | “provider” alone confuses AI provider with storage backend | name the gateway and discovery subject; keep lifecycle in existing provider service |
| explicit local transition owner | `LocalEnvironmentSecretImportService` | Yes | generic `dotenv importer` suggests runtime authority or arbitrary destinations | name its explicit assignment source and Local-only target; keep generic parsing subordinate |
| legacy application settings | non-secret `AppConfig` reader | Yes | a generic parser can accidentally retain sensitive assignments even when getters are later removed | strengthen name-first admission and source-preserving non-secret writes; leave legacy bytes untouched |
| legacy custom-provider file | current custom-provider store | Yes | version-specific conversion would make historical credentials authoritative again | accept v2 only; leave v1 untouched and return stable value-free reconfiguration guidance |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why | If New, Why Existing Is Not Right |
| --- | --- | --- | --- | --- |
| LLM registry/default composition | core `LLMFactory` | Extend | already authoritative and async | N/A |
| agent LLM creation | `AutoByteusAgentRunBackendFactory` injectable seam | Extend | natural server provisioning caller | N/A |
| provider metadata CRUD/runtime sync | server `llm-management` | Extend | owns provider subject transaction | N/A |
| non-secret server config | `AppConfig` | Reuse/Modify narrowly | valid for ordinary config only after name-first sensitive-key exclusion and source-preserving writes | cannot own values/backend bootstrap identity or mutate legacy credential lines |
| search strategies/factory | core search subsystem | Extend | retain provider request behavior, add explicit auth | N/A |
| media factories/services | core/server multimedia subsystems | Extend | existing client creators are a usable seam | N/A |
| AutoByteus remote model discovery | existing core remote providers plus server model-provider wrappers | Extend with one server application service | protocols/parsers and user triggers already exist; only explicit resolution/publishing owner is missing | core factory initialization cannot access server management; feature removal is forbidden |
| ordinary app-data migration framework | existing server registry/runner/Prisma records | Reuse unchanged downstream | established post-bootstrap migration/status pattern | this ticket adds no credential migration to it and leaves its current non-credential behavior unchanged |
| automatic legacy updater | existing `LegacySecretCutoverMigration` before current runtime consumption | Remove | the user rejected automatic import, copy, scrub, delete, rewrite, and conversion | replace with non-authoritative readers plus explicit operator provisioning; do not create another migration owner |
| secret lifecycle/custody | none | Create New | no current boundary safely fits | generic AppConfig and provider stores are the problem |
| shared local custody | existing server has `node:sqlite` usage but no secret owner | Create Local backend inside server secret subsystem | must span Electron/direct/Docker/host-test starts while keeping one Store-bound adapter per server | Electron-only storage, ordinary app DB tables, per-worktree files, a same-user daemon, or prescribed Docker E2E mounts add coupling/complexity |
| governed agent launch security | fragmented spawn/path code | Create coherent capability, extend governed launch sites | policy must be consistent across shell/PTY/Claude/MCP/browser/application-worker; Codex is the explicit external-runtime exclusion | local per-spawner denylist is insufficient; forcing Codex through this policy breaks external login |
| Claude runtime auth/provisioning | existing auth-environment helper and `ClaudeSdkClient` | Replace helper with specialized service; extend client | generic `resolveForUse` already owns resolution, while Claude needs mode/JIT/delivery policy outside core LLM construction | current helper combines mode with ambient environment and has no management boundary |
| test live scenario declaration | scattered live tests/env gates | Create New | needs tracked semantic manifest and one harness | global Vitest setup is ambient |
| positive import alias registry | current import-supported aliases plus catalog definitions | Extract and Reuse under provisioning policy | one registry must define exactly what explicit import may select; non-secret exclusion may reuse these names but may remain broader for its own projection concern | duplicated value maps or a negative importer classifier would drift policy; ZHIPU must not become compatibility input |
| Local encrypted batch | repository already owns one-record transactions | Extend internally | one setup transaction is required for all-or-nothing import | widening the generic backend port would expose a product bulk API with no runtime use case |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine IDs | Governing Owner(s) | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Core runtime construction (`autobyteus-ts`) | `SecretValue`, exact Gemini LLM/media auth/SDK construction, LLM/media/search auth/context/factory contracts, established provider metadata mapping | 003, 004 | core factories/clients/metadata provider | Extend LLM/media; preserve metadata | storage-neutral; distinct tight contracts for mode-specific SDK clients and dual-key metadata request |
| Core AutoByteus remote catalog support (`autobyteus-ts`) | authenticated remote protocol/parsing, `credentialProviderId`, runtime-scoped registry synchronization | 018 | core remote providers/factories | Refactor/Extend | no environment or server-management dependency |
| Server secret management | catalog, lifecycle, resolution, storage status/events, backend ports | 001–004, 009, 010 | `SecretManagementService` | Create New | authoritative domain boundary; provider validation remains subject-owned |
| Server storage configuration | typed config, persistence, backend factory/restart status | 001, 010 | configuration service/bootstrap | Create New | no secret bootstrap values; no Phase-1 hot swap |
| Server consumer provisioning | LLM/search/media/metadata binding and subject-specific construction | 003, 004 | existing family provisioning services | Extend LLM/media; preserve metadata | avoids god-object; metadata keeps exact consumer selection, owner/cache/invalidation, and established provider contract |
| Server AutoByteus remote discovery | exact discovery consumers, JIT resolution, startup/list/reload orchestration | 018 | `AutobyteusRemoteModelDiscoveryService` and existing server model providers | Add/Extend | one reusable service, not three secret resolvers |
| Server Local secret storage | Store-bound in-process backend, pair verifier, crypto repository, physical initialization/reset/direct setup provision, explicit local legacy-source import | 004–006, 010, 011, 019 | Local backend / setup/import services | Extend inside server secret-management subsystem | no new process/package/protocol; batch remains package-internal |
| Agent execution hardening | file-root/env/descriptor/launcher policy and `LOCAL_HARDENED` reporting | 007, 010 | execution security context/launcher | Create/Extend | covers governed launch paths without strong identity claim; expressly excludes Codex |
| Claude runtime authentication | exact two-mode selection, managed consumer resolution, child delivery/tool/settings/diagnostics | 017 | `ClaudeRuntimeAuthenticationService` then `ClaudeSdkClient` | Replace/Extend | reuses management; no new backend API or LLM context |
| Legacy-source non-authority | admit approved non-secret settings only; leave application `.env` and custom-provider-v1 unchanged; return value-free v1 guidance | 008 | non-secret `AppConfig` reader and current custom-provider store | Modify readers; remove updater | no credential import, rewrite, conversion, fallback, or ordinary app-data migration change |
| Web/Electron Settings/packaging | write-only UX, status/capabilities, default Local backend configuration | 001, 002, 005, 009 | existing settings/runtime managers | Extend | frontend never connects directly to custody; no Store supervision process |
| Live test infrastructure | tracked manifest, exact host E2E Store path derivation, read-only preflight, execution, evidence scan | 005, 006, 010 | live harness | Create New/Replace | real-provider first-class; source review is upstream workflow; no Docker mount behavior |
| Enterprise adapter extension | typed registration/config/capability/conformance seam only | 010, 007 | deployment composition | Define/Defer | no concrete enterprise adapter or strong deployment manifest in first delivery |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner / Boundary | Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/secrets/secret-value.ts` | core | value boundary | non-serializable redacted wrapper | one security primitive | yes |
| `autobyteus-ts/src/llm/llm-construction-context.ts` | core LLM | factory/client contract | preserve generic API-key/none plus exact Gemini authentication variants in LLM context | shared by factory/classes and media alias | `SecretValue` |
| `autobyteus-ts/src/utils/gemini-helper.ts` | core Google SDK boundary | exact Gemini LLM/media authentication and construction | preserve exhaustive three-mode Google SDK options mapping | one shared boundary serves LLM/media | `SecretValue` |
| `autobyteus-ts/src/llm/metadata/gemini-model-metadata-provider.ts` | core metadata | provider adapter | preserve resolved-key Generative Language request plus response alias/token mapping; no ambient default | established provider/mapping owner | raw key only at trusted request boundary; no server dependency |
| `autobyteus-ts/src/llm/llm-factory.ts` | core LLM | factory | target description, config composition, construction | established owner | context/auth requirement |
| `autobyteus-ts/src/llm/models.ts` and audio/image model files | core model domain | construction descriptor | downstream provider plus defaulted/overridden credential provider identity | one fact on authoritative model | auth requirement |
| core AutoByteus LLM/audio/image provider files | core gateway protocol | discovery | accept ephemeral auth and return parsed models | existing protocol owners | construction auth + runtime model metadata |
| core LLM/audio/image factories | core registry | runtime-scoped synchronization | replace only AutoByteus-runtime subset | existing registries | runtime enum/model arrays |
| `autobyteus-server-ts/src/secret-management/services/secret-management-service.ts` | server secret | authoritative service | lifecycle, resolve, status/event sequencing | coherent subject owner | catalog/port/status |
| `.../configuration/secret-storage-configuration-service.ts` | storage config | config owner | typed non-secret configuration | separate plane | config schema |
| `.../backends/secret-storage-backend.ts` | server secret | port | shared operations plus discriminated writable/externally-managed variants over validated definition IDs | adapter contract | definition/status/lifecycle shapes |
| `.../provisioning/llm-provisioning-service.ts` | LLM management | provisioning owner | create semantic consumer request, map resolved value/config to shared exact auth, invoke core factory | one consumer family | consumer/auth types |
| `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` | LLM metadata management | provisioning owner | preserve explicit mode mapping: resolve only AI Studio/Vertex Express metadata consumer and construct/cache existing provider; Vertex Project creates none; invalidate on reload | one metadata family | management/config plus existing provider constructor |
| `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts` | server catalog | discovery provisioning owner | no-host gate, exact model-kind consumer, JIT resolution, core discovery and runtime-scoped publish | one shared gateway/model-catalog concern | management + core provider/factory ports |
| `autobyteus-server-ts/src/secret-management/backends/local/local-secret-storage-backend.ts` | server Local storage | backend | in-process Store open/close/status/resolve/write capability | one backend owner | configuration/repository |
| `.../backends/local/local-encrypted-secret-repository.ts` | server Local storage | repository | minimal one-Store schema, encryption, exact atomic records, busy handling | crypto/persistence concern | stored schema |
| `.../backends/local/local-secret-store-initializer.ts` | server Local storage | initialization owner | staged pair creation, presence/permission/format and authenticated pair-verifier validation | distinct persistence lifecycle | Store configuration/health |
| `.../backends/local/local-secret-store-provisioning-service.ts` | server Local setup | target-bound lifecycle/write owner | open/inspect, staged initialize when authorized, one-record hidden provision, setup-only atomic batch used by explicit import, checkpoint/close for the constructed target; no source/copy method | one reusable setup persistence boundary prevents callers from managing repository/backend lifetime | Store configuration/definition/plan-entry types |
| `.../provisioning/local-environment-secret-import.ts` | server Local setup | shared import domain | current target/request/action/plan/status/result/error types consumed by CLI, source reader, target resolver, service, and tests | one current vocabulary; no compatibility layer | types and stable errors only |
| `.../provisioning/local-environment-secret-import-service.ts` | server Local setup | import owner | validate typed request and selected definitions, resolve closed target, plan/confirm, coordinate atomic batch, return value-free selected IDs/action counts | one explicit transition use case | recognize-first source result + positive alias registry + Local setup batch |
| `.../provisioning/local-environment-source-reader.ts` | server Local setup | source boundary | non-mutating identity/access/size/UTF-8/NUL validation; scan exact assignment names; parse/validate values only for recognized aliases; ignore every other line without interpreting RHS | file trust and selected-value parsing are coupled at the open handle | selected alias/value buffers only; remove negative classifier/error |
| `.../provisioning/local-import-target-resolver.ts` | server Local setup | target composition | production maps `default\|e2e` to canonical host pairs; tests may inject a temporary-root implementation | isolates safe testability without exposing target paths to the command | no parsing/values/backend operation |
| `.../provisioning/local-import-credential-alias-registry.ts` | local import policy | positive current import eligibility authority | immutable current alias-to-definition registry; Qwen has only `DASHSCOPE_API_KEY`; names may be reused by config exclusion | eliminates duplicated value mapping; deliberately omits ZHIPU and every unsupported name | definition IDs only, never values, priorities, groups, or negative patterns |
| `src/config/app-config.ts` | non-secret configuration | source-preserving projection owner | admit approved non-secret settings by name while excluding every sensitive alias before value retention; preserve source bytes/lines on non-secret writes | prevents runtime authority without mutating operator-owned legacy data | no secret getter, alias return, generic rewrite, import, or Store access |
| `src/llm-management/.../custom-llm-provider-store.ts` | current provider storage | metadata-only v2 reader/writer | accept current v2; leave v1 bytes untouched and map detection to value-free reconfiguration guidance | keeps historical credential values outside current runtime | no v1 conversion, preservation, fallback, or value output |
| `.../cli/import-local-environment-secrets.ts` | server Local setup | CLI adapter | remove exactly one optional leading `--`, parse flags, invoke import owner, adapt direct TTY confirmation, format value-free IDs/action counts and exit codes | thin executable boundary; adapter syntax never enters domain policy | typed request/result only |
| `.../agent-execution/security/agent-execution-security-context.ts` | execution | policy owner | explicit file roots, empty-base env and descriptor allowlist, derived `LOCAL_HARDENED` report | shared launch contract | runtime security context |
| `src/runtime-management/claude/authentication/claude-runtime-authentication-service.ts` | Claude runtime | mode/JIT provisioning owner | validate `cli` or `managed-secret`, build exact consumer, call `resolveForUse`, map value-free failures | one subject owner | management service + closed auth union |
| `src/runtime-management/claude/authentication/claude-runtime-authentication.ts` | Claude runtime | shared runtime auth shape | closed `cli` or `managedApiKey` result and exact consumer constant | prevents env/raw string bags | `SecretValue` |
| `src/runtime-management/claude/client/claude-sdk-client.ts` and child environment builder | Claude runtime | exact child delivery owner | no caller env; build empty-base mode-specific env/settings/tools, spawn both model/run queries, cleanup, early diagnostics | one last-mile boundary | runtime auth + execution security |
| `test-config/live-e2e.json` | test | manifest | real-E2E Store filenames/access mode/scenarios/definitions | canonical tracked config | schema |
| `test-support/live-e2e/live-e2e-harness.ts` | test | harness | host E2E path derivation, read-only preflight/run/cleanup | coherent operational owner | manifest/status |

## Reusable Owned Structures Check

| Structure / Logic | Shared File | Owner | Why Shared | Redundant Attributes Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| redacted raw value | `autobyteus-ts/src/secrets/secret-value.ts` | core value boundary | backend and clients need same safe wrapper | Yes | Yes | false memory-security claim |
| exact Gemini LLM/media authentication/SDK constructor | `utils/gemini-helper.ts` | core Google SDK boundary | LLM and media require the same three mode semantics and reveal boundary | Yes | Yes | generic API-key variant, config bag, metadata request, or mode selector |
| LLM auth union/context | `llm-construction-context.ts` | core LLM | every LLM follows one constructor shape and composes the Gemini contract | Yes | Yes | duplicate Gemini variants or provider/backend option bag |
| definition/binding/definition-status/backend-health/lifecycle capability | server secret domain files | management/config domains | service/adapters/config/UI mappings share non-overlapping semantics | Yes | Yes | generic arbitrary secret record, combined impossible status, provider-validation DTO, or physical path DTO |
| backend conformance fixture | `tests/secret-management/backend-conformance.ts` | server tests | every adapter must meet same invariants | Yes | Yes | substitute for real-provider tests |
| governed agent launch policy | core/server security context files | execution security | every governed spawner needs one invariant source; Codex is the explicit external-runtime exclusion | Yes | Yes | secret-name denylist or a wrapper around Codex |
| Claude runtime authentication union/consumer constant | Claude authentication domain file | Claude runtime auth service | service/client/tests require one exact semantic shape | Yes | Yes | generic runtime config or environment map |
| live manifest schema | `test-support/live-e2e/live-e2e-manifest.ts` | test harness | packages need one scenario contract | Yes | Yes | credential/config dumping ground |
| credential-provider identity | core model/construction target files | core factory/model domain | ordinary and gateway models share one generic provisioning contract | Yes | Yes | definition ID, secret value, or host-derived guess |
| AutoByteus discovery consumer builder | server remote discovery service | model-catalog application owner | three model kinds share one definition but require distinct authorization/evidence | Yes | Yes | generic arbitrary provider/definition selector |
| positive alias registry | `provisioning/local-import-credential-alias-registry.ts` | local import policy | source reader, service, and tests need one exact current eligibility map; config exclusion may consume names only | Yes | Yes | negative classifier, ZHIPU compatibility, runtime fallback, or arbitrary env-name import |
| local import request/plan/result/error | `provisioning/local-environment-secret-import.ts` | local import domain | CLI, source reader, target resolver, service, and tests need one closed target/action/error vocabulary only | Yes | Yes | ignored-line metadata, compatibility export, or generic Store path/definition/value option bag |
| Local import target resolver | `provisioning/local-import-target-resolver.ts` | local import composition | production and synthetic tests need the same closed role semantics with different physical roots | Yes | Yes | public target-path option or runtime backend selector |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Field Meaning? | Redundancy Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| exact Gemini variants inside LLM/media construction authentication | Yes | Yes | Low | exact `geminiAiStudio(apiKey)`, `geminiVertexExpress(apiKey)`, or `geminiVertexProject(project,location)` reused by LLM/media; metadata deliberately does not widen this contract |
| metadata raw-key request boundary | No new shared structure | N/A | Low | one selected `SecretValue` is revealed by server provisioning and passed to the existing provider; introducing a mode/SDK DTO would misrepresent the accepted dual-key endpoint contract |
| `LLMFactoryCreationInput` | Yes | Yes | Low | `configInput` and `authentication` only |
| `LLMConstructionContext` | Yes | Yes | Low | `config` effective, `authentication` runtime; no backend fields |
| `SecretBinding` | Yes | Yes | Low | definition ID plus allowed semantic consumer only; historical exclusion/import aliases stay elsewhere |
| `SecretStorageConfiguration` | Yes | Yes | Medium | discriminated adapter shapes; forbid bootstrap secret fields |
| `SecretLifecycleCapability` | Yes | Yes | Low | tagged `WRITABLE`/`EXTERNALLY_MANAGED`; no overlapping booleans |
| `SecretBackendHealth` + `ManagedSecretStatusResult` | Yes | Yes | Low | a discriminated union makes definition state present only with `READY`; internally mapped definition ID and generic message/retry flags are absent; subject validation remains separate |
| `LocalStoreMetadata` | Yes | Yes | Low | singleton format fields plus random store ID and authenticated pair verifier; no profiles/timestamps/value hints |
| `LiveE2EManifest` | Yes | Yes | Low | backend kind/canonical host E2E filenames/read-only mode/scenarios only; host root is derived and key bytes remain elsewhere |
| `ClaudeRuntimeAuthentication` | Yes | Yes | Low | closed `cli` or `managedApiKey`; no mode string plus optional key, environment, definition ID, or backend fields |
| `LLMConstructionTarget` | Yes | Yes | Low | `{credentialProviderId, authenticationRequirement}` only; displayed/creator provider and runtime are deliberately absent so consumer construction cannot confuse them with credential ownership; slot remains inside the tagged requirement |
| `ModelDiscoveryConsumer` | Yes | Yes | Low | exact `{kind, modelKind, providerId, credentialSlot}`; no host/definition/path/value |
| `LocalEnvironmentSecretImportRequest` | Yes | Yes | Low | exactly `{sourceAbsolutePath, target, dryRun, overwrite}`; target is `default\|e2e`; no optional implicit selector or raw Store details |
| `LocalImportCredentialAliasRegistry` | Yes | Yes | Low | internal `Readonly<Record<string, SecretDefinitionId>>`; one meaning is positive current import eligibility; Qwen has only `DASHSCOPE_API_KEY`; no priority/group, negative pattern, legacy flag, target, consumer, or value |
| `LocalEnvironmentSecretImportPlan` | Yes | Yes | Low | entries carry current definition ID and closed `CREATE\|SKIPPED_CONFIGURED\|REPLACE`; ignored-line names/content/counts are absent; dry-run and execution apply the same request overwrite policy, while raw selected values stay in a separate short-lived internal map and never enter outward plan/result serialization |
| `LocalEnvironmentSecretImportTargetStatus` | Yes | Yes | Low | `READY`, `INITIALIZATION_REQUIRED`, or one existing non-ready health; absent is setup state, partial pair remains `CORRUPT`, and runtime `SecretBackendHealth` is not widened |


## Final File Responsibility Mapping

### Package / dependency integration

| File | Owner | Concrete Responsibility | Changes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/package.json` | server dependency declaration | request `repository_prisma:^1.0.8` while leaving `prisma`/`@prisma/client` unchanged | Modify exact dependency only |
| root `package.json` | workspace package policy / operator entrypoints | remove the obsolete `repository_prisma@1.0.6` patched-dependency key; preserve the already approved importer command | Modify by deletion only for dependency scope |
| `pnpm-lock.yaml` | resolved dependency graph | resolve one attested `repository_prisma@1.0.8` artifact with the existing `@prisma/client@5.22.0` peer; contain no `1.0.6`/`1.0.7` resolution or repository patch hash | Regenerate through pnpm |
| `patches/repository_prisma@1.0.6.patch` | obsolete package policy patch | upstream `1.0.8` now supplies dotenv-free/default-off behavior, so retaining this file would be legacy code | Remove |
| `patches/repository_prisma@1.0.7.patch` or `patches/repository_prisma@1.0.8.patch` | prohibited replacement patches | no current requirement remains that justifies a local package patch | Do not add |
| `autobyteus-server-ts/tests/unit/logging/prisma-query-log-policy.test.ts` | isolated package policy regression | resolve exact installed import/require entrypoints; create/delete empty temp cwd and generated narrow ESM/CJS Prisma preloads/probes; spawn through absolute paths with empty-base platform-minimal env and no dotenv/Node overrides; prove zero import acquisition, parent-canary absence, and default-off/explicit-opt-in log kinds without real dotenv/database/query/path evidence | Modify; replace server-cwd and parent-env-spread probe |

No production `src/**` file is added or modified to adopt `repository_prisma`; current configured Prisma ownership remains unchanged.

### Core runtime (`autobyteus-ts`)

| File | Owner | Concrete Responsibility | Changes |
| --- | --- | --- | --- |
| `src/secrets/secret-value.ts`, `src/secrets/index.ts` | secret-safe value | redacted non-serializable wrapper/export | Add |
| `src/llm/llm-construction-context.ts` | LLM construction contract | preserve generic API-key/none plus exact Gemini variants; requirement, factory input/context remain LLM-owned | Preserve CR-020 target |
| `src/multimedia/multimedia-construction-context.ts` | media construction contract | reuse the same wider construction auth without a parallel Gemini representation | Modify/Tighten |
| `src/utils/gemini-helper.ts` | Google SDK construction | preserve CR-020 exhaustive variant-to-options mapping for AI Studio, Vertex Express, Vertex Project LLM/media; no inference/fallback | Preserve after CR-020 |
| `src/llm/metadata/gemini-model-metadata-provider.ts` | Gemini live metadata adapter | preserve selected-key Generative Language request and existing alias/token-limit mapping; retain no ambient env/default override | Preserve; no CR-021 source change |
| `src/llm/metadata/model-metadata-resolver.ts` | live/curated metadata merge | preserve timeout/cache/failure containment and live-over-curated field merge; never choose authentication | Preserve; add/adjust tests only if needed |
| `src/llm/llm-factory.ts` | LLM factory | describe target including credential provider; mandatory authentication; compose config; construct context; runtime-scoped remote synchronization | Modify |
| `src/llm/models.ts`, `supported-model-definitions.ts` | model definitions | materialize required non-secret credential owner during registration: native owner assigned once, AutoByteus-runtime owner explicitly `AUTOBYTEUS`; never an optional runtime fallback | Modify |
| `src/llm/autobyteus-provider.ts`, `src/multimedia/audio/autobyteus-audio-provider.ts`, `src/multimedia/image/autobyteus-image-provider.ts` | AutoByteus gateway discovery | accept explicit ephemeral auth, parse remote models, mark gateway credential owner, return results without server/backend dependency | Modify; preserve functionality |
| `src/multimedia/audio/audio-client-factory.ts`, `src/multimedia/image/image-client-factory.ts` | media registries | describe construction target and atomically replace only one runtime subset | Modify |
| `src/llm/api/*-llm.ts` and Gemini helper | concrete LLM | context constructor; unwrap only into SDK; no env reads | Modify |
| `src/llm/openai-compatible-endpoint-model.ts`, provider/discovery files | custom model runtime | remove stored/default API key; accept temporary auth | Modify |
| other `src/llm/metadata/*` | metadata clients/resolver | explicit auth input; no static environment reads; existing curated/failure semantics | Modify only where existing ambient reads remain |
| `src/tools/search/factory.ts`, strategies, `search-tool.ts` | search client/runtime | explicit auth/executor injection | Modify |
| `src/multimedia/**/factory.ts`, provider clients | media construction | explicit construction auth; no env reads | Modify |
| `src/tools/file/workspace-path-utils.ts` and file tools | file capability | realpath-aware authorized-root enforcement | Modify/extend |
| `src/tools/terminal/**` | terminal runtimes | accept explicit launch security/env; remove parent-env defaults | Modify |

### Server (`autobyteus-server-ts`)

| File | Owner | Concrete Responsibility | Changes |
| --- | --- | --- | --- |
| `src/secret-management/domain/secret-binding.ts` | catalog domain | stable definition IDs and semantic consumer bindings | Add |
| `.../domain/secret-storage-types.ts` | storage domain | healthy-only definition status, five-state backend health, tagged lifecycle capability, stable instruction/errors | Add |
| `.../catalog/secret-catalog.ts` | catalog/binding | current definitions and semantic consumer mapping used internally by management | Add |
| `.../backends/secret-storage-backend.ts` | port | shared operations and discriminated writable/externally-managed definition-ID variants | Add |
| `.../backends/in-memory-secret-storage-backend.ts` | test adapter | synthetic deterministic custody/faults | Add |
| `.../backends/local/local-secret-storage-backend.ts` | local adapter | in-process exact Store open/close/status/resolve and lifecycle mapping | Add |
| `.../backends/local/local-encrypted-secret-repository.ts` | local persistence | one-Store schema, AEAD, exact transactions, busy/read-only behavior | Add |
| `.../backends/local/local-secret-store-initializer.ts` | local persistence lifecycle | staged fail-closed database/key creation; permission, format, and pair-verifier validation | Add |
| `.../backends/local/local-secret-store-provisioning-service.ts` | trusted setup | target-bound one-record provision and package-internal atomic batch for explicit import; no source/copy/read dependency | Add/Extend |
| `.../provisioning/local-environment-secret-import.ts` | local import domain | current target/request/action/plan/status/result/error types shared by CLI, reader, target resolver, service, and tests | Add by renaming/replacing `local-legacy-environment-import.ts`; remove old file and add no compatibility re-export |
| `.../provisioning/local-environment-secret-import-service.ts` | explicit local transition | source/target validation, plan, target-specific confirmation, atomic batch coordination, value-free result and cleanup | Add |
| `.../provisioning/local-environment-source-reader.ts` | import source boundary | non-mutating regular/symlink/owner/private-access/open-identity checks; bounded strict UTF-8 assignment parsing without evaluation | Add |
| `.../provisioning/local-import-target-resolver.ts` | import target composition | closed role -> canonical production Store pair; constructor-injectable temporary-root fixture only | Add |
| `.../provisioning/local-import-credential-alias-registry.ts` | current explicit-import policy | immutable positive alias-to-definition registry used by explicit import; exports current alias names for non-secret exclusion without exporting a negative classifier | Add by renaming/replacing the incidental legacy-named file; remove the old file and add no compatibility re-export |
| `.../migration/legacy-secret-cutover-migration.ts` | rejected automatic legacy updater | current import/scrub/delete/rewrite/conversion and ledger path | Remove, together with its startup call and migration-only records |
| `.../cli/import-local-environment-secrets.ts` | operator CLI adapter | required flag parsing, direct-TTY prompt adapter, value-free output/stable exit codes | Add |
| concrete Vault/AWS/Kubernetes backend files | future enterprise adapter | vendor custody/capability mapping | Out of scope for first delivery |
| `.../services/secret-management-service.ts` | authoritative service | lifecycle/resolution/status/event sequencing | Add |
| `.../configuration/secret-storage-configuration.ts` | config model | typed discriminated non-secret config | Add |
| `.../configuration/secret-storage-configuration-service.ts` | config owner | validate/save/restart-required status | Add |
| `.../configuration/secret-storage-backend-factory.ts` | composition | construct exactly one adapter | Add |
| `src/llm-management/services/llm-provisioning-service.ts` | LLM provisioning | request semantic-consumer resolution from the target credential provider, map auth, invoke factory | Modify |
| `src/llm-management/services/model-metadata-provisioning-service.ts` | metadata provisioning | preserve provider cache/invalidate owner; map AI Studio/Vertex Express to exact metadata consumers, reveal only at provider construction, and map Vertex Project to no live provider | Preserve; no CR-021 source change |
| `src/llm-management/services/model-catalog-service.ts` | catalog list/reload orchestration | preserve current enrichment and invalidate-before-reload calls | Preserve; regression coverage |
| `tests/unit/llm-management/model-metadata-provisioning-service.test.ts` | server metadata contract coverage | retain/proportionately prove exact AI Studio/Vertex Express consumers, Vertex Project zero lookup, invalid/missing no fallback, provider caching/invalidation | Preserve/complete only as already required; no SDK-mode metadata test rewrite |
| `src/llm-management/services/autobyteus-remote-model-discovery-service.ts` | AutoByteus gateway catalog provisioning | no-host zero-resolve/scoped clear; exact model-kind discovery consumer; JIT resolve; invoke core discovery; runtime-scoped publish; all-subset clear on credential removal | Add |
| `src/llm-management/providers/autobyteus-llm-model-provider.ts`, cached wrapper, and `src/multimedia-management/providers/{audio,image}-model-provider.ts` plus cached wrappers | model catalog lifecycle | call shared AutoByteus discovery service before cache publication and during full/targeted reload | Modify |
| `src/llm-management/.../llm-provider-service.ts` | provider subject | coordinate metadata and lifecycle | Modify |
| `src/llm-management/.../custom-llm-provider-store.ts` | current provider store | accept metadata-only v2; leave v1 untouched and return stable value-free `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED` | Modify; no v1 conversion or fallback |
| `src/search-management/search-provisioning-service.ts` | search provisioning | selected client/executor construction | Add |
| `src/multimedia-management/services/*` plus provisioning file | media domain | asynchronous credential-aware client creators | Modify/Add |
| `src/config/app-config.ts` | non-secret config only | exclude sensitive aliases by name before value retention; expose approved non-secret settings only; preserve source credential lines during non-secret writes | Modify; no startup rewrite/import |
| `src/api/graphql/types/llm-provider.ts`, server settings/search types | transport | write-only mutation/status/capabilities; backend config surface | Modify |
| `src/agent-execution/security/*` | execution security | file-root policy, empty-base environment/descriptor policy, launcher composition, derived `LOCAL_HARDENED` report | Add |
| `src/runtime-management/codex/client/codex-app-server-client.ts` | external Codex launch | restore/preserve base `env: options.env ?? process.env`; remove ticket-added child-environment helper import; make no other auth lifecycle change | Modify |
| `src/llm-management/services/llm-provisioning-service.ts` | LLM auth resolution | return exact Gemini variant from configured `GEMINI_SETUP_MODE`; retain generic provider paths | Modify |
| `src/agent-tools/media/media-client-provisioning-service.ts` | media auth resolution | return the same exact Gemini variant contract from configured mode | Modify |
| governed server/Core spawn composition, including `src/application-engine/runtime/application-worker-supervisor.ts` but excluding Codex App Server | launch callers | route governed launchers through execution security; never spread trusted `process.env` on those paths; preserve the separately mapped Codex launch unchanged | Modify |
| `src/runtime-management/claude/client/claude-sdk-auth-environment.ts` | legacy Claude auth/env helper | current ambient `auto`, `cli`, and `api-key` plus parent spread | Remove; responsibilities split below |
| `src/runtime-management/claude/authentication/claude-runtime-authentication.ts` | Claude auth domain | exact mode/result/consumer identity | Add |
| `src/runtime-management/claude/authentication/claude-runtime-authentication-service.ts` | Claude auth owner | validate mode; CLI zero-resolve; managed JIT `resolveForUse`; map exact value-free failures | Add |
| `src/runtime-management/claude/client/claude-sdk-child-environment.ts` | Claude last-mile delivery concern | empty-base allowlists; only managed `ANTHROPIC_API_KEY`; no parent mutation/caller env | Add |
| `src/runtime-management/claude/client/claude-sdk-setting-sources.ts` and tool-policy files | Claude launch policy | managed empty settings, `tools: []`, strict explicit AutoByteus MCP; CLI explicit account sources | Modify |
| `src/runtime-management/claude/client/claude-sdk-client.ts` and types | Claude SDK boundary | inject auth service; use one internal builder for model discovery/runs; remove public `env`; spawn/cleanup | Modify |
| `src/agent-execution/backends/claude/session/claude-session-tooling-options.ts`, MCP materializer/config | Claude managed tools | in managed mode expose only explicitly materialized AutoByteus MCP names; do not add `Skill` or any built-in/external MCP | Modify |
| `src/agent-execution/backends/claude/session/claude-process-diagnostics.ts` | Claude outward error boundary | redact before buffering and before summary; stable value-free mapping | Modify |
| `tests/unit/runtime-management/claude/authentication/claude-runtime-authentication-service.test.ts` | Claude auth unit coverage | default/valid/legacy mode, zero/JIT lookup, identity, complete pre-spawn failure mapping/no fallback | Add |
| `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Claude client unit coverage | exact env, no caller env/parent mutation, `tools: []`, settings/MCP, model/run shared path, spawn cleanup | Modify |
| `tests/unit/agent-execution/backends/claude/session/claude-process-diagnostics.test.ts` | Claude diagnostics | redact before buffer and outward formatting; seeded negative leak | Modify |
| `tests/integration/runtime-management/claude/claude-managed-secret.integration.test.ts` | server integration | InMemory/temporary Local exact consumer -> management -> captured exact child; sibling/tool-child negatives; all failure states | Add |
| server unit/integration tests for AutoByteus discovery and provider Settings | gateway regression | exact bindings, no-host zero lookup/scoped clear, status/save/remove/reload, runtime-scoped replacement, last-known-good transient failure, construction identity | Add/Modify |
| managed Claude real scenario under existing server API/E2E hierarchy | API/E2E | read-only real-E2E Store -> exact managed child -> real SDK authentication/request -> structural evidence | Add after coverage investigation |
| `src/app.ts` | bootstrap | parse/bind effective data root -> initialize non-secret `AppConfig` projection -> import runtime | Modify: remove `runLegacySecretCutoverMigration`; no automatic credential update |
| `src/server-runtime.ts` | bootstrap | normal logging/backend/Prisma/ordinary app-data migration/provider/route startup after non-secret configuration initialization | Preserve ordering; ordinary non-credential app-data migrations remain unchanged |
| `src/app-data-migrations/*` | ordinary application data | existing post-bootstrap registered/Prisma-backed migrations and status | Unchanged by AR-009 |

### Local Backend, Web/Electron, Test, Deployment

| File | Owner | Concrete Responsibility | Changes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/secret-management/backends/local/*` | in-process Local backend | Store config, initializer, encrypted repository, backend and setup service | Add inside existing server package |
| `autobyteus-server-ts/src/secret-management/backends/local/local-store-schema.ts` | schema owner | `store_metadata` with store ID/verifier plus exact `secret_records`; no profile table | Add |
| `autobyteus-server-ts/src/secret-management/backends/local/local-store-crypto.ts` | crypto owner | root-key load, domain-separated pair-verifier/record keys, HKDF/AES-GCM/AAD encoding | Add |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` and child forms | UI | write-only values; status/validation; external-management state | Modify |
| `autobyteus-web/components/settings/WebSearchConfigurationCard.vue` | UI | same search lifecycle/status | Modify |
| new Settings backend-storage card/composable/schema | UI | non-secret backend selection/options/capabilities | Add |
| `autobyteus-web/electron/server/*ServerManager.ts`, `serverRuntimeEnv.ts` | Electron composition | let server bootstrap derive the default Local Store below the existing server data directory; no credential env and no Store supervision | Modify |
| `autobyteus-web/electron/server/services/AppDataService.ts` and reset handler | server-data lifecycle | preserve `secret-store/` on ordinary reset or require explicit inclusion confirmation | Modify |
| `autobyteus-web/nuxt.config.ts` | web config | remove public secret fields | Modify |
| `test-config/live-e2e.json` | tracked manifest | Local Store kind, E2E filenames/read-only mode, scenarios/logical IDs, non-secret AutoByteus host/capability declarations | Add |
| `test-support/live-e2e/*` | test harness | config parse, host E2E path derivation, read-only Store preflight, managed Claude and AutoByteus remote scenarios, execution, negative leak scan/evidence cleanup | Add |
| `autobyteus-server-ts/tests/unit/secret-management/local-environment-secret-import-service.test.ts` | import owner coverage | rename current legacy-named service test; update imports to the current service/domain paths; preserve synthetic target/plan/init/transaction/isolation/leak assertions | Rename/modify; no compatibility test path |
| `autobyteus-server-ts/tests/unit/secret-management/local-environment-source-reader.test.ts` | importer source coverage | retain filename; update domain error and registry imports to `local-environment-secret-import.ts` and `local-import-credential-alias-registry.ts`; preserve trust/recognize-first assertions and add empty-as-absent/populated-duplicate/all-empty coverage | Modify imports/assertions |
| `autobyteus-server-ts/tests/unit/secret-management/import-local-environment-secrets-cli.test.ts` | importer CLI coverage | retain filename; production CLI now imports current domain/service paths; preserve optional sentinel/options/TTY/value-free formatting assertions | Modify imports/assertions |
| root `package.json` | operator entrypoint plus workspace package policy | expose `secrets:local:import`; separately remove obsolete `repository_prisma@1.0.6` patch registration and add no replacement | Modify without coupling the two responsibilities |
| `autobyteus-ts/tests/setup.ts`, live suites/config | tests | remove dotenv keys/env gates; use harness or synthetic backend | Modify |
| package `.gitignore` files | repo hygiene | allow tracked verified-non-secret `.env.test` only if retained | Modify conditionally |
| `autobyteus-server-ts/docker/docker-compose.yml` and Docker launcher files | existing Docker deployment | keep current topology, named volumes, ports, and launcher unchanged; normal Local Store derives below existing `AUTOBYTEUS_DATA_DIR` | No change |
| Kubernetes/company enterprise adapter and strong-isolation manifests/docs | future deployment | centralized custody and separate worker enforcement | Explicitly deferred / no first-delivery files |

### UC-019 Clean-Cut Import-Edge Mapping

| Current Importer / Import Edge | Target Importer / Import Edge | Disposition |
| --- | --- | --- |
| `provisioning/local-legacy-environment-import.ts` exporting `LocalLegacyEnvironmentImport*` types/errors | `provisioning/local-environment-secret-import.ts` exporting the already specified `LocalEnvironmentSecretImport*` types/errors | Rename in one change; delete the old file; no compatibility re-export |
| `provisioning/local-legacy-environment-import-service.ts` importing the old domain file | `provisioning/local-environment-secret-import-service.ts` importing `local-environment-secret-import.js` | Rename service/symbols/import atomically; delete old file; no wrapper |
| `provisioning/legacy-secret-alias-map.ts` imported by reader/service/tests | `provisioning/local-import-credential-alias-registry.ts` imported by reader/service/tests | Replace current-only policy owner; delete old file; no legacy constants/functions/re-export |
| `cli/import-local-environment-secrets.ts` imports old service and domain symbols | same CLI imports `LocalEnvironmentSecretImportService` from `local-environment-secret-import-service.js` and request/result/error symbols from `local-environment-secret-import.js` | Modify imports and symbols; CLI filename/command stay stable |
| `provisioning/local-import-target-resolver.ts` imports `LocalLegacyEnvironmentImportTarget` | same resolver imports `LocalEnvironmentSecretImportTarget` from `local-environment-secret-import.js` | Modify import/type only |
| `provisioning/local-environment-source-reader.ts` imports old error and legacy alias map | same reader imports `LocalEnvironmentSecretImportError` from `local-environment-secret-import.js` and the positive registry from `local-import-credential-alias-registry.js` | Modify imports/symbols and remove negative classifier/error |
| `tests/unit/secret-management/local-legacy-environment-import-service.test.ts` imports old service | `tests/unit/secret-management/local-environment-secret-import-service.test.ts` imports current service/domain paths | Rename test and imports; no compatibility-path assertion |
| `tests/unit/secret-management/local-environment-source-reader.test.ts` imports old error/alias map | same test imports current error/registry paths | Modify imports and recognize-first assertions |
| `tests/unit/secret-management/import-local-environment-secrets-cli.test.ts` exercises the stable CLI | same test exercises production CLI wired only to current domain/service paths | Retain filename; update expectations/imports where applicable |

These importer filenames and import edges are fixed by the clean-cut design. Other implementation filenames may follow established local conventions only where this package does not name an exact owner/path. A split rollout across packages is acceptable only on an isolated integration branch where the repository does not ship a mixed legacy/new runtime.

## Applied Patterns (If Any)

- **Ports and adapters:** management owns the backend port; first delivery registers InMemory and Local. Future Vault/AWS/Kubernetes implementations remain below the same port without changing callers.
- **Application provisioning service:** server maps semantic runtime need to authentication before calling reusable core factories.
- **Credential-owner descriptor:** models expose one non-secret credential provider identity; generic provisioning remains branch-free across direct and gateway runtimes.
- **Runtime-scoped registry synchronization:** remote discovery publishes by source/runtime rather than downstream provider, preserving native and gateway models together.
- **Tagged lifecycle capability:** one configured backend reports `WRITABLE` or `EXTERNALLY_MANAGED`; read-only Local real-E2E mode reports externally managed to ordinary runtime Settings.
- **Store-bound backend:** exact database/key/access configuration is fixed at bootstrap, preventing per-request cross-Store selection.
- **Ephemeral construction context:** serializable behavior config remains separate from runtime authentication.
- **Legacy-source non-authority:** startup projects only approved non-secret configuration, leaves historical sources unchanged, and never treats credential aliases or custom-provider-v1 as runtime authority.
- **Explicit operator transition boundary:** one typed command owns a deliberate legacy-source-to-current-Store transformation; it is not reachable from startup or runtime.
- **Plan then commit:** the importer validates source/mapping/target and derives a value-free plan before confirmation; one Local transaction applies the whole plan.
- **Policy-to-platform launcher:** one execution policy with explicit OS/container enforcement adapters.

## Target Subsystem / Folder / File Mapping

```text
autobyteus-ts/src/
  secrets/
  llm/                         # storage-neutral auth/context + existing factory/metadata clients
  utils/gemini-helper.ts        # shared exact Gemini auth + SDK construction
  tools/search/                # explicit executor/client auth
  multimedia/                  # explicit construction auth
  tools/file/ and tools/terminal/

autobyteus-server-ts/src/
  secret-management/
    domain/
    catalog/
    services/
    backends/
      local/                    # in-process Store-bound backend/crypto/repository/setup
    configuration/
    provisioning/                 # sensitive-name policy + explicit setup/import owner; no runtime caller
    cli/                          # thin operator adapters
  llm-management/provisioning/
  search-management/
  multimedia-management/
  agent-execution/security/

test-config/live-e2e.json
test-support/live-e2e/
```

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/secrets` | Folder | core safe value | transport-neutral secret wrapper | shared construction/backends | storage service/catalog |
| `autobyteus-ts/src/llm` | Folder | LLM factory/client/metadata | auth requirement/context, provider construction, and storage-neutral metadata mapping | existing owner | backend/Store resolution or mode selection |
| `autobyteus-ts/src/utils/gemini-helper.ts` | File | Google SDK construction boundary | exact shared Gemini auth union and exhaustive client construction | existing cross-family Google boundary | management, ambient config, fallback, metadata merge |
| `autobyteus-server-ts/src/secret-management` | Folder | management domain | catalog/service/ports/config/provisioning composition | new authoritative capability | provider SDK request logic |
| `.../backends` | Folder | adapter layer | Local/enterprise port implementations | custody mechanics separated | subject policy/UI |
| `.../backends/local` | Folder | in-process Local storage | physical Store lifecycle, pair binding, crypto, exact repository, direct setup provision | cohesive Local adapter internals inside server package | GraphQL, provider catalog, daemon/IPC, source/copy API |
| `.../configuration` | Folder | config plane | non-secret selection and backend construction | distinct from lifecycle | bootstrap tokens/values |

| `.../provisioning` | Folder | trusted Local setup transitions | hidden-input E2E provision and explicit legacy-source import orchestration | separates deliberate operator/setup flows from runtime management | generic runtime import, Store readback, GraphQL, arbitrary Store paths |
| `.../cli` | Folder | executable adapters | PNPM-invoked option/TTY/output translation | keeps shell surface thin | parsing policy, mapping, persistence, values |
| domain-specific `provisioning` folders | Folder | consumer family | resolve mapping and construct family client | avoids one provisioning god-object | persistence/crypto |
| `runtime-management/claude/authentication` | Folder | Claude runtime auth | exact mode, consumer identity, JIT resolution, failure mapping | specialized server runtime consumer | SDK environment/spawn or backend/catalog internals |
| `agent-execution/security` | Folder | first-delivery execution policy/launcher | realpath roots and empty-base environment/descriptor capability | cross-runtime hardening | secret resolving or strong-tier claim |
| `test-config` | Folder | tracked config | secret-free manifests | worktree automatic presence | capabilities/values |
| `test-support/live-e2e` | Folder | trusted harness | preflight/execution/evidence | narrow reviewed boundary | generic value export |

## Folder Boundary Check

| Path | Structural Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| core `llm`/`multimedia`/`tools` | Main-Line Domain-Control | Yes | Low | retains established product subjects |
| server `secret-management` | Mixed Justified with explicit subfolders | Yes | Medium | service, port, config, backends, and operator provisioning are one capability but structurally separated |
| server domain provisioning folders | Main-Line Domain-Control | Yes | Low | near runtime subject, depends on central management |
| server `secret-management/backends/local` | Persistence-Provider subfolder | Yes | Low/Medium | Local backend needs schema/crypto/repository/lifecycle separation but no executable/process package |
| `agent-execution/security` | Off-Spine Concern / enforcement | Yes | Low | one cross-runtime policy owner |
| `runtime-management/claude/authentication` | Main-Line Domain-Control | Yes | Low | separates mode/JIT consumer policy from SDK client delivery without a generic runtime-config bag |
| `test-support/live-e2e` | Operational control | Yes | Low | trusted live boundary isolated from ordinary tests |
| server `secret-management/provisioning` | Operational/setup control | Yes | Low | importer owns a user-invoked transition and reuses Local persistence without becoming runtime management |
| server `secret-management/cli` | Thin Entry | Yes | Low | executable adapters own only process I/O and typed invocation |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| dependency | `LLMProvisioningService -> SecretManagementService -> SecretStorageBackend` | LLM imports Local Store/Vault or consumer calls adapter | preserves authority and replaceability |
| factory input | `createLLM(id, {configInput, authentication})` then internal `{config, authentication}` | put `apiKey` in `LLMConfig.extraParams` | config remains serializable and secret-free |
| Store binding | backend constructed for exact real-E2E database/key; missing is failure | `real-E2E Store -> default Store -> process.env` fallback | prevents cross-environment surprise |
| test config | tracked logical ID/E2E filenames/read-only mode/scenario | copied `.env.test` or Store key bytes in Git | zero-copy without secret distribution |
| future enterprise extension | future server adapter may use workload identity; first delivery rejects unregistered kind | pretend Vault/Kubernetes adapter ships or share Local SQLite between replicas | honest deployment boundary |
| backend capability | test-only externally-managed descriptor disables writes | UI always offers replace/delete | fixes extension semantics without shipping vendor adapter |
| local encryption | in-process Local backend writes exact records atomically using vetted AEAD and SQLite transactions | every consumer edits encrypted files or uses custom cipher | clear consistency/crypto owner |
| local persistence | separate Store pairs with authenticated `store_id` verifier plus exact encrypted records | format-only metadata, one DB per worktree, ordinary app table, profiles, or Docker E2E mount | empty-Store key mismatch detection and physical isolation |
| Claude managed auth | exact runtime identity -> generic `resolveForUse` -> closed auth union -> exact child env | Claude-specific secret API, direct backend/catalog access, `LLMConstructionContext`, or caller `env` | reuses authority while preserving Claude-specific delivery/trust policy |
| local import command | `pnpm secrets:local:import -- --source /abs/copied-api-keys --target e2e --dry-run` then confirmed write | source search, `--store-db`, `--definition`, value flags, shell `source`, or test-runner import | explicit identity, no target ambiguity, no secret-bearing argv/environment |

### Local import command example

```text
pnpm secrets:local:import -- --source /absolute/path/to/.env.test --target e2e --dry-run
pnpm secrets:local:import -- --source /absolute/path/to/.env --target default
pnpm secrets:local:import -- --source /absolute/path/to/.env --target default --overwrite
```

The first command validates source trust, strict syntax, approved mappings, and target status, then prints only logical definition IDs and planned actions. If both selected Store files are absent, it reports `INITIALIZATION_REQUIRED` but remains zero-write. The second writes only records that are currently missing after the operator types `IMPORT DEFAULT STORE` on a direct TTY; it stage-initializes the selected pair first when required. The third is the only replacement form and requires the same confirmation. E2E writes require `IMPORT REAL-E2E STORE`. There is deliberately no noninteractive `--yes`, implicit target, target path, definition/value flag, environment override, removal mode, or source search.

### LLM construction example

```ts
type ResolvedLLMAuthentication =
  | { kind: "none" }
  | { kind: "apiKey"; apiKey: SecretValue }
  | { kind: "geminiAiStudio"; apiKey: SecretValue }
  | { kind: "geminiVertexExpress"; apiKey: SecretValue }
  | { kind: "geminiVertexProject"; project: string; location: string };

type LLMAuthenticationRequirement =
  | { kind: "apiKey"; credentialSlot: "apiKey"; required: boolean }
  | { kind: "geminiAuthenticationMode" }
  | { kind: "none" };

type LLMConstructionTarget = {
  credentialProviderId: string;
  authenticationRequirement: LLMAuthenticationRequirement;
};

async function createProvisionedLLM(modelIdentifier: string, configInput?: LLMConfigInput) {
  const target = LLMFactory.describeConstructionTarget(modelIdentifier);
  const authentication = await llmProvisioningService.resolveAuthentication(target);
  return LLMFactory.createLLM(modelIdentifier, { configInput, authentication });
}

// Inside LLMProvisioningService: the tagged requirement selects the existing owner branch.
switch (target.authenticationRequirement.kind) {
  case "none":
    return { kind: "none" };
  case "apiKey":
    return resolveGenericApiKey({
      kind: "llm",
      providerId: target.credentialProviderId,
      credentialSlot: target.authenticationRequirement.credentialSlot,
    }, target.authenticationRequirement.required);
  case "geminiAuthenticationMode": {
    if (target.credentialProviderId !== "GEMINI") {
      throw new Error("LLM_AUTHENTICATION_MODE_INVALID");
    }
    const geminiSetupMode = appConfigProvider.config
      .get("GEMINI_SETUP_MODE")
      ?.trim()
      .toUpperCase();
    switch (geminiSetupMode) {
      case "AI_STUDIO":
        return { kind: "geminiAiStudio", apiKey: await resolveAiStudioKey() };
      case "VERTEX_EXPRESS":
        return { kind: "geminiVertexExpress", apiKey: await resolveVertexExpressKey() };
      case "VERTEX_PROJECT": {
        const project = appConfigProvider.config.get("VERTEX_AI_PROJECT")?.trim();
        const location = appConfigProvider.config.get("VERTEX_AI_LOCATION")?.trim();
        if (!project || !location) {
          throw new Error("GOOGLE_WORKLOAD_IDENTITY_CONFIG_INVALID");
        }
        return { kind: "geminiVertexProject", project, location };
      }
      default:
        throw new Error("GEMINI_SETUP_MODE_INVALID");
    }
  }
}

// Inside gemini-helper.ts, exhaustively and only at the trusted SDK boundary.
switch (authentication.kind) {
  case "geminiAiStudio":
    return new GoogleGenAI({ apiKey: authentication.apiKey.revealToTrustedConsumer() });
  case "geminiVertexExpress":
    return new GoogleGenAI({ vertexai: true, apiKey: authentication.apiKey.revealToTrustedConsumer() });
  case "geminiVertexProject":
    return new GoogleGenAI({ vertexai: true, project: authentication.project, location: authentication.location });
}
```

The construction target contains exactly `{credentialProviderId, authenticationRequirement}`. `modelIdentifier` remains the separate input to `describeConstructionTarget` and `createLLM`; it is not duplicated inside the target. The target intentionally omits displayed/creator `providerId`. A remote AutoByteus model may display `OPENAI` or `GEMINI` while `credentialProviderId` is `AUTOBYTEUS`; only the latter can form the semantic credential consumer. The tagged `geminiAuthenticationMode` requirement alone enters the existing Gemini configuration branch, which requires one explicit setup mode before returning an exact resolved variant. The Gemini variants are intentionally not collapsed into generic `apiKey`: provider mode is behavior, not incidental key presence. `LLMConfig` remains secret-free and no client imports server storage.

### Gemini metadata construction example

```ts
// ModelMetadataProvisioningService preserves the original metadata contract
// while replacing ambient key selection with exact Store consumer resolution.
switch (geminiSetupMode) {
  case "AI_STUDIO": {
    const value = await secretManagementService.resolveForUse({
      kind: "llmMetadata",
      providerId: "GEMINI",
      credentialSlot: "geminiAiStudioApiKey",
    });
    return new GeminiModelMetadataProvider(value.revealToTrustedConsumer());
  }
  case "VERTEX_EXPRESS": {
    const value = await secretManagementService.resolveForUse({
      kind: "llmMetadata",
      providerId: "GEMINI",
      credentialSlot: "geminiVertexExpressApiKey",
    });
    return new GeminiModelMetadataProvider(value.revealToTrustedConsumer());
  }
  case "VERTEX_PROJECT":
  default:
    return undefined; // existing curated metadata only; zero metadata secret lookup
}
```

The server service owns explicit mode/consumer selection and provider caching. The core provider preserves the original Generative Language models request and response mapping for either selected key. `ModelMetadataResolver` preserves its existing live-over-curated merge and timeout/failure containment. This branch does not construct `GoogleGenAI`, does not use the LLM/media mode union, and does not add another credential lookup, ambient alias, endpoint fallback, or Vertex Project live provider.

### Claude managed child example

```ts
type ClaudeRuntimeAuthentication =
  | { kind: "cli" }
  | { kind: "managedApiKey"; apiKey: SecretValue };

async function prepareForClaudeLaunch(): Promise<ClaudeRuntimeAuthentication> {
  if (configuredMode === "cli") {
    return { kind: "cli" };
  }
  const apiKey = await secretManagementService.resolveForUse({
    kind: "agentRuntime",
    runtimeKind: "claude_agent_sdk",
    credentialSlot: "apiKey",
  });
  return { kind: "managedApiKey", apiKey };
}

function buildClaudeChildEnvironment(
  auth: ClaudeRuntimeAuthentication,
): Record<string, string> {
  const childEnv = buildRequiredClaudeOperationalEnvironmentFromEmptyBase();
  if (auth.kind === "managedApiKey") {
    childEnv.ANTHROPIC_API_KEY = auth.apiKey.revealToTrustedConsumer();
  }
  return childEnv;
}
```

`prepareForClaudeLaunch` belongs to `ClaudeRuntimeAuthenticationService`; the environment function is internal to `ClaudeSdkClient`. The returned environment is passed directly to the SDK child and is not returned to session/model-catalog callers. Production code scopes temporary references in `try/finally` and drops them after child construction/completion; it does not claim zeroization.

### Externally managed lifecycle example

```text
Settings asks status -> CONFIGURED / EXTERNALLY_MANAGED
Settings disables save/remove -> shows deployment provisioning instruction code
runtime resolve -> permitted through the base backend port
attempted write -> EXTERNALLY_MANAGED before adapter mutation
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| keep environment fallback during rollout | easier partial transition | Rejected | Store-only runtime; legacy sources remain untouched but non-authoritative; missing requires explicit provisioning |
| constructor overload `(model, config)` plus new context | incremental package updates | Rejected | update registry/classes/callers/tests atomically |
| keep custom-provider `apiKey` optional | old JSON compatibility | Rejected | v2 runtime only; v1 remains untouched and returns value-free reconfiguration guidance |
| keep `apiKeyConfigured` alongside richer status | UI compatibility | Rejected | update all in-repo GraphQL/UI consumers together |
| fallback/copy real-E2E Store from default Store | reduce setup | Rejected | hidden-input setup and the explicit importer both write one selected Store from operator-supplied input; neither decrypts/reads another Store |
| track Local Store key contents in test config | zero-touch worktrees | Rejected | root launcher derives non-secret paths; database/key bytes remain outside Git |
| keep named profiles in one Local database | reuse one file | Rejected | physically separate default/E2E databases and independent keys satisfy the actual two-context requirement |
| create same-user Local Store daemon/IPC | centralize one writer | Rejected | in-process backend plus SQLite transactions/locking; no meaningful identity boundary from daemon alone |
| use Electron `safeStorage` as default | desktop convenience | Rejected | cross-platform Electron-independent Local Store |
| import legacy plaintext automatically during startup/tests | convenience | Rejected | explicit `secrets:local:import` only; required absolute source/target/TTY and atomic Local setup boundary |
| generic assignment-file-to-any-backend importer | flexibility | Rejected | explicit absolute source, recognize-first current-alias selection, and closed local `default\|e2e` targets |
| keep credential `.env.test` loader for some suites | incremental test conversion | Rejected | one manifest/harness or synthetic backend |
| preserve Claude Agent SDK `auto` and `api-key` semantics | runtime compatibility | Rejected | exact `cli` or `managed-secret`; invalid legacy values fail before resolution/spawn, never map/fallback silently |
| add Claude-specific resolver/backend port | easy integration | Rejected | exact `agentRuntime` identity through existing `SecretManagementService.resolveForUse` |
| use SDK package-internal API-key file descriptor now | narrower environment exposure | Deferred | not a stable public cross-platform SDK contract; explicit exact child `env` plus managed tool/settings restrictions is supportable now |

## Derived Layering (If Useful)

This is explanatory only; ownership above governs:

```text
Client/transport
  -> subject service or storage configuration service
  -> consumer provisioning / SecretManagementService
  -> SecretStorageBackend port / core client factory
  -> Local Store or enterprise custody / provider SDK
  -> external provider
```

Configuration and lifecycle are sibling application concerns: the configuration service constructs/selects the backend, while the management service uses the injected backend. Neither is “inside” the other. The service-over-backend relation applies to secret lifecycle and resolution.

## Change / Refactor Sequence

1. **Establish contracts and safe values.** Add `SecretValue`, authentication/context types, minimal definition bindings, healthy-only definition status, five-state backend health, tagged lifecycle capability, backend ports, error sanitizer, and synthetic conformance tests.
2. **Add server management/configuration composition.** Implement catalog, management service, InMemory adapter, typed configuration service/repository/factory, degraded control-plane health and value-free events. Register only InMemory/Local first-delivery kinds; unsupported enterprise kinds fail without fallback.
3. **Refactor core clients atomically.** Change `LLMFactory` and every LLM constructor; remove environment reads; then convert metadata, search, media, and custom endpoint objects. Add consumer provisioning services and update all call sites.
4. **Reconnect AutoByteus remote behavior through managed custody.** Add `provider.autobyteus.api-key` and exact discovery/construction bindings; introduce the server-owned typed discovery service; make core providers explicit-auth and storage-neutral; add `credentialProviderId` plus runtime/model-kind scoped registry synchronization; reconnect every established startup/list/reload and LLM/audio/image construction caller before deleting the ambient alias path.
5. **Implement the in-process Local backend.** Add server-local Store configuration, staged pair initializer, store ID/authenticated verifier, independent key loading, encrypted repository, read-write/read-only variants, direct target-only host E2E provisioning, an internal setup-only atomic batch, reset separation, health mapping, and conformance/security tests. Normal bootstrap derives files below `serverDataDir`; do not change Docker Compose/launcher and add no process/package/protocol.
6. **Remove automatic legacy updates and enforce non-authority.** Make the non-secret environment projection own its broader fail-closed exclusion rule; it may consume the current alias-name view exported by the positive local-import registry, but that broader rule never flows into import eligibility. Remove the startup cutover call/rewriter/ledger and the legacy-named alias-map file; add no compatibility export. Remove AppConfig secret APIs/browser-public fields; leave application `.env` and parent aliases unchanged but unread; preserve approved non-secret settings without dropping credential lines; make custom-provider storage v2-only and return value-free guidance for untouched v1; reject legacy Claude `auto|api-key`; remove every legacy fallback.
7. **Update Settings.** Preserve current access, route write-only values through subject services including the existing AutoByteus provider row, expose rich status/capabilities, and add non-secret backend configuration where safe. Externally managed writes are disabled; established AutoByteus reload triggers remain.
8. **Deliver first-phase governed-launch hardening, preserve external Codex, and deliver Claude two-mode auth.** Route file tools through realpath roots and governed process/PTY/Claude/MCP/browser/application-worker launch paths through empty-base environment/descriptor policies. Restore the pre-ticket Codex client `options.env ?? process.env` path and remove its ticket-added child-environment helper import; add no Codex auth subsystem and exclude it from the environment claim. Add `ClaudeRuntimeAuthenticationService`, exact catalog binding, SDK child builder, managed setting/tool policy, early diagnostics, and complete no-fallback failures. Report `LOCAL_HARDENED` only within its stated boundary; do not claim secrecy from Codex inherited state, the authorized Claude child, or strong identity/container/network isolation.
9. **Replace host-worktree test provisioning.** Add tracked `test-config/live-e2e.json`, one-time separate host real-E2E Store setup, read-only host path derivation and preflight, disposable Local CRUD fixtures, synthetic/direct/gateway/managed-Claude/AutoByteus-remote harnesses; remove dotenv loaders/copy docs/env gates. Do not introduce Docker E2E path/mount behavior.
10. **Prove the extension contract without an enterprise adapter.** Run conformance against InMemory, Local read-write/read-only, and a test-only externally-managed fixture; document that multi-node centralized custody and strong worker deployment are future deliveries.
11. **Correct the explicit local import boundary.** Keep the typed `LocalEnvironmentSecretImportService`, closed target-role resolver, target-specific direct-TTY confirmation, and atomic Local batch. Rename `local-legacy-environment-import.ts` to `local-environment-secret-import.ts`, rename its exported types/errors, and update the CLI, source reader, target resolver, service, and tests in the same change; remove the old file with no compatibility re-export. Likewise rename the service and positive-registry files exactly as mapped above and retain no legacy wrapper. Change the source reader to file-safe recognize-first selection, delete unsupported-secret classification/error and `IMPORT_SOURCE_EMPTY_CREDENTIAL`, normalize valid empty recognized assignments to absence before selected-entry/duplicate tracking, retain populated selected syntax/dynamic/duplicate validation, retain only the supported `DASHSCOPE_API_KEY` Qwen mapping and keep `QWEN_API_KEY`/ZHIPU unmapped, normalize one optional PNPM sentinel in the root/CLI adapter, and keep ignored/empty-placeholder content absent from dry-run/result. Keep hidden-input E2E setup. Add deterministic source/trust/selected-parser/plan/transaction/isolation/leak coverage; do not call the importer from startup, UI/API, or tests.
12. **Integrate `repository_prisma@1.0.8` as a clean replacement without ownership or probe drift.** Update the server manifest and regenerate the lock from the attested artifact; preserve Prisma/client `5.22.0`. Delete the obsolete `repository_prisma@1.0.6` patched-dependency key/file and create no replacement patch, wrapper, dual path, or fallback. Replace the current server-cwd/parent-env policy child with exact installed ESM/CommonJS entrypoint probes using an empty temporary cwd, empty-base platform-minimal environment, no dotenv/home/path/Node/database/provider state, absolute `shell:false` invocation, and narrow synthetic Prisma preloads. Run static no-dotenv checks, import-only zero-acquisition, separate default/environment/typed log-option phases, clean/frozen install, build, CR-009–CR-014, and restart/reopen regressions. Remove every `1.0.6`/`1.0.7` resolution or patch residue and make no production database-owner/schema/data change.
13. **Preserve the two original Gemini contracts.** Keep CR-020 exact-mode LLM/media mapping and exhaustive helper construction. Do not widen that union into metadata. Preserve `ModelMetadataProvisioningService` exact AI Studio/Vertex Express consumer selection, existing trusted reveal into `GeminiModelMetadataProvider`, the Generative Language request/response mapping, Vertex Project zero metadata lookup, and live-over-curated resolver semantics. Add no metadata client rewrite, endpoint change, inference, alternate-definition retry, alias, ambient source, or service. Run only proportionate preservation tests before resuming broader real coverage.
14. **Final security/removal gate.** Search for credential aliases/fields/env reads/parent-env spreads/Claude legacy modes/caller env/broad settings/raw diagnostics/automatic legacy updates and fallback; verify every AutoByteus discovery/construction caller remains connected; verify package evidence contains no query/datasource/provider value; run legacy-source non-authority, importer, backend health/pair, UI, real-provider including managed Claude and AutoByteus remote LLM/audio/image, hardening, negative-leak, artifact-redaction, clean-install, build, and restart/reopen coverage. Do not ship a mixed dual path.

## Key Tradeoffs

### In-process Local backend versus a Local Store process

The selected in-process backend keeps authority in Agent Server and relies on SQLite transactions/locking for multiple local processes. A same-user daemon would add installation, lifecycle, IPC, versioning, and packaging without meaningful isolation because the same identity can still access its channel/files. A future separate broker is justified only with an enforceable different identity/authorization boundary.

### Cross-platform owned encryption versus OS keychains

One implementation avoids Electron and platform lock-in. It must use vetted authenticated encryption and has an honest automatic key-file-unlock limitation: equivalent-user access to database/key files weakens protection. Strong mode therefore depends on process/filesystem identities or external custody, not cryptographic marketing.

### Separate physical Stores versus profiles in one database

Separate host `secret-store.db` and `real-e2e-secret-store.db` files with independent keys directly model the two approved host contexts. They remove profile tables/lifecycle, improve backup/reset isolation, and prevent host test runtime selection of normal records. The Stores never inherit and there is no security-sensitive cross-Store decrypt/re-encrypt command. Operators may provision dedicated test credentials independently through hidden input or explicitly import approved aliases from one trusted plaintext source into the selected E2E Store; the importer never opens the default Store for an E2E operation. Normal Docker owns its own default Store below its existing data directory and is deliberately not joined to this host test arrangement.

### Explicit importer versus automatic startup import

The user selected only the explicit operator path. Automatic startup import, copy, scrub, delete, rewrite, or conversion would add trusted mutation and recovery behavior while overriding operator ownership of legacy files. The explicit command remains useful for arbitrary/copied files and host E2E setup; it requires source/target selection, preview, and confirmation and never mutates the source. Startup performs no legacy credential update. JavaScript cannot prove zeroization of all importer-created strings, so the importer minimizes lifetime and outward channels without claiming impossible memory erasure.

### Construction context versus expanding `LLMConfig`

The context cleanly separates serializable behavior config from runtime authentication while retaining factory composition. It requires an atomic constructor migration but avoids a permanent unsafe config shape.

### AutoByteus gateway credential owner versus downstream model provider

Using downstream/displayed `providerId` for an AutoByteus-runtime model would resolve the wrong key; branching on runtime inside every provisioning service would duplicate policy. One required `credentialProviderId` is materialized when a model is registered: native definitions assign their credential owner once, while gateway definitions assign `AUTOBYTEUS`. `describeConstructionTarget` then returns only that field plus the tagged authentication requirement; displayed provider is absent and cannot be used as a fallback. The field is non-secret and is never a definition/path selector.

### Shared remote discovery service versus factory-owned ambient discovery

Core factories cannot resolve server custody without reversing dependencies. Three separate server resolvers would duplicate host, failure, and catalog policy. One model-kind-aware `AutobyteusRemoteModelDiscoveryService` sits above management and core providers, reuses exact consumers, and lets established LLM/audio/image catalog wrappers keep their public triggers. This preserves functionality without a god-object or ambient fallback.

### Writable and externally managed ports

Two capability levels prevent the product from forcing Kubernetes mounts/company GitOps into lifecycle semantics they do not support. UI complexity increases slightly because write controls depend on effective capability.

### Real gateway and direct-secret modes

Gateway mode narrows broad key exposure; direct mode proves the actual key-to-SDK path. Both are necessary, with reviewed direct execution and scenario-scoped access.

### Enterprise adapter deferral

First delivery implements no Vault/AWS/Kubernetes adapter. This keeps the foundation bounded while making the limitation explicit: multi-node centralized custody is not available without a separately installed future adapter. The typed registration/configuration/lifecycle/health/conformance contract is fixed now so a later adapter does not change management or consumer paths. Vault KV v2 remains a future recommendation, not an acceptance dependency.

### First-delivery assurance

`LOCAL_HARDENED` removes credential dotenv from current runtime/worktree loading and ambient child-environment paths for the governed launchers without pretending that operator-owned legacy plaintext has disappeared or that same-user processes are isolated. Built-in file tools deny server-data roots, but unrestricted equivalent-user access remains outside the claim. Codex App Server is also explicitly outside the child-environment portion of this tier because the user chose to preserve its external `codex login` environment/home. This is the simplest coherent first release and matches unchanged local Docker. `STRONG_AGENT_ISOLATION` requires a separate delivery with concrete OS/container identity, mount, descriptor, and network enforcement.

### External Codex preservation versus an AutoByteus auth subsystem

Codex already owns login, account state, configuration root, and app-server authentication. Adding an AutoByteus mode/service/Store binding would duplicate ownership and exceed the user decision; forcing the existing client through a synthetic home demonstrably breaks the established path. The clean target restores the single pre-ticket launch and explicitly excludes its inherited environment from the hardening claim. This is not a compatibility wrapper or fallback: there is one Codex path, owned externally.

### Exact Gemini variants versus one generic API-key variant

AI Studio and Vertex Express both carry an API key but require different Google SDK construction for LLM/media. A generic `{kind:"apiKey"}` there erases required semantics, so CR-020's discriminated variants remain correct. Metadata is not another SDK-construction consumer: the accepted original behavior deliberately sends either selected key to the same Generative Language models endpoint. Keeping a raw key only at that trusted request adapter is tighter than forcing an irrelevant mode/SDK DTO into it. This preserves functionality and avoids a provider rewrite, another abstraction, or false unification.

### Claude child environment versus broker/file descriptor

The pinned public SDK contract supports an explicit child `env`, so first delivery can deliver one managed key without another process/protocol or SDK fork. The tradeoff is explicit: the authorized Claude executable and its runtime memory can observe the key. Managed setting/tool restrictions prevent supported descendant inspection/propagation, while parent/sibling/other-child environments remain clean. A package-internal file-descriptor mechanism was investigated but deferred because it is not a stable public cross-platform SDK contract; it may be reconsidered later without changing the consumer/service architecture.

### Upstream `1.0.8` versus a retained local package patch

Verified `repository_prisma@1.0.8` supplies both required policies upstream: neither entrypoint loads dotenv or discovers `.env`, and query logging is default-off with explicit opt-in. Retaining or rebasing AutoByteus's old package patch would therefore be legacy code with no remaining requirement. The clean replacement removes patch metadata/file and validates exact upstream bytes. The tradeoff is that package behavior becomes an external dependency, controlled by exact lock/provenance plus static and isolated dynamic regression evidence rather than a local code fork.

### Dependency integration versus database-owner adoption

`repository_prisma@1.0.8` retains lifecycle improvements that resemble reviewed AutoByteus lazy-owner behavior, but similarity is not authority to replace proven production ownership inside a security-critical ticket. AutoByteus keeps its configured Prisma owners; this ticket installs and validates the dependency only. A later production adoption requires a separate approved behavior, full spine, owner transition, and data-lifecycle design.

## Risks

| Risk | Consequence | Mitigation / Gate |
| --- | --- | --- |
| same-user Local Store probing | first delivery does not prevent hostile equivalent-user access | explicit `LOCAL_HARDENED` status/docs; no strong claim; future separate-identity delivery |
| encryption/staged-pair-write defect | disclosure/corruption or partial pair | domain-separated HKDF/AES-GCM, authenticated store/key verifier, staged fsync/rename, fail-closed partial-pair/tamper/crash tests |
| Local Store key bytes copied into worktree/env | recreated leak | owner-only canonical key files, scans, no raw key CLI/env input |
| unresolved consumer still reads env | bypasses architecture | alias/source scans plus real construction tests; no fallback |
| AutoByteus discovery callers remain disconnected | configured remote LLM/audio/image functionality disappears | BEH-013 source-path tests, existing Settings/reload trigger coverage, server discovery service reachability, and real remote scenarios |
| remote model resolves downstream-provider key | gateway authentication fails or wrong credential reaches the wrong endpoint | explicit `credentialProviderId=AUTOBYTEUS`; catalog tests; remote OpenAI/Gemini construction test |
| provider-scoped remote replacement removes native models | catalog regression | synchronize by `runtime=AUTOBYTEUS` and model kind; coexistence regression test |
| mixed old/new package call sites | runtime break or fallback pressure | atomic core constructor cutover on isolated branch |
| custom base URL exfiltration/SSRF | sends key to unintended endpoint | server-owned HTTPS/loopback/redirect/DNS/private-network policy; never agent supplied |
| backend/Store non-ready | provider outage | five-state health, degraded value-free Settings/control plane, provider/write fail-closed, never fallback |
| host default/E2E Store path confusion | normal/test cross-use | exact bootstrap binding, independent files/keys, read-only host E2E open, no fallback, dedicated test credentials |
| operator selects wrong import target or overwrites valid records | normal/test credential contamination or outage | mandatory explicit `default\|e2e`, target-specific direct-TTY phrase, no replacement by default, separate `--overwrite`, dry-run, canonical internal target resolver, no caller target paths |
| untrusted/raced source or malformed populated selected credential reaches Store | import wrong bytes or partial/ambiguous records | non-mutating owner/private-access/symlink/open-fstat checks, 1 MiB/UTF-8/NUL limits, recognize-first exact aliases, valid recognized static grammar, empty-as-absent normalization, populated-only duplicate/dynamic rejection, selected-set validation before write, one transaction; unrelated lines are ignored, not validated |
| importer leaks parsed values through diagnostics or runtime copies | credential disclosure | no argv/env/shell/value output; value-free stable errors; direct in-process encryption; best-effort buffer overwrite/reference release; negative canary scans; explicit no-zeroization guarantee |
| legacy source remains after successful import | same-user plaintext residual persists | source never mutates implicitly; success reports a value-free follow-up instruction for operator-controlled cleanup/rotation outside this ticket |
| concurrent writer or uncheckpointed read-only open | lock failure or stale/incomplete host E2E read | SQLite transaction/busy policy; setup checkpoints/closes before host read-only execution; CRUD uses disposable Store |
| direct test code exfiltrates key | provider-key compromise | implementation source review before direct execution, declared scenarios, narrow process, rotation and sanitized evidence |
| agent worker shares trusted container | same-user Store access remains possible | first delivery reports only `LOCAL_HARDENED`; strong enforcement is explicitly deferred |
| Codex inherits external operator environment/home | ambient operator state is observable by the Codex external runtime and is outside the governed-launch guarantee | explicit user-approved exclusion; preserve only the pre-ticket client path; no Store resolve or AutoByteus auth lifecycle; document that `LOCAL_HARDENED` does not cover Codex inheritance |
| Gemini LLM/media mode collapses to generic API key, or metadata is unnecessarily rewritten as an SDK-mode client | LLM/media select the wrong service, or accepted dual-key metadata behavior changes under a security refactor | exact Gemini variants/exhaustive helper only for LLM/media; selected Store consumer plus preserved Generative Language provider for metadata; focused contract tests and no ambient/alternate-definition fallback |
| automatic legacy mutation regresses into startup | operator-owned sources are altered or historical credentials regain authority | remove the updater/call/ledger; byte-unchanged synthetic fixtures; name-first exclusion; v2-only custom provider reader; no Store operation or fallback |
| future externally managed status stale | later adapter UI/runtime ambiguity | fixed health/lifecycle extension contract and conformance fixture before vendor delivery |
| Claude managed child observes/retains its credential | agentic recipient or compromised SDK could expose the key | explicit opt-in/default CLI, test-scoped keys, exact consumer/JIT delivery, `tools: []`, restricted settings/MCP, early redaction, documented `LOCAL_HARDENED` limit; no false zeroization claim |
| legacy Claude `auto` and `api-key` breaks | existing implicit/API-key launch configuration no longer starts | stable `CLAUDE_RUNTIME_AUTH_MODE_INVALID`, remediation to choose `cli` or provision/select `managed-secret`; no silent mapping/fallback |
| a future `repository_prisma` artifact regresses to default query logging | raw SQL/application data could enter logs or agent-visible evidence | exact `1.0.8` lock/provenance, static ESM/CJS inspection, default/environment/typed synthetic log-policy probes, value-free evidence scan |
| a future package/probe regression discovers dotenv from project cwd or inherited state | a supported legacy credential source could be loaded into validation | exact installed entrypoint static scan; new empty temporary cwd; empty-base platform-minimal env; no parent/home/path/Node/dotenv/database/provider variables; `finally` cleanup |
| synthetic Prisma interception is broader than the exact peer import | probe can mask unrelated package behavior and produce false confidence | ESM loader/CJS preload intercept only literal `@prisma/client`, delegate every other module, assert exact entrypoint kind and fixed constructor counts |
| obsolete patched-dependency metadata/file or old resolution remains | dual integration/legacy code persists or clean installation diverges | remove root patch key and old patch file; create no replacement patch; require one exact `1.0.8` lock resolution and clean frozen install |
| dependency lifecycle is adopted as a new production owner opportunistically | duplicate/conflicting Prisma lifecycle and datasource authority | prohibit production imports/owner replacement in this ticket; retain AppConfig/configured-client and bounded lazy-owner regressions |
| over-large first delivery | integration risk | Local/InMemory only, one bounded Local importer plus existing hidden setup, lower-tier hardening only, clean-cut final gate |

## Guidance For Implementation

### Invariants to encode in types and tests

- authentication is mandatory factory input even when `kind: "none"`;
- Gemini LLM/media exact mode is never represented as generic API-key plus optional flags;
- Gemini metadata accepts only one already-selected resolved key at its trusted request boundary, preserves the fixed product-owned Generative Language endpoint, and cannot inspect ambient aliases or choose/retry another definition;
- `LLMConfig`, model metadata, provider JSON, GraphQL outputs, manifests, and events cannot contain `SecretValue`/raw string fields;
- backend/Store or enterprise namespace is bootstrap-bound, never per resolve request;
- lifecycle write is impossible through the base read/status port;
- externally managed adapters cannot be downcast based only on vendor kind;
- backend health and per-definition state cannot represent impossible combinations; definition state exists only at `READY`;
- status and errors contain no value-derived hints;
- missing/locked/unavailable/corrupt/incompatible never triggers fallback;
- current-format Local Store open authenticates database/key pairing before readiness even with zero records;
- agent launch environment starts empty and is allowlisted;
- Claude mode is exactly `cli|managed-secret`; legacy/unknown modes are unrepresentable after validation;
- CLI mode makes zero secret-management calls; managed mode uses one exact consumer and no alternate definition/backend/ambient fallback;
- only the exact managed Claude child environment contains `ANTHROPIC_API_KEY`; parent/sibling/other/tool children do not;
- Claude start/model-discovery inputs cannot supply arbitrary `env`, and managed setting/tool policy cannot load supported environment-inspection/spawn paths;
- diagnostic input is redacted before buffering.
- `provider.autobyteus.api-key` is the sole AutoByteus gateway definition; discovery and construction consumers are distinct but share it;
- no configured AutoByteus hosts means zero discovery resolution calls and authoritative clear of the matching AutoByteus runtime subset;
- every AutoByteus-runtime model has `credentialProviderId=AUTOBYTEUS` regardless of downstream provider;
- remote synchronization changes only the corresponding AutoByteus-runtime subset and preserves native same-provider models;
- no current core/server/test runtime path retains or reads `AUTOBYTEUS_API_KEY`; only the explicit importer may parse it from its operator-selected source.
- local import request is exactly absolute source + closed `default|e2e` target + `dryRun` + `overwrite`; no Store path, definition, value, backend, or environment fields exist;
- dry-run and failed/cancelled validation make zero mutations; writes are direct-TTY-confirmed and one-transaction atomic;
- both-absent selected pair is importer-only `INITIALIZATION_REQUIRED`; dry-run does not create it, confirmed execution uses the existing staged initializer, and a partial pair remains fail-closed `CORRUPT`;
- import output/errors contain only target status, definition IDs, closed actions/counts/instruction codes; parsed values never enter argv, `process.env`, shell commands, logs, reports, or serialized plans;
- startup performs no automatic legacy import, copy, scrub, delete, rewrite, or conversion; application `.env`, parent aliases, and custom-provider-v1 stay untouched and non-authoritative;
- non-secret configuration is admitted by approved name before value retention, and non-secret writes preserve excluded source lines; custom-provider-v1 returns only stable value-free reconfiguration guidance;
- the explicit importer is never invoked by startup, runtime, UI/API, agent execution, or tests.
- exactly one attested `repository_prisma@1.0.8` resolution exists; no `1.0.6`/`1.0.7` resolution or `repository_prisma` patched-dependency key/file remains;
- each exact installed ESM/CommonJS entrypoint is imported from a new empty temporary cwd by an absolute `shell:false` child with an environment built from `{}`; parent canary, `DOTENV_CONFIG_*`, `DATABASE_URL*`, provider aliases, home/path, `NODE_OPTIONS`, and `NODE_PATH` are absent;
- static checks prove exact installed ESM/CJS entrypoints contain no `dotenv/config` or `.env` discovery, and import is side-effect free with respect to Prisma constructor/acquisition and datasource requirement;
- ESM/CJS synthetic preload code intercepts only `@prisma/client`, delegates every other module, performs no network/database/query, and is removed with the temp fixture in `finally`;
- package log configuration excludes `query` by default, supports documented truthy `PRISMA_LOG_QUERIES` and typed opt-in, honors typed false over environment true, and returns a stable value-free conflict when rebound incompatibly;
- `repository_prisma` is not imported by production database owners, and Prisma/client versions, schemas, migrations, application SQLite data, Local Stores, and Docker topology remain unchanged.

### Startup/composition

Initialize the non-secret configuration projection before provider/agent consumers: admit only approved non-secret names, exclude sensitive aliases before value retention, and leave the source unchanged. The current custom-provider store accepts v2 only and maps detected v1 to stable value-free reconfiguration guidance without rewriting it. Remove the automatic legacy updater rather than routing credential handling through the Prisma-backed ordinary app-data migration runner. Then validate a registered backend kind, construct the adapter, and obtain lifecycle/health. When backend health is non-ready, start the value-free Settings/configuration/health control plane only; provider consumers and writes remain disabled. Derive only `LOCAL_HARDENED` after its checks pass, then build allowed routes. Curated provider/model listing remains available without live enrichment credentials.

Cache preloading retains its established LLM/image/audio list calls. The server model-provider wrappers invoke `AutobyteusRemoteModelDiscoveryService.ensureDiscovered(modelKind)` before first cache publication. With no hosts, the service clears only the matching AutoByteus runtime subset without touching secret management. With configured hosts but missing/non-ready custody, a transient refresh preserves the last-known-good remote subset and the rest of each catalog stays usable; before any success that subset is absent. Full reload reinitializes the ordinary registry, refreshes AutoByteus remote models, and publishes the combined cache. Targeted `AUTOBYTEUS` reload invokes only remote LLM discovery. Saving the AutoByteus credential preserves the existing UI-triggered full reload across LLM/audio/image; removing it clears every AutoByteus runtime subset without discovery.

### LLM factory API

Current:

```ts
LLMFactory.createLLM(modelIdentifier, configInput?)
```

Target:

```ts
LLMFactory.createLLM(modelIdentifier, {
  configInput,
  authentication,
})
```

The factory, not its caller, computes effective `LLMConfig` and constructs `LLMConstructionContext`. Do not create `LLMRuntimeConfig`, make authentication optional, add a resolver singleton, or let each LLM call secret management.

`describeConstructionTarget` returns exactly `{credentialProviderId, authenticationRequirement}`. It does not return displayed/creator `providerId` or a duplicate top-level credential slot. Native model registration assigns the credential owner once; every remote AutoByteus model assigns `AUTOBYTEUS`. `LLMProvisioningService` uses `credentialProviderId` verbatim to build the generic LLM consumer and obtains `credentialSlot` from the tagged requirement. Audio/image targets expose the same ownership fact to `MediaClientProvisioningService`. Never infer or fall back to credential ownership from displayed provider, host strings, model identifiers, runtime, or client classes during provisioning.

Core AutoByteus providers accept explicit resolved API-key authentication and return parsed model arrays. Core factories expose runtime-scoped replace/sync/clear operations. They do not call secret management, inspect `AUTOBYTEUS_API_KEY`, or silently remove discovery. A transient pre-authoritative discovery failure preserves the prior remote subset; a successful authoritative empty result clears that model-kind subset; explicit credential removal clears all AutoByteus-runtime subsets without discovery.

### Local Store

Use `${serverDataDir}/secret-store/` for a normal server's Local Store. Electron resolves under `~/.autobyteus/server-data/secret-store/`; normal Docker resolves under `/home/autobyteus/data/secret-store/` inside its existing volume without Docker file changes; a single Kubernetes server Pod may use its own PVC. Each writable Local Store belongs to one node/volume and is never shared by replicas. Multi-node deployment is unavailable until a future enterprise adapter is installed. Host real E2E binds to separate `real-e2e-secret-store.db`/key. The in-process backend opens one configured pair; do not add a daemon, IPC, profile, runtime selector, or Docker E2E mount.

Current-format singleton metadata stores schema/encryption/verifier versions, random 16-byte `store_id`, verifier nonce/ciphertext/tag. Creation generates an independent random 32-byte root key and Store ID, derives a pair-verifier key using HKDF-SHA-256 with Store ID salt and `autobyteus/local-store/pair-verifier/v1` info, then AES-256-GCM encrypts a fixed format constant with canonical format/Store-ID AAD. Secret records use a distinct HKDF domain and fresh 12-byte nonce/16-byte tag. Staged temp-file creation is fsynced and renamed fail-closed; a crash may leave a partial pair, which opens as `CORRUPT` and is never completed/regenerated silently. Every read-write/read-only open authenticates the verifier before readiness. A wrong key, one missing file, verifier tamper, or current-format missing verifier is `CORRUPT`; unsupported schema/encryption/verifier version is `INCOMPATIBLE`.

Writable mode uses exact SQLite transactions and bounded busy handling. Read-only mode creates/migrates nothing and exposes no save/remove. The package-internal Local batch operation exists only for explicit setup/import and is not added to `SecretStorageBackend` or `SecretManagementService`. Startup contains no automatic legacy updater and performs zero legacy-source-to-Store operations. Trusted host E2E hidden-input setup opens only the E2E target, writes/checkpoints/closes, then permits read-only execution. The separate explicit importer resolves either `default` or `e2e` internally, opens only that target, and uses the batch after complete validation and target-specific TTY confirmation; it never reads/copies another Store. Ordinary reset preserves Stores unless one exact pair is confirmed. Never accept key bytes or provider values through CLI arguments or ordinary environment.

The importer requires an operator-supplied absolute path and accepts any basename or extension, including the current application `.env`, extensionless files, and renamed copies; it never searches or infers. Verify a regular non-symlink file owned by the current identity with private access, then confirm the opened handle still identifies the verified file. POSIX requires current UID and no group/other permission. Windows requires a non-mutating current-user-exclusive ACL verifier; otherwise fail closed rather than editing the source ACL. Enforce only file-level 1 MiB, valid UTF-8, and no-NUL rules globally. Then recognize exact current alias names before assignment parsing. For a recognized alias, require the supported static same-line grammar. After unquoting and outer-horizontal-whitespace normalization, treat `NAME=`, whitespace-only, `NAME=""`, and `NAME=''` as absent/non-selected. Empty occurrences create no entry and do not participate in duplicate detection; one populated occurrence is selected, while two populated occurrences reject. Populated selections reject interpolation/command substitution. Malformed recognized syntax still rejects. Never use shell `source`, generic dotenv execution, or `process.env`. Ignore every unrecognized or unrelated line without parsing/retaining its right-hand side or producing ignored-line metadata. For Qwen, recognize only `DASHSCOPE_API_KEY`. `QWEN_API_KEY` and `ZHIPU_API_KEY` are deliberately absent from the registry and non-blocking.

### Gemini/workload identity

Represent AI Studio, Vertex Express, and Vertex Project as explicit non-secret setup modes and exact resolved construction variants for LLM/media. The AI Studio and Vertex Express write-only credential slots are saved/removed independently; selecting an API-key mode requires its own slot and returns `geminiAiStudio` or `geminiVertexExpress`, never generic `apiKey`, never fallback, and never implicit deletion of the inactive slot. Vertex Project validates project/location through the non-secret config owner and returns `geminiVertexProject`. `gemini-helper.ts` exhaustively maps to `GoogleGenAI({apiKey})`, `GoogleGenAI({vertexai:true,apiKey})`, or `GoogleGenAI({vertexai:true,project,location})`; it never infers mode from value presence. Metadata retains the original separate behavior: AI Studio/Vertex Express resolve their exact metadata slot and pass the selected value to the Generative Language provider; Vertex Project performs no metadata secret lookup and uses curated data. Agent children receive neither project identity mount/home/metadata route nor token.

### Custom provider transaction

Validate the normalized provider metadata/base URL and probe with transient input before allocating the provider UUID. Persist metadata-only v2 using that UUID, then save the derived secret through the custom-provider consumer identity, and refresh models only after both succeed. If the secret save fails, remove the newly allocated metadata record before returning failure; no plaintext was persisted. Delete removes the derived secret, then metadata, then refreshes the catalog. Never persist a duplicate credential ID when it is derivable from UUID.

Delete is idempotent for custom providers: when the requested custom provider and derived record are already absent, return the same value-free success outcome without attempting a model mutation that can recreate or expose state. Built-in provider deletion remains rejected by the existing subject rule.

### Settings input and status

Keep a raw credential only in the active editor component and write-only GraphQL variable long enough to submit. Never place it in Pinia/cache/routes/browser storage/analytics or prefill it. Clear after success/close. Status returns backend health plus nullable healthy-only definition state and separately owned provider validation. Non-ready health disables writes/provider use and shows a stable instruction. Local writable enables write-only controls. Externally-managed UI behavior is covered through a test descriptor as an extension contract; no enterprise adapter ships. Saved backend changes report restart-required.

Claude introduces no second credential field and no first-delivery runtime-mode UI. The existing Anthropic credential editor provisions `provider.anthropic.api-key`; consumer authorization determines whether native Anthropic and explicit managed Claude may use it. `CLAUDE_AGENT_SDK_AUTH_MODE=cli|managed-secret` is validated non-secret server startup configuration, omitted means `cli`, and invalid legacy values produce value-free startup/runtime guidance.

AutoByteus introduces no new Settings page. The existing built-in `AUTOBYTEUS` provider row uses the standard write-only editor and receives normal backend/storage status instead of being treated as not applicable. `AUTOBYTEUS_LLM_SERVER_HOSTS` stays in the endpoint Settings card. Saving/replacing the key preserves the current full-reload trigger; provider-scoped reload preserves the current LLM-only targeted behavior. Removing the key is idempotent and clears all AutoByteus runtime subsets without resolving the removed definition. No saved value is returned.

### Isolation

File tools use canonical realpaths and approved roots. Every governed process-capable runtime uses an empty-base allowlist and explicit descriptor policy, but equivalent-user process access is not prevented. The exact managed Claude child is the only Store-resolved provider-key recipient; parent, siblings, unrelated governed runtime children, and AutoByteus-owned tool children remain secret-free. Codex App Server is deliberately not a governed launcher here: preserve its pre-ticket external-login environment/home and state that the tier makes no non-inheritance claim for Codex. First delivery reports only `LOCAL_HARDENED` within this exact boundary and does not claim secrecy from Codex inherited state or the authorized Claude child. `STRONG_AGENT_ISOLATION`, platform-specific separate identities, worker Pods, network/metadata denial, and strong acceptance evidence are deferred.

For stdio MCP specifically, compose the child environment from the sanitized operational base and then add the exact authorized `config.env` entries for that server. Do not treat `config.env` as the base (which would drop required operational entries), and do not restore broad `process.env` inheritance. Provider keys, Store paths/keys, backend descriptors, and unrelated sentinels remain excluded unless an explicit MCP contract separately authorizes a non-secret entry.

### Claude runtime authentication

Replace `buildClaudeSdkSpawnEnvironment(process.env)` with `ClaudeRuntimeAuthenticationService` plus a client-owned exact child builder. Validate only `cli|managed-secret`, defaulting to CLI; reject `auto|api-key|unknown` before lookup/spawn. CLI returns `{kind:"cli"}` without calling management. Managed mode calls `resolveForUse({kind:"agentRuntime",runtimeKind:"claude_agent_sdk",credentialSlot:"apiKey"})`, and management maps it to `provider.anthropic.api-key`.

For CLI, empty-base describes environment composition, not an empty account directory. Set `HOME` to the actual node-local OS home used by the existing Claude login. If an explicit Claude account/config-root override is supported, validate it as an existing absolute node-local path and map it deliberately. Do not create or default to a fresh app-data account home. Managed-only `tools: []`, empty setting sources, and strict explicit MCP must not be applied to CLI.

`ClaudeSdkClient` receives the closed auth union and builds the SDK environment from an empty operational allowlist. Only managed mode adds `ANTHROPIC_API_KEY`; `CLAUDE_CODE_API_KEY`, descriptor aliases, Store/backend variables, and unrelated parent values remain absent. Remove optional `env` from public Claude start/model-discovery inputs. Managed SDK options use `settingSources: []`, no hooks/plugins/settings/API-key helper, `strictMcpConfig: true`, `tools: []`, and explicitly materialized AutoByteus in-process MCP only. `allowedTools` is filtered to those MCP names and is not treated as a security allowlist; `disallowedTools` may repeat known dangerous built-ins defensively. AutoByteus tool processes use `AgentExecutionSecurityContext` outside the Claude child.

Call the same preparation/build path for model discovery and runs. Scope resolved/auth/env variables to launch and release AutoByteus references in `finally` after SDK child construction/completion; never claim SDK/JS zeroization. Redact diagnostics on append and outward formatting. Map invalid mode, binding, missing, each non-ready Store state, spawn, CLI auth, and provider auth to the exact value-free codes in the backend contract. Never fall back. Native Anthropic LLM/metadata keep their separate consumer identities over the same definition.

`startQueryTurn` propagates the mapped runtime failure. `listModels` remains best-effort and returns `[]` on a mapped auth/spawn/provider failure while emitting only the stable value-free status to protected diagnostics. It uses the same auth/spawn path and never tries another mode or source.

### Testing

The default suite uses InMemory synthetic values or disposable Local Stores. Host real suites use tracked configuration and machine/CI E2E custody provisioned either through hidden input or the explicit operator importer, then open only that Store read-only. The test runner never invokes the importer. Preflight reports health/instruction and logical missing IDs only. No cross-Store/default fallback exists. Existing Docker is unchanged. API/E2E covers browser/GraphQL behavior, empty-Store correct/swapped/tampered/unsupported pair cases, degraded UI, launcher non-inheritance, Claude CLI zero-resolution, managed exact-child environment/settings/tools, complete failure/no-fallback mapping, redaction-before-buffering, a real managed Claude SDK authentication/request, direct construction, and selected real provider outcomes. Synthetic leak scanners include a seeded negative control.

Importer tests use synthetic canary files and constructor-injected temporary target resolvers/Stores only; no test flag/environment may redirect the production CLI and no test opens canonical host custody. They cover both zero/one leading PNPM sentinel plus repeated/misplaced rejection; option/target/source rejection before selected-value handling; POSIX and Windows verifier behavior; TOCTOU identity mismatch; size/encoding/NUL; malformed recognized syntax; dynamic populated values; duplicate populated occurrences; all-empty/absent `IMPORT_NO_MAPPED_CREDENTIALS`; all four empty forms; empty plus populated and multiple-empty same-alias behavior; all current mapped aliases; exact Qwen `DASHSCOPE_API_KEY` mapping; deliberate `QWEN_API_KEY` and ZHIPU absence; and mixed files containing operational settings, unknown secret-like names, legacy aliases, arbitrary text, malformed unrelated lines, and empty recognized placeholders that remain non-blocking and absent from output. They also cover dry-run and both-absent initialization planning/execution; skip/no-overwrite and explicit replacement; both TTY phrases; cancellation/non-TTY; changed-plan rejection; batch rollback/idempotency; source immutability; other-Store non-access; no ignored-line or empty-placeholder metadata; value-free stdout/stderr/errors; and a seeded leak-scanner negative control. Real operator validation uses the explicitly selected current application `.env`, proves an empty Gemini placeholder does not block the populated Vertex and other recognized credentials, performs the value-free E2E import, then runs preflight/full capability-available scenarios without reading/exporting values.

Legacy-source non-authority tests use only synthetic temporary server-data roots. They prove application `.env` bytes and parent aliases remain unchanged; sensitive assignments are excluded before value retention; approved non-secret settings remain usable and source-preserving writes do not drop credential lines; custom-provider-v1 remains byte-unchanged and yields only `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED`; startup performs no Store/backend/importer operation; runtime never falls back; and no canary enters logs/reports/evidence. They never open real `.env`, `.env.test`, host Stores, or actual values.

AutoByteus coverage additionally proves the existing provider Settings/save/remove/status/reload journey, including authoritative scoped clear after removal; no-host zero lookup plus model-kind scoped clear; exact discovery consumers; runtime-scoped coexistence with native models; remote OpenAI/Gemini model construction selecting the AutoByteus key; legacy-source non-authority that leaves `AUTOBYTEUS_API_KEY` and hosts bytes untouched while exposing only hosts to current config and never using the alias; and real capability-available LLM/audio/image discovery plus representative invocation/generation from the read-only E2E Store. The runner/server environment and artifacts contain no key. An unavailable remote capability is reported explicitly, never silently counted as pass.

Codex regression coverage uses synthetic external account/config roots and sentinels only. It proves the client preserves `options.env ?? process.env` and real HOME/CODEX_HOME semantics, performs no `SecretManagementService.resolveForUse`, Store lookup, account RPC, auth-mode selection, or synthetic-home rewrite, and returns existing sanitized results/errors. It does not inspect real Codex auth state and does not claim environment non-inheritance. Gemini coverage proves all three exact LLM/media variants and exact Google SDK constructor options. Separate metadata coverage proves exact AI Studio/Vertex Express semantic consumers, trusted reveal into the existing provider, preserved Generative Language request/mapping, Vertex Project zero lookup, resolver-curated fallback, cache invalidation, and no ambient/alternate-definition fallback. Real coverage preserves those separate product paths rather than demanding an SDK-mode metadata rewrite. The declared AutoByteus endpoint DNS-unavailable result remains an allowed exact unavailable outcome under AC-019(f), with no invented alternate endpoint.

Dependency integration coverage uses exact installed unpatched `1.0.8` bytes and synthetic module/constructor instrumentation only. It first asserts that both installed entrypoints and package metadata contain no dotenv/config or `.env` discovery path. The parent resolves exact import/require exports and generates test-only probe/preload scripts inside a new empty temp root. Each child uses absolute paths, `shell:false`, that empty cwd, and an environment built from `{}` with only platform-minimal variables and explicit synthetic log-policy input; it never inherits dotenv/home/path/Node preload/module-path/database/provider state. Narrow ESM/CJS interception replaces only `@prisma/client` and delegates every other module. Import-only probes assert constructor count zero and no datasource requirement. Separate log probes use a synthetic datasource/constructor without connection, capture log kinds/count only, and prove default-off, environment/typed opt-in, typed-false precedence, and stable conflict behavior. Coverage also proves one exact lock resolution, absence of every repository patch key/file, clean/frozen installation, production build/sanitized bootstrap, and CR-009–CR-014 lazy-owner/restart/reopen regressions. Output is fixed/value-free; stderr is empty; temp cleanup is `finally`-owned.

### Security review checkpoints

1. secret wrapper/redaction and error/event schemas;
2. Local Store crypto/key handling/permissions/authenticated empty-Store pair integrity/SQLite locking/read-only/checkpoint/staged-creation crash safety;
3. backend adapter identity/physical-prefix binding/tagged lifecycle/no-fallback;
4. consumer mapping and constructor/env-read removal;
5. custom endpoint SSRF/exfiltration controls;
6. first-delivery governed-launch file/env/descriptor hardening, explicit external-Codex exclusion/preservation, and `LOCAL_HARDENED` labeling without strong claim;
7. legacy-source non-authority: unchanged application/custom-provider-v1 sources and parent aliases, name-first sensitive exclusion, approved non-secret projection, value-free v1 guidance, zero Store/importer operation, and no fallback;
8. hidden-input plus explicit-source E2E provisioning, source-review-before-real-execution, importer source/target/transaction/leak controls, evidence sanitization, and zero-copy worktree proof;
9. Claude two-mode selection, exact runtime binding, JIT exact-child delivery, managed setting/tool restrictions, early diagnostics, complete no-fallback failures, native Anthropic separation, and honest authorized-child trust limit.
10. AutoByteus gateway definition/bindings, no-host zero-resolve/scoped clear, explicit-removal all-subset clear, runtime-aware construction identity, runtime-scoped catalog replacement, legacy alias non-authority, and real remote regression evidence.
11. import CLI isolation: optional-sentinel normalization, absolute source, closed target, non-mutating trust checks, file-safe recognize-first scanning, selected-only validation through one positive registry, no ignored-content output, no-overwrite default, target-specific TTY, atomic batch, source immutability, value-free outward channels, and honest JS zeroization limit.
12. dependency integrity: attested `repository_prisma@1.0.8`, exact single lock resolution, obsolete patch-key/file removal with no replacement, static dotenv-free exact ESM/CommonJS entrypoints, isolated zero-acquisition/default-off/explicit-opt-in probes, unchanged Prisma/schema/data/current owners, and value-free install/build/regression evidence.
13. exact AI Studio/Vertex Express/Vertex Project construction for LLM/media; preserved dual-key Generative Language metadata selection/request/mapping plus Vertex Project curated-only behavior; deterministic exact-consumer/cache/no-ambient-fallback tests; and no metadata SDK-mode redesign.

## Approval Basis And Revised AR-006 Decision

Architecture review round 1 required these choices to be fixed rather than left open. The user approved the following bounded first-delivery decisions on 2026-07-21, and they remain unchanged:

1. **First assurance:** ship `LOCAL_HARDENED`; defer and never claim `STRONG_AGENT_ISOLATION` in this delivery.
2. **First adapters:** ship InMemory/test and Local read-write/read-only only; defer every concrete enterprise adapter while retaining the extension contract.
3. **Real-E2E setup (original first-delivery decision):** direct dedicated hidden-input provisioning remains supported and there is still no default-to-E2E Store copy command. The later UC-019 revision adds an explicit source-file importer that writes one selected Store; it does not read/decrypt another Store and does not weaken physical separation.
4. **Contract fixes without product-scope choice:** complete five-state degraded health and authenticated empty-Store database/key binding.

The prior Claude CLI-only approval was reopened and its round-2 implementation authority was retracted before code changes. The newly selected AR-006 decision is fully designed and was approved by the user for architecture re-review after the second design-principles audit:

5. **Claude runtime:** exactly default external `cli` and opt-in `managed-secret`; managed mode reuses the generic `resolveForUse` service with an exact runtime consumer and delivers only to the exact child under bounded tool/settings/diagnostic controls. Legacy `auto|api-key` and all fallback are removed. The authorized child can observe its key; no stronger claim is made.

Source review subsequently exposed CR-001, and the user approved the bounded preservation decision:

6. **AutoByteus remote gateway:** preserve all existing LLM/audio/image discovery, reload, construction, and invocation. Only credential provisioning changes from ambient `AUTOBYTEUS_API_KEY` to `provider.autobyteus.api-key` through exact Store-backed consumers. Remote models keep their downstream provider identity and explicitly identify `AUTOBYTEUS` as credential owner.

The user subsequently requested UC-019 as a committed product/operator command. Its current approved contract requires an absolute source with arbitrary filename/extension and explicit `default|e2e` target, supports the documented optional PNPM separator, recognizes only current positive aliases, validates only selected credential assignments, ignores every other line without metadata, keeps only the supported `DASHSCOPE_API_KEY` Qwen mapping with no `QWEN_API_KEY` or ZHIPU compatibility, provides value-free dry-run, defaults to no replacement, requires explicit `--overwrite` plus target-specific direct-TTY confirmation, and commits one atomic selected-Store batch.

Architecture round 7 then raised AR-009 over installed-user credential handling. After considering an automatic Store-first migration, the user selected a stricter operator-owned outcome: keep the explicit importer, but remove every automatic app-data credential import, copy, scrub, delete, rewrite, or conversion. Application `.env`, parent aliases, and custom-provider-v1 remain untouched; current runtime ignores credential aliases, projects only approved non-secret configuration, accepts custom-provider v2 only, and provides value-free v1 reconfiguration guidance. Users explicitly provision through UI/Settings, hidden input, or UC-019 and perform any legacy cleanup themselves. Architecture re-review is required before implementation resumes.

Architecture round 10 passed that complete package. The user then clarified and approved one independent bounded addition:

7. **`repository_prisma` dependency:** cleanly replace current `repository_prisma@1.0.6` integration with latest verified `1.0.8`; retain Prisma ORM/client `5.22.0`, schemas, migrations, persisted data, current database owners, Docker, and every approved secret/authentication behavior. Remove obsolete patch metadata/file, create no replacement patch, leave no `1.0.6`/`1.0.7` compatibility path, and prove clean/frozen install, dotenv-free/import-safe/default-off-log exact entrypoints, build, and existing lifecycle regressions. The user explicitly approved latest `1.0.8` and no legacy code. Architecture re-review is required before implementation resumes.

Architecture round 11 raised AR-010/MP-004 because the rejected `1.0.7` target and its server-cwd/parent-env probe could load dotenv. Verified upstream `1.0.8` removes dotenv loading and provides the desired log policy without a local patch. The design retains the reviewer's preferred empty-temp-cwd, empty-base-environment synthetic probe as regression protection and otherwise changes no user-visible behavior, package ownership, persisted data, or round-10 approval basis. Implementation remains paused for architecture re-review.

API/E2E subsequently demonstrated that the initial importer could not consume the explicitly selected current application `.env` because it rejected unrelated names and the PNPM separator. The user rejected that defensive whole-file behavior as contrary to the importer's responsibility and approved the bounded recognize-first correction:

8. **Importer responsibility:** only exact aliases for current AutoByteus credentials are relevant. File identity/size/encoding remain global safety checks; assignment/value validation begins only after a positive alias match. Every other line is ignored without right-hand-side interpretation. `DASHSCOPE_API_KEY` is the only Qwen input; `QWEN_API_KEY` and `ZHIPU_API_KEY` remain unmapped/non-blocking. Output contains only definition IDs, action counts, and no ignored-content metadata. No runtime, Store, Docker, dependency, or Claude behavior changes.

Round-9 API/E2E then exercised the exact current application `.env`. Its `GEMINI_API_KEY` assignment is empty because the populated `VERTEX_AI_API_KEY` provides the selected Gemini authentication mode; the importer blocked every populated credential. The user approved one bounded correction:

9. **Empty recognized assignments:** after valid static parsing and normalization, an empty recognized value is absent/non-selected. It produces no plan entry, warning, ignored metadata, or failure. Empty occurrences do not participate in duplicate detection; one populated occurrence selects normally and two populated occurrences still fail. If no populated current credential remains, return `IMPORT_NO_MAPPED_CREDENTIALS` before target access. No provider/alias fallback, new owner, API, target, runtime, Store, Docker, dependency, or Claude behavior is introduced.

The `.env.test` secret-free compatibility choice and exact scenario/quota classification remain bounded implementation/coverage details. Managed Claude has no version-specific built-in allowlist: `tools: []` is the fixed requirement, and any pinned SDK version that cannot prove it fails managed-mode startup. The revised package now returns to `architecture_reviewer` with user approval; implementation rework and API/E2E remain paused until that gate passes.

The user then resolved code review round 23 without changing any prior secret-storage decision:

8. **Codex preservation:** leave Codex authentication alone. Restore/preserve the pre-ticket external `codex login` environment/home path, add no managed Store consumer or AutoByteus login/status/rotation lifecycle, and exclude Codex from the child-environment part of `LOCAL_HARDENED`.
9. **Vertex Express correctness:** preserve the exact configured Google mode through a tight shared union and exact SDK construction in LLM/media. No key-presence inference, alias fallback, or new owner is approved.

### External Claude Authentication Release Dependency

`EXT-ANTHROPIC-AGENT-SDK-AUTH` requires release review to re-check the official Agent SDK overview, legal/authentication guidance, and the dated subscription-usage Help Center notice. As of 2026-07-21 those sources conflict: the June 15–16 notice explicitly preserves current third-party Agent SDK subscription usage, while other pages retain API-key/approval language. The target therefore remains two-mode under the user's decision. AutoByteus does not add a Claude login UI, proxy account credentials, pool subscriptions, or relay authentication through an AutoByteus-hosted service; `cli` consumes pre-existing external node-local account state and performs zero secret lookup. This deployment distinction and current successful operation support the intended path but are not misrepresented as independent legal authorization. If Anthropic later publishes an unambiguous superseding rule that forbids this exact self-hosted path, release planning must return the behavior decision to the user rather than silently changing modes.
