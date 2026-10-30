# Design Review Report — Credential proxy for integrations, step 1: GitHub (autobyteus-311)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy/tickets/in-progress/integration-credential-proxy/requirements-doc.md` (approved, SR-002)
- Upstream Investigation Notes: `…/investigation-notes.md` (M-1…M-4; Read table)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001…SR-003)
- Reviewed Design Spec: `…/design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001); `tickets/done/secrets-and-integrations-design/solution-validation.md` (V1/V1b, read-only basis)
- Relevant Solution Revision IDs: SR-002, SR-003, SR-004, SR-005
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-004 (revision for AR-001…AR-006) and SR-005 (the user's DEC-011)
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Fail)
- Latest Authoritative Round: `2`. The round-1 verdicts below are kept for unaffected checks; the "Round 2" section revises the affected ones.
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy`, branch `codex/integration-credential-proxy` at `8760c83788` (equal to `origin/personal`); ticket documents untracked. Every cited file below was opened at the stated lines.

## Round 2 (ARCH-REV-002): Re-Check Of The Affected Spines And Prior Findings

The affected spines, redrawn in call order:

- **DS-002 (Codex):** bootstrapper → `IntegrationRunAccess.environmentForRun` → thread `config` = Agent Tools MCP config + `shell_environment_policy.set` + (`workspace-write` only) `sandbox_workspace_write.network_access: true`. The same `config` goes on `thread/start` and `thread/resume` (`codex-thread-manager.ts` L222-262). The shell then reaches `127.0.0.1` (M-5).
- **DS-004:** two release points:
  - attached run: `AgentRunResourceManager.release` → `deactivateForRun` + `revokeForRun`;
  - failed activation: the `AgentRunManager` hook → `deactivateForRun` + `revokeForRun`.

  Revocation is idempotent.
