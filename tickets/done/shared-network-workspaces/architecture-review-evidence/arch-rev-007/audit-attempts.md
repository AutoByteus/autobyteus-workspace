# ARCH007 audit attempts and limits

Personal read-only architecture review; no runtime/build/product test or delegated work.

- Exploratory JSON display assumed probe-build was an object (it is an array), then
  assumed every command had rc (timeout receipts do not). Later full-file parsing
  distinguishes these shapes. A relative migration-guideline read path was wrong;
  the correct worktree-root path was read. Oversized console reads were replaced by
  bounded sections/programmatic parsing. No omitted output establishes a verdict.
- First review-audit execution reached the freshness checks and failed because it
  compared a six-decimal raw row timestamp with unrounded firstExactSeconds using
  exact equality. Inspected guest-visibility.py:54–58 and raw values (e.g.
  0.000711 versus 0.0007107469999994009). Corrected only this assertion to exact
  equality with round(firstExactSeconds,6), retaining the unrounded <=5s bound and
  actual SHA/length checks. This is a reviewer assertion correction, not a product
  failure, relaxed acceptance criterion or modified upstream evidence.
- SR023 preparation/build/cleanup failures remain in the upstream attempts record;
  no probe rerun or product Pass is inferred. Helper comparison of replacements is
  not an executed public-product refusal. Both architectures compiled; only arm64 ran.
- No reviewer live resource was created; no cleanup operation is necessary. Upstream
  exact-owned cleanup receipts were inspected; old dist outputs remain untouched.
