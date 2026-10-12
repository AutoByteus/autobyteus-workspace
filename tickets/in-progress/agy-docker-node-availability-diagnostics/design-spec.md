# Design Spec — agy-docker-node-availability-diagnostics

## Solution And Approval Basis

- Current solution revision ID: SR-003
- Approved requirements baseline: `requirements-doc.md` at SR-002. Approved by the Solution Designer within the Task's direction (user informed) and the user's scope message: "fix the agy bug now. codex is not a bug…" (2026-10-12).
- Behavior-defining supplements: none
- Design status: **Ready**
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/investigation-notes.md`
- Authorities read (2026-10-12): `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md` (root; no closer `DESIGN*.md` in `autobyteus-server-ts/` or `autobyteus-web/`), `TESTING.md`, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md`. `design-examples.md` not needed.
- Project vs general principle conflicts: none.

## Current-State Read

- **Discovery owner:** `autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts`. `listAntigravityModels()` runs bounded `agy --help` (flag check), then `agy models`. `runCommand` maps:
  - ENOENT → `AGY_CLI_UNAVAILABLE`;
  - any non-zero exit → `AGY_MODEL_DISCOVERY_FAILED`;
  - timeout → `…TIMEOUT`;
  - oversize → `…FAILED`.
  
  It collects bounded stdout/stderr but never inspects them on failure.
- **Single diagnostic mapper:** `toAgyDiscoveryDiagnostic`, used by:
  - `RuntimeAvailabilityService` (availability `reason`);
  - `RunModelSelectionService` (model replacement);
  - `application-launch-host-capability-validator.ts`;
  - the run factory, through the thrown `AgyDiscoveryError` message;
  - `providerModelCatalogSnapshots`, as the GraphQL error message.
- **Contract:** GraphQL `runtimeAvailability { runtimeKind enabled reason }`. The app has no version handling for an older node, so the contract must not change (requirements DEC-002).
- **Menu:**
  - `autobyteus-web/components/chat/ChatModelMenu.vue` renders each unavailable runtime with the fixed `chat.model.notInstalled` label; the reason appears only in `title`.
  - `useChatModelCatalog.ensureAvailability()` calls `fetchRuntimeAvailabilities()` without `force`, so after the first load the menu never re-checks.
- **Root cause (evidence R-03/R-04/R-10):** the classifier loses the "not signed in" cause, the menu turns every cause into "Not installed", and the menu has no re-check after recovery.

## Task Size And Architectural Risk (Mandatory)

- Task size: **Small**
- Size rationale: about 4 source files changed, plus 2 locale entries, 2 docs and focused tests:
  - one classifier file (one new code, two message texts, one output check);
  - one composable function;
  - one component row template;
  - two dictionary entries;
  - two docs paragraphs.
  
  It stays within existing owners. No new files or owners, and no API, persistence or deployment change.
- Architectural risk: **Low**
- Risk rationale: no contract, persistence, security-boundary, concurrency-model, deployment or ownership change. Sanitization is preserved: the classifier only pattern-matches already-bounded output and returns fixed text. The re-check reuses the store's existing forced per-kind request with its sequence and staleness guards. Upstream wording drift degrades to today's generic text, never to a wrong "installed" claim.
- Escalation trigger: return a Design Impact if any of these turn up:
  - implementation needs an API/GraphQL change;
  - a surface other than the chat menu renders "Not installed" for runtimes;
  - the store's forced re-check can't preserve the row while pending;
  - a real `agy` prints sign-in wording on a non-failing path.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Decision supported | Uncertainty |