- **DS-005:** normalize the path (refuse `\`, `..`/`%2e%2e`, empty segments) → `new URL(basePath + path + search, route.origin)` → origin check → strip headers → add the route's auth → `redirect: "manual"`. A same-origin `Location` is rewritten through the proxy for that route and pass; another host's is passed unchanged. `api` text is buffered and redacted; `git` is streamed. A git-route `401` becomes `403`.

| Prior Finding | Resolution In SR-004/SR-005 | Verified Against | Status |
| --- | --- | --- | --- |
| AR-001 Codex sandbox reach | Measured M-5. `workspace-write` blocks loopback (exit 7). Per-thread `sandbox_workspace_write.network_access=true` works, and so does `danger-full-access`. The user decided DEC-011 (a), applied automatically: only `workspace-write` Codex runs that have integration variables get `network_access`. `read-only` runs are unchanged | investigation-notes M-5; requirements DEC-011 (the user's quote); design "Codex Sandbox" and the per-runtime row. Auto-execute is on by default for new runs (`chatDraftStore.ts` L95, L230; `agentOrgLaunchDraftStore.ts` L118; `useDefinitionLaunchDefaults.ts` L135, L152, opened) | Resolved |
| AR-002 Pass leak on failed activation | Both release points revoke; the `agent-run-manager.ts` hook releases the run's local sessions (MCP + pass) | design DS-004; `agent-run-activation-operation.ts` L95-100, `agent-run-manager.ts` L164 | Resolved |
| AR-003 Upstream target and redirects | Path normalization and refusals; origin check; `redirect: "manual"`; same-origin `Location` rewritten through the proxy; other hosts passed without a token; `GIT_TERMINAL_PROMPT=0` as a second guard; deterministic tests for `//host`, `..`, encoded paths and the renamed-repo redirect | design DS-005, shell variables, Change sequence step 6 | Resolved |
| AR-004 Access-log policy | The proxy listener registers no `registerHttpAccessLogPolicy` | design Dependency Rules | Resolved |
| AR-005 AC-006 meaning | AC-006 lists the testable cases (unknown, revoked, ended or failed activation, not allowed, no token). A copied live pass is R-1 (non-goal) | requirements L131 | Resolved. The requirements' intent is unchanged |
| AR-006 401 mapping | git route only; the API route passes GitHub's `401` through | design DS-005 step 6 | Resolved |

New this round (non-blocking):
- **AR-007 (Low, artifacts):**
  - `handoff.md` still describes round 1 (SR-003, "Codex measured (M-1)"). The per-finding table the message mentions is not there; it is in SR-004.
  - `requirements-doc.md` L6 says `SR-004` while L5 records DEC-011 at SR-005.

  Refresh both when the package next moves.
- **AR-008 (Low, docs/implementation):** a Codex run in `read-only` still gets the variables and a pass, but cannot reach the proxy (M-5; DEC-011 leaves it unchanged). Say so in the REQ-012 contract (`credential_proxy.md`): "Codex in read-only sandbox: no network, so integrations are unavailable". No machinery is needed.

DEC-011 widens the network of those Codex runs to every address, not only the proxy. That is the user's recorded security choice, so it is not a finding. It is listed under Residual Risks.

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`.
- Rationale reviewed: a new security boundary (a loopback listener that adds credentials), a per-run identity across five runtime backends, a vault consumer kind, new persisted files, GraphQL and a web card.
- Independent Architecture Review required: `Yes`.
- Correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for intent. Three target paths need correction (AR-001…AR-003).
- Approved intent understood: REQ-001…REQ-012, AC-001…AC-008, DEC-001…DEC-010.
  - The shell gets an address, never the token.
  - App-owned GitHub definition; only ticked agents.
  - Anything the token allows (DEC-003); no `gh` own commands (DEC-004).
  - Loopback only (QR-001); passes live and die with the run (REQ-006).
- Scope guardrail confirmed: UC-001…UC-004.
  - Out of scope: the Integrations menu, Jira, SSH, approval prompts, `gh` own commands, the integration skill, the root key, inherited shell env, platform skills.
  - Non-goal: a determined same-user agent.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes`.
- Statements about existing code the design relies on:

| Design statement | Opened at | Result |
| --- | --- | --- |
| Agent Tools local server: own Fastify on `127.0.0.1:0`, `disableRequestLogging: true` | `agent-tools-mcp-local-server.ts` L26-40, L67-77 | True. **But** the same constructor also registers `registerHttpAccessLogPolicy` (L35-38). That logs `redactSensitiveUrl(request.url)` (`http-access-log-policy.ts` L64-74), which redacts only certain query keys (`redact-sensitive-url.ts` L1-31), so the path is logged. See AR-004 |
| Loopback gate checks remote address, `Host`, `Origin` | `agent-tools-mcp-local-access.ts` L9-24 | True; it is a self-contained class and reusable |
| `activateForRun` sites (Claude L28, Codex L324, AGY L126, ACP L185) | `codex-thread-bootstrapper.ts` L322-345; `agy-agent-run-backend-factory.ts` L124-137 | True |
| "One release point deactivates it for every run removal" (`agent-run-resource-manager.ts` L95-119) | file | Partly. `release` covers attached runs only (L95-100: "No exact attachment release authority"). An activation that fails before attachment releases MCP sessions through a **second** hook, `deactivateMcp` (`agent-run-activation-operation.ts` L23, L95-100; supplied at `agent-run-manager.ts` L164). See AR-002 |
| Native shell env seam; the returned env replaces `process.env` | `terminal-child-environment.ts` L1-8; consumers `run-bash.ts` L24, `background-process-context.ts` L28 | True; only these two consumers |
| Claude spawn env per session (`claude-sdk-client.ts` L351-364) | file; callers L177, L205, L244 | True. `resolveSpawnEnvironment` also serves model listing and control queries (L177, L205), so only the run session spawn (L244) should merge the run's variables |
| AGY spawns with `env: input.env` | `agy-stream-process.ts` L41; the caller `launch` at `agy-agent-run-backend-factory.ts` L93-113 passes no `env` today | True |
| ACP spawns with `launchProfile.env(process.env)` | `acp-session-launcher.ts` L86 | True |
| Codex per-thread `shell_environment_policy.set` works (M-1) | `codex-thread-manager.ts` L222-262 (`config` on both `thread/start` and `thread/resume`) | True for the environment. **Not measured: whether the Codex shell can reach the loopback listener under the default sandbox.** The default is `workspace-write` (`codex-sandbox-mode-setting.ts` L11), used whenever `autoExecuteTools` is off (`codex-thread-bootstrapper.ts` L154-175, L310). See AR-001 |
| Studio composition creates `agentToolsMcpHost` | `build-studio-server.ts` L249-300 | True |
| `SecretConsumerIdentity` (`mcpServer` added by 244) | `secret-id.ts` L4-29 | True |

| Behavior ID | Kind | Alignment | Trigger / Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 Connect | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 Run gets its address | System | Pass | Pass for four runtimes and the Codex env | Fail for Codex: the env is delivered, but the Codex shell's reach to the listener under `workspace-write` is unmeasured (AR-001) | Needs Correction | AR-001 |
| BEH-003 Proxied call | System | Pass | Pass | Fail: upstream URL construction and redirect handling are unstated (AR-003); URL logging (AR-004) | Needs Correction | AR-003, AR-004 |
| BEH-004 Refusals | System | Pass | Pass | Pass; AC-006 "another run's pass" needs a testable meaning (AR-005) | Confirmed | AR-005 |
| Run end (REQ-006) | System | Pass | Pass | Fail: a pass issued for a failed activation is never revoked (AR-002) | Needs Correction | AR-002 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` (FU-001) | Pass | Pass | Pass | Pass | Pass | None |
| 244 `solution-validation.md` V1/V1b | Pass | Pass | Pass | Pass: M-3 corrects the git auth premise | Pass | None |
| `requirements-doc.md` meta | Pass | Pass | Pass | Fail (Low): L6 "Current solution revision ID: `SR-001`" | Pass | Refresh to the current SR in the next revision |

## Task Design Health Assessment Verdict

| Area | Result | Evidence |
| --- | --- | --- |
| Present | Pass | "Task Design Health Assessment" |
| Root cause explicit and evidence-backed | Pass | `No Design Issue Found`: per-run activation, a vault catalog and the loopback pattern exist |
| Refactor decision explicit | Pass | No refactor; a new subsystem |
| Supported by the concrete sections | Pass | — |

## Spine Inventory Verdict

| Spine | Scope | Readable | Narrative | Facade Vs Owner | Naming | One Owner, Call Order | Off-Spine Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 connect | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 run address | Primary | Pass | Pass | Pass (`IntegrationRunAccess`) | Pass | Fail for Codex (AR-001) | Pass | Fail |
| DS-003 proxied call | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 run end | Return | Pass | Fail | Pass | Pass | Fail: covers attached runs only (AR-002) | Pass | Fail |
| DS-005 forward | Bounded local | Pass | Fail | N/A | Pass | Fail: steps 1 and 5 omit target and redirect rules (AR-003) | Pass | Fail |

## Boundary Encapsulation Verdict

| Boundary | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `IntegrationRunAccess` (backends' only entry) | Pass | Pass | Pass | Pass | Backends never touch the registry, store or definitions |
| `IntegrationConnectionService` (sole writer) | Pass | Pass | Pass | Pass | — |
| Vault `integration` consumer | Pass | Pass | Pass | Pass | Only the forwarder resolves |
| Loopback listener | Pass | Pass | Pass | Pass | Reused gate, separate listener |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Backends → run access | Pass | Pass | Pass | Pass | — |
| `credential-proxy/` ↛ `src/integrations/github/` | Pass | Pass | Pass | Pass | — |
| Local server → logging | Pass | Fail | Pass | Fail | AR-004 |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity Explicit | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `environmentForRun({runId, agentDefinitionId}, baseEnv)` / `revokeForRun(runId)` | Pass | Pass | Pass | Low | Pass (AR-002 adds a caller) |
| Shell variables (`AUTOBYTEUS_GITHUB_API_URL`, `GIT_CONFIG_*`) | Pass | Pass | Pass | Low | Pass |
| Proxy URL `/r/:pass/:integrationId/:route/*` | Pass | Pass | Pass | Medium | Fail (AR-003: path → upstream) |
| Refusal codes | Pass | Pass | Pass | Low | Pass (AR-006 on 401 mapping) |
| Vault `{kind:"integration", integrationId}` | Pass | Pass | Pass | Low | Pass |
| GitHub-specific GraphQL | Pass | Pass | Pass | Low | Pass. GitHub-specific names are justified (Jira's credential has other fields) |
| `integrationRunAccess: null` for the standalone host | Pass | Pass | Pass | Low | Pass (explicit, not absence) |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Loopback listener and gate | Pass | Pass | Pass | Pass | Pattern reused; the gate imported. Don't copy the access-log registration (AR-004) |
| Run lifecycle hooks | Pass | Fail | N/A | Fail | AR-002: reuse **both** existing release hooks |
| Atomic JSON / JSONL writers | Pass | Pass | N/A | Pass | — |
| Vault consumer and settings GraphQL | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Ownership Clear | Decision Sound | Supports Spine | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/credential-proxy/` (new) | Pass | Pass | Pass | Pass | — |
| Five backends | Pass | Pass | Fail (Codex) | Fail | AR-001 |
| `agent-execution/services` | Fail | Pass | Fail | Fail | AR-002 |

## Reusable Owned Structures Verdict

| Structure | Evaluated | File Choice | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Integration definition (routes, auth, variables, upstream base) | Pass | Pass | Pass | Pass | Jira = one more definition (REQ-011) |
| Run pass | Pass | Pass | Pass | Pass | Reusable by autobyteus-141 |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `connections.json` per integration `{login, connectedAt, agentDefinitionIds}` | Pass | Pass | Pass | N/A | Pass | — |
| Activity record | Pass | Pass | Pass | N/A | Pass | No headers, query or bodies |

Derived consumers (Principle 11): `Pass`. Vocabulary (Principle 15): `Pass`. "integration" vs the `src/integrations/github/` download transport is noted in the glossary, and "run pass" is distinct from the MCP session ID.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `credential-proxy/*` | Pass | Pass | Pass | — |
| `agent-run-resource-manager.ts` | Pass | Pass | Pass | — |
| `agent-run-manager.ts` / `agent-run-activation-operation.ts` | — | — | Fail | Missing from the mapping (AR-002) |
| Backend files | Pass | Pass | Pass | Claude: only the run-session spawn merges the variables (see Read table) |

## Subsystem / Folder / File Placement Verdict

| Path | Clear | Matches Owner | Risk | Verdict |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/credential-proxy/` | Pass | Pass | Low | Pass |
| `api/graphql/types/github-integration.ts` | Pass | Pass | Low | Pass |
| `autobyteus-web/components/settings/GitHubIntegrationCard.vue` | Pass | Pass | Low | Pass |

## Removal / Decommission Completeness Verdict

`N/A`. This is a new capability. `terminalChildEnvironment` gets its supplier, so it is not dead.

## Legacy / Backward-Compatibility Verdict

`N/A` (new capability; no wrappers).

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Vault `integration.github.token`, `integrations/connections.json`, `integrations/activity.jsonl` | `Not Affected` (new stores) | Pass | Pass | Pass | Tolerant readers; malformed file → not connected, with a warning (rule 7); no rewrite until the user saves |
| Run passes | Memory only | Pass | Pass | Pass | Lost on restart, intended (R-5) |

## Change / Refactor Safety Verdict

| Area | Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–6 | Pass | Pass | Pass | Pass. Step 6's per-runtime e2e must cover the Codex sandbox modes (AR-001) |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict |
| --- | --- | --- | --- | --- |
| Script usage (curl, `gh api`, git) | Yes | Pass | Pass | Pass |
| git auth / refusing git / logging | Yes | Pass | Pass | Pass |
| Upstream URL construction | Yes | Fail | Fail | Fail (AR-003) |

## Material Premise Validation

### `P-001` — A Codex run's shell cannot open a TCP connection to `127.0.0.1:<port>` under the default `workspace-write` sandbox

- Related requirement: REQ-002, REQ-003, REQ-004; AC-002…AC-004 ("in each of the five runtimes")
- Behavior IDs: BEH-002, BEH-003
- Initiating basis kind: `User`. The user runs an allowed agent on the Codex runtime with tool auto-execution off, which is the default path.
- Trigger: the agent's script runs `curl "$AUTOBYTEUS_GITHUB_API_URL/…"` or `git clone https://github.com/…`.
- Path: `codex-thread-bootstrapper.ts` L310 `sandbox: resolveEffectiveCodexSandboxModeForRunConfig(...)` → `workspace-write` (L168-175; `codex-sandbox-mode-setting.ts` L11) → `thread/start` with `sandbox` (`codex-thread-manager.ts` L228) → Codex runs the shell command inside its sandbox.
- Consequence: Codex's `workspace-write` sandbox disables network access unless it is configured on. If loopback is included, the proxied call fails, or needs an approval escalation per command, for Codex runs only. M-1 measured the environment (`printenv`), not a connection.
- Reachability: `Unclear`. The supported path is real; whether loopback is blocked has not been measured.
- Review consequence: AR-001 (measure; then decide or route).

### `P-002` — A run pass is issued, and the run's activation fails before attachment

- Related requirement: REQ-006 ("works only while that run is active")
- Initiating basis kind: `System`. A backend preparation or activation failure, for example AGY `AGY_MODEL_MISMATCH` (`agy-agent-run-backend-factory.ts` L104), a startup timeout, a cancelled Codex preparation (`codex-thread-manager.ts` L114-121), or a restore identity mismatch (`agent-run-manager.ts` L141).
- Path: the backend calls `environmentForRun` during preparation (DS-002) → the activation fails → `agent-run-activation-operation.ts` L95-100 calls `deactivateMcp()` only → `AgentRunResourceManager.release` is never reached.
- Consequence: the pass stays valid in memory until server restart, for a run that is not active.
- Reachability: `Reachable` (the activation operation handles these failures today).
- Review consequence: AR-002.

### `P-003` — A request path makes the forwarder send the token to another host

- Related requirement: REQ-005 ("forwards only to the hosts and paths of the app's own GitHub definition")
- Initiating basis kind: `Contract` (REQ-005 security contract; SCN-004 is a supported explicit edge).
- Path: a request to `/r/<pass>/github/api//evil.example/x`, or an upstream `3xx` with `Location` on another host. If the upstream URL is built with `new URL(path, base)`, a path starting with `//` replaces the host. If `fetch` follows redirects, the request moves to the `Location` host.
- Reachability: `Unclear`. It depends on how the unstated construction is implemented. The contract makes it relevant whatever the implementation.
- Review consequence: AR-003 (state the rule; it is cheap).

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Codex sandbox network (P-001) | REQ-002…REQ-004 for one of five runtimes | Measure. If blocked, the remedy, for example enabling sandbox network for allowed runs, is a security-posture choice for the user | Open |

## Review Decision

`Pass` (ARCH-REV-002). Round 1's `Fail` is superseded: AR-001…AR-006 are resolved. AR-007 and AR-008 are non-blocking.

## Findings

### AR-001 — Codex: the shell's reach to the proxy under the default sandbox is unmeasured

- Type: Unclear → Design Impact; it may become a Requirement Gap. Severity: High.
- Protects: REQ-002, REQ-003, REQ-004; AC-002…AC-004 ("in each of the five runtimes").
- Scope: Within Approved Scope. Changes approved behavior: not yet known.
- Evidence: P-001. M-1 proved per-thread variables with `printenv`, not a connection. Codex runs default to `workspace-write`, which disables network in the Codex sandbox unless it is configured on. AutoByteus does not configure it (no `network_access`/`sandbox_workspace_write` anywhere in `autobyteus-server-ts/src`). With auto-execute on, runs use `danger-full-access` (`codex-thread-bootstrapper.ts` L168-175). The design traces one Codex form, not both sandbox modes (Principle 1).
- Required update:
  - Measure on the M-1 probe: from a thread in `workspace-write` (approval `on-request`), `curl` a local `127.0.0.1` listener, and the same with `danger-full-access`. Record the result as M-5.
  - If loopback works, add M-5 to the per-runtime table.
  - If it is blocked, state the Codex outcome. The options are:
    - per-thread `sandbox_workspace_write.network_access = true` for allowed runs, which opens all network for those runs: a security-posture change for the user to approve;
    - document that Codex runs reach integrations only with full access, or with per-command approval.

    Either way, route the choice to the user before implementation. Do not let implementation discover this.
- Recipient: Solution Designer.

### AR-002 — A pass issued for a failed activation is never revoked

- Type: Design Impact. Severity: Medium.
- Protects: REQ-006, AC-006 ("the pass after the run ended").
- Scope: Within Approved Scope. Changes approved behavior: No.
- Evidence: P-002.
  - DS-004 revokes only in `AgentRunResourceManager.release`, which serves attached runs (L95-100).
  - Activations that fail before attachment release run-scoped sessions through `deactivateMcp` (`agent-run-activation-operation.ts` L23, L95-100), which `AgentRunManager` supplies (`agent-run-manager.ts` L164).
  - The design's "single release point" claim is incomplete.
- Required update: name both release points and who drives each. `AgentRunResourceManager.release` handles an attached run. The activation operation's pre-attachment cleanup, via `AgentRunManager`, handles a failed activation; there `IntegrationRunAccess.revokeForRun(runId)` is called beside `deactivateForRun`. For example, widen the hook from `deactivateMcp` to one "release run-scoped sessions" callback that does both. Add `agent-run-manager.ts` (and the operation, if the hook is renamed) to the file mapping, and add a deterministic test: a failed activation leaves the pass refused.
- Recipient: Solution Designer.

### AR-003 — State how the forwarder builds the upstream target and handles redirects

- Type: Design Impact. Severity: Medium.
- Protects: REQ-005 (the token goes only to the definition's hosts), REQ-004 and design point 3 (git never prompts).
- Scope: Within Approved Scope. Changes approved behavior: No.
- Evidence: P-003. DS-005 step 1 says "the route's base plus the path and query"; step 5 does not mention 3xx responses. GitHub answers git operations on a renamed repository with a redirect on `github.com`. If git follows it directly, it reaches GitHub without the proxy, gets a `401`, and prompts.
- Required update:
  - Build the upstream URL by appending a normalized path (one leading `/`; no `//` prefix) to the route's fixed origin. Assert `upstream.origin === route.origin` before sending, otherwise `PATH_NOT_ALLOWED`.
  - Send with redirects **not** followed (`redirect: "manual"`), so the token is never re-sent anywhere, and return the `3xx` to the caller.
  - Decide the git-route `Location` handling. Either rewrite a `Location` under `https://github.com/` to the run's proxy git base, so git stays on the proxy, or add `GIT_TERMINAL_PROMPT=0` to the run's variables, so a stray direct request fails instead of hanging. The choice is the Solution Designer's; both are cheap.
  - Add these to DS-005 and to the deterministic tests (`//host` path refused; a cross-host `3xx` is returned unfollowed and carries no token).
- Recipient: Solution Designer.

### AR-004 — Do not copy the Agent Tools access-log registration; the path carries the pass

- Type: Design Impact. Severity: Low.
- Protects: REQ-009 (spirit) and the design's own rule "the local server never logs request URLs".
- Evidence: the Agent Tools local server also calls `registerHttpAccessLogPolicy` (`agent-tools-mcp-local-server.ts` L35-38). In modes `errors`/`all` that logs `redactSensitiveUrl(request.url)` (`http-access-log-policy.ts` L64-74), which redacts only query keys (`redact-sensitive-url.ts` L1-31). So every refused proxy call (`403`) would log `/r/<pass>/…`.
- Required update: the Dependency Rules say the credential-proxy listener registers no HTTP access-log policy (the activity log is its record), or logs only the route ID and status. Add a test that a refusal writes no line containing the pass.
- Recipient: Solution Designer.

### AR-005 — Give AC-006 "another run's pass" a testable meaning

- Type: Design Impact (clarification). Severity: Low.
- Protects: REQ-006, AC-006.
- Evidence: a run pass is a bearer capability; the proxy maps it to its run and cannot see which shell presented it. A same-user process that reads a live pass (for example from another process's environment, 244 V4) acts as that run, which falls under the stated non-goal (R-1). The design's refusals cover unknown and revoked passes (`RUN_PASS_INVALID`) and a run whose agent lacks access (`INTEGRATION_NOT_ALLOWED`).
- Required update: one sentence mapping AC-006's "another run's pass" to those cases, with the same-user limit stated under R-1, so tests and docs don't promise per-shell binding.
- Recipient: Solution Designer.

### AR-006 — Map upstream `401` → `403` on the git route only, or say why both

- Type: Recommendation (non-blocking). Severity: Low.
- Protects: REQ-003 ("the response is returned as GitHub sent it").
- Evidence: DS-005 step 5 maps every upstream `401` to `403 UPSTREAM_REJECTED_TOKEN`. Only git prompts on `401`. API callers (curl, `gh api`) would lose GitHub's own status and body.
- Required update: apply the mapping to the `git` route, or record why the API route needs it too.
- Recipient: Solution Designer.

## Classification

N/A (Pass). Round 1 was `Unclear` + `Design Impact`, now resolved.

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer gets an informational notice.

## Residual Risks

- R-1 (same-user limit), R-2 (use within the token's permissions), R-3 (activity file growth; start simple), R-4 (Codex `set` replacing a user's own table; measured during implementation), R-5 (a restart ends passes). All are accepted as stated.
- The pass appears in a run's tool output and traces whenever an agent echoes its variables or git prints a proxy URL in an error. It is valid only while the run is active (REQ-006), so this is acceptable. AR-002 keeps that true.
- DEC-011 (user's choice): `workspace-write` Codex runs of ticked agents get unrestricted network, the same as the other four runtimes. Codex's own per-domain allow-list could narrow this once it is no longer experimental.
- GitHub routes not covered by the definition (git LFS `info/lfs`, `uploads.github.com` for release assets) are refused as `PATH_NOT_ALLOWED`. The REQ-012 docs should list them as unsupported.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass`. P-001 is now Measured (M-5) and decided (DEC-011). P-002 is handled at both release points. P-003 is closed by the origin check and manual redirects
- Notes:
  - The core shape is sound:
    - one `IntegrationRunAccess` decision, applied by thin backend hooks;
    - a separate loopback listener with the reused gate;
    - an app-owned definition with per-route auth (M-3);
    - access read on every call;
    - new stores with tolerant readers;
    - an explicit `null` for the standalone host.
  - Round 1 blocking findings AR-001…AR-003, plus AR-004…AR-006: all resolved in SR-004/SR-005.
  - AR-007 and AR-008 are non-blocking.
