/**
 * AutoByteus product licence files shipped with every desktop build.
 *
 * The desktop app carries the AGPL-3.0 `LICENSE`, the human-readable `LICENSING.md` and the
 * `NOTICE` as `<resources>/LICENSE`, `<resources>/LICENSING.md` and `<resources>/NOTICE`.
 * `PRODUCT_COPYRIGHT` becomes the macOS About line (`NSHumanReadableCopyright`) and the Windows
 * `LegalCopyright` file property. `from` paths resolve against the `autobyteus-web` project dir:
 * `LICENSE` is the package's own AGPL copy; `LICENSING.md` and `NOTICE` live at the repository root.
 */
export const PRODUCT_COPYRIGHT =
  'Copyright © 2026 Yu Zheng (AutoByteus). Licensed under AGPL-3.0-only or a commercial license.'

/** electron-builder resources: `<resources>/LICENSE`, `<resources>/LICENSING.md`, `<resources>/NOTICE`. */
export const PRODUCT_LICENSE_EXTRA_RESOURCES = [
  { from: 'LICENSE', to: 'LICENSE' },
  { from: '../LICENSING.md', to: 'LICENSING.md' },
  { from: '../NOTICE', to: 'NOTICE' },
] as const

/** Source files that must exist before packaging, relative to `autobyteus-web`. */
export const PRODUCT_LICENSE_REQUIRED_FILES = PRODUCT_LICENSE_EXTRA_RESOURCES.map(
  (resource) => resource.from,
)
