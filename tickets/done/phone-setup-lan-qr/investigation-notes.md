# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements approved by user on 2026-06-06; design production in progress.
- Investigation Goal: Determine why Local LAN selection in the frontend phone setup flow no longer exposes QR-code generation and define the correct support model for Tailscale plus Local LAN.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The visible symptom is in one frontend card, but the policy is also enforced in the Pinia store, shared frontend URL validation, backend pairing service, tests, docs, localization, and Android/native expectations.
- Scope Summary: Current desktop/web/server Phone Setup only allows HTTPS QR creation; Local LAN candidates still exist but are treated as HTTP diagnostics and cannot generate QR. Android code still supports acknowledged private HTTP, making this a cross-surface policy mismatch.
- Primary Questions To Resolve:
  - Which frontend files/components own the phone setup UI? Answered: `PhoneSetupGuideCard.vue`, `PhoneAccessCard.vue`, `phoneAccessStore.ts`, `phoneAccessRemoteNode.ts`.
  - Is Local LAN still represented as a selectable setup mode in code? Answered: yes as `RemoteAccessUrlCandidate.kind === "lan"` from backend candidate discovery, displayed in the candidate dropdown.
  - What condition hides or shows QR-code generation? Answered: `PhoneAccessCard.canCreatePairingSession` requires `store.selectedUrlValidation.isHttps`; the button is present but disabled for HTTP LAN.
  - What source produces QR payload URLs for Tailscale and Local LAN? Answered: backend `RemoteAccessPairingService.createPairingSession()` creates `mobileUrl` and `qrText`, but currently rejects HTTP before payload creation.
  - Does the issue require only a local UI fix, or does it expose a boundary/design problem? Answered: not UI-only; backend and frontend policy must both change if Local LAN QR is to be restored.

## Request Context

User reported on 2026-06-06: "could you please analyse the phone setup from frontend, it seems it only supports tailscale now or something? i feel tailscale and local lan should both be supported. Earlier i could select local lan, but when is select local lan, i dont see the option to generate qr code. please analyse"

