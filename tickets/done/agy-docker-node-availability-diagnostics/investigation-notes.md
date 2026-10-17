# Investigation Notes — agy-docker-node-availability-diagnostics

## Investigation Meta

- Package identifier: `agy-docker-node-availability-diagnostics`
- Request / ticket: Project Task `project_task_4fbcd0c4-a279-4ead-85a3-17a2a7513e38` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). URGENT, user 2026-10-12: "we need a ticket to fix this bug immediately".
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics`
- Repository mode: Git
- Task worktree / branch: the path above, branch `codex/agy-docker-node-availability-diagnostics`
- Resolved base remote / branch / revision: `origin/personal` @ `2756d7b29` (fetched 2026-10-12; `origin/HEAD` -> `origin/personal`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree and branch created from refreshed `origin/personal`. Ticket folder `tickets/in-progress/agy-docker-node-availability-diagnostics/`.
- Bootstrap blocker: none
- Current solution revision ID: SR-003
- Authorities read: requirements gate `references/requirements-engineering.md` (2026-10-12); design gate `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md`, `TESTING.md`, `autobyteus-web/AGENTS.md` and `autobyteus-server-ts/AGENTS.md` where present (2026-10-12, recorded in design-spec.md)
- Investigation status: Complete for requirements and design

## Initial Request And Clarifications

- Original request: Docker node `http://localhost:8003` shows "Antigravity CLI — Not installed" in the chat model menu, although `which agy` in that node's Terminal returns `/usr/local/bin/agy`. Find the real cause. Make Antigravity available where it is installed and usable. Where it can't be used, show the actual reason with a way to recover, not a blanket "Not installed". Check the Docker image and docs. Compare node 8001.
- Screenshots: `…/context/ctx_f977267ffa8a__34.png` (menu: Codex 3, AutoByteus 35, Claude 4, Grok 2, Antigravity "Not installed"), `…__35.png` (Settings → Nodes: embedded, 8001, 8003, all ready), `…__36.png` (8003 Terminal `which agy` → `/usr/local/bin/agy`).
- Clarifications received (user, this conversation, 2026-10-12):
  1. Asked whether the image is old → verified it is not (see R-05/R-06).
  2. Noted 8003's Codex shows only 3 models → verified: 8003's Codex is signed in to a Free ChatGPT account, 8001's to Pro (R-09).
  3. "fix the agy bug now. codex is not a bug, its working i will log out and login codex again" → **scope: Antigravity bug only; Codex excluded.**
  4. User agreed: "It is installed. It's just not logged in." The "Not installed" text is wrong.

## Product And Domain Understanding

- Product area: runtime availability and the chat model menu (`ChatModelMenu.vue`), server `RuntimeAvailabilityService`, Antigravity CLI discovery, Docker server image docs.
- Actors: a user of the Electron app connected to a node (embedded or remote Docker); the node's server process.
- Terminology: *runtime* = agent execution backend (AutoByteus, Codex App Server, Claude Agent SDK, Antigravity CLI, Grok Build). *Availability* = whether the server can offer that runtime now, with `reason` when not.

## Source Log

