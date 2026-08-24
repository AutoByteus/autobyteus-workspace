# AutoByteus Web Current-Experience Prototype

Independently runnable, browser-only UI/UX baseline for pinned AutoByteus Web
commit `8ef282ba77705180d985e7000d801f0e0068cdc1`.

Status: **Approved current-state baseline, including the user-confirmed RER-009 `PP-GAP-009`/`PP-GAP-010` parity correction (`PPA-002`).** The package contains no future-state redesign.

Current correction placement: ordinary tracked content at repository-root `autobyteus-web-prototype` inside worktree `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline` on branch `codex/initial-prototype-baseline`. Historical owning-repository placement remains documented in [repository-placement-correction.md](repository-placement-correction.md); this correction does not edit or push `personal`.

This project deliberately optimizes for **exact current experience** and
**simplified implementation**. It reuses source presentation code and assets,
but it does not include Electron, a backend, production credentials, production
data, or live service calls. Every visible record and runtime context is a
deterministic synthetic fixture.

## Run

```bash
corepack pnpm install --ignore-workspace --frozen-lockfile
corepack pnpm dev --port 3210
```

Open <http://127.0.0.1:3210>. See [prototype-runbook.md](prototype-runbook.md)
for production-preview and scenario commands.

## Evidence

- [prototype-bootstrap-report.md](prototype-bootstrap-report.md)
- [pp-gap-009-correction.md](pp-gap-009-correction.md)
- [pp-gap-010-correction.md](pp-gap-010-correction.md)
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

## Final And Correction Validation

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm validate:boundaries
corepack pnpm build
corepack pnpm validate:gap-009-package
corepack pnpm validate:gap-010-package
corepack pnpm capture:final-references
corepack pnpm validate:final-package
SOURCE_BASE_URL=http://127.0.0.1:3110 \
PROTOTYPE_BASE_URL=http://127.0.0.1:3210 \
MOCK_BASE_URL=http://127.0.0.1:4311 \
corepack pnpm validate:gap-010
```

`validate:gap-010` preserves `JRN-050-A`–`D` and terminally enforces `JRN-050-E`; all five source-versus-prototype checkpoints must pass. `validate:final-package` makes that journey evidence, `PPA-002`, both user-confirmation references, and `VIS-001`–`VIS-017` part of terminal completion.