| --- | --- | --- | --- | --- |
| `agy models` signed out | investigation R-03, R-08 | exit 1 + "Please sign in to view available models…" | DEC-004 classification on a failed `models` output | Future wording (RSK-001) |
| `agy models` with a broken proxy | R-07 | exit 1 + "Eligibility check failed … connection refused" | Network ≠ sign-in; keep the generic text | — |
| GraphQL on 8001/8003 | R-04 | `reason` carries the diagnostic message | No contract change needed for the server's text to reach the UI | — |
| No version handling in the app | Investigation "Architecture Investigation Findings" (version skew) | A new field would fail the whole query on older nodes | Keep the contract | — |
| `providerModelCatalogSnapshots` on 8003 | GraphQL error with the diagnostic message | Frontend catalog goes to `error` and refetches later | No catalog change needed for recovery | — |
| Store forced fetch | `runtimeAvailabilityStore.fetchRuntimeAvailability(kind, true)` | Keeps the old `availabilities` row until the new response is accepted | Re-check without flicker | — |

## Intended Change

1. **Server classifier.** Add `AGY_SIGN_IN_REQUIRED`. A non-zero exit whose bounded output matches sign-in wording is classified as that code. Reword the not-found and too-old messages.
2. **Menu.** Replace "Not installed" with a neutral "Unavailable" label, and show the server reason under the runtime name.
3. **Re-check.** On menu open, re-check runtimes that were unavailable.
4. **Docs.** Update the Docker README and the AGY runtime module doc.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ / AC | Trigger | Existing evidence | Change / preserved | Target path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001, REQ-003; AC-001, AC-003 | Open the menu on a signed-out node | R-03/R-04 | Sign-in text; visible reason | DS-001, DS-002 |
| BEH-002 | User/System | REQ-005; AC-006 | Signed-in node | 8001 | Preserved | DS-001 (success branch unchanged) |
| BEH-003 | User | REQ-004; AC-004, AC-005 | Reopen the menu after sign-in | `ensureAvailability` | Re-check unavailable kinds | DS-003 |
| BEH-004 | User/System | REQ-003; AC-003 | Any unavailable runtime | `ChatModelMenu.vue` L191 | Neutral label + reason | DS-002 |
| BEH-005 | User/System | REQ-001; AC-007 | Run start / model replacement / launch validation | consumers of `toAgyDiscoveryDiagnostic` | Inherit the new code automatically | DS-001 |
| BEH-006 | Operational | REQ-006; AC-008 | Read the README | README L300-325 | Doc paragraph | N/A (docs) |
| BEH-007 | User/System | REQ-002; AC-002 | Not found / too old | classifier messages | New texts | DS-001 |

## Relevant Supplemental Task Artifacts

None (task screenshots are evidence only, listed in the investigation notes).

## Task Design Health Assessment (Mandatory)

- Change posture: Bug Fix
- Current design issue found: Yes (local)
- Structural triggers:
  - *Repeated coordination*: ruled out; one mapper (`toAgyDiscoveryDiagnostic`) already serves every consumer, so the new code needs no caller changes.
  - *Authoritative boundary*: holds; the menu reads only the availability store via `useChatModelCatalog`.
  - *Shared-structure tightness*: no new structure.
  - *Legacy cleanup*: the `chat.model.notInstalled` key and `data-test="chat-runtime-not-installed"` are removed (clean cut).
- Root cause classification: **Local Implementation Defect**. The classifier owns failure classification but discards the cause on non-zero exit; the menu hard-codes one label for all causes and never refreshes after the first load. The owners and boundaries are right.
- Refactor needed now: No
- Evidence: investigation Source Log code rows; R-03/R-04/R-10.
- Design response: extend the existing owners in place (Intended Change 1–4).
- Refactor rationale: the owners are healthy; adding a cause enum/API was considered and rejected (requirements DEC-002).
- Deferrals: none.

## Terminology

- *Unavailable runtime*: an availability row with `enabled:false`.
- *Re-check*: a forced per-kind availability request (`fetchRuntimeAvailability(kind, true)`).

## Legacy Removal Policy (Mandatory)

- Obsolete in scope:
  - localization key `chat.model.notInstalled` (en, zh-CN);
  - `data-test="chat-runtime-not-installed"`;
  - the `$t('chat.model.notInstalled')` fallback in the row `title`.
- Compatibility wrappers / dual paths kept: **None**.

## Persisted Data / State Transition Decision