| Date | Type | Source / Command | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-10-12 | Command | `docker ps` | Map ports to containers | 8001 → `autobyteus-server-0`, 8003 → `autobyteus-server-2` |
| 2026-10-12 | Command | `docker exec <c> sh -c 'id; which agy; agy --version; echo $PATH'` | PATH/user hypothesis | Both: root, `/usr/local/bin/agy`, agy `1.3.3`, same PATH |
| 2026-10-12 | Command | `/proc/61/environ` of `node dist/app.js` in both containers | Server process env | Server runs as root, `HOME=/root`, identical PATH; no `ANTIGRAVITY_CLI_COMMAND` |
| 2026-10-12 | Command | `agy --help` + required-flag grep in both | Unsupported-version hypothesis | Exit 0, all 7 required flags present in both |
| 2026-10-12 | Command | `agy models` in both (cwd `/app/autobyteus-server-ts`) | Discovery step | 8001: exit 0, 18 models in ~2 s. **8003: exit 1, stderr `Error: Please sign in to view available models. Launch the CLI without arguments to sign in.`** |
| 2026-10-12 | Runtime | `POST /graphql { runtimeAvailability(runtimeKind:"antigravity_cli") }` on 8001/8003 | What the API reports | 8001 `enabled:true`. 8003 `enabled:false, reason:"Antigravity model discovery failed; check authentication or network and retry."` |
| 2026-10-12 | Command | `ls -la /root/.gemini/antigravity-cli` in both | Where sign-in lives | 8001 has `antigravity-oauth-token`; **8003 has none** |
| 2026-10-12 | Runtime | 8003 `/root/.gemini/antigravity-cli/log/cli-20261012_1408*.log` | Corroborate | `error getting token source: You are not logged into Antigravity.` / `Auth mode is unspecified, skipping fetchAvailableModels` |
| 2026-10-12 | Command | 8001 `HTTPS_PROXY=http://127.0.0.1:9 agy models` | Is network failure distinguishable? | Exit 1, stderr `Error: Eligibility check failed: Post "https://…loadCodeAssist": proxyconnect tcp: … connection refused` — **no sign-in wording** |
| 2026-10-12 | Command | 8003 `HOME=/tmp/emptyhome agy models` | Reproducible not-signed-in fixture | Exit 1 with the same "Please sign in…" message |
| 2026-10-12 | Command | `agy --help`, `agy help auth` | Is there an auth-status command? | No `auth`/`status`/`whoami` subcommand in 1.3.3; `agy models` is the only non-interactive signal |
| 2026-10-12 | Command | `docker image inspect`, `docker buildx imagetools inspect …:beta`, Docker Hub tags API | "Is the image old?" | Both containers use `sha256:62ee64827c53…` = `beta` = `1.5.3-beta.1`, built 13:24 UTC today, newest tag |
| 2026-10-12 | Command | `docker inspect` mounts; `docker volume inspect *-root-home` | Why state differs per node | `/root` is a per-container named volume (8001's created 2026-05-13, 8003's 2026-05-12). Sign-ins live there and survive image updates |
| 2026-10-12 | Command | Codex `auth.json` claim `chatgpt_plan_type` (decoded locally, no secrets printed) + `models_cache.json` | User's Codex question | 8001 Pro (7 listed models), 8003 Free (3). Out of scope by user decision |
| 2026-10-12 | Code | `autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts` | Discovery owner | `runCommand` maps non-zero exit → `AGY_MODEL_DISCOVERY_FAILED`, ENOENT → `AGY_CLI_UNAVAILABLE`; stderr is collected but never inspected |
| 2026-10-12 | Code | `runtime-management/runtime-availability-service.ts` | Availability owner | `{runtimeKind, enabled, reason}`; AGY reason = diagnostic message; Codex/Claude reason "command '…' is not available."; Grok via `probeGrokBuildCli` diagnostic |
| 2026-10-12 | Code | `api/graphql/types/runtime-availability.ts` | API contract | `RuntimeAvailabilityObject { runtimeKind, enabled, reason }`; no machine-readable cause |
| 2026-10-12 | Code | `autobyteus-web/components/chat/ChatModelMenu.vue` L182, L191 | Where "Not installed" comes from | Every disabled runtime row renders the fixed `chat.model.notInstalled`; server `reason` appears only as the `title` tooltip |
| 2026-10-12 | Code | `autobyteus-web/composables/chat/useChatModelCatalog.ts` `ensureAvailability` | Recovery after sign-in | Calls `fetchRuntimeAvailabilities()` without `force`; after the first success (`hasFetched`) the menu never re-checks, so signing in would not show until the app reloads or the store resets |
| 2026-10-12 | Code | `autobyteus-web/stores/runtimeAvailabilityStore.ts` | Store semantics | `fetchRuntimeAvailability(kind, force)` supports a forced per-kind re-check |
| 2026-10-12 | Code | `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` L138-175 | Other surfaces (launch/run settings) | Hide unavailable runtimes unless selected; show `runtimeReason(kind)` text for a selected unavailable runtime; have a forced reload path. They benefit from a better server reason without UI change |
| 2026-10-12 | Code | `llm-management/services/model-catalog-service.ts`, `antigravity-model-catalog.ts` | Server caching after sign-in | AGY catalog is not cached server-side; each call re-runs `listAntigravityModels()` |
| 2026-10-12 | Code | `autobyteus-web/stores/llmProviderConfig.ts` `fetchProvidersWithModels` | Frontend catalog after sign-in | Re-fetches unless state is `ready`; an earlier error does not stick |
| 2026-10-12 | Code | `agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` L134 | Run path | New run calls `listAntigravityModels()`; a discovery error propagates its sanitized message |
| 2026-10-12 | Code | `llm-management/services/run-model-selection-service.ts` L55 | Model replacement path | AGY catalog failure → `catalogDiagnostic: toAgyDiscoveryDiagnostic(error)` |
| 2026-10-12 | Code | `runtime-management/grok/grok-build-capability.ts` | Sibling pattern | Same five-code diagnostic shape (`GROK_CLI_UNAVAILABLE`, `…UNSUPPORTED`, `…TIMEOUT`, `…FAILED`, `…INVALID`) |
| 2026-10-12 | Doc | `autobyteus-server-ts/docker/README.md` "CLI Auth Model" | Docker docs | Already says CLIs are preinstalled, **not pre-authenticated**, and to run `agy` to sign in from the backend root terminal. No troubleshooting link from the app's message to this |
| 2026-10-12 | Doc | `DESIGN.md` "Unrelated runtime discovery blocks selected-runtime readiness" | Constraint | Don't declare an unverified runtime available; keep per-runtime verification independent |
| 2026-10-12 | Doc | `TESTING.md` "Runtimes without a model", fake CLI fixtures | Test strategy | `ANTIGRAVITY_CLI_COMMAND=<fake>`; `tests/unit/runtime-management/antigravity-cli-capability.test.ts` already scripts `failed-models` etc. |
| 2026-10-12 | Doc | `tickets/done/antigravity-runtime-missing/requirements-doc.md` | History | Earlier ticket preserved "sanitized discovery failures" and deferred unavailable-runtime UI; this ticket now changes that UI by explicit direction |

