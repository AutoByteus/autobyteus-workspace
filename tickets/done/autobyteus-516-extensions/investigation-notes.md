# Investigation Notes

## Investigation Meta

- Package identifier: `autobyteus-516-extensions`
- Request / ticket: autobyteus-516 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`): AutoByteus Extensions, staged, design first, from the founder's proposal *AutoByteus Extensions — Design Proposal* (2026-11-17).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions` / `codex/autobyteus-516-extensions`
- Resolved base remote / branch / revision: `origin` / `personal` / `b768c503f9761242089cdee35e47dc2bf65ab8ea` (fetched 2026-11-21); fast-forwarded to `fdde5406fa` on 2026-11-26 after ARCH-REV-001 (citations in design-spec.md refreshed)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md: merge `--no-ff`)
- Bootstrap result: worktree and branch created from refreshed `origin/personal`.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-21): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; project `AGENTS.md`, `DESIGN.md`, `GLOSSARY.md` (Nodes, Integrations); `autobyteus-server-ts/docs/design/node_access_model.md` (sections 1, 5); `autobyteus-server-ts/docs/modules/applications.md`, `application_capability.md`, `shared_network_workspaces.md`.
- Investigation status: Stage 1 requirements and architecture investigation complete (2026-11-26).

## Initial Request And Clarifications

- Original request: implement the founder's extension proposal as one ticket, staged; each stage's design approved by the founder before it is built. Stage 1: investigation and design: what an extension concretely is (the smallest runtime/lifecycle fitting DESIGN.md, headless and desktop), comparison with autobyteus-270, 70, 488, a staged plan with sizes and founder needs, PoC needs.
- Clarifications received:
  - 2026-11-17 PM comment: nothing in this Task may expose a node to the public internet; the founder's devices are used only after asking him.
  - 2026-11-18 founder (voice, via PM): wants an FS extension, a shared-network extension and a voice input extension ("super powerful" as an extension); asks what the relationship between an extension and an integration is. Stage 1 must decide whether one packaging/lifecycle serves both, with a short table.
  - 2026-11-21 founder (via PM): (1) design and set up the extension architecture first; show him the design and get approval before implementing; (2) the first proving milestone is migrating the existing Audio Input (voice input) extension onto it, to surface architectural rough edges before Remote Network ("easy node pairing") and Shared File System (NFS).
- User-supplied facts and constraints: no change to his running nodes; no keys or enrollment tokens through chat or logs; nothing exposed publicly; release only on his word; work in other Projects (AutoByteus NFS, AutoByteus Agents) is reported to the PM, who creates those Tasks.
- Initial ambiguity: where an extension runs (desktop app or node); whether integrations and extensions merge; what "Audio Input needs improvement" means concretely.

## Product And Domain Understanding

