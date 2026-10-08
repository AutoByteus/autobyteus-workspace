# Handoff Summary — agpl-dual-licensing, Slice 2

**Not legal advice.** A lawyer should review `CLA.md` and the licence wording before relying on them (REQ-011).

## What Changed

- **Desktop app (REQ-007):**
  - Every build ships `LICENSE`, `LICENSING.md` and `NOTICE` in its resources folder.
  - The macOS About panel and the Windows file properties show "Copyright © 2026 Yu Zheng (AutoByteus). Licensed under AGPL-3.0-only or a commercial license."
  - The build fails if a licence file is missing.
- **Docker images (REQ-007):**
  - `Dockerfile.monorepo` (the released image), `Dockerfile.allinone`, `Dockerfile.remote-server` and the gateway Dockerfile copy the three files to `/app/`.
  - They declare `org.opencontainers.image.licenses="AGPL-3.0-only"`.
- **Gateway runtime package (REQ-007):** the package build copies the licence files in and checks they are present.
- **Contributions (REQ-008):**
  - `CLA.md` v1.0 grants copyright + patent licence with the right to relicense, e.g. commercially.
  - `CONTRIBUTING.md` and a PR-template checkbox.
  - Pointers in README and LICENSING.
  - Acceptance is manual: the contributor ticks the box or states acceptance in the PR, and the owner does not merge without it. Owner and agent work is exempt. There is no bot.
- **Release gate (REQ-010):**
  - `scripts/check_licensing.py` (+ 12 unit tests) checks LICENSE texts, `license` fields and the LICENSING component list, and rejects stray Apache-2.0 claims in AGPL components.
  - The Desktop, Server Docker, Android and iOS release workflows run it right after checkout, before any build.
- **Docs (delivery):** `autobyteus-web/docs/electron_packaging.md` (new "Product Licence Packaging" section) and `autobyteus-server-ts/docker/README.md` (gate + image licence contents).

## Route And Evidence

- `task_size` Medium, `architectural_risk` Low, direct route. Architecture review, code review and test-code review: N/A.
- SR-007, IR-001 (`411bac9c9`), API-REV-001 Pass (95%).
- Checks C-01…C-09 all passed:
  - real packaged macOS app resources and Info.plist;
  - real `Dockerfile.monorepo` image files and label;
  - `docker build --check` on all 4 Dockerfiles;
  - checker on the tree and on a fresh clone, plus a violation probe;
  - actionlint;
  - workflow-contract tests.
- Delivery smoke on the current base:
  - `python3 scripts/check_licensing.py` → "Licensing is consistent", 6395 files, exit 0;
  - `python3 -m unittest scripts/tests/test_check_licensing.py` → 12 OK;
  - `vitest run tests/integration/product-license-packaging.integration.test.ts` → 4/4.

## Not Verified Until The Next Real Release (no release in this ticket)

- Signed/notarized macOS build and Windows `LegalCopyright` on a real installer.
- The gate running on GitHub-hosted runners.

## Upstream Notes (pre-existing, not caused by this change)

- **UD-001:** the message gateway was removed from the workspace and has no release workflow (`40f769e0d`), but REQ-007 still lists it. Its Dockerfile and runtime-package script were updated but cannot be built or shipped from base.
- **UD-002:** `docker/Dockerfile.remote-server` and `docker/Dockerfile.allinone` do not copy the agent-presentation and collaboration-stream contracts, so their builder stage fails on base. This needs a follow-up ticket. The released image (`Dockerfile.monorepo`) is unaffected.

## Open Follow-ups

- Lawyer review of `CLA.md` and the licence wording.
- Owner decisions: delete the unused remote tag `v1.4.98-beta.1`; fix `autobyteus-web` `author.email` (`team@autobyteus.com` does not exist).
- `v1.4.98-beta.2` (cut from `714c41324`) has the AGPL licence in the repo but does not yet carry the licence files inside the binaries. The next release after this merge will.