## Relevant Existing Behavior And Supported Product Paths

| ID | Kind | Trigger | Current path / lifecycle | Current outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | User opens the chat model menu on a node where `agy` is installed but not signed in | Menu fetches availability once → server runs `agy --help` (ok) → `agy models` exits 1 → `AGY_MODEL_DISCOVERY_FAILED` → `enabled:false` with generic reason → row renders "Not installed" | Wrong label; real cause only as a vague hover tooltip | R-03, R-04, code rows | High (reproduced live on 8003) |
| BEH-002 | User/System | Same menu on a node where `agy` is installed and signed in | Discovery succeeds → enabled → models listed | Works (8001) | R-03/R-04 on 8001 | High |
| BEH-003 | User | User signs in in the node Terminal, then reopens the menu | `fetchRuntimeAvailabilities()` returns the cached result | Still shows unavailable until app reload or node switch | `useChatModelCatalog.ensureAvailability`, `runtimeAvailabilityStore.hasFetched` | High (code) |
| BEH-004 | User/System | Any other disabled runtime (Codex/Claude command missing, Grok failures, AGY timeout/unsupported/invalid) | Same fixed "Not installed" label | Label is right only for "command missing" cases | `ChatModelMenu.vue` L191 | High |
| BEH-005 | User | Launch/run-settings forms with an unavailable selected runtime | Shows server reason text | Text is the generic discovery message for AGY sign-in | `useRuntimeScopedModelSelection.ts` | High |
| BEH-006 | System | Starting an AGY run while not signed in | `listAntigravityModels()` throws the generic discovery-failed message | Error doesn't say "sign in" | factory L134 | High (code) |

## Relevant Codebase And Technical Facts

| Path | Current responsibility | Requirement implication | Design implication |
| --- | --- | --- | --- |
| `antigravity-cli-capability.ts` | Bounded spawn; classifies failures into 5 codes; never surfaces provider output | Must add a "not signed in" classification without leaking provider output | Inspect the failed `models` output for a sign-in marker inside the capability owner; keep the message fixed |
| `runtime-availability-service.ts` | Per-runtime availability rows | Reason text must carry the cause | No change needed: AGY provider already returns `toAgyDiscoveryDiagnostic(error).message` |
| `runtime-availability.ts` (GraphQL) | Exposes rows | A new field would break newer apps against older nodes (see Architecture Investigation Findings) | Keep the contract unchanged (DEC-002, SR-002) |
| `ChatModelMenu.vue` | Renders rows | Replace the fixed label; show the reason visibly | Neutral label + visible reason line |
| `useChatModelCatalog.ts` | Menu data | Re-check unavailable runtimes on open | Force-refresh only disabled kinds |
| `localization/messages/{en,zh-CN}/chat.ts` | Labels | New labels in both locales | — |
| `docker/README.md` | Docker auth docs | Already correct; add the in-app symptom → fix link | Small doc addition |