- Product area: optional capabilities of an AutoByteus installation that bring their own runtimes or system services (voice transcription, private overlay networking, shared storage, later local inference).
- Affected actors or systems: the founder/owner using the desktop app; headless Linux/Docker nodes; phones (later stages); agents (indirect users of a shared file system or network).
- Existing user or operational purpose: Voice Input dictation in composers; phone access through Tailscale; NFS storage set up by hand from Nodes → NFS Guide.
- Relevant terminology (GLOSSARY.md): node, this node / remote node, peer, credential (owner `own_…`, phone `mra_…`), network admission, way to connect, integration, integration source, delivery definition, credential proxy. "Extension" has no glossary entry yet.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-21 | Doc | Task context `AutoByteus_Extensions_Design-1.md` | The proposal | Principles (optional, independent, composable, service-oriented, headless, secure, reuse); lifecycle sketch `id/name/version/activate/deactivate`; sequence 1–6; open decisions §8 | Requirements basis |
| 2026-11-21 | Code | `autobyteus-web/electron/extensions/{types,extensionCatalog,managedExtensionService}.ts`, `voice-input/voiceInputRuntimeService.ts`, `voiceInputRuntimeSupport.ts`, `electron/extensionIpcHandlers.ts`, `electron/preload.ts:147-158` | Where Audio Input lives and its shape | An extension manager exists, in Electron main only. `ExtensionId = 'voice-input'` (one member); record `settings: VoiceInputSettings`; messages hard-code "Voice Input"; IPC `extensions:update-voice-input-settings` and `voice-input:transcribe`. Registry `<base>/extensions/registry.json`, files `<base>/extensions/voice-input/`. Worker spawned lazily, JSON lines over stdio, kept until disable/remove/app exit. | Generalisation needed (BEH-001) |
| 2026-11-21 | Code | `extensionCatalog.ts` | Versioning | Runtime pinned per app release: `AutoByteus/autobyteus-voice-runtime` tag `v0.3.0`, manifest from GitHub release; env overrides for tests. No "update available" concept: Reinstall only. | REQ-003 update |
| 2026-11-21 | Code | `managedExtensionService.ts` `listExtensions` | Status | Every list call inspects files and **writes** the registry. `installed` + inspection failure → `error` "Runtime installation is incomplete". | Design input |
| 2026-11-21 | Code | `autobyteus-web/stores/voiceInputStore.ts:21,45,128,387`, `components/settings/ExtensionsManager.vue` | Availability gating | Voice available only when `window.electronAPI` exists and the extension is installed+enabled; Extensions page shows "available only in the desktop app" in a browser. | BEH-004 |
| 2026-11-21 | Code | `grep useVoiceInputStore` + ticket history (autobyteus-320, task-voice-success-cleanup) | Voice surfaces | Voice is used in the agent/team composer, Task description, Project description (create/edit) and Memory → Search, plus Settings test panel. | Preserved surfaces (BEH-003) |
| 2026-11-21 | Data | read-only: `~/.autobyteus/extensions/registry.json` (founder's machine) | Data continuity | `voice-input`: `installed`, `enabled: true`, runtime `0.3.0`, model `mlx-community/whisper-small-mlx`, backend `mlx`, `languageMode: en`, a chosen `audioInputDeviceId`, no error. Nothing changed. | REQ-007 |
| 2026-11-21 | Command | `curl` v0.3.0 `voice-input-runtime-manifest.json` | Platform support | Assets: darwin-arm64 (mlx), darwin-x64, linux-x64, win32-x64 (faster-whisper). **No linux-arm64** (e.g. a Docker node on an Apple Silicon Mac). | Platform-support state (REQ-003) |
| 2026-11-21 | Doc | `autobyteus-voice-runtime` README, `tickets/done/voice-input-runtime-reliability/handoff-summary.md`; team memory 2026-08-02 | "Needs improvement" | Known v0.3 problems recorded in Aug 2026 (BEH-002..011 of that ticket): `ready` sent before the model loads (first/warm 4.57 s / 0.22 s); no bounds on startup/requests/shutdown; install bootstraps system Python with ranged packages and mutable model downloads; MLX path depends on external `ffmpeg`; no Chinese-specific provider. A replacement runtime v1.0.0 (English MLX Whisper Small, Chinese Fun-ASR-Nano, macOS arm64 only, model manager with JSONL progress) was built but is **unpublished**: release run 31467686540 failed closed on a hosted English archive mismatch (DR-014, "Unclear / release-blocking"). Desktop integration of v1 was explicitly left to a later ticket. | DEC-003, staged plan |
| 2026-11-21 | Code/Doc | `autobyteus-integrations/README.md`, GLOSSARY "Integrations", `autobyteus-server-ts/src/{integrations,credential-proxy,skills}` | Extension vs integration | An integration is a skill folder plus `integration.json`, imported as a skill source from a GitHub repo or folder; it ships no app code: the **delivery definition** (routes, auth, token check) is app-owned and "an imported repository can't add or change one". Agents use it through the credential proxy; token in the vault. | DEC-002 |
| 2026-11-21 | Code | `src/agent-packages/installers/github-agent-package-installer.ts`, `src/application-packages/installers/github-application-package-installer.ts`, skill sources | Shared machinery | Three GitHub-source importers exist (agent packages, application packages, skill sources incl. integrations), all importing content, with update checks. None downloads platform binaries with checksums; that is only the voice extension's runtime installer. | DEC-002 reasoning |
| 2026-11-21 | Doc | `docs/modules/applications.md`, `application_capability.md` | How optional modules exist today | Applications: bundles with UI + Node ESM backend, discovered by the node, enabled per node through a server setting exposed by GraphQL (`applicationsCapability`, `setApplicationsEnabled`). A node-owned capability switch read by the frontend is an existing pattern. | Design input |
| 2026-11-21 | Code | `src/runtime-management/runtime-availability-service.ts` | How runtimes are optional | Agent runtimes (Codex, Claude, Grok…) are detected on the host, not installed by the app. | Pattern for external services (NetBird, NFS) |
| 2026-11-21 | Code | `src/remote-access/services/network-interface-classifier.ts`, `src/node-access/services/network-admission.ts:81-92`, `ip-address-ranges.ts` | Would a NetBird peer reach a node? | Admission accepts loopback, a client in 100.64/10 **only when the local address is a confirmed Tailscale address** (`.ts.net` reverse name or `tailscale*` interface), an allowed local network, `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`, or a container. A NetBird peer (also 100.64/10, interface `wt0`/`utun`) is therefore refused unless the owner lists the overlay range in `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`. | Stage 2 core change; Read, not reproduced |
| 2026-11-21 | Doc | `node_access_model.md` §5 NA-4 | Docker nodes | The Docker launcher publishes on `127.0.0.1` and the host's Tailscale address (or all addresses with `--allow-local-network`). A NetBird address is not published. | Stage 2 core change |
| 2026-11-21 | Doc | `node_access_model.md` §1, §5 | App authentication on a private network | Every client already presents a credential (owner, phone, peer, memory sync); refusal codes defined; holds since autobyteus-437 slice 1. | Principle 6 already met; reuse |
| 2026-11-21 | Code/Doc | `/Users/normy/autobyteus_org/autobyteus-nfs` README, `internal/cli/run.go:53-110` | NFS tool interface | Standalone Go tool v0.2.1 (README; PM's note said v0.2.0). Commands `server`, `client`, `create`, `connect`, `status`, `reconnect`, `detach`, `version`. `status` prints JSON but **every command except `version` and the dashboards elevates to root** (`Elevate(args)` when `Geteuid() != 0`). Host services via launchd/systemd, root-owned state; "application-node management are not included"; consumers use ordinary directories. Hard mounts can stall app work during storage loss. | Stage 3 needs an unprivileged read-only status in the NFS project (other Project) |
| 2026-11-21 | Doc | `docs/modules/shared_network_workspaces.md`; `autobyteus-web/components/settings/NfsGuideCard.vue`; `tickets/done/nfs-guide-install-commands` | App ↔ NFS today | The app deliberately has no NFS awareness: no mount detection, no storage CLI calls. Nodes → NFS Guide is a copy-only command guide (autobyteus-254). | Stage 3 baseline |
| 2026-11-21 | Web | NetBird AGPL announcement; v0.53.0 release notes | Licensing (open decision §8) | Since v0.53.0 NetBird `management/`, `signal/`, `relay/` are AGPLv3; clients stay BSD-3. Earlier versions stay BSD-3. | Stage 2 founder decision |
| 2026-11-21 | Web | NetBird docs "HTTP/JSON Daemon Socket"; CLI docs | Stable interfaces (open decision §8) | Local daemon API: gRPC, and since client v0.75.0 an optional HTTP/JSON Unix socket (`/var/run/netbird-http.sock`, off by default; privileged methods need root). `netbird status --json` exists; field names vary by version (unofficial sources disagree). | Stage 2 PoC must record real output |
| 2026-11-21 | Web | ArchWiki NetBird; Tailscale "Can I use Tailscale alongside other VPNs?", CGNAT docs | Coexistence with the founder's Tailscale | NetBird and Tailscale both use 100.64.0.0/10; on Linux Tailscale's `ts-input` rule drops 100.64/10 traffic not arriving on `tailscale0`, which breaks NetBird. | Stage 2 risk; PoC devices question |
| 2026-11-21 | Web | Tailscale docs "custom control server"; Headscale docs | Alternative to NetBird | The official Tailscale clients (incl. Android) accept a custom control server (Headscale, self-hosted, BSD). AutoByteus already supports Tailscale in admission, the Docker launcher, phone "way to connect" and the founder's Tailscale Serve skill. | Stage 2 founder decision |
| 2026-11-21 | Command | `which netbird tailscale` (this Mac) | Founder's setup | Tailscale installed (`/usr/local/bin/tailscale`, Tailscale.app); NetBird not installed. Nothing changed. | Stage 2 risk |
| 2026-11-21 | Other | `search_memory` (PM journal 2026-11-13/17/18; designer journals) | autobyteus-270/488/244 context (out-of-scope Task reads are refused) | 270: "Shared file system across nodes: make nodes feel like one machine for FILES", TODO, design first. 488: company deployment plan; security (node-to-node auth) before any public exposure. 244 → Integrations page + credential proxy (GitHub first). | Comparison (requirements "Relationship to other Tasks") |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Settings → Extensions (desktop) | Card for Voice Input: Install (phases fetching-manifest → downloading → extracting → bootstrapping runtime/model → ready, byte progress on download), Enable/Disable, Reinstall, Remove, Open folder, language (auto/en/zh), microphone choice, Test Voice Input panel with live input level. | State `not-installed/installing/installed/error`; installed starts disabled; settings kept across reinstall; SHA-256 checked. | electron/extensions/*, VoiceInputExtensionCard.vue, tickets voice-input-extension, voice-input-bilingual-runtime | High (Read) |
| BEH-002 | System | Transcription request | Renderer records WAV → `voice-input:transcribe` IPC → Electron main writes temp WAV → long-lived worker (`serve --backend --model-path`) → JSON line response → text inserted into draft, never auto-sent. | No-speech, mic denied, failure states distinct; worker started on first use. | voiceInputRuntimeService.ts, voiceInputStore.ts | High (Read) |
| BEH-003 | User | Voice surfaces | Agent/Team composer, Task description, Project description (create/edit), Memory → Search, Settings test. | Same availability rule everywhere: desktop + installed + enabled. | grep, autobyteus-320, task-voice-success-cleanup | High (Read) |
| BEH-004 | User | Opening the app outside Electron, or a remote-node window | Browser: Extensions page says desktop only; no microphone button. Desktop window of a remote node: voice works using this computer's runtime (manager is in Electron main, independent of the node). | Voice follows the desktop, not the node. | ExtensionsManager.vue, voiceInputStore.ts | High (Read) |
| BEH-005 | Operational | Headless node (Docker/Linux server) | No extension concept on nodes; nothing to manage. | — | server `src/` listing (no extensions module) | High (Read) |
| BEH-006 | Contract | Node access model | Owner credential: full authority; phone credential: limited routes; every route classified in `node-route-permissions.ts`. | No extension routes exist. | node_access_model.md | High (Read) |
| BEH-007 | User | Integrations page | Import a skill source from GitHub/folder → integration cards → Connect token → agents with the skill use it via credential proxy. | No executable app code from imported sources. | GLOSSARY Integrations, autobyteus-integrations README | High (Read) |
| BEH-008 | User | Nodes → NFS Guide | Copy installer/commands; user runs the NFS tool in a terminal on each host. | App never calls the NFS tool. | NfsGuideCard.vue, shared_network_workspaces.md | High (Read) |
| BEH-009 | User | Phone access | Phone pairs with a node through `company_address`, `tailscale`, `vpn` or `local_network`. | Tailscale addresses admitted automatically; other overlays only via allowed networks. | GLOSSARY Way to connect, network-admission.ts | High (Read) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/electron/extensions/` (≈1,100 lines incl. voice) | Only extension manager; Electron main | Must be generalised and made headless-capable | Move ownership to the node server; Electron keeps none or a thin part |
| `ManagedExtensionService` | Lifecycle + registry, voice-typed | One owner per node; generic record; per-extension settings | Generic record with extension-owned settings shape; drop write-on-read |
| `VoiceInputRuntimeService` | Install, inspect, worker, transcribe | Voice-specific part becomes one extension's implementation | Runs under the server process; env PATH source (`getLoginShellPath` is an Electron util) |
| `~/.autobyteus/extensions/registry.json` + `voice-input/` | Founder's live install | Must be adopted without re-download | Location relative to the server data dir; transition (Data Migration Guideline) |
| `src/application-capability` | Node-owned on/off exposed via GraphQL | Precedent for node-owned capability state | Reuse pattern, not code |
| `node-route-permissions.ts` | Route permission table | New extension routes need classification | Owner-only management; transcription owner-only in Stage 1 |
| `network-admission.ts` | Tailscale-specific overlay admission | Stage 2 | NetBird or Headscale changes this differently |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: extension registry JSON; per-extension `installation.json`; voice runtime manifest (remote, pinned).
- Readers/writers: Electron `ManagedExtensionService` only.
- Evidence paths: above.

### Structural Surfaces

- New node API surface (GraphQL/REST) for extensions; route permissions; desktop preload/IPC removal; web Settings → Extensions; voice store transport.
- Existing support: Applications capability pattern; node access gate; server data dir.

### Potential Structural Impacts To Investigate

- API: new node routes (owner-only).
- Persistence: registry moved/adopted (Data Migration Guideline checklist in design).
- Security: download-and-execute of first-party runtimes on the node; route permissions.
- Lifecycle: worker owned by the server process; server restarts on app update.
- Deployment: Docker nodes need platform assets (no linux-arm64 voice asset).
- Confirmed present: Electron manager, voice worker, registry. Absent: any node-side extension concept.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `python3 -I` read of `~/.autobyteus/extensions/registry.json` | Founder's install state | installed/enabled/0.3.0/en/device chosen | Measured (read-only) | REQ-007 | this file |
| `curl` v0.3.0 manifest | Platform coverage | 4 assets, no linux-arm64 | Measured | REQ-003 platform state | this file |
| `probes/contract-probe/run-probe.sh` | Contract end to end with the real voice runtime (APFS clone, founder's files untouched) | 31/31 pass; runtime relocatable; cold first transcription 30.3 s, warm 211 ms; zh 235 ms | Measured | Contract valid; adoption by move | probes/contract-probe/README.md |
| `serve-bridge.mjs` + browser tab | Page bridge in sandboxed iframe | Calls work; fetch blocked by CSP; origin null; parent access blocked | Reproduced | Bridge design holds; check `event.source` | probes/contract-probe/README.md |
| `probes/network-probe/run-network-probe.mjs` | Private Network idea on loopback Headscale, 3 userspace tsnet nodes | 10/10: join w/o admin, no network device, machine list with owners, who-is (same owner vs teammate), restart 12.6 s, revocation 11.1 s; system Tailscale untouched | Measured | Network extension feasible; needs `start`, who-is identity | probes/network-probe/README.md |
| `which netbird tailscale` | Coexistence risk | Tailscale present, NetBird absent | Measured | Stage 2 | this file |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: None (no defect is being fixed in Stage 1; the migration is verified against existing voice tests: `autobyteus-web/electron/extensions/__tests__/*`, `tests/integration/voice-input-extension.integration.test.ts`, `tests/integration/composer-voice-lifetime.integration.test.ts`).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder (proposal 2026-11-17) | Optional, independent, headless, secure extensions; Audio Input "needs improvement" | Written proposal | Foundation requirements | What exactly is wrong with voice for him (DEC-003 question) |
| Founder (2026-11-18) | Wants FS, network and voice extensions; extension vs integration? | Voice note via PM | DEC-002 table | — |
| Founder (2026-11-21) | Architecture first, approved; voice migration as proving milestone | PM comment | Stage 1 scope | — |
| Founder's machine | Uses Voice Input daily-ish (enabled, English, chosen mic) | Measured | Data continuity is critical | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Voice runtime release lane | `AutoByteus/autobyteus-voice-runtime` v0.3.0 (latest published) | Manifest + per-platform archives + SHA-256 | catalog, curl | v1.0.0 unpublished (DR-014) |
| NetBird | client BSD-3; management/signal/relay AGPLv3 since v0.53.0 | Self-hosted management; CLI/gRPC/HTTP-JSON local API | web sources | Stage 2 |
| Tailscale / Headscale | official clients BSD; Headscale BSD | Custom control server supported by official clients incl. Android | web sources | Stage 2 alternative |
| AutoByteus NFS | v0.2.1 | Root-only status; host services | NFS repo | Stage 3 needs unprivileged status |
| Browser microphone | Web platform | `getUserMedia` requires a secure context (https or localhost) | platform rule (known) | Phone/browser voice over a plain-http overlay address would not get the microphone; later stage |

## Persisted Data And State Facts

- Affected stored subject: extension registry and installed voice runtime/model files.
- Location and shape: `~/.autobyteus/extensions/registry.json` (`{version: 2, extensions: {voice-input: ManagedExtensionRecord}}`), `~/.autobyteus/extensions/voice-input/{installation.json, runtime/, models/, temp/, downloads/}`.
- Approximate volume: one record; runtime + model a few hundred MB (MLX Whisper Small).
- Current readers and writers: Electron `ManagedExtensionService` only.
- Current unknown/extra-field behavior: `normalizeRecord` spreads unknown fields and normalises settings; unreadable registry → treated as empty (silently).
- Required semantics to preserve: installed/enabled state, language mode, chosen microphone, the downloaded runtime and model.
- Acceptable loss: none for the founder's live install; transient install progress may reset.
- Constraints: no re-download; works offline after upgrade.
- Remaining evidence gap: the exact embedded-node data directory relative to `~/.autobyteus` (architecture phase).

## Product Design Request Context

- Product Design request in the current input: `Present` (founder 2026-11-22: "delegate a task to the product team that works on the UI now").
- Request artifact: `product-design-request.md`; delegated to `/product_team` (team run `product_team_a280b4020674493e8a0808449b419369`, coordinator `product_ui_ux_designer_99d03915911a4b94a7d75dc5cb25283f`).
- The Settings → Extensions page stays in the existing visual style; a Product Design round may be useful before Stage 4 (integrated node status/onboarding). Not requested now.

## Product Design Findings

- 2026-11-26: Product Team returned Design Completed: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/ui-ux-spec.md`, 113 normative references, merged into the design repository's `personal` @ 825434bc, worktree removed. Approval: founder (relayed and direct), DEC-015 items. Provisional items marked (Tailscale sign-in/keys, hosting, G1); "Design reference only" controls are not product UI; Voice "Getting ready" depends on runtime 0.3.1 (PRE-001). Its REQ-007 row and VIS-V3-01 predate DEC-016 and are superseded by it. No delegated Task to close (the delegation was part of autobyteus-516).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/autobyteus-516-extensions/private-network-types.md` | Solution Designer | Workflow per network type for the Private Network stage (scope, join, discovery, Add a machine, validated vs provisional) | Private Network stage | Private Network requirements (future) | Draft | Informative; founder's review via the Product round |
| `tickets/in-progress/autobyteus-516-extensions/staged-plan.md` | Solution Designer | Whole-direction staged plan: sizes, founder needs, PoC needs, other-Project work, relation to 270/70/488 | Stages 1–6 | REQ-010; DEC-001..008 | Draft for founder review | Informative for Stage 1; each later stage gets its own requirements and approval |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | What the founder finds lacking in voice today | Decides the voice-improvement stage | Ask founder (DEC-003) | Open |
| U-002 | Unknown | Real `netbird status --json` shape on the founder's versions | Stage 2 integration surface | Stage 2 PoC | Open |
| R-001 | Risk | NetBird and Tailscale overlap (100.64/10); Linux drop rule | The founder relies on Tailscale for phone access | Stage 2 device choice / Headscale question | Open |
| R-002 | Risk | Hard NFS mounts can stall agent and app work | Stage 3 product promise | Stage 3 design | Open |
| R-003 | Risk | Voice transcription served by the node adds a loopback HTTP hop | Latency | QR-002 measurement | Open |
| A-001 | Assumption | Every desktop has its own embedded node on the same computer | REQ-008 routing | Architecture verification | Open |

## Architecture Investigation Findings

2026-11-26 (design reading gate passed; see design-spec.md Authorities read). Evidence mapped in design-spec.md "Architecture Investigation Evidence"; the facts:

- Composition root `autobyteus-server-ts/src/compositions/build-studio-server.ts:404-424` (REST routes get their dependencies; `registerGraphql(app)`), startup order `src/server-runtime.ts:196-242` (listen at 225, background work after).
- Route table `src/api/security/node-route-permissions.ts:60-95`: deny-by-default to owner+phone; owner actions by prefix.
- GraphQL per-request context `src/api/graphql/graphql-request-context.ts:12-18`; resolvers otherwise reach composed services through process bindings (`remote-collaboration-services.ts:108-124`).
- `isDesktopEmbeddedNode()` `src/config/desktop-embedded-node.ts:10`, set by `electron/server/serverRuntimeEnv.ts:150`; embedded data dir `<baseDataRoot>/server-data` (`electron/server/services/AppDataService.ts:21`).
- Released registry shapes (git history of `electron/extensions/managedExtensionService.ts`): v1 at 99f016398d (v1.2.25), v2 at d97140d1f1 (v1.2.28), v2 + `audioInputDeviceId` at ad7e12d063 (v1.2.29). Current reader accepts any (`managedExtensionService.ts:99-113`).
- Desktop client-data migrations: `client-data-migrations/electron-file-runner.ts:70-79`, called first in `start()` (`electronApplication.ts:393`).
- Ed25519 verification technique: `autobyteus-server-ts/docker/starter/package-verifier.mjs:35-41`; signing from an env secret: `scripts/server-package/sign-server-package.mjs`.
- `tar` 7.5.22 already a server dependency (`src/skills/installers/skill-repository-archive.ts:4`).
- Voice worker loop ends on stdin EOF (`autobyteus-voice-runtime/runtime/voice_input_worker.py:180`).
- Packaged windows load one `file://…/renderer/index.html` (`electronApplication.ts:118-130`): one renderer origin, so a `localStorage` microphone choice is shared by all windows.
- Product design Part V (`design/extensions-ui-516` @ da118b6b, `round-5-coverage.md`): needs `catalog` status (V13-01/03), `updating` (V9-02), `starting` (DC-089), "needs a newer AutoByteus" (V13-04/05) in the list payload.

## Requirement Implications

- The extension concept already exists in code but is voice-shaped and desktop-only; the founder's headless principle and the next two extensions (host networking, host storage) need it on the node.
- The founder's live Voice Input install makes data continuity a hard requirement of the migration.
- Integrations import third-party content but never app code; extensions download and run binaries or control root services. This security difference is the main reason to keep them two kinds (DEC-002).
- Voice "improvement" has a known technical backlog (runtime v1, unpublished); the founder's own complaint is not yet known.
- Remote Network and Shared FS each need a core change and/or another Project's change before they can be extensions: network admission and Docker publishing for overlay peers; an unprivileged NFS status.

## Notes For Architecture Design

- Map SCN-001..SCN-008 after approval.
- Verify: server data dir vs `~/.autobyteus`; Electron → embedded server environment (PATH for runtime); node route permission table; GraphQL vs REST for binary transcription upload; worker lifetime under server restarts; how remote-node windows reach the embedded node (A-001).
- Data Migration Guideline checklist for the registry adoption.
- 2026-11-26 (ARCH-REV-001 MP-001, reviewer-traced): a sandboxed page's CORS-mode loads (fonts, module scripts) send `Origin: null`, refused by `api/security/remote-access-request-origin.ts:25-50` before any route; loads without `Origin` pass. `@fastify/cors` here reflects requested headers (`node-access-plugin.ts:44-47`), so an `audio/wav` POST from another window's origin passes preflight.