- Decision: **Not Affected**. No AutoByteus persisted data changes. CLI credentials are owned and read by `agy` only.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why it matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 005, 007 | Server request needing AGY discovery | Diagnostic message in the GraphQL result or run error | `antigravity-cli-capability.ts` (classification) | Where the cause is lost today |
| DS-002 | Primary End-to-End | BEH-001, 004 | User opens the chat model menu | Row shows label + reason | `ChatModelMenu.vue` (presentation) | Where "Not installed" is rendered |
| DS-003 | Return-Event | BEH-003 | Menu open with unavailable rows | Store row replaced → menu re-renders enabled | `useChatModelCatalog` (menu data) + `runtimeAvailabilityStore` (requests) | Recovery without reload |
| DS-004 | Bounded Local | BEH-001 | Child process `close` | Error code chosen | `runCommand` in the classifier | The classification decision point |

## Primary Execution Spine(s)

- DS-001: `GraphQL runtimeAvailability / run start / model replacement → RuntimeAvailabilityService | AgyAgentRunBackendFactory | RunModelSelectionService → listAntigravityModels → runCommand(agy models) → AgyDiscoveryError(code) → toAgyDiscoveryDiagnostic → reason / error message`
- DS-002: `ChatModelMenu open → useChatModelCatalog.runtimes (from runtimeAvailabilityStore.availabilities) → runtime row → label "Unavailable" + reason line`
- DS-003: `ChatModelMenu.onToggle → useChatModelCatalog.ensureAvailability → runtimeAvailabilityStore.fetchRuntimeAvailability(kind, force=true) for previously-unavailable kinds → GraphQL runtimeAvailability → store replaces row → menu re-renders`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | Any server path that needs AGY models calls `listAntigravityModels`. The help check passes; `agy models` exits non-zero. Inside `runCommand`'s close handler, the bounded stdout+stderr is tested against the sign-in pattern, producing `AGY_SIGN_IN_REQUIRED` or the existing `AGY_MODEL_DISCOVERY_FAILED`. The error's fixed message flows unchanged through every existing consumer | consumer → `listAntigravityModels` → `runCommand` → `AgyDiscoveryError` | classifier file | sign-in pattern constant (same file) |
| DS-002 | Opening the menu renders rows from store availabilities. An unavailable row shows "Unavailable" on the right and the server reason (≤2 lines) under the name, with `title` = reason | menu → catalog composable → row | `ChatModelMenu.vue` | i18n dictionaries |
| DS-003 | On open, the composable snapshots kinds currently present and unavailable. It starts the normal (cached) collection fetch, then a forced per-kind fetch for each snapshotted kind. The store replaces a row only when a response is accepted, so the row stays as-is until then. An enabled result makes the row selectable; hovering loads its catalog as today | composable → store → GraphQL | `useChatModelCatalog` | store's sequence/staleness guards (existing) |

## Spine Actors / Main-Line Nodes

`listAntigravityModels`/`runCommand` (server classification); `RuntimeAvailabilityService` (unchanged); `useChatModelCatalog` (menu data + re-check); `ChatModelMenu.vue` (row presentation); `runtimeAvailabilityStore` (unchanged).

## Ownership Map

- `antigravity-cli-capability.ts`: owns AGY failure classification and the fixed user-facing texts. New: the sign-in pattern and code.
- `useChatModelCatalog.ts`: owns the menu's data needs, including when availability is (re)requested for the menu. New: re-check unavailable kinds on open.
- `ChatModelMenu.vue`: owns row presentation. New: neutral label + reason line.
- `runtimeAvailabilityStore.ts`: owns requests/state. Unchanged.

## Thin Entry Facades / Public Wrappers

N/A — none involved.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Scope | Notes |
| --- | --- | --- | --- | --- |
| `chat.model.notInstalled` (en `chat.ts` L48, zh-CN `chat.ts` L47) | Its only user is `ChatModelMenu.vue` L182/L191 (`git grep`); the label becomes `chat.model.unavailable` | `chat.model.unavailable` | In This Change | VoiceInput uses separate `settings.…notInstalled` keys; untouched |
| `data-test="chat-runtime-not-installed"` | Renamed with the label; no test references it (`git grep`) | `data-test="chat-runtime-unavailable"` | In This Change | — |
| `title` fallback `$t('chat.model.notInstalled')` | Title becomes `runtime.reason ?? undefined` | — | In This Change | — |

