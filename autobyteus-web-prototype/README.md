# AutoByteus Web Current-Experience Prototype

Independently runnable, browser-only UI/UX baseline for pinned AutoByteus Web
commit `8ef282ba77705180d985e7000d801f0e0068cdc1`.

Status: **accepted (`PPA-001`) and user-approved on 2026-08-22** for the exact
current-state baseline. This package contains no future-state redesign.

Canonical repository placement: ordinary tracked content at
repository-root `autobyteus-web-prototype` on the existing owning repository's
`personal` branch. See
[repository-placement-correction.md](repository-placement-correction.md).

This project deliberately optimizes for **exact current experience** and
**simplified implementation**. It reuses source presentation code and assets,
but it does not include Electron, a backend, production credentials, production
data, or live service calls. Every visible record and runtime context is a
deterministic synthetic fixture.

## Run

```bash
corepack pnpm install --ignore-workspace --frozen-lockfile
corepack pnpm dev --port 3200
```

Open <http://127.0.0.1:3200>. See [prototype-runbook.md](prototype-runbook.md)
for production-preview and scenario commands.

## Evidence

- [prototype-bootstrap-report.md](prototype-bootstrap-report.md)
- [parity-inventory.md](parity-inventory.md)
- [comparison-report.md](comparison-report.md)
- [prototype-scenarios.md](prototype-scenarios.md)
- [mock-boundaries.md](mock-boundaries.md)
- [evidence-index.md](evidence-index.md)
- [ui-ux-spec.md](ui-ux-spec.md)
- [final-reference-screenshots](final-reference-screenshots/README.md)
- [product-prototyper-baseline-review.md](product-prototyper-baseline-review.md)

Bootstrap screenshots remain source-versus-prototype parity evidence. The
distinct images in `final-reference-screenshots/` were captured after explicit
user confirmation and are the normative current-state visual anchors defined
by `ui-ux-spec.md`.

## Final Package Validation

```bash
corepack pnpm validate:final-package
corepack pnpm validate:repository-placement
```

This verifies the approved specification, evidence totals, local Monaco asset
boundary, final image hashes, and the complete `VIS-001`–`VIS-015` mapping.