## Structural And Payload Surface Inventory

- Payload surfaces: AGY diagnostic message texts; localization dictionaries (en, zh-CN); Docker README.
- Structural surfaces: AGY capability classifier (one new code); chat menu component and catalog composable (re-check on open).
- API change: none (DEC-002). Persistence: none. Security/privacy: provider output must stay out of messages (existing rule). Concurrency/lifecycle: forced re-check uses the store's existing sequence/pending guards. Deployment: new release + Docker image rebuild (same Dockerfile, no change needed).

## Runtime, Probe, Or Reproduction Findings

| ID | Method | Scenario | Observation | Implication |
| --- | --- | --- | --- | --- |
| R-01 | Process env/PATH comparison | PATH/user hypothesis | Identical in both nodes; server = root, HOME=/root | Rejected: PATH/user |
| R-02 | `agy --help` flag check | Unsupported version hypothesis | All required flags present (agy 1.3.3) | Rejected: version |
| R-03 | `agy models` | Sign-in | 8003 exit 1 "Please sign in…"; 8001 lists 18 models | **Root cause on 8003: not signed in** |
| R-04 | GraphQL `runtimeAvailability` | API view | 8003 `enabled:false` + generic reason | Server loses the cause |
| R-05 | Image digests | "Image old?" | Both containers = newest `beta`/`1.5.3-beta.1` | Rejected: stale image |
| R-06 | Volume mounts | Why nodes differ | `/root` per-node persistent volume holds sign-ins | Each node signs in separately; doc it |
| R-07 | Proxy-broken `agy models` on 8001 | Network failure | "Eligibility check failed … connection refused", no sign-in wording | Sign-in vs network distinguishable from output |
| R-08 | `HOME=/tmp/emptyhome agy models` | Repro | Same sign-in message | Fixture text for tests |
| R-09 | Codex plan claim + model cache | User's Codex question | 8003 Free (3 models) vs 8001 Pro (7) | Not a bug; excluded by user |
| R-10 | Cache hypothesis | "Discovery ran before agy was available and is cached" | Server doesn't cache AGY discovery; frontend caches availability per session | Rejected on server; **frontend session cache blocks recovery** (BEH-003) |

## Stakeholder And User Evidence

| Source | Need | Strength | Implication |
| --- | --- | --- | --- |
| User task + screenshots | Antigravity usable on Docker nodes; truthful reason | Explicit | REQ-001..004 |
| User (conversation) | "It is installed. It's just not logged in." "fix the agy bug now. codex is not a bug" | Explicit | Scope = AGY; Codex excluded |

## External Contracts, Standards, And Dependencies

| Dependency | Version | Behavior | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Antigravity CLI `agy` | 1.3.3 (image latest-channel) | `agy models` exits 1 with "Please sign in…" when signed out; no auth-status subcommand | R-03, R-08, `agy --help` | Upstream may reword the message. Mitigation: match several sign-in phrasings; fall back to the existing generic "discovery failed" (never to "Not installed") |
| Docker image `autobyteus/autobyteus-server` | 1.5.3-beta.1 | CLIs preinstalled, not pre-authenticated; `/root` volume persists sign-in | README, R-06 | None for this fix |

## Persisted Data And State Facts

- No persisted AutoByteus data affected. `agy` credentials live in the node's `/root` volume and are owned by the CLI; this fix only reads the CLI's output.

## Product Design Request Context

- Product Design request: Not stated. The direction itself sets the UI outcome ("show the actual reason … with a way to recover"); the small row-label change follows the existing menu style.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Path | Owner | Purpose | Status | Approval |
| --- | --- | --- | --- | --- |
| Task screenshots `…/context/ctx_*.png` | User | Symptom evidence | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | Upstream rewording of the sign-in message | Match several phrasings ("sign in", "signed in", "log in", "logged in", "login"); unknown wording falls back to generic discovery-failed | Accepted |
| RSK-002 | Risk | Re-checking unavailable runtimes on every menu open spawns `agy` (~2 s) each time while signed out | Only unavailable runtimes are re-checked; the row keeps its last state while re-checking; menu stays usable | Accepted |
| UNK-001 | Unknown | Whether `agy` emits a sign-in message on stdout vs stderr in future versions | Classifier inspects both streams | Resolved by design |
| ASM-001 | Assumption | The user can complete agy's interactive sign-in in the node Terminal | 8001 was signed in that way (`agy` in its bash history); README documents it | Validated by evidence |

