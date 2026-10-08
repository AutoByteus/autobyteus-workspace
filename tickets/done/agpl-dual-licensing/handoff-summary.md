# Handoff Summary — agpl-dual-licensing, Slice 1 (licence text)

**Not legal advice.** A lawyer should review the licence wording, the AGPL §7 additional permission and the commercial-licence terms before relying on them (REQ-011).

## What Changed

- AutoByteus product components are now **AGPL-3.0-only, with a commercial licence available** from `Yu Zheng (AutoByteus)` (contact `ryan.zheng.work@gmail.com`).
  - AGPL `LICENSE` (verbatim gnu.org) in root, `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`, `autobyteus-message-gateway`.
- The application SDKs, devkit, contracts and sample apps stay **Apache-2.0** (verbatim apache.org text), so apps built on them can use any licence.
- `license` fields updated in 17 `package.json` files. New `LICENSING.md`. `NOTICE` and the README §License rewritten. The old "Commercial use and modification are allowed" sentence is removed.
- §7 additional permission for `@anthropic-ai/claude-agent-sdk`.
- Releases up to and including `v1.4.97` remain Apache-2.0.

## Route And Evidence

- `task_size` Small, `architectural_risk` Low, direct route. Architecture review, code review and test-code review: N/A.
- SR-004, IR-001 (`e1ee19dd3`), API-REV-001 Pass (96%).
- Delivery integration: merged `origin/personal@c413909e5` as `e08be28fb`. All checks re-passed: LICENSE sha256, `license` fields, old-claim grep, `pnpm install --frozen-lockfile --lockfile-only`.

## Release Cutoff Decision

- `v1.4.98-beta.1` was tagged before the relicensing. Its release workflows were cancelled at the user's instruction ("no need to release a new beta") before anything was published: no GitHub release, no Docker image.
- So "up to and including v1.4.97" stays accurate.
- The git tag `v1.4.98-beta.1` still exists on remote, pointing at `c413909e5`, with no release. Do not re-run its workflows. The next release from `personal` will carry the AGPL licence.

## Dependency Compatibility (REQ-009)

| Dependency / License | Where | Compatible with AGPL-3.0? | Handling |
| --- | --- | --- | --- |
| MIT, ISC, BSD-2/3, 0BSD, Unlicense, BlueOak-1.0.0, Apache-2.0, Python-2.0 | all workspaces | Yes | — |
| MPL-2.0 `@novnc/novnc` | web/desktop | Yes | Keep existing MPL notice |
| (MPL-2.0 OR Apache-2.0) dompurify | web | Yes | — |
| CC-BY-4.0 + MIT Font Awesome free icons | web | Yes | Keep attribution |
| GPL-3.0 `libsignal` (via Baileys) | message-gateway | Yes (§13) | Resolves a prior tension with Apache gateway |
| Electron/Chromium (MIT, BSD, LGPL parts) | desktop | Yes | — |
| **Proprietary `@anthropic-ai/claude-agent-sdk`** | server-ts (bundled in desktop/Docker) | **No, for third-party redistributors** | AGPL §7 additional permission in `LICENSING.md` (DEC-006) |

Source: `investigation-notes.md` §Third-party dependency compatibility (`pnpm licenses list --prod --json -r` + gateway check).

## Open Follow-ups

- Lawyer review (REQ-011).
- Slice 2:
  - REQ-007: licence in the desktop app, gateway package and Docker images, plus the macOS About line.
  - REQ-008: CONTRIBUTING + CLA with manual acceptance.
  - REQ-010: automated leftover-claim check.
- `autobyteus-web/package.json` `author.email` `team@autobyteus.com` does not exist (out of scope).