## Return Or Event Spine(s)

DS-003 (above).

## Bounded Local / Internal Spines

- DS-004, parent owner `runCommand`: `child close(code≠0) → test bounded stdout+stderr against AGY_SIGN_IN_PATTERN → reject AgyDiscoveryError(AGY_SIGN_IN_REQUIRED | AGY_MODEL_DISCOVERY_FAILED)`. It matters because this is the only place both the exit code and the bounded output are known. Timeout/oversize/ENOENT branches are unchanged and take precedence (they settle first).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk if on main line |
| --- | --- | --- | --- | --- | --- |
| Sign-in pattern constant | DS-004 | classifier | Recognise known sign-in phrasings | Isolates upstream wording in one place | — |
| i18n entries | DS-002 | menu | "Unavailable" en/zh-CN | Localization guard | — |

## Ownership Boundaries

The server's classifier is the only place CLI output is read; everything above it sees fixed codes/texts. The menu reads availability only through `useChatModelCatalog`, never the GraphQL client directly.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | If too thin |
| --- | --- | --- | --- | --- |
| `listAntigravityModels` / `toAgyDiscoveryDiagnostic` | child process, bounded output, classification | availability, run factory, model selection, launch validator, model catalog | Any consumer inspecting CLI stderr or matching message text | Add a code here |
| `useChatModelCatalog` | store access for the menu | `ChatModelMenu.vue` | Menu calling `runtimeAvailabilityStore` directly | Extend the composable |

## Dependency Rules

- Server consumers depend on `antigravity-cli-capability.ts` exports only; none parse message text.
- `ChatModelMenu.vue` → `useChatModelCatalog` → `runtimeAvailabilityStore`. The menu does not import the store.
- No frontend code branches on reason text.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `AgyDiscoveryDiagnosticCode` (+`AGY_SIGN_IN_REQUIRED`) | AGY discovery failure | Classification | — | Union extended |
| GraphQL `runtimeAvailability(runtimeKind)` | One runtime's availability | Unchanged | `runtimeKind: String!` | No schema change |
| `useChatModelCatalog().ensureAvailability()` | Menu availability freshness | Load once + re-check unavailable kinds | — | Same signature (returns void/promise as today) |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `ensureAvailability` | Yes | N/A | Low | — |
| `runtimeAvailability` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift risk | Action |
| --- | --- | --- | --- | --- |
| New code | `AGY_SIGN_IN_REQUIRED` | Yes | Low | Matches the existing `AGY_*` family |
| New key | `chat.model.unavailable` | Yes | Low | — |
| Pattern | `AGY_SIGN_IN_PATTERN` (module-private) | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Forced availability refresh | `runtimeAvailabilityStore.fetchRuntimeAvailability(kind, true)` | Reuse | Already has sequence/staleness guards |
| Diagnostic propagation | `toAgyDiscoveryDiagnostic` + `AgyDiscoveryError` | Extend | Single mapper reaches all consumers |
| Two-line clamp | Tailwind `line-clamp-2` (tailwind ^3.4.5, used in `AgentTeamCard.vue`) | Reuse | — |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| server `runtime-management` | AGY classification/texts | DS-001, DS-004 | Extend |
| web `composables/chat` | Menu availability freshness | DS-003 | Extend |
| web `components/chat` | Row presentation | DS-002 | Extend |
| web `localization` | Label | DS-002 | Extend |
| server docs | README + module doc | — | Extend |

## Draft File Responsibility Mapping → Final File Responsibility Mapping

No reusable structure emerged, so the draft equals the final mapping.