## Architecture Investigation Findings

- Discovery owner: `antigravity-cli-capability.ts` `runCommand` resolves on exit 0 and rejects with `AGY_MODEL_DISCOVERY_FAILED` on any non-zero exit; stdout/stderr buffers are bounded (64 KiB help / 1 MiB models) and discarded on failure. The classification point for a new code is the non-zero `close` branch, using the already-bounded buffers.
- `toAgyDiscoveryDiagnostic` is the single error → diagnostic mapper used by availability, model selection and the launch-capability validator (`application-launch-host-capability-validator.ts` L121), so a new code reaches all three consumers automatically.
- Availability rows are built by `createCapability(kind, enabled, reason)`; Codex and Claude reasons are "command not available" (truly not installed); Grok uses its own five codes.
- Frontend store validates `reason` shape strictly (`raw.reason === null || typeof raw.reason === 'string'`); an added field must be validated the same way.
- Chat menu row (`ChatModelMenu.vue` L168-192) is the only surface with the fixed "Not installed" label (`git grep chat.model.notInstalled` → only `ChatModelMenu.vue` L182/L191 and the en/zh-CN dictionaries; the VoiceInput card uses its own separate keys).
- **Client/server version skew (SR-002):** `git grep` over `autobyteus-web` finds no node/server version negotiation. `runtime_availability_queries.ts` requests `{ runtimeKind enabled reason }`. A query naming a field the node's schema lacks fails GraphQL validation for the whole operation. `runtimeAvailabilityStore.fetchRuntimeAvailability` then records `status:'error'`, `isRuntimeEnabled` returns false and the error text becomes the reason — for **every** runtime on that node. The running Docker nodes are updated by pulling images independently of the desktop app (`docker ps`, R-05). So an additive response field is not harmless here. Decision: no contract change (requirements DEC-002).
- Unavailable-runtime re-check: `ChatModelMenu.onToggle` → `catalog.ensureAvailability()` → `fetchRuntimeAvailabilities()` (no force; returns the cached list once `hasFetched`). The store's per-kind `fetchRuntimeAvailability(kind, true)` keeps the old row in `availabilities` until the new response is accepted (it replaces the row only on success), so a re-check doesn't flicker the row. On a failed request it sets `requestsByKind[kind].status='error'`, and `runtimeReason` prefers that error text.
- Chat catalog rows come from `availability.availabilities` (`useChatModelCatalog.runtimes`), using `entry.enabled` / `entry.reason`.
- Existing tests: `autobyteus-web/components/chat/__tests__/ChatModelMenu.spec.ts`, `autobyteus-web/composables/chat/__tests__/useChatModelCatalog.spec.ts`, `autobyteus-server-ts/tests/unit/runtime-management/antigravity-cli-capability.test.ts` (scripted fake CLI with `AGY_FAKE_MODE`), `…/runtime-availability-service.test.ts`, `…/agent-execution/backends/antigravity/agy-agent-run-backend-factory.test.ts`.
- `useChatModelCatalog.ensureAvailability` is called from `ChatModelMenu.onToggle` (menu open). The store's `fetchRuntimeAvailability(kind, true)` already supports a forced per-kind re-check with stale-response guards.

## Requirement Implications

- The fix has two halves that both matter: the server must keep the cause (sign-in), and the menu must stop saying "Not installed" for causes that aren't "not installed".
- Recovery needs the menu to re-check an unavailable runtime when reopened; otherwise "sign in, then reopen" doesn't work without a reload.
- Docker image and Dockerfile need no change; the README needs a short pointer from the in-app message to its existing sign-in steps.

## Notes For Architecture Design

- Map SCN-001..004 onto: capability classifier → availability provider → GraphQL → store → menu row + re-check.
- Keep provider output out of messages; keep all bounds/timeouts.
- Keep per-runtime availability independent (DESIGN.md lesson).
