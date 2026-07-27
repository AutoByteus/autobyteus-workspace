# Docs Sync Report

## Scope

- Ticket: `secure-centralized-secret-provisioning`
- Trigger: Round 21 API/E2E Pass at 98.9% and proportional durable-test review
  Pass at exact implementation/test HEAD
  `ec0df6b1a9d216366e08262cd96f5280686b04d0`.
- Bootstrap base reference: `origin/personal`
- Integrated base reference used for docs sync:
  `origin/personal@d6983612c5a77fb94d9266df85a9d03fe2d1c68b`.
- Local reviewed-package safety checkpoint and current integrated state:
  `c265d1a96da2a92846ec8a2629cc2abdb1a8bc8a`.
- Integration method: already current after a 2026-07-27 fetch; the checkpointed
  ticket branch was 53 commits ahead and 0 behind, and its merge-base equaled
  the tracked base.
- Post-integration verification:
  `execution-evidence/353-delivery-round21-integrated-state-check-corrected.log`
  (16/16 focused unit tests, all 18 exact base restorations, redundant-removal
  absence, dependency lock, and unchanged Docker topology passed). Evidence
  `352` is retained as a superseded delivery-check mistake: its implementation
  scan accidentally traversed a preserved historical build backup; no product
  correction was required.

## Why Docs Were Updated

Round 21 is the first delivery-ready state after the user's narrow-scope reset.
The durable documentation therefore had to replace historical Round 17 claims
that no longer describe the product:

- Claude authentication is `auto|cli|api-key` with default `cli`; only explicit
  `api-key` resolves the Anthropic vault slot.
- Restored Electron, terminal, Claude, and Codex environment inheritance is
  continuity behavior, not process-isolation evidence.
- `LOCAL_HARDENED` is limited to local vault, file-root, and value-safe custody;
  `STRONG_AGENT_ISOLATION` remains deferred.
- Ordinary provider and Gemini Settings retain save/overwrite and explicit
  Gemini mode selection, but no standalone key-removal surface. Existing custom
  provider Delete remains provider lifecycle and removes its own credential.

These are long-lived operator and maintainer contracts, not ticket-only detail.

## Long-Lived Docs Reviewed

| Doc Path | Result | Durable impact |
| --- | --- | --- |
| `autobyteus-server-ts/README.md` | Updated | Adds the exact Claude selector/default/vault-use boundary and inherited-environment limitation. |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Updated | Replaces superseded `managed-secret` and child-environment claims; records save/overwrite-only ordinary/Gemini behavior and retained custom-provider Delete. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Updated | Adds the exact Claude `auto|cli|api-key` point-of-use contract and no-process-isolation boundary. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Updated | Clarifies that external Codex inheritance is continuity outside vault governance, not a governed-child isolation claim. |
| `autobyteus-web/docs/electron_packaging.md` | Updated | Records inherited runtime-discriminator/environment continuity required by packaged helpers and account-backed tools. |
| `autobyteus-server-ts/docker/README.md` | No change | Docker service topology, mounts, volumes, and ownership remain unchanged. |
| Root `README.md` | No change | Module docs remain the durable owners; no root-level workflow changed. |

## Durable Design / Runtime Knowledge Promoted

| Topic | Durable truth | Source artifacts |
| --- | --- | --- |
| Narrow credential-custody scope | Unrelated launcher, PTY, Claude MCP/session, built-in-default, and redundant deletion changes were restored/removed; only the approved vault and adjacent work remain. | `scope-audit.md`, requirements, design, Round 36 design review, Round 45 source review |
| Claude authentication | Preserve `auto|cli|api-key`, default `cli`; only explicit `api-key` resolves `agentRuntime/claude_agent_sdk/apiKey` and changes `ANTHROPIC_API_KEY`. | implementation handoff, code review, Round 19/21 evidence |
| Assurance boundary | `LOCAL_HARDENED` covers local vault/file-root/value-safe custody, not child-process isolation; inherited environments are continuity; Codex remains excluded; `STRONG_AGENT_ISOLATION` is deferred. | threat model, secret architecture, scope audit |
| Provider removal boundary | Ordinary and Gemini credentials use save/overwrite only; existing custom-provider Delete owns metadata plus its linked vault credential. | scope audit, GraphQL/UI source, Round 21 packaged delete evidence |
| Existing-user transition | One application DB plus adjacent key; bounded custom-provider-v1 migration; no automatic `.env` import/update; explicit importer target and source immutability. | migration contract, secret docs, Round 21 package evidence |

## Removed / Replaced Components Recorded

| Superseded concept | Current documented truth |
| --- | --- |
| Claude `cli|managed-secret` | `auto|cli|api-key`, default `cli`; explicit `api-key` is the sole vault-backed Claude mode. |
| Purpose-built/sanitized production child environments as a security boundary | Restored inherited environments preserve product continuity and do not prove process isolation. |
| Broad governed-child portion of `LOCAL_HARDENED` | Local vault/file-root/value-safe custody only; Codex excluded and strong isolation deferred. |
| Ordinary/Gemini standalone credential removal | Save/overwrite only; Gemini keeps Save, Save-and-use, and Use-this-mode. |
| Treating custom-provider Delete as redundant key removal | Retained existing provider-entity lifecycle; Delete removes that provider and its linked vault credential. |

## Delivery Continuation

- Result: `Pass`.
- Current candidate scope and long-lived docs agree with the Round 21 integrated
  state.
- Next action: build and integrity-check a fresh local macOS verification
  candidate, then request renewed explicit user verification.
- Ticket archive, branch push, merge, tag, release, deployment, and worktree
  cleanup remain prohibited until the user explicitly verifies that candidate.