| File | Owner | Concern | Change |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts` | runtime-management | AGY classification | Add `AGY_SIGN_IN_REQUIRED` to the union and `DIAGNOSTICS`. Add the module-private `AGY_SIGN_IN_PATTERN`. In `runCommand`'s `close` handler for `code !== 0`, choose `AGY_SIGN_IN_REQUIRED` when `AGY_SIGN_IN_PATTERN.test(stdout + stderr)`, else `AGY_MODEL_DISCOVERY_FAILED`. Reword `AGY_CLI_UNAVAILABLE` / `AGY_CLI_UNSUPPORTED` per DEC-005. Keep the file comment that provider output never becomes user-facing |
| `autobyteus-web/composables/chat/useChatModelCatalog.ts` | composables/chat | Menu availability | `ensureAvailability`: snapshot `availability.availabilities.filter(r => !r.enabled).map(r => r.runtimeKind)` **before** fetching. Call `fetchRuntimeAvailabilities()` as today, then `fetchRuntimeAvailability(kind, true)` for each snapshotted kind, all errors swallowed as today. Update the doc comment ("fetched once" → "loaded once; unavailable runtimes re-checked on open") |
| `autobyteus-web/components/chat/ChatModelMenu.vue` | components/chat | Row presentation | Unavailable row: right label `$t('chat.model.unavailable')` with `data-test="chat-runtime-unavailable"`. The name cell becomes a block: name (truncate) + `v-if="!runtime.enabled && runtime.reason"` reason line (`text-xs text-gray-400 line-clamp-2 whitespace-normal`, `data-test="chat-runtime-reason"`). `title = runtime.enabled ? undefined : (runtime.reason || undefined)`. Row `items-center` → `items-start` only if needed for two-line alignment |
| `autobyteus-web/localization/messages/en/chat.ts` | localization | Label | Replace `chat.model.notInstalled` with `'chat.model.unavailable': 'Unavailable'` |
| `autobyteus-web/localization/messages/zh-CN/chat.ts` | localization | Label | Replace with `'chat.model.unavailable': '不可用'` |
| `autobyteus-server-ts/docker/README.md` | docs | Operator guidance | In "CLI Auth Model", add: if the model menu says Antigravity is unavailable with "Antigravity CLI is not signed in…", open that node's Terminal (root), run `agy`, finish sign-in, then reopen the menu. Each node's `/root` volume keeps its own sign-in, separately per node and across image updates |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | docs | Runtime doc | L43-46: list "not signed in" as its own safe diagnostic (detected from the failed `models` output, never echoed) |
| Tests (see Guidance) | — | — | Modify/add |

## Reusable Owned Structures Check / Shared Structure Tightness Check

N/A: no repeated structure; no shared type added (the diagnostic union is extended by one member with one meaning).

## Applied Patterns

None beyond the existing classifier (strategy-free switch on failure).

## Target Subsystem / Folder / File Mapping

No new folders or files. All changes land in the files above (existing placements match ownership).

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/` | Off-Spine (provider capability) | Yes | Low | Existing |
| `autobyteus-web/composables/chat/`, `components/chat/` | Main-line UI | Yes | Low | Existing |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Classification | `code !== 0 && AGY_SIGN_IN_PATTERN.test(stdout + stderr) ? "AGY_SIGN_IN_REQUIRED" : "AGY_MODEL_DISCOVERY_FAILED"` inside `runCommand` | Passing stderr up, or matching message text in `RuntimeAvailabilityService` / the frontend | Keeps raw output inside one owner |
| Pattern fixtures | Must match: `Error: Please sign in to view available models. Launch the CLI without arguments to sign in.`; `You are not logged into Antigravity.`; `not signed in`. Must not match: `Error: Eligibility check failed: Post "https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist": proxyconnect tcp: dial tcp 127.0.0.1:9: connect: connection refused` | Overly broad words such as `auth` or `sign`, which can appear in network or unrelated errors | Precision |
| Re-check | `const recheck = availabilities.filter(r => !r.enabled).map(r => r.runtimeKind); void fetchRuntimeAvailabilities(); recheck.forEach(k => void fetchRuntimeAvailability(k, true))` | Forcing `fetchRuntimeAvailabilities(true)` (re-checks every runtime, including Codex/Claude, on every open) or polling | QR-003 |
| Row | `Antigravity CLI` / *(small gray)* `Antigravity CLI is not signed in. Run `agy` in this node's terminal…` · right: `Unavailable` | `Antigravity CLI · Not installed` | AC-003 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Plan |
| --- | --- | --- | --- |
| Keep `chat.model.notInstalled` as a fallback label | Familiar text | Rejected | Removed; "Unavailable" for all causes |
| Add a new GraphQL `reasonCode` field with client-side "field missing → fallback" | Localized per-cause labels | Rejected (requirements DEC-002) | Not needed; reason text carries the cause |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Server: classifier code, pattern and texts, plus unit tests (scripted fake CLI modes). Run `typecheck`.
2. Web: locale key swap, row template, composable re-check, plus component/composable tests. Run localization guards.
3. Docs: README and module doc.
4. Build the server and a Docker-equivalent check (see Guidance), then release (delivery).

