# Team attachment migration golden files

Each `.source.jsonl` is literal pre-migration input; its independently authored
`.expected.jsonl` is the complete required output. Never regenerate expected
files by running the migration or its locator-building helpers.

- `converted`: exact execution routing, local origin/query/fragment, external
  origin, prose/unknown fields and unchanged-line whitespace/Unicode preservation.
- `unavailable`: a later missing attachment preserves the **whole** source file,
  including an earlier otherwise-convertible reference; warning, not failure.
- `current`: already-current references and later text-only history stay unchanged.

The integration test runs the actual migration and atomic filesystem writer,
compares complete bytes, and repeats to prove stable output. Structural package
fixtures provide ownership only; they do not compute expected attachment output.