User later said after interrupting the prior run: "sorry for the interruption, please continue". User then approved the Local LAN restoration direction, saying AutoByteus previously supported both Tailscale HTTPS and Local LAN and Local LAN should remain available for trusted home/local use.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr`
- Current Branch: `codex/phone-setup-lan-qr`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` succeeded on 2026-06-06.
- Task Branch: `codex/phone-setup-lan-qr` created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Use this dedicated worktree and branch, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-06 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository and branch context | Initial shared checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on branch `personal`, tracking `origin/personal`; remote default/head is `origin/personal`. | No |
| 2026-06-06 | Command | `git fetch origin && git worktree list` | Refresh remote refs before creating a dedicated task worktree and check for reusable worktree | Fetch succeeded; no existing `phone-setup-lan-qr` worktree existed. | No |
| 2026-06-06 | Command | `git worktree add -b codex/phone-setup-lan-qr /Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr origin/personal` | Create mandatory dedicated task worktree/branch | Worktree and branch created successfully from `origin/personal` at commit `c62a78d6`. | No |
| 2026-06-06 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Required shared design read | Design work must be spine-first, ownership-aware, avoid compatibility dual paths, and include design health assessment. | No |
| 2026-06-06 | Command | `rg -n "tailscale|local lan|PhoneAccessCard|qr|remote-access" autobyteus-web ...` | Locate phone setup frontend, store, docs, and QR code paths | Relevant frontend files are `components/settings/PhoneAccessCard.vue`, `components/settings/PhoneSetupGuideCard.vue`, `stores/phoneAccessStore.ts`, `utils/phoneAccessRemoteNode.ts`, `services/qr/qrCodeDataUrlService.ts`; docs are `autobyteus-web/docs/remote_access.md`. | No |
| 2026-06-06 | Code | `autobyteus-web/components/settings/PhoneAccessCard.vue` | Inspect QR button visibility/eligibility | The Create QR button is rendered but disabled by `!canCreatePairingSession`; `canCreatePairingSession` requires `store.selectedUrlValidation.isHttps`. Local LAN HTTP therefore cannot generate QR. | Design change if approved |
| 2026-06-06 | Code | `autobyteus-web/stores/phoneAccessStore.ts` | Inspect selected candidate policy and create-pairing action | `selectDefaultCandidate()` only considers `normalizeHttpsPhoneAccessCandidate()` results; `createPairingSession()` blocks when validation is not valid/HTTPS; remote-node flow also requires manual URL and Android-facing host. | Design change if approved |
| 2026-06-06 | Code | `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Inspect frontend URL validation | `validatePhoneAccessAdvertisedUrl()` normalizes URLs but returns `isHttps: false` and an HTTPS-required message for all HTTP URLs. `normalizeHttpsPhoneAccessCandidate()` filters non-HTTPS candidates out of default selection. | Design change if approved |
| 2026-06-06 | Code | `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | Verify Local LAN candidates still exist | The backend emits `lan`, `tailnet_like`, `loopback`, and `manual` candidates. LAN IPs are still discoverable; the problem is QR eligibility, not candidate discovery. | No |
| 2026-06-06 | Code | `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Verify backend QR/pairing behavior | `createPairingSession()` normalizes `serverBaseUrl`, then calls `assertHttpsServerBaseUrl()`, rejecting HTTP with `REMOTE_ACCESS_HTTPS_REQUIRED` before creating QR payload. | Design change if approved |
| 2026-06-06 | Code | `autobyteus-server-ts/src/api/rest/remote-access.ts` | Inspect REST owner route | `POST /remote-access/pairing-sessions` delegates to `RemoteAccessPairingService`; backend service is the authoritative creator of `qrText`/`mobileUrl`. | No |
| 2026-06-06 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Inspect route ownership/security boundaries | Owner-management routes such as `/remote-access/pairing-sessions` are trusted-network owner routes; mobile credentials cannot manage pairing sessions. | Preserve |
| 2026-06-06 | Test | `autobyteus-web/components/settings/__tests__/PhoneAccessCard.spec.ts` | Inspect existing frontend coverage | Current tests assert non-HTTPS selected URLs disable QR creation and show warning. Tests must change if Local LAN is restored. | Design/test update if approved |
| 2026-06-06 | Test | `autobyteus-web/stores/__tests__/phoneAccessStore.spec.ts` | Inspect store coverage | Current tests assert HTTP-only interface candidates are not auto-selected and HTTP pairing creation is blocked before POST. Tests must change if Local LAN is restored. | Design/test update if approved |
| 2026-06-06 | Test | `autobyteus-server-ts/tests/unit/remote-access/pairing-auth-service.test.ts` and `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts` | Inspect backend coverage | Current tests assert HTTP pairing sessions are rejected with `REMOTE_ACCESS_HTTPS_REQUIRED`. Tests must change if Local LAN is restored. | Design/test update if approved |
| 2026-06-06 | Doc | `autobyteus-web/docs/remote_access.md` | Inspect durable product docs | Docs still say Same LAN is a supported setup profile, but also say new desktop-created QR codes require HTTPS and HTTP LAN candidates are diagnostic-only. This is internally inconsistent for the user's expectation. | Docs update if approved |
| 2026-06-06 | Code | `autobyteus-web/localization/messages/en/settings.ts` and `autobyteus-web/localization/messages/zh-CN/settings.ts` | Inspect UI copy | Manual URL field is labeled `Tailscale Serve HTTPS URL`; HTTP candidates are described as diagnostic-only; QR error says HTTPS URL required. | Localization update if approved |
| 2026-06-06 | Repo | `git show 37ddd9a90^:autobyteus-web/stores/phoneAccessStore.ts` and `git show 37ddd9a90^:autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Compare prior behavior | Before commit `37ddd9a9`, frontend defaulted to first non-loopback candidate and backend did not assert HTTPS. This matches the user's memory that Local LAN used to work. | No |
| 2026-06-06 | Repo | `git blame -L 1,120 autobyteus-web/utils/phoneAccessRemoteNode.ts` and `git blame -L 1,100 autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Identify when policy changed | Frontend validation came from `940f622a`/`220cd8b9`; backend HTTPS assertion came from `37ddd9a9` on 2026-05-22. | No |
| 2026-06-06 | Code | `autobyteus-android/app/src/main/res/xml/network_security_config.xml`, `PairingLinkParser.kt`, `NodeUrlNormalizer.kt`, `ConnectionDiagnosticMapper.kt`, Android tests | Check native phone expectations | Android supports `http://` node URLs and pairing payloads, permits cleartext traffic, and requires explicit HTTP acknowledgement for private LAN/tailnet. Desktop/web/server QR blocking is stricter than Android capability. | Preserve Android compatibility |
| 2026-06-06 | Command | `pnpm -C autobyteus-web test:nuxt -- components/settings/__tests__/PhoneAccessCard.spec.ts stores/__tests__/phoneAccessStore.spec.ts` | Attempt targeted frontend tests | Failed before running tests: `cross-env: command not found`; pnpm warned local package exists but `node_modules` missing. | Install deps or use existing validation env before implementation validation |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Settings -> Nodes -> Phone Setup -> `PhoneSetupGuideCard` and `PhoneAccessCard`.
- Current execution flow:
  1. `PhoneAccessCard.onMounted()` calls `store.loadAll()`.
  2. `phoneAccessStore.loadAll()` fetches settings, address candidates, active devices, and revoked devices.
  3. Address candidates include Local LAN (`kind: "lan"`) and tailnet-like IP (`kind: "tailnet_like"`) candidates from `AddressCandidateService`, generally using the configured server protocol/port (`http://...:29695` in normal local setups).
  4. For embedded windows, `selectDefaultCandidate()` auto-selects only HTTPS candidates; HTTP-only Local LAN candidate sets leave `selectedServerBaseUrl` empty until the user manually selects one.
  5. When the user selects Local LAN HTTP, `validatePhoneAccessAdvertisedUrl()` marks it valid URL syntax but `isHttps: false` and returns an HTTPS-required message.
  6. `PhoneAccessCard.canCreatePairingSession` requires `isHttps`, so the Create QR button is disabled.
  7. If a frontend-only change bypassed the disabled button, `phoneAccessStore.createPairingSession()` would still return before POST for non-HTTPS; if that were bypassed too, backend `RemoteAccessPairingService` would reject HTTP with `REMOTE_ACCESS_HTTPS_REQUIRED`.