## Key Tradeoffs

- No per-cause localized short label, in exchange for zero contract change and no failure on older nodes. The specific cause is still visible (English server text, as on other surfaces today).
- Re-checking unavailable runtimes on every open costs a ~2 s `agy` spawn per open while signed out. It is non-blocking, and bounded to unavailable kinds.

## Risks

- RSK-001 upstream wording drift → generic text (still truthful). Mitigation: several phrasings; fixtures document the known text.
- RSK-002 repeated spawn while signed out → accepted (user-triggered only).
- A user-selected *current* runtime that is unavailable still triggers today's `ensureCatalog` error path. Unchanged.

## Guidance For Implementation

- **Server tests** (`tests/unit/runtime-management/antigravity-cli-capability.test.ts`):
  - add fake modes `signin-models` (stderr = the real 1.3.3 text, exit 1) and `network-models` (stderr = the proxy failure text, exit 1);
  - assert `AGY_SIGN_IN_REQUIRED` vs `AGY_MODEL_DISCOVERY_FAILED`;
  - assert the message never contains stderr content (include `token=abc` in `signin-models` stderr);
  - update expectations for the reworded `AGY_CLI_UNAVAILABLE` / `AGY_CLI_UNSUPPORTED` texts if asserted.
- **Availability test:** `runtime-availability-service.test.ts` asserts the sign-in reason for the AGY provider, using a fake CLI or a mocked rejection.
- **Run-start error:** one `agy-agent-run-backend-factory.test.ts` case where `listAntigravityModels` rejects with `new AgyDiscoveryError("AGY_SIGN_IN_REQUIRED")` asserts the error carries the sign-in text (AC-007).
- **Web tests:**
  - `ChatModelMenu.spec.ts`: an unavailable row renders "Unavailable", the reason line and `aria-disabled`, and contains no "Not installed"; a null reason renders the label only.
  - `useChatModelCatalog.spec.ts`: second `ensureAvailability()` with one unavailable kind calls `fetchRuntimeAvailability(kind, true)` once and does not force available kinds; the first call (empty store) forces none.
- **Guards:** `pnpm -C autobyteus-web guard:localization-boundary` and `audit:localization-literals`.
- **Executable validation:** build this worktree's server. On a Docker node from an image built from this branch (or the server `dist` run with the image's `agy`), check:
  - with `HOME` pointing to an empty directory, GraphQL `runtimeAvailability(antigravity_cli).reason` equals the sign-in text;
  - with the signed-in `/root` (e.g. a copy of node 8001's state, never altering the user's volumes), Antigravity is enabled, lists models, and a run completes.
  
  Never copy or print credentials.
- **User verification:** after release, the user updates node 8003. First the menu should show the sign-in reason. After `agy` sign-in in the 8003 Terminal, reopening the menu shows Antigravity with its models, and a run works.
- Do not touch the Codex/Claude/Grok providers, GraphQL schema, Dockerfile or the store.
