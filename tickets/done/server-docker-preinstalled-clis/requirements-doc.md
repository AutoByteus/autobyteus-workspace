# Server Docker preinstalled CLIs — Requirements

## Status and Approval
- Package: server-docker-preinstalled-clis; owner: Solution Designer; date: 2026-09-28; revision SR-004.
- **Approved — SR-004, approving SR-003 intended behavior unchanged.** Approval reference: user message on 2026-09-28, “yesss. i know. currently the behavior for codex and claude code is the same experience i want to have for antigravity and grok”. This follows presentation of the two-CLI production-image scope and latest-at-build semantics. No behavior-defining supplements.
- Canonical evidence: investigation-notes.md in this directory. Design is authored separately after this approval; independent reviews/Product UI artifacts: N/A — not applicable.

## Problem and Proposed Outcome
Production server image currently bundles Codex/Claude but not agy, grok, zcode or dsh. User narrowed the request to Antigravity agy and Grok grok, then clarified “preinstall in the docker just like codex, and claude code.” Proposed outcome: add those two commands to the same production server image, available before first use; defer ZCode/DSH.

## Behavior and Actors
| Behavior | Current | Proposed desired | Preserve | Scenario / evidence |
|---|---|---|---|---|
| BEH-001 | Codex/Claude packaged; four requested CLIs absent from Dockerfiles | Official agy and grok available on PATH to backend/default terminal without first-run installation | Existing CLI/server/browser functions | SCN-001, E-002/003/006/007–010 |
| BEH-002 | Root home/data/browser profile persisted per production instance | Recreate/upgrade exposes packaged CLI version despite existing home volume; preserve configuration/login material | Per-instance isolation, no destructive reset | SCN-002, E-004 |
| BEH-003 | User logs in after startup; root browser bridge | New CLIs installed but unauthenticated; runtime auth documented and validated separately | No credentials in images; current identity boundary | SCN-003, E-004/007/008 |
| BEH-004 | Default/zh production image published amd64+arm64 | New tools launch meaningfully on same matrix | Existing platform coverage | SCN-004, E-003 |

## Scope Guardrail
- UC-001: preinstall requested CLI commands in released server Docker image.
- UC-002: retain normal startup, per-instance state and upgrade usability.
- UC-003: document post-start login and test release platform coverage.
- Out of scope/non-goals: ZCode/DSH installation, new AutoByteus runtime adapters, new runtime selector entries, desktop IDE installs, account creation, new web services/ports, paid agent runs, deployment/release now, unrelated root/non-root refactor. Personal docker/ image parity and generic browser-base modifications are excluded from this proposed baseline.
- Preserved boundary: BEH-001–004; no volume deletion or server Node major upgrade implied by requested CLI installation.
- Review authority: blocking design/implementation findings must cite approved REQ/AC/preserved behavior. New operational promises, runtime integrations or policies are requirement gaps requiring user approval; reviewer proposals do not amend intent.

## Requirements and Acceptance Criteria (Approved)
| Requirement | Observable outcome | Acceptance criterion | Behavior/scenario/use case |
|---|---|---|---|
| REQ-001 | Official agy and grok preinstalled | AC-001: each resolves and returns meaningful help/version in clean production image as backend user, without downloading/installing CLI at startup; absent artifact fails build/check, not silently skipped | BEH-001/SCN-001/UC-001 |
| REQ-002 | Existing persisted state survives recreation; packaged binaries not masked by prior home | AC-002: recreate with representative nonempty root-home and existing app/browser volumes, commands expose expected packaged versions and prior fixture state remains | BEH-002/SCN-002/UC-002 |
| REQ-003 | Authentication remains runtime/operator owned | AC-003: clean image contains no account tokens, build does not require login, documentation identifies effective user/config/login; preserve existing per-node state and document provider login; any live account-login validation needs separately authorized test credentials, not a build prerequisite | BEH-003/SCN-003/UC-003 |
| REQ-004 | Preserve existing published Linux architecture/variant coverage | AC-004: amd64 and arm64 checks for default/zh image verify commands, Node/native dependencies and startup; existing Codex/Claude/browser/server smoke checks pass | BEH-004/SCN-004/UC-003 |
| REQ-005 | Installation scope does not imply new runtime integration | AC-005: runtime selector remains unchanged; documentation distinguishes installed CLI, authenticated CLI, and supported AutoByteus runtime | BEH-001/SCN-001/UC-001 |
| REQ-006 | Resolve latest official AGY/Grok releases during each supported image build, not a fixed version | AC-006: supported build/release commands re-run CLI acquisition rather than reuse a stale cached install layer; record resolved versions; installation failure fails build rather than silently using an old version. An existing image is not promised to track future upstream releases. | BEH-004/SCN-004/UC-003 |

## Relevant Scenarios
- SCN-001 — Supported Normal Scenario (proposed extension from user request and existing CLI workflow): operator starts production image, opens default server terminal, invokes help/version, then uses independently configured provider CLI. Unauthenticated use must not be confused with missing installation.
- SCN-002 — Supported Normal Scenario (existing README upgrade/persistence contract): operator recreates same node with existing volumes; image tools still available, data/config retained. Older persisted tool copies must not override expected image commands unintentionally.
- SCN-003 — Supported Normal Scenario (existing auth workflow, new-provider details unverified): operator logs in after startup as effective server user; browser bridge where provider supports it; expected account/config persistence across recreation without image-embedded secrets. Alternate auth support determined by provider, not invented.
- SCN-004 — Supported Normal Scenario (CI contract): release builds default/zh amd64/arm64; executable/dependency checks pass. Unsupported architecture artifacts are reported, not omitted.

## Quality / Data / Dependencies
- Operability/compatibility: REQ-001/004, meaningful output checks (not exit code alone), finite smoke-test timeouts to be designed.
- State/security: REQ-002/003; preserve prior root-home, app data, browser state and workspaces; no accepted loss. Actual provider keyring paths and state volumes need verification.
- Dependencies: official AGY installer and Grok distribution; amd64/arm64 native components. Keep existing Node major and browser base. No latency or image-size target asserted without measurements.
- UI/Product artifacts: N/A — not applicable; no new UI requested.

## Approved Scope and Decisions
- DEC-001: production released server image, matching existing Codex/Claude packaging; personal test images excluded.
- DEC-002: only official Antigravity agy and Grok grok; ZCode/DSH deferred. User clarification resolves installation versus integration ambiguity.
- DEC-003: preserve root/backend identity, existing per-node state and browser bridge. Login after startup; no account provisioning, no shared root/vncuser credentials or new auth mechanism.
- DEC-004: user explicitly requests “always install the latest version please thanks is it possible?”. REQ-006 interprets this as latest official release at image build time, consistent with preinstallation. No automatic startup download/updater is added. User explicitly confirmed this same-as-Codex/Claude build-time experience. Existing Codex/Claude behavior remains unchanged.
- Technical unknowns for design/validation: official Linux artifacts and runtime compatibility, supported installer controls, interaction with prior home volumes and authentication tooling. No build success or new-provider keyring durability claimed.

## Architecture Input and Readiness
- Map SCN-001–004 after approval. Existing production owner is server Dockerfile, root server supervisor and release workflow.
- Architecture decisions deferred: install mechanism/layout outside persisted home, integrity checks, test wiring and version controls. No new Node major needed from known package constraints, subject to Linux verification.
- Current behavior evidenced; desired/preserved behavior and scope explicit; ACs traceable; no Product supplement. Content ready for approval: Yes. User approval received for SR-003 behavior, captured in SR-004. Approved basis ready for design: Yes. No implementation performed.