- Ownership or boundary observations:
  - The backend pairing service is the authoritative QR/pairing-session owner.
  - The frontend store mirrors pairing URL validation for UX and performs remote-node advertised URL verification.
  - The component owns presentation/controls only and should not become the policy authority.
  - Android native owns its app-level HTTP acknowledgement before opening a cleartext WebView URL.
- Current behavior summary: Current code intentionally supports Tailscale/private HTTPS as the only desktop-created QR path. Local LAN candidates can be displayed but are not QR-capable.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Duplicated Policy Or Coordination
- Refactor posture evidence summary: Small targeted policy refactor likely needed. The intended connection-mode policy appears in several places: frontend URL validator, frontend candidate defaulting, store create method, backend pairing service HTTPS assertion, docs/localization, tests, and Android acknowledgement. If Local LAN is restored, the allowed pairing URL policy should be defined coherently and reflected at backend + frontend boundaries.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `PhoneAccessCard.vue` | QR action eligibility requires `isHttps` | Component-level UX mirrors HTTPS-only policy; not a missing button render | Change if approved |
| `phoneAccessStore.ts` | HTTP candidates are filtered from default selection and blocked before POST | Policy lives in store as well as component | Change if approved |
| `RemoteAccessPairingService` | Backend rejects all HTTP | Frontend-only fix would fail; backend is authoritative boundary | Change if approved |
| `remote_access.md` | Lists Same LAN as supported but desktop QR flow requires HTTPS | Product docs have policy tension | Update docs if approved |
| Android native code | Supports private HTTP with explicit acknowledgement | Desktop/web/server is misaligned with Android capability | Preserve and cite in design |
| Commit `37ddd9a9` | Added HTTPS backend assertion and HTTP-blocking requirements | Current behavior was intentional security hardening, not accidental local code rot | New user approval needed to revise policy |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Renders Phone Access controls, URL field/dropdown, QR panel, paired-device lists | `canCreatePairingSession` requires HTTPS; selected HTTP warning appears; button disabled for Local LAN HTTP | Component should stay presentation; adapt to a store-provided URL policy result if requirements are approved |
| `autobyteus-web/stores/phoneAccessStore.ts` | Loads Phone Access data, owns selected URL state, creates pairing sessions, verifies remote advertised URL | Filters default candidates to HTTPS; blocks non-HTTPS before API call; remote-node QR requires manual URL | Store is frontend orchestration owner; should mirror backend pairing URL policy and preserve remote-node verification |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Frontend advertised URL validation and remote status fetch helpers | Hard-codes non-HTTPS as invalid for pairing | Likely place to extract/rename a broader `validatePhoneAccessPairingUrl` policy |
| `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | Discovers local loopback/LAN/tailnet-like/manual server URL candidates | Still emits `lan` candidates; not the blocker | Candidate discovery can be reused; labels may need UX policy metadata |
| `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Creates pairing sessions, one-time payloads, QR/mobile URLs, and exchanges codes | `assertHttpsServerBaseUrl` blocks HTTP before payload creation | Backend authoritative policy must be changed if Local LAN QR is restored |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | REST entrypoint for remote-access settings/candidates/pairing/devices | Delegates pairing creation to service | No need to move ownership; likely only service error contract/tests change |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Classifies and authorizes remote-access routes | Pairing-session management remains trusted-network owner route; mobile credentials cannot call it | Preserve boundary |
| `autobyteus-web/docs/remote_access.md` | Durable network and pairing docs | Contains both Same LAN support and HTTPS-only QR creation statements | Needs reconciliation if Local LAN is restored |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/*` | Native Android URL parsing, profile, diagnostics | Supports HTTP private URLs with explicit acknowledgement | Confirms Local LAN pairing can be compatible with Android client |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-06 | Static trace | Read `PhoneAccessCard.vue` and `phoneAccessStore.ts` | Local LAN HTTP selection fails eligibility at component and store validation | Reproduces reported behavior by code path without launching UI |
| 2026-06-06 | Test attempt | `pnpm -C autobyteus-web test:nuxt -- components/settings/__tests__/PhoneAccessCard.spec.ts stores/__tests__/phoneAccessStore.spec.ts` | Failed before test execution: `cross-env: command not found`; `node_modules` missing | Need dependency install or validation environment before implementation validation |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used in this investigation.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static analysis. Runtime UI reproduction would require installing frontend dependencies and starting the Nuxt/Electron development environment or a mock backend.
- Required config, feature flags, env vars, or accounts: None for static analysis.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **Frontend component gate:** `PhoneAccessCard.vue` line 219+ defines `canCreatePairingSession`; line 224 requires `store.selectedUrlValidation.isHttps`. This is why the QR button is unavailable for Local LAN HTTP.
2. **Frontend store gate:** `phoneAccessStore.ts` line 67 filters candidates through `normalizeHttpsPhoneAccessCandidate`; line 170 blocks `createPairingSession()` unless validation is HTTPS.
3. **Frontend validation message:** `phoneAccessRemoteNode.ts` line 58+ returns `Phone Access pairing requires an HTTPS URL...` for any non-HTTPS URL.
4. **Backend authoritative gate:** `remote-access-pairing-service.ts` line 41+ rejects non-HTTPS; line 76 calls this before building QR payload.
5. **LAN candidates still exist:** `address-candidate-service.ts` labels private network interfaces as `lan` and emits serverBaseUrl values using configured protocol/port.
6. **Docs conflict:** `remote_access.md` lines 62-68 say Same LAN is a supported setup profile, but lines 141-144 say HTTP interface candidates such as LAN are not normal QR targets and HTTPS is required.
7. **Android compatibility:** Android normalizer and parser accept `http://`; Android network security config permits cleartext for acknowledged private LAN/tailnet; Android diagnostic copy asks the user to acknowledge HTTP only for a trusted LAN/tailnet.
8. **History:** Commit `37ddd9a9` introduced the backend HTTPS assert; prior code allowed HTTP pairing and selected first non-loopback candidate, matching the user's memory.

## Constraints / Dependencies / Compatibility Facts

- `serverBaseUrl` must remain canonical API base; `/mobile` is derived for QR/mobile URL only.
- Mobile credentials must remain separate from owner-management authority.
- Existing Tailscale HTTPS behavior is working and should not regress.
- Existing Android code supports HTTP but expects explicit acknowledgement for cleartext HTTP.
- Frontend dependencies are currently not installed in the task worktree, blocking immediate unit-test execution.

## Open Unknowns / Risks

- The design should choose a deterministic private/local host admission rule for HTTP rather than allowing unrestricted public HTTP. Public-looking private DNS may require a future override if needed.
- Whether remote-node HTTP advertised URL verification behaves reliably across Electron/browser CORS constraints in all deployment modes.
- Whether browser/PWA users without Android native acknowledgement need an additional desktop-side acknowledgement before QR creation.

## Notes For Architect Reviewer

Design should treat the backend pairing service as the authoritative URL policy owner and keep frontend validation as a UX mirror. Avoid a frontend-only workaround. Preserve Tailscale HTTPS as recommended, but add a first-class Local LAN/private HTTP setup profile rather than a hidden compatibility bypass.
